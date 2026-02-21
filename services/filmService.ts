import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { FilmScene } from "../types";
import { rateLimiter } from "./rateLimiter";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

// Safety settings to allow creative content (screenplay, film scripts)
const SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

// ─── Step 1: LLM Screenplay Agent ────────────────────────────────────

export const generateScreenplay = async (
  idea: string,
  sceneCount: number = 3
): Promise<FilmScene[]> => {
  const ai = getAI();

  const prompt = `
You are a Disney Pixar screenplay writer and cinematic video prompt engineer.

TASK: Turn the user's idea into exactly ${sceneCount} scenes for a Pixar-style short film.

USER IDEA: "${idea}"

For each scene, produce:
1. "title" — short scene title (e.g. "The Discovery")
2. "duration" — video length in seconds (6 or 8, total should be ~18-24s)
3. "videoPrompt" — EXTREMELY detailed video generation prompt for Veo 3.1. Include:
   - Camera movement (dolly in, crane shot, tracking shot, etc.)
   - Lighting (volumetric, golden hour, rim light, etc.)
   - Character action and expression (specific emotions, gestures)
   - Environment details (textures, colors, atmosphere)
   - Style: "Disney Pixar 3D animation, Toy Story/Frozen quality, soft subsurface scattering, expressive eyes"
   - DO NOT include audio/music descriptions in the video prompt
4. "audioDescription" — ambient sounds and music mood for this scene
5. "narration" — optional short narration text (1-2 sentences max, or empty)

CRITICAL RULES:
- videoPrompt must be cinematic and highly detailed (100+ words each)
- Include camera angles and movements for cinematic feel
- Ensure visual continuity between scenes (same character, coherent story)
- Each scene should flow naturally into the next

Respond ONLY with valid JSON array, no markdown, no explanation:
[
  {
    "title": "...",
    "duration": 8,
    "videoPrompt": "...",
    "audioDescription": "...",
    "narration": "..."
  }
]
`;

  rateLimiter.trackRequest();

  let response: any;
  try {
    response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        temperature: 0.8,
        responseMimeType: "application/json",
        safetySettings: SAFETY_SETTINGS,
      },
    });
  } catch (apiError: any) {
    console.error("[FilmService] Screenplay API error:", apiError);
    throw new Error(`API Error: ${apiError.message || "Unknown API error"}`);
  }

  const text = response?.text
    ?? response?.candidates?.[0]?.content?.parts?.[0]?.text
    ?? null;

  if (!text) {
    console.error("[FilmService] Empty screenplay response:", JSON.stringify(response, null, 2));
    throw new Error("Failed to generate screenplay — empty response");
  }

  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Invalid screenplay format from Gemini");
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("Invalid screenplay format");
  }

  return parsed.map((scene: any, i: number) => ({
    id: `scene-${Date.now()}-${i}`,
    sceneNumber: i + 1,
    title: scene.title || `Scene ${i + 1}`,
    duration: scene.duration || 8,
    videoPrompt: scene.videoPrompt,
    audioDescription: scene.audioDescription || "",
    narration: scene.narration || "",
    status: "idle" as const,
  }));
};

// ─── Step 1b: Parse Existing Script ──────────────────────────────────

