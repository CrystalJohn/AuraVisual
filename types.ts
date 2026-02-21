
export enum AspectRatio {
  PORTRAIT = '9:16',
  PORTRAIT_34 = '3:4',
  LANDSCAPE = '16:9',
  SQUARE = '1:1',
  CLASSIC = '4:3',
}

export enum ModelStyle {
  PHOTOREALISTIC = 'Photorealistic',
  CINEMATIC = 'Cinematic',
  ANIME = 'Anime',
  DIGITAL_ART = 'Digital Art',
  FASHION_EDITORIAL = 'Fashion Editorial',
  CYBERPUNK = 'Cyberpunk',
  PIXAR_CLASSIC = 'Pixar Classic',
  MODERN_DISNEY = 'Modern Disney',
  CLAYMATION = 'Claymation',
}

export interface GenerationTask {
  id: string;
  status: 'pending' | 'completed' | 'failed';
  images?: string[];
  timestamp: number;
  params: {
    prompt: string;
    style: ModelStyle;
    ratio: AspectRatio;
  };
}

export interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  style: ModelStyle;
  ratio: AspectRatio;
  timestamp: number;
  batchId?: string; // Group ID for batch generations
}

export interface GenerationConfig {
  prompt: string;
  ratio: AspectRatio;
  style: ModelStyle;
  referenceImage: string | null; // Base64 string
}

export interface PromptCard {
  id: string;
  prompt: string;
  style: ModelStyle;
  ratio: AspectRatio;
  status: 'idle' | 'queued' | 'generating' | 'done' | 'failed';
  resultImage?: string;
  error?: string;
}

// --- Short Film Workflow ---

export interface FilmScene {
  id: string;
  sceneNumber: number;
  title: string;
  duration: number; // seconds (6-8)
  videoPrompt: string;
  audioDescription: string;
  narration: string;
  // Runtime state
  status: 'idle' | 'rendering' | 'polling' | 'done' | 'failed';
  videoUrl?: string;
  error?: string;
  progress?: number; // 0-100 estimated
}

export interface FilmProject {
  id: string;
  idea: string;
  scenes: FilmScene[];
  status: 'idle' | 'scripting' | 'reviewing' | 'rendering' | 'post-production' | 'done' | 'failed';
  aspectRatio: '16:9' | '9:16';
  resolution: '720p' | '1080p';
  finalVideoUrl?: string;
  characterRef?: string | null;
  createdAt: number;
}

// --- Storyboard & Prompt Engine ---

export interface StoryboardScene {
  id: string;
  sceneNumber: number;
  title: string;
  duration: number;
  action: string;           // human-readable action description
  imagePrompt: string;      // for Gemini image generation (first frame)
  videoPrompt: string;      // for Veo 3.1 video generation
  audioDescription: string;
  narration: string;
  firstFrameUrl?: string;   // preview image URL (generated)
  status: 'idle' | 'generating' | 'done' | 'failed';
  error?: string;
}

export interface StoryboardGlobalSettings {
  characterDescription: string;   // "Cô bé Gen Z, tóc nâu..."
  styleId: ModelStyle;
  aspectRatio: '16:9' | '9:16';
  sceneCount: number;             // default 4
}

