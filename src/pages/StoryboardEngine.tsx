import React, { useState, useCallback } from 'react';
import { Sidebar } from '../../components/Sidebar';
import { StoryboardCard } from '../../components/StoryboardCard';
import { StoryboardScene, StoryboardGlobalSettings, ModelStyle, AspectRatio, StoryboardCharacters, StoryboardProp } from '../../types';
import { supabase } from '../lib/supabase';
import { generateStoryboard, generateFirstFrame, regenerateScene } from '../../services/storyboardService';
import { useToast } from '../../components/Toast';
import { CharacterPicker } from '../components/CharacterPicker';
import { CharacterPreset } from '../data/characterPresets';
import { ScriptSummary } from '../components/ScriptSummary';
import { PreviewModal, PreviewMedia } from '../components/PreviewModal';
import {
  Sparkles,
  Loader2,
  Settings2,
  UserCircle,
  Palette,
  RectangleHorizontal,
  RectangleVertical,
  Download,
  Film,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  RotateCcw,
  Copy,
  Hash,
} from 'lucide-react';

// ─── Default Settings ────────────────────────────────────────────────

const DEFAULT_SETTINGS: StoryboardGlobalSettings = {
  characterDescription: '',
  styleId: ModelStyle.PIXAR_CLASSIC,
  aspectRatio: '16:9',
  sceneCount: 4,
};

const STYLE_OPTIONS = [
  { id: ModelStyle.PIXAR_CLASSIC, label: 'Pixar', emoji: '🤠', color: 'indigo' },
  { id: ModelStyle.MODERN_DISNEY, label: 'Disney', emoji: '❄️', color: 'blue' },
  { id: ModelStyle.CLAYMATION, label: 'Clay', emoji: '🧱', color: 'amber' },
];

const SCENE_COUNT_OPTIONS = [3, 4, 5, 6];

interface StoryboardHistoryItem {
  id: string;
  idea: string;
  settings: StoryboardGlobalSettings;
  characters: StoryboardCharacters | null;
  props: StoryboardProp[];
  scenes: StoryboardScene[];
  createdAt: number;
}

// ─── Main Component ─────────────────────────────────────────────────