export const parseExistingScript = async (
  scriptText: string
): Promise<FilmScene[]> => {
  const ai = getAI();

  const prompt = `
You are a screenplay parser. The user has provided a pre-written screenplay/script with scene descriptions and video prompts.

TASK: Extract ALL scenes from the text below and structure them into JSON.

USER SCRIPT:
"""
${scriptText}
"""

For each scene found, extract:
1. "title" — the scene title or description (e.g. "The Hook - Khoảnh khắc bế tắc")
2. "duration" — duration in seconds. Look for timestamps like (0:00 - 0:03) = 3 seconds, (0:03 - 0:06) = 3 seconds, etc. If no timestamps, default to 8.
3. "videoPrompt" — the detailed video/image generation prompt. Look for "Prompt cho Veo" sections or any detailed English description of the visual scene.
4. "audioDescription" — any audio/sound descriptions mentioned, or empty string
5. "narration" — any narration text mentioned, or empty string

CRITICAL RULES:
- Extract ALL scenes, do not skip any
- Keep the original videoPrompt text exactly as written (do not modify it)
- If a scene has timestamps like (0:00 - 0:03), calculate duration = end - start in seconds
- Return scenes in order

Respond ONLY with valid JSON array:
[
  {
    "title": "...",
    "duration": 4,
    "videoPrompt": "...",
    "audioDescription": "...",
    "narration": ""
  }
]
`;

  rateLimiter.trackRequest();

  let response: any;
  try {
    response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        temperature: 0.2,
        responseMimeType: "application/json",
        safetySettings: SAFETY_SETTINGS,
      },
    });
  } catch (apiError: any) {
    console.error("[FilmService] API call failed:", apiError);
    throw new Error(`API Error: ${apiError.message || "Unknown API error"}`);
  }

  console.log("[FilmService] Parse response:", response);

  // Try multiple ways to extract text from response
  let text = response?.text
    ?? response?.candidates?.[0]?.content?.parts?.[0]?.text
    ?? null;

  if (!text) {
    console.error("[FilmService] Empty response. Full response:", JSON.stringify(response, null, 2));
    const blockReason = response?.candidates?.[0]?.finishReason;
    throw new Error(`Empty response from Gemini${blockReason ? ` (reason: ${blockReason})` : ''}`);
  }

  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch (parseErr) {
    console.error("[FilmService] JSON parse failed. Raw text:", text.substring(0, 500));
    throw new Error("Gemini returned invalid JSON. Try simplifying the script.");
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("Could not extract any scenes from the script");
  }

  return parsed.map((scene: any, i: number) => ({
    id: `scene-${Date.now()}-${i}`,
    sceneNumber: i + 1,
    title: scene.title || `Scene ${i + 1}`,
    duration: scene.duration || 8,
    videoPrompt: scene.videoPrompt,
    audioDescription: scene.audioDescription || "",
    narration: scene.narration || "",
    status: "idle" as const,
  }));
};

// ─── Step 2: Veo 3.1 Video Rendering ─────────────────────────────────

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Retry wrapper for rate-limited API calls
const withVeoRetry = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 30000
): Promise<T> => {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      const isRateLimit =
        err?.status === 429 ||
        err?.code === 429 ||
        err?.message?.includes("429") ||
        err?.message?.includes("rate") ||
        err?.message?.includes("quota") ||
        err?.message?.includes("RESOURCE_EXHAUSTED");

      if (isRateLimit && attempt < maxRetries) {
        const waitTime = baseDelayMs * Math.pow(2, attempt); // 30s, 60s, 120s
        console.warn(
          `[Veo] Rate limit hit. Retry ${attempt + 1}/${maxRetries} after ${waitTime / 1000}s`
        );
        await delay(waitTime);
        continue;
      }
      throw err;
    }
  }
  throw new Error("Max retries exceeded");
};

