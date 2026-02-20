import React, { useRef } from 'react';
import { PromptCard, ModelStyle, AspectRatio } from '../types';
import { Plus, Play, Trash2, X, Loader2, CheckCircle2, AlertCircle, Sparkles, Grip, Download, RefreshCw } from 'lucide-react';

interface PromptBoardProps {
  cards: PromptCard[];
  onCardsChange: (cards: PromptCard[]) => void;
  onRunAll: () => void;
  onRegenerate: (cardId: string) => void;
  isRunning: boolean;
  quotaInfo?: { dailyCount: number; dailyLimit: number; remaining: number };
}

const STYLE_OPTIONS = [
  { id: ModelStyle.PIXAR_CLASSIC, label: 'Pixar', icon: '🤠' },
  { id: ModelStyle.MODERN_DISNEY, label: 'Disney', icon: '❄️' },
  { id: ModelStyle.CLAYMATION, label: 'Clay', icon: '🧱' },
];

const RATIO_OPTIONS = [
  { id: AspectRatio.LANDSCAPE, label: '16:9' },
  { id: AspectRatio.PORTRAIT, label: '9:16' },
  { id: AspectRatio.SQUARE, label: '1:1' },
];

const createNewCard = (): PromptCard => ({
  id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
  prompt: '',
  style: ModelStyle.PIXAR_CLASSIC,
  ratio: AspectRatio.LANDSCAPE,
  status: 'idle',
});

