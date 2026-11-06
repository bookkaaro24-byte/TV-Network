import React, { useState } from 'react';
import { useBroadcast } from '../context/BroadcastContext';
import { BroadcastProgram } from '../types/broadcast';
import {
  Trophy,
  Users,
  MessageSquare,
  FileText,
  Download,
  HelpCircle,
  ThumbsUp,
  Send,
  Sparkles,
  CheckCircle2,
  Clock,
  ChevronDown,
} from 'lucide-react';

interface SpeakerBio {
  id: string;
  name: string;
  role: string;
  organization: string;
  avatar: string;
  bio: string;
}

interface QAQuestion {
  id: string;
  author: string;
  question: string;
  votes: number;
  hasVoted?: boolean;
  status: 'answered' | 'queued' | 'on_air';
  timestamp: string;
}

interface LineupPlayer {
  number: number;
  name: string;
  position: 'GK' | 'DEF' | 'MID' | 'FWD';
  isCaptain?: boolean;
}

const DEFAULT_HOME_LINEUP: { formation: string; startingXI: LineupPlayer[] } = {
  formation: '3-5-2 Attacking',
  startingXI: [
    { number: 1, name: 'Yann Sommer', position: 'GK' },
    { number: 28, name: 'Benjamin Pavard', position: 'DEF' },
    { number: 15, name: 'Francesco Acerbi', position: 'DEF' },
    { number: 95, name: 'Alessandro Bastoni', position: 'DEF' },
    { number: 2, name: 'Denzel Dumfries', position: 'MID' },
    { number: 23, name: 'Nicolò Barella', position: 'MID' },
    { number: 20, name: 'Hakan Çalhanoğlu', position: 'MID' },
    { number: 22, name: 'Henrikh Mkhitaryan', position: 'MID' },
    { number: 32, name: 'Federico Dimarco', position: 'MID' },
    { number: 9, name: 'Marcus Thuram', position: 'FWD' },
    { number: 10, name: 'Lautaro Martínez', position: 'FWD', isCaptain: true },
  ],
};

const DEFAULT_AWAY_LINEUP: { formation: string; startingXI: LineupPlayer[] } = {
  formation: '4-3-3 Dynamic',
  startingXI: [
    { number: 1, name: 'Thibaut Courtois', position: 'GK' },
    { number: 2, name: 'Dani Carvajal', position: 'DEF', isCaptain: true },
    { number: 3, name: 'Éder Militão', position: 'DEF' },
    { number: 22, name: 'Antonio Rüdiger', position: 'DEF' },
    { number: 23, name: 'Ferland Mendy', position: 'DEF' },
    { number: 14, name: 'Aurélien Tchouaméni', position: 'MID' },
    { number: 15, name: 'Federico Valverde', position: 'MID' },
    { number: 5, name: 'Jude Bellingham', position: 'MID' },
    { number: 11, name: 'Rodrygo Silva', position: 'FWD' },
    { number: 9, name: 'Kylian Mbappé', position: 'FWD' },
    { number: 7, name: 'Vinícius Júnior', position: 'FWD' },
  ],
};

const PODCAST_SPEAKERS: SpeakerBio[] = [
  {
    id: 'spk-1',
    name: 'Sarah Lin',
    role: 'Principal Systems Architect',
    organization: 'DeepMind Systems',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80',
    bio: 'Pioneered low-latency speculative decoding algorithms and on-device token routing pipelines.',
  },
  {
    id: 'spk-2',
    name: 'Dr. Aris Thorne',
    role: 'Head of Compute Infrastructure',
    organization: 'Anthropic Systems',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
    bio: 'Leads cluster orchestration, liquid cooling design, and deterministic KV-cache deduplication.',
  },
  {
    id: 'spk-3',
    name: 'Rachel Sterling',
    role: 'Managing Partner & Quant Analyst',
    organization: 'Apex Capital Review',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=300&q=80',
    bio: 'Author of Enterprise Unit Economics at Scale; former VP of Finance at Snowflake.',
  },
];

const INITIAL_QA_QUESTIONS: QAQuestion[] = [
  {
    id: 'qa-1',
    author: 'Liam_K (Systems Dev)',
    question: 'How do you guarantee strict schema adherence when agents enter multi-turn recursive loops?',
    votes: 48,
    status: 'on_air',
    timestamp: '14:12',
  },
  {
    id: 'qa-2',
    author: 'Elena_Rust',
    question: 'What is the trade-off in memory footprint between INT4 quantization and full BF16 draft weights on edge hardware?',
    votes: 34,
    status: 'answered',
    timestamp: '14:18',
  },
  {
    id: 'qa-3',
    author: 'Marcus_AI',
    question: 'Could optical interconnects replace InfiniBand within dense GPU clusters in the 2027 hardware refresh?',
    votes: 21,
    status: 'queued',
    timestamp: '14:24',
  },
];

