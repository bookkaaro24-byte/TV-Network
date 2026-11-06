/**
 * Broadcast & Playout Architecture Type Definitions
 * Supporting Linear TV, Hot-Switching Ingest, EPG Guide, VOD, and Contextual Interactivity.
 */

export type ContentType = 'podcast' | 'sports' | 'business';

export type StreamProtocol = 'HLS' | 'SRT' | 'RTMP' | 'DASH';

export interface AdInsertionMarker {
  id: string;
  cueTimeOffsetSeconds: number; // Offset from start of program in seconds
  durationSeconds: number;
  type: 'pre_roll' | 'mid_roll' | 'post_roll' | 'overlay_lower_third';
  title: string;
  advertiser: string;
  adCreativeUrl?: string; // Playable video stream URL of the commercial
  callToActionUrl?: string;
  callToActionText?: string;
  thumbnailUrl?: string;
  status: 'pending' | 'active' | 'completed' | 'skipped';
}

export interface NonLinearAd {
  isActive: boolean;
  type: 'corner_bug' | 'l_bar';
  advertiser: string;
  title: string;
  tagline: string;
  promoCode?: string;
  callToActionText?: string;
  callToActionUrl?: string;
  sponsorLogoUrl?: string;
  customLBarGraphicUrl?: string;
  durationSeconds: number;
  timeRemainingSeconds: number;
}

export interface SportsTeam {
  name: string;
  code: string;
  logo: string;
  rank?: string;
  color?: string;
}

export interface SportsMatchEvent {
  id: string;
  minute: string;
  type: 'goal' | 'point' | 'foul' | 'card' | 'turnover' | 'substitution';
  description: string;
  team: 'home' | 'away';
}

export interface SportsMatchData {
  teams: {
    home: SportsTeam;
    away: SportsTeam;
  };
  score: {
    home: number;
    away: number;
  };
  timeElapsed: string;
  liveStatus: 'scheduled' | 'live' | 'half_time' | 'final' | 'break';
  league: string;
  venue?: string;
  events?: SportsMatchEvent[];
  stats?: {
    possession?: [number, number]; // [home%, away%]
    shotsOnTarget?: [number, number];
    totalShots?: [number, number];
    fouls?: [number, number];
    passAccuracy?: [number, number];
  };
}

export interface PodcastNote {
  timestamp: string;
  topic: string;
  summary: string;
}

export interface BroadcastProgram {
  id: string;
  title: string;
  category: string;
  startTime: number; // Unix timestamp in ms
  endTime: number;   // Unix timestamp in ms
  streamUrl: string;
  contentType: ContentType;
  description: string;
  thumbnail: string;
  hostOrTeams?: string;
  durationMinutes: number;
  isLive?: boolean;
  adCuePoints?: AdInsertionMarker[];
  sportsData?: SportsMatchData;
  podcastNotes?: {
    executiveSummary: string;
    keyTakeaways: string[];
    timestamps: PodcastNote[];
    downloadFileName: string;
  };
  businessData?: {
    marketFocus: string;
    keyMetrics: Array<{ label: string; value: string; change: string; isPositive: boolean }>;
    downloadableDeckUrl: string;
  };
  tags?: string[];
}

export interface EPGSchedule {
  channelId: string;
  channelName: string;
  channelNumber: number;
  callSign: string;
  resolution: string;
  programs: BroadcastProgram[];
  day: string; // e.g. "2026-10-12"
  isFavorite?: boolean;
}

export interface PlayoutAnalytics {
  viewerEngagementMinutes: number;
  bufferStallCount: number;
  bufferStallDurationSeconds: number;
  currentBitrateKbps: number;
  averageBitrateKbps: number;
  droppedFrames: number;
  latencyMs: number;
  adImpressions: number;
  totalWatchTimeSeconds: number;
  playbackQuality: string;
}

export interface HotSwitchState {
  isActive: boolean;
  sourceType: 'scheduled_vod' | 'live_srt_rtmp';
  feedProtocol: StreamProtocol;
  ingestEndpoint: string;
  targetProgramId?: string;
  switchTimestamp?: number;
  latencyMs: number;
  status: 'idle' | 'transitioning' | 'live_ingest';
}

