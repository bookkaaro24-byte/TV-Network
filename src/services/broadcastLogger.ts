/**
 * BroadcastLogger - Central In-Memory Audit Log Utility
 * 
 * Captures real-time HLS.js engine events, HTML5 video element state,
 * media ingest pipeline actions (file upload, transcoding, canvas thumbnailing),
 * and application broadcast state transitions.
 * 
 * Features:
 * - High-throughput ring buffer (up to 1,000 recent events).
 * - Reactive subscription mechanism for live UI updates in Control Room.
 * - Categorized events: HLS, VIDEO, INGEST, STATE, RECOVERY, NETWORK.
 * - One-click export to formatted JSON or plain-text diagnostic dumps.
 */

export type LogCategory = 'HLS' | 'VIDEO' | 'INGEST' | 'STATE' | 'RECOVERY' | 'NETWORK' | 'SCTE35';
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'success';

export interface BroadcastLogEntry {
  id: string;
  timestamp: number;
  timeFormatted: string;
  category: LogCategory;
  level: LogLevel;
  event: string;
  message: string;
  details?: Record<string, unknown> | unknown;
}

export interface LoggerStats {
  total: number;
  byCategory: Record<LogCategory, number>;
  byLevel: Record<LogLevel, number>;
  errorCount: number;
  warningCount: number;
  lastEventTime: number | null;
}

type LogListener = (logs: BroadcastLogEntry[], newEntry: BroadcastLogEntry) => void;

class BroadcastLoggerService {
  private static instance: BroadcastLoggerService;
  private readonly maxEntries: number = 1000;
  private logs: BroadcastLogEntry[] = [];
  private listeners: Set<LogListener> = new Set();

  private constructor() {
    // Initial system boot log
    this.log({
      category: 'STATE',
      level: 'info',
      event: 'LOGGER_INITIALIZED',
      message: 'BroadcastLogger in-memory audit log initialized with capacity of 1000 events.',
      details: {
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'node',
        mediaSourceSupported: typeof window !== 'undefined' ? ('MediaSource' in window) : false,
      },
    });
  }

  public static getInstance(): BroadcastLoggerService {
    if (!BroadcastLoggerService.instance) {
      BroadcastLoggerService.instance = new BroadcastLoggerService();
    }
    return BroadcastLoggerService.instance;
  }

