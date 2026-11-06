'use client';

/**
 * ObsSceneSwitcherPanel - Authentic OBS Studio 32 Production Suite
 * 
 * Faithfully mirrors OBS Studio architecture (as depicted in the operator screenshot):
 * 1. Top OBS Menu Bar: File, Edit, View, Docks, Profile, Scene Collection, Tools, Help
 * 2. Interactive "Docks" Menu Dropdown to toggle:
 *    - Scenes Dock, Sources Dock, Audio Mixer Dock, Scene Transitions Dock, Controls Dock,
 *    - Flash News & Ticker Dock, Stats Dock
 * 3. Studio Mode Dual Preview & Program Monitors:
 *    - Left: Preview Scene (Green Tally, Scale to Window, Properties, Filters)
 *    - Center: Transition Deck (Cut, Fade 300ms, Fade to Black, T-Bar Fader)
 *    - Right: Program Scene (Red Tally ON AIR, BookKaaro STUDIO Watermark Logo)
 * 4. Audio Mixer Dock:
 *    - Multi-Channel Stereo Vertical VU Meters (-60dB to 0dB peak meters)
 *    - Desktop Audio [Global], Mic/Aux [Global], Media [Active], Line In
 *    - dB Fader Sliders, Volume Readout (0.0 dB), Mute/Unmute, Headphone Monitor (🎧)
 * 5. Sources Dock with Eye (👁️) and Lock (🔒) Toggles, Add/Delete, and Assign Video
 * 6. Scenes Dock with Add, Remove, and Re-order controls
 * 7. Controls Dock: Start Streaming, Start Recording, Virtual Cam, Studio Mode, Flash News, Settings
 * 8. Bottom Status Bar: Live stream timer, REC timer, CPU 24.1%, 60.00 FPS, 6000 kbps, 0 Dropped
 */

import React, { useState, useEffect, useRef } from 'react';
import { useBroadcast } from '../context/BroadcastContext';
import {
  Layers,
  Zap,
  Sliders,
  Eye,
  EyeOff,
  Volume2,
  VolumeX,
  Play,
  Monitor,
  Camera,
  Film,
  Sparkles,
  Maximize2,
  Tv,
  Radio,
  SlidersHorizontal,
  Lock,
  Unlock,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Settings,
  Headphones,
  Check,
  X,
  RefreshCw,
  ExternalLink,
  Flame,
  Send,
  HelpCircle,
  Video,
  FileVideo,
  Globe,
  Scissors,
  CheckCircle2,
} from 'lucide-react';
import { extractYouTubeVideoId } from '../utils/youtube';
import { SourceAssignmentModal } from './SourceAssignmentModal';

export interface ObsSource {
  id: string;
  name: string;
  type: 'srt_ingest' | 'camera' | 'display' | 'vod_clip' | 'graphic_overlay' | 'audio_input' | 'browser';
  enabled: boolean;
  locked?: boolean;
  streamUrl?: string;
  volume?: number;
  zIndex: number;
  cropOrPip?: 'fullscreen' | 'pip_bottom_right' | 'pip_top_right' | 'split_left' | 'split_right';
}

export interface ObsScene {
  id: string;
  name: string;
  sources: ObsSource[];
  transitionDurationMs: number;
}

export interface AudioChannelStrip {
  id: string;
  name: string;
  badge: 'Global' | 'Active' | 'Aux';
  volumeDb: number; // 0 dB = 100%, -6 dB, -12 dB, -60 dB = mute
  isMuted: boolean;
  isMonitored: boolean;
  peakLeft: number; // 0 to 1
  peakRight: number; // 0 to 1
}

const OBS_SCENES_STORAGE_KEY = 'apextv_obs_scenes_v4';

interface SceneCompositeMonitorProps {
  scene: ObsScene;
  isProgram: boolean;
  screenShareStream?: MediaStream | null;
  isScreenSharing?: boolean;
}