export const renderScene = async (
  scene: FilmScene,
  characterRef: string | null,
  aspectRatio: "16:9" | "9:16" = "16:9",
  resolution: "720p" | "1080p" = "720p",
  onProgress?: (progress: number) => void
): Promise<string> => {
  const ai = getAI();

  // Build config
  const config: any = {
    aspectRatio,
    resolution,
    durationSeconds: scene.duration,
    personGeneration: "allow_adult",
  };

  // Add character reference images if provided
  if (characterRef) {
    const base64Data = characterRef.includes(",")
      ? characterRef.split(",")[1]
      : characterRef;

    config.referenceImages = [
      {
        image: {
          imageBytes: base64Data,
          mimeType: "image/jpeg",
        },
        referenceType: "style",
      },
    ];
  }

  // Add Pixar style to prompt
  const enhancedPrompt = `${scene.videoPrompt}. Disney Pixar 3D animation style, soft smooth lighting, vibrant colors, expressive character animation, cinematic quality.`;

  onProgress?.(5);

  // Fire the generation with retry for rate limits
  let operation = await withVeoRetry(() =>
    ai.models.generateVideos({
      model: "veo-3.1-generate-preview",
      prompt: enhancedPrompt,
      config,
    })
  );

  onProgress?.(15);

  // Poll until done
  let pollCount = 0;
  const maxPolls = 60; // 10 min max (10s intervals)

  while (!operation.done && pollCount < maxPolls) {
    await delay(10000); // 10s interval
    try {
      operation = await ai.operations.getVideosOperation({ operation });
    } catch (pollErr: any) {
      console.warn(`[Veo] Poll error (attempt ${pollCount}):`, pollErr.message);
      // Don't fail on poll errors, just retry next cycle
      await delay(5000);
    }
    pollCount++;
    const estimatedProgress = Math.min(90, 15 + (pollCount / maxPolls) * 75);
    onProgress?.(Math.round(estimatedProgress));
  }

  if (!operation.done) {
    throw new Error(`Scene ${scene.sceneNumber} timed out after ${maxPolls * 10}s`);
  }

  const generatedVideos = (operation as any).response?.generatedVideos;
  if (!generatedVideos || generatedVideos.length === 0) {
    throw new Error(`Scene ${scene.sceneNumber} returned no video`);
  }

  onProgress?.(92);

  // Download video and convert to blob URL for browser use
  const video = generatedVideos[0].video;
  
  try {
    const videoUri = video.uri;
    if (videoUri) {
      console.log(`[Veo] Scene ${scene.sceneNumber}: Downloading from ${videoUri.substring(0, 80)}...`);
      
      // Route through Vite proxy to bypass CORS
      let fetchUrl: string;
      if (videoUri.includes("generativelanguage.googleapis.com")) {
        // Extract path after the domain and route through our proxy
        const url = new URL(videoUri);
        fetchUrl = `/api/gemini${url.pathname}?alt=media&key=${process.env.API_KEY}`;
      } else {
        fetchUrl = videoUri;
      }

      console.log(`[Veo] Scene ${scene.sceneNumber}: Fetching via proxy...`);
      const resp = await fetch(fetchUrl);
      if (!resp.ok) {
        const errText = await resp.text().catch(() => "");
        throw new Error(`Download failed: ${resp.status} ${resp.statusText} — ${errText.substring(0, 200)}`);
      }

      const videoBlob = await resp.blob();
      if (videoBlob.size < 1000) {
        // Suspiciously small — probably an error response
        const text = await videoBlob.text();
        console.error(`[Veo] Scene ${scene.sceneNumber}: Tiny response (${videoBlob.size} bytes):`, text.substring(0, 200));
        throw new Error(`Download returned invalid data (${videoBlob.size} bytes)`);
      }

      const blobUrl = URL.createObjectURL(videoBlob);
      console.log(`[Veo] Scene ${scene.sceneNumber}: Downloaded ${(videoBlob.size / 1024 / 1024).toFixed(1)} MB ✓`);
      
      onProgress?.(100);
      return blobUrl;
    }
  } catch (downloadErr: any) {
    console.error(`[Veo] Scene ${scene.sceneNumber}: Download error:`, downloadErr.message);
    // Fallback: return the raw URI — user can open in new tab
    if (video.uri) {
      console.warn(`[Veo] Scene ${scene.sceneNumber}: Falling back to raw URI`);
      onProgress?.(100);
      return video.uri;
    }
  }

  throw new Error(`Scene ${scene.sceneNumber}: No video URI returned`);
};

// ─── Step 2b: Render Scenes Sequentially (rate-limit safe) ───────────

export const renderAllScenes = async (
  scenes: FilmScene[],
  characterRef: string | null,
  aspectRatio: "16:9" | "9:16" = "16:9",
  resolution: "720p" | "1080p" = "720p",
  onSceneProgress?: (sceneId: string, progress: number) => void,
  onSceneComplete?: (sceneId: string, videoUrl: string) => void,
  onSceneError?: (sceneId: string, error: string) => void
): Promise<Map<string, string>> => {
  const results = new Map<string, string>();

  // Render SEQUENTIALLY to avoid Veo rate limits
  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];

    // Wait between scenes to avoid rate limits (skip first)
    if (i > 0) {
      console.log(`[Veo] Waiting 5s before scene ${i + 1}...`);
      await delay(5000);
    }

    try {
      const videoUrl = await renderScene(
        scene,
        characterRef,
        aspectRatio,
        resolution,
        (progress) => onSceneProgress?.(scene.id, progress)
      );
      results.set(scene.id, videoUrl);
      onSceneComplete?.(scene.id, videoUrl);
    } catch (err: any) {
      console.error(`[Veo] Scene ${scene.sceneNumber} failed:`, err.message);
      onSceneError?.(scene.id, err.message);
      // Continue with remaining scenes instead of stopping
    }
  }

  return results;
};

