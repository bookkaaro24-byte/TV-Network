/**
 * ContextualSidebar - Smart Adaptive Broadcast Panel
 * Automatically detects content type:
 * - 'sports': Live scoreboard, real-time match stats, chronology events.
 * - 'podcast': Live chat, downloadable AI notes, executive takeaways, interactive poll.
 * - 'business': Market efficiency indices, executive boardroom deck, live analysis.
 */

import React, { useState } from 'react';
import { useBroadcast } from '../context/BroadcastContext';
import {
  Trophy,
  MessageSquare,
  FileText,
  Download,
  BarChart2,
  Clock,
  Send,
  Zap,
  TrendingUp,
  Radio,
  CheckCircle2,
} from 'lucide-react';

export const ContextualSidebar: React.FC = () => {
  const {
    playout,
    chatMessages,
    sendChatMessage,
    pollData,
    voteInPoll,
    simulatedSportsScore,
    triggerSportsGoal,
  } = useBroadcast();

  const currentProgram = playout.currentProgram;
  const contentType = currentProgram?.contentType || 'sports';

  // Sub-tab selection within the contextual panel
  const [activeTab, setActiveTab] = useState<'main' | 'chat' | 'notes'>('main');
  const [chatInput, setChatInput] = useState<string>('');
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);

  // Sports data
  const sportsData = currentProgram?.sportsData;
  const podcastNotes = currentProgram?.podcastNotes;
  const businessData = currentProgram?.businessData;

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    sendChatMessage(chatInput);
    setChatInput('');
  };

  const handleDownloadNotes = (filename: string) => {
    // Generate text content and trigger browser download
    const content = `APEX BROADCAST NETWORK - EXECUTIVE BRIEF\n==========================================\nProgram: ${currentProgram?.title}\nTimestamp: ${new Date().toISOString()}\n\nEXECUTIVE SUMMARY:\n${podcastNotes?.executiveSummary || 'Real-time production brief.'}\n\nKEY TAKEAWAYS:\n${podcastNotes?.keyTakeaways.map((t, i) => `${i + 1}. ${t}`).join('\n') || ''}\n\nTIMESTAMPS:\n${podcastNotes?.timestamps.map((ts) => `[${ts.timestamp}] ${ts.topic} - ${ts.summary}`).join('\n') || ''}`;

    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'Apex_Show_Notes.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 3000);
  };

  return (
    <aside className="w-full lg:w-96 bg-slate-900/90 border border-slate-800 rounded-lg flex flex-col h-[650px] overflow-hidden shadow-xl">
      {/* Contextual Header Bar */}
      <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {contentType === 'sports' && <Trophy className="w-4 h-4 text-amber-400" />}
          {contentType === 'podcast' && <Zap className="w-4 h-4 text-blue-400" />}
          {contentType === 'business' && <TrendingUp className="w-4 h-4 text-emerald-400" />}
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
            {contentType === 'sports' && 'Live Match Center & Telemetry'}
            {contentType === 'podcast' && 'Live AI Studio & Interaction'}
            {contentType === 'business' && 'Capital Markets & Boardroom'}
          </h3>
        </div>

        {/* Tab switchers if available */}
        <div className="flex items-center gap-1 text-xs">
          {contentType === 'podcast' ? (
            <>
              <button
                onClick={() => setActiveTab('main')}
                className={`px-2 py-0.5 rounded transition-colors ${
                  activeTab === 'main' ? 'bg-slate-800 text-white font-medium' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Notes & Poll
              </button>
              <button
                onClick={() => setActiveTab('chat')}
                className={`px-2 py-0.5 rounded transition-colors ${
                  activeTab === 'chat' ? 'bg-slate-800 text-white font-medium' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Live Chat
              </button>
            </>
          ) : (
            <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              LIVE INGEST
            </span>
          )}
        </div>
      </div>

      {/* Main Content Area (Scrollable) */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 text-slate-300">
        {/* ========================================================= */}
        {/* VIEW 1: SPORTS FEED (Scoreboard, Stats, Match Events) */}
        {/* ========================================================= */}
        {contentType === 'sports' && (
          <>
            {/* Live Scoreboard Card */}
            <div className="bg-slate-950/80 rounded-lg p-3.5 border border-slate-800">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-3 pb-2 border-b border-slate-800">
                <span className="font-semibold text-slate-300">
                  {sportsData?.league || 'International Cup'}
                </span>
                <span className="font-mono text-red-400 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  {simulatedSportsScore.minute}
                </span>
              </div>

              {/* Team vs Team Score Grid */}
              <div className="grid grid-cols-3 items-center text-center py-2">
                <div>
                  <div className="text-2xl mb-1">{sportsData?.teams.home.logo || '⚽'}</div>
                  <div className="text-sm font-bold text-white">{sportsData?.teams.home.name}</div>
                  <div className="text-[11px] text-slate-400">{sportsData?.teams.home.code}</div>
                </div>

                <div>
                  <div className="text-3xl font-extrabold text-white font-mono tracking-wider">
                    {simulatedSportsScore.home} - {simulatedSportsScore.away}
                  </div>
                  <div className="text-[11px] text-amber-400 mt-1 uppercase font-semibold">2nd Half</div>
                </div>

                <div>
                  <div className="text-2xl mb-1">{sportsData?.teams.away.logo || '👑'}</div>
                  <div className="text-sm font-bold text-white">{sportsData?.teams.away.name}</div>
                  <div className="text-[11px] text-slate-400">{sportsData?.teams.away.code}</div>
                </div>
              </div>

              {/* Goal Simulation Buttons (Interactive) */}
              <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between gap-2">
                <button
                  onClick={() => triggerSportsGoal('home')}
                  className="flex-1 py-1 text-[11px] font-medium bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-200 rounded transition-colors"
                >
                  + {sportsData?.teams.home.code} Goal
                </button>
                <button
                  onClick={() => triggerSportsGoal('away')}
                  className="flex-1 py-1 text-[11px] font-medium bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-200 rounded transition-colors"
                >
                  + {sportsData?.teams.away.code} Goal
                </button>
              </div>
            </div>

            {/* Match Statistics & Possession Bars */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Telemetry & Performance
              </h4>

              {/* Possession */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span>{sportsData?.stats?.possession?.[0] || 48}%</span>
                  <span className="text-slate-400 font-sans">Ball Possession</span>
                  <span>{sportsData?.stats?.possession?.[1] || 52}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full flex overflow-hidden">
                  <div
                    className="bg-blue-500 h-full"
                    style={{ width: `${sportsData?.stats?.possession?.[0] || 48}%` }}
                  />
                  <div
                    className="bg-amber-500 h-full"
                    style={{ width: `${sportsData?.stats?.possession?.[1] || 52}%` }}
                  />
                </div>
              </div>

              {/* Shots on Target */}
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

              {/* Pass Accuracy */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span>{sportsData?.stats?.passAccuracy?.[0] || 88}%</span>
                  <span className="text-slate-400 font-sans">Pass Completion</span>
                  <span>{sportsData?.stats?.passAccuracy?.[1] || 92}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full flex overflow-hidden">
                  <div className="bg-blue-500 h-full w-[49%]" />
                  <div className="bg-amber-500 h-full w-[51%]" />
                </div>
              </div>
            </div>

            {/* Match Chronology Events */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Match Timeline Events
              </h4>
              <div className="space-y-2">
                {sportsData?.events?.map((ev) => (
                  <div
                    key={ev.id}
                    className="flex items-start gap-2.5 text-xs p-2 rounded bg-slate-950/60 border border-slate-800/80"
                  >
                    <span className="font-mono text-amber-400 font-bold shrink-0">{ev.minute}</span>
                    <div className="flex-1">
                      <span className="text-slate-200 font-medium">{ev.description}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Ingest Protocol Info */}
            <div className="bg-slate-950/90 rounded p-3 border border-slate-800 text-[11px] font-mono text-slate-400 space-y-1">
              <div className="flex justify-between">
                <span>Ingest Protocol:</span>
                <span className="text-emerald-400 font-bold">
                  {playout.hotSwitch.isActive ? 'SRT Caller (H.265 / 60fps)' : 'HLS Multi-Bitrate'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Latency to Wire:</span>
                <span className="text-white">0.82 seconds</span>
              </div>
              <div className="flex justify-between">
                <span>Dropped Frame Rate:</span>
                <span className="text-emerald-400">0.00%</span>
              </div>
            </div>
          </>
        )}

        {/* ========================================================= */}
        {/* VIEW 2: PODCAST / TECH FEED (Live Notes, Poll & Chat) */}
        {/* ========================================================= */}
        {contentType === 'podcast' && activeTab === 'main' && (
          <>
            {/* Executive Summary Card */}
            <div className="bg-slate-950/80 rounded-lg p-3.5 border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-blue-400" />
                  Live Show Notes & Synthesis
                </span>
                <button
                  onClick={() => handleDownloadNotes(podcastNotes?.downloadFileName || 'Apex_Notes.md')}
                  className="flex items-center gap-1 text-[11px] bg-blue-600 hover:bg-blue-500 text-white font-medium px-2 py-1 rounded transition-colors"
                >
                  <Download className="w-3 h-3" />
                  <span>Download Brief</span>
                </button>
              </div>

              {downloadSuccess && (
                <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-950/60 p-2 rounded border border-emerald-800/80">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Executive notes downloaded successfully!</span>
                </div>
              )}

              <p className="text-xs text-slate-300 leading-relaxed">
                {podcastNotes?.executiveSummary || currentProgram?.description}
              </p>
            </div>

            {/* Key Takeaways */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Architectural Takeaways
              </h4>
              <ul className="space-y-2 text-xs">
                {podcastNotes?.keyTakeaways.map((takeaway, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2 bg-slate-950/50 p-2.5 rounded border border-slate-800/60"
                  >
                    <span className="font-mono text-blue-400 font-bold shrink-0">{idx + 1}.</span>
                    <span className="text-slate-200">{takeaway}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Timestamps */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span>Chapter Bookmarks</span>
              </h4>
              <div className="space-y-1.5">
                {podcastNotes?.timestamps.map((ts, idx) => (
                  <div
                    key={idx}
                    className="p-2 bg-slate-950/40 rounded border border-slate-800/60 text-xs hover:border-slate-700 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between font-mono text-blue-400 mb-0.5">
                      <span className="font-semibold">{ts.timestamp}</span>
                      <span className="text-[10px] text-slate-500 font-sans">Chapter</span>
                    </div>
                    <div className="font-medium text-white">{ts.topic}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{ts.summary}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Interactive Real-Time Poll */}
            <div className="bg-slate-950/90 rounded-lg p-3.5 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <BarChart2 className="w-3.5 h-3.5 text-amber-400" />
                  Live Broadcast Poll
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  {pollData.totalVotes} votes
                </span>
              </div>

              <p className="text-xs text-slate-300 font-medium">{pollData.question}</p>

              <div className="space-y-2">
                {pollData.options.map((opt) => {
                  const percent =
                    pollData.totalVotes > 0
                      ? Math.round((opt.votes / pollData.totalVotes) * 100)
                      : 0;
                  const isUserVote = pollData.userVotedId === opt.id;

                  return (
                    <button
                      key={opt.id}
                      onClick={() => voteInPoll(opt.id)}
                      disabled={!!pollData.userVotedId}
                      className={`w-full text-left p-2 rounded text-xs transition-all relative overflow-hidden border ${
                        isUserVote
                          ? 'border-blue-500 bg-blue-950/40'
                          : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                      }`}
                    >
                      {/* Progress background */}
                      <div
                        className="absolute inset-y-0 left-0 bg-blue-600/20 transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      />
                      <div className="relative z-10 flex items-center justify-between">
                        <span className="font-medium text-slate-200">{opt.text}</span>
                        <span className="font-mono text-slate-400 text-[11px] ml-2">
                          {percent}%
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* ========================================================= */}
        {/* VIEW 2 (SUB): PODCAST LIVE CHAT */}
        {/* ========================================================= */}
        {contentType === 'podcast' && activeTab === 'chat' && (
          <div className="flex flex-col h-full space-y-3">
            <div className="space-y-2.5">
              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className="p-2.5 rounded bg-slate-950/70 border border-slate-800/80 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-white">{msg.sender}</span>
                      {msg.role === 'moderator' && (
                        <span className="text-[10px] text-amber-400 font-mono">[HOST]</span>
                      )}
                      {msg.role === 'analyst' && (
                        <span className="text-[10px] text-blue-400 font-mono">[STAFF]</span>
                      )}
                    </div>
                    <span className="font-mono text-[10px] text-slate-500">{msg.timestamp}</span>
                  </div>
                  <p className="text-slate-300">{msg.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* VIEW 3: BUSINESS & CAPITAL FEED */}
        {/* ========================================================= */}
        {contentType === 'business' && (
          <>
            <div className="bg-slate-950/80 rounded-lg p-3.5 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                  Capital Efficiency Dashboard
                </span>
                <button
                  onClick={() => handleDownloadNotes('Apex_Business_Deck.md')}
                  className="flex items-center gap-1 text-[11px] bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-2 py-1 rounded transition-colors"
                >
                  <Download className="w-3 h-3" />
                  <span>Download Deck</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                {businessData?.keyMetrics.map((metric, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 bg-slate-900/80 rounded border border-slate-800"
                  >
                    <div className="text-[11px] text-slate-400">{metric.label}</div>
                    <div className="text-base font-bold font-mono text-white mt-0.5">
                      {metric.value}
                    </div>
                    <div className="text-[10px] font-mono text-emerald-400 font-medium mt-0.5">
                      {metric.change}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-950/60 p-3 rounded border border-slate-800 text-xs text-slate-300 space-y-2">
              <h4 className="font-bold text-slate-200">Boardroom Consensus Note:</h4>
              <p className="leading-relaxed">
                Founders are locking multi-year enterprise contracts with indexation clauses while holding CAC payback periods under 12 months.
              </p>
            </div>
          </>
        )}
      </div>

      {/* Chat Input Bar (Visible during chat mode or podcast) */}
      {contentType === 'podcast' && activeTab === 'chat' && (
        <form
          onSubmit={handleSendMessage}
          className="p-3 bg-slate-950 border-t border-slate-800 flex items-center gap-2"
        >
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Ask a question for the live panel..."
            className="flex-1 bg-slate-900 border border-slate-700/80 rounded px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors"
            title="Send Message"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      )}
    </aside>
  );
};
