
import React, { useState, useEffect } from 'react';
import { Sidebar } from '../../components/Sidebar';
import { Gallery } from '../../components/Gallery';
import { GeneratedImage, AspectRatio, ModelStyle, GenerationTask } from '../../types';
import { generatePixarImage } from '../services/pixarService';
import { Info, Sparkles, Loader2, Heart, Clapperboard, Send, AlertCircle, CheckCircle2, Clock, RefreshCw } from 'lucide-react';

const PixarStudio: React.FC = () => {
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [currentImage, setCurrentImage] = useState<GeneratedImage | null>(null);
  const [tasks, setTasks] = useState<GenerationTask[]>([]);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState<ModelStyle>(ModelStyle.PIXAR_CLASSIC);
  const [ratio, setRatio] = useState<AspectRatio>(AspectRatio.LANDSCAPE);
  const [batchSize, setBatchSize] = useState(1);

  useEffect(() => {
    const savedFavs = localStorage.getItem('pixar_favorites');
    if (savedFavs) setFavorites(JSON.parse(savedFavs));
    
    const savedImages = localStorage.getItem('pixar_images');
    if (savedImages) {
      const parsed = JSON.parse(savedImages);
      setImages(parsed);
      if (parsed.length > 0) setCurrentImage(parsed[0]);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('pixar_favorites', JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    if (images.length > 0) localStorage.setItem('pixar_images', JSON.stringify(images));
  }, [images]);

  const toggleFavorite = (id: string) => {
    setFavorites(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    // @ts-ignore
    if (window.aistudio) {
        // @ts-ignore
        const hasKey = await window.aistudio.hasSelectedApiKey();
        if (!hasKey) {
             // @ts-ignore
             await window.aistudio.openSelectKey();
        }
    }

    const taskId = Date.now().toString();
    const newTask: GenerationTask = {
      id: taskId,
      status: 'pending',
      timestamp: Date.now(),
      params: {
        prompt,
        style,
        ratio
      }
    };

    setTasks(prev => [newTask, ...prev]);
    const currentPrompt = prompt;
    const currentStyle = style;
    const currentRatio = ratio;
    setPrompt(''); // Clear input immediately
    setError(null);

    generatePixarImage(currentPrompt, currentStyle, currentRatio, batchSize)
      .then((generatedBase64s) => {
        const batchId = taskId;
        const newImages: GeneratedImage[] = generatedBase64s.map((url, index) => ({
          id: `${batchId}-${index}`,
          url,
          prompt: currentPrompt,
          style: currentStyle,
          ratio: currentRatio,
          timestamp: Date.now(),
          batchId
        }));

        setImages(prev => [...newImages.reverse(), ...prev]);
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'completed', images: generatedBase64s } : t));
        
        if (newImages.length > 0) {
          setCurrentImage(newImages[0]);
        }
      })
      .catch((err: any) => {
        console.error(err);
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'failed' } : t));
        setError(err.message || "Failed to generate Pixar image.");
      });
  };

  const handleRegenerate = (originalTask: GenerationTask) => {
    const { prompt: originalPrompt, style: originalStyle, ratio: originalRatio } = originalTask.params;
    
    // @ts-ignore
    if (window.aistudio) {
        // @ts-ignore
        const hasKey = window.aistudio.hasSelectedApiKey();
        if (!hasKey) {
             // @ts-ignore
             window.aistudio.openSelectKey();
        }
    }

    const taskId = Date.now().toString();
    const newTask: GenerationTask = {
      id: taskId,
      status: 'pending',
      timestamp: Date.now(),
      params: {
        prompt: originalPrompt,
        style: originalStyle,
        ratio: originalRatio
      }
    };

    setTasks(prev => [newTask, ...prev]);
    setError(null);

    generatePixarImage(originalPrompt, originalStyle, originalRatio, batchSize)
      .then((generatedBase64s) => {
        const batchId = taskId;
        const newImages: GeneratedImage[] = generatedBase64s.map((url, index) => ({
          id: `${batchId}-${index}`,
          url,
          prompt: originalPrompt,
          style: originalStyle,
          ratio: originalRatio,
          timestamp: Date.now(),
          batchId
        }));

        setImages(prev => [...newImages.reverse(), ...prev]);
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'completed', images: generatedBase64s } : t));
        
        if (newImages.length > 0) {
          setCurrentImage(newImages[0]);
        }
      })
      .catch((err: any) => {
        console.error(err);
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'failed' } : t));
        setError(err.message || "Failed to regenerate Pixar image.");
      });
  };

  return (
    <div className="flex w-full h-screen bg-[#050505] overflow-hidden text-zinc-200 font-sans">
      <Sidebar 
        onToggleGallery={() => setIsGalleryOpen(!isGalleryOpen)}
        isGalleryOpen={isGalleryOpen}
      />
      <Gallery 
        images={images} 
        favorites={favorites}
        onSelect={setCurrentImage} 
        isOpen={isGalleryOpen} 
        onToggle={() => setIsGalleryOpen(!isGalleryOpen)}
        currentId={currentImage?.id}
      />

      <div className={`flex flex-1 ml-16 h-full transition-all duration-300 ease-in-out ${isGalleryOpen ? 'pl-72' : 'pl-0'}`}>
        <main className="flex-1 relative flex flex-col bg-indigo-950/5">
           <div className="absolute inset-0 opacity-[0.05] pointer-events-none" 
                style={{ 
                    backgroundImage: `radial-gradient(circle at 2px 2px, #6366f1 1px, transparent 0)`, 
                    backgroundSize: '32px 32px' 
                }} 
           />

           {error && (
              <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-red-500/10 border border-red-500/20 text-red-200 px-4 py-3 rounded-lg flex items-center gap-3 backdrop-blur-md z-50">
                  <Info size={18} />
                  <span>{error}</span>
              </div>
           )}

           <div className="flex-1 relative flex items-center justify-center p-8 overflow-hidden">
                {currentImage ? (
                  <div className="relative group max-h-full max-w-full flex items-center justify-center">
                    <img 
                      src={currentImage.url} 
                      alt={currentImage.prompt}
                      className="max-h-[80vh] max-w-full object-contain rounded-2xl shadow-[0_0_50px_rgba(99,102,241,0.2)] border border-indigo-500/20"
                    />
                    <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => {
                          const task = tasks.find(t => t.id === currentImage.batchId);
                          if (task) handleRegenerate(task);
                        }}
                        className="p-3 rounded-full backdrop-blur-md border bg-black/40 border-white/10 text-white hover:bg-black/60 transition-all"
                        title="Regenerate Variation"
                      >
                        <RefreshCw size={20} />
                      </button>
                      <button 
                        onClick={() => toggleFavorite(currentImage.id)}
                        className={`p-3 rounded-full backdrop-blur-md border transition-all ${
                          favorites.includes(currentImage.id) 
                            ? 'bg-red-500/20 border-red-500/50 text-red-400' 
                            : 'bg-black/40 border-white/10 text-white hover:bg-black/60'
                        }`}
                      >
                        <Heart size={20} fill={favorites.includes(currentImage.id) ? "currentColor" : "none"} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center max-w-md">
                    <div className="w-24 h-24 bg-indigo-500/10 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-indigo-500/20 rotate-3">
                      <Clapperboard size={40} className="text-indigo-400" />
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-3 tracking-tight">Pixar 3D Studio</h2>
                    <p className="text-zinc-400 text-lg leading-relaxed">Bring your characters to life with the magic of Disney & Pixar animation styles.</p>
                  </div>
                )}
           </div>

           {/* Generation Queue Area */}
           <div className="h-48 border-t border-indigo-500/10 bg-black/40 backdrop-blur-md flex flex-col shrink-0">
               <div className="px-6 py-2 border-b border-indigo-500/10 flex justify-between items-center">
                    <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-2">
                        Studio Queue {tasks.length > 0 && <span className="bg-indigo-950/50 text-indigo-300 px-1.5 rounded border border-indigo-500/20">{tasks.length}</span>}
                    </h3>
               </div>
               <div className="flex-1 flex items-center px-6 gap-4 overflow-x-auto scrollbar-thin py-4">
                    {tasks.length > 0 ? (
                        tasks.map((task) => (
                            <div 
                                key={task.id}
                                className={`
                                    relative w-32 h-32 rounded-lg overflow-hidden border-2 transition-all shrink-0 group flex flex-col
                                    ${task.status === 'pending' ? 'border-indigo-500/20 bg-indigo-500/5' : 
                                      task.status === 'failed' ? 'border-red-500/30 bg-red-500/5' : 
                                      'border-indigo-500/10 hover:border-indigo-500/50'}
                                `}
                            >
                                {task.status === 'pending' && (
                                    <div className="flex-1 flex flex-col items-center justify-center p-3 text-center">
                                        <Loader2 size={24} className="text-indigo-400 animate-spin mb-2" />
                                        <p className="text-[10px] text-zinc-500 line-clamp-2">{task.params.prompt}</p>
                                    </div>
                                )}
                                {task.status === 'failed' && (
                                    <div className="flex-1 flex flex-col items-center justify-center p-3 text-center">
                                        <AlertCircle size={24} className="text-red-500 mb-2" />
                                        <p className="text-[10px] text-red-400 font-medium">Failed</p>
                                    </div>
                                )}
                                {task.status === 'completed' && task.images && (
                                    <div className="w-full h-full relative">
                                        <button 
                                            onClick={() => {
                                                const img = images.find(i => i.batchId === task.id);
                                                if (img) setCurrentImage(img);
                                            }}
                                            className="w-full h-full"
                                        >
                                            <img src={task.images[0]} className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                                            <div className="absolute top-1 right-1">
                                                <CheckCircle2 size={12} className="text-indigo-400 bg-black/60 rounded-full" />
                                            </div>
                                        </button>
                                        
                                        {/* Regenerate Button on Task Card */}
                                        <button 
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleRegenerate(task);
                                          }}
                                          className="absolute bottom-1 right-1 p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm border border-white/10"
                                          title="Regenerate"
                                        >
                                          <RefreshCw size={10} />
                                        </button>
                                    </div>
                                )}
                                <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-sm py-1 px-2 flex items-center justify-between">
                                    <span className="text-[8px] text-zinc-400 flex items-center gap-1">
                                        <Clock size={8} /> {new Date(task.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="w-full flex items-center justify-center text-zinc-700 text-sm gap-2">
                            <div className="h-px w-8 bg-zinc-800"></div>
                            Queue is empty
                            <div className="h-px w-8 bg-zinc-800"></div>
                        </div>
                    )}
               </div>
           </div>
        </main>

        <aside className="w-80 border-l border-white/5 bg-[#0a0a0c] flex flex-col p-6 overflow-y-auto">
          <div className="mb-8">
            <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-6">Studio Controls</h3>
            
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-medium text-zinc-500 uppercase mb-3">Character Prompt</label>
                <textarea 
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="A cute robot exploring a futuristic garden..."
                  className="w-full h-32 bg-zinc-900 border border-white/5 rounded-xl p-4 text-sm focus:outline-none focus:border-indigo-500/50 transition-colors resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-500 uppercase mb-3">Animation Style</label>
                <div className="grid grid-cols-1 gap-2">
                  {[ModelStyle.PIXAR_CLASSIC, ModelStyle.MODERN_DISNEY, ModelStyle.CLAYMATION].map((s) => (
                    <button
                      key={s}
                      onClick={() => setStyle(s)}
                      className={`px-4 py-3 rounded-xl text-sm font-medium transition-all text-left border ${
                        style === s 
                          ? 'bg-indigo-500/10 border-indigo-500/50 text-indigo-300' 
                          : 'bg-zinc-900 border-transparent text-zinc-400 hover:bg-zinc-800'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-500 uppercase mb-3">Aspect Ratio</label>
                <div className="flex gap-2">
                  {[AspectRatio.LANDSCAPE, AspectRatio.CLASSIC, AspectRatio.PORTRAIT].map((r) => (
                    <button
                      key={r}
                      onClick={() => setRatio(r)}
                      className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all ${
                        ratio === r 
                          ? 'bg-indigo-500/10 border-indigo-500/50 text-indigo-300' 
                          : 'bg-zinc-900 border-transparent text-zinc-400 hover:bg-zinc-800'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleGenerate}
                disabled={!prompt.trim()}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
              >
                {tasks.some(t => t.status === 'pending') ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                {tasks.some(t => t.status === 'pending') ? 'RENDERING...' : 'GENERATE MAGIC'}
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default PixarStudio;
