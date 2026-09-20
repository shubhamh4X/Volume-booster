import { useState } from 'react';
import { Volume2, Lock, Download } from 'lucide-react';
import { BoosterState } from '../types';

interface HeaderProps {
  state: BoosterState;
  onDownloadZip: () => void;
}

export function Header({ state, onDownloadZip }: HeaderProps) {
  const [urlInput, setUrlInput] = useState('https://youtube.com/watch?v=quiet-speech-video');
  const [isCopied, setIsCopied] = useState(false);

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(urlInput);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <header className="w-full max-w-5xl mx-auto px-4 pt-6 pb-2">
      {/* Top Chrome-Style Simulated Browser Bar */}
      <div className="glass-panel rounded-2xl px-4 py-2.5 flex items-center justify-between gap-4 transition-all duration-300 hover:border-white/20 shadow-2xl">
        {/* Window controls (dots) */}
        <div className="flex items-center gap-2 pl-1 shrink-0">
          <span className="w-3 h-3 rounded-full bg-zinc-700 hover:bg-red-500/80 transition-colors cursor-pointer" />
          <span className="w-3 h-3 rounded-full bg-zinc-700 hover:bg-yellow-500/80 transition-colors cursor-pointer" />
          <span className="w-3 h-3 rounded-full bg-zinc-700 hover:bg-green-500/80 transition-colors cursor-pointer" />
        </div>

        {/* Address bar */}
        <div className="flex-1 max-w-2xl mx-auto">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80 text-xs font-mono text-zinc-400 focus-within:border-zinc-500 focus-within:text-zinc-200 transition-all">
            <Lock className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className="w-full bg-transparent border-none outline-none text-zinc-300 font-mono text-xs select-all truncate"
              placeholder="Paste any YouTube, Netflix, Spotify, or audio URL to boost..."
              title="Simulated browser address bar"
            />
            <button
              onClick={handleCopyUrl}
              className="text-[10px] uppercase font-bold text-zinc-500 hover:text-zinc-300 px-1.5 py-0.5 rounded hover:bg-zinc-800 transition-colors shrink-0"
              title="Copy URL"
            >
              {isCopied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>

        {/* Extension Toolbar Icon */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Extension icon with dynamic volume badge */}
          <div className="relative group cursor-pointer" onClick={onDownloadZip} title="Click to download Chrome Extension">
            <div className="w-8 h-8 rounded-lg bg-white text-black flex items-center justify-center font-bold shadow-[0_0_15px_rgba(255,255,255,0.4)] group-hover:scale-105 group-hover:shadow-[0_0_22px_rgba(255,255,255,0.8)] transition-all">
              <Volume2 className="w-4 h-4" />
            </div>
            {/* 600% / Volume Badge */}
            <span className="absolute -top-1.5 -right-2 px-1.5 py-0.2 rounded bg-black border border-zinc-700 text-[9px] font-black font-mono text-white tracking-tighter shadow-md">
              {state.isMuted ? 'MUTE' : state.volume}
            </span>
          </div>

          {/* Download button */}
          <button
            id="header-download-zip-btn"
            onClick={onDownloadZip}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-white text-zinc-300 hover:text-black border border-zinc-800 hover:border-white text-xs font-mono font-bold transition-all duration-200 shadow-sm hover:shadow-[0_0_15px_rgba(255,255,255,0.25)]"
          >
            <Download className="w-3.5 h-3.5" />
            <span>.ZIP</span>
          </button>
        </div>
      </div>
    </header>
  );
}
