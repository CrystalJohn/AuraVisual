
import React, { useState } from 'react';
import { Plus, X, Wand2, Loader2, ChevronDown, Shirt, Layers } from 'lucide-react';
import { AspectRatio, ModelStyle } from '../types';
import { ASPECT_RATIO_OPTIONS, STYLE_OPTIONS, OUTFIT_PRESETS } from '../constants';

interface ControlBarProps {
  onGenerate: (prompt: string, ratio: AspectRatio, style: ModelStyle, outfit: string, batchSize: number) => void;
  isGenerating: boolean;
  referenceImage: string | null;
  onUploadReference: (file: File) => void;
  onClearReference: () => void;
}

export const ControlBar: React.FC<ControlBarProps> = ({
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
  
  // Fashion / Outfit State
  const [selectedOutfitPrompt, setSelectedOutfitPrompt] = useState('');
  const [customOutfit, setCustomOutfit] = useState('');
  
  const [activeMenu, setActiveMenu] = useState<'ratio' | 'model' | 'outfit' | 'batch' | null>(null);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    if (!prompt.trim() || isGenerating) return;
    
    // Combine custom input and preset if both exist, or use whichever is available
    let finalOutfit = customOutfit.trim();
    if (selectedOutfitPrompt && !finalOutfit.includes(selectedOutfitPrompt)) {
        finalOutfit = finalOutfit ? `${selectedOutfitPrompt}, ${finalOutfit}` : selectedOutfitPrompt;
    }

    onGenerate(prompt, selectedRatio, selectedStyle, finalOutfit, batchSize);
    setActiveMenu(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onUploadReference(e.target.files[0]);
    }
  };

  // Helper to get labels
  const currentRatioLabel = ASPECT_RATIO_OPTIONS.find(r => r.value === selectedRatio)?.label || '9:16';
  const currentStyleLabel = STYLE_OPTIONS.find(s => s.value === selectedStyle)?.label || 'Model';
  
  // Determine if an outfit is active for UI highlighting
  const isOutfitActive = selectedOutfitPrompt !== '' || customOutfit !== '';

  return (
    <div className="fixed bottom-6 left-20 right-4 z-40 flex justify-center pointer-events-none">
      
      {/* Popovers for Settings */}
      {activeMenu === 'ratio' && (
        <div className="absolute bottom-20 right-[350px] bg-zinc-900 border border-zinc-700 rounded-xl p-2 w-48 shadow-2xl pointer-events-auto animate-in slide-in-from-bottom-2 fade-in">
             <div className="grid grid-cols-1 gap-1">
                {ASPECT_RATIO_OPTIONS.map((opt) => (
                    <button 
                        key={opt.value}
                        onClick={() => { setSelectedRatio(opt.value); setActiveMenu(null); }}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm hover:bg-zinc-800 transition-colors ${selectedRatio === opt.value ? 'text-lime-400 bg-zinc-800' : 'text-zinc-400'}`}
                    >
                        <opt.icon size={16} />
                        {opt.label}
                    </button>
                ))}
             </div>
        </div>
      )}

      {activeMenu === 'model' && (
        <div className="absolute bottom-20 right-[220px] bg-zinc-900 border border-zinc-700 rounded-xl p-2 w-56 shadow-2xl pointer-events-auto animate-in slide-in-from-bottom-2 fade-in">
             <div className="max-h-60 overflow-y-auto scrollbar-thin">
                {STYLE_OPTIONS.map((opt) => (
                    <button 
                        key={opt.value}
                        onClick={() => { setSelectedStyle(opt.value); setActiveMenu(null); }}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-zinc-800 transition-colors mb-1 ${selectedStyle === opt.value ? 'text-lime-400 bg-zinc-800' : 'text-zinc-400'}`}
                    >
                        {opt.label}
                    </button>
                ))}
             </div>
        </div>
      )}

      {activeMenu === 'batch' && (
        <div className="absolute bottom-20 right-[150px] bg-zinc-900 border border-zinc-700 rounded-xl p-3 w-40 shadow-2xl pointer-events-auto animate-in slide-in-from-bottom-2 fade-in">
             <h3 className="text-xs font-bold text-zinc-400 uppercase mb-2 px-1">Batch Size</h3>
             <div className="flex justify-between gap-1">
                {[1, 2, 3, 4].map((num) => (
                    <button 
                        key={num}
                        onClick={() => { setBatchSize(num); setActiveMenu(null); }}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold transition-all ${batchSize === num ? 'bg-lime-500 text-black' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
                    >
                        {num}
                    </button>
                ))}
             </div>
        </div>
      )}

      {/* Outfit Popover */}
      {activeMenu === 'outfit' && (
        <div className="absolute bottom-20 right-[400px] md:right-[450px] bg-zinc-900 border border-zinc-700 rounded-xl p-3 w-72 shadow-2xl pointer-events-auto animate-in slide-in-from-bottom-2 fade-in">
             <h3 className="text-xs font-bold text-zinc-400 uppercase mb-2 px-1">Outfit Presets</h3>
             <div className="grid grid-cols-2 gap-2 mb-3">
                {OUTFIT_PRESETS.map((opt) => (
                    <button 
                        key={opt.id}
                        onClick={() => setSelectedOutfitPrompt(selectedOutfitPrompt === opt.prompt ? '' : opt.prompt)}
                        className={`text-xs px-2 py-2 rounded-lg border transition-colors truncate ${selectedOutfitPrompt === opt.prompt ? 'bg-lime-500/20 border-lime-500/50 text-lime-300' : 'bg-zinc-800 border-transparent text-zinc-300 hover:border-zinc-600'}`}
                        title={opt.label}
                    >
                        {opt.label}
                    </button>
                ))}
             </div>
             
             <div className="h-px bg-zinc-800 w-full mb-3" />
             
             <h3 className="text-xs font-bold text-zinc-400 uppercase mb-2 px-1">Custom Outfit</h3>
             <input 
                type="text" 
                value={customOutfit}
                onChange={(e) => setCustomOutfit(e.target.value)}
                placeholder="e.g. Red sweater, blue jeans..."
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-lime-500/50"
             />
        </div>
      )}


      {/* Main Bar Container */}
      <div className="w-full max-w-5xl bg-[#1e1e21] border border-zinc-700 rounded-2xl shadow-2xl p-2 pl-3 flex items-center gap-3 pointer-events-auto relative">
        
        {/* Attachment / Reference */}
        <div className="relative shrink-0">
            {referenceImage ? (
                <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-lime-500/50 group">
                    <img src={referenceImage} alt="Ref" className="w-full h-full object-cover" />
                    <button 
                        onClick={onClearReference}
                        className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                        <X size={14} className="text-white" />
                    </button>
                </div>
            ) : (
                <label className="w-10 h-10 flex items-center justify-center rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white cursor-pointer transition-colors border border-dashed border-zinc-600 hover:border-zinc-500" title="Upload Reference Image">
                    <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                    <Plus size={20} />
                </label>
            )}
        </div>

        {/* Input Field */}
        <div className="flex-1">
            <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={referenceImage ? "Describe the scene..." : "Describe the scene you imagine..."}
                className="w-full bg-transparent border-none focus:ring-0 text-base text-white placeholder-zinc-500 py-3 px-2 font-light"
                disabled={isGenerating}
            />
        </div>

        {/* Vertical Divider */}
        <div className="w-px h-8 bg-zinc-700" />

        {/* Settings Buttons */}
        <div className="flex items-center gap-2 shrink-0">
            
            {/* Fashion Stylist Button */}
            <button 
                onClick={() => setActiveMenu(activeMenu === 'outfit' ? null : 'outfit')}
                className={`flex items-center justify-center w-9 h-9 rounded-lg transition-colors border border-transparent 
                ${isOutfitActive ? 'text-lime-400 bg-zinc-800 border-lime-500/30' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
                title="AI Fashion Stylist"
            >
                <Shirt size={18} />
            </button>

            {/* Ratio Button */}
            <button 
                onClick={() => setActiveMenu(activeMenu === 'ratio' ? null : 'ratio')}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 transition-colors border border-transparent hover:border-zinc-600 hidden md:flex"
            >
                <span className="text-zinc-500">Ratio</span>
                <span>{currentRatioLabel}</span>
            </button>

             {/* Batch Size Button */}
             <button 
                onClick={() => setActiveMenu(activeMenu === 'batch' ? null : 'batch')}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 transition-colors border border-transparent hover:border-zinc-600 hidden lg:flex"
            >
                <Layers size={14} className={batchSize > 1 ? "text-lime-400" : "text-zinc-500"} />
                <span>{batchSize}x</span>
            </button>

            {/* Model Selector */}
            <button 
                onClick={() => setActiveMenu(activeMenu === 'model' ? null : 'model')}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 transition-colors border border-transparent hover:border-zinc-600 min-w-[120px] justify-between"
            >
                <span className="truncate max-w-[100px]">{currentStyleLabel}</span>
                <ChevronDown size={14} className="text-zinc-500" />
            </button>
        </div>

        {/* Generate Button (Lime) */}
        <button
            onClick={handleSubmit}
            disabled={!prompt.trim() || isGenerating}
            className={`
                h-10 px-6 rounded-xl font-bold text-sm transition-all flex items-center gap-2 shrink-0 ml-1
                ${!prompt.trim() || isGenerating 
                    ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' 
                    : 'bg-lime-400 hover:bg-lime-500 text-black shadow-[0_0_20px_-5px_rgba(163,230,53,0.4)] hover:shadow-[0_0_25px_-5px_rgba(163,230,53,0.6)]'
                }
            `}
        >
            {isGenerating ? (
                <Loader2 size={18} className="animate-spin" />
            ) : (
                <>
                    <span>Generate</span>
                    <Wand2 size={16} fill="black" />
                </>
            )}
        </button>

      </div>
    </div>
  );
};
