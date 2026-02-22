import React, { useState, useRef } from "react";
import {
  Sparkles, Loader2, Play, Film, Download, AlertCircle,
  CheckCircle2, Clapperboard, Wand2, ChevronRight, Edit3,
  RotateCcw, Video, Scissors,
} from "lucide-react";
import { FilmScene, FilmProject } from "../types";
import { generateScreenplay, parseExistingScript } from "../services/filmService";
import { assembleClips } from "../src/services/assemblyService";
import { useToast } from "./Toast";

// ─── Step Indicator ─────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: "Idea", icon: Sparkles },
  { id: 2, label: "Script", icon: Edit3 },
  { id: 3, label: "Render", icon: Video },
  { id: 4, label: "Post-Pro", icon: Scissors },
  { id: 5, label: "Done", icon: Film },
];

const StepIndicator: React.FC<{ currentStep: number }> = ({ currentStep }) => (
  <div className="flex items-center gap-1 px-4 py-3 border-b border-indigo-500/15">
    {STEPS.map((step, i) => {
      const Icon = step.icon;
      const isActive = step.id === currentStep;
      const isDone = step.id < currentStep;

      return (
        <React.Fragment key={step.id}>
          <div
            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-semibold transition-all ${
              isActive
                ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                : isDone
                ? "text-emerald-400"
                : "text-zinc-600"
            }`}
          >
            {isDone ? <CheckCircle2 size={12} /> : <Icon size={12} />}
            <span className="hidden sm:inline">{step.label}</span>
          </div>
          {i < STEPS.length - 1 && (
            <ChevronRight size={10} className={isDone ? "text-emerald-500" : "text-zinc-700"} />
          )}
        </React.Fragment>
      );
    })}
  </div>
);

// ─── Scene Card ─────────────────────────────────────────────────────

const SceneCard: React.FC<{
  scene: FilmScene;
  onEdit: (id: string, updates: Partial<FilmScene>) => void;
  onRetry?: (id: string) => void;
  disabled: boolean;
}> = ({ scene, onEdit, onRetry, disabled }) => {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div
      className={`rounded-xl border p-3 space-y-2 transition-all ${
        scene.status === "done"
          ? "border-emerald-500/30 bg-emerald-950/10"
          : scene.status === "failed"
          ? "border-red-500/30 bg-red-950/10"
          : scene.status === "rendering" || scene.status === "polling"
          ? "border-indigo-500/30 bg-indigo-950/10"
          : "border-zinc-800 bg-zinc-900/50"
      }`}
    >
      {/* Scene Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded">
            #{scene.sceneNumber}
          </span>
          <span className="text-xs font-semibold text-white">{scene.title}</span>
          <span className="text-[9px] text-zinc-500">{scene.duration}s</span>
        </div>
        <div className="flex items-center gap-1.5">
          {scene.status === "rendering" || scene.status === "polling" ? (
            <div className="flex items-center gap-1 text-[10px] text-indigo-300">
              <Loader2 size={10} className="animate-spin" />
              <span>{scene.progress || 0}%</span>
            </div>
          ) : scene.status === "done" ? (
            <CheckCircle2 size={12} className="text-emerald-400" />
          ) : scene.status === "failed" ? (
            <AlertCircle size={12} className="text-red-400" />
          ) : null}
          {!disabled && scene.status === "idle" && (
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="p-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <Edit3 size={10} />
            </button>
          )}
        </div>
      </div>

      {/* Prompt Preview / Edit */}
      {isEditing ? (
        <textarea
          value={scene.videoPrompt}
          onChange={(e) => onEdit(scene.id, { videoPrompt: e.target.value })}
          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-[10px] text-zinc-300 focus:outline-none focus:border-indigo-500/50 resize-none"
          rows={4}
        />
      ) : (
        <p className="text-[10px] text-zinc-500 line-clamp-2">{scene.videoPrompt}</p>
      )}

      {/* Progress Bar */}
      {(scene.status === "rendering" || scene.status === "polling") && (
        <div className="w-full bg-zinc-800 rounded-full h-1 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
            style={{ width: `${scene.progress || 0}%` }}
          />
        </div>
      )}

      {/* Video Preview */}
      {scene.status === "done" && scene.videoUrl && (
        <div className="space-y-1">
          <video
            src={scene.videoUrl}
            controls
            preload="metadata"
            crossOrigin={scene.videoUrl.startsWith("blob:") ? undefined : "anonymous"}
            className="w-full rounded-lg border border-zinc-800"
            style={{ maxHeight: "150px" }}
            onError={(e) => {
              const el = e.currentTarget;
              // Show fallback when video can't load
              const fallback = el.nextElementSibling as HTMLElement;
              if (fallback) fallback.style.display = "block";
              el.style.display = "none";
            }}
          />
          {/* Fallback if video element fails */}
          <div style={{ display: "none" }} className="text-center py-2 bg-zinc-900 rounded-lg border border-zinc-800">
            <p className="text-[10px] text-amber-400 mb-1">⚠️ Preview unavailable</p>
            <a
              href={scene.videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-indigo-400 hover:text-indigo-300 underline"
            >
              Open video in new tab ↗
            </a>
          </div>
          <p className="text-[8px] text-zinc-600 truncate">
            {scene.videoUrl.startsWith("blob:") ? "📦 Local blob" : "🌐 Remote URL"}
          </p>
        </div>
      )}
    </div>
  );
};

// ─── Main Component ─────────────────────────────────────────────────

interface FilmWorkflowProps {
  characterRef: string | null;
}

export const FilmWorkflow: React.FC<FilmWorkflowProps> = ({ characterRef }) => {
  const { addToast } = useToast();

  // Project state
  const [idea, setIdea] = useState("");
  const [scenes, setScenes] = useState<FilmScene[]>([]);
  const [currentStep, setCurrentStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<"16:9" | "9:16">("16:9");
  const [resolution, setResolution] = useState<"720p" | "1080p">("720p");
  const [finalVideoUrl, setFinalVideoUrl] = useState<string | null>(null);
  const [postProgress, setPostProgress] = useState(0);
  const [inputMode, setInputMode] = useState<'generate' | 'import'>('generate');
  
  // Manual clips for assembly
  const [uploadedClips, setUploadedClips] = useState<File[]>([]);

  // ─── Step 1: Generate Screenplay ───────────────────────────────

  const handleGenerateScript = async () => {
    if (!idea.trim()) return;
    setIsProcessing(true);
    setScenes([]);

    try {
      addToast({ type: "info", title: "🤖 Writing screenplay...", message: "Gemini is crafting your story" });
      const screenplay = await generateScreenplay(idea, 3);
      setScenes(screenplay);
      setCurrentStep(2);
      addToast({ type: "success", title: "📝 Screenplay Ready!", message: `${screenplay.length} scenes generated` });
    } catch (err: any) {
      addToast({ type: "error", title: "Script Failed", message: err.message, duration: 8000 });
    } finally {
      setIsProcessing(false);
    }
  };

  // ─── Step 1b: Import Existing Script ────────────────────────────

  const handleImportScript = async () => {
    if (!idea.trim()) return;
    setIsProcessing(true);
    setScenes([]);

    try {
      addToast({ type: "info", title: "📋 Parsing script...", message: "Extracting scenes from your screenplay" });
      const screenplay = await parseExistingScript(idea);
      setScenes(screenplay);
      setCurrentStep(2);
      addToast({ type: "success", title: "📝 Script Imported!", message: `${screenplay.length} scenes extracted` });
    } catch (err: any) {
      addToast({ type: "error", title: "Import Failed", message: err.message, duration: 8000 });
    } finally {
      setIsProcessing(false);
    }
  };

  // ─── Step 2 → 3: Upload Clips ─────────────────────────────────

  const handleUploadClips = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const newFiles = Array.from(files).filter(f => f.type.startsWith('video/'));
    setUploadedClips(newFiles);
    
    // Attempt to map back to scenes if counts match
    if (newFiles.length === scenes.length) {
      setScenes(prev => prev.map((s, i) => ({
        ...s,
        status: "done",
        videoUrl: URL.createObjectURL(newFiles[i])
      })));
    }
    
    setCurrentStep(3);
    addToast({ type: "success", title: "Clips Uploaded", message: `${newFiles.length} clips locked and loaded.` });
  };

  // ─── Step 4: Post-Production ──────────────────────────────────

  const handlePostProduction = async () => {
    if (uploadedClips.length === 0) {
      addToast({ type: "error", title: "No videos", message: "Please upload clips first." });
      return;
    }

    setIsProcessing(true);
    setCurrentStep(4);
    setPostProgress(0);

    try {
      addToast({ type: "info", title: "🎞️ Assembling...", message: `Stitching ${uploadedClips.length} clips via WASM` });

      const url = await assembleClips(uploadedClips, (p) => setPostProgress(p));

      setFinalVideoUrl(url);
      setCurrentStep(5);
      addToast({ type: "success", title: "🎬 Film Complete!", message: "Your short film is ready!" });
    } catch (err: any) {
      addToast({ type: "error", title: "Assembly Failed", message: err.message, duration: 10000 });
      setCurrentStep(3); // Reset to upload step
    } finally {
      setIsProcessing(false);
    }
  };

  // ─── Edit Scene ───────────────────────────────────────────────

  const editScene = (id: string, updates: Partial<FilmScene>) => {
    setScenes((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  };

  // ─── Download Final ───────────────────────────────────────────

  const handleDownload = () => {
    if (!finalVideoUrl) return;
    const a = document.createElement("a");
    a.href = finalVideoUrl;
    const safeName = idea.substring(0, 30).replace(/[^a-z0-9]/gi, "_").toLowerCase();
    a.download = `pixar_film_${safeName}_${Date.now()}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    addToast({ type: "success", title: "Downloaded!", message: "Film saved to downloads" });
  };

  // ─── Reset ────────────────────────────────────────────────────

  const handleReset = () => {
    setIdea("");
    setScenes([]);
    setCurrentStep(1);
    setFinalVideoUrl(null);
    setPostProgress(0);
    setIsProcessing(false);
  };

  // Count done scenes for conditional rendering
  const doneCount = scenes.filter((s) => s.status === "done").length;
  const allScenesRendered = scenes.length > 0 && doneCount === scenes.length;

  return (
    <div className="w-[380px] h-full bg-zinc-950/95 border-l border-indigo-500/20 flex flex-col shrink-0 z-20 backdrop-blur-xl">
      {/* Header */}
      <div className="p-4 border-b border-indigo-500/15">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Clapperboard size={16} className="text-purple-400" />
            Film Studio
          </h2>
          {currentStep > 1 && (
            <button
              onClick={handleReset}
              className="text-[10px] text-zinc-500 hover:text-red-400 flex items-center gap-1 transition-colors"
            >
              <RotateCcw size={10} /> Reset
            </button>
          )}
        </div>
        <p className="text-[10px] text-zinc-500">Idea → Script → Render → Film</p>
      </div>

      {/* Step Progress */}
      <StepIndicator currentStep={currentStep} />

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin">
        
        {/* ─── Step 1: Idea Input ──────────────────────────── */}
        {currentStep === 1 && (
          <div className="space-y-3">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 space-y-2">
              {/* Mode Toggle: Generate vs Import */}
              <div className="flex bg-zinc-950 p-0.5 rounded-lg border border-zinc-800 mb-2">
                <button
                  onClick={() => setInputMode('generate')}
                  className={`flex-1 py-1.5 rounded-md text-[10px] font-bold transition-all ${
                    inputMode === 'generate'
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  ✨ Generate from Idea
                </button>
                <button
                  onClick={() => setInputMode('import')}
                  className={`flex-1 py-1.5 rounded-md text-[10px] font-bold transition-all ${
                    inputMode === 'import'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  📋 Import Script
                </button>
              </div>

              <label className="text-[11px] font-semibold text-zinc-300 flex items-center gap-1.5">
                <Sparkles size={12} className="text-purple-400" />
                {inputMode === 'generate' ? 'Your Film Idea' : 'Paste Your Script'}
              </label>
              <textarea
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                placeholder={
                  inputMode === 'generate'
                    ? 'Ví dụ: Cô bé rớt vào vũ trụ nhạc lý, khám phá hành tinh của nốt nhạc...'
                    : 'Paste your full screenplay with scenes, prompts, timestamps...\n\nScene 1 (0:00 - 0:03): Title\nPrompt: ...\n\nScene 2 (0:03 - 0:06): Title\nPrompt: ...'
                }
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-xs text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-indigo-500/50 resize-none scrollbar-thin"
                rows={inputMode === 'import' ? 10 : 3}
                disabled={isProcessing}
              />
              {inputMode === 'import' && (
                <p className="text-[9px] text-zinc-500">
                  💡 Paste scenes with "Prompt cho Veo" or any video prompts. AI will extract all scenes.
                </p>
              )}
            </div>

            {/* Settings */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 space-y-3">
              <label className="text-[11px] font-semibold text-zinc-300">Settings</label>

              {/* Aspect Ratio */}
              <div className="space-y-1">
                <span className="text-[10px] text-zinc-500">Aspect Ratio</span>
                <div className="flex gap-2">
                  {(["16:9", "9:16"] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => setAspectRatio(r)}
                      className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${
                        aspectRatio === r
                          ? "bg-indigo-500/15 border-indigo-500/40 text-indigo-300"
                          : "bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-zinc-300"
                      }`}
                    >
                      {r === "16:9" ? "🖥️ Landscape" : "📱 Portrait"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Resolution */}
              <div className="space-y-1">
                <span className="text-[10px] text-zinc-500">Resolution</span>
                <div className="flex gap-2">
                  {(["720p", "1080p"] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => setResolution(r)}
                      className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${
                        resolution === r
                          ? "bg-indigo-500/15 border-indigo-500/40 text-indigo-300"
                          : "bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-zinc-300"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Character Ref Indicator */}
            {characterRef && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-950/20 border border-indigo-500/20">
                <img src={characterRef} className="w-8 h-8 rounded-md object-cover border border-indigo-500/30" />
                <div>
                  <p className="text-[10px] text-indigo-300 font-medium">Character Locked</p>
                  <p className="text-[9px] text-zinc-500">Will be used as reference</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── Step 2: Script Review ───────────────────────── */}
        {currentStep === 2 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-zinc-300">
                📝 Screenplay — {scenes.length} Scenes
              </span>
              <span className="text-[9px] text-zinc-500">
                ~{scenes.reduce((a, s) => a + s.duration, 0)}s total
              </span>
            </div>
            {scenes.map((scene) => (
              <SceneCard key={scene.id} scene={scene} onEdit={editScene} disabled={isProcessing} />
            ))}
          </div>
        )}

        {/* ─── Step 3: Upload Clips ───────────────────────────── */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-zinc-300">
                📥 Upload Grok Clips ({uploadedClips.length})
              </span>
            </div>
            
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-zinc-700/50 rounded-xl bg-zinc-900/50 hover:bg-zinc-800/50 transition-colors cursor-pointer group">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Video size={24} className="text-zinc-500 group-hover:text-indigo-400 mb-2 transition-colors" />
                <p className="mb-2 text-xs text-zinc-400"><span className="font-semibold text-indigo-400">Click to upload</span> or drag and drop</p>
                <p className="text-[10px] text-zinc-500">MP4 files directly from Grok</p>
              </div>
              <input type="file" className="hidden" accept="video/mp4" multiple onChange={(e) => handleUploadClips(e.target.files)} />
            </label>

            <div className="space-y-2">
              {scenes.map((scene) => (
                <SceneCard key={scene.id} scene={scene} onEdit={editScene} disabled={false} />
              ))}
            </div>
          </div>
        )}

        {/* ─── Step 4: Post-Production ─────────────────────── */}
        {currentStep === 4 && (
          <div className="space-y-3">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-center space-y-3">
              <Scissors size={24} className="text-purple-400 mx-auto animate-pulse" />
              <p className="text-xs text-zinc-300 font-medium">Assembling {uploadedClips.length} clips...</p>
              <div className="w-full bg-zinc-800 rounded-full h-2.5 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-300"
                  style={{ width: `${postProgress}%` }}
                />
              </div>
              <p className="text-[10px] text-zinc-500">
                {postProgress < 100 
                  ? `${postProgress.toFixed(0)}% — Processing via FFmpeg WASM...`
                  : "Finalizing..."}
              </p>
            </div>
          </div>
        )}

        {/* ─── Step 5: Done ────────────────────────────────── */}
        {currentStep === 5 && finalVideoUrl && (
          <div className="space-y-3">
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/10 p-3 space-y-3">
              <div className="flex items-center gap-2">
                <Film size={16} className="text-emerald-400" />
                <span className="text-sm font-bold text-white">Film Complete!</span>
              </div>
              <video
                src={finalVideoUrl}
                controls
                autoPlay
                className="w-full rounded-lg border border-zinc-800"
              />
            </div>
          </div>
        )}
      </div>

      {/* Footer Action */}
      <div className="p-3 border-t border-indigo-500/15 bg-zinc-950">
        {currentStep === 1 && inputMode === 'generate' && (
          <button
            onClick={handleGenerateScript}
            disabled={!idea.trim() || isProcessing}
            className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
              !idea.trim() || isProcessing
                ? "bg-zinc-900 text-zinc-600 cursor-not-allowed border border-zinc-800"
                : "bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40"
            }`}
          >
            {isProcessing ? (
              <><Loader2 size={16} className="animate-spin" /> Writing Script...</>
            ) : (
              <><Wand2 size={16} /> Generate Screenplay</>
            )}
          </button>
        )}

        {currentStep === 1 && inputMode === 'import' && (
          <button
            onClick={handleImportScript}
            disabled={!idea.trim() || isProcessing}
            className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
              !idea.trim() || isProcessing
                ? "bg-zinc-900 text-zinc-600 cursor-not-allowed border border-zinc-800"
                : "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40"
            }`}
          >
            {isProcessing ? (
              <><Loader2 size={16} className="animate-spin" /> Parsing Script...</>
            ) : (
              <><Edit3 size={16} /> Import & Parse Script</>
            )}
          </button>
        )}

        {currentStep === 2 && (
          <div className="space-y-2">
            <label className="flex w-full py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-indigo-500 to-blue-500 text-white shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 items-center justify-center gap-2 transition-all cursor-pointer">
              <Play size={16} /> Upload ${scenes.length} Clips (MP4)
              <input type="file" className="hidden" accept="video/mp4" multiple onChange={(e) => handleUploadClips(e.target.files)} />
            </label>
          </div>
        )}

        {currentStep === 3 && !isProcessing && uploadedClips.length > 0 && (
          <button
            onClick={handlePostProduction}
            className="w-full py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 flex items-center justify-center gap-2 transition-all"
          >
            <Scissors size={16} /> Assembling {uploadedClips.length} Clips → Final Film
          </button>
        )}

        {currentStep === 5 && (
          <button
            onClick={handleDownload}
            className="w-full py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 flex items-center justify-center gap-2 transition-all"
          >
            <Download size={16} /> Download Film (WebM)
          </button>
        )}
      </div>
    </div>
  );
};
