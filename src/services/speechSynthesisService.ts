/**
 * Speech synthesis manager for Audio Description narration
 */
class SpeechNarratorService {
  private synth: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private lastSpokenCueId: string | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
    }
  }

  public speak(
    cueId: string,
    text: string,
    language: string = 'en-US',
    rate: number = 1.0,
    volume: number = 1.0
  ): void {
    if (!this.synth) return;
    if (this.lastSpokenCueId === cueId) return; // Prevent repeated triggers for same cue

    this.stop(); // Stop any previous narration to stay in sync
    this.lastSpokenCueId = cueId;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = Math.max(0.7, Math.min(1.8, rate));
    utterance.volume = Math.max(0, Math.min(1, volume));

    // Determine appropriate BCP-47 language tag
    if (language.toLowerCase().includes('hindi')) {
      utterance.lang = 'hi-IN';
    } else if (language.toLowerCase().includes('bengali') || language.toLowerCase().includes('bangla')) {
      utterance.lang = 'bn-IN';
    } else if (language.toLowerCase().includes('tamil')) {
      utterance.lang = 'ta-IN';
    } else if (language.toLowerCase().includes('telugu')) {
      utterance.lang = 'te-IN';
    } else if (language.toLowerCase().includes('malayalam')) {
      utterance.lang = 'ml-IN';
    } else if (language.toLowerCase().includes('kannada')) {
      utterance.lang = 'kn-IN';
    } else if (language.toLowerCase().includes('marathi')) {
      utterance.lang = 'mr-IN';
    } else {
      utterance.lang = 'en-US';
    }

    // Try to pick a natural voice if available
    const voices = this.synth.getVoices();
    const matchingVoice = voices.find(
      (v) => v.lang.startsWith(utterance.lang.slice(0, 2)) && !v.name.includes('Google')
    ) || voices.find((v) => v.lang.startsWith(utterance.lang.slice(0, 2)));

    if (matchingVoice) {
      utterance.voice = matchingVoice;
    }

    this.currentUtterance = utterance;
    this.synth.speak(utterance);
  }

  public stop(): void {
    if (this.synth) {
      this.synth.cancel();
      this.currentUtterance = null;
    }
  }

  public resetLastCue(): void {
    this.lastSpokenCueId = null;
  }
}

export const speechNarrator = new SpeechNarratorService();
