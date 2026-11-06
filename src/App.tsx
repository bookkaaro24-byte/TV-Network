/**
 * Apex Digital TV Network - Main Application
 * 
 * Production-ready master broadcast control environment:
 * 1. Dual Viewing Mode: Linear 24/7 TV + VOD Catalog
 * 2. Primary Viewport Mode Switcher:
 *    - Single Broadcast Player (TVPlayer + Contextual Sports/Podcast Sidebar + Ticker)
 *    - MultiView Production Wall (6-Input Synchronized Multi-Monitor Wall with PGM & PVW tallies)
 *    - OBS Studio Scene Switcher (Dual Preview & Program Monitors, T-Bar Fader, Cut/Auto, Scenes 1-5)
 *    - YouTube Live Stream & OBS Output Engine (YouTube Ingest & Relay, Channel Selector, OBS Specs, Stream Preview)
 * 3. Channel Selector Ribbon: Instant tuning between CH 101, 102, 103, 104, and Live Studio
 * 4. Network Channel Guide Modal with 3-second live-motion thumbnail preview for each channel card
 * 5. Full EPG Schedule, VOD Library, In-browser Live Studio, and Media Ingest
 */

import React, { useState, useEffect, useRef } from 'react';
import { BroadcastProvider, useBroadcast } from './context/BroadcastContext';
import { BroadcastHeader } from './components/BroadcastHeader';
import { TVPlayer } from './components/TVPlayer';
import { InteractiveSidebar } from './components/InteractiveSidebar';
import { EPGGuide } from './components/EPGGuide';
import { VODCatalog } from './components/VODCatalog';
import { BroadcastControlRoom } from './components/BroadcastControlRoom';
import { MediaUploadModal } from './components/MediaUploadModal';
import { LiveStudioModal } from './components/LiveStudioModal';
import { MultiViewMonitorPanel } from './components/MultiViewMonitorPanel';
import { ObsSceneSwitcherPanel } from './components/ObsSceneSwitcherPanel';
import { DestinationControlPanel } from './components/DestinationControlPanel';
import { FlashNewsModal } from './components/FlashNewsModal';
import { ScreenSharePickerModal } from './components/ScreenSharePickerModal';
import { extractYouTubeVideoId } from './utils/youtube';
import {
  Tv,
  Radio,
  Zap,
  Activity,
  Layers,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Film,
  Calendar,
  Sliders,
  Youtube,
  Info,
  X,
  Play,
  Square,
  Volume2,
  Check,
  Eye,
  Clock,
  Monitor,
} from 'lucide-react';

const CHANNEL_PREVIEW_VIDEOS: Record<string, string> = {
  'apex-101': '/master_broadcast_feed.mp4', // Apex Master Broadcast Playout
  'apex-102': 'https://test-streams.mux.dev/test_001/stream.m3u8', // Live Sports Ingest
  'apex-103': 'https://www.youtube.com/watch?v=dp8PhLsUcFE', // Bloomberg Global Markets Live
  'apex-104': 'https://www.youtube.com/watch?v=21X5lGlDOfg', // NASA ISS Earth Live
};

