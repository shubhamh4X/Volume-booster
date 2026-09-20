import { useEffect, useRef } from 'react';
import { audioEngine } from '../audio/audioEngine';

interface AudioVisualizerProps {
  volumePercent: number;
  isMuted: boolean;
  isPlaying: boolean;
}

export function AudioVisualizer({ volumePercent, isMuted, isPlaying }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameIdRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let dpr = window.devicePixelRatio || 1;
    const updateCanvasSize = () => {
      dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);

    // Spectrum bar configuration
    const barCount = 36;
    const peakHold = new Array(barCount).fill(0);
    const barHeights = new Array(barCount).fill(0);

    const render = () => {
      const analyser = audioEngine.getAnalyser();
      const width = canvas.width;
      const height = canvas.height;

      // Clear with deep zinc black
      ctx.fillStyle = '#09090b';
      ctx.fillRect(0, 0, width, height);

      let freqData = new Uint8Array(barCount);
      if (analyser && !isMuted && isPlaying) {
        const fullFreq = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(fullFreq);
        // Sample down to barCount bins
        const step = Math.floor(fullFreq.length / (barCount * 1.6));
        for (let i = 0; i < barCount; i++) {
          freqData[i] = fullFreq[i * step] || 0;
        }
      }

      const gainMultiplier = isMuted || !isPlaying ? 0 : Math.max(0.2, volumePercent / 100);
      const barWidth = (width / barCount) * 0.7;
      const gap = (width - barWidth * barCount) / (barCount - 1);

      for (let i = 0; i < barCount; i++) {
        let rawVal = (freqData[i] / 255) * gainMultiplier;
        if (!isPlaying || isMuted) {
          rawVal = 0.04; // subtle idle baseline
        }
        const targetH = Math.min(height * 0.95, Math.max(3 * dpr, rawVal * height * 0.9));

        // Smooth interpolation
        barHeights[i] += (targetH - barHeights[i]) * 0.25;

        // Peak tracking
        if (barHeights[i] > peakHold[i]) {
          peakHold[i] = barHeights[i];
        } else {
          peakHold[i] = Math.max(3 * dpr, peakHold[i] - 1.2 * dpr);
        }

        const x = i * (barWidth + gap);
        const y = height - barHeights[i];

        // Draw bar: clean monochrome white with slight opacity for lower levels
        ctx.fillStyle = isPlaying && !isMuted ? '#ffffff' : '#3f3f46';
        ctx.fillRect(x, y, barWidth, barHeights[i]);

        // Draw peak tick
        if (isPlaying && !isMuted) {
          ctx.fillStyle = '#a1a1aa';
          ctx.fillRect(x, height - peakHold[i] - 2 * dpr, barWidth, 1.5 * dpr);
        }
      }

      animFrameIdRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', updateCanvasSize);
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [volumePercent, isMuted, isPlaying]);

  return (
    <div className="w-full h-16 bg-zinc-950 rounded-xl border border-zinc-800 p-2 overflow-hidden flex items-center justify-center">
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
}
