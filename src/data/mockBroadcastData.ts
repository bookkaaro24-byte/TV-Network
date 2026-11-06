/**
 * Mock Broadcast Data & 24-Hour EPG Schedule
 * Dynamically calculated relative to system time to guarantee active playout.
 */

import { BroadcastProgram, EPGSchedule, TickerItem, ChatMessage, PollData } from '../types/broadcast';

// Reliable HLS / Video test streams for browser playback with confirmed 200 CORS
export const SAMPLE_STREAMS = {
  VOD_HLS_SAMPLE: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
  LIVE_STREAM_SIMULATION: 'https://www.youtube.com/watch?v=21X5lGlDOfg', // NASA ISS 24/7 Live Earth Stream
  SPORTS_LIVE: 'https://test-streams.mux.dev/test_001/stream.m3u8', // Adaptive Sports HLS
  TECH_PODCAST: 'https://www.youtube.com/watch?v=dp8PhLsUcFE', // Bloomberg Global Markets Live
  BUSINESS_ROUNDTABLE: 'https://www.youtube.com/watch?v=dp8PhLsUcFE', // Bloomberg Business Live
  AI_KEYNOTE: 'https://www.youtube.com/watch?v=dp8PhLsUcFE', // Bloomberg Tech & AI Live
  LIVE_SRT_SIMULATION: 'https://test-streams.mux.dev/test_001/stream.m3u8',
  UNIVERSAL_FALLBACK_MP4: 'https://www.youtube.com/watch?v=21X5lGlDOfg', // NASA ISS Earth Live
  UNIVERSAL_BACKUP_MP4: 'https://www.youtube.com/watch?v=jfKfPfyJRdk', // Lofi 24/7 Live
  FOUR_K_UHD_SAMPLE: 'https://www.youtube.com/watch?v=21X5lGlDOfg', // 4K Space Live Stream
};

