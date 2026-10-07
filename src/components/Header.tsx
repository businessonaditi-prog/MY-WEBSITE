import React from 'react';
import { Headphones, Volume2, ShieldCheck, Moon, Sun, Film, Sparkles, Smartphone } from 'lucide-react';
import { PlayerSettings } from '../types/accessibility';

interface HeaderProps {
  activeTab: 'player' | 'vault' | 'screening-lab' | 'settings' | 'cbfc-guide';
  setActiveTab: (tab: 'player' | 'vault' | 'screening-lab' | 'settings' | 'cbfc-guide') => void;
  settings: PlayerSettings;
  updateSettings: (partial: Partial<PlayerSettings>) => void;
  isCinemaDimmerActive: boolean;
  toggleCinemaDimmer: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  settings,
  updateSettings,
  isCinemaDimmerActive,
  toggleCinemaDimmer,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-neutral-950/90 backdrop-blur-md border-b border-neutral-800 text-neutral-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Logo & Identity */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black tracking-wider text-base sm:text-lg bg-gradient-to-r from-amber-400 via-amber-200 to-yellow-500 bg-clip-text text-transparent">
                  PIXAPIX
                </span>
                <span className="text-xs px-2 py-0.5 rounded font-mono font-semibold bg-neutral-800 text-amber-300 border border-neutral-700">
                  AD &amp; CC
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 flex items-center gap-1.5 hidden sm:flex">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>CBFC Certified Cinema Accessibility System</span>
              </p>
            </div>
          </div>

          {/* Quick Cinema Controls & Badges */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Headphone Status Toggle / Indicator */}
            <button
              onClick={() => updateSettings({ headphoneConnected: !settings.headphoneConnected })}
              title={settings.headphoneConnected ? 'Headphones connected (Safe for theater)' : 'No headphones detected (Tap to toggle)'}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                settings.headphoneConnected
                  ? 'bg-emerald-950/40 border-emerald-600/50 text-emerald-300'
                  : 'bg-amber-950/40 border-amber-600/50 text-amber-300 animate-pulse'
              }`}
            >
              <Headphones className="w-3.5 h-3.5" />
              <span className="hidden md:inline">
                {settings.headphoneConnected ? 'Headphone Active' : 'Plug In Headphone'}
              </span>
            </button>

            {/* Quick Dimmer Button */}
            <button
              onClick={toggleCinemaDimmer}
              title="Toggle Cinema Auditorium Dark Mode (Anti-Glare)"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                isCinemaDimmerActive
                  ? 'bg-purple-950/60 border-purple-500 text-purple-200 shadow-sm'
                  : 'bg-neutral-900 border-neutral-700 text-neutral-300 hover:bg-neutral-800'
              }`}
            >
              <Moon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cinema Dimmer</span>
            </button>
          </div>
        </div>

        {/* Navigation Bar */}
        <nav className="mt-3 flex items-center gap-1 sm:gap-2 overflow-x-auto scrollbar-none pb-1 text-xs sm:text-sm font-medium border-t border-neutral-800/80 pt-2.5">
          <button
            onClick={() => setActiveTab('player')}
            className={`px-3.5 py-1.5 rounded-lg whitespace-nowrap transition-all ${
              activeTab === 'player'
                ? 'bg-amber-500 text-neutral-950 font-semibold shadow-md shadow-amber-500/20'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
            }`}
          >
            Live Cinema Player
          </button>
          <button
            onClick={() => setActiveTab('vault')}
            className={`px-3.5 py-1.5 rounded-lg whitespace-nowrap transition-all ${
              activeTab === 'vault'
                ? 'bg-amber-500 text-neutral-950 font-semibold shadow-md shadow-amber-500/20'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
            }`}
          >
            Movie Packages &amp; PIN
          </button>
          <button
            onClick={() => setActiveTab('screening-lab')}
            className={`px-3.5 py-1.5 rounded-lg whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeTab === 'screening-lab'
                ? 'bg-amber-500 text-neutral-950 font-semibold shadow-md shadow-amber-500/20'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
            }`}
          >
            <span>Auditorium Screener Lab</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-3.5 py-1.5 rounded-lg whitespace-nowrap transition-all ${
              activeTab === 'settings'
                ? 'bg-amber-500 text-neutral-950 font-semibold shadow-md shadow-amber-500/20'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
            }`}
          >
            Accessibility Controls
          </button>
          <button
            onClick={() => setActiveTab('cbfc-guide')}
            className={`px-3.5 py-1.5 rounded-lg whitespace-nowrap transition-all ${
              activeTab === 'cbfc-guide'
                ? 'bg-amber-500 text-neutral-950 font-semibold shadow-md shadow-amber-500/20'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
            }`}
          >
            CBFC Guidelines
          </button>
        </nav>
      </div>
    </header>
  );
};
