// ════════════════════════════════════════════════════════════════════════
// STORYBOARD SERVICE — AI Prompt Generator (Cỗ máy Kịch bản)
// Translates simple ideas into production-ready storyboards
// ════════════════════════════════════════════════════════════════════════

import { GoogleGenAI, HarmCategory, HarmBlockThreshold, Type, Schema } from "@google/genai";
import { StoryboardScene, StoryboardGlobalSettings, ModelStyle, StoryboardResult } from "../types";
import { rateLimiter } from "./rateLimiter";
import { PIXAR_SYSTEM_INSTRUCTION, getStylePipeline, getFormattedNegatives } from "../src/services/pixarPrompts";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

const SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

// ─── RESPONSE SCHEMAS ───────────────────────────────────────────────

const sceneSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    duration: { type: Type.INTEGER },
    action: { type: Type.STRING },
    imagePrompt: { type: Type.STRING },
    videoPrompt: { type: Type.STRING },
    audioDescription: { type: Type.STRING },
    narration: { type: Type.STRING },
    dialogue: {
      type: Type.OBJECT,
      properties: {
        model: { 
          type: Type.STRING,
          enum: ["parent-child", "peer-to-peer", "solo-narrator"]
        },
        speaker: { type: Type.STRING },
        text_vi: { type: Type.STRING },
        phonetic_guide: { type: Type.STRING },
        timing: { type: Type.STRING },
        emotion: { type: Type.STRING },
        exchange: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              speaker: { type: Type.STRING },
              text_vi: { type: Type.STRING },
              phonetic_guide: { type: Type.STRING },
              timing: { type: Type.STRING },
              emotion: { type: Type.STRING }
            }
          }
        },
        pacing: { type: Type.STRING }
      }
    }
  },
  required: [
    "title",
    "duration",
    "action",
    "imagePrompt",
    "videoPrompt",
    "audioDescription",
    "narration",
    "dialogue"
  ],
};

const storyboardSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    characters: {
      type: Type.OBJECT,
      properties: {
        main: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            description: { type: Type.STRING },
            color_key: { type: Type.STRING }
          },
          required: ["name", "description", "color_key"]
        },
        secondary: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            description: { type: Type.STRING },
            color_key: { type: Type.STRING },
            role: { type: Type.STRING }
          },
          required: ["name", "description", "color_key", "role"]
        }
      },
      required: ["main"]
    },
    props: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          description: { type: Type.STRING },
          scenes_used: { type: Type.ARRAY, items: { type: Type.INTEGER } }
        },
        required: ["name", "description", "scenes_used"]
      }
    },
    scenes: {
      type: Type.ARRAY,
      items: sceneSchema,
    },
  },
  required: ["characters", "props", "scenes"],
};

// ─── STORYBOARD DIRECTOR SYSTEM INSTRUCTION ─────────────────────────

