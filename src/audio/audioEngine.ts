import { EQBand } from '../types';

export const DEFAULT_EQ_BANDS: EQBand[] = [
  { frequency: 60, label: '60 Hz', gain: 0 },
  { frequency: 250, label: '250 Hz', gain: 0 },
  { frequency: 1000, label: '1 kHz', gain: 0 },
  { frequency: 4000, label: '4 kHz', gain: 0 },
  { frequency: 12000, label: '12 kHz', gain: 0 },
];

export const PRESETS: Record<string, { bass: number; eq: number[] }> = {
  flat: { bass: 0, eq: [0, 0, 0, 0, 0] },
  bass_heavy: { bass: 80, eq: [6, 4, 0, -1, -2] },
  vocal_clarity: { bass: 10, eq: [-3, -1, 3, 5, 3] },
  movie_dialog: { bass: 25, eq: [-2, 1, 4, 3, 1] },
  rock_punch: { bass: 50, eq: [5, 2, -1, 3, 4] },
  electronic: { bass: 70, eq: [6, 3, -2, 2, 5] },
};

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private currentAudioElement: HTMLAudioElement | null = null;

  // Synthesizer nodes for standalone offline playback
  private isSynthPlaying = false;
  private synthInterval: number | null = null;
  private synthGain: GainNode | null = null;

  // Processing chain nodes
  private bassFilter: BiquadFilterNode | null = null;
  private eqFilters: BiquadFilterNode[] = [];
  private gainNode: GainNode | null = null;
  private limiterNode: DynamicsCompressorNode | null = null;
  private pannerNode: StereoPannerNode | null = null;
  private analyserNode: AnalyserNode | null = null;

  // State caches
  private currentVolume = 100; // 0 to 600
  private currentBass = 0;
  private isMuted = false;
  private limiterEnabled = true;
  private isMono = false;
  private pan = 0;

  constructor() {
    // Lazy init on first user interaction
  }

  public getContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.buildChain();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  private buildChain() {
    if (!this.ctx) return;

    // 1. Bass filter (lowshelf at 120Hz)
    this.bassFilter = this.ctx.createBiquadFilter();
    this.bassFilter.type = 'lowshelf';
    this.bassFilter.frequency.value = 120;
    this.bassFilter.gain.value = 0;

    // 2. 5-Band EQ filters
    this.eqFilters = DEFAULT_EQ_BANDS.map((band, idx) => {
      const filter = this.ctx!.createBiquadFilter();
      if (idx === 0) {
        filter.type = 'lowshelf';
      } else if (idx === DEFAULT_EQ_BANDS.length - 1) {
        filter.type = 'highshelf';
      } else {
        filter.type = 'peaking';
        filter.Q.value = 1.2;
      }
      filter.frequency.value = band.frequency;
      filter.gain.value = band.gain;
      return filter;
    });

    // 3. Main Gain Node (Allows 0x to 6x boost)
    this.gainNode = this.ctx.createGain();
    this.gainNode.gain.value = 1.0;

    // 4. Limiter / Compressor to prevent hard clipping at 600% volume
    this.limiterNode = this.ctx.createDynamicsCompressor();
    this.limiterNode.threshold.value = -3.0; // dB
    this.limiterNode.knee.value = 4.0;
    this.limiterNode.ratio.value = 16.0;
    this.limiterNode.attack.value = 0.003;
    this.limiterNode.release.value = 0.15;

    // 5. Stereo Panner
    try {
      this.pannerNode = this.ctx.createStereoPanner();
      this.pannerNode.pan.value = 0;
    } catch {
      this.pannerNode = null;
    }

    // 6. Analyser
    this.analyserNode = this.ctx.createAnalyser();
    this.analyserNode.fftSize = 256;
    this.analyserNode.smoothingTimeConstant = 0.8;

    // Synth gain node
    this.synthGain = this.ctx.createGain();
    this.synthGain.gain.value = 0.4;
    this.synthGain.connect(this.bassFilter);

    // Chain connection:
    // bassFilter -> eq[0] -> eq[1] -> eq[2] -> eq[3] -> eq[4] -> gainNode -> limiterNode -> panner -> analyser -> destination
    let lastNode: AudioNode = this.bassFilter;
    for (const eqFilter of this.eqFilters) {
      lastNode.connect(eqFilter);
      lastNode = eqFilter;
    }

    lastNode.connect(this.gainNode);
    lastNode = this.gainNode;

    if (this.limiterEnabled && this.limiterNode) {
      lastNode.connect(this.limiterNode);
      lastNode = this.limiterNode;
    }

    if (this.pannerNode) {
      lastNode.connect(this.pannerNode);
      lastNode = this.pannerNode;
    }

    lastNode.connect(this.analyserNode);
    this.analyserNode.connect(this.ctx.destination);
  }

  public connectMediaElement(element: HTMLAudioElement) {
    const ctx = this.getContext();
    if (this.currentAudioElement === element && this.sourceNode) {
      return;
    }

    this.currentAudioElement = element;
    try {
      if (!this.sourceNode) {
        this.sourceNode = ctx.createMediaElementSource(element);
        if (this.bassFilter) {
          this.sourceNode.connect(this.bassFilter);
        }
      }
    } catch (e) {
      console.warn('Media element already connected or cross-origin restricted:', e);
    }
  }

  public setVolume(percent: number) {
    this.currentVolume = Math.max(0, Math.min(600, percent));
    this.applyGain();
  }

  public setMute(muted: boolean) {
    this.isMuted = muted;
    this.applyGain();
  }

  private applyGain() {
    if (!this.gainNode || !this.ctx) return;
    const targetGain = this.isMuted ? 0 : this.currentVolume / 100;
    const now = this.ctx.currentTime;
    this.gainNode.gain.cancelScheduledValues(now);
    this.gainNode.gain.linearRampToValueAtTime(targetGain, now + 0.04);
  }

  public setBassBoost(percent: number) {
    this.currentBass = percent;
    if (!this.bassFilter || !this.ctx) return;
    // Map 0-100% to 0 to +15 dB boost
    const gainDb = (percent / 100) * 15;
    const now = this.ctx.currentTime;
    this.bassFilter.gain.cancelScheduledValues(now);
    this.bassFilter.gain.linearRampToValueAtTime(gainDb, now + 0.05);
  }

  public setEQBand(index: number, gainDb: number) {
    if (!this.ctx || !this.eqFilters[index]) return;
    const filter = this.eqFilters[index];
    const clampedGain = Math.max(-12, Math.min(12, gainDb));
    const now = this.ctx.currentTime;
    filter.gain.cancelScheduledValues(now);
    filter.gain.linearRampToValueAtTime(clampedGain, now + 0.05);
  }

  public setLimiter(enabled: boolean) {
    this.limiterEnabled = enabled;
    if (!this.limiterNode || !this.gainNode || !this.ctx) return;
    // Adjust compressor aggressiveness based on enabled state
    const now = this.ctx.currentTime;
    if (enabled) {
      this.limiterNode.threshold.setValueAtTime(-3.0, now);
      this.limiterNode.ratio.setValueAtTime(16.0, now);
    } else {
      // Off: raise threshold high so it doesn't compress
      this.limiterNode.threshold.setValueAtTime(0, now);
      this.limiterNode.ratio.setValueAtTime(1.0, now);
    }
  }

  public setPan(panVal: number) {
    this.pan = Math.max(-1, Math.min(1, panVal));
    if (this.pannerNode && this.ctx) {
      this.pannerNode.pan.setValueAtTime(this.pan, this.ctx.currentTime);
    }
  }

  public setMono(mono: boolean) {
    this.isMono = mono;
    if (this.pannerNode && this.ctx) {
      this.pannerNode.pan.setValueAtTime(mono ? 0 : this.pan, this.ctx.currentTime);
    }
  }

  public getAnalyser(): AnalyserNode | null {
    return this.analyserNode;
  }

  public getVolumeLevel(): number {
    if (!this.analyserNode) return 0;
    const data = new Uint8Array(this.analyserNode.frequencyBinCount);
    this.analyserNode.getByteTimeDomainData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      const v = (data[i] - 128) / 128;
      sum += v * v;
    }
    const rms = Math.sqrt(sum / data.length);
    return Math.min(1, rms * 3);
  }

  // Built-in Synthesizer to test volume boost in any browser environment without external audio assets!
  public startSynthDemo(trackType: 'podcast' | 'music' | 'synth' = 'music') {
    const ctx = this.getContext();
    this.stopSynthDemo();
    this.isSynthPlaying = true;

    // Create melodic/rhythmic notes loop
    let step = 0;
    const bpm = trackType === 'podcast' ? 90 : 115;
    const intervalMs = (60 / bpm) * 1000 * 0.5;

    // Chords and notes frequencies
    const musicNotes = [220, 261.63, 329.63, 392, 440, 329.63, 293.66, 261.63]; // Am / C
    const bassNotes = [110, 110, 130.81, 130.81, 146.83, 146.83, 98, 98];
    const voiceFormants = [300, 450, 600, 750, 500, 400, 650, 350]; // simulated speech formants

    const playStep = () => {
      if (!this.isSynthPlaying || !this.ctx || !this.synthGain) return;
      const now = this.ctx.currentTime;

      if (trackType === 'podcast') {
        // Human voice speech cadence simulator (bandpass speech envelope)
        const osc = this.ctx.createOscillator();
        const vGain = this.ctx.createGain();
        const formant = voiceFormants[step % voiceFormants.length];

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(140 + (step % 4) * 20, now);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(formant, now);
        filter.Q.setValueAtTime(4.0, now);

        // Soft speech volume
        vGain.gain.setValueAtTime(0.001, now);
        vGain.gain.linearRampToValueAtTime(0.08, now + 0.05);
        vGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

        osc.connect(filter);
        filter.connect(vGain);
        vGain.connect(this.synthGain);

        osc.start(now);
        osc.stop(now + 0.25);
      } else {
        // Melodic / Bass synth loop
        // 1. Lead note
        const osc = this.ctx.createOscillator();
        const noteGain = this.ctx.createGain();
        const noteFreq = musicNotes[step % musicNotes.length];

        osc.type = step % 4 === 0 ? 'sawtooth' : 'sine';
        osc.frequency.setValueAtTime(noteFreq, now);

        noteGain.gain.setValueAtTime(0.001, now);
        noteGain.gain.linearRampToValueAtTime(0.12, now + 0.02);
        noteGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        osc.connect(noteGain);
        noteGain.connect(this.synthGain);
        osc.start(now);
        osc.stop(now + 0.38);

        // 2. Bass hit on beat
        if (step % 2 === 0) {
          const bassOsc = this.ctx.createOscillator();
          const bassGain = this.ctx.createGain();
          const bassFreq = bassNotes[(step / 2) % bassNotes.length];

          bassOsc.type = 'triangle';
          bassOsc.frequency.setValueAtTime(bassFreq, now);
          bassGain.gain.setValueAtTime(0.001, now);
          bassGain.gain.linearRampToValueAtTime(0.2, now + 0.02);
          bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

          bassOsc.connect(bassGain);
          bassGain.connect(this.synthGain);
          bassOsc.start(now);
          bassOsc.stop(now + 0.42);
        }

        // 3. Soft Hi-hat click on every 8th
        if (trackType === 'music' && step % 2 === 1) {
          const noiseBuffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.04, this.ctx.sampleRate);
          const output = noiseBuffer.getChannelData(0);
          for (let i = 0; i < noiseBuffer.length; i++) {
            output[i] = Math.random() * 2 - 1;
          }
          const whiteNoise = this.ctx.createBufferSource();
          whiteNoise.buffer = noiseBuffer;
          const filter = this.ctx.createBiquadFilter();
          filter.type = 'highpass';
          filter.frequency.value = 6000;

          const hatGain = this.ctx.createGain();
          hatGain.gain.setValueAtTime(0.03, now);
          hatGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

          whiteNoise.connect(filter);
          filter.connect(hatGain);
          hatGain.connect(this.synthGain);
          whiteNoise.start(now);
          whiteNoise.stop(now + 0.045);
        }
      }

      step++;
    };

    // Play immediately first note
    playStep();
    this.synthInterval = window.setInterval(playStep, intervalMs);
  }

  public stopSynthDemo() {
    this.isSynthPlaying = false;
    if (this.synthInterval !== null) {
      clearInterval(this.synthInterval);
      this.synthInterval = null;
    }
  }

  public isSynthesizerActive(): boolean {
    return this.isSynthPlaying;
  }
}

// Singleton instance
export const audioEngine = new AudioEngine();
