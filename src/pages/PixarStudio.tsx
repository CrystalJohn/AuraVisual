
import React, { useState, useEffect } from 'react';
import { Sidebar } from '../../components/Sidebar';
import { Gallery } from '../../components/Gallery';
import { PromptBoard } from '../../components/PromptBoard';
import { GeneratedImage, AspectRatio, ModelStyle, GenerationTask, PromptCard } from '../../types';
import { generatePixarImage } from '../services/pixarService';
import { Info, Sparkles, Loader2, Heart, Clapperboard, Send, AlertCircle, CheckCircle2, Clock, RefreshCw, Download } from 'lucide-react';
import { rateLimiter } from '../../services/rateLimiter';
import { useToast } from '../../components/Toast';

const createNewCard = (): PromptCard => ({
  id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
  prompt: '',
  style: ModelStyle.PIXAR_CLASSIC,
  ratio: AspectRatio.LANDSCAPE,
  status: 'idle',
});

const PixarStudio: React.FC = () => {
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [currentImage, setCurrentImage] = useState<GeneratedImage | null>(null);
  const [tasks, setTasks] = useState<GenerationTask[]>([]);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { addToast } = useToast();

  // Prompt Board State
  const [promptCards, setPromptCards] = useState<PromptCard[]>([createNewCard()]);
  const [isRunningAll, setIsRunningAll] = useState(false);

  // Quota Info (polling)
  const [quotaInfo, setQuotaInfo] = useState(rateLimiter.getQuotaInfo());

  useEffect(() => {
    const interval = setInterval(() => {
      setQuotaInfo(rateLimiter.getQuotaInfo());
    }, 2000);
    return () => clearInterval(interval);
  }, []);

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
    try {
      localStorage.setItem('pixar_favorites', JSON.stringify(favorites));
    } catch (e) {
      console.warn('Failed to save favorites to localStorage', e);
    }
  }, [favorites]);

  useEffect(() => {
    if (images.length > 0) {
      try {
        localStorage.setItem('pixar_images', JSON.stringify(images));
      } catch (e) {
        console.warn('localStorage quota exceeded, clearing old pixar images', e);
        // Keep only the latest 10 images to free space
        try {
          const trimmed = images.slice(0, 10);
          localStorage.setItem('pixar_images', JSON.stringify(trimmed));
        } catch (e2) {
          // If still fails, just remove the key entirely
          localStorage.removeItem('pixar_images');
        }
      }
    }
  }, [images]);

  const toggleFavorite = (id: string) => {
    setFavorites(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);
  };

  /**
   * Run All — process all idle cards IN PARALLEL using Promise.allSettled
   */
  const handleRunAll = async () => {
    const idleCards = promptCards.filter(c => c.status === 'idle' && c.prompt.trim());
    if (idleCards.length === 0) return;

    setIsRunningAll(true);
    setError(null);

    // Mark all idle cards as "queued"
    setPromptCards(prev => prev.map(c => 
      c.status === 'idle' && c.prompt.trim() ? { ...c, status: 'queued' as const } : c
    ));

    // Fire all in parallel
    const promises = idleCards.map(async (card) => {
      // Mark as generating
      setPromptCards(prev => prev.map(c => 
        c.id === card.id ? { ...c, status: 'generating' as const } : c
      ));

      // Create a task for the queue display
      const taskId = card.id;
      const newTask: GenerationTask = {
        id: taskId,
        status: 'pending',
        timestamp: Date.now(),
        params: { prompt: card.prompt, style: card.style, ratio: card.ratio },
      };
      setTasks(prev => [newTask, ...prev]);

      try {
        const results = await generatePixarImage(card.prompt, card.style, card.ratio, 1);
        const base64 = results[0];

        // Update card → done
        setPromptCards(prev => prev.map(c => 
          c.id === card.id ? { ...c, status: 'done' as const, resultImage: base64 } : c
        ));

        // Add to gallery
        const newImg: GeneratedImage = {
          id: taskId,
          url: base64,
          prompt: card.prompt,
          style: card.style,
          ratio: card.ratio,
          timestamp: Date.now(),
          batchId: taskId,
        };
        setImages(prev => [newImg, ...prev]);
        setCurrentImage(newImg);

        // Update task → completed
        setTasks(prev => prev.map(t => 
          t.id === taskId ? { ...t, status: 'completed', images: results } : t
        ));

        addToast({ type: 'success', title: '✨ Image Generated', message: card.prompt.substring(0, 60) + '...' });
        return { cardId: card.id, success: true };
      } catch (err: any) {
        console.error(`Card ${card.id} failed:`, err);
        const errorMsg = err.message || 'Generation failed';
        
        // Update card → failed
        setPromptCards(prev => prev.map(c => 
          c.id === card.id ? { ...c, status: 'failed' as const, error: errorMsg } : c
        ));

        // Update task → failed
        setTasks(prev => prev.map(t => 
          t.id === card.id ? { ...t, status: 'failed' } : t
        ));

        addToast({ type: 'error', title: 'Generation Failed', message: errorMsg, duration: 8000 });
        return { cardId: card.id, success: false, error: errorMsg };
      }
    });

    // Wait for ALL to settle (parallel)
    const results = await Promise.allSettled(promises);
    setIsRunningAll(false);
    setQuotaInfo(rateLimiter.getQuotaInfo());

    // Summary toast
    const settled = results.map(r => r.status === 'fulfilled' ? r.value : null).filter(Boolean) as any[];
    const successCount = settled.filter(r => r?.success).length;
    const failCount = settled.filter(r => !r?.success).length;
    if (successCount > 0 || failCount > 0) {
      addToast({
        type: failCount > 0 ? 'warning' : 'success',
        title: `Batch Complete: ${successCount} ✓ / ${failCount} ✗`,
        message: failCount > 0 ? 'Some prompts failed. Click regenerate to retry.' : 'All images generated successfully!',
      });
    }
  };

  // Per-card regenerate
  const handleRegenerateCard = async (cardId: string) => {
    const card = promptCards.find(c => c.id === cardId);
    if (!card) return;

    // Reset card to generating
    setPromptCards(prev => prev.map(c => 
      c.id === cardId ? { ...c, status: 'generating' as const, error: undefined, resultImage: undefined } : c
    ));

    try {
      const results = await generatePixarImage(card.prompt, card.style, card.ratio, 1);
      const url = results[0];

      setPromptCards(prev => prev.map(c => 
        c.id === cardId ? { ...c, status: 'done' as const, resultImage: url } : c
      ));

      const newImg: GeneratedImage = {
        id: cardId + '-regen-' + Date.now(),
        url,
        prompt: card.prompt,
        style: card.style,
        ratio: card.ratio,
        timestamp: Date.now(),
        batchId: cardId,
      };
      setImages(prev => [newImg, ...prev]);
      setCurrentImage(newImg);

      addToast({ type: 'success', title: '🔄 Regenerated', message: card.prompt.substring(0, 60) + '...' });
    } catch (err: any) {
      setPromptCards(prev => prev.map(c => 
        c.id === cardId ? { ...c, status: 'failed' as const, error: err.message || 'Regeneration failed' } : c
      ));
      addToast({ type: 'error', title: 'Regeneration Failed', message: err.message || 'Please try again' });
    }
  };

  const handleRegenerate = async (originalTask: GenerationTask) => {
    const { prompt, style, ratio } = originalTask.params;

    const taskId = Date.now().toString();
    const newTask: GenerationTask = {
      id: taskId,
      status: 'pending',
      timestamp: Date.now(),
      params: { prompt, style, ratio },
    };

    setTasks(prev => [newTask, ...prev]);
    setError(null);

    generatePixarImage(prompt, style, ratio, 1)
      .then((generatedBase64s) => {
        const newImages: GeneratedImage[] = generatedBase64s.map((url, index) => ({
          id: `${taskId}-${index}`,
          url,
          prompt,
          style,
          ratio,
          timestamp: Date.now(),
          batchId: taskId,
        }));

        setImages(prev => [...newImages.reverse(), ...prev]);
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'completed', images: generatedBase64s } : t));
        
        if (newImages.length > 0) setCurrentImage(newImages[0]);
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
                        onClick={async () => {
                          try {
                            const response = await fetch(currentImage.url);
                            const blob = await response.blob();
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            const safeName = currentImage.prompt.substring(0, 30).replace(/[^a-z0-9]/gi, '_').toLowerCase();
                            a.download = `pixar_${safeName}_${Date.now()}.png`;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            URL.revokeObjectURL(url);
                            addToast({ type: 'success', title: 'Downloaded!', message: 'Image saved to your downloads' });
                          } catch (e) {
                            window.open(currentImage.url, '_blank');
                          }
                        }}
                        className="p-3 rounded-full backdrop-blur-md border bg-black/40 border-white/10 text-white hover:bg-black/60 transition-all"
                        title="Download Image"
                      >
                        <Download size={20} />
                      </button>
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

        {/* Prompt Board — replaces sidebar controls */}
        <PromptBoard
          cards={promptCards}
          onCardsChange={setPromptCards}
          onRunAll={handleRunAll}
          onRegenerate={handleRegenerateCard}
          isRunning={isRunningAll}
          quotaInfo={quotaInfo}
        />
      </div>
    </div>
  );
};

export default PixarStudio;