export interface InteractiveSidebarProps {
  program?: BroadcastProgram | null;
}

export const InteractiveSidebar: React.FC<InteractiveSidebarProps> = ({ program: propProgram }) => {
  const {
    playout,
    viewingMode,
    selectedVodProgram,
    chatMessages,
    sendChatMessage,
    simulatedSportsScore,
    triggerSportsGoal,
  } = useBroadcast();

  const activeProgram = propProgram || (viewingMode === 'linear' ? playout.currentProgram : selectedVodProgram);
  const contentType = activeProgram?.contentType || 'sports';

  const [sportsTab, setSportsTab] = useState<'stats' | 'lineups' | 'chat'>('stats');
  const [podcastTab, setPodcastTab] = useState<'takeaways' | 'speakers' | 'qa'>('takeaways');

  const [chatInput, setChatInput] = useState<string>('');
  const [qaInput, setQaInput] = useState<string>('');
  const [qaList, setQaList] = useState<QAQuestion[]>(INITIAL_QA_QUESTIONS);
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);

  const sportsData = activeProgram?.sportsData;
  const podcastNotes = activeProgram?.podcastNotes;

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    sendChatMessage(chatInput.trim());
    setChatInput('');
  };

  const handleSendQA = (e: React.FormEvent) => {
    e.preventDefault();
    if (!qaInput.trim()) return;

    const newQuestion: QAQuestion = {
      id: `qa-${Date.now()}`,
      author: 'You (Broadcast Viewer)',
      question: qaInput.trim(),
      votes: 1,
      hasVoted: true,
      status: 'queued',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setQaList((prev) => [newQuestion, ...prev]);
    setQaInput('');
  };

  const handleVoteQA = (id: string) => {
    setQaList((prev) =>
      prev.map((q) => {
        if (q.id === id) {
          const hasVoted = q.hasVoted;
          return {
            ...q,
            votes: hasVoted ? q.votes - 1 : q.votes + 1,
            hasVoted: !hasVoted,
          };
        }
        return q;
      })
    );
  };

  const handleDownloadTakeaways = () => {
    const summary = podcastNotes?.executiveSummary || activeProgram?.description || 'Broadcast synthesis brief.';
    const takeawaysText = podcastNotes?.keyTakeaways?.map((t, i) => `${i + 1}. ${t}`).join('\n') || '1. Continuous streaming playout telemetry enabled.';
    const timestampsText = podcastNotes?.timestamps?.map((ts) => `[${ts.timestamp}] ${ts.topic}: ${ts.summary}`).join('\n') || '';

    const markdownDoc = `# APEX BROADCAST NETWORK: EXECUTIVE KEY TAKEAWAYS
Broadcast Title: ${activeProgram?.title || 'Studio Session'}
Category: ${activeProgram?.category || 'Executive Analysis'}
Systemic Date: ${new Date().toISOString()}

==================================================
1. EXECUTIVE SYNTHESIS:
${summary}

==================================================
2. KEY ARCHITECTURAL TAKEAWAYS:
${takeawaysText}

==================================================
3. CHAPTER BOOKMARKS & TIMESTAMPS:
${timestampsText}

==================================================
Generated via Apex Broadcast Interactive Playout Client
`;

    const blob = new Blob([markdownDoc], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = podcastNotes?.downloadFileName || `${activeProgram?.title?.replace(/[^a-zA-Z0-9]/g, '_')}_Takeaways.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 3000);
  };

  return (
    <aside
      className="w-full bg-slate-900/90 border border-slate-800 rounded-xl flex flex-col h-[650px] overflow-hidden shadow-2xl transition-all"
      aria-label="Contextual Interactive Broadcast Panel"
    >
      {/* Header Bar with Sub-Tab Navigation */}
      <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {contentType === 'sports' ? (
            <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
          ) : (
            <Sparkles className="w-4 h-4 text-blue-400 shrink-0" />
          )}
          <h3 className="text-xs font-bold text-white uppercase tracking-wider truncate">
            {contentType === 'sports' ? 'Match Center' : 'Session Studio'}
          </h3>
        </div>

        {/* Tab Controls for Sports */}
        {contentType === 'sports' && (
          <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setSportsTab('stats')}
              className={`px-2.5 py-1 rounded transition-colors font-medium ${
                sportsTab === 'stats'
                  ? 'bg-slate-800 text-white font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Stats
            </button>
            <button
              onClick={() => setSportsTab('lineups')}
              className={`px-2.5 py-1 rounded transition-colors font-medium ${
                sportsTab === 'lineups'
                  ? 'bg-slate-800 text-white font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Lineups
            </button>
            <button
              onClick={() => setSportsTab('chat')}
              className={`px-2.5 py-1 rounded transition-colors font-medium flex items-center gap-1 ${
                sportsTab === 'chat'
                  ? 'bg-slate-800 text-white font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Chat</span>
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            </button>
          </div>
        )}

        {/* Tab Controls for Podcast / Business */}
        {(contentType === 'podcast' || contentType === 'business') && (
          <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setPodcastTab('takeaways')}
              className={`px-2.5 py-1 rounded transition-colors font-medium ${
                podcastTab === 'takeaways'
                  ? 'bg-slate-800 text-white font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Takeaways
            </button>
            <button
              onClick={() => setPodcastTab('speakers')}
              className={`px-2.5 py-1 rounded transition-colors font-medium ${
                podcastTab === 'speakers'
                  ? 'bg-slate-800 text-white font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Speakers
            </button>
            <button
              onClick={() => setPodcastTab('qa')}
              className={`px-2.5 py-1 rounded transition-colors font-medium ${
                podcastTab === 'qa'
                  ? 'bg-slate-800 text-white font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Q&A
            </button>
          </div>
        )}
      </div>

      {/* Scrollable Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-slate-300">
        {/* ======================================================= */}
        {/* SPORTS VIEW                                             */}
        {/* ======================================================= */}
        {contentType === 'sports' && (
          <>
            {/* Stats Tab */}
            {sportsTab === 'stats' && (
              <div className="space-y-4">
                <div className="bg-slate-950/80 rounded-xl p-3.5 border border-slate-800">
                  <div className="flex items-center justify-between text-xs text-slate-400 pb-2 mb-2 border-b border-slate-800">
                    <span className="font-semibold text-slate-300">
                      {sportsData?.league || 'UEFA Champions League'}
                    </span>
                    <span className="font-mono text-red-400 font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                      {simulatedSportsScore.minute} LIVE
                    </span>
                  </div>

                  <div className="grid grid-cols-3 items-center text-center py-1">
                    <div>
                      <div className="text-2xl mb-1">{sportsData?.teams.home.logo || '⚽'}</div>
                      <div className="text-xs font-bold text-white truncate">{sportsData?.teams.home.name || 'Inter'}</div>
                    </div>
                    <div>
                      <div className="text-2xl font-extrabold text-white font-mono tracking-wider tabular-nums">
                        {simulatedSportsScore.home} - {simulatedSportsScore.away}
                      </div>
                      <div className="text-[10px] text-amber-400 uppercase font-semibold mt-0.5">2nd Half</div>
                    </div>
                    <div>
                      <div className="text-2xl mb-1">{sportsData?.teams.away.logo || '👑'}</div>
                      <div className="text-xs font-bold text-white truncate">{sportsData?.teams.away.name || 'Real Madrid'}</div>
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-800 flex items-center gap-2">
                    <button
                      onClick={() => triggerSportsGoal('home')}
                      className="flex-1 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-medium transition-colors"
                    >
                      + {sportsData?.teams.home.code || 'INT'} Goal
                    </button>
                    <button
                      onClick={() => triggerSportsGoal('away')}
                      className="flex-1 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-medium transition-colors"
                    >
                      + {sportsData?.teams.away.code || 'RMA'} Goal
                    </button>
                  </div>
                </div>

                {/* Performance Telemetry */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Performance Telemetry
                  </h4>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-mono">
                      <span>{sportsData?.stats?.possession?.[0] || 46}%</span>
                      <span className="text-slate-400 font-sans">Ball Possession</span>
                      <span>{sportsData?.stats?.possession?.[1] || 54}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full flex overflow-hidden">
                      <div className="bg-blue-500 h-full" style={{ width: `${sportsData?.stats?.possession?.[0] || 46}%` }} />
                      <div className="bg-amber-500 h-full" style={{ width: `${sportsData?.stats?.possession?.[1] || 54}%` }} />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-mono">
                      <span>{sportsData?.stats?.shotsOnTarget?.[0] || 6}</span>
                      <span className="text-slate-400 font-sans">Shots on Target</span>
                      <span>{sportsData?.stats?.shotsOnTarget?.[1] || 5}</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full flex overflow-hidden">
                      <div className="bg-blue-500 h-full w-[55%]" />
                      <div className="bg-amber-500 h-full w-[45%]" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-mono">
                      <span>{sportsData?.stats?.passAccuracy?.[0] || 88}%</span>
                      <span className="text-slate-400 font-sans">Pass Accuracy</span>
                      <span>{sportsData?.stats?.passAccuracy?.[1] || 91}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full flex overflow-hidden">
                      <div className="bg-blue-500 h-full w-[49%]" />
                      <div className="bg-amber-500 h-full w-[51%]" />
                    </div>
                  </div>
                </div>

                {/* Match Incidents */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Key Match Incidents
                  </h4>
                  <div className="space-y-1.5">
                    {sportsData?.events?.map((ev) => (
                      <div
                        key={ev.id}
                        className="flex items-start gap-2.5 text-xs p-2 rounded-lg bg-slate-950/60 border border-slate-800/80"
                      >
                        <span className="font-mono text-amber-400 font-bold shrink-0">{ev.minute}</span>
                        <span className="text-slate-200">{ev.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Lineups Tab */}
            {sportsTab === 'lineups' && (
              <div className="space-y-4">
                <div className="bg-slate-950/70 rounded-xl p-3.5 border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <span>{sportsData?.teams.home.logo || '⚽'}</span>
                      <span className="text-xs font-bold text-white">{sportsData?.teams.home.name || 'Inter Milan'}</span>
                    </div>
                    <span className="text-[11px] font-mono text-blue-400 font-semibold">{DEFAULT_HOME_LINEUP.formation}</span>
                  </div>

                  <div className="grid grid-cols-1 divide-y divide-slate-800/60 text-xs">
                    {DEFAULT_HOME_LINEUP.startingXI.map((p) => (
                      <div key={p.number} className="py-1.5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-slate-400 w-5">{p.number}</span>
                          <span className="text-slate-200 font-medium">{p.name}</span>
                          {p.isCaptain && <span className="text-[10px] bg-amber-950 text-amber-400 px-1 rounded font-bold font-mono">C</span>}
                        </div>
                        <span className="text-[10px] font-mono text-slate-400">{p.position}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-slate-950/70 rounded-xl p-3.5 border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <span>{sportsData?.teams.away.logo || '👑'}</span>
                      <span className="text-xs font-bold text-white">{sportsData?.teams.away.name || 'Real Madrid'}</span>
                    </div>
                    <span className="text-[11px] font-mono text-amber-400 font-semibold">{DEFAULT_AWAY_LINEUP.formation}</span>
                  </div>

                  <div className="grid grid-cols-1 divide-y divide-slate-800/60 text-xs">
                    {DEFAULT_AWAY_LINEUP.startingXI.map((p) => (
                      <div key={p.number} className="py-1.5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-slate-400 w-5">{p.number}</span>
                          <span className="text-slate-200 font-medium">{p.name}</span>
                          {p.isCaptain && <span className="text-[10px] bg-amber-950 text-amber-400 px-1 rounded font-bold font-mono">C</span>}
                        </div>
                        <span className="text-[10px] font-mono text-slate-400">{p.position}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Chat Tab */}
            {sportsTab === 'chat' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-400 pb-1 border-b border-slate-800">
                  <span>Matchday Fan Stream</span>
                  <span className="font-mono text-emerald-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                    LIVE
                  </span>
                </div>

                <div className="space-y-2.5">
                  {chatMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white">{msg.sender}</span>
                        <span className="font-mono text-[10px] text-slate-500">{msg.timestamp}</span>
                      </div>
                      <p className="text-slate-300">{msg.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* ======================================================= */}
        {/* PODCAST / BUSINESS VIEW                                 */}
        {/* ======================================================= */}
        {(contentType === 'podcast' || contentType === 'business') && (
          <>
            {/* Takeaways Tab */}
            {podcastTab === 'takeaways' && (
              <div className="space-y-4">
                <div className="bg-slate-950/80 rounded-xl p-4 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-400" />
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                        Executive Key Takeaways
                      </h4>
                    </div>

                    <button
                      onClick={handleDownloadTakeaways}
                      className="flex items-center gap-1.5 text-xs bg-blue-600 hover:bg-blue-500 text-white font-semibold px-3 py-1.5 rounded-lg transition-colors shadow-sm"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Brief</span>
                    </button>
                  </div>

                  {downloadSuccess && (
                    <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-950/70 p-2.5 rounded-lg border border-emerald-800">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>Takeaways brief generated and downloaded successfully!</span>
                    </div>
                  )}

                  <p className="text-xs text-slate-300 leading-relaxed">
                    {podcastNotes?.executiveSummary || activeProgram?.description}
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Core Insights
                  </h4>

                  <div className="space-y-2">
                    {podcastNotes?.keyTakeaways ? (
                      podcastNotes.keyTakeaways.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 text-xs"
                        >
                          <span className="font-mono text-blue-400 font-bold shrink-0">{idx + 1}.</span>
                          <span className="text-slate-200 leading-snug">{item}</span>
                        </div>
                      ))
                    ) : (
                      <div className="p-3 bg-slate-950/60 rounded-lg text-xs text-slate-400">
                        Synthesizing live takeaways from the on-air panel discussion...
                      </div>
                    )}
                  </div>
                </div>

                {podcastNotes?.timestamps && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>Chapter Markers</span>
                    </h4>
                    <div className="space-y-1.5">
                      {podcastNotes.timestamps.map((ts, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 bg-slate-950/40 rounded-lg border border-slate-800/60 text-xs hover:border-slate-700 transition-colors"
                        >
                          <div className="font-mono text-blue-400 text-[11px] font-semibold">{ts.timestamp}</div>
                          <div className="font-medium text-white mt-0.5">{ts.topic}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5">{ts.summary}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Speakers Tab */}
            {podcastTab === 'speakers' && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Featured Panel Roster
                </h4>

                <div className="space-y-3">
                  {PODCAST_SPEAKERS.map((spk) => (
                    <div
                      key={spk.id}
                      className="bg-slate-950/70 rounded-xl p-3.5 border border-slate-800 flex items-start gap-3.5"
                    >
                      <img
                        src={spk.avatar}
                        alt={spk.name}
                        referrerPolicy="no-referrer"
                        className="w-12 h-12 rounded-lg object-cover border border-slate-700/80 shrink-0"
                      />
                      <div className="space-y-1 flex-1">
                        <div className="text-sm font-bold text-white">{spk.name}</div>
                        <div className="text-[11px] text-blue-400 font-medium">
                          {spk.role} · {spk.organization}
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed pt-0.5">
                          {spk.bio}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Q&A Tab */}
            {podcastTab === 'qa' && (
              <div className="space-y-3.5">
                <div className="flex items-center justify-between text-xs pb-1 border-b border-slate-800">
                  <span className="font-bold text-slate-300">Audience Questions Desk</span>
                  <span className="font-mono text-slate-500">{qaList.length} submitted</span>
                </div>

                <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
                  {qaList.map((q) => (
                    <div
                      key={q.id}
                      className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg text-xs space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-300">{q.author}</span>
                        <div className="flex items-center gap-1.5 font-mono text-[10px]">
                          {q.status === 'on_air' && (
                            <span className="text-red-400 font-bold bg-red-950/80 border border-red-800/80 px-1.5 py-0.2 rounded">
                              ON AIR NOW
                            </span>
                          )}
                          {q.status === 'answered' && (
                            <span className="text-emerald-400 font-bold bg-emerald-950/80 border border-emerald-800/80 px-1.5 py-0.2 rounded">
                              ANSWERED
                            </span>
                          )}
                          {q.status === 'queued' && (
                            <span className="text-slate-400 bg-slate-900 px-1.5 py-0.2 rounded">
                              QUEUED
                            </span>
                          )}
                        </div>
                      </div>

                      <p className="text-slate-200 leading-snug">{q.question}</p>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
                        <span className="text-slate-500 font-mono text-[10px]">{q.timestamp}</span>
                        <button
                          onClick={() => handleVoteQA(q.id)}
                          className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono transition-colors border ${
                            q.hasVoted
                              ? 'bg-blue-600 text-white border-blue-500'
                              : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                          }`}
                        >
                          <ThumbsUp className="w-3 h-3" />
                          <span>{q.votes}</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Input bars */}
      {contentType === 'sports' && sportsTab === 'chat' && (
        <form
          onSubmit={handleSendChat}
          className="p-3 bg-slate-950 border-t border-slate-800 flex items-center gap-2"
        >
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Send match reaction or cheer..."
            className="flex-1 bg-slate-900 border border-slate-700/80 rounded-md px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-md transition-colors"
            title="Send chat"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      )}

      {(contentType === 'podcast' || contentType === 'business') && podcastTab === 'qa' && (
        <form
          onSubmit={handleSendQA}
          className="p-3 bg-slate-950 border-t border-slate-800 flex items-center gap-2"
        >
          <input
            type="text"
            value={qaInput}
            onChange={(e) => setQaInput(e.target.value)}
            placeholder="Ask question for the live executive panel..."
            className="flex-1 bg-slate-900 border border-slate-700/80 rounded-md px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-md transition-colors flex items-center gap-1 shrink-0"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Ask</span>
          </button>
        </form>
      )}
    </aside>
  );
};

export default InteractiveSidebar;