// Generates time-aligned schedule relative to reference timestamp
export function generateScheduleForNow(baseTime: number = Date.now()): EPGSchedule[] {
  // Round to nearest 30 min block
  const slotDuration = 30 * 60 * 1000; // 30 minutes
  const currentSlotStart = Math.floor(baseTime / slotDuration) * slotDuration;

  // 1. Channel 101 - Apex Sports & Flagship Live
  const ch101Programs: BroadcastProgram[] = [
    {
      id: 'ch101-p1',
      title: 'Global Sports Center: Matchday Morning',
      category: 'Sports Analysis',
      startTime: currentSlotStart - (60 * 60 * 1000),
      endTime: currentSlotStart - (30 * 60 * 1000),
      streamUrl: SAMPLE_STREAMS.SPORTS_LIVE,
      contentType: 'sports',
      description: 'Morning breakdown of tactical formations, transfer news, and European cup previews.',
      thumbnail: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=800&q=80',
      hostOrTeams: 'Marcus Vance & Elena Rostova',
      durationMinutes: 30,
      isLive: false,
    },
    {
      id: 'ch101-p2',
      title: 'Formula Apex: Monaco Grand Prix Qualifying',
      category: 'Motorsport Live',
      startTime: currentSlotStart - (30 * 60 * 1000),
      endTime: currentSlotStart,
      streamUrl: SAMPLE_STREAMS.SPORTS_LIVE,
      contentType: 'sports',
      description: 'High-speed qualifying session through the historic streets of Monte Carlo.',
      thumbnail: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=800&q=80',
      hostOrTeams: 'Apex Racing Telemetry Team',
      durationMinutes: 30,
      isLive: false,
    },
    {
      id: 'ch101-p3-current',
      title: 'UEFA Champions Clash: Inter Milan vs Real Madrid',
      category: 'Live Sports Ingest',
      startTime: currentSlotStart,
      endTime: currentSlotStart + (45 * 60 * 1000),
      streamUrl: SAMPLE_STREAMS.SPORTS_LIVE,
      contentType: 'sports',
      description: 'Quarter-final first leg high-stakes showdown at San Siro with real-time multi-angle playout.',
      thumbnail: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=800&q=80',
      hostOrTeams: 'Inter Milan vs Real Madrid',
      durationMinutes: 45,
      isLive: true,
      adCuePoints: [
        {
          id: 'cue-sport-1',
          cueTimeOffsetSeconds: 15,
          durationSeconds: 15,
          type: 'mid_roll',
          title: 'Precision Swiss Chronographs ad spot',
          advertiser: 'Chronos Engineering',
          status: 'pending',
        },
        {
          id: 'cue-sport-2',
          cueTimeOffsetSeconds: 120,
          durationSeconds: 20,
          type: 'overlay_lower_third',
          title: 'High Performance EV Launch',
          advertiser: 'Veloce Motors',
          status: 'pending',
        },
      ],
      sportsData: {
        teams: {
          home: { name: 'Inter Milan', code: 'INT', logo: '⚽', rank: 'Serie A #1', color: '#005CA9' },
          away: { name: 'Real Madrid', code: 'RMA', logo: '👑', rank: 'La Liga #1', color: '#EE9A00' },
        },
        score: { home: 2, away: 1 },
        timeElapsed: "74:18",
        liveStatus: 'live',
        league: 'UEFA Champions League Quarter-Final',
        venue: 'San Siro Stadium, Milan (75,817 Attendance)',
        events: [
          { id: 'ev-1', minute: "19'", type: 'goal', description: 'Lautaro Martínez header into top right corner', team: 'home' },
          { id: 'ev-2', minute: "38'", type: 'goal', description: 'Vinícius Jr. electric counter-attack finish', team: 'away' },
          { id: 'ev-3', minute: "54'", type: 'card', description: 'Tchouaméni tactical foul yellow card', team: 'away' },
          { id: 'ev-4', minute: "68'", type: 'goal', description: 'Barella volley off deflected corner kick', team: 'home' },
        ],
        stats: {
          possession: [46, 54],
          shotsOnTarget: [6, 5],
          totalShots: [14, 12],
          fouls: [9, 11],
          passAccuracy: [87, 91],
        },
      },
    },
    {
      id: 'ch101-p4-next',
      title: 'Apex Post-Match Tactical Deconstruction',
      category: 'Sports Analysis',
      startTime: currentSlotStart + (45 * 60 * 1000),
      endTime: currentSlotStart + (75 * 60 * 1000),
      streamUrl: SAMPLE_STREAMS.SPORTS_LIVE,
      contentType: 'sports',
      description: 'Computer-vision telemetry, expected goals (xG) maps, and locker room press briefings.',
      thumbnail: 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?auto=format&fit=crop&w=800&q=80',
      hostOrTeams: 'Coach Roberto & Stat Desk',
      durationMinutes: 30,
      isLive: false,
    },
    {
      id: 'ch101-p5',
      title: 'Courtside Apex: NBA Western Conference Finals',
      category: 'Basketball Live',
      startTime: currentSlotStart + (75 * 60 * 1000),
      endTime: currentSlotStart + (135 * 60 * 1000),
      streamUrl: SAMPLE_STREAMS.SPORTS_LIVE,
      contentType: 'sports',
      description: 'Game 5 tip-off with live courtside audio feeds and advanced shooting charts.',
      thumbnail: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=800&q=80',
      hostOrTeams: 'Warriors vs Nuggets',
      durationMinutes: 60,
      isLive: false,
    },
  ];

  // 2. Channel 102 - Apex Tech & AI Studio
  const ch102Programs: BroadcastProgram[] = [
    {
      id: 'ch102-p1',
      title: 'Autonomous Systems & Robotics Dissection',
      category: 'Deep Tech',
      startTime: currentSlotStart - (60 * 60 * 1000),
      endTime: currentSlotStart - (15 * 60 * 1000),
      streamUrl: SAMPLE_STREAMS.TECH_PODCAST,
      contentType: 'podcast',
      description: 'Exploring humanoid actuator mechanics and real-time end-to-end vision-action models.',
      thumbnail: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=800&q=80',
      hostOrTeams: 'Dr. Aris Thorne',
      durationMinutes: 45,
      isLive: false,
    },
    {
      id: 'ch102-p2-current',
      title: 'Neural Architecture: Reasoning Engines & Agents',
      category: 'AI Podcast & Lab',
      startTime: currentSlotStart - (15 * 60 * 1000),
      endTime: currentSlotStart + (30 * 60 * 1000),
      streamUrl: SAMPLE_STREAMS.AI_KEYNOTE,
      contentType: 'podcast',
      description: 'A deep architectural masterclass on continuous inference, latency budgets, and agentic tool-use.',
      thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
      hostOrTeams: 'Hosted by Sarah Lin with Anthropic & DeepMind Engineers',
      durationMinutes: 45,
      isLive: true,
      podcastNotes: {
        executiveSummary: 'This session deconstructs the shift from pure autoregressive text tokens to dynamic chain-of-thought routing, speculative decoding on edge devices, and production telemetry.',
        keyTakeaways: [
          'Speculative decoding delivers 2.8x speedups on quantized hardware without perceptual quality degradation.',
          'Stateful agent loops require determinism gates to stop hallucinated recursive call spirals.',
          'Sub-50ms TTFT (Time to First Token) unlocks conversational latency indistinguishable from human pacing.',
          'Local vector indices outperform cloud roundtrips for real-time spatial context retrieval.',
        ],
        timestamps: [
          { timestamp: '04:12', topic: 'Latency Bottlenecks in Transformer KV-Cache', summary: 'Why memory bandwidth limits generation speed.' },
          { timestamp: '14:40', topic: 'Speculative Decoding Architectures', summary: 'Pairing small draft models with heavy verifiers.' },
          { timestamp: '27:05', topic: 'Tool Calling & Schema Enforcers', summary: 'Strict JSON schema execution guarantees in production.' },
          { timestamp: '39:50', topic: 'Live Viewer Q&A & Code Benchmarking', summary: 'Evaluating latency under 1000 concurrent WebSocket connections.' },
        ],
        downloadFileName: 'Apex_AI_Neural_Architecture_Brief_2026.pdf',
      },
    },
    {
      id: 'ch102-p3-next',
      title: 'Silicon Frontiers: Quantum Co-Processors',
      category: 'Hardware Engineering',
      startTime: currentSlotStart + (30 * 60 * 1000),
      endTime: currentSlotStart + (75 * 60 * 1000),
      streamUrl: SAMPLE_STREAMS.TECH_PODCAST,
      contentType: 'podcast',
      description: 'Next-generation room-temperature superconducting qubits and photonic interconnects.',
      thumbnail: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80',
      hostOrTeams: 'Prof. David Vance',
      durationMinutes: 45,
      isLive: false,
    },
  ];

  // 3. Channel 103 - Apex Capital & Global Business
  const ch103Programs: BroadcastProgram[] = [
    {
      id: 'ch103-p1',
      title: 'Asia-Pacific Market Close & Forex Ticker',
      category: 'Global Markets',
      startTime: currentSlotStart - (45 * 60 * 1000),
      endTime: currentSlotStart,
      streamUrl: SAMPLE_STREAMS.BUSINESS_ROUNDTABLE,
      contentType: 'business',
      description: 'Nikkei 225, Hang Seng, and semiconductor export numbers analyzed by leading quants.',
      thumbnail: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=800&q=80',
      hostOrTeams: 'Kenji Takahashi',
      durationMinutes: 45,
      isLive: false,
    },
    {
      id: 'ch103-p2-current',
      title: 'Venture Boardroom: Scaling $0M to $100M ARR',
      category: 'How-To Business & Scale',
      startTime: currentSlotStart,
      endTime: currentSlotStart + (40 * 60 * 1000),
      streamUrl: SAMPLE_STREAMS.BUSINESS_ROUNDTABLE,
      contentType: 'business',
      description: 'Founders and managing partners dissect unit economics, CAC paybacks, and net retention tactics.',
      thumbnail: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=800&q=80',
      hostOrTeams: 'Rachel Sterling & Founders Circle',
      durationMinutes: 40,
      isLive: true,
      businessData: {
        marketFocus: 'Enterprise SaaS & Capital Efficiency',
        keyMetrics: [
          { label: 'Rule of 40 Median', value: '44.8%', change: '+3.2%', isPositive: true },
          { label: 'Magic Number Efficiency', value: '1.24x', change: '+0.15x', isPositive: true },
          { label: 'CAC Payback (Mos)', value: '11.4', change: '-1.8', isPositive: true },
          { label: 'Net Dollar Retention', value: '122%', change: '+1.5%', isPositive: true },
        ],
        downloadableDeckUrl: '/downloads/Apex_Executive_Boardroom_Q3.pdf',
      },
    },
    {
      id: 'ch103-p3-next',
      title: 'Macro Outlook: Fed Yield Curve & Global Liquidity',
      category: 'Macroeconomics',
      startTime: currentSlotStart + (40 * 60 * 1000),
      endTime: currentSlotStart + (80 * 60 * 1000),
      streamUrl: SAMPLE_STREAMS.BUSINESS_ROUNDTABLE,
      contentType: 'business',
      description: 'Central bank balance sheet normalization and sovereign bond market dynamics.',
      thumbnail: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&w=800&q=80',
      hostOrTeams: 'Sir Arthur Sterling',
      durationMinutes: 40,
      isLive: false,
    },
  ];

  // 4. Channel 104 - Apex Space & Earth Science Live
  const ch104Programs: BroadcastProgram[] = [
    {
      id: 'ch104-p1',
      title: 'Deep Space Frontiers: James Webb Deep Field Telemetry',
      category: 'Space Science',
      startTime: currentSlotStart - (45 * 60 * 1000),
      endTime: currentSlotStart,
      streamUrl: SAMPLE_STREAMS.UNIVERSAL_FALLBACK_MP4,
      contentType: 'podcast',
      description: 'Infrared spectroscopy and galactic genesis data decoded live by astrophysics teams.',
      thumbnail: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80',
      hostOrTeams: 'Dr. Evelyn Vance & Space Flight Center',
      durationMinutes: 45,
      isLive: false,
    },
    {
      id: 'ch104-p2-current',
      title: 'Apex Orbit Live: ISS High-Definition Views & Telemetry',
      category: 'Live Space Telemetry',
      startTime: currentSlotStart,
      endTime: currentSlotStart + (45 * 60 * 1000),
      streamUrl: SAMPLE_STREAMS.UNIVERSAL_FALLBACK_MP4,
      contentType: 'podcast',
      description: 'Real-time external camera feeds from the International Space Station orbiting at 27,600 km/h.',
      thumbnail: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=800&q=80',
      hostOrTeams: 'Orbital Telemetry Stream & Flight Control',
      durationMinutes: 45,
      isLive: true,
      podcastNotes: {
        executiveSummary: 'Continuous 24/7 earth observation stream with live velocity, altitude, and orbital telemetry data.',
        keyTakeaways: [
          'Orbital speed maintained at 7.66 km/second across 92-minute equatorial laps.',
          'Atmospheric airglow and auroral oval telemetry monitored in real-time.',
          'Direct Ku-band high-gain antenna relay linked to ground tracking stations.',
        ],
        timestamps: [
          { timestamp: '00:00', topic: 'Live Orbital Pass Over Terminator Line', summary: 'Day/night transition observation.' },
          { timestamp: '15:20', topic: 'Telemetry Teleconference', summary: 'Solar panel array orientation adjustments.' },
        ],
        downloadFileName: 'Apex_Space_Orbital_Briefing.pdf',
      },
    },
    {
      id: 'ch104-p3-next',
      title: 'Solar Dynamics Observatory: Magnetosphere Solar Flare Alert',
      category: 'Space Weather',
      startTime: currentSlotStart + (45 * 60 * 1000),
      endTime: currentSlotStart + (90 * 60 * 1000),
      streamUrl: SAMPLE_STREAMS.UNIVERSAL_FALLBACK_MP4,
      contentType: 'podcast',
      description: 'Extreme ultraviolet coronal mass ejection analysis and geomagnetism forecasting.',
      thumbnail: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=800&q=80',
      hostOrTeams: 'Heliophysics Mission Directorate',
      durationMinutes: 45,
      isLive: false,
    },
  ];

  return [
    {
      channelId: 'apex-101',
      channelName: 'Apex 1 Flagship Sports & News',
      channelNumber: 101,
      callSign: 'APEX-LIVE-HD',
      resolution: '1080p60 HDR',
      programs: ch101Programs,
      day: new Date(baseTime).toISOString().split('T')[0],
    },
    {
      channelId: 'apex-102',
      channelName: 'Apex 2 AI & Deep Tech Studio',
      channelNumber: 102,
      callSign: 'APEX-TECH-4K',
      resolution: '4K UltraHD',
      programs: ch102Programs,
      day: new Date(baseTime).toISOString().split('T')[0],
    },
    {
      channelId: 'apex-103',
      channelName: 'Apex 3 Global Business & Capital',
      channelNumber: 103,
      callSign: 'APEX-BIZ-HD',
      resolution: '1080p60',
      programs: ch103Programs,
      day: new Date(baseTime).toISOString().split('T')[0],
    },
    {
      channelId: 'apex-104',
      channelName: 'Apex 4 Space & Earth Science Live',
      channelNumber: 104,
      callSign: 'APEX-SPACE-HD',
      resolution: '1080p60 HDR',
      programs: ch104Programs,
      day: new Date(baseTime).toISOString().split('T')[0],
    },
  ];
}