// Memoized Monitor to prevent micro-flickering and unnecessary iframe/video reloads
const SceneCompositeMonitor: React.FC<SceneCompositeMonitorProps> = React.memo(
  ({ scene, isProgram, screenShareStream, isScreenSharing }) => {
    const hasSplitScreen = scene.sources.some(
      (s) => s.cropOrPip === 'split_left' || s.cropOrPip === 'split_right'
    );
    const mainVideoSource =
      scene.sources.find(
        (s) =>
          (s.type === 'srt_ingest' ||
            s.type === 'vod_clip' ||
            s.type === 'display' ||
            s.type === 'camera') &&
          s.cropOrPip === 'fullscreen' &&
          s.enabled
      ) || scene.sources.find((s) => s.streamUrl && s.enabled);

    const pipSource = scene.sources.find(
      (s) =>
        (s.cropOrPip === 'pip_bottom_right' || s.cropOrPip === 'pip_top_right') &&
        s.enabled
    );
    const graphicOverlay = scene.sources.find(
      (s) => s.type === 'graphic_overlay' && s.enabled
    );

    const mainYtId = extractYouTubeVideoId(mainVideoSource?.streamUrl);
    const pipYtId = extractYouTubeVideoId(pipSource?.streamUrl);

    return (
      <div className="relative w-full h-full bg-black overflow-hidden flex items-center justify-center select-none">
        {/* Split Screen mode */}
        {hasSplitScreen ? (
          <div className="w-full h-full grid grid-cols-2 gap-1 bg-slate-900">
            {scene.sources
              .filter(
                (s) =>
                  s.cropOrPip === 'split_left' || s.cropOrPip === 'split_right'
              )
              .map((splitSrc) => {
                const sYt = extractYouTubeVideoId(splitSrc.streamUrl);
                return (
                  <div
                    key={splitSrc.id}
                    className="relative w-full h-full bg-black overflow-hidden"
                  >
                    {sYt ? (
                      <iframe
                        key={`split-yt-${splitSrc.id}-${sYt}`}
                        src={`https://www.youtube.com/embed/${sYt}?autoplay=1&mute=1&controls=0&playsinline=1&enablejsapi=1`}
                        className="w-full h-full border-0 pointer-events-none"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media"
                        title={splitSrc.name}
                      />
                    ) : (
                      <video
                        key={`split-vid-${splitSrc.id}-${splitSrc.streamUrl}`}
                        src={splitSrc.streamUrl || 'https://www.youtube.com/watch?v=dp8PhLsUcFE'}
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="w-full h-full object-cover"
                      />
                    )}
                    <div className="absolute top-2 left-2 bg-black/80 text-[10px] font-bold px-2 py-0.5 rounded text-white font-mono">
                      {splitSrc.name}
                    </div>
                  </div>
                );
              })}
          </div>
        ) : (
          /* Single Main Source Background */
          <div className="w-full h-full flex items-center justify-center">
            {mainVideoSource?.type === 'display' && isScreenSharing && screenShareStream ? (
              <video
                key="main-screenshare-video"
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
            ) : mainYtId ? (
              <iframe
                key={`main-yt-${mainVideoSource?.id}-${mainYtId}`}
                src={`https://www.youtube.com/embed/${mainYtId}?autoplay=1&mute=1&controls=0&playsinline=1&enablejsapi=1`}
                className="w-full h-full border-0 pointer-events-none"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media"
                title={mainVideoSource?.name || 'Main Source'}
              />
            ) : mainVideoSource?.streamUrl ? (
              <video
                key={`main-vid-${mainVideoSource?.id}-${mainVideoSource.streamUrl}`}
                src={mainVideoSource.streamUrl}
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-center p-4">
                <Film className="w-8 h-8 text-slate-700 mx-auto mb-2 animate-pulse" />
                <span className="text-xs font-mono text-slate-500">
                  No Video Ingest Assigned
                </span>
              </div>
            )}
          </div>
        )}

        {/* Webcam / Facecam PiP */}
        {pipSource && (
          <div
            className={`absolute z-20 w-32 sm:w-44 aspect-video rounded-lg overflow-hidden border-2 shadow-2xl bg-black ${
              pipSource.cropOrPip === 'pip_top_right'
                ? 'top-3 right-3'
                : 'bottom-3 right-3'
            } ${
              isProgram
                ? 'border-red-500 ring-2 ring-red-500/40'
                : 'border-emerald-400 ring-2 ring-emerald-400/40'
            }`}
          >
            {pipYtId ? (
              <iframe
                key={`pip-yt-${pipSource.id}-${pipYtId}`}
                src={`https://www.youtube.com/embed/${pipYtId}?autoplay=1&mute=1&controls=0&playsinline=1&enablejsapi=1`}
                className="w-full h-full border-0 pointer-events-none"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media"
                title={pipSource.name}
              />
            ) : (
              <video
                key={`pip-vid-${pipSource.id}-${pipSource.streamUrl}`}
                src={
                  pipSource.streamUrl ||
                  'https://www.youtube.com/watch?v=dp8PhLsUcFE'
                }
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-cover"
              />
            )}
            <div className="absolute bottom-1 left-1 bg-black/80 text-[8px] font-bold px-1.5 py-0.2 rounded text-white font-mono truncate max-w-[120px]">
              {pipSource.name}
            </div>
          </div>
        )}

        {/* Lower-Third Graphic Bug Overlay */}
        {graphicOverlay && (
          <div className="absolute bottom-3 left-3 right-3 z-10 pointer-events-none">
            <div className="bg-gradient-to-r from-red-950/90 via-slate-950/90 to-transparent border-l-4 border-red-500 px-3 py-1.5 rounded-r max-w-sm shadow-xl backdrop-blur-sm">
              <div className="flex items-center gap-1.5">
                <span className="bg-red-600 text-white font-black text-[9px] px-1.5 py-0.2 rounded uppercase">
                  {isProgram ? 'LIVE ON AIR' : 'STAGED NEXT'}
                </span>
                <span className="text-[11px] font-bold text-white truncate">
                  {scene.name}
                </span>
              </div>
              <p className="text-[9px] text-slate-300 font-mono mt-0.5">
                BookKaaro TV Playout · 1080p60 Ingest
              </p>
            </div>
          </div>
        )}

        {/* BookKaaro STUDIO Watermark Logo */}
        <div className="absolute top-3 right-3 z-30 pointer-events-none select-none">
          <div className="bg-white/90 rounded-md px-2 py-1 shadow-lg flex items-center gap-1.5 border border-slate-300">
            <div className="w-4 h-4 rounded bg-emerald-600 flex items-center justify-center">
              <Sparkles className="w-2.5 h-2.5 text-white" />
            </div>
            <div className="text-slate-950 font-black text-[10px] leading-tight tracking-tight">
              BookKaaro <span className="text-emerald-700 font-bold text-[8px] uppercase">STUDIO</span>
            </div>
          </div>
        </div>
      </div>
    );
  }
);
SceneCompositeMonitor.displayName = 'SceneCompositeMonitor';

