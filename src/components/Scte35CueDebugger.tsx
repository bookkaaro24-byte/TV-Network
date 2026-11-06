/**
 * Scte35CueDebugger - Production Broadcast SCTE-35 Cue Debugger & DPI Dashboard
 * 
 * Visually tracks and logs incoming cue markers in real-time, displaying:
 * - Exact timestamp (Detection time + PTS Presentation Time Stamp at 90,000 Hz)
 * - Splice event type (splice_insert, time_signal, segmentation descriptors)
 * - Current status (active, upcoming, completed) with real-time countdown
 * - SCTE-35 hex & bitfield packet parser
 * - Live playout distribution timeline axis
 * - Manual & automated cue injection rig
 * - Central BroadcastLogger integration with audit logs
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useBroadcast } from '../context/BroadcastContext';
import { SCTE35CommandType, SCTE35SegmentationType, SCTE35CueMarker } from '../types/broadcast';
import { BroadcastLogger } from '../services/broadcastLogger';
import {
  Sparkles,
  Clock,
  Radio,
  FileCode,
  Play,
  RotateCcw,
  Terminal,
  Copy,
  Check,
  Trash2,
  Eye,
  Filter,
  Search,
  Download,
  AlertCircle,
  CheckCircle2,
  Layers,
  Activity,
  Zap,
  Info,
  ChevronRight,
  Sliders,
  ExternalLink,
} from 'lucide-react';

export const Scte35CueDebugger: React.FC = () => {
  const {
    scte35Markers,
    activeScte35Marker,
    injectScte35Cue,
    clearScte35History,
    isScte35OverlayOpen,
    setIsScte35OverlayOpen,
    selectedAdCreative,
    playout,
  } = useBroadcast();

  // Search & Filter state
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'active' | 'completed' | 'upcoming'>('ALL');
  const [commandFilter, setCommandFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);

  // Custom SCTE-35 packet generator form
  const [customDuration, setCustomDuration] = useState<number>(30);
  const [customCommand, setCustomCommand] = useState<SCTE35CommandType>('splice_insert');
  const [customSegType, setCustomSegType] = useState<SCTE35SegmentationType>('0x34_provider_ad_start');
  const [customUpid, setCustomUpid] = useState<string>('ADS-APEX-2026-X992');
  const [customPreroll, setCustomPreroll] = useState<number>(3.5);

  // Copy feedback states
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedRawPayload, setCopiedRawPayload] = useState<boolean>(false);
  const [exportedJson, setExportedJson] = useState<boolean>(false);

  // Active cue countdown clock tick
  const [currentTimeMs, setCurrentTimeMs] = useState<number>(Date.now());
  useEffect(() => {
    const interval = setInterval(() => setCurrentTimeMs(Date.now()), 250);
    return () => clearInterval(interval);
  }, []);

  // Selected or active marker for deep-inspection
  const inspectedMarker: SCTE35CueMarker | null = useMemo(() => {
    if (selectedMarkerId) {
      const found = scte35Markers.find((m) => m.id === selectedMarkerId);
      if (found) return found;
    }
    return activeScte35Marker || scte35Markers[0] || null;
  }, [selectedMarkerId, activeScte35Marker, scte35Markers]);

  // Filtered cue markers
  const filteredMarkers = useMemo(() => {
    return scte35Markers.filter((m) => {
      if (statusFilter !== 'ALL' && m.status !== statusFilter) return false;
      if (commandFilter !== 'ALL' && m.commandType !== commandFilter) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesEventId = m.eventId.toString().includes(query) || `0x${m.eventId.toString(16)}`.toLowerCase().includes(query);
        const matchesUpid = m.upid?.toLowerCase().includes(query);
        const matchesName = m.segmentationTypeName?.toLowerCase().includes(query);
        const matchesCmd = m.commandType.toLowerCase().includes(query);
        if (!matchesEventId && !matchesUpid && !matchesName && !matchesCmd) return false;
      }
      return true;
    });
  }, [scte35Markers, statusFilter, commandFilter, searchQuery]);

  // Calculate live countdown for active cue
  const activeRemainingSeconds = useMemo(() => {
    if (!activeScte35Marker) return 0;
    const elapsedSec = (currentTimeMs - activeScte35Marker.timestamp) / 1000;
    const remaining = Math.max(0, activeScte35Marker.durationSeconds - elapsedSec);
    return parseFloat(remaining.toFixed(1));
  }, [activeScte35Marker, currentTimeMs]);

  const activeProgressPct = useMemo(() => {
    if (!activeScte35Marker || activeScte35Marker.durationSeconds <= 0) return 0;
    const elapsedSec = (currentTimeMs - activeScte35Marker.timestamp) / 1000;
    return Math.min(100, Math.max(0, (elapsedSec / activeScte35Marker.durationSeconds) * 100));
  }, [activeScte35Marker, currentTimeMs]);

  // Dispatch custom injection with BroadcastLogger logging
  const handleInjectCue = (params: {
    durationSeconds: number;
    commandType: SCTE35CommandType;
    segmentationType: SCTE35SegmentationType;
    segmentationTypeName: string;
    upid?: string;
    adCreativeUrl?: string;
    adTitle?: string;
    advertiser?: string;
  }) => {
    if (params.durationSeconds === 0) {
      playout.skipAdBreak();
    }
    injectScte35Cue({
      ...params,
      adCreativeUrl: params.adCreativeUrl || selectedAdCreative?.videoUrl,
      adTitle: params.adTitle || selectedAdCreative?.title,
      advertiser: params.advertiser || selectedAdCreative?.advertiser,
      callToActionUrl: selectedAdCreative?.callToActionUrl,
      callToActionText: selectedAdCreative?.callToActionText,
      thumbnailUrl: selectedAdCreative?.thumbnailUrl,
    });
    BroadcastLogger.logScte35(
      'SCTE35_CUE_INJECTED',
      `Injected SCTE-35 cue: ${params.segmentationTypeName} (${params.durationSeconds}s duration)`,
      {
        commandType: params.commandType,
        segmentationType: params.segmentationType,
        durationSeconds: params.durationSeconds,
        upid: params.upid,
        adTitle: params.adTitle || selectedAdCreative?.title,
        timestamp: Date.now(),
      },
      'info'
    );
  };

  // Copy helper
  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Export JSON of all SCTE-35 cues
  const handleExportJson = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      activeCue: activeScte35Marker,
      totalCount: scte35Markers.length,
      cues: scte35Markers,
    };
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setExportedJson(true);
    setTimeout(() => setExportedJson(false), 2000);
  };

  // Export CSV of SCTE-35 cues
  const handleDownloadCsv = () => {
    const headers = ['Timestamp', 'PTS_Time', 'Event_ID', 'Command_Type', 'Segmentation_Type', 'Duration_Sec', 'Status', 'UPID', 'Hex_Payload'];
    const rows = scte35Markers.map((m) => [
      new Date(m.timestamp).toISOString(),
      m.ptsTimeFormatted,
      m.eventId,
      m.commandType,
      `"${m.segmentationTypeName}"`,
      m.durationSeconds,
      m.status,
      `"${m.upid}"`,
      `"${m.hexPayload}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `apex_scte35_cues_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* =================================================================== */}
      {/* 1. TOP HEADER & HUD CONTROLLER                                      */}
      {/* =================================================================== */}
      <div className="bg-purple-950/40 border border-purple-500/40 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-white tracking-wide">
                SCTE-35 Cue Debugger & Real-Time Ingest Monitor
              </h4>
              <span className="text-[10px] bg-purple-900/80 text-purple-200 border border-purple-700/60 px-2 py-0.5 rounded font-mono font-bold">
                ANSI/SCTE 35 2023 · HLS DATERANGE
              </span>
            </div>
            <p className="text-xs text-purple-200/80 mt-0.5">
              Tracks, decodes, and audits in-band splice markers, dynamic ad insertion (DAI) avails, and return-to-network cues
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Toggle Live HUD Overlay on the Main TVPlayer */}
          <button
            type="button"
            onClick={() => setIsScte35OverlayOpen(!isScte35OverlayOpen)}
            className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2 border transition-all ${
              isScte35OverlayOpen
                ? 'bg-purple-600 border-purple-400 text-white shadow-lg shadow-purple-900/40'
                : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            <Eye className="w-4 h-4 text-purple-300" />
            <span>{isScte35OverlayOpen ? 'Player HUD Active' : 'Project HUD to Player'}</span>
          </button>

          {/* Export JSON */}
          <button
            type="button"
            onClick={handleExportJson}
            className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white rounded-lg transition-colors flex items-center gap-1.5 text-xs"
            title="Export SCTE-35 Cues JSON to clipboard"
          >
            {exportedJson ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span className="hidden sm:inline">{exportedJson ? 'Copied' : 'JSON'}</span>
          </button>

          {/* Download CSV */}
          <button
            type="button"
            onClick={handleDownloadCsv}
            className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white rounded-lg transition-colors flex items-center gap-1.5 text-xs"
            title="Download Cues as CSV"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">CSV</span>
          </button>

          {/* Clear Log */}
          <button
            type="button"
            onClick={clearScte35History}
            className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-red-400 rounded-lg transition-colors"
            title="Clear Cue History"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 2. REAL-TIME PLAYOUT TIMELINE AXIS                                  */}
      {/* =================================================================== */}
      <div className="bg-slate-950/80 rounded-xl p-5 border border-slate-800 space-y-3 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-purple-400" />
            <h5 className="text-xs font-bold text-white uppercase tracking-wider">
              Real-Time Playout Axis & Cue Distribution Track
            </h5>
          </div>
          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="text-slate-400">
              Clock: <span className="text-purple-300 font-bold">90,000 Hz PTS</span>
            </span>
            <span className="text-slate-400">
              Total Ingested: <span className="text-white font-bold">{scte35Markers.length}</span>
            </span>
          </div>
        </div>

        {/* Sweeping Timeline Bar */}
        <div className="relative h-24 bg-slate-900 rounded-lg border border-slate-800 overflow-hidden flex items-center px-4">
          {/* Grid Lines */}
          <div className="absolute inset-0 flex justify-between px-6 pointer-events-none opacity-20">
            {[...Array(9)].map((_, i) => (
              <div key={i} className="h-full border-r border-dashed border-slate-400 flex flex-col justify-between py-1">
                <span className="text-[9px] font-mono text-slate-400">-{ (8 - i) * 15 }s</span>
              </div>
            ))}
          </div>

          {/* Sweeping Live Playhead Needle */}
          <div className="absolute top-0 bottom-0 right-16 w-0.5 bg-gradient-to-b from-purple-400 via-pink-500 to-purple-600 shadow-[0_0_12px_rgba(168,85,247,0.9)] z-10 animate-pulse">
            <div className="absolute top-1 -left-3 bg-purple-600 text-[9px] font-mono text-white font-bold px-1.5 py-0.2 rounded shadow">
              LIVE
            </div>
          </div>

          {/* Plotted Cue Marker Nodes along recent timeline */}
          <div className="relative w-full flex items-center justify-between z-10 pr-20">
            {scte35Markers.slice(0, 7).map((marker) => {
              const isMarkerActive = activeScte35Marker?.id === marker.id;
              const isSelected = inspectedMarker?.id === marker.id;
              const isAdEnd = marker.segmentationType?.includes('0x35') || marker.durationSeconds === 0;

              return (
                <button
                  key={marker.id}
                  type="button"
                  onClick={() => setSelectedMarkerId(marker.id)}
                  className={`group relative flex flex-col items-center cursor-pointer transition-all focus:outline-none ${
                    isSelected ? 'scale-115' : 'hover:scale-105'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full flex items-center justify-center border-2 transition-all ${
                      isMarkerActive
                        ? 'bg-purple-600 border-white shadow-[0_0_15px_rgba(168,85,247,1)] animate-ping'
                        : isAdEnd
                        ? 'bg-emerald-600 border-emerald-400'
                        : 'bg-purple-900 border-purple-500'
                    } ${isSelected ? 'ring-2 ring-purple-400 ring-offset-2 ring-offset-slate-900' : ''}`}
                  />
                  <span className="text-[9px] font-mono text-slate-300 mt-1 font-bold">
                    {marker.durationSeconds > 0 ? `${marker.durationSeconds}s` : 'RETURN'}
                  </span>

                  {/* Hover Tooltip Card */}
                  <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col bg-slate-900 border border-slate-700 p-2.5 rounded-lg shadow-2xl text-left min-w-[210px] z-30 pointer-events-none">
                    <div className="text-[10px] font-bold text-purple-400 uppercase font-mono">
                      Event 0x{marker.eventId.toString(16).toUpperCase()} ({marker.commandType})
                    </div>
                    <div className="text-xs text-white font-semibold mt-0.5 truncate">
                      {marker.segmentationTypeName}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono mt-1 space-y-0.5">
                      <div>Status: <span className="text-purple-300 font-bold uppercase">{marker.status}</span></div>
                      <div>PTS: {marker.ptsTimeFormatted}</div>
                      <div>Duration: {marker.durationSeconds}s</div>
                      <div>UPID: {marker.upid}</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 3. ACTIVE SPLICE TELEMETRY & BYTE-LEVEL PARSER RADAR                */}
      {/* =================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Active Cue Status Card (5 cols) */}
        <div className="lg:col-span-5 bg-slate-950/80 rounded-xl p-5 border border-slate-800 space-y-4 shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-purple-400" />
              <h5 className="text-xs font-bold text-white uppercase tracking-wider">
                Active Splice Signal Telemetry
              </h5>
            </div>
            {activeScte35Marker ? (
              <span className="text-xs font-mono text-purple-400 bg-purple-950/80 border border-purple-800/80 px-2 py-0.5 rounded font-bold flex items-center gap-1.5 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
                <span>BREAK IN PROGRESS</span>
              </span>
            ) : (
              <span className="text-xs font-mono text-emerald-400 bg-emerald-950/80 border border-emerald-800/80 px-2 py-0.5 rounded flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>PROGRAM IN-NETWORK</span>
              </span>
            )}
          </div>

          {activeScte35Marker ? (
            <div className="bg-purple-950/30 border border-purple-500/40 rounded-lg p-4 space-y-3">
              {/* Event ID & Remaining Time Count */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-mono text-purple-300 uppercase">
                    Active Splice Event
                  </div>
                  <div className="text-xl font-black font-mono text-white flex items-center gap-2">
                    <span>0x{activeScte35Marker.eventId.toString(16).toUpperCase()}</span>
                    <span className="text-xs text-slate-400 font-normal">({activeScte35Marker.eventId})</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-mono text-purple-300 uppercase">
                    Remaining Break Window
                  </div>
                  <div className="text-xl font-black font-mono text-purple-400">
                    {activeRemainingSeconds.toFixed(1)}s
                  </div>
                </div>
              </div>

              {/* Countdown Progress Bar */}
              <div className="space-y-1">
                <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                  <div
                    className="bg-gradient-to-r from-purple-500 to-pink-500 h-full transition-all duration-200"
                    style={{ width: `${activeProgressPct}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] font-mono text-slate-400">
                  <span>0.0s</span>
                  <span>{activeScte35Marker.durationSeconds}.0s total</span>
                </div>
              </div>

              {/* Technical Descriptors Grid */}
              <div className="space-y-1.5 pt-1 text-xs divide-y divide-slate-800/60">
                <div className="flex items-center justify-between py-1 text-slate-300">
                  <span className="text-slate-500">Splice Command:</span>
                  <span className="font-mono font-bold text-purple-300">
                    0x05 ({activeScte35Marker.commandType})
                  </span>
                </div>
                <div className="flex items-center justify-between py-1 text-slate-300">
                  <span className="text-slate-500">Segmentation Descriptor:</span>
                  <span className="font-medium text-white truncate max-w-[190px]">
                    {activeScte35Marker.segmentationTypeName}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1 text-slate-300">
                  <span className="text-slate-500">PTS Presentation Clock:</span>
                  <span className="font-mono text-slate-300">
                    {activeScte35Marker.ptsTimeFormatted}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1 text-slate-300">
                  <span className="text-slate-500">Universal Program ID (UPID):</span>
                  <span className="font-mono text-amber-400 truncate max-w-[180px]">
                    {activeScte35Marker.upid}
                  </span>
                </div>
              </div>

              {/* Force Return to Network button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    handleInjectCue({
                      durationSeconds: 0,
                      commandType: 'splice_insert',
                      segmentationType: '0x35_provider_ad_end',
                      segmentationTypeName: 'Return to Program (Force Splice Out)',
                    });
                  }}
                  className="w-full py-2 bg-red-950/80 hover:bg-red-900 border border-red-800 text-red-200 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Force Return to Network / End Break</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-6 text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto text-purple-400">
                <Terminal className="w-5 h-5" />
              </div>
              <div className="text-xs font-bold text-white">Decoder Listening for In-Band Cue Markers</div>
              <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                HLS <code className="text-purple-300">#EXT-X-DATERANGE</code> and MPEG-TS PID 0x01FF monitor primed. Trigger a live commercial avail below to observe splice behavior.
              </p>
            </div>
          )}
        </div>

        {/* SCTE-35 Byte-Level Hex & Bitfield Inspector (7 cols) */}
        <div className="lg:col-span-7 bg-slate-950/80 rounded-xl p-5 border border-slate-800 space-y-4 shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileCode className="w-4 h-4 text-purple-400" />
              <h5 className="text-xs font-bold text-white uppercase tracking-wider">
                SCTE-35 Binary Syntax & Bitfield Inspector
              </h5>
            </div>
            <span className="text-[10px] font-mono text-purple-300 bg-purple-950/70 border border-purple-800/60 px-2 py-0.5 rounded">
              {inspectedMarker ? `Event 0x${inspectedMarker.eventId.toString(16).toUpperCase()}` : 'Awaiting Packet'}
            </span>
          </div>

          {inspectedMarker ? (
            <div className="space-y-3 font-mono text-xs">
              {/* Raw Hex Section */}
              <div className="bg-slate-900 rounded-lg p-3 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                    Base16 Hexadecimal Byte Stream (MPEG-TS In-Band)
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(inspectedMarker.hexPayload);
                      setCopiedRawPayload(true);
                      setTimeout(() => setCopiedRawPayload(false), 2000);
                    }}
                    className="flex items-center gap-1 text-[10px] text-purple-400 hover:text-purple-300 transition-colors"
                  >
                    {copiedRawPayload ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedRawPayload ? 'Copied' : 'Copy Hex'}</span>
                  </button>
                </div>
                <div className="bg-black/80 p-2.5 rounded border border-slate-800 text-purple-300 break-all text-[11px] select-all">
                  {inspectedMarker.hexPayload}
                </div>
              </div>

              {/* Bitfield Breakdown Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                <div className="bg-slate-900/90 p-2.5 rounded border border-slate-800 space-y-0.5">
                  <span className="text-[9px] text-slate-400 uppercase block font-sans">Table ID</span>
                  <span className="text-purple-400 font-bold font-mono">0xFC</span>
                  <span className="text-[9px] text-slate-500 block truncate font-sans">splice_info_section</span>
                </div>

                <div className="bg-slate-900/90 p-2.5 rounded border border-slate-800 space-y-0.5">
                  <span className="text-[9px] text-slate-400 uppercase block font-sans">Command Type</span>
                  <span className="text-emerald-400 font-bold font-mono">0x05</span>
                  <span className="text-[9px] text-slate-500 block truncate font-sans">{inspectedMarker.commandType}</span>
                </div>

                <div className="bg-slate-900/90 p-2.5 rounded border border-slate-800 space-y-0.5">
                  <span className="text-[9px] text-slate-400 uppercase block font-sans">Event ID</span>
                  <span className="text-blue-400 font-bold font-mono">0x{inspectedMarker.eventId.toString(16).toUpperCase()}</span>
                  <span className="text-[9px] text-slate-500 block truncate font-sans">ID: {inspectedMarker.eventId}</span>
                </div>

                <div className="bg-slate-900/90 p-2.5 rounded border border-slate-800 space-y-0.5">
                  <span className="text-[9px] text-slate-400 uppercase block font-sans">Segmentation</span>
                  <span className="text-amber-400 font-bold font-mono truncate block">
                    {inspectedMarker.segmentationType ? inspectedMarker.segmentationType.split('_')[0] : '0x34'}
                  </span>
                  <span className="text-[9px] text-slate-500 block truncate font-sans">Ad Avail Type</span>
                </div>
              </div>

              {/* HLS EXT-X-DATERANGE Tag Preview */}
              <div className="bg-slate-900/90 rounded-lg p-3 border border-slate-800 space-y-1.5">
                <div className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span>HLS Manifest #EXT-X-DATERANGE Tag Projection</span>
                  <span className="text-emerald-400 font-mono text-[10px]">RFC 8216 HLS Spec</span>
                </div>
                <div className="bg-black/80 p-2 rounded text-[11px] text-slate-300 font-mono overflow-x-auto whitespace-pre">
{`#EXT-X-DATERANGE:ID="${inspectedMarker.id}",START-DATE="${new Date(inspectedMarker.timestamp).toISOString()}",DURATION=${inspectedMarker.durationSeconds}.0,PLANNED-DURATION=${inspectedMarker.durationSeconds}.0,SCTE35-CMD=${inspectedMarker.hexPayload.slice(0, 18)},SCTE35-OUT=0x${inspectedMarker.isOutNetwork ? '01' : '00'}`}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-500 text-xs font-mono">
              No cue marker selected. Select a marker from the timeline or inject one below.
            </div>
          )}
        </div>
      </div>

      {/* =================================================================== */}
      {/* 4. LIVE INGESTION & TRIGGER RIG                                     */}
      {/* =================================================================== */}
      <div className="bg-slate-950/80 rounded-xl p-5 border border-slate-800 space-y-4 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-purple-400" />
            <h5 className="text-xs font-bold text-white uppercase tracking-wider">
              Live Cue Marker Ingestion & Automation Rig
            </h5>
          </div>
          <span className="text-xs text-slate-400">
            Dispatches frame-accurate DPI splice commands directly into the active broadcast stream
          </span>
        </div>

        {/* Quick Action Trigger Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <button
            type="button"
            onClick={() =>
              handleInjectCue({
                durationSeconds: 15,
                commandType: 'splice_insert',
                segmentationType: '0x34_provider_ad_start',
                segmentationTypeName: '15s Local Commercial Avail',
                upid: `LOCAL-AVAIL-${Date.now().toString(36).toUpperCase()}`,
              })
            }
            className="p-3 bg-purple-950/40 hover:bg-purple-900/60 border border-purple-500/40 rounded-lg text-left transition-all group"
          >
            <div className="text-xs font-bold text-white flex items-center gap-1.5">
              <Play className="w-3.5 h-3.5 text-purple-400 group-hover:scale-110 transition-transform" />
              <span>Inject 15s Break</span>
            </div>
            <div className="text-[10px] text-purple-300/80 mt-0.5">Local Avail (0x34)</div>
          </button>

          <button
            type="button"
            onClick={() =>
              handleInjectCue({
                durationSeconds: 30,
                commandType: 'splice_insert',
                segmentationType: '0x34_provider_ad_start',
                segmentationTypeName: '30s National Ad Break',
                upid: `NAT-POD-${Date.now().toString(36).toUpperCase()}`,
              })
            }
            className="p-3 bg-purple-950/40 hover:bg-purple-900/60 border border-purple-500/40 rounded-lg text-left transition-all group"
          >
            <div className="text-xs font-bold text-white flex items-center gap-1.5">
              <Play className="w-3.5 h-3.5 text-purple-400 group-hover:scale-110 transition-transform" />
              <span>Inject 30s Break</span>
            </div>
            <div className="text-[10px] text-purple-300/80 mt-0.5">National Pod (0x34)</div>
          </button>

          <button
            type="button"
            onClick={() =>
              handleInjectCue({
                durationSeconds: 60,
                commandType: 'splice_insert',
                segmentationType: '0x34_provider_ad_start',
                segmentationTypeName: '60s Extended Mid-Roll Pod',
                upid: `EXT-DAI-${Date.now().toString(36).toUpperCase()}`,
              })
            }
            className="p-3 bg-purple-950/40 hover:bg-purple-900/60 border border-purple-500/40 rounded-lg text-left transition-all group"
          >
            <div className="text-xs font-bold text-white flex items-center gap-1.5">
              <Play className="w-3.5 h-3.5 text-purple-400 group-hover:scale-110 transition-transform" />
              <span>Inject 60s Break</span>
            </div>
            <div className="text-[10px] text-purple-300/80 mt-0.5">Extended DAI Pod (0x34)</div>
          </button>

          <button
            type="button"
            onClick={() =>
              handleInjectCue({
                durationSeconds: 0,
                commandType: 'splice_insert',
                segmentationType: '0x35_provider_ad_end',
                segmentationTypeName: 'Return to Network / Program In',
                upid: 'PROGRAM-IN-NETWORK',
              })
            }
            className="p-3 bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-500/40 rounded-lg text-left transition-all group"
          >
            <div className="text-xs font-bold text-white flex items-center gap-1.5">
              <RotateCcw className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
              <span>Return to Network</span>
            </div>
            <div className="text-[10px] text-emerald-300/80 mt-0.5">Ad End Cue (0x35)</div>
          </button>
        </div>

        {/* Custom Packet Injection Generator */}
        <div className="bg-slate-900/90 rounded-lg p-4 border border-slate-800 space-y-3">
          <div className="text-xs font-bold text-white flex items-center gap-2">
            <Sliders className="w-3.5 h-3.5 text-purple-400" />
            <span>Custom SCTE-35 Packet Generator & Injector</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 text-xs">
            <div>
              <label className="text-slate-400 block mb-1">Duration (seconds)</label>
              <input
                type="number"
                min="5"
                max="300"
                value={customDuration}
                onChange={(e) => setCustomDuration(parseInt(e.target.value, 10) || 30)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white font-mono"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Command Type</label>
              <select
                value={customCommand}
                onChange={(e) => setCustomCommand(e.target.value as SCTE35CommandType)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
              >
                <option value="splice_insert">splice_insert (0x05)</option>
                <option value="time_signal">time_signal (0x06)</option>
                <option value="bandwidth_reservation">bandwidth_reservation (0x07)</option>
              </select>
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Segmentation Descriptor</label>
              <select
                value={customSegType}
                onChange={(e) => setCustomSegType(e.target.value as SCTE35SegmentationType)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
              >
                <option value="0x34_provider_ad_start">0x34 Provider Ad Start</option>
                <option value="0x35_provider_ad_end">0x35 Provider Ad End</option>
                <option value="0x30_provider_placement_start">0x30 Placement Opportunity</option>
                <option value="0x10_program_start">0x10 Program Start</option>
                <option value="0x22_distributor_ad_start">0x22 Distributor Ad Start</option>
              </select>
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Universal Program ID (UPID)</label>
              <input
                type="text"
                value={customUpid}
                onChange={(e) => setCustomUpid(e.target.value)}
                placeholder="ADS-APEX-2026-X992"
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white font-mono"
              />
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={() => {
                  handleInjectCue({
                    durationSeconds: customDuration,
                    commandType: customCommand,
                    segmentationType: customSegType,
                    segmentationTypeName: `Custom ${customSegType.replace('_', ' ')}`,
                    upid: customUpid || `CUSTOM-${Date.now().toString(36).toUpperCase()}`,
                  });
                }}
                className="w-full py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded shadow transition-colors flex items-center justify-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Inject Packet</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 5. CHRONOLOGICAL CUE MARKER AUDIT LOG & LIVE TRACKER                */}
      {/* =================================================================== */}
      <div className="bg-slate-950/80 rounded-xl p-5 border border-slate-800 space-y-4 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-purple-400" />
            <h5 className="text-xs font-bold text-white uppercase tracking-wider">
              Chronological SCTE-35 Cue Marker Audit Log
            </h5>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            {filteredMarkers.length} of {scte35Markers.length} Cues Shown
          </span>
        </div>

        {/* Toolbar: Search & Filter Pills */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Event ID (hex/dec), UPID, or descriptor name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>

          {/* Status Filters */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-slate-500 mr-1 font-semibold">Status:</span>
            {(['ALL', 'active', 'completed', 'upcoming'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded text-[11px] font-mono transition-colors uppercase ${
                  statusFilter === st
                    ? 'bg-purple-600 text-white font-bold'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Command Filters */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-slate-500 mr-1 font-semibold">Command:</span>
            {(['ALL', 'splice_insert', 'time_signal'] as const).map((cmd) => (
              <button
                key={cmd}
                type="button"
                onClick={() => setCommandFilter(cmd)}
                className={`px-2.5 py-1 rounded text-[11px] font-mono transition-colors ${
                  commandFilter === cmd
                    ? 'bg-purple-600 text-white font-bold'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {cmd === 'ALL' ? 'ALL' : cmd.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Cues Table */}
        <div className="bg-slate-900 rounded-lg border border-slate-800 overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 text-[11px]">
              <tr>
                <th className="p-2.5">Time Logged</th>
                <th className="p-2.5">PTS Time</th>
                <th className="p-2.5">Event ID</th>
                <th className="p-2.5">Splice Command</th>
                <th className="p-2.5">Segmentation Type</th>
                <th className="p-2.5">Duration</th>
                <th className="p-2.5">Current Status</th>
                <th className="p-2.5">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filteredMarkers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-slate-500">
                    No SCTE-35 cue markers matched the current search/status criteria.
                  </td>
                </tr>
              ) : (
                filteredMarkers.map((marker) => {
                  const isActive = marker.status === 'active';
                  const isSelected = inspectedMarker?.id === marker.id;

                  return (
                    <tr
                      key={marker.id}
                      onClick={() => setSelectedMarkerId(marker.id)}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? 'bg-purple-950/40' : 'hover:bg-slate-850/60'
                      }`}
                    >
                      {/* Timestamp */}
                      <td className="p-2.5 text-slate-400 text-[11px] whitespace-nowrap">
                        {new Date(marker.timestamp).toLocaleTimeString()}
                      </td>

                      {/* PTS Time */}
                      <td className="p-2.5 text-purple-300 font-mono whitespace-nowrap">
                        {marker.ptsTimeFormatted}
                      </td>

                      {/* Event ID */}
                      <td className="p-2.5 font-bold text-white whitespace-nowrap">
                        <span className="text-purple-400">0x{marker.eventId.toString(16).toUpperCase()}</span>
                        <span className="text-slate-500 text-[10px] ml-1">({marker.eventId})</span>
                      </td>

                      {/* Splice Command */}
                      <td className="p-2.5">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-slate-950 border border-slate-800 text-slate-300 font-bold">
                          {marker.commandType}
                        </span>
                      </td>

                      {/* Segmentation Type */}
                      <td className="p-2.5 text-slate-200 font-sans max-w-[200px] truncate" title={marker.segmentationTypeName}>
                        {marker.segmentationTypeName}
                      </td>

                      {/* Duration */}
                      <td className="p-2.5 text-white font-bold whitespace-nowrap">
                        {marker.durationSeconds > 0 ? `${marker.durationSeconds}s` : '0s (In)'}
                      </td>

                      {/* Current Status */}
                      <td className="p-2.5 whitespace-nowrap">
                        {isActive ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-950 text-purple-300 border border-purple-800 animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-ping" />
                            <span>ACTIVE ({activeRemainingSeconds.toFixed(0)}s)</span>
                          </span>
                        ) : marker.status === 'completed' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800/80 text-slate-400 border border-slate-700/60">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            <span>COMPLETED</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-amber-950/60 text-amber-300 border border-amber-800/60">
                            <Clock className="w-3 h-3 text-amber-400" />
                            <span>UPCOMING</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-2.5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => copyToClipboard(marker.hexPayload, marker.id)}
                            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] rounded border border-slate-700 flex items-center gap-1 transition-colors"
                            title="Copy Hex Payload"
                          >
                            {copiedId === marker.id ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span className="text-emerald-400">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3 text-slate-400" />
                                <span>Hex</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => setSelectedMarkerId(marker.id)}
                            className="px-2 py-1 bg-purple-950/50 hover:bg-purple-900/60 text-purple-300 text-[10px] rounded border border-purple-800/60 transition-colors"
                          >
                            Inspect
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
