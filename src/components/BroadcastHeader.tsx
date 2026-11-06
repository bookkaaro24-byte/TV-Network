/**
 * BroadcastHeader - Top Navigation Bar
 * Adheres to strict 3-zone Top Bar Contract:
 * [Zone 1: Brand Wordmark & Channel Switcher] - [Zone 2: Search & Clean Nav Links] - [Zone 3: Actions]
 */

import React, { useState, useRef, useEffect } from 'react';
import { useBroadcast } from '../context/BroadcastContext';
import {
  Sliders,
  Tv,
  Film,
  Calendar,
  Activity,
  Upload,
  LogIn,
  LogOut,
  User,
  Radio,
  ChevronDown,
  Check,
  Sparkles,
  Youtube,
} from 'lucide-react';
import { GlobalSearchBar } from './GlobalSearchBar';

interface BroadcastHeaderProps {
  onNavClick: (sectionId: string) => void;
  activeSection: string;
}

export const BroadcastHeader: React.FC<BroadcastHeaderProps> = ({ onNavClick, activeSection }) => {
  const {
    viewingMode,
    setViewingMode,
    setIsControlRoomOpen,
    openControlRoomToTab,
    setIsUploadModalOpen,
    setIsLiveStudioOpen,
    channels,
    activeChannelId,
    setActiveChannelId,
    activeChannel,
    isLiveStudioBroadcasting,
    playout,
    currentUser,
    isAuthLoading,
    signIn,
    signOutUser,
  } = useBroadcast();

  const [isChannelMenuOpen, setIsChannelMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsChannelMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-[#090d16]/95 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-6 py-3 transition-colors">
      <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 md:gap-6">
        <div className="flex items-center justify-between gap-3">
          {/* Zone 1: Brand Wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <a
              href="#live"
              onClick={(e) => {
                e.preventDefault();
                setViewingMode('linear');
                onNavClick('player');
              }}
              className="text-lg font-bold tracking-tight text-white hover:text-blue-400 transition-colors whitespace-nowrap shrink-0 flex items-center gap-2.5"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" />
              <span className="font-extrabold tracking-wider">APEX</span>
              <span className="font-normal text-slate-400 text-xs sm:text-sm tracking-normal">BROADCAST NETWORK</span>
            </a>
          </div>

          {/* Channel Quick Switcher Dropdown */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setIsChannelMenuOpen(!isChannelMenuOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs text-white font-medium transition-all"
              title="Switch broadcast channel"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-mono font-bold text-red-400">CH {activeChannel.channelNumber}</span>
              <span className="hidden xl:inline text-slate-300 truncate max-w-[110px]">· {activeChannel.callSign}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {isChannelMenuOpen && (
              <div className="absolute left-0 mt-2 w-64 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-2 z-50 animate-fadeIn space-y-1">
                <div className="px-2 py-1 text-[10px] font-mono text-slate-500 uppercase font-bold tracking-wider">
                  Select Network Channel
                </div>
                {channels.map((ch) => (
                  <button
                    key={ch.channelId}
                    onClick={() => {
                      setActiveChannelId(ch.channelId);
                      setViewingMode('linear');
                      onNavClick('player');
                      setIsChannelMenuOpen(false);
                    }}
                    className={`w-full px-3 py-2 rounded-lg text-left text-xs flex items-center justify-between transition-colors ${
                      activeChannelId === ch.channelId
                        ? 'bg-red-600/20 text-white border border-red-500/40 font-bold'
                        : 'hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-red-400 font-bold">CH {ch.channelNumber}</span>
                        <span className="font-medium text-white">{ch.channelName}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                        {ch.callSign} · {ch.resolution}
                      </div>
                    </div>
                    {activeChannelId === ch.channelId && (
                      <Check className="w-3.5 h-3.5 text-red-400 shrink-0" />
                    )}
                  </button>
                ))}

                {/* In-Browser Live Studio Channel Option */}
                <div className="pt-1 border-t border-slate-800/80">
                  <button
                    onClick={() => {
                      setIsLiveStudioOpen(true);
                      setIsChannelMenuOpen(false);
                    }}
                    className="w-full px-3 py-2 rounded-lg text-left text-xs bg-red-950/40 hover:bg-red-900/40 text-red-200 border border-red-800/60 flex items-center gap-2 font-bold transition-colors"
                  >
                    <Radio className="w-3.5 h-3.5 text-red-500 animate-pulse" />
                    <span>🔴 In-Browser Studio (Go Live)</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Mobile search bar trigger or inline on mobile */}
          <div className="md:hidden flex-1 max-w-[200px]">
            <GlobalSearchBar onNavigateToSection={onNavClick} />
          </div>
        </div>

        {/* Global Search Bar (Center / Flexible Zone) */}
        <div className="hidden md:block flex-1 max-w-md lg:max-w-lg mx-auto">
          <GlobalSearchBar onNavigateToSection={onNavClick} />
        </div>

        {/* Zone 2: Nav Links & Zone 3: Actions */}
        <div className="flex items-center justify-between md:justify-end gap-3 lg:gap-5 shrink-0 overflow-x-auto py-0.5">
          <nav className="flex items-center gap-4 lg:gap-6 text-xs sm:text-sm font-medium text-slate-300">
            <button
              onClick={() => {
                setViewingMode('linear');
                onNavClick('player');
              }}
              className={`flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                viewingMode === 'linear' && activeSection === 'player'
                  ? 'text-white font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Tv className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-500" />
              <span>Linear Live</span>
            </button>

            <button
              onClick={() => onNavClick('epg')}
              className={`flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                activeSection === 'epg' ? 'text-white font-semibold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-400" />
              <span>EPG</span>
            </button>

            <button
              onClick={() => {
                setViewingMode('vod');
                onNavClick('vod');
              }}
              className={`flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                viewingMode === 'vod' ? 'text-white font-semibold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Film className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
              <span>VOD</span>
            </button>

            <button
              onClick={() => onNavClick('analytics')}
              className={`hidden xl:flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                activeSection === 'analytics' ? 'text-white font-semibold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>Telemetry</span>
            </button>
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            {/* YouTube & Ingest Settings Button */}
            <button
              onClick={() => openControlRoomToTab('simulcast')}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-bold text-red-200 bg-red-950/80 hover:bg-red-900/80 border border-red-800/80 rounded-md transition-all whitespace-nowrap shrink-0 shadow-sm"
              title="Open YouTube Stream Key & Ingest Settings Dashboard"
            >
              <Youtube className="w-3.5 h-3.5 text-red-500 fill-red-500" />
              <span className="hidden sm:inline">YouTube &amp; Ingest</span>
            </button>

            {/* In-App Live Broadcast Studio Button */}
            <button
              onClick={() => setIsLiveStudioOpen(true)}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-bold text-white bg-red-600 hover:bg-red-500 rounded-md transition-all shadow-md shadow-red-600/30 whitespace-nowrap shrink-0"
              title="Launch In-App Web Playout Studio"
            >
              <Radio className="w-3.5 h-3.5" />
              <span>Go Live</span>
            </button>

            {/* Direct USB & External Storage Playout Button */}
            <button
              onClick={() => openControlRoomToTab('usb-storage')}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-cyan-200 bg-cyan-950/80 hover:bg-cyan-900/80 border border-cyan-800/80 rounded-md transition-all whitespace-nowrap shrink-0 shadow-sm"
              title="Play directly from USB, Hard Drive, or SSD without uploading"
            >
              <Tv className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">USB / Disk Play</span>
            </button>

            {/* Public TV & IPTV M3U Links Button */}
            <button
              onClick={() => openControlRoomToTab('iptv-export')}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-purple-200 bg-purple-950/80 hover:bg-purple-900/80 border border-purple-800/80 rounded-md transition-all whitespace-nowrap shrink-0 shadow-sm"
              title="Get Public Web TV link or export M3U playlist for IPTV players"
            >
              <Tv className="w-3.5 h-3.5 text-purple-400" />
              <span className="hidden sm:inline">TV Link / IPTV</span>
            </button>

            {/* Manual Video Ingest Button */}
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-md transition-all shadow-md whitespace-nowrap shrink-0"
              title="Upload and play your own video files from local or Google Drive"
            >
              <Upload className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Upload / Drive</span>
            </button>

            {/* Stream Health Indicator */}
            <div className="hidden 2xl:flex items-center gap-2 text-xs text-slate-400 bg-slate-900/80 px-2.5 py-1.5 rounded border border-slate-800">
              <span className="text-slate-500">Ingest:</span>
              <span className="font-mono text-emerald-400 font-medium">
                {playout.hotSwitch.isActive ? 'SRT' : 'HLS'}
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>

            {/* Engineer Console Button */}
            <button
              onClick={() => setIsControlRoomOpen(true)}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-900 hover:bg-slate-800 hover:text-white rounded-md border border-slate-800 transition-colors whitespace-nowrap shrink-0"
              title="Open Broadcast Engineer Control Room"
            >
              <Sliders className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">Engineer Console</span>
            </button>

            {/* Google / Firebase Auth Control */}
            <div className="border-l border-slate-800 pl-2 ml-1">
              {currentUser ? (
                <div className="flex items-center gap-2">
                  <div
                    className="w-7 h-7 rounded-full bg-blue-600 border border-blue-400 flex items-center justify-center text-white text-xs font-bold overflow-hidden"
                    title={currentUser.displayName || currentUser.email || 'Engineer'}
                  >
                    {currentUser.photoURL ? (
                      <img
                        src={currentUser.photoURL}
                        alt="Avatar"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      currentUser.displayName?.[0]?.toUpperCase() || 'E'
                    )}
                  </div>
                  <button
                    onClick={() => signOutUser()}
                    className="p-1.5 text-slate-400 hover:text-red-400 transition-colors"
                    title="Sign Out"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => signIn()}
                  disabled={isAuthLoading}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-md transition-colors"
                  title="Sign In with Google for OAuth & Drive Ingest"
                >
                  <LogIn className="w-3.5 h-3.5 text-blue-400" />
                  <span className="hidden md:inline">Sign In</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