  /**
   * Main logging function
   */
  public log(entry: {
    category: LogCategory;
    level?: LogLevel;
    event: string;
    message: string;
    details?: Record<string, unknown> | unknown;
  }): BroadcastLogEntry {
    const now = Date.now();
    const dateObj = new Date(now);
    const timeFormatted = `${String(dateObj.getHours()).padStart(2, '0')}:${String(
      dateObj.getMinutes()
    ).padStart(2, '0')}:${String(dateObj.getSeconds()).padStart(2, '0')}.${String(
      dateObj.getMilliseconds()
    ).padStart(3, '0')}`;

    const newLog: BroadcastLogEntry = {
      id: `log-${now}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: now,
      timeFormatted,
      category: entry.category,
      level: entry.level || 'info',
      event: entry.event,
      message: entry.message,
      details: entry.details,
    };

    // Ring-buffer maintenance
    if (this.logs.length >= this.maxEntries) {
      this.logs.shift();
    }
    this.logs.push(newLog);

    // Also output to browser console with clean formatting
    if (typeof window !== 'undefined') {
      const prefix = `[BroadcastLogger][${newLog.category}][${newLog.event}]`;
      if (newLog.level === 'error') {
        console.error(prefix, newLog.message, newLog.details ?? '');
      } else if (newLog.level === 'warn') {
        console.warn(prefix, newLog.message, newLog.details ?? '');
      } else if (newLog.level === 'debug') {
        console.debug(prefix, newLog.message, newLog.details ?? '');
      } else {
        console.log(prefix, newLog.message, newLog.details ?? '');
      }
    }

    // Notify active subscribers
    this.notifyListeners(newLog);

    return newLog;
  }

  /**
   * Helper: Hls.js events
   */
  public logHls(event: string, message: string, details?: unknown, level: LogLevel = 'info') {
    return this.log({
      category: 'HLS',
      level,
      event,
      message,
      details,
    });
  }

  /**
   * Helper: Video element events
   */
  public logVideo(event: string, message: string, details?: unknown, level: LogLevel = 'info') {
    return this.log({
      category: 'VIDEO',
      level,
      event,
      message,
      details,
    });
  }

  /**
   * Helper: Ingest & Preview events
   */
  public logIngest(stage: string, message: string, details?: unknown, level: LogLevel = 'info') {
    return this.log({
      category: 'INGEST',
      level,
      event: stage,
      message,
      details,
    });
  }

  /**
   * Helper: Broadcast state changes
   */
  public logState(stateName: string, message: string, details?: unknown, level: LogLevel = 'info') {
    return this.log({
      category: 'STATE',
      level,
      event: stateName,
      message,
      details,
    });
  }

  /**
   * Helper: Recovery and stall recovery actions
   */
  public logRecovery(action: string, message: string, details?: unknown, level: LogLevel = 'warn') {
    return this.log({
      category: 'RECOVERY',
      level,
      event: action,
      message,
      details,
    });
  }

  /**
   * Helper: SCTE-35 In-band cue markers and splice actions
   */
  public logScte35(event: string, message: string, details?: unknown, level: LogLevel = 'info') {
    return this.log({
      category: 'SCTE35',
      level,
      event,
      message,
      details,
    });
  }

  /**
   * Subscribe to log events
   */
  public subscribe(listener: LogListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(newEntry: BroadcastLogEntry) {
    const snapshot = [...this.logs];
    this.listeners.forEach((listener) => {
      try {
        listener(snapshot, newEntry);
      } catch (err) {
        console.error('Error notifying BroadcastLogger listener:', err);
      }
    });
  }

  /**
   * Get all current in-memory logs
   */
  public getLogs(): BroadcastLogEntry[] {
    return [...this.logs];
  }

  /**
   * Clear in-memory log buffer
   */
  public clear(): void {
    this.logs = [];
    this.log({
      category: 'STATE',
      level: 'info',
      event: 'LOGS_CLEARED',
      message: 'BroadcastLogger audit log was cleared by operator.',
    });
  }

  /**
   * Compute live statistics
   */
  public getStats(): LoggerStats {
    const stats: LoggerStats = {
      total: this.logs.length,
      byCategory: {
        HLS: 0,
        VIDEO: 0,
        INGEST: 0,
        STATE: 0,
        RECOVERY: 0,
        NETWORK: 0,
        SCTE35: 0,
      },
      byLevel: {
        debug: 0,
        info: 0,
        warn: 0,
        error: 0,
        success: 0,
      },
      errorCount: 0,
      warningCount: 0,
      lastEventTime: this.logs.length > 0 ? this.logs[this.logs.length - 1].timestamp : null,
    };

    for (const log of this.logs) {
      if (stats.byCategory[log.category] !== undefined) {
        stats.byCategory[log.category]++;
      }
      if (stats.byLevel[log.level] !== undefined) {
        stats.byLevel[log.level]++;
      }
      if (log.level === 'error') stats.errorCount++;
      if (log.level === 'warn') stats.warningCount++;
    }

    return stats;
  }

  /**
   * Export all logs as formatted JSON
   */
  public exportJson(): string {
    return JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        stats: this.getStats(),
        totalLogs: this.logs.length,
        logs: this.logs,
      },
      null,
      2
    );
  }

  /**
   * Export all logs as plain-text lines
   */
  public exportText(): string {
    return this.logs
      .map(
        (l) =>
          `[${l.timeFormatted}] [${l.category.padEnd(8)}] [${l.level.toUpperCase().padEnd(7)}] ${l.event}: ${
            l.message
          }${l.details ? ' ' + JSON.stringify(l.details) : ''}`
      )
      .join('\n');
  }
}

export const BroadcastLogger = BroadcastLoggerService.getInstance();