const handleDownload = async (imageUrl: string, prompt: string) => {
  try {
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeName = prompt.substring(0, 30).replace(/[^a-z0-9]/gi, '_').toLowerCase();
    a.download = `pixar_${safeName}_${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Download failed:', err);
    // Fallback: open in new tab
    window.open(imageUrl, '_blank');
  }
};

export const PromptBoard: React.FC<PromptBoardProps> = ({
  cards,
  onCardsChange,
  onRunAll,
  onRegenerate,
  isRunning,
  quotaInfo,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const addCard = () => {
    const newCard = createNewCard();
    onCardsChange([...cards, newCard]);
    setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }, 100);
  };

  const removeCard = (id: string) => {
    onCardsChange(cards.filter(c => c.id !== id));
  };

  const updateCard = (id: string, updates: Partial<PromptCard>) => {
    onCardsChange(cards.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const clearAll = () => {
    onCardsChange([createNewCard()]);
  };

  const idleCards = cards.filter(c => c.status === 'idle' && c.prompt.trim());
  const canRun = idleCards.length > 0 && !isRunning;

  return (
    <div className="w-[380px] h-full bg-zinc-950/95 border-l border-indigo-500/20 flex flex-col shrink-0 z-20 backdrop-blur-xl">
      
      {/* Header */}
      <div className="p-4 border-b border-indigo-500/15">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Sparkles size={16} className="text-indigo-400" />
            Prompt Board
          </h2>
          <div className="flex items-center gap-2">
            {quotaInfo && (
              <div className="text-[9px] font-mono bg-zinc-900 border border-indigo-500/20 px-1.5 py-0.5 rounded">
                <span className={quotaInfo.remaining < 20 ? "text-red-400" : "text-indigo-400"}>
                  {quotaInfo.dailyCount}/{quotaInfo.dailyLimit}
                </span>
              </div>
            )}
            <button
              onClick={clearAll}
              disabled={isRunning}
              className="text-[10px] text-zinc-500 hover:text-red-400 transition-colors disabled:opacity-30"
              title="Clear all"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>
        <p className="text-[10px] text-zinc-500">
          Add prompts → Run All → Images generated in parallel
        </p>
      </div>

      {/* Cards List */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin">
        {cards.map((card, index) => (
          <div
            key={card.id}
            className={`
              rounded-xl border transition-all overflow-hidden
              ${card.status === 'generating' ? 'border-indigo-500/50 bg-indigo-950/30 shadow-[0_0_15px_-5px_rgba(99,102,241,0.3)]' : 
                card.status === 'done' ? 'border-emerald-500/30 bg-emerald-950/10' :
                card.status === 'failed' ? 'border-red-500/30 bg-red-950/10' :
                card.status === 'queued' ? 'border-amber-500/20 bg-amber-950/10' :
                'border-zinc-800 bg-zinc-900/50 hover:border-indigo-500/20'}
            `}
          >
            {/* Card Header */}
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/5">
              <div className="flex items-center gap-2">
                <Grip size={12} className="text-zinc-600" />
                <span className="text-[10px] font-mono text-zinc-500">#{index + 1}</span>
                {card.status === 'generating' && <Loader2 size={11} className="text-indigo-400 animate-spin" />}
                {card.status === 'queued' && <span className="text-[9px] text-amber-400 font-medium">QUEUED</span>}
                {card.status === 'done' && <CheckCircle2 size={11} className="text-emerald-400" />}
                {card.status === 'failed' && <AlertCircle size={11} className="text-red-400" />}
              </div>
              <div className="flex items-center gap-1">
                {/* Download Button (visible when done) */}
                {card.status === 'done' && card.resultImage && (
                  <button
                    onClick={() => handleDownload(card.resultImage!, card.prompt)}
                    className="text-zinc-500 hover:text-indigo-400 transition-colors p-0.5"
                    title="Download image"
                  >
                    <Download size={12} />
                  </button>
                )}
                {/* Regenerate Button (visible when done or failed) */}
                {(card.status === 'done' || card.status === 'failed') && !isRunning && (
                  <button
                    onClick={() => onRegenerate(card.id)}
                    className="text-zinc-500 hover:text-amber-400 transition-colors p-0.5"
                    title="Regenerate"
                  >
                    <RefreshCw size={12} />
                  </button>
                )}
                {/* Remove Button */}
                <button
                  onClick={() => removeCard(card.id)}
                  disabled={card.status === 'generating' || isRunning}
                  className="text-zinc-600 hover:text-red-400 transition-colors disabled:opacity-20 p-0.5"
                >
                  <X size={12} />
                </button>
              </div>
            </div>

            {/* Card Body */}
            <div className="p-3 space-y-2">
              {/* Prompt Input */}
              <textarea
                value={card.prompt}
                onChange={(e) => updateCard(card.id, { prompt: e.target.value })}
                placeholder="Describe your Pixar character..."
                disabled={card.status !== 'idle'}
                className="w-full h-16 bg-black/30 border border-white/5 rounded-lg p-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500/40 resize-none transition-all disabled:opacity-50"
              />

              {/* Style & Ratio Row */}
              <div className="flex items-center gap-2">
                {/* Style Selector */}
                <div className="flex bg-black/30 rounded-md p-0.5 border border-white/5 flex-1">
                  {STYLE_OPTIONS.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => updateCard(card.id, { style: s.id })}
                      disabled={card.status !== 'idle'}
                      className={`flex-1 py-1 text-[9px] font-medium rounded transition-all flex items-center justify-center gap-0.5 ${
                        card.style === s.id
                          ? 'bg-indigo-600/30 text-indigo-300'
                          : 'text-zinc-500 hover:text-zinc-300'
                      } disabled:opacity-40`}
                      title={s.label}
                    >
                      <span className="text-[10px]">{s.icon}</span>
                      <span className="hidden sm:inline">{s.label}</span>
                    </button>
                  ))}
                </div>

                {/* Ratio Selector */}
                <div className="flex bg-black/30 rounded-md p-0.5 border border-white/5">
                  {RATIO_OPTIONS.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => updateCard(card.id, { ratio: r.id })}
                      disabled={card.status !== 'idle'}
                      className={`px-1.5 py-1 text-[9px] font-mono rounded transition-all ${
                        card.ratio === r.id
                          ? 'bg-indigo-600/30 text-indigo-300'
                          : 'text-zinc-500 hover:text-zinc-300'
                      } disabled:opacity-40`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Result Thumbnail (if done) */}
              {card.status === 'done' && card.resultImage && (
                <div className="mt-1 relative group">
                  <img 
                    src={card.resultImage} 
                    alt={card.prompt} 
                    className="w-full h-28 object-cover rounded-lg border border-emerald-500/20"
                  />
                  {/* Overlay actions on hover */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-3">
                    <button
                      onClick={() => handleDownload(card.resultImage!, card.prompt)}
                      className="p-2 bg-white/10 hover:bg-white/20 rounded-lg backdrop-blur-sm transition-all border border-white/10"
                      title="Download"
                    >
                      <Download size={16} className="text-white" />
                    </button>
                    <button
                      onClick={() => onRegenerate(card.id)}
                      className="p-2 bg-white/10 hover:bg-white/20 rounded-lg backdrop-blur-sm transition-all border border-white/10"
                      title="Regenerate"
                    >
                      <RefreshCw size={16} className="text-white" />
                    </button>
                  </div>
                </div>
              )}

              {/* Error message */}
              {card.status === 'failed' && card.error && (
                <div className="mt-1 flex items-start gap-2 bg-red-950/20 border border-red-500/10 rounded-lg p-2">
                  <AlertCircle size={12} className="text-red-400 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-red-300 line-clamp-3">{card.error}</p>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Add Prompt Button */}
        <button
          onClick={addCard}
          disabled={isRunning}
          className="w-full py-3 rounded-xl border-2 border-dashed border-zinc-800 hover:border-indigo-500/30 hover:bg-indigo-950/10 text-zinc-500 hover:text-indigo-400 text-xs font-medium flex items-center justify-center gap-2 transition-all disabled:opacity-30 disabled:pointer-events-none"
        >
          <Plus size={14} />
          Add Prompt
        </button>
      </div>

      {/* Footer — Run All */}
      <div className="p-3 border-t border-indigo-500/15 bg-zinc-950 space-y-2">
        <div className="flex items-center justify-between text-[10px] text-zinc-500 px-1">
          <span>{idleCards.length} prompt{idleCards.length !== 1 ? 's' : ''} ready</span>
          <span>{cards.filter(c => c.status === 'done').length} done</span>
        </div>
        <button
          onClick={onRunAll}
          disabled={!canRun}
          className={`
            w-full h-12 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all uppercase tracking-wider
            ${!canRun
              ? 'bg-zinc-900 text-zinc-600 cursor-not-allowed border border-zinc-800'
              : 'bg-indigo-500 hover:bg-indigo-400 text-white shadow-[0_0_25px_-5px_rgba(99,102,241,0.5)] border border-indigo-400/50'
            }
          `}
        >
          {isRunning ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Play size={16} className="fill-current" />
              Run All ({idleCards.length})
            </>
          )}
        </button>
      </div>
    </div>
  );
};
