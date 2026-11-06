/**
 * VideoStitcherPanel - Google Cloud Video Stitcher API & SSAI Engine
 * Provides Server-Side Ad Insertion (SSAI), dynamic manifest stitching,
 * slate filler injection, and VOD-to-Linear playlist stitching.
 */

import React, { useState, useEffect } from 'react';
import { useBroadcast } from '../context/BroadcastContext';
import {
  Scissors,
  Zap,
  Play,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  Film,
  CheckCircle2,
  Copy,
  Check,
  FileCode,
  Radio,
  Layers,
  Sliders,
  AlertTriangle,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { VideoStitcherSession } from '../types/broadcast';
import { SAMPLE_STREAMS } from '../data/mockBroadcastData';

export const VideoStitcherPanel: React.FC = () => {
  const {
    playout,
    selectedVodProgram,
    injectScte35Cue,
    adInventory,
    selectedAdCreativeId,
    setSelectedAdCreativeId,
    selectedAdCreative,
    addCustomAdCreative,
    nonLinearAd,
    triggerNonLinearAd,
    dismissNonLinearAd,
  } = useBroadcast();

  // Active Video Stitcher Session State
  const [session, setSession] = useState<VideoStitcherSession>({
    sessionId: `stitch-${Date.now()}`,
    streamName: 'apex-channel-101-linear',
    slateUrl: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=1280&q=80',
    adTagUri: 'https://pubads.g.doubleclick.net/gampad/ads?sz=640x480&iu=/124319096/external/single_ad_samples',
    stitchStatus: 'active',
    stitchedManifestHls: `https://stitcher.apex-tv.live/v1/sessions/stitch-${Date.now()}/master.m3u8`,
    totalAdsInserted: 14,
    totalBreakTimeSeconds: 210,
    vodStitchQueue: [
      { id: 'v1', title: 'The Great AI Compute Squeeze', duration: 48 },
      { id: 'v2', title: 'Champions League Quarterfinals Replay', duration: 98 },
      { id: 'v3', title: 'Zero to $50M ARR: Enterprise Playbook', duration: 42 },
    ],
  });

  const [activeTab, setActiveTab] = useState<'ssai' | 'inventory' | 'slate' | 'manifest' | 'vod-stitcher' | 'non-linear'>('ssai');
  const [adDurationSeconds, setAdDurationSeconds] = useState<number>(selectedAdCreative?.durationSeconds || 15);
  const [adAdvertiser, setAdAdvertiser] = useState<string>(selectedAdCreative?.advertiser || 'Google Cloud AI Studio');
  const [adTitle, setAdTitle] = useState<string>(selectedAdCreative?.title || 'Next-Gen Multimodal Reasoning Models');
  const [isInsertingBreak, setIsInsertingBreak] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Custom Ad Video Ingestion State
  const [isAddingCustomAd, setIsAddingCustomAd] = useState<boolean>(false);
  const [newAdTitle, setNewAdTitle] = useState<string>('');
  const [newAdAdvertiser, setNewAdAdvertiser] = useState<string>('');
  const [newAdVideoUrl, setNewAdVideoUrl] = useState<string>('');
  const [newAdDuration, setNewAdDuration] = useState<number>(15);
  const [newAdCta, setNewAdCta] = useState<string>('https://example.com');
  const [newAdCategory, setNewAdCategory] = useState<'tech' | 'sports' | 'automotive' | 'luxury' | 'business'>('tech');

  // Keep form in sync when selectedAdCreative changes
  useEffect(() => {
    if (selectedAdCreative) {
      setAdTitle(selectedAdCreative.title);
      setAdAdvertiser(selectedAdCreative.advertiser);
      setAdDurationSeconds(selectedAdCreative.durationSeconds);
    }
  }, [selectedAdCreative]);

  // Generate simulated stitched HLS manifest text
  const manifestText = `#EXTM3U
#EXT-X-VERSION:6
#EXT-X-TARGETDURATION:10
#EXT-X-MEDIA-SEQUENCE:4921
#EXT-X-PROGRAM-DATE-TIME:${new Date().toISOString()}

# --- MAIN LINEAR CONTENT SEGMENTS ---
#EXTINF:6.000,
linear_seg_4921.ts
#EXTINF:6.000,
linear_seg_4922.ts

${
  session.stitchStatus === 'ad_break'
    ? `# ========================================================
# VIDEO STITCHER SSAI AD INSERTION (Break: ${session.currentAdBreak?.adTitle})
# ========================================================
#EXT-X-DISCONTINUITY
#EXT-X-CUE-OUT:DURATION=${session.currentAdBreak?.durationSeconds || 15}.000
#EXTINF:5.000,
ad_${session.sessionId}_part1.ts
#EXTINF:5.000,
ad_${session.sessionId}_part2.ts
#EXTINF:5.000,
ad_${session.sessionId}_part3.ts
#EXT-X-CUE-IN
#EXT-X-DISCONTINUITY
`
    : ''
}# --- RESUMING MAIN CONTENT ---
#EXTINF:6.000,
linear_seg_4923.ts
#EXTINF:6.000,
linear_seg_4924.ts`;

  // Trigger SSAI Ad Break Injection
  const handleInsertAdBreak = () => {
    setIsInsertingBreak(true);
    const breakId = `ad-break-${Date.now()}`;
    const effectiveCreative = selectedAdCreative;
    const dur = effectiveCreative?.durationSeconds || adDurationSeconds;
    const title = effectiveCreative?.title || adTitle;
    const advertiser = effectiveCreative?.advertiser || adAdvertiser;
    const streamUrl =
      effectiveCreative?.videoUrl ||
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';

    setSession((prev) => ({
      ...prev,
      stitchStatus: 'ad_break',
      currentAdBreak: {
        breakId,
        durationSeconds: dur,
        elapsedSeconds: 0,
        adTitle: title,
        advertiser,
        vastTag: prev.adTagUri,
      },
      totalAdsInserted: prev.totalAdsInserted + 1,
      totalBreakTimeSeconds: prev.totalBreakTimeSeconds + dur,
    }));

    // Inject SCTE-35 cue marker into context with playable ad video URL!
    injectScte35Cue({
      durationSeconds: dur,
      commandType: 'splice_insert',
      segmentationType: '0x34_provider_ad_start',
      segmentationTypeName: `Video Stitcher SSAI Ad Break (${dur}s)`,
      adCreativeUrl: streamUrl,
      adTitle: title,
      advertiser,
      callToActionUrl: effectiveCreative?.callToActionUrl || 'https://cloud.google.com/ai',
      callToActionText: effectiveCreative?.callToActionText || 'Learn More',
      thumbnailUrl: effectiveCreative?.thumbnailUrl,
    });

    setNotification(`SSAI Ad Break Injected: "${title}" by ${advertiser} (${dur}s) - Live Stitched Playout Active!`);

    // Complete break after duration
    setTimeout(() => {
      setSession((prev) => ({
        ...prev,
        stitchStatus: 'active',
        currentAdBreak: undefined,
      }));
      setIsInsertingBreak(false);
      setNotification('Ad Break Completed. Seamless return to Linear Program.');
      setTimeout(() => setNotification(null), 3500);
    }, dur * 1000);
  };

  // Handle Ingesting Custom Ad Creative
  const handleAddCustomAd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdTitle.trim() || !newAdVideoUrl.trim()) return;

    const newCreative = {
      id: `custom-ad-${Date.now()}`,
      title: newAdTitle.trim(),
      advertiser: newAdAdvertiser.trim() || 'Custom Ingest Sponsor',
      category: newAdCategory,
      durationSeconds: Number(newAdDuration) || 15,
      videoUrl: newAdVideoUrl.trim(),
      thumbnailUrl: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=800&q=80',
      callToActionUrl: newAdCta.trim() || 'https://example.com',
      callToActionText: 'Visit Sponsor',
      description: 'Custom video ad ingested by broadcast engineer.',
      isCustom: true,
    };

    addCustomAdCreative(newCreative);
    setNotification(`Custom Ad Ingested: "${newCreative.title}". Selected for next stitch.`);
    setIsAddingCustomAd(false);
    setNewAdTitle('');
    setNewAdAdvertiser('');
    setNewAdVideoUrl('');
  };

  // Inject Slate Filler
  const handleInjectSlate = () => {
    setSession((prev) => ({
      ...prev,
      stitchStatus: prev.stitchStatus === 'slate_fallback' ? 'active' : 'slate_fallback',
    }));
    setNotification(
      session.stitchStatus === 'slate_fallback'
        ? 'Slate removed. Resumed live program stream.'
        : 'Standby Slate Filler Injected into manifest.'
    );
    setTimeout(() => setNotification(null), 3000);
  };

  const handleCopyManifest = () => {
    navigator.clipboard.writeText(manifestText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="space-y-5 animate-fadeIn text-slate-100">
      {/* Top Header & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-slate-950/80 border border-slate-800 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-600/20 border border-amber-500/40 flex items-center justify-center">
            <Scissors className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-tight">Video Stitcher API & SSAI Engine</h3>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border ${
                  session.stitchStatus === 'ad_break'
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 animate-pulse'
                    : session.stitchStatus === 'slate_fallback'
                    ? 'bg-purple-500/20 text-purple-400 border-purple-500/40'
                    : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                }`}
              >
                ● {session.stitchStatus.replace('_', ' ')}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Server-Side Ad Insertion (SSAI), dynamic manifest manipulation, and slate injection
            </p>
          </div>
        </div>

        {/* Live Stitched Session URL */}
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-slate-400 truncate max-w-[220px]">
            {session.sessionId}
          </span>
          <button
            onClick={handleCopyManifest}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg text-xs font-semibold text-slate-300 hover:text-white transition-colors"
          >
            {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
            <span>{isCopied ? 'Copied' : 'Copy Manifest'}</span>
          </button>
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div className="flex items-center gap-2 p-3 bg-amber-950/80 border border-amber-700/80 text-amber-200 rounded-lg text-xs animate-fadeIn">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-800 pb-2 text-xs overflow-x-auto">
        {[
          { id: 'ssai', label: 'SSAI Ad Stitcher' },
          { id: 'inventory', label: `Ad Creative Inventory (${adInventory.length})` },
          { id: 'non-linear', label: 'Non-Linear Ads (Broadcast Uninterrupted)' },
          { id: 'slate', label: 'Slate Filler' },
          { id: 'manifest', label: 'Stitched Manifest' },
          { id: 'vod-stitcher', label: 'VOD Stitcher' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors shrink-0 ${
              activeTab === tab.id
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: SSAI Ad Insertion */}
      {activeTab === 'ssai' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1">
              <span className="text-xs text-slate-400">Total Ads Inserted</span>
              <div className="text-2xl font-black font-mono text-amber-300">{session.totalAdsInserted}</div>
              <span className="text-[11px] text-slate-500">100% ad-block bypass (Server-Side SSAI)</span>
            </div>
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1">
              <span className="text-xs text-slate-400">Total Break Duration</span>
              <div className="text-2xl font-black font-mono text-cyan-300">{session.totalBreakTimeSeconds}s</div>
              <span className="text-[11px] text-slate-500">Seamless frame-accurate splice</span>
            </div>
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1">
              <span className="text-xs text-slate-400">Active Ingested Creative</span>
              <div className="text-xs font-mono font-bold text-emerald-400 truncate mt-1">
                {selectedAdCreative?.title || 'Google Cloud AI Studio'}
              </div>
              <span className="text-[11px] text-slate-500">{selectedAdCreative?.durationSeconds || 15}s · {selectedAdCreative?.advertiser}</span>
            </div>
          </div>

          {/* Active Ad Creative Visual Ingest Card */}
          <div className="p-4 bg-slate-950/90 border border-amber-500/30 rounded-xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Active Commercial Selected for Live Playout
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('inventory')}
                className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1"
              >
                <span>Browse Inventory ({adInventory.length})</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>

            {selectedAdCreative && (
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                <div className="sm:col-span-4 aspect-video rounded-lg overflow-hidden border border-slate-800 relative bg-black">
                  <img
                    src={selectedAdCreative.thumbnailUrl}
                    alt={selectedAdCreative.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-1.5 left-1.5 bg-black/80 px-1.5 py-0.5 rounded text-[10px] font-mono text-amber-400 font-bold border border-amber-500/30">
                    {selectedAdCreative.durationSeconds}s
                  </div>
                  <div className="absolute bottom-1.5 right-1.5 bg-black/80 px-1.5 py-0.5 rounded text-[9px] uppercase font-bold text-slate-300">
                    {selectedAdCreative.category}
                  </div>
                </div>

                <div className="sm:col-span-8 space-y-1.5 text-xs">
                  <div className="font-bold text-white text-sm line-clamp-1">{selectedAdCreative.title}</div>
                  <div className="text-amber-400 font-semibold">{selectedAdCreative.advertiser}</div>
                  <div className="text-slate-400 text-[11px] line-clamp-2">{selectedAdCreative.description}</div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono truncate">
                    <span>Source:</span>
                    <span className="text-slate-300 truncate">{selectedAdCreative.videoUrl}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={handleInsertAdBreak}
                disabled={isInsertingBreak}
                className={`px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 rounded-lg font-black text-xs uppercase tracking-wider shadow-xl flex items-center gap-2 transition-transform active:scale-95 ${
                  isInsertingBreak ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <Zap className="w-4 h-4 fill-slate-950" />
                <span>
                  {isInsertingBreak
                    ? 'Stitching & Playing Commercial On Air...'
                    : `⚡ Test Ad Ingest Now (1-Click Broadcast Verify)`}
                </span>
              </button>

              <button
                type="button"
                onClick={handleInsertAdBreak}
                disabled={isInsertingBreak}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 transition-colors"
              >
                <Scissors className="w-3.5 h-3.5 text-amber-400" />
                <span>Insert Standard {selectedAdCreative?.durationSeconds || adDurationSeconds}s Break</span>
              </button>

              <button
                type="button"
                onClick={handleInjectSlate}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white rounded-lg font-semibold text-xs transition-colors"
              >
                {session.stitchStatus === 'slate_fallback' ? 'Remove Slate Filler' : 'Inject Standby Slate'}
              </button>
            </div>
          </div>

          {/* Quick Ad Inventory Switcher Shelf */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                Quick Select Ad Spot (1-Click Switch)
              </span>
              <button
                type="button"
                onClick={() => setIsAddingCustomAd(!isAddingCustomAd)}
                className="text-amber-400 hover:text-amber-300 font-bold text-[11px] flex items-center gap-1"
              >
                <span>+ Ingest Custom Video Ad</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {adInventory.map((ad) => {
                const isSelected = selectedAdCreativeId === ad.id;
                return (
                  <div
                    key={ad.id}
                    onClick={() => setSelectedAdCreativeId(ad.id)}
                    className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all flex items-center gap-2.5 ${
                      isSelected
                        ? 'bg-amber-950/40 border-amber-500 shadow-md ring-1 ring-amber-500/50'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                    }`}
                  >
                    <div className="w-14 h-10 rounded overflow-hidden shrink-0 bg-black relative">
                      <img src={ad.thumbnailUrl} alt={ad.title} className="w-full h-full object-cover" />
                      <span className="absolute bottom-0 right-0 bg-black/80 px-1 text-[8px] font-mono text-amber-300 font-bold">
                        {ad.durationSeconds}s
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-white truncate">{ad.title}</div>
                      <div className="text-[10px] text-amber-400 font-semibold truncate">{ad.advertiser}</div>
                    </div>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Custom Ad Ingestion Drawer */}
          {isAddingCustomAd && (
            <form onSubmit={handleAddCustomAd} className="p-4 bg-slate-900 border border-slate-700 rounded-xl space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h5 className="text-xs font-bold text-white uppercase tracking-wider">
                  Ingest Custom Ad Creative (MP4, WebM, HLS)
                </h5>
                <button
                  type="button"
                  onClick={() => setIsAddingCustomAd(false)}
                  className="text-slate-400 hover:text-white text-xs"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-slate-400 block mb-1">Ad Title / Campaign Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Tesla Cybertruck Super Bowl Spot"
                    value={newAdTitle}
                    onChange={(e) => setNewAdTitle(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Advertiser / Brand Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Tesla Motors"
                    value={newAdAdvertiser}
                    onChange={(e) => setNewAdAdvertiser(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-slate-400 block mb-1">Direct Video URL (MP4 / WebM / HLS) *</label>
                  <input
                    type="url"
                    required
                    placeholder="https://example.com/commercial.mp4"
                    value={newAdVideoUrl}
                    onChange={(e) => setNewAdVideoUrl(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Duration (Seconds)</label>
                  <input
                    type="number"
                    min="5"
                    max="120"
                    value={newAdDuration}
                    onChange={(e) => setNewAdDuration(Number(e.target.value) || 15)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Call to Action (CTA) Link</label>
                  <input
                    type="url"
                    placeholder="https://sponsor.com/offer"
                    value={newAdCta}
                    onChange={(e) => setNewAdCta(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddingCustomAd(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded shadow"
                >
                  Ingest & Select for Next Stitch
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* TAB 2: Ad Creative Inventory Management */}
      {activeTab === 'inventory' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-950 border border-slate-800 rounded-xl">
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Digital TV Ad Inventory & Creative Asset Library
              </h4>
              <p className="text-[11px] text-slate-400">
                Verified high-definition commercial spots ready for frame-accurate SSAI stitching
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsAddingCustomAd(true)}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg shadow flex items-center gap-1.5"
            >
              <span>+ Ingest Custom Ad Video</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {adInventory.map((ad) => {
              const isSelected = selectedAdCreativeId === ad.id;
              return (
                <div
                  key={ad.id}
                  className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'bg-slate-900 border-amber-500 shadow-xl ring-1 ring-amber-500/50'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="aspect-video rounded-lg overflow-hidden bg-black relative border border-slate-800">
                      <img src={ad.thumbnailUrl} alt={ad.title} className="w-full h-full object-cover" />
                      <div className="absolute top-2 left-2 flex items-center gap-1.5">
                        <span className="bg-black/80 px-2 py-0.5 rounded text-[10px] font-mono text-amber-400 font-bold border border-amber-500/30">
                          {ad.durationSeconds}s
                        </span>
                        <span className="bg-black/80 px-2 py-0.5 rounded text-[10px] uppercase font-bold text-slate-300">
                          {ad.category}
                        </span>
                      </div>
                      {isSelected && (
                        <div className="absolute top-2 right-2 bg-emerald-600 text-white px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 shadow-lg">
                          <Check className="w-3 h-3" />
                          <span>ON AIR READY</span>
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="text-xs font-bold text-white line-clamp-1">{ad.title}</div>
                      <div className="text-[11px] text-amber-400 font-semibold">{ad.advertiser}</div>
                      <p className="text-[11px] text-slate-400 line-clamp-2 mt-1">{ad.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 mt-2 border-t border-slate-800/80">
                    <span className="text-[10px] font-mono text-slate-500 truncate max-w-[150px]">
                      {ad.isCustom ? 'Custom Ingest' : 'Verified CDN Spot'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedAdCreativeId(ad.id);
                        setNotification(`Selected: "${ad.title}" for SSAI stitching.`);
                        setTimeout(() => setNotification(null), 2500);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        isSelected
                          ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 cursor-default'
                          : 'bg-amber-600 hover:bg-amber-500 text-white shadow'
                      }`}
                    >
                      {isSelected ? '✓ Active Creative' : 'Select for Stitch'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: Slate Filler Management */}
      {activeTab === 'slate' && (
        <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Branded Slate Filler Configuration</h4>
            <span className="text-[11px] text-slate-400">Automatic fallback on signal loss / underfilled ad breaks</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs text-slate-400">Slate Video / Image URL</label>
              <input
                type="text"
                value={session.slateUrl}
                onChange={(e) => setSession((prev) => ({ ...prev, slateUrl: e.target.value }))}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
              />
              <p className="text-[11px] text-slate-500">
                Looping MP4 or JPEG displayed seamlessly when an incoming live feed drops or an ad inventory is empty.
              </p>
            </div>

            <div className="aspect-video rounded-lg overflow-hidden border border-slate-800 bg-slate-900 relative flex items-center justify-center">
              <img src={session.slateUrl} alt="Slate Preview" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <span className="bg-black/80 px-3 py-1 rounded text-xs font-bold text-white border border-white/20">
                  SLATE ACTIVE PREVIEW
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Stitched Manifest Inspector */}
      {activeTab === 'manifest' && (
        <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileCode className="w-4 h-4 text-cyan-400" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Real-Time Stitched HLS Manifest Inspector
              </h4>
            </div>
            <button
              onClick={handleCopyManifest}
              className="text-xs text-blue-400 hover:text-blue-300 font-semibold"
            >
              {isCopied ? 'Copied to Clipboard!' : 'Copy HLS Master'}
            </button>
          </div>

          <pre className="p-3 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-cyan-300 overflow-x-auto max-h-64 leading-relaxed">
            {manifestText}
          </pre>
        </div>
      )}

      {/* TAB 4: VOD-to-Linear Stitcher */}
      {activeTab === 'vod-stitcher' && (
        <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">VOD-to-Linear Playlist Stitcher</h4>
            <span className="text-[11px] text-slate-400">Seamless concatenation without rebuffering</span>
          </div>

          <div className="space-y-2">
            {session.vodStitchQueue.map((item, idx) => (
              <div
                key={item.id}
                className="p-3 bg-slate-900 border border-slate-800 rounded-lg flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-slate-500 font-bold">#{idx + 1}</span>
                  <Film className="w-4 h-4 text-blue-400" />
                  <span className="font-semibold text-white">{item.title}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-slate-400 font-mono">{item.duration} mins</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-500/40 font-mono">
                    READY FOR SEAMLESS STITCH
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 6: Non-Linear Advertising (Playout Never Stops) */}
      {activeTab === 'non-linear' && (
        <div className="space-y-4 animate-fadeIn">
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <h4 className="text-sm font-bold text-white">Non-Linear On-Screen Ad Insertion</h4>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                nonLinearAd?.isActive
                  ? 'bg-amber-500 text-slate-950 animate-pulse'
                  : 'bg-slate-900 text-slate-400 border border-slate-800'
              }`}>
                {nonLinearAd?.isActive ? `● ON-AIR (${nonLinearAd.timeRemainingSeconds}s remaining)` : 'STANDBY'}
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Non-linear advertising displays high-impact sponsor messages, promotional bugs, and squeeze-back L-bars directly over the active broadcast without ever pausing or stopping the underlying linear audio and video stream.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              {/* Option A: Corner Sponsor Bug */}
              <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-white">1. Corner Sponsor Bug</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
                    FLOATING BUG
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-normal">
                  Renders a glossy, animated sponsor card in the bottom-right corner with brand badge, promo code, CTA button, and countdown timer.
                </p>
                <div className="flex items-center gap-2 pt-1">
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
                      setNotification('Triggered Corner Sponsor Bug for 15s (Broadcast Uninterrupted)');
                      setTimeout(() => setNotification(null), 3000);
                    }}
                    className="flex-1 py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs rounded-lg transition-all shadow-md"
                  >
                    Trigger Bug (15s)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      triggerNonLinearAd?.({
                        type: 'corner_bug',
                        title: 'Apex Cloud Studio Ultra',
                        advertiser: 'Apex Network Sponsor',
                        tagline: 'High-performance 4K low-latency edge playout.',
                        promoCode: 'APEX4K',
                        durationSeconds: 30,
                      });
                      setNotification('Triggered Corner Sponsor Bug for 30s (Broadcast Uninterrupted)');
                      setTimeout(() => setNotification(null), 3000);
                    }}
                    className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-lg transition-all"
                  >
                    30s
                  </button>
                </div>
              </div>

              {/* Option B: Squeeze-Back L-Bar Frame */}
              <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-white">2. Squeeze-Back L-Bar Frame</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold">
                    L-FRAME SQUEEZE
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-normal">
                  Smoothly scales the main on-air broadcast to 80% origin-top-right, revealing a sponsor L-deck with rich graphics, promo codes, and ticker.
                </p>
                <div className="flex items-center gap-2 pt-1">
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
                      setNotification('Triggered Squeeze-Back L-Bar Frame for 15s (Broadcast Uninterrupted)');
                      setTimeout(() => setNotification(null), 3000);
                    }}
                    className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg transition-all shadow-md"
                  >
                    Trigger L-Bar (15s)
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
                        durationSeconds: 30,
                      });
                      setNotification('Triggered Squeeze-Back L-Bar Frame for 30s (Broadcast Uninterrupted)');
                      setTimeout(() => setNotification(null), 3000);
                    }}
                    className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-lg transition-all"
                  >
                    30s
                  </button>
                </div>
              </div>
            </div>

            {/* Active Ad Live Status & Dismiss Button */}
            {nonLinearAd?.isActive && (
              <div className="p-3 bg-amber-950/40 border border-amber-600/60 rounded-xl flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                  <span className="font-mono text-amber-200">
                    Active On-Air: <strong>{nonLinearAd.title}</strong> ({nonLinearAd.type.toUpperCase()}) — {nonLinearAd.timeRemainingSeconds}s left
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    dismissNonLinearAd?.();
                    setNotification('Dismissed active non-linear ad.');
                    setTimeout(() => setNotification(null), 2500);
                  }}
                  className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold transition-all text-xs"
                >
                  Dismiss Ad Now
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
