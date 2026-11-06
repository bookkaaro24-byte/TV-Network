'use client';

import React, { useState } from 'react';
import {
  X,
  Film,
  Video,
  HardDrive,
  Radio,
  Check,
  Link as LinkIcon,
  Play,
  Sparkles,
  Upload,
  Search,
} from 'lucide-react';
import { useBroadcast } from '../context/BroadcastContext';
import { extractYouTubeVideoId, getYouTubeThumbnailUrl, VERIFIED_YOUTUBE_FEEDS } from '../utils/youtube';

export interface SourceAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetSourceName: string;
  onSelectSource: (streamUrl: string, title: string, thumbnail?: string) => void;
}

export const SourceAssignmentModal: React.FC<SourceAssignmentModalProps> = ({
  isOpen,
  onClose,
  targetSourceName,
  onSelectSource,
}) => {
  const { vodCatalog, channels, googleAccessToken, signIn, setIsUploadModalOpen } = useBroadcast();

  const [activeTab, setActiveTab] = useState<'vod' | 'youtube' | 'channels' | 'drive' | 'custom'>('vod');
  const [customUrl, setCustomUrl] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [youtubeInput, setYoutubeInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const handleSelect = (url: string, title: string, thumb?: string) => {
    onSelectSource(url, title, thumb);
    onClose();
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customUrl.trim()) return;
    const ytId = extractYouTubeVideoId(customUrl.trim());
    const finalUrl = ytId ? `https://www.youtube.com/watch?v=${ytId}` : customUrl.trim();
    const finalTitle = customTitle.trim() || (ytId ? `YouTube Stream (${ytId})` : 'Custom Media Feed');
    const thumb = ytId ? getYouTubeThumbnailUrl(ytId) : undefined;
    handleSelect(finalUrl, finalTitle, thumb);
  };

  const handleYoutubeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!youtubeInput.trim()) return;
    const ytId = extractYouTubeVideoId(youtubeInput.trim()) || (/^[a-zA-Z0-9_-]{11}$/.test(youtubeInput.trim()) ? youtubeInput.trim() : null);
    if (!ytId) return;
    const finalUrl = `https://www.youtube.com/watch?v=${ytId}`;
    const finalTitle = customTitle.trim() || `YouTube Stream (${ytId})`;
    handleSelect(finalUrl, finalTitle, getYouTubeThumbnailUrl(ytId));
  };

  const filteredVod = vodCatalog.filter((item) =>
    searchQuery ? item.title.toLowerCase().includes(searchQuery.toLowerCase()) || item.category.toLowerCase().includes(searchQuery.toLowerCase()) : true
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Top Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-400">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">Assign Video Stream</h3>
                <span className="text-[10px] font-mono uppercase bg-red-950 text-red-300 border border-red-800 px-2 py-0.5 rounded font-bold">
                  {targetSourceName}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Route any VOD Vault title, YouTube Live broadcast, or Channel to this destination
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-slate-800 bg-slate-950/40 px-4 pt-2 gap-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab('vod')}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'vod'
                ? 'border-blue-500 text-blue-400 bg-blue-500/10 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Film className="w-4 h-4" />
            <span>VOD Vault ({vodCatalog.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('youtube')}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'youtube'
                ? 'border-red-500 text-red-400 bg-red-500/10 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Video className="w-4 h-4 text-red-400" />
            <span>YouTube Live & Streams</span>
          </button>

          <button
            onClick={() => setActiveTab('channels')}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'channels'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Radio className="w-4 h-4 text-emerald-400" />
            <span>Linear Channels (CH 101–104)</span>
          </button>

          <button
            onClick={() => setActiveTab('drive')}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'drive'
                ? 'border-amber-500 text-amber-400 bg-amber-500/10 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <HardDrive className="w-4 h-4 text-amber-400" />
            <span>Google Drive</span>
          </button>

          <button
            onClick={() => setActiveTab('custom')}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'custom'
                ? 'border-purple-500 text-purple-400 bg-purple-500/10 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <LinkIcon className="w-4 h-4 text-purple-400" />
            <span>Direct URL / HLS</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 max-h-[60vh]">
          {/* TAB 1: VOD VAULT */}
          {activeTab === 'vod' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search uploaded videos by title or category..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    setIsUploadModalOpen(true);
                  }}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shrink-0 transition-colors shadow"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload New</span>
                </button>
              </div>

              {filteredVod.length === 0 ? (
                <div className="text-center py-8 text-slate-400 space-y-2 border border-dashed border-slate-800 rounded-xl">
                  <Film className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="text-xs">No videos found in VOD catalog.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredVod.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleSelect(item.streamUrl, item.title, item.thumbnail)}
                      className="flex items-center gap-3 p-2.5 rounded-xl border border-slate-800 bg-slate-950/60 hover:bg-slate-800/80 hover:border-blue-500/80 cursor-pointer transition-all group"
                    >
                      <div className="w-20 h-12 bg-slate-900 rounded-lg overflow-hidden shrink-0 relative border border-slate-800">
                        {item.thumbnail ? (
                          <img src={item.thumbnail} alt={item.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-600">
                            <Film className="w-5 h-5" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/30 group-hover:bg-transparent flex items-center justify-center">
                          <Play className="w-4 h-4 fill-white text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-white truncate group-hover:text-blue-300 transition-colors">
                          {item.title}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1.5 mt-0.5">
                          <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-bold">{item.category}</span>
                          <span>{item.durationMinutes}m</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="px-2 py-1 bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white rounded text-[10px] font-bold border border-blue-500/40 shrink-0 transition-colors"
                      >
                        Assign
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: YOUTUBE STREAMS */}
          {activeTab === 'youtube' && (
            <div className="space-y-4">
              {/* Custom YouTube Input */}
              <form onSubmit={handleYoutubeSubmit} className="space-y-2 bg-slate-950/80 p-3.5 rounded-xl border border-red-500/30">
                <label className="text-xs font-bold text-white flex items-center justify-between">
                  <span>Enter Any YouTube Video or Live Stream URL:</span>
                  <span className="text-[10px] text-slate-400 font-normal">Supports watch, shorts, live, embed, or ID</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={youtubeInput}
                    onChange={(e) => setYoutubeInput(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=... or 11-char ID"
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500 font-mono"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg transition-colors shrink-0 shadow-md flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Assign Feed</span>
                  </button>
                </div>
              </form>

              {/* Verified Featured YouTube Channels */}
              <div className="space-y-2">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Featured Live 24/7 & High-Res Feeds
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {VERIFIED_YOUTUBE_FEEDS.map((feed) => (
                    <div
                      key={feed.id}
                      onClick={() =>
                        handleSelect(
                          `https://www.youtube.com/watch?v=${feed.videoId}`,
                          feed.title,
                          getYouTubeThumbnailUrl(feed.videoId)
                        )
                      }
                      className="p-3 rounded-xl border border-slate-800 bg-slate-950/60 hover:bg-red-950/30 hover:border-red-500/70 cursor-pointer transition-all flex items-center justify-between gap-3 group"
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <img
                          src={getYouTubeThumbnailUrl(feed.videoId)}
                          alt={feed.title}
                          className="w-16 h-10 object-cover rounded border border-slate-800 shrink-0"
                        />
                        <div className="truncate">
                          <div className="text-xs font-bold text-white truncate group-hover:text-red-300 transition-colors">
                            {feed.title}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {feed.category} · {feed.durationMinutes}m
                          </div>
                        </div>
                      </div>
                      <span className="px-2 py-1 bg-red-600/20 text-red-300 group-hover:bg-red-600 group-hover:text-white rounded text-[10px] font-bold border border-red-500/40 shrink-0 transition-colors">
                        Select
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: LINEAR CHANNELS */}
          {activeTab === 'channels' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-400">
                Mirror an active live channel output into this monitor tile or switcher bus:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {channels.map((ch) => {
                  const liveShow =
                    ch.programs?.find((p) => Date.now() >= p.startTime && Date.now() < p.endTime) ||
                    ch.programs?.[0];
                  const url = liveShow?.streamUrl || '/master_broadcast_feed.mp4';

                  return (
                    <div
                      key={ch.channelId}
                      onClick={() => handleSelect(url, `CH ${ch.channelNumber}: ${ch.channelName}`, liveShow?.thumbnail)}
                      className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/60 hover:bg-emerald-950/30 hover:border-emerald-500/70 cursor-pointer transition-all flex items-center justify-between gap-3 group"
                    >
                      <div className="flex items-center gap-3 truncate">
                        <span className="w-8 h-8 rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center justify-center font-mono font-bold text-xs shrink-0">
                          {ch.channelNumber}
                        </span>
                        <div className="truncate">
                          <div className="text-xs font-bold text-white group-hover:text-emerald-300 truncate">
                            {ch.channelName}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono truncate">
                            On Air: {liveShow?.title || 'Live Transmission'}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="px-2.5 py-1 bg-emerald-600/20 text-emerald-300 group-hover:bg-emerald-600 group-hover:text-white rounded text-[10px] font-bold border border-emerald-500/40 shrink-0 transition-colors"
                      >
                        Mirror
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: GOOGLE DRIVE */}
          {activeTab === 'drive' && (
            <div className="space-y-4">
              {!googleAccessToken ? (
                <div className="bg-slate-950 border border-amber-600/40 rounded-xl p-6 text-center space-y-3">
                  <HardDrive className="w-10 h-10 text-amber-400 mx-auto" />
                  <div>
                    <h4 className="text-sm font-bold text-white">Google Drive Integration</h4>
                    <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                      Authorize Google Drive or paste a shareable Google Drive video link to play directly.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => signIn()}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg transition-colors shadow"
                  >
                    Authorize Google Drive
                  </button>
                </div>
              ) : (
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-300">
                  <p>Google Drive is authorized! You can pick any video file directly from the Upload / Drive modal.</p>
                </div>
              )}

              {/* Paste Drive Link */}
              <div className="space-y-2 bg-slate-950 p-3 rounded-xl border border-slate-800">
                <label className="text-xs font-semibold text-slate-300">
                  Or paste a shareable Google Drive Video Link:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                    placeholder="https://drive.google.com/file/d/..."
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (customUrl.trim()) {
                        handleSelect(customUrl.trim(), 'Google Drive Video Stream');
                      }
                    }}
                    className="px-3 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg transition-colors shrink-0"
                  >
                    Assign Drive Video
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: DIRECT URL */}
          {activeTab === 'custom' && (
            <form onSubmit={handleCustomSubmit} className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Stream or Media URL (HLS / MP4 / WebM / YouTube):</label>
                <input
                  type="text"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  placeholder="https://example.com/stream.m3u8 or https://www.youtube.com/watch?v=..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Feed Name / Label:</label>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="e.g. Master Stadium Cam 1"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-colors shadow"
                >
                  Assign Stream to {targetSourceName}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span className="font-mono text-[11px]">Destination: {targetSourceName}</span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors font-medium"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default SourceAssignmentModal;
