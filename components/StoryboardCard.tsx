import React, { useState } from 'react';
import { StoryboardScene } from '../types';
import {
  Image as ImageIcon,
  Video,
  Copy,
  RefreshCw,
  Sparkles,
  Clock,
  ChevronDown,
  ChevronUp,
  Edit3,
  Check,
  Loader2,
} from 'lucide-react';

interface StoryboardCardProps {
  scene: StoryboardScene;
  onEdit: (id: string, updates: Partial<StoryboardScene>) => void;
  onRegenerate: (id: string) => void;
  onGenerateFrame: (id: string) => void;
  isGeneratingFrame: boolean;
  disabled: boolean;
}

export const StoryboardCard: React.FC<StoryboardCardProps> = ({
  scene,
  onEdit,
  onRegenerate,
  onGenerateFrame,
  isGeneratingFrame,
  disabled,
}) => {
  const [expandedSection, setExpandedSection] = useState<'image' | 'video' | null>(null);
  const [editingField, setEditingField] = useState<'imagePrompt' | 'videoPrompt' | 'action' | null>(null);
  const [editValue, setEditValue] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  const startEdit = (field: 'imagePrompt' | 'videoPrompt' | 'action') => {
    setEditingField(field);
    setEditValue(scene[field]);
  };

  const saveEdit = () => {
    if (editingField) {
      onEdit(scene.id, { [editingField]: editValue });
      setEditingField(null);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 1500);
  };

  const toggleExpand = (section: 'image' | 'video') => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <div className="min-w-[300px] max-w-[320px] flex-shrink-0 rounded-2xl border border-zinc-800 bg-zinc-900/80 backdrop-blur-sm overflow-hidden flex flex-col transition-all hover:border-zinc-700 hover:shadow-lg hover:shadow-indigo-500/5">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-zinc-800/50 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-400 text-[10px] font-bold flex items-center justify-center">
            #{scene.sceneNumber}
          </span>
          <h3 className="text-xs font-semibold text-white truncate max-w-[180px]">{scene.title}</h3>
        </div>
        <span className="flex items-center gap-1 text-[10px] text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">
          <Clock size={9} /> {scene.duration}s
        </span>
      </div>

      {/* First Frame Preview */}
      <div className="relative aspect-video bg-zinc-950 border-b border-zinc-800 flex items-center justify-center overflow-hidden">
        {scene.firstFrameUrl ? (
          <img
            src={scene.firstFrameUrl}
            alt={`Scene ${scene.sceneNumber} preview`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-zinc-600">
            <ImageIcon size={24} strokeWidth={1.5} />
            <button
              onClick={() => onGenerateFrame(scene.id)}
              disabled={disabled || isGeneratingFrame || !scene.imagePrompt}
              className="text-[10px] font-medium px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
            >
              {isGeneratingFrame ? (
                <><Loader2 size={9} className="animate-spin" /> Generating...</>
              ) : (
                <><Sparkles size={9} /> Generate First Frame</>
              )}
            </button>
          </div>
        )}
        {scene.firstFrameUrl && (
          <button
            onClick={() => onGenerateFrame(scene.id)}
            disabled={disabled || isGeneratingFrame}
            className="absolute top-1.5 right-1.5 p-1 rounded-md bg-black/60 text-zinc-300 hover:text-white hover:bg-black/80 transition-all"
            title="Regenerate frame"
          >
            {isGeneratingFrame ? <Loader2 size={10} className="animate-spin" /> : <RefreshCw size={10} />}
          </button>
        )}
      </div>

      {/* Action Description */}
      <div className="px-3 py-2 border-b border-zinc-800/50">
        {editingField === 'action' ? (
          <div className="flex items-center gap-1">
            <input
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="flex-1 bg-zinc-800 text-xs text-white px-2 py-1 rounded border border-zinc-700 outline-none focus:border-indigo-500"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
            />
            <button onClick={saveEdit} className="p-1 text-emerald-400 hover:text-emerald-300">
              <Check size={12} />
            </button>
          </div>
        ) : (
          <p
            className="text-[11px] text-zinc-300 leading-relaxed cursor-pointer hover:text-white transition-colors group"
            onClick={() => startEdit('action')}
          >
            {scene.action || 'Click to add description...'}
            <Edit3 size={9} className="inline ml-1 opacity-0 group-hover:opacity-50" />
          </p>
        )}
      </div>

      {/* Dual Prompt Sections */}
      <div className="flex-1 flex flex-col">
        {/* Image Prompt */}
        <div className="border-b border-zinc-800/50">
          <button
            onClick={() => toggleExpand('image')}
            className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-zinc-800/30 transition-colors"
          >
            <span className="flex items-center gap-1.5 text-[10px] font-semibold text-amber-400">
              <ImageIcon size={10} /> Image Prompt
            </span>
            {expandedSection === 'image' ? <ChevronUp size={10} className="text-zinc-500" /> : <ChevronDown size={10} className="text-zinc-500" />}
          </button>
          {expandedSection === 'image' && (
            <div className="px-3 pb-2 space-y-1.5">
              {editingField === 'imagePrompt' ? (
                <div className="space-y-1">
                  <textarea
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    rows={5}
                    className="w-full bg-zinc-800 text-[10px] text-zinc-300 p-2 rounded-lg border border-zinc-700 outline-none focus:border-amber-500/50 resize-none"
                    autoFocus
                  />
                  <button onClick={saveEdit} className="text-[9px] text-emerald-400 hover:text-emerald-300 flex items-center gap-0.5">
                    <Check size={9} /> Save
                  </button>
                </div>
              ) : (
                <p
                  className="text-[10px] text-zinc-400 leading-relaxed cursor-pointer hover:text-zinc-300 transition-colors"
                  onClick={() => startEdit('imagePrompt')}
                >
                  {scene.imagePrompt.substring(0, 300)}{scene.imagePrompt.length > 300 ? '...' : ''}
                </p>
              )}
              <button
                onClick={() => copyToClipboard(scene.imagePrompt, 'image')}
                className="text-[9px] text-zinc-500 hover:text-zinc-300 flex items-center gap-0.5"
              >
                <Copy size={8} /> {copied === 'image' ? 'Copied!' : 'Copy'}
              </button>
            </div>
          )}
        </div>

        {/* Video Prompt */}
        <div className="border-b border-zinc-800/50">
          <button
            onClick={() => toggleExpand('video')}
            className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-zinc-800/30 transition-colors"
          >
            <span className="flex items-center gap-1.5 text-[10px] font-semibold text-purple-400">
              <Video size={10} /> Video Prompt
            </span>
            {expandedSection === 'video' ? <ChevronUp size={10} className="text-zinc-500" /> : <ChevronDown size={10} className="text-zinc-500" />}
          </button>
          {expandedSection === 'video' && (
            <div className="px-3 pb-2 space-y-1.5">
              {editingField === 'videoPrompt' ? (
                <div className="space-y-1">
                  <textarea
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    rows={5}
                    className="w-full bg-zinc-800 text-[10px] text-zinc-300 p-2 rounded-lg border border-zinc-700 outline-none focus:border-purple-500/50 resize-none"
                    autoFocus
                  />
                  <button onClick={saveEdit} className="text-[9px] text-emerald-400 hover:text-emerald-300 flex items-center gap-0.5">
                    <Check size={9} /> Save
                  </button>
                </div>
              ) : (
                <p
                  className="text-[10px] text-zinc-400 leading-relaxed cursor-pointer hover:text-zinc-300 transition-colors"
                  onClick={() => startEdit('videoPrompt')}
                >
                  {scene.videoPrompt.substring(0, 300)}{scene.videoPrompt.length > 300 ? '...' : ''}
                </p>
              )}
              <button
                onClick={() => copyToClipboard(scene.videoPrompt, 'video')}
                className="text-[9px] text-zinc-500 hover:text-zinc-300 flex items-center gap-0.5"
              >
                <Copy size={8} /> {copied === 'video' ? 'Copied!' : 'Copy'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-between px-3 py-2 bg-zinc-800/20">
        <button
          onClick={() => onRegenerate(scene.id)}
          disabled={disabled}
          className="text-[10px] text-zinc-500 hover:text-indigo-400 flex items-center gap-1 transition-colors disabled:opacity-40"
        >
          <RefreshCw size={10} /> Regenerate
        </button>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => copyToClipboard(`IMAGE:\n${scene.imagePrompt}\n\nVIDEO:\n${scene.videoPrompt}`, 'all')}
            className="text-[10px] text-zinc-500 hover:text-zinc-300 flex items-center gap-0.5 transition-colors"
          >
            <Copy size={9} /> {copied === 'all' ? '✓' : 'All'}
          </button>
        </div>
      </div>

      {/* Error display */}
      {scene.error && (
        <div className="px-3 py-1.5 bg-red-500/10 border-t border-red-500/20">
          <p className="text-[9px] text-red-400">{scene.error}</p>
        </div>
      )}
    </div>
  );
};
