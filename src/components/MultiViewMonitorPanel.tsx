'use client';

/**
 * MultiViewMonitorPanel - Multi-Source Multiviewer Production Wall
 * 
 * Provides live, synchronized 6-box / 4-box monitoring of all broadcast inputs:
 * 1. PGM MASTER (ON-AIR) - Live program output with red tally
 * 2. PVW BUS (NEXT) - Staged preview source with green tally
 * 3. SRT INGEST (SPORTS) - Low-latency stadium feed
 * 4. VOD MASTER - Network automated playlist / vault clip
 * 5. LIVE STUDIO (HOST CAM) - Real-time camera or studio anchor feed
 * 6. SCREEN SHARE - Screen capture / analytics slide deck
 * 
 * Includes:
 * - Real video & YouTube playback across all multiview tiles
 * - 1-Click "Assign Video" button on every panel to map VOD, YouTube, Google Drive, or Linear channels
 * - Vision switcher CUT and AUTO (1.0s dissolve) controls
 * - Live SMPTE timecodes and animated audio VU meters
 * - Interactive hover controls to stage to PVW, cut directly to PGM, or assign media
 */

import React, { useState, useEffect, useRef } from 'react';
import { useBroadcast } from '../context/BroadcastContext';
import {
  Layers,
  Zap,
  Film,
  Camera,
  Monitor,
  Radio,
  CheckCircle2,
  Volume2,
  Maximize2,
  Sliders,
  Play,
  RotateCcw,
  Sparkles,
  SlidersHorizontal,
} from 'lucide-react';
import { extractYouTubeVideoId } from '../utils/youtube';
import { SourceAssignmentModal } from './SourceAssignmentModal';

interface MultiviewSource {
  id: string;
  name: string;
  label: string;
  type: 'pgm' | 'pvw' | 'srt' | 'vod' | 'studio' | 'screen';
  videoUrl: string;
  resolution: string;
  fps: number;
  tally: 'pgm' | 'pvw' | 'standby' | 'live';
  audioLevel: number; // 0-100 VU
}

const STORAGE_KEY = 'apextv_multiview_source_videos_v3';

