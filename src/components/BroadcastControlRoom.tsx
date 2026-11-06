/**
 * BroadcastControlRoom - Lead Playout Architect & Ingest Console
 * Allows testing and demonstration of:
 * 1. Hot-Switching simulation (VOD -> Live SRT/RTMP stream).
 * 2. SCTE-35 ad break cue insertion.
 * 3. Stream timeout watchdog & failover recovery.
 * 4. Playout analytics & buffer health audit trail.
 */

import React, { useState, useEffect, useRef } from 'react';
import { useBroadcast } from '../context/BroadcastContext';
import { SCTE35CommandType, SCTE35SegmentationType } from '../types/broadcast';
import {
  X,
  Sliders,
  Zap,
  Radio,
  Sparkles,
  AlertTriangle,
  RotateCcw,
  Activity,
  Trash2,
  Cpu,
  Clock,
  ShieldCheck,
  Copy,
  Check,
  Video,
  Settings,
  Tv,
  CheckCircle2,
  ExternalLink,
  Volume2,
  Terminal,
  Layers,
  Eye,
  Play,
  HardDrive,
  FileCode,
  PanelRightClose,
  PanelRightOpen,
  Maximize2,
  Minimize2,
  Layout,
  Scissors,
  Wifi,
  Usb,
  Download,
  Globe,
  FolderOpen,
} from 'lucide-react';
import { HlsDiagnosticsPanel } from './HlsDiagnosticsPanel';
import { Scte35CueDebugger } from './Scte35CueDebugger';
import { BroadcastAuditLoggerPanel } from './BroadcastAuditLoggerPanel';
import { DestinationControlPanel } from './DestinationControlPanel';
import { ObsSceneSwitcherPanel } from './ObsSceneSwitcherPanel';
import { MultiViewMonitorPanel } from './MultiViewMonitorPanel';
import { SrtLatencyJitterPanel } from './SrtLatencyJitterPanel';
import { VideoStitcherPanel } from './VideoStitcherPanel';
import { StudioWebSocketPanel } from './StudioWebSocketPanel';
import { CodecDiagnosticsPanel } from './CodecDiagnosticsPanel';
import { SAMPLE_STREAMS } from '../data/mockBroadcastData';

