import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  RotateCcw,
  Upload,
  Zap,
  Shield,
  Download,
  Check,
  Bookmark,
  Copy,
  Keyboard,
  Sparkles,
} from 'lucide-react';
import { BoosterState } from '../types';
import { audioEngine } from '../audio/audioEngine';
import { AudioVisualizer } from './AudioVisualizer';
import { downloadExtensionZip, BOOKMARKLET_CODE } from '../utils/extensionGenerator';

interface BoosterDeckProps {
  state: BoosterState;
  onVolumeChange: (volume: number) => void;
  onToggleMute: () => void;
  onToggleLimiter: () => void;
  onBassChange: (bass: number) => void;
}

export function BoosterDeck({
  state,
  onVolumeChange,
  onToggleMute,
  onToggleLimiter,
  onBassChange,
}: BoosterDeckProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [customAudioUrl, setCustomAudioUrl] = useState<string | null>(null);
  const [customFileName, setCustomFileName] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [copiedBookmarklet, setCopiedBookmarklet] = useState(false);
  const [activeShortcutNotice, setActiveShortcutNotice] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sync state to Web Audio API engine
  useEffect(() => {
    audioEngine.setVolume(state.volume);
    audioEngine.setMute(state.isMuted);
    audioEngine.setBassBoost(state.bassBoost);
    audioEngine.setLimiter(state.limiterEnabled);
  }, [state]);

  // Hook uploaded media element into audio engine
  useEffect(() => {
    if (audioRef.current && customAudioUrl) {
      audioEngine.connectMediaElement(audioRef.current);
    }
  }, [customAudioUrl]);

  // Global Keyboard Shortcuts matching extension (Alt+Up, Alt+Down, Alt+M, Alt+B)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!e.altKey) return;

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        onVolumeChange(Math.min(600, state.volume + 10));
        showNotice('Alt+Up: Volume +10%');
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        onVolumeChange(Math.max(0, state.volume - 10));
        showNotice('Alt+Down: Volume -10%');
      } else if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        onVolumeChange(600);
        showNotice('Alt+B: Maximum Boost (600%)');
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        onToggleMute();
        showNotice(state.isMuted ? 'Alt+M: Unmuted' : 'Alt+M: Audio Muted');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state, onVolumeChange, onToggleMute]);

  const showNotice = (msg: string) => {
    setActiveShortcutNotice(msg);
    setTimeout(() => setActiveShortcutNotice(null), 2200);
  };

  const togglePlay = () => {
    if (customAudioUrl && audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioEngine.getContext();
        audioEngine.connectMediaElement(audioRef.current);
        audioRef.current
          .play()
          .then(() => setIsPlaying(true))
          .catch((err) => console.error('Audio play error:', err));
      }
      return;
    }

    if (isPlaying) {
      audioEngine.stopSynthDemo();
      setIsPlaying(false);
    } else {
      audioEngine.getContext();
      audioEngine.startSynthDemo('music');
      setIsPlaying(true);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setCustomAudioUrl(url);
    setCustomFileName(file.name);
    audioEngine.stopSynthDemo();
    setIsPlaying(false);
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      await downloadExtensionZip();
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3500);
    } catch (err) {
      console.error('Download error:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCopyBookmarklet = () => {
    navigator.clipboard.writeText(BOOKMARKLET_CODE);
    setCopiedBookmarklet(true);
    setTimeout(() => setCopiedBookmarklet(false), 2500);
  };

  const PRESETS = [100, 200, 300, 450, 600];

  // Circular gauge arc calculations
  const radius = 64;
  const circumference = 2 * Math.PI * radius; // ~402.12
  const progressRatio = state.isMuted ? 0 : Math.min(1, state.volume / 600);
  const strokeDashoffset = circumference - circumference * progressRatio;

  // Dial status label
  let dialLabel = 'UNITY (100%)';
  if (state.isMuted) {
    dialLabel = 'MUTED';
  } else if (state.volume >= 600) {
    dialLabel = 'MAXIMUM GAIN';
  } else if (state.volume > 300) {
    dialLabel = 'ULTRA BOOSTED';
  } else if (state.volume > 100) {
    dialLabel = 'BOOSTED';
  } else if (state.volume === 0) {
    dialLabel = 'SILENT';
  }

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-10">
      {/* Hidden audio element for custom user file uploads */}
      {customAudioUrl && (
        <audio
          ref={audioRef}
          src={customAudioUrl}
          onEnded={() => setIsPlaying(false)}
          className="hidden"
        />
      )}

      {/* Floating shortcut toast notification */}
      {activeShortcutNotice && (
        <div className="fixed bottom-6 right-6 z-50 glass-panel px-4 py-2 rounded-xl text-xs font-mono font-bold text-white shadow-[0_0_20px_rgba(255,255,255,0.3)] animate-fade-in flex items-center gap-2 border border-white/20">
          <Sparkles className="w-3.5 h-3.5 text-white" />
          <span>{activeShortcutNotice}</span>
        </div>
      )}

      {/* Hero 2-Column Section (matches image.png) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
        {/* Left Column: Headline, Description & Feature Pills */}
        <div className="lg:col-span-6 flex flex-col gap-6 text-left">
          {/* Manifest V3 Pill */}
          <div className="inline-flex items-center gap-2 w-fit px-3.5 py-1.5 rounded-full glass-panel border border-white/10 text-[11px] font-mono font-bold tracking-wider text-white shadow-sm hover:border-white/25 transition-all">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            <span>MANIFEST V3 READY</span>
          </div>

          {/* Main Title */}
          <div className="flex flex-col gap-2">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tighter leading-none">
              Volume Booster
            </h1>
            <p className="text-xl sm:text-2xl font-medium text-zinc-400 tracking-tight">
              Amplify Any Web Audio Up To 600%
            </p>
          </div>

          {/* Paragraph */}
          <p className="text-sm sm:text-base text-zinc-400 leading-relaxed max-w-lg">
            High-gain Web Audio API GainNode engine built for Chrome, Brave, Edge, and Opera with anti-clipping limiter.
          </p>

          {/* 4 Interactive Feature Cards (from image.png) */}
          <div className="flex flex-col gap-3 max-w-md pt-2">
            {/* 600% Max Boost Pill */}
            <button
              onClick={() => {
                onVolumeChange(600);
                showNotice('Set Volume to 600% MAX');
              }}
              className="glass-panel-subtle hover-glow flex items-center justify-between px-4 py-3 rounded-2xl text-left transition-all group"
            >
              <div className="flex items-center gap-3">
                <span className="text-base">⚡</span>
                <span className="text-sm font-bold font-mono text-zinc-200 group-hover:text-white transition-colors">
                  600% Maximum Boost
                </span>
              </div>
              <span className="text-xs font-mono text-zinc-400 group-hover:text-white transition-colors">
                {state.volume === 600 ? 'Active' : 'Set Max'}
              </span>
            </button>

            {/* Anti-Clipping Limiter Pill */}
            <button
              onClick={onToggleLimiter}
              className="glass-panel-subtle hover-glow flex items-center justify-between px-4 py-3 rounded-2xl text-left transition-all group"
            >
              <div className="flex items-center gap-3">
                <span className="text-base">🛡️</span>
                <span className="text-sm font-bold font-mono text-zinc-200 group-hover:text-white transition-colors">
                  Anti-Clipping Limiter
                </span>
              </div>
              <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${state.limiterEnabled ? 'bg-white text-black' : 'bg-zinc-800 text-zinc-400'}`}>
                {state.limiterEnabled ? 'ENABLED' : 'OFF'}
              </span>
            </button>

            {/* Global Hotkeys Pill */}
            <button
              onClick={() => showNotice('Shortcuts: Alt+Up, Alt+Down, Alt+B (Max), Alt+M (Mute)')}
              className="glass-panel-subtle hover-glow flex items-center justify-between px-4 py-3 rounded-2xl text-left transition-all group"
            >
              <div className="flex items-center gap-3">
                <span className="text-base">⌨️</span>
                <span className="text-sm font-bold font-mono text-zinc-200 group-hover:text-white transition-colors">
                  Global Alt+B Hotkeys
                </span>
              </div>
              <span className="text-xs font-mono text-zinc-400 group-hover:text-white transition-colors">
                Alt+Up/Down
              </span>
            </button>

            {/* Dynamic Bass Enhancer Pill */}
            <button
              onClick={() => {
                const nextBass = state.bassBoost >= 50 ? 0 : state.bassBoost + 25;
                onBassChange(nextBass);
                showNotice(`Bass set to ${nextBass}%`);
              }}
              className="glass-panel-subtle hover-glow flex items-center justify-between px-4 py-3 rounded-2xl text-left transition-all group"
            >
              <div className="flex items-center gap-3">
                <span className="text-base">🔊</span>
                <span className="text-sm font-bold font-mono text-zinc-200 group-hover:text-white transition-colors">
                  Dynamic Bass Enhancer
                </span>
              </div>
              <span className="text-xs font-mono font-bold text-white">
                {state.bassBoost}%
              </span>
            </button>
          </div>

          {/* Download & Bookmarklet Direct Action Row */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              id="hero-download-btn"
              onClick={handleDownload}
              disabled={isDownloading}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white hover:bg-zinc-200 text-black font-bold font-mono text-xs transition-all active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.35)] hover:shadow-[0_0_30px_rgba(255,255,255,0.6)]"
            >
              {downloadSuccess ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Downloaded ZIP</span>
                </>
              ) : (
                <>
                  <Download className={`w-4 h-4 ${isDownloading ? 'animate-bounce' : ''}`} />
                  <span>{isDownloading ? 'Bundling...' : 'Download Extension (.ZIP)'}</span>
                </>
              )}
            </button>

            <button
              onClick={handleCopyBookmarklet}
              className="flex items-center gap-1.5 px-4 py-3 rounded-2xl glass-panel text-zinc-300 hover:text-white hover:border-white/30 text-xs font-mono font-bold transition-all"
            >
              {copiedBookmarklet ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
              <span>{copiedBookmarklet ? 'Copied Bookmarklet!' : 'Copy 1-Click Bookmarklet'}</span>
            </button>
          </div>
        </div>

        {/* Right Column: Floating Translucent Card (Exact representation from image.png) */}
        <div className="lg:col-span-6 flex justify-center w-full">
          <div className="relative w-full max-w-md">
            {/* Ambient background glow orb */}
            <div className="absolute -inset-2 bg-gradient-to-tr from-white/15 via-white/5 to-transparent rounded-[36px] blur-2xl opacity-40 -z-10 animate-pulse-glow" />

            {/* Main Glass Popup Card */}
            <div className="glass-panel rounded-[28px] p-6 sm:p-7 flex flex-col gap-5 shadow-2xl border border-white/10 glow-card">
              {/* Card Header */}
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white text-black flex items-center justify-center font-black shadow-[0_0_15px_rgba(255,255,255,0.4)]">
                    <Volume2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-extrabold text-white tracking-tight leading-tight">
                      Volume Booster
                    </h2>
                    <span className="text-[11px] font-mono text-zinc-400">
                      Active Tab • YouTube
                    </span>
                  </div>
                </div>

                <div className="px-2.5 py-1 rounded-md bg-zinc-900/90 border border-zinc-700/80 text-white font-mono text-xs font-bold shadow-sm">
                  v1.0.0
                </div>
              </div>

              {/* Central Glowing Circular Gauge */}
              <div className="flex flex-col items-center justify-center py-2 relative">
                <div className="relative w-44 h-44 flex items-center justify-center">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
                    {/* Background Track */}
                    <circle
                      cx="80"
                      cy="80"
                      r={radius}
                      className="fill-none stroke-zinc-850"
                      strokeWidth="10"
                    />
                    {/* Glowing Filled Ring */}
                    <circle
                      cx="80"
                      cy="80"
                      r={radius}
                      className={`fill-none transition-all duration-300 ${
                        state.isMuted
                          ? 'stroke-zinc-600'
                          : state.volume > 300
                          ? 'stroke-white glow-ring'
                          : 'stroke-white glow-ring-subtle'
                      }`}
                      strokeWidth="10"
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                    />
                  </svg>

                  {/* Centered Dial Typography */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center select-none pointer-events-none">
                    <span className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.5)]">
                      {state.isMuted ? '0%' : `${state.volume}%`}
                    </span>
                    <span className="text-[10px] font-mono font-bold text-zinc-400 tracking-wider uppercase mt-1">
                      {dialLabel}
                    </span>
                  </div>
                </div>
              </div>

              {/* Master Volume Slider */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-[11px] font-mono font-bold">
                  <span className="text-zinc-400 uppercase tracking-wider">
                    Master Volume Level
                  </span>
                  <span className="text-white">
                    {state.isMuted ? 'Muted' : `${state.volume}% / 600%`}
                  </span>
                </div>
                <div className="relative flex items-center py-1">
                  <input
                    id="volume-slider"
                    type="range"
                    min="0"
                    max="600"
                    step="5"
                    value={state.isMuted ? 0 : state.volume}
                    onChange={(e) => onVolumeChange(Number(e.target.value))}
                    className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>

              {/* Quick Presets: 100%, 200%, 300%, 450%, MAX (from image.png) */}
              <div className="grid grid-cols-5 gap-1.5">
                {PRESETS.map((preset) => {
                  const isActive = state.volume === preset && !state.isMuted;
                  const isMax = preset === 600;
                  return (
                    <button
                      key={preset}
                      onClick={() => onVolumeChange(preset)}
                      className={`py-2 text-xs font-mono font-bold rounded-xl border transition-all duration-200 ${
                        isActive
                          ? 'bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.6)] scale-[1.03]'
                          : isMax
                          ? 'bg-zinc-900/90 text-white border-zinc-700 hover:border-white hover:bg-zinc-800'
                          : 'glass-panel-subtle text-zinc-300 border-white/5 hover:text-white hover:border-white/20'
                      }`}
                    >
                      {isMax ? 'MAX' : `${preset}%`}
                    </button>
                  );
                })}
              </div>

              {/* Spectrum Equalizer Waveform & Live Audio Player */}
              <div className="flex flex-col gap-2.5 pt-1">
                <AudioVisualizer
                  volumePercent={state.volume}
                  isMuted={state.isMuted}
                  isPlaying={isPlaying}
                />

                {/* Compact Player Controls */}
                <div className="flex items-center justify-between gap-2">
                  <button
                    id="test-audio-toggle-btn"
                    onClick={togglePlay}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-white hover:bg-zinc-200 text-black font-mono font-bold text-xs transition-all active:scale-95 shadow-[0_0_12px_rgba(255,255,255,0.3)]"
                  >
                    {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                    <span>{isPlaying ? 'Pause Audio' : 'Play Audio Demo'}</span>
                  </button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 py-2 px-3 rounded-xl glass-panel-subtle text-zinc-300 hover:text-white border border-white/10 hover:border-white/25 text-xs font-mono transition-colors shrink-0"
                    title="Test your own audio file"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span className="max-w-[100px] truncate">
                      {customFileName || 'Upload MP3'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Bottom Toggles: Anti-Clip Limiter + Mute Button (matching image.png) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                {/* Anti-Clip Limiter Card */}
                <div className="glass-panel-subtle rounded-2xl p-3 flex items-center justify-between border border-white/10">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-white font-sans">
                      Anti-Clip Limiter
                    </span>
                    <span className="text-[10px] font-mono text-zinc-400">
                      Prevents distortion
                    </span>
                  </div>
                  <button
                    onClick={onToggleLimiter}
                    className={`px-3 py-1 rounded-lg text-xs font-mono font-black transition-all ${
                      state.limiterEnabled
                        ? 'bg-white text-black shadow-[0_0_12px_rgba(255,255,255,0.5)]'
                        : 'bg-zinc-800 text-zinc-400'
                    }`}
                  >
                    {state.limiterEnabled ? 'ON' : 'OFF'}
                  </button>
                </div>

                {/* Mute Button */}
                <button
                  onClick={onToggleMute}
                  className={`flex items-center justify-center gap-1.5 rounded-2xl p-3 border font-mono text-xs font-bold transition-all ${
                    state.isMuted
                      ? 'bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.6)]'
                      : 'glass-panel-subtle text-zinc-200 border-white/10 hover:border-white/25 hover:text-white'
                  }`}
                >
                  {state.isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  <span>{state.isMuted ? 'MUTED' : 'MUTE'}</span>
                </button>
              </div>

              {/* Shortcuts Legend (from image.png) */}
              <div className="text-center pt-1 border-t border-white/5">
                <span className="text-[10px] font-mono text-zinc-500">
                  Shortcuts: Alt+Up / Alt+Down / Alt+B (Max)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