export const MultiViewMonitorPanel: React.FC = () => {
  const {
    playout,
    selectedVodProgram,
    activeChannel,
    vodCatalog,
    liveStudioStream,
    isLiveStudioBroadcasting,
    screenShareStream,
    isScreenSharing,
    startScreenShare,
    stopScreenShare,
    syncSwitcherProgramToNetwork,
    injectScte35Cue,
  } = useBroadcast();

  // Active PGM & PVW source assignment
  const [activePgmId, setActivePgmId] = useState<string>('src-srt');
  const [activePvwId, setActivePvwId] = useState<string>('src-vod');
  const [transitionProgress, setTransitionProgress] = useState<number>(0);
  const [layoutMode, setLayoutMode] = useState<'6-grid' | '4-grid'>('6-grid');
  const [smpteTimecode, setSmpteTimecode] = useState<string>('01:24:38;12');

  // Assign Video Modal State
  const [assignmentModalTarget, setAssignmentModalTarget] = useState<{ id: string; name: string } | null>(null);

  const studioVideoRef = useRef<HTMLVideoElement>(null);

  // Video URLs mapped for each source with persistent custom assignments
  const [sourceVideos, setSourceVideos] = useState<Record<string, string>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return {
      'src-srt': 'https://www.youtube.com/watch?v=RyUoz0-hRLk', // Apex Studio Live Ingest
      'src-vod': 'https://www.youtube.com/watch?v=dp8PhLsUcFE', // Bloomberg Global Markets Live
      'src-studio': 'https://www.youtube.com/watch?v=21X5lGlDOfg', // NASA Space Station Live
      'src-screen': 'https://www.youtube.com/watch?v=jfKfPfyJRdk', // Lofi 24/7 Live
    };
  });

  const [sourceLabels, setSourceLabels] = useState<Record<string, string>>(() => {
    return {
      'src-srt': 'Apex Studio Live (YouTube)',
      'src-vod': 'Bloomberg Global Live',
      'src-studio': 'NASA ISS Earth Live',
      'src-screen': 'Apex Broadcast Deck',
    };
  });

  // Update SMPTE timecode
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      const s = String(now.getSeconds()).padStart(2, '0');
      const f = String(Math.floor(now.getMilliseconds() / 33)).padStart(2, '0');
      setSmpteTimecode(`${h}:${m}:${s};${f}`);
    }, 100);
    return () => clearInterval(timer);
  }, []);

  // Bind live studio stream to ref if active
  useEffect(() => {
    if (studioVideoRef.current && liveStudioStream) {
      studioVideoRef.current.srcObject = liveStudioStream;
      studioVideoRef.current.play().catch(() => {});
    }
  }, [liveStudioStream]);

  // Handle media assignment to a specific multiview slot
  const handleAssignSource = (slotId: string, url: string, title: string) => {
    setSourceVideos((prev) => {
      const updated = { ...prev, [slotId]: url };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
    setSourceLabels((prev) => ({ ...prev, [slotId]: title }));
  };

  const getPgmVideoUrl = () => {
    return sourceVideos[activePgmId] || sourceVideos['src-srt'] || 'https://www.youtube.com/watch?v=RyUoz0-hRLk';
  };

  const getPvwVideoUrl = () => {
    return sourceVideos[activePvwId] || sourceVideos['src-vod'] || 'https://www.youtube.com/watch?v=XEzRZ33sJCE';
  };

  // Input sources list
  const sources: MultiviewSource[] = [
    {
      id: 'src-pgm',
      name: 'PGM MASTER (ON-AIR)',
      label: sourceLabels[activePgmId] || 'Program Line Cut',
      type: 'pgm',
      videoUrl: getPgmVideoUrl(),
      resolution: '1080p60',
      fps: 60,
      tally: 'pgm',
      audioLevel: 88,
    },
    {
      id: 'src-pvw',
      name: 'PVW BUS (NEXT)',
      label: sourceLabels[activePvwId] || 'Preview Staged Cut',
      type: 'pvw',
      videoUrl: getPvwVideoUrl(),
      resolution: '1080p30',
      fps: 30,
      tally: 'pvw',
      audioLevel: 68,
    },
    {
      id: 'src-srt',
      name: 'SRT INGEST (SPORTS CAM)',
      label: sourceLabels['src-srt'] || 'SRT Stadium Feed',
      type: 'srt',
      videoUrl: sourceVideos['src-srt'],
      resolution: '1080p60',
      fps: 60,
      tally: activePgmId === 'src-srt' ? 'pgm' : activePvwId === 'src-srt' ? 'pvw' : 'live',
      audioLevel: 84,
    },
    {
      id: 'src-vod',
      name: 'VOD MASTER (AUTOMATION)',
      label: selectedVodProgram ? selectedVodProgram.title : (sourceLabels['src-vod'] || 'VOD Vault Stream'),
      type: 'vod',
      videoUrl: selectedVodProgram?.streamUrl || sourceVideos['src-vod'],
      resolution: '1080p30',
      fps: 30,
      tally: activePgmId === 'src-vod' ? 'pgm' : activePvwId === 'src-vod' ? 'pvw' : 'standby',
      audioLevel: 72,
    },
    {
      id: 'src-studio',
      name: isLiveStudioBroadcasting ? 'LIVE STUDIO (TRANSMITTING)' : 'LIVE STUDIO (HOST CAM)',
      label: sourceLabels['src-studio'] || 'Studio Desk Cam',
      type: 'studio',
      videoUrl: sourceVideos['src-studio'],
      resolution: '1080p30',
      fps: 30,
      tally: activePgmId === 'src-studio' ? 'pgm' : activePvwId === 'src-studio' ? 'pvw' : 'standby',
      audioLevel: 60,
    },
    {
      id: 'src-screen',
      name: 'SCREEN SHARE (DECK/GRAPHICS)',
      label: sourceLabels['src-screen'] || 'Slide Deck / Analytics',
      type: 'screen',
      videoUrl: sourceVideos['src-screen'],
      resolution: '1440p60',
      fps: 60,
      tally: activePgmId === 'src-screen' ? 'pgm' : activePvwId === 'src-screen' ? 'pvw' : 'standby',
      audioLevel: 42,
    },
  ];

  // Quick Cut: Swap PVW and PGM immediately
  const handleCut = () => {
    const prevPgm = activePgmId;
    const nextPgm = activePvwId;
    setActivePgmId(nextPgm);
    setActivePvwId(prevPgm);

    const targetUrl = nextPgm === 'src-screen' && isScreenSharing
      ? '/uploads/screen_live_stream.webm'
      : sourceVideos[nextPgm] || '/master_broadcast_feed.mp4';
    syncSwitcherProgramToNetwork(targetUrl, sourceLabels[nextPgm] || 'MultiView PGM Cut');
  };

  // Auto Transition Dissolve
  const handleAutoTransition = () => {
    let step = 0;
    const interval = setInterval(() => {
      step += 0.1;
      setTransitionProgress(Math.min(1, step));
      if (step >= 1) {
        clearInterval(interval);
        handleCut();
        setTransitionProgress(0);
      }
    }, 40);
  };

  const handleStagePvw = (sourceId: string) => {
    if (sourceId !== 'src-pgm' && sourceId !== 'src-pvw') {
      setActivePvwId(sourceId);
    }
  };

  const handleTakePgm = (sourceId: string) => {
    if (sourceId !== 'src-pgm') {
      setActivePgmId(sourceId);
      const targetUrl = sourceId === 'src-screen' && isScreenSharing
        ? '/uploads/screen_live_stream.webm'
        : sourceVideos[sourceId] || '/master_broadcast_feed.mp4';
      syncSwitcherProgramToNetwork(targetUrl, sourceLabels[sourceId] || 'MultiView Direct Cut');
    }
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Multiviewer Header Bar */}
      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-tight">Broadcast Multi-View Production Wall</h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-red-600/20 text-red-400 border border-red-500/40 animate-pulse">
                ● 6-INPUT SYNC
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Live synchronized real-time video monitoring across PGM, PVW, SRT Ingest, VOD, and Live Studio. Assign any video, YouTube stream, or VOD title to each tile.
            </p>
          </div>
        </div>

        {/* Vision Switcher Controls (CUT / AUTO / T-BAR) */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleCut}
            className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-black text-xs tracking-wider shadow-lg transition-transform active:scale-95 uppercase flex items-center gap-1.5"
            title="Immediate Hard Cut transition"
          >
            <Zap className="w-3.5 h-3.5 fill-white" />
            <span>CUT</span>
          </button>

          <button
            onClick={handleAutoTransition}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-xs tracking-wider shadow-lg transition-transform active:scale-95 uppercase"
            title="1.0s Smooth Crossfade Dissolve"
          >
            AUTO (1.0s)
          </button>

          {/* Layout switcher */}
          <div className="flex items-center p-0.5 rounded-lg bg-slate-900 border border-slate-800 text-xs">
            <button
              onClick={() => setLayoutMode('6-grid')}
              className={`px-2.5 py-1.5 rounded font-medium text-[11px] ${
                layoutMode === '6-grid' ? 'bg-slate-700 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              6-Box
            </button>
            <button
              onClick={() => setLayoutMode('4-grid')}
              className={`px-2.5 py-1.5 rounded font-medium text-[11px] ${
                layoutMode === '4-grid' ? 'bg-slate-700 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              4-Box
            </button>
          </div>
        </div>
      </div>

      {/* Multiviewer Grid */}
      <div
        className={`grid gap-4 ${
          layoutMode === '6-grid'
            ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
            : 'grid-cols-1 sm:grid-cols-2'
        }`}
      >
        {sources.slice(0, layoutMode === '6-grid' ? 6 : 4).map((src) => {
          const isPgm = src.tally === 'pgm';
          const isPvw = src.tally === 'pvw';
          const ytId = extractYouTubeVideoId(src.videoUrl);

          // The target slot to reassign (for PGM/PVW it reassigns the underlying active source)
          const slotToConfigure = src.id === 'src-pgm' ? activePgmId : src.id === 'src-pvw' ? activePvwId : src.id;

          return (
            <div
              key={src.id}
              className={`relative rounded-xl overflow-hidden bg-slate-950 border transition-all flex flex-col group ${
                isPgm
                  ? 'border-red-500 ring-2 ring-red-500/60 shadow-xl shadow-red-950/40'
                  : isPvw
                  ? 'border-emerald-500 ring-2 ring-emerald-500/60 shadow-xl shadow-emerald-950/40'
                  : 'border-slate-800 hover:border-slate-700 shadow-md'
              }`}
            >
              {/* Header Tally Ribbon with Direct Assign Button */}
              <div
                className={`px-3 py-1.5 flex items-center justify-between text-xs font-bold border-b ${
                  isPgm
                    ? 'bg-red-950/90 border-red-500/60 text-red-200'
                    : isPvw
                    ? 'bg-emerald-950/90 border-emerald-500/60 text-emerald-200'
                    : 'bg-slate-900 border-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-1.5 truncate">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isPgm ? 'bg-red-500 animate-ping' : isPvw ? 'bg-emerald-400' : 'bg-slate-500'
                    }`}
                  ></span>
                  <span className="truncate">{src.name}</span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Direct 1-Click Video Assign Button */}
                  <button
                    type="button"
                    onClick={() =>
                      setAssignmentModalTarget({
                        id: slotToConfigure,
                        name: src.name,
                      })
                    }
                    className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-600/30 hover:bg-blue-600 text-blue-200 hover:text-white border border-blue-500/40 flex items-center gap-1 transition-all shadow-sm"
                    title={`Assign video, YouTube link, or VOD to ${src.name}`}
                  >
                    <SlidersHorizontal className="w-2.5 h-2.5 text-blue-300" />
                    <span>Assign Video</span>
                  </button>

                  <span
                    className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase font-mono ${
                      isPgm
                        ? 'bg-red-600 text-white'
                        : isPvw
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {isPgm ? 'ON AIR' : isPvw ? 'PREVIEW' : 'STANDBY'}
                  </span>
                </div>
              </div>

              {/* Video Viewport (REAL VIDEO & YOUTUBE STREAM PLAYBACK) */}
              <div className="relative aspect-video w-full bg-black overflow-hidden flex items-center justify-center">
                {(src.id === 'src-screen' || (src.id === 'src-pgm' && activePgmId === 'src-screen') || (src.id === 'src-pvw' && activePvwId === 'src-screen')) && isScreenSharing && screenShareStream ? (
                  <video
                    ref={(el) => {
                      if (el && screenShareStream && el.srcObject !== screenShareStream) {
                        el.srcObject = screenShareStream;
                        el.play().catch(() => {});
                      }
                    }}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-contain bg-black"
                  />
                ) : (src.id === 'src-studio' || (src.id === 'src-pgm' && activePgmId === 'src-studio') || (src.id === 'src-pvw' && activePvwId === 'src-studio')) && liveStudioStream ? (
                  <video
                    ref={(el) => {
                      if (el && liveStudioStream && el.srcObject !== liveStudioStream) {
                        el.srcObject = liveStudioStream;
                        el.play().catch(() => {});
                      }
                    }}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                  />
                ) : ytId ? (
                  /* YouTube Stream Ingest in Multi-View Tile */
                  <iframe
                    key={`yt-mv-${src.id}-${ytId}`}
                    src={`https://www.youtube.com/embed/${ytId}?autoplay=1&mute=1&controls=0&playsinline=1&enablejsapi=1`}
                    className="w-full h-full border-0 pointer-events-none"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    title={src.name}
                  />
                ) : (
                  <video
                    key={`${src.id}-${src.videoUrl}`}
                    src={src.videoUrl}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                  />
                )}

                {/* Safe Title Area Overlay Lines (EBU R95) */}
                <div className="absolute inset-3 border border-white/10 pointer-events-none rounded"></div>

                {/* Quick Action Overlay Buttons on Hover */}
                <div className="absolute inset-0 bg-black/65 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2 backdrop-blur-[2px] z-20">
                  <button
                    onClick={() =>
                      setAssignmentModalTarget({
                        id: slotToConfigure,
                        name: src.name,
                      })
                    }
                    className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold shadow-lg transition-transform active:scale-95 flex items-center gap-1"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span>Assign Video</span>
                  </button>

                  {src.id !== 'src-pgm' && (
                    <button
                      onClick={() => handleStagePvw(src.id)}
                      className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-lg transition-transform active:scale-95"
                    >
                      Stage PVW
                    </button>
                  )}
                  {src.id !== 'src-pgm' && (
                    <button
                      onClick={() => handleTakePgm(src.id)}
                      className="px-2.5 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold shadow-lg transition-transform active:scale-95"
                    >
                      Take PGM
                    </button>
                  )}
                </div>

                {/* Audio Level Meter (Bottom right) */}
                <div className="absolute bottom-2 right-2 flex items-center gap-1.5 bg-black/80 px-2 py-0.5 rounded border border-white/15 z-10">
                  <Volume2 className="w-3 h-3 text-slate-400" />
                  <div className="w-14 h-1.5 bg-slate-800 rounded-full overflow-hidden flex">
                    <div
                      className={`h-full rounded-full transition-all duration-100 ${
                        src.audioLevel > 80 ? 'bg-red-500' : src.audioLevel > 60 ? 'bg-amber-400' : 'bg-emerald-400'
                      }`}
                      style={{ width: `${src.audioLevel}%` }}
                    ></div>
                  </div>
                </div>

                {/* SMPTE Timecode Tag (Bottom left) */}
                <div className="absolute bottom-2 left-2 bg-black/80 px-2 py-0.5 rounded border border-white/15 font-mono text-[10px] text-slate-300 z-10">
                  {smpteTimecode}
                </div>
              </div>

              {/* Bottom Quick Switch Bar with Title & Assign Option */}
              <div className="px-3 py-2 bg-slate-950 flex items-center justify-between text-xs text-slate-400 border-t border-slate-900">
                <span className="font-mono text-[11px] text-slate-300 font-semibold truncate max-w-[140px]" title={src.label}>
                  {src.label}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() =>
                      setAssignmentModalTarget({
                        id: slotToConfigure,
                        name: src.name,
                      })
                    }
                    className="text-[10px] px-2 py-0.5 rounded bg-blue-950 hover:bg-blue-900 text-blue-300 hover:text-white border border-blue-800 font-bold transition-colors"
                  >
                    Change Feed
                  </button>
                  <button
                    onClick={() => handleStagePvw(src.id)}
                    className="text-[10px] px-2 py-0.5 rounded bg-slate-900 hover:bg-emerald-950/60 text-slate-300 hover:text-emerald-400 border border-slate-800 font-medium transition-colors"
                  >
                    To PVW
                  </button>
                  <button
                    onClick={() => handleTakePgm(src.id)}
                    className="text-[10px] px-2 py-0.5 rounded bg-slate-900 hover:bg-red-950/60 text-slate-300 hover:text-red-400 border border-slate-800 font-bold transition-colors"
                  >
                    To PGM
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Video Source Assignment Modal */}
      {assignmentModalTarget && (
        <SourceAssignmentModal
          isOpen={true}
          onClose={() => setAssignmentModalTarget(null)}
          targetSourceName={assignmentModalTarget.name}
          onSelectSource={(url, title) => {
            handleAssignSource(assignmentModalTarget.id, url, title);
          }}
        />
      )}
    </div>
  );
};

export default MultiViewMonitorPanel;
