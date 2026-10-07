import React from 'react';
import { EyeOff, Eye, Moon, Sparkles, Volume2 } from 'lucide-react';

interface CinemaBlackoutOverlayProps {
  isBlackoutActive: boolean;
  onDismiss: () => void;
  cinemaDimmerLevel: number;
  timecode: string;
}

export const CinemaBlackoutOverlay: React.FC<CinemaBlackoutOverlayProps> = ({
  isBlackoutActive,
  onDismiss,
  cinemaDimmerLevel,
  timecode,
}) => {
  if (!isBlackoutActive && cinemaDimmerLevel <= 0) return null;

  if (isBlackoutActive) {
    return (
      <div
        onClick={onDismiss}
        className="fixed inset-0 z-50 bg-black cursor-pointer select-none flex flex-col justify-between p-6 animate-fadeIn"
      >
        <div className="flex justify-between items-center text-[10px] font-mono text-neutral-800">
          <span>PIXAPIX BLACKOUT MODE ACTIVE</span>
          <span>{timecode}</span>
        </div>

        <div className="text-center">
          <p className="text-neutral-800 text-xs font-mono">
            Screen blackout enabled to protect auditorium dark atmosphere.
          </p>
          <p className="text-neutral-700 text-xs mt-2 font-mono flex items-center justify-center gap-1">
            <Eye className="w-3.5 h-3.5" />
            Double tap anywhere to restore display
          </p>
        </div>

        <div className="text-center text-[10px] font-mono text-neutral-900">
          Audio Description narration remains uninterrupted in headphones
        </div>
      </div>
    );
  }

  // Soft Dimmer Overlay
  return (
    <div
      className="fixed inset-0 pointer-events-none z-40 bg-black transition-opacity duration-300"
      style={{ opacity: cinemaDimmerLevel }}
    />
  );
};
