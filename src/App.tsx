import { useState, useCallback } from 'react';
import { BoosterState } from './types';
import { DEFAULT_EQ_BANDS } from './audio/audioEngine';
import { Header } from './components/Header';
import { BoosterDeck } from './components/BoosterDeck';
import { downloadExtensionZip } from './utils/extensionGenerator';

export default function App() {
  const [boosterState, setBoosterState] = useState<BoosterState>({
    volume: 300, // Starts at 300% (3x boost)
    bassBoost: 20,
    limiterEnabled: true,
    stereoPan: 0,
    isMuted: false,
    isMono: false,
    preset: 'flat',
    eqBands: DEFAULT_EQ_BANDS,
  });

  const handleBoosterChange = useCallback((patch: Partial<BoosterState>) => {
    setBoosterState((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleDownloadZip = useCallback(() => {
    downloadExtensionZip().catch(console.error);
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 bg-grid-pattern text-zinc-100 flex flex-col justify-between selection:bg-white selection:text-black relative overflow-hidden">
      {/* Subtle atmospheric ambient glow orbs behind the layout */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-white/[0.03] blur-[140px] rounded-full pointer-events-none -z-10" />
      <div className="absolute bottom-10 right-10 w-[450px] h-[350px] bg-white/[0.02] blur-[120px] rounded-full pointer-events-none -z-10" />

      {/* Top Simulated Browser Bar */}
      <Header
        state={boosterState}
        onDownloadZip={handleDownloadZip}
      />

      {/* Main Single-View Application */}
      <main className="flex-1 w-full px-4 sm:px-6 py-6 sm:py-10 flex flex-col items-center justify-center">
        <BoosterDeck
          state={boosterState}
          onVolumeChange={(volume) => handleBoosterChange({ volume, isMuted: false })}
          onToggleMute={() => handleBoosterChange({ isMuted: !boosterState.isMuted })}
          onToggleLimiter={() => handleBoosterChange({ limiterEnabled: !boosterState.limiterEnabled })}
          onBassChange={(bassBoost) => handleBoosterChange({ bassBoost })}
        />
      </main>

      {/* Clean Translucent Footer */}
      <footer className="glass-panel-subtle border-t border-white/5 py-4 px-6 text-center text-xs text-zinc-500 font-mono">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-white/70 animate-pulse" />
            <span>Volume Booster • Manifest V3 Audio Gain Engine (up to 600%)</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-zinc-600 hidden md:inline">Press Alt+B for 600%</span>
            <button
              onClick={handleDownloadZip}
              className="text-zinc-300 hover:text-white transition-colors underline decoration-zinc-700 underline-offset-4"
            >
              Download Extension Package (.ZIP)
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