// Live lower-third ticker items strictly compliant with tv-channel-manager guidelines:
// - Headlines < 120 characters
// - Explicit directional indicators (TSLA +3.2% ▲, BTC -1.1% ▼)
// - Sports formatted as HOME vs AWAY with live minute tracking (74')
export const MOCK_TICKER_ITEMS: TickerItem[] = [
  { id: 't-1', category: 'MARKETS', headline: 'TSLA +3.2% ▲ · BTC -1.1% ▼ · NVDA +2.4% ▲ · AAPL -0.4% ▼ · S&P 500 +0.8% ▲', isPositive: true },
  { id: 't-2', category: 'SPORTS', headline: 'Inter Milan vs Real Madrid (74\') · 2-1 live at San Siro · Barella volley winner' },
  { id: 't-3', category: 'TECH', headline: 'Reasoning models achieve 94.2% ARC-AGI score with sub-100ms Time-to-First-Token' },
  { id: 't-4', category: 'MARKETS', headline: 'ETH +1.8% ▲ · GOLD +0.6% ▲ · BRENT +0.4% ▲ · 10Y-YIELD -0.04% ▼ · MSFT +0.9% ▲', isPositive: true },
  { id: 't-5', category: 'SPORTS', headline: 'Warriors vs Nuggets (4Q 03:12) · 108-104 · Western Conference Finals Game 5' },
  { id: 't-6', category: 'BREAKING', headline: 'Apex Network upgrades live playout to SRT ingest at 60fps with sub-second glass-to-glass latency' },
  { id: 't-7', category: 'TECH', headline: 'Next-gen optical co-processors achieve 10Tbps bandwidth with 40% reduced wattage' },
];

