import { Volume2, VolumeX, Shield, Zap } from 'lucide-react';
import { BoosterState } from '../types';

interface ExtensionPopupProps {
  state: BoosterState;
  onChange: (newState: Partial<BoosterState>) => void;
  activeTabTitle?: string;
}

export function ExtensionPopup({ state, onChange, activeTabTitle = 'Active Webpage' }: ExtensionPopupProps) {
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const clampedVol = Math.max(0, Math.min(600, state.volume));
  const progress = state.isMuted ? 0 : clampedVol / 600;
  const strokeOffset = circumference - progress * circumference;

  const getBoostLabel = () => {
    if (state.isMuted) return 'MUTED';
    if (clampedVol === 100) return '1.0x (NORMAL)';
    if (clampedVol <= 200) return '2.0x BOOST';
    if (clampedVol <= 350) return '3.5x BOOST';
    if (clampedVol <= 500) return '5.0x HIGH';
    return '6.0x MAXIMUM';
  };

  const PRESET_VALUES = [100, 200, 300, 450, 600];

  return (
    <div
      id="chrome-extension-popup"
      className="w-[340px] bg-zinc-950 text-zinc-100 rounded-2xl border border-zinc-800 shadow-2xl p-5 flex flex-col gap-4 font-sans select-none"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-white text-black flex items-center justify-center font-bold">
            <Volume2 className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-extrabold text-white">Volume Booster</span>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-zinc-400 font-bold">
                v1.0
              </span>
            </div>
            <div className="text-[11px] text-zinc-400 truncate max-w-[150px]" title={activeTabTitle}>
              {activeTabTitle}
            </div>
          </div>
        </div>

        {/* Mute Button */}
        <button
          id="popup-mute-btn"
          onClick={() => onChange({ isMuted: !state.isMuted })}
          className={`flex items-center gap-1.5 text-xs font-mono font-bold px-3 py-1.5 rounded-lg border transition-colors ${
            state.isMuted
              ? 'bg-white text-black border-white'
              : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:text-white hover:border-zinc-700'
          }`}
        >
          {state.isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          <span>{state.isMuted ? 'Muted' : 'Mute'}</span>
        </button>
      </div>

      {/* Center Dial Display */}
      <div className="flex flex-col items-center justify-center py-2">
        <div className="relative w-32 h-32 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
            <circle
              cx="60"
              cy="60"
              r={radius}
              className="stroke-zinc-800"
              strokeWidth="7"
              fill="transparent"
            />
            <circle
              cx="60"
              cy="60"
              r={radius}
              className="stroke-white transition-all duration-150"
              strokeWidth="7"
              strokeDasharray={circumference}
              strokeDashoffset={strokeOffset}
              strokeLinecap="round"
              fill="transparent"
            />
          </svg>

          {/* Value in Center */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-3xl font-black font-mono tracking-tight text-white">
              {state.isMuted ? '0%' : `${state.volume}%`}
            </span>
            <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest mt-0.5">
              {getBoostLabel()}
            </span>
          </div>
        </div>
      </div>

      {/* Main Volume Slider */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
          <span>VOLUME LEVEL</span>
          <span className="text-white font-bold">{state.volume}% / 600%</span>
        </div>
        <input
          id="popup-volume-slider"
          type="range"
          min="0"
          max="600"
          step="5"
          value={state.volume}
          onChange={(e) => onChange({ volume: Number(e.target.value), isMuted: false })}
          className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-white"
        />
      </div>

      {/* Quick Boost Preset Buttons */}
      <div className="flex items-center justify-between gap-1.5 pt-1">
        {PRESET_VALUES.map((preset) => {
          const isSelected = state.volume === preset && !state.isMuted;
          return (
            <button
              key={preset}
              onClick={() => onChange({ volume: preset, isMuted: false })}
              className={`flex-1 py-1.5 text-xs font-mono font-bold rounded-lg border transition-all ${
                isSelected
                  ? 'bg-white text-black border-white'
                  : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:text-white hover:border-zinc-700'
              }`}
            >
              {preset}%
            </button>
          );
        })}
      </div>

      {/* Bottom Enhancements: Bass Boost & Limiter */}
      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800/80">
        <div className="flex flex-col gap-1 bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-800/80">
          <div className="flex items-center justify-between text-[11px] font-mono">
            <span className="text-zinc-400 flex items-center gap-1">
              <Zap className="w-3 h-3 text-white" /> Bass
            </span>
            <span className="text-white font-bold">{state.bassBoost}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={state.bassBoost}
            onChange={(e) => onChange({ bassBoost: Number(e.target.value) })}
            className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-white"
          />
        </div>

        <button
          onClick={() => onChange({ limiterEnabled: !state.limiterEnabled })}
          className={`flex items-center justify-between p-2.5 rounded-xl border font-mono text-[11px] transition-colors ${
            state.limiterEnabled
              ? 'bg-zinc-900 border-zinc-700 text-white'
              : 'bg-zinc-950 border-zinc-800 text-zinc-500'
          }`}
        >
          <span className="flex items-center gap-1 font-semibold">
            <Shield className="w-3 h-3 text-white" /> Limiter
          </span>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${state.limiterEnabled ? 'bg-white text-black' : 'bg-zinc-800 text-zinc-400'}`}>
            {state.limiterEnabled ? 'ON' : 'OFF'}
          </span>
        </button>
      </div>
    </div>
  );
}
