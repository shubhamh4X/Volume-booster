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
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col selection:bg-white selection:text-black">
      {/* Top Header */}
      <Header
        state={boosterState}
        onDownloadZip={handleDownloadZip}
      />

      {/* Main Single-View Application */}
      <main className="flex-1 w-full px-4 sm:px-6 py-8 flex flex-col items-center justify-center">
        <BoosterDeck
          state={boosterState}
          onVolumeChange={(volume) => handleBoosterChange({ volume, isMuted: false })}
          onToggleMute={() => handleBoosterChange({ isMuted: !boosterState.isMuted })}
          onToggleLimiter={() => handleBoosterChange({ limiterEnabled: !boosterState.limiterEnabled })}
          onBassChange={(bassBoost) => handleBoosterChange({ bassBoost })}
        />
      </main>

      {/* Clean Footer */}
      <footer className="border-t border-zinc-900 bg-zinc-950 py-4 px-6 text-center text-xs text-zinc-500 font-mono">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <span>Volume Booster • Safe up to 600% Web Audio Gain</span>
          <button
            onClick={handleDownloadZip}
            className="text-zinc-400 hover:text-white transition-colors"
          >
            Download Extension (.ZIP)
          </button>
        </div>
      </footer>
    </div>
  );
}
