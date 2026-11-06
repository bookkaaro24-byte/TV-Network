/**
 * PublicTVLinkModal - Live Digital TV Stream Links & IPTV M3U Hub
 * 
 * Features:
 * 1. Web TV Channel Link (Browser Viewing for Public Audience):
 *    Direct public link to watch the on-air broadcast network with full TV player & live ticker.
 * 2. IPTV & M3U8 Playlist URL:
 *    Direct link to load the 24/7 channels into external IPTV players (VLC, Kodi, TiviMate, GSE IPTV).
 * 3. 1-Click M3U Download:
 *    Generates and downloads the .m3u playlist file dynamically.
 * 4. HTML Video / IFrame Web Embed:
 *    Copy embed code to broadcast the digital TV network on external websites.
 */

import React, { useState } from 'react';
import {
  Tv,
  X,
  Copy,
  Check,
  ExternalLink,
  Download,
  Share2,
  Radio,
  Globe,
  Sliders,
  Sparkles,
  Layers,
  Code,
  QrCode,
} from 'lucide-react';
import { useBroadcast } from '../context/BroadcastContext';

interface PublicTVLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PublicTVLinkModal: React.FC<PublicTVLinkModalProps> = ({ isOpen, onClose }) => {
  const { activeChannel, channels } = useBroadcast();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  const publicWebTvUrl = `${origin}/?view=public_tv&channel=${activeChannel.channelId}`;
  const m3uPlaylistUrl = `${origin}/api/iptv/playlist.m3u`;
  const pgmStreamUrl = `${origin}/api/stream/master_broadcast_feed.mp4`;
  const iframeEmbedCode = `<iframe src="${publicWebTvUrl}" width="100%" height="600" frameborder="0" allow="autoplay; fullscreen" allowfullscreen></iframe>`;

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    setTimeout(() => {
      setCopiedKey(null), 2500;
    }, 2500);
  };

  const handleDownloadM3u = () => {
    window.open('/api/iptv/playlist.m3u', '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-950 border border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-red-600 to-amber-500 flex items-center justify-center shadow-lg shadow-red-950/40">
              <Tv className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Public Web TV &amp; IPTV Stream Links</span>
                <span className="text-[10px] font-mono bg-red-950 text-red-400 border border-red-800 px-2 py-0.5 rounded-full font-bold">
                  LIVE ON-AIR
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Share public TV links for viewers or load the feed into any IPTV app, smart TV, or media player.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* Card 1: Public Web TV Channel Link (for viewers in browser) */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-white text-sm">Public Web TV Channel Link</span>
              </div>
              <span className="text-[10px] font-mono bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded border border-emerald-800 font-bold">
                BROWSER READY
              </span>
            </div>
            <p className="text-slate-400 text-xs">
              Give this URL to viewers to stream your live on-air network directly in their browser with full-screen TV view, live ticker, and EPG:
            </p>

            <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl p-2 font-mono text-[11px] text-emerald-300">
              <input
                type="text"
                readOnly
                value={publicWebTvUrl}
                className="w-full bg-transparent text-emerald-300 focus:outline-none select-all"
              />
              <button
                type="button"
                onClick={() => copyText(publicWebTvUrl, 'web_tv')}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg flex items-center gap-1 shrink-0 transition-colors shadow"
              >
                {copiedKey === 'web_tv' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'web_tv' ? 'Copied' : 'Copy Link'}</span>
              </button>
              <a
                href={publicWebTvUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg shrink-0 transition-colors"
                title="Open in new tab"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Card 2: IPTV M3U Playlist Export (for VLC, Kodi, TiviMate, Smart TVs) */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-purple-400" />
                <span className="font-bold text-white text-sm">IPTV M3U / M3U8 Playlist Feed</span>
              </div>
              <button
                type="button"
                onClick={handleDownloadM3u}
                className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 transition-colors shadow"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download .M3U File</span>
              </button>
            </div>
            <p className="text-slate-400 text-xs">
              Load this M3U URL directly into external IPTV software (VLC, Kodi, TiviMate, Apple TV, GSE Smart IPTV) to watch all {channels.length} channels:
            </p>

            <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl p-2 font-mono text-[11px] text-purple-300">
              <input
                type="text"
                readOnly
                value={m3uPlaylistUrl}
                className="w-full bg-transparent text-purple-300 focus:outline-none select-all"
              />
              <button
                type="button"
                onClick={() => copyText(m3uPlaylistUrl, 'm3u_url')}
                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg flex items-center gap-1 shrink-0 transition-colors shadow"
              >
                {copiedKey === 'm3u_url' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'm3u_url' ? 'Copied' : 'Copy M3U URL'}</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px] text-slate-400 font-mono">
              <div className="p-2 bg-slate-950 rounded-lg border border-slate-800">
                <div className="text-white font-bold">VLC Player</div>
                <div className="text-[10px] text-slate-500">Media &gt; Open Network</div>
              </div>
              <div className="p-2 bg-slate-950 rounded-lg border border-slate-800">
                <div className="text-white font-bold">Kodi</div>
                <div className="text-[10px] text-slate-500">IPTV Simple Client</div>
              </div>
              <div className="p-2 bg-slate-950 rounded-lg border border-slate-800">
                <div className="text-white font-bold">TiviMate</div>
                <div className="text-[10px] text-slate-500">Add M3U Playlist</div>
              </div>
              <div className="p-2 bg-slate-950 rounded-lg border border-slate-800">
                <div className="text-white font-bold">Smart TV / Apple TV</div>
                <div className="text-[10px] text-slate-500">GSE / Smarters Pro</div>
              </div>
            </div>
          </div>

          {/* Card 3: Direct Master Program Stream URL (MP4 / HLS) */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-cyan-400" />
                <span className="font-bold text-white text-sm">Direct Master Stream Stream URL</span>
              </div>
              <span className="text-[10px] font-mono text-cyan-400">1080p60 CBR</span>
            </div>

            <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl p-2 font-mono text-[11px] text-cyan-300">
              <input
                type="text"
                readOnly
                value={pgmStreamUrl}
                className="w-full bg-transparent text-cyan-300 focus:outline-none select-all"
              />
              <button
                type="button"
                onClick={() => copyText(pgmStreamUrl, 'pgm_url')}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg flex items-center gap-1 shrink-0 transition-colors"
              >
                {copiedKey === 'pgm_url' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'pgm_url' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* Card 4: HTML Video / IFrame Embed Code */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Code className="w-4 h-4 text-amber-400" />
                <span className="font-bold text-white text-sm">Embed on Any Website (HTML IFrame)</span>
              </div>
              <button
                type="button"
                onClick={() => copyText(iframeEmbedCode, 'iframe_code')}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg flex items-center gap-1 transition-colors text-[11px]"
              >
                {copiedKey === 'iframe_code' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedKey === 'iframe_code' ? 'Copied' : 'Copy Embed Code'}</span>
              </button>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 font-mono text-[10px] text-slate-400 break-all select-all">
              {iframeEmbedCode}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between text-xs">
          <div className="text-slate-400 font-mono text-[11px]">
            Active Channel: CH {activeChannel.channelNumber} ({activeChannel.channelName})
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
