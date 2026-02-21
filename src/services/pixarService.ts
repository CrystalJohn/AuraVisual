
import { GoogleGenAI } from "@google/genai";
import { AspectRatio, ModelStyle } from "../../types";
import { rateLimiter, withRetry } from "../../services/rateLimiter";
import { uploadToCloudinary } from "../../services/cloudinaryService";
import {
  PIXAR_SYSTEM_INSTRUCTION,
  buildCharacterReferencePrompt,
  buildTextOnlyPrompt,
} from "./pixarPrompts";

// ─── Shared Validation ──────────────────────────────────────────────

interface GeminiImageResult {
  base64: string;
}

const validateAndExtractImage = (response: any): GeminiImageResult => {
  const candidates = response.candidates;
  if (!candidates || candidates.length === 0) {
    throw new Error("No candidates returned from Gemini API.");
  }

  const firstCandidate = candidates[0];
  const finishReason = firstCandidate.finishReason as unknown as string;

  if (finishReason && finishReason !== "STOP") {
    if (finishReason === "SAFETY") {
      throw new Error("⚠️ Blocked by Safety Filters. Try rephrasing your prompt.");
    }
    if (finishReason === "OTHER") {
      const err = new Error("🔄 Gemini internal error (OTHER). Retrying...");
      (err as any).retryable = true;
      throw err;
    }
    if (finishReason === "RECITATION") {
      throw new Error("⚠️ Content blocked due to recitation policy. Try a more original prompt.");
    }
    throw new Error(`Generation failed: ${finishReason}. Please try again.`);
  }

  if (!firstCandidate.content?.parts || firstCandidate.content.parts.length === 0) {
    throw new Error("The model returned an empty response. Try a simpler prompt.");
  }

  const outputParts = firstCandidate.content.parts;
  if (!Array.isArray(outputParts)) {
    throw new Error("Invalid response format from AI provider.");
  }

  // Find image data
  for (const part of outputParts) {
    if (part.inlineData?.data) {
      return { base64: part.inlineData.data };
    }
  }

  // No image — check for text explanation
  const textPart = outputParts.find((p: any) => p.text);
  if (textPart) {
    throw new Error(`AI returned text instead of image: "${textPart.text.substring(0, 100)}..."`);
  }
  throw new Error("No image data found in the response.");
};

// ─── Main Generation Function ───────────────────────────────────────

export const generatePixarImage = async (
  prompt: string,
  style: ModelStyle,
  ratio: AspectRatio = AspectRatio.LANDSCAPE,
  batchSize: number = 1,
  referenceImageBase64: string | null = null
): Promise<string[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const generateSingleImage = async (): Promise<string> => {
    return withRetry(async () => {
      rateLimiter.trackRequest();

      try {
        const modelId = "gemini-3-pro-image-preview";

        // Build prompt using Art Director template system
        const finalPrompt = referenceImageBase64
          ? buildCharacterReferencePrompt(prompt, style)
          : buildTextOnlyPrompt(prompt, style);

        // Build parts array
        const parts: any[] = [{ text: finalPrompt }];

        // Prepend reference image if provided
        if (referenceImageBase64) {
          const base64Data = referenceImageBase64.includes(",")
            ? referenceImageBase64.split(",")[1]
            : referenceImageBase64;

          parts.unshift({
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Data,
            },
          });
        }

        // Call Gemini with systemInstruction for Art Director persona
        const response = await ai.models.generateContent({
          model: modelId,
          contents: { parts },
          config: {
            systemInstruction: PIXAR_SYSTEM_INSTRUCTION,
            imageConfig: {
              aspectRatio: ratio,
            },
          },
        });

        // Validate and extract image
        const result = validateAndExtractImage(response);
        const base64DataUri = `data:image/png;base64,${result.base64}`;

        // Upload to Cloudinary
        try {
          const cloudinaryUrl = await uploadToCloudinary(base64DataUri, "pixar_studio");
          return cloudinaryUrl;
        } catch (uploadErr) {
          console.warn("Cloudinary upload failed, falling back to base64:", uploadErr);
          return base64DataUri;
        }
      } catch (error) {
        console.error("Pixar Generation Error:", error);
        throw error;
      }
    });
  };

  // Sequential batch execution
  const results: string[] = [];
  for (let i = 0; i < batchSize; i++) {
    if (i > 0) {
      await new Promise((r) => setTimeout(r, 1000));
    }
    const result = await generateSingleImage();
    results.push(result);
  }
  return results;
};