export type PlayoutEventType =
  | 'PROGRAM_STARTED'
  | 'PROGRAM_ENDED'
  | 'HOT_SWITCH_INITIATED'
  | 'HOT_SWITCH_COMPLETED'
  | 'AD_BREAK_START'
  | 'AD_BREAK_END'
  | 'STREAM_TIMEOUT'
  | 'STREAM_RECOVERED'
  | 'BUFFER_STALL'
  | 'QUALITY_CHANGED';

export interface PlayoutLogEvent {
  id: string;
  timestamp: number;
  type: PlayoutEventType;
  message: string;
  metadata?: Record<string, unknown>;
}

export interface ChatMessage {
  id: string;
  sender: string;
  avatar?: string;
  role: 'viewer' | 'moderator' | 'analyst' | 'subscriber' | 'vip';
  text: string;
  timestamp: string;
}

export interface PollData {
  id: string;
  question: string;
  options: Array<{
    id: string;
    text: string;
    votes: number;
  }>;
  totalVotes: number;
  userVotedId?: string;
}

export interface TickerItem {
  id: string;
  category: 'BREAKING' | 'SPORTS' | 'MARKETS' | 'TECH' | 'BUSINESS' | 'AI' | string;
  headline: string;
  tag?: string;
  change?: string;
  isPositive?: boolean;
  source?: string;
  timestamp?: string;
}

// =========================================================================
// SCTE-35 Digital Program Insertion Cue Marker Architecture
// =========================================================================

export type SCTE35CommandType =
  | 'splice_insert'
  | 'time_signal'
  | 'splice_null'
  | 'bandwidth_reservation';

export type SCTE35SegmentationType =
  | '0x34_provider_ad_start'
  | '0x35_provider_ad_end'
  | '0x30_provider_placement_start'
  | '0x31_provider_placement_end'
  | '0x10_program_start'
  | '0x11_program_end'
  | '0x22_distributor_ad_start'
  | '0x23_distributor_ad_end';

export interface SCTE35CueMarker {
  id: string;
  eventId: number;
  commandType: SCTE35CommandType;
  ptsTime: number; // Presentation Time Stamp (90kHz clock)
  ptsTimeFormatted: string; // e.g. "01:24:18.520"
  durationSeconds: number; // Break duration in seconds
  isOutNetwork: boolean; // true = program out (break start), false = return to network
  segmentationType?: SCTE35SegmentationType;
  segmentationTypeName: string; // Human-readable e.g. "Provider Advertisement Start"
  upid: string; // Unique Program ID (e.g. "ADS-NA-2026-X992")
  subSegmentNum?: number;
  subSegmentsExpected?: number;
  hexPayload: string; // Raw SCTE-35 byte stream representation
  base64Payload: string;
  timestamp: number; // Detection time ms
  status: 'upcoming' | 'active' | 'completed';
  prerollSeconds?: number;
  adCreativeUrl?: string;
  adTitle?: string;
  advertiser?: string;
  callToActionUrl?: string;
}

// =========================================================================
// In-Browser Live Playout Studio (OBS-Free Broadcast)
// =========================================================================

export interface InAppLiveStudioSession {
  isBroadcasting: boolean;
  streamId: string;
  title: string;
  startedAt: number | null;
  durationSeconds: number;
  hasWebcam: boolean;
  hasMicrophone: boolean;
  hasScreenShare: boolean;
  layout: 'camera_only' | 'screen_pip' | 'screen_split' | 'screen_only';
  audioLevel: number; // 0 - 100 VU
  recordedBlob: Blob | null;
  savedToDrive: boolean;
  driveFileId?: string;
}

// =========================================================================
// Real-Time HLS Telemetry & Diagnostic Metrics (Hls.js Events API)
// =========================================================================

export interface HlsFragmentMetric {
  id: string;
  sn: number;
  url: string;
  latencyMs: number;
  durationSec: number;
  byteSize: number;
  bandwidthMbps: number;
  timestamp: number;
  levelIndex: number;
  bitrateKbps: number;
  resolution?: string;
  status: 'ok' | 'error' | 'timeout';
}

export interface HlsLevelInfo {
  index: number;
  bitrateKbps: number;
  width: number;
  height: number;
  name?: string;
  codecs?: string;
}

