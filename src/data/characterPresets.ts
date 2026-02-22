import { ModelStyle } from "../../types";

export type StyleLock = any; // Define properly if needed

export interface CharacterPreset {
  id: string;
  name: string;
  displayName: string;
  role: string;
  ageGroup: "child" | "teen" | "young-adult" | "adult";
  dialogueModel: "parent-child" | "peer-to-peer" | "solo-narrator";
  compatibleStyles: string[];
  tags: string[];
  avatar: string;
  accentColor: string;
  shortBio: string;
  signatureProp: string;
  characterLock: string;
}

export const CHARACTER_PRESETS: CharacterPreset[] = [
  {
    id: "elio-cosmic-dreamer",
    name: "Elio",
    displayName: "Elio — Cosmic Dreamer",
    role: "explorer",
    ageGroup: "child",
    dialogueModel: "parent-child",
    compatibleStyles: [ModelStyle.PIXAR_CLASSIC, ModelStyle.MODERN_DISNEY],
    tags: ["science", "space", "music", "general"],
    avatar: "🌙",
    accentColor: "#5B8CFF",
    shortBio: "Cậu bé mơ mộng yêu khoa học và vũ trụ",
    signatureProp: "Star Map Notebook",
    characterLock: `A stylized 3D animated young boy named Elio, 
oversized head-to-body ratio 1:4, big round dreamy deep blue eyes 
with tiny star-shaped light reflections in irises, slightly wavy 
sandy-blonde hair with a stubborn cowlick at crown, light fair skin 
with a few sun freckles across nose, soft thoughtful expression with 
lips often slightly parted in wonder, one eyebrow naturally higher 
than the other giving a permanently curious look.

Wearing a deep navy zip-up hoodie with a small embroidered crescent 
moon patch on left chest (#1B2A4A), soft white long-sleeve underneath, 
khaki cargo pants with rolled cuffs, worn white sneakers with 
hand-drawn constellation doodles on the rubber sole. Always carries 
a worn leather-bound star map notebook tucked under left arm, 
edges dog-eared, cover slightly scuffed.

Pixar 3D aesthetic, matte fleece texture on hoodie, soft leather 
on notebook, smooth rubber on sneakers. NOT anime, NOT realistic, 
NOT 2D flat, NOT cel-shading.`
  },
  {
    id: "kai-guitar-kid",
    name: "Kai",
    displayName: "Kai — The Guitar Kid",
    role: "student",
    ageGroup: "teen",
    dialogueModel: "solo-narrator",
    compatibleStyles: [ModelStyle.PIXAR_CLASSIC, ModelStyle.MODERN_DISNEY],
    tags: ["music", "guitar", "chords", "learning", "genZ"],
    avatar: "🎸",
    accentColor: "#7B5EA7",
    shortBio: "Tay guitar tự học, đam mê âm nhạc theo cách riêng",
    signatureProp: "Blue Acoustic Guitar",
    characterLock: `A stylized 3D animated teenage boy named Kai, 
oversized head-to-body ratio 1:4, big round warm brown eyes with 
bright curious light reflections, medium-length straight dark brown 
hair with side-swept fringe peeking under a knit beanie hat 
(multicolor: purple, red, blue, earthy tones). Light warm skin with 
soft rosy cheeks, small upturned nose, natural relaxed smile showing 
slight teeth — expression always warm and approachable.

Wearing a colorful geometric-pattern hoodie sweater with Aztec/tribal 
zigzag design in purple, red, teal, orange, and brown tones over a 
white hoodie base with visible drawstrings. Dark jeans or pants, 
casual sneakers.

Signature prop: An acoustic guitar with distinctive bright blue 
binding/trim around the body edges and soundhole, natural spruce 
top, warm cedar tones on body — the Blue-Trim Acoustic Guitar. 
Kai holds it naturally, left hand forming chord shapes on neck, 
right hand near soundhole.

Environment when relevant: Cozy bedroom music room — warm golden 
backlight from window with soft venetian blind shadows, music 
posters on walls (blurred background), guitar amplifiers in corner, 
spare acoustic guitar leaning against wall, small potted plant on 
windowsill. Warm amber volumetric light from behind.

Pixar 3D aesthetic, highly tactile knit texture on beanie and 
sweater (individual yarn strands visible), soft subsurface 
scattering on skin, smooth lacquered wood on guitar body, 
metallic tuning pegs, matte rubber on sneakers. 
NOT anime, NOT realistic, NOT 2D flat, NOT cel-shading.`
  },
  {
    id: "maya-curious-gogetter",
    name: "Maya",
    displayName: "Maya — The Curious Go-Getter",
    role: "explorer",
    ageGroup: "teen",
    dialogueModel: "peer-to-peer",
    compatibleStyles: [ModelStyle.PIXAR_CLASSIC, ModelStyle.MODERN_DISNEY, ModelStyle.CLAYMATION],
    tags: ["general", "science", "music", "learning", "genZ"],
    avatar: "⚡",
    accentColor: "#FF6B35",
    shortBio: "Cô bé năng động, luôn tìm tòi và thử thách bản thân",
    signatureProp: "Multi-Tool Smartwatch",
    characterLock: `A stylized 3D animated young teenage girl named Maya, 
oversized head-to-body ratio 1:4, big bright amber-brown eyes with 
energetic spark reflections, thick natural eyebrows slightly furrowed 
in focus, warm medium-dark skin with natural healthy glow and soft 
subsurface scattering, small upturned nose, wide confident grin 
showing teeth — default expression is mid-action, never static.

Short textured afro-puff hair pulled into two puffs with bright 
orange scrunchies, a few loose coils framing her face. Wearing a 
cropped bright orange athletic jacket (#FF6B35) with white racing 
stripes on sleeves, white fitted graphic tee underneath with a small 
lightning bolt logo, dark olive high-waist joggers, chunky white 
dad sneakers with orange sole accent. On left wrist: an oversized 
chunky smartwatch that displays animated data holograms — 
the Multi-Tool Smartwatch. Small stud earrings, gold.

Pixar 3D aesthetic, smooth athletic fabric on jacket, soft cotton 
on tee, textured rubber on sneakers, glossy screen on smartwatch. 
NOT anime, NOT realistic, NOT 2D flat, NOT cel-shading.`
  },
  {
    id: "nova",
    name: "Nova",
    displayName: "Nova — Cyber Scrapper",
    role: "protagonist",
    ageGroup: "young-adult",
    dialogueModel: "peer-to-peer",
    compatibleStyles: [ModelStyle.CYBERPUNK, ModelStyle.DIGITAL_ART],
    tags: ["tough", "tech"],
    avatar: "🤖",
    accentColor: "#06B6D4", // cyan
    shortBio: "Sống sót trong thành phố Cyber",
    signatureProp: "Găng tay cơ khí phát sáng",
    characterLock: "Cô gái 20 tuổi, tóc ngắn cắt tỉa màu bạch kim, áo khoác dạ quang cyberpunk, có hình xăm neon trên má trái."
  },
  {
    id: "claire-the-pianist",
    name: "Claire",
    displayName: "Claire — The Pianist",
    role: "guide",
    ageGroup: "teen",
    dialogueModel: "solo-narrator",
    compatibleStyles: [ModelStyle.PIXAR_CLASSIC, ModelStyle.MODERN_DISNEY],
    tags: ["music", "piano", "chords", "theory", "harmony"],
    avatar: "🎹",
    accentColor: "#E8C4A0",
    shortBio: "Cô bé pianist tinh tế, nghe nhạc bằng cả tâm hồn",
    signatureProp: "Pearl Music Box",
    characterLock: `A stylized 3D animated teenage girl named Claire, 
oversized head-to-body ratio 1:4, large expressive soft grey eyes 
with warm silver light reflections, long straight dark chestnut hair 
worn loosely — front sections pinned back with two pearl hair clips, 
rest flowing over shoulders, light porcelain skin with subtle pink 
flush on cheeks, delicate features with a small refined nose and 
gently curved lips in a serene half-smile.

Wearing a soft cream ruffled blouse with small pearl buttons 
(slightly oversized, tucked loosely), high-waist dark burgundy 
pleated midi skirt (#6B2737), cream knee-high socks, black Mary 
Jane shoes with a small gold buckle. Around neck: a delicate gold 
chain with a tiny piano key charm. Always has elegant, expressive 
hands — fingers naturally slightly curved as if resting on keys. 
Carries a small antique pearl music box that glows softly and plays 
floating musical notes when opened.

Pixar 3D aesthetic, soft chiffon texture on blouse, smooth pleated 
fabric on skirt, polished leather on shoes, luminous pearl on 
accessories, warm gold metallic on chain. NOT anime, NOT realistic, 
NOT 2D flat, NOT cel-shading.`
  },
  {
    id: "zara",
    name: "Zara",
    displayName: "Zara — Fashion Model",
    role: "star",
    ageGroup: "adult",
    dialogueModel: "solo-narrator",
    compatibleStyles: [ModelStyle.FASHION_EDITORIAL, ModelStyle.PHOTOREALISTIC],
    tags: ["fashion", "elegance"],
    avatar: "👗",
    accentColor: "#BE185D", // pink
    shortBio: "Biểu tượng thời trang hiện đại",
    signatureProp: "Kính râm hàng hiệu",
    characterLock: "Người mẫu nữ 25 tuổi, photorealistic, khuôn mặt sắc sảo, mặc váy dạ hội màu rượu vang, ánh sáng studio sang trọng."
  }
];
