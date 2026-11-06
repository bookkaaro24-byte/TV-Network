/**
 * GlobalSearchBar - Instant Search for EPG & VOD Content
 * Provides instantaneous auto-complete search across:
 * - Live EPG Schedule & Channels
 * - On-Demand VOD Catalog
 * - Sports Matches & Teams
 * - Podcasts & Keynotes
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useBroadcast } from '../context/BroadcastContext';
import { BroadcastProgram } from '../types/broadcast';
import {
  Search,
  X,
  Tv,
  Film,
  Trophy,
  Radio,
  Play,
  Calendar,
  Clock,
  ExternalLink,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

interface GlobalSearchBarProps {
  onNavigateToSection?: (sectionId: string) => void;
  className?: string;
}

interface SearchResultItem {
  id: string;
  sourceType: 'epg' | 'vod';
  channelName?: string;
  channelNumber?: number;
  program: BroadcastProgram;
  matchedField: 'title' | 'sports' | 'tags' | 'description' | 'category';
  matchSnippet?: string;
}

export const GlobalSearchBar: React.FC<GlobalSearchBarProps> = ({
  onNavigateToSection,
  className = '',
}) => {
  const {
    channels,
    vodCatalog,
    setViewingMode,
    selectVodProgram,
    setActiveChannelId,
    setVodSearchQuery,
  } = useBroadcast();

  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'epg' | 'vod' | 'sports'>('all');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close popup on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      // Keyboard shortcut: Cmd/Ctrl + K or '/' to focus search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Compute search results across EPG and VOD
  const searchResults = useMemo<SearchResultItem[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const results: SearchResultItem[] = [];
    const seenProgramIds = new Set<string>();

    // 1. Search in EPG Channels
    channels.forEach((ch) => {
      ch.programs.forEach((prog) => {
        if (seenProgramIds.has(`epg-${prog.id}`)) return;

        const titleMatch = prog.title.toLowerCase().includes(q);
        const hostOrTeamsMatch = prog.hostOrTeams?.toLowerCase().includes(q);
        const categoryMatch = prog.category.toLowerCase().includes(q);
        const descMatch = prog.description.toLowerCase().includes(q);
        const tagsMatch = prog.tags?.some((t) => t.toLowerCase().includes(q));

        // Sports specific match
        const sportsMatch =
          prog.sportsData?.league.toLowerCase().includes(q) ||
          prog.sportsData?.teams.home.name.toLowerCase().includes(q) ||
          prog.sportsData?.teams.away.name.toLowerCase().includes(q);

        if (titleMatch || hostOrTeamsMatch || categoryMatch || descMatch || tagsMatch || sportsMatch) {
          seenProgramIds.add(`epg-${prog.id}`);
          let matchedField: SearchResultItem['matchedField'] = 'title';
          if (sportsMatch || hostOrTeamsMatch) matchedField = 'sports';
          else if (categoryMatch) matchedField = 'category';
          else if (tagsMatch) matchedField = 'tags';
          else if (descMatch) matchedField = 'description';

          results.push({
            id: `epg-${ch.channelId}-${prog.id}`,
            sourceType: 'epg',
            channelName: ch.channelName,
            channelNumber: ch.channelNumber,
            program: prog,
            matchedField,
            matchSnippet: prog.hostOrTeams || prog.sportsData?.league || prog.category,
          });
        }
      });
    });

    // 2. Search in VOD Catalog
    vodCatalog.forEach((vod) => {
      const vodKey = `vod-${vod.id}`;
      if (seenProgramIds.has(vodKey)) return;

      const titleMatch = vod.title.toLowerCase().includes(q);
      const hostOrTeamsMatch = vod.hostOrTeams?.toLowerCase().includes(q);
      const categoryMatch = vod.category.toLowerCase().includes(q);
      const descMatch = vod.description.toLowerCase().includes(q);
      const tagsMatch = vod.tags?.some((t) => t.toLowerCase().includes(q));

      const sportsMatch =
        vod.sportsData?.league.toLowerCase().includes(q) ||
        vod.sportsData?.teams.home.name.toLowerCase().includes(q) ||
        vod.sportsData?.teams.away.name.toLowerCase().includes(q);

      if (titleMatch || hostOrTeamsMatch || categoryMatch || descMatch || tagsMatch || sportsMatch) {
        seenProgramIds.add(vodKey);
        let matchedField: SearchResultItem['matchedField'] = 'title';
        if (sportsMatch || hostOrTeamsMatch) matchedField = 'sports';
        else if (categoryMatch) matchedField = 'category';
        else if (tagsMatch) matchedField = 'tags';
        else if (descMatch) matchedField = 'description';

        results.push({
          id: vodKey,
          sourceType: 'vod',
          program: vod,
          matchedField,
          matchSnippet: vod.hostOrTeams || vod.category,
        });
      }
    });

    return results;
  }, [query, channels, vodCatalog]);

  // Filtered by active tab
  const filteredResults = useMemo(() => {
    if (activeFilter === 'all') return searchResults;
    if (activeFilter === 'epg') return searchResults.filter((r) => r.sourceType === 'epg');
    if (activeFilter === 'vod') return searchResults.filter((r) => r.sourceType === 'vod');
    if (activeFilter === 'sports') {
      return searchResults.filter(
        (r) =>
          r.program.contentType === 'sports' ||
          r.program.sportsData ||
          r.program.category.toLowerCase().includes('sport')
      );
    }
    return searchResults;
  }, [searchResults, activeFilter]);

  const handleSelectResult = (item: SearchResultItem) => {
    setIsOpen(false);
    setQuery('');

    if (item.sourceType === 'epg') {
      // Find which channel has this program
      const channel = channels.find((c) =>
        c.programs.some((p) => p.id === item.program.id)
      );
      if (channel) {
        setActiveChannelId(channel.channelId);
      }

      // Check if it's currently live or in the past
      const now = Date.now();
      if (item.program.startTime <= now && item.program.endTime >= now) {
        // Currently playing! Switch to linear stream
        setViewingMode('linear');
        const playerEl = document.getElementById('player');
        playerEl?.scrollIntoView({ behavior: 'smooth' });
        onNavigateToSection?.('player');
      } else if (item.program.endTime < now) {
        // Past program -> watch replay in VOD mode
        selectVodProgram(item.program);
        setViewingMode('vod');
        const playerEl = document.getElementById('player');
        playerEl?.scrollIntoView({ behavior: 'smooth' });
        onNavigateToSection?.('player');
      } else {
        // Upcoming schedule -> scroll to EPG guide so user can see it & set reminder
        const epgEl = document.getElementById('epg');
        epgEl?.scrollIntoView({ behavior: 'smooth' });
        onNavigateToSection?.('epg');
      }
    } else {
      // VOD program
      selectVodProgram(item.program);
      setViewingMode('vod');
      setVodSearchQuery(item.program.title);
      const playerEl = document.getElementById('player');
      playerEl?.scrollIntoView({ behavior: 'smooth' });
      onNavigateToSection?.('player');
    }
  };

  const clearSearch = () => {
    setQuery('');
    inputRef.current?.focus();
  };

  const formatSlotTime = (timestampMs: number): string => {
    const d = new Date(timestampMs);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Search Input Box */}
      <div className="relative flex items-center">
        <div className="absolute left-3 pointer-events-none text-slate-400">
          <Search className="w-4 h-4" />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Search programs, sports, VOD... (⌘K)"
          className="w-full pl-9 pr-16 py-1.5 bg-slate-900/90 hover:bg-slate-900 focus:bg-slate-950 text-xs sm:text-sm text-white placeholder-slate-400 rounded-lg border border-slate-700/80 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all shadow-inner"
        />

        {/* Clear or Keyboard Hint Button */}
        <div className="absolute right-2 flex items-center gap-1">
          {query ? (
            <button
              onClick={clearSearch}
              className="p-1 text-slate-400 hover:text-white rounded transition-colors"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <kbd className="hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono font-medium text-slate-400 bg-slate-800/80 rounded border border-slate-700 select-none">
              ⌘K
            </kbd>
          )}
        </div>
      </div>

      {/* Instant Dropdown Results Panel */}
      {isOpen && (
        <div className="absolute left-0 right-0 sm:left-auto sm:right-0 sm:w-[480px] lg:w-[540px] mt-2 bg-slate-950/95 backdrop-blur-xl border border-slate-800 rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[520px] animate-in fade-in zoom-in-95 duration-150">
          {/* Filter Tabs Header */}
          <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-slate-800/80 bg-slate-900/70">
            <div className="flex items-center gap-1 text-xs">
              <button
                onClick={() => setActiveFilter('all')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  activeFilter === 'all'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                All ({searchResults.length})
              </button>
              <button
                onClick={() => setActiveFilter('epg')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors flex items-center gap-1 ${
                  activeFilter === 'epg'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Calendar className="w-3 h-3 text-red-400" />
                <span>EPG</span>
              </button>
              <button
                onClick={() => setActiveFilter('vod')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors flex items-center gap-1 ${
                  activeFilter === 'vod'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Film className="w-3 h-3 text-amber-400" />
                <span>VOD</span>
              </button>
              <button
                onClick={() => setActiveFilter('sports')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors flex items-center gap-1 ${
                  activeFilter === 'sports'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Trophy className="w-3 h-3 text-emerald-400" />
                <span>Sports</span>
              </button>
            </div>

            <span className="text-[11px] font-mono text-slate-400">
              {filteredResults.length} match{filteredResults.length === 1 ? '' : 'es'}
            </span>
          </div>

          {/* Results List */}
          <div className="overflow-y-auto divide-y divide-slate-800/60 flex-1 p-1">
            {!query.trim() ? (
              <div className="p-5 text-center text-slate-400 space-y-2">
                <Search className="w-7 h-7 mx-auto text-slate-600" />
                <p className="text-xs font-medium text-slate-300">
                  Quick search across live TV schedules, VOD archives, and sports
                </p>
                <p className="text-[11px] text-slate-500">
                  Try typing <span className="text-blue-400 font-mono">"Inter Milan"</span>,{' '}
                  <span className="text-amber-400 font-mono">"AI"</span>,{' '}
                  <span className="text-emerald-400 font-mono">"SaaS"</span>, or{' '}
                  <span className="text-red-400 font-mono">"Grand Prix"</span>
                </p>
              </div>
            ) : filteredResults.length === 0 ? (
              <div className="p-8 text-center text-slate-400 space-y-1.5">
                <p className="text-sm font-semibold text-slate-300">No broadcast results found</p>
                <p className="text-xs text-slate-500">
                  No program or VOD asset matches "{query}". Try checking your spelling or search by team, sport, or host.
                </p>
              </div>
            ) : (
              filteredResults.map((item) => {
                const isLive =
                  item.program.isLive ||
                  (item.program.startTime <= Date.now() && item.program.endTime >= Date.now());

                return (
                  <div
                    key={item.id}
                    onClick={() => handleSelectResult(item)}
                    className="p-2.5 rounded-lg hover:bg-slate-900/90 cursor-pointer transition-all flex items-start gap-3 group"
                  >
                    {/* Thumbnail */}
                    <div className="relative w-20 h-12 rounded overflow-hidden shrink-0 bg-slate-900 border border-slate-800">
                      <img
                        src={item.program.thumbnail}
                        alt={item.program.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                      {isLive && (
                        <div className="absolute top-1 left-1 bg-red-600 text-white font-black text-[8px] uppercase tracking-wider px-1 py-0.2 rounded shadow">
                          LIVE
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <Play className="w-4 h-4 text-white fill-white" />
                      </div>
                    </div>

                    {/* Meta info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        {item.sourceType === 'epg' ? (
                          <span className="text-[10px] font-mono font-bold text-red-400 bg-red-950/60 border border-red-800/60 px-1.5 py-0.5 rounded flex items-center gap-1">
                            <Radio className="w-2.5 h-2.5 animate-pulse" />
                            CH {item.channelNumber || 101}
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-950/60 border border-amber-800/60 px-1.5 py-0.5 rounded flex items-center gap-1">
                            <Film className="w-2.5 h-2.5" />
                            VOD
                          </span>
                        )}

                        <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">
                          {item.program.category}
                        </span>

                        <span className="text-[10px] font-mono text-slate-500 ml-auto flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          {formatSlotTime(item.program.startTime)}
                        </span>
                      </div>

                      <h4 className="text-xs font-semibold text-white group-hover:text-blue-400 transition-colors line-clamp-1">
                        {item.program.title}
                      </h4>

                      <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                        {item.program.hostOrTeams || item.program.description}
                      </p>

                      {/* Sports specific scoreboard snippet if present */}
                      {item.program.sportsData && (
                        <div className="mt-1 flex items-center gap-2 text-[10px] bg-slate-950/80 px-2 py-0.5 rounded border border-slate-800 font-mono text-emerald-400">
                          <Trophy className="w-2.5 h-2.5" />
                          <span>
                            {item.program.sportsData.teams.home.name} vs {item.program.sportsData.teams.away.name}
                          </span>
                          <span className="text-slate-500">·</span>
                          <span className="text-amber-400 font-bold">
                            {item.program.sportsData.score.home} - {item.program.sportsData.score.away}
                          </span>
                        </div>
                      )}
                    </div>

                    <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-blue-400 self-center shrink-0 transition-colors" />
                  </div>
                );
              })
            )}
          </div>

          {/* Footer info bar */}
          <div className="px-3.5 py-2 bg-slate-950 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
            <span>Press <kbd className="font-mono text-slate-400">ESC</kbd> to close</span>
            <span className="text-slate-400">Click result to load immediately in Player</span>
          </div>
        </div>
      )}
    </div>
  );
};
