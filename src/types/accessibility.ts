export interface ADCue {
  id: string;
  startTime: number; // in seconds
  endTime: number;
  text: string;
  category: 'action' | 'scene_setting' | 'character_expression' | 'subtitled_foreign_dialog';
}

export interface CCCue {
  id: string;
  startTime: number;
  endTime: number;
  speaker?: string;
  text: string;
  soundEffect?: string;
  emotion?: string;
  isMusic?: boolean;
}

export interface ADTrack {
  language: string;
  narrator: string;
  cues: ADCue[];
}

export interface CCTrack {
  language: string;
  cues: CCCue[];
}

export interface MoviePackage {
  id: string;
  title: string;
  originalLanguage: string;
  releaseYear: number;
  durationMinutes: number;
  durationSeconds: number;
  posterUrl: string;
  cbfcRating: string; // e.g., 'U/A 16+'
  cbfcCertNo: string;
  producer: string;
  director: string;
  summary: string;
  packageSize: string;
  unlockPin: string;
  isDownloaded: boolean;
  isUnlocked: boolean;
  downloadProgress: number; // 0 - 100
  availableLanguages: string[];
  adTracks: Record<string, ADTrack>;
  ccTracks: Record<string, CCTrack>;
  audioWaveformFingerprint: number[]; // Normalized frequency peaks for acoustic fingerprint simulation
  demoVideoUrl?: string;
}

export type SyncStatus = 'idle' | 'listening' | 'locking' | 'synced' | 'drift_detected';

export interface SyncState {
  status: SyncStatus;
  confidence: number; // 0 - 100%
  currentTime: number; // seconds into film
  offsetMs: number; // fine manual adjust (-2000 to +2000 ms)
  lastSyncTimestamp: number;
  acousticPeaksDetected: number;
  ambientNoiseDb: number;
}

export type CCTheme = 'yellow-black' | 'white-black' | 'cyan-dark' | 'black-white';
export type CCFontSize = 'sm' | 'md' | 'lg' | 'xl';
export type CCPosition = 'bottom' | 'center' | 'hud';

export interface PlayerSettings {
  adEnabled: boolean;
  ccEnabled: boolean;
  adVolume: number;
  adSpeechRate: number;
  adVoice: string;
  duckingLevel: number;
  ccTheme: CCTheme;
  ccFontSize: CCFontSize;
  ccPosition: CCPosition;
  ccShowSoundEffects: boolean;
  ccShowSpeakers: boolean;
  cinemaDimmer: number; // 0 to 0.8
  hapticFeedback: boolean;
  headphoneConnected: boolean;
}
