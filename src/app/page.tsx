/**
 * Next.js 14+ App Router Page Entry: app/page.tsx
 * Digital TV Network (Linear TV + VOD + Live Sports Ingest)
 * Connects TVPlayer, EPGGuide, and Interactive Features with State Management
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { TVPlayer, SportsScoreboard } from '../components/TVPlayer';
import { EPGGuide, Program } from '../components/EPGGuide';
import { BroadcastHeader } from '../components/BroadcastHeader';
import { InteractiveSidebar } from '../components/InteractiveSidebar';
import { VODCatalog } from '../components/VODCatalog';
import { BroadcastControlRoom } from '../components/BroadcastControlRoom';
import { MediaUploadModal } from '../components/MediaUploadModal';
import { LiveStudioModal } from '../components/LiveStudioModal';
import { LowerThirdTicker } from '../components/LowerThirdTicker';
import { BroadcastProvider, useBroadcast } from '../context/BroadcastContext';
import { SAMPLE_STREAMS } from '../data/mockBroadcastData';
import {
  Tv,
  Film,
  Zap,
  Activity,
  Calendar,
  Radio,
  Share2,
  Download,
  Flame,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  Info,
  X,
  Youtube,
  Sliders,
} from 'lucide-react';

// Sample 24-Hour Network Schedule for Standalone / Linear Timeline
const INITIAL_SCHEDULE: Program[] = [
  {
    id: 'prog-1',
    title: 'Morning Edge: Market Briefs & AI News',
    category: 'tech',
    startTime: '08:00',
    endTime: '09:00',
  },
  {
    id: 'prog-2',
    title: 'How to Build & Scale a $1M B2B SaaS Startup',
    category: 'business',
    startTime: '09:00',
    endTime: '10:30',
  },
  {
    id: 'prog-3',
    title: 'LIVE: Regional Football Championship Semi-Final',
    category: 'sports',
    startTime: '10:30',
    endTime: '12:30',
    isLiveNow: true,
  },
  {
    id: 'prog-4',
    title: 'AI Engineering: Building Production Agents with Gemini API',
    category: 'tech',
    startTime: '12:30',
    endTime: '14:00',
  },
  {
    id: 'prog-5',
    title: 'Venture Capital & Founders Podcast: Uncensored Talks',
    category: 'podcast',
    startTime: '14:00',
    endTime: '16:00',
  },
];

// Content Stream Mapping with Public Test HLS Streams & Real-Time Tickers
const STREAM_MAP: Record<
  string,
  {
    url: string;
    ticker: string[];
    isSports?: boolean;
    sportsData?: SportsScoreboard;
  }
> = {
  'prog-1': {
    url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    ticker: [
      'AI UPDATE: New multimodal reasoning models launched across major clouds',
      'MARKETS: Global tech equities advance +2.1% in morning trading',
      'DEVELOPER TRENDS: TypeScript 5.8 adopts faster isolated declarations',
    ],
  },
  'prog-2': {
    url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    ticker: [
      'BUSINESS PLAYBOOK: Optimizing Net Revenue Retention (NRR) above 120%',
      'FUNDING: Seed stage venture rounds averaging $3.5M in Q4',
      'FOUNDER STRATEGY: Zero-CAC product led growth models outperforming traditional sales',
    ],
  },
  'prog-3': {
    url: SAMPLE_STREAMS.SPORTS_LIVE,
    isSports: true,
    sportsData: {
      homeTeam: 'FC BARCELONA',
      awayTeam: 'REAL MADRID',
      homeScore: 2,
      awayScore: 1,
      timeElapsed: "74'",
    },
    ticker: [
      'LIVE MATCH: FC Barcelona leading 2-1 against Real Madrid in 74th minute',
      'ESTADIO OLÍMPIC: Capacity attendance 50,301 fans in attendance',
      'MATCH STATS: Shots on target 8 vs 5 | Possession 58% vs 42%',
    ],
  },
  'prog-4': {
    url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    ticker: [
      'AI LABS: Autonomous coding agents reach production reliability benchmarks',
      'DEV TOOLS: Next.js App Router streaming architecture best practices',
      'LATENCY WATCH: Edge CDN caching reduces time-to-first-byte under 25ms',
    ],
  },
  'prog-5': {
    url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    ticker: [
      'PODCAST: Episode #42 - Scaling Linear & OTT Media Networks to Millions',
      'SPONSOR: Cloud playout powered by SRT Low-Latency Playout Engine',
    ],
  },
};

function TVNetworkView() {
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
  } = useBroadcast();

  const [activeSection, setActiveSection] = useState<string>('player');
  const [selectedProgramId, setSelectedProgramId] = useState<string>('prog-3');
  const [schedule] = useState<Program[]>(INITIAL_SCHEDULE);
  const [isChannelGuideOpen, setIsChannelGuideOpen] = useState<boolean>(false);

  // Active stream details: dynamically switch between VOD media, Live Hot-Switch, and Linear EPG
  const activeStreamConfig = useMemo(() => {
    if (viewingMode === 'vod' && selectedVodProgram) {
      const isSports =
        selectedVodProgram.category?.toLowerCase().includes('sports') ||
        selectedVodProgram.contentType === 'sports';

      return {
        url: selectedVodProgram.streamUrl,
        isSports,
        sportsData: isSports
          ? {
              homeTeam: selectedVodProgram.hostOrTeams?.split(' vs ')?.[0] || 'INTER MILAN',
              awayTeam: selectedVodProgram.hostOrTeams?.split(' vs ')?.[1] || 'BAYERN MUNICH',
              homeScore: 2,
              awayScore: 1,
              timeElapsed: 'FT',
            }
          : undefined,
        ticker: [
          `VOD ON DEMAND: Playing "${selectedVodProgram.title}"`,
          `CATEGORY: ${selectedVodProgram.category} • ${selectedVodProgram.durationMinutes || 30} mins`,
          selectedVodProgram.description || 'Apex Broadcast Network VOD Playout',
        ],
      };
    }

    if (playout.hotSwitch.isActive) {
      return {
        url: playout.activeStreamUrl,
        isSports: true,
        sportsData: {
          homeTeam: 'FC BARCELONA',
          awayTeam: 'REAL MADRID',
          homeScore: 2,
          awayScore: 1,
          timeElapsed: "74'",
        },
        ticker: [
          'LIVE SRT INGEST OVERRIDE: Low-latency master feed active',
          'MATCH: FC Barcelona leading 2-1 against Real Madrid in 74th minute',
        ],
      };
    }

    return (
      STREAM_MAP[selectedProgramId] || {
        url: playout.activeStreamUrl,
        ticker: [
          'APEX NETWORK: 24/7 Digital Broadcast Playout Active',
          'UP NEXT: Live Sports & In-Depth Tech Analysis',
        ],
      }
    );
  }, [viewingMode, selectedVodProgram, playout.hotSwitch.isActive, playout.activeStreamUrl, selectedProgramId]);

  const handleNavClick = (sectionId: string) => {
    setActiveSection(sectionId);
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleProgramSelect = (prog: Program) => {
    setSelectedProgramId(prog.id);
  };

  return (
    <div className="min-h-screen bg-[#070a12] text-slate-100 flex flex-col selection:bg-blue-600 selection:text-white">
      {/* Broadcast Global Header with Navigation, Omni-Search & Firebase Auth */}
      <BroadcastHeader onNavClick={handleNavClick} activeSection={activeSection} />

      {/* Main Broadcast Application Canvas */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 py-6 space-y-8">
        {/* =================================================================== */}
        {/* SECTION 1: PRIMARY VIEWPORT (Player + Contextual Sidebar + Ticker) */}
        {/* =================================================================== */}
        <section id="player" className="space-y-3">
          {/* Channel Selector & Station Guide Ribbon */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-lg">
            {/* Channel Tabs */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-slate-400 text-xs font-bold mr-1 flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-red-500" />
                <span>CHANNELS:</span>
              </span>

              {channels.map((ch) => (
                <button
                  key={ch.channelId}
                  onClick={() => {
                    setActiveChannelId(ch.channelId);
                    setViewingMode('linear');
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                    activeChannelId === ch.channelId && !isLiveStudioBroadcasting
                      ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800'
                  }`}
                >
                  <span className="font-mono text-[11px] opacity-90">CH {ch.channelNumber}</span>
                  <span className="truncate max-w-[140px]">{ch.channelName.replace('Apex ', '')}</span>
                </button>
              ))}

              {/* In-Browser Live Studio Button */}
              <button
                onClick={() => setIsLiveStudioOpen(true)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                  isLiveStudioBroadcasting
                    ? 'bg-red-600 text-white shadow-md shadow-red-600/40 animate-pulse'
                    : 'bg-red-950/40 hover:bg-red-900/40 text-red-300 border border-red-800/60'
                }`}
                title="Launch Live Studio to broadcast your own video feed"
              >
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                <span>🔴 My Studio Feed</span>
              </button>
            </div>

            {/* Where is my channel? Guide Button & Viewing Mode */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => openControlRoomToTab('simulcast')}
                className="px-2.5 py-1 text-xs rounded-lg bg-red-950/70 hover:bg-red-900/70 text-red-300 border border-red-800/80 font-bold flex items-center gap-1.5 transition-colors shadow-sm"
                title="Configure YouTube Stream Key & OBS Output Settings"
              >
                <Youtube className="w-3.5 h-3.5 text-red-500 fill-red-500" />
                <span>YouTube &amp; OBS Settings</span>
              </button>

              <button
                onClick={() => setIsChannelGuideOpen(true)}
                className="px-2.5 py-1 text-xs rounded-lg bg-blue-950/60 hover:bg-blue-900/60 text-blue-300 border border-blue-800/60 font-semibold flex items-center gap-1.5 transition-colors"
                title="Learn how to find, manage, and broadcast to your channel"
              >
                <Info className="w-3.5 h-3.5 text-blue-400" />
                <span>Where is my channel?</span>
              </button>

              {/* Viewing Mode Toggle */}
              <div className="flex items-center p-0.5 bg-slate-900 rounded-lg border border-slate-800 text-xs">
                <button
                  onClick={() => setViewingMode('linear')}
                  className={`px-2.5 py-1 rounded transition-colors font-medium flex items-center gap-1 ${
                    viewingMode === 'linear'
                      ? 'bg-red-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Tv className="w-3 h-3" />
                  <span>Linear</span>
                </button>
                <button
                  onClick={() => setViewingMode('vod')}
                  className={`px-2.5 py-1 rounded transition-colors font-medium flex items-center gap-1 ${
                    viewingMode === 'vod'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Film className="w-3 h-3" />
                  <span>VOD</span>
                </button>
              </div>

              {/* Quick Hot-Switch button for testing */}
              <button
                onClick={() => playout.triggerHotSwitch(!playout.hotSwitch.isActive)}
                className={`hidden lg:flex items-center gap-1.5 px-3 py-1 text-xs rounded-lg border transition-colors ${
                  playout.hotSwitch.isActive
                    ? 'bg-amber-950/80 border-amber-500/60 text-amber-300'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
                }`}
                title="Simulate instant cutover to Live Sports SRT Ingest"
              >
                <Zap
                  className={`w-3.5 h-3.5 ${
                    playout.hotSwitch.isActive ? 'fill-amber-400 text-amber-400' : 'text-slate-400'
                  }`}
                />
                <span>
                  {playout.hotSwitch.isActive ? 'SRT Live' : 'Hot-Switch'}
                </span>
              </button>
            </div>
          </div>

          {/* Main Dual Grid: Player Column (Player + LowerThirdTicker) + Contextual Sidebar */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Player Column (8 cols on large screens) */}
            <div className="lg:col-span-8 space-y-3">
              <div className="rounded-lg overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl">
                <TVPlayer
                  streamUrl={activeStreamConfig.url}
                  isLiveSports={activeStreamConfig.isSports}
                  sportsData={activeStreamConfig.sportsData}
                  tickerMessages={activeStreamConfig.ticker}
                />
              </div>

              {/* Broadcast Lower-Third News, Sports & Market Ribbon */}
              <LowerThirdTicker />
            </div>

            {/* Adaptive Contextual Sidebar Column (4 cols on large screens) */}
            <div className="lg:col-span-4">
              <InteractiveSidebar />
            </div>
          </div>
        </section>

        {/* =================================================================== */}
        {/* SECTION 2: ELECTRONIC PROGRAM GUIDE (EPG)                           */}
        {/* =================================================================== */}
        <section id="epg" className="pt-4 space-y-4">
          <EPGGuide
            schedule={schedule}
            activeProgramId={selectedProgramId}
            onSelectProgram={handleProgramSelect}
          />
        </section>

        {/* =================================================================== */}
        {/* SECTION 3: VOD ON-DEMAND CATALOG                                    */}
        {/* =================================================================== */}
        <section id="vod" className="pt-4">
          <VODCatalog />
        </section>

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
                  Playout Infrastructure & Low-Latency Specifications
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Technical pipeline specifications for SRT/RTMP ingest, SCTE-35 automation, and edge distribution
              </p>
            </div>

            <button
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
                Client-side state machine monitors broadcast timing and SRT handshake packets. Frame-accurate cuts maintain video decoder continuity with 0 dropped frames.
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
                <span>Failover & Watchdog Telemetry</span>
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

      {/* In-Browser Broadcast Studio ("Go Live") Modal */}
      <LiveStudioModal />

      {/* Network Channel Guide & Ingest Directory Modal */}
      {isChannelGuideOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl animate-fadeIn my-auto text-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
                  <Tv className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Network Channel Guide</h3>
                  <p className="text-xs text-slate-400">How to watch, switch, and broadcast to your channel</p>
                </div>
              </div>
              <button
                onClick={() => setIsChannelGuideOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-2">
                <h4 className="font-bold text-sm text-white flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>1. 24/7 Linear Channels</span>
                </h4>
                <p className="text-slate-400 leading-relaxed">
                  The network operates 3 dedicated 24/7 broadcast channels with adaptive HLS streams. Click any channel below to tune in instantly:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                  {channels.map((ch) => (
                    <button
                      key={ch.channelId}
                      onClick={() => {
                        setActiveChannelId(ch.channelId);
                        setViewingMode('linear');
                        setIsChannelGuideOpen(false);
                      }}
                      className={`p-2.5 rounded-lg border text-left transition-all ${
                        activeChannelId === ch.channelId
                          ? 'bg-red-600/20 border-red-500 text-white font-bold'
                          : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="font-mono text-red-400 font-bold">CH {ch.channelNumber}</div>
                      <div className="text-white text-xs truncate mt-0.5">{ch.channelName}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{ch.resolution}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-2">
                <h4 className="font-bold text-sm text-white flex items-center gap-2">
                  <Radio className="w-4 h-4 text-red-500" />
                  <span>2. How to Broadcast Live on Your Channel ("Go Live")</span>
                </h4>
                <p className="text-slate-400 leading-relaxed">
                  Click the red <strong>"Go Live"</strong> button in the top navigation bar. You can select your <strong>Webcam</strong>, <strong>Screen Share</strong>, <strong>Studio Test Pattern</strong>, or <strong>Virtual News Anchor</strong>. Once you click <em>"🔴 GO LIVE ON NETWORK"</em>, your stream immediately takes over the Main Program (PGM) feed on the player.
                </p>
                <button
                  onClick={() => {
                    setIsChannelGuideOpen(false);
                    setIsLiveStudioOpen(true);
                  }}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg text-xs flex items-center gap-2 mt-2 transition-colors"
                >
                  <Radio className="w-3.5 h-3.5" />
                  <span>Open In-Browser Live Studio Now</span>
                </button>
              </div>

              <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-2">
                <h4 className="font-bold text-sm text-white flex items-center gap-2">
                  <Youtube className="w-4 h-4 text-red-500 fill-red-500" />
                  <span>3. How to Stream Directly to YouTube Live</span>
                </h4>
                <p className="text-slate-400 leading-relaxed">
                  Open the <strong>Engineer Console &gt; Social Simulcast / YouTube Settings</strong> tab. Enter your YouTube Stream Key or Google OAuth Token, choose your latency preference (Ultra-Low, Low, or Normal), and click <strong>"Start YouTube Live Stream"</strong> to restream your channel feed to YouTube.
                </p>
                <button
                  onClick={() => {
                    setIsChannelGuideOpen(false);
                    openControlRoomToTab('simulcast');
                  }}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg text-xs flex items-center gap-2 mt-2 transition-colors shadow-md"
                >
                  <Youtube className="w-3.5 h-3.5 fill-white text-white" />
                  <span>Open YouTube &amp; OBS Settings Dashboard</span>
                </button>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setIsChannelGuideOpen(false)}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-colors"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Broadcast Network Footer */}
      <footer className="bg-slate-950 border-t border-slate-800/80 py-6 px-6 text-xs text-slate-500">
        <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="font-bold text-slate-300">APEX BROADCAST NETWORK</span>
            <span aria-hidden="true">·</span>
            <span>Digital TV & Playout Architecture</span>
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
}

export default function ChannelPage() {
  return (
    <BroadcastProvider>
      <TVNetworkView />
    </BroadcastProvider>
  );
}
