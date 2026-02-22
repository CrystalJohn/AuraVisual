import React, { useEffect } from 'react';
import { X, Image as ImageIcon, Video } from 'lucide-react';

export interface PreviewMedia {
  url: string;
  type: 'image' | 'video';
}

interface PreviewModalProps {
  media: PreviewMedia | null;
  onClose: () => void;
}

export const PreviewModal: React.FC<PreviewModalProps> = ({ media, onClose }) => {
  // Handle escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (media) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [media, onClose]);

  if (!media) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 md:p-8 animate-in fade-in duration-200"
      onClick={onClose} // Click backdrop to close
    >
      <div 
        className="relative max-w-[90vw] max-h-[90vh] flex items-center justify-center"
        onClick={e => e.stopPropagation()} // Prevent click inside media from closing
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute -top-12 -right-4 md:-right-12 p-3 bg-zinc-900/50 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-full transition-all border border-zinc-800 hover:scale-110"
          title="Close Preview (Esc)"
        >
          <X size={24} />
        </button>

        {/* Media Container */}
        <div className="bg-zinc-950 border border-zinc-800/80 rounded-2xl overflow-hidden shadow-2xl shadow-indigo-500/10 ring-1 ring-white/10">
          {/* Header bar */}
          <div className="absolute top-0 inset-x-0 h-16 bg-gradient-to-b from-black/60 to-transparent pointer-events-none z-10 flex items-start p-4">
             <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
               {media.type === 'image' ? (
                 <><ImageIcon size={14} className="text-amber-400" /><span className="text-[11px] font-semibold text-white tracking-wide uppercase">Keyframe Preview</span></>
               ) : (
                 <><Video size={14} className="text-purple-400" /><span className="text-[11px] font-semibold text-white tracking-wide uppercase">Video Preview</span></>
               )}
             </div>
          </div>

          {/* Render Image or Video */}
          {media.type === 'image' ? (
            <img 
              src={media.url} 
              alt="Generated Full Preview" 
              className="w-full h-full max-w-[90vw] max-h-[85vh] object-contain rounded-2xl"
            />
          ) : (
            <video 
              src={media.url} 
              controls 
              autoPlay 
              loop
              className="w-full h-full max-w-[90vw] max-h-[85vh] object-contain rounded-2xl"
            />
          )}
        </div>
      </div>
    </div>
  );
};
