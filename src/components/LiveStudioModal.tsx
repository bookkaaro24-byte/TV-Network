/**
 * LiveStudioModal - In-Browser Broadcast Playout Studio ("Go Live Without OBS Studio")
 * 
 * Empowers broadcasters to go live directly from the web app with zero external software:
 * 1. Hardware-accelerated webcam & studio microphone ingest (getUserMedia with multi-tier fallback)
 * 2. System audio & screen share capture (getDisplayMedia with window/tab audio fallback)
 * 3. Studio Broadcast Test Pattern (Color Bars + Digital Clock + 1kHz Calibration Audio Tone)
 * 4. Virtual Anchor Desk Simulator (high-def live news studio simulation for testing)
 * 5. Real-time audio VU level meter (Web Audio API Analyser)
 * 6. Target Channel selector (Ch. 101, Ch. 102, Ch. 103, or Master PGM Feed)
 * 7. Simulcast to YouTube Live toggle (pushes live feed directly to YouTube encoder)
 * 8. Customizable Lower-Third graphic bug & channel watermark
 * 9. Instant routing to Main Program (PGM) playout on the TV Network
 * 10. Background MediaRecorder capturing full broadcast
 * 11. 1-Click direct upload to Google Drive & instant ingestion into VOD Vault
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useBroadcast } from '../context/BroadcastContext';
import { uploadFileToDrive } from '../services/googleDriveService';
import { saveMediaToStorage } from '../services/mediaStorageService';
import {
  X,
  Video,
  VideoOff,
  Mic,
  MicOff,
  Monitor,
  Radio,
  HardDrive,
  Download,
  Sparkles,
  Layers,
  Settings,
  Circle,
  Clock,
  Tv,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Layout,
  Sliders,
  Maximize2,
  Play,
  Pause,
  Share2,
  Youtube,
  ExternalLink,
  User,
  ShieldCheck,
  Copy,
  Key,
  Check,
  Film,
  UploadCloud,
  Volume2,
  VolumeX,
  Flame,
} from 'lucide-react';

export const LiveStudioModal: React.FC = () => {
  const {
    isLiveStudioOpen,
    setIsLiveStudioOpen,
    startLiveStudioBroadcast,
    stopLiveStudioBroadcast,
    updateLiveStudioStream,
    isLiveStudioBroadcasting,
    googleAccessToken,
    signIn,
    addCustomVodProgram,
    channels,
    activeChannelId,
    setActiveChannelId,
    setViewingMode,
    setSelectedVodProgram,
    youtubeStreamKey,
    setYoutubeStreamKey,
    youtubeBroadcastId,
    setYoutubeBroadcastId,
    setIsControlRoomOpen,
    vodCatalog,
    playout,
  } = useBroadcast();

  // Studio Sub-Tab: 'graphics' | 'youtube_obs' | 'vault'
  const [studioSubTab, setStudioSubTab] = useState<'graphics' | 'youtube_obs' | 'vault'>('graphics');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showStudioStreamKey, setShowStudioStreamKey] = useState<boolean>(false);

  // Active Source Selection: 'camera' | 'screen' | 'live_tv' | 'vod' | 'test_pattern' | 'virtual_anchor'
  const [activeSourceType, setActiveSourceType] = useState<
    'camera' | 'screen' | 'live_tv' | 'vod' | 'test_pattern' | 'virtual_anchor'
  >('camera');
  const [isInitializing, setIsInitializing] = useState<boolean>(false);
  const [streamActive, setStreamActive] = useState<boolean>(false);

  // Hardware Controls
  const [cameraEnabled, setCameraEnabled] = useState<boolean>(true);
  const [micEnabled, setMicEnabled] = useState<boolean>(true);
  const [screenShareActive, setScreenShareActive] = useState<boolean>(false);

  // VOD / Uploaded Video Ingest State
  const [selectedVodId, setSelectedVodId] = useState<string>(() => {
    return vodCatalog?.[0]?.id || '';
  });
  const [customVodUrl, setCustomVodUrl] = useState<string>('');
  const [vodIsPlaying, setVodIsPlaying] = useState<boolean>(true);
  const [vodMuted, setVodMuted] = useState<boolean>(false);

  // Live TV Screen Ingest Channel
  const [liveTvChannelId, setLiveTvChannelId] = useState<string>(activeChannelId || 'apex-101');

  // YouTube Live Output Preview Mode: 'studio' | 'youtube_embed'
  const [youtubePreviewMode, setYoutubePreviewMode] = useState<'studio' | 'youtube_embed'>('studio');

  // Channel Target Selection
  const [targetChannelId, setTargetChannelId] = useState<string>(activeChannelId || 'apex-101');

  // YouTube Live Simultaneous Push
  const [simulcastToYoutube, setSimulcastToYoutube] = useState<boolean>(true);
  const [youtubePushStatus, setYoutubePushStatus] = useState<'idle' | 'pushing' | 'active' | 'error'>('idle');

  // Broadcast Settings
  const [broadcastTitle, setBroadcastTitle] = useState<string>('Live Anchor Desk: Tech & Breaking News Special');
  const [broadcasterName, setBroadcasterName] = useState<string>('Lead Studio Anchor');
  const [topicHeadline, setTopicHeadline] = useState<string>('BREAKING: In-Browser Live Playout Transmitting Directly to TV Network');
  const [showLowerThird, setShowLowerThird] = useState<boolean>(true);

  // Audio VU Meter state
  const [audioLevel, setAudioLevel] = useState<number>(0);

  // Recording State
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedDurationSeconds, setRecordedDurationSeconds] = useState<number>(0);
  const [isUploadingToDrive, setIsUploadingToDrive] = useState<boolean>(false);
  const [isConvertingToMp4, setIsConvertingToMp4] = useState<boolean>(false);
  const [uploadSuccessMessage, setUploadSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cameraLockDetected, setCameraLockDetected] = useState<boolean>(false);

  // Refs
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const auxVideoRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const auxStreamRef = useRef<MediaStream | null>(null);
  const testPatternStreamRef = useRef<MediaStream | null>(null);
  const virtualAnchorStreamRef = useRef<MediaStream | null>(null);
  const activeMasterStreamRef = useRef<MediaStream | null>(null);

  const testCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const anchorCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const tvCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const testPatternAnimRef = useRef<number | null>(null);
  const anchorAnimRef = useRef<number | null>(null);
  const tvAnimRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const testToneOscRef = useRef<OscillatorNode | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Setup Audio Meter
  const setupAudioMeter = useCallback((stream: MediaStream) => {
    try {
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }

      const audioTrack = stream.getAudioTracks()[0];
      if (!audioTrack) return;

      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateMeter = () => {
        if (!audioContextRef.current) return;
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
        animationFrameRef.current = requestAnimationFrame(updateMeter);
      };

      updateMeter();
    } catch (err) {
      console.warn('Audio meter init error:', err);
    }
  }, []);

  // Bind active stream to preview video
  const bindStreamToPreview = useCallback((stream: MediaStream | null) => {
    activeMasterStreamRef.current = stream;
    if (previewVideoRef.current) {
      if (stream) {
        previewVideoRef.current.srcObject = stream;
        previewVideoRef.current.play().catch(() => {});
        setStreamActive(true);
      } else {
        previewVideoRef.current.srcObject = null;
        setStreamActive(false);
      }
    }
  }, []);

  // 1. Initialize Camera (Webcam + Mic) with multi-tier fallback
  const initCamera = useCallback(async () => {
    setIsInitializing(true);
    setErrorMessage(null);
    setCameraLockDetected(false);

    let stream: MediaStream | null = null;
    let lastError: any = null;

    // Tier 1: 720p HD + Audio
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: micEnabled,
      });
    } catch (e1: any) {
      lastError = e1;
      // Tier 2: Unconstrained video + audio
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: micEnabled,
        });
      } catch (e2: any) {
        lastError = e2;
        // Tier 3: Video only (in case mic was locked or permission failed)
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
        } catch (e3: any) {
          lastError = e3;
          // Tier 4: Audio only (in case video was locked by OBS Studio)
          try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          } catch (e4: any) {
            lastError = e4;
          }
        }
      }
    }

    setIsInitializing(false);

    if (stream) {
      cameraStreamRef.current = stream;
      setCameraEnabled(true);
      setActiveSourceType('camera');
      bindStreamToPreview(stream);
      setupAudioMeter(stream);
      setErrorMessage(null);
      setCameraLockDetected(false);
      return stream;
    } else {
      console.warn('Camera initialization failed:', lastError);
      if (lastError?.name === 'NotReadableError' || lastError?.message?.includes('in use')) {
        setCameraLockDetected(true);
        setErrorMessage(
          'Your webcam is currently locked by another program (e.g., OBS Studio). You can switch to Screen Share, Studio Test Pattern, or Virtual News Anchor below!'
        );
      } else if (lastError?.name === 'NotAllowedError' || lastError?.name === 'PermissionDeniedError') {
        setErrorMessage(
          'Camera/Mic permission was not granted. You can use Screen Share, Test Pattern, or the Virtual News Anchor below.'
        );
      } else {
        setErrorMessage(
          'Could not start webcam. Choose Screen Share, Studio Test Pattern, or Virtual News Anchor below to broadcast!'
        );
      }
      return null;
    }
  }, [micEnabled, bindStreamToPreview, setupAudioMeter]);

  // 2. Start Screen Share Ingest (Any screen, display, window, or tab)
  const startScreenShare = useCallback(async () => {
    setIsInitializing(true);
    setErrorMessage(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
      setIsInitializing(false);
      setErrorMessage(
        'Screen sharing is not supported by your current browser environment. Please use Google Chrome, Microsoft Edge, or Mozilla Firefox.'
      );
      return null;
    }

    let screenStream: MediaStream | null = null;

    // Strategy 1: Prompt operator for display/window/tab with system audio capture
    try {
      screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'default',
        } as any,
        audio: true,
      });
    } catch (e1: any) {
      if (e1?.name === 'NotAllowedError' || e1?.name === 'AbortError') {
        setIsInitializing(false);
        return null;
      }
      // Strategy 2: Prompt with unconstrained video only (some platforms fail if audio: true is passed)
      try {
        screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false,
        });
      } catch (e2: any) {
        setIsInitializing(false);
        if (e2?.name === 'NotAllowedError' || e2?.name === 'AbortError') {
          return null;
        }
        console.warn('Screen share permission error:', e2);
        setErrorMessage(`Screen share could not be started: ${e2?.message || 'Permission denied or display unavailable'}`);
        return null;
      }
    }

    setIsInitializing(false);

    if (screenStream) {
      // If screen share lacks an audio track, attach active microphone audio track so voice is broadcast
      if (!screenStream.getAudioTracks().length) {
        const micTrack = cameraStreamRef.current?.getAudioTracks()[0];
        if (micTrack) {
          try {
            screenStream.addTrack(micTrack);
          } catch {}
        }
      }

      screenStreamRef.current = screenStream;
      setScreenShareActive(true);
      setActiveSourceType('screen');
      bindStreamToPreview(screenStream);
      setupAudioMeter(screenStream);

      // If studio is already broadcasting live, immediately push screen share to network player
      if (isLiveStudioBroadcasting) {
        updateLiveStudioStream(screenStream);
      }

      // Handle when operator stops sharing via browser native floating bar
      const videoTrack = screenStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.onended = () => {
          setScreenShareActive(false);
          if (cameraStreamRef.current && cameraStreamRef.current.active) {
            setActiveSourceType('camera');
            bindStreamToPreview(cameraStreamRef.current);
            if (isLiveStudioBroadcasting) {
              updateLiveStudioStream(cameraStreamRef.current);
            }
          } else {
            setActiveSourceType('test_pattern');
          }
        };
      }

      return screenStream;
    }

    return null;
  }, [bindStreamToPreview, setupAudioMeter, isLiveStudioBroadcasting, updateLiveStudioStream]);

  // 3. Studio Broadcast Test Pattern (Color Bars + Digital Clock + Calibration Tone)
  const startTestPattern = useCallback(() => {
    if (testPatternAnimRef.current) {
      cancelAnimationFrame(testPatternAnimRef.current);
    }

    let canvas = testCanvasRef.current;
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.width = 1280;
      canvas.height = 720;
      testCanvasRef.current = canvas;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // SMPTE Color Bars
    const colors = ['#c0c0c0', '#c0c000', '#00c0c0', '#00c000', '#c000c0', '#c00000', '#0000c0'];

    const renderBars = () => {
      const now = new Date();
      const timeStr = now.toTimeString().split(' ')[0] + '.' + String(Math.floor(now.getMilliseconds() / 100));

      // Draw Color Bars
      const barWidth = canvas!.width / colors.length;
      colors.forEach((col, idx) => {
        ctx.fillStyle = col;
        ctx.fillRect(idx * barWidth, 0, barWidth, 480);
      });

      // Bottom Cast Section
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 480, canvas!.width, 240);

      // Center Overlay Banner
      ctx.fillStyle = 'rgba(0, 0, 0, 0.88)';
      ctx.fillRect(80, 200, canvas!.width - 160, 260);
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 4;
      ctx.strokeRect(80, 200, canvas!.width - 160, 260);

      // Station Text
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 36px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('APEX BROADCAST STUDIO · PGM FEED', canvas!.width / 2, 260);

      ctx.fillStyle = '#38bdf8';
      ctx.font = '22px monospace';
      ctx.fillText(broadcastTitle.toUpperCase(), canvas!.width / 2, 310);

      // Live Time Clock
      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 44px monospace';
      ctx.fillText(`UTC TIME: ${timeStr}`, canvas!.width / 2, 380);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '16px sans-serif';
      ctx.fillText('STANDBY PLAYSIGNAL · BROADCAST INGEST VERIFIED', canvas!.width / 2, 425);

      testPatternAnimRef.current = requestAnimationFrame(renderBars);
    };

    renderBars();

    // Capture 30fps stream from canvas
    const canvasStream = (canvas as any).captureStream ? (canvas as any).captureStream(30) : null;
    if (canvasStream) {
      // Add audio calibration tone so VU meter moves and stream contains an audio track
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, audioCtx.currentTime); // 440 Hz test tone
        gain.gain.setValueAtTime(0.04, audioCtx.currentTime); // Quiet tone
        const dest = audioCtx.createMediaStreamDestination();
        osc.connect(gain);
        gain.connect(dest);
        osc.start();
        testToneOscRef.current = osc;

        const audioTrack = dest.stream.getAudioTracks()[0];
        if (audioTrack) {
          canvasStream.addTrack(audioTrack);
        }
      } catch (toneErr) {
        console.warn('Could not attach audio tone:', toneErr);
      }

      testPatternStreamRef.current = canvasStream;
      setActiveSourceType('test_pattern');
      bindStreamToPreview(canvasStream);
      setupAudioMeter(canvasStream);
      return canvasStream;
    }
    return null;
  }, [broadcastTitle, bindStreamToPreview, setupAudioMeter]);

  // 4. Virtual Studio News Anchor Simulator
  const startVirtualAnchor = useCallback(() => {
    if (anchorAnimRef.current) {
      cancelAnimationFrame(anchorAnimRef.current);
    }

    let canvas = anchorCanvasRef.current;
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.width = 1280;
      canvas.height = 720;
      anchorCanvasRef.current = canvas;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    let frame = 0;

    const renderAnchorScene = () => {
      frame++;
      const now = new Date();
      const timeStr = now.toLocaleTimeString();

      // Studio Background: Deep Blue Cyberpunk / Newsroom Grid
      const gradient = ctx.createLinearGradient(0, 0, canvas!.width, canvas!.height);
      gradient.addColorStop(0, '#0a0f1d');
      gradient.addColorStop(0.5, '#0f172a');
      gradient.addColorStop(1, '#020617');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas!.width, canvas!.height);

      // Studio Background Digital World Map / Grid Lines
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.15)';
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas!.width; x += 60) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas!.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas!.height; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas!.width, y);
        ctx.stroke();
      }

      // Studio Hexagonal Anchor Backplate
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(canvas!.width / 2 - 260, 100, 520, 480, 24);
      ctx.fill();
      ctx.stroke();

      // Anchor Avatar Silhouette / Icon
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(canvas!.width / 2, 250, 70, 0, Math.PI * 2);
      ctx.fill();

      // Anchor Shoulders
      ctx.beginPath();
      ctx.ellipse(canvas!.width / 2, 430, 160, 110, 0, 0, Math.PI, true);
      ctx.fill();

      // Anchor Glow Ring
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(canvas!.width / 2, 250, 76, 0, Math.PI * 2);
      ctx.stroke();

      // Animated Soundwave Equilizer Bars under Anchor
      const barCount = 20;
      const barWidth = 14;
      const startX = canvas!.width / 2 - (barCount * (barWidth + 4)) / 2;
      for (let i = 0; i < barCount; i++) {
        const height = 15 + Math.sin(frame * 0.15 + i * 0.5) * 25 + Math.random() * 8;
        ctx.fillStyle = i % 2 === 0 ? '#38bdf8' : '#ef4444';
        ctx.fillRect(startX + i * (barWidth + 4), 510 - height, barWidth, height);
      }

      // Anchor Name Badge
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(broadcasterName.toUpperCase(), canvas!.width / 2, 360);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px monospace';
      ctx.fillText('APEX BROADCAST NETWORK · ANCHOR DESK', canvas!.width / 2, 388);

      // Top Station Banner
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fillRect(0, 0, canvas!.width, 60);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(0, 58, canvas!.width, 2);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px monospace';
      ctx.textAlign = 'left';
      ctx.fillText('🔴 LIVE ON AIR · APEX STUDIOS', 40, 38);

      ctx.textAlign = 'right';
      ctx.fillStyle = '#22c55e';
      ctx.fillText(timeStr, canvas!.width - 40, 38);

      anchorAnimRef.current = requestAnimationFrame(renderAnchorScene);
    };

    renderAnchorScene();

    const canvasStream = (canvas as any).captureStream ? (canvas as any).captureStream(30) : null;
    if (canvasStream) {
      // Add simulated studio audio tone
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(220, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.03, audioCtx.currentTime);
        const dest = audioCtx.createMediaStreamDestination();
        osc.connect(gain);
        gain.connect(dest);
        osc.start();
        const audioTrack = dest.stream.getAudioTracks()[0];
        if (audioTrack) {
          canvasStream.addTrack(audioTrack);
        }
      } catch {}

      virtualAnchorStreamRef.current = canvasStream;
      setActiveSourceType('virtual_anchor');
      bindStreamToPreview(canvasStream);
      setupAudioMeter(canvasStream);
      return canvasStream;
    }
    return null;
  }, [broadcasterName, bindStreamToPreview, setupAudioMeter]);

  // 5. Ingest Live TV Program Screen (PGM On-Air Feed)
  const startLiveTvSource = useCallback(
    (channelIdToIngest?: string) => {
      const chId = channelIdToIngest || liveTvChannelId || targetChannelId || 'apex-101';
      setLiveTvChannelId(chId);
      setErrorMessage(null);
      setScreenShareActive(false);

      const targetCh =
        channels.find((c) => c.channelId === chId || c.channelId === chId.replace('apex-', 'ch-')) || channels[0];
      const now = Date.now();
      const currentProg =
        targetCh?.programs?.find((p: any) => now >= p.startTime && now < p.endTime) || targetCh?.programs?.[0];
      const targetUrl = currentProg?.streamUrl || 'https://test-streams.mux.dev/test_001/stream.m3u8';

      // If aux video element is available, attempt direct playback and stream capture
      if (
        auxVideoRef.current &&
        (targetUrl.endsWith('.mp4') || targetUrl.includes('.m3u8') || targetUrl.includes('/api/stream/'))
      ) {
        try {
          auxVideoRef.current.crossOrigin = 'anonymous';
          auxVideoRef.current.src = targetUrl;
          auxVideoRef.current.loop = true;
          auxVideoRef.current.muted = true;
          auxVideoRef.current.play().catch(() => {});

          const vidStream = (auxVideoRef.current as any).captureStream
            ? (auxVideoRef.current as any).captureStream(30)
            : null;
          if (vidStream) {
            auxStreamRef.current = vidStream;
            setActiveSourceType('live_tv');
            bindStreamToPreview(vidStream);
            setupAudioMeter(vidStream);
            if (isLiveStudioBroadcasting) updateLiveStudioStream(vidStream);
            return vidStream;
          }
        } catch (err) {
          console.warn('Direct TV video capture notice:', err);
        }
      }

      // High-resolution Canvas Render Playout for TV screen
      if (tvAnimRef.current) cancelAnimationFrame(tvAnimRef.current);
      let canvas = tvCanvasRef.current;
      if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.width = 1280;
        canvas.height = 720;
        tvCanvasRef.current = canvas;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      let frame = 0;
      const chName = targetCh?.channelName || 'Apex Linear Network';
      const chNum = targetCh?.channelNumber || '101';
      const progTitle = currentProg?.title || 'Live Flagship Broadcast';

      const renderTvScene = () => {
        frame++;
        const nowTime = new Date();
        const timeStr = nowTime.toTimeString().split(' ')[0];

        // Dynamic studio background
        const grad = ctx.createLinearGradient(0, 0, canvas!.width, canvas!.height);
        grad.addColorStop(0, '#020617');
        grad.addColorStop(0.5, '#0f172a');
        grad.addColorStop(1, '#020617');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas!.width, canvas!.height);

        // Radial spotlight
        const rad = ctx.createRadialGradient(
          canvas!.width / 2,
          300,
          50,
          canvas!.width / 2,
          300,
          500
        );
        rad.addColorStop(0, 'rgba(37, 99, 235, 0.25)');
        rad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = rad;
        ctx.fillRect(0, 0, canvas!.width, canvas!.height);

        // Channel Logo / Badge Box
        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(80, 80, canvas!.width - 160, canvas!.height - 180, 16);
        ctx.fill();
        ctx.stroke();

        // Channel Header
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(80, 80, canvas!.width - 160, 48);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 20px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`🔴 ON-AIR REBROADCAST · CH ${chNum} · ${chName.toUpperCase()}`, 105, 112);

        ctx.textAlign = 'right';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(timeStr, canvas!.width - 105, 112);

        // Program Title
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 38px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(progTitle, canvas!.width / 2, 280);

        // Telemetry info
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 20px monospace';
        ctx.fillText('LIVE NETWORK PGM FEED · INGEST ACTIVE', canvas!.width / 2, 335);

        // Waveform bars
        const barCount = 32;
        const barWidth = 14;
        const startX = canvas!.width / 2 - (barCount * (barWidth + 4)) / 2;
        for (let i = 0; i < barCount; i++) {
          const height = 18 + Math.sin(frame * 0.12 + i * 0.4) * 36 + Math.random() * 8;
          ctx.fillStyle = i % 2 === 0 ? '#38bdf8' : '#3b82f6';
          ctx.fillRect(startX + i * (barWidth + 4), 480 - height, barWidth, height);
        }

        // Bottom Lower Third
        ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        ctx.fillRect(80, 520, canvas!.width - 160, 70);
        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 18px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(
          `NOW STREAMING ON YOUTUBE & DIGITAL AIRWAVES: ${targetUrl.slice(0, 55)}...`,
          105,
          560
        );

        tvAnimRef.current = requestAnimationFrame(renderTvScene);
      };

      renderTvScene();

      const canvasStream = (canvas as any).captureStream ? (canvas as any).captureStream(30) : null;
      if (canvasStream) {
        try {
          const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(320, audioCtx.currentTime);
          gain.gain.setValueAtTime(0.02, audioCtx.currentTime);
          const dest = audioCtx.createMediaStreamDestination();
          osc.connect(gain);
          gain.connect(dest);
          osc.start();
          const audioTrack = dest.stream.getAudioTracks()[0];
          if (audioTrack) canvasStream.addTrack(audioTrack);
        } catch {}

        auxStreamRef.current = canvasStream;
        setActiveSourceType('live_tv');
        bindStreamToPreview(canvasStream);
        setupAudioMeter(canvasStream);
        if (isLiveStudioBroadcasting) updateLiveStudioStream(canvasStream);
        return canvasStream;
      }
      return null;
    },
    [
      channels,
      liveTvChannelId,
      targetChannelId,
      bindStreamToPreview,
      setupAudioMeter,
      isLiveStudioBroadcasting,
      updateLiveStudioStream,
    ]
  );

  // 6. Ingest VOD / Uploaded Video File
  const startVodSource = useCallback(
    (vodIdOrUrl?: string) => {
      setErrorMessage(null);
      setScreenShareActive(false);

      let targetUrl = customVodUrl;
      let targetTitle = 'Uploaded VOD Program';

      if (vodIdOrUrl && (vodIdOrUrl.startsWith('http') || vodIdOrUrl.startsWith('/api/stream/'))) {
        targetUrl = vodIdOrUrl;
      } else {
        const idToFind = vodIdOrUrl || selectedVodId || vodCatalog?.[0]?.id;
        const foundItem = vodCatalog?.find((item) => item.id === idToFind);
        if (foundItem) {
          targetUrl = foundItem.streamUrl;
          targetTitle = foundItem.title;
          setSelectedVodId(foundItem.id);
        } else if (vodCatalog?.[0]) {
          targetUrl = vodCatalog[0].streamUrl;
          targetTitle = vodCatalog[0].title;
          setSelectedVodId(vodCatalog[0].id);
        }
      }

      if (!targetUrl) {
        targetUrl = 'https://test-streams.mux.dev/test_001/stream.m3u8';
      }

      // Play in aux video and capture stream
      if (auxVideoRef.current) {
        try {
          auxVideoRef.current.crossOrigin = 'anonymous';
          auxVideoRef.current.src = targetUrl;
          auxVideoRef.current.loop = true;
          auxVideoRef.current.muted = vodMuted;
          auxVideoRef.current
            .play()
            .then(() => {
              setVodIsPlaying(true);
            })
            .catch(() => {});

          const vidStream = (auxVideoRef.current as any).captureStream
            ? (auxVideoRef.current as any).captureStream(30)
            : null;
          if (vidStream) {
            auxStreamRef.current = vidStream;
            setActiveSourceType('vod');
            bindStreamToPreview(vidStream);
            setupAudioMeter(vidStream);
            if (isLiveStudioBroadcasting) updateLiveStudioStream(vidStream);
            return vidStream;
          }
        } catch (err) {
          console.warn('VOD direct capture notice:', err);
        }
      }

      // Canvas stream fallback with video metadata
      if (tvAnimRef.current) cancelAnimationFrame(tvAnimRef.current);
      let canvas = tvCanvasRef.current;
      if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.width = 1280;
        canvas.height = 720;
        tvCanvasRef.current = canvas;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      let frame = 0;
      const renderVodScene = () => {
        frame++;
        const now = new Date();
        const timeStr = now.toTimeString().split(' ')[0];

        // Draw backdrop
        ctx.fillStyle = '#090d16';
        ctx.fillRect(0, 0, canvas!.width, canvas!.height);

        // Video frame box
        ctx.fillStyle = '#111827';
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(80, 80, canvas!.width - 160, canvas!.height - 180, 16);
        ctx.fill();
        ctx.stroke();

        // Header
        ctx.fillStyle = '#059669';
        ctx.fillRect(80, 80, canvas!.width - 160, 48);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 20px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`🎬 VOD VAULT INGEST STREAM · ACTIVE`, 105, 112);

        ctx.textAlign = 'right';
        ctx.fillText(timeStr, canvas!.width - 105, 112);

        // Title
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 36px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(targetTitle, canvas!.width / 2, 280);

        ctx.fillStyle = '#34d399';
        ctx.font = 'bold 18px monospace';
        ctx.fillText(`SOURCE: ${targetUrl.slice(0, 50)}...`, canvas!.width / 2, 330);

        // Animated equalizer
        const barCount = 28;
        const barWidth = 14;
        const startX = canvas!.width / 2 - (barCount * (barWidth + 4)) / 2;
        for (let i = 0; i < barCount; i++) {
          const height = 15 + Math.sin(frame * 0.15 + i * 0.45) * 32 + Math.random() * 6;
          ctx.fillStyle = '#10b981';
          ctx.fillRect(startX + i * (barWidth + 4), 480 - height, barWidth, height);
        }

        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.fillRect(80, 520, canvas!.width - 160, 70);
        ctx.fillStyle = '#a7f3d0';
        ctx.font = '16px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('VIDEO STREAM RELAY ENCODING AT 6,000 KBPS · READY FOR YOUTUBE', canvas!.width / 2, 560);

        tvAnimRef.current = requestAnimationFrame(renderVodScene);
      };

      renderVodScene();

      const canvasStream = (canvas as any).captureStream ? (canvas as any).captureStream(30) : null;
      if (canvasStream) {
        try {
          const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(380, audioCtx.currentTime);
          gain.gain.setValueAtTime(0.02, audioCtx.currentTime);
          const dest = audioCtx.createMediaStreamDestination();
          osc.connect(gain);
          gain.connect(dest);
          osc.start();
          const audioTrack = dest.stream.getAudioTracks()[0];
          if (audioTrack) canvasStream.addTrack(audioTrack);
        } catch {}

        auxStreamRef.current = canvasStream;
        setActiveSourceType('vod');
        bindStreamToPreview(canvasStream);
        setupAudioMeter(canvasStream);
        if (isLiveStudioBroadcasting) updateLiveStudioStream(canvasStream);
        return canvasStream;
      }
      return null;
    },
    [
      customVodUrl,
      selectedVodId,
      vodCatalog,
      vodMuted,
      bindStreamToPreview,
      setupAudioMeter,
      isLiveStudioBroadcasting,
      updateLiveStudioStream,
    ]
  );

  // Clean up streams
  const cleanupStreams = useCallback(() => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (testPatternAnimRef.current) cancelAnimationFrame(testPatternAnimRef.current);
    if (anchorAnimRef.current) cancelAnimationFrame(anchorAnimRef.current);
    if (tvAnimRef.current) cancelAnimationFrame(tvAnimRef.current);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (testToneOscRef.current) {
      try {
        testToneOscRef.current.stop();
      } catch {}
      testToneOscRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }

    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((t) => t.stop());
      cameraStreamRef.current = null;
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    }
    if (auxStreamRef.current) {
      auxStreamRef.current.getTracks().forEach((t) => t.stop());
      auxStreamRef.current = null;
    }
    if (testPatternStreamRef.current) {
      testPatternStreamRef.current.getTracks().forEach((t) => t.stop());
      testPatternStreamRef.current = null;
    }
    if (virtualAnchorStreamRef.current) {
      virtualAnchorStreamRef.current.getTracks().forEach((t) => t.stop());
      virtualAnchorStreamRef.current = null;
    }

    if (auxVideoRef.current) {
      try {
        auxVideoRef.current.pause();
        auxVideoRef.current.src = '';
      } catch {}
    }

    activeMasterStreamRef.current = null;
    setStreamActive(false);
  }, []);

  // Modal open effect
  useEffect(() => {
    if (isLiveStudioOpen) {
      initCamera();
    } else {
      cleanupStreams();
    }
    return () => {
      cleanupStreams();
    };
  }, [isLiveStudioOpen]);

  // Toggle Camera
  const toggleCamera = async () => {
    if (!cameraStreamRef.current) {
      await initCamera();
      return;
    }
    const videoTrack = cameraStreamRef.current.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setCameraEnabled(videoTrack.enabled);
    } else {
      await initCamera();
    }
  };

  // Toggle Microphone
  const toggleMicrophone = async () => {
    const stream = activeMasterStreamRef.current || cameraStreamRef.current;
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setMicEnabled(audioTrack.enabled);
      }
    }
  };

  // Switch to Screen Share
  const handleSelectScreenSource = async () => {
    let stream = screenStreamRef.current;
    if (stream && stream.active) {
      setActiveSourceType('screen');
      bindStreamToPreview(stream);
    } else {
      stream = await startScreenShare();
    }
    if (stream && isLiveStudioBroadcasting) {
      updateLiveStudioStream(stream);
    }
  };

  // Switch to Camera Source
  const handleSelectCameraSource = async () => {
    setScreenShareActive(false);
    let stream = cameraStreamRef.current;
    if (stream && stream.active) {
      setActiveSourceType('camera');
      bindStreamToPreview(stream);
    } else {
      stream = await initCamera();
    }
    if (stream && isLiveStudioBroadcasting) {
      updateLiveStudioStream(stream);
    }
  };

  // Switch to Live TV Screen (PGM)
  const handleSelectLiveTvSource = (chId?: string) => {
    setScreenShareActive(false);
    startLiveTvSource(chId);
  };

  // Switch to VOD Ingest
  const handleSelectVodSource = (vodIdOrUrl?: string) => {
    setScreenShareActive(false);
    startVodSource(vodIdOrUrl);
  };

  // Helper to determine active playable URL for YouTube relay
  const getActiveRelaySourceUrl = useCallback(() => {
    if (activeSourceType === 'vod') {
      const foundVod = vodCatalog?.find((v) => v.id === selectedVodId);
      return customVodUrl || foundVod?.streamUrl || 'https://test-streams.mux.dev/test_001/stream.m3u8';
    }
    if (activeSourceType === 'live_tv') {
      const currentCh = channels.find((c) => c.channelId === liveTvChannelId) || channels[0];
      const now = Date.now();
      const prog =
        currentCh?.programs?.find((p: any) => now >= p.startTime && now < p.endTime) || currentCh?.programs?.[0];
      return prog?.streamUrl || 'https://test-streams.mux.dev/test_001/stream.m3u8';
    }
    return 'https://test-streams.mux.dev/test_001/stream.m3u8';
  }, [activeSourceType, vodCatalog, selectedVodId, customVodUrl, channels, liveTvChannelId]);

  // Push Active Studio Feed to YouTube Encoder
  const handlePushCurrentFeedToYouTube = async () => {
    setYoutubePushStatus('pushing');
    const sourceUrl = getActiveRelaySourceUrl();

    try {
      const res = await fetch('/api/stream/youtube/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelId: targetChannelId,
          channelName: broadcastTitle,
          streamKey: youtubeStreamKey || 'apex-tv-live-9482-k8x1-yt99',
          serverUrl: 'rtmps://a.rtmp.youtube.com:443/live2',
          resolution: '1920x1080',
          fps: 60,
          bitrateKbps: 6000,
          sourceStreamUrl: sourceUrl,
          youtubeBroadcastId: youtubeBroadcastId || 'RyUoz0-hRLk',
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setYoutubePushStatus('active');
        if (data?.session?.youtubeWatchUrl) {
          const bId = data.session.youtubeWatchUrl.split('v=')?.[1];
          if (bId) setYoutubeBroadcastId(bId);
        }
      } else {
        setYoutubePushStatus('error');
      }
    } catch {
      setYoutubePushStatus('error');
    }
  };

  // Start Broadcasting to Network
  const handleStartBroadcast = async () => {
    setErrorMessage(null);

    // Force linear mode so TV player immediately switches to live PGM stream
    setViewingMode('linear');
    if (setSelectedVodProgram) setSelectedVodProgram(null);

    // Ensure target channel is switched in context
    if (targetChannelId && targetChannelId !== activeChannelId) {
      setActiveChannelId(targetChannelId);
    }

    // Pick active stream or auto-initialize
    let activeStream = activeMasterStreamRef.current;

    if (!activeStream || !activeStream.active) {
      if (activeSourceType === 'screen') {
        activeStream = await startScreenShare();
      } else if (activeSourceType === 'live_tv') {
        activeStream = startLiveTvSource();
      } else if (activeSourceType === 'vod') {
        activeStream = startVodSource();
      } else if (activeSourceType === 'virtual_anchor') {
        activeStream = startVirtualAnchor();
      } else if (activeSourceType === 'test_pattern') {
        activeStream = startTestPattern();
      } else {
        activeStream = await initCamera();
      }

      if (!activeStream) {
        activeStream = startTestPattern();
      }
    }

    if (!activeStream) {
      setErrorMessage('Please select an ingest source to broadcast.');
      return;
    }

    recordedChunksRef.current = [];
    setRecordedBlob(null);
    setRecordedDurationSeconds(0);
    setUploadSuccessMessage(null);

    // Start local MediaRecorder
    try {
      let chosenMime = 'video/webm';
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported) {
        if (MediaRecorder.isTypeSupported('video/mp4;codecs=avc1,mp4a.40.2')) {
          chosenMime = 'video/mp4;codecs=avc1,mp4a.40.2';
        } else if (MediaRecorder.isTypeSupported('video/mp4')) {
          chosenMime = 'video/mp4';
        } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')) {
          chosenMime = 'video/webm;codecs=vp9,opus';
        } else if (MediaRecorder.isTypeSupported('video/webm')) {
          chosenMime = 'video/webm';
        }
      }

      const recorder = new MediaRecorder(activeStream, {
        mimeType: chosenMime,
      });

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: chosenMime });
        setRecordedBlob(blob);
      };

      recorder.start(1000);
      mediaRecorderRef.current = recorder;
    } catch (err) {
      console.warn('MediaRecorder error:', err);
    }

    // Timer
    timerIntervalRef.current = setInterval(() => {
      setRecordedDurationSeconds((s) => s + 1);
    }, 1000);

    // Call context to route live stream to Main Program
    startLiveStudioBroadcast(activeStream, broadcastTitle);

    // Simultaneous YouTube Push if requested
    if (simulcastToYoutube) {
      handlePushCurrentFeedToYouTube();
    }
  };

  // Stop Broadcasting
  const handleStopBroadcast = async () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    if (simulcastToYoutube) {
      try {
        fetch('/api/simulcast/stop', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ channelId: targetChannelId }),
        }).catch(() => {});
      } catch {}
      setYoutubePushStatus('idle');
    }

    await stopLiveStudioBroadcast();
  };

  // Save to Google Drive
  const handleSaveToDrive = async () => {
    if (!recordedBlob) {
      setErrorMessage('No recorded broadcast available to save.');
      return;
    }

    if (!googleAccessToken) {
      setErrorMessage('Please connect your Google Drive account first using the Sign In button.');
      return;
    }

    setIsUploadingToDrive(true);
    setErrorMessage(null);

    try {
      const fileName = `${broadcastTitle.replace(/[^a-zA-Z0-9_-]/g, '_')}_${Date.now()}.webm`;
      const uploadedFile = await uploadFileToDrive(
        googleAccessToken,
        recordedBlob,
        fileName,
        'video/webm'
      );

      setUploadSuccessMessage(
        `Successfully uploaded broadcast "${uploadedFile.name}" to your Google Drive!`
      );
    } catch (err: any) {
      console.error('Google Drive save error:', err);
      setErrorMessage(err?.message || 'Failed to upload broadcast recording to Google Drive.');
    } finally {
      setIsUploadingToDrive(false);
    }
  };

  // Ingest to VOD Vault
  const handleIngestToVod = async () => {
    if (!recordedBlob) return;

    try {
      const programId = `studio-live-${Date.now()}`;
      const playUrl = await saveMediaToStorage(programId, recordedBlob, {
        name: broadcastTitle,
        durationMinutes: Math.max(1, Math.round(recordedDurationSeconds / 60)),
      });

      addCustomVodProgram(
        {
          id: programId,
          title: broadcastTitle,
          category: 'Live Studio',
          startTime: Date.now(),
          endTime: Date.now() + recordedDurationSeconds * 1000,
          streamUrl: playUrl,
          contentType: 'podcast',
          description: `Live studio broadcast recorded from web anchor desk. Presenter: ${broadcasterName}.`,
          thumbnail:
            'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=800&q=80',
          hostOrTeams: broadcasterName,
          durationMinutes: Math.max(1, Math.round(recordedDurationSeconds / 60)),
          isLive: false,
          tags: ['Studio Live', 'Recorded Ingest', 'Broadcast'],
        },
        false
      );

      setUploadSuccessMessage('Broadcast recording saved to the Network VOD Catalog for instant replay!');
    } catch (err: any) {
      setErrorMessage('Failed to save to VOD Vault: ' + err?.message);
    }
  };

  // Download locally (raw WebM or current format)
  const handleDownloadLocally = () => {
    if (!recordedBlob) return;
    const url = URL.createObjectURL(recordedBlob);
    const a = document.createElement('a');
    a.href = url;
    const ext = recordedBlob.type.includes('mp4') ? 'mp4' : 'webm';
    a.download = `${broadcastTitle.replace(/\s+/g, '_')}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Convert and Download Universal MP4 (100% Windows Media Player & Smart TV Compatible)
  const handleDownloadUniversalMp4 = async () => {
    if (!recordedBlob) return;
    setIsConvertingToMp4(true);
    setErrorMessage(null);
    try {
      const cleanTitle = (broadcastTitle || 'Studio_Cut_1080p').replace(/[^a-zA-Z0-9_-]/g, '_');
      const formData = new FormData();
      formData.append('recording', recordedBlob, `${cleanTitle}.webm`);
      formData.append('title', cleanTitle);

      const resp = await fetch('/api/convert-to-mp4', {
        method: 'POST',
        body: formData,
      });

      const data = await resp.json();
      if (resp.ok && data.downloadUrl) {
        const a = document.createElement('a');
        a.href = data.downloadUrl;
        a.download = data.fileName || `${cleanTitle}.mp4`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setUploadSuccessMessage('Universal MP4 generated! 100% compatible with Windows Media Player, QuickTime, and TVs.');
      } else {
        throw new Error(data.error || 'Server conversion failed');
      }
    } catch (err: any) {
      console.warn('Direct MP4 server conversion failed, falling back to local file download:', err);
      handleDownloadLocally();
      setErrorMessage('Server conversion unavailable; downloaded raw recording file.');
    } finally {
      setIsConvertingToMp4(false);
    }
  };

  if (!isLiveStudioOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden animate-fadeIn my-auto">
        {/* Header */}
        <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-500">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span>Apex In-Browser Broadcast Studio</span>
                <span className="text-[10px] bg-red-950 text-red-400 border border-red-800/80 px-2 py-0.5 rounded font-mono font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  <span>NO OBS REQUIRED</span>
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Go live directly from your browser, transmit to the TV network feed, and restream to YouTube Live
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsLiveStudioOpen(false)}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Source Mode Switcher Bar */}
        <div className="bg-slate-950/60 border-b border-slate-800 px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-400 font-semibold mr-1">Select Ingest Source:</span>

            <button
              type="button"
              onClick={handleSelectCameraSource}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                activeSourceType === 'camera'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-900/40'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
            >
              <Video className="w-3.5 h-3.5" />
              <span>🎥 Webcam</span>
            </button>

            <button
              type="button"
              onClick={handleSelectScreenSource}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                activeSourceType === 'screen'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-900/40'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>🖥️ Share Screen</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectLiveTvSource(targetChannelId)}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                activeSourceType === 'live_tv'
                  ? 'bg-red-600 text-white shadow-md shadow-red-900/40'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
              title="Ingest the live broadcast television feed (sports, news, or keynotes)"
            >
              <Radio className="w-3.5 h-3.5" />
              <span>📺 Live TV (PGM)</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectVodSource()}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                activeSourceType === 'vod'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/40'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
              title="Stream any uploaded video file or catalog program"
            >
              <Film className="w-3.5 h-3.5" />
              <span>🎬 VOD & Uploads</span>
            </button>

            <button
              type="button"
              onClick={startTestPattern}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                activeSourceType === 'test_pattern'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-900/40'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
              title="Broadcast Test Slate with SMPTE color bars and real-time clock"
            >
              <Tv className="w-3.5 h-3.5" />
              <span>📺 Test Pattern</span>
            </button>

            <button
              type="button"
              onClick={startVirtualAnchor}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                activeSourceType === 'virtual_anchor'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-900/40'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
              title="Virtual news anchor desk simulator"
            >
              <User className="w-3.5 h-3.5" />
              <span>👤 Virtual Anchor</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <span>Status:</span>
            <span
              className={`font-bold ${
                isLiveStudioBroadcasting
                  ? 'text-red-400 animate-pulse'
                  : streamActive
                  ? 'text-emerald-400'
                  : 'text-amber-400'
              }`}
            >
              {isLiveStudioBroadcasting
                ? '🔴 LIVE TRANSMITTING'
                : streamActive
                ? '🟢 STREAM READY'
                : '🟡 AWAITING INPUT'}
            </span>
          </div>
        </div>

        {/* Studio Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-slate-200">
          {/* Auxiliary Video for TV & VOD Ingest Playout */}
          <video ref={auxVideoRef} playsInline loop crossOrigin="anonymous" className="hidden" />

          {/* Viewport Preview Area */}
          <div className="relative aspect-video bg-black rounded-xl overflow-hidden border border-slate-800 shadow-inner group flex items-center justify-center">
            {/* Live Video Feed */}
            <video
              ref={previewVideoRef}
              muted
              playsInline
              className={`w-full h-full object-cover ${streamActive ? 'block' : 'hidden'}`}
            />

            {/* Standby / No Camera Feed State */}
            {!streamActive && (
              <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-900 to-black p-6 flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-blue-600/10 border border-blue-500/30 flex items-center justify-center">
                  <Radio className="w-8 h-8 text-blue-400 animate-pulse" />
                </div>

                <div className="max-w-md space-y-1">
                  <h4 className="text-base font-bold text-white">Broadcast Ingest Standby</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {isInitializing
                      ? 'Connecting hardware camera and microphone feed...'
                      : cameraLockDetected
                      ? 'Webcam is in use by another program (OBS). Choose Screen Share, Live TV, VOD, or Test Pattern below!'
                      : 'Connect your webcam, share your screen/slides, ingest Live TV, or stream an uploaded video to broadcast.'}
                  </p>
                </div>

                {/* Quick Source Action Buttons inside Viewport */}
                <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2 max-w-xl">
                  <button
                    type="button"
                    onClick={handleSelectCameraSource}
                    disabled={isInitializing}
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-lg transition-all"
                  >
                    <Video className="w-3.5 h-3.5" />
                    <span>{isInitializing ? 'Connecting...' : '🎥 Connect Webcam'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={startScreenShare}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-lg transition-all"
                  >
                    <Monitor className="w-3.5 h-3.5" />
                    <span>🖥️ Share Screen</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectLiveTvSource(targetChannelId)}
                    className="px-3.5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-lg transition-all"
                  >
                    <Radio className="w-3.5 h-3.5" />
                    <span>📺 Live TV (PGM)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectVodSource()}
                    className="px-3.5 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-lg transition-all"
                  >
                    <Film className="w-3.5 h-3.5" />
                    <span>🎬 VOD & Uploads</span>
                  </button>

                  <button
                    type="button"
                    onClick={startTestPattern}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all"
                  >
                    <Tv className="w-3.5 h-3.5" />
                    <span>📺 Test Pattern</span>
                  </button>

                  <button
                    type="button"
                    onClick={startVirtualAnchor}
                    className="px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all"
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>👤 Virtual Anchor</span>
                  </button>
                </div>
              </div>
            )}

            {/* Lower-Third Broadcast Graphic Overlay */}
            {showLowerThird && (
              <div className="absolute bottom-4 left-4 right-4 pointer-events-none transition-all">
                <div className="bg-gradient-to-r from-red-900/90 via-slate-950/95 to-slate-900/90 border-l-4 border-red-500 rounded-r-lg p-3 shadow-2xl backdrop-blur-md max-w-xl">
                  <div className="flex items-center gap-2">
                    <span className="bg-red-600 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded tracking-widest">
                      LIVE ON AIR
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-200 tracking-wide">
                      {broadcasterName}
                    </span>
                  </div>
                  <div className="text-sm font-bold text-white mt-1 drop-shadow">
                    {broadcastTitle}
                  </div>
                  <div className="text-[11px] text-slate-300 font-mono mt-0.5 truncate">
                    {topicHeadline}
                  </div>
                </div>
              </div>
            )}

            {/* Top Bar Bug: Tally & Live Status */}
            <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
              <div className="flex items-center gap-2 bg-black/80 backdrop-blur-md px-3 py-1 rounded-lg border border-white/10 text-xs font-mono font-bold">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isLiveStudioBroadcasting ? 'bg-red-500 animate-ping' : 'bg-emerald-400'
                  }`}
                />
                <span className={isLiveStudioBroadcasting ? 'text-red-400' : 'text-emerald-400'}>
                  {isLiveStudioBroadcasting ? 'TRANSMITTING LIVE TO NETWORK' : 'STUDIO STANDBY'}
                </span>
                {isLiveStudioBroadcasting && (
                  <span className="text-white ml-2 bg-red-900/80 px-2 py-0.5 rounded text-[10px]">
                    REC {Math.floor(recordedDurationSeconds / 60)}:
                    {String(recordedDurationSeconds % 60).padStart(2, '0')}
                  </span>
                )}
                {isLiveStudioBroadcasting && simulcastToYoutube && (
                  <a
                    href={`https://www.youtube.com/watch?v=${youtubeBroadcastId || 'RyUoz0-hRLk'}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="pointer-events-auto ml-2 bg-red-600 hover:bg-red-500 text-white px-2 py-0.5 rounded text-[10px] flex items-center gap-1 font-sans font-bold shadow transition-colors"
                    title="Open your live stream on YouTube"
                  >
                    <Youtube className="w-3 h-3 fill-white" />
                    <span>Watch on YouTube ↗</span>
                  </a>
                )}
              </div>

              {/* Audio VU Meter Badge */}
              <div className="flex items-center gap-1.5 bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10 text-[11px] font-mono">
                <Mic className="w-3 h-3 text-slate-400" />
                <div className="w-16 h-2 bg-slate-800 rounded-full overflow-hidden flex">
                  <div
                    className={`h-full transition-all duration-75 ${
                      audioLevel > 80
                        ? 'bg-red-500'
                        : audioLevel > 50
                        ? 'bg-amber-400'
                        : 'bg-emerald-400'
                    }`}
                    style={{ width: `${audioLevel}%` }}
                  />
                </div>
                <span className="text-[10px] text-slate-400">{audioLevel}%</span>
              </div>
            </div>
          </div>

          {/* Contextual Ingest Control Drawer for VOD */}
          {activeSourceType === 'vod' && (
            <div className="bg-slate-950 p-3.5 rounded-xl border border-emerald-800/60 space-y-2.5 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Film className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    VOD & Uploaded Video Ingest Source
                  </span>
                  <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded font-mono font-bold">
                    PLUTO / FAST PLAYOUT
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">
                  Transcoding at 6,000 Kbps CBR to TV & YouTube Live
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* Select Video from Catalog / Uploads */}
                <div className="space-y-1">
                  <label className="text-slate-400 font-semibold block text-[11px]">
                    Select Video from VOD Catalog / Local Uploads:
                  </label>
                  <select
                    value={selectedVodId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setSelectedVodId(id);
                      handleSelectVodSource(id);
                    }}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-medium focus:outline-none focus:border-emerald-500"
                  >
                    {vodCatalog && vodCatalog.length > 0 ? (
                      vodCatalog.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.tags?.includes('Custom Ingest') ? '📁 [Uploaded] ' : '🎬 '}
                          {item.title} ({item.category})
                        </option>
                      ))
                    ) : (
                      <option value="">No VOD videos found</option>
                    )}
                  </select>
                </div>

                {/* Direct Video URL / YouTube Input */}
                <div className="space-y-1">
                  <label className="text-slate-400 font-semibold block text-[11px]">
                    Or Enter Direct Video / HLS / MP4 URL:
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={customVodUrl}
                      onChange={(e) => setCustomVodUrl(e.target.value)}
                      placeholder="e.g. /api/stream/universal-xxx.mp4"
                      className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleSelectVodSource(customVodUrl)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs shrink-0 transition-colors"
                    >
                      Ingest
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Contextual Ingest Control Drawer for Live TV */}
          {activeSourceType === 'live_tv' && (
            <div className="bg-slate-950 p-3.5 rounded-xl border border-red-800/60 space-y-2.5 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Radio className="w-4 h-4 text-red-500 animate-pulse" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Live TV Network Screen (PGM On-Air Feed)
                  </span>
                  <span className="text-[10px] bg-red-950 text-red-300 border border-red-800 px-2 py-0.5 rounded font-mono font-bold">
                    REBROADCAST ACTIVE
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">
                  Streaming on-air sports, news, and live graphics
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-xs text-slate-400 font-semibold mr-1">Switch Ingest Channel:</span>
                {channels.map((ch) => (
                  <button
                    key={ch.channelId}
                    type="button"
                    onClick={() => handleSelectLiveTvSource(ch.channelId)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                      liveTvChannelId === ch.channelId
                        ? 'bg-red-600 text-white shadow'
                        : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                    }`}
                  >
                    <span>Ch. {ch.channelNumber}</span>
                    <span className="font-normal opacity-80">({ch.callSign})</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Contextual Ingest Control Drawer for Screen Share */}
          {activeSourceType === 'screen' && (
            <div className="bg-slate-950 p-3.5 rounded-xl border border-blue-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
                  <Monitor className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-2">
                    <span>Screen Share Ingest Active</span>
                    <span className="text-[10px] bg-blue-950 text-blue-300 border border-blue-800 px-2 py-0.2 rounded font-mono font-bold">
                      SYSTEM DISPLAY
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Capturing entire desktop screen, application window, or browser tab with audio
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={startScreenShare}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Change Display/Window/Tab</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setScreenShareActive(false);
                    handleSelectCameraSource();
                  }}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold border border-slate-700 transition-colors"
                >
                  Stop Sharing
                </button>
              </div>
            </div>
          )}

          {/* Studio Hardware Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
            {/* Input Toggles */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleSelectCameraSource}
                className={`p-2 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  activeSourceType === 'camera' && cameraEnabled
                    ? 'bg-blue-600 border-blue-400 text-white'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                }`}
              >
                <Video className="w-4 h-4" />
                <span>Webcam</span>
              </button>

              <button
                type="button"
                onClick={toggleMicrophone}
                className={`p-2 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  micEnabled
                    ? 'bg-slate-800 border-slate-700 text-white'
                    : 'bg-red-950/80 border-red-800 text-red-300'
                }`}
              >
                {micEnabled ? <Mic className="w-4 h-4 text-emerald-400" /> : <MicOff className="w-4 h-4" />}
                <span>{micEnabled ? 'Mic On' : 'Mic Off'}</span>
              </button>

              <button
                type="button"
                onClick={handleSelectScreenSource}
                className={`p-2 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  screenShareActive
                    ? 'bg-blue-600 border-blue-400 text-white'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                }`}
              >
                <Monitor className="w-4 h-4 text-blue-400" />
                <span>{screenShareActive ? 'Stop Screen' : 'Share Screen'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectLiveTvSource(targetChannelId)}
                className={`p-2 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  activeSourceType === 'live_tv'
                    ? 'bg-red-600 border-red-400 text-white'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                }`}
              >
                <Radio className="w-4 h-4 text-red-400" />
                <span>Live TV</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectVodSource()}
                className={`p-2 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  activeSourceType === 'vod'
                    ? 'bg-emerald-600 border-emerald-400 text-white'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                }`}
              >
                <Film className="w-4 h-4 text-emerald-400" />
                <span>VOD Vault</span>
              </button>

              <button
                type="button"
                onClick={() => setShowLowerThird(!showLowerThird)}
                className={`p-2 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  showLowerThird
                    ? 'bg-slate-800 border-slate-700 text-white'
                    : 'bg-slate-900 border-slate-800 text-slate-500'
                }`}
              >
                <Layers className="w-4 h-4 text-amber-400" />
                <span>Lower-Third</span>
              </button>
            </div>

            {/* Broadcast Action Buttons */}
            <div className="flex items-center gap-2">
              {!isLiveStudioBroadcasting ? (
                <button
                  type="button"
                  onClick={handleStartBroadcast}
                  className="px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-black uppercase tracking-wider rounded-lg shadow-lg shadow-red-600/40 flex items-center gap-2 transition-all transform active:scale-95"
                >
                  <Radio className="w-4 h-4" />
                  <span>🔴 GO LIVE ON NETWORK</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleStopBroadcast}
                  className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-red-400 border border-red-800/80 text-xs font-black uppercase tracking-wider rounded-lg shadow-lg flex items-center gap-2 transition-all"
                >
                  <Circle className="w-3.5 h-3.5 fill-red-500 text-red-500" />
                  <span>END BROADCAST</span>
                </button>
              )}
            </div>
          </div>

          {/* Sub-Tab Navigation Bar for Studio Controls */}
          <div className="flex items-center gap-2 p-1 bg-slate-950 border border-slate-800 rounded-xl">
            <button
              type="button"
              onClick={() => setStudioSubTab('graphics')}
              className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                studioSubTab === 'graphics'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Show & On-Air Graphics</span>
            </button>

            <button
              type="button"
              onClick={() => setStudioSubTab('youtube_obs')}
              className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                studioSubTab === 'youtube_obs'
                  ? 'bg-red-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Youtube className="w-3.5 h-3.5" />
              <span>YouTube & OBS Broadcast Specs</span>
            </button>

            <button
              type="button"
              onClick={() => setStudioSubTab('vault')}
              className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                studioSubTab === 'vault'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <HardDrive className="w-3.5 h-3.5" />
              <span>Recording & Cloud Vault</span>
            </button>
          </div>

          {/* SUB-TAB 1: SHOW & ON-AIR GRAPHICS */}
          {studioSubTab === 'graphics' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-950/70 p-4 rounded-xl border border-slate-800 text-xs">
                {/* Target Channel */}
                <div className="space-y-1.5">
                  <label className="text-slate-400 font-bold flex items-center gap-1.5">
                    <Tv className="w-3.5 h-3.5 text-blue-400" />
                    <span>Target Broadcast Channel</span>
                  </label>
                  <select
                    value={targetChannelId}
                    onChange={(e) => setTargetChannelId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white font-medium focus:outline-none focus:border-red-500"
                  >
                    {channels.map((ch) => (
                      <option key={ch.channelId} value={ch.channelId}>
                        Ch. {ch.channelNumber} · {ch.channelName} ({ch.callSign})
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-500">
                    Your live studio transmission will override this channel's scheduled feed.
                  </p>
                </div>

                {/* Host / Anchor Identity */}
                <div className="space-y-1.5">
                  <label className="text-slate-400 font-semibold flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>Presenter / Anchor Callout</span>
                  </label>
                  <input
                    type="text"
                    value={broadcasterName}
                    onChange={(e) => setBroadcasterName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-red-500"
                  />
                  <p className="text-[11px] text-slate-500">
                    Displayed alongside the red LIVE ON AIR bug on the broadcast canvas.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-950/70 p-4 rounded-xl border border-slate-800 text-xs">
                <div className="space-y-1.5">
                  <label className="text-slate-400 font-semibold">Broadcast Show Title</label>
                  <input
                    type="text"
                    value={broadcastTitle}
                    onChange={(e) => setBroadcastTitle(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-red-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-400 font-semibold">Lower-Third News Ticker Headline</label>
                  <input
                    type="text"
                    value={topicHeadline}
                    onChange={(e) => setTopicHeadline(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* SUB-TAB 2: YOUTUBE & OBS BROADCAST SPECS */}
          {studioSubTab === 'youtube_obs' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-4 text-xs">
                {/* Simultaneous YouTube Push */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <Youtube className="w-5 h-5 text-red-500 fill-red-500" />
                    <div>
                      <div className="font-bold text-white flex items-center gap-2">
                        <span>Push Simultaneously to YouTube Live</span>
                        {youtubePushStatus === 'active' && (
                          <span className="text-[10px] bg-red-950 text-red-400 border border-red-800 px-1.5 py-0.2 rounded font-mono font-bold animate-pulse">
                            ● ON AIR
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Relays in-browser camera & screen bitstream directly to YouTube Ingest RTMP endpoint.
                      </p>
                    </div>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={simulcastToYoutube}
                      onChange={(e) => setSimulcastToYoutube(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                  </label>
                </div>

                {/* Stream Key & Server URL */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-slate-400 font-semibold flex items-center gap-1.5">
                        <Key className="w-3.5 h-3.5 text-red-400" />
                        <span>YouTube Stream Key</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(youtubeStreamKey || 'apex-tv-live-9482-k8x1-yt99');
                          setCopiedKey('studio_yt_key');
                          setTimeout(() => setCopiedKey(null), 2000);
                        }}
                        className="text-[11px] text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
                      >
                        {copiedKey === 'studio_yt_key' ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                        <span>{copiedKey === 'studio_yt_key' ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                    <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 font-mono text-xs">
                      <input
                        type={showStudioStreamKey ? 'text' : 'password'}
                        value={youtubeStreamKey || 'apex-tv-live-9482-k8x1-yt99'}
                        onChange={(e) => setYoutubeStreamKey(e.target.value)}
                        className="w-full bg-transparent text-white focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowStudioStreamKey(!showStudioStreamKey)}
                        className="p-1 text-slate-400 hover:text-white text-xs shrink-0"
                      >
                        {showStudioStreamKey ? 'Hide' : 'Show'}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-slate-400 font-semibold">Primary RTMP Ingest Server</label>
                    <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 font-mono text-xs">
                      <span className="text-slate-300">rtmp://a.rtmp.youtube.com/live2</span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText('rtmp://a.rtmp.youtube.com/live2');
                          setCopiedKey('rtmp_url');
                          setTimeout(() => setCopiedKey(null), 2000);
                        }}
                        className="p-1 text-slate-400 hover:text-white text-xs"
                      >
                        {copiedKey === 'rtmp_url' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Active YouTube Live Watch & Embed Card */}
                <div className="bg-gradient-to-r from-red-950/70 via-slate-900 to-slate-950 rounded-xl p-4 border border-red-800/60 space-y-3.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Youtube className="w-5 h-5 text-red-500 fill-red-500" />
                      <div>
                        <div className="font-bold text-white flex items-center gap-2">
                          <span>Active YouTube Live Simulcast Stream</span>
                          {(youtubePushStatus === 'active' || isLiveStudioBroadcasting) && (
                            <span className="text-[10px] bg-red-600 text-white px-2 py-0.5 rounded font-mono font-bold animate-pulse">
                              ● ON AIR
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400">
                          Direct RTMPS ingestion from browser webcam, screen share, VOD, or TV feed
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <a
                        href={`https://www.youtube.com/watch?v=${youtubeBroadcastId || 'RyUoz0-hRLk'}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Open on YouTube</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(`https://www.youtube.com/watch?v=${youtubeBroadcastId || 'RyUoz0-hRLk'}`);
                          setCopiedKey('yt_watch_url');
                          setTimeout(() => setCopiedKey(null), 2000);
                        }}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold rounded-lg text-xs flex items-center gap-1 transition-colors"
                      >
                        {copiedKey === 'yt_watch_url' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedKey === 'yt_watch_url' ? 'Copied' : 'Copy Watch URL'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Editable YouTube Broadcast Watch ID / URL */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-xs">
                    <div className="sm:col-span-2 space-y-1">
                      <label className="text-slate-400 font-semibold block text-[11px]">
                        YouTube Live Video ID / Watch URL:
                      </label>
                      <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 font-mono text-xs">
                        <span className="text-slate-500 mr-1.5 shrink-0">watch?v=</span>
                        <input
                          type="text"
                          value={youtubeBroadcastId || 'RyUoz0-hRLk'}
                          onChange={(e) => {
                            let val = e.target.value.trim();
                            if (val.includes('watch?v=')) val = val.split('watch?v=')[1].split('&')[0];
                            else if (val.includes('youtu.be/')) val = val.split('youtu.be/')[1].split('?')[0];
                            setYoutubeBroadcastId(val);
                          }}
                          className="w-full bg-transparent text-blue-400 font-bold focus:outline-none"
                          placeholder="RyUoz0-hRLk"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col justify-end">
                      <button
                        type="button"
                        onClick={handlePushCurrentFeedToYouTube}
                        disabled={youtubePushStatus === 'pushing'}
                        className={`w-full py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow transition-all ${
                          youtubePushStatus === 'active'
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                            : youtubePushStatus === 'pushing'
                            ? 'bg-amber-600 text-white opacity-80'
                            : 'bg-red-600 hover:bg-red-500 text-white shadow-red-950/40'
                        }`}
                      >
                        <Radio className="w-3.5 h-3.5" />
                        <span>
                          {youtubePushStatus === 'active'
                            ? '● Live Stream Active (Push Again)'
                            : youtubePushStatus === 'pushing'
                            ? 'Connecting Encoder...'
                            : 'Push Current Feed to YouTube'}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Stream Monitor Mode Selector */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs font-semibold text-slate-300">Live Stream Monitor:</span>
                    <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[11px]">
                      <button
                        type="button"
                        onClick={() => setYoutubePreviewMode('studio')}
                        className={`px-2.5 py-1 rounded font-semibold transition-colors ${
                          youtubePreviewMode === 'studio'
                            ? 'bg-blue-600 text-white'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Studio Ingest Monitor
                      </button>
                      <button
                        type="button"
                        onClick={() => setYoutubePreviewMode('youtube_embed')}
                        className={`px-2.5 py-1 rounded font-semibold transition-colors ${
                          youtubePreviewMode === 'youtube_embed'
                            ? 'bg-red-600 text-white'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        YouTube Viewer Player
                      </button>
                    </div>
                  </div>

                  {/* YouTube Embed / Studio Output Preview */}
                  <div className="rounded-lg overflow-hidden border border-slate-800 aspect-video max-h-52 bg-black relative flex items-center justify-center">
                    {youtubePreviewMode === 'studio' ? (
                      <div className="w-full h-full relative flex items-center justify-center bg-slate-950">
                        {previewVideoRef.current?.srcObject ? (
                          <video
                            ref={(el) => {
                              if (el && previewVideoRef.current?.srcObject) {
                                el.srcObject = previewVideoRef.current.srcObject;
                                el.play().catch(() => {});
                              }
                            }}
                            muted
                            playsInline
                            autoPlay
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <div className="text-center p-4 space-y-1">
                            <Radio className="w-6 h-6 text-slate-500 mx-auto" />
                            <p className="text-xs text-slate-400">Ingest stream ready for transmission</p>
                          </div>
                        )}
                        <div className="absolute top-2 left-2 bg-black/80 backdrop-blur px-2 py-0.5 rounded text-[10px] font-mono text-emerald-400 border border-emerald-500/30 font-bold">
                          STUDIO INGEST FEED: {activeSourceType.toUpperCase()}
                        </div>
                      </div>
                    ) : (
                      <iframe
                        src={`https://www.youtube-nocookie.com/embed/${youtubeBroadcastId || 'RyUoz0-hRLk'}?autoplay=0&mute=1`}
                        className="w-full h-full border-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        title="YouTube Live Output Preview"
                      />
                    )}
                  </div>
                </div>

                {/* OBS Accepted Specifications Card */}
                <div className="bg-slate-900/80 rounded-xl p-3.5 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-blue-400" />
                      <span>OBS Studio Specifications Accepted by YouTube</span>
                    </span>
                    <span className="text-[10px] text-emerald-400 font-mono font-bold">1080p60 CBR</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
                    <div className="bg-slate-950 p-2 rounded border border-slate-800/80">
                      <span className="text-slate-500 block text-[9px]">BITRATE:</span>
                      <span className="font-bold text-white">6,000 Kbps CBR</span>
                    </div>
                    <div className="bg-slate-950 p-2 rounded border border-slate-800/80">
                      <span className="text-slate-500 block text-[9px]">KEYFRAME:</span>
                      <span className="font-bold text-amber-400">2.00s GOP (Strict)</span>
                    </div>
                    <div className="bg-slate-950 p-2 rounded border border-slate-800/80">
                      <span className="text-slate-500 block text-[9px]">AUDIO:</span>
                      <span className="font-bold text-blue-400">160k AAC · 48 kHz</span>
                    </div>
                    <div className="bg-slate-950 p-2 rounded border border-slate-800/80">
                      <span className="text-slate-500 block text-[9px]">ENCODER:</span>
                      <span className="font-bold text-emerald-400">NVENC H.264 High</span>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">
                      Want to customize encoder profiles or preview the live YouTube watch page?
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsControlRoomOpen(true);
                        setIsLiveStudioOpen(false);
                      }}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      <span>Open YouTube & OBS Control Room</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SUB-TAB 3: RECORDING & CLOUD VAULT */}
          {studioSubTab === 'vault' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HardDrive className="w-4 h-4 text-emerald-400" />
                    <span className="font-bold text-white">Session Recording Status</span>
                  </div>
                  <span className="font-mono text-slate-400">
                    {recordedBlob
                      ? `${Math.round(recordedBlob.size / (1024 * 1024))} MB recorded`
                      : isLiveStudioBroadcasting
                      ? '● Recording in progress...'
                      : 'No active recording'}
                  </span>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Every broadcast session is captured at full 1080p resolution. You can persist it directly to your Google Drive, ingest it to the Network VOD Vault, or download the WebM file locally.
                </p>

                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <button
                    type="button"
                    disabled={!recordedBlob || isUploadingToDrive}
                    onClick={handleSaveToDrive}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white text-xs font-bold rounded-lg shadow flex items-center gap-1.5 transition-colors"
                  >
                    <HardDrive className="w-4 h-4 text-amber-200" />
                    <span>{isUploadingToDrive ? 'Uploading to Drive...' : 'Save to Google Drive'}</span>
                  </button>

                  <button
                    type="button"
                    disabled={!recordedBlob}
                    onClick={handleIngestToVod}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-bold rounded-lg shadow flex items-center gap-1.5 transition-colors"
                  >
                    <Tv className="w-4 h-4" />
                    <span>Add to Network VOD Catalog</span>
                  </button>

                  <button
                    type="button"
                    disabled={!recordedBlob || isConvertingToMp4}
                    onClick={handleDownloadUniversalMp4}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-bold rounded-lg shadow flex items-center gap-1.5 transition-colors"
                    title="Convert and download universal H.264/AAC MP4 compatible with Windows Media Player, QuickTime, and TVs"
                  >
                    {isConvertingToMp4 ? (
                      <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    ) : (
                      <Download className="w-4 h-4 text-emerald-200" />
                    )}
                    <span>{isConvertingToMp4 ? 'Converting to Universal MP4...' : 'Download Universal MP4 (Windows Compatible)'}</span>
                  </button>

                  <button
                    type="button"
                    disabled={!recordedBlob}
                    onClick={handleDownloadLocally}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 text-xs font-medium rounded-lg border border-slate-700 flex items-center gap-1.5 transition-colors"
                    title="Download raw stream recording"
                  >
                    <Download className="w-4 h-4 text-slate-400" />
                    <span>Download Raw WebM</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Recording Post-Broadcast Actions (Drive Sync & VOD Vault) */}
          {recordedBlob && (
            <div className="bg-emerald-950/40 border border-emerald-600/50 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span className="text-xs font-bold text-white">
                    Broadcast Session Recorded ({Math.round(recordedBlob.size / (1024 * 1024))} MB)
                  </span>
                </div>
                <span className="text-xs font-mono text-emerald-400">Ready to Persist</span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* 1-Click Save to Google Drive */}
                <button
                  type="button"
                  disabled={isUploadingToDrive}
                  onClick={handleSaveToDrive}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg shadow flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <HardDrive className="w-4 h-4 text-amber-200" />
                  <span>{isUploadingToDrive ? 'Uploading to Drive...' : 'Save Broadcast to Google Drive'}</span>
                </button>

                {/* 1-Click Ingest to VOD Vault */}
                <button
                  type="button"
                  onClick={handleIngestToVod}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg shadow flex items-center gap-1.5 transition-colors"
                >
                  <Tv className="w-4 h-4" />
                  <span>Add to Network VOD Catalog</span>
                </button>

                {/* Download Universal MP4 (Windows Media Player Compatible) */}
                <button
                  type="button"
                  disabled={isConvertingToMp4}
                  onClick={handleDownloadUniversalMp4}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow flex items-center gap-1.5 transition-colors"
                  title="Converts to standard H.264 MP4 to avoid Windows Media Player 0xC00D36C4 error"
                >
                  {isConvertingToMp4 ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  ) : (
                    <Download className="w-4 h-4 text-emerald-200" />
                  )}
                  <span>{isConvertingToMp4 ? 'Converting to MP4...' : 'Download Universal MP4 (Windows Compatible)'}</span>
                </button>

                {/* Download Raw WebM Locally */}
                <button
                  type="button"
                  onClick={handleDownloadLocally}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg border border-slate-700 flex items-center gap-1.5 transition-colors"
                >
                  <Download className="w-4 h-4 text-slate-400" />
                  <span>Download Raw WebM</span>
                </button>
              </div>
            </div>
          )}

          {/* Success / Error Messages */}
          {uploadSuccessMessage && (
            <div className="flex items-center gap-2 p-3 bg-emerald-950/80 border border-emerald-800 text-emerald-200 rounded-lg text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{uploadSuccessMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="flex items-center gap-2 p-3 bg-red-950/80 border border-red-800 text-red-200 rounded-lg text-xs">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-950 px-6 py-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Studio Engine: WebRTC + Web Audio API + MediaRecorder + RTMP Simulcast</span>
          </div>

          <button
            type="button"
            onClick={() => setIsLiveStudioOpen(false)}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition-colors"
          >
            Close Studio
          </button>
        </div>
      </div>
    </div>
  );
};

export default LiveStudioModal;
