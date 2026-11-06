/**
 * SrtLatencyJitterPanel - Real-Time SRT Ingest Feed Health & Jitter Telemetry
 * Visualizes latency and jitter of incoming SRT broadcast ingest using high-fidelity sparkline graphs.
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useBroadcast } from '../context/BroadcastContext';
import {
  Activity,
  Zap,
  Radio,
  ArrowDownRight,
  ArrowUpRight,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  Clock,
  Wifi,
  Sliders,
  Download,
  Copy,
  Check,
} from 'lucide-react';
import { SrtIngestHealthMetrics, SrtHealthSample } from '../types/broadcast';

export const SrtLatencyJitterPanel: React.FC = () => {
  const { playout } = useBroadcast();

  // 30 rolling samples for real-time sparkline graph
  const [history, setHistory] = useState<SrtHealthSample[]>(() => {
    const initial: SrtHealthSample[] = [];
    const now = Date.now();
    for (let i = 29; i >= 0; i--) {
      const baseLat = 26 + Math.sin(i / 3) * 6;
      const baseJit = 2.1 + Math.cos(i / 2) * 0.8;
      initial.push({
        timestamp: now - i * 1000,
        latencyMs: Math.round(baseLat * 10) / 10,
        jitterMs: Math.round(baseJit * 10) / 10,
        packetLossPercent: 0,
        rttMs: Math.round(baseLat * 0.7),
        bitrateKbps: 6400 + Math.round(Math.sin(i) * 200),
        bufferDepthMs: 120,
      });
    }
    return initial;
  });

  const [isSimulatingSpike, setIsSimulatingSpike] = useState(false);
  const [targetLatencyPreset, setTargetLatencyPreset] = useState<'ultra-low' | 'balanced' | 'safe'>('ultra-low');
  const [isCopied, setIsCopied] = useState(false);

  // Interval updating real-time telemetry
  useEffect(() => {
    const timer = setInterval(() => {
      setHistory((prev) => {
        const last = prev[prev.length - 1];
        let latTarget = targetLatencyPreset === 'ultra-low' ? 24 : targetLatencyPreset === 'balanced' ? 45 : 85;
        let jitterTarget = 2.0;

        if (isSimulatingSpike) {
          latTarget += 45 + Math.random() * 30;
          jitterTarget += 6.5 + Math.random() * 4;
        } else {
          latTarget += (Math.random() - 0.5) * 8;
          jitterTarget += (Math.random() - 0.5) * 1.2;
        }

        const newSample: SrtHealthSample = {
          timestamp: Date.now(),
          latencyMs: Math.max(12, Math.round(latTarget * 10) / 10),
          jitterMs: Math.max(0.4, Math.round(jitterTarget * 10) / 10),
          packetLossPercent: isSimulatingSpike ? 0.8 : 0.0,
          rttMs: Math.round(latTarget * 0.72),
          bitrateKbps: 6420 + Math.round((Math.random() - 0.5) * 350),
          bufferDepthMs: isSimulatingSpike ? 60 : 120,
        };

        return [...prev.slice(1), newSample];
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isSimulatingSpike, targetLatencyPreset]);

  // Derived metrics
  const current = history[history.length - 1] || {
    latencyMs: 25.4,
    jitterMs: 1.8,
    packetLossPercent: 0,
    rttMs: 18,
    bitrateKbps: 6420,
    bufferDepthMs: 120,
  };

  const latencies = history.map((h) => h.latencyMs);
  const jitters = history.map((h) => h.jitterMs);

  const minLat = Math.min(...latencies);
  const maxLat = Math.max(...latencies);
  const avgLat = Math.round((latencies.reduce((a, b) => a + b, 0) / latencies.length) * 10) / 10;

  const minJit = Math.min(...jitters);
  const maxJit = Math.max(...jitters);
  const avgJit = Math.round((jitters.reduce((a, b) => a + b, 0) / jitters.length) * 10) / 10;

  // Determine health status
  const status: 'optimal' | 'stable' | 'jitter_spike' | 'packet_loss' = useMemo(() => {
    if (current.packetLossPercent > 0.4) return 'packet_loss';
    if (current.jitterMs > 5.0 || current.latencyMs > 60) return 'jitter_spike';
    if (current.latencyMs < 35 && current.jitterMs < 3.0) return 'optimal';
    return 'stable';
  }, [current]);

  // Generate SVG Sparkline Path
  const generateSparklinePath = (values: number[], width: number, height: number, minVal: number, maxVal: number) => {
    if (values.length === 0) return '';
    const range = maxVal - minVal || 1;
    const padding = 6;
    const usableHeight = height - padding * 2;

    const points = values.map((val, idx) => {
      const x = (idx / (values.length - 1)) * width;
      const normalized = (val - minVal) / range;
      const y = height - padding - normalized * usableHeight;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    return `M ${points.join(' L ')}`;
  };

  const generateSparklineArea = (values: number[], width: number, height: number, minVal: number, maxVal: number) => {
    if (values.length === 0) return '';
    const path = generateSparklinePath(values, width, height, minVal, maxVal);
    return `${path} L ${width},${height} L 0,${height} Z`;
  };

  const handleCopyReport = () => {
    const text = `=== SRT INGEST HEALTH REPORT ===
Status: ${status.toUpperCase()}
Endpoint: srt://ingest-east.apex-tv.live:10000?mode=caller&latency=2000000
Current Latency: ${current.latencyMs} ms (Avg: ${avgLat} ms, Min: ${minLat} ms, Max: ${maxLat} ms)
Current Jitter: ${current.jitterMs} ms (Avg: ${avgJit} ms, Min: ${minJit} ms, Max: ${maxJit} ms)
Packet Loss: ${current.packetLossPercent}%
RTT: ${current.rttMs} ms
Bitrate: ${(current.bitrateKbps / 1000).toFixed(2)} Mbps
Buffer Depth: ${current.bufferDepthMs} ms
Timestamp: ${new Date().toISOString()}`;

    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="space-y-6 animate-fadeIn text-slate-100">
      {/* Top Header & Health Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-slate-950/70 border border-slate-800 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-cyan-600/20 border border-cyan-500/40 flex items-center justify-center">
            <Activity className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-tight">SRT Ingest Latency & Jitter Telemetry</h3>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border ${
                  status === 'optimal'
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                    : status === 'stable'
                    ? 'bg-blue-500/20 text-blue-400 border-blue-500/40'
                    : status === 'jitter_spike'
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 animate-pulse'
                    : 'bg-red-500/20 text-red-400 border-red-500/40 animate-bounce'
                }`}
              >
                ● {status.replace('_', ' ')}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Live caller-mode socket metrics for incoming sports & live stadium ingest
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsSimulatingSpike((prev) => !prev)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              isSimulatingSpike
                ? 'bg-amber-950/80 border-amber-500/60 text-amber-300'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 inline mr-1 text-amber-400" />
            {isSimulatingSpike ? 'Stop Jitter Spike' : 'Simulate Jitter Spike'}
          </button>

          <button
            onClick={handleCopyReport}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg text-xs font-semibold text-slate-300 hover:text-white transition-colors"
          >
            {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
            <span>{isCopied ? 'Copied' : 'Copy Report'}</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Grid (4 Metrics Cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Latency Card */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Glass-to-Glass Latency</span>
            <Wifi className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black font-mono text-cyan-300">{current.latencyMs}</span>
            <span className="text-xs text-slate-400 font-mono">ms</span>
          </div>
          <div className="text-[11px] text-slate-500 flex justify-between font-mono">
            <span>Min: {minLat}ms</span>
            <span>Avg: {avgLat}ms</span>
            <span>Max: {maxLat}ms</span>
          </div>
        </div>

        {/* Jitter Card */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Packet Jitter</span>
            <Activity className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black font-mono text-amber-300">{current.jitterMs}</span>
            <span className="text-xs text-slate-400 font-mono">ms</span>
          </div>
          <div className="text-[11px] text-slate-500 flex justify-between font-mono">
            <span>Min: {minJit}ms</span>
            <span>Avg: {avgJit}ms</span>
            <span>Max: {maxJit}ms</span>
          </div>
        </div>

        {/* Packet Loss & RTT */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Packet Loss / RTT</span>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className={`text-2xl font-black font-mono ${current.packetLossPercent > 0 ? 'text-red-400' : 'text-emerald-300'}`}>
              {current.packetLossPercent.toFixed(2)}%
            </span>
            <span className="text-xs text-slate-400 font-mono">/ {current.rttMs}ms RTT</span>
          </div>
          <div className="text-[11px] text-slate-500 font-mono">
            ARQ Retransmit: 0 unrecovered
          </div>
        </div>

        {/* Bitrate & Buffer */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Ingest Bitrate</span>
            <Zap className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black font-mono text-purple-300">
              {(current.bitrateKbps / 1000).toFixed(2)}
            </span>
            <span className="text-xs text-slate-400 font-mono">Mbps</span>
          </div>
          <div className="text-[11px] text-slate-500 font-mono">
            Buffer: {current.bufferDepthMs}ms socket depth
          </div>
        </div>
      </div>

      {/* Real-Time Dual Sparkline Graphs */}
      <div className="space-y-4">
        {/* 1. Latency Sparkline */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
              <span className="font-bold text-white tracking-wide">Glass-to-Glass Latency Sparkline (Rolling 30s)</span>
            </div>
            <span className="font-mono text-cyan-400 font-bold">{current.latencyMs} ms current</span>
          </div>

          <div className="relative h-28 w-full bg-slate-900/60 rounded-lg overflow-hidden border border-slate-800/80">
            <svg viewBox="0 0 500 112" preserveAspectRatio="none" className="w-full h-full">
              <defs>
                <linearGradient id="latencyGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              {/* Horizontal guide lines */}
              <line x1="0" y1="28" x2="500" y2="28" stroke="#334155" strokeDasharray="3 3" strokeWidth="0.8" />
              <line x1="0" y1="56" x2="500" y2="56" stroke="#334155" strokeDasharray="3 3" strokeWidth="0.8" />
              <line x1="0" y1="84" x2="500" y2="84" stroke="#334155" strokeDasharray="3 3" strokeWidth="0.8" />

              {/* Filled Area */}
              <path
                d={generateSparklineArea(latencies, 500, 112, Math.max(0, minLat - 10), maxLat + 10)}
                fill="url(#latencyGradient)"
              />

              {/* Stroke Line */}
              <path
                d={generateSparklinePath(latencies, 500, 112, Math.max(0, minLat - 10), maxLat + 10)}
                fill="none"
                stroke="#22d3ee"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        {/* 2. Jitter Sparkline */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
              <span className="font-bold text-white tracking-wide">Network Jitter Variation Sparkline (Rolling 30s)</span>
            </div>
            <span className="font-mono text-amber-400 font-bold">{current.jitterMs} ms current</span>
          </div>

          <div className="relative h-24 w-full bg-slate-900/60 rounded-lg overflow-hidden border border-slate-800/80">
            <svg viewBox="0 0 500 96" preserveAspectRatio="none" className="w-full h-full">
              <defs>
                <linearGradient id="jitterGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <line x1="0" y1="24" x2="500" y2="24" stroke="#334155" strokeDasharray="3 3" strokeWidth="0.8" />
              <line x1="0" y1="48" x2="500" y2="48" stroke="#334155" strokeDasharray="3 3" strokeWidth="0.8" />
              <line x1="0" y1="72" x2="500" y2="72" stroke="#334155" strokeDasharray="3 3" strokeWidth="0.8" />

              <path
                d={generateSparklineArea(jitters, 500, 96, Math.max(0, minJit - 1), maxJit + 2)}
                fill="url(#jitterGradient)"
              />

              <path
                d={generateSparklinePath(jitters, 500, 96, Math.max(0, minJit - 1), maxJit + 2)}
                fill="none"
                stroke="#fbbf24"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Playout Planners & Socket Configurations */}
      <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-blue-400" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">SRT Socket Buffer Preset</h4>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">ARQ RTT Multiplier: 2.5x</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
          {[
            { id: 'ultra-low', label: 'Ultra-Low Latency', latency: '20-30 ms', desc: 'Direct fiber link / local LAN' },
            { id: 'balanced', label: 'Balanced Cloud Relay', latency: '40-60 ms', desc: 'Standard cross-region SRT relay' },
            { id: 'safe', label: 'Protected Wide-Area WAN', latency: '80-120 ms', desc: 'Cellular bonding / noisy uplink' },
          ].map((preset) => (
            <button
              key={preset.id}
              onClick={() => setTargetLatencyPreset(preset.id as any)}
              className={`p-2.5 rounded-lg border text-left transition-all ${
                targetLatencyPreset === preset.id
                  ? 'bg-blue-600/20 border-blue-500 text-white shadow-sm'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
              }`}
            >
              <div className="font-semibold text-white">{preset.label}</div>
              <div className="font-mono text-[11px] text-cyan-400 mt-0.5">{preset.latency}</div>
              <div className="text-[10px] text-slate-500 mt-1">{preset.desc}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