const STORYBOARD_SYSTEM_INSTRUCTION = `
${PIXAR_SYSTEM_INSTRUCTION}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ADDITIONAL ROLE: STORYBOARD DIRECTOR & PROMPT ARCHITECT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You are also a world-class Storyboard Director who translates simple human ideas 
into production-ready storyboard sequences. Your specialty is generating DUAL PROMPTS:

1. IMAGE PROMPT — Optimized for AI image generation (Gemini):
   - Static composition, single decisive moment
   - Detailed character pose, expression, wardrobe
   - Background environment, props, lighting setup
   - Camera angle and framing (close-up, wide, medium)
   - Color palette and mood

2. VIDEO PROMPT — Optimized for AI video generation (Grok):
   - Must follow Grok's Video Prompt Structure: [Subject Description] + [Detailed Action/Motion] + [Camera Movement/Angle] + [Environment/Lighting Details]
   - Camera MOVEMENT (dolly, crane, pan, track, push-in)
   - Character ANIMATION (walking, turning, reacting)
   - Environment DYNAMICS (wind, particles, lighting changes)
   - Temporal arc: what changes from start to end of the clip
   - Pacing notes (slow, fast, contemplative, energetic)

## GENERATION ORDER — BẮT BUỘC THEO THỨ TỰ NÀY

Trước khi tạo bất kỳ scene nào, phải hoàn thành 3 bước sau:

### BƯỚC 1 — CHARACTER ESTABLISHMENT
Generate phần "characters" trước tiên:
Dựa vào CHARACTER LOCK đã được cung cấp, xác định:
- main_character: tên, mô tả ngắn, màu sắc đặc trưng
- secondary_character: (nếu dialogueModel là parent-child hoặc peer-to-peer)
  Tự generate nhân vật phụ phù hợp với topic và main character
  Ví dụ: main là bé 7 tuổi → secondary là "Mẹ, áo dài xanh, tóc búi"
- Cả hai nhân vật phải NHẤT QUÁN xuyên suốt tất cả scenes

### BƯỚC 2 — PROP ESTABLISHMENT  
Generate phần "props" sau khi có characters:
Liệt kê tất cả dụng cụ/vật phẩm xuất hiện trong video:
- Dụng cụ chính liên quan đến topic (ví dụ: piano, music box, chord chart)
- Mô tả VISUAL CỤ THỂ cho mỗi prop (màu, chất liệu, kích thước tương đối)
- Props phải NHẤT QUÁN qua các scene — không thay đổi màu/hình dạng

### BƯỚC 3 — SCENE GENERATION
Chỉ sau khi có characters + props mới generate scenes.
Mỗi image/video prompt PHẢI reference đúng characters và props 
đã được establish ở Bước 1 và 2.
KHÔNG tự tạo thêm nhân vật hay prop mới trong scene.

## DIALOGUE MODEL RULES

IF dialogueModel === "parent-child":
  - Luôn có nhân vật PHỤ HUYNH xuất hiện trong scene
  - Phụ huynh nói trước, giải thích khái niệm
  - Nhân vật trẻ em phản ứng: ngạc nhiên, thích thú, hỏi lại
  - Format dialogue:
    parent_vi: "Con thử bấm phím này xem sao nhé!"
    child_vi: "Ồ! Sao nó kêu hay vậy ba/mẹ?"
  - Lip-sync: CẢ HAI nhân vật lần lượt
  - Camera: cut giữa 2 nhân vật hoặc 2-shot

IF dialogueModel === "peer-to-peer":
  - Có thể có nhân vật thứ 2 (bạn bè, classmate)
  - Tương tác qua lại tự nhiên, GenZ tone
  - Format dialogue:
    speaker1_vi: "Mày thử ghép 3 nốt này coi!"
    speaker2_vi: "Ủa hay ghê, hợp âm là vậy hả?"
  - Camera: 2-shot hoặc over-shoulder

IF dialogueModel === "solo-narrator":
  - Nhân vật nói thẳng vào camera
  - Giải thích trực tiếp như YouTuber/host
  - Format dialogue:
    speaker_vi: "Hợp âm là sự kết hợp của nhiều nốt nhạc!"
  - Camera: medium shot, eye contact với camera

STORYBOARD RULES:
- Each scene must flow narratively into the next
- Visual continuity: same character, same world, coherent color palette
- Emotional arc across scenes: setup → rising action → climax → resolution
- Duration should match content complexity (simple action = 4s, complex = 6-8s)
`.trim();

// ─── GENERATE STORYBOARD ────────────────────────────────────────────

