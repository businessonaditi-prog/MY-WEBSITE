import React from 'react';
import { Settings, Subtitles, Headphones, Moon, Eye, Sliders, CheckCircle2, ShieldCheck, Vibrate } from 'lucide-react';
import { CCFontSize, CCTheme, PlayerSettings } from '../types/accessibility';
import { speechNarrator } from '../services/speechSynthesisService';

interface AccessibilityControlsProps {
  settings: PlayerSettings;
  updateSettings: (partial: Partial<PlayerSettings>) => void;
  onTestSpeech: () => void;
}

export const AccessibilityControls: React.FC<AccessibilityControlsProps> = ({
  settings,
  updateSettings,
  onTestSpeech,
}) => {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide flex items-center gap-2">
          <Settings className="w-6 h-6 text-amber-400" />
          <span>Cinema Accessibility Configuration</span>
        </h2>
        <p className="text-xs sm:text-sm text-neutral-400 mt-1">
          Customize subtitles, contrast, narration speed, and theater dark-room safety preferences.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Closed Caption Display Settings */}
        <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-sky-400 font-mono pb-2 border-b border-neutral-800">
            <Subtitles className="w-4 h-4" />
            <span>CLOSED CAPTION (CC) PREFERENCES</span>
          </div>

          {/* Theme Palette */}
          <div>
            <label className="text-xs font-semibold text-neutral-300 block mb-2">Contrast Palette</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'yellow-black', label: 'Cinema Yellow / Black', previewBg: 'bg-black text-amber-300' },
                { id: 'white-black', label: 'Pure White / Black', previewBg: 'bg-black text-white' },
                { id: 'cyan-dark', label: 'High-Vis Cyan / Dark', previewBg: 'bg-neutral-950 text-cyan-300' },
                { id: 'black-white', label: 'Black / White (Inverted)', previewBg: 'bg-neutral-100 text-neutral-950' },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => updateSettings({ ccTheme: t.id as CCTheme })}
                  className={`p-2.5 rounded-xl border text-xs font-medium text-left transition-all ${
                    settings.ccTheme === t.id
                      ? 'border-amber-500 ring-2 ring-amber-500/30'
                      : 'border-neutral-800 hover:border-neutral-700'
                  }`}
                >
                  <div className={`p-1.5 rounded text-center font-mono font-bold text-xs mb-1 ${t.previewBg}`}>
                    Aa Sample
                  </div>
                  <span className="text-[11px] text-neutral-300">{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Font Sizing */}
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-neutral-300 mb-2">
              <span>Text Scaling</span>
              <span className="text-amber-400 font-mono uppercase">{settings.ccFontSize}</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {(['sm', 'md', 'lg', 'xl'] as CCFontSize[]).map((size) => (
                <button
                  key={size}
                  onClick={() => updateSettings({ ccFontSize: size })}
                  className={`py-2 rounded-lg text-xs font-mono font-semibold transition-colors ${
                    settings.ccFontSize === size
                      ? 'bg-amber-500 text-neutral-950 font-bold'
                      : 'bg-neutral-950 text-neutral-400 hover:text-white border border-neutral-800'
                  }`}
                >
                  {size.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Sound Effect & Speaker Toggles */}
          <div className="space-y-2 pt-2 border-t border-neutral-800/80">
            <label className="flex items-center justify-between p-2 rounded-lg bg-neutral-950 border border-neutral-800 cursor-pointer">
              <span className="text-xs text-neutral-300">Show Sound Effect Descriptors ([GUNFIRE], [MUSIC])</span>
              <input
                type="checkbox"
                checked={settings.ccShowSoundEffects}
                onChange={(e) => updateSettings({ ccShowSoundEffects: e.target.checked })}
                className="w-4 h-4 rounded accent-amber-500"
              />
            </label>
            <label className="flex items-center justify-between p-2 rounded-lg bg-neutral-950 border border-neutral-800 cursor-pointer">
              <span className="text-xs text-neutral-300">Show Speaker Names ([BHAIRAVA], [SUMATHI])</span>
              <input
                type="checkbox"
                checked={settings.ccShowSpeakers}
                onChange={(e) => updateSettings({ ccShowSpeakers: e.target.checked })}
                className="w-4 h-4 rounded accent-amber-500"
              />
            </label>
          </div>
        </div>

        {/* Audio Description & Headphone Settings */}
        <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-amber-400 font-mono pb-2 border-b border-neutral-800">
            <Headphones className="w-4 h-4" />
            <span>AUDIO DESCRIPTION (AD) PREFERENCES</span>
          </div>

          {/* Speech Rate */}
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-neutral-300 mb-2">
              <span>Speech Narration Speed</span>
              <span className="text-amber-400 font-mono font-bold">{settings.adSpeechRate}x</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[0.8, 1.0, 1.25, 1.5].map((rate) => (
                <button
                  key={rate}
                  onClick={() => updateSettings({ adSpeechRate: rate })}
                  className={`py-2 rounded-lg text-xs font-mono font-semibold transition-colors ${
                    settings.adSpeechRate === rate
                      ? 'bg-amber-500 text-neutral-950 font-bold'
                      : 'bg-neutral-950 text-neutral-400 hover:text-white border border-neutral-800'
                  }`}
                >
                  {rate}x
                </button>
              ))}
            </div>
          </div>

          {/* AD Volume */}
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-neutral-300 mb-1">
              <span>Narration Volume</span>
              <span className="text-amber-400 font-mono">{Math.round(settings.adVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={settings.adVolume}
              onChange={(e) => updateSettings({ adVolume: parseFloat(e.target.value) })}
              className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
          </div>

          {/* Test Voice Button */}
          <div className="pt-2">
            <button
              onClick={onTestSpeech}
              className="w-full py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-bold border border-neutral-700 flex items-center justify-center gap-2 transition-colors"
            >
              <Headphones className="w-4 h-4 text-amber-400" />
              <span>Test Audio Description Voice (Check Headphones)</span>
            </button>
          </div>

          {/* Headphone Status Toggle */}
          <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-neutral-200">Headphones Connected</div>
              <div className="text-[11px] text-neutral-400 mt-0.5">Mutes phone speakers for auditorium courtesy</div>
            </div>
            <input
              type="checkbox"
              checked={settings.headphoneConnected}
              onChange={(e) => updateSettings({ headphoneConnected: e.target.checked })}
              className="w-4 h-4 rounded accent-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* Auditorium Dark Room Safety & Dimmer */}
      <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold text-purple-400 font-mono pb-2 border-b border-neutral-800">
          <Moon className="w-4 h-4" />
          <span>AUDITORIUM DARK-ROOM PROTOCOL</span>
        </div>

        <div>
          <div className="flex items-center justify-between text-xs font-semibold text-neutral-300 mb-1">
            <span>Cinema Screen Dimmer Overlay ({Math.round(settings.cinemaDimmer * 100)}% Dimming)</span>
            <span className="text-purple-400 font-mono text-[11px]">Reduces seat light spill</span>
          </div>
          <input
            type="range"
            min={0}
            max={0.8}
            step={0.05}
            value={settings.cinemaDimmer}
            onChange={(e) => updateSettings({ cinemaDimmer: parseFloat(e.target.value) })}
            className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-neutral-400">
          <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-neutral-200 block">CBFC Guidelines 2024 Conformance</strong>
              Complies with Central Board of Film Certification digital cinema accessibility norms.
            </div>
          </div>
          <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-neutral-200 block">Cinema DRM &amp; Content Security</strong>
              Packages contain zero exhibition video streams; only synchronized accessibility metadata.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
