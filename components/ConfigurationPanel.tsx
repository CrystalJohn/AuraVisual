
import React, { useState, useRef } from 'react';
import { Upload, X, Wand2, Loader2, Layers, ChevronDown, Shirt, Sparkles, Image as ImageIcon, Sliders, Type, ScanFace } from 'lucide-react';
import { AspectRatio, ModelStyle } from '../types';
import { ASPECT_RATIO_OPTIONS, STYLE_OPTIONS, OUTFIT_PRESETS } from '../constants';

interface ConfigurationPanelProps {
  onGenerate: (prompt: string, ratio: AspectRatio, style: ModelStyle, outfit: string, batchSize: number, imageStrength: number, finalReferenceImage: string | null) => void;
  isGenerating: boolean;
  referenceImage: string | null;
  onUploadReference: (file: File) => void;
  onClearReference: () => void;
}

export const ConfigurationPanel: React.FC<ConfigurationPanelProps> = ({
  onGenerate,
  isGenerating,
  referenceImage,
  onUploadReference,
  onClearReference
}) => {
  const [prompt, setPrompt] = useState('');
  const [selectedRatio, setSelectedRatio] = useState<AspectRatio>(AspectRatio.PORTRAIT);
  const [selectedStyle, setSelectedStyle] = useState<ModelStyle>(ModelStyle.PHOTOREALISTIC);
  const [batchSize, setBatchSize] = useState<number>(1);
  const [imageStrength, setImageStrength] = useState<number>(0.75);
  
  // New Mode State
  const [mode, setMode] = useState<'text' | 'image'>('text');
  
  const [selectedOutfitPrompt, setSelectedOutfitPrompt] = useState('');
  const [customOutfit, setCustomOutfit] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    if (!prompt.trim()) return;
    
    // Mode Validation
    if (mode === 'image' && !referenceImage) {
        alert("Please upload a reference image to use Reference Mode.");
        return;
    }

    let finalOutfit = customOutfit.trim();
    if (selectedOutfitPrompt && !finalOutfit.includes(selectedOutfitPrompt)) {
        finalOutfit = finalOutfit ? `${selectedOutfitPrompt}, ${finalOutfit}` : selectedOutfitPrompt;
    }

    // Determine effective image based on mode
    const effectiveReferenceImage = mode === 'image' ? referenceImage : null;

    onGenerate(prompt, selectedRatio, selectedStyle, finalOutfit, batchSize, imageStrength, effectiveReferenceImage);
    setPrompt(''); // Clear input immediately
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onUploadReference(e.target.files[0]);
    }
  };

  return (
    <div className="w-[400px] h-full bg-zinc-950 border-l border-zinc-800 flex flex-col shrink-0 z-20">
      {/* Header */}
      <div className="p-6 border-b border-zinc-800">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Sparkles size={18} className="text-lime-400" />
          Studio Config
        </h2>
        <p className="text-xs text-zinc-500 mt-1">Configure your generation parameters</p>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-thin">
        
        {/* 1. Mode & Reference Image */}
        <div className="space-y-4">
          <label className="text-sm font-medium text-zinc-400 uppercase tracking-wider flex items-center gap-2">
            <Layers size={14} /> Generation Mode
          </label>

          {/* Mode Switcher */}
          <div className="bg-zinc-900 p-1 rounded-lg flex border border-zinc-800">
            <button
                onClick={() => setMode('text')}
                className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-md transition-all flex items-center justify-center gap-2 ${mode === 'text' ? 'bg-zinc-800 text-lime-400 shadow-sm border border-zinc-700' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
                <Type size={14} />
                Creative
            </button>
            <button
                onClick={() => setMode('image')}
                className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-md transition-all flex items-center justify-center gap-2 ${mode === 'image' ? 'bg-zinc-800 text-lime-400 shadow-sm border border-zinc-700' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
                <ScanFace size={14} />
                Reference
            </button>
          </div>
          
          {/* Conditional Upload UI */}
          {mode === 'image' && (
            <div className="animate-in slide-in-from-top-2 fade-in duration-300 space-y-3">
                 {referenceImage ? (
                    <div className="space-y-3">
                        <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden border border-lime-500/30 group">
                        <img src={referenceImage} alt="Reference" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                            onClick={onClearReference}
                            className="bg-red-500/20 text-red-400 px-4 py-2 rounded-lg border border-red-500/50 hover:bg-red-500 hover:text-white transition-colors text-sm font-medium flex items-center gap-2"
                            >
                            <X size={14} /> Remove
                            </button>
                        </div>
                        </div>
                        
                        {/* Image Strength Slider */}
                        <div className="bg-zinc-900 rounded-lg p-3 border border-zinc-800">
                            <div className="flex justify-between items-center mb-2">
                                <label className="text-xs text-zinc-400 flex items-center gap-1">
                                    <Sliders size={12} /> Influence Strength
                                </label>
                                <span className="text-xs font-mono text-lime-400">{Math.round(imageStrength * 100)}%</span>
                            </div>
                            <input 
                                type="range" 
                                min="0.1" 
                                max="1" 
                                step="0.05" 
                                value={imageStrength} 
                                onChange={(e) => setImageStrength(parseFloat(e.target.value))}
                                className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-lime-400"
                            />
                            <p className="text-[10px] text-zinc-600 mt-1.5 leading-tight">
                                Higher values keep more structure/pose from the original. Lower values allow more creative freedom.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full aspect-[4/3] rounded-xl border-2 border-dashed border-zinc-800 hover:border-lime-500/50 hover:bg-zinc-900/50 transition-all cursor-pointer flex flex-col items-center justify-center gap-2 group"
                    >
                    <div className="w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Upload size={20} className="text-zinc-500 group-hover:text-lime-400" />
                    </div>
                    <span className="text-sm text-zinc-500 group-hover:text-zinc-300">Upload character/pose photo</span>
                    <input 
                        ref={fileInputRef}
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={handleFileChange} 
                    />
                    </div>
                )}
            </div>
          )}
        </div>

        {/* 2. Prompt */}
        <div className="space-y-3">
           <label className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Scene Description</label>
           <textarea
             value={prompt}
             onChange={(e) => setPrompt(e.target.value)}
             placeholder={mode === 'image' ? "Describe how to adapt the reference character..." : "Describe the scene, lighting, and character appearance..."}
             className="w-full h-32 bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-lime-500/50 focus:ring-1 focus:ring-lime-500/20 resize-none transition-all"
           />
           
           {/* Sample Prompts */}
           <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
             {[
               "Cyberpunk street market at night, neon lights",
               "Portrait in a sunlit garden, soft bokeh",
               "Futuristic fashion editorial, sleek white background"
             ].map((sample, i) => (
               <button
                 key={i}
                 onClick={() => setPrompt(sample)}
                 className="whitespace-nowrap px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-400 hover:text-lime-400 hover:border-lime-500/30 transition-colors"
               >
                 {sample}
               </button>
             ))}
           </div>
        </div>

        {/* 3. Style & Outfit */}
        <div className="space-y-6">
           {/* Model Style */}
           <div className="space-y-3">
             <label className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Visual Style</label>
             <div className="grid grid-cols-2 gap-2">
                {STYLE_OPTIONS.map((style) => (
                  <button
                    key={style.value}
                    onClick={() => setSelectedStyle(style.value)}
                    className={`text-xs p-3 rounded-lg border text-left transition-all ${selectedStyle === style.value ? 'bg-zinc-800 border-lime-500/50 text-lime-400' : 'bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:bg-zinc-800'}`}
                  >
                    {style.label}
                  </button>
                ))}
             </div>
           </div>

           {/* Outfit */}
           <div className="space-y-3">
             <label className="text-sm font-medium text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                <Shirt size={14} /> Fashion & Outfit
             </label>
             <div className="grid grid-cols-2 gap-2">
                {OUTFIT_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => setSelectedOutfitPrompt(selectedOutfitPrompt === preset.prompt ? '' : preset.prompt)}
                    className={`text-xs p-2 rounded-lg border transition-all truncate ${selectedOutfitPrompt === preset.prompt ? 'bg-zinc-800 border-lime-500/50 text-lime-400' : 'bg-zinc-900/50 border-zinc-800 text-zinc-500 hover:text-zinc-300'}`}
                  >
                    {preset.label}
                  </button>
                ))}
             </div>
             <input 
                type="text"
                value={customOutfit}
                onChange={(e) => setCustomOutfit(e.target.value)}
                placeholder="Custom outfit (e.g. Red silk dress)"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-lime-500/50"
             />
           </div>
        </div>

        {/* 4. Settings (Batch & Ratio) */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-zinc-400 uppercase tracking-wider flex items-center gap-2">
             <Layers size={14} /> Settings
          </label>
          
          <div className="flex items-center justify-between p-3 bg-zinc-900 rounded-xl border border-zinc-800">
             <span className="text-sm text-zinc-300">Batch Size</span>
             <div className="flex bg-zinc-950 p-1 rounded-lg border border-zinc-800">
                {[1, 2, 3, 4].map((num) => (
                  <button
                    key={num}
                    onClick={() => setBatchSize(num)}
                    className={`w-8 h-8 rounded flex items-center justify-center text-sm font-bold transition-all ${batchSize === num ? 'bg-zinc-800 text-lime-400 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                  >
                    {num}
                  </button>
                ))}
             </div>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-zinc-900 rounded-xl border border-zinc-800">
             <span className="text-sm text-zinc-300">Aspect Ratio</span>
             <div className="flex items-center gap-2 text-xs font-mono text-zinc-500">
                <span>9:16 (Portrait)</span>
             </div>
          </div>
        </div>

        {/* Padding for bottom scroll */}
        <div className="h-4"></div>
      </div>

      {/* Footer Action */}
      <div className="p-6 border-t border-zinc-800 bg-zinc-950">
        <button
            onClick={handleSubmit}
            disabled={!prompt.trim()}
            className={`
                w-full h-14 rounded-xl font-bold text-base transition-all flex items-center justify-center gap-3 uppercase tracking-wide
                ${!prompt.trim() 
                    ? 'bg-zinc-900 text-zinc-600 cursor-not-allowed border border-zinc-800' 
                    : 'bg-lime-400 hover:bg-lime-500 text-black shadow-[0_0_20px_-5px_rgba(163,230,53,0.4)] hover:shadow-[0_0_30px_-5px_rgba(163,230,53,0.6)]'
                }
            `}
        >
            {isGenerating ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Queuing...
                </>
            ) : (
                <>
                    <Wand2 size={20} className="fill-current" />
                    Generate Image
                </>
            )}
        </button>
      </div>

    </div>
  );
};
