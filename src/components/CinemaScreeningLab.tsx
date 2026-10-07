import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Radio, Sparkles, Film, Mic, Headphones, ArrowRight, ShieldCheck } from 'lucide-react';
import { MoviePackage } from '../types/accessibility';

interface CinemaScreeningLabProps {
  movie: MoviePackage;
  currentTime: number;
  onSyncWithLabVideo: (timestamp: number) => void;
  isMicActive: boolean;
  onToggleMic: () => void;
  onJumpToPlayer: () => void;
}

export const CinemaScreeningLab: React.FC<CinemaScreeningLabProps> = ({
  movie,
  currentTime,
  onSyncWithLabVideo,
  isMicActive,
  onToggleMic,
  onJumpToPlayer,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [labVideoTime, setLabVideoTime] = useState<number>(currentTime);
  const [simulatedAudienceNoise, setSimulatedAudienceNoise] = useState<boolean>(false);

  // Sync internal video state
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const cur = videoRef.current.currentTime;
      setLabVideoTime(cur);
      onSyncWithLabVideo(cur);
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const handleSeek = (secs: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = secs;
      setLabVideoTime(secs);
      onSyncWithLabVideo(secs);
    }
  };

  const formatTime = (secs: number) => {
    const total = Math.floor(Math.max(0, secs));
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Explaining Cinema Architecture */}
      <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs sm:text-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 shrink-0">
            <Film className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-amber-300">Auditorium Screener Simulation Lab</h4>
            <p className="text-amber-200/80 text-xs mt-0.5 leading-relaxed">
              Pixapix does not stream original full movies to phones; it syncs via acoustic watermark in authorized cinema halls.
              Use this screener simulator to test how Pixapix captures ambient cinema audio and triggers AD/CC cues!
            </p>
          </div>
        </div>

        <button
          onClick={onJumpToPlayer}
          className="px-3.5 py-2 rounded-lg bg-amber-500 text-neutral-950 font-black text-xs hover:bg-amber-400 whitespace-nowrap flex items-center gap-1.5 self-end sm:self-auto shadow-md"
        >
          <span>Open Accessibility Player HUD</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Virtual Cinema Screen (Video Exhibition) */}
      <div className="relative rounded-2xl overflow-hidden bg-black border-2 border-neutral-800 shadow-[0_10px_40px_rgba(0,0,0,0.8)]">
        {/* Cinema Hall Ambient Glow Effect */}
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black via-transparent to-black/60 z-10" />

        {/* Video Element */}
        <video
          ref={videoRef}
          src={movie.demoVideoUrl || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4'}
          onTimeUpdate={handleTimeUpdate}
          onEnded={() => setIsPlaying(false)}
          muted={isMuted}
          playsInline
          className="w-full aspect-video object-contain max-h-[480px] mx-auto bg-black"
        />

        {/* Floating Screening Badge */}
        <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
          <span className="px-3 py-1 rounded-md text-xs font-mono font-bold bg-neutral-950/80 text-amber-400 border border-neutral-700 backdrop-blur-md">
            AUDITORIUM 4 • DOLBY ATMOS
          </span>
          <span className="px-2.5 py-1 rounded-md text-[11px] font-mono bg-emerald-950/80 text-emerald-300 border border-emerald-600/50 backdrop-blur-md flex items-center gap-1">
            <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
            ACOUSTIC BROADCAST ACTIVE
          </span>
        </div>

        {/* Overlay Controls */}
        <div className="absolute bottom-0 inset-x-0 z-20 p-4 bg-gradient-to-t from-neutral-950/95 via-neutral-950/70 to-transparent backdrop-blur-xs">
          <div className="flex flex-col gap-2">
            {/* Scrubber */}
            <input
              type="range"
              min={0}
              max={60}
              step={0.1}
              value={labVideoTime}
              onChange={(e) => handleSeek(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-neutral-700/60 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />

            {/* Bottom Row Buttons */}
            <div className="flex items-center justify-between text-neutral-200">
              <div className="flex items-center gap-3">
                <button
                  onClick={togglePlay}
                  className="w-10 h-10 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold flex items-center justify-center transition-all shadow-md"
                  title={isPlaying ? 'Pause Screen' : 'Play Screen'}
                >
                  {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                </button>

                <button
                  onClick={() => handleSeek(0)}
                  className="p-2 rounded-lg bg-neutral-900/80 hover:bg-neutral-800 text-neutral-300 transition-colors"
                  title="Restart Clip"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="p-2 rounded-lg bg-neutral-900/80 hover:bg-neutral-800 text-neutral-300 transition-colors"
                  title={isMuted ? 'Unmute Auditorium Sound' : 'Mute Auditorium Sound'}
                >
                  {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
                </button>

                <span className="font-mono text-xs text-neutral-300">
                  {formatTime(labVideoTime)} / 01:00
                </span>
              </div>

              {/* Acoustic Capture Mode Selector */}
              <div className="flex items-center gap-2">
                <button
                  onClick={onToggleMic}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    isMicActive
                      ? 'bg-rose-950/70 border-rose-500 text-rose-300 animate-pulse'
                      : 'bg-neutral-900/90 border-neutral-700 text-neutral-300 hover:bg-neutral-800'
                  }`}
                >
                  <Mic className="w-3.5 h-3.5" />
                  <span>{isMicActive ? 'Mic Listening Active' : 'Enable Mic Capture'}</span>
                </button>

                <button
                  onClick={() => setSimulatedAudienceNoise(!simulatedAudienceNoise)}
                  className={`hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-mono border transition-all ${
                    simulatedAudienceNoise
                      ? 'bg-amber-950/60 border-amber-500 text-amber-300'
                      : 'bg-neutral-900/80 border-neutral-700 text-neutral-400'
                  }`}
                  title="Simulate background audience murmurs to test noise filtering"
                >
                  <span>Audience Noise: {simulatedAudienceNoise ? 'ON (62dB)' : 'Quiet'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Test Scene Shortcuts */}
      <div className="p-4 rounded-xl bg-neutral-900/90 border border-neutral-800">
        <h4 className="text-xs font-mono text-neutral-400 mb-3 uppercase tracking-wider">
          Jump to Specific Accessibility Cues:
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <button
            onClick={() => handleSeek(0)}
            className="p-3 rounded-xl bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-left transition-colors"
          >
            <div className="text-xs font-bold text-amber-400">00:00 - Scene Intro</div>
            <div className="text-[11px] text-neutral-400 mt-1 truncate">
              Scene setting AD cue + deep bass sound cue
            </div>
          </button>
          <button
            onClick={() => handleSeek(6)}
            className="p-3 rounded-xl bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-left transition-colors"
          >
            <div className="text-xs font-bold text-amber-400">00:06 - Action &amp; Dialogue</div>
            <div className="text-[11px] text-neutral-400 mt-1 truncate">
              Bujji &amp; Bhairava dialogue + turbine effects
            </div>
          </button>
          <button
            onClick={() => handleSeek(20)}
            className="p-3 rounded-xl bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-left transition-colors"
          >
            <div className="text-xs font-bold text-amber-400">00:20 - Dramatic Climax</div>
            <div className="text-[11px] text-neutral-400 mt-1 truncate">
              Ashwatthama divine prophecy + clash sound effects
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
