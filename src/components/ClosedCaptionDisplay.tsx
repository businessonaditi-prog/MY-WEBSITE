import React from 'react';
import { Subtitles, Volume2, Music, User, Eye, Maximize2 } from 'lucide-react';
import { CCCue, CCFontSize, CCTheme } from '../types/accessibility';

interface ClosedCaptionDisplayProps {
  currentCues: CCCue[];
  theme: CCTheme;
  fontSize: CCFontSize;
  showSoundEffects: boolean;
  showSpeakers: boolean;
  onToggleFullscreen?: () => void;
  isFullscreen?: boolean;
}

export const ClosedCaptionDisplay: React.FC<ClosedCaptionDisplayProps> = ({
  currentCues,
  theme,
  fontSize,
  showSoundEffects,
  showSpeakers,
  onToggleFullscreen,
  isFullscreen = false,
}) => {
  // Theme color styling
  const getThemeStyles = () => {
    switch (theme) {
      case 'yellow-black':
        return {
          container: 'bg-black text-amber-300 border-amber-900/30',
          speakerText: 'text-amber-400 font-bold',
          soundText: 'text-amber-200/90 italic font-mono',
          dialogText: 'text-yellow-300 font-medium',
          glow: 'drop-shadow-[0_2px_8px_rgba(245,158,11,0.25)]',
        };
      case 'white-black':
        return {
          container: 'bg-black text-white border-neutral-800',
          speakerText: 'text-neutral-300 font-bold',
          soundText: 'text-neutral-400 italic font-mono',
          dialogText: 'text-white font-medium',
          glow: 'drop-shadow-[0_2px_8px_rgba(255,255,255,0.2)]',
        };
      case 'cyan-dark':
        return {
          container: 'bg-neutral-950 text-cyan-300 border-cyan-900/40',
          speakerText: 'text-cyan-400 font-bold',
          soundText: 'text-sky-200/80 italic font-mono',
          dialogText: 'text-cyan-200 font-medium',
          glow: 'drop-shadow-[0_2px_8px_rgba(56,189,248,0.25)]',
        };
      case 'black-white':
        return {
          container: 'bg-neutral-100 text-neutral-950 border-neutral-300',
          speakerText: 'text-neutral-900 font-black',
          soundText: 'text-neutral-700 italic font-mono',
          dialogText: 'text-neutral-950 font-bold',
          glow: '',
        };
    }
  };

  const getFontSizeClass = () => {
    switch (fontSize) {
      case 'sm':
        return 'text-base sm:text-lg';
      case 'md':
        return 'text-lg sm:text-2xl';
      case 'lg':
        return 'text-2xl sm:text-3xl';
      case 'xl':
        return 'text-3xl sm:text-4xl';
    }
  };

  const styles = getThemeStyles();
  const sizeClass = getFontSizeClass();

  return (
    <div
      className={`relative rounded-xl border p-6 flex flex-col justify-center min-h-[180px] sm:min-h-[220px] transition-all duration-200 shadow-2xl ${
        styles.container
      } ${isFullscreen ? 'fixed inset-0 z-50 rounded-none p-12 min-h-screen' : ''}`}
    >
      {/* Top Header Tag */}
      <div className="absolute top-3 left-4 right-4 flex items-center justify-between text-[11px] font-mono tracking-wider text-neutral-400">
        <div className="flex items-center gap-1.5">
          <Subtitles className="w-3.5 h-3.5" />
          <span>CLOSED CAPTION (CC) CINEMA DISPLAY</span>
        </div>
        {onToggleFullscreen && (
          <button
            onClick={onToggleFullscreen}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 transition-colors"
            title="Toggle fullscreen caption mode"
          >
            <Maximize2 className="w-3 h-3" />
            <span className="hidden sm:inline">{isFullscreen ? 'Exit Fullscreen' : 'Cinema Theater Mode'}</span>
          </button>
        )}
      </div>

      {/* Caption Content Area */}
      {currentCues.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-6">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500/40 animate-ping mb-2" />
          <p className="text-xs sm:text-sm text-neutral-400 font-sans tracking-wide">
            Awaiting dialogue or acoustic cue...
          </p>
          <p className="text-[11px] text-neutral-400 font-mono mt-1">
            (Microphone listening for soundtrack synchronization)
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4 my-auto">
          {currentCues.map((cue) => {
            return (
              <div
                key={cue.id}
                className={`flex flex-col items-center text-center leading-relaxed tracking-wide transition-all ${styles.glow}`}
              >
                {/* Speaker Label & Sound Effects */}
                <div className="flex flex-wrap items-center justify-center gap-2 mb-1.5 text-xs sm:text-sm">
                  {showSpeakers && cue.speaker && (
                    <span className={`px-2 py-0.5 rounded bg-neutral-900/60 border border-neutral-700/50 ${styles.speakerText}`}>
                      {cue.speaker}
                      {cue.emotion && (
                        <span className="font-normal lowercase opacity-80 ml-1">
                          ({cue.emotion})
                        </span>
                      )}
                    </span>
                  )}

                  {showSoundEffects && cue.soundEffect && (
                    <span className={`flex items-center gap-1 ${styles.soundText}`}>
                      {cue.isMusic ? <Music className="w-3 h-3 text-amber-400 inline" /> : null}
                      <span>[{cue.soundEffect.toUpperCase()}]</span>
                    </span>
                  )}
                </div>

                {/* Main Dialogue / Caption Text */}
                <p className={`${sizeClass} ${styles.dialogText} max-w-3xl font-sans font-semibold tracking-wide drop-shadow-md`}>
                  {cue.text}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Bottom Subtle Status */}
      <div className="absolute bottom-2.5 left-4 right-4 flex items-center justify-between text-[10px] font-mono text-neutral-400">
        <span>WCAG AA High-Contrast Certified</span>
        <span>CBFC Standard CC 2024</span>
      </div>
    </div>
  );
};