export const generateStoryboard = async (
  idea: string,
  settings: StoryboardGlobalSettings,
): Promise<StoryboardResult> => {
  const ai = getAI();
  const pipeline = getStylePipeline(settings.styleId);
  const negatives = getFormattedNegatives();

  const characterLock = settings.characterDescription.trim()
    ? `\nCHARACTER LOCK (append to ALL prompts): "${settings.characterDescription}"`
    : "";

  const styleLock = `\nSTYLE LOCK (append to ALL prompts): ${pipeline.aesthetic}`;

  const prompt = `
Generate a ${settings.sceneCount}-scene storyboard for: "${idea}"

THINK IN THIS ORDER:
1. WHO is in this video? 
   → Establish main character from CHARACTER LOCK
   → If dialogueModel is "parent-child" or "peer-to-peer": 
     design a secondary character that fits naturally
   
2. WHAT props are needed?
   → List every object that will appear
   → Give each a specific visual description
   → Note which scenes each prop appears in

3. THEN generate scenes
   → Every imagePrompt must reference characters and props 
     by their established descriptions
   → Never introduce new characters or props mid-story

CHARACTER LOCK: ${settings.characterDescription || 'None'}
STYLE: ${pipeline.aesthetic}

ASPECT RATIO: ${settings.aspectRatio}

For each scene produce:
1. "title" — short scene title (bilingual: Vietnamese + English if applicable)
2. "duration" — clip length in seconds (4, 6, or 8)
3. "action" — 1-2 sentence human-readable description of what happens
4. "imagePrompt" — DETAILED image generation prompt (80+ words). Must include:
   - Character description (use the CHARACTER LOCK if provided)
   - Exact pose/expression/gesture
   - Environment, props, background details
   - Camera angle (close-up, medium shot, wide shot, etc.)
   - Lighting and mood
   - Style: "${pipeline.aesthetic}"
   - End with: "NEGATIVE: ${negatives}"
5. "videoPrompt" — DETAILED video generation prompt (80+ words) formatted for Grok. Must include:
   - Structure: [Subject Description] + [Detailed Action/Motion] + [Camera Movement/Angle] + [Environment/Lighting Details]
   - Camera MOVEMENT (dolly in, crane up, tracking shot, etc.)
   - Character MOVEMENT and animated action
   - Environment dynamics (particles, wind, light shifts)
   - Temporal description (what changes from start to end)
   - Style: "Disney Pixar 3D animation, cinematic quality"
   - DO NOT include audio/music in video prompt
6. "audioDescription" — sound design notes (ambient + music mood)
7. "narration" — optional voiceover text (1-2 sentences, or empty string)
8. "dialogue" — Object containing the character's line for the scene:
   - "model": "parent-child" | "peer-to-peer" | "solo-narrator" based on current logic.
   - For solo-narrator, use "speaker", "text_vi", "phonetic_guide", "timing", "emotion", "pacing".
   - For parent-child or peer-to-peer, use "exchange" array where each object has "speaker", "text_vi", "phonetic_guide", "timing", "emotion". Also include "pacing".

CRITICAL RULES:
- imagePrompt and videoPrompt must BOTH include the character description from CHARACTER LOCK
- imagePrompt is for STATIC image (key frame), videoPrompt is for MOTION
- Ensure narrative arc: setup → development → climax → resolution
- Visual continuity across all scenes

Respond ONLY with valid JSON using the requested schema, no markdown, no explanation:
{
  "characters": { ... },
  "props": [ ... ],
  "scenes": [
    { ... }
  ]
}
`;

  rateLimiter.trackRequest();

  let response: any;
  try {
    response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction: STORYBOARD_SYSTEM_INSTRUCTION,
        temperature: 0.85,
        responseMimeType: "application/json",
        responseSchema: storyboardSchema,
        safetySettings: SAFETY_SETTINGS,
      },
    });
  } catch (apiError: any) {
    console.error("[Storyboard] API error:", apiError);
    throw new Error(`API Error: ${apiError.message || "Unknown API error"}`);
  }

  const text = response?.text
    ?? response?.candidates?.[0]?.content?.parts?.[0]?.text
    ?? null;

  if (!text) {
    console.error("[Storyboard] Empty response:", JSON.stringify(response, null, 2));
    throw new Error("Failed to generate storyboard — empty response");
  }

  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch {
    console.error("[Storyboard] JSON parse failed. Raw:", text.substring(0, 500));
    throw new Error("Failed to parse storyboard — AI returned invalid JSON");
  }

  if (!parsed || !Array.isArray(parsed.scenes) || parsed.scenes.length === 0) {
    throw new Error("Storyboard returned empty or invalid scene list");
  }

  return {
    characters: parsed.characters,
    props: parsed.props,
    scenes: parsed.scenes.map((scene: any, i: number) => {
      // Post-generation constraint validation (enforce character lock)
      let finalImagePrompt = scene.imagePrompt || "";
      if (settings.characterDescription.trim()) {
        const lockWords = settings.characterDescription.toLowerCase().split(' ').slice(0, 3).join(' '); // Rough heuristic
        if (!finalImagePrompt.toLowerCase().includes(lockWords)) {
          console.warn(`[Storyboard] Injecting missing Character Lock into Scene ${i + 1}`);
          finalImagePrompt = `${settings.characterDescription}. ${finalImagePrompt}`;
        }
      }

      return {
        id: `sb-${Date.now()}-${i}`,
        sceneNumber: i + 1,
        title: scene.title || `Scene ${i + 1}`,
        duration: scene.duration || 6,
        action: scene.action || "",
        imagePrompt: finalImagePrompt,
        videoPrompt: scene.videoPrompt || "",
        audioDescription: scene.audioDescription || "",
        narration: scene.narration || "",
        dialogue: scene.dialogue || {
          model: "solo-narrator", text_vi: "", phonetic_guide: "", timing: "", emotion: "", pacing: ""
        },
        status: "idle" as const,
      };
    })
  };
};

