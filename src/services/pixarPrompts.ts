import { ModelStyle } from "../../types";

// ─── SYSTEM INSTRUCTION (Art Director Persona) ──────────────────────
// Đã rút gọn, tập trung vào "Vibe" và "Chất liệu thị giác", bỏ các thông số CGI.

export const PIXAR_SYSTEM_INSTRUCTION = `
You are the Chief Art Director at Pixar Animation Studios. Your job is to translate user requests into stunning, heartwarming 3D animated masterpieces.

YOUR CORE STYLE GUIDELINES:
1. CHARACTER DESIGN: Big expressive eyes, soft rounded shapes, stylized proportions (not realistic). Distinctive and appealing silhouettes.
2. LIGHTING (CRITICAL): Cinematic lighting, beautiful volumetric god rays, rim light to separate subjects from background, and glowing subsurface scattering on skin.
3. TEXTURES & MATERIALS: "Tactile realism". Fluffy hair/fabric, glossy eyes with catchlights, translucent water/magic, and soft smooth skin.
4. MOOD & COLOR: Vibrant, highly saturated colors. Deep cinematic depth of field (blurred background).

Never output prompts for 2D, anime, or hyper-realistic photography. Always aim for blockbuster 3D animation quality.
`.trim();

// ─── STYLE-SPECIFIC RENDERING PIPELINES ─────────────────────────────
// Đổi thuật ngữ CGI phức tạp thành các từ khóa "ăn điểm" với AI.

export interface StylePipeline {
  name: string;
  aesthetic: string;
}

const STYLE_PIPELINES: Record<string, StylePipeline> = {
  [ModelStyle.PIXAR_CLASSIC]: {
    name: "Classic Pixar 3D Animation",
    aesthetic: "Pixar 3D animation style, masterpiece, vibrant warm colors, smooth tactile surfaces, soft glowing subsurface scattering on skin, cinematic lighting, joyful and expressive, deep depth of field, high-end C4D render.",
  },

  [ModelStyle.MODERN_DISNEY]: {
    name: "Modern Disney Hyper-Detailed 3D",
    aesthetic: "Modern Disney 3D animation style, highly detailed particle effects, magical bioluminescent volumetric lighting, ultra-detailed hair and fabric textures, expressive big eyes, dreamy and ethereal atmosphere, Octane render.",
  },

  [ModelStyle.CLAYMATION]: {
    name: "Stop-Motion Claymation",
    aesthetic: "Aardman stop-motion claymation style, physical miniature diorama look, visible fingerprint textures on clay, tactile felt and wood materials, physical studio lighting, macro photography depth of field.",
  },
};

export const getStylePipeline = (style: ModelStyle): StylePipeline => {
  return STYLE_PIPELINES[style] || STYLE_PIPELINES[ModelStyle.PIXAR_CLASSIC];
};

// ─── CHARACTER CONSISTENCY FRAMEWORK ────────────────────────────────
// Đơn giản hóa, nói cho AI biết nó cần giữ lại đặc điểm TỔNG THỂ.

export const CHARACTER_REFERENCE_INSTRUCTION = `
[IMPORTANT: CHARACTER CONSISTENCY]
Analyze the provided character reference and perfectly recreate their core identity in 3D animation style. 
Maintain their EXACT:
- Hair color, style, and silhouette
- Eye color and distinctive facial features (freckles, glasses, etc.)
- Signature clothing colors and aesthetic
Convert them into a cute, expressive Pixar-style 3D character. Do NOT make it a realistic photo.
`.trim();

// ─── NEGATIVE PROMPT SYSTEM ─────────────────────────────────────────
// Bỏ các lỗi CGI, chỉ giữ các lỗi AI sinh ảnh hay gặp.

export const NEGATIVE_CONSTRAINTS = [
    "photograph", "realistic", "live action", "DSLR", 
    "2D drawing", "anime", "flat shading", "sketch",
    "ugly", "deformed", "creepy", "uncanny valley", "lifeless eyes",
    "bad anatomy", "blurry", "noise", "text", "watermark"
];

export const getFormattedNegatives = (): string => {
  return NEGATIVE_CONSTRAINTS.join(", ");
};

// ─── PROMPT BUILDERS ────────────────────────────────────────────────
// Đưa USER PROMPT lên đầu tiên để AI tập trung vào chủ đề chính.

export const buildTextOnlyPrompt = (
  userPrompt: string,
  style: ModelStyle,
): string => {
  const pipeline = getStylePipeline(style);

  return `
SUBJECT & ACTION: ${userPrompt}

ART STYLE: ${pipeline.aesthetic}

ADDITIONAL DETAILS: 
- Lighting: 3-point cinematic lighting, subtle rim light, volumetric glow.
- Camera: High-quality 3D render, sharp focus on subject, beautiful bokeh background.

NEGATIVE: ${getFormattedNegatives()}
  `.trim();
};

export const buildCharacterReferencePrompt = (
  userPrompt: string,
  style: ModelStyle,
): string => {
  const pipeline = getStylePipeline(style);

  return `
SUBJECT & ACTION: ${userPrompt}

${CHARACTER_REFERENCE_INSTRUCTION}

ART STYLE: ${pipeline.aesthetic}

ADDITIONAL DETAILS: 
- Lighting: Cinematic, volumetric rays, glowing skin subsurface scattering.
- Camera: High-end 3D animation movie still, sharp focus.

NEGATIVE: ${getFormattedNegatives()}
  `.trim();
};
