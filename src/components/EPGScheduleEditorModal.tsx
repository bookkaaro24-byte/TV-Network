/**
 * EPGScheduleEditorModal - Electronic Program Guide Settings & Playout Schedule Editor
 * 
 * Allows broadcast operators to:
 * 1. Manually add, edit, and delete program slots in any channel's 24/7 EPG schedule.
 * 2. Assign any YouTube link, uploaded video from the vault, or direct stream to any channel.
 * 3. Schedule programs for future times or broadcast immediately on-air.
 * 4. Manage chronological schedule line-ups per channel with full live synchronization.
 */

import React, { useState, useMemo } from 'react';
import { useBroadcast } from '../context/BroadcastContext';
import { BroadcastProgram, ContentType } from '../types/broadcast';
import { extractYouTubeVideoId, getYouTubeThumbnailUrl } from '../utils/youtube';
import {
  X,
  Plus,
  Trash2,
  Calendar,
  Clock,
  Radio,
  Tv,
  Film,
  Youtube,
  Link as LinkIcon,
  Sparkles,
  Check,
  CheckCircle2,
  AlertCircle,
  Play,
  RotateCcw,
  Sliders,
  Edit2,
} from 'lucide-react';

export interface EPGScheduleEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialChannelId?: string;
}

export const EPGScheduleEditorModal: React.FC<EPGScheduleEditorModalProps> = ({
  isOpen,
  onClose,
  initialChannelId,
}) => {
  const {
    channels,
    activeChannelId,
    setActiveChannelId,
    setViewingMode,
    addProgramToChannelSchedule,
    updateChannelProgram,
    removeProgramFromChannelSchedule,
    assignVideoToChannel,
    vodCatalog,
    channelAssignments,
  } = useBroadcast();

  // Target Channel State
  const [selectedChannelId, setSelectedChannelId] = useState<string>(
    () => initialChannelId || activeChannelId || channels[0]?.channelId || 'apex-101'
  );

  // Active Tab: 'add' | 'list'
  const [activeTab, setActiveTab] = useState<'add' | 'list'>('add');

  // Stream Source Mode: 'youtube' | 'vault' | 'custom'
  const [sourceType, setSourceType] = useState<'youtube' | 'vault' | 'custom'>('youtube');

  // Form Fields
  const [editingProgramId, setEditingProgramId] = useState<string | null>(null);
  const [programTitle, setProgramTitle] = useState<string>('');
  const [youtubeUrl, setYoutubeUrl] = useState<string>('');
  const [selectedVaultVideoId, setSelectedVaultVideoId] = useState<string>('');
  const [customStreamUrl, setCustomStreamUrl] = useState<string>('');
  const [category, setCategory] = useState<string>('AI');
  const [contentType, setContentType] = useState<ContentType>('podcast');
  const [hostOrTeams, setHostOrTeams] = useState<string>('Apex Studio');
  const [description, setDescription] = useState<string>('');
  const [durationMinutes, setDurationMinutes] = useState<number>(30);
  const [scheduleTimeMode, setScheduleTimeMode] = useState<'now' | 'custom'>('now');
  const [customStartTime, setCustomStartTime] = useState<string>(() => {
    const d = new Date();
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  });
  const [broadcastImmediately, setBroadcastImmediately] = useState<boolean>(true);

  // Notifications
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Active Target Channel Object
  const targetChannel = useMemo(() => {
    return (
      channels.find((c) => c.channelId === selectedChannelId) ||
      channels.find((c) => c.channelId.replace('apex-', 'ch-') === selectedChannelId) ||
      channels[0]
    );
  }, [channels, selectedChannelId]);

  // Detected YouTube ID from url
  const detectedYouTubeId = useMemo(() => {
    if (sourceType !== 'youtube') return null;
    return extractYouTubeVideoId(youtubeUrl);
  }, [sourceType, youtubeUrl]);

  // Set message helper
  const showFeedback = (message: string, type: 'success' | 'error' = 'success') => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback(null), 3500);
  };

  // Reset Form
  const resetForm = () => {
    setEditingProgramId(null);
    setProgramTitle('');
    setYoutubeUrl('');
    setSelectedVaultVideoId('');
    setCustomStreamUrl('');
    setCategory('AI');
    setContentType('podcast');
    setHostOrTeams('Apex Studio');
    setDescription('');
    setDurationMinutes(30);
    setScheduleTimeMode('now');
    setBroadcastImmediately(true);
  };

  // Handle Edit existing slot click
  const handleEditProgram = (prog: BroadcastProgram) => {
    setEditingProgramId(prog.id);
    setProgramTitle(prog.title);
    setCategory(prog.category);
    setContentType(prog.contentType || 'podcast');
    setHostOrTeams(prog.hostOrTeams || '');
    setDescription(prog.description || '');
    setDurationMinutes(prog.durationMinutes || 30);

    const ytId = extractYouTubeVideoId(prog.streamUrl);
    if (ytId) {
      setSourceType('youtube');
      setYoutubeUrl(prog.streamUrl);
    } else {
      const vaultMatch = vodCatalog.find((v) => v.streamUrl === prog.streamUrl);
      if (vaultMatch) {
        setSourceType('vault');
        setSelectedVaultVideoId(vaultMatch.id);
      } else {
        setSourceType('custom');
        setCustomStreamUrl(prog.streamUrl);
      }
    }

    const d = new Date(prog.startTime);
    setCustomStartTime(`${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`);
    setScheduleTimeMode('custom');
    setActiveTab('add');
  };

  // Handle Save (Add or Update)
  const handleSaveProgram = (e: React.FormEvent) => {
    e.preventDefault();

    let resolvedStreamUrl = '';
    let resolvedThumbnail = '';

    if (sourceType === 'youtube') {
      const ytId = detectedYouTubeId;
      if (!ytId) {
        showFeedback('Please enter a valid YouTube video URL or ID.', 'error');
        return;
      }
      resolvedStreamUrl = `https://www.youtube.com/watch?v=${ytId}`;
      resolvedThumbnail = getYouTubeThumbnailUrl(ytId);
    } else if (sourceType === 'vault') {
      const vaultItem = vodCatalog.find((v) => v.id === selectedVaultVideoId);
      if (!vaultItem) {
        showFeedback('Please select an uploaded video from your vault.', 'error');
        return;
      }
      resolvedStreamUrl = vaultItem.streamUrl;
      resolvedThumbnail = vaultItem.thumbnail;
    } else {
      if (!customStreamUrl.trim()) {
        showFeedback('Please enter a valid stream URL (.m3u8, .mp4).', 'error');
        return;
      }
      resolvedStreamUrl = customStreamUrl.trim();
      resolvedThumbnail = 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=800&q=80';
    }

    const titleToUse = programTitle.trim() || (sourceType === 'youtube' ? `YouTube Stream (${detectedYouTubeId})` : 'Untitled Broadcast');

    // Calculate timestamps
    let startTimeMs: number;
    if (scheduleTimeMode === 'now') {
      startTimeMs = Date.now();
    } else {
      const [hours, minutes] = customStartTime.split(':').map(Number);
      const d = new Date();
      d.setHours(hours || 0, minutes || 0, 0, 0);
      startTimeMs = d.getTime();
    }
    const endTimeMs = startTimeMs + durationMinutes * 60 * 1000;

    const programPayload: BroadcastProgram = {
      id: editingProgramId || `prog-${Date.now()}`,
      title: titleToUse,
      category,
      contentType,
      hostOrTeams: hostOrTeams.trim() || 'Apex Studio',
      description: description.trim() || `Scheduled broadcast slot for Channel ${targetChannel?.channelNumber || 101}.`,
      streamUrl: resolvedStreamUrl,
      thumbnail: resolvedThumbnail,
      startTime: startTimeMs,
      endTime: endTimeMs,
      durationMinutes,
      tags: ['EPG Scheduled', category, contentType],
    };

    if (editingProgramId) {
      updateChannelProgram(selectedChannelId, editingProgramId, programPayload);
      showFeedback(`Updated program "${titleToUse}" in Channel schedule.`);
    } else {
      addProgramToChannelSchedule(selectedChannelId, programPayload);
      showFeedback(`Added "${titleToUse}" to Channel ${targetChannel?.channelNumber} EPG.`);
    }

    // Broadcast immediately if checked or if scheduleTimeMode is now
    if (broadcastImmediately || scheduleTimeMode === 'now') {
      assignVideoToChannel(selectedChannelId, programPayload, true);
      setActiveChannelId(selectedChannelId);
      setViewingMode('linear');
    }

    resetForm();
    setActiveTab('list');
  };

  // Delete slot from channel
  const handleDeleteSlot = (programId: string, title: string) => {
    if (window.confirm(`Remove "${title}" from Channel ${targetChannel?.channelNumber} schedule?`)) {
      removeProgramFromChannelSchedule(selectedChannelId, programId);
      showFeedback(`Removed "${title}" from schedule.`);
    }
  };

  // Broadcast slot on-air now
  const handleBroadcastSlotNow = (prog: BroadcastProgram) => {
    assignVideoToChannel(selectedChannelId, prog, true);
    setActiveChannelId(selectedChannelId);
    setViewingMode('linear');
    showFeedback(`🔴 Now broadcasting "${prog.title}" LIVE on CH ${targetChannel?.channelNumber}!`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Top Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <span>EPG Schedule Settings & Playout Manager</span>
                <span className="text-[10px] bg-red-950/80 text-red-400 border border-red-800/80 px-2 py-0.5 rounded font-mono font-bold">
                  24/7 BROADCAST
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Manually edit broadcast schedules, assign YouTube links, and schedule uploaded video slots
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Alert Bar */}
        {feedback && (
          <div
            className={`px-4 py-2.5 text-xs flex items-center gap-2 border-b animate-fadeIn ${
              feedback.type === 'success'
                ? 'bg-emerald-950/80 border-emerald-800 text-emerald-200'
                : 'bg-red-950/80 border-red-800 text-red-200'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Channel Selector Ribbon */}
        <div className="bg-slate-950/90 border-b border-slate-800/80 px-4 py-2 flex items-center gap-2 overflow-x-auto text-xs">
          <span className="text-slate-400 font-semibold uppercase tracking-wider text-[11px] shrink-0 mr-1 flex items-center gap-1">
            <Tv className="w-3.5 h-3.5 text-blue-400" />
            <span>Channel:</span>
          </span>
          {channels.map((ch) => {
            const isSelected = ch.channelId === selectedChannelId || ch.channelId.replace('apex-', 'ch-') === selectedChannelId;
            return (
              <button
                key={ch.channelId}
                onClick={() => {
                  setSelectedChannelId(ch.channelId);
                  resetForm();
                }}
                className={`px-3 py-1.5 rounded-lg font-mono font-bold text-xs transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-red-600 text-white shadow-lg'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                }`}
              >
                <span>CH {ch.channelNumber}</span>
                <span className="text-[11px] opacity-80 font-normal">({ch.channelName})</span>
              </button>
            );
          })}
        </div>

        {/* View Mode Tabs: Add Show vs Schedule List */}
        <div className="px-5 pt-3 pb-2 border-b border-slate-800 flex items-center justify-between text-xs bg-slate-900/40">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setActiveTab('add');
                if (!editingProgramId) resetForm();
              }}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-colors ${
                activeTab === 'add'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{editingProgramId ? 'Edit Show Slot' : 'Add Show to Channel'}</span>
            </button>

            <button
              onClick={() => setActiveTab('list')}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-colors ${
                activeTab === 'list'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>
                Schedule Lineup ({targetChannel?.programs?.length || 0} Shows)
              </span>
            </button>
          </div>

          <div className="text-[11px] text-slate-400 font-mono hidden sm:block">
            Target: CH {targetChannel?.channelNumber} · {targetChannel?.channelName}
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-5">
          {/* TAB 1: ADD / EDIT SHOW */}
          {activeTab === 'add' && (
            <form onSubmit={handleSaveProgram} className="space-y-4">
              {/* Stream Source Selector */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  1. Video Stream Source
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setSourceType('youtube')}
                    className={`p-3 rounded-xl border text-left transition-all flex items-start gap-2.5 ${
                      sourceType === 'youtube'
                        ? 'bg-red-950/50 border-red-500 text-white shadow-md'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <Youtube className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-bold text-white">YouTube Stream</div>
                      <div className="text-[10px] text-slate-400">Paste any video or live URL</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSourceType('vault')}
                    className={`p-3 rounded-xl border text-left transition-all flex items-start gap-2.5 ${
                      sourceType === 'vault'
                        ? 'bg-blue-950/50 border-blue-500 text-white shadow-md'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <Film className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-bold text-white">Uploaded Video Vault</div>
                      <div className="text-[10px] text-slate-400">{vodCatalog.length} videos available</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSourceType('custom')}
                    className={`p-3 rounded-xl border text-left transition-all flex items-start gap-2.5 ${
                      sourceType === 'custom'
                        ? 'bg-amber-950/50 border-amber-500 text-white shadow-md'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <LinkIcon className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-bold text-white">Direct HLS / MP4 URL</div>
                      <div className="text-[10px] text-slate-400">Stream manifest link</div>
                    </div>
                  </button>
                </div>

                {/* Sub-inputs based on source */}
                {sourceType === 'youtube' && (
                  <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-300">Enter YouTube Video or Live Link:</span>
                      <span className="text-[11px] text-slate-500 font-mono">Supports watch?v=, youtu.be, shorts, live</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={youtubeUrl}
                        onChange={(e) => {
                          const val = e.target.value;
                          setYoutubeUrl(val);
                          const ytId = extractYouTubeVideoId(val);
                          if (ytId && !programTitle) {
                            setProgramTitle(`YouTube Feature Stream (${ytId})`);
                          }
                        }}
                        placeholder="e.g. https://www.youtube.com/watch?v=dQw4w9WgXcQ or live URL"
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
                      />
                    </div>

                    {detectedYouTubeId && (
                      <div className="flex items-center gap-3 p-2.5 bg-red-950/30 border border-red-800/60 rounded-lg text-xs">
                        <img
                          src={getYouTubeThumbnailUrl(detectedYouTubeId)}
                          alt="Thumbnail preview"
                          className="w-16 h-10 object-cover rounded bg-black shrink-0 border border-red-500/30"
                        />
                        <div className="truncate">
                          <span className="text-emerald-400 font-bold block flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> Valid YouTube Video ID: {detectedYouTubeId}
                          </span>
                          <span className="text-[11px] text-slate-400 truncate">
                            Ready to schedule and broadcast live on Channel {targetChannel?.channelNumber}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {sourceType === 'vault' && (
                  <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2">
                    <label className="block text-xs font-semibold text-slate-300">
                      Select Video from Uploaded Library:
                    </label>
                    <select
                      value={selectedVaultVideoId}
                      onChange={(e) => {
                        const vidId = e.target.value;
                        setSelectedVaultVideoId(vidId);
                        const v = vodCatalog.find((item) => item.id === vidId);
                        if (v) {
                          setProgramTitle(v.title);
                          setCategory(v.category);
                          setContentType(v.contentType || 'podcast');
                          setDescription(v.description);
                          setDurationMinutes(v.durationMinutes);
                          if (v.hostOrTeams) setHostOrTeams(v.hostOrTeams);
                        }
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="">-- Choose an uploaded video --</option>
                      {vodCatalog.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.title} ({v.durationMinutes}m · {v.category})
                        </option>
                      ))}
                    </select>

                    {selectedVaultVideoId && (
                      <div className="text-[11px] text-emerald-400 flex items-center gap-1.5 pt-1">
                        <Check className="w-3.5 h-3.5" />
                        <span>Metadata and duration loaded automatically from vault!</span>
                      </div>
                    )}
                  </div>
                )}

                {sourceType === 'custom' && (
                  <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2">
                    <label className="block text-xs font-semibold text-slate-300">
                      Direct Stream Manifest or Video URL:
                    </label>
                    <input
                      type="text"
                      value={customStreamUrl}
                      onChange={(e) => setCustomStreamUrl(e.target.value)}
                      placeholder="e.g. https://.../master.m3u8 or https://.../video.mp4"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                    />
                  </div>
                )}
              </div>

              {/* Show Details Section */}
              <div className="space-y-3 pt-2">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  2. Program Slot Metadata
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Program / Show Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={programTitle}
                      onChange={(e) => setProgramTitle(e.target.value)}
                      placeholder="e.g. Next-Gen AI Architecture Briefing"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Host, Guest, or Teams
                    </label>
                    <input
                      type="text"
                      value={hostOrTeams}
                      onChange={(e) => setHostOrTeams(e.target.value)}
                      placeholder="e.g. Lead Engineer, Real Madrid vs Bayern"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Category
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="AI">AI & Systems</option>
                      <option value="Tech">Tech & Engineering</option>
                      <option value="Sports">Sports & Replays</option>
                      <option value="Business">How-To Business</option>
                      <option value="podcast">Podcasts</option>
                      <option value="News">Live News & Special</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Duration (Minutes)
                    </label>
                    <input
                      type="number"
                      min={5}
                      max={720}
                      value={durationMinutes}
                      onChange={(e) => setDurationMinutes(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Synopsis / Description
                  </label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Short summary of this broadcast event..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Timing & Immediate Playout Control */}
              <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    3. Schedule Timing
                  </span>
                  <div className="flex items-center gap-2 text-xs">
                    <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                      <input
                        type="radio"
                        name="scheduleTimeMode"
                        checked={scheduleTimeMode === 'now'}
                        onChange={() => setScheduleTimeMode('now')}
                        className="text-blue-600 focus:ring-0"
                      />
                      <span>Now (On-Air)</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 ml-3">
                      <input
                        type="radio"
                        name="scheduleTimeMode"
                        checked={scheduleTimeMode === 'custom'}
                        onChange={() => setScheduleTimeMode('custom')}
                        className="text-blue-600 focus:ring-0"
                      />
                      <span>Specific Time (UTC)</span>
                    </label>
                  </div>
                </div>

                {scheduleTimeMode === 'custom' && (
                  <div className="flex items-center gap-3 pt-1">
                    <Clock className="w-4 h-4 text-blue-400" />
                    <span className="text-xs text-slate-400">Start Time (HH:MM):</span>
                    <input
                      type="time"
                      value={customStartTime}
                      onChange={(e) => setCustomStartTime(e.target.value)}
                      className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono"
                    />
                  </div>
                )}

                <label className="flex items-center gap-2 cursor-pointer pt-1 text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={broadcastImmediately}
                    onChange={(e) => setBroadcastImmediately(e.target.checked)}
                    className="rounded text-red-600 focus:ring-0"
                  />
                  <span className="font-semibold text-white">
                    Broadcast immediately live to Channel {targetChannel?.channelNumber} upon saving
                  </span>
                </label>
              </div>

              {/* Form Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setActiveTab('list');
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-all shadow-lg flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>{editingProgramId ? 'Save Program Changes' : 'Add to Channel Schedule'}</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: CURRENT SCHEDULE LIST & MANAGEMENT */}
          {activeTab === 'list' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>Channel {targetChannel?.channelNumber} EPG Timeline</span>
                    <span className="text-[11px] font-mono text-slate-400">
                      ({targetChannel?.programs?.length || 0} slots configured)
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Live schedule ordered chronologically. Click broadcast to force playout or edit slots.
                  </p>
                </div>

                <button
                  onClick={() => {
                    resetForm();
                    setActiveTab('add');
                  }}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-md"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ New Slot</span>
                </button>
              </div>

              {/* Schedule Slots List */}
              <div className="space-y-2.5">
                {(targetChannel?.programs || []).map((prog, index) => {
                  const isCurrentAssigned =
                    channelAssignments[targetChannel?.channelId]?.id === prog.id ||
                    channelAssignments[targetChannel?.channelId]?.streamUrl === prog.streamUrl;
                  const isYt = Boolean(extractYouTubeVideoId(prog.streamUrl));
                  const startDate = new Date(prog.startTime);
                  const endDate = new Date(prog.endTime);
                  const timeFormatted = `${startDate.getHours().toString().padStart(2, '0')}:${startDate.getMinutes().toString().padStart(2, '0')} - ${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;

                  return (
                    <div
                      key={prog.id}
                      className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                        isCurrentAssigned
                          ? 'bg-slate-900 border-red-500/80 ring-1 ring-red-500/30 shadow-lg'
                          : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Thumbnail */}
                        <div className="relative w-16 h-10 rounded bg-black shrink-0 overflow-hidden border border-slate-800">
                          <img
                            src={prog.thumbnail}
                            alt={prog.title}
                            className="w-full h-full object-cover"
                          />
                          {isYt && (
                            <div className="absolute top-0.5 right-0.5 bg-red-600 text-white p-0.5 rounded text-[8px]">
                              <Youtube className="w-2.5 h-2.5" />
                            </div>
                          )}
                        </div>

                        {/* Title & Metadata */}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-mono text-slate-400 font-bold">
                              {timeFormatted} UTC
                            </span>
                            <span className="text-[10px] text-blue-400 bg-blue-950/80 px-1.5 py-0.2 rounded font-semibold border border-blue-900">
                              {prog.category}
                            </span>
                            {isCurrentAssigned && (
                              <span className="text-[10px] bg-red-600 text-white px-1.5 py-0.2 rounded font-bold uppercase animate-pulse">
                                ON AIR NOW
                              </span>
                            )}
                          </div>
                          <h4 className="text-xs font-bold text-white truncate max-w-md mt-0.5">
                            {prog.title}
                          </h4>
                          <div className="text-[10px] font-mono text-slate-500 truncate max-w-md">
                            Source: {prog.streamUrl}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => handleBroadcastSlotNow(prog)}
                          className="px-2.5 py-1 text-xs font-bold rounded bg-red-600 hover:bg-red-500 text-white flex items-center gap-1 transition-colors shadow-sm"
                          title="Stream this video now on this channel"
                        >
                          <Radio className="w-3 h-3" />
                          <span>Broadcast</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleEditProgram(prog)}
                          className="p-1.5 rounded text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors"
                          title="Edit this program slot"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteSlot(prog.id, prog.title)}
                          className="p-1.5 rounded text-slate-500 hover:text-red-400 bg-slate-800 hover:bg-red-950/40 transition-colors"
                          title="Remove from channel schedule"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {(targetChannel?.programs || []).length === 0 && (
                  <div className="text-center py-12 bg-slate-950/40 rounded-xl border border-slate-800 text-slate-400 text-xs">
                    <Calendar className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <span>No programs currently scheduled for Channel {targetChannel?.channelNumber}.</span>
                    <div className="mt-2">
                      <button
                        onClick={() => {
                          resetForm();
                          setActiveTab('add');
                        }}
                        className="text-blue-400 hover:underline font-bold"
                      >
                        + Add the first program slot now
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EPGScheduleEditorModal;
