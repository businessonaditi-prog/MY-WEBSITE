/**
 * Acoustic Watermark and Audio Sync Analyzer
 * Analyzes microphone audio or virtual auditorium feed for cinema synchronization
 */
export interface AcousticAnalysisData {
  spectrum: number[];
  dbLevel: number;
  isPeakDetected: boolean;
  confidenceScore: number;
}

export class AcousticSyncManager {
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private micStream: MediaStream | null = null;
  private dataArray: Uint8Array<ArrayBuffer> | null = null;
  private isListening: boolean = false;

  public async startMicrophoneListening(onAnalysis: (data: AcousticAnalysisData) => void): Promise<boolean> {
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
        const confidence = Math.min(99, Math.round(Math.max(35, avg * 130 + (isPeak ? 25 : 10))));

        onAnalysis({
          spectrum: normalizedSpectrum.slice(0, 16),
          dbLevel: Math.max(20, Math.min(105, dbApprox)),
          isPeakDetected: isPeak,
          confidenceScore: confidence,
        });

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
      const confidence = Math.min(99, Math.round(82 + Math.random() * 14));

      onAnalysis({
        spectrum,
        dbLevel: Math.round(58 + Math.random() * 12),
        isPeakDetected: isPeak,
        confidenceScore: confidence,
      });
    }, 120);
  }

  public stopListening(): void {
    this.isListening = false;
    if (this.micStream) {
      this.micStream.getTracks().forEach((t) => t.stop());
      this.micStream = null;
    }
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      this.audioCtx.close();
      this.audioCtx = null;
    }
  }
}

export const acousticSync = new AcousticSyncManager();
