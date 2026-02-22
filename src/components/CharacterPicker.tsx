import React from 'react';
import { UserCircle, X } from 'lucide-react';
import { CharacterPreset } from '../data/characterPresets';
import { CHARACTER_PRESETS } from '../data/characterPresets';

interface CharacterPickerProps {
  selectedStyle: string;
  currentCharacterLock: string;
  onSelect: (preset: CharacterPreset) => void;
  onClear: () => void;
}

export const CharacterPicker: React.FC<CharacterPickerProps> = ({
  selectedStyle,
  currentCharacterLock,
  onSelect,
  onClear
}) => {
  const [isOpen, setIsOpen] = React.useState(false);

  // Lọc characters hợp lệ với style hiện tại (nếu muốn)
  // const compatiblePresets = CHARACTER_PRESETS.filter(p => p.compatibleStyles.includes(selectedStyle));
  const compatiblePresets = CHARACTER_PRESETS;

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <label className="text-[11px] font-semibold text-zinc-400 flex items-center gap-1.5">
          <UserCircle size={12} /> Chọn nhân vật có sẵn
        </label>
        {currentCharacterLock && (
          <button 
            onClick={onClear}
            className="text-[10px] text-zinc-500 hover:text-red-400 transition-colors flex items-center gap-1"
          >
            <X size={10} /> Clear
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="text-xs px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-300 border border-zinc-700 hover:bg-zinc-700 transition-colors"
        >
          {isOpen ? 'Đóng danh sách' : 'Mở danh sách nhân vật'}
        </button>
      </div>

      {isOpen && (
        <div className="grid grid-cols-2 gap-2 mt-3 p-3 bg-zinc-900 border border-zinc-800 rounded-xl max-h-48 overflow-y-auto">
          {compatiblePresets.map(preset => (
            <button
              key={preset.id}
              onClick={() => {
                onSelect(preset);
                setIsOpen(false);
              }}
              className={`p-2 rounded-lg text-left transition-all border ${
                currentCharacterLock === preset.characterLock 
                  ? 'bg-amber-500/10 border-amber-500/50 text-amber-300' 
                  : 'bg-zinc-800 border-zinc-700 hover:border-zinc-500 text-zinc-400 hover:text-white'
              }`}
              style={{
                borderLeftColor: currentCharacterLock === preset.characterLock ? preset.accentColor : undefined,
                borderLeftWidth: currentCharacterLock === preset.characterLock ? '3px' : '1px'
              }}
            >
              <div className="flex items-center gap-2">
                <span className="text-xl">{preset.avatar}</span>
                <div className="flex-1 overflow-hidden">
                  <h4 className="text-[11px] font-bold truncate" style={{ color: preset.accentColor }}>
                    {preset.displayName}
                  </h4>
                  <p className="text-[9px] text-zinc-500 truncate">{preset.shortBio}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
