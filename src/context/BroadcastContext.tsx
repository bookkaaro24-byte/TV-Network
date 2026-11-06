/**
 * BroadcastContext - Global State Engine with Firebase Cloud Sync
 * Manages Dual Viewing Mode (Linear vs VOD), Channels, EPG, Firebase Real-Time Chat,
 * Polls, Cloud Reminders, and Playout Hook.
 */

import React, { createContext, useContext, useState, useEffect, useRef, ReactNode, useMemo, useCallback } from 'react';
import {
  EPGSchedule,
  BroadcastProgram,
  ChatMessage,
  PollData,
  TickerItem,
  SCTE35CueMarker,
  SCTE35CommandType,
  SCTE35SegmentationType,
  InAppLiveStudioSession,
  HlsDiagnosticMetrics,
  HlsFragmentMetric,
  HlsLevelInfo,
  NonLinearAd,
} from '../types/broadcast';
import { getStoredMediaUrl, getAllStoredMedia, deleteStoredMedia } from '../services/mediaStorageService';
import { extractYouTubeVideoId } from '../utils/youtube';
import { BroadcastLogger } from '../services/broadcastLogger';
import {
  generateScheduleForNow,
  MOCK_TICKER_ITEMS,
  INITIAL_CHAT_MESSAGES,
  INITIAL_POLL_DATA,
  MOCK_VOD_CATALOG,
} from '../data/mockBroadcastData';
import { useLinearPlayout, LinearPlayoutResult } from '../hooks/useLinearPlayout';
import { AdCreative, getStoredAdInventory, saveAdInventoryToStorage } from '../data/adInventory';
import {
  auth,
  db,
  signInWithGoogle,
  logOut,
  testConnection,
} from '../lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrors';

export type ViewingMode = 'linear' | 'vod';

export interface ChannelPlayoutTimeline {
  channelId: string;
  epochStartTime: number; // Unix epoch ms when continuous playback began
  durationSeconds: number; // Duration of video/program in seconds
  streamUrl: string;
  title?: string;
  isLive?: boolean;
}

export interface ScreenShareOptions {
  surfaceType?: 'monitor' | 'browser' | 'window' | 'pip' | 'virtual';
  resolution?: '4k' | '1080p' | '720p';
  includeAudio?: boolean;
  includeMic?: boolean;
  frameRate?: number;
  routeTo?: 'network' | 'switcher' | 'youtube' | 'all';
}

interface BroadcastContextType {
  // Viewing Mode
  viewingMode: ViewingMode;
  setViewingMode: (mode: ViewingMode) => void;
  toggleViewingMode: () => void;

  // Channels & EPG Schedules
  channels: EPGSchedule[];
  activeChannelId: string;
  setActiveChannelId: (id: string) => void;
  activeChannel: EPGSchedule;
  channelAssignments: Record<string, BroadcastProgram>;
  channelPlayoutRevision: number;
  assignVideoToChannel: (
    channelId: string,
    video: Partial<BroadcastProgram> & { streamUrl: string; title: string },
    broadcastImmediately?: boolean
  ) => void;
  unassignChannelVideo: (channelId: string) => void;
  createCustomChannel: (
    channelName: string,
    channelNumber?: number,
    initialVideo?: Partial<BroadcastProgram> & { streamUrl: string; title: string },
    broadcastImmediately?: boolean
  ) => string;
  addProgramToChannelSchedule: (channelId: string, program: BroadcastProgram) => void;
  updateChannelProgram: (channelId: string, programId: string, updates: Partial<BroadcastProgram>) => void;
  removeProgramFromChannelSchedule: (channelId: string, programId: string) => void;
  toggleFavoriteChannel: (channelId: string) => void;

  // 24/7 Channel Playout Master Clock (Continuous Playback Across All Channels)
  getChannelPlayoutTime: (channelId?: string, customDurationSec?: number) => number;
  calibrateChannelPlayoutTime: (channelId: string | undefined, currentVideoTimeSec: number, durationSec?: number) => void;

  // Linear Playout Engine
  playout: LinearPlayoutResult;

  // VOD Catalog & Selected VOD
  vodCatalog: BroadcastProgram[];
  selectedVodProgram: BroadcastProgram | null;
  setSelectedVodProgram: (program: BroadcastProgram | null) => void;
  selectVodProgram: (program: BroadcastProgram) => void;
  removeVodProgram: (programId: string) => Promise<void>;
  purgeInvalidUploadedVideos: () => Promise<{ removedCount: number }>;
  deduplicateVodLibrary: () => Promise<{ removedCount: number }>;
  vodSearchQuery: string;
  setVodSearchQuery: (q: string) => void;
  vodCategoryFilter: string;
  setVodCategoryFilter: (cat: string) => void;
  addCustomVodProgram: (program: BroadcastProgram, playImmediately?: boolean) => void;
  isUploadModalOpen: boolean;
  setIsUploadModalOpen: (open: boolean) => void;

  // Lower Third Ticker & Real Live News
  tickerItems: TickerItem[];
  isTickerVisible: boolean;
  setIsTickerVisible: (vis: boolean) => void;
  tickerCategoryFilter: string;
  setTickerCategoryFilter: (cat: string) => void;
  tickerFontSize: 'normal' | 'large' | 'jumbo';
  setTickerFontSize: (size: 'normal' | 'large' | 'jumbo') => void;
  isRealNewsLoading: boolean;
  refreshRealNews: () => Promise<void>;
  realNewsLastUpdated: number | null;
  addCustomTickerItem: (item: { headline: string; category?: string; change?: string; isBreaking?: boolean; source?: string }) => Promise<void>;
  removeCustomTickerItem: (id: string) => Promise<void>;
  isFlashNewsModalOpen: boolean;
  setIsFlashNewsModalOpen: (open: boolean) => void;

  // Interactive Live Chat
  chatMessages: ChatMessage[];
  sendChatMessage: (text: string) => void;

  // Interactive Poll
  pollData: PollData;
  voteInPoll: (optionId: string) => void;

  // Broadcast Engineer Control Room Modal
  isControlRoomOpen: boolean;
  setIsControlRoomOpen: (open: boolean) => void;
  controlRoomInitialTab: string | null;
  setControlRoomInitialTab: (tab: string | null) => void;
  openControlRoomToTab: (tab: string) => void;

  // Live Sports Simulated Score Updates
  simulatedSportsScore: { home: number; away: number; minute: string };
  triggerSportsGoal: (team: 'home' | 'away') => void;

  // Reminders for Upcoming Broadcasts
  reminders: string[];
  toggleReminder: (programId: string) => void;
  hasReminder: (programId: string) => boolean;

  // SCTE-35 Real-Time Cue Marker System & SSAI Ad Ingest
  scte35Markers: SCTE35CueMarker[];
  activeScte35Marker: SCTE35CueMarker | null;
  injectScte35Cue: (options?: {
    durationSeconds?: number;
    commandType?: SCTE35CommandType;
    segmentationType?: SCTE35SegmentationType;
    segmentationTypeName?: string;
    adCreativeUrl?: string;
    adTitle?: string;
    advertiser?: string;
    callToActionUrl?: string;
    callToActionText?: string;
    thumbnailUrl?: string;
  }) => void;
  clearScte35History: () => void;
  isScte35OverlayOpen: boolean;
  setIsScte35OverlayOpen: (open: boolean) => void;

  // Ad Creative Inventory (SSAI / SCTE-35)
  adInventory: AdCreative[];
  selectedAdCreativeId: string;
  setSelectedAdCreativeId: (id: string) => void;
  selectedAdCreative: AdCreative | null;
  addCustomAdCreative: (creative: AdCreative) => void;

  // Non-Linear Advertising (Squeeze-Back & Corner Bug, Playout Never Stops)
  nonLinearAd: NonLinearAd;
  triggerNonLinearAd: (options?: Partial<NonLinearAd>) => void;
  dismissNonLinearAd: () => void;

  // In-Browser Live Studio (OBS-Free Broadcast)
  isLiveStudioOpen: boolean;
  setIsLiveStudioOpen: (open: boolean) => void;
  liveStudioStream: MediaStream | null;
  isLiveStudioBroadcasting: boolean;
  liveStudioSession: InAppLiveStudioSession;
  startLiveStudioBroadcast: (stream: MediaStream, title: string) => void;
  updateLiveStudioStream: (stream: MediaStream) => void;
  stopLiveStudioBroadcast: (recordedBlob?: Blob) => Promise<void>;

  // Screen Sharing Engine (Display / Window / Tab / PiP / Virtual Desk)
  screenShareStream: MediaStream | null;
  isScreenSharing: boolean;
  isScreenShareModalOpen: boolean;
  setIsScreenShareModalOpen: (open: boolean) => void;
  activeScreenShareOptions: ScreenShareOptions;
  startScreenShare: (options?: ScreenShareOptions) => Promise<MediaStream | null>;
  stopScreenShare: () => void;

  // Unified Studio Switcher Program Bus (Synchronizes Switcher, Main TV, Multi-Screen, and YouTube)
  studioProgramSceneId: string;
  setStudioProgramSceneId: (sceneId: string) => void;
  syncSwitcherProgramToNetwork: (streamUrl: string, sceneName: string) => void;

  // Firebase Auth State & Sync
  currentUser: User | null;
  isAuthLoading: boolean;
  googleAccessToken: string | null;
  setGoogleAccessToken: (token: string | null) => void;
  youtubeStreamKey: string;
  setYoutubeStreamKey: (key: string) => void;
  youtubeBroadcastId: string;
  setYoutubeBroadcastId: (id: string) => void;
  signIn: () => Promise<string | null>;
  signOutUser: () => Promise<void>;

  // Real-Time HLS Telemetry & Diagnostic Metrics (Hls.js Events API)
  hlsDiagnostics: HlsDiagnosticMetrics;
  reportHlsDiagnostics: (update: Partial<HlsDiagnosticMetrics>) => void;
  recordHlsFragment: (fragment: HlsFragmentMetric) => void;
  setHlsManualLevel: (levelIndex: number) => void;
  targetHlsManualLevel: number;
  clearHlsDiagnostics: () => void;
}

const BroadcastContext = createContext<BroadcastContextType | null>(null);

const SETTINGS_STORAGE_KEY = 'apex_broadcast_user_settings_v1';

interface StoredUserSettings {
  activeChannelId?: string;
  viewingMode?: ViewingMode;
  hotSwitchActive?: boolean;
  selectedVodId?: string;
}

