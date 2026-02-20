import React, { useRef, useState } from 'react';
import { Upload, X, Lock, User, ImagePlus } from 'lucide-react';

interface CharacterReferenceProps {
  referenceImage: string | null;
  onReferenceChange: (base64: string | null) => void;
  disabled?: boolean;
}

export const CharacterReference: React.FC<CharacterReferenceProps> = ({
  referenceImage,
  onReferenceChange,
  disabled = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      onReferenceChange(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleClick = () => {
    if (!disabled) fileInputRef.current?.click();
  };

  return (
    <div className="px-3 pt-3">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          // Reset input so same file can be re-selected
          e.target.value = '';
        }}
      />

      {referenceImage ? (
        /* --- Reference Active --- */
        <div className="relative rounded-xl border border-indigo-500/30 bg-indigo-950/20 overflow-hidden">
          {/* Active indicator */}
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-indigo-500/15 bg-indigo-950/30">
            <div className="flex items-center gap-1.5">
              <Lock size={10} className="text-indigo-400" />
              <span className="text-[10px] font-semibold text-indigo-300 uppercase tracking-wider">Character Locked</span>
            </div>
            <button
              onClick={() => onReferenceChange(null)}
              disabled={disabled}
              className="text-zinc-500 hover:text-red-400 transition-colors disabled:opacity-30"
              title="Remove reference"
            >
              <X size={13} />
            </button>
          </div>
          
          {/* Preview */}
          <div className="flex items-center gap-3 p-2.5">
            <div className="relative shrink-0">
              <img
                src={referenceImage}
                alt="Character reference"
                className="w-14 h-14 rounded-lg object-cover border border-indigo-500/20"
              />
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-indigo-500 rounded-full flex items-center justify-center border-2 border-zinc-950">
                <User size={8} className="text-white" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-indigo-300 font-medium">Reference Active</p>
              <p className="text-[9px] text-zinc-500 mt-0.5">All prompts will use this character's face & features</p>
              <button
                onClick={handleClick}
                disabled={disabled}
                className="text-[9px] text-indigo-400 hover:text-indigo-300 mt-1 transition-colors disabled:opacity-30"
              >
                Change photo →
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* --- Upload Zone --- */
        <div
          onClick={handleClick}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`
            rounded-xl border-2 border-dashed p-3 cursor-pointer transition-all
            flex items-center gap-3
            ${disabled ? 'opacity-30 pointer-events-none' : ''}
            ${isDragging 
              ? 'border-indigo-400 bg-indigo-950/30' 
              : 'border-zinc-800 hover:border-indigo-500/30 hover:bg-indigo-950/10'
            }
          `}
        >
          <div className={`
            w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-colors
            ${isDragging ? 'bg-indigo-500/20' : 'bg-zinc-900 border border-zinc-800'}
          `}>
            <ImagePlus size={18} className={isDragging ? 'text-indigo-400' : 'text-zinc-500'} />
          </div>
          <div>
            <p className="text-[11px] text-zinc-400 font-medium">Character Reference</p>
            <p className="text-[9px] text-zinc-600 mt-0.5">
              {isDragging ? 'Drop image here...' : 'Upload face photo for consistent character'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
