import React from 'react';
import { Mic, MicOff, Radio, RefreshCw, Sliders, CheckCircle2, AlertTriangle } from 'lucide-react';
import { SyncState, SyncStatus } from '../types/accessibility';

interface AcousticSyncBarProps {
  syncState: SyncState;
  spectrum: number[];
  isMicActive: boolean;
  onToggleMic: () => void;
  onAdjustOffset: (deltaMs: number) => void;
  onResetOffset: () => void;
  onManualSeek: (seconds: number) => void;
  maxDuration: number;
}

export const AcousticSyncBar: React.FC<AcousticSyncBarProps> = ({
  syncState,
  spectrum,
  isMicActive,
  onToggleMic,
  onAdjustOffset,
  onResetOffset,
  onManualSeek,
  maxDuration,
}) => {
  const formatTime = (secs: number) => {
    const total = Math.floor(Math.max(0, secs));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getStatusBadge = (status: SyncStatus) => {
    switch (status) {
      case 'synced':
        return (
          <div className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md bg-emerald-950/60 text-emerald-300 border border-emerald-500/40">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>ACOUSTIC LOCK ACQUIRED</span>
          </div>
        );
      case 'locking':
        return (
          <div className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md bg-amber-950/60 text-amber-300 border border-amber-500/40">
            <Radio className="w-3.5 h-3.5 text-amber-400 animate-spin" />
            <span>MATCHING WATERMARK...</span>
          </div>
        );
      case 'listening':
        return (
          <div className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md bg-sky-950/60 text-sky-300 border border-sky-500/40">
            <Radio className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
            <span>LISTENING TO AUDITORIUM</span>
          </div>
        );
      case 'drift_detected':
        return (
          <div className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md bg-rose-950/60 text-rose-300 border border-rose-500/40">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            <span>DRIFT DETECTED - RE-SYNCING</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md bg-neutral-900 text-neutral-400 border border-neutral-700">
            <Radio className="w-3.5 h-3.5 text-neutral-500" />
            <span>STANDBY</span>
          </div>
        );
    }
  };

  return (
    <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-4 text-neutral-200 shadow-xl backdrop-blur-md">
      {/* Top Status & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-neutral-800">
        <div className="flex items-center gap-3">
          {/* Mic Toggle Button */}
          <button
            onClick={onToggleMic}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all ${
              isMicActive
                ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/25 animate-pulse'
                : 'bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold shadow-lg shadow-amber-500/20'
            }`}
          >
            {isMicActive ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            <span>{isMicActive ? 'Stop Mic Sync' : 'Listen with Microphone'}</span>
          </button>

          {/* Sync Status Badge */}
          {getStatusBadge(syncState.status)}
        </div>

        {/* Telemetry Numbers */}
        <div className="flex items-center gap-4 text-xs font-mono text-neutral-400">
          <div>
            <span className="text-neutral-400">Match Confidence: </span>
            <span
              className={`font-bold ${
                syncState.confidence >= 80
                  ? 'text-emerald-400'
                  : syncState.confidence >= 50
                  ? 'text-amber-400'
                  : 'text-neutral-400'
              }`}
            >
              {syncState.confidence}%
            </span>
          </div>
          <div className="hidden sm:block">
            <span className="text-neutral-400">Ambient: </span>
            <span className="text-neutral-200 font-bold">{syncState.ambientNoiseDb} dB</span>
          </div>
          <div>
            <span className="text-neutral-400">Timecode: </span>
            <span className="text-amber-400 font-bold text-sm">{formatTime(syncState.currentTime)}</span>
          </div>
        </div>
      </div>

      {/* Visual Frequency Spectrum Bar */}
      <div className="py-3">
        <div className="flex items-center justify-between text-[11px] text-neutral-400 font-mono mb-1.5">
          <span>CINEMA ACOUSTIC SPECTRUM (30Hz - 16kHz)</span>
          <span className="text-neutral-300">
            Offset: {syncState.offsetMs >= 0 ? `+${syncState.offsetMs}` : syncState.offsetMs} ms
          </span>
        </div>
        <div className="h-10 bg-neutral-950 rounded-lg p-1.5 flex items-end gap-1 border border-neutral-800 overflow-hidden">
          {spectrum.map((val, idx) => {
            const heightPct = Math.max(8, Math.min(100, val * 100));
            const isHigh = val > 0.6;
            return (
              <div
                key={idx}
                className="flex-1 rounded-t-sm transition-all duration-75"
                style={{
                  height: `${heightPct}%`,
                  backgroundColor: isHigh ? '#f59e0b' : '#38bdf8',
                  opacity: Math.max(0.3, val),
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Scrubber & Fine Adjustment Controls */}
      <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-neutral-800/80">
        {/* Timeline Range Slider */}
        <div className="w-full sm:flex-1 flex items-center gap-2">
          <input
            type="range"
            min={0}
            max={maxDuration}
            step={0.5}
            value={syncState.currentTime}
            onChange={(e) => onManualSeek(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />
        </div>

        {/* Offset Micro-Adjust Buttons */}
        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          <span className="text-[11px] text-neutral-400 mr-1 flex items-center gap-1">
            <Sliders className="w-3 h-3" /> Nudge:
          </span>
          <button
            onClick={() => onAdjustOffset(-500)}
            className="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-xs font-mono text-neutral-300"
            title="Nudge backward 500ms"
          >
            -500ms
          </button>
          <button
            onClick={() => onAdjustOffset(-100)}
            className="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-xs font-mono text-neutral-300"
            title="Nudge backward 100ms"
          >
            -100ms
          </button>
          <button
            onClick={() => onAdjustOffset(100)}
            className="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-xs font-mono text-neutral-300"
            title="Nudge forward 100ms"
          >
            +100ms
          </button>
          <button
            onClick={() => onAdjustOffset(500)}
            className="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-xs font-mono text-neutral-300"
            title="Nudge forward 500ms"
          >
            +500ms
          </button>
          {syncState.offsetMs !== 0 && (
            <button
              onClick={onResetOffset}
              className="px-2 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-mono ml-1"
              title="Reset offset to 0"
            >
              Reset
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
