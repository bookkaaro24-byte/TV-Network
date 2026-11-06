/**
 * Universal YouTube Stream Ingest & Playout Helper
 * Extracts video IDs from all standard, short, live, embed, and parameter-rich YouTube URLs.
 */

export function extractYouTubeVideoId(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  // 1. Raw 11-char video ID (e.g. "aqz-KE-bpKQ" or "Jz_THh1B6Us")
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  // 2. youtu.be/<id>
  const shortMatch = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (shortMatch) return shortMatch[1];

  // 3. youtube.com/(embed|v|shorts|live)/<id>
  const pathMatch = trimmed.match(/youtube(?:-nocookie)?\.com\/(?:embed|v|shorts|live)\/([a-zA-Z0-9_-]{11})/);
  if (pathMatch) return pathMatch[1];

  // 4. youtube.com/watch? ... v=<id>
  if (trimmed.includes('youtube.com') || trimmed.includes('youtube-nocookie.com')) {
    try {
      const parsed = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
      const v = parsed.searchParams.get('v');
      if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) return v;
    } catch {
      const vMatch = trimmed.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
      if (vMatch) return vMatch[1];
    }
  }

  return null;
}

export function getYouTubeEmbedUrl(
  videoId: string,
  options?: { autoplay?: boolean; muted?: boolean; loop?: boolean }
): string {
  const auto = options?.autoplay !== false ? 1 : 0;
  const mute = options?.muted !== false ? 1 : 0;
  const loop = options?.loop ? `&loop=1&playlist=${videoId}` : '';
  return `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=${auto}&mute=${mute}&enablejsapi=1&playsinline=1&rel=0${loop}`;
}

export function getYouTubeThumbnailUrl(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

export interface YouTubePlayerInstance {
  playVideo: () => void;
  pauseVideo: () => void;
  stopVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead?: boolean) => void;
  mute: () => void;
  unMute: () => void;
  isMuted: () => boolean;
  setVolume: (volume: number) => void;
  getVolume: () => number;
  getPlayerState: () => number;
  getCurrentTime: () => number;
  getDuration: () => number;
  getVideoUrl: () => string;
  destroy: () => void;
  loadVideoById: (videoId: string, startSeconds?: number) => void;
  cueVideoById: (videoId: string, startSeconds?: number) => void;
}

let ytApiPromise: Promise<void> | null = null;

export function loadYouTubeIframeApi(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if ((window as any).YT && (window as any).YT.Player) {
    return Promise.resolve();
  }
  if (ytApiPromise) return ytApiPromise;

  ytApiPromise = new Promise((resolve) => {
    // If window.YT already available
    if ((window as any).YT && (window as any).YT.Player) {
      resolve();
      return;
    }

    const prevHandler = (window as any).onYouTubeIframeAPIReady;
    (window as any).onYouTubeIframeAPIReady = () => {
      if (typeof prevHandler === 'function') {
        try { prevHandler(); } catch {}
      }
      resolve();
    };

    const existingScript = document.querySelector('script[src*="youtube.com/iframe_api"]');
    if (!existingScript) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      tag.async = true;
      document.head.appendChild(tag);
    }

    // Safety timeout in case event already fired
    setTimeout(() => {
      if ((window as any).YT && (window as any).YT.Player) {
        resolve();
      }
    }, 1500);
  });

  return ytApiPromise;
}

export const VERIFIED_YOUTUBE_FEEDS = [
  {
    id: 'yt-spacex-earth',
    videoId: '21X5lGlDOfg',
    title: 'NASA Live: Earth from Space & ISS Space Station Stream',
    category: 'Tech',
    contentType: 'podcast' as const,
    description: 'Continuous 4K live view of Earth from the International Space Station.',
    durationMinutes: 120,
  },
  {
    id: 'yt-studio-live',
    videoId: 'RyUoz0-hRLk',
    title: 'Apex Network 24/7 Live Broadcast (YouTube Studio Ingest)',
    category: 'Business',
    contentType: 'business' as const,
    description: 'Real-time linear broadcast stream connected directly to YouTube Studio.',
    durationMinutes: 180,
  },
  {
    id: 'yt-bloomberg-live',
    videoId: 'dp8PhLsUcFE',
    title: 'Bloomberg Global Financial & AI Markets 24/7 Live Stream',
    category: 'Business',
    contentType: 'business' as const,
    description: 'Continuous global market intelligence, technology enterprise reports, and real-time news desk.',
    durationMinutes: 180,
  },
  {
    id: 'yt-lofi-beats',
    videoId: 'jfKfPfyJRdk',
    title: 'Lofi Girl Live: Synthwave & Beats to Code/Relax to',
    category: 'Podcast',
    contentType: 'podcast' as const,
    description: '24/7 continuous ambient audio & video playout stream.',
    durationMinutes: 180,
  },
];
