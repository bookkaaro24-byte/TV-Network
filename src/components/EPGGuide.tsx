'use client';

import React, { useState, useMemo } from 'react';
import { useBroadcastOptional } from '../context/BroadcastContext';
import { BroadcastProgram } from '../types/broadcast';
import { EPGScheduleEditorModal } from './EPGScheduleEditorModal';
import {
  Tv,
  Film,
  Play,
  PlayCircle,
  Bell,
  BellRing,
  Clock,
  RotateCcw,
  CheckCircle2,
  Calendar,
  Radio,
  Sliders,
  Plus,
  Trash2,
  Edit2,
  LayoutGrid,
  List,
  Heart,
} from 'lucide-react';

export interface Program {
  id: string;
  title: string;
  category: 'sports' | 'business' | 'tech' | 'podcast';
  startTime: string; // ISO string or HH:MM
  endTime: string;
  isLiveNow?: boolean;
}

export interface EPGGuideProps {
  schedule?: Program[];
  activeProgramId?: string;
  onSelectProgram?: (program: Program) => void;
}

export const EPGGuide: React.FC<EPGGuideProps> = ({
  schedule: propSchedule,
  activeProgramId: propActiveProgramId,
  onSelectProgram,
}) => {
  const context = useBroadcastOptional();
  const channels = context?.channels ?? [];
  const activeChannelId = context?.activeChannelId ?? '';
  const setActiveChannelId = context?.setActiveChannelId ?? (() => {});
  const viewingMode = context?.viewingMode ?? 'linear';
  const defaultPlayout = {
    systemTime: Date.now(),
    currentProgram: null,
    nextProgram: null,
    activeStreamUrl: '',
    progressPercent: 0,
    formattedElapsed: '00:00',
    formattedTimeRemaining: '00:00',
    hotSwitch: { isActive: false, feedType: 'vod' as const, latencyMs: 38 },
    triggerHotSwitch: () => {},
  };
  const playout = context?.playout ?? defaultPlayout;
  const setViewingMode = context?.setViewingMode ?? (() => {});
  const selectVodProgram = context?.selectVodProgram ?? (() => {});
  const assignVideoToChannel = context?.assignVideoToChannel ?? (() => {});
  const toggleReminder = context?.toggleReminder ?? (() => {});
  const toggleFavoriteChannel = context?.toggleFavoriteChannel ?? (() => {});
  const hasReminder = context?.hasReminder ?? (() => false);
  const setIsUploadModalOpen = context?.setIsUploadModalOpen ?? (() => {});

  const [selectedProgramDetail, setSelectedProgramDetail] = useState<BroadcastProgram | null>(
    playout.currentProgram
  );
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isScheduleEditorOpen, setIsScheduleEditorOpen] = useState<boolean>(false);
  const [editorTargetChannelId, setEditorTargetChannelId] = useState<string>('apex-101');
  const [epgLayoutMode, setEpgLayoutMode] = useState<'multi_grid' | 'timeline'>('multi_grid');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState<boolean>(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3200);
  };

  const formatSlotTime = (timestampMs: number): string => {
    const d = new Date(timestampMs);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  // If propSchedule is explicitly passed, render the focused schedule list view
  const getCategoryBadge = (category: Program['category']) => {
    switch (category) {
      case 'sports':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/40';
      case 'tech':
        return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40';
      case 'business':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
      default:
        return 'bg-purple-500/20 text-purple-400 border-purple-500/40';
    }
  };

  // Past event replay trigger
  const handleWatchVODReplay = (program: BroadcastProgram) => {
    selectVodProgram(program);
    setViewingMode('vod');
    showToast(`Loading VOD Replay: "${program.title}"`);
    const playerEl = document.getElementById('player');
    if (playerEl) {
      playerEl.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Reminder trigger
  const handleToggleReminder = (program: BroadcastProgram) => {
    toggleReminder(program.id);
    const isNowReminded = !hasReminder(program.id);
    if (isNowReminded) {
      showToast(`Reminder set for "${program.title}" at ${formatSlotTime(program.startTime)} UTC`);
    } else {
      showToast(`Reminder cancelled for "${program.title}"`);
    }
  };

  const getProgramStatus = (program: BroadcastProgram): 'past' | 'current' | 'upcoming' => {
    if (playout.systemTime >= program.startTime && playout.systemTime < program.endTime) {
      return 'current';
    }
    if (program.endTime <= playout.systemTime) {
      return 'past';
    }
    return 'upcoming';
  };

  // If custom prop schedule is provided:
  if (propSchedule && propSchedule.length > 0) {
    const activeId = propActiveProgramId || (propSchedule[0]?.id ?? '');

    return (
      <div className="w-full bg-gray-900 border border-gray-800 rounded-xl p-5 text-white shadow-xl">
        <div className="flex items-center justify-between mb-4 border-b border-gray-800 pb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-red-500" />
            <h2 className="text-lg font-bold tracking-tight">Electronic Program Guide (24/7 EPG)</h2>
          </div>
          <span className="text-xs text-gray-400 font-mono">Timezone: UTC</span>
        </div>

        <div className="space-y-3">
          {propSchedule.map((item) => {
            const isActive = item.id === activeId;
            return (
              <div
                key={item.id}
                onClick={() => onSelectProgram && onSelectProgram(item)}
                className={`flex items-center justify-between p-3.5 rounded-lg border transition-all cursor-pointer ${
                  isActive
                    ? 'bg-red-950/40 border-red-600/60 shadow-lg shadow-red-950/20 ring-1 ring-red-500/30'
                    : 'bg-gray-800/40 border-gray-800 hover:bg-gray-800 hover:border-gray-700'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="text-xs font-mono text-gray-400 w-24 shrink-0">
                    {item.startTime} - {item.endTime}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${getCategoryBadge(
                          item.category
                        )}`}
                      >
                        {item.category}
                      </span>
                      {isActive && (
                        <span className="text-[10px] font-bold uppercase bg-red-600 text-white px-2 py-0.5 rounded animate-pulse">
                          ON AIR
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-semibold text-gray-100">{item.title}</h3>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isActive ? (
                    <button className="flex items-center gap-1 text-xs font-bold bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-md transition-colors">
                      <PlayCircle className="w-4 h-4" />
                      Watching
                    </button>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleReminder(item.id);
                        showToast(`Reminder toggled for ${item.title}`);
                      }}
                      className="flex items-center gap-1 text-xs text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded-md border border-gray-700 transition-colors"
                    >
                      <Bell className="w-3.5 h-3.5" />
                      Remind
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Full Multi-Channel Broadcast Timeline Grid (Default Application View)
  return (
    <section id="epg-guide" className="space-y-5">
      {/* Navigation Header */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <Calendar className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-bold text-white tracking-tight">
              Electronic Program Guide (EPG)
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time broadcast schedule · Timezone: UTC · Master clock synchronized
          </p>
        </div>

        {/* View Switcher Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Layout Mode: Side-by-Side Multi-Channel Grid vs Horizontal Timeline */}
          <div className="flex items-center p-1 bg-slate-900 rounded-lg border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setEpgLayoutMode('multi_grid')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-bold transition-all ${
                epgLayoutMode === 'multi_grid'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Display all channels side-by-side to compare schedules simultaneously"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-cyan-300" />
              <span>Multi-Channel Grid (Apex 101-104)</span>
            </button>

            <button
              type="button"
              onClick={() => setEpgLayoutMode('timeline')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all ${
                epgLayoutMode === 'timeline'
                  ? 'bg-slate-800 text-white shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Display horizontal row timeline"
            >
              <List className="w-3.5 h-3.5" />
              <span>Timeline Rows</span>
            </button>
          </div>

          {/* Filter by Favorites */}
          <button
            type="button"
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${
              showFavoritesOnly
                ? 'bg-rose-950/80 border-rose-500/80 text-rose-300 shadow-sm'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
            }`}
            title="Filter schedule to favorite channels only"
          >
            <Heart className={`w-3.5 h-3.5 ${showFavoritesOnly ? 'fill-rose-500 text-rose-500' : 'text-slate-400'}`} />
            <span>Favorites Only</span>
          </button>

          {/* Viewing Mode: 24/7 Live Channels vs VOD */}
          <div className="hidden lg:flex items-center p-1 bg-slate-900 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => {
                setViewingMode('linear');
                const p = document.getElementById('player');
                if (p) p.scrollIntoView({ behavior: 'smooth' });
              }}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md font-medium transition-all ${
                viewingMode === 'linear'
                  ? 'bg-red-600 text-white shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Tv className="w-3.5 h-3.5" />
              <span>24/7 Live</span>
            </button>

            <button
              onClick={() => {
                setViewingMode('vod');
                const v = document.getElementById('vod');
                if (v) v.scrollIntoView({ behavior: 'smooth' });
              }}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md font-medium transition-all ${
                viewingMode === 'vod'
                  ? 'bg-blue-600 text-white shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              <span>VOD</span>
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg text-xs font-mono text-slate-300">
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            <span>{formatSlotTime(playout.systemTime)} UTC</span>
          </div>

          <button
            onClick={() => {
              setEditorTargetChannelId(activeChannelId || channels[0]?.channelId || 'apex-101');
              setIsScheduleEditorOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-all shadow-md whitespace-nowrap"
            title="Open EPG Schedule Settings & Playout Manager"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Settings & Editor</span>
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="flex items-center gap-2 p-3 bg-blue-950/80 border border-blue-800 text-blue-200 rounded-lg text-xs animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Horizontal Multi-Channel Timeline Grid */}
      <div className="bg-slate-950/90 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
        <div className="divide-y divide-slate-800/80">
          {channels.map((channel) => {
            const isChannelActive = channel.channelId === activeChannelId;

            return (
              <div
                key={channel.channelId}
                className={`flex flex-col lg:flex-row items-stretch transition-colors ${
                  isChannelActive ? 'bg-slate-900/30' : 'hover:bg-slate-900/10'
                }`}
              >
                {/* Channel Identity Column */}
                <div className="w-full lg:w-64 p-4 border-b lg:border-b-0 lg:border-r border-slate-800 shrink-0 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-red-500">
                        CH {channel.channelNumber}
                      </span>
                      {isChannelActive && (
                        <span className="text-[10px] bg-red-950/90 text-red-400 border border-red-800/80 px-1.5 py-0.2 rounded font-bold">
                          ON AIR
                        </span>
                      )}
                    </div>
                    <div className="text-sm font-bold text-white mt-0.5">{channel.channelName}</div>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                      {channel.callSign} · {channel.resolution}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setEditorTargetChannelId(channel.channelId);
                        setIsScheduleEditorOpen(true);
                      }}
                      className="text-[11px] text-blue-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-blue-500/30 px-2 py-1 rounded transition-colors font-medium flex items-center gap-1 shadow-sm"
                      title="Add or edit program schedule slots on this channel"
                    >
                      <Plus className="w-3 h-3 text-blue-400" />
                      <span>Add Show</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsUploadModalOpen(true)}
                      className="text-[11px] text-amber-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-amber-500/30 px-2 py-1 rounded transition-colors font-medium flex items-center gap-1 shadow-sm"
                      title="Assign a video or stream to broadcast on this channel"
                    >
                      <Radio className="w-3 h-3 text-red-400" />
                      <span>Assign</span>
                    </button>
                    {!isChannelActive && (
                      <button
                        onClick={() => {
                          setActiveChannelId(channel.channelId);
                          setViewingMode('linear');
                        }}
                        className="text-xs text-blue-400 hover:text-white bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded transition-colors font-medium"
                      >
                        Tune
                      </button>
                    )}
                  </div>
                </div>

                {/* Horizontal Program Cards Timeline */}
                <div className="flex-1 p-3.5 overflow-x-auto flex items-stretch gap-3.5">
                  {channel.programs.map((program) => {
                    const status = getProgramStatus(program);
                    const isSelected = selectedProgramDetail?.id === program.id;
                    const hasActiveReminder = hasReminder(program.id);

                    return (
                      <div
                        key={program.id}
                        onClick={() => {
                          setSelectedProgramDetail(program);
                          assignVideoToChannel(channel.channelId, program, true);
                          setActiveChannelId(channel.channelId);
                          setViewingMode('linear');
                          showToast(`▶ Tuning to "${program.title}" on CH ${channel.channelNumber}`);
                          const playerEl = document.getElementById('player');
                          if (playerEl) playerEl.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className={`min-w-[270px] max-w-[310px] p-3.5 rounded-lg border transition-all cursor-pointer flex flex-col justify-between ${
                          status === 'current' && isChannelActive
                            ? 'bg-slate-900 border-red-500/80 ring-1 ring-red-500/30 shadow-lg'
                            : isSelected
                            ? 'bg-slate-900 border-blue-500'
                            : 'bg-slate-950/70 border-slate-800/80 hover:border-slate-700'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between text-[11px] mb-2 font-mono">
                            <span className="text-slate-400">
                              {formatSlotTime(program.startTime)} - {formatSlotTime(program.endTime)}
                            </span>

                            {status === 'current' && (
                              <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                LIVE
                              </span>
                            )}
                            {status === 'past' && (
                              <span className="text-[10px] text-slate-500 uppercase">
                                CONCLUDED
                              </span>
                            )}
                            {status === 'upcoming' && (
                              <span className="text-[10px] text-amber-400 uppercase font-semibold">
                                UPCOMING
                              </span>
                            )}
                          </div>

                          <h4 className="text-xs font-bold text-white line-clamp-1 mb-1">
                            {program.title}
                          </h4>

                          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 truncate mb-2">
                            <span>{program.category}</span>
                            <span aria-hidden="true">·</span>
                            <span>{program.durationMinutes}m</span>
                          </div>

                          {status === 'current' && isChannelActive && (
                            <div className="space-y-1 my-2">
                              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                <div
                                  className="bg-red-500 h-full transition-all duration-300"
                                  style={{ width: `${playout.progressPercent}%` }}
                                />
                              </div>
                              <div className="flex justify-between text-[10px] font-mono text-slate-400">
                                <span>{playout.formattedElapsed} elapsed</span>
                                <span>{playout.formattedTimeRemaining} remaining</span>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-1.5 mt-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditorTargetChannelId(channel.channelId);
                              setIsScheduleEditorOpen(true);
                            }}
                            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors shrink-0"
                            title="Edit this schedule slot"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>

                          {status === 'past' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleWatchVODReplay(program);
                              }}
                              className="flex-1 py-1.5 px-2 bg-slate-800 hover:bg-blue-600 hover:text-white text-slate-300 text-[11px] font-semibold rounded flex items-center justify-center gap-1.5 transition-colors"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Watch VOD Replay</span>
                            </button>
                          )}

                          {status === 'upcoming' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleReminder(program);
                              }}
                              className={`flex-1 py-1.5 px-2 text-[11px] font-semibold rounded flex items-center justify-center gap-1.5 transition-colors border ${
                                hasActiveReminder
                                  ? 'bg-amber-950/80 border-amber-600 text-amber-300'
                                  : 'bg-slate-800 border-slate-700/80 hover:bg-slate-700 text-slate-300'
                              }`}
                            >
                              {hasActiveReminder ? (
                                <>
                                  <BellRing className="w-3 h-3 text-amber-400" />
                                  <span>Reminder Set</span>
                                </>
                              ) : (
                                <>
                                  <Bell className="w-3 h-3 text-slate-400" />
                                  <span>Set Reminder</span>
                                </>
                              )}
                            </button>
                          )}

                          {status === 'current' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                assignVideoToChannel(channel.channelId, program, true);
                                setActiveChannelId(channel.channelId);
                                setViewingMode('linear');
                                showToast(`🔴 Broadcasting "${program.title}" Live on CH ${channel.channelNumber}`);
                                const playerEl = document.getElementById('player');
                                if (playerEl) playerEl.scrollIntoView({ behavior: 'smooth' });
                              }}
                              className="flex-1 py-1.5 px-2 bg-red-600 hover:bg-red-500 text-white text-[11px] font-bold rounded flex items-center justify-center gap-1.5 transition-colors shadow-md"
                            >
                              <Play className="w-3 h-3 fill-white" />
                              <span>Watch Live</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Program Synopsis Drawer */}
      {selectedProgramDetail && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row items-start justify-between gap-6 shadow-xl">
          <div className="space-y-2 max-w-3xl">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="text-white font-bold">{selectedProgramDetail.category}</span>
              <span aria-hidden="true">·</span>
              <span>{selectedProgramDetail.hostOrTeams}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono text-slate-300">
                {formatSlotTime(selectedProgramDetail.startTime)} - {formatSlotTime(selectedProgramDetail.endTime)} UTC ({selectedProgramDetail.durationMinutes} min)
              </span>
            </div>

            <h3 className="text-base font-bold text-white">{selectedProgramDetail.title}</h3>

            <p className="text-xs text-slate-300 leading-relaxed">
              {selectedProgramDetail.description}
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-3">
            {getProgramStatus(selectedProgramDetail) === 'past' && (
              <button
                onClick={() => handleWatchVODReplay(selectedProgramDetail)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shadow-lg"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Watch VOD Replay</span>
              </button>
            )}

            {getProgramStatus(selectedProgramDetail) === 'upcoming' && (
              <button
                onClick={() => handleToggleReminder(selectedProgramDetail)}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap border ${
                  hasReminder(selectedProgramDetail.id)
                    ? 'bg-amber-950/80 border-amber-600 text-amber-300'
                    : 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-white'
                }`}
              >
                {hasReminder(selectedProgramDetail.id) ? (
                  <>
                    <BellRing className="w-4 h-4 text-amber-400" />
                    <span>Reminder Active</span>
                  </>
                ) : (
                  <>
                    <Bell className="w-4 h-4 text-slate-400" />
                    <span>Set Reminder</span>
                  </>
                )}
              </button>
            )}

            {getProgramStatus(selectedProgramDetail) === 'current' && (
              <button
                onClick={() => {
                  assignVideoToChannel(activeChannelId, selectedProgramDetail, true);
                  setActiveChannelId(activeChannelId);
                  setViewingMode('linear');
                  showToast(`🔴 Broadcasting "${selectedProgramDetail.title}" Live!`);
                  const playerEl = document.getElementById('player');
                  if (playerEl) playerEl.scrollIntoView({ behavior: 'smooth' });
                }}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg transition-colors whitespace-nowrap shadow-lg"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Tune In Live</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* EPG Schedule Settings & Playout Editor Modal */}
      <EPGScheduleEditorModal
        isOpen={isScheduleEditorOpen}
        onClose={() => setIsScheduleEditorOpen(false)}
        initialChannelId={editorTargetChannelId}
      />
    </section>
  );
};

export default EPGGuide;