const MainAppContent: React.FC = () => {
  const {
    viewingMode,
    setViewingMode,
    channels,
    activeChannelId,
    setActiveChannelId,
    activeChannel,
    playout,
    setIsControlRoomOpen,
    openControlRoomToTab,
    setIsLiveStudioOpen,
    isLiveStudioBroadcasting,
    selectedVodProgram,
    setIsUploadModalOpen,
    setIsFlashNewsModalOpen,
    screenShareStream,
    isScreenSharing,
    startScreenShare,
    stopScreenShare,
    setIsScreenShareModalOpen,
  } = useBroadcast();

  const [activeSection, setActiveSection] = useState<string>('player');

  // Primary Viewport Mode:
  // 'single' = TV Player + Contextual Sidebar
  // 'multiview' = 6-Grid Synchronized MultiView Wall
  // 'obs_switcher' = OBS Studio Mode Dual Monitor (Preview / Program + T-Bar)
  // 'youtube_stream' = YouTube Live & OBS Output Engine
  const [primaryViewMode, setPrimaryViewMode] = useState<
    'single' | 'multiview' | 'obs_switcher' | 'youtube_stream'
  >('single');

  // Auto-switch to single player when user enters VOD catalog or plays uploaded video
  useEffect(() => {
    if (viewingMode === 'vod' && primaryViewMode !== 'single') {
      setPrimaryViewMode('single');
    }
  }, [viewingMode, selectedVodProgram?.id]);

  // Channel Guide Modal & 3-Second Live-Motion Preview
  const [isChannelGuideOpen, setIsChannelGuideOpen] = useState<boolean>(false);
  const [previewingChannelId, setPreviewingChannelId] = useState<string | null>(null);
  const [previewTimeLeft, setPreviewTimeLeft] = useState<number>(3);
  const previewTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 3-Second Countdown Timer for Channel Motion Preview
  useEffect(() => {
    if (previewingChannelId) {
      setPreviewTimeLeft(3);
      if (previewTimerRef.current) clearInterval(previewTimerRef.current);

      previewTimerRef.current = setInterval(() => {
        setPreviewTimeLeft((prev) => {
          if (prev <= 1) {
            return 3; // Loop the 3-second motion preview continuously
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (previewTimerRef.current) clearInterval(previewTimerRef.current);
      setPreviewTimeLeft(3);
    }

    return () => {
      if (previewTimerRef.current) clearInterval(previewTimerRef.current);
    };
  }, [previewingChannelId]);

  // Support Public Web TV View (?view=public_tv&channel=apex-101)
  const [isPublicTvMode, setIsPublicTvMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('view') === 'public_tv';
    }
    return false;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const ch = params.get('channel');
      if (ch) {
        setActiveChannelId(ch);
      }
      if (params.get('view') === 'public_tv') {
        setIsPublicTvMode(true);
        setViewingMode('linear');
      }
    }
  }, [setActiveChannelId, setViewingMode]);

  const handleNavClick = (sectionId: string) => {
    setActiveSection(sectionId);
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSelectChannel = (channelId: string) => {
    setActiveChannelId(channelId);
    setViewingMode('linear');
    if (primaryViewMode !== 'single') {
      setPrimaryViewMode('single');
    }
  };

  return (
    <div className="min-h-screen bg-[#070a12] text-slate-100 flex flex-col selection:bg-blue-600 selection:text-white">
      {/* Top Bar Navigation */}
      <BroadcastHeader onNavClick={handleNavClick} activeSection={activeSection} />

      {/* Main Broadcast Container */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 py-6 space-y-8">
        {/* =================================================================== */}
        {/* SECTION 1: PRIMARY VIEWPORT (Player / MultiView / Switcher / Stream) */}
        {/* =================================================================== */}
        <section id="player" className="space-y-4">
          {/* Top Channel Switcher Ribbon & Station Directory Bar */}
          <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3 flex flex-col lg:flex-row lg:items-center justify-between gap-3 shadow-xl">
            {/* Channel Tabs */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-slate-400 text-xs font-bold mr-1 flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-red-500 animate-pulse" />
                <span className="uppercase tracking-wider">CHANNELS:</span>
              </span>

              {channels.map((ch) => {
                const isActive = activeChannelId === ch.channelId && !isLiveStudioBroadcasting;
                return (
                  <button
                    key={ch.channelId}
                    type="button"
                    onClick={() => handleSelectChannel(ch.channelId)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                      isActive
                        ? 'bg-red-600 text-white shadow-md shadow-red-600/40 ring-1 ring-red-400/50'
                        : 'bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800'
                    }`}
                  >
                    <span className="font-mono text-[11px] opacity-90">CH {ch.channelNumber}</span>
                    <span className="truncate max-w-[130px]">{ch.channelName.replace('Apex ', '')}</span>
                  </button>
                );
              })}

              {/* In-Browser Live Studio Button */}
              <button
                type="button"
                onClick={() => setIsLiveStudioOpen(true)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                  isLiveStudioBroadcasting
                    ? 'bg-red-600 text-white shadow-md shadow-red-600/40 animate-pulse'
                    : 'bg-red-950/40 hover:bg-red-900/40 text-red-300 border border-red-800/60'
                }`}
                title="Launch Live Studio to broadcast webcam, screen share, or news anchor"
              >
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                <span>🔴 My Studio Feed</span>
              </button>

              {/* Direct Screen Share Ingest Button */}
              <button
                type="button"
                onClick={() => {
                  if (isScreenSharing) {
                    stopScreenShare?.();
                  } else {
                    setIsScreenShareModalOpen?.(true);
                  }
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                  isScreenSharing
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/40 animate-pulse'
                    : 'bg-emerald-950/40 hover:bg-emerald-900/40 text-emerald-300 border border-emerald-800/60'
                }`}
                title={isScreenSharing ? 'Stop Screen Share and return to channel feed' : 'Choose Screen Share (Tabs, 4K Screen, App Window, or PiP) for broadcast and YouTube ingest'}
              >
                <Monitor className="w-3.5 h-3.5 text-emerald-400" />
                <span>{isScreenSharing ? '🖥️ Stop Screen Share' : '🖥️ Share Screen (Tabs/4K)'}</span>
              </button>
            </div>

            {/* Quick Action Buttons: YouTube & Ingest Settings + Where is my channel */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setPrimaryViewMode('youtube_stream')}
                className={`px-3 py-1.5 text-xs rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                  primaryViewMode === 'youtube_stream'
                    ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                    : 'bg-red-950/60 hover:bg-red-900/60 text-red-300 border border-red-800/80 shadow-sm'
                }`}
                title="Configure YouTube Stream Key & Ingest Output Settings"
              >
                <Youtube className="w-3.5 h-3.5 text-red-500 fill-red-500" />
                <span>YouTube &amp; Ingest Settings</span>
              </button>

              <button
                type="button"
                onClick={() => setIsFlashNewsModalOpen(true)}
                className="px-3 py-1.5 text-xs rounded-lg font-bold flex items-center gap-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 shadow-sm transition-all"
                title="Add Breaking News, Sports Scores or Market Updates to bottom Flash Ticker"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                <span>⚡ Flash News Ticker</span>
              </button>

              <button
                type="button"
                onClick={() => setIsChannelGuideOpen(true)}
                className="px-3 py-1.5 text-xs rounded-lg bg-blue-950/60 hover:bg-blue-900/60 text-blue-300 border border-blue-800/60 font-semibold flex items-center gap-1.5 transition-colors"
                title="Open station guide to preview and learn about each channel"
              >
                <Info className="w-3.5 h-3.5 text-blue-400" />
                <span>Where is my channel?</span>
              </button>
            </div>
          </div>

          {/* =================================================================== */}
          {/* PRIMARY VIEWPORT MODE SELECTOR (Single Player / MultiView / Switcher) */}
          {/* =================================================================== */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-1.5 flex flex-wrap items-center justify-between gap-2 shadow-lg">
            {/* View Mode Tabs */}
            <div className="flex flex-wrap items-center gap-1 flex-1">
              <button
                type="button"
                onClick={() => setPrimaryViewMode('single')}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${
                  primaryViewMode === 'single'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Tv className="w-4 h-4" />
                <span>Single Broadcast TV</span>
              </button>

              <button
                type="button"
                onClick={() => setPrimaryViewMode('multiview')}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${
                  primaryViewMode === 'multiview'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Layers className="w-4 h-4 text-emerald-400" />
                <span>MultiView Production Wall</span>
                <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 px-1.5 py-0.2 rounded font-mono font-bold">
                  6-TILES
                </span>
              </button>

              <button
                type="button"
                onClick={() => setPrimaryViewMode('obs_switcher')}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${
                  primaryViewMode === 'obs_switcher'
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Sliders className="w-4 h-4 text-purple-400" />
                <span>Studio Production Switcher</span>
                <span className="text-[10px] bg-purple-950 text-purple-300 border border-purple-800 px-1.5 py-0.2 rounded font-mono font-bold">
                  PVW / PGM
                </span>
              </button>

              <button
                type="button"
                onClick={() => setPrimaryViewMode('youtube_stream')}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${
                  primaryViewMode === 'youtube_stream'
                    ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Youtube className="w-4 h-4 text-red-500 fill-red-500" />
                <span>YouTube Live &amp; Streaming Hub</span>
                <span className="text-[10px] bg-red-950 text-red-300 border border-red-800 px-1.5 py-0.2 rounded font-mono font-bold">
                  STREAM PREVIEW
                </span>
              </button>
            </div>

            {/* Quick hot-switch button for instant live sports test */}
            <button
              type="button"
              onClick={() => playout.triggerHotSwitch(!playout.hotSwitch.isActive)}
              className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                playout.hotSwitch.isActive
                  ? 'bg-amber-950/80 border-amber-500/60 text-amber-300 font-bold'
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
              }`}
              title="Simulate instant cutover to Live Sports SRT Stadium Ingest"
            >
              <Zap
                className={`w-3.5 h-3.5 ${
                  playout.hotSwitch.isActive ? 'fill-amber-400 text-amber-400' : 'text-slate-400'
                }`}
              />
              <span>
                {playout.hotSwitch.isActive ? 'Hot-Switch Active (SRT)' : 'Hot-Switch Stadium Feed'}
              </span>
            </button>
          </div>

          {/* VIEWPORT CANVAS (PERSISTENT PLAYOUT: TVPlayer stays mounted and active so broadcast never stops!) */}
          <div className="relative">
            {/* MODE 1: SINGLE BROADCAST PLAYER + CONTEXTUAL SIDEBAR */}
            <div className={primaryViewMode === 'single' ? 'grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-fadeIn' : 'hidden'}>
              {/* Player Column (8 cols on large screens) */}
              <div className="lg:col-span-8 space-y-0 rounded-lg overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl">
                <TVPlayer />
              </div>

              {/* Adaptive Contextual Sidebar Column (4 cols on large screens) */}
              <div className="lg:col-span-4">
                <InteractiveSidebar />
              </div>
            </div>

            {/* MODE 2: MULTIVIEW PRODUCTION WALL (6-INPUT LIVE MONITORING) */}
            {primaryViewMode === 'multiview' && (
              <div className="animate-fadeIn">
                <MultiViewMonitorPanel />
              </div>
            )}

            {/* MODE 3: OBS SCENE SWITCHER & STUDIO (DUAL PVW/PGM + T-BAR) */}
            {primaryViewMode === 'obs_switcher' && (
              <div className="animate-fadeIn">
                <ObsSceneSwitcherPanel />
              </div>
            )}

            {/* MODE 4: YOUTUBE LIVE STREAM & OBS ENGINE */}
            {primaryViewMode === 'youtube_stream' && (
              <div className="animate-fadeIn">
                <DestinationControlPanel />
              </div>
            )}
          </div>
        </section>

        {/* =================================================================== */}
        {/* SECTION 2: ELECTRONIC PROGRAM GUIDE (EPG)                           */}
        {/* =================================================================== */}
        <div id="epg" className="pt-4">
          <EPGGuide />
        </div>

        {/* =================================================================== */}
        {/* SECTION 3: VOD ON-DEMAND CATALOG                                    */}
        {/* =================================================================== */}
        <div id="vod" className="pt-4">
          <VODCatalog />
        </div>

        {/* =================================================================== */}
        {/* SECTION 4: PLAYOUT TELEMETRY & ARCHITECTURAL SPECS                  */}
        {/* =================================================================== */}
        <section
          id="analytics"
          className="pt-4 pb-8 border-t border-slate-800/80 space-y-4 text-slate-300"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white tracking-tight">
                  Playout Infrastructure &amp; Low-Latency Specifications
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Technical pipeline specifications for SRT/RTMP ingest, SCTE-35 automation, and edge distribution
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsControlRoomOpen(true)}
              className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-semibold"
            >
              <span>Launch Control Room Console</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="bg-slate-950/70 p-4 rounded-lg border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 font-bold text-white">
                <Radio className="w-4 h-4 text-amber-400" />
                <span>Hot-Switching Architecture</span>
              </div>
              <p className="text-slate-400 leading-relaxed">
                Client-side state machine monitors systemic broadcast time and SRT handshake packets. Frame-accurate cuts maintain video decoder continuity with 0 frame drops.
              </p>
            </div>

            <div className="bg-slate-950/70 p-4 rounded-lg border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 font-bold text-white">
                <Sparkles className="w-4 h-4 text-blue-400" />
                <span>SCTE-35 Dynamic Ad Insertion</span>
              </div>
              <p className="text-slate-400 leading-relaxed">
                Dispatches timed cue markers during linear stream playback. Triggers automated advertiser overlays and synchronized reporting without interrupting background audio.
              </p>
            </div>

            <div className="bg-slate-950/70 p-4 rounded-lg border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 font-bold text-white">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Failover &amp; Watchdog Telemetry</span>
              </div>
              <p className="text-slate-400 leading-relaxed">
                Active heartbeat prober watches buffer underrun events. Timeout triggers exponential-backoff failover line within 3.2 seconds with full audit trail logging.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Broadcast Engineer Control Room Modal */}
      <BroadcastControlRoom />

      {/* Manual Video Upload & Ingest Modal */}
      <MediaUploadModal />

      {/* In-Browser Live Studio Playout Console (No External Hardware Needed) */}
      <LiveStudioModal />

      {/* Advanced Screen Share Picker (Tabs, Monitor 4K, Window, PiP, Audio Loopback) */}
      <ScreenSharePickerModal />

      {/* ===================================================================== */}
      {/* NETWORK CHANNEL GUIDE MODAL WITH 3-SECOND LIVE-MOTION PREVIEWS        */}
      {/* ===================================================================== */}
      {isChannelGuideOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-3xl w-full p-6 space-y-5 shadow-2xl animate-fadeIn my-auto text-slate-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
                  <Tv className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Network Channel Guide &amp; Live Previews</h3>
                  <p className="text-xs text-slate-400">
                    Preview 3-second live-motion thumbnails of any channel before tuning in
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsChannelGuideOpen(false);
                  setPreviewingChannelId(null);
                }}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Channels Directory with 3-Second Motion Previews */}
            <div className="space-y-4 text-xs">
              <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-white flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>24/7 Linear Channels Directory</span>
                  </h4>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Click Preview to verify video motion
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
                  {channels.map((ch) => {
                    const isTunedIn = activeChannelId === ch.channelId;
                    const isPreviewing = previewingChannelId === ch.channelId;
                    const liveShow =
                      ch.programs?.find((p) => Date.now() >= p.startTime && Date.now() < p.endTime) ||
                      ch.programs?.[0];
                    const previewUrl =
                      liveShow?.streamUrl ||
                      CHANNEL_PREVIEW_VIDEOS[ch.channelId] ||
                      '/master_broadcast_feed.mp4';
                    const previewYtId = extractYouTubeVideoId(previewUrl);

                    return (
                      <div
                        key={ch.channelId}
                        className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between gap-3 ${
                          isTunedIn
                            ? 'bg-red-950/30 border-red-500/80 shadow-md ring-1 ring-red-500/40'
                            : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div>
                          {/* Channel Header */}
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-red-400 font-black text-xs px-2 py-0.5 rounded bg-red-950 border border-red-800">
                                CH {ch.channelNumber}
                              </span>
                              <span className="font-bold text-white text-xs truncate">
                                {ch.channelName}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {ch.resolution}
                            </span>
                          </div>

                          <p className="text-[11px] text-slate-300 line-clamp-1 mb-2">
                            <span className="text-red-400 font-mono font-bold mr-1">● ON AIR:</span>
                            <span className="font-semibold text-white">{liveShow?.title || ch.channelName}</span>
                          </p>

                          {/* 3-Second Live-Motion Video Preview Box */}
                          {isPreviewing ? (
                            <div className="relative aspect-video rounded-lg overflow-hidden border border-red-500/80 shadow-lg bg-black animate-fadeIn">
                              {previewYtId ? (
                                <iframe
                                  key={`guide-yt-${ch.channelId}-${previewYtId}`}
                                  src={`https://www.youtube.com/embed/${previewYtId}?autoplay=1&mute=1&controls=0&playsinline=1&enablejsapi=1`}
                                  className="w-full h-full border-0 pointer-events-none"
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media"
                                  title={`Preview ${ch.channelName}`}
                                />
                              ) : (
                                <video
                                  key={`guide-vid-${ch.channelId}-${previewUrl}`}
                                  src={previewUrl}
                                  autoPlay
                                  loop
                                  muted
                                  playsInline
                                  className="w-full h-full object-cover"
                                />
                              )}

                              {/* Countdown Badge & Live Tally */}
                              <div className="absolute top-2 left-2 bg-black/80 backdrop-blur-md px-2 py-0.5 rounded border border-red-500/80 font-mono text-[10px] font-bold text-white flex items-center gap-1.5 shadow">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                                <span>LIVE CHANNEL FEED</span>
                              </div>

                              <div className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-md px-2 py-0.5 rounded border border-slate-700 font-mono text-[10px] font-bold text-cyan-400 shadow flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>{previewTimeLeft}s LOOP</span>
                              </div>
                            </div>
                          ) : (
                            <div className="relative aspect-video rounded-lg overflow-hidden border border-slate-800 bg-slate-950 flex items-center justify-center group">
                              <div className="text-center p-2 space-y-1">
                                <Tv className="w-6 h-6 text-slate-600 mx-auto group-hover:text-slate-400 transition-colors" />
                                <span className="text-[10px] text-slate-400 font-mono block">
                                  Click Preview to Watch Loop
                                </span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Card Actions: Preview Button + Assign Video + Tune In Button */}
                        <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
                          <button
                            type="button"
                            onClick={() => {
                              if (isPreviewing) {
                                setPreviewingChannelId(null);
                              } else {
                                setPreviewingChannelId(ch.channelId);
                              }
                            }}
                            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-colors ${
                              isPreviewing
                                ? 'bg-amber-600 hover:bg-amber-500 text-white shadow'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white'
                            }`}
                            title="Preview 3-second live-motion thumbnail"
                          >
                            {isPreviewing ? (
                              <>
                                <Square className="w-3 h-3 fill-current" />
                                <span>Stop</span>
                              </>
                            ) : (
                              <>
                                <Play className="w-3 h-3 fill-current text-emerald-400" />
                                <span>Preview (3s)</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setIsChannelGuideOpen(false);
                              setIsUploadModalOpen(true);
                            }}
                            className="py-1.5 px-2.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 transition-colors flex items-center gap-1"
                            title="Assign a video to this channel"
                          >
                            <Radio className="w-3 h-3" />
                            <span>Assign</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              handleSelectChannel(ch.channelId);
                              setIsChannelGuideOpen(false);
                              setPreviewingChannelId(null);
                            }}
                            className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
                              isTunedIn
                                ? 'bg-red-600 text-white shadow-sm'
                                : 'bg-blue-600 hover:bg-blue-500 text-white'
                            }`}
                          >
                            {isTunedIn ? 'Tuned In' : 'Tune In'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Guide Item 2: Live Studio Broadcast */}
              <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-2">
                <h4 className="font-bold text-sm text-white flex items-center gap-2">
                  <Radio className="w-4 h-4 text-red-500" />
                  <span>How to Broadcast Live on Your Channel ("Go Live")</span>
                </h4>
                <p className="text-slate-400 leading-relaxed">
                  Click the red <strong>"Go Live"</strong> button in the top navigation bar. You can choose your <strong>Webcam</strong>, <strong>Screen Share</strong>, or <strong>Virtual News Desk</strong>. Clicking <em>"🔴 GO LIVE ON NETWORK"</em> immediately switches the main program feed to your live transmission.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setIsChannelGuideOpen(false);
                    setIsLiveStudioOpen(true);
                  }}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg text-xs flex items-center gap-2 mt-1 transition-colors"
                >
                  <Radio className="w-3.5 h-3.5" />
                  <span>Open In-Browser Live Studio Now</span>
                </button>
              </div>

              {/* Guide Item 3: Streaming to YouTube Live */}
              <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-2">
                <h4 className="font-bold text-sm text-white flex items-center gap-2">
                  <Youtube className="w-4 h-4 text-red-500 fill-red-500" />
                  <span>How to Select What Stream to Send to YouTube</span>
                </h4>
                <p className="text-slate-400 leading-relaxed">
                  Click <strong>"YouTube &amp; OBS Settings"</strong> in the top ribbon. Under the <strong>"Select Broadcast Feed to Transmit to YouTube"</strong> card, choose between CH 101, CH 102 Sports, CH 103 Tech, CH 104 Business, or Master PGM. Verify quality using the new <strong>Stream Preview Monitor</strong> with real-time latency overlay before clicking <em>"Start YouTube Live"</em>.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setIsChannelGuideOpen(false);
                    setPrimaryViewMode('youtube_stream');
                  }}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg text-xs flex items-center gap-2 mt-1 transition-colors shadow-md"
                >
                  <Youtube className="w-3.5 h-3.5 fill-white text-white" />
                  <span>Open YouTube &amp; OBS Settings Now</span>
                </button>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setIsChannelGuideOpen(false);
                  setPreviewingChannelId(null);
                }}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Flash News & Lower-Third Ticker Editor Modal */}
      <FlashNewsModal />

      {/* Footer */}
      <footer className="bg-slate-950 border-t border-slate-800/80 py-6 px-6 text-xs text-slate-500">
        <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="font-bold text-slate-300">APEX BROADCAST NETWORK</span>
            <span aria-hidden="true">·</span>
            <span>Digital TV &amp; Playout Architecture</span>
          </div>

          <div className="flex items-center gap-6 text-slate-400">
            <span>24/7 Linear Playout</span>
            <span>SRT Ingest 60fps</span>
            <span>HLS Adaptive Bitrate</span>
            <span>SCTE-35 Splicer</span>
          </div>

          <div className="text-slate-500 font-mono">
            © 2026 Apex Broadcast Systems
          </div>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <BroadcastProvider>
      <MainAppContent />
    </BroadcastProvider>
  );
}
