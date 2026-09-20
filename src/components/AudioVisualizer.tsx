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

      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      let freqData = new Uint8Array(barCount);
      const isLive = analyser && !isMuted && isPlaying;
      if (isLive) {
        const fullFreq = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(fullFreq);
        const step = Math.floor(fullFreq.length / (barCount * 1.6));
        for (let i = 0; i < barCount; i++) {
          freqData[i] = fullFreq[i * step] || 0;
        }
      }

      const time = Date.now() * 0.003;
      const gainMultiplier = isMuted || !isPlaying ? 0 : Math.max(0.2, volumePercent / 100);
      const barWidth = Math.max(3 * dpr, (width / barCount) * 0.65);
      const gap = (width - barWidth * barCount) / (barCount - 1);

      for (let i = 0; i < barCount; i++) {
        let rawVal = 0;
        if (isLive) {
          rawVal = (freqData[i] / 255) * gainMultiplier;
        } else {
          // Elegant idle breathing wave simulation resembling the preview graphic
          const wave1 = Math.sin(time + i * 0.28) * 0.5 + 0.5;
          const wave2 = Math.cos(time * 0.8 + i * 0.15) * 0.5 + 0.5;
          rawVal = 0.08 + (wave1 * 0.22 + wave2 * 0.18) * 0.6;
          if (isMuted) rawVal = 0.04;
        }

        const targetH = Math.min(height * 0.95, Math.max(4 * dpr, rawVal * height * 0.9));

        // Smooth interpolation
        barHeights[i] += (targetH - barHeights[i]) * 0.22;

        if (barHeights[i] > peakHold[i]) {
          peakHold[i] = barHeights[i];
        } else {
          peakHold[i] = Math.max(4 * dpr, peakHold[i] - 1.0 * dpr);
        }

        const x = i * (barWidth + gap);
        const y = height - barHeights[i];
        const barH = barHeights[i];

        // Glowing gradient bar
        const grad = ctx.createLinearGradient(0, y, 0, height);
        if (isPlaying && !isMuted) {
          grad.addColorStop(0, '#ffffff');
          grad.addColorStop(1, '#71717a');
          ctx.shadowColor = 'rgba(255, 255, 255, 0.4)';
          ctx.shadowBlur = 6 * dpr;
        } else {
          grad.addColorStop(0, '#a1a1aa');
          grad.addColorStop(1, '#27272a');
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
        }

        ctx.fillStyle = grad;
        
        // Rounded bar top
        const radius = Math.min(barWidth / 2, 2 * dpr);
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + barWidth - radius, y);
        ctx.quadraticCurveTo(x + barWidth, y, x + barWidth, y + radius);
        ctx.lineTo(x + barWidth, height);
        ctx.lineTo(x, height);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
        ctx.fill();

        // Draw floating peak tick if active
        if (isPlaying && !isMuted) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(x, Math.max(0, height - peakHold[i] - 2 * dpr), barWidth, 1.5 * dpr);
        }
      }

      ctx.shadowBlur = 0;
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
    <div className="w-full h-14 bg-zinc-950/80 rounded-xl border border-zinc-800/80 p-2 overflow-hidden flex items-center justify-center backdrop-blur-md">
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
}
