
import React, { useState, useEffect } from 'react';
import { Sidebar } from '../../components/Sidebar';
import { ConfigurationPanel } from '../../components/ConfigurationPanel';
import { Gallery } from '../../components/Gallery';
import { GeneratedImage, AspectRatio, ModelStyle, GenerationTask } from '../../types';
import { generateInfluencerImage } from '../../services/geminiService';
import { Info, Sparkles, Loader2, Heart, AlertCircle, CheckCircle2, Clock, Download, RefreshCw } from 'lucide-react';
import { useToast } from '../../components/Toast';
import { rateLimiter } from '../../services/rateLimiter';

const InfluencerStudio: React.FC = () => {
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [currentImage, setCurrentImage] = useState<GeneratedImage | null>(null);
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [tasks, setTasks] = useState<GenerationTask[]>([]);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { addToast } = useToast();

  // Rate Limiting State
  const [quotaInfo, setQuotaInfo] = useState(rateLimiter.getQuotaInfo());

  // Polling for Quota Info
  useEffect(() => {
    const interval = setInterval(() => {
        setQuotaInfo(rateLimiter.getQuotaInfo());
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Load Data from LocalStorage on Mount
  useEffect(() => {
    const savedFavs = localStorage.getItem('aura_favorites');
    if (savedFavs) {
      try {
        setFavorites(JSON.parse(savedFavs));
      } catch (e) {
        console.error("Failed to parse favorites", e);
      }
    }

    const savedImages = localStorage.getItem('aura_images');
    if (savedImages) {
      try {
        const parsedImages = JSON.parse(savedImages);
        setImages(parsedImages);
        if (parsedImages.length > 0) {
          setCurrentImage(parsedImages[0]);
        }
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  // Save Favorites to LocalStorage
  useEffect(() => {
    localStorage.setItem('aura_favorites', JSON.stringify(favorites));
  }, [favorites]);

  // Save History to LocalStorage
  useEffect(() => {
    if (images.length > 0) {
      try {
        localStorage.setItem('aura_images', JSON.stringify(images));
      } catch (e) {
        console.warn("Failed to save history to LocalStorage", e);
      }
    }
  }, [images]);

  // Toggle Favorite
  const toggleFavorite = (id: string) => {
    setFavorites(prev => {
      if (prev.includes(id)) {
        return prev.filter(favId => favId !== id);
      }
      return [...prev, id];
    });
  };

  const handleUploadReference = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setReferenceImage(e.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleGenerate = async (
    prompt: string, 
    ratio: AspectRatio, 
    style: ModelStyle, 
    outfit: string, 
    batchSize: number, 
    imageStrength: number, 
    activeReferenceImage: string | null
  ) => {
    
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
    setError(null);

    // Async call without await to keep UI non-blocking
    generateInfluencerImage(prompt, activeReferenceImage, style, ratio, outfit, batchSize, imageStrength)
      .then((generatedBase64s) => {
        const batchId = taskId;
        const newImages: GeneratedImage[] = generatedBase64s.map((url, index) => ({
          id: `${batchId}-${index}`,
          url,
          prompt,
          style,
          ratio,
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
        setError(err.message || "Failed to generate image. Please try again.");
        addToast({ type: 'error', title: 'Generation Failed', message: err.message || 'Please try again', duration: 8000 });
      })
  };

  // Download image
  const handleDownload = async (imageUrl: string, prompt: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeName = prompt.substring(0, 30).replace(/[^a-z0-9]/gi, '_').toLowerCase();
      a.download = `influencer_${safeName}_${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      addToast({ type: 'success', title: 'Downloaded!', message: 'Image saved to downloads' });
    } catch (e) {
      window.open(imageUrl, '_blank');
    }
  };

  // Regenerate from task
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

    generateInfluencerImage(prompt, referenceImage, style, ratio, '', 1, 0.75)
      .then((generatedUrls) => {
        const newImages: GeneratedImage[] = generatedUrls.map((url, index) => ({
          id: `${taskId}-${index}`,
          url,
          prompt,
          style,
          ratio,
          timestamp: Date.now(),
          batchId: taskId,
        }));
        setImages(prev => [...newImages.reverse(), ...prev]);
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'completed', images: generatedUrls } : t));
        if (newImages.length > 0) setCurrentImage(newImages[0]);
        addToast({ type: 'success', title: '🔄 Regenerated', message: prompt.substring(0, 60) + '...' });
      })
      .catch((err: any) => {
        console.error(err);
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'failed' } : t));
        addToast({ type: 'error', title: 'Regeneration Failed', message: err.message || 'Please try again' });
      });
  };

  return (
    <div className="flex w-full h-screen bg-black overflow-hidden text-zinc-200 font-sans">
      
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
        
        <main className="flex-1 relative flex flex-col bg-zinc-900/30">
           
           <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
                style={{ 
                    backgroundImage: `linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)`, 
                    backgroundSize: '40px 40px' 
                }} 
           />

           {error && (
              <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-red-500/10 border border-red-500/20 text-red-200 px-4 py-3 rounded-lg flex items-center gap-3 backdrop-blur-md z-50 animate-in slide-in-from-top-4">
                  <Info size={18} />
                  <span>{error}</span>
              </div>
           )}

           <div className="flex-1 relative flex items-center justify-center p-8 overflow-hidden">
                {currentImage ? (
                    <div className="relative h-full w-full flex items-center justify-center group">
                        <img 
                            src={currentImage.url} 
                            alt="Main Result" 
                            className="max-h-full max-w-full object-contain rounded-lg shadow-2xl shadow-black border border-zinc-800/50 transition-all duration-500" 
                        />
                         
                        {/* Hover overlay with actions */}
                        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                          <button 
                            onClick={() => handleDownload(currentImage.url, currentImage.prompt)}
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
                            title="Toggle Favorite"
                          >
                            <Heart size={20} fill={favorites.includes(currentImage.id) ? "currentColor" : "none"} />
                          </button>
                        </div>

                        <div className="absolute top-4 left-4 bg-black/60 backdrop-blur px-3 py-1.5 rounded-md text-[10px] text-zinc-400 border border-zinc-800 font-mono uppercase tracking-wider shadow-lg">
                            {currentImage.style}
                        </div>
                    </div>
                ) : (
                    <div className="text-center max-w-md">
                        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shadow-2xl">
                            <Sparkles size={32} className="text-zinc-600" />
                        </div>
                        <h1 className="text-2xl font-bold text-white mb-2">Ready to Create</h1>
                        <p className="text-zinc-500">Select your parameters on the right and start generating high-quality AI influencers.</p>
                    </div>
                )}
           </div>

           {/* Generation Queue Area */}
           <div className="h-48 border-t border-zinc-800 bg-black/40 backdrop-blur-md flex flex-col shrink-0">
               <div className="px-6 py-2 border-b border-zinc-800/50 flex justify-between items-center">
                    <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                        Generation Queue {tasks.length > 0 && <span className="bg-zinc-800 text-zinc-300 px-1.5 rounded">{tasks.length}</span>}
                    </h3>
               </div>
               <div className="flex-1 flex items-center px-6 gap-4 overflow-x-auto scrollbar-thin py-4">
                    {tasks.length > 0 ? (
                        tasks.map((task) => (
                            <div 
                                key={task.id}
                                className={`
                                    relative w-32 h-32 rounded-lg overflow-hidden border-2 transition-all shrink-0 group flex flex-col
                                    ${task.status === 'pending' ? 'border-zinc-800 bg-zinc-900/50' : 
                                      task.status === 'failed' ? 'border-red-500/30 bg-red-500/5' : 
                                      'border-zinc-800 hover:border-lime-500/50'}
                                `}
                            >
                                {task.status === 'pending' && (
                                    <div className="flex-1 flex flex-col items-center justify-center p-3 text-center">
                                        <Loader2 size={24} className="text-lime-400 animate-spin mb-2" />
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
                                    <button 
                                        onClick={() => {
                                            const img = images.find(i => i.batchId === task.id);
                                            if (img) setCurrentImage(img);
                                        }}
                                        className="w-full h-full relative"
                                    >
                                        <img src={task.images[0]} className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/50 transition-colors" />
                                        <div className="absolute top-1 right-1">
                                            <CheckCircle2 size={12} className="text-lime-400 bg-black/60 rounded-full" />
                                        </div>
                                        {/* Hover actions */}
                                        <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <button
                                            onClick={(e) => { e.stopPropagation(); handleDownload(task.images![0], task.params.prompt); }}
                                            className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg backdrop-blur-sm border border-white/10"
                                            title="Download"
                                          >
                                            <Download size={14} className="text-white" />
                                          </button>
                                          <button
                                            onClick={(e) => { e.stopPropagation(); handleRegenerate(task); }}
                                            className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg backdrop-blur-sm border border-white/10"
                                            title="Regenerate"
                                          >
                                            <RefreshCw size={14} className="text-white" />
                                          </button>
                                        </div>
                                    </button>
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

        <ConfigurationPanel 
            onGenerate={handleGenerate}
            isGenerating={tasks.some(t => t.status === 'pending')}
            referenceImage={referenceImage}
            onUploadReference={handleUploadReference}
            onClearReference={() => setReferenceImage(null)}
            cooldownRemaining={0}
            quotaInfo={quotaInfo}
        />

      </div>

    </div>
  );
};

export default InfluencerStudio;