const StoryboardEngine: React.FC = () => {
  // Idea input
  const [idea, setIdea] = useState('');

  // Global settings
  const [settings, setSettings] = useState<StoryboardGlobalSettings>(DEFAULT_SETTINGS);
  const [settingsOpen, setSettingsOpen] = useState(true);
  const [selectedPreset, setSelectedPreset] = useState<CharacterPreset | null>(null);

  // Storyboard state
  const [scenes, setScenes] = useState<StoryboardScene[]>([]);
  const [characters, setCharacters] = useState<StoryboardCharacters | null>(null);
  const [propsList, setPropsList] = useState<StoryboardProp[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingFrameIds, setGeneratingFrameIds] = useState<Set<string>>(new Set());

  // Gallery sidebar (stub)
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);

  // Preview Modal State
  const [previewMedia, setPreviewMedia] = useState<PreviewMedia | null>(null);

  // History State
  const [history, setHistory] = React.useState<StoryboardHistoryItem[]>([]);
  const [currentHistoryId, setCurrentHistoryId] = React.useState<string | null>(null);

  const { addToast } = useToast();

  React.useEffect(() => {
    const fetchHistory = async () => {
      try {
        const { data, error } = await supabase
          .from('storyboard_history')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(20);

        if (error) {
          console.error('[Supabase] fetch error:', error);
          // Fallback to local storage
          const saved = localStorage.getItem('storyboard_history');
          if (saved) setHistory(JSON.parse(saved));
          return;
        }

        if (data && data.length > 0) {
          setHistory(data.map(d => ({
            id: d.id,
            idea: d.idea,
            settings: d.settings,
            characters: d.characters,
            props: d.props,
            scenes: d.scenes,
            createdAt: new Date(d.created_at).getTime()
          })));
        } else {
          const saved = localStorage.getItem('storyboard_history');
          if (saved) setHistory(JSON.parse(saved));
        }
      } catch (e) {
        console.error('[Supabase] Exception:', e);
      }
    };
    
    fetchHistory();
  }, []);

  React.useEffect(() => {
    if (scenes.length > 0 && currentHistoryId) {
      setHistory(prev => {
        const updated = prev.map(h => 
          h.id === currentHistoryId ? { ...h, scenes, characters, props: propsList, idea, settings } : h
        );
        localStorage.setItem('storyboard_history', JSON.stringify(updated));
        return updated;
      });

      // Background update to Supabase
      supabase.from('storyboard_history').update({
        idea,
        settings,
        characters,
        props: propsList,
        scenes,
      }).eq('id', currentHistoryId).then(({ error }) => {
        if (error) console.error('[Supabase] update error:', error);
      });
    }
  }, [scenes, characters, propsList, idea, settings, currentHistoryId]);

  // ─── Generate Storyboard ──────────────────────────────────────────

  const handleGenerate = useCallback(async () => {
    if (!idea.trim()) return;

    setIsGenerating(true);
    setScenes([]);
    setCharacters(null);
    setPropsList([]);

    try {
      addToast({ type: 'info', title: 'Generating Storyboard', message: `Creating ${settings.sceneCount} scenes from your idea...` });
      const result = await generateStoryboard(idea, settings);
      setScenes(result.scenes);
      setCharacters(result.characters);
      setPropsList(result.props);
      addToast({ type: 'success', title: 'Storyboard Ready!', message: `${result.scenes.length} scenes generated` });

      const newId = crypto.randomUUID();
      setCurrentHistoryId(newId);
      const newHistoryItem: StoryboardHistoryItem = {
        id: newId,
        idea,
        settings,
        characters: result.characters,
        props: result.props,
        scenes: result.scenes,
        createdAt: Date.now()
      };
      
      setHistory(prev => {
        const updated = [newHistoryItem, ...prev].slice(0, 20); // Keep last 20
        localStorage.setItem('storyboard_history', JSON.stringify(updated));
        return updated;
      });

      // Background insert to Supabase
      supabase.from('storyboard_history').insert([{
        id: newId,
        idea,
        settings,
        characters: result.characters,
        props: result.props,
        scenes: result.scenes,
      }]).then(({ error }) => {
        if (error) console.error('[Supabase] insert error:', error);
      });

    } catch (err: any) {
      console.error('[StoryboardEngine] generation failed:', err);
      addToast({ type: 'error', title: 'Generation Failed', message: err.message || 'Unknown error' });
    } finally {
      setIsGenerating(false);
    }
  }, [idea, settings, addToast]);

  // ─── Edit Scene ───────────────────────────────────────────────────

  const handleEditScene = useCallback((id: string, updates: Partial<StoryboardScene>) => {
    setScenes(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  }, []);

  // ─── Regenerate Scene ─────────────────────────────────────────────

  const handleRegenerateScene = useCallback(async (id: string) => {
    const scene = scenes.find(s => s.id === id);
    if (!scene) return;

    setScenes(prev => prev.map(s => s.id === id ? { ...s, status: 'generating' } : s));

    try {
      const updated = await regenerateScene(scene, idea, settings);
      setScenes(prev => prev.map(s => s.id === id ? { ...updated, id, sceneNumber: scene.sceneNumber, status: 'idle' } : s));
      addToast({ type: 'success', title: 'Scene Regenerated', message: `Scene #${scene.sceneNumber} updated` });
    } catch (err: any) {
      setScenes(prev => prev.map(s => s.id === id ? { ...s, status: 'failed', error: err.message } : s));
      addToast({ type: 'error', title: 'Regeneration Failed', message: err.message });
    }
  }, [scenes, idea, settings, addToast]);

  // ─── Generate First Frame ─────────────────────────────────────────

  const handleGenerateFrame = useCallback(async (id: string) => {
    const scene = scenes.find(s => s.id === id);
    if (!scene) return;

    setGeneratingFrameIds(prev => new Set(prev).add(id));

    try {
      const url = await generateFirstFrame(scene, settings);
      setScenes(prev => prev.map(s => s.id === id ? { ...s, firstFrameUrl: url, status: 'done' } : s));
      addToast({ type: 'success', title: 'Frame Generated', message: `Scene #${scene.sceneNumber} preview ready` });
    } catch (err: any) {
      setScenes(prev => prev.map(s => s.id === id ? { ...s, error: err.message } : s));
      addToast({ type: 'error', title: 'Frame Failed', message: err.message });
    } finally {
      setGeneratingFrameIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }, [scenes, settings, addToast]);

  // ─── Generate ALL First Frames ────────────────────────────────────

  const handleGenerateAllFrames = useCallback(async () => {
    const scenesWithoutFrame = scenes.filter(s => !s.firstFrameUrl);
    if (scenesWithoutFrame.length === 0) {
      addToast({ type: 'info', title: 'All done', message: 'All scenes already have first frames' });
      return;
    }

    addToast({ type: 'info', title: 'Generating Frames', message: `Creating ${scenesWithoutFrame.length} preview images sequentially...` });

    for (const scene of scenesWithoutFrame) {
      await handleGenerateFrame(scene.id);
      // Small delay between generations to respect rate limits
      await new Promise(r => setTimeout(r, 2000));
    }
  }, [scenes, handleGenerateFrame, addToast]);

  // ─── Download 1080p Image ─────────────────────────────────────────

  const handleDownload1080p = useCallback(async (sceneNumber: number, url: string) => {
    try {
      addToast({ type: 'info', title: 'Downloading', message: `Upscaling Scene #${sceneNumber} to 1080p...` });
      
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      
      const img = new Image();
      img.src = blobUrl;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });
      URL.revokeObjectURL(blobUrl);

      const canvas = document.createElement('canvas');
      const ratio = img.width / img.height;
      let targetWidth, targetHeight;
      if (ratio > 1) { // Landscape
        targetWidth = 1920;
        targetHeight = Math.round(1920 / ratio);
      } else { // Portrait or Square
        targetHeight = 1920;
        targetWidth = Math.round(1920 * ratio);
      }

      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
         ctx.imageSmoothingEnabled = true;
         ctx.imageSmoothingQuality = 'high';
         ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
         const dataUrl = canvas.toDataURL('image/png', 1.0);
         const link = document.createElement('a');
         link.href = dataUrl;
         link.download = `AuraVisual_Scene_${sceneNumber}_1080p.png`;
         document.body.appendChild(link);
         link.click();
         document.body.removeChild(link);
      }
      addToast({ type: 'success', title: 'Downloaded', message: `Scene #${sceneNumber} saved at 1080p.` });
    } catch (e) {
      console.error(e);
      addToast({ type: 'error', title: 'Download Failed', message: 'Could not upscale and download image.' });
    }
  }, [addToast]);

  // ─── Export JSON ──────────────────────────────────────────────────

  const handleExportJSON = useCallback(() => {
    const data = {
      idea,
      settings,
      scenes: scenes.map(s => ({
        sceneNumber: s.sceneNumber,
        title: s.title,
        duration: s.duration,
        action: s.action,
        imagePrompt: s.imagePrompt,
        videoPrompt: s.videoPrompt,
        audioDescription: s.audioDescription,
        narration: s.narration,
      })),
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeName = idea.substring(0, 30).replace(/[^a-z0-9]/gi, '_').toLowerCase();
    a.download = `storyboard_${safeName}_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addToast({ type: 'success', title: 'Exported!', message: 'Storyboard saved as JSON' });
  }, [idea, settings, scenes, addToast]);

  // ─── Export for Grok (TXT) ────────────────────────────────────────

  const handleExportGrok = useCallback(() => {
    if (scenes.length === 0) return;

    const content = scenes.map((scene, i) => {
      let dialogueText = '';
      if (scene.dialogue) {
        if (scene.dialogue.model === 'parent-child') {
          dialogueText = `[DIALOGUE — LIP SYNC VIETNAMESE — PARENT-CHILD]\n\nTWO CHARACTERS in frame:\n- Parent/Adult\n- Child/Teen\n\nEXCHANGE:\n`;
          if (scene.dialogue.exchange) {
            scene.dialogue.exchange.forEach(msg => {
              dialogueText += `[${msg.timing}] ${msg.speaker} speaks:\nTEXT: "${msg.text_vi}"\nPHONETIC: ${msg.phonetic_guide}\nEMOTION: ${msg.emotion}\n\n`;
            });
          }
        } else if (scene.dialogue.model === 'peer-to-peer') {
          dialogueText = `[DIALOGUE — LIP SYNC VIETNAMESE — PEER-TO-PEER]\n\nTWO CHARACTERS in frame (Peer interaction):\n\nEXCHANGE:\n`;
          if (scene.dialogue.exchange) {
            scene.dialogue.exchange.forEach(msg => {
              dialogueText += `[${msg.timing}] ${msg.speaker} speaks:\nTEXT: "${msg.text_vi}"\nPHONETIC: ${msg.phonetic_guide}\nEMOTION: ${msg.emotion}\n\n`;
            });
          }
        } else if (scene.dialogue.model === 'solo-narrator' || scene.dialogue.text_vi) {
          dialogueText = `[DIALOGUE — LIP SYNC VIETNAMESE — SOLO-NARRATOR]\n\nONE CHARACTER in frame:\n\nEXCHANGE:\n[${scene.dialogue.timing || '0:01-0:04'}] ${scene.dialogue.speaker || 'Narrator'} speaks:\nTEXT: "${scene.dialogue.text_vi}"\nPHONETIC: ${scene.dialogue.phonetic_guide}\nEMOTION: ${scene.dialogue.emotion}\n\n`;
        }
      }

      return `
════════════════════════
SCENE ${i + 1}: ${scene.title}
Duration: ${scene.duration}s
Image: ${scene.firstFrameUrl || 'Not generated yet'}
════════════════════════

${scene.videoPrompt}

${dialogueText}
---
`;
    }).join("\n");

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeName = idea.substring(0, 30).replace(/[^a-z0-9]/gi, '_').toLowerCase();
    a.download = `grok_prompts_${safeName}_${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    addToast({ type: 'success', title: 'Exported for Grok!', message: 'TXT file downloaded successfully.' });
  }, [idea, scenes, addToast]);

  // ─── Copy All Prompts ─────────────────────────────────────────────

  const handleCopyAll = useCallback(() => {
    const text = scenes.map(s =>
      `--- Scene ${s.sceneNumber}: ${s.title} (${s.duration}s) ---\n\n` +
      `🖼 IMAGE PROMPT:\n${s.imagePrompt}\n\n` +
      `🎬 VIDEO PROMPT:\n${s.videoPrompt}\n`
    ).join('\n\n');
    navigator.clipboard.writeText(text);
    addToast({ type: 'success', title: 'Copied!', message: 'All prompts copied to clipboard' });
  }, [scenes, addToast]);

  // ─── Reset ────────────────────────────────────────────────────────

  const handleReset = useCallback(() => {
    setIdea('');
    setScenes([]);
    setCharacters(null);
    setPropsList([]);
    setSettings(DEFAULT_SETTINGS);
  }, []);

  // ─── Update Settings Helper ───────────────────────────────────────

  const updateSetting = <K extends keyof StoryboardGlobalSettings>(
    key: K,
    value: StoryboardGlobalSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  // ─── Render ───────────────────────────────────────────────────────

  return (
    <div className="flex h-screen bg-[#0a0a0a] text-white overflow-hidden">
      <Sidebar onToggleGallery={() => setIsGalleryOpen(!isGalleryOpen)} isGalleryOpen={isGalleryOpen} />

      <div className="flex-1 ml-16 flex flex-col overflow-hidden bg-[#0f0f11]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Film size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Storyboard Engine</h1>
              <p className="text-[10px] text-zinc-500">Cỗ máy Kịch bản — AI Prompt Generator</p>
            </div>
          </div>
          {scenes.length > 0 && (
            <button
              onClick={handleReset}
              className="text-[11px] text-zinc-500 hover:text-zinc-300 flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-zinc-800/50 transition-colors"
            >
              <RotateCcw size={12} /> Reset
            </button>
          )}
        </div>

        {/* Two-Column Layout Container */}
        <div className="flex-1 overflow-hidden flex flex-row">
          
          {/* LEFT COLUMN: Controls & Settings */}
          <div className="w-[420px] shrink-0 border-r border-zinc-800/50 flex flex-col bg-[#0a0a0a] overflow-y-auto">
            <div className="p-6 space-y-6">
              {/* Idea Input */}
              <div className="space-y-3">
                <label className="text-[12px] font-bold text-zinc-300 uppercase tracking-widest flex items-center gap-2">
                  <Sparkles size={14} className="text-amber-400" />
                  1. Your Idea
                </label>
                <textarea
                  value={idea}
                  onChange={(e) => setIdea(e.target.value)}
                  placeholder='VD: "Dạy về nốt đen trong âm nhạc cho trẻ em"'
                  rows={4}
                  className="w-full bg-zinc-900 focus:bg-zinc-800/80 border border-zinc-800 rounded-2xl px-5 py-4 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 resize-none transition-all"
                />
                <button
                  onClick={handleGenerate}
                  disabled={!idea.trim() || isGenerating}
                  className={`w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all shadow-lg ${
                    !idea.trim() || isGenerating
                      ? 'bg-zinc-900 text-zinc-600 cursor-not-allowed border border-zinc-800 shadow-none'
                      : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-amber-500/20 hover:shadow-amber-500/40 hover:-translate-y-0.5'
                  }`}
                >
                  {isGenerating ? (
                    <><Loader2 size={18} className="animate-spin" /> Generating Storyboard...</>
                  ) : (
                    <><Sparkles size={18} /> Generate Storyboard</>
                  )}
                </button>
              </div>

              <div className="h-px bg-zinc-800/50 w-full" />

              {/* Global Settings (Always open in Left Panel) */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-zinc-300 uppercase tracking-widest">
                  <Settings2 size={14} className="text-zinc-500" />
                  2. Global Settings
                </div>
                
                <div className="space-y-5">
                  {/* Character Description */}
                  <div className="space-y-2">
                    <CharacterPicker
                      selectedStyle={settings.styleId}
                      currentCharacterLock={settings.characterDescription}
                      onSelect={(preset) => {
                        setSelectedPreset(preset);
                        updateSetting('characterDescription', preset.characterLock);
                      }}
                      onClear={() => {
                        setSelectedPreset(null);
                        updateSetting('characterDescription', "");
                      }}
                    />
                    <label className="text-[11px] font-semibold text-zinc-400 flex items-center gap-1.5">
                      <UserCircle size={12} /> Character Lock
                    </label>
                    <textarea
                      value={settings.characterDescription}
                      onChange={(e) => {
                        updateSetting('characterDescription', e.target.value);
                        if (selectedPreset) setSelectedPreset(null);
                      }}
                      placeholder='Ví dụ: "Cô bé Gen Z 16 tuổi, tóc nâu bob, mắt to, mặc áo hoodie tím"'
                      rows={3}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-indigo-500/50 resize-none transition-colors"
                    />
                    <p className="text-[10px] text-zinc-500 leading-relaxed">
                      🔒 Tự động khóa nhân vật này vào mọi scene.
                    </p>
                  </div>

                  {/* Style Selector */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-semibold text-zinc-400 flex items-center gap-1.5">
                      <Palette size={12} /> Render Style
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {STYLE_OPTIONS.map(opt => (
                        <button
                          key={opt.id}
                          onClick={() => updateSetting('styleId', opt.id)}
                          className={`px-3 py-2.5 rounded-xl text-[12px] font-semibold transition-all flex flex-col items-center gap-1 ${
                            settings.styleId === opt.id
                              ? `bg-${opt.color}-500/20 text-${opt.color}-300 border border-${opt.color}-500/40 ring-1 ring-${opt.color}-500/20`
                              : 'bg-zinc-900 text-zinc-500 border border-zinc-800 hover:text-zinc-300 hover:bg-zinc-800/80'
                          }`}
                        >
                          <span className="text-lg">{opt.emoji}</span>
                          <span>{opt.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Ratio & Scene Count Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Aspect Ratio */}
                    <div className="space-y-2">
                      <label className="text-[11px] font-semibold text-zinc-400">Aspect Ratio</label>
                      <div className="flex gap-2">
                        <button
                          onClick={() => updateSetting('aspectRatio', '16:9')}
                          className={`flex-1 py-2 rounded-xl text-[12px] font-semibold transition-all flex items-center justify-center gap-1.5 ${
                            settings.aspectRatio === '16:9'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : 'bg-zinc-900 text-zinc-500 border border-zinc-800 hover:text-zinc-300'
                          }`}
                        >
                          <RectangleHorizontal size={14} /> 16:9
                        </button>
                        <button
                          onClick={() => updateSetting('aspectRatio', '9:16')}
                          className={`flex-1 py-2 rounded-xl text-[12px] font-semibold transition-all flex items-center justify-center gap-1.5 ${
                            settings.aspectRatio === '9:16'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : 'bg-zinc-900 text-zinc-500 border border-zinc-800 hover:text-zinc-300'
                          }`}
                        >
                          <RectangleVertical size={14} /> 9:16
                        </button>
                      </div>
                    </div>

                    {/* Scene Count */}
                    <div className="space-y-2">
                      <label className="text-[11px] font-semibold text-zinc-400 flex items-center gap-1.5">
                        <Hash size={12} /> Target Scenes
                      </label>
                      <div className="flex gap-1.5">
                        {SCENE_COUNT_OPTIONS.map(n => (
                          <button
                            key={n}
                            onClick={() => updateSetting('sceneCount', n)}
                            className={`flex-1 aspect-square rounded-xl text-[13px] font-bold transition-all flex items-center justify-center ${
                              settings.sceneCount === n
                                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                                : 'bg-zinc-900 text-zinc-500 border border-zinc-800 hover:text-zinc-300'
                            }`}
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Canvas & Results */}
          <div className="flex-1 flex flex-col overflow-hidden relative">
            {/* Canvas Scrollable Area */}
            <div className="flex-1 overflow-y-auto p-8">
              {isGenerating && (
                <div className="h-full flex items-center justify-center">
                  <div className="flex flex-col items-center gap-5 translate-y-[-10%]">
                    <div className="relative">
                      <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center animate-pulse shadow-2xl shadow-amber-500/10">
                        <Sparkles size={36} className="text-amber-400" />
                      </div>
                      <Loader2 size={64} className="absolute -top-[8px] -left-[8px] animate-spin text-amber-500/30" />
                    </div>
                    <div className="text-center">
                      <h2 className="text-xl font-bold text-white tracking-wide">Crafting your vision...</h2>
                      <p className="text-sm text-zinc-500 mt-2 max-w-sm">
                        AI is currently generating a detailed {settings.sceneCount}-scene sequence complete with dual image and video prompts.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {!isGenerating && scenes.length > 0 && (
                <div className="max-w-[1400px] mx-auto space-y-6 pb-20">
                  {/* Action Bar & Stats */}
                  <div className="flex items-center justify-between bg-zinc-900/40 p-4 border border-zinc-800/60 rounded-2xl backdrop-blur-sm">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400">
                        <Film size={20} />
                      </div>
                      <div>
                        <h2 className="text-sm font-bold text-white">Generated Sequence</h2>
                        <p className="text-[11px] text-zinc-400">
                          {scenes.length} scenes • {scenes.reduce((acc, s) => acc + s.duration, 0)} seconds total
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleCopyAll}
                        className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-all border border-zinc-700"
                      >
                        <Copy size={14} /> Copy All
                      </button>
                      <button
                        onClick={handleExportGrok}
                        className="px-4 py-2 bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 hover:text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all border border-purple-500/30 shadow-sm shadow-purple-500/10"
                      >
                        <Download size={14} /> Export for Grok
                      </button>
                    </div>
                  </div>

                  {/* Auto-Frame Generation Hook */}
                  <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/5 border border-amber-500/20 rounded-2xl p-4 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-amber-500 flex items-center gap-2">
                        <ImageIcon size={16} /> Pre-visualize Storyboard
                      </h3>
                      <p className="text-xs text-zinc-400 mt-1">Generate preview keyframes for all scenes automatically.</p>
                    </div>
                    <button
                      onClick={handleGenerateAllFrames}
                      disabled={isGenerating || generatingFrameIds.size > 0 || scenes.every(s => s.firstFrameUrl)}
                      className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-800 disabled:text-zinc-600 text-amber-950 font-bold text-xs rounded-xl transition-colors disabled:cursor-not-allowed border border-amber-400/50 flex items-center gap-2"
                    >
                      {generatingFrameIds.size > 0 ? (
                        <><Loader2 size={14} className="animate-spin" /> Processing...</>
                      ) : (
                        "Generate Keyframes"
                      )}
                    </button>
                  </div>

                  {/* TWO-COLUMN LAYOUT: Content Area */}
                  <div className="flex gap-6 items-start">
                    
                    {/* LEFT COLUMN: Generated Scenes (StoryboardCards) */}
                    <div className="flex-[4] flex flex-col gap-6">

                      {/* Characters & Props Panel */}
                      {(characters || propsList.length > 0) && (
                        <div className="flex gap-4">
                          {characters && (
                            <div className="flex-1 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-4">
                              <h3 className="text-sm font-bold text-indigo-400 flex items-center gap-2 mb-3">
                                👥 Characters Setup
                              </h3>
                              <div className="space-y-3">
                                <div className="bg-zinc-900/50 rounded-xl p-3 border border-zinc-800/50">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded uppercase">Main</span>
                                    <span className="text-sm font-bold text-zinc-200">{characters.main.name}</span>
                                  </div>
                                  <p className="text-xs text-zinc-400 mb-1">{characters.main.description}</p>
                                  <p className="text-[10px] text-zinc-500 font-semibold flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-zinc-600"></span> {characters.main.color_key}
                                  </p>
                                </div>
                                {characters.secondary && characters.secondary.name && (
                                  <div className="bg-zinc-900/50 rounded-xl p-3 border border-zinc-800/50">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-[10px] font-bold text-indigo-400 bg-indigo-400/10 px-2 py-0.5 rounded uppercase">{characters.secondary.role || "Secondary"}</span>
                                      <span className="text-sm font-bold text-zinc-200">{characters.secondary.name}</span>
                                    </div>
                                    <p className="text-xs text-zinc-400 mb-1">{characters.secondary.description}</p>
                                    <p className="text-[10px] text-zinc-500 font-semibold flex items-center gap-1">
                                      <span className="w-2 h-2 rounded-full bg-zinc-600"></span> {characters.secondary.color_key}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {propsList.length > 0 && (
                            <div className="flex-1 bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4">
                              <h3 className="text-sm font-bold text-amber-400 flex items-center gap-2 mb-3">
                                🎹 Key Props Context
                              </h3>
                              <div className="space-y-3">
                                {propsList.map(prop => (
                                  <div key={prop.name} className="bg-zinc-900/50 rounded-xl p-3 border border-zinc-800/50">
                                    <div className="flex flex-wrap items-center justify-between mb-1 gap-2">
                                      <span className="text-[13px] font-bold text-zinc-200">{prop.name}</span>
                                      <span className="text-[9px] text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded font-semibold whitespace-nowrap">
                                        Scenes {prop.scenes_used.join(', ')}
                                      </span>
                                    </div>
                                    <p className="text-xs text-zinc-400">{prop.description}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {scenes.map(scene => (
                        <StoryboardCard
                          key={scene.id}
                          scene={scene}
                          onEdit={handleEditScene}
                          onRegenerate={handleRegenerateScene}
                          onGenerateFrame={handleGenerateFrame}
                          onPreviewMedia={(url, type) => setPreviewMedia({ url, type })}
                          onDownloadFrame={(url) => handleDownload1080p(scene.sceneNumber, url)}
                          isGeneratingFrame={generatingFrameIds.has(scene.id)}
                          disabled={isGenerating}
                        />
                      ))}
                    </div>

                    {/* RIGHT COLUMN: Script Summary */}
                    <div className="flex-[3] sticky top-0 h-[calc(100vh-280px)]">
                      <ScriptSummary scenes={scenes} />
                    </div>

                  </div>
                </div>
              )}

              {/* Empty State */}
              {!isGenerating && scenes.length === 0 && (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center space-y-4 max-w-md translate-y-[-10%]">
                    <div className="w-20 h-20 rounded-3xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto shadow-xl shadow-black/50">
                      <Film size={32} className="text-zinc-700" />
                    </div>
                    <h2 className="text-xl font-bold text-zinc-300">Start Your Story</h2>
                    <p className="text-sm text-zinc-500 leading-relaxed">
                      Use the control panel on the left to describe your idea, set style preferences, and generate a professional storyboard.
                    </p>
                    
                    <div className="pt-6">
                      <p className="text-xs font-semibold text-zinc-600 uppercase tracking-widest mb-3">Try an example</p>
                      <div className="flex flex-wrap gap-2 justify-center">
                        {['Dạy về nốt đen', 'Robot học vẽ tranh', 'Phi hành gia đi lạc ở Sài Gòn'].map(s => (
                          <button
                            key={s}
                            onClick={() => setIdea(s)}
                            className="text-xs px-4 py-2 rounded-xl bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-amber-400 hover:border-amber-500/30 hover:bg-amber-500/5 transition-all shadow-sm"
                          >
                            "{s}"
                          </button>
                        ))}
                      </div>
                    </div>

                    {history.length > 0 && (
                      <div className="pt-8 w-full">
                        <p className="text-xs font-semibold text-zinc-600 uppercase tracking-widest mb-3 text-center">Recent Generations</p>
                        <div className="flex flex-col gap-2 w-full max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                          {history.map(item => (
                            <button
                              key={item.id}
                              onClick={() => {
                                setCurrentHistoryId(item.id);
                                setIdea(item.idea);
                                setSettings(item.settings);
                                setScenes(item.scenes);
                                setCharacters(item.characters);
                                setPropsList(item.props || []);
                              }}
                              className="text-left px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all flex items-center justify-between group"
                            >
                              <div className="truncate pr-4 flex-1">
                                <p className="text-sm font-medium text-zinc-300 truncate">{item.idea}</p>
                                <p className="text-[10px] text-zinc-500 mt-1">{new Date(item.createdAt).toLocaleString()} • {item.scenes.length} scenes</p>
                              </div>
                              <span className="text-indigo-400 text-[10px] uppercase font-bold tracking-wider shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">Load</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Absolute Preview Modal Overlay */}
      <PreviewModal
        media={previewMedia}
        onClose={() => setPreviewMedia(null)}
      />
    </div>
  );
};

export default StoryboardEngine;