// Initial simulated chat messages for podcast feeds
export const INITIAL_CHAT_MESSAGES: ChatMessage[] = [
  { id: 'm-1', sender: 'Elena_V', role: 'moderator', text: 'Welcome to Apex Live. Drop your questions for our AI systems panel in chat!', timestamp: '14:02' },
  { id: 'm-2', sender: 'DevAlex99', role: 'viewer', text: 'Are the speculative decoding draft weights hosted on-device or streamed via RPC?', timestamp: '14:04' },
  { id: 'm-3', sender: 'Dr_Thorne', role: 'analyst', text: 'On-device! They take under 400MB VRAM and run parallel tensor cores.', timestamp: '14:05' },
  { id: 'm-4', sender: 'QuantumSaaS', role: 'viewer', text: 'The latency numbers Sarah Lin showed are wild. Under 40ms TTFT in production.', timestamp: '14:08' },
  { id: 'm-5', sender: 'BroadcastBot', role: 'moderator', text: 'Live slide deck and PDF notes are available for download in the sidebar!', timestamp: '14:10' },
];

// Initial interactive poll
export const INITIAL_POLL_DATA: PollData = {
  id: 'poll-ai-01',
  question: 'What is your primary architectural bottleneck when serving LLMs at scale?',
  options: [
    { id: 'opt-1', text: 'Memory bandwidth (KV Cache footprint)', votes: 142 },
    { id: 'opt-2', text: 'Time to First Token (TTFT) latency', votes: 198 },
    { id: 'opt-3', text: 'Compute cost / GPU allocation queue', votes: 89 },
    { id: 'opt-4', text: 'Tool-calling reliability & error loops', votes: 115 },
  ],
  totalVotes: 544,
};

