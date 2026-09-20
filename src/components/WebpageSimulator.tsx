import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Upload,
  Zap,
  Shield,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { BoosterState, TabInfo } from '../types';
import { audioEngine } from '../audio/audioEngine';
import { AudioVisualizer } from './AudioVisualizer';

interface WebpageSimulatorProps {
  state: BoosterState;
  activeTab: TabInfo;
  tabs: TabInfo[];
  onSelectTab: (tab: TabInfo) => void;
  onOpenExtension: () => void;
  onVolumeChange?: (volume: number) => void;
  onToggleMute?: () => void;
  onToggleLimiter?: () => void;
  onBassChange?: (bass: number) => void;
}

export function WebpageSimulator({
  state,
  activeTab,
  onVolumeChange,
  onToggleMute,
  onToggleLimiter,
  onBassChange,
}: WebpageSimulatorProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [testTrack, setTestTrack] = useState<'dialogue' | 'music' | 'bass'>('dialogue');
  const [customFileName, setCustomFileName] = useState<string | null>(null);
  const [customAudioUrl, setCustomAudioUrl] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sync state to audio engine
  useEffect(() => {
    audioEngine.setVolume(state.volume);
    audioEngine.setMute(state.isMuted);
    audioEngine.setBassBoost(state.bassBoost);
    audioEngine.setLimiter(state.limiterEnabled);
  }, [state]);

  // Connect uploaded media if present
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
        audioRef.current.play().then(() => setIsPlaying(true)).catch(console.error);
      }
      return;
    }

    if (isPlaying) {
      audioEngine.stopSynthDemo();
      setIsPlaying(false);
    } else {
      audioEngine.getContext();
      const mappedTrack = testTrack === 'dialogue' ? 'podcast' : testTrack === 'bass' ? 'synth' : 'music';
      audioEngine.startSynthDemo(mappedTrack);
      setIsPlaying(true);
    }
  };

  const switchTrack = (track: 'dialogue' | 'music' | 'bass') => {
    setTestTrack(track);
    if (customAudioUrl && audioRef.current) {
      audioRef.current.pause();
      setCustomAudioUrl(null);
      setCustomFileName(null);
    }
    if (isPlaying) {
      audioEngine.stopSynthDemo();
      const mappedTrack = track === 'dialogue' ? 'podcast' : track === 'bass' ? 'synth' : 'music';
      audioEngine.startSynthDemo(mappedTrack);
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

  const PRESET_VALUES = [100, 200, 300, 450, 600];

  return (
    <div id="webpage-simulator" className="flex-1 w-full flex flex-col gap-6">
      {/* Hidden audio element for custom uploads */}
      {customAudioUrl && (
        <audio
          ref={audioRef}
          src={customAudioUrl}
          onEnded={() => setIsPlaying(false)}
          className="hidden"
        />
      )}

      {/* Main Booster Deck Card */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 sm:p-8 flex flex-col gap-8 shadow-xl">
        {/* Top Status & Gain Headline */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-850 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
              <h2 className="text-xl font-bold text-white tracking-tight">Audio Booster Engine</h2>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Active Gain: <span className="font-mono text-white font-bold">{state.isMuted ? 'Muted' : `${(state.volume / 100).toFixed(1)}x`}</span> • Real-time Web Audio API GainNode amplification
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onToggleMute}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-bold border transition-all ${
                state.isMuted
                  ? 'bg-white text-black border-white'
                  : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:text-white hover:border-zinc-700'
              }`}
            >
              {state.isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              <span>{state.isMuted ? 'Muted' : 'Mute Sound'}</span>
            </button>

            <button
              onClick={() => onVolumeChange?.(100)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-mono text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-all"
              title="Reset to normal volume (100%)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Big Volume Readout & Tactile Slider */}
        <div className="flex flex-col gap-5 bg-zinc-900/40 p-6 sm:p-8 rounded-2xl border border-zinc-800/80">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
            <div>
              <span className="text-xs font-mono text-zinc-400 uppercase tracking-widest">Master Volume Level</span>
              <div className="flex items-baseline gap-3 mt-1">
                <span className="text-5xl sm:text-6xl font-black font-mono tracking-tight text-white">
                  {state.isMuted ? '0%' : `${state.volume}%`}
                </span>
                <span className="text-sm font-mono text-zinc-400">
                  {state.volume === 100
                    ? 'Default Web Volume'
                    : state.volume > 450
                    ? 'Maximum Amplification (6.0x)'
                    : `Amplified ${(state.volume / 100).toFixed(1)}x`}
                </span>
              </div>
            </div>

            {/* Visual safety tag */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-300">
              <Sparkles className="w-3.5 h-3.5 text-white" />
              <span>{state.volume > 300 ? 'High-Boost Active' : 'Safe Headroom'}</span>
            </div>
          </div>

          {/* Large, Smooth Range Slider */}
          <div className="flex flex-col gap-2 pt-2">
            <input
              id="main-volume-range"
              type="range"
              min="0"
              max="600"
              step="5"
              value={state.volume}
              onChange={(e) => onVolumeChange?.(Number(e.target.value))}
              className="w-full h-3 bg-zinc-800 rounded-xl appearance-none cursor-pointer accent-white"
            />
            <div className="flex justify-between text-[11px] font-mono text-zinc-500 px-1">
              <span>0% (Silent)</span>
              <span>100% (Normal)</span>
              <span>300% (3x Boost)</span>
              <span>600% (6x Max)</span>
            </div>
          </div>

          {/* Quick Preset Buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <span className="text-xs font-mono text-zinc-400 mr-2">Quick Presets:</span>
            {PRESET_VALUES.map((val) => {
              const isSelected = state.volume === val && !state.isMuted;
              return (
                <button
                  key={val}
                  onClick={() => onVolumeChange?.(val)}
                  className={`px-4 py-2 rounded-xl text-xs font-mono font-bold border transition-all ${
                    isSelected
                      ? 'bg-white text-black border-white shadow-md'
                      : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:text-white hover:border-zinc-700'
                  }`}
                >
                  {val}% {val === 100 ? '(Normal)' : val === 600 ? '(Max)' : ''}
                </button>
              );
            })}
          </div>
        </div>

        {/* Audio Test Section */}
        <div className="flex flex-col gap-4 bg-zinc-900/30 p-6 rounded-2xl border border-zinc-800/80">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-white">Live Audio Test Deck</h3>
              <p className="text-xs text-zinc-400">
                Click Play to hear the volume difference in real-time as you adjust the slider.
              </p>
            </div>

            {/* Test track selector */}
            <div className="flex items-center gap-1.5 bg-zinc-900 p-1 rounded-xl border border-zinc-800 text-xs font-mono">
              <button
                onClick={() => switchTrack('dialogue')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  testTrack === 'dialogue' && !customFileName
                    ? 'bg-white text-black font-bold'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Quiet Dialogue
              </button>
              <button
                onClick={() => switchTrack('music')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  testTrack === 'music' && !customFileName
                    ? 'bg-white text-black font-bold'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Lo-Fi Music
              </button>
              <button
                onClick={() => switchTrack('bass')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  testTrack === 'bass' && !customFileName
                    ? 'bg-white text-black font-bold'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Deep Bass
              </button>
            </div>
          </div>

          {/* Minimalist Spectrum Meter */}
          <AudioVisualizer
            volumePercent={state.volume}
            isMuted={state.isMuted}
            isPlaying={isPlaying}
          />

          {/* Player controls */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
            <button
              id="test-audio-play-btn"
              onClick={togglePlay}
              className={`flex items-center gap-2.5 px-6 py-3 rounded-xl font-bold font-mono text-sm transition-all shadow-md active:scale-95 ${
                isPlaying
                  ? 'bg-white text-black border border-white'
                  : 'bg-white hover:bg-zinc-200 text-black border border-white'
              }`}
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
              <span>{isPlaying ? 'Pause Audio Test' : 'Play Audio Test'}</span>
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
                <span>{customFileName ? `Loaded: ${customFileName}` : 'Test with your own MP3'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Clean Enhancer Settings: Bass Boost & Limiter */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-zinc-900/40 p-5 rounded-2xl border border-zinc-800/80 flex flex-col gap-3">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-zinc-300 font-bold flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-white" /> Low-End Bass Boost
              </span>
              <span className="text-white font-bold">{state.bassBoost}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={state.bassBoost}
              onChange={(e) => onBassChange?.(Number(e.target.value))}
              className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-white"
            />
            <span className="text-[11px] text-zinc-500 font-mono">
              Adds rich warmth to weak laptop speakers & headphones
            </span>
          </div>

          <div className="bg-zinc-900/40 p-5 rounded-2xl border border-zinc-800/80 flex flex-col justify-between gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-zinc-300 font-bold flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-white" /> Distortion Limiter
              </span>
              <button
                onClick={onToggleLimiter}
                className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-colors ${
                  state.limiterEnabled
                    ? 'bg-white text-black'
                    : 'bg-zinc-800 text-zinc-400'
                }`}
              >
                {state.limiterEnabled ? 'ENABLED' : 'DISABLED'}
              </button>
            </div>
            <span className="text-[11px] text-zinc-500 font-mono">
              Automatic dynamic compressor prevents harsh clipping at 600% volume
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
