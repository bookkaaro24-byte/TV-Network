'use client';

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import Hls from 'hls.js';
import shaka from 'shaka-player';
import {
  Radio,
  Activity,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Eye,
  EyeOff,
  LayoutGrid,
  Check,
  Tv,
  Settings,
  Plus,
  RefreshCw,
  SlidersHorizontal,
  ChevronDown,
  X,
  Play,
  Pause,
  FastForward,
  Rewind,
  Sparkles,
  Layout,
  HardDrive,
  AlertTriangle,
  RotateCcw,
  Terminal,
  Loader2,
  Gauge,
  Info,
  ShieldAlert,
  Clock,
  ExternalLink,
  Cpu,
  Monitor,
  Wifi,
  Zap,
  Share2,
} from 'lucide-react';
import { useBroadcastOptional } from '../context/BroadcastContext';
import { getDriveMediaPlaybackUrl } from '../services/googleDriveService';
import { HlsLevelInfo, HlsFragmentMetric } from '../types/broadcast';
import { BroadcastLogger } from '../services/broadcastLogger';
import { SAMPLE_STREAMS } from '../data/mockBroadcastData';
import {
  extractYouTubeVideoId,
  getYouTubeEmbedUrl,
  VERIFIED_YOUTUBE_FEEDS,
  loadYouTubeIframeApi,
  YouTubePlayerInstance,
} from '../utils/youtube';
import {
  runMediaCapabilitiesDiagnostics,
  MediaCapabilitiesReport,
} from '../utils/mediaCapabilitiesDiagnostics';

// Initialize Shaka Player polyfills on client
if (typeof window !== 'undefined' && shaka && shaka.polyfill) {
  try {
    shaka.polyfill.installAll();
  } catch (err) {
    console.warn('Shaka polyfill initialization note:', err);
  }
}

export interface SportsScoreboard {
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  timeElapsed: string;
}

export interface CameraAngleFeed {
  id: string;
  name: string;
  label: string;
  description: string;
  streamUrl: string;
}

export interface TVPlayerProps {
  streamUrl?: string;
  isLiveSports?: boolean;
  sportsData?: SportsScoreboard;
  tickerMessages?: string[];
  initialShowTicker?: boolean;
  autoPlay?: boolean;
  enableMultiView?: boolean;
  cameraFeeds?: CameraAngleFeed[];
  onBitrateChange?: (bitrateKbps: number) => void;
}

// Preset Pool of Secondary Live Feeds (HLS, 4K MP4, and YouTube Live)
export const AVAILABLE_HLS_FEEDS: CameraAngleFeed[] = [
  {
    id: 'cam-pgm',
    name: 'Master Program (PGM)',
    label: 'CAM 1 · PGM MAIN',
    description: 'Director Master Playout Cut & Primary Audio Line',
    streamUrl: SAMPLE_STREAMS.SPORTS_LIVE,
  },
  {
    id: 'cam-tactical',
    name: 'Tactical High-Cam',
    label: 'CAM 2 · TACTICAL HIGH',
    description: 'Wide Pitch / Court Overhead Formation & Defensive Structure',
    streamUrl: SAMPLE_STREAMS.VOD_HLS_SAMPLE,
  },
  {
    id: 'cam-bench',
    name: 'Sideline & Bench ISO',
    label: 'CAM 3 · SIDELINE ISO',
    description: 'Bench Reactions, Manager Coaching Zone & Substitution Tracking',
    streamUrl: SAMPLE_STREAMS.FOUR_K_UHD_SAMPLE,
  },
  {
    id: 'cam-drone',
    name: 'In-Goal / Drone Telemetry',
    label: 'CAM 4 · DRONE / REF',
    description: 'Aerial Wire-Cam & Isolated Goalmouth Telemetry',
    streamUrl: SAMPLE_STREAMS.LIVE_STREAM_SIMULATION,
  },
  {
    id: 'cam-reverse',
    name: 'Reverse Stadium Endzone',
    label: 'CAM 5 · REVERSE ANGLE',
    description: 'Opposite Side Pitch View & Goal-Line Perspective',
    streamUrl: SAMPLE_STREAMS.SPORTS_LIVE,
  },
  {
    id: 'cam-press',
    name: 'Press Box / Studio Feed',
    label: 'CAM 6 · STUDIO / DESK',
    description: 'Commentary Booth Ingest & Halftime Analyst Room',
    streamUrl: SAMPLE_STREAMS.TECH_PODCAST,
  },
  {
    id: 'cam-yt-iss',
    name: 'NASA ISS Earth Live (YouTube)',
    label: 'CAM 7 · YT LIVE SPACE',
    description: 'Direct YouTube Ingest: Real-time Earth views from ISS',
    streamUrl: 'https://www.youtube.com/watch?v=21X5lGlDOfg',
  },
  {
    id: 'cam-yt-bloomberg',
    name: 'Apex Studio Live (YouTube Ingest)',
    label: 'CAM 8 · YT LIVE',
    description: 'Direct YouTube Ingest: Apex Network 24/7 Live broadcast',
    streamUrl: 'https://www.youtube.com/watch?v=RyUoz0-hRLk',
  },
  {
    id: 'cam-yt-google',
    name: 'Bloomberg Markets Live (YouTube)',
    label: 'CAM 9 · YT GLOBAL',
    description: 'Direct YouTube Ingest: Bloomberg Global Markets 24/7 broadcast',
    streamUrl: 'https://www.youtube.com/watch?v=dp8PhLsUcFE',
  },
];

// Initial Default Feeds for the Multi-View Grid (up to 8 slots)
const DEFAULT_QUAD_SELECTION: string[] = [
  'cam-pgm',
  'cam-tactical',
  'cam-bench',
  'cam-drone',
  'cam-reverse',
  'cam-press',
  'cam-yt-iss',
  'cam-yt-bloomberg',
];

