export interface EQBand {
  frequency: number;
  label: string;
  gain: number; // -12 to +12 dB
}

export interface BoosterState {
  volume: number; // 0 to 600 (%)
  bassBoost: number; // 0 to 100 (%)
  limiterEnabled: boolean;
  stereoPan: number; // -1 to +1
  isMuted: boolean;
  isMono: boolean;
  preset: string;
  eqBands: EQBand[];
}

export interface TabInfo {
  id: number;
  title: string;
  url: string;
  favIcon: string;
  isPlaying: boolean;
  volume: number;
  isMuted: boolean;
}

export interface AudioTrack {
  id: string;
  title: string;
  category: 'podcast' | 'music' | 'movie' | 'synth';
  url?: string;
  description: string;
  defaultVolumePercent: number; // Often 30% or 40% to demonstrate boosting!
}