export const BroadcastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // 1. Dual Viewing Mode initialized from localStorage
  const [viewingMode, setViewingMode] = useState<ViewingMode>(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
        if (raw) {
          const parsed: StoredUserSettings = JSON.parse(raw);
          if (parsed.viewingMode === 'linear' || parsed.viewingMode === 'vod') {
            return parsed.viewingMode;
          }
        }
      } catch (e) {
        console.warn('Could not read stored viewingMode:', e);
      }
    }
    return 'linear';
  });

  // 2. Channel Assignments & Custom Channels
  const CHANNEL_ASSIGNMENTS_KEY = 'apex_channel_assignments_v2';
  const CUSTOM_CHANNELS_KEY = 'apex_custom_channels_v2';
  const CHANNEL_TIMELINES_KEY = 'apex_channel_timelines_v2';
  const FAVORITES_STORAGE_KEY = 'apex_favorite_channels_v1';

  const [favoriteChannelIds, setFavoriteChannelIds] = useState<Set<string>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
        if (raw) return new Set(JSON.parse(raw));
      } catch (e) {
        console.warn('Could not read favoriteChannelIds from localStorage:', e);
      }
    }
    return new Set(['apex-101']);
  });

  const toggleFavoriteChannel = useCallback((channelId: string) => {
    setFavoriteChannelIds((prev) => {
      const next = new Set(prev);
      if (next.has(channelId)) {
        next.delete(channelId);
      } else {
        next.add(channelId);
      }
      try {
        localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });
  }, []);

  const [channelAssignments, setChannelAssignments] = useState<Record<string, BroadcastProgram>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(CHANNEL_ASSIGNMENTS_KEY);
        if (raw) return JSON.parse(raw);
      } catch (e) {
        console.warn('Could not read channelAssignments from localStorage:', e);
      }
    }
    return {};
  });

  const [channelTimelineAnchors, setChannelTimelineAnchors] = useState<Record<string, ChannelPlayoutTimeline>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(CHANNEL_TIMELINES_KEY);
        if (raw) return JSON.parse(raw);
      } catch (e) {
        console.warn('Could not read channel timelines from localStorage:', e);
      }
    }
    return {};
  });

  const [customChannels, setCustomChannels] = useState<EPGSchedule[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(CUSTOM_CHANNELS_KEY);
        if (raw) return JSON.parse(raw);
      } catch (e) {
        console.warn('Could not read customChannels from localStorage:', e);
      }
    }
    return [];
  });

  // Helper to normalize channel ID across formats (e.g. 'apex-101', 'ch-101', '101')
  const normalizeChannelId = useCallback((id: string | undefined, channelList: EPGSchedule[]): string => {
    if (!id) return 'apex-101';
    const found = channelList.find(
      (c) =>
        c.channelId === id ||
        c.channelId.toLowerCase() === id.toLowerCase() ||
        c.channelId.replace('apex-', 'ch-') === id ||
        c.channelId.replace('apex-', '') === id ||
        c.channelNumber.toString() === id.replace(/\D/g, '')
    );
    return found ? found.channelId : id;
  }, []);

  // Builder: Merge dynamic schedules with assigned programs & custom channels
  const buildMergedChannels = useCallback(
    (
      baseTime: number,
      assignments: Record<string, BroadcastProgram>,
      customList: EPGSchedule[],
      favIds?: Set<string>
    ): EPGSchedule[] => {
      const defaultSchedules = generateScheduleForNow(baseTime);
      const combined = [...defaultSchedules];

      for (const custom of customList) {
        if (!combined.some((c) => c.channelId === custom.channelId)) {
          combined.push(custom);
        }
      }

      return combined.map((channel) => {
        const assigned =
          assignments[channel.channelId] ||
          assignments[channel.channelId.replace('apex-', 'ch-')] ||
          assignments[channel.channelId.replace('apex-', '')] ||
          assignments[channel.channelNumber.toString()];
        const isFav = favIds ? favIds.has(channel.channelId) : favoriteChannelIds.has(channel.channelId);

        if (!assigned) {
          return {
            ...channel,
            isFavorite: isFav,
          };
        }

        const durMs = (assigned.durationMinutes || 60) * 60 * 1000;
        const liveShow: BroadcastProgram = {
          ...assigned,
          id: `live-assigned-${channel.channelId}-${assigned.id || 'now'}`,
          startTime: baseTime - 1000,
          endTime: baseTime + durMs,
          isLive: true,
        };

        const existingPrograms = channel.programs || [];
        const upcomingPrograms = existingPrograms.map((p, idx) => ({
          ...p,
          startTime: baseTime + durMs + idx * 30 * 60 * 1000,
          endTime: baseTime + durMs + (idx + 1) * 30 * 60 * 1000,
          isLive: false,
        }));

        return {
          ...channel,
          isFavorite: isFav,
          programs: [liveShow, ...upcomingPrograms],
        };
      });
    },
    [favoriteChannelIds]
  );

  const [channels, setChannels] = useState<EPGSchedule[]>(() => {
    const rawAssignments = typeof window !== 'undefined' ? localStorage.getItem(CHANNEL_ASSIGNMENTS_KEY) : null;
    const initialAssignments = rawAssignments ? JSON.parse(rawAssignments) : {};
    const rawCustom = typeof window !== 'undefined' ? localStorage.getItem(CUSTOM_CHANNELS_KEY) : null;
    const initialCustom = rawCustom ? JSON.parse(rawCustom) : [];
    const rawFavs = typeof window !== 'undefined' ? localStorage.getItem(FAVORITES_STORAGE_KEY) : null;
    const initialFavs = rawFavs ? new Set<string>(JSON.parse(rawFavs)) : new Set<string>(['apex-101']);
    return buildMergedChannels(Date.now(), initialAssignments, initialCustom, initialFavs);
  });

  // Keep channels isFavorite flag in sync with favoriteChannelIds
  useEffect(() => {
    setChannels((prev) =>
      prev.map((ch) => ({
        ...ch,
        isFavorite: favoriteChannelIds.has(ch.channelId),
      }))
    );
  }, [favoriteChannelIds]);

  const [activeChannelId, setActiveChannelIdState] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
        if (raw) {
          const parsed: StoredUserSettings = JSON.parse(raw);
          if (parsed.activeChannelId) {
            return parsed.activeChannelId;
          }
        }
      } catch (e) {
        console.warn('Could not read stored activeChannelId:', e);
      }
    }
    return 'apex-101';
  });

  // Playout revision token for atomic player re-render and synchronization
  const [channelPlayoutRevision, setChannelPlayoutRevision] = useState<number>(0);
  const playoutRef = useRef<LinearPlayoutResult | null>(null);

  const setActiveChannelId = useCallback((id: string) => {
    const canonical = normalizeChannelId(id, channels);
    setActiveChannelIdState(canonical);
    setViewingMode('linear');
    setSelectedVodProgram(null);
    if (playoutRef.current?.hotSwitch?.isActive) {
      playoutRef.current.triggerHotSwitch(false);
    }
    setChannelPlayoutRevision((rev) => rev + 1);
    try {
      const raw = localStorage.getItem(SETTINGS_STORAGE_KEY) || '{}';
      const parsed = JSON.parse(raw);
      parsed.activeChannelId = canonical;
      parsed.viewingMode = 'linear';
      parsed.hotSwitchActive = false;
      delete parsed.selectedVodId;
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(parsed));
    } catch {}
  }, [channels, normalizeChannelId]);

  // Active Channel lookup with robust canonical fallback
  const activeChannel = useMemo(() => {
    const canonicalId = normalizeChannelId(activeChannelId, channels);
    return (
      channels.find((c) => c.channelId === canonicalId) ||
      channels.find((c) => c.channelId === activeChannelId) ||
      channels[0]
    );
  }, [channels, activeChannelId, normalizeChannelId]);

  // Periodic schedule refresh - ALWAYS preserves assigned videos!
  useEffect(() => {
    const interval = setInterval(() => {
      setChannels(buildMergedChannels(Date.now(), channelAssignments, customChannels));
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [buildMergedChannels, channelAssignments, customChannels]);

  // Master 24/7 Channel Playout Clock Engine
  // Calculates continuous linear broadcast time for any channel without pausing or resetting
  const getChannelPlayoutTime = useCallback(
    (channelId?: string, customDurationSec?: number): number => {
      const canonicalId = normalizeChannelId(channelId, channels);
      const anchor = channelTimelineAnchors[canonicalId] || (channelId ? channelTimelineAnchors[channelId] : undefined);

      let effectiveDuration = customDurationSec && customDurationSec > 0 ? customDurationSec : 0;
      if (!effectiveDuration && anchor?.durationSeconds) {
        effectiveDuration = anchor.durationSeconds;
      }

      // 1. If anchor exists with a valid epochStartTime:
      if (anchor && anchor.epochStartTime > 0) {
        if (anchor.isLive) {
          return 0;
        }
        const elapsed = Math.max(0, (Date.now() - anchor.epochStartTime) / 1000);
        return effectiveDuration > 0 ? (elapsed % effectiveDuration) : elapsed;
      }

      // 2. Check channel's active assigned video in channelAssignments
      const assigned = channelAssignments[canonicalId] || (channelId ? channelAssignments[channelId] : undefined);
      if (assigned && assigned.startTime) {
        const assignedDur = effectiveDuration > 0 ? effectiveDuration : (assigned.durationMinutes * 60 || 1800);
        const elapsed = Math.max(0, (Date.now() - assigned.startTime) / 1000);
        return assignedDur > 0 ? (elapsed % assignedDur) : elapsed;
      }

      // 3. Check channel's current scheduled program in EPG
      const ch = channels.find((c) => c.channelId === canonicalId || c.channelId === channelId);
      if (ch && ch.programs && ch.programs.length > 0) {
        const now = Date.now();
        const prog =
          ch.programs.find((p) => p.isLive) ||
          ch.programs.find((p) => now >= p.startTime && now < p.endTime) ||
          ch.programs[0];

        if (prog) {
          const progDuration = effectiveDuration > 0 ? effectiveDuration : (prog.durationMinutes * 60 || 1800);
          const elapsed = Math.max(0, (now - prog.startTime) / 1000);
          return progDuration > 0 ? (elapsed % progDuration) : elapsed;
        }
      }

      // 4. Default 30-minute linear playout block (modulo aligned)
      const defaultDur = effectiveDuration > 0 ? effectiveDuration : 1800;
      const halfHourSlot = Math.floor(Date.now() / (30 * 60 * 1000)) * (30 * 60 * 1000);
      return Math.max(0, (Date.now() - halfHourSlot) / 1000) % defaultDur;
    },
    [channelTimelineAnchors, channelAssignments, channels, normalizeChannelId]
  );

  // Calibrates playout timeline anchor for continuous real-world wall-clock sync
  const calibrateChannelPlayoutTime = useCallback(
    (channelId: string | undefined, currentVideoTimeSec: number = 0, durationSec?: number) => {
      if (typeof window === 'undefined' || currentVideoTimeSec < 0) return;
      const canonicalId = normalizeChannelId(channelId, channels);
      const now = Date.now();
      const calculatedEpoch = now - Math.round(currentVideoTimeSec * 1000);

      setChannelTimelineAnchors((prev) => {
        const existing = prev[canonicalId] || (channelId ? prev[channelId] : undefined);
        const effectiveDuration = durationSec && durationSec > 0 ? durationSec : existing?.durationSeconds || 1800;

        // Skip writing if drift is less than 3 seconds to avoid unnecessary rerenders
        if (
          existing &&
          Math.abs(existing.epochStartTime - calculatedEpoch) < 3000 &&
          Math.abs((existing.durationSeconds || 0) - effectiveDuration) < 1
        ) {
          return prev;
        }

        const updated = {
          ...prev,
          [canonicalId]: {
            channelId: canonicalId,
            epochStartTime: calculatedEpoch,
            durationSeconds: effectiveDuration,
            streamUrl: existing?.streamUrl || '',
            title: existing?.title,
            isLive: existing?.isLive,
          },
        };

        try {
          localStorage.setItem(CHANNEL_TIMELINES_KEY, JSON.stringify(updated));
        } catch {}

        return updated;
      });
    },
    [channels, normalizeChannelId]
  );

  // Assign ANY video to ANY channel with immediate live broadcast sync
  const assignVideoToChannel = useCallback(
    (
      channelId: string,
      video: Partial<BroadcastProgram> & { streamUrl: string; title: string },
      broadcastImmediately: boolean = true
    ) => {
      const durationMin = video.durationMinutes || 45;
      const durMs = durationMin * 60 * 1000;
      const now = Date.now();

      // Normalize channelId to canonical channel
      const targetCh = channels.find(
        (c) =>
          c.channelId === channelId ||
          c.channelId.toLowerCase() === channelId.toLowerCase() ||
          c.channelId.replace('apex-', 'ch-') === channelId ||
          c.channelId.replace('apex-', '') === channelId ||
          c.channelNumber.toString() === channelId.replace(/\D/g, '')
      ) || channels[0];
      const canonicalId = targetCh ? targetCh.channelId : channelId;

      // Extract and clean YouTube URL if needed
      let cleanStreamUrl = video.streamUrl.trim();
      const ytId = extractYouTubeVideoId(cleanStreamUrl);
      if (ytId && !cleanStreamUrl.includes('youtube.com/watch') && !cleanStreamUrl.includes('youtube-nocookie.com/embed')) {
        cleanStreamUrl = `https://www.youtube.com/watch?v=${ytId}`;
      }

      const programToAssign: BroadcastProgram = {
        id: video.id || `prog-assign-${Date.now()}`,
        title: video.title.trim() || 'Assigned Broadcast Video',
        category: video.category || 'Live Playout Ingest',
        contentType: video.contentType || 'podcast',
        streamUrl: cleanStreamUrl,
        thumbnail:
          video.thumbnail ||
          (ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=800&q=80'),
        description: video.description || `Assigned live broadcast on Channel ${targetCh?.channelNumber || 101}.`,
        hostOrTeams: video.hostOrTeams || 'Apex Channel Playout',
        durationMinutes: durationMin,
        startTime: now - 1000,
        endTime: now + durMs,
        isLive: true,
      };

      setChannelAssignments((prev) => {
        const updated = {
          ...prev,
          [canonicalId]: programToAssign,
          [canonicalId.replace('apex-', 'ch-')]: programToAssign,
          [String(targetCh?.channelNumber || 101)]: programToAssign,
        };
        try {
          localStorage.setItem(CHANNEL_ASSIGNMENTS_KEY, JSON.stringify(updated));
        } catch (e) {
          console.warn('Could not save channelAssignments to localStorage:', e);
        }
        return updated;
      });

      // Save persistent 24/7 channel timeline anchor so playout continues continuously
      setChannelTimelineAnchors((prev) => {
        const updated = {
          ...prev,
          [canonicalId]: {
            channelId: canonicalId,
            epochStartTime: now,
            durationSeconds: durMs / 1000,
            streamUrl: cleanStreamUrl,
            title: programToAssign.title,
            isLive: false,
          },
        };
        try {
          localStorage.setItem(CHANNEL_TIMELINES_KEY, JSON.stringify(updated));
        } catch {}
        return updated;
      });

      setChannels((prevChannels) => {
        return prevChannels.map((ch) => {
          if (ch.channelId !== canonicalId && ch.channelId !== channelId) return ch;
          const liveShow: BroadcastProgram = {
            ...programToAssign,
            startTime: now - 1000,
            endTime: now + durMs,
            isLive: true,
          };
          const rest = (ch.programs || [])
            .filter((p) => p.id !== liveShow.id)
            .map((p, i) => ({
              ...p,
              startTime: now + durMs + i * 30 * 60 * 1000,
              endTime: now + durMs + (i + 1) * 30 * 60 * 1000,
              isLive: false,
            }));
          return {
            ...ch,
            programs: [liveShow, ...rest],
          };
        });
      });

      if (currentUser) {
        try {
          const chDoc = doc(db, 'broadcast_channels', canonicalId);
          setDoc(chDoc, {
            channelId: canonicalId,
            assignedVideo: programToAssign,
            updatedAt: new Date().toISOString(),
          }, { merge: true }).catch(() => {});

          const timelineDoc = doc(db, 'channel_timelines', canonicalId);
          setDoc(timelineDoc, {
            channelId: canonicalId,
            epochStartTime: now,
            durationSeconds: durMs / 1000,
            streamUrl: cleanStreamUrl,
            title: programToAssign.title,
            isLive: false,
            updatedAt: new Date().toISOString(),
          }, { merge: true }).catch(() => {});
        } catch {}
      }

      // Atomically bump playout revision to force immediate player reload
      setChannelPlayoutRevision((rev) => rev + 1);

      if (broadcastImmediately) {
        setActiveChannelId(canonicalId);
        setViewingMode('linear');
        setSelectedVodProgram(null);
        try {
          const raw = localStorage.getItem(SETTINGS_STORAGE_KEY) || '{}';
          const parsed = JSON.parse(raw);
          parsed.activeChannelId = canonicalId;
          parsed.viewingMode = 'linear';
          delete parsed.selectedVodId;
          localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(parsed));
        } catch {}
      }
    },
    [channels]
  );

  // Unassign channel video (reset back to standard scheduled feed)
  const unassignChannelVideo = useCallback(
    (channelId: string) => {
      const targetCh = channels.find(
        (c) =>
          c.channelId === channelId ||
          c.channelNumber.toString() === channelId.replace(/\D/g, '')
      );
      const canonicalId = targetCh ? targetCh.channelId : channelId;

      setChannelAssignments((prev) => {
        const updated = { ...prev };
        delete updated[canonicalId];
        delete updated[canonicalId.replace('apex-', 'ch-')];
        if (targetCh) delete updated[targetCh.channelNumber.toString()];
        try {
          localStorage.setItem(CHANNEL_ASSIGNMENTS_KEY, JSON.stringify(updated));
        } catch {}
        return updated;
      });

      setChannelTimelineAnchors((prev) => {
        const updated = { ...prev };
        delete updated[canonicalId];
        delete updated[canonicalId.replace('apex-', 'ch-')];
        try {
          localStorage.setItem(CHANNEL_TIMELINES_KEY, JSON.stringify(updated));
        } catch {}
        return updated;
      });

      setChannels((prev) => {
        const nextAssignments = { ...channelAssignments };
        delete nextAssignments[canonicalId];
        delete nextAssignments[canonicalId.replace('apex-', 'ch-')];
        return buildMergedChannels(Date.now(), nextAssignments, customChannels);
      });

      setChannelPlayoutRevision((rev) => rev + 1);
    },
    [buildMergedChannels, channelAssignments, customChannels, channels]
  );

  // Add program directly to a channel's EPG schedule
  const addProgramToChannelSchedule = useCallback((channelId: string, program: BroadcastProgram) => {
    const canonicalId = normalizeChannelId(channelId, channels);

    setChannels((prev) => {
      return prev.map((ch) => {
        if (ch.channelId !== canonicalId) return ch;
        const existing = ch.programs || [];
        const newPrograms = [...existing, program].sort((a, b) => a.startTime - b.startTime);
        return { ...ch, programs: newPrograms };
      });
    });

    setCustomChannels((prev) => {
      return prev.map((ch) => {
        if (ch.channelId !== canonicalId) return ch;
        const existing = ch.programs || [];
        const newPrograms = [...existing, program].sort((a, b) => a.startTime - b.startTime);
        return { ...ch, programs: newPrograms };
      });
    });

    const now = Date.now();
    if (program.isLive || (now >= program.startTime && now <= program.endTime)) {
      setChannelAssignments((prev) => {
        const updated = {
          ...prev,
          [canonicalId]: program,
          [canonicalId.replace('apex-', 'ch-')]: program,
          [canonicalId.replace('apex-', '')]: program,
        };
        try {
          localStorage.setItem(CHANNEL_ASSIGNMENTS_KEY, JSON.stringify(updated));
        } catch {}
        return updated;
      });
    }

    setChannelPlayoutRevision((rev) => rev + 1);
  }, [channels, normalizeChannelId]);

  // Update an existing scheduled program in a channel
  const updateChannelProgram = useCallback((channelId: string, programId: string, updates: Partial<BroadcastProgram>) => {
    const canonicalId = normalizeChannelId(channelId, channels);

    setChannels((prev) => {
      return prev.map((ch) => {
        if (ch.channelId !== canonicalId) return ch;
        const updatedPrograms = (ch.programs || []).map((p) => {
          if (p.id !== programId) return p;
          return { ...p, ...updates };
        });
        return { ...ch, programs: updatedPrograms };
      });
    });

    setChannelAssignments((prev) => {
      if (prev[canonicalId]?.id === programId) {
        const updated = { ...prev, [canonicalId]: { ...prev[canonicalId], ...updates } };
        try {
          localStorage.setItem(CHANNEL_ASSIGNMENTS_KEY, JSON.stringify(updated));
        } catch {}
        return updated;
      }
      return prev;
    });

    setChannelPlayoutRevision((rev) => rev + 1);
  }, [channels, normalizeChannelId]);

  // Remove a program slot from a channel's EPG
  const removeProgramFromChannelSchedule = useCallback((channelId: string, programId: string) => {
    const canonicalId = normalizeChannelId(channelId, channels);

    setChannels((prev) => {
      return prev.map((ch) => {
        if (ch.channelId !== canonicalId) return ch;
        const filtered = (ch.programs || []).filter((p) => p.id !== programId);
        return { ...ch, programs: filtered };
      });
    });

    if (channelAssignments[canonicalId]?.id === programId) {
      unassignChannelVideo(canonicalId);
    } else {
      setChannelPlayoutRevision((rev) => rev + 1);
    }
  }, [channels, channelAssignments, unassignChannelVideo, normalizeChannelId]);

  // Create a brand new custom digital TV channel and broadcast to it
  const createCustomChannel = useCallback(
    (
      channelName: string,
      channelNumber?: number,
      initialVideo?: Partial<BroadcastProgram> & { streamUrl: string; title: string },
      broadcastImmediately: boolean = true
    ): string => {
      const chId = `custom-ch-${Date.now()}`;
      const chNum = channelNumber || 104;
      const now = Date.now();
      const durMin = initialVideo?.durationMinutes || 60;
      const durMs = durMin * 60 * 1000;

      const liveProg: BroadcastProgram = initialVideo
        ? {
            id: initialVideo.id || `prog-${Date.now()}`,
            title: initialVideo.title,
            streamUrl: initialVideo.streamUrl,
            thumbnail:
              initialVideo.thumbnail ||
              'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=800&q=80',
            category: initialVideo.category || 'Live Playout Ingest',
            contentType: initialVideo.contentType || 'podcast',
            description: initialVideo.description || `Custom broadcast channel live feed.`,
            hostOrTeams: initialVideo.hostOrTeams || 'Apex Ingest Feed',
            durationMinutes: durMin,
            startTime: now - 1000,
            endTime: now + durMs,
            isLive: true,
          }
        : {
            id: `prog-default-${Date.now()}`,
            title: `${channelName} Live Feed`,
            streamUrl: '/master_broadcast_feed.mp4',
            thumbnail:
              'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=800&q=80',
            category: 'Broadcast Ingest',
            contentType: 'podcast',
            description: `Live digital TV transmission on ${channelName}.`,
            hostOrTeams: 'Apex Live Network',
            durationMinutes: 60,
            startTime: now - 1000,
            endTime: now + 60 * 60 * 1000,
            isLive: true,
          };

      const newSchedule: EPGSchedule = {
        channelId: chId,
        channelName,
        channelNumber: chNum,
        callSign: `APEX-CH${chNum}-LIVE`,
        resolution: '1080p60 HDR',
        programs: [liveProg],
        day: new Date().toISOString().split('T')[0],
      };

      setCustomChannels((prev) => {
        const updated = [...prev, newSchedule];
        try {
          localStorage.setItem(CUSTOM_CHANNELS_KEY, JSON.stringify(updated));
        } catch {}
        return updated;
      });

      if (initialVideo) {
        setChannelAssignments((prev) => {
          const updated = { ...prev, [chId]: liveProg };
          try {
            localStorage.setItem(CHANNEL_ASSIGNMENTS_KEY, JSON.stringify(updated));
          } catch {}
          return updated;
        });
      }

      setChannelTimelineAnchors((prev) => {
        const updated = {
          ...prev,
          [chId]: {
            channelId: chId,
            epochStartTime: now,
            durationSeconds: durMin * 60,
            streamUrl: liveProg.streamUrl,
            title: liveProg.title,
            isLive: false,
          },
        };
        try {
          localStorage.setItem(CHANNEL_TIMELINES_KEY, JSON.stringify(updated));
        } catch {}
        return updated;
      });

      if (currentUser) {
        try {
          const chDoc = doc(db, 'broadcast_channels', chId);
          setDoc(chDoc, {
            channelId: chId,
            channelName,
            channelNumber: chNum,
            callSign: `APEX-CH${chNum}-LIVE`,
            resolution: '1080p60 HDR',
            assignedVideo: liveProg,
            isCustom: true,
            updatedAt: new Date().toISOString(),
          }, { merge: true }).catch(() => {});
        } catch {}
      }

      setChannels((prev) => [...prev, newSchedule]);
      setChannelPlayoutRevision((rev) => rev + 1);

      if (broadcastImmediately) {
        setActiveChannelId(chId);
        setViewingMode('linear');
        setSelectedVodProgram(null);
      }
      return chId;
    },
    []
  );

  // 3. Linear Playout Hook
  const playout = useLinearPlayout({
    channelSchedule: activeChannel,
    autoPlay: true,
  });
  playoutRef.current = playout;

  // Restore channel & viewing mode settings from localStorage on boot
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (raw) {
        const parsed: StoredUserSettings = JSON.parse(raw);
        // Only engage hot-switch if explicitly turned on during the current session
        if (parsed.hotSwitchActive && !playout.hotSwitch.isActive) {
          playout.triggerHotSwitch(true);
        }
      }
    } catch (e) {
      console.warn('Could not restore user settings from localStorage:', e);
    }
  }, []);

  // 4. Firebase Authentication
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [googleAccessToken, setGoogleAccessTokenState] = useState<string | null>(() => {
    try {
      return localStorage.getItem('google_access_token') || localStorage.getItem('youtube_token') || null;
    } catch {
      return null;
    }
  });

  const setGoogleAccessToken = useCallback((token: string | null) => {
    setGoogleAccessTokenState(token);
    try {
      if (token) {
        localStorage.setItem('google_access_token', token);
        localStorage.setItem('youtube_token', token);
      } else {
        localStorage.removeItem('google_access_token');
      }
    } catch {}
  }, []);

  const [youtubeStreamKey, setYoutubeStreamKeyState] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('youtube_stream_key');
      return saved && saved.trim() ? saved.trim() : 'sv9m-54rz-47ab-uz3t-1sak';
    } catch {
      return 'sv9m-54rz-47ab-uz3t-1sak';
    }
  });

  const setYoutubeStreamKey = useCallback((key: string) => {
    setYoutubeStreamKeyState(key);
    try {
      localStorage.setItem('youtube_stream_key', key);
    } catch {}
  }, []);

  const [youtubeBroadcastId, setYoutubeBroadcastIdState] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('youtube_broadcast_id');
      if (saved && saved !== 'dp8PhLsUcFE') return saved;
      return 'RyUoz0-hRLk';
    } catch {
      return 'RyUoz0-hRLk';
    }
  });

  const setYoutubeBroadcastId = useCallback((id: string) => {
    setYoutubeBroadcastIdState(id);
    try {
      localStorage.setItem('youtube_broadcast_id', id);
    } catch {}
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      setIsAuthLoading(false);

      // If user logs in, sync or create user doc
      if (user) {
        try {
          const userRef = doc(db, 'users', user.uid);
          await setDoc(
            userRef,
            {
              uid: user.uid,
              displayName: user.displayName || 'Viewer',
              email: user.email || '',
              photoURL: user.photoURL || '',
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          );
        } catch (err) {
          // Non-fatal profile sync log
          console.warn('Could not sync user profile to Firestore:', err);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (): Promise<string | null> => {
    try {
      const res = await signInWithGoogle();
      if (res?.accessToken) {
        setGoogleAccessToken(res.accessToken);
        return res.accessToken;
      }
      return null;
    } catch (err) {
      console.error('Sign-in failed:', err);
      return null;
    }
  };

  const signOutUser = async () => {
    try {
      await logOut();
      setGoogleAccessToken(null);
    } catch (err) {
      console.error('Sign-out failed:', err);
    }
  };

  // 5. VOD Catalog & Search/Filter + Permanent LocalStorage/IndexedDB + Firestore Sync
  const VOD_STORAGE_KEY = 'apex_vod_catalog_v2';
  const LOCAL_UPLOADS_STORAGE_KEY = 'apex_user_uploaded_programs_v1';
  const DELETED_VOD_IDS_KEY = 'apex_deleted_vod_ids_v1';

  const getDeletedVodIds = (): Set<string> => {
    if (typeof window === 'undefined') return new Set();
    try {
      const raw = localStorage.getItem(DELETED_VOD_IDS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return new Set(parsed);
      }
    } catch {}
    return new Set();
  };

  // Helper to read locally uploaded programs
  const getStoredLocalUploads = (): BroadcastProgram[] => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(LOCAL_UPLOADS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn('Could not read LOCAL_UPLOADS_STORAGE_KEY:', e);
    }
    return [];
  };

  const [vodCatalog, setVodCatalog] = useState<BroadcastProgram[]>(() => {
    try {
      if (typeof window !== 'undefined') {
        const deletedIds = getDeletedVodIds();
        const localUploads = getStoredLocalUploads().filter((p) => !deletedIds.has(p.id));
        const saved = localStorage.getItem(VOD_STORAGE_KEY);
        let parsedSaved: BroadcastProgram[] = [];
        if (saved) {
          try {
            parsedSaved = JSON.parse(saved);
          } catch {}
        }
        
        // Merge localUploads, parsedSaved, and MOCK_VOD_CATALOG with title deduplication and error filtering
        const combined = [...localUploads, ...(Array.isArray(parsedSaved) ? parsedSaved : [])];
        const titleMap = new Map<string, BroadcastProgram>();
        for (const prog of combined) {
          if (!prog?.id || deletedIds.has(prog.id) || !prog.streamUrl || !prog.streamUrl.trim()) continue;
          if (prog.streamUrl.includes('error') || prog.title?.toLowerCase().includes('error')) continue;
          const normKey = prog.title.trim().toLowerCase();
          // Always keep the newest/most complete entry
          titleMap.set(normKey, prog);
        }
        for (const mock of MOCK_VOD_CATALOG) {
          const normKey = mock.title.trim().toLowerCase();
          if (!titleMap.has(normKey) && !deletedIds.has(mock.id)) {
            titleMap.set(normKey, mock);
          }
        }
        return Array.from(titleMap.values());
      }
    } catch (e) {
      console.warn('Could not read cached VOD catalog from localStorage:', e);
    }
    return MOCK_VOD_CATALOG;
  });

  const [selectedVodProgram, setSelectedVodProgram] = useState<BroadcastProgram | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
        if (raw) {
          const parsed: StoredUserSettings = JSON.parse(raw);
          if (parsed.selectedVodId) {
            const localUploads = getStoredLocalUploads();
            const allCandidates = [...localUploads, ...MOCK_VOD_CATALOG];
            const found = allCandidates.find((p) => p.id === parsed.selectedVodId);
            if (found) return found;
          }
        }
      } catch (e) {
        console.warn('Could not restore selected VOD from localStorage:', e);
      }
    }
    return null;
  });
  
  // Automatically sync BroadcastProvider state to localStorage across browser refreshes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const payload: StoredUserSettings = {
        activeChannelId,
        viewingMode,
        hotSwitchActive: playout.hotSwitch.isActive,
        selectedVodId: selectedVodProgram?.id,
      };
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(payload));
    } catch (err) {
      console.warn('Failed to sync BroadcastProvider state to localStorage:', err);
    }
  }, [activeChannelId, viewingMode, playout.hotSwitch.isActive, selectedVodProgram?.id]);

  const [vodSearchQuery, setVodSearchQuery] = useState<string>('');
  const [vodCategoryFilter, setVodCategoryFilter] = useState<string>('all');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);

  // Restore any persisted media items from IndexedDB vault on mount
  useEffect(() => {
    getAllStoredMedia()
      .then(async (storedItems) => {
        if (storedItems && storedItems.length > 0) {
          // Resolve playable URLs for stored items
          const resolvedItems: BroadcastProgram[] = [];
          for (const item of storedItems) {
            let playableUrl = item.serverStreamUrl || '';
            if (!playableUrl && item.blob) {
              try {
                playableUrl = (await getStoredMediaUrl(item.id)) || '';
              } catch {}
            }
            resolvedItems.push({
              id: item.id,
              title: item.name,
              category: 'Vault Media',
              startTime: item.createdAt || Date.now(),
              endTime: (item.createdAt || Date.now()) + (item.durationMinutes || 30) * 60 * 1000,
              streamUrl: playableUrl,
              contentType: 'podcast',
              description: `Locally preserved high-definition video ingest (${item.aspectRatio || '16:9'}).`,
              thumbnail:
                item.thumbnailUrl ||
                'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=800&q=80',
              durationMinutes: item.durationMinutes || 30,
              tags: ['Custom Upload', item.aspectRatio || '16:9'],
            });
          }

          setVodCatalog((prev) => {
            const map = new Map<string, BroadcastProgram>();
            // Add restored items first
            for (const item of resolvedItems) {
              map.set(item.id, item);
            }
            // Add existing items if not present or replace if existing had empty streamUrl
            for (const p of prev) {
              if (!map.has(p.id)) {
                map.set(p.id, p);
              } else if (!map.get(p.id)!.streamUrl && p.streamUrl) {
                map.set(p.id, p);
              }
            }
            const updated = Array.from(map.values());
            try {
              const customOnly = updated.filter((p) => !MOCK_VOD_CATALOG.some((m) => m.id === p.id));
              localStorage.setItem(LOCAL_UPLOADS_STORAGE_KEY, JSON.stringify(customOnly));
            } catch (err) {
              console.warn('LocalStorage sync warning:', err);
            }
            return updated;
          });
        }
      })
      .catch((err) => {
        console.warn('IndexedDB sync error:', err);
      });
  }, []);

  // Sync custom VODs from Firestore WITHOUT wiping local custom uploads
  useEffect(() => {
    const customVodsPath = 'custom_vods';
    const unsub = onSnapshot(
      collection(db, customVodsPath),
      (snapshot) => {
        const cloudVods: BroadcastProgram[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          cloudVods.push({
            id: data.id || docSnap.id,
            title: data.title,
            category: data.category || 'Custom Upload',
            startTime: Date.now(),
            endTime: Date.now() + (data.durationMinutes || 30) * 60 * 1000,
            streamUrl: data.streamUrl,
            contentType: data.contentType || 'podcast',
            description: data.description || '',
            thumbnail: data.thumbnail || 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=800&q=80',
            hostOrTeams: data.uploaderEmail ? `Uploaded by ${data.uploaderEmail}` : undefined,
            durationMinutes: data.durationMinutes || 30,
            isLive: false,
          });
        });

        if (cloudVods.length > 0) {
          setVodCatalog((prev) => {
            const cloudIds = new Set(cloudVods.map((c) => c.id));
            const staticIds = new Set(MOCK_VOD_CATALOG.map((m) => m.id));
            // Crucial: preserve local uploads that are not in cloudVods or static catalog
            const localCustomUploads = prev.filter((c) => !cloudIds.has(c.id) && !staticIds.has(c.id));
            const merged = [...localCustomUploads, ...cloudVods, ...MOCK_VOD_CATALOG];
            try {
              const allCustom = [...localCustomUploads, ...cloudVods];
              localStorage.setItem(VOD_STORAGE_KEY, JSON.stringify(allCustom));
            } catch (e) {
              console.warn('Failed to cache Firestore VODs:', e);
            }
            return merged;
          });
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, customVodsPath);
      }
    );

    return () => unsub();
  }, []);

  // Sync broadcast channels from Firestore
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'broadcast_channels'),
      (snapshot) => {
        const cloudChannels: EPGSchedule[] = [];
        const cloudAssignments: Record<string, BroadcastProgram> = {};

        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.isCustom && data.channelId && data.channelName) {
            cloudChannels.push({
              channelId: data.channelId,
              channelName: data.channelName,
              channelNumber: data.channelNumber || 104,
              callSign: data.callSign || `APEX-CH${data.channelNumber || 104}`,
              resolution: data.resolution || '1080p60 HDR',
              programs: data.assignedVideo ? [data.assignedVideo] : [],
              day: new Date().toISOString().split('T')[0],
            });
          }
          if (data.assignedVideo && data.channelId) {
            cloudAssignments[data.channelId] = data.assignedVideo;
          }
        });

        if (cloudChannels.length > 0 || Object.keys(cloudAssignments).length > 0) {
          setCustomChannels((prev) => {
            const map = new Map<string, EPGSchedule>();
            for (const c of prev) map.set(c.channelId, c);
            for (const c of cloudChannels) map.set(c.channelId, c);
            const combined = Array.from(map.values());
            try {
              localStorage.setItem(CUSTOM_CHANNELS_KEY, JSON.stringify(combined));
            } catch {}
            return combined;
          });

          if (Object.keys(cloudAssignments).length > 0) {
            setChannelAssignments((prev) => {
              const updated = { ...prev, ...cloudAssignments };
              try {
                localStorage.setItem(CHANNEL_ASSIGNMENTS_KEY, JSON.stringify(updated));
              } catch {}
              return updated;
            });
          }
        }
      },
      (err) => {
        console.warn('Notice syncing channels from Firestore:', err);
      }
    );

    return () => unsub();
  }, []);

  // Sync channel timelines from Firestore
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'channel_timelines'),
      (snapshot) => {
        const cloudTimelines: Record<string, ChannelPlayoutTimeline> = {};
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.channelId && data.epochStartTime) {
            cloudTimelines[data.channelId] = {
              channelId: data.channelId,
              epochStartTime: Number(data.epochStartTime) || Date.now(),
              durationSeconds: Number(data.durationSeconds) || 1800,
              streamUrl: data.streamUrl || '',
              title: data.title,
              isLive: Boolean(data.isLive),
            };
          }
        });

        if (Object.keys(cloudTimelines).length > 0) {
          setChannelTimelineAnchors((prev) => {
            const updated = { ...prev, ...cloudTimelines };
            try {
              localStorage.setItem(CHANNEL_TIMELINES_KEY, JSON.stringify(updated));
            } catch {}
            return updated;
          });
        }
      },
      (err) => {
        console.warn('Notice syncing timelines from Firestore:', err);
      }
    );

    return () => unsub();
  }, []);

  const addCustomVodProgram = async (program: BroadcastProgram, playImmediately: boolean = true) => {
    const normTitle = program.title.trim().toLowerCase();
    setVodCatalog((prev) => {
      // Remove any existing duplicate with matching ID, title, or exact streamUrl
      const filtered = prev.filter(
        (p) =>
          p.id !== program.id &&
          p.title.trim().toLowerCase() !== normTitle &&
          (!program.streamUrl || p.streamUrl !== program.streamUrl)
      );
      const updated = [program, ...filtered];
      try {
        const customOnly = updated.filter((p) => !MOCK_VOD_CATALOG.some((m) => m.id === p.id));
        localStorage.setItem(LOCAL_UPLOADS_STORAGE_KEY, JSON.stringify(customOnly));
        localStorage.setItem(VOD_STORAGE_KEY, JSON.stringify(customOnly));
      } catch (err) {
        console.warn('Failed to persist VOD to localStorage:', err);
      }
      return updated;
    });

    if (playImmediately) {
      setSelectedVodProgram(program);
      setViewingMode('vod');
    }

    // Persist to Firestore if user is authenticated
    if (currentUser) {
      try {
        const customVodDoc = doc(db, 'custom_vods', program.id);
        await setDoc(customVodDoc, {
          id: program.id,
          title: program.title,
          description: program.description,
          category: program.category,
          contentType: program.contentType,
          streamUrl: program.streamUrl,
          thumbnail: program.thumbnail,
          durationMinutes: program.durationMinutes,
          uploaderUid: currentUser.uid,
          uploaderEmail: currentUser.email || '',
          createdAt: new Date().toISOString(),
        });
      } catch (err) {
        console.warn('Could not persist VOD to Firestore:', err);
      }
    }
  };

  const removeVodProgram = useCallback(async (programId: string) => {
    // 0. Add to permanent blacklist so item never resurrects on refresh or sync
    try {
      const existing = getDeletedVodIds();
      existing.add(programId);
      localStorage.setItem(DELETED_VOD_IDS_KEY, JSON.stringify(Array.from(existing)));
    } catch (e) {
      console.warn('Failed to save to deleted vod ids:', e);
    }

    // 1. Remove from state
    setVodCatalog((prev) => {
      const filtered = prev.filter((p) => p.id !== programId);
      try {
        const customOnly = filtered.filter((p) => !MOCK_VOD_CATALOG.some((m) => m.id === p.id));
        localStorage.setItem(LOCAL_UPLOADS_STORAGE_KEY, JSON.stringify(customOnly));
        localStorage.setItem(VOD_STORAGE_KEY, JSON.stringify(customOnly));
      } catch (e) {
        console.warn('Failed to update localStorage after remove:', e);
      }
      return filtered;
    });

    // 2. Clear from IndexedDB
    try {
      await deleteStoredMedia(programId);
    } catch (err) {
      console.warn('Could not delete from IndexedDB:', err);
    }

    // 3. Clear from Firestore if logged in
    if (currentUser) {
      try {
        await deleteDoc(doc(db, 'custom_vods', programId));
      } catch (err) {
        console.warn('Could not delete VOD from Firestore:', err);
      }
    }

    // 4. If currently loaded in VOD player, reset
    setSelectedVodProgram((cur) => (cur?.id === programId ? null : cur));

    // 5. If assigned to any channel, unassign
    for (const [chId, assignedProg] of Object.entries(channelAssignments)) {
      if (assignedProg.id === programId) {
        unassignChannelVideo(chId);
      }
    }

    setChannelPlayoutRevision((rev) => rev + 1);
  }, [currentUser, channelAssignments, unassignChannelVideo]);

  const purgeInvalidUploadedVideos = useCallback(async (): Promise<{ removedCount: number }> => {
    let count = 0;
    const deletedIds = getDeletedVodIds();

    setVodCatalog((prev) => {
      const validList = prev.filter((item) => {
        // Drop any item in blacklist
        if (deletedIds.has(item.id)) {
          count++;
          return false;
        }
        // Filter out items with empty streamUrl or error keywords or broken test entries
        if (!item.streamUrl || !item.streamUrl.trim()) {
          count++;
          return false;
        }
        if (item.streamUrl.includes('error') || item.streamUrl.includes('undefined') || item.streamUrl.includes('null')) {
          count++;
          return false;
        }
        if (item.title.toLowerCase().includes('error') || item.title.toLowerCase().includes('failed upload')) {
          count++;
          return false;
        }
        return true;
      });

      try {
        const customOnly = validList.filter((p) => !MOCK_VOD_CATALOG.some((m) => m.id === p.id));
        localStorage.setItem(LOCAL_UPLOADS_STORAGE_KEY, JSON.stringify(customOnly));
        localStorage.setItem(VOD_STORAGE_KEY, JSON.stringify(customOnly));
      } catch (e) {}
      return validList;
    });

    setChannelPlayoutRevision((rev) => rev + 1);
    return { removedCount: count };
  }, []);

  const deduplicateVodLibrary = useCallback(async (): Promise<{ removedCount: number }> => {
    let count = 0;
    const deletedIds = getDeletedVodIds();

    setVodCatalog((prev) => {
      const seenTitles = new Set<string>();
      const seenUrls = new Set<string>();
      const deduped: BroadcastProgram[] = [];

      for (const item of prev) {
        if (!item || !item.id || deletedIds.has(item.id)) {
          count++;
          continue;
        }
        if (!item.streamUrl || !item.streamUrl.trim() || item.streamUrl.includes('error') || item.title?.toLowerCase().includes('error')) {
          count++;
          continue;
        }
        const normTitle = item.title.trim().toLowerCase();
        const normUrl = item.streamUrl.trim().toLowerCase();
        if (seenTitles.has(normTitle) || (item.tags?.includes('Custom Ingest') && seenUrls.has(normUrl))) {
          count++;
          continue;
        }
        seenTitles.add(normTitle);
        seenUrls.add(normUrl);
        deduped.push(item);
      }

      try {
        const customOnly = deduped.filter((p) => !MOCK_VOD_CATALOG.some((m) => m.id === p.id));
        localStorage.setItem(LOCAL_UPLOADS_STORAGE_KEY, JSON.stringify(customOnly));
        localStorage.setItem(VOD_STORAGE_KEY, JSON.stringify(customOnly));
      } catch (e) {}

      return deduped;
    });

    setChannelPlayoutRevision((rev) => rev + 1);
    return { removedCount: count };
  }, []);

  const selectVodProgram = async (program: BroadcastProgram) => {
    let resolvedUrl = program.streamUrl;

    // If streamUrl is missing or an expired blob, check IndexedDB vault fallback
    if (!resolvedUrl || resolvedUrl.startsWith('blob:')) {
      if (program.id) {
        try {
          const storedUrl = await getStoredMediaUrl(program.id);
          if (storedUrl) {
            resolvedUrl = storedUrl;
          }
        } catch (err) {
          console.warn('Error reading stored media blob from IndexedDB:', err);
        }
      }
    }

    setSelectedVodProgram({ ...program, streamUrl: resolvedUrl });
    setViewingMode('vod');
    setChannelPlayoutRevision((rev) => rev + 1);
  };

  const toggleViewingMode = () => {
    setViewingMode((prev) => (prev === 'linear' ? 'vod' : 'linear'));
  };

  // 6. Lower Third Ticker & Real Live News Feed Ingestion
  const [tickerItems, setTickerItems] = useState<TickerItem[]>(MOCK_TICKER_ITEMS);
  const [isTickerVisible, setIsTickerVisible] = useState<boolean>(true);
  const [tickerCategoryFilter, setTickerCategoryFilter] = useState<string>('ALL');
  const [tickerFontSize, setTickerFontSize] = useState<'normal' | 'large' | 'jumbo'>('large');
  const [isRealNewsLoading, setIsRealNewsLoading] = useState<boolean>(false);
  const [realNewsLastUpdated, setRealNewsLastUpdated] = useState<number | null>(null);
  const [isFlashNewsModalOpen, setIsFlashNewsModalOpen] = useState<boolean>(false);

  // Custom User-created Ticker Items with localStorage persistence
  const [customTickerItems, setCustomTickerItems] = useState<TickerItem[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('apex_custom_ticker_items_v1');
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return [];
  });

  const addCustomTickerItem = useCallback(
    async (item: { headline: string; category?: string; change?: string; isBreaking?: boolean; source?: string }) => {
      const newItem: TickerItem = {
        id: `custom-ticker-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        category: (item.category?.toUpperCase() as any) || 'BREAKING',
        headline: item.headline.trim(),
        change: item.change || (item.isBreaking ? 'BREAKING ALERT' : undefined),
        source: item.source || 'Station Newsroom',
        timestamp: 'Just now',
        isPositive: true,
      };

      setCustomTickerItems((prev) => {
        const next = [newItem, ...prev].slice(0, 30);
        try {
          localStorage.setItem('apex_custom_ticker_items_v1', JSON.stringify(next));
        } catch {}
        return next;
      });

      setTickerItems((prev) => [newItem, ...prev]);

      // Push to backend news API so all views/streams receive the live item
      try {
        await fetch('/api/news/custom', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item),
        });
      } catch (err) {
        console.warn('API push custom news notice:', err);
      }
    },
    []
  );

  const removeCustomTickerItem = useCallback(
    async (id: string) => {
      setCustomTickerItems((prev) => {
        const next = prev.filter((p) => p.id !== id);
        try {
          localStorage.setItem('apex_custom_ticker_items_v1', JSON.stringify(next));
        } catch {}
        return next;
      });

      setTickerItems((prev) => prev.filter((p) => p.id !== id));

      try {
        await fetch(`/api/news/custom/${encodeURIComponent(id)}`, { method: 'DELETE' });
      } catch {}
    },
    []
  );

  const refreshRealNews = useCallback(async () => {
    try {
      setIsRealNewsLoading(true);
      const res = await fetch('/api/news');
      if (res.ok) {
        const data = await res.json();
        if (data.items && Array.isArray(data.items) && data.items.length > 0) {
          // Keep user custom ticker items at the front of the ticker
          const merged = [...customTickerItems, ...data.items];
          setTickerItems(merged);
          setRealNewsLastUpdated(data.lastUpdated || Date.now());
        }
      }
    } catch (err) {
      console.warn('Could not fetch real live news feeds:', err);
    } finally {
      setIsRealNewsLoading(false);
    }
  }, [customTickerItems]);

  // Fetch real news on mount and periodically every 60s, plus SSE live push listener
  useEffect(() => {
    refreshRealNews();
    const interval = setInterval(refreshRealNews, 60000);

    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/news/stream');
      eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.items && Array.isArray(payload.items) && payload.items.length > 0) {
            setTickerItems(payload.items);
            setRealNewsLastUpdated(Date.now());
          }
        } catch {}
      };
    } catch {}

    return () => {
      clearInterval(interval);
      if (eventSource) eventSource.close();
    };
  }, [refreshRealNews]);

  // 7. Interactive Live Chat with Firestore Real-time synchronization
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(INITIAL_CHAT_MESSAGES);

  useEffect(() => {
    const chatPath = 'chat_messages';
    const q = query(collection(db, chatPath), orderBy('createdAt', 'desc'), limit(40));

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const cloudMessages: ChatMessage[] = [];
        snapshot.forEach((docSnap) => {
          const d = docSnap.data();
          cloudMessages.unshift({
            id: docSnap.id,
            sender: d.sender || 'Viewer',
            role: d.role || 'viewer',
            text: d.text,
            timestamp: d.timestamp || 'Live',
          });
        });

        if (cloudMessages.length > 0) {
          setChatMessages((prev) => {
            const existingIds = new Set(prev.map((p) => p.id));
            const newOnes = cloudMessages.filter((c) => !existingIds.has(c.id));
            return [...prev, ...newOnes];
          });
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, chatPath);
      }
    );

    return () => unsub();
  }, []);

  const sendChatMessage = async (text: string) => {
    if (!text.trim()) return;
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const newMsg: ChatMessage = {
      id: `chat-${Date.now()}`,
      sender: currentUser?.displayName || 'You (Broadcast Viewer)',
      role: currentUser ? 'subscriber' : 'viewer',
      text: text.trim(),
      timestamp: timeStr,
    };

    setChatMessages((prev) => [...prev, newMsg]);

    // Save to Firestore if authenticated
    if (currentUser) {
      try {
        await addDoc(collection(db, 'chat_messages'), {
          id: newMsg.id,
          sender: currentUser.displayName || 'Viewer',
          senderUid: currentUser.uid,
          role: 'subscriber',
          text: text.trim(),
          timestamp: timeStr,
          channelId: activeChannelId,
          programId: playout.currentProgram?.id || 'live-feed',
          createdAt: new Date().toISOString(),
        });
      } catch (err) {
        console.warn('Failed to sync chat message to Firestore:', err);
      }
    }

    // Automated contextual response after 2.5s
    setTimeout(() => {
      const responses = [
        'Great question! The engineering team will address this in the live Q&A block.',
        'High bandwidth and low packet drop rate are critical for live ingest.',
        'Download the attached session notes in the sidebar for full architectural diagrams!',
        'Real-time metrics confirm 0 dropped frames during the latest stream cutover.',
      ];
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];
      const botMsg: ChatMessage = {
        id: `chat-bot-${Date.now()}`,
        sender: 'Apex Host Desk',
        role: 'moderator',
        text: randomResponse,
        timestamp: timeStr,
      };
      setChatMessages((prev) => [...prev, botMsg]);
    }, 2500);
  };

  // 8. Interactive Poll
  const [pollData, setPollData] = useState<PollData>(INITIAL_POLL_DATA);

  const voteInPoll = async (optionId: string) => {
    if (pollData.userVotedId) return; // Prevent double voting
    setPollData((prev) => {
      const updatedOptions = prev.options.map((opt) =>
        opt.id === optionId ? { ...opt, votes: opt.votes + 1 } : opt
      );
      return {
        ...prev,
        options: updatedOptions,
        totalVotes: prev.totalVotes + 1,
        userVotedId: optionId,
      };
    });

    // Save poll vote to Firestore if authenticated
    if (currentUser) {
      try {
        const voteId = `poll_${pollData.id}_${currentUser.uid}`;
        await setDoc(doc(db, 'poll_votes', voteId), {
          pollId: pollData.id,
          optionId,
          userId: currentUser.uid,
          votedAt: new Date().toISOString(),
        });
      } catch (err) {
        console.warn('Failed to record poll vote in Firestore:', err);
      }
    }
  };

  // 9. Control Room Modal
  const [isControlRoomOpen, setIsControlRoomOpen] = useState<boolean>(false);
  const [controlRoomInitialTab, setControlRoomInitialTab] = useState<string | null>(null);

  const openControlRoomToTab = (tab: string) => {
    setControlRoomInitialTab(tab);
    setIsControlRoomOpen(true);
  };

  // 10. Live Sports Score Simulation
  const [simulatedSportsScore, setSimulatedSportsScore] = useState<{
    home: number;
    away: number;
    minute: string;
  }>({
    home: 2,
    away: 1,
    minute: "74'",
  });

  const triggerSportsGoal = (team: 'home' | 'away') => {
    setSimulatedSportsScore((prev) => ({
      ...prev,
      [team]: prev[team] + 1,
    }));
  };

  // 11. Reminders for Upcoming Broadcasts with Cloud Firestore Sync
  const [reminders, setReminders] = useState<string[]>([]);

  // Sync user reminders if logged in
  useEffect(() => {
    if (!currentUser) return;
    const userRef = doc(db, 'users', currentUser.uid);
    const unsub = onSnapshot(
      userRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (Array.isArray(data.reminderProgramIds)) {
            setReminders(data.reminderProgramIds);
          }
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, `users/${currentUser.uid}`);
      }
    );
    return () => unsub();
  }, [currentUser]);

  const toggleReminder = async (programId: string) => {
    const updated = reminders.includes(programId)
      ? reminders.filter((id) => id !== programId)
      : [...reminders, programId];

    setReminders(updated);

    if (currentUser) {
      try {
        const userRef = doc(db, 'users', currentUser.uid);
        await setDoc(
          userRef,
          {
            reminderProgramIds: updated,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      } catch (err) {
        console.warn('Failed to sync reminders to Firestore:', err);
      }
    }
  };

  const hasReminder = (programId: string) => reminders.includes(programId);

  // 12. SCTE-35 Real-Time Cue Marker System & SSAI Ad Ingest
  const [adInventory, setAdInventory] = useState<AdCreative[]>(() => getStoredAdInventory());
  const [selectedAdCreativeId, setSelectedAdCreativeId] = useState<string>(() => {
    const list = getStoredAdInventory();
    return list[0]?.id || 'ad-google-cloud';
  });

  const selectedAdCreative = useMemo(() => {
    return adInventory.find((a) => a.id === selectedAdCreativeId) || adInventory[0] || null;
  }, [adInventory, selectedAdCreativeId]);

  const addCustomAdCreative = useCallback((creative: AdCreative) => {
    setAdInventory((prev) => {
      const updated = [creative, ...prev];
      saveAdInventoryToStorage(updated);
      return updated;
    });
    setSelectedAdCreativeId(creative.id);
  }, []);

  const [scte35Markers, setScte35Markers] = useState<SCTE35CueMarker[]>([
    {
      id: 'scte35-cue-101',
      eventId: 17050,
      commandType: 'splice_insert',
      ptsTime: 812934020,
      ptsTimeFormatted: '01:24:18.520',
      durationSeconds: 30,
      isOutNetwork: true,
      segmentationType: '0x34_provider_ad_start',
      segmentationTypeName: 'Provider Advertisement Start',
      upid: 'ADS-APEX-2026-X992',
      subSegmentNum: 1,
      subSegmentsExpected: 2,
      hexPayload: '0xFC302500000000000000FFF014050000429AFE002E72E0001002000000000000',
      base64Payload: '/DAlAAAAAAAAAP/wFAUAAAAAcf+/87wAAAAAAA==',
      timestamp: Date.now() - 45000,
      status: 'completed',
      prerollSeconds: 4.0,
      adCreativeUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      adTitle: 'Google Cloud AI: Next-Gen Reasoning',
      advertiser: 'Google Cloud',
    },
    {
      id: 'scte35-cue-102',
      eventId: 17051,
      commandType: 'splice_insert',
      ptsTime: 815634020,
      ptsTimeFormatted: '01:29:18.520',
      durationSeconds: 15,
      isOutNetwork: true,
      segmentationType: '0x35_provider_ad_end',
      segmentationTypeName: 'Provider Advertisement End (Return to Network)',
      upid: 'ADS-APEX-2026-X993',
      subSegmentNum: 2,
      subSegmentsExpected: 2,
      hexPayload: '0xFC301B00000000000000FFF00E050000429BFE002E8A600000',
      base64Payload: '/DAbAAAAAAAAAP/wDgUAAAAAcf+/87wAAA==',
      timestamp: Date.now() - 15000,
      status: 'completed',
      prerollSeconds: 2.0,
    },
  ]);
  const [activeScte35Marker, setActiveScte35Marker] = useState<SCTE35CueMarker | null>(null);
  const [isScte35OverlayOpen, setIsScte35OverlayOpen] = useState<boolean>(false);

  // Function to inject or detect SCTE-35 Cue Marker in real-time
  const injectScte35Cue = (options?: {
    durationSeconds?: number;
    commandType?: SCTE35CommandType;
    segmentationType?: SCTE35SegmentationType;
    segmentationTypeName?: string;
    adCreativeUrl?: string;
    adTitle?: string;
    advertiser?: string;
    callToActionUrl?: string;
    callToActionText?: string;
    thumbnailUrl?: string;
  }) => {
    const dur = options?.durationSeconds || 15;
    const cmd = options?.commandType || 'splice_insert';
    const segType = options?.segmentationType || '0x34_provider_ad_start';
    const segName = options?.segmentationTypeName || 'Provider Advertisement Start';
    const eventId = Math.floor(10000 + Math.random() * 90000);
    const pts = Math.floor(Date.now() * 90);
    const date = new Date();
    const ptsFormatted = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}.${String(date.getMilliseconds()).padStart(3, '0')}`;

    // Resolve the active ad creative to stitch
    const effectiveAd = options?.adCreativeUrl
      ? {
          title: options.adTitle || 'Sponsored Commercial Break',
          advertiser: options.advertiser || 'Apex Sponsor',
          adCreativeUrl: options.adCreativeUrl,
          callToActionUrl: options.callToActionUrl || 'https://cloud.google.com/ai',
          callToActionText: options.callToActionText || 'Learn More',
          thumbnailUrl: options.thumbnailUrl,
        }
      : selectedAdCreative
      ? {
          title: options?.adTitle || selectedAdCreative.title,
          advertiser: options?.advertiser || selectedAdCreative.advertiser,
          adCreativeUrl: selectedAdCreative.videoUrl,
          callToActionUrl: options?.callToActionUrl || selectedAdCreative.callToActionUrl,
          callToActionText: options?.callToActionText || selectedAdCreative.callToActionText,
          thumbnailUrl: selectedAdCreative.thumbnailUrl,
        }
      : {
          title: options?.adTitle || 'Google Cloud AI Studio',
          advertiser: options?.advertiser || 'Google Cloud',
          adCreativeUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
          callToActionUrl: 'https://cloud.google.com/ai',
          callToActionText: 'Learn More',
          thumbnailUrl: undefined,
        };

    const newMarker: SCTE35CueMarker = {
      id: `scte35-${Date.now()}`,
      eventId,
      commandType: cmd,
      ptsTime: pts,
      ptsTimeFormatted: ptsFormatted,
      durationSeconds: dur,
      isOutNetwork: true,
      segmentationType: segType,
      segmentationTypeName: segName,
      upid: `APEX-DPI-${Date.now().toString(36).toUpperCase()}`,
      subSegmentNum: 1,
      subSegmentsExpected: 1,
      hexPayload: `0xFC302500000000000000FFF01405${eventId.toString(16).toUpperCase()}FE002E72E000`,
      base64Payload: btoa(`SCTE35:${eventId}:${dur}:${Date.now()}`),
      timestamp: Date.now(),
      status: 'active',
      prerollSeconds: 3.5,
      adCreativeUrl: effectiveAd.adCreativeUrl,
      adTitle: effectiveAd.title,
      advertiser: effectiveAd.advertiser,
      callToActionUrl: effectiveAd.callToActionUrl,
    };

    setScte35Markers((prev) => [newMarker, ...prev]);
    setActiveScte35Marker(newMarker);

    // Trigger playout ad break hook with full video creative details
    playout.triggerManualAdBreak(dur, {
      title: effectiveAd.title,
      advertiser: effectiveAd.advertiser,
      adCreativeUrl: effectiveAd.adCreativeUrl,
      callToActionUrl: effectiveAd.callToActionUrl,
      callToActionText: effectiveAd.callToActionText,
      thumbnailUrl: effectiveAd.thumbnailUrl,
    });

    // After duration, mark as completed
    setTimeout(() => {
      setScte35Markers((prev) =>
        prev.map((m) => (m.id === newMarker.id ? { ...m, status: 'completed' } : m))
      );
      setActiveScte35Marker((cur) => (cur?.id === newMarker.id ? null : cur));
    }, dur * 1000);
  };

  const clearScte35History = () => {
    setScte35Markers([]);
    setActiveScte35Marker(null);
  };

  // 12b. Non-Linear Advertising (Squeeze-Back L-Bar & Corner Sponsor Bug - Playout Never Stops)
  const [nonLinearAd, setNonLinearAd] = useState<NonLinearAd>({
    isActive: false,
    type: 'corner_bug',
    advertiser: 'Apex Network Sponsor',
    title: 'Summer Tech Keynote 2026',
    tagline: 'Streamed in 4K HDR without broadcast interruption',
    promoCode: 'APEX2026',
    callToActionText: 'Claim 20% Off',
    callToActionUrl: 'https://cloud.google.com/ai',
    durationSeconds: 15,
    timeRemainingSeconds: 15,
  });

  const triggerNonLinearAd = useCallback((options?: Partial<NonLinearAd>) => {
    const dur = options?.durationSeconds || 15;
    setNonLinearAd({
      isActive: true,
      type: options?.type || 'corner_bug',
      advertiser: options?.advertiser || 'Apex Broadcast Sponsor',
      title: options?.title || 'Next-Gen Playout Infrastructure',
      tagline: options?.tagline || 'Continuous 24/7 transmission with zero buffering',
      promoCode: options?.promoCode || 'APEXLIVE',
      callToActionText: options?.callToActionText || 'Learn More',
      callToActionUrl: options?.callToActionUrl || 'https://cloud.google.com/ai',
      durationSeconds: dur,
      timeRemainingSeconds: dur,
      sponsorLogoUrl: options?.sponsorLogoUrl,
      customLBarGraphicUrl: options?.customLBarGraphicUrl,
    });
  }, []);

  const dismissNonLinearAd = useCallback(() => {
    setNonLinearAd((prev) => ({ ...prev, isActive: false, timeRemainingSeconds: 0 }));
  }, []);

  // Automatic countdown timer for non-linear ad
  useEffect(() => {
    if (!nonLinearAd.isActive) return;
    const interval = setInterval(() => {
      setNonLinearAd((prev) => {
        if (!prev.isActive) return prev;
        if (prev.timeRemainingSeconds <= 1) {
          return { ...prev, isActive: false, timeRemainingSeconds: 0 };
        }
        return { ...prev, timeRemainingSeconds: prev.timeRemainingSeconds - 1 };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [nonLinearAd.isActive]);

  // 13. In-Browser Live Studio Engine (OBS-Free Broadcast)
  const [isLiveStudioOpen, setIsLiveStudioOpen] = useState<boolean>(false);
  const [liveStudioStream, setLiveStudioStream] = useState<MediaStream | null>(null);
  const [isLiveStudioBroadcasting, setIsLiveStudioBroadcasting] = useState<boolean>(false);
  const [liveStudioSession, setLiveStudioSession] = useState<InAppLiveStudioSession>({
    isBroadcasting: false,
    streamId: '',
    title: 'Apex Live Studio Broadcast',
    startedAt: null,
    durationSeconds: 0,
    hasWebcam: true,
    hasMicrophone: true,
    hasScreenShare: false,
    layout: 'camera_only',
    audioLevel: 0,
    recordedBlob: null,
    savedToDrive: false,
  });

  const startLiveStudioBroadcast = (stream: MediaStream, title: string) => {
    setLiveStudioStream(stream);
    setIsLiveStudioBroadcasting(true);
    setLiveStudioSession((prev) => ({
      ...prev,
      isBroadcasting: true,
      streamId: `live-studio-${Date.now()}`,
      title: title || 'Live Broadcast from In-Browser Studio',
      startedAt: Date.now(),
      durationSeconds: 0,
    }));
    setViewingMode('linear');
    setSelectedVodProgram(null);
    setChannelPlayoutRevision((rev) => rev + 1);
  };

  const updateLiveStudioStream = (stream: MediaStream) => {
    setLiveStudioStream(stream);
    setChannelPlayoutRevision((rev) => rev + 1);
  };

  const stopLiveStudioBroadcast = async (recordedBlob?: Blob) => {
    setIsLiveStudioBroadcasting(false);
    if (liveStudioStream) {
      liveStudioStream.getTracks().forEach((track) => track.stop());
      setLiveStudioStream(null);
    }
    if (recordedBlob) {
      setLiveStudioSession((prev) => ({
        ...prev,
        isBroadcasting: false,
        recordedBlob,
      }));
    } else {
      setLiveStudioSession((prev) => ({ ...prev, isBroadcasting: false }));
    }
  };

  // Screen Sharing Engine
  const [screenShareStream, setScreenShareStream] = useState<MediaStream | null>(null);
  const [isScreenSharing, setIsScreenSharing] = useState<boolean>(false);
  const [isScreenShareModalOpen, setIsScreenShareModalOpen] = useState<boolean>(false);
  const [activeScreenShareOptions, setActiveScreenShareOptions] = useState<ScreenShareOptions>({
    surfaceType: 'monitor',
    resolution: '1080p',
    includeAudio: true,
    includeMic: false,
    frameRate: 60,
    routeTo: 'all',
  });
  const screenRecorderRef = useRef<MediaRecorder | null>(null);

  const virtualScreenAnimationRef = useRef<number | null>(null);

  const createVirtualScreenStream = useCallback((): MediaStream => {
    if (virtualScreenAnimationRef.current) {
      cancelAnimationFrame(virtualScreenAnimationRef.current);
      virtualScreenAnimationRef.current = null;
    }

    const canvas = document.createElement('canvas');
    canvas.width = 1920;
    canvas.height = 1080;
    const ctx = canvas.getContext('2d');
    let frame = 0;

    const render = () => {
      if (!ctx) return;
      frame++;

      // Gradient background
      const grad = ctx.createLinearGradient(0, 0, 1920, 1080);
      grad.addColorStop(0, '#090d16');
      grad.addColorStop(0.5, '#0f172a');
      grad.addColorStop(1, '#020617');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1920, 1080);

      // Subtle tech grid
      ctx.strokeStyle = 'rgba(51, 65, 85, 0.25)';
      ctx.lineWidth = 1;
      for (let x = 0; x < 1920; x += 80) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 1080);
        ctx.stroke();
      }
      for (let y = 0; y < 1080; y += 80) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(1920, y);
        ctx.stroke();
      }

      // Top Desktop System Header
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, 1920, 52);
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      ctx.strokeRect(0, 0, 1920, 52);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 20px monospace';
      ctx.fillText('APEX BROADCAST NETWORK · LIVE SCREEN TRANSMISSION DESK', 32, 33);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '16px monospace';
      ctx.fillText(new Date().toTimeString().split(' ')[0] + ' UTC', 1700, 33);

      // Center Desktop Presentation Card
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(140, 90, 1640, 900, 16);
      ctx.fill();
      ctx.stroke();

      // Card Header
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.roundRect(140, 90, 1640, 64, [16, 16, 0, 0]);
      ctx.fill();

      // Window Action Dots
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(175, 122, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(202, 122, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(229, 122, 9, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 22px sans-serif';
      ctx.fillText('Live Workstation Display & Presentation Broadcast', 260, 130);

      // Telemetry Cards
      ctx.fillStyle = '#090d16';
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1.5;

      // Card 1
      ctx.beginPath();
      ctx.roundRect(190, 190, 460, 160, 12);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 15px monospace';
      ctx.fillText('BROADCAST RESOLUTION', 215, 225);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 34px monospace';
      ctx.fillText('1920x1080 @ 60 FPS', 215, 275);
      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 14px monospace';
      ctx.fillText('● HARDWARE ENCODER: READY', 215, 315);

      // Card 2
      ctx.beginPath();
      ctx.roundRect(690, 190, 460, 160, 12);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 15px monospace';
      ctx.fillText('INGEST TRANSMISSION PIPELINE', 715, 225);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 34px monospace';
      ctx.fillText('ON-AIR PGM MASTER', 715, 275);
      ctx.fillStyle = '#eab308';
      ctx.font = 'bold 14px monospace';
      ctx.fillText('● YOUTUBE RTMPS RELAY: ACTIVE', 715, 315);

      // Card 3
      ctx.beginPath();
      ctx.roundRect(1190, 190, 540, 160, 12);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 15px monospace';
      ctx.fillText('TRANSMISSION LATENCY', 1215, 225);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 34px monospace';
      ctx.fillText('8.4 ms (ULTRA-LOW)', 1215, 275);
      ctx.fillStyle = '#a855f7';
      ctx.font = 'bold 14px monospace';
      ctx.fillText(`● GLASS-TO-GLASS JITTER: ${(2.1 + Math.sin(frame * 0.08) * 0.5).toFixed(1)}ms`, 1215, 315);

      // Live animated waveform
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      for (let x = 190; x < 1730; x += 10) {
        const y = 560 + Math.sin((x + frame * 5) * 0.012) * 90 + Math.cos((x + frame * 2) * 0.025) * 40;
        if (x === 190) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Lower Third Bug
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.roundRect(190, 840, 240, 48, 8);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 18px monospace';
      ctx.fillText('● SCREEN SHARE ON AIR', 205, 871);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '16px monospace';
      ctx.fillText('Audio & Vision Synchronized across All Multi-Angle Outputs', 450, 871);

      virtualScreenAnimationRef.current = requestAnimationFrame(render);
    };

    render();
    const stream = canvas.captureStream(30);
    const videoTrack = stream.getVideoTracks()[0];
    if (videoTrack) {
      const origStop = videoTrack.stop.bind(videoTrack);
      videoTrack.stop = () => {
        if (virtualScreenAnimationRef.current) {
          cancelAnimationFrame(virtualScreenAnimationRef.current);
          virtualScreenAnimationRef.current = null;
        }
        origStop();
      };
    }
    return stream;
  }, []);

  const stopScreenShare = useCallback(() => {
    if (virtualScreenAnimationRef.current) {
      cancelAnimationFrame(virtualScreenAnimationRef.current);
      virtualScreenAnimationRef.current = null;
    }
    if (screenShareStream) {
      try {
        screenShareStream.getTracks().forEach((track) => track.stop());
      } catch {}
    }
    if (screenRecorderRef.current && screenRecorderRef.current.state !== 'inactive') {
      try {
        screenRecorderRef.current.stop();
      } catch {}
      screenRecorderRef.current = null;
    }
    setScreenShareStream(null);
    setIsScreenSharing(false);
    setLiveStudioStream(null);
    setIsLiveStudioBroadcasting(false);

    // Revert any channel that was routed to the screen share stream
    for (const [chId, assignedProg] of Object.entries(channelAssignments)) {
      if (
        assignedProg?.streamUrl === '/uploads/screen_live_stream.webm' ||
        assignedProg?.title?.startsWith('[Live Screen Share]')
      ) {
        unassignChannelVideo(chId);
      }
    }

    setChannelPlayoutRevision((rev) => rev + 1);
    BroadcastLogger.logVideo('SCREEN_SHARE_STOPPED', 'Screen share transmission stopped.');
  }, [screenShareStream, channelAssignments, unassignChannelVideo]);

  const startScreenShare = useCallback(async (options?: ScreenShareOptions): Promise<MediaStream | null> => {
    const opts: ScreenShareOptions = {
      surfaceType: options?.surfaceType || 'monitor',
      resolution: options?.resolution || '1080p',
      includeAudio: options?.includeAudio ?? true,
      includeMic: options?.includeMic ?? false,
      frameRate: options?.frameRate || 60,
      routeTo: options?.routeTo || 'all',
    };
    setActiveScreenShareOptions(opts);

    // Stop any existing stream cleanly first
    if (screenShareStream) {
      stopScreenShare();
    }

    let stream: MediaStream | null = null;

    // Check if user requested Virtual Canvas Test Pattern
    if (opts.surfaceType === 'virtual') {
      stream = createVirtualScreenStream();
    } else if (opts.surfaceType === 'pip') {
      // DUAL CAPTURE: Screen Share + Live Camera PiP merged on 60fps canvas
      try {
        let displayStream: MediaStream | null = null;
        if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getDisplayMedia) {
          displayStream = await navigator.mediaDevices.getDisplayMedia({
            video: {
              displaySurface: 'monitor',
              frameRate: opts.frameRate,
            },
            audio: opts.includeAudio,
          }).catch(() => null);
        }
        if (!displayStream) {
          displayStream = createVirtualScreenStream();
        }

        let cameraStream: MediaStream | null = null;
        try {
          cameraStream = await navigator.mediaDevices.getUserMedia({
            video: { width: 1280, height: 720 },
            audio: opts.includeMic,
          });
        } catch {
          // Camera denied/unavailable, continue with display only
        }

        if (cameraStream) {
          const pipCanvas = document.createElement('canvas');
          const w = opts.resolution === '4k' ? 3840 : opts.resolution === '720p' ? 1280 : 1920;
          const h = opts.resolution === '4k' ? 2160 : opts.resolution === '720p' ? 720 : 1080;
          pipCanvas.width = w;
          pipCanvas.height = h;
          const ctx = pipCanvas.getContext('2d');

          const screenVid = document.createElement('video');
          screenVid.srcObject = displayStream;
          screenVid.muted = true;
          screenVid.play().catch(() => {});

          const camVid = document.createElement('video');
          camVid.srcObject = cameraStream;
          camVid.muted = true;
          camVid.play().catch(() => {});

          let pipAnimId: number;
          const renderPip = () => {
            if (!ctx) return;
            ctx.drawImage(screenVid, 0, 0, w, h);

            const pipW = Math.round(w * 0.24);
            const pipH = Math.round(pipW * (9 / 16));
            const pipX = w - pipW - Math.round(w * 0.02);
            const pipY = h - pipH - Math.round(h * 0.04);

            ctx.fillStyle = '#000000';
            ctx.fillRect(pipX - 4, pipY - 4, pipW + 8, pipH + 8);
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 3;
            ctx.strokeRect(pipX - 4, pipY - 4, pipW + 8, pipH + 8);

            ctx.drawImage(camVid, pipX, pipY, pipW, pipH);

            ctx.fillStyle = 'rgba(0,0,0,0.85)';
            ctx.fillRect(pipX, pipY + pipH - 24, pipW, 24);
            ctx.fillStyle = '#22c55e';
            ctx.font = 'bold 12px sans-serif';
            ctx.fillText('● LIVE PRESENTER', pipX + 8, pipY + pipH - 8);

            pipAnimId = requestAnimationFrame(renderPip);
          };
          renderPip();

          const compositeStream = pipCanvas.captureStream(opts.frameRate || 60);
          const audioTracks = [...displayStream.getAudioTracks(), ...cameraStream.getAudioTracks()];
          audioTracks.forEach((track) => compositeStream.addTrack(track));

          const vTrack = compositeStream.getVideoTracks()[0];
          if (vTrack) {
            const origStop = vTrack.stop.bind(vTrack);
            vTrack.stop = () => {
              cancelAnimationFrame(pipAnimId);
              displayStream?.getTracks().forEach((t) => t.stop());
              cameraStream?.getTracks().forEach((t) => t.stop());
              origStop();
            };
          }
          stream = compositeStream;
        } else {
          stream = displayStream;
        }
      } catch (pipErr) {
        console.warn('PiP capture error, falling back to standard display:', pipErr);
      }
    } else {
      // Standard DisplayMedia: allows user to select Chrome Tab, Application Window, or Entire Screen
      if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getDisplayMedia) {
        const width = opts.resolution === '4k' ? 3840 : opts.resolution === '720p' ? 1280 : 1920;
        const height = opts.resolution === '4k' ? 2160 : opts.resolution === '720p' ? 720 : 1080;

        // Tier 1: Soft displaySurface hint with full framerate & requested audio
        try {
          const videoConstraints: any = {
            width: { ideal: width },
            height: { ideal: height },
            frameRate: { ideal: opts.frameRate || 60, max: 60 },
          };

          // Soft surface hints: do not constrain rigidly to avoid OverconstrainedError
          if (opts.surfaceType === 'browser') {
            videoConstraints.displaySurface = 'browser';
          } else if (opts.surfaceType === 'window') {
            videoConstraints.displaySurface = 'window';
          } else if (opts.surfaceType === 'monitor') {
            videoConstraints.displaySurface = 'monitor';
          }

          const captureConstraints: any = {
            video: videoConstraints,
          };
          if (opts.includeAudio) {
            captureConstraints.audio = true;
          }

          stream = await navigator.mediaDevices.getDisplayMedia(captureConstraints);
        } catch (err: any) {
          // If user clicked Cancel or denied permission, do NOT inject fake test card
          if (
            err?.name === 'AbortError' ||
            err?.name === 'NotAllowedError' ||
            err?.message?.toLowerCase().includes('cancel') ||
            err?.message?.toLowerCase().includes('denied') ||
            err?.message?.toLowerCase().includes('dismissed')
          ) {
            console.info('User cancelled or dismissed screen share picker.');
            return null;
          }

          // Tier 2: Resilient retry without audio constraints (which often reject inside iframes)
          try {
            console.warn('Constrained getDisplayMedia rejected in iframe. Retrying with direct video capture...', err);
            stream = await navigator.mediaDevices.getDisplayMedia({
              video: true,
              audio: false,
            });
          } catch (retryErr: any) {
            console.warn('Native getDisplayMedia unavailable:', retryErr);
            return null;
          }
        }
      }
    }

    // Only engage virtual technical test card if user explicitly selected 'virtual'
    if (!stream) {
      if (opts.surfaceType === 'virtual') {
        stream = createVirtualScreenStream();
        BroadcastLogger.logVideo(
          'VIRTUAL_SCREEN_ENGAGED',
          `Virtual Broadcast Presentation Screen Stream engaged (${opts.resolution?.toUpperCase() || '1080P'} @ ${opts.frameRate || 60}fps).`
        );
      } else {
        return null;
      }
    }

    if (!stream) return null;

    const videoTrack = stream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.onended = () => {
        stopScreenShare();
      };
    }

    setScreenShareStream(stream);
    setIsScreenSharing(true);

    // Route to liveStudioStream so TVPlayer and Switchers automatically receive the live screen
    setLiveStudioStream(stream);
    setIsLiveStudioBroadcasting(true);
    setViewingMode('linear');
    setChannelPlayoutRevision((rev) => rev + 1);

    // If routeTo includes switcher or all, also update active program scene
    if (opts.routeTo === 'switcher' || opts.routeTo === 'all') {
      assignVideoToChannel(activeChannelId, {
        title: `[Live Screen Share] ${opts.surfaceType?.toUpperCase() || 'DESKTOP'} (${opts.resolution || '1080p'})`,
        streamUrl: '/uploads/screen_live_stream.webm',
        durationMinutes: 120,
        category: 'Live Screen',
      });
    }

    // Send chunks to backend via MediaRecorder so YouTube RTMPS relay receives the screen feed
    try {
      if (typeof MediaRecorder !== 'undefined') {
        let mimeType = 'video/webm';
        if (MediaRecorder.isTypeSupported('video/webm; codecs=vp8')) {
          mimeType = 'video/webm; codecs=vp8';
        } else if (MediaRecorder.isTypeSupported('video/mp4')) {
          mimeType = 'video/mp4';
        }

        const recorder = new MediaRecorder(stream, { mimeType });
        screenRecorderRef.current = recorder;
        recorder.ondataavailable = async (e) => {
          if (e.data && e.data.size > 0) {
            const formData = new FormData();
            formData.append('chunk', e.data);
            formData.append('type', 'screen_share');
            try {
              await fetch('/api/stream/screen-relay-chunk', {
                method: 'POST',
                body: formData,
              });
            } catch {}
          }
        };
        recorder.start(1000);
      }
    } catch (recErr) {
      console.warn('MediaRecorder screen relay notice:', recErr);
    }

    BroadcastLogger.logVideo(
      'SCREEN_SHARE_STARTED',
      `Live Screen Share engaged successfully (${opts.surfaceType} - ${opts.resolution}).`,
      { tracks: stream.getTracks().map((t) => t.kind), options: opts }
    );

    return stream;
  }, [screenShareStream, stopScreenShare, createVirtualScreenStream, activeChannelId, assignVideoToChannel]);

  // Unified Studio Switcher Program Bus State
  const [studioProgramSceneId, setStudioProgramSceneId] = useState<string>('scene-1');

  // Synchronizes the Switcher Program Scene output to the Main TV Network & YouTube Live Ingest
  const syncSwitcherProgramToNetwork = useCallback((streamUrl: string, sceneName: string) => {
    // 1. Assign to Master Channel / Active Channel
    assignVideoToChannel(activeChannelId, {
      title: `[Program Bus] ${sceneName}`,
      streamUrl: streamUrl || '/master_broadcast_feed.mp4',
      durationMinutes: 60,
      category: 'Live Studio',
    });
    setChannelPlayoutRevision((rev) => rev + 1);

    // 2. Notify YouTube relay engine to hot-switch to this Program feed in real-time
    fetch('/api/stream/youtube/switch-channel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channelId: 'pgm-master',
        channelName: `Program Bus (${sceneName})`,
        sourceStreamUrl: streamUrl || '/master_broadcast_feed.mp4',
      }),
    }).catch(() => {});

    BroadcastLogger.logVideo(
      'SWITCHER_PROGRAM_SYNC',
      `Studio Switcher Program (${sceneName}) synchronized with Main TV Network & YouTube Live feed.`,
      { sceneName, streamUrl }
    );
  }, [activeChannelId, assignVideoToChannel]);

  // 12. Real-Time HLS Telemetry & Diagnostics (Hls.js Events API)
  const [hlsDiagnostics, setHlsDiagnostics] = useState<HlsDiagnosticMetrics>({
    isHlsActive: true,
    streamUrl: '',
    bufferLengthSeconds: 0,
    bufferHealth: 'optimal',
    currentBitrateKbps: 0,
    currentResolution: 'Auto ABR',
    currentLevelIndex: -1,
    totalLevels: 0,
    availableLevels: [],
    lastFragmentLatencyMs: 0,
    averageFragmentLatencyMs: 0,
    lastFragmentBandwidthMbps: 0,
    lastFragmentByteSize: 0,
    totalFragmentsLoaded: 0,
    recentFragments: [],
    droppedFrames: 0,
    bufferStallCount: 0,
    autoLevelCapping: -1,
    isLive: true,
    lastUpdated: Date.now(),
    isManualLevelLocked: false,
    manualLevelIndex: -1,
  });

  const [targetHlsManualLevel, setTargetHlsManualLevel] = useState<number>(-1);

  const reportHlsDiagnostics = (update: Partial<HlsDiagnosticMetrics>) => {
    setHlsDiagnostics((prev) => ({
      ...prev,
      ...update,
      lastUpdated: Date.now(),
    }));
  };

  const recordHlsFragment = (frag: HlsFragmentMetric) => {
    setHlsDiagnostics((prev) => {
      const updatedList = [frag, ...prev.recentFragments].slice(0, 30);
      const latencies = updatedList.map((f) => f.latencyMs).filter((l) => l > 0);
      const avgLatency =
        latencies.length > 0 ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : frag.latencyMs;

      return {
        ...prev,
        lastFragmentLatencyMs: frag.latencyMs,
        averageFragmentLatencyMs: avgLatency,
        lastFragmentBandwidthMbps: frag.bandwidthMbps,
        lastFragmentByteSize: frag.byteSize,
        totalFragmentsLoaded: prev.totalFragmentsLoaded + 1,
        recentFragments: updatedList,
        lastUpdated: Date.now(),
      };
    });
  };

  const setHlsManualLevel = (levelIndex: number) => {
    setTargetHlsManualLevel(levelIndex);
    setHlsDiagnostics((prev) => ({
      ...prev,
      isManualLevelLocked: levelIndex >= 0,
      manualLevelIndex: levelIndex,
    }));
  };

  const clearHlsDiagnostics = () => {
    setHlsDiagnostics((prev) => ({
      ...prev,
      recentFragments: [],
      totalFragmentsLoaded: 0,
      bufferStallCount: 0,
      droppedFrames: 0,
    }));
  };

  return (
    <BroadcastContext.Provider
      value={{
        viewingMode,
        setViewingMode,
        toggleViewingMode,
        channels,
        activeChannelId,
        setActiveChannelId,
        activeChannel,
        channelAssignments,
        channelPlayoutRevision,
        assignVideoToChannel,
        unassignChannelVideo,
        createCustomChannel,
        addProgramToChannelSchedule,
        updateChannelProgram,
        removeProgramFromChannelSchedule,
        toggleFavoriteChannel,
        getChannelPlayoutTime,
        calibrateChannelPlayoutTime,
        playout,
        vodCatalog,
        selectedVodProgram,
        setSelectedVodProgram,
        selectVodProgram,
        removeVodProgram,
        purgeInvalidUploadedVideos,
        deduplicateVodLibrary,
        vodSearchQuery,
        setVodSearchQuery,
        vodCategoryFilter,
        setVodCategoryFilter,
        addCustomVodProgram,
        isUploadModalOpen,
        setIsUploadModalOpen,
        tickerItems,
        isTickerVisible,
        setIsTickerVisible,
        tickerCategoryFilter,
        setTickerCategoryFilter,
        tickerFontSize,
        setTickerFontSize,
        isRealNewsLoading,
        refreshRealNews,
        realNewsLastUpdated,
        addCustomTickerItem,
        removeCustomTickerItem,
        isFlashNewsModalOpen,
        setIsFlashNewsModalOpen,
        chatMessages,
        sendChatMessage,
        pollData,
        voteInPoll,
        isControlRoomOpen,
        setIsControlRoomOpen,
        controlRoomInitialTab,
        setControlRoomInitialTab,
        openControlRoomToTab,
        simulatedSportsScore,
        triggerSportsGoal,
        reminders,
        toggleReminder,
        hasReminder,
        currentUser,
        isAuthLoading,
        googleAccessToken,
        setGoogleAccessToken,
        youtubeStreamKey,
        setYoutubeStreamKey,
        youtubeBroadcastId,
        setYoutubeBroadcastId,
        signIn,
        signOutUser,
        scte35Markers,
        activeScte35Marker,
        injectScte35Cue,
        clearScte35History,
        isScte35OverlayOpen,
        setIsScte35OverlayOpen,
        adInventory,
        selectedAdCreativeId,
        setSelectedAdCreativeId,
        selectedAdCreative,
        addCustomAdCreative,
        nonLinearAd,
        triggerNonLinearAd,
        dismissNonLinearAd,
        isLiveStudioOpen,
        setIsLiveStudioOpen,
        liveStudioStream,
        isLiveStudioBroadcasting,
        liveStudioSession,
        startLiveStudioBroadcast,
        updateLiveStudioStream,
        stopLiveStudioBroadcast,
        screenShareStream,
        isScreenSharing,
        isScreenShareModalOpen,
        setIsScreenShareModalOpen,
        activeScreenShareOptions,
        startScreenShare,
        stopScreenShare,
        studioProgramSceneId,
        setStudioProgramSceneId,
        syncSwitcherProgramToNetwork,
        hlsDiagnostics,
        reportHlsDiagnostics,
        recordHlsFragment,
        setHlsManualLevel,
        targetHlsManualLevel,
        clearHlsDiagnostics,
      }}
    >
      {children}
    </BroadcastContext.Provider>
  );
};

export function useBroadcast(): BroadcastContextType {
  const context = useContext(BroadcastContext);
  if (!context) {
    throw new Error('useBroadcast must be used within a BroadcastProvider');
  }
  return context;
}

export function useBroadcastOptional(): BroadcastContextType | null {
  return useContext(BroadcastContext);
}