// ─── GENERATE FIRST FRAME (Preview Image) ───────────────────────────

export const generateFirstFrame = async (
  scene: StoryboardScene,
  settings: StoryboardGlobalSettings,
): Promise<string> => {
  // Import dynamically to avoid circular dependencies
  const { generatePixarImage } = await import("../src/services/pixarService");

  const aspectRatio = settings.aspectRatio === "16:9" ? "16:9" : "9:16";

  // Generate image using the scene's imagePrompt
  const results = await generatePixarImage(
    scene.imagePrompt,
    settings.styleId,
    aspectRatio as any,
    1,
    null,
  );

  if (results.length === 0) {
    throw new Error(`No image generated for Scene ${scene.sceneNumber}`);
  }

  return results[0];
};

// ─── REGENERATE SINGLE SCENE ────────────────────────────────────────

export const regenerateScene = async (
  originalScene: StoryboardScene,
  idea: string,
  settings: StoryboardGlobalSettings,
): Promise<StoryboardScene> => {
  const ai = getAI();
  const pipeline = getStylePipeline(settings.styleId);
  const negatives = getFormattedNegatives();

  const characterLock = settings.characterDescription.trim()
    ? `CHARACTER LOCK: "${settings.characterDescription}"`
    : "";

  const prompt = `
TASK: Regenerate ONLY Scene #${originalScene.sceneNumber} for this storyboard.

ORIGINAL IDEA: "${idea}"
SCENE TITLE: "${originalScene.title}"
${characterLock}

Generate fresh imagePrompt and videoPrompt for this scene.
Style: ${pipeline.aesthetic}
Negatives for imagePrompt: ${negatives}

Respond with a single JSON object matching the requested schema.
`;

  rateLimiter.trackRequest();

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      systemInstruction: STORYBOARD_SYSTEM_INSTRUCTION,
      temperature: 0.9,
      responseMimeType: "application/json",
      responseSchema: sceneSchema,
      safetySettings: SAFETY_SETTINGS,
    },
  });

  const text = response?.text
    ?? response?.candidates?.[0]?.content?.parts?.[0]?.text
    ?? null;

  if (!text) throw new Error("Failed to regenerate scene — empty response");

  const parsed = JSON.parse(text);

  // Post-generation constraint validation
  let finalImagePrompt = parsed.imagePrompt || "";
  if (settings.characterDescription.trim()) {
    const lockWords = settings.characterDescription.toLowerCase().split(' ').slice(0, 3).join(' ');
    if (!finalImagePrompt.toLowerCase().includes(lockWords)) {
      console.warn(`[Storyboard] Injecting missing Character Lock into Regenerated Scene #${originalScene.sceneNumber}`);
      finalImagePrompt = `${settings.characterDescription}. ${finalImagePrompt}`;
    }
  }

  return {
    ...originalScene,
    title: parsed.title || originalScene.title,
    duration: parsed.duration || originalScene.duration,
    action: parsed.action || "",
    imagePrompt: finalImagePrompt,
    videoPrompt: parsed.videoPrompt || "",
    audioDescription: parsed.audioDescription || "",
    narration: parsed.narration || "",
    firstFrameUrl: undefined, // Reset preview
    status: "idle" as const,
    error: undefined,
  };
};
