/**
 * Media Capabilities API Diagnostic Utility
 * Inspects browser GPU hardware acceleration, decoding smoothness, and codec support
 * for H.264, H.265/HEVC, VP9, and AV1 high-resolution video streams.
 */

import { BroadcastLogger } from '../services/broadcastLogger';

export interface CodecCapabilityResult {
  label: string;
  codec: string;
  contentType: string;
  width: number;
  height: number;
  framerate: number;
  bitrate: number;
  supported: boolean;
  smooth: boolean;
  powerEfficient: boolean; // TRUE = GPU Hardware Accelerated, FALSE = CPU Software Emulation
}

export interface MediaCapabilitiesReport {
  timestamp: string;
  browserVendor: string;
  hasMediaCapabilitiesApi: boolean;
  hasHardwareAcceleration: boolean;
  hevcSupported: boolean;
  hevcHardwareAccelerated: boolean;
  h264HardwareAccelerated: boolean;
  vp9HardwareAccelerated: boolean;
  av1HardwareAccelerated: boolean;
  overallScore: 'EXCELLENT' | 'GOOD' | 'SOFTWARE_FALLBACK' | 'LIMITED';
  warningMessage: string | null;
  codecResults: CodecCapabilityResult[];
}

export async function runMediaCapabilitiesDiagnostics(): Promise<MediaCapabilitiesReport> {
  const timestamp = new Date().toLocaleTimeString();
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown';

  if (typeof window === 'undefined' || !navigator.mediaCapabilities) {
    const report: MediaCapabilitiesReport = {
      timestamp,
      browserVendor: userAgent,
      hasMediaCapabilitiesApi: false,
      hasHardwareAcceleration: false,
      hevcSupported: false,
      hevcHardwareAccelerated: false,
      h264HardwareAccelerated: true,
      vp9HardwareAccelerated: false,
      av1HardwareAccelerated: false,
      overallScore: 'LIMITED',
      warningMessage: 'Browser lacks Media Capabilities API. Hardware acceleration status cannot be queried directly.',
      codecResults: [],
    };
    BroadcastLogger.logVideo('CODEC_DIAGNOSTICS_UNSUPPORTED', 'Browser lacks navigator.mediaCapabilities', {}, 'warn');
    return report;
  }

  const testConfigurations = [
    {
      label: '1080p60 H.264 (AVC High Profile)',
      codec: 'avc1.640028',
      contentType: 'video/mp4; codecs="avc1.640028"',
      width: 1920,
      height: 1080,
      framerate: 60,
      bitrate: 6000000,
    },
    {
      label: '4K60 H.264 (AVC High Level 5.2)',
      codec: 'avc1.640033',
      contentType: 'video/mp4; codecs="avc1.640033"',
      width: 3840,
      height: 2160,
      framerate: 60,
      bitrate: 20000000,
    },
    {
      label: '1080p60 H.265 / HEVC (Main Profile)',
      codec: 'hev1.1.6.L93.B0',
      contentType: 'video/mp4; codecs="hev1.1.6.L93.B0"',
      width: 1920,
      height: 1080,
      framerate: 60,
      bitrate: 4500000,
    },
    {
      label: '4K60 H.265 / HEVC UHD (Main 10)',
      codec: 'hev1.2.4.L153.B0',
      contentType: 'video/mp4; codecs="hev1.2.4.L153.B0"',
      width: 3840,
      height: 2160,
      framerate: 60,
      bitrate: 15000000,
    },
    {
      label: '4K60 VP9 Profile 0',
      codec: 'vp09.00.51.08',
      contentType: 'video/webm; codecs="vp09.00.51.08"',
      width: 3840,
      height: 2160,
      framerate: 60,
      bitrate: 18000000,
    },
    {
      label: '4K60 AV1 (AOMedia Video 1)',
      codec: 'av01.0.08M.08',
      contentType: 'video/mp4; codecs="av01.0.08M.08"',
      width: 3840,
      height: 2160,
      framerate: 60,
      bitrate: 14000000,
    },
  ];

  const results: CodecCapabilityResult[] = [];

  for (const config of testConfigurations) {
    try {
      const mediaDecodingConfig: MediaDecodingConfiguration = {
        type: 'file',
        video: {
          contentType: config.contentType,
          width: config.width,
          height: config.height,
          bitrate: config.bitrate,
          framerate: config.framerate,
        },
      };

      const info = await navigator.mediaCapabilities.decodingInfo(mediaDecodingConfig);
      results.push({
        ...config,
        supported: Boolean(info.supported),
        smooth: Boolean(info.smooth),
        powerEfficient: Boolean(info.powerEfficient),
      });
    } catch {
      results.push({
        ...config,
        supported: false,
        smooth: false,
        powerEfficient: false,
      });
    }
  }

  const h264_1080 = results.find((r) => r.label.includes('1080p60 H.264'));
  const h264_4k = results.find((r) => r.label.includes('4K60 H.264'));
  const hevc_1080 = results.find((r) => r.label.includes('1080p60 H.265'));
  const hevc_4k = results.find((r) => r.label.includes('4K60 H.265'));
  const vp9 = results.find((r) => r.label.includes('VP9'));
  const av1 = results.find((r) => r.label.includes('AV1'));

  const h264Hw = Boolean(h264_1080?.powerEfficient || h264_4k?.powerEfficient);
  const hevcSupp = Boolean(hevc_1080?.supported || hevc_4k?.supported);
  const hevcHw = Boolean(hevc_1080?.powerEfficient || hevc_4k?.powerEfficient);
  const vpHw = Boolean(vp9?.powerEfficient);
  const av1Hw = Boolean(av1?.powerEfficient);

  const hasHardwareAcceleration = h264Hw || hevcHw || vpHw;

  let overallScore: 'EXCELLENT' | 'GOOD' | 'SOFTWARE_FALLBACK' | 'LIMITED' = 'EXCELLENT';
  let warningMessage: string | null = null;

  if (!hasHardwareAcceleration) {
    overallScore = 'SOFTWARE_FALLBACK';
    warningMessage =
      'Hardware Acceleration is disabled in your browser! Video streams are decoding via CPU software fallback, which causes high CPU usage, stuttering, and dropped frames during 4K60 or live broadcast playout. Please enable "Use graphics acceleration when available" in Chrome/Edge Settings > System.';
  } else if (!hevcSupp) {
    overallScore = 'GOOD';
    warningMessage =
      'Browser lacks native HEVC/H.265 decoding support. High-res HEVC/4K videos will automatically fall back to universal H.264 transcode to prevent audio-only or black screen playback.';
  } else if (!hevcHw) {
    overallScore = 'GOOD';
    warningMessage =
      'HEVC decoding is active via CPU software emulation. For optimal 4K playout without heat or battery drain, consider installing the system HEVC hardware extension.';
  }

  const report: MediaCapabilitiesReport = {
    timestamp,
    browserVendor: userAgent,
    hasMediaCapabilitiesApi: true,
    hasHardwareAcceleration,
    hevcSupported: hevcSupp,
    hevcHardwareAccelerated: hevcHw,
    h264HardwareAccelerated: h264Hw,
    vp9HardwareAccelerated: vpHw,
    av1HardwareAccelerated: av1Hw,
    overallScore,
    warningMessage,
    codecResults: results,
  };

  BroadcastLogger.logVideo(
    'MEDIA_CAPABILITIES_AUDIT',
    `Media Capabilities Audit: Hardware Acceleration=${hasHardwareAcceleration ? 'ENABLED (GPU)' : 'DISABLED (CPU Software)'}, HEVC=${hevcSupp ? (hevcHw ? 'GPU HW' : 'CPU Software') : 'UNSUPPORTED'}`,
    {
      overallScore,
      hasHardwareAcceleration,
      hevcSupported: hevcSupp,
      hevcHardwareAccelerated: hevcHw,
      h264HardwareAccelerated: h264Hw,
      results,
    },
    hasHardwareAcceleration ? 'info' : 'warn'
  );

  return report;
}
