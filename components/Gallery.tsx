
import React, { useState } from 'react';
import { GeneratedImage } from '../types';
import { Download, ChevronLeft, Clock, Heart } from 'lucide-react';

interface GalleryProps {
  images: GeneratedImage[];
  favorites: string[];
  onSelect: (image: GeneratedImage) => void;
  isOpen: boolean;
  onToggle: () => void;
  currentId?: string;
}

export const Gallery: React.FC<GalleryProps> = ({ images, favorites, onSelect, isOpen, onToggle, currentId }) => {
  const [viewMode, setViewMode] = useState<'all' | 'favorites'>('all');

  // Format timestamp helper
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const filteredImages = viewMode === 'favorites' 
    ? images.filter(img => favorites.includes(img.id))
    : images;

  return (
    <div 
      className={`fixed top-0 left-16 bottom-0 z-40 bg-zinc-950/95 backdrop-blur-md border-r border-zinc-800 transition-transform duration-300 ease-in-out w-72 transform ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
    >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800/50">
            <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Library</h2>
            <button 
                onClick={onToggle}
                className="p-1 hover:bg-zinc-800 rounded text-zinc-500 hover:text-white transition-colors"
            >
                <ChevronLeft size={18} />
            </button>
        </div>

        {/* Tabs */}
        <div className="px-4 mt-4 mb-2">
            <div className="flex p-1 bg-zinc-900 rounded-lg">
                <button 
                    onClick={() => setViewMode('all')}
                    className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-all ${viewMode === 'all' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                    All
                </button>
                <button 
                    onClick={() => setViewMode('favorites')}
                    className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-all flex items-center justify-center gap-1 ${viewMode === 'favorites' ? 'bg-zinc-800 text-red-400 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                    Favorites
                </button>
            </div>
        </div>

        {/* List */}
        <div className="h-full flex flex-col p-3 pb-20">
            <div className="flex-1 overflow-y-auto space-y-3 scrollbar-thin pr-1">
                {filteredImages.length === 0 ? (
                    <div className="text-zinc-600 text-center py-10 text-sm flex flex-col items-center gap-2">
                        {viewMode === 'favorites' ? (
                            <>
                                <Heart size={24} className="opacity-20" />
                                <span>No favorites yet</span>
                            </>
                        ) : (
                            <>
                                <Clock size={24} className="opacity-20" />
                                <span>No history yet</span>
                            </>
                        )}
                    </div>
                ) : (
                    filteredImages.map((img) => (
                        <div 
                            key={img.id} 
                            className={`group relative flex gap-3 p-2 rounded-xl cursor-pointer border transition-all hover:bg-zinc-900 ${currentId === img.id ? 'bg-zinc-900 border-zinc-700' : 'border-transparent hover:border-zinc-800'}`}
                            onClick={() => onSelect(img)}
                        >
                            {/* Thumbnail */}
                            <div className="w-16 h-24 shrink-0 rounded-lg overflow-hidden bg-zinc-900 relative border border-zinc-800">
                                <img src={img.url} alt="thumbnail" className="w-full h-full object-cover" />
                                {favorites.includes(img.id) && (
                                    <div className="absolute bottom-1 right-1">
                                        <Heart size={10} className="fill-red-500 text-red-500 drop-shadow-md" />
                                    </div>
                                )}
                            </div>

                            {/* Details */}
                            <div className="flex flex-col flex-1 min-w-0 justify-between py-1">
                                <div>
                                    <p className="text-xs text-zinc-300 line-clamp-2 leading-relaxed mb-1 font-medium">
                                        {img.prompt}
                                    </p>
                                    <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                                        <span className="bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-400 border border-zinc-700">{img.ratio}</span>
                                        <span>{formatTime(img.timestamp)}</span>
                                    </div>
                                </div>
                                
                                {/* Download Action (Visible on Hover/Active) */}
                                <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                    <a 
                                        href={img.url} 
                                        download={`aura-${img.id}.png`}
                                        onClick={(e) => e.stopPropagation()}
                                        className="p-1.5 bg-zinc-800 hover:bg-lime-500/20 hover:text-lime-400 rounded-md text-zinc-400 transition-colors"
                                        title="Download"
                                    >
                                        <Download size={14} />
                                    </a>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    </div>
  );
};
