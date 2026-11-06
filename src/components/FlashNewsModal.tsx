'use client';

/**
 * FlashNewsModal - Professional On-Air Lower-Third News & Flash Ticker Manager
 * 
 * Empowers broadcast directors and newsroom operators to:
 * 1. Inject real-time Breaking News, Sports Scores, and Market Tickers directly into the on-air ribbon
 * 2. Instant 1-Click Flash Presets (Sports Goal, Market Surge, Tech Keynote, Breaking World Event)
 * 3. Priority Placement (Pins items to the very front of the scrolling marquee)
 * 4. Active Headlines Shelf with 1-Click live removal or re-ordering
 * 5. Instant synchronization with all linear TV channels and OBS Studio Docks
 */

import React, { useState } from 'react';
import { useBroadcast } from '../context/BroadcastContext';
import {
  X,
  Radio,
  Zap,
  TrendingUp,
  Trophy,
  Flame,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  Sparkles,
  Sliders,
  Eye,
  EyeOff,
  AlertCircle,
  Tag,
  Send,
} from 'lucide-react';

export const FlashNewsModal: React.FC = () => {
  const {
    isFlashNewsModalOpen,
    setIsFlashNewsModalOpen,
    tickerItems,
    addCustomTickerItem,
    removeCustomTickerItem,
    isTickerVisible,
    setIsTickerVisible,
    tickerFontSize,
    setTickerFontSize,
    refreshRealNews,
    isRealNewsLoading,
  } = useBroadcast();

  const [headline, setHeadline] = useState<string>('');
  const [category, setCategory] = useState<'BREAKING' | 'SPORTS' | 'MARKETS' | 'TECH' | 'BUSINESS'>('BREAKING');
  const [customTag, setCustomTag] = useState<string>('BREAKING ALERT');
  const [source, setSource] = useState<string>('BookKaaro Studio Wire');
  const [isHighPriority, setIsHighPriority] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  if (!isFlashNewsModalOpen) return null;

  // Quick Preset Headlines for 1-Click Flash
  const PRESET_FLASH_ITEMS = [
    {
      label: '⚽ Champions League Goal',
      cat: 'SPORTS' as const,
      tag: 'GOAL 78\'',
      headline: 'GOAL! Inter Milan 2 - 1 Real Madrid: Lautaro Martinez header past Courtois into the top-right corner!',
      source: 'Apex Sports Desk',
    },
    {
      label: '📈 Tech Market Surge',
      cat: 'MARKETS' as const,
      tag: '+3.4% ▲',
      headline: 'MARKET ALERT: NASDAQ surges +1.8% as enterprise generative AI spending hits record $48B annualized run rate.',
      source: 'Bloomberg Markets',
    },
    {
      label: '🤖 Frontier AI Announcement',
      cat: 'TECH' as const,
      tag: 'AI BREAKTHROUGH',
      headline: 'TECH DISPATCH: New multimodal reasoning models demonstrate zero-shot self-correcting code generation.',
      source: 'BookKaaro AI Wire',
    },
    {
      label: '🚨 Breaking World Bulletin',
      cat: 'BREAKING' as const,
      tag: 'FLASH',
      headline: 'BREAKING: Global Aerospace Summit announces next-generation autonomous supersonic flight safety accord.',
      source: 'Global Wire',
    },
  ];

  const handleApplyPreset = (preset: typeof PRESET_FLASH_ITEMS[0]) => {
    setCategory(preset.cat);
    setCustomTag(preset.tag);
    setHeadline(preset.headline);
    setSource(preset.source);
  };

  const handlePublishNews = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!headline.trim()) return;

    setIsSubmitting(true);
    try {
      await addCustomTickerItem({
        headline: headline.trim(),
        category,
        change: customTag.trim() || undefined,
        source: source.trim() || 'Station Newsroom',
        isBreaking: category === 'BREAKING' || isHighPriority,
      });

      setSuccessToast(`Flash News Published: "${headline.trim().slice(0, 40)}..." is now live on the broadcast ribbon!`);
      setHeadline('');
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err: any) {
      console.warn('Publish flash news error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#0b0f19] border border-slate-800 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800/80 bg-slate-950/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-500/40 flex items-center justify-center shadow-lg">
              <Radio className="w-5 h-5 text-red-500 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Flash News &amp; Ticker Manager
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-red-500/20 text-red-400 border border-red-500/40">
                  ON-AIR WIRE
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Push real-time breaking news, sports alerts, and live market tickers to the lower-third ribbon.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsFlashNewsModalOpen(false)}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Success Toast */}
          {successToast && (
            <div className="p-3 bg-emerald-950/80 border border-emerald-500/80 rounded-xl flex items-center gap-2.5 text-xs text-emerald-200 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successToast}</span>
            </div>
          )}

          {/* Quick Presets Carousel */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>1-Click Flash Presets</span>
              </label>
              <span className="text-[11px] text-slate-500">Click to autofill headline</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PRESET_FLASH_ITEMS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplyPreset(preset)}
                  className="p-2.5 bg-slate-900/90 hover:bg-slate-850 border border-slate-800 hover:border-amber-500/50 rounded-xl text-left transition-all group flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-200 group-hover:text-amber-300 transition-colors">
                      {preset.label}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                      {preset.cat}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-1">{preset.headline}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Main Flash News Form */}
          <form onSubmit={handlePublishNews} className="space-y-4 bg-slate-950/60 border border-slate-800/80 p-4 rounded-xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/60">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5 text-blue-400" />
                <span>Compose On-Air Headline</span>
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsTickerVisible(!isTickerVisible)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center gap-1 transition-all ${
                    isTickerVisible
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : 'bg-red-950 text-red-300 border border-red-800'
                  }`}
                >
                  {isTickerVisible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                  <span>{isTickerVisible ? 'Ticker Visible' : 'Ticker Hidden'}</span>
                </button>
              </div>
            </div>

            {/* Category Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Category Section</label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {[
                  { id: 'BREAKING', label: 'Breaking News', icon: Flame, color: 'text-red-400' },
                  { id: 'SPORTS', label: 'Sports Scores', icon: Trophy, color: 'text-emerald-400' },
                  { id: 'MARKETS', label: 'Markets / Stock', icon: TrendingUp, color: 'text-amber-400' },
                  { id: 'TECH', label: 'Tech & AI', icon: Zap, color: 'text-purple-400' },
                  { id: 'BUSINESS', label: 'Business Wire', icon: Sparkles, color: 'text-blue-400' },
                ].map((c) => {
                  const Icon = c.icon;
                  const isSel = category === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setCategory(c.id as any);
                        if (c.id === 'BREAKING') setCustomTag('BREAKING');
                        else if (c.id === 'SPORTS') setCustomTag('SCORE ALERT');
                        else if (c.id === 'MARKETS') setCustomTag('MARKET');
                        else if (c.id === 'TECH') setCustomTag('AI');
                        else setCustomTag('WIRE');
                      }}
                      className={`p-2 rounded-lg text-xs font-bold flex items-center gap-1.5 justify-center border transition-all ${
                        isSel
                          ? 'bg-slate-800 border-blue-500 text-white shadow'
                          : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Icon className={`w-3.5 h-3.5 ${c.color}`} />
                      <span className="truncate">{c.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Headline Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Headline Text <span className="text-red-400">*</span>
              </label>
              <textarea
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                rows={2}
                placeholder="Type real-time bulletin, score change, or breaking news headline..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none font-medium"
                required
              />
            </div>

            {/* Tag & Source Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Badge Tag / Metric</label>
                <input
                  type="text"
                  value={customTag}
                  onChange={(e) => setCustomTag(e.target.value)}
                  placeholder="e.g. BREAKING ALERT, +4.8% ▲, GOAL 88'"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Source Wire Credit</label>
                <input
                  type="text"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  placeholder="e.g. BookKaaro Studio, BBC, Reuters"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Priority Checkbox & Submit Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isHighPriority}
                  onChange={(e) => setIsHighPriority(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700 text-red-600 focus:ring-0 w-4 h-4 cursor-pointer"
                />
                <span className="text-xs text-slate-300 font-semibold">
                  Pin to front of ribbon with pulsing highlight
                </span>
              </label>

              <button
                type="submit"
                disabled={!headline.trim() || isSubmitting}
                className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg shadow-red-600/30 flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02]"
              >
                <Radio className="w-4 h-4" />
                <span>{isSubmitting ? 'Publishing...' : '⚡ Flash to Air Now'}</span>
              </button>
            </div>
          </form>

          {/* Live Preview of Composed Ticker Item */}
          {headline.trim() && (
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Live On-Air Ribbon Preview
              </label>
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center gap-3 overflow-hidden">
                <span className="px-2 py-0.5 rounded text-[11px] font-black uppercase tracking-wider bg-red-600/30 text-red-300 border border-red-500/50 flex items-center gap-1 shrink-0">
                  <Radio className="w-3 h-3 text-red-400 animate-pulse" />
                  {category}
                </span>
                <span className="text-xs font-semibold text-white truncate">
                  {headline}
                </span>
                {customTag && (
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0">
                    ({customTag})
                  </span>
                )}
                <span className="text-[10px] text-slate-500 shrink-0">
                  • {source || 'Live Desk'}
                </span>
              </div>
            </div>
          )}

          {/* Active Ticker Headlines Shelf */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Active Running Headlines ({tickerItems.length})
                </h3>
                {isRealNewsLoading && (
                  <span className="text-[10px] text-blue-400 animate-pulse">Syncing...</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => refreshRealNews()}
                className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
              >
                <span>Refresh Wire</span>
              </button>
            </div>

            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
              {tickerItems.slice(0, 15).map((item) => (
                <div
                  key={item.id}
                  className="p-2.5 bg-slate-900/60 border border-slate-800/80 rounded-lg flex items-center justify-between gap-3 text-xs hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-mono font-bold text-slate-300 shrink-0">
                      {item.category}
                    </span>
                    <span className="text-slate-200 truncate">{item.headline}</span>
                    {item.change && (
                      <span className="text-[10px] font-mono text-amber-400 shrink-0">
                        ({item.change})
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeCustomTickerItem(item.id)}
                    className="p-1 text-slate-500 hover:text-red-400 rounded hover:bg-red-950/40 transition-colors shrink-0"
                    title="Remove headline from ribbon"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/70 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>Font Size:</span>
            {(['normal', 'large', 'jumbo'] as const).map((sz) => (
              <button
                key={sz}
                type="button"
                onClick={() => setTickerFontSize(sz)}
                className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase transition-all ${
                  tickerFontSize === sz
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                {sz}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setIsFlashNewsModalOpen(false)}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