export const TVPlayer: React.FC<TVPlayerProps> = ({
  streamUrl: propStreamUrl,
  isLiveSports: propIsLiveSports,
  sportsData: propSportsData,
  tickerMessages: propTickerMessages,
  initialShowTicker = true,
  autoPlay = true,
  enableMultiView = true,
  cameraFeeds: propCameraFeeds,
  onBitrateChange,
}) => {
  const context = useBroadcastOptional();
  const viewingMode = context?.viewingMode ?? 'linear';
  const playout = context?.playout;
  const activeChannel = context?.activeChannel;
  const activeChannelId = context?.activeChannelId || 'apex-101';
  const channels = context?.channels ?? [];
  const channelAssignments = context?.channelAssignments ?? {};
  const assignVideoToChannel = context?.assignVideoToChannel;
  const setIsUploadModalOpen = context?.setIsUploadModalOpen;
  const selectedVodProgram = context?.selectedVodProgram ?? null;
  const simulatedSportsScore = context?.simulatedSportsScore ?? { home: 2, away: 1, minute: "74'" };
  const tickerItems = context?.tickerItems ?? [];
  const liveStudioStream = context?.liveStudioStream ?? null;
  const isLiveStudioBroadcasting = context?.isLiveStudioBroadcasting ?? false;
  const screenShareStream = context?.screenShareStream ?? null;
  const isScreenSharing = context?.isScreenSharing ?? false;
  const startScreenShare = context?.startScreenShare;
  const stopScreenShare = context?.stopScreenShare;
  const activeScte35Marker = context?.activeScte35Marker ?? null;
  const isScte35OverlayOpen = context?.isScte35OverlayOpen ?? false;
  const nonLinearAd = context?.nonLinearAd;
  const triggerNonLinearAd = context?.triggerNonLinearAd;
  const dismissNonLinearAd = context?.dismissNonLinearAd;
  const setIsFlashNewsModalOpen = context?.setIsFlashNewsModalOpen;

  // Non-Linear Ad & Custom Video Ingestion Controls
  const [isAdMenuOpen, setIsAdMenuOpen] = useState<boolean>(false);
  const [isCustomInjectOpen, setIsCustomInjectOpen] = useState<boolean>(false);
  const [customInjectUrl, setCustomInjectUrl] = useState<string>('');
  const [customInjectTitle, setCustomInjectTitle] = useState<string>('');
  const [customInjectTargetChannel, setCustomInjectTargetChannel] = useState<string>(activeChannelId);

  // Multi-View state: false = Single PGM View, true = Multi-View Grid
  const [isMultiView, setIsMultiView] = useState<boolean>(false);
  const [multiViewSlotCount, setMultiViewSlotCount] = useState<4 | 6 | 8>(4);
  const [activeAudioCamId, setActiveAudioCamId] = useState<string>('cam-pgm');
  
  // Custom selection of feeds for the 4 slots in the 2x2 grid
  const [selectedQuadFeedIds, setSelectedQuadFeedIds] = useState<string[]>(DEFAULT_QUAD_SELECTION);
  const [isFeedSelectorOpen, setIsFeedSelectorOpen] = useState<boolean>(false);
  const [activeSlotToConfigure, setActiveSlotToConfigure] = useState<number | null>(null);
  const [customStreamInput, setCustomStreamInput] = useState<string>('');
  const [customFeedName, setCustomFeedName] = useState<string>('');
  const [customFeeds, setCustomFeeds] = useState<CameraAngleFeed[]>([]);

  // Test feed override state (for testing sample feeds)
  const [testFeedOverride, setTestFeedOverride] = useState<string | null>(null);

  // Video Playback State (for VOD & Custom Uploaded Media)
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(1);
  const [selectedRatio, setSelectedRatio] = useState<'auto' | '16:9' | '9:16' | '4:3' | '21:9'>('auto');
  const [detectedRatio, setDetectedRatio] = useState<'16:9' | '9:16' | '4:3' | '21:9'>('16:9');
  const [fitMode, setFitMode] = useState<'contain' | 'cover'>('contain');
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [showRatioSelector, setShowRatioSelector] = useState<boolean>(false);

  // Dedicated BufferMonitor State to ensure video playback persistence during component re-renders
  const [bufferLevel, setBufferLevel] = useState<number>(0);
  const [bufferHealth, setBufferHealth] = useState<'optimal' | 'stable' | 'low' | 'stalled'>('optimal');
  const [isBufferStalled, setIsBufferStalled] = useState<boolean>(false);
  const [recoveryCount, setRecoveryCount] = useState<number>(0);
  const [isAudioOnlyTrackDetected, setIsAudioOnlyTrackDetected] = useState<boolean>(false);
  const persistentPlaybackTimeRef = useRef<number>(0);
  const lastLoadedUrlRef = useRef<string>('');

  // 4K / 2160p High-Resolution Stream & Custom Buffer Configuration State
  const [is4KStreamDetected, setIs4KStreamDetected] = useState<boolean>(false);
  const [is4KLevelActive, setIs4KLevelActive] = useState<boolean>(false);
  const [hlsBufferConfig, setHlsBufferConfig] = useState<{
    maxBufferLength: number;
    maxMaxBufferLength: number;
    maxBufferSizeMB: number;
  }>({
    maxBufferLength: 30,
    maxMaxBufferLength: 60,
    maxBufferSizeMB: 60,
  });

  const channelPlayoutRevision = context?.channelPlayoutRevision ?? 0;

  // Browser Codec Capabilities Check for MSE / HTML5 video tag
  const codecSupport = useMemo(() => {
    if (typeof window === 'undefined') {
      return {
        mse: false,
        h264: true,
        hevc: false,
        vp9: false,
        av1: false,
      };
    }
    const testVideo = document.createElement('video');
    const MS = (window as any).MediaSource;
    const mseHevc = MS
      ? MS.isTypeSupported('video/mp4; codecs="hev1.1.6.L93.B0, mp4a.40.2"') ||
        MS.isTypeSupported('video/mp4; codecs="hvc1.1.6.L93.B0, mp4a.40.2"')
      : false;
    const nativeHevc = Boolean(
      testVideo.canPlayType('video/mp4; codecs="hevc, mp4a.40.2"') ||
      testVideo.canPlayType('video/mp4; codecs="hvc1.1.6.L93.B0"') ||
      testVideo.canPlayType('video/mp4; codecs="hev1.1.6.L93.B0"') ||
      testVideo.canPlayType('video/mp4; codecs="hev1"') ||
      testVideo.canPlayType('video/mp4; codecs="hvc1"')
    );
    const hevc = mseHevc || nativeHevc;
    return {
      mse: Boolean(MS),
      h264: !MS || MS.isTypeSupported('video/mp4; codecs="avc1.42E01E, mp4a.40.2"') || MS.isTypeSupported('video/mp4; codecs="avc1.640028, mp4a.40.2"'),
      hevc,
      vp9: MS ? MS.isTypeSupported('video/webm; codecs="vp9, opus"') : true,
      av1: MS ? MS.isTypeSupported('video/mp4; codecs="av01.0.08M.08, mp4a.40.2"') : false,
    };
  }, []);

  const containerRef = useRef<HTMLDivElement>(null);
  const singleVideoRef = useRef<HTMLVideoElement>(null);
  const ytIframeRef = useRef<HTMLIFrameElement>(null);
  const ytPlayerRef = useRef<YouTubePlayerInstance | null>(null);
  const adVideoRef = useRef<HTMLVideoElement>(null);
  
  // Refs for the 4 Multi-View video elements & HLS instances
  const multiVideoRefs = useRef<{ [key: string]: HTMLVideoElement | null }>({});
  const multiHlsRefs = useRef<{ [key: string]: Hls | null }>({});
  const singleHlsRef = useRef<Hls | null>(null);
  const fragLoadingTimesRef = useRef<Map<string, number>>(new Map());

  const [playbackEngine, setPlaybackEngine] = useState<'html5' | 'mse'>('html5');
  const [showCodecDiagnostics, setShowCodecDiagnostics] = useState<boolean>(false);
  const [mediaReport, setMediaReport] = useState<MediaCapabilitiesReport | null>(null);
  const shakaPlayerRef = useRef<any>(null);

  useEffect(() => {
    runMediaCapabilitiesDiagnostics()
      .then((rep) => setMediaReport(rep))
      .catch((err) => console.warn('Media capabilities check note:', err));
  }, []);

  // Stream Health Monitor Overlay State (Real-Time Bitrates, Frame Drops & Latency Telemetry)
  const [showStreamHealthMonitor, setShowStreamHealthMonitor] = useState<boolean>(false);
  const [playbackQualityStats, setPlaybackQualityStats] = useState<{
    totalFrames: number;
    droppedFrames: number;
    dropRatePercent: number;
    corruptedFrames: number;
  }>({
    totalFrames: 0,
    droppedFrames: 0,
    dropRatePercent: 0,
    corruptedFrames: 0,
  });
  const [telemetryHistory, setTelemetryHistory] = useState<
    Array<{
      timestamp: number;
      bitrateKbps: number;
      latencyMs: number;
      droppedFrames: number;
    }>
  >([]);

  // Real-time Frame Decodes & Drop Rate Telemetry Watcher
  useEffect(() => {
    const video = singleVideoRef.current;
    if (!video) return;

    const interval = setInterval(() => {
      let total = 0;
      let dropped = 0;
      let corrupted = 0;

      if (typeof video.getVideoPlaybackQuality === 'function') {
        const quality = video.getVideoPlaybackQuality();
        total = quality.totalVideoFrames || 0;
        dropped = quality.droppedVideoFrames || 0;
        corrupted = quality.corruptedVideoFrames || 0;
      } else if ((video as any).webkitDecodedFrameCount !== undefined) {
        total = (video as any).webkitDecodedFrameCount || 0;
        dropped = (video as any).webkitDroppedFrameCount || 0;
      }

      const rate = total > 0 ? (dropped / total) * 100 : 0;
      const rateNum = Number(rate.toFixed(2));
      setPlaybackQualityStats({
        totalFrames: total,
        droppedFrames: dropped,
        dropRatePercent: rateNum,
        corruptedFrames: corrupted,
      });

      context?.reportHlsDiagnostics?.({
        totalFrames: total,
        droppedFrames: dropped,
        corruptedFrames: corrupted,
        dropRatePercent: rateNum,
        activeVideoCodec: isHevcDetected
          ? 'HEVC / H.265 (Main 10 UHD)'
          : is4KLevelActive || is4KStreamDetected
          ? 'HEVC / H.264 4K UHD'
          : 'AVC / H.264 High Profile',
        activeAudioCodec: 'AAC-LC / 48kHz Stereo',
        isHevcDetected: isHevcDetected || is4KStreamDetected,
        isAudioOnlyDetected: isAudioOnlyTrackDetected,
        hardwareDecoderPipeline: codecSupport.hevc
          ? 'GPU Hardware (NVDEC/VCN)'
          : isHevcDetected
          ? 'Real-Time Faststart Transcode'
          : 'MSE Direct Hardware',
      });

      // Update rolling telemetry history (last 16 data points for SVG sparkline)
      const currentBitrate = context?.hlsDiagnostics?.currentBitrateKbps || (is4KLevelActive ? 18500 : 4800);
      const currentLatency =
        context?.hlsDiagnostics?.lastFragmentLatencyMs ||
        (playout?.hotSwitch?.isActive ? playout.hotSwitch.latencyMs : 85);

      setTelemetryHistory((prev) => {
        const next = [
          ...prev.slice(-15),
          {
            timestamp: Date.now(),
            bitrateKbps: currentBitrate,
            latencyMs: currentLatency,
            droppedFrames: dropped,
          },
        ];
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [singleVideoRef, context?.hlsDiagnostics, is4KLevelActive, playout?.hotSwitch]);

  // Main Stream URL calculation - strictly guarantees sync between channel selection and stream playback
  const streamUrl = useMemo(() => {
    if (testFeedOverride) return testFeedOverride;

    // 1. In VOD Mode: play selected VOD program
    if (viewingMode === 'vod') {
      return (
        selectedVodProgram?.streamUrl ||
        playout?.activeStreamUrl ||
        SAMPLE_STREAMS.LIVE_STREAM_SIMULATION
      );
    }

    // 2. In Linear Live Mode:
    // A. Explicit prop streamUrl
    if (propStreamUrl) return propStreamUrl;

    // B. Check if current channel has an active assigned video (with normalized lookup)
    const chanKey = activeChannel?.channelId || activeChannelId || '';
    if (chanKey) {
      const numOnly = chanKey.replace(/\D/g, '');
      const assigned =
        channelAssignments[chanKey] ||
        channelAssignments[chanKey.replace('apex-', 'ch-')] ||
        channelAssignments[chanKey.replace('ch-', 'apex-')] ||
        channelAssignments[chanKey.replace('apex-', '')] ||
        (numOnly ? channelAssignments[numOnly] : undefined) ||
        (numOnly ? channelAssignments[`apex-${numOnly}`] : undefined) ||
        (numOnly ? channelAssignments[`ch-${numOnly}`] : undefined) ||
        (activeChannel?.channelNumber ? channelAssignments[String(activeChannel.channelNumber)] : undefined);
      if (assigned?.streamUrl) {
        return assigned.streamUrl;
      }
    }

    // C. Active Channel Current Program Stream from EPG Schedule (Live show first, then slot match)
    const now = Date.now();
    const currentProg =
      activeChannel?.programs?.find((p) => p.isLive) ||
      activeChannel?.programs?.find((p) => now >= p.startTime && now < p.endTime) ||
      activeChannel?.programs?.[0];

    if (currentProg?.streamUrl) {
      return currentProg.streamUrl;
    }

    // D. Hot-switch live feed if engaged
    if (playout?.hotSwitch?.isActive && playout?.activeStreamUrl) {
      return playout.activeStreamUrl;
    }

    // E. Playout Engine Stream
    if (playout?.activeStreamUrl) {
      return playout.activeStreamUrl;
    }

    return '/master_broadcast_feed.mp4';
  }, [
    testFeedOverride,
    propStreamUrl,
    viewingMode,
    channelPlayoutRevision,
    channelAssignments,
    playout?.activeStreamUrl,
    playout?.hotSwitch?.isActive,
    selectedVodProgram?.streamUrl,
    activeChannel,
    activeChannelId,
    activeChannel?.channelId,
    activeChannel?.channelNumber,
    activeChannel?.programs,
  ]);

  // Automatically clear test feed override when user chooses a VOD program or toggles viewingMode
  useEffect(() => {
    if (testFeedOverride) {
      setTestFeedOverride(null);
    }
  }, [viewingMode, selectedVodProgram?.id, selectedVodProgram?.streamUrl]);

  // Universal YouTube Video ID detection (supports watch, embed, shorts, live, and raw IDs)
  const youtubeVideoId = useMemo(() => {
    if ((isScreenSharing && screenShareStream) || (isLiveStudioBroadcasting && liveStudioStream)) {
      return null;
    }
    return extractYouTubeVideoId(streamUrl);
  }, [streamUrl, isScreenSharing, screenShareStream, isLiveStudioBroadcasting, liveStudioStream]);

  // Stable YouTube initial start offset (calculated once per video/channel to avoid continuous iframe reload flickers)
  const initialYouTubeStartTime = useMemo(() => {
    if (!youtubeVideoId) return 0;
    return Math.floor(context?.getChannelPlayoutTime?.(activeChannelId, 1800) ?? 0);
  }, [youtubeVideoId, activeChannelId]);

  // Google Drive File ID detection
  const googleDriveFileId = useMemo(() => {
    if (!streamUrl) return null;
    if (streamUrl.includes('drive.google.com')) {
      const match = streamUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || streamUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      return match ? match[1] : null;
    }
    return null;
  }, [streamUrl]);

  // Authorized direct Google Drive streaming blob (when authenticated)
  const [directDriveBlobUrl, setDirectDriveBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (googleDriveFileId && context?.googleAccessToken) {
      getDriveMediaPlaybackUrl(context.googleAccessToken, googleDriveFileId)
        .then((url) => {
          if (active) setDirectDriveBlobUrl(url);
        })
        .catch(() => {
          if (active) setDirectDriveBlobUrl(null);
        });
    } else {
      setDirectDriveBlobUrl(null);
    }
    return () => {
      active = false;
    };
  }, [googleDriveFileId, context?.googleAccessToken]);

  const rawPlayableUrl = directDriveBlobUrl || streamUrl;
  const isHevcDetected = useMemo(() => {
    if (!rawPlayableUrl) return false;
    const lower = rawPlayableUrl.toLowerCase();
    return (
      lower.includes('hevc') ||
      lower.includes('h265') ||
      lower.includes('.265') ||
      lower.includes('4k_hevc')
    );
  }, [rawPlayableUrl]);

  // Route HEVC 4K streams to real-time faststart transcode pipeline if browser lacks native hardware decode
  const activePlayableUrl = useMemo(() => {
    if (!rawPlayableUrl) return rawPlayableUrl;
    if (isHevcDetected && !codecSupport.hevc) {
      if (rawPlayableUrl.startsWith('/api/stream/') && !rawPlayableUrl.includes('hevc-transcode')) {
        const filename = rawPlayableUrl.replace('/api/stream/', '');
        return `/api/stream/hevc-transcode/${filename}`;
      }
    }
    return rawPlayableUrl;
  }, [rawPlayableUrl, isHevcDetected, codecSupport.hevc]);

  // On-demand transcode optimizer state for videos with unsupported 4K/HEVC/10-bit video tracks
  const [isOptimizingVideo, setIsOptimizingVideo] = useState<boolean>(false);
  const handleAutoOptimizeCurrentVideo = useCallback(async () => {
    if (!activePlayableUrl) return;
    setIsOptimizingVideo(true);
    try {
      const resp = await fetch('/api/transcode-optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: activePlayableUrl }),
      });
      const data = await resp.json();
      if (data.success && data.optimizedUrl) {
        if (singleVideoRef.current) {
          singleVideoRef.current.src = data.optimizedUrl;
          singleVideoRef.current.load();
          singleVideoRef.current.play().catch(() => {});
        }
        setIsAudioOnlyTrackDetected(false);
        setPlaybackError(null);
      }
    } catch (err) {
      console.error('Failed to auto-optimize video:', err);
    } finally {
      setIsOptimizingVideo(false);
    }
  }, [activePlayableUrl]);

  // Combined pool of available feeds including uploaded videos from VOD catalog!
  const allAvailableFeeds = useMemo(() => {
    // Generate camera feeds from uploaded VOD videos
    const vodFeeds: CameraAngleFeed[] = (context?.vodCatalog || []).map((v, i) => ({
      id: `feed-vod-${v.id}`,
      name: `[Vault] ${v.title}`,
      label: `SLOT ${i + 9} · ${v.title.slice(0, 16)}`,
      description: `Uploaded Video: ${v.category} · ${v.durationMinutes}m`,
      streamUrl: v.streamUrl,
    }));

    const list = [...AVAILABLE_HLS_FEEDS, ...vodFeeds, ...customFeeds];
    // Dynamic injection of current active program streamUrl into PGM MAIN
    return list.map((feed) => (feed.id === 'cam-pgm' ? { ...feed, streamUrl } : feed));
  }, [customFeeds, streamUrl, context?.vodCatalog]);

  // Selected feeds displayed in the Multi-View grid (supports 4, 6, or 8 slots)
  const cameraFeeds = useMemo(() => {
    if (propCameraFeeds && propCameraFeeds.length >= multiViewSlotCount) {
      return propCameraFeeds.slice(0, multiViewSlotCount);
    }
    const neededIds = selectedQuadFeedIds.slice(0, multiViewSlotCount);
    while (neededIds.length < multiViewSlotCount) {
      const nextFeed = allAvailableFeeds[neededIds.length % allAvailableFeeds.length];
      neededIds.push(nextFeed?.id || `fallback-${neededIds.length}`);
    }

    return neededIds.map((feedId, index) => {
      const found = allAvailableFeeds.find((f) => f.id === feedId);
      if (found) return found;
      return allAvailableFeeds[index % allAvailableFeeds.length];
    });
  }, [propCameraFeeds, selectedQuadFeedIds, allAvailableFeeds, multiViewSlotCount]);

  // Content type check
  const isLiveSports = useMemo(() => {
    if (propIsLiveSports !== undefined) return propIsLiveSports;
    const currentProg = viewingMode === 'linear' ? playout?.currentProgram : selectedVodProgram;
    return currentProg?.contentType === 'sports' || currentProg?.category?.toLowerCase().includes('sport');
  }, [propIsLiveSports, viewingMode, playout?.currentProgram, selectedVodProgram]);

  // Sports Scoreboard Data
  const sportsData: SportsScoreboard = useMemo(() => {
    if (propSportsData) return propSportsData;
    const currentProg = viewingMode === 'linear' ? playout?.currentProgram : selectedVodProgram;
    const home = currentProg?.sportsData?.teams.home.name || 'INTER MILAN';
    const away = currentProg?.sportsData?.teams.away.name || 'REAL MADRID';
    return {
      homeTeam: home,
      awayTeam: away,
      homeScore: simulatedSportsScore.home,
      awayScore: simulatedSportsScore.away,
      timeElapsed: simulatedSportsScore.minute,
    };
  }, [propSportsData, viewingMode, playout?.currentProgram, selectedVodProgram, simulatedSportsScore]);

  // Ticker Messages (Prioritize real live news items with fallback)
  const tickerMessages = useMemo(() => {
    if (tickerItems && tickerItems.length > 0) {
      return tickerItems.map((item) => {
        const cat = item.category ? `[${item.category}] ` : '';
        const chg = item.change ? ` (${item.change})` : '';
        const src = item.source ? ` • ${item.source}` : '';
        return `${cat}${item.headline}${chg}${src}`;
      });
    }
    if (propTickerMessages && propTickerMessages.length > 0) return propTickerMessages;
    return ['APEX NETWORK: Real-time broadcast playout engine active'];
  }, [propTickerMessages, tickerItems]);



  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showTicker, setShowTicker] = useState(initialShowTicker);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [youtubeEmbedBlocked, setYoutubeEmbedBlocked] = useState<boolean>(false);
  const [isYtApiLoaded, setIsYtApiLoaded] = useState<boolean>(false);

  // Automated and manual Retry Playback handler with HTML5 ⇄ MSE pipeline switching
  const handleRetryPlayback = useCallback(async (forcedEngine?: 'html5' | 'mse') => {
    const video = singleVideoRef.current;
    if (!video || !activePlayableUrl) return;

    const nextEngine = forcedEngine || (playbackEngine === 'html5' ? 'mse' : 'html5');
    setPlaybackEngine(nextEngine);
    setPlaybackError(null);
    setIsAudioOnlyTrackDetected(false);
    setIsBufferStalled(false);

    BroadcastLogger.logVideo(
      'ENGINE_RETRY',
      `Playback retry initiated. Engaging engine: ${nextEngine.toUpperCase()}`,
      { url: activePlayableUrl, engine: nextEngine }
    );

    if (nextEngine === 'mse' && typeof window !== 'undefined' && shaka && shaka.Player && shaka.Player.isBrowserSupported()) {
      try {
        if (!shakaPlayerRef.current) {
          shakaPlayerRef.current = new shaka.Player(video);
        }
        await shakaPlayerRef.current.load(activePlayableUrl);
        video.muted = isMuted;
        await video.play().catch(() => {
          video.muted = true;
          setIsMuted(true);
          return video.play();
        });
        setIsPlaying(true);
        return;
      } catch (err: any) {
        console.warn('Shaka MSE playback notice, falling back to HTML5:', err);
      }
    }

    // Direct HTML5 video tag fallback
    if (shakaPlayerRef.current) {
      try { await shakaPlayerRef.current.destroy(); } catch {}
      shakaPlayerRef.current = null;
    }
    video.src = activePlayableUrl;
    video.load();
    video.muted = isMuted;
    video.play().then(() => setIsPlaying(true)).catch(() => {
      video.muted = true;
      setIsMuted(true);
      video.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    });
  }, [activePlayableUrl, isMuted, playbackEngine]);

  const ytMountContainerRef = useRef<HTMLDivElement>(null);

  // Reset embed blocked state when video changes
  useEffect(() => {
    setYoutubeEmbedBlocked(false);
  }, [youtubeVideoId]);

  // Initialize & Manage YouTube IFrame API Player
  useEffect(() => {
    let isMounted = true;
    if (!youtubeVideoId) {
      if (ytPlayerRef.current) {
        try {
          ytPlayerRef.current.destroy();
        } catch {}
        ytPlayerRef.current = null;
      }
      if (ytMountContainerRef.current) {
        ytMountContainerRef.current.innerHTML = '';
      }
      return;
    }

    loadYouTubeIframeApi().then(() => {
      if (!isMounted) return;
      setIsYtApiLoaded(true);

      const container = ytMountContainerRef.current;
      if (!container || !(window as any).YT || !(window as any).YT.Player) return;

      // If player instance already initialized and has loadVideoById, load new video id directly
      if (ytPlayerRef.current && typeof ytPlayerRef.current.loadVideoById === 'function') {
        try {
          ytPlayerRef.current.loadVideoById(youtubeVideoId);
          if (isMuted) ytPlayerRef.current.mute();
          else {
            ytPlayerRef.current.unMute();
            ytPlayerRef.current.setVolume(Math.round(volume * 100));
          }
          ytPlayerRef.current.playVideo();
          setIsPlaying(true);
          setYoutubeEmbedBlocked(false);
          return;
        } catch (e) {
          console.warn('Error reloading video in existing player instance, re-instantiating:', e);
          try {
            ytPlayerRef.current.destroy();
          } catch {}
          ytPlayerRef.current = null;
        }
      }

      // Clear any previous mount contents and create mount target node
      container.innerHTML = '';
      const mountNode = document.createElement('div');
      mountNode.className = 'w-full h-full';
      container.appendChild(mountNode);

      // Initialize fresh YT.Player
      try {
        const player = new (window as any).YT.Player(mountNode, {
          videoId: youtubeVideoId,
          width: '100%',
          height: '100%',
          playerVars: {
            autoplay: 1,
            mute: isMuted ? 1 : 0,
            controls: 1,
            enablejsapi: 1,
            rel: 0,
            modestbranding: 1,
            playsinline: 1,
            origin: typeof window !== 'undefined' ? window.location.origin : '',
            widget_referrer: typeof window !== 'undefined' ? window.location.origin : '',
          },
          events: {
            onReady: (evt: any) => {
              if (!isMounted) return;
              ytPlayerRef.current = evt.target;
              if (isMuted) evt.target.mute();
              else {
                evt.target.unMute();
                evt.target.setVolume(Math.round(volume * 100));
              }
              evt.target.playVideo();
              setIsPlaying(true);
              setYoutubeEmbedBlocked(false);
            },
            onStateChange: (evt: any) => {
              if (!isMounted) return;
              if (evt.data === 1) {
                setIsPlaying(true);
                setYoutubeEmbedBlocked(false);
              } else if (evt.data === 2) {
                setIsPlaying(false);
              }
            },
            onError: (evt: any) => {
              if (!isMounted) return;
              console.warn('[YouTube IFrame API Error]:', evt.data);
              // Error 150/101: Embedding disabled by video owner
              // Error 100: Video removed/not found
              // Error 2: Invalid parameter
              if (evt.data === 150 || evt.data === 101 || evt.data === 100) {
                setYoutubeEmbedBlocked(true);
              }
            },
          },
        });
        ytPlayerRef.current = player;
      } catch (err) {
        console.warn('YouTube IFrame API instantiation fallback note:', err);
      }
    });

    return () => {
      isMounted = false;
      if (ytPlayerRef.current) {
        try {
          ytPlayerRef.current.destroy();
        } catch {}
        ytPlayerRef.current = null;
      }
      if (ytMountContainerRef.current) {
        ytMountContainerRef.current.innerHTML = '';
      }
    };
  }, [youtubeVideoId, channelPlayoutRevision]);

  // Sync YouTube Player volume & mute states
  useEffect(() => {
    if (youtubeVideoId && ytPlayerRef.current) {
      try {
        if (isMuted) {
          ytPlayerRef.current.mute();
        } else {
          ytPlayerRef.current.unMute();
          ytPlayerRef.current.setVolume(Math.round(volume * 100));
        }
      } catch {}
    }
  }, [isMuted, volume, youtubeVideoId]);

  // Pause YouTube stream during SSAI Ad Breaks and resume on return
  useEffect(() => {
    if (youtubeVideoId && ytPlayerRef.current) {
      try {
        if (playout?.activeAdBreak) {
          ytPlayerRef.current.pauseVideo();
        } else {
          ytPlayerRef.current.playVideo();
        }
      } catch {}
    }
  }, [playout?.activeAdBreak, youtubeVideoId]);

  // Listen to YouTube postMessage event errors (codes 150/101: owner disabled embedding)
  useEffect(() => {
    const handleWindowMessage = (e: MessageEvent) => {
      try {
        if (typeof e.data === 'string') {
          const data = JSON.parse(e.data);
          if (data.event === 'infoDelivery' && data.info) {
            if (data.info.error === 150 || data.info.error === 101 || data.info.error === 100) {
              setYoutubeEmbedBlocked(true);
            }
          }
          if (data.event === 'onError' && (data.data === 150 || data.data === 101 || data.data === 100)) {
            setYoutubeEmbedBlocked(true);
          }
        }
      } catch {}
    };
    window.addEventListener('message', handleWindowMessage);
    return () => window.removeEventListener('message', handleWindowMessage);
  }, []);

  const togglePlay = useCallback(() => {
    if (youtubeVideoId && ytPlayerRef.current) {
      try {
        if (isPlaying) {
          ytPlayerRef.current.pauseVideo();
          setIsPlaying(false);
        } else {
          ytPlayerRef.current.playVideo();
          setIsPlaying(true);
        }
      } catch {}
      return;
    }
    if (!singleVideoRef.current) return;
    if (singleVideoRef.current.paused) {
      singleVideoRef.current.play().then(() => setIsPlaying(true)).catch(() => {
        if (singleVideoRef.current) {
          singleVideoRef.current.muted = true;
          setIsMuted(true);
          singleVideoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
        }
      });
    } else {
      singleVideoRef.current.pause();
      setIsPlaying(false);
    }
  }, [youtubeVideoId, isPlaying]);

  // Effective aspect ratio to render
  const effectiveAspectRatio = selectedRatio === 'auto' ? detectedRatio : selectedRatio;

  // BufferMonitor & Playback Tracking Handler
  const handleVideoTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const v = e.currentTarget;
    setCurrentTime(v.currentTime);
    persistentPlaybackTimeRef.current = v.currentTime;

    // Sync continuous linear playout clock anchor for this active channel
    if (context?.calibrateChannelPlayoutTime && v.currentTime > 0 && !v.paused) {
      context.calibrateChannelPlayoutTime(activeChannelId, v.currentTime, v.duration);
    }

    // BufferMonitor Real-Time Tracking
    if (v.buffered && v.buffered.length > 0) {
      let currentBufEnd = 0;
      for (let i = 0; i < v.buffered.length; i++) {
        if (v.buffered.start(i) <= v.currentTime && v.buffered.end(i) >= v.currentTime) {
          currentBufEnd = v.buffered.end(i) - v.currentTime;
          break;
        }
      }
      const levelSec = Math.round(currentBufEnd * 10) / 10;
      setBufferLevel(levelSec);
      if (levelSec > 10) setBufferHealth('optimal');
      else if (levelSec > 3) setBufferHealth('stable');
      else if (levelSec > 0.5) setBufferHealth('low');
      else setBufferHealth('stalled');
    }

    // Audio-only track detection (decoder renders audio but video is black/0-width due to HEVC/10-bit/4K hardware decode failure)
    if (v.videoWidth === 0 && !v.paused && v.currentTime > 0.8) {
      if (!isAudioOnlyTrackDetected) {
        setIsAudioOnlyTrackDetected(true);
        BroadcastLogger.logVideo(
          'AUDIO_ONLY_DETECTED',
          'Video element decoded audio, but videoWidth is 0 (hardware decode / codec incompatibility). Auto-triggering transcode fallback.',
          { currentTime: v.currentTime, activeUrl: activePlayableUrl },
          'warn'
        );
        // If it is an uploaded file or non-HLS source, immediately trigger auto-transcode optimization
        if (activePlayableUrl && (activePlayableUrl.includes('/api/stream/') || activePlayableUrl.includes('.mp4'))) {
          handleAutoOptimizeCurrentVideo();
        }
      }
    } else if (v.videoWidth > 0 && isAudioOnlyTrackDetected) {
      setIsAudioOnlyTrackDetected(false);
      BroadcastLogger.logVideo(
        'VIDEO_TRACK_RESTORED',
        `Video track restored with dimensions: ${v.videoWidth}x${v.videoHeight}.`,
        { width: v.videoWidth, height: v.videoHeight },
        'success'
      );
    }
  };

  // Automated Playback Error Recovery Handler (with HTML5 ⇄ MSE failover and auto-transcode)
  const handleVideoError = useCallback(
    (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
      const v = e.currentTarget;
      const errCode = v.error?.code;
      const errMsg = v.error?.message || 'Media decode or network failure';

      BroadcastLogger.logVideo(
        'PLAYBACK_ERROR',
        `HTML5 Video error: code=${errCode} (${errMsg}). Stream URL: ${activePlayableUrl}`,
        { code: errCode, message: errMsg, activeUrl: activePlayableUrl },
        'warn'
      );

      // Case 1: Direct Google Drive blob stream failed (e.g. HTML response, virus scan warning, or codec unsupported)
      if (directDriveBlobUrl) {
        BroadcastLogger.logRecovery(
          'DRIVE_IFRAME_FAILOVER',
          'Direct Google Drive blob stream decode error (code 4). Automatically falling back to Google Drive embed player.'
        );
        try {
          URL.revokeObjectURL(directDriveBlobUrl);
        } catch {}
        setDirectDriveBlobUrl(null);
        setPlaybackError(null);
        return;
      }

      // Case 2: Blob URL format error (e.g. MKV/AVI/unsupported container/revoked blob)
      if (activePlayableUrl?.startsWith('blob:')) {
        BroadcastLogger.logRecovery(
          'BLOB_FORMAT_FAILOVER',
          'Stream blob encountered format error (code 4). Auto-recovering to broadcast master feed.',
          { failedUrl: activePlayableUrl }
        );

        if (viewingMode === 'linear') {
          playout?.recoverStream?.();
          setPlaybackError(null);
          if (singleVideoRef.current) {
            singleVideoRef.current.src = SAMPLE_STREAMS.SPORTS_LIVE;
            singleVideoRef.current.load();
            singleVideoRef.current.play().catch(() => {});
          }
          return;
        } else {
          if (singleVideoRef.current) {
            singleVideoRef.current.src = SAMPLE_STREAMS.UNIVERSAL_FALLBACK_MP4;
            singleVideoRef.current.load();
            singleVideoRef.current.play().catch(() => {});
          }
          setPlaybackError(null);
          return;
        }
      }

      // Case 2b: Standard HTML5 video decoding error (code 3 or 4) on MP4/WebM - Auto-switch to MSE pipeline
      if (playbackEngine === 'html5' && codecSupport.mse && !activePlayableUrl?.includes('.m3u8')) {
        BroadcastLogger.logRecovery(
          'MSE_AUTO_FAILOVER',
          'Standard HTML5 decode error (code 3/4). Auto-switching to MSE (Media Source Extensions) pipeline...'
        );
        handleRetryPlayback('mse');
        return;
      }

      // Case 2c: If MSE also fails or codec decode error on uploaded MP4/video - auto-optimize to universal 8-bit H.264
      if ((errCode === 3 || errCode === 4) && activePlayableUrl && (activePlayableUrl.includes('/api/stream/') || activePlayableUrl.includes('.mp4'))) {
        BroadcastLogger.logRecovery(
          'AUTO_TRANSCODE_FAILOVER',
          'Hardware decoding failed (Code 3/4). Automatically dispatching universal H.264 transcoding optimizer...'
        );
        setPlaybackError('Incompatible video codec detected. Auto-optimizing video to universal H.264...');
        handleAutoOptimizeCurrentVideo();
        return;
      }

      // Case 3: Other Stream Failures - Engage automated recovery
      if (viewingMode === 'vod') {
        setPlaybackError(`Audio or codec notice (${errMsg}). Trying muted playback...`);
        if (singleVideoRef.current) {
          singleVideoRef.current.muted = true;
          setIsMuted(true);
          singleVideoRef.current.play().then(() => {
            setPlaybackError(null);
          }).catch(() => {
            setPlaybackError(`Video ready: click play to start playback`);
          });
        }
        return;
      }

      setPlaybackError(`Stream playback notice (${errMsg}). Auto-recovering stream pipeline...`);
      setTimeout(() => {
        if (singleVideoRef.current) {
          const fallbackUrl = SAMPLE_STREAMS.SPORTS_LIVE;
          singleVideoRef.current.src = fallbackUrl;
          singleVideoRef.current.load();
          singleVideoRef.current.play().catch(() => {});
        }
        setPlaybackError(null);
      }, 2500);
    },
    [
      activePlayableUrl,
      directDriveBlobUrl,
      viewingMode,
      playout,
      playbackEngine,
      codecSupport,
      handleRetryPlayback,
      handleAutoOptimizeCurrentVideo,
    ]
  );

  // -----------------------------------------------------------------
  // 1. Single View Universal Media Engine (HLS, HTML5 MP4/WebM, Live Studio)
  // -----------------------------------------------------------------
  useEffect(() => {
    if (isMultiView) return;

    const video = singleVideoRef.current;
    if (!video) return;

    setPlaybackError(null);

    // Case A: In-Browser Live Studio or Live Screen Share Transmission is Active
    const directLiveStream = (isScreenSharing && screenShareStream) || (isLiveStudioBroadcasting && liveStudioStream) || null;
    if (directLiveStream) {
      video.srcObject = directLiveStream;
      video.muted = isMuted;
      video.play().catch(() => setIsPlaying(false));
      return () => {
        video.srcObject = null;
      };
    }

    // Clear any previous MediaStream
    if (video.srcObject) {
      video.srcObject = null;
    }

    // Case B: YouTube or Google Drive Embed - handled by iframe in JSX
    if (youtubeVideoId || (googleDriveFileId && !directDriveBlobUrl)) {
      return;
    }

    if (!activePlayableUrl) return;

    const isHls = activePlayableUrl.includes('.m3u8');

    // ZERO-FLICKER GUARD:
    // If we are already playing the identical playable URL and the media pipeline (Hls instance or HTML5 video.src)
    // is already active and healthy, do NOT reload, destroy, or call video.load().
    if (
      lastLoadedUrlRef.current === activePlayableUrl &&
      ((isHls && singleHlsRef.current) || (!isHls && video.src && (video.src === activePlayableUrl || video.src.includes(activePlayableUrl)))) &&
      !video.error
    ) {
      return;
    }

    if (lastLoadedUrlRef.current !== activePlayableUrl) {
      // Look up continuous linear broadcast playout time for this channel so it never resets to 0:00
      const continuousPlayoutTime = context?.getChannelPlayoutTime?.(activeChannelId, duration) ?? 0;
      persistentPlaybackTimeRef.current = continuousPlayoutTime;
      lastLoadedUrlRef.current = activePlayableUrl;
    }

    let hls: Hls | null = null;

    if (isHls && Hls.isSupported()) {
      // 4K / 2160p High-Resolution Pre-detection from URL or stream parameters
      const isLikely4K =
        activePlayableUrl.toLowerCase().includes('4k') ||
        activePlayableUrl.toLowerCase().includes('2160p') ||
        activePlayableUrl.toLowerCase().includes('uhd') ||
        activePlayableUrl.toLowerCase().includes('test_001');

      // Custom Buffer Configuration:
      // For high-bitrate 4K content:
      //   - maxBufferLength: 60s (vs 30s) prevents decode starvation during heavy GOP bitrates
      //   - maxMaxBufferLength: 120s (vs 60s) allows deep segment lookahead without thrashing
      //   - maxBufferSize: 200MB (vs 60MB) prevents premature buffer capping on high-bitrate segments
      //   - backBufferLength: 90s provides smooth scrubbing across 4K keyframes
      const initialMaxBufferLength = isLikely4K ? 60 : 30;
      const initialMaxMaxBufferLength = isLikely4K ? 120 : 60;
      const initialMaxBufferSize = isLikely4K ? 200 * 1024 * 1024 : 60 * 1000 * 1000;
      const initialBackBufferLength = isLikely4K ? 90 : 60;

      hls = new Hls({
        liveSyncDurationCount: 3,
        liveMaxLatencyDurationCount: 5,
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: initialBackBufferLength,
        maxBufferLength: initialMaxBufferLength,
        maxMaxBufferLength: initialMaxMaxBufferLength,
        maxBufferSize: initialMaxBufferSize,
        maxBufferHole: 0.5,
        highBufferWatchdogPeriod: 2,
        xhrSetup: (xhr) => {
          xhr.withCredentials = false;
        },
      });

      singleHlsRef.current = hls;

      BroadcastLogger.logHls(
        'ATTACH_MEDIA',
        `Attaching Hls.js engine to video element. Stream: ${activePlayableUrl} (Init Profile: maxBufferLength=${initialMaxBufferLength}s, maxMaxBufferLength=${initialMaxMaxBufferLength}s)`,
        { url: activePlayableUrl, isLikely4K, maxBufferLength: initialMaxBufferLength, maxMaxBufferLength: initialMaxMaxBufferLength }
      );
      hls.loadSource(activePlayableUrl);
      hls.attachMedia(video);

      // 1. MANIFEST_PARSED: Extract Bitrate Ladder & Detect 4K / 2160p Resolution Variants
      hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
        const levels: HlsLevelInfo[] = (data.levels || []).map((lvl: any, idx: number) => ({
          index: idx,
          bitrateKbps: Math.round(lvl.bitrate / 1000),
          width: lvl.width || 0,
          height: lvl.height || 0,
          name: lvl.name || (lvl.height ? `${lvl.height}p` : `Level ${idx + 1}`),
          codecs: lvl.videoCodec || lvl.codecs,
        }));

        // Detect if stream contains 4K variants (width >= 3840, height >= 2160, bitrate >= 15,000 kbps, or label '4k'/'2160p')
        const has4KVariant = levels.some((lvl) => {
          const is4KDimensions = (lvl.width && lvl.width >= 3840) || (lvl.height && lvl.height >= 2160);
          const is4KBitrate = lvl.bitrateKbps >= 15000;
          const is4KLabel = Boolean(lvl.name && (lvl.name.toLowerCase().includes('4k') || lvl.name.toLowerCase().includes('2160p')));
          return Boolean(is4KDimensions || is4KBitrate || is4KLabel);
        });

        const isHighRes4K = has4KVariant || isLikely4K;
        setIs4KStreamDetected(isHighRes4K);

        // Dynamically reconfigure Hls.js buffer parameters for smooth 4K decoding
        if (isHighRes4K && hls) {
          hls.config.maxBufferLength = 60;
          hls.config.maxMaxBufferLength = 120;
          hls.config.maxBufferSize = 200 * 1024 * 1024;
          hls.config.backBufferLength = 90;
          setHlsBufferConfig({ maxBufferLength: 60, maxMaxBufferLength: 120, maxBufferSizeMB: 200 });

          BroadcastLogger.logHls(
            '4K_STREAM_DETECTED',
            `High-resolution 4K/2160p stream detected. Configured custom Hls.js buffer parameters (maxBufferLength: 60s, maxMaxBufferLength: 120s, maxBufferSize: 200MB) for smooth high-bitrate decoding.`,
            {
              is4KStream: true,
              maxBufferLength: 60,
              maxMaxBufferLength: 120,
              maxBufferSizeMB: 200,
              levels: levels.map((l) => `${l.name} (${l.width}x${l.height} @ ${l.bitrateKbps}kbps)`),
            },
            'success'
          );
        } else {
          setHlsBufferConfig({ maxBufferLength: 30, maxMaxBufferLength: 60, maxBufferSizeMB: 60 });
        }

        const currentLvl = hls?.levels[hls?.currentLevel ?? 0];
        const currentBitrate = currentLvl ? Math.round(currentLvl.bitrate / 1000) : (levels[0]?.bitrateKbps || 2400);
        const currentRes = currentLvl && currentLvl.width ? `${currentLvl.width}x${currentLvl.height}` : (levels[0] ? `${levels[0].width}x${levels[0].height}` : '1080p');

        BroadcastLogger.logHls(
          'MANIFEST_PARSED',
          `HLS manifest parsed with ${levels.length} quality levels (${currentRes} @ ${currentBitrate} kbps).${isHighRes4K ? ' [4K UHD Profile Engaged]' : ''}`,
          { levels: levels.map((l) => l.name), totalLevels: levels.length, currentBitrate, currentRes, is4K: isHighRes4K },
          'success'
        );

        context?.reportHlsDiagnostics?.({
          isHlsActive: true,
          streamUrl: activePlayableUrl,
          totalLevels: levels.length,
          availableLevels: levels,
          currentLevelIndex: hls?.currentLevel ?? 0,
          currentBitrateKbps: currentBitrate,
          currentResolution: currentRes,
          isLive: hls?.levels[hls?.currentLevel ?? 0]?.details?.live ?? true,
          is4KDetected: isHighRes4K,
          maxBufferLengthConfig: hls?.config.maxBufferLength || (isHighRes4K ? 60 : 30),
          maxMaxBufferLengthConfig: hls?.config.maxMaxBufferLength || (isHighRes4K ? 120 : 60),
          maxBufferSizeMBConfig: Math.round((hls?.config.maxBufferSize || 60000000) / (1024 * 1024)),
        });
      });

      hls.on(Hls.Events.MANIFEST_LOADED, () => {
        BroadcastLogger.logHls('MANIFEST_LOADED', 'HLS manifest downloaded successfully.');
        // Synchronize continuous linear broadcast playout position
        const targetTime = context?.getChannelPlayoutTime?.(activeChannelId, video.duration) ?? persistentPlaybackTimeRef.current;
        if (
          targetTime > 0.5 &&
          video.duration &&
          !isNaN(video.duration) &&
          targetTime < video.duration - 1
        ) {
          try {
            video.currentTime = targetTime;
            persistentPlaybackTimeRef.current = targetTime;
            BroadcastLogger.logVideo('RESTORE_TIME', `Synchronized continuous channel playback position to ${targetTime.toFixed(1)}s.`);
          } catch {}
        }
        if (autoPlay) {
          video.play().catch(() => {
            // Autoplay policy fallback: mute and retry
            video.muted = true;
            setIsMuted(true);
            video.play().catch(() => setIsPlaying(false));
          });
        }
      });

      // 2. LEVEL_SWITCHED: Track Real-Time ABR Ladder Bitrate Switches & Dynamically Tune 4K Buffers
      hls.on(Hls.Events.LEVEL_SWITCHED, (_event, data) => {
        if (hls && hls.levels[data.level]) {
          const lvl = hls.levels[data.level];
          const kbps = Math.round(lvl.bitrate / 1000);
          const res = lvl.width && lvl.height ? `${lvl.width}x${lvl.height}` : `${lvl.height || 720}p`;
          onBitrateChange?.(kbps);
          playout?.reportBitrateChange?.(kbps);

          // Detect if active level is 4K / 2160p
          const isCurrentLevel4K = Boolean(
            (lvl.width && lvl.width >= 3840) ||
            (lvl.height && lvl.height >= 2160) ||
            kbps >= 15000 ||
            (lvl.name && (lvl.name.toLowerCase().includes('4k') || lvl.name.toLowerCase().includes('2160p')))
          );

          setIs4KLevelActive(isCurrentLevel4K);

          // Dynamically adjust maxBufferLength and maxMaxBufferLength for active 4K stream
          if (isCurrentLevel4K) {
            hls.config.maxBufferLength = 60;
            hls.config.maxMaxBufferLength = 120;
            hls.config.maxBufferSize = 200 * 1024 * 1024;
            setHlsBufferConfig({ maxBufferLength: 60, maxMaxBufferLength: 120, maxBufferSizeMB: 200 });

            BroadcastLogger.logHls(
              '4K_LEVEL_ACTIVE',
              `Switched to 4K UHD level (${res} @ ${kbps} kbps). Tuned Hls.js buffer: maxBufferLength=60s, maxMaxBufferLength=120s, maxBufferSize=200MB for smooth decoding.`,
              { level: data.level, resolution: res, bitrateKbps: kbps, maxBufferLength: 60, maxMaxBufferLength: 120 },
              'info'
            );
          } else if (!isLikely4K) {
            hls.config.maxBufferLength = 30;
            hls.config.maxMaxBufferLength = 60;
            hls.config.maxBufferSize = 60 * 1000 * 1000;
            setHlsBufferConfig({ maxBufferLength: 30, maxMaxBufferLength: 60, maxBufferSizeMB: 60 });
          }

          BroadcastLogger.logHls(
            'LEVEL_SWITCHED',
            `ABR switched to level ${data.level}: ${res} @ ${kbps} kbps.${isCurrentLevel4K ? ' [4K UHD Level]' : ''}`,
            { level: data.level, bitrateKbps: kbps, resolution: res, is4K: isCurrentLevel4K }
          );

          context?.reportHlsDiagnostics?.({
            currentLevelIndex: data.level,
            currentBitrateKbps: kbps,
            currentResolution: res,
            is4KDetected: isCurrentLevel4K || isLikely4K,
            maxBufferLengthConfig: hls.config.maxBufferLength,
            maxMaxBufferLengthConfig: hls.config.maxMaxBufferLength,
            maxBufferSizeMBConfig: Math.round(hls.config.maxBufferSize / (1024 * 1024)),
          });
        }
      });

      // 3. FRAG_LOADING & FRAG_LOADED: Real-time Fragment Download Latency & Bandwidth
      hls.on(Hls.Events.FRAG_LOADING, (_event, data: any) => {
        const urlKey = data.frag.relurl || data.frag.url || `frag-${data.frag.sn}`;
        fragLoadingTimesRef.current.set(urlKey, performance.now());
      });

      hls.on(Hls.Events.FRAG_LOADED, (_event, data: any) => {
        const urlKey = data.frag.relurl || data.frag.url || `frag-${data.frag.sn}`;
        const startTime = fragLoadingTimesRef.current.get(urlKey) || (performance.now() - 85);
        fragLoadingTimesRef.current.delete(urlKey);

        const latency = Math.max(1, Math.round(performance.now() - startTime));
        const byteSize = data.stats?.total || data.payload?.byteLength || 650000;
        const durationSec = Math.round((data.frag.duration || 2) * 10) / 10;
        const bandwidthMbps = latency > 0 ? Math.round((byteSize * 8) / (latency * 1000) * 10) / 10 : 0;
        const lvl = hls?.levels[data.frag.level];
        const bitrateKbps = lvl ? Math.round(lvl.bitrate / 1000) : 0;
        const resolution = lvl && lvl.width ? `${lvl.width}x${lvl.height}` : undefined;

        const fragMetric: HlsFragmentMetric = {
          id: `frag-${data.frag.sn}-${Date.now()}`,
          sn: data.frag.sn,
          url: urlKey,
          latencyMs: latency,
          durationSec,
          byteSize,
          bandwidthMbps,
          timestamp: Date.now(),
          levelIndex: data.frag.level,
          bitrateKbps,
          resolution,
          status: 'ok',
        };

        BroadcastLogger.logHls(
          'FRAG_LOADED',
          `Fragment #${data.frag.sn} downloaded in ${latency}ms (${bandwidthMbps} Mbps, ${durationSec}s).`,
          { sn: data.frag.sn, latencyMs: latency, bandwidthMbps, byteSize, durationSec, bitrateKbps }
        );

        context?.recordHlsFragment?.(fragMetric);
      });

      // 4. BUFFER_APPENDED: Real-Time Buffer Health Monitoring
      hls.on(Hls.Events.BUFFER_APPENDED, () => {
        if (video && video.buffered && video.buffered.length > 0) {
          let currentBuf = 0;
          for (let i = 0; i < video.buffered.length; i++) {
            if (video.buffered.start(i) <= video.currentTime && video.buffered.end(i) >= video.currentTime) {
              currentBuf = video.buffered.end(i) - video.currentTime;
              break;
            }
          }
          const bufSec = Math.round(currentBuf * 10) / 10;
          const health: 'optimal' | 'healthy' | 'low' | 'starvation' =
            bufSec > 15 ? 'optimal' : bufSec > 5 ? 'healthy' : bufSec > 2 ? 'low' : 'starvation';

          setBufferLevel(bufSec);
          setBufferHealth(health === 'starvation' ? 'stalled' : health === 'low' ? 'low' : health === 'healthy' ? 'stable' : 'optimal');

          BroadcastLogger.logHls(
            'BUFFER_APPENDED',
            `Buffer updated: ${bufSec}s depth (${health}).`,
            { bufferSeconds: bufSec, health }
          );

          context?.reportHlsDiagnostics?.({
            bufferLengthSeconds: bufSec,
            bufferHealth: health,
          });
        }
      });

      // 5. ERROR Recovery & Buffer Stall Telemetry
      hls.on(Hls.Events.ERROR, (_event, data) => {
        BroadcastLogger.logHls(
          'HLS_ERROR',
          `Hls.js Error encountered: ${data.details || data.type} (fatal: ${!!data.fatal})`,
          { type: data.type, details: data.details, fatal: data.fatal, url: activePlayableUrl },
          data.fatal ? 'error' : 'warn'
        );

        if (data.details === Hls.ErrorDetails.BUFFER_STALLED_ERROR) {
          context?.reportHlsDiagnostics?.({
            bufferHealth: 'starvation',
            bufferStallCount: (context?.hlsDiagnostics?.bufferStallCount || 0) + 1,
          });
        }

        if (data.fatal) {
          setRecoveryCount((prev) => prev + 1);
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              if (
                data.details === 'manifestLoadError' ||
                data.details === 'manifestLoadTimeOut' ||
                data.details === 'manifestParsingError'
              ) {
                console.warn('BufferMonitor: HLS Manifest Network Error - failing over to backup feed...', data);
                BroadcastLogger.logRecovery(
                  'MANIFEST_FAILOVER',
                  `Manifest failed to load (${data.details}). Failing over to reliable backup stream.`,
                  { failedUrl: activePlayableUrl, fallbackUrl: SAMPLE_STREAMS.SPORTS_LIVE },
                  'warn'
                );
                hls?.destroy();
                singleHlsRef.current = null;
                setTimeout(() => {
                  if (singleVideoRef.current && Hls.isSupported()) {
                    const backupHls = new Hls({
                      enableWorker: true,
                      lowLatencyMode: true,
                      maxBufferLength: 30,
                      maxMaxBufferLength: 60,
                    });
                    singleHlsRef.current = backupHls;
                    backupHls.loadSource(SAMPLE_STREAMS.SPORTS_LIVE);
                    backupHls.attachMedia(singleVideoRef.current);
                    backupHls.on(Hls.Events.MANIFEST_LOADED, () => {
                      singleVideoRef.current?.play().catch(() => {});
                    });
                  } else if (singleVideoRef.current) {
                    singleVideoRef.current.src = SAMPLE_STREAMS.UNIVERSAL_FALLBACK_MP4;
                    singleVideoRef.current.load();
                    singleVideoRef.current.play().catch(() => {});
                  }
                }, 500);
              } else {
                console.warn('BufferMonitor: HLS Network Error - restarting load...', data);
                BroadcastLogger.logRecovery('RESTART_LOAD', 'Attempting network error recovery: hls.startLoad().');
                hls?.startLoad();
              }
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.warn('BufferMonitor: HLS Media Error - recovering media error...', data);
              BroadcastLogger.logRecovery('RECOVER_MEDIA', 'Attempting media error recovery: hls.recoverMediaError().');
              hls?.recoverMediaError();
              break;
            default:
              console.warn('BufferMonitor: HLS Fatal unrecoverable error - auto-rebuilding stream pipeline...', data);
              BroadcastLogger.logRecovery('FATAL_FALLBACK', 'Fatal unrecoverable HLS error. Rebuilding standard HTML5 video pipeline...', data, 'error');
              setPlaybackError('Stream network error. Attempting auto-recovery...');
              hls?.destroy();
              singleHlsRef.current = null;
              setTimeout(() => {
                if (video && activePlayableUrl) {
                  video.src = activePlayableUrl;
                  video.load();
                  if (persistentPlaybackTimeRef.current > 1) {
                    try { video.currentTime = persistentPlaybackTimeRef.current; } catch {}
                  }
                  video.play().catch(() => {});
                }
              }, 1000);
              break;
          }
        }
      });
    } else if (isHls && video.canPlayType('application/vnd.apple.mpegurl')) {
      BroadcastLogger.logVideo('NATIVE_HLS_LOAD', `Loading native Safari HLS: ${activePlayableUrl}`, { url: activePlayableUrl });
      video.src = activePlayableUrl;
      if (autoPlay) {
        video.play().catch(() => {
          video.muted = true;
          setIsMuted(true);
          video.play().catch(() => setIsPlaying(false));
        });
      }
    } else {
      // Standard HTML5 Video (MP4, WebM, MOV, MKV, Blob, IndexedDB, Range API Stream)
      if (singleHlsRef.current) {
        try {
          singleHlsRef.current.destroy();
        } catch {}
        singleHlsRef.current = null;
      }
      BroadcastLogger.logVideo('HTML5_LOAD', `Loading direct HTML5 media stream: ${activePlayableUrl}`, { url: activePlayableUrl });
      setPlaybackError(null);
      video.src = activePlayableUrl;
      video.load();
      const targetContinuousTime = context?.getChannelPlayoutTime?.(activeChannelId, video.duration) ?? persistentPlaybackTimeRef.current;
      if (
        targetContinuousTime > 0.5 &&
        video.duration &&
        !isNaN(video.duration) &&
        targetContinuousTime < video.duration - 1
      ) {
        try {
          video.currentTime = targetContinuousTime;
          persistentPlaybackTimeRef.current = targetContinuousTime;
        } catch {}
      }
      if (autoPlay) {
        const p = video.play();
        if (p !== undefined) {
          p.then(() => setIsPlaying(true)).catch(() => {
            // Autoplay policy fallback: mute and retry
            video.muted = true;
            setIsMuted(true);
            video.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
          });
        }
      }
    }

    return () => {
      if (hls) {
        BroadcastLogger.logHls('DESTROY', 'Hls.js instance destroyed on stream change or unmount.');
        hls.destroy();
        singleHlsRef.current = null;
      }
    };
  }, [activePlayableUrl, autoPlay, isMultiView, isLiveStudioBroadcasting, liveStudioStream, isScreenSharing, screenShareStream, googleDriveFileId, directDriveBlobUrl]);

  // Non-flickering continuous linear sync monitor (syncs playout offset without reloading media element)
  useEffect(() => {
    if (viewingMode !== 'linear' || !singleVideoRef.current || isMultiView) return;
    const v = singleVideoRef.current;
    if (!v || !v.duration || isNaN(v.duration) || v.duration <= 0) return;

    const targetPlayoutTime = context?.getChannelPlayoutTime?.(activeChannelId, v.duration);
    if (typeof targetPlayoutTime === 'number' && targetPlayoutTime >= 0) {
      const diff = Math.abs(v.currentTime - targetPlayoutTime);
      // Soft-adjust currentTime only if drifted significantly (> 12s), without reloading media pipeline
      if (diff > 12 && targetPlayoutTime < v.duration - 1) {
        try {
          v.currentTime = targetPlayoutTime;
        } catch {}
      }
    }
  }, [activeChannelId, channelPlayoutRevision, viewingMode, isMultiView]);

  // Manual ABR Level switching from Diagnostic Panel
  useEffect(() => {
    if (singleHlsRef.current && context?.targetHlsManualLevel !== undefined) {
      singleHlsRef.current.currentLevel = context.targetHlsManualLevel;
    }
  }, [context?.targetHlsManualLevel]);

  // -----------------------------------------------------------------
  // 2. Multi-View 2x2 Grid HLS Instances
  // -----------------------------------------------------------------
  useEffect(() => {
    if (!isMultiView) {
      // Destroy multi-view HLS instances when exiting 2x2 grid
      Object.keys(multiHlsRefs.current).forEach((key) => {
        if (multiHlsRefs.current[key]) {
          multiHlsRefs.current[key]?.destroy();
          multiHlsRefs.current[key] = null;
        }
      });
      return;
    }

    // Initialize an HLS instance for each of the 4 camera angles
    cameraFeeds.forEach((cam) => {
      const video = multiVideoRefs.current[cam.id];
      if (!video) return;

      if (multiHlsRefs.current[cam.id]) {
        multiHlsRefs.current[cam.id]?.destroy();
        multiHlsRefs.current[cam.id] = null;
      }

      // Audio solo enforcement: only activeAudioCamId is unmuted
      const isSoloAudio = cam.id === activeAudioCamId && !isMuted;
      video.muted = !isSoloAudio;

      const isHls = cam.streamUrl.includes('.m3u8');
      if (isHls && Hls.isSupported()) {
        const hls = new Hls({
          liveSyncDurationCount: 3,
          liveMaxLatencyDurationCount: 5,
          enableWorker: true,
          lowLatencyMode: true,
        });

        multiHlsRefs.current[cam.id] = hls;
        hls.loadSource(cam.streamUrl);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_LOADED, () => {
          video.play().catch(() => {});
        });
      } else {
        video.src = cam.streamUrl;
        video.play().catch(() => {});
      }
    });

    return () => {
      Object.keys(multiHlsRefs.current).forEach((key) => {
        if (multiHlsRefs.current[key]) {
          multiHlsRefs.current[key]?.destroy();
          multiHlsRefs.current[key] = null;
        }
      });
    };
  }, [isMultiView, cameraFeeds, activeAudioCamId, isMuted]);

  // Handle Audio Solo Switch in Multi-View
  const handleSelectAudioCam = useCallback((camId: string) => {
    setActiveAudioCamId(camId);
    setIsMuted(false);

    // Apply audio state across the 4 video elements
    cameraFeeds.forEach((cam) => {
      const video = multiVideoRefs.current[cam.id];
      if (video) {
        video.muted = cam.id !== camId;
      }
    });
  }, [cameraFeeds]);

  // Toggle Mute
  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);

    if (isMultiView) {
      cameraFeeds.forEach((cam) => {
        const video = multiVideoRefs.current[cam.id];
        if (video) {
          video.muted = nextMuted || cam.id !== activeAudioCamId;
        }
      });
    } else {
      if (singleVideoRef.current) {
        singleVideoRef.current.muted = nextMuted;
      }
      if (ytIframeRef.current?.contentWindow) {
        try {
          ytIframeRef.current.contentWindow.postMessage(
            JSON.stringify({
              event: 'command',
              func: nextMuted ? 'mute' : 'unMute',
              args: [],
            }),
            '*'
          );
        } catch {}
      }
    }
  };

  // Toggle Fullscreen
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full bg-black rounded-xl overflow-hidden shadow-2xl border border-gray-800 group select-none transition-all ${
        effectiveAspectRatio === '9:16'
          ? 'aspect-[9/16] max-h-[82vh] mx-auto'
          : effectiveAspectRatio === '4:3'
          ? 'aspect-[4/3]'
          : effectiveAspectRatio === '21:9'
          ? 'aspect-[21/9]'
          : 'aspect-video'
      }`}
    >
      {/* ======================================================== */}
      {/* VIEW A: SINGLE VIEW (Standard Main Program Feed)         */}
      {/* ======================================================== */}
      {!isMultiView && (
        <div className="relative w-full h-full flex items-center justify-center overflow-hidden bg-black">
          {/* Case 0A: In-Browser Live Studio or Screen Share is Broadcasting */}
          {(isScreenSharing && screenShareStream) || (isLiveStudioBroadcasting && liveStudioStream) ? (
            <div className="relative w-full h-full bg-black flex items-center justify-center">
              <video
                ref={(el) => {
                  if (el) {
                    singleVideoRef.current = el;
                    const directStream = screenShareStream || liveStudioStream;
                    if (directStream && el.srcObject !== directStream) {
                      el.srcObject = directStream;
                      el.muted = isMuted;
                      el.play().catch(() => {});
                    }
                  }
                }}
                className="w-full h-full object-contain bg-black"
                playsInline
                autoPlay
                muted={isMuted}
              />
              <div className="absolute top-3 left-3 z-30 flex items-center gap-2 bg-slate-900/90 border border-slate-700/80 text-white px-3 py-1.5 rounded-lg shadow-xl backdrop-blur-md text-xs font-mono">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                <span className="font-bold text-red-400">
                  {isScreenSharing ? '🖥️ LIVE SCREEN SHARE ON AIR' : '🔴 LIVE STUDIO BROADCAST ON AIR'}
                </span>
                {isScreenSharing && stopScreenShare && (
                  <button
                    type="button"
                    onClick={() => stopScreenShare()}
                    className="ml-2 px-2.5 py-0.5 bg-red-600 hover:bg-red-500 text-white text-[10px] font-sans font-bold rounded transition-colors shadow"
                  >
                    Stop Share
                  </button>
                )}
              </div>
            </div>
          ) : youtubeVideoId ? (
            /* Case 0B: Universal Direct YouTube Video Ingest Embed Player (Auto-Playing Resilient IFrame) */
            <div className="relative w-full h-full bg-black flex items-center justify-center">
              {/* Direct Resilient YouTube Embed (youtube-nocookie with autoplay, mute, and inline JS API) */}
              <iframe
                key={`yt-broadcast-${youtubeVideoId}-${activeChannelId}`}
                src={`https://www.youtube-nocookie.com/embed/${youtubeVideoId}?autoplay=1&mute=${isMuted ? 1 : 0}&playsinline=1&enablejsapi=1&rel=0&start=${initialYouTubeStartTime}`}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                title="Broadcast YouTube Ingest Monitor"
              />

              {/* YouTube Ingest Status & Quick Failover Bar */}
              <div className="absolute top-2 left-2 right-2 z-20 flex items-center justify-between p-2 bg-slate-950/85 border border-slate-800/80 rounded-lg backdrop-blur-md text-xs text-white">
                <div className="flex items-center gap-2 truncate">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
                  <span className="text-[11px] font-mono text-slate-300 truncate">
                    YouTube Ingest Feed · ID: {youtubeVideoId}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setTestFeedOverride(SAMPLE_STREAMS.SPORTS_LIVE);
                      BroadcastLogger.logRecovery(
                        'FALLBACK_ENGAGED',
                        'Switched to master live sports HLS backup feed.'
                      );
                    }}
                    className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[10px] rounded transition-colors flex items-center gap-1 shadow"
                    title="Switch to backup broadcast feed if YouTube owner restricts embedding"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Switch to Backup Feed</span>
                  </button>
                  <a
                    href={`https://www.youtube.com/watch?v=${youtubeVideoId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] rounded border border-slate-700 transition-colors flex items-center gap-1"
                  >
                    <span>Watch on YouTube</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {/* Recovery Dialog when YouTube restricts embedding (Error 150/101 "Watch on YouTube") */}
              {youtubeEmbedBlocked && (
                <div className="absolute inset-0 z-30 bg-black/92 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-fadeIn">
                  <div className="w-14 h-14 rounded-full bg-red-950/90 border-2 border-red-500/80 flex items-center justify-center mb-3 shadow-xl">
                    <ShieldAlert className="w-7 h-7 text-red-400" />
                  </div>
                  <h3 className="text-base font-bold text-white mb-1">
                    Content Owner Disabled Embedding (YouTube Error 150/101)
                  </h3>
                  <p className="text-xs text-slate-300 max-w-md mb-4 leading-relaxed">
                    The video owner disabled playback in third-party embedded players. To keep your broadcast line uninterrupted, switch to the verified live broadcast feed or watch directly on YouTube.
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setYoutubeEmbedBlocked(false);
                        setTestFeedOverride(SAMPLE_STREAMS.SPORTS_LIVE);
                      }}
                      className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-lg shadow-lg flex items-center gap-1.5 transition-all transform hover:scale-105"
                    >
                      <Play className="w-3.5 h-3.5 fill-white" />
                      <span>Engage Broadcast Backup Master (60fps HLS)</span>
                    </button>
                    <a
                      href={`https://www.youtube.com/watch?v=${youtubeVideoId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-lg border border-slate-600 flex items-center gap-1.5 transition-all"
                    >
                      <span>Watch Directly on YouTube</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <button
                      type="button"
                      onClick={() => setYoutubeEmbedBlocked(false)}
                      className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white text-xs rounded-lg transition-all"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : googleDriveFileId && !directDriveBlobUrl ? (
            <div className="relative w-full h-full">
              <iframe
                src={`https://drive.google.com/file/d/${googleDriveFileId}/preview`}
                className="w-full h-full border-0"
                allow="autoplay; encrypted-media; fullscreen"
                allowFullScreen
                title="Google Drive Video Feed"
              />
              {!context?.googleAccessToken && (
                <div className="absolute top-3 right-3 z-20">
                  <button
                    onClick={() => context?.signIn?.()}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg shadow-xl flex items-center gap-1.5 transition-all"
                  >
                    <span>Connect Google Drive for Direct 4K Stream</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Case 2: Unified Master Broadcast Video Element — Permanent in DOM across all ratios and settings */
            <div className="relative w-full h-full flex items-center justify-center overflow-hidden bg-slate-950">
              {/* Squeeze-Back L-Bar Frame (Revealed when l_bar ad is active while broadcast plays uninterrupted) */}
              {nonLinearAd?.isActive && nonLinearAd.type === 'l_bar' && (
                <div className="absolute inset-0 pointer-events-auto z-10 flex flex-col justify-between animate-fadeIn">
                  {/* Left Vertical Frame (Width ~20%) */}
                  <div className="w-[20%] h-full bg-gradient-to-b from-blue-950/95 via-indigo-950/90 to-slate-950/95 border-r border-blue-500/40 p-3.5 flex flex-col justify-between shadow-2xl">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black font-mono px-2 py-0.5 rounded bg-blue-600 text-white uppercase tracking-wider">
                          SPONSOR L-BAR
                        </span>
                        <button
                          type="button"
                          onClick={() => dismissNonLinearAd?.()}
                          className="p-1 text-slate-400 hover:text-white rounded hover:bg-white/10"
                          title="Dismiss sponsor frame"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-white leading-tight mt-1">{nonLinearAd.title}</h4>
                        <p className="text-[10px] text-blue-300 font-semibold mt-0.5">{nonLinearAd.advertiser}</p>
                        <p className="text-[10px] text-slate-300 leading-snug mt-2 line-clamp-3">{nonLinearAd.tagline}</p>
                      </div>
                      {nonLinearAd.promoCode && (
                        <div className="bg-slate-900/90 border border-blue-500/50 rounded-lg p-2 text-center">
                          <span className="text-[9px] uppercase tracking-wider text-slate-400 font-mono block">Promo Code</span>
                          <span className="font-mono text-xs font-black text-amber-300 tracking-widest">{nonLinearAd.promoCode}</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <a
                        href={nonLinearAd.callToActionUrl || 'https://cloud.google.com/ai'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 shadow-lg transition-transform hover:scale-[1.02]"
                      >
                        <span>{nonLinearAd.callToActionText || 'Learn More'}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                      <div className="text-[9px] text-slate-400 text-center font-mono">
                        Ends in: <strong className="text-white">{nonLinearAd.timeRemainingSeconds}s</strong>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Horizontal Frame (Height ~16%) */}
                  <div className="w-full h-[16%] bg-slate-900/95 border-t border-blue-500/40 px-4 py-2 flex items-center justify-between text-xs text-slate-200">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      <span className="font-mono font-bold text-white text-[11px] uppercase tracking-wider">
                        BROADCAST UNINTERRUPTED · LIVE NETWORK PLAYOUT
                      </span>
                      <span className="text-slate-400 text-[11px] hidden md:inline">
                        — {nonLinearAd.advertiser} Official Broadcast Partner
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-32 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 transition-all duration-1000 ease-linear"
                          style={{ width: `${(nonLinearAd.timeRemainingSeconds / (nonLinearAd.durationSeconds || 15)) * 100}%` }}
                        />
                      </div>
                      <span className="font-mono text-[10px] text-blue-300 font-bold">{nonLinearAd.timeRemainingSeconds}s</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Main Program Video Container (Squeezed smoothly to top-right if l_bar is active) */}
              <div
                className={`w-full h-full flex items-center justify-center transition-all duration-700 ease-out ${
                  nonLinearAd?.isActive && nonLinearAd.type === 'l_bar'
                    ? 'origin-top-right scale-[0.80] translate-x-[9%] -translate-y-[8%] shadow-2xl rounded-xl overflow-hidden ring-2 ring-blue-500/50'
                    : 'scale-100 translate-x-0 translate-y-0'
                }`}
              >
                {/* Optional Blurred Ambient Backdrop for 9:16 vertical mode without unmounting primary video */}
                {effectiveAspectRatio === '9:16' && streamUrl && !streamUrl.startsWith('blob:') && !streamUrl.includes('.m3u8') && (
                  <video
                    src={streamUrl}
                    className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-40 scale-125 pointer-events-none"
                    muted
                    playsInline
                    onError={() => {}}
                  />
                )}
                {/* Permanent Main Program Video Element */}
                <video
                  ref={singleVideoRef}
                  className={`${
                    effectiveAspectRatio === '9:16'
                      ? `relative max-h-full max-w-full z-10 ${fitMode === 'cover' ? 'w-full h-full object-cover' : 'object-contain'}`
                      : `w-full h-full ${fitMode === 'cover' ? 'object-cover' : 'object-contain'}`
                  }`}
                  playsInline
                  preload="auto"
                  crossOrigin="anonymous"
                  muted={isMuted}
                  onPlay={() => {
                    setIsPlaying(true);
                    setIsBufferStalled(false);
                  }}
                  onPause={() => setIsPlaying(false)}
                  onTimeUpdate={handleVideoTimeUpdate}
                  onLoadedMetadata={(e) => {
                    const v = e.target as HTMLVideoElement;
                    const w = v.videoWidth;
                    const h = v.videoHeight;
                    setDuration(v.duration || 0);

                    // Seek to continuous channel playout offset immediately upon metadata decode
                    const continuousTime = context?.getChannelPlayoutTime?.(activeChannelId, v.duration) ?? persistentPlaybackTimeRef.current;
                    if (continuousTime > 0.5 && v.duration && !isNaN(v.duration) && continuousTime < v.duration - 1) {
                      try {
                        v.currentTime = continuousTime;
                        persistentPlaybackTimeRef.current = continuousTime;
                      } catch {}
                    }

                    if (w === 0 || h === 0) {
                      BroadcastLogger.logVideo(
                        'METADATA_LOADED_WARNING',
                        'Video metadata loaded with 0x0 dimensions (no decodable video frame / audio-only stream).',
                        { width: w, height: h, duration: v.duration, readyState: v.readyState, activeUrl: activePlayableUrl },
                        'warn'
                      );
                    } else {
                      BroadcastLogger.logVideo(
                        'METADATA_LOADED',
                        `Video decoded: ${w}x${h}, duration: ${v.duration ? Math.round(v.duration) + 's' : 'live'}.`,
                        { resolution: `${w}x${h}`, width: w, height: h, duration: v.duration },
                        'success'
                      );
                    }

                    if (v.videoHeight > v.videoWidth) {
                      setDetectedRatio('9:16');
                    } else if (Math.abs(v.videoWidth / v.videoHeight - 4 / 3) < 0.1) {
                      setDetectedRatio('4:3');
                    } else if (v.videoWidth / v.videoHeight > 2.0) {
                      setDetectedRatio('21:9');
                    } else {
                      setDetectedRatio('16:9');
                    }
                  }}
                  onError={handleVideoError}
                  onWaiting={() => {
                    setIsBufferStalled(true);
                    setBufferHealth('stalled');
                    playout?.reportBufferStall?.(true);
                    BroadcastLogger.logVideo('BUFFER_STALLED', 'Video element waiting on stream data.', {}, 'warn');
                  }}
                  onPlaying={() => {
                    setIsBufferStalled(false);
                    playout?.reportBufferStall?.(false);
                    BroadcastLogger.logVideo('PLAYBACK_RESUMED', 'Video element playback resumed.', {}, 'info');
                  }}
                  onEnded={() => {
                    // Auto-loop and replay video seamlessly; update continuous timeline anchor
                    BroadcastLogger.logVideo('PLAYBACK_ENDED_LOOP', 'Video completed. Auto-looping and replaying on-air stream.', { url: activePlayableUrl });
                    if (singleVideoRef.current) {
                      singleVideoRef.current.currentTime = 0;
                      singleVideoRef.current.play().catch(() => {});
                    }
                    if (context?.calibrateChannelPlayoutTime) {
                      context.calibrateChannelPlayoutTime(activeChannelId, 0, duration);
                    }
                  }}
                />
              </div>
            </div>
          )}

          {/* Robust Codec Diagnostic & Playback Fallback Layer */}
          {(isAudioOnlyTrackDetected || playbackError || showCodecDiagnostics) && (
            <div className="absolute top-14 left-3 right-3 sm:left-4 sm:right-auto z-30 bg-slate-950/95 border border-amber-500/80 text-white rounded-2xl p-4 shadow-2xl backdrop-blur-md max-w-md animate-fadeIn">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="text-xs font-bold text-amber-300">
                    Codec Diagnostics &amp; Engine Fallback
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
                    {playbackEngine.toUpperCase()} ENGINE
                  </span>
                  {showCodecDiagnostics && (
                    <button
                      type="button"
                      onClick={() => setShowCodecDiagnostics(false)}
                      className="p-1 text-slate-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Status Explanation */}
              <div className="space-y-1 mb-3">
                {isAudioOnlyTrackDetected ? (
                  <p className="text-[11px] text-amber-100 flex items-start gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <span>
                      <strong>Audio-Only Track Decoded:</strong> The browser plays sound but lacks hardware decoding for this video codec (e.g. HEVC/H.265 or 10-bit H.264).
                    </span>
                  </p>
                ) : playbackError ? (
                  <p className="text-[11px] text-red-200 flex items-start gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                    <span>{playbackError}</span>
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-300">
                    Hardware acceleration and media decoding diagnostics for active broadcast feed.
                  </p>
                )}
              </div>

              {/* Hardware Acceleration Warning if GPU decoding is absent */}
              {mediaReport && !mediaReport.hasHardwareAcceleration && (
                <div className="p-2.5 mb-3 bg-amber-950/60 border border-amber-500/60 rounded-xl text-amber-200 text-[11px] flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-amber-300 block">
                      Hardware Acceleration Disabled (CPU Fallback)
                    </span>
                    <span className="text-[10px] text-amber-200/90 leading-tight">
                      Browser lacks GPU decoding for 1080p60/4K streams (powerEfficient: false). High-bitrate playback will use CPU software decoding which may cause high CPU load or frame drops.
                    </span>
                  </div>
                </div>
              )}

              {/* Browser Codec Support Matrix */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 mb-3 text-[10px] font-mono">
                <div className="text-slate-400 font-bold mb-1.5 uppercase tracking-wider text-[9px] flex items-center justify-between">
                  <span>Browser Codec Support Matrix:</span>
                  {mediaReport && (
                    <span className={mediaReport.hasHardwareAcceleration ? 'text-emerald-400' : 'text-amber-400'}>
                      {mediaReport.hasHardwareAcceleration ? 'GPU ACCELERATED' : 'CPU SOFTWARE'}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <div className="flex items-center justify-between px-2 py-1 rounded bg-slate-950 border border-slate-800/80">
                    <span className="text-slate-400">H.264 (AVC)</span>
                    <span className={codecSupport.h264 ? 'text-emerald-400 font-bold' : 'text-red-400'}>
                      {codecSupport.h264 ? '✓ DECODE' : '✗ NO'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between px-2 py-1 rounded bg-slate-950 border border-slate-800/80">
                    <span className="text-slate-400">HEVC (H.265)</span>
                    <span className={codecSupport.hevc ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                      {codecSupport.hevc ? '✓ DECODE' : '✗ UNSUPPORTED'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between px-2 py-1 rounded bg-slate-950 border border-slate-800/80">
                    <span className="text-slate-400">VP9 Profile</span>
                    <span className={codecSupport.vp9 ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                      {codecSupport.vp9 ? '✓ DECODE' : '✗ NO'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between px-2 py-1 rounded bg-slate-950 border border-slate-800/80">
                    <span className="text-slate-400">MSE Extensions</span>
                    <span className={codecSupport.mse ? 'text-emerald-400 font-bold' : 'text-red-400'}>
                      {codecSupport.mse ? '✓ READY' : '✗ NO'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons: Retry, Switch HTML5 ⇄ MSE, Auto-Optimize */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleRetryPlayback()}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 shadow"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Retry Playback</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleRetryPlayback(playbackEngine === 'html5' ? 'mse' : 'html5')}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-lg border border-slate-700 transition-colors flex items-center gap-1.5"
                >
                  <Activity className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Switch to {playbackEngine === 'html5' ? 'MSE Pipeline' : 'HTML5 Direct'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleAutoOptimizeCurrentVideo}
                  disabled={isOptimizingVideo}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-slate-950 font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 shadow"
                  title="Transcode video to universal 8-bit H.264/AAC for 100% video & audio playback"
                >
                  {isOptimizingVideo ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}
                  <span>{isOptimizingVideo ? 'Transcoding 4K/MP4...' : 'Auto-Optimize Codec (H.264)'}</span>
                </button>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* SSAI SERVER-SIDE STITCHED AD PLAYOUT OVERLAY            */}
          {/* ======================================================== */}
          {playout?.activeAdBreak && (
            <div className="absolute inset-0 z-40 bg-black flex flex-col justify-between overflow-hidden animate-fadeIn">
              {/* Stitched Ad Video Element */}
              <video
                ref={adVideoRef}
                key={`ssai-ad-${playout.activeAdBreak.id}-${playout.activeAdBreak.adCreativeUrl || 'default'}`}
                src={
                  playout.activeAdBreak.adCreativeUrl ||
                  context?.selectedAdCreative?.videoUrl ||
                  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'
                }
                className="absolute inset-0 w-full h-full object-contain bg-black"
                playsInline
                autoPlay
                muted={isMuted}
                onEnded={() => playout.skipAdBreak()}
              />

              {/* Top Broadcast Commercial Header HUD */}
              <div className="relative z-50 flex items-center justify-between p-3 sm:p-4 bg-gradient-to-b from-black/95 via-black/70 to-transparent">
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-500 text-slate-950 font-black text-[11px] uppercase tracking-wider shadow-lg">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>SPONSORED COMMERCIAL BREAK · AD 1 OF 1</span>
                  </span>
                  <span className="px-2.5 py-1 rounded bg-black/80 border border-white/20 text-white font-mono text-xs font-bold flex items-center gap-1.5 shadow-md">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>
                      Ad will end in: 0:{playout.adTimeRemainingSeconds < 10 ? '0' : ''}
                      {playout.adTimeRemainingSeconds}
                    </span>
                  </span>
                  <span className="hidden sm:inline-flex px-2 py-0.5 rounded bg-purple-950/80 border border-purple-500/60 text-purple-200 text-[10px] font-mono">
                    SCTE-35 In-Band Cue (0x34)
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsMuted(!isMuted);
                      if (adVideoRef.current) adVideoRef.current.muted = !isMuted;
                    }}
                    className="p-1.5 rounded-lg bg-black/70 hover:bg-black text-white border border-white/20 transition-all text-xs flex items-center gap-1 shadow"
                    title={isMuted ? 'Unmute commercial' : 'Mute commercial'}
                  >
                    {isMuted ? (
                      <VolumeX className="w-4 h-4 text-amber-400" />
                    ) : (
                      <Volume2 className="w-4 h-4 text-emerald-400" />
                    )}
                  </button>
                </div>
              </div>

              {/* Bottom Sponsor Banner & Playout Controls */}
              <div className="relative z-50 p-3 sm:p-4 bg-gradient-to-t from-black/95 via-black/70 to-transparent space-y-2">
                {/* Real-time Commercial Countdown Bar */}
                <div className="w-full bg-slate-800/80 h-1.5 rounded-full overflow-hidden border border-slate-700/60">
                  <div
                    className="bg-gradient-to-r from-amber-500 to-red-500 h-full transition-all duration-300"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.max(
                          0,
                          ((playout.activeAdBreak.durationSeconds - playout.adTimeRemainingSeconds) /
                            playout.activeAdBreak.durationSeconds) *
                            100
                        )
                      )}%`,
                    }}
                  />
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-amber-400 font-bold uppercase tracking-wider">
                        {playout.activeAdBreak.advertiser || 'Featured Sponsor'}
                      </span>
                      <span className="text-white text-xs font-semibold">· {playout.activeAdBreak.title}</span>
                    </div>
                    <p className="text-[11px] text-slate-300 line-clamp-1">
                      Server-Side Ad Ingestion (SSAI) active · Returning to network programming automatically
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {playout.activeAdBreak.callToActionUrl && (
                      <a
                        href={playout.activeAdBreak.callToActionUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg shadow-lg flex items-center gap-1.5 transition-all transform hover:scale-105"
                      >
                        <span>{playout.activeAdBreak.callToActionText || 'Learn More'}</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}

                    <button
                      type="button"
                      onClick={() => playout.skipAdBreak()}
                      className="px-3 py-1.5 bg-slate-800/90 hover:bg-slate-700 border border-slate-600 text-slate-200 hover:text-white font-semibold text-xs rounded-lg transition-all flex items-center gap-1.5"
                      title="Override commercial break (Engineer Playout Console)"
                    >
                      <span>Skip Ad (Engineer Mode)</span>
                      <RotateCcw className="w-3 h-3 text-slate-400" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SCTE-35 Real-Time Cue Marker HUD Overlay */}
          {(activeScte35Marker || isScte35OverlayOpen) && (
            <div className="absolute top-16 right-4 z-30 pointer-events-auto bg-purple-950/95 border border-purple-500/80 text-white rounded-xl p-3 shadow-2xl backdrop-blur-md max-w-xs animate-in slide-in-from-right">
              <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-purple-800/60">
                <div className="flex items-center gap-1.5 text-[11px] font-black uppercase text-purple-300">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-spin" />
                  <span>SCTE-35 IN-BAND CUE DETECTED</span>
                </div>
                <span className="text-[10px] bg-purple-900 border border-purple-700/80 px-1.5 py-0.5 rounded font-mono text-purple-200">
                  PID 0x01FF
                </span>
              </div>
              <div className="text-xs font-bold text-white">
                {activeScte35Marker?.segmentationTypeName || 'Provider Advertisement Start (0x34)'}
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-purple-200 mt-2">
                <div>
                  <span className="text-purple-400 block text-[9px]">SPLICE EVENT:</span>
                  <span>0x{activeScte35Marker?.eventId.toString(16).toUpperCase() || '429A'}</span>
                </div>
                <div className="text-right">
                  <span className="text-purple-400 block text-[9px]">DURATION:</span>
                  <span className="text-amber-300 font-bold">
                    {activeScte35Marker ? `${activeScte35Marker.durationSeconds}.00s Break` : '30.00s Pod'}
                  </span>
                </div>
              </div>
              <div className="text-[9px] font-mono text-slate-400 mt-1 truncate">
                UPID: {activeScte35Marker?.upid || 'APEX-DPI-2026-X99'}
              </div>
            </div>
          )}

          {/* In-App Live Studio Tally Bug (When Broadcasting Live from Browser) */}
          {isLiveStudioBroadcasting && (
            <div className="absolute top-16 left-4 z-30 pointer-events-none bg-red-950/90 border border-red-500/80 text-white px-3 py-1.5 rounded-lg shadow-2xl backdrop-blur-md flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
              <span className="text-xs font-black uppercase tracking-wider text-red-100 font-mono">
                🔴 LIVE STUDIO ANCHOR ON AIR (BROWSER PGM)
              </span>
            </div>
          )}

          {/* ======================================================== */}
          {/* STREAM HEALTH MONITOR OVERLAY HUD (HLS / SRT / WEBRTC)  */}
          {/* ======================================================== */}
          {showStreamHealthMonitor && (
            <div className="absolute top-14 left-4 right-4 sm:right-auto sm:w-[460px] z-30 pointer-events-auto bg-slate-950/95 border border-cyan-500/80 text-white rounded-2xl p-4 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-top-2">
              {/* Header */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                    <Activity className="w-4 h-4 animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black uppercase tracking-wider text-cyan-300">
                        STREAM HEALTH MONITOR
                      </span>
                      <span className="text-[10px] bg-cyan-950 border border-cyan-700/80 px-1.5 py-0.2 rounded font-mono font-bold text-cyan-200">
                        {isScreenSharing
                          ? 'SCREEN SHARE'
                          : isLiveStudioBroadcasting
                          ? 'STUDIO PGM'
                          : streamUrl.includes('.m3u8')
                          ? 'HLS LIVE'
                          : playout?.hotSwitch?.isActive
                          ? 'SRT STADIUM'
                          : 'DIRECT MP4'}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono block">
                      CH {activeChannel?.channelNumber || '101'} · {activeChannel?.callSign || 'APEX'}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowStreamHealthMonitor(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  title="Close Stream Health Monitor"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* 4-Stat Core Telemetry Cards */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                {/* 1. Real-Time Bitrate */}
                <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase font-mono">
                    <span className="flex items-center gap-1">
                      <Wifi className="w-3 h-3 text-cyan-400" />
                      Bitrate
                    </span>
                    <span className="text-emerald-400 font-bold">
                      {context?.hlsDiagnostics?.isManualLevelLocked ? 'LOCKED' : 'ABR AUTO'}
                    </span>
                  </div>
                  <div className="mt-1">
                    <div className="text-base font-mono font-black text-white">
                      {(
                        (context?.hlsDiagnostics?.currentBitrateKbps ||
                          (is4KLevelActive ? 18500 : 4800)) / 1000
                      ).toFixed(2)}{' '}
                      <span className="text-xs font-normal text-slate-400">Mbps</span>
                    </div>
                    <div className="text-[10px] font-mono text-cyan-300">
                      {context?.hlsDiagnostics?.currentResolution || (is4KLevelActive ? '3840x2160 (4K UHD)' : '1920x1080 (1080p60)')}
                    </div>
                  </div>
                </div>

                {/* 2. Latency (ms) */}
                <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase font-mono">
                    <span className="flex items-center gap-1">
                      <Zap className="w-3 h-3 text-amber-400" />
                      Stream Latency
                    </span>
                    <span className="text-amber-300 font-bold">
                      {(context?.hlsDiagnostics?.lastFragmentLatencyMs || (playout?.hotSwitch?.isActive ? playout.hotSwitch.latencyMs : 85)) < 150
                        ? 'ULTRA-LOW'
                        : 'NORMAL'}
                    </span>
                  </div>
                  <div className="mt-1">
                    <div className="text-base font-mono font-black text-amber-300">
                      {context?.hlsDiagnostics?.lastFragmentLatencyMs ||
                        (playout?.hotSwitch?.isActive ? playout.hotSwitch.latencyMs : 85)}{' '}
                      <span className="text-xs font-normal text-slate-400">ms</span>
                    </div>
                    <div className="text-[10px] font-mono text-slate-400">
                      Avg: {context?.hlsDiagnostics?.averageFragmentLatencyMs || 92} ms · Jitter: 4ms
                    </div>
                  </div>
                </div>

                {/* 3. Dropped Frames & Quality */}
                <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase font-mono">
                    <span className="flex items-center gap-1">
                      <Cpu className="w-3 h-3 text-purple-400" />
                      Frame Drops
                    </span>
                    <span
                      className={`font-bold ${
                        playbackQualityStats.dropRatePercent === 0
                          ? 'text-emerald-400'
                          : playbackQualityStats.dropRatePercent < 1
                          ? 'text-yellow-400'
                          : 'text-red-400'
                      }`}
                    >
                      {playbackQualityStats.dropRatePercent === 0
                        ? '0.00% (PERFECT)'
                        : `${playbackQualityStats.dropRatePercent}%`}
                    </span>
                  </div>
                  <div className="mt-1">
                    <div className="text-base font-mono font-black text-white">
                      {playbackQualityStats.droppedFrames}{' '}
                      <span className="text-xs font-normal text-slate-400">
                        / {playbackQualityStats.totalFrames} frames
                      </span>
                    </div>
                    <div className="text-[10px] font-mono text-slate-400">
                      Corrupted: {playbackQualityStats.corruptedFrames} frames
                    </div>
                  </div>
                </div>

                {/* 4. Buffer Depth */}
                <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase font-mono">
                    <span className="flex items-center gap-1">
                      <Gauge className="w-3 h-3 text-blue-400" />
                      Buffer Depth
                    </span>
                    <span
                      className={`font-bold ${
                        bufferHealth === 'optimal'
                          ? 'text-emerald-400'
                          : bufferHealth === 'stable'
                          ? 'text-blue-400'
                          : bufferHealth === 'low'
                          ? 'text-amber-400'
                          : 'text-red-400'
                      }`}
                    >
                      {bufferHealth.toUpperCase()}
                    </span>
                  </div>
                  <div className="mt-1">
                    <div className="text-base font-mono font-black text-cyan-300">
                      {bufferLevel}{' '}
                      <span className="text-xs font-normal text-slate-400">
                        / {hlsBufferConfig.maxBufferLength}s
                      </span>
                    </div>
                    <div className="text-[10px] font-mono text-slate-400">
                      High-Water Mark: {hlsBufferConfig.maxMaxBufferLength}s
                    </div>
                  </div>
                </div>
              </div>

              {/* Active Codec & 4K Hardware Decode Pipeline Card */}
              <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 mb-3 space-y-2">
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                  <span className="flex items-center gap-1.5 text-cyan-300 font-bold">
                    <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                    ACTIVE CODEC &amp; 4K DECODE PIPELINE
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                    {codecSupport.hevc ? 'NATIVE HEVC 4K' : 'EMULATED / TRANSCODE'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800/80">
                    <div className="text-[10px] text-slate-400">VIDEO CODEC</div>
                    <div className="font-bold text-white flex items-center gap-1 mt-0.5 text-[11px] truncate">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                      <span className="truncate">
                        {isHevcDetected
                          ? 'HEVC / H.265 (Main 10 UHD)'
                          : is4KLevelActive || is4KStreamDetected
                          ? 'HEVC / H.264 4K UHD'
                          : 'AVC / H.264 High Profile'}
                      </span>
                    </div>
                  </div>
                  <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800/80">
                    <div className="text-[10px] text-slate-400">HARDWARE PIPELINE</div>
                    <div className="font-bold text-cyan-300 flex items-center gap-1 mt-0.5 text-[11px] truncate">
                      <Zap className="w-3 h-3 text-amber-400 shrink-0" />
                      <span className="truncate">
                        {codecSupport.hevc
                          ? 'GPU Hardware (NVDEC/VCN)'
                          : isHevcDetected
                          ? 'Real-Time Faststart Stream'
                          : 'MSE Direct Hardware'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-[10px] font-mono text-slate-400 flex items-center justify-between pt-0.5">
                  <span>MSE Support: {codecSupport.mse ? 'Ready' : 'Fallback'}</span>
                  <span>Audio Codec: AAC-LC / 48kHz Stereo</span>
                </div>
              </div>

              {/* Sparkline Telemetry Plot (Bitrate & Latency Trends) */}
              <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 mb-3">
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mb-1">
                  <span>REAL-TIME BITRATE &amp; LATENCY SPARKLINE (15s)</span>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 text-cyan-400">
                      <span className="w-2 h-0.5 bg-cyan-400 inline-block" /> Bitrate
                    </span>
                    <span className="flex items-center gap-1 text-amber-400">
                      <span className="w-2 h-0.5 bg-amber-400 inline-block" /> Latency
                    </span>
                  </div>
                </div>

                <div className="h-14 w-full relative flex items-end">
                  <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 40">
                    {/* Gridlines */}
                    <line x1="0" y1="10" x2="100" y2="10" stroke="#334155" strokeDasharray="2,2" strokeWidth="0.5" />
                    <line x1="0" y1="25" x2="100" y2="25" stroke="#334155" strokeDasharray="2,2" strokeWidth="0.5" />
                    {/* Bitrate Line */}
                    {telemetryHistory.length > 1 && (
                      <polyline
                        fill="none"
                        stroke="#06b6d4"
                        strokeWidth="1.5"
                        points={telemetryHistory
                          .map((pt, i) => {
                            const x = (i / (Math.max(1, telemetryHistory.length - 1))) * 100;
                            // Normalize 0-25000 kbps to 40-5 svg y
                            const y = 35 - Math.min(30, (pt.bitrateKbps / 25000) * 30);
                            return `${x},${y}`;
                          })
                          .join(' ')}
                      />
                    )}
                    {/* Latency Line */}
                    {telemetryHistory.length > 1 && (
                      <polyline
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth="1.2"
                        strokeDasharray="2,1"
                        points={telemetryHistory
                          .map((pt, i) => {
                            const x = (i / (Math.max(1, telemetryHistory.length - 1))) * 100;
                            // Normalize 0-300ms to 40-5 svg y
                            const y = 35 - Math.min(30, (pt.latencyMs / 300) * 30);
                            return `${x},${y}`;
                          })
                          .join(' ')}
                      />
                    )}
                  </svg>
                </div>
              </div>

              {/* Engine & Quick Actions Footer */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800 text-[11px] font-mono">
                <span className="text-slate-400">
                  Engine: <strong className="text-white">{playbackEngine.toUpperCase()}</strong> · VideoQuality API:{' '}
                  <strong className="text-emerald-400">Active</strong>
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleRetryPlayback()}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg transition-colors flex items-center gap-1 font-sans text-xs"
                    title="Flush video pipeline and reconnect stream"
                  >
                    <RotateCcw className="w-3 h-3 text-cyan-400" />
                    <span>Flush Pipeline</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowStreamHealthMonitor(false)}
                    className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-black font-bold rounded-lg transition-colors font-sans text-xs"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Center Big Play / Resume Button when Video is Paused */}
          {!isPlaying && !playbackError && !youtubeVideoId && !isLiveStudioBroadcasting && (
            <div
              onClick={togglePlay}
              className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/40 hover:bg-black/30 backdrop-blur-[2px] cursor-pointer group transition-all"
            >
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-red-600/95 group-hover:bg-red-500 text-white flex items-center justify-center shadow-2xl transition-all group-hover:scale-110 border-2 border-white/20">
                <Play className="w-8 h-8 sm:w-10 sm:h-10 fill-white ml-1" />
              </div>
              <span className="mt-3 text-xs sm:text-sm font-bold tracking-wide uppercase text-white/90 bg-black/60 px-3 py-1 rounded-full border border-white/10">
                Click to Play
              </span>
            </div>
          )}

          {/* Click to Unmute Autoplay Prompt */}
          {isMuted && (isPlaying || !!youtubeVideoId) && (
            <button
              onClick={() => {
                setIsMuted(false);
                if (singleVideoRef.current) singleVideoRef.current.muted = false;
                if (ytIframeRef.current?.contentWindow) {
                  try {
                    ytIframeRef.current.contentWindow.postMessage(
                      JSON.stringify({ event: 'command', func: 'unMute', args: [] }),
                      '*'
                    );
                  } catch {}
                }
              }}
              className="absolute bottom-16 left-4 z-30 bg-black/80 hover:bg-black/95 border border-white/20 text-white px-3 py-1.5 rounded-lg shadow-xl backdrop-blur-md flex items-center gap-2 text-xs font-semibold transition-all transform hover:scale-105"
            >
              <VolumeX className="w-4 h-4 text-amber-400" />
              <span>Click to Unmute Broadcast Audio</span>
            </button>
          )}

          {/* Decode Error Recovery Dialog */}
          {playbackError && (
            <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center p-6 text-center z-30">
              <AlertTriangle className="w-10 h-10 text-amber-400 mb-2" />
              <div className="text-sm font-bold text-white">Stream Playback Notice</div>
              <div className="text-xs text-slate-400 mt-1 max-w-sm">{playbackError}</div>
              <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
                <button
                  onClick={() => {
                    setPlaybackError(null);
                    if (singleVideoRef.current) {
                      singleVideoRef.current.src = SAMPLE_STREAMS.SPORTS_LIVE;
                      singleVideoRef.current.load();
                      singleVideoRef.current.play().catch(() => {});
                    }
                    BroadcastLogger.logRecovery(
                      'FAILOVER_TO_MASTER',
                      'Switched to verified broadcast master stream.'
                    );
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-2 shadow-lg"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Switch to Backup Feed</span>
                </button>
                <button
                  onClick={() => {
                    setPlaybackError(null);
                    if (singleVideoRef.current) {
                      singleVideoRef.current.load();
                      singleVideoRef.current.play().catch(() => {});
                    }
                  }}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg transition-colors"
                >
                  <span>Retry Current</span>
                </button>
              </div>
            </div>
          )}

          {/* Non-Linear Corner Sponsor Bug Overlay (Broadcast Continues Uninterrupted) */}
          {nonLinearAd?.isActive && nonLinearAd.type === 'corner_bug' && (
            <div className="absolute bottom-16 right-4 z-40 max-w-xs w-full sm:w-80 bg-slate-950/95 border border-amber-500/80 rounded-2xl p-3.5 shadow-2xl backdrop-blur-md animate-fadeIn text-white space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 font-black text-xs shrink-0">
                    ★
                  </div>
                  <div className="truncate">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold block">
                      SPONSOR SPOTLIGHT
                    </span>
                    <h5 className="text-xs font-bold text-white truncate">{nonLinearAd.title}</h5>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => dismissNonLinearAd?.()}
                  className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  title="Dismiss ad"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed">{nonLinearAd.tagline}</p>

              <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/80 text-[10px]">
                {nonLinearAd.promoCode && (
                  <span className="font-mono bg-slate-900 border border-amber-500/40 px-2 py-0.5 rounded text-amber-300 font-bold">
                    CODE: {nonLinearAd.promoCode}
                  </span>
                )}
                <a
                  href={nonLinearAd.callToActionUrl || 'https://cloud.google.com/ai'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] rounded-lg transition-all flex items-center gap-1 shadow-md ml-auto"
                >
                  <span>{nonLinearAd.callToActionText || 'Claim Offer'}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {/* Progress Countdown Bar */}
              <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 transition-all duration-1000 ease-linear"
                  style={{ width: `${(nonLinearAd.timeRemainingSeconds / (nonLinearAd.durationSeconds || 15)) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* VIEW B: MULTI-VIEW INGEST SPLIT GRID (4, 6, OR 8 SLOTS) */}
      {/* ======================================================== */}
      {isMultiView && (
        <div
          className={`w-full h-full grid gap-1.5 p-1.5 bg-slate-950 ${
            multiViewSlotCount === 4
              ? 'grid-cols-2 grid-rows-2'
              : multiViewSlotCount === 6
              ? 'grid-cols-3 grid-rows-2'
              : 'grid-cols-4 grid-rows-2'
          }`}
        >
          {cameraFeeds.map((cam, slotIndex) => {
            const isAudioActive = cam.id === activeAudioCamId && !isMuted;
            const camYtId = extractYouTubeVideoId(cam.streamUrl);
            const isStudioLiveSlot = isLiveStudioBroadcasting && liveStudioStream && (cam.id === 'cam-pgm' || slotIndex === 0);

            return (
              <div
                key={`${cam.id}-${slotIndex}`}
                className={`relative bg-black rounded-lg overflow-hidden border transition-all group/cam ${
                  isAudioActive
                    ? 'border-red-500 ring-2 ring-red-500/40'
                    : 'border-slate-800 hover:border-slate-600'
                }`}
              >
                {/* Quadrant Stream Video Feed: Live Studio, YouTube Ingest, or HLS/MP4 */}
                {isStudioLiveSlot ? (
                  <video
                    ref={(el) => {
                      if (el && liveStudioStream) {
                        el.srcObject = liveStudioStream;
                        el.play().catch(() => {});
                      }
                    }}
                    className="w-full h-full object-cover"
                    playsInline
                    autoPlay
                    muted={!isAudioActive}
                  />
                ) : camYtId ? (
                  <iframe
                    key={`quad-yt-${cam.id}-${camYtId}-${isAudioActive ? 'unmuted' : 'muted'}`}
                    src={`https://www.youtube-nocookie.com/embed/${camYtId}?autoplay=1&mute=${isAudioActive ? 0 : 1}&enablejsapi=1&playsinline=1&rel=0`}
                    className="w-full h-full border-0 pointer-events-auto"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title={`Slot ${slotIndex + 1}: ${cam.label}`}
                  />
                ) : (
                  <video
                    ref={(el) => {
                      multiVideoRefs.current[cam.id] = el;
                    }}
                    className="w-full h-full object-cover"
                    playsInline
                    muted={!isAudioActive}
                  />
                )}

                {/* Camera Top Identification Bug & Stream Slot Switcher */}
                <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-auto z-10">
                  <div className="flex items-center gap-1.5 bg-black/85 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-mono font-bold text-white border border-white/10 shadow">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isAudioActive ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'
                      }`}
                    />
                    <span>Slot {slotIndex + 1}: {cam.label}</span>
                  </div>

                  {/* Slot Actions (Switch Stream / Solo Audio) */}
                  <div className="flex items-center gap-1">
                    {/* Quick Feed Switcher for this slot */}
                    <button
                      onClick={() => {
                        setActiveSlotToConfigure(slotIndex);
                        setIsFeedSelectorOpen(true);
                      }}
                      className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-black/75 hover:bg-blue-600 text-slate-300 hover:text-white border border-white/10 backdrop-blur-md transition-colors flex items-center gap-1"
                      title={`Select feed for Slot ${slotIndex + 1}`}
                    >
                      <SlidersHorizontal className="w-2.5 h-2.5 text-blue-400" />
                      <span className="hidden sm:inline">Change Feed</span>
                    </button>

                    {/* Audio Solo Status Badge */}
                    <button
                      onClick={() => handleSelectAudioCam(cam.id)}
                      className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono backdrop-blur-md transition-colors ${
                        isAudioActive
                          ? 'bg-red-600 text-white font-bold'
                          : 'bg-black/70 hover:bg-black/90 text-slate-400 hover:text-slate-200'
                      }`}
                      title={isAudioActive ? 'Audio Active' : 'Listen to this stream'}
                    >
                      {isAudioActive ? (
                        <>
                          <Volume2 className="w-3 h-3" />
                          <span className="hidden sm:inline">AUDIO ON</span>
                        </>
                      ) : (
                        <VolumeX className="w-3 h-3 text-slate-500" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Bottom Overlay Controls (Visible on Hover) */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-2 flex items-center justify-between opacity-0 group-hover/cam:opacity-100 transition-opacity z-10">
                  <div className="flex items-center gap-1.5 truncate max-w-[200px]">
                    <span className="text-[10px] text-slate-300 truncate font-medium">
                      {cam.description}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 ml-auto">
                    {/* Select Stream for Slot */}
                    <button
                      onClick={() => {
                        setActiveSlotToConfigure(slotIndex);
                        setIsFeedSelectorOpen(true);
                      }}
                      className="px-2 py-1 text-[10px] font-bold rounded flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                      title="Select different HLS feed for this grid slot"
                    >
                      <Tv className="w-3 h-3 text-blue-400" />
                      <span>Switch Angle</span>
                    </button>

                    {/* Solo Audio Button */}
                    <button
                      onClick={() => handleSelectAudioCam(cam.id)}
                      className={`px-2 py-1 text-[10px] font-bold rounded flex items-center gap-1 transition-colors ${
                        isAudioActive
                          ? 'bg-red-600 text-white'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                      }`}
                      title="Solo audio from this camera angle"
                    >
                      <Volume2 className="w-3 h-3" />
                      <span>Solo Audio</span>
                    </button>

                    {/* Maximize to Single View Button */}
                    <button
                      onClick={() => {
                        setTestFeedOverride(cam.streamUrl);
                        setIsMultiView(false);
                      }}
                      className="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold rounded flex items-center gap-1 transition-colors"
                      title="Make this angle primary full screen"
                    >
                      <Maximize2 className="w-3 h-3" />
                      <span className="hidden sm:inline">Maximize</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ======================================================== */}
      {/* Top Bar Overlay: Live Badge, Multi-View Mode & Scoreboard */}
      {/* ======================================================== */}
      <div className="absolute top-4 left-4 right-4 flex flex-wrap justify-between items-center gap-2 pointer-events-none z-20">
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Live Broadcast Bug */}
          <div className="flex items-center gap-2 bg-red-600/90 text-white text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider backdrop-blur-md shadow-lg">
            <Radio className="w-4 h-4 animate-pulse" />
            <span>{isMultiView ? 'Quad-View Ingest (2x2)' : 'Live Broadcast'}</span>
          </div>

          {/* Active Channel & Assigned Video Playout Indicator */}
          {activeChannel && viewingMode === 'linear' && (
            <div className="hidden sm:flex items-center gap-1.5 bg-black/80 backdrop-blur-md border border-slate-700/80 px-2.5 py-1 rounded-full text-xs font-mono text-white shadow-lg">
              <span className="font-bold text-red-400">CH {activeChannel.channelNumber}</span>
              <span className="text-slate-500">|</span>
              <span className="text-slate-200 max-w-[180px] md:max-w-[260px] truncate font-medium">
                {playout?.currentProgram?.title || activeChannel.channelName}
              </span>
            </div>
          )}

          {/* 4K UHD High-Resolution Stream & Custom Buffer Profile Badge */}
          {is4KStreamDetected && (
            <div className="flex items-center gap-1.5 bg-gradient-to-r from-amber-600/40 via-yellow-600/30 to-amber-500/20 text-amber-300 border border-amber-500/60 px-3 py-1 rounded-full text-xs font-mono font-black shadow-lg backdrop-blur-md animate-fadeIn">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span>4K UHD (2160p)</span>
              <span className="text-[10px] bg-amber-500/25 text-amber-200 px-1.5 py-0.2 rounded font-bold border border-amber-500/40" title="Custom 4K Hls.js Buffer Profile">
                BUF {hlsBufferConfig.maxBufferLength}s
              </span>
            </div>
          )}

          {/* Multi-View Mode Toggle Button */}
          {enableMultiView && (
            <button
              onClick={() => setIsMultiView((prev) => !prev)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur-md transition-all shadow-lg border ${
                isMultiView
                  ? 'bg-blue-600 text-white border-blue-400 ring-2 ring-blue-500/30'
                  : 'bg-gray-900/90 text-slate-200 border-gray-700 hover:bg-gray-800'
              }`}
              title="Toggle Multi-View Split Grid"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-blue-300" />
              <span>{isMultiView ? 'Exit Multi-View' : `Multi-View (${multiViewSlotCount} Slots)`}</span>
            </button>
          )}

          {/* Slot Layout Controls when Multi-View is Active */}
          {isMultiView && (
            <div className="flex items-center bg-slate-900/90 border border-slate-700/80 rounded-full p-0.5 text-xs font-mono shadow-lg">
              <button
                type="button"
                onClick={() => setMultiViewSlotCount(4)}
                className={`px-2.5 py-1 rounded-full font-bold transition-colors ${
                  multiViewSlotCount === 4
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                4 Slots
              </button>
              <button
                type="button"
                onClick={() => setMultiViewSlotCount(6)}
                className={`px-2.5 py-1 rounded-full font-bold transition-colors ${
                  multiViewSlotCount === 6
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                6 Slots
              </button>
              <button
                type="button"
                onClick={() => setMultiViewSlotCount(8)}
                className={`px-2.5 py-1 rounded-full font-bold transition-colors ${
                  multiViewSlotCount === 8
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                8 Slots
              </button>
            </div>
          )}

          {/* Configure Feeds Button when Multi-View is Active */}
          {isMultiView && (
            <button
              onClick={() => {
                setActiveSlotToConfigure(null);
                setIsFeedSelectorOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur-md transition-all shadow-lg border bg-slate-900/90 hover:bg-slate-800 text-slate-200 border-slate-700"
              title={`Select and manage up to ${multiViewSlotCount} simultaneous live streams & uploaded videos`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-blue-400" />
              <span>Configure {multiViewSlotCount} Feeds</span>
            </button>
          )}

          {/* Test Feeds Quick Switcher (When in Single View) */}
          {!isMultiView && (
            <div className="hidden sm:flex items-center gap-1 bg-gray-900/90 text-white border border-gray-700/80 px-2.5 py-1 rounded-full text-[11px] font-mono shadow-md backdrop-blur-md">
              <span className="text-gray-400">Test:</span>
              <button
                onClick={() => setTestFeedOverride('https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8')}
                className={`px-2 py-0.5 rounded-full transition-colors ${
                  streamUrl === 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8'
                    ? 'bg-blue-600 text-white font-bold'
                    : 'text-gray-400 hover:text-white'
                }`}
                title="Test Mux VOD / HLS Sample Test Feed"
              >
                VOD/HLS
              </button>
              <button
                onClick={() => setTestFeedOverride(SAMPLE_STREAMS.SPORTS_LIVE)}
                className={`px-2 py-0.5 rounded-full transition-colors ${
                  streamUrl === SAMPLE_STREAMS.SPORTS_LIVE
                    ? 'bg-red-600 text-white font-bold'
                    : 'text-gray-400 hover:text-white'
                }`}
                title="Test Live Sports Stream Feed"
              >
                Live Sim
              </button>
              <button
                onClick={() => setTestFeedOverride(SAMPLE_STREAMS.FOUR_K_UHD_SAMPLE)}
                className={`px-2 py-0.5 rounded-full transition-colors ${
                  streamUrl === SAMPLE_STREAMS.FOUR_K_UHD_SAMPLE
                    ? 'bg-amber-600 text-white font-bold shadow-sm'
                    : 'text-amber-400 hover:text-white'
                }`}
                title="Test 4K / 2160p High-Resolution HLS Stream with Custom 60s/120s Buffers"
              >
                4K UHD
              </button>
              {testFeedOverride && (
                <button
                  onClick={() => setTestFeedOverride(null)}
                  className="text-[10px] text-gray-400 hover:text-amber-400 px-1 font-bold"
                  title="Reset to Channel Master Playout"
                >
                  ✕
                </button>
              )}
            </div>
          )}

          {/* Stream Health Monitor HUD Toggle Button */}
          <button
            type="button"
            onClick={() => setShowStreamHealthMonitor((prev) => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur-md transition-all shadow-lg border ${
              showStreamHealthMonitor
                ? 'bg-cyan-600 text-black border-cyan-400 ring-2 ring-cyan-500/30 font-bold'
                : 'bg-slate-900/90 text-cyan-300 border-cyan-800/80 hover:bg-slate-800'
            }`}
            title="Toggle Stream Health Monitor Overlay (Bitrates, Dropped Frames & Latency)"
          >
            <Activity className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span className="hidden sm:inline">Stream Health</span>
            <span className={`w-2 h-2 rounded-full ${playbackQualityStats.dropRatePercent === 0 ? 'bg-emerald-400' : 'bg-amber-400'}`} />
          </button>

          {/* Advanced Screen Share Button & Tab/4K Selector */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                if (isScreenSharing) {
                  stopScreenShare?.();
                } else {
                  context?.setIsScreenShareModalOpen?.(true);
                }
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur-md transition-all shadow-lg border ${
                isScreenSharing
                  ? 'bg-red-600 text-white border-red-500 shadow-red-600/30 animate-pulse font-bold'
                  : 'bg-slate-900/90 text-cyan-300 border-cyan-700/80 hover:bg-slate-800 hover:text-white'
              }`}
              title={
                isScreenSharing
                  ? 'Stop Screen Share and return to channel feed'
                  : 'Screen Share: Browser Tabs, Entire Screen, App Window, or Camera PiP'
              }
            >
              <Monitor className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">
                {isScreenSharing ? 'Stop Share' : 'Share Screen (Tabs / 4K)'}
              </span>
            </button>
            <button
              type="button"
              onClick={() => context?.setIsScreenShareModalOpen?.(true)}
              className="p-1.5 rounded-full bg-slate-900/90 text-slate-400 hover:text-cyan-300 border border-slate-700/80 hover:bg-slate-800 transition-colors shadow-md"
              title="Open Screen Share Settings (Tab Loopback, 4K Monitor, PiP, Studio Audio)"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" />
            </button>
          </div>

          {/* Non-Linear On-Screen Ad Trigger (Continuous Broadcast) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsAdMenuOpen((prev) => !prev)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur-md transition-all shadow-lg border ${
                nonLinearAd?.isActive
                  ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold shadow-amber-500/30 animate-pulse'
                  : 'bg-slate-900/90 text-amber-300 border-amber-600/70 hover:bg-slate-800 hover:text-amber-200'
              }`}
              title="Show small on-screen ads and sponsor bugs without stopping broadcast"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">
                {nonLinearAd?.isActive ? `Ad Active (${nonLinearAd.timeRemainingSeconds}s)` : 'Sponsor Ad'}
              </span>
              <ChevronDown className="w-3 h-3 opacity-70" />
            </button>

            {isAdMenuOpen && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute top-full right-0 mt-2 w-64 bg-slate-950 border border-slate-700 rounded-2xl shadow-2xl p-2 z-50 text-xs animate-fadeIn space-y-1"
              >
                <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                  Non-Stop Sponsor Ingestion:
                </div>
                <button
                  type="button"
                  onClick={() => {
                    triggerNonLinearAd?.({
                      type: 'corner_bug',
                      title: 'Apex Cloud Studio Ultra',
                      advertiser: 'Apex Network Sponsor',
                      tagline: 'High-performance 4K low-latency edge playout.',
                      promoCode: 'APEX4K',
                      durationSeconds: 15,
                    });
                    setIsAdMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl hover:bg-amber-500 hover:text-slate-950 transition-colors flex flex-col group/item"
                >
                  <span className="font-bold flex items-center justify-between text-white group-hover/item:text-slate-950">
                    <span>Corner Sponsor Bug</span>
                    <span className="text-[10px] font-mono px-1 rounded bg-amber-500/20 text-amber-300 group-hover/item:bg-black/20 group-hover/item:text-slate-950">15s</span>
                  </span>
                  <span className="text-[10px] text-slate-400 group-hover/item:text-slate-800">
                    Non-intrusive floating sponsor card in corner
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    triggerNonLinearAd?.({
                      type: 'l_bar',
                      title: 'Global Broadcast Keynote 2026',
                      advertiser: 'Google Cloud Media',
                      tagline: 'Enterprise TV playout, SSAI insertion & live streaming.',
                      promoCode: 'STUDIO20',
                      durationSeconds: 15,
                    });
                    setIsAdMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl hover:bg-blue-600 hover:text-white transition-colors flex flex-col group/item"
                >
                  <span className="font-bold flex items-center justify-between text-white">
                    <span>Squeeze-Back L-Bar Frame</span>
                    <span className="text-[10px] font-mono px-1 rounded bg-blue-500/20 text-blue-300 group-hover/item:bg-white/20 group-hover/item:text-white">15s</span>
                  </span>
                  <span className="text-[10px] text-slate-400 group-hover/item:text-blue-100">
                    Video smoothly scales to 80% revealing sponsor frame
                  </span>
                </button>
                {nonLinearAd?.isActive && (
                  <div className="pt-1 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        dismissNonLinearAd?.();
                        setIsAdMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-1.5 rounded-lg text-red-400 hover:bg-red-600 hover:text-white text-[11px] font-bold flex items-center gap-1 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Dismiss Active Ad</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Flash News Quick Ingestion Trigger */}
          <button
            type="button"
            onClick={() => setIsFlashNewsModalOpen?.(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur-md transition-all shadow-lg border bg-slate-900/90 text-red-300 border-red-700/80 hover:bg-slate-800 hover:text-white"
            title="Dispatch breaking news alert to on-air lower third ticker"
          >
            <Radio className="w-3.5 h-3.5 text-red-400 animate-pulse" />
            <span className="hidden sm:inline">News Flash</span>
          </button>

          {/* Custom Video Ingest Button */}
          <button
            type="button"
            onClick={() => setIsCustomInjectOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur-md transition-all shadow-lg border bg-slate-900/90 text-emerald-300 border-emerald-700/80 hover:bg-slate-800 hover:text-white"
            title="Inject any custom video URL (YouTube, MP4, HLS) into any channel"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Inject Video</span>
          </button>
        </div>

        {/* Dynamic Live Sports Scoreboard Overlay */}
        {isLiveSports && sportsData && (
          <div className="flex items-center gap-4 bg-gray-900/90 text-white border border-gray-700/80 px-4 py-2 rounded-lg backdrop-blur-md shadow-xl pointer-events-auto">
            <div className="flex items-center gap-2 font-bold text-sm">
              <span className="truncate max-w-[120px]">{sportsData.homeTeam}</span>
              <span className="bg-red-600 px-2 py-0.5 rounded text-xs tabular-nums">{sportsData.homeScore}</span>
            </div>
            <span className="text-gray-400 font-mono text-xs">-</span>
            <div className="flex items-center gap-2 font-bold text-sm">
              <span className="bg-blue-600 px-2 py-0.5 rounded text-xs tabular-nums">{sportsData.awayScore}</span>
              <span className="truncate max-w-[120px]">{sportsData.awayTeam}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-amber-400 font-mono border-l border-gray-700 pl-3">
              <Activity className="w-3.5 h-3.5 animate-spin" />
              <span>{sportsData.timeElapsed}</span>
            </div>
          </div>
        )}
      </div>

      {/* Universal Playback Controls Bar (For VOD, Uploads & Live Stream Control) */}
      {!isMultiView && (
        <div className="absolute bottom-10 left-0 right-0 px-4 py-2 bg-gradient-to-t from-black/95 via-black/80 to-transparent z-20 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-auto">
          {/* Progress Seek Bar (When duration is available) */}
          {duration > 0 && (
            <div className="flex items-center gap-2 w-full">
              <input
                type="range"
                min="0"
                max={duration}
                step="0.1"
                value={currentTime}
                onChange={(e) => {
                  const targetTime = parseFloat(e.target.value);
                  setCurrentTime(targetTime);
                  if (singleVideoRef.current) {
                    singleVideoRef.current.currentTime = targetTime;
                  }
                }}
                className="w-full h-1.5 bg-slate-700/80 rounded-lg appearance-none cursor-pointer accent-red-600 focus:outline-none"
              />
            </div>
          )}

          {/* Controls Strip */}
          <div className="flex items-center justify-between text-xs text-white">
            <div className="flex items-center gap-3">
              {/* Play / Pause Toggle */}
              <button
                type="button"
                onClick={() => {
                  if (singleVideoRef.current) {
                    if (isPlaying) {
                      singleVideoRef.current.pause();
                    } else {
                      singleVideoRef.current.play().catch(() => {});
                    }
                  }
                }}
                className="p-1 text-white hover:text-red-400 transition-colors"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white" />}
              </button>

              {/* Time Display */}
              <div className="text-[11px] font-mono text-slate-300">
                {Math.floor(currentTime / 60)}:{String(Math.floor(currentTime % 60)).padStart(2, '0')}
                {duration > 0 && (
                  <span className="text-slate-500">
                    {' '}/ {Math.floor(duration / 60)}:{String(Math.floor(duration % 60)).padStart(2, '0')}
                  </span>
                )}
              </div>

              {/* Volume Slider */}
              <div className="flex items-center gap-1.5 ml-1">
                <button
                  type="button"
                  onClick={toggleMute}
                  className="p-0.5 text-slate-300 hover:text-white"
                  title={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => {
                    const newVol = parseFloat(e.target.value);
                    setVolume(newVol);
                    const shouldMute = newVol === 0;
                    setIsMuted(shouldMute);
                    if (singleVideoRef.current) {
                      singleVideoRef.current.volume = newVol;
                      singleVideoRef.current.muted = shouldMute;
                    }
                    if (ytIframeRef.current?.contentWindow) {
                      try {
                        ytIframeRef.current.contentWindow.postMessage(
                          JSON.stringify({
                            event: 'command',
                            func: 'setVolume',
                            args: [newVol * 100],
                          }),
                          '*'
                        );
                        if (shouldMute) {
                          ytIframeRef.current.contentWindow.postMessage(
                            JSON.stringify({ event: 'command', func: 'mute', args: [] }),
                            '*'
                          );
                        } else {
                          ytIframeRef.current.contentWindow.postMessage(
                            JSON.stringify({ event: 'command', func: 'unMute', args: [] }),
                            '*'
                          );
                        }
                      } catch {}
                    }
                  }}
                  className="w-14 h-1 bg-slate-700 rounded appearance-none accent-white cursor-pointer hidden sm:inline"
                />
              </div>
            </div>

            {/* Right Controls: Retry, Codec Diagnostics, BufferMonitor, Aspect Ratio, Fullscreen */}
            <div className="flex items-center gap-2">
              {/* Playback Retry Button */}
              <button
                type="button"
                onClick={() => handleRetryPlayback()}
                className="flex items-center gap-1 px-2 py-1 rounded bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-[10px] font-mono text-slate-200 transition-colors shadow"
                title="Retry stream playback (re-mounts pipeline and auto-switches HTML5 ⇄ MSE)"
              >
                <RotateCcw className="w-3 h-3 text-cyan-400" />
                <span>Retry</span>
              </button>

              {/* Codec & Engine Diagnostics Toggle */}
              <button
                type="button"
                onClick={() => setShowCodecDiagnostics((prev) => !prev)}
                className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono border transition-colors shadow ${
                  showCodecDiagnostics
                    ? 'bg-blue-600 border-blue-500 text-white font-bold'
                    : 'bg-black/70 hover:bg-black border-white/20 text-slate-300'
                }`}
                title="Toggle Codec Support & Decoding Diagnostic Layer (HTML5 vs MSE)"
              >
                <Cpu className="w-3 h-3 text-emerald-400" />
                <span className="hidden sm:inline">{playbackEngine.toUpperCase()}</span>
              </button>

              {/* BufferMonitor Live Diagnostic Pill */}
              <div
                className={`hidden sm:flex items-center gap-1.5 px-2 py-1 rounded bg-black/70 border text-[10px] font-mono shadow ${
                  is4KStreamDetected ? 'border-amber-500/50 text-amber-300' : 'border-white/10 text-slate-300'
                }`}
                title={`BufferMonitor: ${bufferHealth.toUpperCase()} (${bufferLevel}s buffered) - Hls.js Profile: maxBufferLength=${hlsBufferConfig.maxBufferLength}s, maxMaxBufferLength=${hlsBufferConfig.maxMaxBufferLength}s`}
              >
                <Activity
                  className={`w-3 h-3 ${
                    bufferHealth === 'optimal'
                      ? 'text-emerald-400'
                      : bufferHealth === 'stable'
                      ? 'text-blue-400'
                      : bufferHealth === 'low'
                      ? 'text-amber-400'
                      : 'text-red-400 animate-pulse'
                  }`}
                />
                <span className="text-slate-400">BUF:</span>
                <span
                  className={
                    bufferHealth === 'optimal'
                      ? 'text-emerald-400 font-bold'
                      : bufferHealth === 'stable'
                      ? 'text-blue-300 font-bold'
                      : bufferHealth === 'low'
                      ? 'text-amber-400 font-bold'
                      : 'text-red-400 font-bold animate-pulse'
                  }
                >
                  {isBufferStalled ? 'STALL' : `${bufferLevel}s`}
                </span>
                {is4KStreamDetected && (
                  <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1 rounded font-bold">
                    4K ({hlsBufferConfig.maxBufferLength}s max)
                  </span>
                )}
                {recoveryCount > 0 && (
                  <span className="text-[9px] text-purple-400 font-semibold">({recoveryCount} rec)</span>
                )}
              </div>

              {/* Clickable Stream Health Pill */}
              <button
                type="button"
                onClick={() => setShowStreamHealthMonitor((prev) => !prev)}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono transition-colors border ${
                  showStreamHealthMonitor
                    ? 'bg-cyan-600 text-black border-cyan-400 font-bold'
                    : 'bg-slate-800/80 hover:bg-slate-700 text-cyan-300 border-slate-700'
                }`}
                title="View Real-Time Stream Health (Bitrates, Dropped Frames & Latency)"
              >
                <Activity className="w-3 h-3 text-cyan-400" />
                <span>{((context?.hlsDiagnostics?.currentBitrateKbps || (is4KLevelActive ? 18500 : 4800)) / 1000).toFixed(1)}M</span>
                <span className="text-slate-400">·</span>
                <span className={playbackQualityStats.droppedFrames > 0 ? 'text-amber-400' : 'text-emerald-400'}>
                  {playbackQualityStats.droppedFrames} drop
                </span>
              </button>

              {/* Aspect Ratio Switcher */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowRatioSelector(!showRatioSelector)}
                  className="flex items-center gap-1 px-2 py-1 bg-black/70 hover:bg-black border border-white/20 rounded text-[11px] font-mono text-slate-200 transition-colors"
                  title="Switch Aspect Ratio"
                >
                  <Layout className="w-3 h-3 text-blue-400" />
                  <span>{effectiveAspectRatio}</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>

                {showRatioSelector && (
                  <div className="absolute bottom-full right-0 mb-1 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl p-1 text-[11px] font-mono space-y-0.5 z-30 min-w-[130px]">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRatio('auto');
                        setShowRatioSelector(false);
                      }}
                      className={`w-full text-left px-2 py-1 rounded transition-colors ${
                        selectedRatio === 'auto' ? 'bg-blue-600 text-white font-bold' : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      Auto ({detectedRatio})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRatio('16:9');
                        setShowRatioSelector(false);
                      }}
                      className={`w-full text-left px-2 py-1 rounded transition-colors ${
                        selectedRatio === '16:9' ? 'bg-blue-600 text-white font-bold' : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      16:9 Widescreen
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRatio('9:16');
                        setShowRatioSelector(false);
                      }}
                      className={`w-full text-left px-2 py-1 rounded transition-colors ${
                        selectedRatio === '9:16' ? 'bg-blue-600 text-white font-bold' : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      9:16 Vertical
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRatio('4:3');
                        setShowRatioSelector(false);
                      }}
                      className={`w-full text-left px-2 py-1 rounded transition-colors ${
                        selectedRatio === '4:3' ? 'bg-blue-600 text-white font-bold' : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      4:3 Classic TV
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRatio('21:9');
                        setShowRatioSelector(false);
                      }}
                      className={`w-full text-left px-2 py-1 rounded transition-colors ${
                        selectedRatio === '21:9' ? 'bg-blue-600 text-white font-bold' : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      21:9 Cinema
                    </button>
                  </div>
                )}
              </div>

              {/* Fit / Fill Mode Toggle */}
              <button
                type="button"
                onClick={() => setFitMode(fitMode === 'contain' ? 'cover' : 'contain')}
                className="px-2 py-1 bg-black/70 hover:bg-black border border-white/20 rounded text-[11px] font-mono text-slate-200 transition-colors"
                title={fitMode === 'contain' ? 'Current: Fit (No Crop)' : 'Current: Fill (Crop)'}
              >
                {fitMode === 'contain' ? 'FIT' : 'FILL'}
              </button>

              {/* Fullscreen Button */}
              <button
                type="button"
                onClick={toggleFullscreen}
                className="p-1 text-slate-300 hover:text-white transition-colors"
                title="Fullscreen"
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Controls (Audio, Ticker Toggle, Fullscreen, Stream Health, Share Screen) */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        {/* Quick Screen Share Button */}
        <button
          type="button"
          onClick={() => {
            if (isScreenSharing) {
              stopScreenShare?.();
            } else {
              startScreenShare?.();
            }
          }}
          className={`p-2.5 rounded-full backdrop-blur-md transition-all ${
            isScreenSharing
              ? 'bg-red-600 text-white shadow-lg shadow-red-600/40 animate-pulse'
              : 'bg-black/60 hover:bg-black/90 text-slate-300 hover:text-white'
          }`}
          title={isScreenSharing ? 'Stop Screen Share' : 'Share Screen'}
        >
          <Monitor className="w-4 h-4 text-cyan-400" />
        </button>

        {/* Quick Stream Health Monitor Button */}
        <button
          type="button"
          onClick={() => setShowStreamHealthMonitor((prev) => !prev)}
          className={`p-2.5 rounded-full backdrop-blur-md transition-all ${
            showStreamHealthMonitor
              ? 'bg-cyan-600 text-black shadow-lg shadow-cyan-600/40'
              : 'bg-black/60 hover:bg-black/90 text-slate-300 hover:text-white'
          }`}
          title="Stream Health Monitor"
        >
          <Activity className="w-4 h-4 text-cyan-400" />
        </button>

        <button
          onClick={() => setShowTicker((prev) => !prev)}
          className="bg-black/60 hover:bg-black/90 text-white p-2.5 rounded-full backdrop-blur-md transition-all"
          title={showTicker ? 'Hide Ticker' : 'Show Ticker'}
        >
          {showTicker ? <Eye className="w-4 h-4 text-emerald-400" /> : <EyeOff className="w-4 h-4 text-gray-400" />}
        </button>

        <button
          onClick={toggleMute}
          className="bg-black/60 hover:bg-black/90 text-white p-2.5 rounded-full backdrop-blur-md transition-all"
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-green-400" />}
        </button>

        <button
          onClick={toggleFullscreen}
          className="bg-black/60 hover:bg-black/90 text-white p-2.5 rounded-full backdrop-blur-md transition-all"
          title="Fullscreen"
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Bottom Ticker Tape (Large Broadcast Format) */}
      {showTicker && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-r from-red-950/95 via-slate-950/95 to-black/95 text-white py-3 sm:py-3.5 px-4 sm:px-6 border-t-2 border-red-600/70 backdrop-blur-md z-20 flex items-center overflow-hidden shadow-2xl">
          <div className="flex items-center gap-1.5 bg-red-600 text-white text-xs sm:text-sm font-black uppercase px-2.5 py-1 rounded mr-3 shrink-0 tracking-widest shadow-md select-none">
            <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
            <span>{isMultiView ? 'MULTI-VIEW' : isLiveSports ? 'LIVE SPORTS WIRE' : 'APEX NEWS FLASH'}</span>
          </div>
          <div className="whitespace-nowrap overflow-hidden flex-1">
            <div className="inline-block animate-marquee font-sans text-sm sm:text-base md:text-lg font-bold tracking-wide text-white drop-shadow">
              {[...tickerMessages, ...tickerMessages].join('     ◆     ')}
            </div>
          </div>
          <button
            onClick={() => setShowTicker(false)}
            className="ml-3 text-slate-400 hover:text-white p-1 rounded hover:bg-white/10 transition-colors shrink-0"
            title="Hide on-screen ticker"
          >
            <EyeOff className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2x2 QUAD-VIEW FEED SELECTION & MANAGEMENT MODAL          */}
      {/* ======================================================== */}
      {isFeedSelectorOpen && (
        <div className="absolute inset-0 z-30 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90%] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-2.5">
                <LayoutGrid className="w-5 h-5 text-blue-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {activeSlotToConfigure !== null
                      ? `Select Stream for Slot ${activeSlotToConfigure + 1}`
                      : 'Multi-View 2x2 Feed Manager'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Choose up to 4 simultaneous HLS live streams or add custom feeds
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsFeedSelectorOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 overflow-y-auto space-y-4">
              {/* Slot Target Indicator */}
              {activeSlotToConfigure !== null && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-blue-950/40 border border-blue-800/60 text-xs">
                  <div className="flex items-center gap-2 text-blue-200">
                    <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                    <span>Configuring Grid Quadrant Slot {activeSlotToConfigure + 1}</span>
                  </div>
                  <button
                    onClick={() => setActiveSlotToConfigure(null)}
                    className="text-blue-400 hover:underline font-mono text-[11px]"
                  >
                    View All 4 Slots
                  </button>
                </div>
              )}

              {/* 4 Quadrants Quick Overview */}
              {activeSlotToConfigure === null && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Current 4 Grid Slots
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {cameraFeeds.map((feed, idx) => (
                      <div
                        key={idx}
                        onClick={() => setActiveSlotToConfigure(idx)}
                        className="p-2.5 rounded-lg border border-slate-700 bg-slate-800/70 hover:border-blue-500 hover:bg-slate-800 cursor-pointer transition-all flex items-center justify-between group/slot"
                      >
                        <div className="truncate pr-2">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            <span>Slot {idx + 1}: {feed.label}</span>
                          </div>
                          <div className="text-[11px] text-slate-400 truncate">{feed.name}</div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveSlotToConfigure(idx);
                          }}
                          className="px-2 py-1 text-[10px] font-semibold bg-slate-700 group-hover/slot:bg-blue-600 text-slate-200 group-hover/slot:text-white rounded transition-colors"
                        >
                          Change
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Available Feed Presets */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  {activeSlotToConfigure !== null
                    ? `Assign Feed to Slot ${activeSlotToConfigure + 1}`
                    : 'Available Secondary Live Feeds'}
                </label>
                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {allAvailableFeeds.map((feed) => {
                    const isSelectedInAnySlot = selectedQuadFeedIds.includes(feed.id);
                    const isSelectedInCurrentSlot =
                      activeSlotToConfigure !== null &&
                      selectedQuadFeedIds[activeSlotToConfigure] === feed.id;

                    return (
                      <div
                        key={feed.id}
                        onClick={() => {
                          if (activeSlotToConfigure !== null) {
                            // Assign to targeted slot
                            const next = [...selectedQuadFeedIds];
                            next[activeSlotToConfigure] = feed.id;
                            setSelectedQuadFeedIds(next);
                            setIsFeedSelectorOpen(false);
                          } else {
                            // Quick toggle or replace slot 1
                            if (!isSelectedInAnySlot) {
                              const next = [...selectedQuadFeedIds];
                              next[0] = feed.id;
                              setSelectedQuadFeedIds(next);
                            }
                          }
                        }}
                        className={`p-2.5 rounded-lg border transition-all flex items-center justify-between cursor-pointer ${
                          isSelectedInCurrentSlot
                            ? 'bg-blue-900/40 border-blue-500 text-white'
                            : isSelectedInAnySlot
                            ? 'bg-slate-800/90 border-slate-600 text-slate-200 hover:border-slate-500'
                            : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="truncate pr-2">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-white">{feed.label}</span>
                            <span className="text-[11px] text-slate-400 font-normal">({feed.name})</span>
                          </div>
                          <div className="text-[11px] text-slate-400 truncate">{feed.description}</div>
                          <div className="text-[10px] font-mono text-slate-500 truncate mt-0.5">
                            {feed.streamUrl}
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center gap-1.5">
                          {isSelectedInCurrentSlot ? (
                            <span className="flex items-center gap-1 text-[11px] font-bold text-blue-400 bg-blue-950/80 px-2 py-0.5 rounded border border-blue-800">
                              <Check className="w-3 h-3" /> Active
                            </span>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const slot = activeSlotToConfigure ?? 0;
                                const next = [...selectedQuadFeedIds];
                                next[slot] = feed.id;
                                setSelectedQuadFeedIds(next);
                                if (activeSlotToConfigure !== null) {
                                  setIsFeedSelectorOpen(false);
                                }
                              }}
                              className="px-2.5 py-1 text-xs font-semibold rounded bg-blue-600 hover:bg-blue-500 text-white transition-colors"
                            >
                              Assign
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Add Custom HLS Stream Option */}
              <div className="pt-2 border-t border-slate-800">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Add Custom Stream to Grid (YouTube, HLS .m3u8, or MP4)
                </label>
                <div className="space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Feed Label (e.g. YouTube Live Ingest)"
                      value={customFeedName}
                      onChange={(e) => setCustomFeedName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                    />
                    <input
                      type="text"
                      placeholder="Stream URL (https://www.youtube.com/... or .m3u8)"
                      value={customStreamInput}
                      onChange={(e) => setCustomStreamInput(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                    />
                  </div>
                  <button
                    onClick={() => {
                      if (!customStreamInput.trim()) return;
                      const rawUrl = customStreamInput.trim();
                      const ytId = extractYouTubeVideoId(rawUrl);
                      const newId = `custom-cam-${Date.now()}`;
                      const name = customFeedName.trim() || (ytId ? `YouTube Feed (${ytId})` : `Custom Ingest ${customFeeds.length + 1}`);
                      const newFeed: CameraAngleFeed = {
                        id: newId,
                        name: name,
                        label: ytId ? `YT · ${name.slice(0, 10).toUpperCase()}` : `CUSTOM · ${name.slice(0, 10).toUpperCase()}`,
                        description: ytId ? 'Direct YouTube Ingest live feed' : 'User-configured custom secondary live stream feed',
                        streamUrl: ytId ? `https://www.youtube.com/watch?v=${ytId}` : rawUrl,
                      };
                      setCustomFeeds((prev) => [...prev, newFeed]);
                      // Auto assign to active slot or first slot
                      const slot = activeSlotToConfigure ?? 0;
                      const next = [...selectedQuadFeedIds];
                      next[slot] = newId;
                      setSelectedQuadFeedIds(next);
                      setCustomStreamInput('');
                      setCustomFeedName('');
                      if (activeSlotToConfigure !== null) {
                        setIsFeedSelectorOpen(false);
                      }
                    }}
                    disabled={!customStreamInput.trim()}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-md"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Feed & Assign to Grid Slot</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
              <span>Supports adaptive bitrate HLS (.m3u8) feeds with low-latency syncing</span>
              <button
                onClick={() => setIsFeedSelectorOpen(false)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Video Ingestion Modal */}
      {isCustomInjectOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Live Video Injector</h3>
                  <p className="text-[11px] text-slate-400">Inject ANY YouTube, MP4, or HLS stream into continuous TV playout</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCustomInjectOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Target Channel to Broadcast On
                </label>
                <select
                  value={customInjectTargetChannel}
                  onChange={(e) => setCustomInjectTargetChannel(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                >
                  {channels.map((ch) => (
                    <option key={ch.channelId} value={ch.channelId}>
                      CH {ch.channelNumber} · {ch.channelName} ({ch.callSign || ch.resolution})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Video Stream URL (YouTube, MP4, HLS .m3u8, or WebM)
                </label>
                <input
                  type="text"
                  placeholder="https://www.youtube.com/watch?v=... or https://.../stream.m3u8"
                  value={customInjectUrl}
                  onChange={(e) => setCustomInjectUrl(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Broadcast Program Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Special Broadcast Ingest / Live Keynote Replay"
                  value={customInjectTitle}
                  onChange={(e) => setCustomInjectTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Verified Quick Preset Ingests */}
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 font-mono">
                  Quick Ingest Presets:
                </span>
                <div className="grid grid-cols-2 gap-1.5 font-mono text-[10px]">
                  <button
                    type="button"
                    onClick={() => {
                      setCustomInjectUrl('https://www.youtube.com/watch?v=RyUoz0-hRLk');
                      setCustomInjectTitle('Apex Network 24/7 Studio Feed');
                    }}
                    className="p-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left text-slate-300 hover:text-white transition-colors truncate"
                  >
                    📺 Apex Studio 24/7 (YT)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomInjectUrl('https://www.youtube.com/watch?v=21X5lGlDOfg');
                      setCustomInjectTitle('NASA Space Station UHD Ingest');
                    }}
                    className="p-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left text-slate-300 hover:text-white transition-colors truncate"
                  >
                    🛰️ NASA ISS Live (YT)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomInjectUrl('https://test-streams.mux.dev/test_001/stream.m3u8');
                      setCustomInjectTitle('Mux HLS 1080p Master Ingest');
                    }}
                    className="p-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left text-slate-300 hover:text-white transition-colors truncate"
                  >
                    ⚡ Mux HLS Master Feed
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomInjectUrl('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4');
                      setCustomInjectTitle('4K Animation Test Reel (MP4)');
                    }}
                    className="p-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left text-slate-300 hover:text-white transition-colors truncate"
                  >
                    🎬 4K Master MP4 Feed
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsCustomInjectOpen(false)}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!customInjectUrl.trim()}
                onClick={() => {
                  const url = customInjectUrl.trim();
                  const title = customInjectTitle.trim() || 'Custom Network Ingest';
                  assignVideoToChannel?.(customInjectTargetChannel, {
                    title,
                    streamUrl: url,
                    durationMinutes: 45,
                    category: 'Custom Ingest',
                  });
                  context?.setActiveChannelId?.(customInjectTargetChannel);
                  setIsCustomInjectOpen(false);
                  setCustomInjectUrl('');
                  setCustomInjectTitle('');
                }}
                className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-lg shadow-emerald-600/30 flex items-center gap-1.5"
              >
                <Radio className="w-3.5 h-3.5" />
                <span>Inject to Channel Playout</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TVPlayer;
