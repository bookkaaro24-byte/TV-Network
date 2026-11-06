/**
 * BroadcastPlayer - Professional Streaming Player
 * Features HLS.js adaptive streaming, SCTE-35 ad break overlay,
 * Hot-Switching live sports cutover indicator, and timeout recovery HUD.
 */

import React, { useRef, useEffect, useState } from 'react';
import Hls from 'hls.js';
import { useBroadcast } from '../context/BroadcastContext';
import { SAMPLE_STREAMS } from '../data/mockBroadcastData';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Radio,
  Zap,
  RotateCcw,
  AlertTriangle,
  SkipForward,
  Clock,
  Sparkles,
} from 'lucide-react';

export const BroadcastPlayer: React.FC = () => {
  const {
    viewingMode,
    setViewingMode,
    activeChannel,
    playout,
    selectedVodProgram,
    channels,
    setActiveChannelId,
  } = useBroadcast();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showControls, setShowControls] = useState<boolean>(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Active program depending on mode
  const currentShow = viewingMode === 'linear' ? playout.currentProgram : selectedVodProgram;

  // Stream URL calculation
  const streamUrl = viewingMode === 'linear' ? playout.activeStreamUrl : selectedVodProgram?.streamUrl || '';

  // Setup Video Playback & HLS instance
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !streamUrl) return;

    // Clean up previous HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const isHlsStream = streamUrl.includes('.m3u8');

    if (isHlsStream && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90,
      });

      hlsRef.current = hls;
      hls.loadSource(streamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (playout.isPlaying) {
          video.play().catch(() => {
            // Browser autoplay policy might require mute
            playout.setIsMuted(true);
            video.muted = true;
            video.play().catch(() => {});
          });
        }
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (_event, data) => {
        const level = hls.levels[data.level];
        if (level && level.bitrate) {
          playout.reportBitrateChange(Math.round(level.bitrate / 1000));
        }
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              if (data.details === 'manifestLoadError' || data.details === 'manifestLoadTimeOut') {
                console.warn('[BroadcastPlayer] Manifest load failed, falling back to backup stream');
                hls.destroy();
                if (videoRef.current) {
                  videoRef.current.src = SAMPLE_STREAMS.SPORTS_LIVE;
                  videoRef.current.load();
                  videoRef.current.play().catch(() => {});
                }
              } else {
                hls.startLoad();
              }
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              hls.destroy();
              if (videoRef.current) {
                videoRef.current.src = SAMPLE_STREAMS.UNIVERSAL_FALLBACK_MP4;
                videoRef.current.load();
                videoRef.current.play().catch(() => {});
              }
              break;
          }
        }
      });
    } else {
      // Direct MP4 / HTML5 native playback
      video.src = streamUrl;
      if (playout.isPlaying) {
        video.play().catch(() => {
          playout.setIsMuted(true);
          video.muted = true;
          video.play().catch(() => {});
        });
      }
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [streamUrl]);

  // Sync mute and volume with hook
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = playout.isMuted;
      videoRef.current.volume = playout.volume;
    }
  }, [playout.isMuted, playout.volume]);

  // Sync play/pause state
  useEffect(() => {
    if (!videoRef.current) return;
    if (playout.isPlaying && videoRef.current.paused) {
      videoRef.current.play().catch(() => {});
    } else if (!playout.isPlaying && !videoRef.current.paused) {
      videoRef.current.pause();
    }
  }, [playout.isPlaying]);

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Auto-hide controls on mouse idle
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (playout.isPlaying) setShowControls(false);
    }, 3500);
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => playout.isPlaying && setShowControls(false)}
      className="relative w-full aspect-video bg-black rounded-lg overflow-hidden border border-slate-800 shadow-2xl group select-none"
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        className="w-full h-full object-contain bg-black"
        playsInline
        onWaiting={() => playout.reportBufferStall(true)}
        onPlaying={() => playout.reportBufferStall(false)}
        onTimeUpdate={(e) => playout.reportPlaybackTick(e.currentTarget.currentTime)}
        onError={() => {
          if (videoRef.current) {
            videoRef.current.src = SAMPLE_STREAMS.UNIVERSAL_FALLBACK_MP4;
            videoRef.current.load();
            videoRef.current.play().catch(() => {});
          }
        }}
      />

      {/* Top HUD Bug (Always visible during broadcast) */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none z-30">
        <div className="flex items-center gap-2">
          {viewingMode === 'linear' ? (
            <div className="flex items-center gap-2 bg-slate-950/85 backdrop-blur-md px-3 py-1.5 rounded border border-slate-700/80 text-xs">
              <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
              <span className="font-extrabold text-white tracking-wider">
                {activeChannel.callSign}
              </span>
              <span className="text-slate-500">|</span>
              <span className="text-slate-300 font-medium">CH {activeChannel.channelNumber}</span>
              {playout.hotSwitch.isActive && (
                <>
                  <span className="text-slate-500">|</span>
                  <span className="flex items-center gap-1 text-amber-400 font-semibold">
                    <Zap className="w-3 h-3 fill-amber-400" />
                    LIVE SRT INGEST
                  </span>
                </>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-slate-950/85 backdrop-blur-md px-3 py-1.5 rounded border border-slate-700/80 text-xs text-amber-400 font-medium">
              <span>VOD ON-DEMAND</span>
            </div>
          )}
        </div>

        {/* Quality & Resolution Bug */}
        <div className="flex items-center gap-2 bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded border border-slate-800 text-xs font-mono text-slate-300">
          <span className="text-emerald-400 font-semibold">{activeChannel.resolution}</span>
          <span className="text-slate-600">·</span>
          <span>{(playout.analytics.currentBitrateKbps / 1000).toFixed(1)} Mbps</span>
        </div>
      </div>

      {/* Hot-Switch Cutover Transition Slate */}
      {playout.hotSwitch.status === 'transitioning' && (
        <div className="absolute inset-0 z-40 bg-slate-950/90 backdrop-blur-sm flex flex-col items-center justify-center text-center p-6 animate-fadeIn">
          <Radio className="w-12 h-12 text-amber-400 animate-spin mb-3" />
          <h4 className="text-lg font-bold text-white mb-1">CONNECTING TO LIVE SRT SPORTS INGEST</h4>
          <p className="text-xs text-slate-400 font-mono">
            Direct frame synchronization · 60fps · Target latency 0.8s
          </p>
        </div>
      )}

      {/* SCTE-35 Active Ad Break Overlay */}
      {playout.activeAdBreak && (
        <div className="absolute top-16 right-4 z-35 max-w-sm bg-slate-950/90 backdrop-blur-md border border-amber-500/40 rounded-lg p-3 shadow-xl animate-slideDown">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-bold text-amber-400 tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              SPONSORED BROADCAST
            </span>
            <span className="font-mono text-slate-300 bg-slate-800 px-1.5 py-0.5 rounded text-[11px]">
              {playout.adTimeRemainingSeconds}s remaining
            </span>
          </div>
          <p className="text-xs text-white font-medium mb-1">{playout.activeAdBreak.title}</p>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800 text-[11px]">
            <span className="text-slate-400">{playout.activeAdBreak.advertiser}</span>
            <button
              onClick={playout.skipAdBreak}
              className="flex items-center gap-1 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2 py-0.5 rounded transition-colors"
            >
              <span>Resume Program</span>
              <SkipForward className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Stream Timeout Watchdog Failure & Recovery Slate */}
      {playout.streamHealth === 'error' && (
        <div className="absolute inset-0 z-40 bg-slate-950/95 flex flex-col items-center justify-center text-center p-6">
          <AlertTriangle className="w-12 h-12 text-red-500 mb-3 animate-bounce" />
          <h3 className="text-lg font-bold text-white mb-1">SIGNAL INGEST INTERRUPTED</h3>
          <p className="text-xs text-red-400 font-mono mb-4 max-w-md">{playout.streamError}</p>
          <div className="flex items-center gap-3">
            <button
              onClick={playout.recoverStream}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold px-4 py-2 rounded-md transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Force Ingest Line Reset</span>
            </button>
          </div>
        </div>
      )}

      {/* Stream Recovering Slate */}
      {playout.streamHealth === 'recovering' && (
        <div className="absolute inset-0 z-40 bg-slate-950/90 flex flex-col items-center justify-center text-center p-6">
          <RotateCcw className="w-10 h-10 text-amber-400 animate-spin mb-3" />
          <h4 className="text-base font-bold text-white mb-1">ENGAGING FAILOVER INGEST PIPELINE</h4>
          <p className="text-xs text-slate-400 font-mono">Attempt {playout.retryCount} of 3 · Restoring buffer...</p>
        </div>
      )}

      {/* Bottom Broadcast Controls Overlay */}
      <div
        className={`absolute inset-x-0 bottom-0 z-30 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent pt-12 pb-4 px-4 transition-opacity duration-300 ${
          showControls ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Progress Bar (Shows program progress relative to 24/7 systemic time) */}
        <div className="mb-3">
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden relative cursor-pointer">
            <div
              className={`h-full transition-all duration-300 ${
                viewingMode === 'linear' ? 'bg-red-600' : 'bg-blue-500'
              }`}
              style={{ width: `${playout.progressPercent}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1 font-mono">
            <span>{playout.formattedElapsed} elapsed</span>
            <div className="flex items-center gap-1.5 text-slate-300">
              <Clock className="w-3 h-3 text-slate-400" />
              <span>{playout.formattedTimeRemaining} remaining in show</span>
            </div>
          </div>
        </div>

        {/* Player Controls Bar */}
        <div className="flex items-center justify-between gap-4">
          {/* Left: Play/Pause, Volume, Channel Quick Switch */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => playout.setIsPlaying(!playout.isPlaying)}
              className="p-2 text-white hover:text-blue-400 transition-colors"
              title={playout.isPlaying ? 'Pause' : 'Play'}
            >
              {playout.isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-white" />}
            </button>

            {/* Volume Control */}
            <div className="flex items-center gap-2 group/vol">
              <button
                onClick={() => playout.setIsMuted(!playout.isMuted)}
                className="p-1.5 text-slate-300 hover:text-white transition-colors"
              >
                {playout.isMuted || playout.volume === 0 ? (
                  <VolumeX className="w-4 h-4 text-red-400" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={playout.isMuted ? 0 : playout.volume}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  playout.setVolume(val);
                  if (val > 0) playout.setIsMuted(false);
                }}
                className="w-16 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>

            {/* Channel Quick Tabs (Linear Mode) */}
            {viewingMode === 'linear' && (
              <div className="hidden sm:flex items-center gap-1 ml-2 bg-slate-900/90 p-0.5 rounded border border-slate-800 text-xs">
                {channels.map((ch) => (
                  <button
                    key={ch.channelId}
                    onClick={() => setActiveChannelId(ch.channelId)}
                    className={`px-2.5 py-1 rounded font-medium transition-colors ${
                      ch.channelId === activeChannel.channelId
                        ? 'bg-slate-800 text-white font-semibold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    CH {ch.channelNumber}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Center: Current Show Title */}
          <div className="hidden md:flex flex-col items-center text-center max-w-md truncate">
            <span className="text-xs font-semibold text-white truncate">
              {currentShow?.title || 'Apex Playout Stream'}
            </span>
            <span className="text-[11px] text-slate-400 truncate">
              {currentShow?.category} · {currentShow?.hostOrTeams}
            </span>
          </div>

          {/* Right: Mode Switcher & Fullscreen */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (viewingMode === 'vod') {
                  setViewingMode('linear');
                } else {
                  setViewingMode('vod');
                }
              }}
              className="text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded transition-colors"
            >
              {viewingMode === 'linear' ? 'Switch to VOD' : 'Back to Linear 24/7'}
            </button>

            <button
              onClick={toggleFullscreen}
              className="p-2 text-slate-300 hover:text-white transition-colors"
              title="Toggle Fullscreen"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
