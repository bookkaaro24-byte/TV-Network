/**
 * VODCatalog - On-Demand Broadcast Library & Media Vault
 * 
 * Features:
 * - Searchable catalog categorized by Podcasts, Tech, AI, How-To Business, and Sports.
 * - Instant play trigger seamlessly loading programs into the master video player.
 * - Anti-slop zero-pill typographic metadata hierarchy.
 */

import React, { useState } from 'react';
import { useBroadcast } from '../context/BroadcastContext';
import { BroadcastProgram } from '../types/broadcast';
import { Search, Film, Play, Clock, Sparkles, Filter, CheckCircle2, Upload, Radio, ChevronDown, Trash2, Plus } from 'lucide-react';

export interface VODCatalogProps {
  onSelectProgram?: (program: BroadcastProgram) => void;
}

export const VODCatalog: React.FC<VODCatalogProps> = ({ onSelectProgram }) => {
  const {
    vodCatalog,
    selectVodProgram,
    selectedVodProgram,
    vodSearchQuery,
    setVodSearchQuery,
    vodCategoryFilter,
    setVodCategoryFilter,
    setViewingMode,
    setIsUploadModalOpen,
    channels,
    assignVideoToChannel,
    createCustomChannel,
    removeVodProgram,
    purgeInvalidUploadedVideos,
    deduplicateVodLibrary,
    channelAssignments,
  } = useBroadcast();

  const [notification, setNotification] = useState<string | null>(null);
  const [assignMenuProgramId, setAssignMenuProgramId] = useState<string | null>(null);

  const handleDeleteProgram = async (program: BroadcastProgram, e: React.MouseEvent) => {
    e.stopPropagation();
    await removeVodProgram(program.id);
    setNotification(`🗑️ Successfully deleted "${program.title}" from library.`);
    setTimeout(() => setNotification(null), 4000);
  };

  const handlePurgeBrokenVideos = async () => {
    const res = await purgeInvalidUploadedVideos();
    setNotification(
      res.removedCount > 0
        ? `Cleaned up ${res.removedCount} broken/invalid video links.`
        : 'All video links in vault are verified healthy!'
    );
    setTimeout(() => setNotification(null), 3500);
  };

  const handleDeduplicate = async () => {
    const res = await deduplicateVodLibrary();
    setNotification(
      res.removedCount > 0
        ? `✨ Deduplicated library: Consolidated ${res.removedCount} duplicate uploads!`
        : 'Library is already clean with no duplicate uploads.'
    );
    setTimeout(() => setNotification(null), 3500);
  };

  const categories = [
    { id: 'all', label: 'All Catalog' },
    { id: 'podcast', label: 'Podcasts' },
    { id: 'tech', label: 'Tech & Engineering' },
    { id: 'ai', label: 'AI & Systems' },
    { id: 'business', label: 'How-To Business' },
    { id: 'sports', label: 'Sports & Replays' },
  ];

  const handleProgramClick = (program: BroadcastProgram) => {
    selectVodProgram(program);
    setViewingMode('vod');
    onSelectProgram?.(program);

    setNotification(`Now playing on-demand: "${program.title}"`);
    setTimeout(() => setNotification(null), 3000);

    // Smooth scroll up to player
    const playerEl = document.getElementById('player');
    if (playerEl) {
      playerEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleAssignToChannel = (channelId: string, program: BroadcastProgram, e: React.MouseEvent) => {
    e.stopPropagation();
    assignVideoToChannel(channelId, program, true);
    const ch = channels.find((c) => c.channelId === channelId);
    setNotification(`📡 Now broadcasting live on CH ${ch?.channelNumber || 101} (${ch?.channelName || ''}): "${program.title}"`);
    setAssignMenuProgramId(null);
    setTimeout(() => setNotification(null), 4000);

    const playerEl = document.getElementById('player');
    if (playerEl) {
      playerEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const filteredPrograms = vodCatalog.filter((item) => {
    const matchesCategory =
      vodCategoryFilter === 'all' ||
      item.category.toLowerCase().includes(vodCategoryFilter.toLowerCase()) ||
      item.contentType.toLowerCase() === vodCategoryFilter.toLowerCase() ||
      item.tags?.some((t) => t.toLowerCase() === vodCategoryFilter.toLowerCase());

    const matchesSearch =
      !vodSearchQuery.trim() ||
      item.title.toLowerCase().includes(vodSearchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(vodSearchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(vodSearchQuery.toLowerCase()) ||
      (item.hostOrTeams && item.hostOrTeams.toLowerCase().includes(vodSearchQuery.toLowerCase()));

    return matchesCategory && matchesSearch;
  });

  return (
    <section id="vod-catalog" className="space-y-6">
      {/* Catalog Header & Search Controls */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Film className="w-5 h-5 text-amber-400" />
            <h2 className="text-xl font-bold text-white tracking-tight">
              On-Demand VOD Catalog
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Browse full-length studio keynotes, master sports replays, and executive briefings
          </p>
        </div>

        {/* Search Input Bar & Upload Media Button */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-72">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={vodSearchQuery}
              onChange={(e) => setVodSearchQuery(e.target.value)}
              placeholder="Search by title, speaker, or topic..."
              className="w-full bg-slate-900 border border-slate-800 rounded-md pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <button
            onClick={handlePurgeBrokenVideos}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md transition-all whitespace-nowrap shrink-0"
            title="Purge broken, invalid, or fake video links from vault"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Clean Dead Links</span>
          </button>

          <button
            onClick={handleDeduplicate}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-amber-300 hover:text-white bg-amber-950/40 hover:bg-amber-900/60 border border-amber-600/60 rounded-md transition-all whitespace-nowrap shrink-0"
            title="Consolidate duplicate uploads of the same video"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Deduplicate Library</span>
          </button>

          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-md transition-all shadow-md whitespace-nowrap shrink-0"
            title="Upload and ingest custom video file"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Video</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs (Interactive Segmented Buttons) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setVodCategoryFilter(cat.id)}
            className={`px-3.5 py-1.5 rounded-md font-medium transition-colors whitespace-nowrap shrink-0 ${
              vodCategoryFilter === cat.id
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-900/90 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Notification Toast */}
      {notification && (
        <div className="flex items-center gap-2 p-3 bg-blue-950/80 border border-blue-800 text-blue-200 rounded-lg text-xs animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Empty State */}
      {filteredPrograms.length === 0 && (
        <div className="text-center py-16 bg-slate-900/30 rounded-lg border border-slate-800 space-y-3">
          <Film className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-sm font-bold text-slate-300">No on-demand programs found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Try adjusting your search keywords or switching category filters.
          </p>
          <button
            onClick={() => {
              setVodSearchQuery('');
              setVodCategoryFilter('all');
            }}
            className="text-xs text-blue-400 hover:text-blue-300 font-medium"
          >
            Reset Filters
          </button>
        </div>
      )}

      {/* VOD Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPrograms.map((program) => {
          const isCurrentlyLoaded = selectedVodProgram?.id === program.id;
          const assignedChannel = channels.find(
            (c) =>
              channelAssignments[c.channelId]?.id === program.id ||
              channelAssignments[c.channelId]?.streamUrl === program.streamUrl
          );

          return (
            <article
              key={program.id}
              onClick={() => handleProgramClick(program)}
              className={`group bg-slate-900/50 border rounded-xl overflow-hidden transition-all duration-200 cursor-pointer flex flex-col relative ${
                isCurrentlyLoaded
                  ? 'border-blue-500 ring-1 ring-blue-500/50 shadow-xl'
                  : 'border-slate-800 hover:border-slate-700 hover:shadow-2xl'
              }`}
            >
              {/* Media Container (16:9 Aspect Ratio) */}
              <div className="relative aspect-video w-full overflow-hidden bg-slate-950">
                <img
                  src={program.thumbnail}
                  alt={program.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />

                {/* On-Air Live Channel Badge if Assigned */}
                {assignedChannel && (
                  <div className="absolute top-2.5 left-2.5 bg-red-600/95 text-white px-2 py-0.5 rounded text-[10px] font-mono font-bold flex items-center gap-1 shadow-lg border border-red-400/60 z-10 animate-pulse">
                    <Radio className="w-3 h-3" />
                    <span>ON AIR · CH {assignedChannel.channelNumber}</span>
                  </div>
                )}

                {/* Delete Program Action Button */}
                <button
                  type="button"
                  onClick={(e) => handleDeleteProgram(program, e)}
                  className="absolute top-2.5 right-2.5 bg-slate-950/80 hover:bg-red-600 text-slate-300 hover:text-white p-1.5 rounded-lg border border-slate-700/80 transition-all opacity-70 group-hover:opacity-100 z-10 shadow-lg hover:scale-105"
                  title="Permanently remove video from library"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>

                {/* Duration Badge */}
                <div className="absolute bottom-2.5 right-2.5 bg-slate-950/90 text-white px-2 py-0.5 rounded text-[11px] font-mono flex items-center gap-1 border border-slate-800">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span>{program.durationMinutes} min</span>
                </div>

                {/* Hover Play Button */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-slate-950/40">
                  <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xl transform group-hover:scale-110 transition-transform">
                    <Play className="w-5 h-5 fill-white ml-0.5" />
                  </div>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div className="space-y-1.5">
                  {/* Clean Unboxed Metadata */}
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span className="text-blue-400 font-semibold">{program.category}</span>
                    <span aria-hidden="true">·</span>
                    <span className="capitalize">{program.contentType}</span>
                  </div>

                  <h3 className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors line-clamp-2 leading-snug">
                    {program.title}
                  </h3>

                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {program.description}
                  </p>
                </div>

                {/* Footer Strip with Channel Broadcast Quick Action */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 gap-2">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setAssignMenuProgramId(assignMenuProgramId === program.id ? null : program.id);
                      }}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1 border border-slate-700/80 transition-colors"
                      title="Assign this video to broadcast live on any channel"
                    >
                      <Radio className="w-3 h-3 text-red-500 animate-pulse" />
                      <span>Broadcast Live</span>
                      <ChevronDown className="w-3 h-3 text-slate-400" />
                    </button>

                    {assignMenuProgramId === program.id && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute bottom-full left-0 mb-2 w-56 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-1.5 z-30 animate-fadeIn space-y-1"
                      >
                        <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Select Channel to Stream:
                        </div>
                        {channels.map((ch) => (
                          <button
                            key={ch.channelId}
                            type="button"
                            onClick={(e) => handleAssignToChannel(ch.channelId, program, e)}
                            className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-200 hover:bg-red-600 hover:text-white flex items-center justify-between transition-colors group/item"
                          >
                            <span className="font-mono font-bold">CH {ch.channelNumber}</span>
                            <span className="text-[11px] truncate max-w-[120px] text-slate-400 group-hover/item:text-white">
                              {ch.channelName}
                            </span>
                          </button>
                        ))}
                        <div className="border-t border-slate-800 pt-1 mt-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const channelName = window.prompt('Enter name for new Channel:', `${program.title.slice(0, 20)} TV`);
                              if (channelName && channelName.trim()) {
                                const newId = createCustomChannel(channelName.trim(), undefined, program, true);
                                setNotification(`🚀 Created channel "${channelName.trim()}" live streaming this video!`);
                                setAssignMenuProgramId(null);
                                setTimeout(() => setNotification(null), 4000);
                              }
                            }}
                            className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold text-blue-400 hover:bg-blue-600 hover:text-white flex items-center gap-1.5 transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Create New Channel...</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => handleDeleteProgram(program, e)}
                      className="p-1 rounded hover:bg-red-600/20 text-slate-500 hover:text-red-400 transition-colors"
                      title="Delete video"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-blue-400 font-semibold flex items-center gap-1 whitespace-nowrap group-hover:translate-x-0.5 transition-transform">
                      <span>Watch</span>
                      <Play className="w-3 h-3 fill-blue-400" />
                    </span>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};

export default VODCatalog;