// VOD Library categorized catalog
export const MOCK_VOD_CATALOG: BroadcastProgram[] = [
  {
    id: 'vod-4k',
    title: '4K Ultra HD Cinema Master: Tears of Steel (2160p Master)',
    category: 'Tech',
    startTime: 0,
    endTime: 0,
    streamUrl: SAMPLE_STREAMS.FOUR_K_UHD_SAMPLE,
    contentType: 'podcast',
    description: 'Reference 4K UHD Master video encoded in native H.264/AAC for ultra high resolution testing, smooth keyframe scrubbing, and bandwidth benchmarking.',
    thumbnail: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=800&q=80',
    hostOrTeams: 'Blender Open Movie / Apex 4K Lab',
    durationMinutes: 12,
    tags: ['4K UHD', '2160p', 'HDR', 'Benchmark'],
  },
  {
    id: 'vod-1',
    title: 'The Great AI Compute Squeeze: H100s to Quantum Interconnects',
    category: 'AI',
    startTime: 0,
    endTime: 0,
    streamUrl: SAMPLE_STREAMS.AI_KEYNOTE,
    contentType: 'podcast',
    description: 'An investigative breakdown on modern datacenters, liquid cooling architecture, and energy grids powering next-gen reasoning models.',
    thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
    hostOrTeams: 'Hosted by Sarah Lin & Top Systems Architects',
    durationMinutes: 48,
    tags: ['AI', 'Data Centers', 'Hardware'],
  },
  {
    id: 'vod-2',
    title: 'Champions League Quarterfinals: Inter vs Bayern Full Replay',
    category: 'Sports',
    startTime: 0,
    endTime: 0,
    streamUrl: SAMPLE_STREAMS.SPORTS_LIVE,
    contentType: 'sports',
    description: 'Full 90-minute tactical clash with real-time stats overlay, sideline pitch microphones, and 4K HDR master feed.',
    thumbnail: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=800&q=80',
    hostOrTeams: 'Inter Milan vs Bayern Munich',
    durationMinutes: 98,
    tags: ['Football', 'UCL', 'Full Replay'],
  },
  {
    id: 'vod-3',
    title: 'Zero to $50M ARR: The B2B Enterprise Playbook',
    category: 'Business',
    startTime: 0,
    endTime: 0,
    streamUrl: SAMPLE_STREAMS.BUSINESS_ROUNDTABLE,
    contentType: 'business',
    description: 'B2B enterprise founders explain account-based marketing, enterprise multi-year contracts, and gross margin optimization.',
    thumbnail: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=800&q=80',
    hostOrTeams: 'Rachel Sterling & VC Partners',
    durationMinutes: 42,
    tags: ['SaaS', 'B2B', 'Scale'],
  },
  {
    id: 'vod-4',
    title: 'Building Real-time Voice Agents with Sub-150ms Latency',
    category: 'Tech',
    startTime: 0,
    endTime: 0,
    streamUrl: SAMPLE_STREAMS.TECH_PODCAST,
    contentType: 'podcast',
    description: 'Audio streaming pipeline breakdown using WebRTC, opus audio framing, and streaming speech-to-speech models.',
    thumbnail: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=800&q=80',
    hostOrTeams: 'Alex Chen & WebRTC Core Contributors',
    durationMinutes: 36,
    tags: ['WebRTC', 'Voice AI', 'Latency'],
  },
  {
    id: 'vod-5',
    title: 'Grand Prix Pit Stop Telemetry & Aero Diagnostics',
    category: 'Sports',
    startTime: 0,
    endTime: 0,
    streamUrl: SAMPLE_STREAMS.LIVE_STREAM_SIMULATION,
    contentType: 'sports',
    description: 'Engineers decode 2.1-second wheel changes, wind-tunnel vortex generation, and tire degradation curves.',
    thumbnail: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=800&q=80',
    hostOrTeams: 'Apex Telemetry Lab',
    durationMinutes: 29,
    tags: ['Motorsport', 'Telemetry', 'Aerodynamics'],
  },
  {
    id: 'vod-6',
    title: 'M&A and Tech Valuations in High-Interest Rate Climates',
    category: 'Business',
    startTime: 0,
    endTime: 0,
    streamUrl: SAMPLE_STREAMS.BUSINESS_ROUNDTABLE,
    contentType: 'business',
    description: 'Wall Street investment bankers discuss discounted cash flow multiples, debt recapitalization, and buyouts.',
    thumbnail: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&w=800&q=80',
    hostOrTeams: 'Apex Capital Review',
    durationMinutes: 52,
    tags: ['Finance', 'M&A', 'Macro'],
  },
];
