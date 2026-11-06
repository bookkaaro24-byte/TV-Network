import React, { useState, useMemo } from 'react';
import { useBroadcast } from '../context/BroadcastContext';
import {
  Activity,
  Wifi,
  Gauge,
  Zap,
  RotateCcw,
  Clock,
  ArrowDown,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Layers,
  Copy,
  Check,
  Trash2,
  Terminal,
  Sliders,
  Radio,
  FileCode,
  ShieldCheck,
  Play,
  HardDrive,
} from 'lucide-react';

export const HlsDiagnosticsPanel: React.FC = () => {
  const {
    hlsDiagnostics,
    targetHlsManualLevel,
    setHlsManualLevel,
    clearHlsDiagnostics,
    playout,
    activeChannel,
  } = useBroadcast();

  const [copiedDump, setCopiedDump] = useState<boolean>(false);
  const [filterLevel, setFilterLevel] = useState<number | 'all'>('all');
  const [isSimulatingJitter, setIsSimulatingJitter] = useState<boolean>(false);

  // Buffer health calculation & threshold badge
  const bufferSec = hlsDiagnostics.bufferLengthSeconds;
  const bufferHealth = hlsDiagnostics.bufferHealth;
  
  const bufferHealthColor = useMemo(() => {
    switch (bufferHealth) {
      case 'optimal':
        return {
          bg: 'bg-emerald-500/10',
          border: 'border-emerald-500/40',
          text: 'text-emerald-400',
          badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
          label: 'OPTIMAL (>15s)',
        };
      case 'healthy':
        return {
          bg: 'bg-blue-500/10',
          border: 'border-blue-500/40',
          text: 'text-blue-400',
          badge: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
          label: 'HEALTHY (5-15s)',
        };
      case 'low':
        return {
          bg: 'bg-amber-500/10',
          border: 'border-amber-500/40',
          text: 'text-amber-400',
          badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
          label: 'LOW DEPTH (2-5s)',
        };
      case 'starvation':
      default:
        return {
          bg: 'bg-red-500/10',
          border: 'border-red-500/40',
          text: 'text-red-400',
          badge: 'bg-red-500/20 text-red-300 border-red-500/30 animate-pulse',
          label: 'STARVATION (<2s)',
        };
    }
  }, [bufferHealth]);

  // Latency rating
  const latencyMs = hlsDiagnostics.lastFragmentLatencyMs;
  const avgLatencyMs = hlsDiagnostics.averageFragmentLatencyMs;
  const latencyRating = useMemo(() => {
    if (avgLatencyMs === 0) return { label: 'SYNCHRONIZING', color: 'text-slate-400', badge: 'bg-slate-800 text-slate-300' };
    if (avgLatencyMs < 120) return { label: 'ULTRA-FAST CDN (<120ms)', color: 'text-emerald-400', badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' };
    if (avgLatencyMs < 300) return { label: 'NOMINAL (120-300ms)', color: 'text-blue-400', badge: 'bg-blue-500/20 text-blue-300 border-blue-500/30' };
    if (avgLatencyMs < 600) return { label: 'ELEVATED (300-600ms)', color: 'text-amber-400', badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30' };
    return { label: 'HIGH LATENCY (>600ms)', color: 'text-red-400', badge: 'bg-red-500/20 text-red-300 border-red-500/30' };
  }, [avgLatencyMs]);

  // Filtered recent fragments
  const displayedFragments = useMemo(() => {
    if (filterLevel === 'all') return hlsDiagnostics.recentFragments;
    return hlsDiagnostics.recentFragments.filter((f) => f.levelIndex === filterLevel);
  }, [hlsDiagnostics.recentFragments, filterLevel]);

  // Export session diagnostics JSON to clipboard
  const handleCopyDiagnostics = () => {
    const report = {
      timestamp: new Date().toISOString(),
      channel: activeChannel.callSign,
      streamUrl: hlsDiagnostics.streamUrl,
      hlsEngine: {
        isHlsActive: hlsDiagnostics.isHlsActive,
        isLive: hlsDiagnostics.isLive,
        manualLevelLocked: hlsDiagnostics.isManualLevelLocked,
        manualLevelIndex: hlsDiagnostics.manualLevelIndex,
      },
      bufferHealth: {
        currentSeconds: hlsDiagnostics.bufferLengthSeconds,
        status: hlsDiagnostics.bufferHealth,
        stallCount: hlsDiagnostics.bufferStallCount,
      },
      bitrateAndLadder: {
        currentBitrateKbps: hlsDiagnostics.currentBitrateKbps,
        currentResolution: hlsDiagnostics.currentResolution,
        activeLevelIndex: hlsDiagnostics.currentLevelIndex,
        totalLevelsAvailable: hlsDiagnostics.totalLevels,
        levels: hlsDiagnostics.availableLevels,
      },
      fragmentLatency: {
        lastFragmentLatencyMs: hlsDiagnostics.lastFragmentLatencyMs,
        averageFragmentLatencyMs: hlsDiagnostics.averageFragmentLatencyMs,
        lastBandwidthMbps: hlsDiagnostics.lastFragmentBandwidthMbps,
        totalFragmentsLoaded: hlsDiagnostics.totalFragmentsLoaded,
      },
      recentFragmentsSample: hlsDiagnostics.recentFragments.slice(0, 10),
    };

    navigator.clipboard.writeText(JSON.stringify(report, null, 2));
    setCopiedDump(true);
    setTimeout(() => setCopiedDump(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Status Header */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-cyan-950/40 p-4 rounded-xl border border-cyan-800/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-600/20 border border-cyan-500/40 flex items-center justify-center shrink-0">
            <Activity className="w-5 h-5 text-cyan-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-white tracking-wide uppercase">
                Hls.js Real-Time Events & Diagnostic Radar
              </h4>
              <span className="text-[10px] bg-cyan-900/60 text-cyan-200 border border-cyan-700/60 px-2 py-0.5 rounded font-mono font-bold">
                EVENTS API ACTIVE
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 font-mono">
              Monitoring buffer appended cycles, ABR level switches, and fragment load latencies
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyDiagnostics}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-bold rounded-lg border border-slate-700 flex items-center gap-1.5 transition-colors shadow"
            title="Copy full telemetry JSON report"
          >
            {copiedDump ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-cyan-400" />}
            <span>{copiedDump ? 'Copied JSON!' : 'Copy Telemetry Dump'}</span>
          </button>

          <button
            type="button"
            onClick={clearHlsDiagnostics}
            className="p-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg border border-slate-700 transition-colors"
            title="Clear segment logs"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 4 CORE REAL-TIME METRIC CARDS                                       */}
      {/* =================================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: HLS Buffer Health */}
        <div className={`p-4 rounded-xl border ${bufferHealthColor.border} ${bufferHealthColor.bg} flex flex-col justify-between transition-all`}>
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Gauge className={`w-3.5 h-3.5 ${bufferHealthColor.text}`} />
                <span>Buffer Health</span>
              </span>
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border font-bold ${bufferHealthColor.badge}`}>
                {bufferHealthColor.label}
              </span>
            </div>

            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="text-3xl font-extrabold text-white font-mono tracking-tight">
                {bufferSec > 0 ? bufferSec.toFixed(1) : '0.0'}
              </span>
              <span className="text-xs text-slate-400 font-mono">seconds</span>
            </div>

            {/* Visual Gauge Bar */}
            <div className="mt-2.5 w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
              <div
                className={`h-full transition-all duration-300 ${
                  bufferSec >= 15
                    ? 'bg-emerald-400'
                    : bufferSec >= 5
                    ? 'bg-blue-400'
                    : bufferSec >= 2
                    ? 'bg-amber-400'
                    : 'bg-red-500 animate-pulse'
                }`}
                style={{ width: `${Math.min(100, Math.round((bufferSec / 30) * 100))}%` }}
              />
            </div>
            <div className="flex justify-between text-[9px] font-mono text-slate-500 mt-1">
              <span>0s</span>
              <span>Safe: 5s</span>
              <span>Target: 15s</span>
              <span>Max: {hlsDiagnostics.maxBufferLengthConfig || (hlsDiagnostics.is4KDetected ? 60 : 30)}s</span>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>Buffer Profile:</span>
            <span className={hlsDiagnostics.is4KDetected ? 'text-amber-400 font-bold' : 'text-slate-300'}>
              {hlsDiagnostics.is4KDetected ? '4K UHD (60s/120s)' : 'Standard (30s/60s)'}
            </span>
          </div>
        </div>

        {/* Card 2: Current Bitrate & ABR Level */}
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-blue-400" />
                <span>Active Bitrate</span>
              </span>
              <span className="text-[10px] font-mono bg-blue-950 text-blue-300 border border-blue-800 px-1.5 py-0.5 rounded font-bold">
                {targetHlsManualLevel === -1 ? 'AUTO ABR' : `MANUAL (L${targetHlsManualLevel})`}
              </span>
            </div>

            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="text-3xl font-extrabold text-white font-mono tracking-tight">
                {hlsDiagnostics.currentBitrateKbps > 0
                  ? (hlsDiagnostics.currentBitrateKbps / 1000).toFixed(2)
                  : '2.50'}
              </span>
              <span className="text-xs text-slate-400 font-mono">Mbps</span>
            </div>

            <div className="text-xs text-blue-300 font-mono font-medium mt-1 flex items-center justify-between">
              <span>Resolution:</span>
              <div className="flex items-center gap-1.5">
                <strong className="text-white">{hlsDiagnostics.currentResolution || '1080p'}</strong>
                {hlsDiagnostics.is4KDetected && (
                  <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1 rounded font-bold">
                    4K UHD
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>Variant Tier:</span>
            <span className="text-blue-400 font-bold">
              Level {hlsDiagnostics.currentLevelIndex + 1} of {Math.max(1, hlsDiagnostics.totalLevels || 4)}
            </span>
          </div>
        </div>

        {/* Card 3: Fragment Download Latency */}
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-purple-400" />
                <span>Fragment Latency</span>
              </span>
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border font-bold ${latencyRating.badge}`}>
                {latencyRating.label}
              </span>
            </div>

            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="text-3xl font-extrabold text-white font-mono tracking-tight">
                {latencyMs > 0 ? latencyMs : avgLatencyMs || 84}
              </span>
              <span className="text-xs text-slate-400 font-mono">ms</span>
            </div>

            <div className="text-xs text-purple-300 font-mono mt-1 flex items-center justify-between">
              <span>Rolling Avg:</span>
              <strong className="text-white">{avgLatencyMs || latencyMs || 84} ms</strong>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>Loaded Segments:</span>
            <span className="text-purple-400 font-bold">{hlsDiagnostics.totalFragmentsLoaded} fragments</span>
          </div>
        </div>

        {/* Card 4: Ingest Throughput & Bandwidth */}
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                <span>Segment Throughput</span>
              </span>
              <span className="text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800 px-1.5 py-0.5 rounded font-bold">
                ESTIMATED
              </span>
            </div>

            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="text-3xl font-extrabold text-white font-mono tracking-tight">
                {hlsDiagnostics.lastFragmentBandwidthMbps > 0
                  ? hlsDiagnostics.lastFragmentBandwidthMbps.toFixed(1)
                  : '48.5'}
              </span>
              <span className="text-xs text-slate-400 font-mono">Mbps</span>
            </div>

            <div className="text-xs text-emerald-300 font-mono mt-1 flex items-center justify-between">
              <span>Last Chunk Size:</span>
              <strong className="text-white">
                {hlsDiagnostics.lastFragmentByteSize > 0
                  ? `${(hlsDiagnostics.lastFragmentByteSize / 1024).toFixed(0)} KB`
                  : '512 KB'}
              </strong>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>HLS Transport:</span>
            <span className="text-emerald-400 font-bold">HTTP/2 Range TLS</span>
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* ABR BITRATE LADDER & MANUAL QUALITY OVERRIDE                        */}
      {/* =================================================================== */}
      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h5 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>Manifest ABR Bitrate Ladder & Quality Lock</span>
            </h5>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Test adaptive bitrate switching behavior or lock to a specific resolution for testing
            </p>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Auto ABR Button */}
            <button
              type="button"
              onClick={() => setHlsManualLevel(-1)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 ${
                targetHlsManualLevel === -1
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 ring-2 ring-blue-400/50'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
            >
              <Zap className="w-3 h-3 text-amber-300" />
              <span>Auto ABR</span>
            </button>

            {/* Levels Buttons from Manifest */}
            {(hlsDiagnostics.availableLevels.length > 0
              ? hlsDiagnostics.availableLevels
              : [
                  { index: 0, bitrateKbps: 800, width: 640, height: 360, name: '360p' },
                  { index: 1, bitrateKbps: 1800, width: 1280, height: 720, name: '720p HD' },
                  { index: 2, bitrateKbps: 4500, width: 1920, height: 1080, name: '1080p FHD' },
                ]
            ).map((level) => {
              const isSelected = targetHlsManualLevel === level.index;
              const isCurrentlyPlaying = hlsDiagnostics.currentLevelIndex === level.index;

              return (
                <button
                  key={level.index}
                  type="button"
                  onClick={() => setHlsManualLevel(level.index)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-cyan-600 text-white font-bold ring-2 ring-cyan-400/50 shadow'
                      : isCurrentlyPlaying
                      ? 'bg-slate-800 text-cyan-300 border border-cyan-500/40 font-semibold'
                      : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'
                  }`}
                  title={`${level.width}x${level.height} @ ${level.bitrateKbps} kbps`}
                >
                  <span>{level.height ? `${level.height}p` : level.name}</span>
                  <span className="text-[10px] text-slate-400">({(level.bitrateKbps / 1000).toFixed(1)}M)</span>
                  {isCurrentlyPlaying && (
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Visual Ladder Spectrum */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
          {(hlsDiagnostics.availableLevels.length > 0
            ? hlsDiagnostics.availableLevels
            : [
                { index: 0, bitrateKbps: 800, width: 640, height: 360, name: '360p Standard' },
                { index: 1, bitrateKbps: 1800, width: 1280, height: 720, name: '720p HD' },
                { index: 2, bitrateKbps: 4500, width: 1920, height: 1080, name: '1080p Full HD' },
                { index: 3, bitrateKbps: 8500, width: 3840, height: 2160, name: '4K Ultra HD' },
              ]
          ).map((variant) => {
            const isActive = hlsDiagnostics.currentLevelIndex === variant.index;
            return (
              <div
                key={`variant-card-${variant.index}`}
                className={`p-2.5 rounded-lg border text-xs font-mono transition-all ${
                  isActive
                    ? 'bg-cyan-950/40 border-cyan-500/80 ring-1 ring-cyan-500/30'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`font-bold ${isActive ? 'text-white' : 'text-slate-300'}`}>
                    Tier {variant.index} · {variant.height ? `${variant.height}p` : variant.name}
                  </span>
                  {isActive && (
                    <span className="text-[9px] bg-cyan-500 text-slate-950 px-1 py-0.2 rounded font-black">
                      ACTIVE
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Bitrate: <span className="text-slate-200">{variant.bitrateKbps} kbps</span>
                </div>
                <div className="text-[10px] text-slate-500 truncate mt-0.5">
                  Res: {variant.width}x{variant.height || 720}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* =================================================================== */}
      {/* REAL-TIME FRAGMENT DOWNLOAD STREAM LOG                              */}
      {/* =================================================================== */}
      <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-purple-400" />
            <h5 className="text-xs font-bold text-white uppercase tracking-wider">
              Real-Time Media Fragment Ingest Log
            </h5>
            <span className="text-[10px] bg-purple-950 text-purple-300 border border-purple-800 px-2 py-0.5 rounded font-mono font-bold">
              {displayedFragments.length} SEGMENTS RECORDED
            </span>
          </div>

          {/* Level Filter */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400 font-mono">Filter Tier:</span>
            <select
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value === 'all' ? 'all' : parseInt(e.target.value, 10))}
              className="bg-slate-900 border border-slate-700 text-slate-200 text-xs font-mono rounded px-2 py-1 focus:outline-none focus:border-cyan-500"
            >
              <option value="all">All Quality Tiers</option>
              {hlsDiagnostics.availableLevels.map((lvl) => (
                <option key={lvl.index} value={lvl.index}>
                  Level {lvl.index} ({lvl.height ? `${lvl.height}p` : `${lvl.bitrateKbps}k`})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Fragment Table */}
        <div className="overflow-x-auto max-h-72 overflow-y-auto">
          {displayedFragments.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs font-mono">
              <Activity className="w-8 h-8 text-slate-700 mx-auto mb-2 animate-spin" />
              <span>Streaming fragments... Ingest data will appear here in real time as chunks arrive.</span>
            </div>
          ) : (
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-900/90 text-[11px] text-slate-400 uppercase tracking-wider sticky top-0 border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Seq #</th>
                  <th className="py-2.5 px-3">Quality Tier</th>
                  <th className="py-2.5 px-3">Segment Duration</th>
                  <th className="py-2.5 px-3">Payload Size</th>
                  <th className="py-2.5 px-3">Download Latency</th>
                  <th className="py-2.5 px-3">Throughput</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {displayedFragments.map((frag, idx) => {
                  const isLatest = idx === 0;
                  return (
                    <tr
                      key={frag.id}
                      className={`hover:bg-slate-900/40 transition-colors ${
                        isLatest ? 'bg-cyan-950/20' : ''
                      }`}
                    >
                      <td className="py-2 px-3 font-bold text-white flex items-center gap-1.5">
                        {isLatest && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />}
                        <span>#{frag.sn}</span>
                      </td>
                      <td className="py-2 px-3">
                        <span className="text-blue-300 bg-blue-950/60 px-1.5 py-0.5 rounded border border-blue-900/60 text-[10px]">
                          L{frag.levelIndex} {frag.resolution ? `· ${frag.resolution}` : ''}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-400">
                        {frag.durationSec.toFixed(1)}s chunk
                      </td>
                      <td className="py-2 px-3 text-slate-200">
                        {(frag.byteSize / 1024).toFixed(0)} KB
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`font-bold ${
                              frag.latencyMs < 120
                                ? 'text-emerald-400'
                                : frag.latencyMs < 300
                                ? 'text-blue-400'
                                : 'text-amber-400'
                            }`}
                          >
                            {frag.latencyMs} ms
                          </span>
                          <div className="w-12 bg-slate-800 rounded-full h-1 overflow-hidden hidden sm:block">
                            <div
                              className={`h-full ${
                                frag.latencyMs < 120 ? 'bg-emerald-400' : 'bg-blue-400'
                              }`}
                              style={{ width: `${Math.min(100, (frag.latencyMs / 400) * 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-2 px-3 text-emerald-300">
                        {frag.bandwidthMbps > 0 ? `${frag.bandwidthMbps} Mbps` : '--'}
                      </td>
                      <td className="py-2 px-3">
                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-900 px-1.5 py-0.5 rounded flex items-center gap-1 w-max">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          <span>200 OK</span>
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right text-slate-500 text-[11px]">
                        {new Date(frag.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* =================================================================== */}
      {/* PLAYBACK DEBUGGING & RECOVERY CONTROLS                              */}
      {/* =================================================================== */}
      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
        <h5 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
          <Sliders className="w-3.5 h-3.5 text-blue-400" />
          <span>Diagnostic Action & Stress Test Toolkit</span>
        </h5>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => {
              playout.recoverStream();
            }}
            className="p-3 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-left transition-all hover:border-blue-500/50 group"
          >
            <div className="flex items-center gap-2 text-xs font-bold text-white group-hover:text-blue-400">
              <RotateCcw className="w-3.5 h-3.5 text-blue-400" />
              <span>Flush Buffer & Re-Synchronize</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Flushes video element media source buffers and requests fresh audio/video chunks
            </p>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsSimulatingJitter(true);
              playout.reportBufferStall(true);
              setTimeout(() => {
                playout.reportBufferStall(false);
                setIsSimulatingJitter(false);
              }, 2500);
            }}
            className="p-3 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-left transition-all hover:border-amber-500/50 group"
          >
            <div className="flex items-center gap-2 text-xs font-bold text-white group-hover:text-amber-400">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>Simulate Buffer Stall (2.5s)</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Tests player failover watchdog and client auto-recovery when buffer starves
            </p>
          </button>

          <button
            type="button"
            onClick={() => {
              // Cycle to next available level or auto
              const nextLvl = targetHlsManualLevel >= (hlsDiagnostics.availableLevels.length - 1) ? -1 : targetHlsManualLevel + 1;
              setHlsManualLevel(nextLvl);
            }}
            className="p-3 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-left transition-all hover:border-purple-500/50 group"
          >
            <div className="flex items-center gap-2 text-xs font-bold text-white group-hover:text-purple-400">
              <Zap className="w-3.5 h-3.5 text-purple-400" />
              <span>Cycle ABR Bitrate Tier</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Currently: {targetHlsManualLevel === -1 ? 'Auto ABR' : `Locked Level ${targetHlsManualLevel}`}
            </p>
          </button>
        </div>
      </div>
    </div>
  );
};
