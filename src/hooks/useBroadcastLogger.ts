import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  BroadcastLogger,
  BroadcastLogEntry,
  LogCategory,
  LogLevel,
  LoggerStats,
} from '../services/broadcastLogger';

export interface UseBroadcastLoggerOptions {
  categoryFilter?: LogCategory | 'ALL';
  levelFilter?: LogLevel | 'ALL' | 'ERRORS_WARNINGS';
  searchQuery?: string;
  limit?: number;
}

export function useBroadcastLogger(options: UseBroadcastLoggerOptions = {}) {
  const [logs, setLogs] = useState<BroadcastLogEntry[]>(() => BroadcastLogger.getLogs());
  const [stats, setStats] = useState<LoggerStats>(() => BroadcastLogger.getStats());

  useEffect(() => {
    // Initial sync
    setLogs(BroadcastLogger.getLogs());
    setStats(BroadcastLogger.getStats());

    // Subscribe to new logs
    const unsubscribe = BroadcastLogger.subscribe((allLogs) => {
      setLogs(allLogs);
      setStats(BroadcastLogger.getStats());
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const clearLogs = useCallback(() => {
    BroadcastLogger.clear();
  }, []);

  const exportJson = useCallback(() => {
    return BroadcastLogger.exportJson();
  }, []);

  const exportText = useCallback(() => {
    return BroadcastLogger.exportText();
  }, []);

  // Filtered log entries
  const filteredLogs = useMemo(() => {
    let result = logs;

    if (options.categoryFilter && options.categoryFilter !== 'ALL') {
      result = result.filter((l) => l.category === options.categoryFilter);
    }

    if (options.levelFilter && options.levelFilter !== 'ALL') {
      if (options.levelFilter === 'ERRORS_WARNINGS') {
        result = result.filter((l) => l.level === 'error' || l.level === 'warn');
      } else {
        result = result.filter((l) => l.level === options.levelFilter);
      }
    }

    if (options.searchQuery && options.searchQuery.trim()) {
      const q = options.searchQuery.toLowerCase();
      result = result.filter(
        (l) =>
          l.message.toLowerCase().includes(q) ||
          l.event.toLowerCase().includes(q) ||
          l.category.toLowerCase().includes(q) ||
          (l.details && JSON.stringify(l.details).toLowerCase().includes(q))
      );
    }

    if (options.limit && options.limit > 0) {
      result = result.slice(-options.limit);
    }

    return result;
  }, [logs, options.categoryFilter, options.levelFilter, options.searchQuery, options.limit]);

  return {
    logs: filteredLogs,
    rawLogsCount: logs.length,
    stats,
    clearLogs,
    exportJson,
    exportText,
    addLog: BroadcastLogger.log.bind(BroadcastLogger),
  };
}
