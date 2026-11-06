'use client';

import React, { useState } from 'react';
import {
  Monitor,
  Globe,
  AppWindow,
  Layers,
  Sparkles,
  Volume2,
  Mic,
  Tv,
  Radio,
  X,
  Play,
  CheckCircle2,
  Sliders,
  Maximize2,
  ShieldAlert,
} from 'lucide-react';
import { useBroadcast, ScreenShareOptions } from '../context/BroadcastContext';

export const ScreenSharePickerModal: React.FC = () => {
  const {
    isScreenShareModalOpen,
    setIsScreenShareModalOpen,
    startScreenShare,
    stopScreenShare,
    isScreenSharing,
    activeScreenShareOptions,
  } = useBroadcast();

  const [surfaceType, setSurfaceType] = useState<'monitor' | 'browser' | 'window' | 'pip' | 'virtual'>(
    activeScreenShareOptions.surfaceType || 'browser'
  );
  const [resolution, setResolution] = useState<'4k' | '1080p' | '720p'>(
    activeScreenShareOptions.resolution || '1080p'
  );
  const [includeAudio, setIncludeAudio] = useState<boolean>(true);
  const [includeMic, setIncludeMic] = useState<boolean>(false);
  const [routeTo, setRouteTo] = useState<'all' | 'network' | 'switcher' | 'youtube'>('all');
  const [isStarting, setIsStarting] = useState<boolean>(false);

  if (!isScreenShareModalOpen) return null;

  const handleStartCapture = async () => {
    setIsStarting(true);
    try {
      const options: ScreenShareOptions = {
        surfaceType,
        resolution,
        includeAudio,
        includeMic,
        frameRate: 60,
        routeTo,
      };
      const stream = await startScreenShare(options);
      if (stream) {
        setIsScreenShareModalOpen(false);
      }
    } catch (err) {
      console.warn('Screen share launch error:', err);
    } finally {
      setIsStarting(false);
    }
  };

  const captureModes = [
    {
      id: 'browser' as const,
      title: 'Browser Tab',
      badge: 'RECOMMENDED FOR MEDIA',
      desc: 'Streams an individual Chrome or Edge tab with crystal-clear audio loopback. Prevents showing personal bookmarks or desktop notifications.',
      icon: Globe,
      color: 'border-cyan-500 text-cyan-400 bg-cyan-950/20',
      activeColor: 'border-cyan-500 ring-2 ring-cyan-500/50 bg-cyan-950/40',
    },
    {
      id: 'monitor' as const,
      title: 'Entire Screen',
      badge: 'FULL 4K / 1080P DESKTOP',
      desc: 'Broadcasts your whole monitor or multi-display desktop at up to 4K UHD 60fps. Ideal for presentations, software demos, and live gaming.',
      icon: Monitor,
      color: 'border-blue-500 text-blue-400 bg-blue-950/20',
      activeColor: 'border-blue-500 ring-2 ring-blue-500/50 bg-blue-950/40',
    },
    {
      id: 'window' as const,
      title: 'Application Window',
      badge: 'ISOLATED APP INGEST',
      desc: 'Captures a specific running application window (Slides, Keynote, VS Code, DAW, Blender) without desktop clutter.',
      icon: AppWindow,
      color: 'border-purple-500 text-purple-400 bg-purple-950/20',
      activeColor: 'border-purple-500 ring-2 ring-purple-500/50 bg-purple-950/40',
    },
    {
      id: 'pip' as const,
      title: 'Camera + Screen PiP',
      badge: 'STUDIO DUAL INGEST',
      desc: 'Composites your screen with your live presenter webcam in bottom-right corner with a broadcasting on-air tally badge.',
      icon: Layers,
      color: 'border-emerald-500 text-emerald-400 bg-emerald-950/20',
      activeColor: 'border-emerald-500 ring-2 ring-emerald-500/50 bg-emerald-950/40',
    },
    {
      id: 'virtual' as const,
      title: 'Virtual Studio 4K Desk',
      badge: 'FAILSAFE BROADCAST DESK',
      desc: 'Real-time 60fps animated technical test card with SMPTE timecode, live audio visualizer, latency meter, and station telemetry.',
      icon: Sparkles,
      color: 'border-amber-500 text-amber-400 bg-amber-950/20',
      activeColor: 'border-amber-500 ring-2 ring-amber-500/50 bg-amber-950/40',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-3xl bg-[#0f172a] border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-[#090d16] border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Monitor className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>Screen Share &amp; Live Ingest Studio</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-950 border border-cyan-800 text-cyan-300">
                  4K / 60 FPS READY
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Choose capture surface, resolution profile, and playout routing to TV Player, Vision Switcher &amp; YouTube.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsScreenShareModalOpen(false)}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Surface Type Selection */}
          <div>
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2.5">
              1. Select Capture Surface:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {captureModes.map((mode) => {
                const Icon = mode.icon;
                const isSelected = surfaceType === mode.id;
                return (
                  <div
                    key={mode.id}
                    onClick={() => setSurfaceType(mode.id)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                      isSelected
                        ? mode.activeColor
                        : 'border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-900'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <Icon className={`w-5 h-5 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                        <span className="text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-black/40 text-slate-300">
                          {mode.badge}
                        </span>
                      </div>
                      <h3 className={`text-xs font-bold ${isSelected ? 'text-white font-black' : 'text-slate-200'}`}>
                        {mode.title}
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-1 leading-snug line-clamp-3">
                        {mode.desc}
                      </p>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] font-mono">
                      <span className={isSelected ? 'text-cyan-300 font-bold' : 'text-slate-500'}>
                        {isSelected ? '✓ Selected' : 'Click to select'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Capture Parameters: Resolution & Audio Mix */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800/80">
            {/* Resolution Selector */}
            <div>
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">
                2. Resolution &amp; Framerate:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: '4k', label: '4K UHD', sub: '3840x2160 @ 60' },
                  { id: '1080p', label: '1080p FHD', sub: '1920x1080 @ 60' },
                  { id: '720p', label: '720p HD', sub: '1280x720 @ 60' },
                ].map((res) => (
                  <button
                    key={res.id}
                    type="button"
                    onClick={() => setResolution(res.id as any)}
                    className={`p-2 rounded-xl text-center border transition-all ${
                      resolution === res.id
                        ? 'bg-cyan-950 border-cyan-500 text-cyan-200 ring-1 ring-cyan-500 font-bold'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-850'
                    }`}
                  >
                    <span className="block text-xs font-bold">{res.label}</span>
                    <span className="block text-[9px] font-mono text-slate-400 mt-0.5">{res.sub}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Audio Options */}
            <div>
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">
                3. Audio Channels to Ingest:
              </label>
              <div className="space-y-2">
                <label className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer hover:border-slate-700 transition-colors">
                  <div className="flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs text-slate-200 font-semibold">Include Tab / System Audio</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={includeAudio}
                    onChange={(e) => setIncludeAudio(e.target.checked)}
                    className="w-4 h-4 accent-cyan-500 rounded cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer hover:border-slate-700 transition-colors">
                  <div className="flex items-center gap-2">
                    <Mic className="w-4 h-4 text-amber-400" />
                    <span className="text-xs text-slate-200 font-semibold">Mix Studio Microphone</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={includeMic}
                    onChange={(e) => setIncludeMic(e.target.checked)}
                    className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Playout Routing Target */}
          <div className="pt-2 border-t border-slate-800/80">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">
              4. Playout Destination &amp; Sync:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              {[
                { id: 'all', label: 'Broadcast All', desc: 'TV + Switcher + YouTube' },
                { id: 'network', label: 'TV Player', desc: 'Main On-Air Feed' },
                { id: 'switcher', label: 'Program Bus', desc: 'Vision Switcher' },
                { id: 'youtube', label: 'YouTube Ingest', desc: 'RTMP Stream' },
              ].map((rt) => (
                <button
                  key={rt.id}
                  type="button"
                  onClick={() => setRouteTo(rt.id as any)}
                  className={`p-2 rounded-xl border text-left transition-all ${
                    routeTo === rt.id
                      ? 'bg-blue-950 border-blue-500 text-blue-200 ring-1 ring-blue-500 font-bold'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-850'
                  }`}
                >
                  <span className="block font-bold text-xs">{rt.label}</span>
                  <span className="block text-[9px] font-mono text-slate-400 truncate">{rt.desc}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 bg-[#090d16] border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Target: {surfaceType.toUpperCase()} ({resolution.toUpperCase()})</span>
          </div>

          <div className="flex items-center gap-2">
            {isScreenSharing && (
              <button
                type="button"
                onClick={() => {
                  stopScreenShare();
                  setIsScreenShareModalOpen(false);
                }}
                className="px-4 py-2 bg-red-950 hover:bg-red-900 text-red-200 border border-red-800 rounded-xl text-xs font-bold transition-colors"
              >
                Stop Active Share
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsScreenShareModalOpen(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition-colors"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleStartCapture}
              disabled={isStarting}
              className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-black font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-cyan-600/30 flex items-center gap-2"
            >
              <Play className="w-4 h-4 fill-black" />
              <span>{isStarting ? 'Initiating Capture...' : 'Start Screen Transmission'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
