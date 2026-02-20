import { AspectRatio, ModelStyle } from './types';
import { Ratio, Image, Film, MonitorPlay, Camera, Zap } from 'lucide-react';

export const ASPECT_RATIO_OPTIONS = [
  { value: AspectRatio.PORTRAIT, label: '9:16', sublabel: 'Portrait', icon: Ratio },
  { value: AspectRatio.PORTRAIT_34, label: '3:4', sublabel: 'Social', icon: Ratio },
  { value: AspectRatio.SQUARE, label: '1:1', sublabel: 'Square', icon: Image },
  { value: AspectRatio.CLASSIC, label: '4:3', sublabel: 'Classic', icon: Film },
  { value: AspectRatio.LANDSCAPE, label: '16:9', sublabel: 'Wide', icon: MonitorPlay },
];

export const STYLE_OPTIONS = [
  { value: ModelStyle.PHOTOREALISTIC, label: 'Nano Banana Pro', color: 'bg-lime-500/20 text-lime-300' },
  { value: ModelStyle.CINEMATIC, label: 'Cinematic', color: 'bg-blue-500/20 text-blue-300' },
  { value: ModelStyle.ANIME, label: 'Niji Anime', color: 'bg-pink-500/20 text-pink-300' },
  { value: ModelStyle.FASHION_EDITORIAL, label: 'Fashion', color: 'bg-purple-500/20 text-purple-300' },
  { value: ModelStyle.CYBERPUNK, label: 'Cyberpunk', color: 'bg-yellow-500/20 text-yellow-300' },
  { value: ModelStyle.DIGITAL_ART, label: '3D Render', color: 'bg-cyan-500/20 text-cyan-300' },
];

export const OUTFIT_PRESETS = [
  { id: 'streetwear', label: 'Streetwear', prompt: 'oversized hoodie, cargo pants, high-end sneakers, street fashion' },
  { id: 'office', label: 'Office Chic', prompt: 'tailored blazer, white shirt, pencil skirt, professional look' },
  { id: 'summer', label: 'Summer Vibe', prompt: 'floral dress, straw hat, bright sunlight, light fabrics' },
  { id: 'cyberpunk', label: 'Cyberpunk', prompt: 'neon glowing jacket, techwear straps, futuristic accessories' },
  { id: 'luxury', label: 'Luxury', prompt: 'elegant evening gown, diamond jewelry, high fashion haute couture' },
];

export const SAMPLE_PROMPTS = [
  "Walking down a neon-lit street in Tokyo, wearing a leather jacket, rain reflections.",
  "Enjoying a coffee at a Parisian cafe, sunny morning, wearing a beige trench coat.",
  "Fitness photoshoot in a modern gym, wearing sportswear, dramatic lighting.",
  "Portrait in a blooming garden, soft sunlight, wearing a floral summer dress."
];
