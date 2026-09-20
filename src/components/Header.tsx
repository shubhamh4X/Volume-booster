import { Volume2, Download } from 'lucide-react';
import { BoosterState } from '../types';

interface HeaderProps {
  state: BoosterState;
  onDownloadZip: () => void;
}

export function Header({ state, onDownloadZip }: HeaderProps) {
  return (
    <header className="border-b border-zinc-850 bg-zinc-950/95 sticky top-0 z-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white text-black flex items-center justify-center font-bold shadow-sm">
            <Volume2 className="w-4 h-4" />
          </div>
          <div className="flex items-baseline gap-2">
            <h1 className="text-base font-bold text-white tracking-tight">Volume Booster</h1>
            <span className="text-[11px] text-zinc-400 font-mono hidden sm:inline">
              Chrome Extension • Up to 600%
            </span>
          </div>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-3">
          {/* Active Level Pill */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-xs font-mono">
            <span className={`w-2 h-2 rounded-full ${state.isMuted ? 'bg-zinc-600' : 'bg-white animate-pulse'}`} />
            <span className="text-zinc-300 font-bold">
              {state.isMuted ? 'Muted' : `${state.volume}%`}
            </span>
          </div>

          {/* Direct Download Button */}
          <button
            id="header-download-zip-btn"
            onClick={onDownloadZip}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white hover:bg-zinc-200 text-black text-xs font-bold font-mono transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download .ZIP</span>
          </button>
        </div>
      </div>
    </header>
  );
}
