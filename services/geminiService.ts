import { GoogleGenAI } from "@google/genai";
import { AspectRatio, ModelStyle } from "../types";

/**
 * Handles the generation logic.
 * Supports batch generation by running parallel requests.
 * 
 * @param prompt User text description
 * @param referenceImageBase64 (Optional) Reference image for character consistency
 * @param style Selected artistic style
 * @param ratio Aspect ratio 
 * @param outfit (Optional) Specific outfit description
 * @param batchSize Number of images to generate (default 1)
 * @param imageStrength Controls how strictly the reference image structure is followed (0.0 to 1.0)
 */
export const generateInfluencerImage = async (
  prompt: string,
  referenceImageBase64: string | null,
  style: ModelStyle,
  ratio: AspectRatio = AspectRatio.PORTRAIT,
  outfit: string = "",
  batchSize: number = 1,
  imageStrength: number = 0.75
): Promise<string[]> => {
  // Initialize Gemini Client inside the function to ensure the latest API Key is used
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const generateSingleImage = async (): Promise<string> => {
    try {
      const modelId = 'gemini-3-pro-image-preview'; 
      console.log(`[Aura AI] Generating single image with ${modelId} | Ratio: ${ratio} | Strength: ${imageStrength}`);

      let finalPrompt = "";
      
      // Construct Outfit Prompt Segment
      const outfitInstruction = outfit 
          ? `\nOUTFIT REQUIREMENT: The character MUST be wearing: "${outfit}". CHANGE the original clothing from the reference image (if any) to match this new description exactly. Keep the face and body type, but replace the outfit.`
          : "";

      if (referenceImageBase64) {
        // Construct instruction based on imageStrength
        // High strength (>0.7) -> Emphasis on Structure/Pose/Identity
        // Low strength (<0.4) -> Emphasis on creative interpretation of text
        let strengthInstruction = "";
        
        if (imageStrength >= 0.8) {
             strengthInstruction = "STRICTLY FOLLOW the pose, composition, angle, and facial structure of the reference image. The output should look like a direct variation of the reference.";
        } else if (imageStrength >= 0.6) {
             strengthInstruction = "Maintain the character's identity and general pose. You may slightly adapt the composition to fit the new scene description.";
        } else {
             strengthInstruction = "Use the reference image PRIMARILY for character identity. You have CREATIVE FREEDOM to change the pose, camera angle, and composition to best fit the text description.";
        }

        finalPrompt = `
        INSTRUCTION: You are an expert AI photographer.
        TASK: Generate a new photo using the attached reference image as a guide.
        
        GUIDELINES:
        1. IMAGE INFLUENCE (Strength ${imageStrength}): ${strengthInstruction}
        2. IDENTITY PRESERVATION: Ensure the character looks like the person in the reference image (facial features, body type, age, ethnicity).
        3. SCENE: Place this character in the following scenario: "${prompt}".
        4. STYLE: Apply the visual style: "${style}".${outfitInstruction}
        5. COMPOSITION: Professional photography, high detailed, photorealistic lighting, 8k resolution.
        `;
      } else {
        // Text-to-Image mode
        finalPrompt = `
        Generate a high-quality, photorealistic image.
        Description: ${prompt}
        ${outfit ? `Character Outfit: ${outfit}` : ''}
        Style: ${style}
        Lighting: Professional cinematic lighting.
        Quality: 8k, detailed texture.
        `;
      }

      // Prepare Payload
      const parts: any[] = [
        { text: finalPrompt }
      ];

      // Add Reference Image if exists
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

      // Call Gemini API
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

      console.log("Raw API Response:", response);

      // --- VALIDATION LOGIC START ---
      const candidates = response.candidates;
      if (!candidates || candidates.length === 0) {
          throw new Error("No candidates returned from Gemini API.");
      }

      const firstCandidate = candidates[0];

      // Check for Finish Reason (e.g., SAFETY)
      // Cast to string to avoid TypeScript error with enum comparison
      const finishReason = firstCandidate.finishReason as unknown as string;

      if (finishReason && finishReason !== "STOP") {
          console.warn(`Generation stopped. Reason: ${finishReason}`);
          
          if (finishReason === "SAFETY") {
              throw new Error("Generation blocked by Safety Filters. Please try a different prompt or reference image.");
          }
          
          // Some API versions might return "MAX_TOKENS" or other reasons, handle carefully
          if (finishReason !== "STOP") {
             throw new Error(`Generation failed. Reason: ${finishReason}`);
          }
      }

      // Check Content and Parts existence
      if (!firstCandidate.content || !firstCandidate.content.parts || firstCandidate.content.parts.length === 0) {
          throw new Error("The model returned an empty response. This can happen if the prompt is too complex or triggers internal filters.");
      }

      const outputParts = firstCandidate.content.parts;

      // Ensure it is an array
      if (!Array.isArray(outputParts)) {
          console.error("Invalid output format:", outputParts);
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
            console.warn("Model returned text instead of image:", textPart.text);
            throw new Error(`AI returned text instead of image: "${textPart.text.substring(0, 100)}..."`);
        }
        throw new Error("No image data found in the response.");
      }

      return `data:image/png;base64,${generatedImageBase64}`;

    } catch (error) {
      console.error("Gemini Single Generation Error:", error);
      throw error;
    }
  };

  try {
    console.log(`[Aura AI] Starting batch generation. Size: ${batchSize}`);
    
    // Create an array of promises based on batchSize
    const promises = Array(batchSize).fill(null).map(() => generateSingleImage());
    
    // Wait for all to complete
    const results = await Promise.all(promises);
    return results;

  } catch (error) {
    console.error("Gemini Batch API Error:", error);
    throw error;
  }
};
