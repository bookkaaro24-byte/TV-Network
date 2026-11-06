/**
 * StudioWebSocketPanel - Remote Studio Vision Mixer & Switcher WebSocket Interface
 * Allows real-time remote scene switching, program/preview tallies, and broadcast transport control.
 * Strictly adheres to project guideline: NO "OBS" branding in user-facing text.
 */

import React, { useState, useEffect } from 'react';
import {
  Layers,
  Radio,
  Play,
  Square,
  Video,
  Camera,
  RefreshCw,
  Zap,
  CheckCircle2,
  AlertCircle,
  Wifi,
  WifiOff,
  Sliders,
  Scissors,
  ArrowRightLeft,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { switcherWebSocket, SwitcherStatus } from '../services/switcherWebSocketService';

export const StudioWebSocketPanel: React.FC = () => {
  const [status, setStatus] = useState<SwitcherStatus>(switcherWebSocket.getStatus());
  const [serverUrl, setServerUrl] = useState<string>('ws://localhost:4455');
  const [password, setPassword] = useState<string>('');
  const [transitionDuration, setTransitionDuration] = useState<number>(300);

  useEffect(() => {
    const unsubscribe = switcherWebSocket.subscribe((newStatus) => {
      setStatus(newStatus);
    });
    return () => unsubscribe();
  }, []);

  const handleConnectToggle = () => {
    if (status.connected || status.connecting) {
      switcherWebSocket.disconnect();
    } else {
      switcherWebSocket.connect(serverUrl, password);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn text-slate-100">
      {/* Top Header Card */}
      <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Studio Switcher WebSocket Remote</span>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold border ${
                    status.connected
                      ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700/80'
                      : status.connecting
                      ? 'bg-amber-950/80 text-amber-300 border-amber-700/80'
                      : 'bg-slate-900 text-slate-400 border-slate-800'
                  }`}
                >
                  {status.connected ? '● CONNECTED' : status.connecting ? '○ CONNECTING...' : '○ STANDBY'}
                </span>
              </h4>
              <p className="text-xs text-slate-400">
                Bidirectional WebSocket remote for external vision mixers, scene composition, and studio tally.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleConnectToggle}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all shadow ${
                status.connected
                  ? 'bg-red-950/80 hover:bg-red-900 text-red-300 border border-red-800'
                  : 'bg-purple-600 hover:bg-purple-500 text-white'
              }`}
            >
              {status.connected ? <WifiOff className="w-3.5 h-3.5" /> : <Wifi className="w-3.5 h-3.5" />}
              <span>{status.connected ? 'Disconnect' : status.connecting ? 'Connecting...' : 'Connect WebSocket'}</span>
            </button>
          </div>
        </div>

        {/* Connection Setup Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
          <div className="space-y-1 sm:col-span-2">
            <label className="text-[11px] text-slate-400 font-bold">Switcher WebSocket Endpoint URL</label>
            <input
              type="text"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              placeholder="ws://localhost:4455"
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] text-slate-400 font-bold">Authentication Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Optional Server Password"
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-purple-500"
            />
          </div>
        </div>

        {status.lastError && (
          <div className="p-3 bg-amber-950/50 border border-amber-700/60 rounded-xl text-amber-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{status.lastError}</span>
          </div>
        )}
      </div>

      {/* Program & Preview Dual Tally Monitors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Preview (Green Tally) */}
        <div className="p-4 rounded-2xl bg-slate-950 border-2 border-emerald-500/70 shadow-xl space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between pb-2 border-b border-emerald-950">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
              <h5 className="text-xs font-black uppercase tracking-wider text-emerald-400 font-mono">
                PREVIEW BUS (NEXT UP)
              </h5>
            </div>
            <span className="text-[10px] font-mono bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded font-bold border border-emerald-800">
              PVW TALLY
            </span>
          </div>
          <div className="text-lg font-black text-white truncate">{status.currentPreviewScene}</div>
          <p className="text-[11px] text-slate-400">
            Cued source ready for transmission transition on master broadcast line.
          </p>
        </div>

        {/* Program (Red Tally) */}
        <div className="p-4 rounded-2xl bg-slate-950 border-2 border-red-500/80 shadow-xl space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between pb-2 border-b border-red-950">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
              <h5 className="text-xs font-black uppercase tracking-wider text-red-400 font-mono">
                PROGRAM BUS (ON AIR)
              </h5>
            </div>
            <span className="text-[10px] font-mono bg-red-950 text-red-300 px-2 py-0.5 rounded font-bold border border-red-800">
              ON-AIR LIVE
            </span>
          </div>
          <div className="text-lg font-black text-white truncate">{status.currentProgramScene}</div>
          <p className="text-[11px] text-slate-400">
            Active switched feed transmitting to master playout and streaming outputs.
          </p>
        </div>
      </div>

      {/* Transition Controls & Transport Strip */}
      <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <span className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
            <Scissors className="w-4 h-4 text-purple-400" />
            <span>Master Vision Transitions &amp; Transport</span>
          </span>
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <span>TRANSITION:</span>
            <span className="text-white font-bold">{transitionDuration}ms</span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* CUT (Instant) */}
          <button
            type="button"
            onClick={() => switcherWebSocket.cutTransition()}
            className="p-3.5 bg-red-600 hover:bg-red-500 active:scale-95 text-white rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg shadow-red-600/30"
          >
            <Scissors className="w-4 h-4" />
            <span>CUT (Hard Switch)</span>
          </button>

          {/* AUTO / DISSOLVE */}
          <button
            type="button"
            onClick={() => switcherWebSocket.cutTransition()}
            className="p-3.5 bg-purple-600 hover:bg-purple-500 active:scale-95 text-white rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg shadow-purple-600/30"
          >
            <ArrowRightLeft className="w-4 h-4" />
            <span>AUTO ({transitionDuration}ms)</span>
          </button>

          {/* Remote Stream Trigger */}
          <button
            type="button"
            onClick={() => switcherWebSocket.toggleStreaming()}
            className={`p-3.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
              status.streaming
                ? 'bg-red-950 text-red-300 border border-red-700'
                : 'bg-slate-900 hover:bg-slate-850 text-slate-200 border border-slate-800'
            }`}
          >
            <Radio className={`w-4 h-4 ${status.streaming ? 'animate-pulse text-red-500' : ''}`} />
            <span>{status.streaming ? 'Stop Remote Stream' : 'Start Remote Stream'}</span>
          </button>

          {/* Remote Record Trigger */}
          <button
            type="button"
            onClick={() => switcherWebSocket.toggleRecording()}
            className={`p-3.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
              status.recording
                ? 'bg-amber-950 text-amber-300 border border-amber-700'
                : 'bg-slate-900 hover:bg-slate-850 text-slate-200 border border-slate-800'
            }`}
          >
            <Square className={`w-3.5 h-3.5 ${status.recording ? 'fill-amber-400 text-amber-400' : ''}`} />
            <span>{status.recording ? 'Stop Recording' : 'Start Recording'}</span>
          </button>
        </div>
      </div>

      {/* Switcher Scene Matrix */}
      <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <span className="text-xs font-bold uppercase tracking-wider text-white">
            Vision Mixer Scene Matrix (Click to Cue Preview or Cut to Program)
          </span>
          <span className="text-[11px] font-mono text-slate-400">
            {status.scenes.length} Studio Scenes Available
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {status.scenes.map((scene) => {
            const isProgram = status.currentProgramScene === scene.sceneName;
            const isPreview = status.currentPreviewScene === scene.sceneName;

            return (
              <div
                key={scene.sceneName}
                className={`p-3.5 rounded-xl border transition-all flex items-center justify-between ${
                  isProgram
                    ? 'bg-red-950/40 border-red-500 ring-1 ring-red-500/60 shadow-lg'
                    : isPreview
                    ? 'bg-emerald-950/40 border-emerald-500 ring-1 ring-emerald-500/60'
                    : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="truncate pr-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isProgram ? 'bg-red-500 animate-ping' : isPreview ? 'bg-emerald-400' : 'bg-slate-600'
                      }`}
                    />
                    <span className="font-bold text-xs text-white truncate">{scene.sceneName}</span>
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 mt-1">
                    {isProgram ? '● ON AIR (PROGRAM)' : isPreview ? '○ CUED (PREVIEW)' : 'STANDBY'}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => switcherWebSocket.setPreviewScene(scene.sceneName)}
                    disabled={isPreview}
                    className="px-2 py-1 rounded bg-slate-800 hover:bg-emerald-700 disabled:opacity-50 text-[10px] font-bold text-slate-200 transition-colors"
                    title="Cue to Preview Bus"
                  >
                    Cue
                  </button>
                  <button
                    type="button"
                    onClick={() => switcherWebSocket.setProgramScene(scene.sceneName)}
                    disabled={isProgram}
                    className="px-2 py-1 rounded bg-red-600 hover:bg-red-500 disabled:opacity-50 text-[10px] font-bold text-white transition-colors"
                    title="Take Direct to Program Bus"
                  >
                    Take
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
