/**
 * useLinearPlayout - Core Playout Engine Hook
 * 
 * Manages 24/7 continuous linear stream playout, systemic clock alignment,
 * simulated hot-switching to live sports feeds, SCTE-35 ad cue insertion markers,
 * stream timeout watchdog with automatic failover recovery, and playout analytics.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  BroadcastProgram,
  EPGSchedule,
  HotSwitchState,
  AdInsertionMarker,
  PlayoutAnalytics,
  PlayoutLogEvent,
  PlayoutEventType,
} from '../types/broadcast';
import { SAMPLE_STREAMS } from '../data/mockBroadcastData';

interface UseLinearPlayoutOptions {
  channelSchedule: EPGSchedule;
  autoPlay?: boolean;
  timeAcceleration?: number; // 1 for real-time, >1 for accelerated simulation
  onEventDispatched?: (event: PlayoutLogEvent) => void;
}

export interface LinearPlayoutResult {
  // Current Running Program & Upcoming
  currentProgram: BroadcastProgram | null;
  nextProgram: BroadcastProgram | null;
  systemTime: number;
  
  // Timing & Progress
  elapsedSeconds: number;
  remainingSeconds: number;
  progressPercent: number;
  formattedTimeRemaining: string;
  formattedElapsed: string;

  // Active Stream State
  activeStreamUrl: string;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  isMuted: boolean;
  setIsMuted: (muted: boolean) => void;
  volume: number;
  setVolume: (vol: number) => void;

  // Hot-Switching Engine
  hotSwitch: HotSwitchState;
  triggerHotSwitch: (enable: boolean, targetUrl?: string) => void;

  // Ad Insertion Marker System
  activeAdBreak: AdInsertionMarker | null;
  adTimeRemainingSeconds: number;
  skipAdBreak: () => void;
  triggerManualAdBreak: (durationSeconds?: number, customMarker?: Partial<AdInsertionMarker>) => void;

  // Stream Health & Timeout Recovery
  streamHealth: 'optimal' | 'buffering' | 'recovering' | 'error';
  streamError: string | null;
  retryCount: number;
  triggerStreamTimeoutSimulation: () => void;
  recoverStream: () => void;

  // Analytics Engine
  analytics: PlayoutAnalytics;
  eventLogs: PlayoutLogEvent[];
  clearLogs: () => void;

  // Player Ref integration helpers
  reportBufferStall: (stalled: boolean) => void;
  reportBitrateChange: (bitrateKbps: number) => void;
  reportPlaybackTick: (currentTimeSec: number) => void;
}

export function useLinearPlayout({
  channelSchedule,
  autoPlay = true,
  timeAcceleration = 1,
  onEventDispatched,
}: UseLinearPlayoutOptions): LinearPlayoutResult {
  // Systemic clock - runs in real time (or accelerated if configured)
  const [systemTime, setSystemTime] = useState<number>(Date.now());
  const [isPlaying, setIsPlaying] = useState<boolean>(autoPlay);
  const [isMuted, setIsMuted] = useState<boolean>(true); // Start muted for browser autoplay policies
  const [volume, setVolume] = useState<number>(0.8);

  // Active Hot-Switch State
  const [hotSwitch, setHotSwitch] = useState<HotSwitchState>({
    isActive: false,
    sourceType: 'scheduled_vod',
    feedProtocol: 'HLS',
    ingestEndpoint: SAMPLE_STREAMS.SPORTS_LIVE,
    latencyMs: 1200,
    status: 'idle',
  });

  // Automatically disengage hot-switch whenever tuning to a different channel
  const prevChannelIdRef = useRef<string>(channelSchedule?.channelId);
  useEffect(() => {
    if (prevChannelIdRef.current && prevChannelIdRef.current !== channelSchedule?.channelId) {
      prevChannelIdRef.current = channelSchedule?.channelId;
      setHotSwitch({
        isActive: false,
        sourceType: 'scheduled_vod',
        feedProtocol: 'HLS',
        ingestEndpoint: SAMPLE_STREAMS.SPORTS_LIVE,
        latencyMs: 1400,
        status: 'idle',
      });
    } else {
      prevChannelIdRef.current = channelSchedule?.channelId;
    }
  }, [channelSchedule?.channelId]);

  // Active SCTE-35 Ad Break State
  const [activeAdBreak, setActiveAdBreak] = useState<AdInsertionMarker | null>(null);
  const [adTimeRemainingSeconds, setAdTimeRemainingSeconds] = useState<number>(0);
  const firedCueIdsRef = useRef<Set<string>>(new Set());

  // Stream Health, Watchdog & Error Recovery
  const [streamHealth, setStreamHealth] = useState<'optimal' | 'buffering' | 'recovering' | 'error'>('optimal');
  const [streamError, setStreamError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState<number>(0);
  const lastHeartbeatRef = useRef<number>(Date.now());
  const timeoutWatchdogRef = useRef<NodeJS.Timeout | null>(null);

  // Event Logs & Audit Trail
  const [eventLogs, setEventLogs] = useState<PlayoutLogEvent[]>([]);

  // Dispatch Log Event Helper
  const dispatchEvent = useCallback((type: PlayoutEventType, message: string, metadata?: Record<string, unknown>) => {
    const event: PlayoutLogEvent = {
      id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: Date.now(),
      type,
      message,
      metadata,
    };

    setEventLogs((prev) => [event, ...prev.slice(0, 99)]); // Keep last 100 events
    onEventDispatched?.(event);
  }, [onEventDispatched]);

  // Analytics State
  const [analytics, setAnalytics] = useState<PlayoutAnalytics>({
    viewerEngagementMinutes: 0.1,
    bufferStallCount: 0,
    bufferStallDurationSeconds: 0,
    currentBitrateKbps: 4800,
    averageBitrateKbps: 4500,
    droppedFrames: 0,
    latencyMs: 820,
    adImpressions: 0,
    totalWatchTimeSeconds: 12,
    playbackQuality: '1080p60 (Auto)',
  });

  // Calculate current program and next program based on systemTime
  const { currentProgram, nextProgram } = useMemo(() => {
    const progs = channelSchedule.programs;
    if (!progs || progs.length === 0) {
      return { currentProgram: null, nextProgram: null };
    }

    // Direct priority for assigned live broadcast programs
    if (progs[0]?.isLive) {
      return {
        currentProgram: progs[0],
        nextProgram: progs[1] || null,
      };
    }

    // Find program covering the current time
    const currentIdx = progs.findIndex((p) => systemTime >= p.startTime && systemTime < p.endTime);
    
    if (currentIdx !== -1) {
      return {
        currentProgram: progs[currentIdx],
        nextProgram: progs[currentIdx + 1] || null,
      };
    }

    // If outside ranges (e.g. before first or after last), pick closest or fallback to first
    const futureIdx = progs.findIndex((p) => p.startTime > systemTime);
    if (futureIdx !== -1) {
      return {
        currentProgram: progs[Math.max(0, futureIdx - 1)],
        nextProgram: progs[futureIdx],
      };
    }

    // Default fallback to active show
    return {
      currentProgram: progs[0],
      nextProgram: progs[1] || null,
    };
  }, [channelSchedule, systemTime]);

  // Previous program ref to detect program changes
  const prevProgramIdRef = useRef<string | null>(null);

  // Active stream URL calculation (Hot-switch takes priority, otherwise current program stream)
  const activeStreamUrl = useMemo(() => {
    if (hotSwitch.isActive && hotSwitch.status === 'live_ingest') {
      return hotSwitch.ingestEndpoint;
    }
    return currentProgram?.streamUrl || SAMPLE_STREAMS.SPORTS_LIVE;
  }, [hotSwitch, currentProgram]);

  // Track program boundary switches
  useEffect(() => {
    if (!currentProgram) return;

    if (prevProgramIdRef.current !== currentProgram.id) {
      if (prevProgramIdRef.current !== null) {
        dispatchEvent('PROGRAM_ENDED', `Completed broadcast: ${prevProgramIdRef.current}`);
      }
      prevProgramIdRef.current = currentProgram.id;
      // Reset ad cues for new program
      firedCueIdsRef.current.clear();
      dispatchEvent('PROGRAM_STARTED', `On Air: "${currentProgram.title}" [${currentProgram.contentType.toUpperCase()}]`, {
        programId: currentProgram.id,
        durationMinutes: currentProgram.durationMinutes,
      });
    }
  }, [currentProgram, dispatchEvent]);

  // Clock Ticker (runs every 1000ms * timeAcceleration)
  useEffect(() => {
    const interval = setInterval(() => {
      setSystemTime((prev) => prev + (1000 * timeAcceleration));
      lastHeartbeatRef.current = Date.now();

      // Accumulate engagement time when playing
      if (isPlaying) {
        setAnalytics((prev) => {
          const totalSec = prev.totalWatchTimeSeconds + 1;
          return {
            ...prev,
            totalWatchTimeSeconds: totalSec,
            viewerEngagementMinutes: Number((totalSec / 60).toFixed(1)),
          };
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isPlaying, timeAcceleration]);

  // Ad Break Countdown Timer
  useEffect(() => {
    if (!activeAdBreak) return;

    const interval = setInterval(() => {
      setAdTimeRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setActiveAdBreak(null);
          dispatchEvent('AD_BREAK_END', `Ad spot completed for ${activeAdBreak.advertiser}`);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [activeAdBreak, dispatchEvent]);

  // Calculate elapsed and remaining time in current program
  const { elapsedSeconds, remainingSeconds, progressPercent } = useMemo(() => {
    if (!currentProgram) {
      return { elapsedSeconds: 0, remainingSeconds: 0, progressPercent: 0 };
    }

    const totalDurationMs = Math.max(1000, currentProgram.endTime - currentProgram.startTime);
    const elapsedMs = Math.max(0, systemTime - currentProgram.startTime);
    const remainingMs = Math.max(0, currentProgram.endTime - systemTime);

    const elapsedSec = Math.floor(elapsedMs / 1000);
    const remainingSec = Math.floor(remainingMs / 1000);
    const progress = Math.min(100, Math.max(0, (elapsedMs / totalDurationMs) * 100));

    return {
      elapsedSeconds: elapsedSec,
      remainingSeconds: remainingSec,
      progressPercent: progress,
    };
  }, [currentProgram, systemTime]);

  // Check Ad Cue Markers against elapsed seconds
  useEffect(() => {
    if (!currentProgram || !currentProgram.adCuePoints || activeAdBreak) return;

    currentProgram.adCuePoints.forEach((marker) => {
      if (
        !firedCueIdsRef.current.has(marker.id) &&
        elapsedSeconds >= marker.cueTimeOffsetSeconds &&
        elapsedSeconds <= marker.cueTimeOffsetSeconds + 5
      ) {
        firedCueIdsRef.current.add(marker.id);
        setActiveAdBreak(marker);
        setAdTimeRemainingSeconds(marker.durationSeconds);
        setAnalytics((prev) => ({ ...prev, adImpressions: prev.adImpressions + 1 }));
        dispatchEvent('AD_BREAK_START', `SCTE-35 Marker: Triggered "${marker.title}" (${marker.durationSeconds}s)`, {
          markerId: marker.id,
          advertiser: marker.advertiser,
        });
      }
    });
  }, [currentProgram, elapsedSeconds, activeAdBreak, dispatchEvent]);

  // Format Helper: Seconds to MM:SS or HH:MM:SS
  const formatTime = (totalSec: number): string => {
    const hours = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formattedTimeRemaining = useMemo(() => formatTime(remainingSeconds), [remainingSeconds]);
  const formattedElapsed = useMemo(() => formatTime(elapsedSeconds), [elapsedSeconds]);

  // Trigger Hot-Switch (simulate instantaneous or planned live sports ingest take-over)
  const triggerHotSwitch = useCallback((enable: boolean, targetUrl?: string) => {
    if (enable) {
      dispatchEvent('HOT_SWITCH_INITIATED', 'Playout automation initiated Hot-Switch to Live SRT Ingest', {
        protocol: 'SRT',
        target: targetUrl || SAMPLE_STREAMS.SPORTS_LIVE,
      });

      setHotSwitch({
        isActive: true,
        sourceType: 'live_srt_rtmp',
        feedProtocol: 'SRT',
        ingestEndpoint: targetUrl || SAMPLE_STREAMS.SPORTS_LIVE,
        latencyMs: 820,
        status: 'transitioning',
      });

      // Simulated seamless frame-accurate cutover delay (800ms)
      setTimeout(() => {
        setHotSwitch((prev) => ({
          ...prev,
          status: 'live_ingest',
          switchTimestamp: Date.now(),
        }));
        dispatchEvent('HOT_SWITCH_COMPLETED', 'Feed switched seamlessly to Live SRT Sports Line at 60fps (0.82s latency)');
      }, 800);
    } else {
      dispatchEvent('HOT_SWITCH_COMPLETED', 'Returned master playout to scheduled linear timeline');
      setHotSwitch({
        isActive: false,
        sourceType: 'scheduled_vod',
        feedProtocol: 'HLS',
        ingestEndpoint: currentProgram?.streamUrl || SAMPLE_STREAMS.SPORTS_LIVE,
        latencyMs: 1400,
        status: 'idle',
      });
    }
  }, [currentProgram, dispatchEvent]);

  // Skip Active Ad Break
  const skipAdBreak = useCallback(() => {
    if (activeAdBreak) {
      dispatchEvent('AD_BREAK_END', `Ad spot manually skipped: ${activeAdBreak.advertiser}`);
      setActiveAdBreak(null);
      setAdTimeRemainingSeconds(0);
    }
  }, [activeAdBreak, dispatchEvent]);

  // Manual Trigger Ad Break (e.g. for testing or engineer control room)
  const triggerManualAdBreak = useCallback((durationSeconds: number = 15, customMarker?: Partial<AdInsertionMarker>) => {
    const marker: AdInsertionMarker = {
      id: customMarker?.id || `manual-ad-${Date.now()}`,
      cueTimeOffsetSeconds: elapsedSeconds,
      durationSeconds,
      type: customMarker?.type || 'mid_roll',
      title: customMarker?.title || 'Google Cloud AI Studio',
      advertiser: customMarker?.advertiser || 'Google Cloud',
      adCreativeUrl: customMarker?.adCreativeUrl || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      callToActionUrl: customMarker?.callToActionUrl || 'https://cloud.google.com/ai',
      callToActionText: customMarker?.callToActionText || 'Learn More',
      thumbnailUrl: customMarker?.thumbnailUrl,
      status: 'active',
    };
    setActiveAdBreak(marker);
    setAdTimeRemainingSeconds(durationSeconds);
    setAnalytics((prev) => ({ ...prev, adImpressions: prev.adImpressions + 1 }));
    dispatchEvent('AD_BREAK_START', `Manual SCTE-35 Injected Ad Break (${durationSeconds}s): ${marker.title}`);
  }, [elapsedSeconds, dispatchEvent]);

  // Stream Timeout Watchdog Simulation & Recovery
  const triggerStreamTimeoutSimulation = useCallback(() => {
    setStreamHealth('error');
    setStreamError('ERR_STREAM_TIMEOUT: Upstream RTMP/HLS ingest signal lost (5000ms heartbeat exceeded)');
    dispatchEvent('STREAM_TIMEOUT', 'Upstream ingest signal dropped. Initiating automated failover sequence...');

    // Automatic failover logic: Attempt retry after 3 seconds
    setRetryCount(1);
    setStreamHealth('recovering');

    if (timeoutWatchdogRef.current) clearTimeout(timeoutWatchdogRef.current);
    timeoutWatchdogRef.current = setTimeout(() => {
      setStreamHealth('optimal');
      setStreamError(null);
      setRetryCount(0);
      dispatchEvent('STREAM_RECOVERED', 'Failover secondary ingest line engaged. Video pipeline restored.');
    }, 3200);
  }, [dispatchEvent]);

  // Manual Recover Stream
  const recoverStream = useCallback(() => {
    if (timeoutWatchdogRef.current) clearTimeout(timeoutWatchdogRef.current);
    setStreamHealth('optimal');
    setStreamError(null);
    setRetryCount(0);
    dispatchEvent('STREAM_RECOVERED', 'Manual stream reset completed. Playout nominal.');
  }, [dispatchEvent]);

  // Report Buffer Stall from Video Player
  const reportBufferStall = useCallback((stalled: boolean) => {
    if (stalled) {
      setStreamHealth('buffering');
      setAnalytics((prev) => ({
        ...prev,
        bufferStallCount: prev.bufferStallCount + 1,
        bufferStallDurationSeconds: prev.bufferStallDurationSeconds + 1,
      }));
      dispatchEvent('BUFFER_STALL', 'Player buffer underrun detected');
    } else {
      setStreamHealth('optimal');
    }
  }, [dispatchEvent]);

  // Report Bitrate Change from HLS adaptive bitrate
  const reportBitrateChange = useCallback((bitrateKbps: number) => {
    setAnalytics((prev) => ({
      ...prev,
      currentBitrateKbps: bitrateKbps,
      averageBitrateKbps: Math.round((prev.averageBitrateKbps * 4 + bitrateKbps) / 5),
    }));
  }, []);

  // Report Playback Tick from HTML5 / HLS video element
  const reportPlaybackTick = useCallback((_currentTimeSec: number) => {
    // Keeps internal heartbeat alive
    lastHeartbeatRef.current = Date.now();
  }, []);

  // Clear Audit Logs
  const clearLogs = useCallback(() => {
    setEventLogs([]);
  }, []);

  return {
    currentProgram,
    nextProgram,
    systemTime,
    elapsedSeconds,
    remainingSeconds,
    progressPercent,
    formattedTimeRemaining,
    formattedElapsed,
    activeStreamUrl,
    isPlaying,
    setIsPlaying,
    isMuted,
    setIsMuted,
    volume,
    setVolume,
    hotSwitch,
    triggerHotSwitch,
    activeAdBreak,
    adTimeRemainingSeconds,
    skipAdBreak,
    triggerManualAdBreak,
    streamHealth,
    streamError,
    retryCount,
    triggerStreamTimeoutSimulation,
    recoverStream,
    analytics,
    eventLogs,
    clearLogs,
    reportBufferStall,
    reportBitrateChange,
    reportPlaybackTick,
  };
}
