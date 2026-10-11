/**
 * Acoustic Watermark and Audio Sync Analyzer
 * Analyzes microphone audio or virtual auditorium feed for cinema synchronization
 * Powered by Gemini 3.8 Flash AI acoustic alignment
 */
import { api } from './apiClient';

export interface AcousticAnalysisData {
  spectrum: number[];
  dbLevel: number;
  isPeakDetected: boolean;
  confidenceScore: number;
  aiSyncedTimestamp?: number;
  detectedScene?: string;
  driftMs?: number;
  recommendation?: string;
}

export class AcousticSyncManager {
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private micStream: MediaStream | null = null;
  private dataArray: Uint8Array<ArrayBuffer> | null = null;
  private isListening: boolean = false;
  private lastAiSyncTime: number = 0;
  private activeFilmId: string | null = null;
  private currentEstimatedTime: number = 0;

  public setPlaybackContext(filmId: string, time: number) {
    this.activeFilmId = filmId;
    this.currentEstimatedTime = time;
  }

  public async startMicrophoneListening(
    onAnalysis: (data: AcousticAnalysisData) => void,
    filmId?: string,
    initialTime?: number
  ): Promise<boolean> {
    if (filmId) this.activeFilmId = filmId;
    if (typeof initialTime === 'number') this.currentEstimatedTime = initialTime;

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Microphone media devices not supported on this device');
      }

      this.micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: true,
        },
      });

      this.audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const source = this.audioCtx.createMediaStreamSource(this.micStream);
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 64;
      source.connect(this.analyser);

      const bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(new ArrayBuffer(bufferLength));
      this.isListening = true;

      const loop = () => {
        if (!this.isListening || !this.analyser || !this.dataArray) return;
        this.analyser.getByteFrequencyData(this.dataArray);

        // Calculate average energy / dB
        let sum = 0;
        let peak = 0;
        const normalizedSpectrum: number[] = [];
        for (let i = 0; i < this.dataArray.length; i++) {
          const val = this.dataArray[i] / 255;
          normalizedSpectrum.push(val);
          sum += val;
          if (val > peak) peak = val;
        }

        const avg = sum / this.dataArray.length;
        const dbApprox = Math.round(20 * Math.log10(Math.max(avg, 0.01)) + 60); // approx dB
        const isPeak = peak > 0.45;
        // Confidence based on signal strength & acoustic presence
        const confidence = Math.min(99, Math.round(Math.max(45, avg * 130 + (isPeak ? 25 : 15))));

        const analysisData: AcousticAnalysisData = {
          spectrum: normalizedSpectrum.slice(0, 16),
          dbLevel: Math.max(25, Math.min(105, dbApprox)),
          isPeakDetected: isPeak,
          confidenceScore: confidence,
        };

        // Periodic AI Theatrical Alignment every 4 seconds if film context is available
        const now = Date.now();
        if (this.activeFilmId && now - this.lastAiSyncTime > 4000 && confidence > 55) {
          this.lastAiSyncTime = now;
          this.triggerAiSync(this.activeFilmId, this.currentEstimatedTime, analysisData.spectrum, analysisData.dbLevel, onAnalysis);
        } else {
          onAnalysis(analysisData);
        }

        requestAnimationFrame(loop);
      };

      requestAnimationFrame(loop);
      return true;
    } catch (err) {
      console.warn('Microphone permission or hardware access failed, falling back to simulated acoustic sync:', err);
      this.startSimulatedListening(onAnalysis);
      return false;
    }
  }

  public async triggerAiSync(
    filmId: string,
    currentTime: number,
    spectrum: number[],
    dbLevel: number,
    onAnalysis: (data: AcousticAnalysisData) => void
  ) {
    try {
      const res = await api.alignTheatreAudioAI({
        filmId,
        currentTime,
        spectrum,
        ambientDb: dbLevel,
      });

      if (res && res.success) {
        onAnalysis({
          spectrum,
          dbLevel,
          isPeakDetected: true,
          confidenceScore: res.confidenceScore,
          aiSyncedTimestamp: res.syncedTimestamp,
          detectedScene: res.detectedScene,
          driftMs: res.driftMs,
          recommendation: res.recommendation,
        });
      }
    } catch (err) {
      console.warn('AI acoustic alignment API call error:', err);
    }
  }

  public startSimulatedListening(onAnalysis: (data: AcousticAnalysisData) => void): void {
    this.isListening = true;
    let step = 0;

    const interval = setInterval(() => {
      if (!this.isListening) {
        clearInterval(interval);
        return;
      }

      step += 0.2;
      const spectrum = Array.from({ length: 16 }, (_, i) => {
        return Math.max(0.05, Math.min(0.95, (Math.sin(step + i * 0.4) + 1) * 0.4 + Math.random() * 0.15));
      });

      const avg = spectrum.reduce((a, b) => a + b, 0) / spectrum.length;
      const isPeak = Math.random() > 0.65;
      const confidence = Math.min(99, Math.round(92 + Math.random() * 6));

      onAnalysis({
        spectrum,
        dbLevel: Math.round(68 + Math.random() * 10),
        isPeakDetected: isPeak,
        confidenceScore: confidence,
        aiSyncedTimestamp: this.currentEstimatedTime,
        detectedScene: 'Simulated Cinema Auditorium Acoustic Feed',
      });
    }, 150);
  }

  public stopListening(): void {
    this.isListening = false;
    if (this.micStream) {
      this.micStream.getTracks().forEach((t) => t.stop());
      this.micStream = null;
    }
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      this.audioCtx.close().catch(() => {});
      this.audioCtx = null;
    }
  }
}

export const acousticSync = new AcousticSyncManager();
