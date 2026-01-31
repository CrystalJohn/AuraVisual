
import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { ConfigurationPanel } from './components/ConfigurationPanel';
import { Gallery } from './components/Gallery';
import { GeneratedImage, AspectRatio, ModelStyle } from './types';
import { generateInfluencerImage } from './services/geminiService';
import { Info, Sparkles, Loader2, ArrowRight, Heart } from 'lucide-react';

const App: React.FC = () => {
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [currentImage, setCurrentImage] = useState<GeneratedImage | null>(null);
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load Data from LocalStorage on Mount
  useEffect(() => {
    // Load Favorites
    const savedFavs = localStorage.getItem('aura_favorites');
    if (savedFavs) {
      try {
        setFavorites(JSON.parse(savedFavs));
      } catch (e) {
        console.error("Failed to parse favorites", e);
      }
    }

    // Load History
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

  // Save History to LocalStorage (with quota protection)
  useEffect(() => {
    if (images.length > 0) {
      try {
        localStorage.setItem('aura_images', JSON.stringify(images));
      } catch (e) {
        console.warn("Failed to save history to LocalStorage (Quota exceeded?)", e);
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

  // Derived state: Get other images from the same batch
  const batchImages = currentImage?.batchId 
    ? images.filter(img => img.batchId === currentImage.batchId).reverse()
    : [];

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
    activeReferenceImage: string | null // Accepts explicit image or null based on Mode
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

    setIsGenerating(true);
    setError(null);

    try {
      // Use activeReferenceImage (passed from ConfigurationPanel) instead of state referenceImage
      const generatedBase64s = await generateInfluencerImage(prompt, activeReferenceImage, style, ratio, outfit, batchSize, imageStrength);
      
      const batchId = Date.now().toString();
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
      
      if (newImages.length > 0) {
        setCurrentImage(newImages[0]);
      }

    } catch (err: any) {
      console.error(err);
      if (err.message && err.message.includes("Requested entity was not found")) {
         // @ts-ignore
         if (window.aistudio) {
             // @ts-ignore
             await window.aistudio.openSelectKey();
             setError("Please select a valid API Key/Project and try again.");
             setIsGenerating(false);
             return;
         }
      }
      setError(err.message || "Failed to generate image. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex w-full h-screen bg-black overflow-hidden text-zinc-200 font-sans">
      
      {/* COLUMN 1: Sidebar (Navigation) + Drawer (Gallery) */}
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

      {/* Main Content Wrapper (Center + Right Column) */}
      <div className={`flex flex-1 ml-16 h-full transition-all duration-300 ease-in-out ${isGalleryOpen ? 'pl-72' : 'pl-0'}`}>
        
        {/* COLUMN 2: Center Canvas (Main Stage) */}
        <main className="flex-1 relative flex flex-col bg-zinc-900/30">
           
           {/* Canvas Background */}
           <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
                style={{ 
                    backgroundImage: `linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)`, 
                    backgroundSize: '40px 40px' 
                }} 
           />

           {/* Error Message */}
           {error && (
              <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-red-500/10 border border-red-500/20 text-red-200 px-4 py-3 rounded-lg flex items-center gap-3 backdrop-blur-md z-50 animate-in slide-in-from-top-4">
                  <Info size={18} />
                  <span>{error}</span>
              </div>
           )}

           {/* Main Image Viewport */}
           <div className="flex-1 relative flex items-center justify-center p-8 overflow-hidden">
                
                {isGenerating && (
                  <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/20 backdrop-blur-[2px]">
                    <div className="relative">
                      <div className="absolute inset-0 bg-lime-400 blur-xl opacity-20 rounded-full animate-pulse"></div>
                      <Loader2 size={48} className="text-lime-400 animate-spin relative z-10" />
                    </div>
                    <p className="mt-4 text-zinc-300 font-medium tracking-wide animate-pulse uppercase text-sm">Processing...</p>
                  </div>
                )}

                {currentImage ? (
                    <div className="relative h-full w-full flex items-center justify-center">
                        <img 
                            src={currentImage.url} 
                            alt="Main Result" 
                            className={`
                                max-h-full max-w-full object-contain rounded-lg shadow-2xl shadow-black border border-zinc-800/50
                                transition-all duration-500 
                                ${isGenerating ? 'opacity-50 scale-95' : 'opacity-100 scale-100'}
                            `} 
                        />
                         
                         {/* Favorite Button (Top Right) */}
                         {!isGenerating && (
                            <button 
                                onClick={() => toggleFavorite(currentImage.id)}
                                className="absolute top-4 right-4 z-20 p-2.5 rounded-full bg-black/40 hover:bg-black/70 backdrop-blur transition-all border border-zinc-700/50 hover:border-zinc-500 group shadow-lg"
                                title="Toggle Favorite"
                            >
                                <Heart 
                                    size={20} 
                                    className={`transition-all duration-300 ${favorites.includes(currentImage.id) ? "fill-red-500 text-red-500 scale-110" : "text-zinc-300 group-hover:text-white"}`} 
                                />
                            </button>
                         )}

                         {/* Style Badge (Moved to Top Left) */}
                         {!isGenerating && (
                            <div className="absolute top-4 left-4 bg-black/60 backdrop-blur px-3 py-1.5 rounded-md text-[10px] text-zinc-400 border border-zinc-800 font-mono uppercase tracking-wider shadow-lg">
                                {currentImage.style}
                            </div>
                        )}
                    </div>
                ) : (
                    /* Empty State */
                    <div className="text-center max-w-md">
                        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shadow-2xl">
                            <Sparkles size={32} className="text-zinc-600" />
                        </div>
                        <h1 className="text-2xl font-bold text-white mb-2">Ready to Create</h1>
                        <p className="text-zinc-500">Select your parameters on the right and start generating high-quality AI influencers.</p>
                    </div>
                )}
           </div>

           {/* Bottom Batch Thumbnails Area */}
           <div className="h-40 border-t border-zinc-800 bg-black/40 backdrop-blur-md flex flex-col shrink-0">
               <div className="px-6 py-2 border-b border-zinc-800/50">
                    <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                        Session Output {batchImages.length > 0 && <span className="bg-zinc-800 text-zinc-300 px-1.5 rounded">{batchImages.length}</span>}
                    </h3>
               </div>
               <div className="flex-1 flex items-center px-6 gap-4 overflow-x-auto scrollbar-thin">
                    {batchImages.length > 0 ? (
                        batchImages.map((img) => (
                            <button 
                                key={img.id}
                                onClick={() => setCurrentImage(img)}
                                className={`
                                    relative w-24 h-32 rounded-lg overflow-hidden border-2 transition-all shrink-0 group
                                    ${currentImage?.id === img.id ? 'border-lime-400 ring-2 ring-lime-500/20' : 'border-zinc-800 hover:border-zinc-600'}
                                `}
                            >
                                <img src={img.url} className="w-full h-full object-cover" />
                                <div className={`absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors ${currentImage?.id === img.id ? 'bg-transparent' : ''}`} />
                                {/* Tiny favorite indicator in thumbnail */}
                                {favorites.includes(img.id) && (
                                    <div className="absolute bottom-1 right-1">
                                        <Heart size={10} className="fill-red-500 text-red-500" />
                                    </div>
                                )}
                            </button>
                        ))
                    ) : (
                        <div className="w-full flex items-center justify-center text-zinc-700 text-sm gap-2">
                            <div className="h-px w-8 bg-zinc-800"></div>
                            Waiting for generation
                            <div className="h-px w-8 bg-zinc-800"></div>
                        </div>
                    )}
               </div>
           </div>

        </main>

        {/* COLUMN 3: Right Configuration Panel */}
        <ConfigurationPanel 
            onGenerate={handleGenerate}
            isGenerating={isGenerating}
            referenceImage={referenceImage}
            onUploadReference={handleUploadReference}
            onClearReference={() => setReferenceImage(null)}
        />

      </div>

    </div>
  );
};

export default App;