export const BroadcastControlRoom: React.FC = () => {
  const {
    isControlRoomOpen,
    setIsControlRoomOpen,
    playout,
    activeChannel,
    channels,
    assignVideoToChannel,
    setActiveChannelId,
    setViewingMode,
    scte35Markers,
    activeScte35Marker,
    injectScte35Cue,
    clearScte35History,
    isScte35OverlayOpen,
    setIsScte35OverlayOpen,
    setIsLiveStudioOpen,
    controlRoomInitialTab,
    setControlRoomInitialTab,
  } = useBroadcast();

  // Dock mode: 'side-dock' (visible on right side while player stays visible!), 'modal' (centered), or 'fullscreen'
  const [dockMode, setDockMode] = useState<'side-dock' | 'modal' | 'fullscreen'>('side-dock');

  // Tab navigation inside Control Room
  const [activeTab, setActiveTab] = useState<
    | 'obs-switcher'
    | 'switcher-websocket'
    | 'multiview'
    | 'srt-telemetry'
    | 'video-stitcher'
    | 'playout'
    | 'codec-diagnostics'
    | 'hls-diagnostics'
    | 'scte35-live'
    | 'simulcast'
    | 'audit-logs'
    | 'obs-guide'
    | 'checklist'
    | 'iptv-export'
    | 'usb-storage'
  >('obs-switcher');

  // Sync initial tab requested from other components (e.g. YouTube & OBS Settings button)
  useEffect(() => {
    if (controlRoomInitialTab) {
      setActiveTab(controlRoomInitialTab as any);
      setControlRoomInitialTab(null);
    }
  }, [controlRoomInitialTab, setControlRoomInitialTab]);

  // OBS Guide Interactive Configs
  const [protocol, setProtocol] = useState<'srt' | 'rtmp'>('srt');
  const [encoderType, setEncoderType] = useState<'nvenc' | 'x264'>('nvenc');
  const [resolutionPreset, setResolutionPreset] = useState<'1080p' | '720p'>('1080p');
  const [audioBitrate, setAudioBitrate] = useState<'192' | '256'>('256');
  const [showStreamKey, setShowStreamKey] = useState<boolean>(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const streamServerUrl =
    protocol === 'srt'
      ? 'srt://ingest-east.apex-tv.live:10000?mode=caller&latency=2000000'
      : 'rtmp://live.apex-tv.live/live';
  const streamKey = 'live_apex_sports_ingest_sec_74921x';

  const copyToClipboard = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => {
      setCopiedField(null);
    }, 2000);
  };

  if (!isControlRoomOpen) return null;

  const content = (
    <div className="flex flex-col h-full overflow-hidden bg-slate-900 border border-slate-700/80 rounded-none sm:rounded-xl shadow-2xl">
      {/* Header */}
      <div className="bg-slate-950 px-4 sm:px-6 py-3.5 border-b border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3 truncate">
          <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center shrink-0">
            <Sliders className="w-4 h-4 text-blue-400" />
          </div>
          <div className="truncate">
            <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 truncate">
              <span>Control Room & Ingest Console</span>
              <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded font-mono shrink-0">
                {activeChannel.callSign}
              </span>
            </h3>
            <p className="text-[11px] text-slate-400 truncate">
              {dockMode === 'side-dock' ? 'Docked side-by-side with Live Player' : 'Master Broadcast Ingest & Playout'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Dock Mode Controls */}
          <div className="flex items-center p-0.5 rounded-lg bg-slate-900 border border-slate-800 text-xs">
            <button
              onClick={() => setDockMode('side-dock')}
              className={`p-1.5 rounded transition-colors ${
                dockMode === 'side-dock' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
              title="Dock to Right Side (Visible alongside Live Video Player!)"
            >
              <PanelRightClose className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setDockMode('modal')}
              className={`p-1.5 rounded transition-colors ${
                dockMode === 'modal' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
              title="Centered Modal Dialog"
            >
              <Layout className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setDockMode('fullscreen')}
              className={`p-1.5 rounded transition-colors ${
                dockMode === 'fullscreen' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
              title="Fullscreen Studio Console"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={() => setIsLiveStudioOpen(true)}
            className="px-2.5 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-md transition-all shrink-0"
            title="Launch In-App Web Playout Studio"
          >
            <Radio className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Live Studio</span>
          </button>

          <button
            onClick={() => setIsControlRoomOpen(false)}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            title="Close Console"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Studio Vision Mixer Dual-Pane Layout: Left Navigation Dock + Right Work Canvas */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
        {/* Left Studio Switcher Sidebar Navigation Dock */}
        <aside
          aria-label="Studio Switcher Control Menu"
          className="w-full md:w-64 lg:w-72 bg-[#080c16] border-b md:border-b-0 md:border-r border-slate-800 flex flex-col shrink-0 select-none overflow-y-auto"
        >
          {/* Studio Vision Mixer Core Header */}
          <div className="p-3 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-red-600/20 border border-red-500/40 flex items-center justify-center">
                <Layers className="w-3.5 h-3.5 text-red-400" />
              </div>
              <div>
                <div className="text-xs font-black tracking-wider text-white uppercase flex items-center gap-1.5">
                  <span>STUDIO CONTROLLER</span>
                  <span className="text-[10px] text-slate-400 font-mono font-normal">v30.2</span>
                </div>
                <div className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>CORE INGEST READY</span>
                </div>
              </div>
            </div>
            <span className="text-[10px] bg-slate-900 border border-slate-800 text-slate-300 px-1.5 py-0.5 rounded font-mono">
              60 FPS
            </span>
          </div>

          {/* Switcher Menu Categories */}
          <div className="p-2 space-y-4 flex-1 overflow-y-auto">
            {/* GROUP 1: SCENES & COMPOSITION */}
            <div className="space-y-1">
              <div className="px-2 text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold flex items-center justify-between">
                <span>SCENES & SOURCES</span>
                <span className="text-[9px] text-slate-400">STUDIO BUS</span>
              </div>

              <button
                onClick={() => setActiveTab('obs-switcher')}
                className={`w-full px-2.5 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-all text-left ${
                  activeTab === 'obs-switcher'
                    ? 'bg-red-600 text-white shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-slate-900/80'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <Layers className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'obs-switcher' ? 'text-white' : 'text-red-400'}`} />
                  <span className="truncate">Scene Switcher</span>
                </div>
                <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold ${
                  activeTab === 'obs-switcher' ? 'bg-black/30 text-white' : 'bg-red-950 text-red-300 border border-red-800'
                }`}>
                  T-BAR
                </span>
              </button>

              <button
                onClick={() => setActiveTab('switcher-websocket')}
                className={`w-full px-2.5 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-all text-left ${
                  activeTab === 'switcher-websocket'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-slate-900/80'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <Wifi className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'switcher-websocket' ? 'text-white' : 'text-blue-400'}`} />
                  <span className="truncate">Studio WebSocket Remote</span>
                </div>
                <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold ${
                  activeTab === 'switcher-websocket' ? 'bg-black/30 text-white' : 'bg-blue-950 text-blue-300 border border-blue-800'
                }`}>
                  PORT 4455
                </span>
              </button>

              <button
                onClick={() => setActiveTab('multiview')}
                className={`w-full px-2.5 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-all text-left ${
                  activeTab === 'multiview'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-slate-900/80'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <Tv className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'multiview' ? 'text-white' : 'text-emerald-400'}`} />
                  <span className="truncate">Multi-View Wall</span>
                </div>
                <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold ${
                  activeTab === 'multiview' ? 'bg-black/30 text-white' : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                }`}>
                  6-INPUT
                </span>
              </button>

              <button
                onClick={() => setActiveTab('usb-storage')}
                className={`w-full px-2.5 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-all text-left ${
                  activeTab === 'usb-storage'
                    ? 'bg-cyan-600 text-white shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-slate-900/80'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <Usb className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'usb-storage' ? 'text-white' : 'text-cyan-400'}`} />
                  <span className="truncate">USB &amp; External Storage</span>
                </div>
                <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold ${
                  activeTab === 'usb-storage' ? 'bg-black/30 text-white' : 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                }`}>
                  DIRECT
                </span>
              </button>
            </div>

            {/* GROUP 2: STREAM & TRANSMISSION */}
            <div className="space-y-1">
              <div className="px-2 text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold flex items-center justify-between">
                <span>STREAM & RELAY</span>
                <span className="text-[9px] text-slate-400">RESTREAM</span>
              </div>

              <button
                onClick={() => setActiveTab('simulcast')}
                className={`w-full px-2.5 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-all text-left ${
                  activeTab === 'simulcast'
                    ? 'bg-red-600 text-white shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-slate-900/80'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <Radio className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'simulcast' ? 'text-white' : 'text-red-400'}`} />
                  <span className="truncate">YouTube Stream Settings</span>
                </div>
                <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold ${
                  activeTab === 'simulcast' ? 'bg-black/30 text-white' : 'bg-red-950 text-red-300 border border-red-800'
                }`}>
                  YOUTUBE
                </span>
              </button>

              <button
                onClick={() => setActiveTab('playout')}
                className={`w-full px-2.5 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-all text-left ${
                  activeTab === 'playout'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-slate-900/80'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <Zap className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'playout' ? 'text-white' : 'text-blue-400'}`} />
                  <span className="truncate">Playout & Hot-Switch</span>
                </div>
                <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold ${
                  activeTab === 'playout' ? 'bg-black/30 text-white' : 'bg-blue-950 text-blue-300 border border-blue-800'
                }`}>
                  SRT
                </span>
              </button>

              <button
                onClick={() => setActiveTab('iptv-export')}
                className={`w-full px-2.5 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-all text-left ${
                  activeTab === 'iptv-export'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-slate-900/80'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <Tv className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'iptv-export' ? 'text-white' : 'text-purple-400'}`} />
                  <span className="truncate">IPTV &amp; M3U Export</span>
                </div>
                <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold ${
                  activeTab === 'iptv-export' ? 'bg-black/30 text-white' : 'bg-purple-950 text-purple-300 border border-purple-800'
                }`}>
                  M3U
                </span>
              </button>
            </div>

            {/* GROUP 3: TELEMETRY & MONITORS */}
            <div className="space-y-1">
              <div className="px-2 text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold flex items-center justify-between">
                <span>TELEMETRY & MONITORS</span>
                <span className="text-[9px] text-slate-400">REALTIME</span>
              </div>

              <button
                onClick={() => setActiveTab('srt-telemetry')}
                className={`w-full px-2.5 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-all text-left ${
                  activeTab === 'srt-telemetry'
                    ? 'bg-cyan-600 text-white shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-slate-900/80'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <Activity className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'srt-telemetry' ? 'text-white' : 'text-cyan-400'}`} />
                  <span className="truncate">SRT Latency & Jitter</span>
                </div>
                <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold ${
                  activeTab === 'srt-telemetry' ? 'bg-black/30 text-white' : 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                }`}>
                  SPARKLINE
                </span>
              </button>

              <button
                onClick={() => setActiveTab('codec-diagnostics')}
                className={`w-full px-2.5 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-all text-left ${
                  activeTab === 'codec-diagnostics'
                    ? 'bg-cyan-600 text-white shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-slate-900/80'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <Cpu className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'codec-diagnostics' ? 'text-white' : 'text-cyan-400'}`} />
                  <span className="truncate">Codec &amp; HEVC Diagnostics</span>
                </div>
                <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold ${
                  activeTab === 'codec-diagnostics' ? 'bg-black/30 text-white' : 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                }`}>
                  HEVC 265
                </span>
              </button>

              <button
                onClick={() => setActiveTab('hls-diagnostics')}
                className={`w-full px-2.5 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-all text-left ${
                  activeTab === 'hls-diagnostics'
                    ? 'bg-cyan-600 text-white shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-slate-900/80'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <Activity className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'hls-diagnostics' ? 'text-white' : 'text-cyan-400'}`} />
                  <span className="truncate">HLS Diagnostics</span>
                </div>
              </button>
            </div>

            {/* GROUP 4: PRODUCTION & SSAI */}
            <div className="space-y-1">
              <div className="px-2 text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold flex items-center justify-between">
                <span>PRODUCTION & ADS</span>
                <span className="text-[9px] text-slate-400">SSAI</span>
              </div>

              <button
                onClick={() => setActiveTab('video-stitcher')}
                className={`w-full px-2.5 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-all text-left ${
                  activeTab === 'video-stitcher'
                    ? 'bg-amber-600 text-white shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-slate-900/80'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <Scissors className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'video-stitcher' ? 'text-white' : 'text-amber-400'}`} />
                  <span className="truncate">Video Stitcher (SSAI)</span>
                </div>
              </button>

              <button
                onClick={() => setActiveTab('scte35-live')}
                className={`w-full px-2.5 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-all text-left ${
                  activeTab === 'scte35-live'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-slate-900/80'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <Sparkles className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'scte35-live' ? 'text-white' : 'text-purple-400'}`} />
                  <span className="truncate">SCTE-35 Ingest</span>
                </div>
              </button>

              <button
                onClick={() => setActiveTab('audit-logs')}
                className={`w-full px-2.5 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-all text-left ${
                  activeTab === 'audit-logs'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-slate-900/80'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <Terminal className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'audit-logs' ? 'text-white' : 'text-indigo-400'}`} />
                  <span className="truncate">Audit Event Logs</span>
                </div>
              </button>
            </div>

            {/* GROUP 5: OBS GUIDES & CHECKLIST */}
            <div className="space-y-1">
              <div className="px-2 text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold flex items-center justify-between">
                <span>CONFIG & SPECS</span>
                <span className="text-[9px] text-slate-400">ENGINE</span>
              </div>

              <button
                onClick={() => setActiveTab('obs-guide')}
                className={`w-full px-2.5 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-all text-left ${
                  activeTab === 'obs-guide'
                    ? 'bg-amber-600 text-white shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-slate-900/80'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <Video className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'obs-guide' ? 'text-white' : 'text-amber-400'}`} />
                  <span className="truncate">Vision Ingest Specs</span>
                </div>
              </button>

              <button
                onClick={() => setActiveTab('checklist')}
                className={`w-full px-2.5 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-all text-left ${
                  activeTab === 'checklist'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-slate-900/80'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <ShieldCheck className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'checklist' ? 'text-white' : 'text-emerald-400'}`} />
                  <span className="truncate">Ingest Checklist</span>
                </div>
              </button>
            </div>
          </div>

          {/* Studio Vision Mixer Lower Dock Status Panel */}
          <div className="p-2.5 bg-slate-950/95 border-t border-slate-800 text-[10px] font-mono space-y-1.5 shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">LIVE OUTPUT:</span>
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                ONLINE (6,500 kbps)
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1 text-slate-400 pt-1 border-t border-slate-900">
              <div>CPU: <span className="text-white">1.8%</span></div>
              <div className="text-right">FPS: <span className="text-white">60.00</span></div>
              <div>DROP: <span className="text-emerald-400">0 (0.0%)</span></div>
              <div className="text-right">REC: <span className="text-white">STANDBY</span></div>
            </div>
          </div>
        </aside>

        {/* Right Active Viewport Panel */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-[#0a0e1a]">
          {/* TAB: STUDIO SCENE SWITCHER & SOURCE MIXER */}
          {activeTab === 'obs-switcher' && <ObsSceneSwitcherPanel />}

          {/* TAB: STUDIO WEBSOCKET REMOTE CONTROLLER (PORT 4455) */}
          {activeTab === 'switcher-websocket' && <StudioWebSocketPanel />}

        {/* TAB: MULTI-VIEW MONITORING WALL */}
        {activeTab === 'multiview' && <MultiViewMonitorPanel />}

        {/* TAB: REAL-TIME SRT LATENCY & JITTER SPARKLINE */}
        {activeTab === 'srt-telemetry' && <SrtLatencyJitterPanel />}

        {/* TAB: VIDEO STITCHER API & SSAI ENGINE */}
        {activeTab === 'video-stitcher' && <VideoStitcherPanel />}

        {/* TAB: PLAYOUT CONTROLS & HOT-SWITCH ENGINE */}
        {activeTab === 'playout' && (
          <>
            {/* Section 1: Hot-Switching Playout Simulation Engine */}
              <div className="bg-slate-950/80 rounded-lg p-4 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                      Hot-Switching Playout Automation (Linear to Live Sports SRT Ingest)
                    </h4>
                  </div>
                  <span className="text-xs font-mono text-slate-400">
                    Status:{' '}
                    <span
                      className={
                        playout.hotSwitch.isActive
                          ? 'text-amber-400 font-bold'
                          : 'text-slate-300'
                      }
                    >
                      {playout.hotSwitch.isActive ? 'LIVE SRT INGEST ACTIVE' : 'SCHEDULED LINEAR VOD'}
                    </span>
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  Seamlessly cuts over playout from pre-recorded schedule to an incoming low-latency SRT sports camera line without tearing or renegotiating HTML5/HLS decoders.
                </p>

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <button
                    onClick={() =>
                      playout.triggerHotSwitch(
                        !playout.hotSwitch.isActive,
                        SAMPLE_STREAMS.SPORTS_LIVE
                      )
                    }
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold transition-all ${
                      playout.hotSwitch.isActive
                        ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-lg'
                        : 'bg-blue-600 hover:bg-blue-500 text-white'
                    }`}
                  >
                    <Radio className="w-4 h-4" />
                    <span>
                      {playout.hotSwitch.isActive
                        ? 'Revert to Scheduled Program Playout'
                        : 'Simulate Hot-Switch to Live Stream Ingest'}
                    </span>
                  </button>

                  <button
                    onClick={() =>
                      playout.triggerHotSwitch(
                        true,
                        'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8'
                      )
                    }
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-md border border-slate-700 transition-colors"
                    title="Test with Mux VOD / HLS Sample Test URL"
                  >
                    Test Mux HLS Feed
                  </button>

                  <div className="text-xs font-mono text-slate-400 bg-slate-900 px-3 py-2 rounded border border-slate-800">
                    Wire Latency: <span className="text-emerald-400 font-bold">0.82s</span> · Target: 60fps
                  </div>
                </div>
              </div>

              {/* Section 2: SCTE-35 Ad Insertion & Stream Timeout Watchdog Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Ad Insertion */}
                <div className="bg-slate-950/80 rounded-lg p-4 border border-slate-800 space-y-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-400" />
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                      SCTE-35 Ad Cue Inserter
                    </h4>
                  </div>
                  <p className="text-xs text-slate-300">
                    Injects targeted commercial markers into the stream with automated countdown and client callback hooks.
                  </p>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => playout.triggerManualAdBreak(15)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded transition-colors"
                    >
                      Inject 15s Ad Break
                    </button>
                    <button
                      onClick={() => playout.triggerManualAdBreak(30)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded transition-colors"
                    >
                      Inject 30s Ad Break
                    </button>
                    {playout.activeAdBreak && (
                      <button
                        onClick={playout.skipAdBreak}
                        className="px-3 py-1.5 bg-red-950 text-red-300 hover:bg-red-900 text-xs font-medium rounded transition-colors"
                      >
                        Skip Active Ad
                      </button>
                    )}
                  </div>
                </div>

                {/* Stream Timeout Watchdog */}
                <div className="bg-slate-950/80 rounded-lg p-4 border border-slate-800 space-y-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                      Ingest Timeout & Failover Watchdog
                    </h4>
                  </div>
                  <p className="text-xs text-slate-300">
                    Simulates upstream encoder packet loss. Watchdog triggers automatic secondary line cutover.
                  </p>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={playout.triggerStreamTimeoutSimulation}
                      className="px-3 py-1.5 bg-red-900/60 hover:bg-red-800 text-red-200 border border-red-700/60 text-xs font-medium rounded transition-colors"
                    >
                      Simulate Signal Drop
                    </button>
                    <button
                      onClick={playout.recoverStream}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded transition-colors"
                    >
                      Force Reset Signal
                    </button>
                  </div>
                </div>
              </div>

              {/* Section 3: Playout Telemetry & Analytics Dashboard */}
              <div className="bg-slate-950/80 rounded-lg p-4 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-400" />
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                      Viewer Engagement & Buffer Rate Telemetry
                    </h4>
                  </div>
                  <span className="text-xs font-mono text-emerald-400">Status: HEALTHY</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                  <div className="bg-slate-900/80 p-3 rounded border border-slate-800">
                    <div className="text-[11px] text-slate-400">Total Watch Time</div>
                    <div className="text-lg font-bold font-mono text-white mt-1">
                      {playout.analytics.totalWatchTimeSeconds}s
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      ({playout.analytics.viewerEngagementMinutes} mins logged)
                    </div>
                  </div>

                  <div className="bg-slate-900/80 p-3 rounded border border-slate-800">
                    <div className="text-[11px] text-slate-400">Current Bitrate</div>
                    <div className="text-lg font-bold font-mono text-emerald-400 mt-1">
                      {(playout.analytics.currentBitrateKbps / 1000).toFixed(1)} Mbps
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">HLS Adaptive Tier</div>
                  </div>

                  <div className="bg-slate-900/80 p-3 rounded border border-slate-800">
                    <div className="text-[11px] text-slate-400">Buffer Stalls</div>
                    <div className="text-lg font-bold font-mono text-white mt-1">
                      {playout.analytics.bufferStallCount}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {playout.analytics.bufferStallDurationSeconds}s total duration
                    </div>
                  </div>

                  <div className="bg-slate-900/80 p-3 rounded border border-slate-800">
                    <div className="text-[11px] text-slate-400">Ad Impressions</div>
                    <div className="text-lg font-bold font-mono text-blue-400 mt-1">
                      {playout.analytics.adImpressions}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">SCTE-35 verified</div>
                  </div>
                </div>
              </div>

              {/* Section 4: Live Playout Audit Trail Log */}
              <div className="bg-slate-950/80 rounded-lg p-4 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-slate-400" />
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                      Playout Automation Event Log (Chronological Audit Trail)
                    </h4>
                  </div>

                  <button
                    onClick={playout.clearLogs}
                    className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Clear Logs</span>
                  </button>
                </div>

                <div className="bg-slate-900/90 rounded border border-slate-800 max-h-48 overflow-y-auto divide-y divide-slate-800/60 font-mono text-xs p-2 space-y-1">
                  {playout.eventLogs.length === 0 ? (
                    <div className="text-slate-500 p-2 text-center">No broadcast events dispatched yet.</div>
                  ) : (
                    playout.eventLogs.map((log) => (
                      <div key={log.id} className="py-1 px-2 flex items-start gap-3">
                        <span className="text-slate-500 text-[10px] shrink-0 pt-0.5">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.2 rounded shrink-0 ${
                            log.type.includes('ERROR') || log.type.includes('TIMEOUT')
                              ? 'bg-red-950 text-red-400'
                              : log.type.includes('HOT_SWITCH')
                              ? 'bg-amber-950 text-amber-400'
                              : log.type.includes('AD_')
                              ? 'bg-blue-950 text-blue-400'
                              : 'bg-emerald-950 text-emerald-400'
                          }`}
                        >
                          {log.type}
                        </span>
                        <span className="text-slate-300 break-all">{log.message}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}

          {/* =================================================================== */}
          {/* TAB: ACTIVE STREAM CODEC & HEVC 265 TECHNICAL DIAGNOSTICS          */}
          {/* =================================================================== */}
          {activeTab === 'codec-diagnostics' && (
            <div className="animate-fadeIn">
              <CodecDiagnosticsPanel />
            </div>
          )}

          {/* =================================================================== */}
          {/* TAB 2: REAL-TIME HLS DIAGNOSTICS & BUFFER HEALTH RADAR               */}
          {/* =================================================================== */}
          {activeTab === 'hls-diagnostics' && (
            <div className="animate-fadeIn">
              <HlsDiagnosticsPanel />
            </div>
          )}

          {/* =================================================================== */}
          {/* TAB: SCTE-35 REAL-TIME CUE MARKER DASHBOARD & CUE DEBUGGER          */}
          {/* =================================================================== */}
          {activeTab === 'scte35-live' && (
            <div className="animate-fadeIn">
              <Scte35CueDebugger />
            </div>
          )}

          {/* =================================================================== */}
          {/* TAB: SOCIAL SIMULCAST HUB (YOUTUBE LIVE & FACEBOOK GRAPH API)       */}
          {/* =================================================================== */}
          {activeTab === 'simulcast' && (
            <div className="animate-fadeIn">
              <DestinationControlPanel />
            </div>
          )}

          {/* =================================================================== */}
          {/* TAB: CENTRAL BROADCAST IN-MEMORY AUDIT LOGGER & SYSTEM DIAGNOSTICS   */}
          {/* =================================================================== */}
          {activeTab === 'audit-logs' && (
            <div className="animate-fadeIn">
              <BroadcastAuditLoggerPanel />
            </div>
          )}

          {/* =================================================================== */}
          {/* TAB 3: PART 2 - OBS STUDIO LIVE INGEST CONFIGURATION GUIDE         */}
          {/* =================================================================== */}
          {activeTab === 'obs-guide' && (
            <div className="space-y-6">
              {/* Introduction Banner */}
              <div className="bg-amber-950/40 border border-amber-600/50 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Video className="w-5 h-5 text-amber-400" />
                  <h4 className="text-sm font-bold text-white">
                    Part 2: Studio Live Ingest &amp; External Encoder Guide
                  </h4>
                </div>
                <p className="text-xs text-amber-200/90 leading-relaxed">
                  To broadcast live sports feeds from stadium/field locations directly into your cloud playout switcher, follow this setup in your external switcher or hardware encoder (vMix, Studio Switcher, Teradek, Blackmagic). Configured specifically for low-latency ingest into the Apex Network switcher.
                </p>
              </div>

              {/* Step 1: Select Protocol (SRT over RTMP) */}
              <div className="bg-slate-950/80 rounded-lg p-5 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                      1
                    </span>
                    <h5 className="text-xs font-bold text-white uppercase tracking-wider">
                      Select Protocol: SRT over RTMP
                    </h5>
                  </div>
                  <span className="text-xs font-mono text-emerald-400 bg-emerald-950/80 border border-emerald-800/80 px-2 py-0.5 rounded">
                    Field-Tested for Stadium Wi-Fi
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  <strong className="text-white">Critical for stadium Wi-Fi & cellular bonding connections:</strong> SRT (Secure Reliable Transport) automatically recovers dropped packets using ARQ packet recovery. Use SRT if supported by your cloud ingest (Amagi / AWS MediaLive / Mux). Use RTMP/RTMPS as a standard fallback.
                </p>

                {/* Protocol Toggle Buttons */}
                <div className="flex items-center gap-3 pt-1">
                  <button
                    onClick={() => setProtocol('srt')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold border transition-all ${
                      protocol === 'srt'
                        ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-900/40'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <CheckCircle2 className={`w-3.5 h-3.5 ${protocol === 'srt' ? 'text-white' : 'text-slate-600'}`} />
                    <span>SRT (Caller Mode · Recommended)</span>
                  </button>

                  <button
                    onClick={() => setProtocol('rtmp')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold border transition-all ${
                      protocol === 'rtmp'
                        ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-900/40'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <CheckCircle2 className={`w-3.5 h-3.5 ${protocol === 'rtmp' ? 'text-white' : 'text-slate-600'}`} />
                    <span>RTMP / RTMPS (Legacy Fallback)</span>
                  </button>
                </div>
              </div>

              {/* Step 2: Configure Stream Settings in Studio Vision Encoder */}
              <div className="bg-slate-950/80 rounded-lg p-5 border border-slate-800 space-y-4">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                    2
                  </span>
                  <h5 className="text-xs font-bold text-white uppercase tracking-wider">
                    Configure Stream Settings in Studio Vision Encoder
                  </h5>
                </div>

                <p className="text-xs text-slate-300">
                  In your live encoder <strong className="text-white">Settings &gt; Stream</strong>, set <strong className="text-white">Service: Custom...</strong> and paste the following parameters:
                </p>

                <div className="space-y-3 bg-slate-900/90 p-4 rounded-lg border border-slate-800">
                  {/* Service */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                    <span className="text-slate-400 font-medium">Service:</span>
                    <span className="font-mono text-white bg-slate-950 px-2.5 py-1 rounded border border-slate-800">
                      Custom...
                    </span>
                  </div>

                  {/* Server URL */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-medium">
                        Server ({protocol.toUpperCase()} Ingest URL):
                      </span>
                      <button
                        onClick={() => copyToClipboard(streamServerUrl, 'server')}
                        className="flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        {copiedField === 'server' ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400 font-semibold">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy Server URL</span>
                          </>
                        )}
                      </button>
                    </div>
                    <div className="bg-slate-950 p-2.5 rounded font-mono text-xs text-emerald-400 border border-slate-800 break-all select-all">
                      {streamServerUrl}
                    </div>
                    {protocol === 'srt' && (
                      <p className="text-[11px] text-slate-400">
                        * Note: <code className="text-amber-300">latency=2000000</code> specifies 2000ms buffer latency to absorb field packet jitter.
                      </p>
                    )}
                  </div>

                  {/* Stream Key */}
                  <div className="space-y-1 pt-1 border-t border-slate-800/80">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-medium">
                        Stream Key {protocol === 'srt' ? '(SRT: Leave Blank in Encoder)' : ''}:
                      </span>
                      {protocol === 'rtmp' && (
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setShowStreamKey(!showStreamKey)}
                            className="text-slate-400 hover:text-white transition-colors"
                          >
                            {showStreamKey ? 'Hide' : 'Reveal'}
                          </button>
                          <button
                            onClick={() => copyToClipboard(streamKey, 'key')}
                            className="flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors"
                          >
                            {copiedField === 'key' ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                <span className="text-emerald-400 font-semibold">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>Copy Key</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                    {protocol === 'rtmp' ? (
                      <div className="bg-slate-950 p-2.5 rounded font-mono text-xs text-amber-400 border border-slate-800 break-all select-all">
                        {showStreamKey ? streamKey : '••••••••••••••••••••••••••••••••••••'}
                      </div>
                    ) : (
                      <div className="bg-slate-950 p-2.5 rounded font-mono text-xs text-slate-400 border border-slate-800 italic">
                        [Leave Empty / Blank in Encoder] — In SRT protocol, stream identifiers belong in the URL query string, not the Stream Key field.
                      </div>
                    )}
                  </div>
                </div>

                {/* Important Troubleshooting Note for "Invalid Custom Config" */}
                <div className="bg-amber-950/40 border border-amber-600/60 rounded-lg p-3.5 space-y-2">
                  <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                    <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    <span>Resolving "Invalid Custom Config" or "Starting output failed" in Encoder:</span>
                  </div>
                  <ul className="text-[11px] text-amber-200/90 space-y-1 list-disc list-inside">
                    <li>
                      <strong>Clear Custom Muxer Settings:</strong> In your encoder, go to <em>Settings &gt; Output &gt; Streaming</em> (Advanced Mode) and make sure the <strong>"Custom Muxer Settings"</strong> text box is completely <strong>EMPTY</strong>.
                    </li>
                    <li>
                      <strong>For SRT Streams:</strong> Ensure the <strong>Stream Key</strong> field in <em>Settings &gt; Stream</em> is left completely <strong>BLANK</strong>.
                    </li>
                    <li>
                      <strong>No External Ingest Server Running?</strong> You don't need external hardware to test live broadcasting! Click below to use your browser webcam, microphone, or screen share directly into the live broadcast:
                    </li>
                  </ul>
                  <div className="pt-1">
                    <button
                      onClick={() => setIsLiveStudioOpen(true)}
                      className="px-3.5 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded text-xs font-bold flex items-center gap-1.5 shadow-md transition-all"
                    >
                      <Radio className="w-3.5 h-3.5" />
                      <span>🔴 Open In-Browser Live Studio (Direct Web Playout)</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Step 3: Configure Video & Output Encoder Settings */}
              <div className="bg-slate-950/80 rounded-lg p-5 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                      3
                    </span>
                    <h5 className="text-xs font-bold text-white uppercase tracking-wider">
                      Configure Video & Output Encoder Settings
                    </h5>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">
                    Settings &gt; Output &gt; Mode: Advanced
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  Linear playout switchers require constant bitrates and exact keyframe alignment to stitch feeds without blackouts.
                </p>

                {/* Preset selectors */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                      Target Resolution & Bitrate Preset:
                    </label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setResolutionPreset('1080p')}
                        className={`flex-1 py-1.5 px-3 rounded text-xs font-semibold border transition-all ${
                          resolutionPreset === '1080p'
                            ? 'bg-blue-600 border-blue-400 text-white'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        1080p 60fps (6000 Kbps)
                      </button>
                      <button
                        onClick={() => setResolutionPreset('720p')}
                        className={`flex-1 py-1.5 px-3 rounded text-xs font-semibold border transition-all ${
                          resolutionPreset === '720p'
                            ? 'bg-blue-600 border-blue-400 text-white'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        720p 60fps (4000 Kbps)
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                      Encoder Type:
                    </label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEncoderType('nvenc')}
                        className={`flex-1 py-1.5 px-3 rounded text-xs font-semibold border transition-all ${
                          encoderType === 'nvenc'
                            ? 'bg-blue-600 border-blue-400 text-white'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        NVIDIA NVENC H.264 (Hardware)
                      </button>
                      <button
                        onClick={() => setEncoderType('x264')}
                        className={`flex-1 py-1.5 px-3 rounded text-xs font-semibold border transition-all ${
                          encoderType === 'x264'
                            ? 'bg-blue-600 border-blue-400 text-white'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        x264 (Software)
                      </button>
                    </div>
                  </div>
                </div>

                {/* OBS Parameter Table */}
                <div className="bg-slate-900/90 rounded-lg border border-slate-800 overflow-hidden">
                  <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-slate-800 text-xs">
                    <div className="p-3 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                        Rate Control
                      </span>
                      <div className="font-mono text-emerald-400 font-bold">CBR (Constant)</div>
                      <p className="text-[10px] text-slate-500">Required for linear switching</p>
                    </div>

                    <div className="p-3 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                        Video Bitrate
                      </span>
                      <div className="font-mono text-white font-bold">
                        {resolutionPreset === '1080p' ? '6000 Kbps' : '4000 Kbps'}
                      </div>
                      <p className="text-[10px] text-slate-500">
                        {resolutionPreset === '1080p' ? '1080p 60fps high motion' : '720p 60fps bandwidth saver'}
                      </p>
                    </div>

                    <div className="p-3 space-y-1 bg-amber-950/20">
                      <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">
                        Keyframe Interval
                      </span>
                      <div className="font-mono text-amber-300 font-bold">2.0 seconds</div>
                      <p className="text-[10px] text-amber-400/80">MUST be 2s for HLS segment alignment</p>
                    </div>

                    <div className="p-3 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                        Preset & Profile
                      </span>
                      <div className="font-mono text-white font-bold">P4: Medium / high</div>
                      <p className="text-[10px] text-slate-500">Profile: High · B-frames: 2</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 4: Configure Audio Encoding */}
              <div className="bg-slate-950/80 rounded-lg p-5 border border-slate-800 space-y-4">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                    4
                  </span>
                  <h5 className="text-xs font-bold text-white uppercase tracking-wider">
                    Configure Audio Encoding (Settings &gt; Output &gt; Audio)
                  </h5>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-slate-900 p-3 rounded border border-slate-800 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      Audio Bitrate
                    </span>
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => setAudioBitrate('192')}
                        className={`px-3 py-1 rounded text-xs font-semibold ${
                          audioBitrate === '192' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        192 Kbps
                      </button>
                      <button
                        onClick={() => setAudioBitrate('256')}
                        className={`px-3 py-1 rounded text-xs font-semibold ${
                          audioBitrate === '256' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        256 Kbps
                      </button>
                    </div>
                  </div>

                  <div className="bg-slate-900 p-3 rounded border border-slate-800 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      Audio Format
                    </span>
                    <div className="font-mono text-emerald-400 font-bold text-sm pt-1">AAC-LC</div>
                    <p className="text-[10px] text-slate-500">Low complexity broadcast standard</p>
                  </div>

                  <div className="bg-slate-900 p-3 rounded border border-slate-800 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      Sample Rate
                    </span>
                    <div className="font-mono text-white font-bold text-sm pt-1">48 kHz</div>
                    <p className="text-[10px] text-slate-500">TV broadcast audio master</p>
                  </div>
                </div>

                {/* Direct Action: Test in Player */}
                <div className="pt-2 flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 p-3 rounded border border-slate-800">
                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    <Radio className="w-4 h-4 text-emerald-400" />
                    <span>Verify your live ingest setup using our cloud playback simulation:</span>
                  </div>

                  <button
                    onClick={() => {
                      playout.triggerHotSwitch(true, SAMPLE_STREAMS.SPORTS_LIVE);
                      setIsControlRoomOpen(false);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded shadow-md transition-colors"
                  >
                    <Tv className="w-3.5 h-3.5" />
                    <span>Test Ingest Feed Live In TV Player</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* =================================================================== */}
          {/* TAB 3: INGEST PROTOCOL CHECKLIST (tv-channel-manager)                */}
          {/* =================================================================== */}
          {activeTab === 'checklist' && (
            <div className="space-y-6">
              <div className="bg-slate-950/80 rounded-lg p-5 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-400" />
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                      Live Sports Ingest Protocol Checklist (tv-channel-manager Standards)
                    </h4>
                  </div>
                  <span className="text-[10px] font-mono bg-emerald-950 text-emerald-400 border border-emerald-800/80 px-2.5 py-1 rounded font-bold">
                    OPERATIONAL PROTOCOL VERIFIED
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  When preparing for a live sports event override, ensure every stage of the transmission pipeline conforms to the following broadcast engineering constraints:
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="bg-slate-900/80 p-4 rounded-lg border border-slate-800 space-y-2">
                    <div className="font-semibold text-white flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                      <span>1. Protocol: SRT over RTMP</span>
                    </div>
                    <p className="text-slate-400 text-xs leading-relaxed">
                      Prefer SRT (Secure Reliable Transport) over RTMP for sports streams to prevent packet loss across congested stadium Wi-Fi and uplink channels.
                    </p>
                    <div className="text-[11px] font-mono text-emerald-400 pt-1 border-t border-slate-800/60">
                      Target Latency: &lt; 1000ms
                    </div>
                  </div>

                  <div className="bg-slate-900/80 p-4 rounded-lg border border-slate-800 space-y-2">
                    <div className="font-semibold text-white flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                      <span>2. Keyframe Alignment</span>
                    </div>
                    <p className="text-slate-400 text-xs leading-relaxed">
                      Verify the broadcast encoder (OBS/vMix) is locked to a 2-second Keyframe Interval (GOP = 2 * FPS = 120 frames at 60fps) to ensure seamless HLS segment cutting.
                    </p>
                    <div className="text-[11px] font-mono text-emerald-400 pt-1 border-t border-slate-800/60">
                      GOP = 2 * 60 = 120 frames
                    </div>
                  </div>

                  <div className="bg-slate-900/80 p-4 rounded-lg border border-slate-800 space-y-2">
                    <div className="font-semibold text-white flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                      <span>3. Emergency Slate Buffer</span>
                    </div>
                    <p className="text-slate-400 text-xs leading-relaxed">
                      Ensure a fallback bumper loop ("Live Match Resume Shortly") is primed in the switcher hardware buffer for zero-blackout failover if stadium feed drops.
                    </p>
                    <div className="text-[11px] font-mono text-amber-400 pt-1 border-t border-slate-800/60">
                      Slate Bumper: PRIMED
                    </div>
                  </div>
                </div>
              </div>

              {/* Technical Constraints Summary Card */}
              <div className="bg-slate-950/80 rounded-lg p-5 border border-slate-800 space-y-3">
                <h5 className="text-xs font-bold text-white uppercase tracking-wider">
                  Technical Storage & Transcoding Constraints
                </h5>
                <ul className="text-xs text-slate-300 space-y-2 list-disc list-inside">
                  <li>
                    All VOD assets stored in AWS S3 or Cloud Storage MUST be encoded in H.264 video with AAC audio.
                  </li>
                  <li>
                    Web app player MUST support native HLS (.m3u8) with adaptive bitrate fallback (1080p -&gt; 720p -&gt; 480p).
                  </li>
                  <li>
                    Lower-third headlines must remain under 120 characters per item with explicit directional delta tickers (▲ / ▼).
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* =================================================================== */}
          {/* TAB: IPTV & M3U PLAYLIST EXPORT HUB (VLC, KODI, TIVIMATE, SMART TV) */}
          {/* =================================================================== */}
          {activeTab === 'iptv-export' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Header Card */}
              <div className="bg-purple-950/40 border border-purple-600/50 rounded-2xl p-5 space-y-3 shadow-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-600/30 border border-purple-500/50 flex items-center justify-center text-purple-300">
                      <Tv className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                        <span>Digital TV Network M3U &amp; IPTV Export Hub</span>
                        <span className="text-[10px] bg-purple-950 text-purple-300 border border-purple-700 px-2 py-0.5 rounded font-mono font-bold">
                          IPTV COMPLIANT
                        </span>
                      </h4>
                      <p className="text-xs text-purple-200/80 mt-0.5">
                        Export your 24/7 on-air television network as a standardized M3U / M3U8 playlist for VLC, Kodi, TiviMate, Apple TV, GSE Smart IPTV, and Smart TVs.
                      </p>
                    </div>
                  </div>

                  <a
                    href="/api/iptv/playlist.m3u"
                    download="apex_tv_network_channels.m3u"
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg transition-all"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download .M3U File</span>
                  </a>
                </div>
              </div>

              {/* Streaming Links Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. M3U Playlist Live URL */}
                <div className="bg-slate-950/80 rounded-2xl p-4 border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-2">
                      <Tv className="w-4 h-4 text-purple-400" />
                      <span>Live M3U Playlist URL (Auto-Updating)</span>
                    </span>
                    <span className="text-[10px] text-emerald-400 font-mono font-bold">24/7 DYNAMIC</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Paste this single URL into your IPTV player or app. It loads all 4 active linear channels plus the Master PGM screen automatically.
                  </p>
                  <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl p-1.5 focus-within:border-purple-500">
                    <input
                      type="text"
                      readOnly
                      value={typeof window !== 'undefined' ? `${window.location.origin}/api/iptv/playlist.m3u` : '/api/iptv/playlist.m3u'}
                      className="w-full bg-transparent px-2 text-xs font-mono text-purple-300 focus:outline-none"
                    />
                    <button
                      onClick={() =>
                        copyToClipboard(
                          typeof window !== 'undefined' ? `${window.location.origin}/api/iptv/playlist.m3u` : '/api/iptv/playlist.m3u',
                          'm3u_url'
                        )
                      }
                      className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800 transition-colors shrink-0"
                      title="Copy M3U URL"
                    >
                      {copiedField === 'm3u_url' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* 2. Public Web TV Link */}
                <div className="bg-slate-950/80 rounded-2xl p-4 border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-2">
                      <Globe className="w-4 h-4 text-emerald-400" />
                      <span>Public Web TV Link (Audience Browser)</span>
                    </span>
                    <span className="text-[10px] text-purple-400 font-mono font-bold">WEB AUDIENCE</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Direct web link for viewers on PC, tablet, or mobile browser to stream the live channel with full TV player &amp; real-time ticker.
                  </p>
                  <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl p-1.5 focus-within:border-emerald-500">
                    <input
                      type="text"
                      readOnly
                      value={typeof window !== 'undefined' ? `${window.location.origin}/?view=public_tv&channel=${activeChannel.channelId}` : '/?view=public_tv'}
                      className="w-full bg-transparent px-2 text-xs font-mono text-emerald-300 focus:outline-none"
                    />
                    <button
                      onClick={() =>
                        copyToClipboard(
                          typeof window !== 'undefined' ? `${window.location.origin}/?view=public_tv&channel=${activeChannel.channelId}` : '/?view=public_tv',
                          'public_web_url'
                        )
                      }
                      className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800 transition-colors shrink-0"
                      title="Copy Public Web TV URL"
                    >
                      {copiedField === 'public_web_url' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Active Channels Ingest & Playback Table */}
              <div className="bg-slate-950/80 rounded-2xl border border-slate-800 overflow-hidden shadow-lg">
                <div className="px-5 py-3.5 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between">
                  <h5 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Layers className="w-4 h-4 text-purple-400" />
                    <span>Included Active Broadcast Channels in Playlist</span>
                  </h5>
                  <span className="text-[11px] font-mono text-slate-400">{channels.length} Total Feeds</span>
                </div>

                <div className="divide-y divide-slate-800/80 text-xs">
                  {channels.map((ch) => {
                    const currentProg = ch.programs?.find((p) => {
                      const now = Date.now();
                      return now >= p.startTime && now <= p.endTime;
                    }) || ch.programs?.[0];

                    const feedUrl = currentProg?.streamUrl?.startsWith('http')
                      ? currentProg.streamUrl
                      : typeof window !== 'undefined'
                      ? `${window.location.origin}${currentProg?.streamUrl || '/master_broadcast_feed.mp4'}`
                      : '/master_broadcast_feed.mp4';

                    return (
                      <div key={ch.channelId} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-slate-900/40 transition-colors">
                        <div className="flex items-center gap-3">
                          <span className="w-10 h-10 rounded-xl bg-purple-950/60 border border-purple-800/70 font-mono text-purple-300 font-bold flex items-center justify-center shrink-0">
                            {ch.channelNumber}
                          </span>
                          <div>
                            <div className="font-bold text-white flex items-center gap-2">
                              <span>{ch.channelName}</span>
                              <span className="text-[10px] font-mono text-slate-400 bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded">
                                {ch.callSign}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              Current Program: <strong className="text-slate-300">{currentProg?.title || 'Continuous 24/7 Playout'}</strong>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            readOnly
                            value={feedUrl}
                            className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-[11px] font-mono text-slate-300 w-64 md:w-80 truncate focus:outline-none"
                          />
                          <button
                            onClick={() => copyToClipboard(feedUrl, `ch_${ch.channelId}`)}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
                            title="Copy Channel Feed URL"
                          >
                            {copiedField === `ch_${ch.channelId}` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Instructions Guide */}
              <div className="bg-slate-950/60 rounded-2xl p-5 border border-slate-800 space-y-3">
                <h5 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>How to Load into External IPTV Players</span>
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-300">
                  <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800/80 space-y-1.5">
                    <strong className="text-white block">1. VLC Media Player (PC/Mac)</strong>
                    <p className="text-[11px] text-slate-400">
                      Open VLC &gt; <em>Media</em> &gt; <em>Open Network Stream</em> (Ctrl+N) &gt; Paste M3U URL &gt; Click <em>Play</em>. Access channel list via View &gt; Playlist.
                    </p>
                  </div>
                  <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800/80 space-y-1.5">
                    <strong className="text-white block">2. TiviMate / Smart IPTV (Android TV)</strong>
                    <p className="text-[11px] text-slate-400">
                      Add Playlist &gt; Select <em>M3U Playlist</em> &gt; Paste the dynamic M3U URL &gt; Complete setup. Channels map with full EPG program tags.
                    </p>
                  </div>
                  <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800/80 space-y-1.5">
                    <strong className="text-white block">3. Kodi Media Center</strong>
                    <p className="text-[11px] text-slate-400">
                      Install <em>PVR IPTV Simple Client</em> Add-on &gt; Configure <em>M3U Play List Path</em> to Remote URL &gt; Enter M3U URL &gt; Restart Kodi.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =================================================================== */}
          {/* TAB: DIRECT USB FLASH DRIVE, EXTERNAL HDD & LOCAL DISK PLAYOUT     */}
          {/* =================================================================== */}
          {activeTab === 'usb-storage' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-cyan-950/40 border border-cyan-600/50 rounded-2xl p-5 space-y-3 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-cyan-600/30 border border-cyan-500/50 flex items-center justify-center text-cyan-300">
                      <Usb className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                        <span>Zero-Upload Direct USB &amp; External Storage Playout</span>
                        <span className="text-[10px] bg-cyan-950 text-cyan-300 border border-cyan-700 px-2 py-0.5 rounded font-mono font-bold">
                          ZERO SERVER LOAD
                        </span>
                      </h4>
                      <p className="text-xs text-cyan-200/80 mt-0.5">
                        Play high-bitrate 4K/8K, MP4, MOV, and MKV files directly from any connected USB thumb drive, external hard drive, or SSD without uploading gigabytes over the internet.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = 'video/*,.mkv,.mp4,.mov,.ts,.webm';
                      input.onchange = (e: any) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const blobUrl = URL.createObjectURL(file);
                          assignVideoToChannel(activeChannel.channelId, {
                            title: file.name,
                            streamUrl: blobUrl,
                            durationMinutes: 60,
                            category: 'External USB Playout',
                            description: `Direct memory broadcast from mounted disk (${(file.size / (1024 * 1024 * 1024)).toFixed(2)} GB).`,
                          }, true);
                          setViewingMode('linear');
                          setIsControlRoomOpen(false);
                        }
                      };
                      input.click();
                    }}
                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg transition-all shrink-0"
                  >
                    <FolderOpen className="w-4 h-4" />
                    <span>Select File From USB / Disk</span>
                  </button>
                </div>
              </div>

              {/* Technical Architecture Explanation */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 text-cyan-400 font-bold">
                    <Zap className="w-4 h-4" />
                    <span>Zero Bandwidth &amp; No Upload</span>
                  </div>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    Uses local browser memory pointers (`URL.createObjectURL`). Even a 50 GB 4K video starts broadcasting instantaneously with zero cloud server upload time or proxy limits.
                  </p>
                </div>

                <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Universal Container Support</span>
                  </div>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    Broadcasts MP4, MKV, MOV, Apple ProRes, and MPEG-TS containers. The native HTML5 MSE pipeline buffers frames seamlessly with zero frame drops.
                  </p>
                </div>

                <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 text-purple-400 font-bold">
                    <Radio className="w-4 h-4" />
                    <span>Direct On-Air Transmission</span>
                  </div>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    Assigns the local video file instantly to Channel 101, 102, 103, or 104. The on-air playout engine cuts over smoothly with full lower-third ticker overlay.
                  </p>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

        {/* Footer */}
        <div className="bg-slate-950 px-4 sm:px-6 py-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <div className="flex items-center gap-2 font-mono">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Apex Broadcast Playout Engine v3.4 · Real-time SRT & SCTE-35</span>
            <span className="sm:hidden">Apex Engine v3.4</span>
          </div>

          <button
            onClick={() => setIsControlRoomOpen(false)}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded transition-colors"
          >
            Close Console
          </button>
        </div>
      </div>
  );

  if (dockMode === 'side-dock') {
    return (
      <aside
        aria-label="Broadcast Control Room Docked Panel"
        className="fixed top-0 right-0 bottom-0 w-full sm:w-[580px] lg:w-[680px] xl:w-[740px] z-50 bg-slate-900 border-l border-slate-700 shadow-2xl flex flex-col animate-slideLeft"
      >
        {content}
      </aside>
    );
  }

  if (dockMode === 'fullscreen') {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col shadow-2xl animate-fadeIn">
        {content}
      </div>
    );
  }

  // Centered modal
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
      <div className="w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden rounded-xl">
        {content}
      </div>
    </div>
  );
};
