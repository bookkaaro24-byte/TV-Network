/**
 * LowerThirdTicker - Continuous Real-Time Broadcast News, Sports & Market Ribbon
 * 
 * Features:
 * - Real live RSS news feed ingestion (BBC World, BBC Sport, BBC Business, Tech/AI)
 * - Large, highly-readable broadcast typography with dynamic font size (A- / A / A+)
 * - Live sports scores (Champions League, Premier League, NBA) & financial tickers
 * - Category filters: ALL WIRE, LIVE SPORTS, BUSINESS & MARKETS, TECH & AI, BREAKING
 * - Marquee speed adjustment & pause-on-hover
 * - One-click live refresh with timestamp and live connection indicator
 */

import React, { useState } from 'react';
import { useBroadcast } from '../context/BroadcastContext';
import {
  Radio,
  EyeOff,
  Eye,
  RefreshCw,
  TrendingUp,
  Trophy,
  Zap,
  Globe,
  SlidersHorizontal,
  Pause,
  Play,
} from 'lucide-react';

export const LowerThirdTicker: React.FC = () => {
  const {
    tickerItems,
    isTickerVisible,
    setIsTickerVisible,
    tickerCategoryFilter,
    setTickerCategoryFilter,
    tickerFontSize,
    setTickerFontSize,
    isRealNewsLoading,
    refreshRealNews,
    realNewsLastUpdated,
    setIsFlashNewsModalOpen,
  } = useBroadcast();

  const [tickerSpeed, setTickerSpeed] = useState<'normal' | 'slow' | 'fast'>('normal');
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [showConfigPanel, setShowConfigPanel] = useState<boolean>(false);

  // Filter items according to active category tab
  const filteredItems = tickerItems.filter((item) => {
    if (tickerCategoryFilter === 'ALL') return true;
    const cat = item.category?.toUpperCase() || '';
    if (tickerCategoryFilter === 'SPORTS') return cat === 'SPORTS';
    if (tickerCategoryFilter === 'BUSINESS') return cat === 'BUSINESS' || cat === 'MARKETS';
    if (tickerCategoryFilter === 'TECH') return cat === 'TECH' || cat === 'AI';
    if (tickerCategoryFilter === 'BREAKING') return cat === 'BREAKING';
    return cat === tickerCategoryFilter;
  });

  // Determine font size CSS class
  const getFontSizeClass = () => {
    switch (tickerFontSize) {
      case 'normal':
        return 'text-sm font-medium';
      case 'jumbo':
        return 'text-lg sm:text-xl font-bold tracking-tight';
      case 'large':
      default:
        return 'text-base sm:text-lg font-semibold tracking-normal';
    }
  };

  // Determine speed animation class
  const getSpeedClass = () => {
    if (isPaused) return '';
    switch (tickerSpeed) {
      case 'slow':
        return 'animate-ticker-slow';
      case 'fast':
        return 'animate-ticker-fast';
      case 'normal':
      default:
        return 'animate-ticker';
    }
  };

  // Category badge styling helper
  const getCategoryBadge = (category: string) => {
    const cat = category.toUpperCase();
    if (cat.includes('SPORT')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-600/30 text-emerald-300 border border-emerald-500/50 text-xs font-bold uppercase tracking-wider">
          <Trophy className="w-3 h-3 text-emerald-400" />
          SPORTS
        </span>
      );
    }
    if (cat.includes('BUSINESS') || cat.includes('MARKET')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-600/30 text-amber-300 border border-amber-500/50 text-xs font-bold uppercase tracking-wider">
          <TrendingUp className="w-3 h-3 text-amber-400" />
          MARKETS
        </span>
      );
    }
    if (cat.includes('TECH') || cat.includes('AI')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-600/30 text-purple-300 border border-purple-500/50 text-xs font-bold uppercase tracking-wider">
          <Zap className="w-3 h-3 text-purple-400" />
          TECH & AI
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-600/30 text-red-300 border border-red-500/50 text-xs font-bold uppercase tracking-wider">
        <Radio className="w-3 h-3 text-red-400 animate-pulse" />
        BREAKING
      </span>
    );
  };

  if (!isTickerVisible) {
    return (
      <div className="bg-slate-950/90 border-t border-slate-800 px-4 py-2.5 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-slate-600"></span>
          <span>Lower-third real news ticker is currently minimized</span>
        </div>
        <button
          onClick={() => setIsTickerVisible(true)}
          className="flex items-center gap-1.5 px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded border border-slate-700 transition-colors font-medium"
        >
          <Eye className="w-3.5 h-3.5 text-blue-400" />
          <span>Show Live News Bar</span>
        </button>
      </div>
    );
  }

  const itemsToLoop = filteredItems.length > 0 ? filteredItems : tickerItems;

  return (
    <div className="relative z-20 bg-gradient-to-r from-slate-950 via-slate-900 to-black border-y sm:border border-slate-700/80 rounded-none sm:rounded-lg shadow-2xl text-slate-100 overflow-hidden">
      {/* Top Utility Ribbon: Category Tabs, Real News Status, Font Size & Speed Adjusters */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 sm:px-4 py-1.5 bg-slate-950/95 border-b border-slate-800/90 text-xs text-slate-400">
        {/* Category Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
          {[
            { id: 'ALL', label: 'ALL WIRE' },
            { id: 'SPORTS', label: 'LIVE SPORTS' },
            { id: 'BUSINESS', label: 'BUSINESS & MARKETS' },
            { id: 'TECH', label: 'TECH & AI' },
            { id: 'BREAKING', label: 'BREAKING NEWS' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setTickerCategoryFilter(cat.id)}
              className={`px-2.5 py-1 rounded transition-all font-semibold text-[11px] sm:text-xs whitespace-nowrap ${
                tickerCategoryFilter === cat.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Real News Sync Status & Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Live Indicator */}
          <div className="hidden md:flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/40 text-[11px] text-emerald-400 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
            <span>LIVE FEED: REAL RSS</span>
          </div>

          {/* Refresh Button */}
          <button
            onClick={() => refreshRealNews()}
            disabled={isRealNewsLoading}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 transition-colors text-[11px]"
            title="Refresh real news from live network sources"
          >
            <RefreshCw className={`w-3 h-3 ${isRealNewsLoading ? 'animate-spin text-blue-400' : ''}`} />
            <span>{isRealNewsLoading ? 'Updating...' : 'Refresh'}</span>
          </button>

          {/* News Flash Speed Controls (Normal / Slow / Fast) */}
          <div className="flex items-center p-0.5 rounded bg-slate-900 border border-slate-800 text-[11px]">
            <span className="text-[10px] text-slate-400 font-mono px-1 hidden sm:inline">SPEED:</span>
            <button
              onClick={() => setTickerSpeed('slow')}
              className={`px-1.5 py-0.5 rounded font-mono ${
                tickerSpeed === 'slow' ? 'bg-amber-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
              title="Crawl speed (Gentle & Slow)"
            >
              CRAWL
            </button>
            <button
              onClick={() => setTickerSpeed('normal')}
              className={`px-1.5 py-0.5 rounded font-mono ${
                tickerSpeed === 'normal' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
              title="Normal speed (Default standard broadcast)"
            >
              NORMAL
            </button>
            <button
              onClick={() => setTickerSpeed('fast')}
              className={`px-1.5 py-0.5 rounded font-mono ${
                tickerSpeed === 'fast' ? 'bg-purple-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
              title="Brisk news flash speed"
            >
              FAST
            </button>
          </div>

          {/* Font Size Adjuster (A- / A / A+) */}
          <div className="flex items-center p-0.5 rounded bg-slate-900 border border-slate-800 text-[11px]">
            <button
              onClick={() => setTickerFontSize('normal')}
              className={`px-1.5 py-0.5 rounded font-mono ${
                tickerFontSize === 'normal' ? 'bg-slate-700 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
              title="Font size: Normal (14px)"
            >
              A-
            </button>
            <button
              onClick={() => setTickerFontSize('large')}
              className={`px-1.5 py-0.5 rounded font-mono ${
                tickerFontSize === 'large' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
              title="Font size: Large (16px) - Recommended"
            >
              A
            </button>
            <button
              onClick={() => setTickerFontSize('jumbo')}
              className={`px-1.5 py-0.5 rounded font-mono ${
                tickerFontSize === 'jumbo' ? 'bg-slate-700 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
              title="Font size: Jumbo (18px) - Maximum Readability"
            >
              A+
            </button>
          </div>

          {/* Quick Add Flash News Button */}
          <button
            onClick={() => setIsFlashNewsModalOpen(true)}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[10px] font-bold transition-all shadow-sm"
            title="Open Flash News Manager to add breaking headlines, scores, and market updates"
          >
            <Zap className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
            <span className="hidden sm:inline">Add News</span>
          </button>

          {/* Pause / Play Toggle */}
          <button
            onClick={() => setIsPaused((prev) => !prev)}
            className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors"
            title={isPaused ? 'Resume scrolling' : 'Pause scrolling'}
          >
            {isPaused ? <Play className="w-3 h-3 text-emerald-400" /> : <Pause className="w-3 h-3" />}
          </button>

          {/* Hide Bar */}
          <button
            onClick={() => setIsTickerVisible(false)}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Minimize ticker"
          >
            <EyeOff className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Primary News Marquee Track (High-visibility, large font, broadcast layout) */}
      <div className="flex items-stretch min-h-[52px] sm:min-h-[58px]">
        {/* Broadcast Anchor Badge */}
        <div className="flex items-center gap-2 bg-gradient-to-r from-red-600 to-red-700 text-white px-4 sm:px-5 py-3 font-black text-xs sm:text-sm tracking-widest uppercase shrink-0 shadow-lg select-none">
          <Globe className="w-4 h-4 animate-spin text-white/90" style={{ animationDuration: '12s' }} />
          <span>APEX WIRE</span>
        </div>

        {/* Continuous Scrolling News Stream */}
        <div className="relative flex-1 overflow-hidden py-3 px-4 flex items-center bg-slate-950/50">
          <div className={`${getSpeedClass()} ${isPaused ? 'flex flex-wrap gap-6' : 'inline-flex items-center gap-10'} whitespace-nowrap`}>
            {/* Duplicate array twice for seamless marquee loop */}
            {[...itemsToLoop, ...itemsToLoop].map((item, index) => (
              <div
                key={`${item.id}-${index}`}
                className="inline-flex items-center gap-3 shrink-0 cursor-default group"
              >
                {/* Category Badge */}
                {getCategoryBadge(item.category)}

                {/* News Headline (Large, vivid, broadcast font) */}
                <span className={`${getFontSizeClass()} text-white group-hover:text-blue-300 transition-colors drop-shadow-sm`}>
                  {item.headline}
                </span>

                {/* Market change or sports score indicator */}
                {item.change && (
                  <span
                    className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded ${
                      item.isPositive
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-red-500/20 text-red-400 border border-red-500/30'
                    }`}
                  >
                    {item.change}
                  </span>
                )}

                {/* Source and timestamp pill */}
                {item.source && (
                  <span className="text-[11px] font-mono text-slate-400 bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800">
                    {item.source} {item.timestamp ? `• ${item.timestamp}` : ''}
                  </span>
                )}

                {/* Broadcast Divider */}
                <span className="text-red-500/60 font-black text-base select-none px-2" aria-hidden="true">
                  ◆
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
