import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useBroadcastLogger } from '../hooks/useBroadcastLogger';
import { LogCategory, LogLevel, BroadcastLogEntry, BroadcastLogger } from '../services/broadcastLogger';
import {
  Terminal,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Check,
  Trash2,
  Download,
  Search,
  Filter,
  ArrowDown,
  Layers,
  Video,
  FileVideo,
  Eye,
  RefreshCw,
  Cpu,
  Zap,
  Sliders,
  ChevronDown,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';

export const BroadcastAuditLoggerPanel: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<LogCategory | 'ALL'>('ALL');
  const [selectedLevel, setSelectedLevel] = useState<LogLevel | 'ALL' | 'ERRORS_WARNINGS'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const [copiedJson, setCopiedJson] = useState<boolean>(false);
  const [copiedEntryId, setCopiedEntryId] = useState<string | null>(null);
  const [expandedLogIds, setExpandedLogIds] = useState<Set<string>>(new Set());

  const logContainerRef = useRef<HTMLDivElement>(null);

  const { logs, rawLogsCount, stats, clearLogs, exportJson, exportText } = useBroadcastLogger({
    categoryFilter: selectedCategory,
    levelFilter: selectedLevel,
    searchQuery,
  });

  // Autoscroll to bottom when new logs arrive if enabled
  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const toggleExpand = (id: string) => {
    setExpandedLogIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleCopyFullJson = () => {
    const jsonStr = exportJson();
    navigator.clipboard.writeText(jsonStr);
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  const handleDownloadLogFile = () => {
    const textData = exportText();
    const blob = new Blob([textData], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `broadcast-audit-${Date.now()}.log`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopySingleLog = (e: React.MouseEvent, entry: BroadcastLogEntry) => {
    e.stopPropagation();
    navigator.clipboard.writeText(JSON.stringify(entry, null, 2));
    setCopiedEntryId(entry.id);
    setTimeout(() => setCopiedEntryId(null), 1500);
  };

  // Video Preview Specific Diagnostics extraction
  const previewDiagnostics = useMemo(() => {
    const ingestLogs = logs.filter((l) => l.category === 'INGEST');
    const videoLogs = logs.filter((l) => l.category === 'VIDEO');
    const errorLogs = logs.filter((l) => l.level === 'error');

    const lastIngest = ingestLogs[ingestLogs.length - 1];
    const lastVideoLoaded = videoLogs.filter((l) => l.event === 'METADATA_LOADED').slice(-1)[0];
    const lastVideoError = videoLogs.filter((l) => l.event === 'PLAYBACK_ERROR').slice(-1)[0];
    const codecIssues = logs.filter((l) => l.event.includes('CODEC') || l.message.includes('Audio-Only'));

    return {
      lastIngest,
      lastVideoLoaded,
      lastVideoError,
      hasCodecWarning: codecIssues.length > 0,
      recentErrorsCount: errorLogs.length,
    };
  }, [logs]);

  // Helper colors
  const getCategoryBadgeClass = (category: LogCategory) => {
    switch (category) {
      case 'HLS':
        return 'bg-cyan-950/80 text-cyan-300 border-cyan-800/60';
      case 'VIDEO':
        return 'bg-indigo-950/80 text-indigo-300 border-indigo-800/60';
      case 'INGEST':
        return 'bg-purple-950/80 text-purple-300 border-purple-800/60';
      case 'STATE':
        return 'bg-blue-950/80 text-blue-300 border-blue-800/60';
      case 'RECOVERY':
        return 'bg-amber-950/80 text-amber-300 border-amber-800/60';
      case 'SCTE35':
        return 'bg-purple-950/80 text-purple-300 border-purple-800/60';
      case 'NETWORK':
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  const getLevelBadgeClass = (level: LogLevel) => {
    switch (level) {
      case 'error':
        return 'bg-red-500/20 text-red-400 border-red-500/40 font-bold';
      case 'warn':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-semibold';
      case 'success':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
      case 'debug':
        return 'bg-slate-800 text-slate-400 border-slate-700';
      case 'info':
      default:
        return 'bg-blue-500/10 text-blue-300 border-blue-500/30';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Actions */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950/40 p-4 rounded-xl border border-indigo-800/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center shrink-0">
            <Terminal className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-white tracking-wide uppercase">
                BroadcastLogger Real-Time Audit Console
              </h4>
              <span className="flex items-center gap-1 bg-indigo-950/80 border border-indigo-700/60 text-indigo-300 text-[10px] font-mono px-2 py-0.5 rounded-full font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                RING BUFFER LIVE
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Captures HLS.js streaming events, HTML5 video decoding pipeline, media ingest/transcode actions, and state changes.
            </p>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <button
            type="button"
            onClick={handleCopyFullJson}
            className="flex-1 md:flex-initial px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-medium text-slate-200 transition-colors flex items-center justify-center gap-1.5 shadow-sm"
            title="Copy entire audit log to clipboard as JSON"
          >
            {copiedJson ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
            <span>{copiedJson ? 'Copied JSON!' : 'Copy JSON'}</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadLogFile}
            className="flex-1 md:flex-initial px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-medium text-slate-200 transition-colors flex items-center justify-center gap-1.5 shadow-sm"
            title="Download plain-text log file"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>Download .log</span>
          </button>

          <button
            type="button"
            onClick={clearLogs}
            className="px-3 py-1.5 bg-red-950/30 hover:bg-red-900/50 border border-red-800/40 rounded-lg text-xs font-medium text-red-300 transition-colors flex items-center justify-center gap-1.5"
            title="Clear all logs from memory"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-400" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Video Preview Diagnostics Spotlight Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-cyan-400" />
            <h5 className="text-xs font-bold text-white uppercase tracking-wider">
              Video Preview & Ingest Diagnostic Spotlight
            </h5>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            Helps verify why a video or preview might appear blank or audio-only
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase block font-semibold">Latest Video Dimensions</span>
            <div className="text-sm font-mono font-bold mt-1 text-slate-200 flex items-center gap-1.5">
              {previewDiagnostics.lastVideoLoaded ? (
                <>
                  <span className="text-emerald-400 font-mono">
                    {String((previewDiagnostics.lastVideoLoaded.details as any)?.resolution || 'Decoded')}
                  </span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                </>
              ) : (
                <span className="text-slate-500 font-normal">Awaiting metadata</span>
              )}
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">
              {previewDiagnostics.lastVideoLoaded?.timeFormatted || 'No stream active'}
            </span>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase block font-semibold">Media Ingest Status</span>
            <div className="text-sm font-bold mt-1 text-slate-200 truncate">
              {previewDiagnostics.lastIngest ? (
                <span className="text-purple-300 font-mono">{previewDiagnostics.lastIngest.event}</span>
              ) : (
                <span className="text-slate-500 font-normal">No recent ingest</span>
              )}
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block truncate">
              {previewDiagnostics.lastIngest?.message || 'Ready for file selection'}
            </span>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase block font-semibold">Codec & Hardware Decoding</span>
            <div className="text-sm font-bold mt-1">
              {previewDiagnostics.hasCodecWarning ? (
                <span className="text-amber-400 flex items-center gap-1 font-semibold">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  Audio-Only Warning
                </span>
              ) : (
                <span className="text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  Nominal (H.264/AAC)
                </span>
              )}
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">
              {previewDiagnostics.hasCodecWarning ? 'Transcode recommended' : 'Universal playback ready'}
            </span>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase block font-semibold">Active Faults / Errors</span>
            <div className="text-sm font-bold mt-1">
              {previewDiagnostics.recentErrorsCount > 0 ? (
                <span className="text-red-400 flex items-center gap-1 font-bold">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  {previewDiagnostics.recentErrorsCount} Errors Logged
                </span>
              ) : (
                <span className="text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Zero Errors
                </span>
              )}
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">
              {previewDiagnostics.recentErrorsCount > 0 ? 'Review error entries below' : 'Stream engine healthy'}
            </span>
          </div>
        </div>
      </div>

      {/* Metrics Counter Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-center">
          <span className="text-[10px] text-slate-400 uppercase font-semibold">Total Logs</span>
          <div className="text-lg font-mono font-bold text-white mt-0.5">{stats.total}</div>
        </div>

        <div className="bg-slate-900 border border-cyan-900/40 rounded-lg p-2.5 text-center">
          <span className="text-[10px] text-cyan-400 uppercase font-semibold">HLS Events</span>
          <div className="text-lg font-mono font-bold text-cyan-300 mt-0.5">{stats.byCategory.HLS}</div>
        </div>

        <div className="bg-slate-900 border border-indigo-900/40 rounded-lg p-2.5 text-center">
          <span className="text-[10px] text-indigo-400 uppercase font-semibold">Video Elements</span>
          <div className="text-lg font-mono font-bold text-indigo-300 mt-0.5">{stats.byCategory.VIDEO}</div>
        </div>

        <div className="bg-slate-900 border border-purple-900/40 rounded-lg p-2.5 text-center">
          <span className="text-[10px] text-purple-400 uppercase font-semibold">Ingest & Transcode</span>
          <div className="text-lg font-mono font-bold text-purple-300 mt-0.5">{stats.byCategory.INGEST}</div>
        </div>

        <div className="bg-slate-900 border border-blue-900/40 rounded-lg p-2.5 text-center">
          <span className="text-[10px] text-blue-400 uppercase font-semibold">State Changes</span>
          <div className="text-lg font-mono font-bold text-blue-300 mt-0.5">{stats.byCategory.STATE}</div>
        </div>

        <div className="bg-slate-900 border border-purple-900/40 rounded-lg p-2.5 text-center">
          <span className="text-[10px] text-purple-300 uppercase font-semibold">SCTE-35 Cues</span>
          <div className="text-lg font-mono font-bold text-purple-300 mt-0.5">{stats.byCategory.SCTE35 || 0}</div>
        </div>

        <div className={`border rounded-lg p-2.5 text-center ${stats.errorCount > 0 ? 'bg-red-950/20 border-red-800/60' : 'bg-slate-900 border-slate-800'}`}>
          <span className={`text-[10px] uppercase font-semibold ${stats.errorCount > 0 ? 'text-red-400 font-bold' : 'text-slate-400'}`}>
            Errors / Warns
          </span>
          <div className={`text-lg font-mono font-bold mt-0.5 ${stats.errorCount > 0 ? 'text-red-400' : 'text-slate-300'}`}>
            {stats.errorCount} <span className="text-xs text-amber-400 font-normal">/ {stats.warningCount}w</span>
          </div>
        </div>
      </div>

      {/* Filter and Control Toolbar */}
      <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search logs by keyword, event name, or JSON payload..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Autoscroll toggle and Test Log button */}
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer select-none bg-slate-900 border border-slate-800 px-2.5 py-1.5 rounded-lg hover:border-slate-700">
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
                className="rounded border-slate-700 bg-slate-800 text-indigo-500 focus:ring-0"
              />
              <span>Auto-tail</span>
            </label>

            <button
              type="button"
              onClick={() => {
                BroadcastLogger.log({
                  category: 'STATE',
                  level: 'info',
                  event: 'OPERATOR_PING',
                  message: 'Manual operator ping from Control Room',
                  details: { timestamp: Date.now() },
                });
              }}
              className="px-2.5 py-1.5 bg-indigo-950/50 hover:bg-indigo-900/60 border border-indigo-700/60 rounded-lg text-xs text-indigo-300 font-medium transition-colors"
            >
              Test Ping
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-900 text-xs">
          {/* Category Filters */}
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-[11px] text-slate-500 mr-1 font-semibold">Category:</span>
            {(['ALL', 'HLS', 'VIDEO', 'INGEST', 'STATE', 'SCTE35', 'RECOVERY', 'NETWORK'] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                  selectedCategory === cat
                    ? 'bg-indigo-600 text-white font-bold'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Level Filters */}
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-[11px] text-slate-500 mr-1 font-semibold">Level:</span>
            {(
              [
                { id: 'ALL', label: 'All' },
                { id: 'ERRORS_WARNINGS', label: 'Warn/Err' },
                { id: 'error', label: 'Error' },
                { id: 'warn', label: 'Warn' },
                { id: 'success', label: 'Success' },
                { id: 'info', label: 'Info' },
              ] as const
            ).map((lvl) => (
              <button
                key={lvl.id}
                type="button"
                onClick={() => setSelectedLevel(lvl.id as any)}
                className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                  selectedLevel === lvl.id
                    ? 'bg-slate-200 text-slate-950 font-bold'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {lvl.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Log Stream Console */}
      <div
        ref={logContainerRef}
        className="bg-slate-950 border border-slate-800 rounded-xl max-h-[500px] overflow-y-auto divide-y divide-slate-800/60 font-mono text-xs select-text"
      >
        {logs.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <Terminal className="w-8 h-8 mx-auto mb-2 text-slate-600" />
            <p className="font-semibold text-slate-400">No logs match the current filter criteria.</p>
            <p className="text-[11px] text-slate-600 mt-1">
              Showing 0 of {rawLogsCount} total captured events. Adjust your filters or trigger media actions.
            </p>
          </div>
        ) : (
          logs.map((log) => {
            const isExpanded = expandedLogIds.has(log.id);
            const hasDetails = log.details !== undefined && log.details !== null;

            return (
              <div
                key={log.id}
                onClick={() => hasDetails && toggleExpand(log.id)}
                className={`p-2.5 hover:bg-slate-900/70 transition-colors ${
                  hasDetails ? 'cursor-pointer' : ''
                } ${log.level === 'error' ? 'bg-red-950/10' : ''}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    {/* Timestamp */}
                    <span className="text-[11px] text-slate-500 shrink-0 pt-0.5">
                      {log.timeFormatted}
                    </span>

                    {/* Category Badge */}
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded border shrink-0 uppercase font-mono ${getCategoryBadgeClass(
                        log.category
                      )}`}
                    >
                      {log.category}
                    </span>

                    {/* Level Badge */}
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded border shrink-0 uppercase font-mono ${getLevelBadgeClass(
                        log.level
                      )}`}
                    >
                      {log.level}
                    </span>

                    {/* Event Name */}
                    <span className="text-slate-300 font-bold shrink-0">{log.event}:</span>

                    {/* Message */}
                    <span className="text-slate-200 break-words flex-1">{log.message}</span>
                  </div>

                  {/* Actions / Expand Indicator */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => handleCopySingleLog(e, log)}
                      className="p-1 text-slate-500 hover:text-slate-200 rounded hover:bg-slate-800 transition-colors"
                      title="Copy entry to clipboard"
                    >
                      {copiedEntryId === log.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>

                    {hasDetails && (
                      <span className="text-slate-500 hover:text-slate-300">
                        {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                      </span>
                    )}
                  </div>
                </div>

                {/* Expanded Details JSON Inspector */}
                {isExpanded && hasDetails && (
                  <div className="mt-2.5 ml-14 p-2.5 bg-slate-900 border border-slate-800 rounded-lg overflow-x-auto text-[11px] text-cyan-300">
                    <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-800 text-[10px] text-slate-400 uppercase font-bold">
                      <span>Event Metadata & Payload</span>
                      <span className="text-slate-500 font-mono">ID: {log.id}</span>
                    </div>
                    <pre className="whitespace-pre-wrap font-mono">
                      {typeof log.details === 'object'
                        ? JSON.stringify(log.details, null, 2)
                        : String(log.details)}
                    </pre>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
        <span>Displaying {logs.length} events (capacity: 1,000 in-memory)</span>
        <span>Auto-cleared on page reload or via manual Clear button</span>
      </div>
    </div>
  );
};
