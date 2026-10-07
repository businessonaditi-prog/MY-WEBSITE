import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Settings,
  Subtitles,
  Headphones,
  Mic,
  MicOff,
  Radio,
  X,
  RotateCcw,
  AlertCircle,
  ShieldCheck,
  Moon,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Sliders,
  Sparkles,
  RotateCw,
  HardDrive,
  CheckCircle2,
  Volume1,
  FastForward,
} from 'lucide-react';
import { Film, AccessibilityTrack } from '../types/cinemaPlatform';
import { CCTheme, CCFontSize, CCPosition, SyncStatus } from '../types/accessibility';
import { speechNarrator } from '../services/speechSynthesisService';
import { acousticSync, AcousticAnalysisData } from '../services/acousticSyncService';
import { offlineStorage } from '../services/offlineStorageService';

interface SecurePlayerProps {
  film: Film;
  sessionToken: string;
  watermark: string;
  onClose: () => void;
  isOfflineMode?: boolean;
}

export const SecurePlayer: React.FC<SecurePlayerProps> = ({
  film,
  sessionToken,
  watermark,
  onClose,
  isOfflineMode = false,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Microphone Permission Gate (Section #30)
  const [micPermissionGranted, setMicPermissionGranted] = useState<boolean>(false);
  const [micPermissionDenied, setMicPermissionDenied] = useState<boolean>(false);

  // 2. Playback State
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [filmVolume, setFilmVolume] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showControls, setShowControls] = useState<boolean>(true);
  const [isTouchLocked, setIsTouchLocked] = useState<boolean>(false);

  // 3. Auditorium Acoustic Sync State
  const [isMicSyncActive, setIsMicSyncActive] = useState<boolean>(true);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('synced');
  const [syncConfidence, setSyncConfidence] = useState<number>(96);
  const [spectrum, setSpectrum] = useState<number[]>([0.4, 0.7, 0.9, 0.5, 0.8, 0.3, 0.6, 0.85, 0.5, 0.7, 0.4, 0.9, 0.6, 0.3, 0.5, 0.7]);
  const [ambientDb, setAmbientDb] = useState<number>(62);
  const [syncOffsetMs, setSyncOffsetMs] = useState<number>(0); // -2000 to +2000 ms
  const [showSyncBar, setShowSyncBar] = useState<boolean>(true);

  // 4. Closed Caption (CC) Configuration
  const [selectedCcLang, setSelectedCcLang] = useState<string>('Off');
  const [ccTheme, setCcTheme] = useState<CCTheme>('yellow-black');
  const [ccFontSize, setCcFontSize] = useState<CCFontSize>('md');
  const [ccPosition, setCcPosition] = useState<CCPosition>('bottom');
  const [ccShowSpeakers, setCcShowSpeakers] = useState<boolean>(true);
  const [ccShowSoundEffects, setCcShowSoundEffects] = useState<boolean>(true);

  // 5. Audio Description (AD) Configuration
  const [selectedAdLang, setSelectedAdLang] = useState<string>('Off');
  const [adVolume, setAdVolume] = useState<number>(1.0);
  const [adSpeechRate, setAdSpeechRate] = useState<number>(1.0);
  const [adDuckingEnabled, setAdDuckingEnabled] = useState<boolean>(true);
  const [headphoneConnected, setHeadphoneConnected] = useState<boolean>(false);
  const [isDuckingActive, setIsDuckingActive] = useState<boolean>(false);

  // 6. Dark Auditorium & Blackout Mode
  const [cinemaDimmer, setCinemaDimmer] = useState<number>(0); // 0 to 0.8
  const [isBlackoutActive, setIsBlackoutActive] = useState<boolean>(false);

  // 7. Options Drawer / Settings Modal
  const [activeSettingsTab, setActiveSettingsTab] = useState<'cc' | 'ad' | 'sync' | 'dark' | null>(null);

  // Available tracks for this film
  const availableCcTracks = useMemo(() => film.uploadedCcTracks || [], [film.uploadedCcTracks]);
  const availableAdTracks = useMemo(() => film.uploadedAdTracks || [], [film.uploadedAdTracks]);

  // Determine if film is stored offline
  const isDownloadedInApp = useMemo(() => offlineStorage.isFilmDownloaded(film.id), [film.id]);

  // Initialize language defaults
  useEffect(() => {
    if (availableCcTracks.length > 0 && selectedCcLang === 'Off') {
      setSelectedCcLang(availableCcTracks[0].languageCode);
    }
    if (availableAdTracks.length > 0 && selectedAdLang === 'Off') {
      setSelectedAdLang(availableAdTracks[0].languageCode);
    }
  }, [availableCcTracks, availableAdTracks]);

  // Start Acoustic Sync on mount / permission granted
  useEffect(() => {
    if (micPermissionGranted && isMicSyncActive) {
      acousticSync.startMicrophoneListening((data: AcousticAnalysisData) => {
        setSpectrum(data.spectrum);
        setAmbientDb(data.dbLevel);
        setSyncConfidence(data.confidenceScore);
        if (data.confidenceScore > 75) {
          setSyncStatus('synced');
        } else if (data.confidenceScore > 40) {
          setSyncStatus('locking');
        } else {
          setSyncStatus('listening');
        }
      });
    }

    return () => {
      acousticSync.stopListening();
    };
  }, [micPermissionGranted, isMicSyncActive]);

  // Auto-hide controls when playing and not hovered
  const resetControlsTimeout = () => {
    if (isTouchLocked) return;
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3500);
    }
  };

  useEffect(() => {
    resetControlsTimeout();
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [isPlaying, isTouchLocked]);

  // Request Microphone Gate
  const handleRequestMicrophone = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((t) => t.stop());
        setMicPermissionGranted(true);
        setMicPermissionDenied(false);
      } else {
        setMicPermissionGranted(true);
      }
    } catch (err) {
      console.warn('Microphone permission rejected:', err);
      setMicPermissionDenied(true);
    }
  };

  // Play / Pause
  const togglePlay = () => {
    if (isTouchLocked) return;
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
        speechNarrator.stop();
        setIsDuckingActive(false);
      } else {
        videoRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      setDuration(videoRef.current.duration || 60);
    }
  };

  const handleSeek = (time: number) => {
    if (videoRef.current) {
      const clamped = Math.max(0, Math.min(duration || 60, time));
      videoRef.current.currentTime = clamped;
      setCurrentTime(clamped);
      speechNarrator.resetLastCue();
    }
  };

  const handleSkip = (deltaSeconds: number) => {
    handleSeek(currentTime + deltaSeconds);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Calculate effective time adjusted by acoustic sync fine offset (in ms)
  const effectivePlaybackTime = useMemo(() => {
    return Math.max(0, currentTime + syncOffsetMs / 1000);
  }, [currentTime, syncOffsetMs]);

  // Active Closed Caption Cue
  const currentCcTrack = availableCcTracks.find((t) => t.languageCode === selectedCcLang);
  const activeCcCue = currentCcTrack?.cues?.find(
    (c) => effectivePlaybackTime >= c.startTime && effectivePlaybackTime <= c.endTime
  );

  // Active Audio Description Cue
  const currentAdTrack = availableAdTracks.find((t) => t.languageCode === selectedAdLang);
  const activeAdCue = currentAdTrack?.cues?.find(
    (c) => effectivePlaybackTime >= c.startTime && effectivePlaybackTime <= c.endTime
  );

  // Speech Narration with Audio Ducking
  useEffect(() => {
    if (activeAdCue && selectedAdLang !== 'Off' && isPlaying) {
      // Audio Ducking: lower movie volume during narration
      if (adDuckingEnabled && videoRef.current) {
        videoRef.current.volume = Math.max(0.15, filmVolume * 0.25);
        setIsDuckingActive(true);
      }

      speechNarrator.speak(
        activeAdCue.id,
        activeAdCue.text,
        currentAdTrack?.languageName || 'English',
        adSpeechRate,
        adVolume
      );

      // Restore volume after cue estimated duration
      const cueDurationMs = Math.max(2000, (activeAdCue.endTime - activeAdCue.startTime) * 1000);
      const timer = setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.volume = filmVolume;
          setIsDuckingActive(false);
        }
      }, cueDurationMs);

      return () => clearTimeout(timer);
    } else if (!activeAdCue && isDuckingActive && videoRef.current) {
      videoRef.current.volume = filmVolume;
      setIsDuckingActive(false);
    }
  }, [activeAdCue, selectedAdLang, isPlaying, adSpeechRate, adVolume, adDuckingEnabled, filmVolume, currentAdTrack]);

  // Formatting helper
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

  // CC Theme styles
  const getCcThemeClass = () => {
    switch (ccTheme) {
      case 'yellow-black':
        return 'bg-black/95 text-amber-300 border border-amber-600/40 shadow-2xl drop-shadow-[0_2px_12px_rgba(245,158,11,0.3)]';
      case 'white-black':
        return 'bg-black/95 text-white border border-neutral-700 shadow-2xl drop-shadow-[0_2px_10px_rgba(255,255,255,0.2)]';
      case 'cyan-dark':
        return 'bg-neutral-950/95 text-cyan-300 border border-cyan-500/40 shadow-2xl drop-shadow-[0_2px_12px_rgba(6,182,212,0.3)]';
      case 'black-white':
        return 'bg-neutral-100 text-neutral-950 border border-neutral-300 shadow-2xl font-bold';
    }
  };

  const getCcFontSizeClass = () => {
    switch (ccFontSize) {
      case 'sm':
        return 'text-sm sm:text-base';
      case 'md':
        return 'text-base sm:text-xl';
      case 'lg':
        return 'text-xl sm:text-2xl font-bold';
      case 'xl':
        return 'text-2xl sm:text-3xl font-black';
    }
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={resetControlsTimeout}
      onClick={resetControlsTimeout}
      className="fixed inset-0 z-50 bg-black text-white flex flex-col justify-between select-none overflow-hidden"
    >
      {/* 1. MICROPHONE PERMISSION GATE DIALOG */}
      {!micPermissionGranted ? (
        <div className="m-auto max-w-md w-full p-6 sm:p-8 rounded-2xl bg-neutral-900 border border-neutral-800 text-center space-y-4 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto shadow-lg animate-pulse">
            <Mic className="w-8 h-8" />
          </div>

          <h2 className="text-xl font-black tracking-wide uppercase text-white">
            THEATRICAL ACOUSTIC SYNC REQUIRED
          </h2>

          <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed">
            Pixapix AD &amp; CC Player listens to ambient theatre sound to lock on and synchronize Audio Description and Closed Captions without internet drift.
          </p>

          {micPermissionDenied && (
            <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-600/50 text-rose-200 text-xs flex items-start gap-2.5 text-left">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>Microphone access was denied. Please allow microphone permissions in your browser URL bar for acoustic synchronization.</span>
            </div>
          )}

          <div className="pt-2 flex flex-col gap-2.5">
            <button
              onClick={handleRequestMicrophone}
              className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-xs sm:text-sm uppercase tracking-wider shadow-lg shadow-amber-500/20 transition-transform active:scale-98"
            >
              ALLOW MICROPHONE &amp; START PLAYBACK
            </button>
            <button
              onClick={onClose}
              className="py-2 text-xs text-neutral-500 hover:text-neutral-300"
            >
              Cancel Cinema Session
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* OLED INSTANT BLACKOUT OVERLAY */}
          {isBlackoutActive && (
            <div
              onDoubleClick={() => setIsBlackoutActive(false)}
              onClick={() => setIsBlackoutActive(false)}
              className="fixed inset-0 z-50 bg-black cursor-pointer flex flex-col justify-between p-6 animate-fadeIn"
            >
              <div className="flex justify-between items-center text-[10px] font-mono text-neutral-800">
                <span className="flex items-center gap-1.5">
                  <Moon className="w-3.5 h-3.5 text-neutral-700" />
                  <span>PIXAPIX DARK AUDITORIUM BLACKOUT ACTIVE</span>
                </span>
                <span>{formatTime(currentTime)}</span>
              </div>

              <div className="text-center space-y-2">
                <p className="text-neutral-700 text-xs font-mono">
                  Display fully blacked out to protect theatre atmosphere.
                </p>
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral-950 border border-neutral-900 text-neutral-600 text-xs font-mono">
                  <Eye className="w-3.5 h-3.5" />
                  <span>Double-tap or tap anywhere to wake display</span>
                </div>
              </div>

              <div className="text-center text-[11px] font-mono text-neutral-800">
                Headphone Audio Description continues running uninterrupted • {selectedAdLang.toUpperCase()}
              </div>
            </div>
          )}

          {/* SOFT CINEMA DIMMER VEIL OVERLAY */}
          {cinemaDimmer > 0 && !isBlackoutActive && (
            <div
              className="fixed inset-0 pointer-events-none z-30 bg-black transition-opacity duration-300"
              style={{ opacity: cinemaDimmer }}
            />
          )}

          {/* TOP CINEMA NAVIGATION & ACOUSTIC BAR */}
          <div
            className={`p-3 sm:p-4 flex flex-col gap-2 bg-gradient-to-b from-black/95 via-black/80 to-transparent z-30 transition-opacity duration-300 ${
              showControls && !isTouchLocked ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            <div className="flex items-center justify-between">
              {/* Left Film Meta */}
              <div className="flex items-center gap-3">
                <div className="px-2.5 py-1 rounded bg-amber-500 text-neutral-950 text-xs font-mono font-black">
                  CINEAD.CC
                </div>
                <div>
                  <h3 className="font-bold text-xs sm:text-sm text-white line-clamp-1">{film.title}</h3>
                  <div className="flex items-center gap-2 text-[10px] sm:text-[11px] font-mono text-neutral-400">
                    <span>{film.productionHouseName}</span>
                    <span>•</span>
                    <span className="text-amber-400">{film.languageName}</span>
                    {(isOfflineMode || isDownloadedInApp) && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-emerald-400 bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-800/40">
                          <HardDrive className="w-2.5 h-2.5" />
                          <span>In-App Sandbox</span>
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Acoustic & Close Header */}
              <div className="flex items-center gap-2 sm:gap-3">
                {/* Acoustic Sync Lock Indicator */}
                <button
                  onClick={() => setShowSyncBar(!showSyncBar)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-mono transition-colors ${
                    syncStatus === 'synced'
                      ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-300'
                      : 'bg-amber-950/70 border-amber-500/50 text-amber-300'
                  }`}
                  title="Toggle Acoustic Sync Bar"
                >
                  <Radio className={`w-3.5 h-3.5 ${syncStatus === 'synced' ? 'animate-pulse text-emerald-400' : 'animate-spin text-amber-400'}`} />
                  <span className="hidden md:inline font-bold">
                    {syncStatus === 'synced' ? `MIC LOCKED (${syncConfidence}%)` : 'SYNCING...'}
                  </span>
                  {syncOffsetMs !== 0 && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-neutral-900 border border-neutral-700 text-amber-400">
                      {syncOffsetMs > 0 ? `+${syncOffsetMs}` : syncOffsetMs}ms
                    </span>
                  )}
                </button>

                {/* Instant Blackout Toggle */}
                <button
                  onClick={() => setIsBlackoutActive(true)}
                  className="p-2 rounded-xl bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-purple-400 transition-colors"
                  title="Instant Cinema Blackout Mode"
                >
                  <Moon className="w-4 h-4" />
                </button>

                {/* Close Player */}
                <button
                  onClick={onClose}
                  className="p-2 rounded-xl bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-white"
                  title="Exit Cinema Player"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* EXPANDABLE ACOUSTIC SPECTRUM & OFFSET BAR */}
            {showSyncBar && (
              <div className="p-2.5 rounded-xl bg-neutral-950/90 border border-neutral-800/80 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
                {/* 16-Band Live Equalizer */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-neutral-400">THEATRE MIC:</span>
                  <div className="flex items-end gap-1 h-5 w-32 sm:w-44 bg-neutral-900/80 px-1 py-0.5 rounded border border-neutral-800">
                    {spectrum.slice(0, 16).map((val, idx) => (
                      <div
                        key={idx}
                        className={`flex-1 rounded-xs transition-all duration-75 ${
                          val > 0.75 ? 'bg-amber-400' : 'bg-emerald-400'
                        }`}
                        style={{ height: `${Math.max(10, Math.round(val * 100))}%` }}
                      />
                    ))}
                  </div>
                  <span className="text-[10px] text-neutral-400">{ambientDb} dB</span>
                </div>

                {/* Fine Manual Offset Controls */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-neutral-400">FINE OFFSET:</span>
                  <button
                    onClick={() => setSyncOffsetMs((prev) => Math.max(-2000, prev - 100))}
                    className="px-2 py-0.5 rounded bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-[11px] text-neutral-300 active:scale-95"
                    title="-100ms offset"
                  >
                    -100ms
                  </button>
                  <span className="font-bold text-amber-400 min-w-14 text-center">
                    {syncOffsetMs > 0 ? `+${syncOffsetMs}` : syncOffsetMs} ms
                  </span>
                  <button
                    onClick={() => setSyncOffsetMs((prev) => Math.min(2000, prev + 100))}
                    className="px-2 py-0.5 rounded bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-[11px] text-neutral-300 active:scale-95"
                    title="+100ms offset"
                  >
                    +100ms
                  </button>
                  {syncOffsetMs !== 0 && (
                    <button
                      onClick={() => setSyncOffsetMs(0)}
                      className="text-[10px] text-neutral-400 hover:text-white underline ml-1"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* MAIN CINEMA VIDEO STAGE */}
          <div className="relative flex-1 flex items-center justify-center bg-black overflow-hidden">
            {/* Watermark Overlay (Section #24) */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10 opacity-12 select-none font-mono text-xs sm:text-sm tracking-widest text-amber-300 transform -rotate-12">
              {watermark} • {sessionToken.slice(0, 16)}
            </div>

            {/* Video Element */}
            <video
              ref={videoRef}
              src={film.videoFileUrl}
              onTimeUpdate={handleTimeUpdate}
              onEnded={() => setIsPlaying(false)}
              playsInline
              onClick={togglePlay}
              className="max-h-full max-w-full w-auto h-auto object-contain cursor-pointer"
            />

            {/* Play/Pause Central Pulse Overlay */}
            {!isPlaying && !isTouchLocked && (
              <div
                onClick={togglePlay}
                className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer z-20"
              >
                <div className="w-20 h-20 rounded-full bg-amber-500/90 text-neutral-950 flex items-center justify-center shadow-2xl transition-transform hover:scale-105 active:scale-95">
                  <Play className="w-10 h-10 fill-current ml-1" />
                </div>
              </div>
            )}

            {/* LIVE CLOSED CAPTION CINEMA OVERLAY (Section #27) */}
            {selectedCcLang !== 'Off' && activeCcCue && (
              <div
                className={`absolute inset-x-4 pointer-events-none z-20 flex justify-center transition-all ${
                  ccPosition === 'center'
                    ? 'top-1/2 -translate-y-1/2'
                    : ccPosition === 'hud'
                    ? 'top-20'
                    : 'bottom-24 sm:bottom-28'
                }`}
              >
                <div className={`px-5 py-3 rounded-2xl max-w-3xl text-center animate-fadeIn ${getCcThemeClass()}`}>
                  {/* Speaker Label */}
                  {ccShowSpeakers && activeCcCue.speaker && (
                    <span className="text-xs sm:text-sm font-mono font-bold mr-2 uppercase tracking-wide opacity-90">
                      [{activeCcCue.speaker}]
                    </span>
                  )}

                  {/* Sound Effect Label */}
                  {ccShowSoundEffects && activeCcCue.soundEffect && (
                    <span className="text-xs sm:text-sm font-mono italic mr-2 opacity-80">
                      [{activeCcCue.soundEffect.toUpperCase()}]
                    </span>
                  )}

                  {/* Subtitle Dialogue Text */}
                  <p className={`font-sans tracking-wide leading-relaxed inline ${getCcFontSizeClass()}`}>
                    {activeCcCue.text}
                  </p>
                </div>
              </div>
            )}

            {/* LIVE AUDIO DESCRIPTION HUD (Section #28) */}
            {selectedAdLang !== 'Off' && activeAdCue && (
              <div className="absolute top-20 right-4 z-20 max-w-xs sm:max-w-sm p-3 rounded-2xl bg-neutral-950/90 border border-amber-500/50 backdrop-blur-md text-xs font-mono text-amber-300 shadow-2xl animate-fadeIn">
                <div className="flex items-center justify-between gap-2 text-amber-400 font-bold mb-1 pb-1 border-b border-amber-900/40">
                  <div className="flex items-center gap-1.5">
                    <Headphones className="w-3.5 h-3.5" />
                    <span>AUDIO DESCRIPTION ({selectedAdLang.toUpperCase()})</span>
                  </div>
                  {isDuckingActive && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      DUCKING FILM AUDIO
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-neutral-200 italic leading-relaxed">
                  &ldquo;{activeAdCue.text}&rdquo;
                </p>
              </div>
            )}

            {/* Headphone Caution Alert Banner */}
            {!headphoneConnected && selectedAdLang !== 'Off' && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 max-w-md w-full px-4">
                <div className="p-2.5 rounded-xl bg-amber-950/90 border border-amber-500/60 backdrop-blur-md text-amber-200 text-xs flex items-center justify-between gap-2 shadow-2xl">
                  <div className="flex items-center gap-2">
                    <Headphones className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className="text-[11px]">Headphones required in cinema to protect auditorium silence.</span>
                  </div>
                  <button
                    onClick={() => setHeadphoneConnected(true)}
                    className="px-2 py-1 rounded bg-amber-500 text-neutral-950 font-bold text-[10px] hover:bg-amber-400 shrink-0"
                  >
                    Headphones On
                  </button>
                </div>
              </div>
            )}

            {/* Touch Lock Floating Unlock Button */}
            {isTouchLocked && (
              <div className="absolute top-5 right-5 z-40">
                <button
                  onClick={() => setIsTouchLocked(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-neutral-900/90 border border-amber-500/80 text-amber-400 text-xs font-mono font-bold shadow-2xl backdrop-blur-md"
                >
                  <Lock className="w-4 h-4" />
                  <span>SCREEN LOCKED • TAP TO UNLOCK</span>
                </button>
              </div>
            )}
          </div>

          {/* SETTINGS DRAWER OVERLAY (Section #25, #52) */}
          {activeSettingsTab && (
            <div className="absolute bottom-24 right-4 sm:right-8 z-40 w-80 sm:w-96 max-h-[75vh] overflow-y-auto rounded-2xl bg-neutral-900/95 border border-neutral-700 p-5 shadow-2xl backdrop-blur-md space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
                <div className="flex items-center gap-2 font-mono font-bold text-xs uppercase text-amber-400">
                  <Sliders className="w-4 h-4" />
                  <span>PLAYBACK &amp; ACCESSIBILITY CONTROLS</span>
                </div>
                <button
                  onClick={() => setActiveSettingsTab(null)}
                  className="text-neutral-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Sub-Tabs: CC, AD, SYNC, DARK */}
              <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-neutral-950 border border-neutral-800 text-[11px] font-mono font-bold">
                {(['cc', 'ad', 'sync', 'dark'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveSettingsTab(tab)}
                    className={`py-1.5 rounded-lg uppercase transition-colors ${
                      activeSettingsTab === tab
                        ? 'bg-amber-500 text-neutral-950'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* TAB 1: CLOSED CAPTIONS CONFIG */}
              {activeSettingsTab === 'cc' && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-neutral-300 block mb-1">
                      CC LANGUAGE TRACK
                    </label>
                    <select
                      value={selectedCcLang}
                      onChange={(e) => setSelectedCcLang(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    >
                      <option value="Off">Captions Off</option>
                      {availableCcTracks.map((t) => (
                        <option key={t.languageCode} value={t.languageCode}>
                          {t.languageName} ({t.languageCode.toUpperCase()})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Contrast Palette */}
                  <div>
                    <label className="text-xs font-semibold text-neutral-300 block mb-1.5">
                      CONTRAST PALETTE
                    </label>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {[
                        { id: 'yellow-black', label: 'Yellow / Black', bg: 'bg-black text-amber-300' },
                        { id: 'white-black', label: 'White / Black', bg: 'bg-black text-white' },
                        { id: 'cyan-dark', label: 'Cyan / Deep Navy', bg: 'bg-neutral-950 text-cyan-300' },
                        { id: 'black-white', label: 'Black / White', bg: 'bg-neutral-100 text-neutral-950' },
                      ].map((p) => (
                        <button
                          key={p.id}
                          onClick={() => setCcTheme(p.id as CCTheme)}
                          className={`p-2 rounded-xl border text-left transition-all ${
                            ccTheme === p.id
                              ? 'border-amber-500 ring-2 ring-amber-500/20'
                              : 'border-neutral-800 hover:border-neutral-700'
                          }`}
                        >
                          <div className={`p-1 text-center font-mono text-[10px] font-bold rounded mb-1 ${p.bg}`}>
                            Sample Subtitle
                          </div>
                          <span className="text-[10px] text-neutral-300">{p.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Font Scaling */}
                  <div>
                    <div className="flex items-center justify-between text-xs font-semibold text-neutral-300 mb-1.5">
                      <span>FONT SCALING</span>
                      <span className="font-mono text-amber-400 uppercase">{ccFontSize}</span>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5 font-mono text-xs">
                      {(['sm', 'md', 'lg', 'xl'] as CCFontSize[]).map((size) => (
                        <button
                          key={size}
                          onClick={() => setCcFontSize(size)}
                          className={`py-1.5 rounded-lg transition-colors ${
                            ccFontSize === size
                              ? 'bg-amber-500 text-neutral-950 font-bold'
                              : 'bg-neutral-950 text-neutral-400 border border-neutral-800'
                          }`}
                        >
                          {size.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Position Placement */}
                  <div>
                    <div className="flex items-center justify-between text-xs font-semibold text-neutral-300 mb-1.5">
                      <span>SUBTITLE PLACEMENT</span>
                      <span className="font-mono text-amber-400 uppercase">{ccPosition}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 font-mono text-xs">
                      {(['bottom', 'center', 'hud'] as CCPosition[]).map((pos) => (
                        <button
                          key={pos}
                          onClick={() => setCcPosition(pos)}
                          className={`py-1.5 rounded-lg transition-colors ${
                            ccPosition === pos
                              ? 'bg-amber-500 text-neutral-950 font-bold'
                              : 'bg-neutral-950 text-neutral-400 border border-neutral-800'
                          }`}
                        >
                          {pos.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Sound Effect & Speaker Toggles */}
                  <div className="space-y-1.5 pt-1 text-xs">
                    <label className="flex items-center justify-between p-2 rounded-xl bg-neutral-950 border border-neutral-800 cursor-pointer">
                      <span className="text-neutral-300">Show Speaker Tags</span>
                      <input
                        type="checkbox"
                        checked={ccShowSpeakers}
                        onChange={(e) => setCcShowSpeakers(e.target.checked)}
                        className="w-4 h-4 rounded accent-amber-500"
                      />
                    </label>
                    <label className="flex items-center justify-between p-2 rounded-xl bg-neutral-950 border border-neutral-800 cursor-pointer">
                      <span className="text-neutral-300">Show Sound Effect Descriptors</span>
                      <input
                        type="checkbox"
                        checked={ccShowSoundEffects}
                        onChange={(e) => setCcShowSoundEffects(e.target.checked)}
                        className="w-4 h-4 rounded accent-amber-500"
                      />
                    </label>
                  </div>
                </div>
              )}

              {/* TAB 2: AUDIO DESCRIPTION CONFIG */}
              {activeSettingsTab === 'ad' && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-neutral-300 block mb-1">
                      AD LANGUAGE TRACK
                    </label>
                    <select
                      value={selectedAdLang}
                      onChange={(e) => setSelectedAdLang(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    >
                      <option value="Off">Audio Description Off</option>
                      {availableAdTracks.map((t) => (
                        <option key={t.languageCode} value={t.languageCode}>
                          {t.languageName} ({t.languageCode.toUpperCase()})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Narration Volume */}
                  <div>
                    <div className="flex items-center justify-between text-xs font-semibold text-neutral-300 mb-1">
                      <span>NARRATION VOLUME</span>
                      <span className="font-mono text-amber-400">{Math.round(adVolume * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={adVolume}
                      onChange={(e) => setAdVolume(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                    />
                  </div>

                  {/* Narration Speed */}
                  <div>
                    <div className="flex items-center justify-between text-xs font-semibold text-neutral-300 mb-1.5">
                      <span>SPEECH SPEED</span>
                      <span className="font-mono text-amber-400">{adSpeechRate}x</span>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5 font-mono text-xs">
                      {[0.8, 1.0, 1.25, 1.5].map((rate) => (
                        <button
                          key={rate}
                          onClick={() => setAdSpeechRate(rate)}
                          className={`py-1.5 rounded-lg transition-colors ${
                            adSpeechRate === rate
                              ? 'bg-amber-500 text-neutral-950 font-bold'
                              : 'bg-neutral-950 text-neutral-400 border border-neutral-800'
                          }`}
                        >
                          {rate}x
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Audio Ducking Toggle */}
                  <label className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 cursor-pointer text-xs">
                    <div>
                      <span className="text-neutral-200 font-semibold block">Automatic Audio Ducking</span>
                      <span className="text-[10px] text-neutral-400">Lowers movie volume when narrator speaks</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={adDuckingEnabled}
                      onChange={(e) => setAdDuckingEnabled(e.target.checked)}
                      className="w-4 h-4 rounded accent-amber-500"
                    />
                  </label>

                  {/* Headphone Status */}
                  <label className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 cursor-pointer text-xs">
                    <div>
                      <span className="text-neutral-200 font-semibold block">Headphones Plugged In</span>
                      <span className="text-[10px] text-neutral-400">Auditorium courtesy check</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={headphoneConnected}
                      onChange={(e) => setHeadphoneConnected(e.target.checked)}
                      className="w-4 h-4 rounded accent-emerald-500"
                    />
                  </label>

                  {/* Test Narration Sample */}
                  <button
                    onClick={() => {
                      speechNarrator.speak(
                        'test-sample-' + Date.now(),
                        'Pixapix Audio Description verified. Headphone audio active.',
                        selectedAdLang !== 'Off' ? selectedAdLang : 'en',
                        adSpeechRate,
                        adVolume
                      );
                    }}
                    className="w-full py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-amber-300 border border-neutral-700 flex items-center justify-center gap-1.5"
                  >
                    <Headphones className="w-4 h-4" />
                    <span>Test Speech Narration</span>
                  </button>
                </div>
              )}

              {/* TAB 3: ACOUSTIC SYNC & OFFSET */}
              {activeSettingsTab === 'sync' && (
                <div className="space-y-4">
                  <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 text-xs font-mono space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-400">Sync Status:</span>
                      <span className="text-emerald-400 font-bold uppercase">{syncStatus}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-400">Acoustic Confidence:</span>
                      <span className="text-amber-400 font-bold">{syncConfidence}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-400">Auditorium Decibels:</span>
                      <span className="text-sky-400 font-bold">{ambientDb} dB</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs font-semibold text-neutral-300 mb-1">
                      <span>MANUAL SYNC TIMING OFFSET</span>
                      <span className="font-mono text-amber-400">{syncOffsetMs} ms</span>
                    </div>
                    <p className="text-[11px] text-neutral-400 mb-2">
                      Compensates for auditorium seat distance and acoustic reverberation delay.
                    </p>
                    <input
                      type="range"
                      min={-2000}
                      max={2000}
                      step={50}
                      value={syncOffsetMs}
                      onChange={(e) => setSyncOffsetMs(parseInt(e.target.value, 10))}
                      className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                    />
                    <div className="flex justify-between text-[10px] font-mono text-neutral-400 mt-1">
                      <span>-2.0s (Early)</span>
                      <span>0ms (Lock)</span>
                      <span>+2.0s (Late)</span>
                    </div>
                  </div>

                  <label className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 cursor-pointer text-xs">
                    <span className="text-neutral-200 font-semibold">Enable Live Acoustic Mic Sync</span>
                    <input
                      type="checkbox"
                      checked={isMicSyncActive}
                      onChange={(e) => setIsMicSyncActive(e.target.checked)}
                      className="w-4 h-4 rounded accent-emerald-500"
                    />
                  </label>
                </div>
              )}

              {/* TAB 4: DARK AUDITORIUM COURTESY */}
              {activeSettingsTab === 'dark' && (
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between text-xs font-semibold text-neutral-300 mb-1">
                      <span>CINEMA SCREEN DIMMER</span>
                      <span className="font-mono text-purple-400">{Math.round(cinemaDimmer * 100)}%</span>
                    </div>
                    <p className="text-[11px] text-neutral-400 mb-2">
                      Darkens screen display to prevent annoying neighbors in the cinema.
                    </p>
                    <input
                      type="range"
                      min={0}
                      max={0.85}
                      step={0.05}
                      value={cinemaDimmer}
                      onChange={(e) => setCinemaDimmer(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                    />
                  </div>

                  <button
                    onClick={() => {
                      setIsBlackoutActive(true);
                      setActiveSettingsTab(null);
                    }}
                    className="w-full py-3 rounded-xl bg-purple-950/80 hover:bg-purple-900 border border-purple-500/50 text-purple-200 text-xs font-bold flex items-center justify-center gap-2"
                  >
                    <Moon className="w-4 h-4 text-purple-400" />
                    <span>Enter Instant OLED Blackout Mode</span>
                  </button>

                  <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 text-[11px] text-neutral-400 space-y-1">
                    <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>CBFC Accessibility Protocol (2024)</span>
                    </div>
                    <p>Designed to provide full dignity of access to viewers with disabilities without causing visual distraction in darkened movie theatres.</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* BOTTOM CINEMA CONTROLS BAR (Sections #24, #52) */}
          <div
            className={`p-3 sm:p-5 bg-gradient-to-t from-black/95 via-black/85 to-transparent z-30 space-y-2 transition-opacity duration-300 ${
              showControls && !isTouchLocked ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            {/* Timeline Scrubber */}
            <div className="flex items-center gap-3">
              <span className="font-mono text-neutral-400 text-xs min-w-12 text-right">
                {formatTime(currentTime)}
              </span>
              <input
                type="range"
                min={0}
                max={duration || 100}
                step={0.1}
                value={currentTime}
                onChange={(e) => handleSeek(parseFloat(e.target.value))}
                className="flex-1 h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
              <span className="font-mono text-neutral-400 text-xs min-w-12">
                {formatTime(duration)}
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 text-neutral-200 text-xs">
              {/* Left Playback Controls */}
              <div className="flex items-center gap-2 sm:gap-3">
                {/* Play / Pause button */}
                <button
                  onClick={togglePlay}
                  className="w-10 h-10 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 flex items-center justify-center font-bold transition-transform active:scale-95 shadow-md shadow-amber-500/20"
                >
                  {isPlaying ? (
                    <Pause className="w-4 h-4 fill-current" />
                  ) : (
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                  )}
                </button>

                {/* Skip -10s */}
                <button
                  onClick={() => handleSkip(-10)}
                  className="p-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
                  title="Skip 10s backward"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                {/* Skip +10s */}
                <button
                  onClick={() => handleSkip(10)}
                  className="p-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
                  title="Skip 10s forward"
                >
                  <RotateCw className="w-4 h-4" />
                </button>

                {/* Film Audio Volume */}
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <button
                    onClick={() => {
                      if (videoRef.current) {
                        videoRef.current.muted = !isMuted;
                        setIsMuted(!isMuted);
                      }
                    }}
                    className="p-1.5 text-neutral-400 hover:text-white"
                  >
                    {isMuted ? (
                      <VolumeX className="w-4 h-4 text-rose-400" />
                    ) : (
                      <Volume2 className="w-4 h-4" />
                    )}
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={filmVolume}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      setFilmVolume(v);
                      if (videoRef.current) videoRef.current.volume = v;
                    }}
                    className="w-14 sm:w-20 h-1 bg-neutral-800 rounded-lg appearance-none accent-amber-500"
                  />
                </div>
              </div>

              {/* Right Accessibility Quick Controls */}
              <div className="flex items-center gap-1.5 sm:gap-2">
                {/* CC Quick Badge */}
                <button
                  onClick={() => setActiveSettingsTab(activeSettingsTab === 'cc' ? null : 'cc')}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-mono font-semibold flex items-center gap-1 border transition-colors ${
                    selectedCcLang !== 'Off'
                      ? 'bg-sky-950/80 border-sky-500 text-sky-300'
                      : 'bg-neutral-900 border-neutral-700 text-neutral-400 hover:text-white'
                  }`}
                >
                  <Subtitles className="w-3.5 h-3.5" />
                  <span>CC: {selectedCcLang}</span>
                </button>

                {/* AD Quick Badge */}
                <button
                  onClick={() => setActiveSettingsTab(activeSettingsTab === 'ad' ? null : 'ad')}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-mono font-semibold flex items-center gap-1 border transition-colors ${
                    selectedAdLang !== 'Off'
                      ? 'bg-amber-950/80 border-amber-500 text-amber-300'
                      : 'bg-neutral-900 border-neutral-700 text-neutral-400 hover:text-white'
                  }`}
                >
                  <Headphones className="w-3.5 h-3.5" />
                  <span>AD: {selectedAdLang}</span>
                </button>

                {/* Touch / Screen Lock */}
                <button
                  onClick={() => {
                    setIsTouchLocked(true);
                    setShowControls(false);
                  }}
                  className="p-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-300"
                  title="Lock screen touches"
                >
                  <Lock className="w-4 h-4" />
                </button>

                {/* Settings Button */}
                <button
                  onClick={() => setActiveSettingsTab(activeSettingsTab ? null : 'cc')}
                  className={`p-2 rounded-xl border transition-colors ${
                    activeSettingsTab
                      ? 'bg-amber-500 text-neutral-950 border-amber-500 font-bold'
                      : 'bg-neutral-900 hover:bg-neutral-800 border-neutral-700 text-neutral-300'
                  }`}
                  title="All Accessibility Options"
                >
                  <Settings className="w-4 h-4" />
                </button>

                {/* Fullscreen Button */}
                <button
                  onClick={toggleFullscreen}
                  className="p-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-300"
                  title="Toggle Fullscreen"
                >
                  {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
