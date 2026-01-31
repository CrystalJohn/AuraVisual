
export enum AspectRatio {
  PORTRAIT = '9:16',
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