export interface HlsDiagnosticMetrics {
  isHlsActive: boolean;
  streamUrl: string;
  bufferLengthSeconds: number;
  bufferHealth: 'optimal' | 'healthy' | 'low' | 'starvation';
  currentBitrateKbps: number;
  currentResolution: string;
  currentLevelIndex: number;
  totalLevels: number;
  availableLevels: HlsLevelInfo[];
  lastFragmentLatencyMs: number;
  averageFragmentLatencyMs: number;
  lastFragmentBandwidthMbps: number;
  lastFragmentByteSize: number;
  totalFragmentsLoaded: number;
  recentFragments: HlsFragmentMetric[];
  droppedFrames: number;
  bufferStallCount: number;
  autoLevelCapping: number;
  isLive: boolean;
  lastUpdated: number;
  isManualLevelLocked: boolean;
  manualLevelIndex: number; // -1 for Auto ABR
  is4KDetected?: boolean;
  maxBufferLengthConfig?: number;
  maxMaxBufferLengthConfig?: number;
  maxBufferSizeMBConfig?: number;
  totalFrames?: number;
  corruptedFrames?: number;
  dropRatePercent?: number;
  activeVideoCodec?: string;
  activeAudioCodec?: string;
  isHevcDetected?: boolean;
  isAudioOnlyDetected?: boolean;
  hardwareDecoderPipeline?: string;
}

// =========================================================================
// OBS Studio Mode & Scene Architecture
// =========================================================================

export type ObsSourceType =
  | 'camera'
  | 'display'
  | 'srt_ingest'
  | 'vod_clip'
  | 'graphic_overlay'
  | 'audio_input'
  | 'browser_source';

export interface ObsSourceItem {
  id: string;
  name: string;
  type: ObsSourceType;
  enabled: boolean;
  muted?: boolean;
  volume?: number; // 0 - 100
  streamUrl?: string;
  zIndex: number;
  opacity?: number;
  cropOrPip?: 'fullscreen' | 'pip_bottom_right' | 'pip_top_right' | 'split_left' | 'split_right';
}

export interface ObsScene {
  id: string;
  name: string;
  sources: ObsSourceItem[];
  transitionDurationMs: number;
}

export interface ObsStudioState {
  previewSceneId: string;
  programSceneId: string;
  isStudioMode: boolean; // Dual Program/Preview bus vs Single
  transitionType: 'cut' | 'fade' | 'slide' | 'wipe';
  transitionProgress: number; // 0 to 1 for T-bar slider
  isStreaming: boolean;
  isRecording: boolean;
  fps: number;
  droppedFramesPercent: number;
}

// =========================================================================
// SRT Latency & Jitter Telemetry (Sparkline Graph)
// =========================================================================

export interface SrtHealthSample {
  timestamp: number;
  latencyMs: number;
  jitterMs: number;
  packetLossPercent: number;
  rttMs: number;
  bitrateKbps: number;
  bufferDepthMs: number;
}

export interface SrtIngestHealthMetrics {
  currentLatencyMs: number;
  currentJitterMs: number;
  packetLossPercent: number;
  rttMs: number;
  bitrateKbps: number;
  bufferDepthMs: number;
  minLatencyMs: number;
  maxLatencyMs: number;
  averageLatencyMs: number;
  averageJitterMs: number;
  history: SrtHealthSample[];
  status: 'optimal' | 'stable' | 'jitter_spike' | 'packet_loss';
}

// =========================================================================
// Video Stitcher API System (SSAI & Manifest Manipulation)
// =========================================================================

export interface VideoStitcherSession {
  sessionId: string;
  streamName: string;
  slateUrl: string;
  adTagUri: string;
  stitchStatus: 'active' | 'ad_break' | 'slate_fallback' | 'idle';
  currentAdBreak?: {
    breakId: string;
    durationSeconds: number;
    elapsedSeconds: number;
    adTitle: string;
    advertiser: string;
    vastTag: string;
  };
  stitchedManifestHls: string;
  totalAdsInserted: number;
  totalBreakTimeSeconds: number;
  vodStitchQueue: Array<{ id: string; title: string; duration: number }>;
}

