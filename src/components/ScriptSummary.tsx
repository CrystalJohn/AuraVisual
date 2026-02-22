import React from 'react';
import { StoryboardScene } from '../../types';
import { FileText, Clock, Clapperboard } from 'lucide-react';

interface ScriptSummaryProps {
  scenes: StoryboardScene[];
}

export const ScriptSummary: React.FC<ScriptSummaryProps> = ({ scenes }) => {
  if (!scenes || scenes.length === 0) return null;

  const totalDuration = scenes.reduce((acc, scene) => acc + scene.duration, 0);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col h-full overflow-hidden shadow-xl shadow-black/20">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/50 bg-zinc-900/80 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
            <FileText size={16} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">Tóm tắt kịch bản</h2>
            <p className="text-[10px] text-zinc-400">
              {scenes.length} cảnh • {totalDuration} giây
            </p>
          </div>
        </div>
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
        {scenes.map((scene, index) => (
          <div key={scene.id} className="relative pl-6 border-l-2 border-zinc-800 pb-2 last:pb-0">
            {/* Timeline dot */}
            <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-zinc-900 border-2 border-indigo-500/50 flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
            </div>
            
            <div className="flex items-start justify-between gap-4 mb-2">
              <h3 className="text-sm font-bold text-zinc-200">
                <span className="text-indigo-400 mr-2">Cảnh {scene.sceneNumber}:</span> 
                {scene.title}
              </h3>
              <div className="flex items-center gap-1.5 px-2 py-1 bg-zinc-800 rounded-md text-[10px] font-medium text-zinc-400 shrink-0">
                <Clock size={10} /> {scene.duration}s
              </div>
            </div>

            <div className="space-y-3 mt-3 text-sm text-zinc-400 leading-relaxed">
              {scene.action && (
                <div className="bg-zinc-800/50 p-3 rounded-xl border border-zinc-800/80">
                  <span className="font-semibold text-zinc-300 block mb-1 flex items-center gap-1.5 text-xs">
                    <Clapperboard size={12} className="text-emerald-400" /> Action
                  </span>
                  {scene.action}
                </div>
              )}
              
              {scene.narration && (
                <div>
                  <span className="font-semibold text-zinc-300 block mb-1 text-xs">🗣 Voiceover/Narration</span>
                  <p className="italic pl-3 border-l-2 border-zinc-700 text-zinc-300">"{scene.narration}"</p>
                </div>
              )}

              {scene.audioDescription && (
                <div>
                  <span className="font-semibold text-zinc-300 block mb-1 text-xs">🎵 Audio Note</span>
                  <p className="text-xs">{scene.audioDescription}</p>
                </div>
              )}
            </div>
          </div>
        ))}

        <div className="pt-4 border-t border-zinc-800/50 mt-4 text-center">
           <p className="text-xs text-zinc-500 italic">Kịch bản chi tiết đã được tạo thành công bên trái.</p>
        </div>
      </div>
    </div>
  );
};
