<div align="center">
<img width="1200" height="475" alt="AuraVisual Banner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# AuraVisual 🌟

**AuraVisual** is an AI-powered cinematic studio and influencer generator application. Leveraging the cutting-edge **Google Gemini API** (`@google/genai`), AuraVisual translates simple human ideas into professional storyboards, consistent character images, and cinematic video clips. 

Whether you are a creator, director, or prompt engineer, AuraVisual acts as your personal AI co-pilot for visual storytelling.

---

## ✨ Key Features

1. **Storyboard & Prompt Engine (Cỗ máy Kịch bản) 📝**
   - Automatically generates multi-scene storyboards containing both **Image Prompts** (static composition, keyframes) and **Video Prompts** (motion, camera dynamics).
   - "Character Lock" and "Style Lock" to ensure absolute consistency across all generated scenes.
   - Dual-mode prompting optimized for advanced text-to-image and text-to-video AI models.

2. **Pixar Studio (Character Consistency) 🎨**
   - Generates beautiful, highly detailed characters with strict adherence to artistic styles (e.g., Disney Pixar 3D, Anime).
   - Driven by the new `gemini-3-pro-image-preview` model, allowing image-to-image conditioning for perfect identity preservation and outfit generation.

3. **Cinematic Video Generation 🎥**
   - Uses the `veo-3.1-generate-preview` model to automatically render high-quality short video sequences.
   - Directly converts Storyboard Video Prompts into animated clips with complex camera movements (pan, track, dolly) and fluid character animations.
   - Includes automatic proxy downloads (bypassing CORS limits) to play and export generated videos instantly within the UI.

4. **Film Screenplay Agent 🎬**
   - Expands basic ideas into full-blown multi-scene short films. Understands pacing, duration, visual continuity, and temporal arcs.

---

## 🛠 Tech Stack

- **Frontend:** React 19, Vite, TypeScript, Tailwind CSS
- **AI Integration:** Official `@google/genai` (v1.42.0+)
- **Models Used:** 
  - `gemini-2.5-flash` (Structuring storyboards and parsing scripts)
  - `gemini-3-pro-image-preview` (Image generation)
  - `veo-3.1-generate-preview` (Video generation)
- **Media Processing:** FFmpeg (WASM), Cloudinary (Image Hosting)

---

## 🚀 Getting Started

Follow these steps to set up the project locally on your machine.

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- A valid **Google Gemini API Key** with access to Gemini Advanced / Video generation models.

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/CrystalJohn/AuraVisual.git
   cd AuraVisual
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```
   *Note: Ensure all dependencies, including `@google/genai`, are fully installed.*

3. **Configure Environment Variables:**
   - Create a `.env` file in the root of your project based on `.env.example`.
   - Add your Gemini API Key and Cloudinary credentials:
     ```env
     VITE_API_KEY=your_google_gemini_api_key_here
     # If process.env.API_KEY is used globally:
     API_KEY=your_google_gemini_api_key_here
     ```

4. **Run the Development Server:**
   ```bash
   npm run dev
   ```

5. **Open the App:**
   Navigate into your browser `http://localhost:3000` (or the port specified by Vite) to explore the AI Studio!

---

## 📚 How to Use

### 1. Generating a Storyboard
- Go to the **Storyboard Engine** tab.
- Type in a simple idea in the text input (e.g., *"A dog discovering a hidden spaceship in a dense forest"*).
- Configure the **Global Settings**: Set a Character Lock (e.g., *"Golden Retriever with a red collar"*) and select an Aspect Ratio.
- Click **Generate Storyboard**. The AI will plot out scenes with dedicated Keyframe Prompts and Motion Prompts.
- You can regenerate individual scenes if they don't look right.

### 2. Creating Cinematic Videos
- Wait for the scene's keyframe image to be generated (which acts as your visual reference or starting point).
- Hit **Render Video**. The app will automatically connect to `Veo 3.1` using the detailed Video Prompts.
- The video will download locally through the proxy so you can instantly preview the motion.

### 3. Rate Limit Management
- Since rendering requires high-compute models (like Veo 3.1), the system has an integrated **Rate Limiter and Retry Service** to handle API quotas. Do not worry if generation takes time—it will automatically queue and safely resend requests without crashing!

---

## 💡 Architecture Notes

- `/services/storyboardService.ts`: Core AI reasoning pipeline dictating JSON schemas (Image Prompt vs Video Prompt). 
- `/services/pixarService.ts` & `/services/geminiService.ts`: Direct model execution layer. Fully migrated to the `@google/genai` SDK using standard initialized clients.
- `/services/rateLimiter.ts`: An intelligent mechanism with exponential backoff designed to handle the heavy limits placed on generation models safely.

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

*Powered by Google AI Studio & Gemini API.*
