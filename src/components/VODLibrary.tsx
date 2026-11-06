/**
 * VODLibrary - On-Demand Broadcast Archive
 * Searchable catalog categorizing Podcasts, Tech, AI, How-To Business, and Sports.
 */

import React, { useState } from 'react';
import { useBroadcast } from '../context/BroadcastContext';
import { Search, Film, Play, Clock, Sparkles, Trash2, CheckCircle2 } from 'lucide-react';

export const VODLibrary: React.FC = () => {
  const {
    vodCatalog,
    selectVodProgram,
    selectedVodProgram,
    vodSearchQuery,
    setVodSearchQuery,
    vodCategoryFilter,
    setVodCategoryFilter,
    removeVodProgram,
  } = useBroadcast();

  const [notification, setNotification] = useState<string | null>(null);

  const handleDeleteProgram = async (programId: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to remove "${title}"?`)) {
      await removeVodProgram(programId);
      setNotification(`Removed "${title}" from video library.`);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const categories = ['all', 'AI', 'Sports', 'Business', 'Tech', 'podcast'] as const;

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
    <section id="vod-section" className="space-y-5">
      {/* VOD Header & Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Film className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-bold text-white tracking-tight">
              Apex On-Demand Vault (VOD)
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Full-length master replays, deep architectural podcasts, and boardroom archives
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={vodSearchQuery}
            onChange={(e) => setVodSearchQuery(e.target.value)}
            placeholder="Search shows, hosts, tags..."
            className="w-full bg-slate-900 border border-slate-800 rounded-md pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setVodCategoryFilter(cat)}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors capitalize whitespace-nowrap shrink-0 ${
              vodCategoryFilter === cat
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
            }`}
          >
            {cat === 'all' ? 'All Master Feeds' : cat}
          </button>
        ))}
      </div>

      {/* Notification Toast */}
      {notification && (
        <div className="flex items-center gap-2 p-3 bg-blue-950/80 border border-blue-800 text-blue-200 rounded-lg text-xs animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Catalog Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredPrograms.map((program) => {
          const isSelected = selectedVodProgram?.id === program.id;

          return (
            <div
              key={program.id}
              onClick={() => {
                selectVodProgram(program);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`group bg-slate-900/60 border rounded-lg overflow-hidden transition-all duration-200 cursor-pointer flex flex-col relative ${
                isSelected
                  ? 'border-blue-500 ring-1 ring-blue-500/40'
                  : 'border-slate-800/80 hover:border-slate-700 hover:shadow-xl'
              }`}
            >
              {/* Thumbnail Container */}
              <div className="relative aspect-video w-full overflow-hidden bg-slate-950">
                <img
                  src={program.thumbnail}
                  alt={program.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />

                {/* Duration Badge */}
                <div className="absolute bottom-2 right-2 bg-slate-950/90 text-white px-2 py-0.5 rounded text-[11px] font-mono flex items-center gap-1 border border-slate-800">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span>{program.durationMinutes} min</span>
                </div>

                {/* Delete Program Action Button */}
                <button
                  type="button"
                  onClick={(e) => handleDeleteProgram(program.id, program.title, e)}
                  className="absolute top-2 right-2 bg-slate-950/80 hover:bg-red-600 text-slate-300 hover:text-white p-1.5 rounded-lg border border-slate-700/80 transition-all opacity-0 group-hover:opacity-100 z-10 shadow-lg"
                  title="Remove video from vault"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>

                {/* Play Button Overlay on Hover */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-slate-950/40">
                  <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                    <Play className="w-4 h-4 fill-white ml-0.5" />
                  </div>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div className="space-y-1.5">
                  {/* Clean unboxed metadata with separators */}
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span className="text-blue-400 font-semibold">{program.category}</span>
                    <span aria-hidden="true">·</span>
                    <span className="capitalize">{program.contentType}</span>
                  </div>

                  <h3 className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors line-clamp-2">
                    {program.title}
                  </h3>

                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {program.description}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                  <span className="truncate">{program.hostOrTeams}</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => handleDeleteProgram(program.id, program.title, e)}
                      className="p-1 rounded hover:bg-red-600/20 text-slate-500 hover:text-red-400 transition-colors"
                      title="Delete video"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                    <span className="text-blue-400 font-medium whitespace-nowrap ml-1">
                      Stream Now →
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