// Dedicated Audio Mixer Dock with isolated VU meter tick to prevent parent re-renders
const AudioMixerDock: React.FC = React.memo(() => {
  const [audioChannels, setAudioChannels] = useState<AudioChannelStrip[]>([
    {
      id: 'desktop-audio',
      name: 'Desktop Audio',
      badge: 'Global',
      volumeDb: 0.0,
      isMuted: false,
      isMonitored: true,
      peakLeft: 0.72,
      peakRight: 0.68,
    },
    {
      id: 'mic-aux',
      name: 'Mic/Aux',
      badge: 'Global',
      volumeDb: 0.0,
      isMuted: false,
      isMonitored: false,
      peakLeft: 0.58,
      peakRight: 0.61,
    },
    {
      id: 'media-audio',
      name: 'Media',
      badge: 'Active',
      volumeDb: 0.0,
      isMuted: false,
      isMonitored: true,
      peakLeft: 0.81,
      peakRight: 0.79,
    },
    {
      id: 'line-in',
      name: 'Line In / SRT',
      badge: 'Aux',
      volumeDb: -3.5,
      isMuted: false,
      isMonitored: false,
      peakLeft: 0.45,
      peakRight: 0.42,
    },
  ]);

  // Animated Stereo VU Peak Meters Simulator isolated to this subcomponent
  useEffect(() => {
    const interval = setInterval(() => {
      setAudioChannels((prev) =>
        prev.map((ch) => {
          if (ch.isMuted) return { ...ch, peakLeft: 0, peakRight: 0 };
          const base = ch.volumeDb < -40 ? 0.05 : 0.65;
          const jitterL = Math.max(0.1, Math.min(0.96, base + (Math.random() - 0.5) * 0.28));
          const jitterR = Math.max(0.1, Math.min(0.96, base + (Math.random() - 0.5) * 0.28));
          return { ...ch, peakLeft: jitterL, peakRight: jitterR };
        })
      );
    }, 120);

    return () => clearInterval(interval);
  }, []);

  const handleToggleMute = (channelId: string) => {
    setAudioChannels((prev) =>
      prev.map((c) => (c.id === channelId ? { ...c, isMuted: !c.isMuted } : c))
    );
  };

  const handleToggleMonitor = (channelId: string) => {
    setAudioChannels((prev) =>
      prev.map((c) => (c.id === channelId ? { ...c, isMonitored: !c.isMonitored } : c))
    );
  };

  return (
    <div className="lg:col-span-4 bg-[#1f2633] border border-[#2d3748] rounded-lg p-2.5 flex flex-col justify-between shadow-md">
      <div>
        <div className="flex items-center justify-between pb-1.5 border-b border-slate-700 text-xs font-bold text-slate-200">
          <span>Audio Mixer</span>
          <span className="text-[10px] text-slate-400 font-mono">dB Faders · Stereo Peak</span>
        </div>

        {/* Multi-Channel Vertical VU Meter Strips */}
        <div className="mt-2 grid grid-cols-4 gap-2">
          {audioChannels.map((ch) => (
            <div
              key={ch.id}
              className="bg-[#171c26] border border-[#2a3444] rounded p-1.5 flex flex-col items-center justify-between text-center"
            >
              {/* Header: Badge & Name */}
              <div className="w-full mb-1">
                <span
                  className={`text-[8px] font-bold uppercase px-1 py-0.2 rounded block truncate ${
                    ch.badge === 'Active'
                      ? 'bg-blue-600/30 text-blue-300'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {ch.badge}
                </span>
                <span className="text-[10px] font-bold text-slate-200 block truncate mt-0.5" title={ch.name}>
                  {ch.name}
                </span>
                <span className="text-[9px] font-mono text-slate-400 block">
                  {ch.volumeDb.toFixed(1)} dB
                </span>
              </div>

              {/* Stereo Vertical VU Meter Bar (Green to Yellow to Red) */}
              <div className="flex items-center justify-center gap-1 my-1.5 h-28 w-full">
                {/* Left VU */}
                <div className="w-2.5 h-full bg-[#0d1017] rounded-sm relative overflow-hidden flex flex-col justify-end p-0.5">
                  <div
                    className="w-full rounded-sm transition-all duration-100 bg-gradient-to-t from-emerald-500 via-yellow-400 to-red-500"
                    style={{ height: `${Math.round(ch.peakLeft * 100)}%` }}
                  />
                </div>
                {/* Right VU */}
                <div className="w-2.5 h-full bg-[#0d1017] rounded-sm relative overflow-hidden flex flex-col justify-end p-0.5">
                  <div
                    className="w-full rounded-sm transition-all duration-100 bg-gradient-to-t from-emerald-500 via-yellow-400 to-red-500"
                    style={{ height: `${Math.round(ch.peakRight * 100)}%` }}
                  />
                </div>

                {/* Decibel Reference Marks */}
                <div className="text-[7px] font-mono text-slate-500 flex flex-col justify-between h-full select-none pl-0.5">
                  <span>0</span>
                  <span>-6</span>
                  <span>-12</span>
                  <span>-24</span>
                  <span>-36</span>
                  <span>-60</span>
                </div>
              </div>

              {/* Mute & Headphone Monitor Buttons */}
              <div className="flex items-center justify-center gap-1.5 w-full pt-1 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => handleToggleMute(ch.id)}
                  className={`p-1 rounded text-xs transition-colors ${
                    ch.isMuted
                      ? 'bg-red-600/30 text-red-400'
                      : 'hover:bg-slate-700 text-slate-300'
                  }`}
                  title={ch.isMuted ? 'Unmute' : 'Mute'}
                >
                  {ch.isMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleMonitor(ch.id)}
                  className={`p-1 rounded text-xs transition-colors ${
                    ch.isMonitored
                      ? 'bg-emerald-600/30 text-emerald-400'
                      : 'hover:bg-slate-700 text-slate-500'
                  }`}
                  title={ch.isMonitored ? 'Disable Monitor' : 'Enable Monitor'}
                >
                  <Headphones className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Mixer Bottom Bar */}
      <div className="pt-2 border-t border-slate-700/80 flex items-center justify-between text-[11px] text-slate-400">
        <span>0 hidden</span>
        <button
          type="button"
          className="hover:text-white flex items-center gap-1 transition-colors"
        >
          <span>Options</span>
          <ChevronDown className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
});
AudioMixerDock.displayName = 'AudioMixerDock';

export const ObsSceneSwitcherPanel: React.FC = () => {
  const {
    playout,
    selectedVodProgram,
    activeChannel,
    liveStudioStream,
    isLiveStudioBroadcasting,
    addCustomTickerItem,
    isTickerVisible,
    setIsTickerVisible,
    setIsFlashNewsModalOpen,
    youtubeStreamKey,
    screenShareStream,
    isScreenSharing,
    startScreenShare,
    stopScreenShare,
    syncSwitcherProgramToNetwork,
    injectScte35Cue,
  } = useBroadcast();

  // Top Menu States
  const [activeMenuOpen, setActiveMenuOpen] = useState<string | null>(null);

  // Docks Visibility States (from Docks menu dropdown)
  const [visibleDocks, setVisibleDocks] = useState<{
    scenes: boolean;
    sources: boolean;
    audioMixer: boolean;
    transitions: boolean;
    controls: boolean;
    flashNews: boolean;
    stats: boolean;
  }>({
    scenes: true,
    sources: true,
    audioMixer: true,
    transitions: true,
    controls: true,
    flashNews: false,
    stats: false,
  });

  // OBS Studio Mode State
  const [isStudioMode, setIsStudioMode] = useState<boolean>(true);
  const [isStreaming, setIsStreaming] = useState<boolean>(isLiveStudioBroadcasting);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isVirtualCam, setIsVirtualCam] = useState<boolean>(false);
  const [streamUptimeSec, setStreamUptimeSec] = useState<number>(1458); // 24m 18s
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>('src-1-stream');

  // Scene definitions with verified YouTube and VOD sources
  const [scenes, setScenes] = useState<ObsScene[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(OBS_SCENES_STORAGE_KEY);
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return [
      {
        id: 'scene-1',
        name: 'Scene',
        transitionDurationMs: 300,
        sources: [
          {
            id: 'src-1-stream',
            name: 'Media',
            type: 'vod_clip',
            enabled: true,
            locked: false,
            streamUrl: 'https://www.youtube.com/watch?v=dp8PhLsUcFE', // Bloomberg Global Markets Live
            zIndex: 1,
            cropOrPip: 'fullscreen',
            volume: 100,
          },
          {
            id: 'src-1-cam',
            name: 'Window Capture',
            type: 'camera',
            enabled: true,
            locked: false,
            streamUrl: 'https://www.youtube.com/watch?v=dp8PhLsUcFE', // Bloomberg Global Markets Live
            zIndex: 2,
            cropOrPip: 'pip_bottom_right',
            volume: 90,
          },
          {
            id: 'src-1-browser',
            name: 'Browser',
            type: 'browser',
            enabled: true,
            locked: true,
            streamUrl: 'https://www.youtube.com/watch?v=jfKfPfyJRdk',
            zIndex: 3,
            cropOrPip: 'fullscreen',
          },
          {
            id: 'src-1-display',
            name: 'Display Capture',
            type: 'display',
            enabled: false,
            locked: false,
            streamUrl: 'https://www.youtube.com/watch?v=21X5lGlDOfg',
            zIndex: 0,
            cropOrPip: 'fullscreen',
          },
        ],
      },
      {
        id: 'scene-2',
        name: 'Scene 2',
        transitionDurationMs: 300,
        sources: [
          {
            id: 'src-2-screen',
            name: 'Display Capture (1080p)',
            type: 'display',
            enabled: true,
            locked: true,
            streamUrl: 'https://www.youtube.com/watch?v=21X5lGlDOfg', // NASA ISS Live
            zIndex: 1,
            cropOrPip: 'fullscreen',
          },
          {
            id: 'src-2-cam',
            name: 'Facecam PiP (Top Right)',
            type: 'camera',
            enabled: true,
            locked: false,
            streamUrl: 'https://www.youtube.com/watch?v=dp8PhLsUcFE',
            zIndex: 2,
            cropOrPip: 'pip_top_right',
            volume: 85,
          },
        ],
      },
      {
        id: 'scene-3',
        name: 'Sports Stadium Live',
        transitionDurationMs: 500,
        sources: [
          {
            id: 'src-3-srt',
            name: 'SRT Sports Main Feed',
            type: 'srt_ingest',
            enabled: true,
            locked: true,
            streamUrl: 'https://test-streams.mux.dev/test_001/stream.m3u8',
            zIndex: 1,
            cropOrPip: 'fullscreen',
            volume: 100,
          },
          {
            id: 'src-3-lower',
            name: 'Match Scoreboard Overlay',
            type: 'graphic_overlay',
            enabled: true,
            locked: true,
            zIndex: 2,
            cropOrPip: 'fullscreen',
          },
        ],
      },
      {
        id: 'scene-4',
        name: '2-Up Host & Guest Split',
        transitionDurationMs: 300,
        sources: [
          {
            id: 'src-4-cam1',
            name: 'Anchor Desk (Left)',
            type: 'camera',
            enabled: true,
            locked: false,
            streamUrl: 'https://www.youtube.com/watch?v=dp8PhLsUcFE',
            zIndex: 1,
            cropOrPip: 'split_left',
            volume: 90,
          },
          {
            id: 'src-4-cam2',
            name: 'Remote Guest (Right)',
            type: 'camera',
            enabled: true,
            locked: false,
            streamUrl: 'https://www.youtube.com/watch?v=jfKfPfyJRdk',
            zIndex: 2,
            cropOrPip: 'split_right',
            volume: 90,
          },
        ],
      },
    ];
  });

  // Switcher Bus States
  const [activeProgramSceneId, setActiveProgramSceneId] = useState<string>('scene-1');
  const [activePreviewSceneId, setActivePreviewSceneId] = useState<string>('scene-2');
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);
  const [tbarProgress, setTbarProgress] = useState<number>(0);
  const [transitionType, setTransitionType] = useState<'Fade' | 'Cut' | 'Slide' | 'Stinger'>('Fade');
  const [transitionDuration, setTransitionDuration] = useState<number>(300);

  // Inline Quick Flash News in Dock
  const [quickNewsHeadline, setQuickNewsHeadline] = useState<string>('');
  const [quickNewsCategory, setQuickNewsCategory] = useState<string>('BREAKING');
  const [quickNewsSuccess, setQuickNewsSuccess] = useState<boolean>(false);

  // Assign Video Modal State
  const [assignmentModalTarget, setAssignmentModalTarget] = useState<{
    sceneId: string;
    sourceId: string;
    targetName: string;
  } | null>(null);

  // Save scenes to localStorage
  const saveScenes = (updatedScenes: ObsScene[]) => {
    setScenes(updatedScenes);
    try {
      localStorage.setItem(OBS_SCENES_STORAGE_KEY, JSON.stringify(updatedScenes));
    } catch {}
  };

  const programScene = scenes.find((s) => s.id === activeProgramSceneId) || scenes[0];
  const previewScene = scenes.find((s) => s.id === activePreviewSceneId) || scenes[1] || scenes[0];

  // Stream uptime timer
  useEffect(() => {
    if (!isStreaming) return;
    const t = setInterval(() => setStreamUptimeSec((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [isStreaming]);

  // CUT transition: Program becomes Preview, Preview becomes Program
  const handleCut = () => {
    const prevPgm = activeProgramSceneId;
    const nextPgm = activePreviewSceneId;
    setActiveProgramSceneId(nextPgm);
    setActivePreviewSceneId(prevPgm);
    setTbarProgress(0);

    // Synchronize directly with Main TV Network & YouTube Live stream!
    const targetScene = scenes.find((s) => s.id === nextPgm);
    if (targetScene) {
      const primarySource = targetScene.sources.find((s) => s.enabled);
      const isDisplay = targetScene.sources.some((s) => s.type === 'display' && s.enabled);
      const targetUrl = isDisplay && isScreenSharing
        ? '/uploads/screen_live_stream.webm'
        : primarySource?.streamUrl || '/master_broadcast_feed.mp4';
      syncSwitcherProgramToNetwork(targetUrl, targetScene.name);
    }
  };

  // Fade transition with duration
  const handleFadeTransition = (durationMs: number = transitionDuration) => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    let step = 0;
    const intervalTime = Math.max(16, durationMs / 20);
    const stepIncrement = 1 / (durationMs / intervalTime);

    const interval = setInterval(() => {
      step += stepIncrement;
      setTbarProgress(Math.min(1, step));
      if (step >= 1) {
        clearInterval(interval);
        handleCut();
        setIsTransitioning(false);
        setTbarProgress(0);
      }
    }, intervalTime);
  };

  // Fade to black transition
  const handleFadeToBlack = () => {
    handleFadeTransition(300);
  };

  // Toggle Source Enabled
  const toggleSourceEnabled = (sceneId: string, sourceId: string) => {
    const updated = scenes.map((sc) => {
      if (sc.id !== sceneId) return sc;
      return {
        ...sc,
        sources: sc.sources.map((src) => {
          if (src.id !== sourceId) return src;
          return { ...src, enabled: !src.enabled };
        }),
      };
    });
    saveScenes(updated);
  };

  // Toggle Source Locked
  const toggleSourceLocked = (sceneId: string, sourceId: string) => {
    const updated = scenes.map((sc) => {
      if (sc.id !== sceneId) return sc;
      return {
        ...sc,
        sources: sc.sources.map((src) => {
          if (src.id !== sourceId) return src;
          return { ...src, locked: !src.locked };
        }),
      };
    });
    saveScenes(updated);
  };

  // Add New Scene
  const handleAddScene = () => {
    const newIdx = scenes.length + 1;
    const newScene: ObsScene = {
      id: `scene-${Date.now()}`,
      name: `Scene ${newIdx}`,
      transitionDurationMs: 300,
      sources: [
        {
          id: `src-${Date.now()}-1`,
          name: 'Media Feed',
          type: 'vod_clip',
          enabled: true,
          locked: false,
          streamUrl: 'https://www.youtube.com/watch?v=dp8PhLsUcFE',
          zIndex: 1,
          cropOrPip: 'fullscreen',
        },
      ],
    };
    saveScenes([...scenes, newScene]);
    setActivePreviewSceneId(newScene.id);
  };

  // Remove Active Preview Scene
  const handleRemoveScene = () => {
    if (scenes.length <= 1) return;
    const filtered = scenes.filter((s) => s.id !== activePreviewSceneId);
    saveScenes(filtered);
    setActivePreviewSceneId(filtered[0]?.id || 'scene-1');
  };

  // Move Scene Up / Down
  const handleMoveScene = (direction: 'up' | 'down') => {
    const idx = scenes.findIndex((s) => s.id === activePreviewSceneId);
    if (idx === -1) return;
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === scenes.length - 1) return;

    const copy = [...scenes];
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    const temp = copy[idx];
    copy[idx] = copy[targetIdx];
    copy[targetIdx] = temp;
    saveScenes(copy);
  };

  // Post Quick News from inline dock
  const handlePostQuickNews = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickNewsHeadline.trim()) return;
    await addCustomTickerItem({
      headline: quickNewsHeadline.trim(),
      category: quickNewsCategory,
      isBreaking: true,
      source: 'Studio Control Room',
    });
    setQuickNewsSuccess(true);
    setQuickNewsHeadline('');
    setTimeout(() => setQuickNewsSuccess(false), 3000);
  };

  // Format uptime HH:MM:SS
  const formatTime = (totalSec: number) => {
    const h = Math.floor(totalSec / 3600).toString().padStart(2, '0');
    const m = Math.floor((totalSec % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(totalSec % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  return (
    <div className="bg-[#1c212b] border border-[#2a313e] rounded-xl shadow-2xl text-slate-200 overflow-hidden flex flex-col font-sans select-none">
      {/* ======================================================== */}
      {/* 1. MASTER VISION SWITCHER CONTROL DECK                   */}
      {/* ======================================================== */}
      <div className="bg-[#10141d] border-b border-[#2a313e] px-3.5 py-2 flex flex-wrap items-center justify-between gap-2.5 text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 font-mono text-[11px]">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <span className="font-black text-white uppercase tracking-wider">Vision Switcher Deck</span>
            <span className="px-2 py-0.5 rounded bg-red-950/80 border border-red-600/60 text-red-300 font-bold text-[10px]">
              ON-AIR: {programScene.name}
            </span>
            <span className="px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-600/60 text-emerald-300 font-bold text-[10px]">
              PVW: {previewScene.name}
            </span>
          </div>

          {/* Functional Broadcast Docks Toggles */}
          <div className="hidden md:flex items-center gap-1.5 pl-2 border-l border-slate-700/60">
            <span className="text-[10px] font-bold text-slate-400 uppercase font-mono mr-1">Docks:</span>
            {[
              { key: 'scenes', label: 'Scenes' },
              { key: 'sources', label: 'Sources' },
              { key: 'audioMixer', label: 'Mixer' },
              { key: 'transitions', label: 'Transitions' },
              { key: 'controls', label: 'Controls' },
              { key: 'flashNews', label: 'News Flash' },
            ].map((dock) => {
              const isVis = visibleDocks[dock.key as keyof typeof visibleDocks];
              return (
                <button
                  key={dock.key}
                  type="button"
                  onClick={() => {
                    setVisibleDocks((prev) => ({ ...prev, [dock.key]: !isVis }));
                  }}
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all border ${
                    isVis
                      ? 'bg-blue-600/30 text-blue-300 border-blue-500/50 shadow-sm'
                      : 'bg-slate-900/60 text-slate-500 border-slate-800 hover:text-slate-300'
                  }`}
                >
                  {dock.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Top Right Switcher Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCut}
            className="px-2.5 py-1 bg-red-600 hover:bg-red-500 text-white font-mono font-black text-[11px] rounded transition-all shadow-md active:scale-95 flex items-center gap-1"
            title="Instant Cut Preview to Program On-Air"
          >
            <Scissors className="w-3 h-3" />
            <span>CUT</span>
          </button>
          <button
            type="button"
            onClick={() => handleFadeTransition()}
            disabled={isTransitioning}
            className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-mono font-black text-[11px] rounded transition-all shadow-md active:scale-95 flex items-center gap-1"
            title="Auto Crossfade Preview to Program On-Air"
          >
            <Zap className="w-3 h-3" />
            <span>AUTO ({transitionDuration}ms)</span>
          </button>
          <button
            type="button"
            onClick={() => setIsFlashNewsModalOpen(true)}
            className="px-2 py-1 bg-red-950/60 hover:bg-red-900/80 text-red-300 border border-red-700/60 rounded text-[11px] font-bold flex items-center gap-1 transition-all"
            title="Open Live Flash News Ticker Dispatcher"
          >
            <Radio className="w-3 h-3 text-red-400 animate-pulse" />
            <span>Flash News</span>
          </button>
          <button
            type="button"
            onClick={() => setIsStudioMode(!isStudioMode)}
            className={`px-2 py-1 rounded text-[11px] font-bold border transition-all ${
              isStudioMode
                ? 'bg-blue-600 border-blue-500 text-white'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
            }`}
          >
            {isStudioMode ? 'Studio Mode (PVW/PGM)' : 'Single Program'}
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. DUAL MONITORS & TRANSITION BAR (STUDIO SWITCHER MODE) */}
      {/* ======================================================== */}
      {/* Integrated Multi-Device Playout & Ad Ingestion Bar */}
      <div className="bg-[#141820] border-b border-[#2a313e] px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-white uppercase tracking-wider text-[11px] flex items-center gap-1.5 font-mono">
            <Radio className="w-3.5 h-3.5 text-red-500 animate-pulse" />
            <span>Master Program Bus:</span>
          </span>
          <span className="px-2 py-0.5 rounded bg-red-950 border border-red-700/80 text-red-200 font-bold font-mono text-[11px]">
            PGM ON-AIR: {programScene.name}
          </span>
          <button
            type="button"
            onClick={() => {
              const src = programScene.sources.find((s) => s.enabled);
              const isDisplay = programScene.sources.some((s) => s.type === 'display' && s.enabled);
              const targetUrl = isDisplay && isScreenSharing
                ? '/uploads/screen_live_stream.webm'
                : src?.streamUrl || '/master_broadcast_feed.mp4';
              syncSwitcherProgramToNetwork(targetUrl, programScene.name);
            }}
            className="px-2.5 py-1 bg-red-600 hover:bg-red-500 text-white rounded font-bold text-[11px] transition-colors flex items-center gap-1.5 shadow-md shadow-red-600/30"
            title="Synchronize this Program scene directly with Main TV Screen and YouTube Stream"
          >
            <Radio className="w-3 h-3" />
            <span>Sync to TV &amp; YouTube Feed</span>
          </button>
        </div>

        {/* Live Screen Share & Quick SCTE-35 Ads */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Screen Share Quick Control */}
          {!isScreenSharing ? (
            <button
              type="button"
              onClick={async () => {
                const stream = await startScreenShare();
                if (stream) {
                  setActiveProgramSceneId('scene-2');
                  syncSwitcherProgramToNetwork('/uploads/screen_live_stream.webm', 'Live Screen Share');
                }
              }}
              className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-black font-bold text-xs rounded transition-colors flex items-center gap-1.5 shadow"
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Share Screen to Program</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 bg-cyan-950/80 border border-cyan-700/80 rounded px-2 py-0.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-[11px] font-bold text-cyan-200 font-mono">Screen Sharing Active</span>
              <button
                type="button"
                onClick={stopScreenShare}
                className="ml-1 text-[10px] text-red-400 hover:text-red-300 font-bold underline"
              >
                Stop
              </button>
            </div>
          )}

          {/* SCTE-35 Quick Ad Break Ingestion */}
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-700 rounded p-0.5">
            <span className="text-[10px] text-slate-400 font-mono px-1">SSAI Ads:</span>
            <button
              type="button"
              onClick={() => {
                injectScte35Cue({
                  durationSeconds: 15,
                  adTitle: 'Network 15s Commercial Break',
                  advertiser: 'Sponsor Live Ingest',
                });
              }}
              className="px-2 py-0.5 bg-amber-600 hover:bg-amber-500 text-black text-[10px] font-bold rounded transition-colors"
              title="Inject 15s SCTE-35 targeted ad spot in between live stream"
            >
              +15s Ad
            </button>
            <button
              type="button"
              onClick={() => {
                injectScte35Cue({
                  durationSeconds: 30,
                  adTitle: 'Network 30s Commercial Break',
                  advertiser: 'Sponsor Live Ingest',
                });
              }}
              className="px-2 py-0.5 bg-amber-600 hover:bg-amber-500 text-black text-[10px] font-bold rounded transition-colors"
              title="Inject 30s SCTE-35 targeted ad spot in between live stream"
            >
              +30s Ad
            </button>
          </div>
        </div>
      </div>
      <div className="p-3 bg-[#13171f] border-b border-[#2a313e] flex flex-col xl:flex-row items-center gap-3">
        {/* Left Monitor: Preview: Scene */}
        <div className="flex-1 w-full bg-[#0a0d13] border-2 border-slate-700/80 rounded-lg overflow-hidden flex flex-col shadow-xl">
          <div className="bg-[#171c26] border-b border-slate-800 px-3 py-1.5 flex items-center justify-between text-xs">
            <span className="font-bold text-slate-200 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>Preview: {previewScene.name}</span>
            </span>
            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
              <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">1920x1080</span>
              <span className="hidden sm:inline">35% · Scale to Window</span>
              <button
                type="button"
                onClick={() => {
                  const src = previewScene.sources.find((s) => s.streamUrl) || previewScene.sources[0];
                  if (src) {
                    setAssignmentModalTarget({
                      sceneId: previewScene.id,
                      sourceId: src.id,
                      targetName: `PVW: ${previewScene.name}`,
                    });
                  }
                }}
                className="px-2 py-0.5 bg-blue-600/30 hover:bg-blue-600 text-blue-200 hover:text-white rounded border border-blue-500/40 text-[10px] font-bold flex items-center gap-1 transition-colors"
              >
                <SlidersHorizontal className="w-2.5 h-2.5" />
                <span>Assign Video</span>
              </button>
            </div>
          </div>
          <div className="relative aspect-video w-full bg-black">
            <SceneCompositeMonitor
              scene={previewScene}
              isProgram={false}
              screenShareStream={screenShareStream}
              isScreenSharing={isScreenSharing}
            />
          </div>
        </div>

        {/* Center: Transition Deck (Exact OBS Studio layout) */}
        <div className="flex flex-row xl:flex-col items-center justify-center gap-2 px-2 py-1 bg-[#1a202c] border border-slate-800 rounded-lg shrink-0">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleFadeTransition(transitionDuration)}
              className="px-4 py-1.5 bg-[#2d3748] hover:bg-[#3b475c] active:bg-[#4a5568] text-white text-xs font-bold rounded border border-slate-600 shadow transition-colors flex items-center gap-1"
            >
              <span>Transition</span>
            </button>
            <button
              type="button"
              onClick={() => handleFadeTransition(100)}
              className="p-1.5 bg-[#2d3748] hover:bg-[#3b475c] text-white text-xs rounded border border-slate-600"
              title="Quick Transitions"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex xl:flex-col items-center gap-1.5 w-full">
            <button
              type="button"
              onClick={handleCut}
              className="w-full px-3 py-1 bg-red-600/90 hover:bg-red-500 active:scale-95 text-white font-bold text-xs rounded border border-red-500 shadow-sm transition-transform"
            >
              Cut
            </button>
            <button
              type="button"
              onClick={() => handleFadeTransition(300)}
              className="w-full px-3 py-1 bg-[#2d3748] hover:bg-[#3b475c] active:scale-95 text-white font-medium text-xs rounded border border-slate-600 transition-transform"
            >
              Fade (300ms)
            </button>
            <button
              type="button"
              onClick={handleFadeToBlack}
              className="w-full px-3 py-1 bg-slate-900 hover:bg-black active:scale-95 text-slate-300 hover:text-white font-medium text-xs rounded border border-slate-700 transition-transform"
            >
              Fade to Black
            </button>
          </div>

          {/* T-Bar Slider */}
          <div className="flex items-center gap-2 w-32 xl:w-full mt-1">
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={tbarProgress}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setTbarProgress(val);
                if (val >= 0.98) {
                  handleCut();
                  setTbarProgress(0);
                }
              }}
              className="w-full accent-emerald-500 h-1.5 bg-slate-800 rounded cursor-pointer"
            />
          </div>
        </div>

        {/* Right Monitor: Program: Scene (RED TALLY ON AIR) */}
        <div className="flex-1 w-full bg-[#0a0d13] border-2 border-red-500 rounded-lg overflow-hidden flex flex-col shadow-xl">
          <div className="bg-red-950/90 border-b border-red-500/60 px-3 py-1.5 flex items-center justify-between text-xs">
            <span className="font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
              <span>Program: {programScene.name}</span>
            </span>
            <div className="flex items-center gap-2 text-[10px] text-red-200 font-mono">
              <span className="px-1.5 py-0.5 rounded bg-red-600 text-white font-bold">LIVE ON AIR</span>
              <span className="hidden sm:inline">1920x1080 @ 60.00 FPS</span>
            </div>
          </div>
          <div className="relative aspect-video w-full bg-black">
            <SceneCompositeMonitor
              scene={programScene}
              isProgram={true}
              screenShareStream={screenShareStream}
              isScreenSharing={isScreenSharing}
            />
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. OBS DOCKS SYSTEM (Scenes, Sources, Mixer, Controls)   */}
      {/* ======================================================== */}
      <div className="p-3 bg-[#181d26] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 flex-1 min-h-[300px]">
        {/* DOCK 1: SCENES DOCK (2 cols) */}
        {visibleDocks.scenes && (
          <div className="lg:col-span-2 bg-[#1f2633] border border-[#2d3748] rounded-lg p-2.5 flex flex-col justify-between shadow-md">
            <div>
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-700 text-xs font-bold text-slate-200">
                <span>Scenes</span>
                <span className="text-[10px] text-slate-400 font-mono">({scenes.length})</span>
              </div>

              {/* Scenes List */}
              <div className="mt-2 space-y-1 max-h-48 overflow-y-auto pr-1">
                {scenes.map((sc) => {
                  const isPgm = sc.id === activeProgramSceneId;
                  const isPvw = sc.id === activePreviewSceneId;
                  return (
                    <div
                      key={sc.id}
                      onClick={() => setActivePreviewSceneId(sc.id)}
                      className={`px-2 py-1.5 rounded text-xs font-medium cursor-pointer transition-colors flex items-center justify-between ${
                        isPvw
                          ? 'bg-blue-600 text-white font-bold'
                          : isPgm
                          ? 'bg-red-950/80 border border-red-600/80 text-white font-bold'
                          : 'hover:bg-[#283243] text-slate-300'
                      }`}
                    >
                      <span className="truncate">{sc.name}</span>
                      {isPgm && (
                        <span className="text-[9px] bg-red-600 text-white font-bold px-1 rounded">
                          PGM
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Scenes Bottom Actions (+, -, Up, Down) */}
            <div className="pt-2 border-t border-slate-700/80 flex items-center justify-between text-slate-400">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleAddScene}
                  className="p-1 rounded hover:bg-slate-700 hover:text-white transition-colors"
                  title="Add Scene"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleRemoveScene}
                  className="p-1 rounded hover:bg-slate-700 hover:text-white transition-colors"
                  title="Remove Scene"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleMoveScene('up')}
                  className="p-1 rounded hover:bg-slate-700 hover:text-white transition-colors"
                  title="Move Scene Up"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleMoveScene('down')}
                  className="p-1 rounded hover:bg-slate-700 hover:text-white transition-colors"
                  title="Move Scene Down"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* DOCK 2: SOURCES DOCK (3 cols) */}
        {visibleDocks.sources && (
          <div className="lg:col-span-3 bg-[#1f2633] border border-[#2d3748] rounded-lg p-2.5 flex flex-col justify-between shadow-md">
            <div>
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-700 text-xs font-bold text-slate-200">
                <span className="truncate">Sources: {previewScene.name}</span>
                <span className="text-[10px] text-slate-400 font-mono">({previewScene.sources.length})</span>
              </div>

              {/* Sources List with Eye and Lock Icons */}
              <div className="mt-2 space-y-1 max-h-48 overflow-y-auto pr-1">
                {previewScene.sources.map((src) => {
                  const isSelected = selectedSourceId === src.id;
                  return (
                    <div
                      key={src.id}
                      onClick={() => setSelectedSourceId(src.id)}
                      className={`px-2 py-1.5 rounded text-xs transition-colors flex items-center justify-between gap-2 cursor-pointer ${
                        isSelected
                          ? 'bg-blue-600/90 text-white font-bold'
                          : src.enabled
                          ? 'bg-[#262f3f] text-slate-200 hover:bg-[#2c3749]'
                          : 'bg-[#1b212c] text-slate-500 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <FileVideo className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{src.name}</span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Eye toggle */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSourceEnabled(previewScene.id, src.id);
                          }}
                          className={`p-0.5 rounded hover:text-white transition-colors ${
                            src.enabled ? 'text-slate-300' : 'text-slate-600'
                          }`}
                          title={src.enabled ? 'Hide' : 'Show'}
                        >
                          {src.enabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        </button>

                        {/* Lock toggle */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSourceLocked(previewScene.id, src.id);
                          }}
                          className={`p-0.5 rounded hover:text-white transition-colors ${
                            src.locked ? 'text-amber-400' : 'text-slate-500'
                          }`}
                          title={src.locked ? 'Unlock' : 'Lock'}
                        >
                          {src.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Sources Bottom Actions (+, -, Properties, Filters) */}
            <div className="pt-2 border-t border-slate-700/80 flex items-center justify-between text-slate-400">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    const src = previewScene.sources.find((s) => s.id === selectedSourceId) || previewScene.sources[0];
                    if (src) {
                      setAssignmentModalTarget({
                        sceneId: previewScene.id,
                        sourceId: src.id,
                        targetName: src.name,
                      });
                    }
                  }}
                  className="px-2 py-0.5 rounded bg-blue-600/30 hover:bg-blue-600 text-blue-200 text-[10px] font-bold border border-blue-500/40"
                  title="Assign Video to selected source"
                >
                  Assign Stream
                </button>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    const src = previewScene.sources.find((s) => s.id === selectedSourceId) || previewScene.sources[0];
                    if (src) {
                      setAssignmentModalTarget({
                        sceneId: previewScene.id,
                        sourceId: src.id,
                        targetName: src.name,
                      });
                    }
                  }}
                  className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px]"
                >
                  Properties
                </button>
                <button
                  type="button"
                  className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px]"
                >
                  Filters
                </button>
              </div>
            </div>
          </div>
        )}

        {/* DOCK 3: AUDIO MIXER DOCK (4 cols) - Dedicated Isolated Component */}
        {visibleDocks.audioMixer && <AudioMixerDock />}

        {/* DOCK 4: SCENE TRANSITIONS DOCK (1.5 cols) */}
        {visibleDocks.transitions && (
          <div className="lg:col-span-1.5 bg-[#1f2633] border border-[#2d3748] rounded-lg p-2.5 flex flex-col justify-between shadow-md">
            <div>
              <div className="pb-1.5 border-b border-slate-700 text-xs font-bold text-slate-200">
                <span>Transitions</span>
              </div>

              <div className="mt-2 space-y-2">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Type</label>
                  <select
                    value={transitionType}
                    onChange={(e) => setTransitionType(e.target.value as any)}
                    className="w-full bg-[#171c26] border border-slate-700 rounded px-2 py-1 text-xs text-white"
                  >
                    <option value="Fade">Fade</option>
                    <option value="Cut">Cut</option>
                    <option value="Slide">Slide</option>
                    <option value="Stinger">Stinger</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Duration</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={transitionDuration}
                      onChange={(e) => setTransitionDuration(Number(e.target.value) || 300)}
                      step={50}
                      min={0}
                      max={5000}
                      className="w-full bg-[#171c26] border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono"
                    />
                    <span className="text-[10px] text-slate-500 font-mono">ms</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-700/80 flex items-center justify-end text-slate-400">
              <button
                type="button"
                onClick={() => handleFadeTransition(transitionDuration)}
                className="w-full py-1 bg-[#2b3545] hover:bg-[#374459] text-white text-[10px] font-bold rounded text-center transition-colors"
              >
                Apply
              </button>
            </div>
          </div>
        )}

        {/* DOCK 5: CONTROLS DOCK (1.5 cols) */}
        {visibleDocks.controls && (
          <div className="lg:col-span-1.5 bg-[#1f2633] border border-[#2d3748] rounded-lg p-2.5 flex flex-col justify-between shadow-md">
            <div>
              <div className="pb-1.5 border-b border-slate-700 text-xs font-bold text-slate-200">
                <span>Controls</span>
              </div>

              {/* Action Buttons (Start Streaming, Recording, Studio Mode, etc.) */}
              <div className="mt-2 space-y-1.5">
                <button
                  type="button"
                  onClick={() => setIsStreaming(!isStreaming)}
                  className={`w-full py-1.5 rounded text-xs font-bold transition-all shadow ${
                    isStreaming
                      ? 'bg-red-600 text-white animate-pulse'
                      : 'bg-[#2b3545] hover:bg-[#374459] text-slate-200 hover:text-white'
                  }`}
                >
                  {isStreaming ? 'Stop Streaming' : 'Start Streaming'}
                </button>

                <button
                  type="button"
                  onClick={() => setIsRecording(!isRecording)}
                  className={`w-full py-1.5 rounded text-xs font-bold transition-all ${
                    isRecording
                      ? 'bg-amber-600 text-white'
                      : 'bg-[#2b3545] hover:bg-[#374459] text-slate-200 hover:text-white'
                  }`}
                >
                  {isRecording ? 'Stop Recording' : 'Start Recording'}
                </button>

                <button
                  type="button"
                  onClick={() => setIsVirtualCam(!isVirtualCam)}
                  className={`w-full py-1.5 rounded text-xs font-bold transition-all ${
                    isVirtualCam
                      ? 'bg-emerald-600 text-white'
                      : 'bg-[#2b3545] hover:bg-[#374459] text-slate-200 hover:text-white'
                  }`}
                >
                  Start Virtual Cam
                </button>

                <button
                  type="button"
                  onClick={() => setIsStudioMode(!isStudioMode)}
                  className={`w-full py-1.5 rounded text-xs font-bold transition-all ${
                    isStudioMode
                      ? 'bg-blue-600 text-white'
                      : 'bg-[#2b3545] hover:bg-[#374459] text-slate-200'
                  }`}
                >
                  Studio Mode
                </button>

                <button
                  type="button"
                  onClick={() => setIsFlashNewsModalOpen(true)}
                  className="w-full py-1.5 bg-red-950/70 hover:bg-red-900/80 text-red-200 hover:text-white font-bold text-xs rounded border border-red-800/80 transition-colors flex items-center justify-center gap-1"
                >
                  <Radio className="w-3 h-3 text-red-400" />
                  <span>Flash Ticker</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setVisibleDocks((prev) => ({ ...prev, flashNews: !prev.flashNews }));
                  }}
                  className="w-full py-1.5 bg-[#2b3545] hover:bg-[#374459] text-slate-200 text-xs rounded transition-colors"
                >
                  Settings
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* 4. OPTIONAL INLINE FLASH NEWS TICKER DOCK               */}
      {/* ======================================================== */}
      {visibleDocks.flashNews && (
        <div className="p-3 bg-[#13171f] border-t border-[#2a313e] flex flex-col md:flex-row items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-2 shrink-0">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              On-Air Flash News Dock:
            </span>
          </div>

          <form onSubmit={handlePostQuickNews} className="flex-1 flex items-center gap-2 w-full">
            <select
              value={quickNewsCategory}
              onChange={(e) => setQuickNewsCategory(e.target.value)}
              className="bg-[#1f2633] border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white"
            >
              <option value="BREAKING">BREAKING</option>
              <option value="SPORTS">SPORTS</option>
              <option value="MARKETS">MARKETS</option>
              <option value="TECH">TECH & AI</option>
            </select>

            <input
              type="text"
              value={quickNewsHeadline}
              onChange={(e) => setQuickNewsHeadline(e.target.value)}
              placeholder="Enter flash breaking news to instantly scroll on lower-third ticker..."
              className="flex-1 bg-[#1f2633] border border-slate-700 rounded px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
            />

            <button
              type="submit"
              disabled={!quickNewsHeadline.trim()}
              className="px-4 py-1.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold text-xs rounded flex items-center gap-1.5 transition-colors shrink-0 shadow"
            >
              <Send className="w-3.5 h-3.5" />
              <span>⚡ Flash to Air</span>
            </button>
          </form>

          {quickNewsSuccess && (
            <span className="text-xs text-emerald-400 font-bold animate-fadeIn">
              ✓ Flash News Published!
            </span>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. BOTTOM OBS STATUS BAR (Exact stats from screenshot)   */}
      {/* ======================================================== */}
      <div className="bg-[#141820] border-t border-[#2a313e] px-3 py-1.5 flex flex-wrap items-center justify-between text-[11px] font-mono text-slate-400">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${isStreaming ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
            <span className="text-slate-300">LIVE:</span> {isStreaming ? formatTime(streamUptimeSec) : '00:00:00'}
          </span>
          <span className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${isRecording ? 'bg-red-500 animate-ping' : 'bg-slate-600'}`} />
            <span className="text-slate-300">REC:</span> {isRecording ? '00:12:44' : '00:00:00'}
          </span>
        </div>

        <div className="flex items-center gap-4">
          <span>CPU: <strong className="text-slate-200">24.1%</strong></span>
          <span>FPS: <strong className="text-slate-200">60.00 / 60.00 FPS</strong></span>
          <span>Bitrate: <strong className="text-emerald-400">6,000 kbps CBR</strong></span>
          <span className="text-slate-500">Drop: 0 (0.0%)</span>
        </div>
      </div>

      {/* Assign Video Source Modal */}
      {assignmentModalTarget && (
        <SourceAssignmentModal
          isOpen={true}
          onClose={() => setAssignmentModalTarget(null)}
          targetSourceName={assignmentModalTarget.targetName}
          onSelectSource={(url, title) => {
            const updated = scenes.map((sc) => {
              if (sc.id !== assignmentModalTarget.sceneId) return sc;
              return {
                ...sc,
                sources: sc.sources.map((src) => {
                  if (src.id !== assignmentModalTarget.sourceId) return src;
                  return { ...src, streamUrl: url, name: title };
                }),
              };
            });
            saveScenes(updated);
          }}
        />
      )}
    </div>
  );
};

export default ObsSceneSwitcherPanel;
