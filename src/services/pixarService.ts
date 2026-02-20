
import { GoogleGenAI } from "@google/genai";
import { AspectRatio, ModelStyle } from "../../types";
import { rateLimiter, withRetry } from "../../services/rateLimiter";
import { uploadToCloudinary } from "../../services/cloudinaryService";

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
        // Track daily quota (synchronous — no cooldown)
        rateLimiter.trackRequest();

        try {
        const modelId = 'gemini-3-pro-image-preview'; 
        
        // Pixar Prompt Injection
        const prefix = "Disney pixar movie style, 3d render, c4d, unreal engine 5, octane render, cute, expressive faces, soft smooth lighting, glowing atmosphere, vibrant colors, masterpiece, 8k";
        const negativePrompt = "photo, realistic, flesh, photograph, sketch, 2d, drawing, anime, ugly, deformed";
        
        let styleInstruction = "";
        if (style === ModelStyle.PIXAR_CLASSIC) {
            styleInstruction = "Toy Story vibe, classic 3D animation style.";
        } else if (style === ModelStyle.MODERN_DISNEY) {
            styleInstruction = "Frozen and Elio vibe, large expressive eyes, shimmering lighting, magical atmosphere.";
        } else if (style === ModelStyle.CLAYMATION) {
            styleInstruction = "Claymation style, stop-motion look, tactile textures.";
        }

        let finalPrompt = "";

        if (referenceImageBase64) {
            // Character Reference Mode — identity preservation
            finalPrompt = `
                ${prefix}
                
                INSTRUCTION: You are an expert Disney Pixar 3D character artist.
                TASK: Generate a NEW Pixar-style image using the attached reference image as the CHARACTER REFERENCE.
                
                CHARACTER CONSISTENCY RULES:
                1. PRESERVE the character's EXACT facial features: face shape, eye shape, eye color, nose, mouth, eyebrows, skin tone.
                2. PRESERVE the character's hairstyle and hair color — render them in 3D Pixar style.
                3. PRESERVE the character's body type and proportions.
                4. CONVERT everything into Disney Pixar 3D animation style — NOT realistic, NOT photograph.
                5. The character should look like the SAME PERSON from the reference, just rendered as a Pixar character.
                
                SCENE: ${prompt}
                STYLE: ${styleInstruction}
                
                NEGATIVE CONSTRAINTS: ${negativePrompt}
                QUALITY: High detailed, professional 3D render. Consistent character identity across all frames.
            `;
        } else {
            // Text-only mode (no reference)
            finalPrompt = `
                ${prefix}
                CHARACTER DESCRIPTION: ${prompt}
                STYLE SPECIFIC: ${styleInstruction}
                NEGATIVE CONSTRAINTS: ${negativePrompt}
                QUALITY: High detailed, professional 3D render.
            `;
        }

        // Build parts array
        const parts: any[] = [{ text: finalPrompt }];

        // Prepend reference image if provided
        if (referenceImageBase64) {
            const base64Data = referenceImageBase64.includes(',') 
                ? referenceImageBase64.split(',')[1] 
                : referenceImageBase64;
            
            parts.unshift({
                inlineData: {
                    mimeType: 'image/jpeg',
                    data: base64Data
                }
            });
        }

        const response = await ai.models.generateContent({
            model: modelId,
            contents: {
            parts: parts
            },
            config: {
            imageConfig: {
                aspectRatio: ratio,
            }
            }
        });

        // --- VALIDATION LOGIC START ---
        const candidates = response.candidates;
        if (!candidates || candidates.length === 0) {
            throw new Error("No candidates returned from Gemini API.");
        }

        const firstCandidate = candidates[0];

        // Check for Finish Reason (e.g., SAFETY)
        const finishReason = firstCandidate.finishReason as unknown as string;

        if (finishReason && finishReason !== "STOP") {
            console.warn(`Generation stopped. Reason: ${finishReason}`);
            if (finishReason === "SAFETY") {
                throw new Error("⚠️ Blocked by Safety Filters. Try rephrasing your prompt.");
            }
            if (finishReason === "OTHER") {
                // Transient internal error — throw retryable error
                const err = new Error("🔄 Gemini internal error (OTHER). Retrying...");
                (err as any).retryable = true;
                throw err;
            }
            if (finishReason === "RECITATION") {
                throw new Error("⚠️ Content blocked due to recitation policy. Try a more original prompt.");
            }
            throw new Error(`Generation failed: ${finishReason}. Please try again.`);
        }

        // Check Content and Parts existence
        if (!firstCandidate.content || !firstCandidate.content.parts || firstCandidate.content.parts.length === 0) {
            throw new Error("The model returned an empty response. This can happen if the prompt is too complex or triggers internal filters.");
        }

        const outputParts = firstCandidate.content.parts;

        // Ensure it is an array
        if (!Array.isArray(outputParts)) {
            throw new Error("Invalid response format from AI provider.");
        }
        // --- VALIDATION LOGIC END ---

        let generatedImageBase64 = null;
        for (const part of outputParts) {
            if (part.inlineData && part.inlineData.data) {
            generatedImageBase64 = part.inlineData.data;
            break;
            }
        }

        if (!generatedImageBase64) {
            // Fallback: Check if there is text explaining the refusal
            const textPart = outputParts.find(p => p.text);
            if (textPart) {
                throw new Error(`AI returned text instead of image: "${textPart.text.substring(0, 100)}..."`);
            }
            throw new Error("No image data found in the response.");
        }

        const base64DataUri = `data:image/png;base64,${generatedImageBase64}`;

        // Upload to Cloudinary and return URL
        try {
          const cloudinaryUrl = await uploadToCloudinary(base64DataUri, 'pixar_studio');
          return cloudinaryUrl;
        } catch (uploadErr) {
          console.warn('Cloudinary upload failed, falling back to base64:', uploadErr);
          return base64DataUri;
        }

        } catch (error) {
        console.error("Pixar Generation Error:", error);
        throw error;
        }
    });
  };

  const results: string[] = [];
  for (let i = 0; i < batchSize; i++) {
        if (i > 0) {
            await new Promise(r => setTimeout(r, 1000));
        }
        const result = await generateSingleImage();
        results.push(result);
  }
  return results;
};
