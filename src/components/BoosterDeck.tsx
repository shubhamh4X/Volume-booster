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
  FolderArchive,
  Bookmark,
  Copy,
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

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-6">
      {/* Hidden audio element for user file uploads */}
      {customAudioUrl && (
        <audio
          ref={audioRef}
          src={customAudioUrl}
          onEnded={() => setIsPlaying(false)}
          className="hidden"
        />
      )}

      {/* Main Volume Booster Card */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 sm:p-8 flex flex-col gap-6 shadow-xl">
        {/* Top Header & Actions */}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider">
              Master Volume Booster
            </span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-5xl font-black font-mono tracking-tight text-white">
                {state.isMuted ? '0%' : `${state.volume}%`}
              </span>
              <span className="text-xs font-mono text-zinc-400">
                {state.isMuted
                  ? '(Muted)'
                  : state.volume === 100
                  ? '(1.0x Normal)'
                  : `(${(state.volume / 100).toFixed(1)}x Boost)`}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Mute Button */}
            <button
              onClick={onToggleMute}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono font-bold border transition-colors ${
                state.isMuted
                  ? 'bg-white text-black border-white'
                  : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:text-white hover:border-zinc-700'
              }`}
            >
              {state.isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              <span>{state.isMuted ? 'Muted' : 'Mute'}</span>
            </button>

            {/* Reset to 100% */}
            <button
              onClick={() => onVolumeChange(100)}
              className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition-colors"
              title="Reset to 100%"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Master Slider */}
        <div className="flex flex-col gap-2">
          <input
            id="volume-slider"
            type="range"
            min="0"
            max="600"
            step="5"
            value={state.volume}
            onChange={(e) => onVolumeChange(Number(e.target.value))}
            className="w-full h-3 bg-zinc-850 rounded-lg appearance-none cursor-pointer accent-white"
          />
          <div className="flex justify-between text-[11px] font-mono text-zinc-500">
            <span>0%</span>
            <span>100% Normal</span>
            <span>300% (3x)</span>
            <span>600% Max</span>
          </div>
        </div>

        {/* Quick Presets */}
        <div className="grid grid-cols-5 gap-2">
          {PRESETS.map((preset) => {
            const isActive = state.volume === preset && !state.isMuted;
            return (
              <button
                key={preset}
                onClick={() => onVolumeChange(preset)}
                className={`py-2 text-xs font-mono font-bold rounded-xl border transition-all ${
                  isActive
                    ? 'bg-white text-black border-white shadow-sm'
                    : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:text-white hover:border-zinc-700'
                }`}
              >
                {preset}%
              </button>
            );
          })}
        </div>

        {/* Audio Test Section */}
        <div className="bg-zinc-900/40 p-5 rounded-2xl border border-zinc-850 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
              Live Audio Test Player
            </span>
            <span className="text-[11px] font-mono text-zinc-400">
              {isPlaying ? 'Playing • Adjust slider to hear boost' : 'Ready to test'}
            </span>
          </div>

          {/* Real-time Spectrum Visualizer */}
          <AudioVisualizer
            volumePercent={state.volume}
            isMuted={state.isMuted}
            isPlaying={isPlaying}
          />

          {/* Player controls */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              id="test-audio-toggle-btn"
              onClick={togglePlay}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold font-mono text-xs transition-all active:scale-95 shadow-sm ${
                isPlaying
                  ? 'bg-white text-black border border-white'
                  : 'bg-white hover:bg-zinc-200 text-black border border-white'
              }`}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              <span>{isPlaying ? 'Pause Audio' : 'Play Test Audio'}</span>
            </button>

            {/* Custom file upload */}
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-850 text-zinc-300 hover:text-white border border-zinc-800 text-xs font-mono transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                <span className="max-w-[150px] truncate">
                  {customFileName ? customFileName : 'Upload your MP3'}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Enhancer Controls: Bass & Limiter */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Bass Boost */}
          <div className="bg-zinc-900/40 p-4 rounded-2xl border border-zinc-850 flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-zinc-300 font-bold flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-white" /> Bass Boost
              </span>
              <span className="text-white font-bold">{state.bassBoost}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={state.bassBoost}
              onChange={(e) => onBassChange(Number(e.target.value))}
              className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-white"
            />
          </div>

          {/* Limiter */}
          <div className="bg-zinc-900/40 p-4 rounded-2xl border border-zinc-850 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs font-mono font-bold text-zinc-300 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-white" /> Anti-Clip Limiter
              </span>
              <span className="text-[11px] font-mono text-zinc-500">
                Prevents speaker distortion
              </span>
            </div>
            <button
              onClick={onToggleLimiter}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-colors ${
                state.limiterEnabled
                  ? 'bg-white text-black'
                  : 'bg-zinc-800 text-zinc-400'
              }`}
            >
              {state.limiterEnabled ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>
      </div>

      {/* Chrome Extension Download Card */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 sm:p-8 flex flex-col gap-6 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white text-black flex items-center justify-center font-black shadow-md shrink-0">
              <FolderArchive className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">Get Chrome Extension</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900 border border-zinc-750 text-zinc-300 font-bold">
                  Manifest V3
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Boost volume up to 600% on any tab (YouTube, Netflix, Spotify, etc.)
              </p>
            </div>
          </div>

          <button
            id="download-extension-btn"
            onClick={handleDownload}
            disabled={isDownloading}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white hover:bg-zinc-200 text-black font-bold font-mono text-xs transition-all active:scale-95 shadow-md shrink-0"
          >
            {downloadSuccess ? (
              <>
                <Check className="w-4 h-4" />
                <span>Downloaded ZIP!</span>
              </>
            ) : (
              <>
                <Download className={`w-4 h-4 ${isDownloading ? 'animate-bounce' : ''}`} />
                <span>{isDownloading ? 'Generating...' : 'Download Extension (.ZIP)'}</span>
              </>
            )}
          </button>
        </div>

        {/* 3 Simple Setup Steps */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
          <div className="bg-zinc-900/50 p-3.5 rounded-xl border border-zinc-850 flex flex-col gap-1.5">
            <span className="w-5 h-5 rounded-full bg-white text-black font-bold flex items-center justify-center text-[10px]">
              1
            </span>
            <span className="text-zinc-200 font-bold">Extract ZIP</span>
            <span className="text-zinc-400 text-[11px] leading-relaxed">
              Unzip the downloaded folder to a location on your computer.
            </span>
          </div>

          <div className="bg-zinc-900/50 p-3.5 rounded-xl border border-zinc-850 flex flex-col gap-1.5">
            <span className="w-5 h-5 rounded-full bg-white text-black font-bold flex items-center justify-center text-[10px]">
              2
            </span>
            <span className="text-zinc-200 font-bold">chrome://extensions</span>
            <span className="text-zinc-400 text-[11px] leading-relaxed">
              Open Chrome extensions page and turn on <strong>Developer mode</strong>.
            </span>
          </div>

          <div className="bg-zinc-900/50 p-3.5 rounded-xl border border-zinc-850 flex flex-col gap-1.5">
            <span className="w-5 h-5 rounded-full bg-white text-black font-bold flex items-center justify-center text-[10px]">
              3
            </span>
            <span className="text-zinc-200 font-bold">Load Unpacked</span>
            <span className="text-zinc-400 text-[11px] leading-relaxed">
              Click "Load unpacked" and select the unzipped folder. Done!
            </span>
          </div>
        </div>

        {/* Quick Instant Bookmarklet fallback */}
        <div className="pt-2 border-t border-zinc-850 flex items-center justify-between gap-3 text-xs font-mono">
          <span className="text-zinc-400 flex items-center gap-1.5 truncate">
            <Bookmark className="w-3.5 h-3.5 text-white shrink-0" />
            <span>Need an instant boost without installing?</span>
          </span>
          <button
            onClick={handleCopyBookmarklet}
            className="flex items-center gap-1.5 text-xs text-zinc-200 hover:text-white font-bold px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 transition-colors shrink-0"
          >
            {copiedBookmarklet ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedBookmarklet ? 'Copied Bookmarklet!' : 'Copy Bookmarklet'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
