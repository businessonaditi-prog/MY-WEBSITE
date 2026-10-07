import React from 'react';
import { Headphones, Volume2, Play, VolumeX, AlertTriangle, Sparkles, Mic, FastForward } from 'lucide-react';
import { ADCue, PlayerSettings } from '../types/accessibility';
import { speechNarrator } from '../services/speechSynthesisService';

interface AudioDescriptionControllerProps {
  currentCue: ADCue | null;
  upcomingCues: ADCue[];
  activeLanguage: string;
  availableLanguages: string[];
  onSelectLanguage: (lang: string) => void;
  settings: PlayerSettings;
  updateSettings: (partial: Partial<PlayerSettings>) => void;
}

export const AudioDescriptionController: React.FC<AudioDescriptionControllerProps> = ({
  currentCue,
  upcomingCues,
  activeLanguage,
  availableLanguages,
  onSelectLanguage,
  settings,
  updateSettings,
}) => {
  const handleTestVoice = () => {
    speechNarrator.speak(
      'test-voice-sample-' + Date.now(),
      'Pixapix Audio Description active. Headphones connected. Narrating cinema scenes clearly.',
      activeLanguage,
      settings.adSpeechRate,
      settings.adVolume
    );
  };

  return (
    <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-5 text-neutral-200 shadow-xl backdrop-blur-md">
      {/* Header and Enable Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-neutral-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Headphones className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-wide text-neutral-100 flex items-center gap-2">
              <span>AUDIO DESCRIPTION (AD)</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950/60 text-amber-400 border border-amber-800/40">
                HEADPHONE-FIRST
              </span>
            </h3>
            <p className="text-xs text-neutral-400">Descriptive narration of visual film elements</p>
          </div>
        </div>

        {/* Master AD Toggle */}
        <div className="flex items-center gap-3">
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.adEnabled}
              onChange={(e) => updateSettings({ adEnabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
            <span className="ml-2 text-xs font-semibold text-neutral-300">
              {settings.adEnabled ? 'Narration ON' : 'Muted'}
            </span>
          </label>
        </div>
      </div>

      {/* Headphone Caution Alert if not connected */}
      {!settings.headphoneConnected && settings.adEnabled && (
        <div className="mt-3 p-3 rounded-lg bg-amber-950/50 border border-amber-600/40 text-amber-200 text-xs flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-amber-300">Headphone Connection Recommended</p>
            <p className="text-amber-200/80 text-[11px] mt-0.5">
              To prevent audio description from sounding across the cinema auditorium, please ensure
              headphones are plugged in or paired via Bluetooth.
            </p>
          </div>
          <button
            onClick={() => updateSettings({ headphoneConnected: true })}
            className="px-2.5 py-1 rounded bg-amber-500 text-neutral-950 font-bold text-[11px] hover:bg-amber-400 self-center"
          >
            I&apos;m Using Headphones
          </button>
        </div>
      )}

      {/* Live Active Narration Display */}
      <div className="mt-4 p-4 rounded-xl bg-neutral-950 border border-neutral-800">
        <div className="flex items-center justify-between text-xs font-mono text-neutral-400 mb-2">
          <span className="flex items-center gap-1.5 text-amber-400">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
            ACTIVE SCENE DESCRIPTION
          </span>
          <span className="text-[11px] text-neutral-400">Voice Synthesis Engine</span>
        </div>

        {currentCue ? (
          <div className="animate-fadeIn">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-neutral-800 text-amber-300 border border-neutral-700">
                {currentCue.category.replace('_', ' ')}
              </span>
              <span className="text-xs text-neutral-400 font-mono">
                {currentCue.startTime}s - {currentCue.endTime}s
              </span>
            </div>
            <p className="text-sm sm:text-base font-medium text-neutral-100 leading-relaxed italic bg-amber-500/5 p-2 rounded-lg border border-amber-500/20">
              &ldquo;{currentCue.text}&rdquo;
            </p>
          </div>
        ) : (
          <div className="py-2 text-center text-xs text-neutral-400 italic">
            No visual scene description currently playing. Narrator pauses during dialogue.
          </div>
        )}

        {/* Upcoming cues queue */}
        {upcomingCues.length > 0 && (
          <div className="mt-3 pt-3 border-t border-neutral-900 text-xs">
            <span className="text-[11px] font-mono text-neutral-400 block mb-1">UPCOMING DESCRIPTION CUE:</span>
            <p className="text-neutral-400 truncate text-[11px]">
              <span className="text-amber-500 font-mono mr-1.5">{upcomingCues[0].startTime}s</span>
              {upcomingCues[0].text}
            </p>
          </div>
        )}
      </div>

      {/* Control Strip (Volume, Speed, Language, Test) */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Language Selection */}
        <div>
          <label className="text-[11px] font-mono text-neutral-400 block mb-1">AD LANGUAGE</label>
          <select
            value={activeLanguage}
            onChange={(e) => onSelectLanguage(e.target.value)}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-amber-500"
          >
            {availableLanguages.map((lang) => (
              <option key={lang} value={lang}>
                {lang} Narration
              </option>
            ))}
          </select>
        </div>

        {/* Speech Rate */}
        <div>
          <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400 mb-1">
            <span>SPEED RATE</span>
            <span className="text-amber-400 font-bold">{settings.adSpeechRate}x</span>
          </div>
          <div className="flex items-center gap-1.5">
            {[0.8, 1.0, 1.25, 1.5].map((rate) => (
              <button
                key={rate}
                onClick={() => updateSettings({ adSpeechRate: rate })}
                className={`flex-1 py-1 rounded text-[11px] font-mono font-medium transition-colors ${
                  settings.adSpeechRate === rate
                    ? 'bg-amber-500 text-neutral-950 font-bold'
                    : 'bg-neutral-950 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
                }`}
              >
                {rate}x
              </button>
            ))}
          </div>
        </div>

        {/* Volume & Test Voice */}
        <div className="flex flex-col justify-end">
          <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400 mb-1">
            <span>VOLUME ({Math.round(settings.adVolume * 100)}%)</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={settings.adVolume}
              onChange={(e) => updateSettings({ adVolume: parseFloat(e.target.value) })}
              className="flex-1 h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
            <button
              onClick={handleTestVoice}
              className="px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-[11px] font-semibold whitespace-nowrap border border-neutral-700 flex items-center gap-1"
              title="Test narration audio"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>Test</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
