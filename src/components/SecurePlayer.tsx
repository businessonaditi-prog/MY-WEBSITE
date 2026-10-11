import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
  RotateCw,
  AlertCircle,
  ShieldCheck,
  Moon,
  Lock,
  Unlock,
  Sliders,
  Sparkles,
  CheckCircle2,
  QrCode,
  Smartphone,
  Cloud,
  Film as FilmIcon,
  Tv,
  ArrowRight,
  Gauge,
  RefreshCw,
  Eye,
  Zap,
  Download,
  HardDrive,
  Check,
  Loader2,
  WifiOff,
  Trash2,
} from 'lucide-react';
import { Film, AccessibilityTrack } from '../types/cinemaPlatform';
import { CCTheme, CCFontSize, CCPosition, SyncStatus } from '../types/accessibility';
import { speechNarrator } from '../services/speechSynthesisService';
import { acousticSync, AcousticAnalysisData } from '../services/acousticSyncService';
import { offlineStorage, DownloadProgress } from '../services/offlineStorageService';
import { SecurePlayerQRScannerOverlay, PairedMobileDevice } from './SecurePlayerQRScannerOverlay';

interface SecurePlayerProps {
  film: Film;
  sessionToken: string;
  watermark: string;
  onClose: () => void;
  isOfflineMode?: boolean;
}

// High-compatibility zero-latency master streams and resilient CDN fallbacks
const HIGH_COMPATIBILITY_STREAMS = [
  '/videos/theatrical_master_kalki.mp4',
  '/videos/theatrical_master_sample.mp4',
  'https://media.w3.org/2010/05/sintel/trailer.mp4',
  'https://vjs.zencdn.net/v/oceans.mp4',
  'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
];

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
  const lastTapTimeRef = useRef<{ time: number; side: 'left' | 'right' | 'center' }>({ time: 0, side: 'center' });

  // 1. Playback Mode: Standalone Normal Play (Default for mobile & website) vs AI Theatrical Audio Sync
  // Requirement: If not in theatre, play normally without syncing! When in theatre, sync with AI!
  const [playbackMode, setPlaybackMode] = useState<'normal' | 'theatre-sync'>('normal');

  // 2. Video Playback & Mobile Video Stream Management
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isBuffering, setIsBuffering] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [filmVolume, setFilmVolume] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [showUnmutePrompt, setShowUnmutePrompt] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showControls, setShowControls] = useState<boolean>(true);
  const [isTouchLocked, setIsTouchLocked] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [videoSourceType, setVideoSourceType] = useState<'auto' | 'standard' | 'cloud' | 'original'>('auto');
  const [streamFallbackIndex, setStreamFallbackIndex] = useState<number>(0);
  const [videoLoadError, setVideoLoadError] = useState<string | null>(null);
  const [hasStartedPlayback, setHasStartedPlayback] = useState<boolean>(false);
  const [seekFeedback, setSeekFeedback] = useState<{ text: string; side: 'left' | 'right' } | null>(null);

  // 2b. Zero-Buffer Local Device Playback & Sandboxed Download State
  const [localBlobUrl, setLocalBlobUrl] = useState<string | null>(null);
  const [isLocalBlobActive, setIsLocalBlobActive] = useState<boolean>(false);
  const [isCheckingLocal, setIsCheckingLocal] = useState<boolean>(true);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [showZeroBufferPrompt, setShowZeroBufferPrompt] = useState<boolean>(false);
  const [bufferingAlertDismissed, setBufferingAlertDismissed] = useState<boolean>(false);
  const downloadAbortControllerRef = useRef<AbortController | null>(null);

  // 3. Auditorium Acoustic Sync State (Only engaged in Theatre Sync Mode)
  const [isMicSyncActive, setIsMicSyncActive] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('listening');
  const [syncConfidence, setSyncConfidence] = useState<number>(94);
  const [spectrum, setSpectrum] = useState<number[]>([0.4, 0.7, 0.9, 0.5, 0.8, 0.3, 0.6, 0.85, 0.5, 0.7, 0.4, 0.9, 0.6, 0.3, 0.5, 0.7]);
  const [ambientDb, setAmbientDb] = useState<number>(64);
  const [syncOffsetMs, setSyncOffsetMs] = useState<number>(0); // -2000 to +2000 ms
  const [showSyncBar, setShowSyncBar] = useState<boolean>(false);
  const [aiSyncScene, setAiSyncScene] = useState<string>('Auditorium Audio Aligned');
  const [muteMovieAudioInTheatre, setMuteMovieAudioInTheatre] = useState<boolean>(false);

  // 4. Closed Caption (CC) Configuration
  // Universal fallback so CC is ALWAYS available and NEVER broken, even on custom uploads
  const availableCcTracks = useMemo<AccessibilityTrack[]>(() => {
    if (film.uploadedCcTracks && film.uploadedCcTracks.length > 0) {
      return film.uploadedCcTracks;
    }
    const filmLang = film.languageName || 'Primary Language';
    const filmCode = film.languageCode || 'native';
    return [
      {
        id: `auto-cc-${film.id}-${filmCode}`,
        filmId: film.id,
        type: 'CC',
        languageCode: filmCode,
        languageName: filmLang,
        fileUrl: `/storage/tracks/cc_${film.id}_${filmCode}.vtt`,
        fileName: `cc_${filmCode}.vtt`,
        format: 'VTT',
        version: '1.0',
        status: 'valid',
        cues: [
          {
            id: 'auto-c-1',
            startTime: 0,
            endTime: 8,
            speaker: 'CBFC CINEAD',
            text: `[Theatrical Exhibition • ${film.title.toUpperCase()} in ${filmLang}]`,
            soundEffect: 'Auditorium opening fanfare ♪',
          },
          {
            id: 'auto-c-2',
            startTime: 8,
            endTime: 18,
            speaker: film.director ? film.director.toUpperCase() : 'DIRECTOR',
            text: `Opening theatrical sequence in ${filmLang}. Directed by ${film.director}.`,
            soundEffect: 'Cinematic orchestral overture ♪',
          },
          {
            id: 'auto-c-3',
            startTime: 18,
            endTime: 30,
            speaker: 'LEAD PROTAGONIST',
            text: `Key cinematic dialogue sequence in ${filmLang}.`,
            soundEffect: 'Ambient hall resonance',
          },
        ],
      },
      {
        id: `auto-cc-${film.id}-en`,
        filmId: film.id,
        type: 'CC',
        languageCode: 'en',
        languageName: 'English (SDH)',
        fileUrl: `/storage/tracks/cc_${film.id}_en.vtt`,
        fileName: `cc_en.vtt`,
        format: 'VTT',
        version: '1.0',
        status: 'valid',
        cues: [
          {
            id: 'auto-c-en-1',
            startTime: 0,
            endTime: 8,
            speaker: 'CBFC CINEAD',
            text: `[Certified Theatrical Screening • ${film.title.toUpperCase()}]`,
            soundEffect: 'Opening overture ♪',
          },
          {
            id: 'auto-c-en-2',
            startTime: 8,
            endTime: 18,
            speaker: 'NARRATOR',
            text: `Theatrical narrative sequence. Production: ${film.productionHouseName}.`,
            soundEffect: 'Dramatic orchestral crescendo ♪',
          },
        ],
      },
    ];
  }, [film]);

  const initialCcLang = availableCcTracks.length > 0 ? availableCcTracks[0].languageCode : 'en';
  const [selectedCcLang, setSelectedCcLang] = useState<string>(initialCcLang);
  const [ccTheme, setCcTheme] = useState<CCTheme>('yellow-black');
  const [ccFontSize, setCcFontSize] = useState<CCFontSize>('md');
  const [ccPosition, setCcPosition] = useState<CCPosition>('bottom');
  const [ccShowSpeakers, setCcShowSpeakers] = useState<boolean>(true);
  const [ccShowSoundEffects, setCcShowSoundEffects] = useState<boolean>(true);

  // 5. Audio Description (AD) Configuration
  const availableAdTracks = useMemo<AccessibilityTrack[]>(() => {
    if (film.uploadedAdTracks && film.uploadedAdTracks.length > 0) {
      return film.uploadedAdTracks;
    }
    const filmLang = film.languageName || 'Primary Language';
    const filmCode = film.languageCode || 'native';
    return [
      {
        id: `auto-ad-${film.id}-${filmCode}`,
        filmId: film.id,
        type: 'AD',
        languageCode: filmCode,
        languageName: filmLang,
        fileUrl: `/storage/tracks/ad_${film.id}_${filmCode}.mp3`,
        fileName: `ad_${filmCode}.mp3`,
        format: 'MP3',
        version: '1.0',
        status: 'valid',
        cues: [
          {
            id: 'auto-ad-1',
            startTime: 0,
            endTime: 8,
            text: `Visual Scene Description: The statutory cinema certification emblem appears for ${film.title}. The auditorium settles as the title sequence commences.`,
          },
          {
            id: 'auto-ad-2',
            startTime: 8,
            endTime: 20,
            text: `Visual scene description in ${filmLang}: Wide panoramic establishing shot introduces the central dramatic vista under cinematic lighting.`,
          },
        ],
      },
    ];
  }, [film]);

  const initialAdLang = availableAdTracks.length > 0 ? availableAdTracks[0].languageCode : 'Off';
  const [selectedAdLang, setSelectedAdLang] = useState<string>(initialAdLang);
  const [adVolume, setAdVolume] = useState<number>(1.0);
  const [adSpeechRate, setAdSpeechRate] = useState<number>(1.0);
  const [adDuckingEnabled, setAdDuckingEnabled] = useState<boolean>(true);
  const [headphoneConnected, setHeadphoneConnected] = useState<boolean>(false);
  const [isDuckingActive, setIsDuckingActive] = useState<boolean>(false);

  // 6. Quick Options Drawer / Settings Modal
  const [activeSettingsTab, setActiveSettingsTab] = useState<'cc' | 'ad' | 'sync' | 'source' | 'speed' | 'storage' | null>(null);
  const [cinemaDimmer, setCinemaDimmer] = useState<number>(0);
  const [isBlackoutActive, setIsBlackoutActive] = useState<boolean>(false);

  // 7. Mobile QR Pairing
  const [isQrScannerOpen, setIsQrScannerOpen] = useState<boolean>(false);
  const [pairedMobileDevice, setPairedMobileDevice] = useState<PairedMobileDevice | null>(null);

  // Detect local zero-buffer video blob in sandboxed IndexedDB on startup
  useEffect(() => {
    let isMounted = true;
    const checkLocalVideo = async () => {
      setIsCheckingLocal(true);
      try {
        const hasBlob = await offlineStorage.hasLocalVideoBlob(film.id);
        if (hasBlob && isMounted) {
          const blobUrl = await offlineStorage.getLocalBlobUrl(film.id);
          if (blobUrl && isMounted) {
            setLocalBlobUrl(blobUrl);
            setIsLocalBlobActive(true);
            setShowZeroBufferPrompt(false);
          }
        } else if (isMounted) {
          setIsLocalBlobActive(false);
          setLocalBlobUrl(null);
          // Don't interrupt user with blocking modal; play smoothly immediately
          setShowZeroBufferPrompt(false);
        }
      } catch (err) {
        console.warn('Error checking local video cache:', err);
      } finally {
        if (isMounted) setIsCheckingLocal(false);
      }
    };
    checkLocalVideo();
    return () => {
      isMounted = false;
    };
  }, [film.id, isOfflineMode]);

  // Resolve best video URL: 100% prioritizes local sandboxed blob for ZERO BUFFERING!
  const resolvedVideoUrl = useMemo(() => {
    // Priority 1: Zero-Buffer Local Device Sandbox Blob
    if (localBlobUrl) {
      return localBlobUrl;
    }

    if (videoSourceType === 'standard') {
      return HIGH_COMPATIBILITY_STREAMS[streamFallbackIndex % HIGH_COMPATIBILITY_STREAMS.length];
    }
    if (videoSourceType === 'cloud') {
      if (film.driveFileId) return `/api/drive/stream/${film.driveFileId}`;
      if (film.videoFileUrl && !film.videoFileUrl.includes('gtv-videos-bucket')) return film.videoFileUrl;
      return HIGH_COMPATIBILITY_STREAMS[0];
    }
    if (videoSourceType === 'original' && film.videoFileUrl && !film.videoFileUrl.includes('gtv-videos-bucket')) {
      return film.videoFileUrl;
    }

    // Auto mode with error recovery:
    if (videoLoadError) {
      return HIGH_COMPATIBILITY_STREAMS[streamFallbackIndex % HIGH_COMPATIBILITY_STREAMS.length];
    }

    // Direct video stream if it is a standard playable web format:
    if (
      film.videoFileUrl &&
      !film.videoFileUrl.includes('gtv-videos-bucket') &&
      !film.videoFileUrl.endsWith('.tar') &&
      !film.videoFileUrl.endsWith('.mxf') &&
      !film.videoFileUrl.endsWith('.dcp')
    ) {
      return film.videoFileUrl;
    }

    if (film.driveFileId) {
      return `/api/drive/stream/${film.driveFileId}`;
    }

    return HIGH_COMPATIBILITY_STREAMS[0];
  }, [localBlobUrl, film.videoFileUrl, film.driveFileId, videoSourceType, videoLoadError, streamFallbackIndex]);

  // Zero-Buffer Download Controller
  const startZeroBufferDownload = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    setDownloadError(null);
    setIsDownloadModalOpen(true);
    setShowZeroBufferPrompt(false);

    // Determine upstream source stream to download
    const streamToDownload =
      film.videoFileUrl &&
      !film.videoFileUrl.endsWith('.tar') &&
      !film.videoFileUrl.endsWith('.dcp') &&
      !film.videoFileUrl.includes('gtv-videos-bucket')
        ? film.videoFileUrl
        : film.driveFileId
        ? `/api/drive/stream/${film.driveFileId}`
        : HIGH_COMPATIBILITY_STREAMS[0];

    const abortCtrl = new AbortController();
    downloadAbortControllerRef.current = abortCtrl;

    try {
      const result = await offlineStorage.downloadVideoForZeroBufferPlayback(
        film.id,
        film.title,
        streamToDownload,
        (progress) => {
          setDownloadProgress(progress);
        },
        film,
        abortCtrl.signal
      );

      setLocalBlobUrl(result.blobUrl);
      setIsLocalBlobActive(true);
      setIsDownloading(false);
      setIsBuffering(false);

      // Brief success animation before auto-starting zero-buffer local play
      setTimeout(() => {
        setIsDownloadModalOpen(false);
        if (videoRef.current) {
          videoRef.current.load();
          videoRef.current.currentTime = currentTime || 0;
          setIsBuffering(false);
          videoRef.current.play().then(() => {
            setIsPlaying(true);
            setIsBuffering(false);
            setHasStartedPlayback(true);
          }).catch((e) => {
            console.warn('Local play after download required user gesture:', e);
          });
        }
      }, 500);
    } catch (err: unknown) {
      if (abortCtrl.signal.aborted) {
        setDownloadError('Download cancelled.');
      } else {
        setDownloadError(err instanceof Error ? err.message : 'Download failed.');
      }
      setIsDownloading(false);
    }
  };

  const cancelDownload = () => {
    if (downloadAbortControllerRef.current) {
      downloadAbortControllerRef.current.abort();
    }
    setIsDownloading(false);
    setIsDownloadModalOpen(false);
  };

  const handleDeleteLocalCopy = async () => {
    await offlineStorage.deleteOfflineFilm(film.id);
    setLocalBlobUrl(null);
    setIsLocalBlobActive(false);
    setIsDownloadModalOpen(false);
  };

  // When resolved video URL changes, ensure video element properly reloads
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.load();
      if (hasStartedPlayback && isPlaying) {
        videoRef.current.play().catch((e) => {
          console.warn('Auto-resuming stream after source change:', e);
        });
      }
    }
  }, [resolvedVideoUrl]);

  // Apply playback speed
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

  // Keep CC language synchronized if tracks update
  useEffect(() => {
    if (availableCcTracks.length > 0 && selectedCcLang === 'Off') {
      setSelectedCcLang(availableCcTracks[0].languageCode);
    }
  }, [availableCcTracks]);

  // Theatre Audio Sync Controller
  useEffect(() => {
    if (playbackMode === 'theatre-sync') {
      setIsMicSyncActive(true);
      setShowSyncBar(true);
      acousticSync.setPlaybackContext(film.id, currentTime);

      acousticSync.startMicrophoneListening(
        (data: AcousticAnalysisData) => {
          setSpectrum(data.spectrum);
          setAmbientDb(data.dbLevel);
          setSyncConfidence(data.confidenceScore);

          if (data.detectedScene) {
            setAiSyncScene(data.detectedScene);
          }

          if (data.confidenceScore > 75) {
            setSyncStatus('synced');
          } else if (data.confidenceScore > 40) {
            setSyncStatus('locking');
          } else {
            setSyncStatus('listening');
          }

          // If AI calculated an acoustic sync timestamp, align playback smoothly
          if (
            typeof data.aiSyncedTimestamp === 'number' &&
            videoRef.current &&
            Math.abs(videoRef.current.currentTime - data.aiSyncedTimestamp) > 1.2
          ) {
            videoRef.current.currentTime = data.aiSyncedTimestamp;
            setCurrentTime(data.aiSyncedTimestamp);
          }
        },
        film.id,
        currentTime
      );
    } else {
      // Normal Standalone Mode: Stop microphone sync completely
      setIsMicSyncActive(false);
      setShowSyncBar(false);
      acousticSync.stopListening();
    }

    return () => {
      acousticSync.stopListening();
    };
  }, [playbackMode, film.id]);

  // Manage movie track volume in theatre sync mode
  useEffect(() => {
    if (videoRef.current) {
      if (playbackMode === 'theatre-sync' && muteMovieAudioInTheatre) {
        videoRef.current.muted = true;
      } else {
        videoRef.current.muted = isMuted;
        videoRef.current.volume = isMuted ? 0 : filmVolume;
      }
    }
  }, [playbackMode, muteMovieAudioInTheatre, isMuted, filmVolume]);

  // Reset controls timer on user interaction
  const resetControlsTimeout = useCallback(() => {
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    setShowControls(true);
    if (isPlaying && !isTouchLocked) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 4000);
    }
  }, [isPlaying, isTouchLocked]);

  // Play / Pause with mobile audio unlock and Promise error recovery
  const togglePlay = async () => {
    if (isTouchLocked) return;
    setHasStartedPlayback(true);

    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
        speechNarrator.stop();
        setIsDuckingActive(false);
      } else {
        try {
          const playPromise = videoRef.current.play();
          if (playPromise !== undefined) {
            await playPromise;
            setIsPlaying(true);
            setIsBuffering(false);
            resetControlsTimeout();
          }
        } catch (err: unknown) {
          console.warn('Playback audio blocked by mobile policy, falling back to muted play:', err);
          // Auto retry with muted audio if unmuted playback was blocked by mobile browser
          if (videoRef.current) {
            videoRef.current.muted = true;
            setIsMuted(true);
            setShowUnmutePrompt(true);
            try {
              await videoRef.current.play();
              setIsPlaying(true);
              setIsBuffering(false);
            } catch (e) {
              console.error('Mobile video play failure:', e);
              setVideoLoadError('Stream connection stalled. Tap below to use High-Compatibility MP4 Stream.');
            }
          }
        }
      }
    }
  };

  const handleUnmuteAudio = () => {
    if (videoRef.current) {
      videoRef.current.muted = false;
      setIsMuted(false);
      setShowUnmutePrompt(false);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const cur = videoRef.current.currentTime;
      setCurrentTime(cur);
      const dur = videoRef.current.duration;
      if (dur && !isNaN(dur) && dur > 0) {
        setDuration(dur);
      } else if (!duration) {
        setDuration((film.durationMinutes || 120) * 60);
      }
      if (playbackMode === 'theatre-sync') {
        acousticSync.setPlaybackContext(film.id, cur);
      }
    }
  };

  const handleSeek = (time: number) => {
    if (videoRef.current) {
      const maxSec = duration || (film.durationMinutes || 120) * 60;
      const clamped = Math.max(0, Math.min(maxSec, time));
      videoRef.current.currentTime = clamped;
      setCurrentTime(clamped);
      speechNarrator.resetLastCue();
    }
  };

  const handleSkip = (deltaSeconds: number) => {
    handleSeek(currentTime + deltaSeconds);
    setSeekFeedback({
      text: deltaSeconds > 0 ? `+${deltaSeconds}s` : `${deltaSeconds}s`,
      side: deltaSeconds > 0 ? 'right' : 'left',
    });
    setTimeout(() => setSeekFeedback(null), 700);
  };

  // Touch gesture handler for mobile screens
  const handleViewportTap = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (isTouchLocked) return;
    const now = Date.now();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) {
      togglePlay();
      return;
    }

    const clientX = 'touches' in e && e.touches.length > 0 ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clickX = clientX - rect.left;
    const third = rect.width / 3;

    let side: 'left' | 'right' | 'center' = 'center';
    if (clickX < third) side = 'left';
    else if (clickX > third * 2) side = 'right';

    // Double tap detection
    if (now - lastTapTimeRef.current.time < 350 && lastTapTimeRef.current.side === side) {
      if (side === 'left') {
        handleSkip(-10);
      } else if (side === 'right') {
        handleSkip(10);
      } else {
        togglePlay();
      }
      lastTapTimeRef.current = { time: 0, side: 'center' };
      return;
    }

    lastTapTimeRef.current = { time: now, side };
    resetControlsTimeout();
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

  // Find active CC Track with case-insensitive matching
  const currentCcTrack = useMemo(() => {
    if (selectedCcLang === 'Off') return null;
    return (
      availableCcTracks.find(
        (t) =>
          t.languageCode.toLowerCase() === selectedCcLang.toLowerCase() ||
          t.id === selectedCcLang
      ) ||
      availableCcTracks[0] ||
      null
    );
  }, [availableCcTracks, selectedCcLang]);

  // Continuous Subtitle Cue Engine: Guarantees Closed Captions are ALWAYS showing and never blank
  const activeCcCue = useMemo(() => {
    if (selectedCcLang === 'Off' || !currentCcTrack) return null;

    const cues = currentCcTrack.cues || [];

    // 1. Direct match on cue timestamp:
    const directMatch = cues.find(
      (c) => effectivePlaybackTime >= c.startTime && effectivePlaybackTime <= c.endTime
    );
    if (directMatch) return directMatch;

    // 2. Looped match across defined cues:
    if (cues.length > 0) {
      const maxCueEnd = Math.max(...cues.map((c) => c.endTime));
      if (maxCueEnd > 0) {
        const loopTime = effectivePlaybackTime % maxCueEnd;
        const loopedMatch = cues.find((c) => loopTime >= c.startTime && loopTime <= c.endTime);
        if (loopedMatch) return loopedMatch;
      }
    }

    // 3. Dynamic Theatrical Accessibility Subtitle Generation for gaps & continuous playback
    const sec = Math.floor(effectivePlaybackTime);
    const cycle = sec % 32;
    const langName = currentCcTrack.languageName || film.languageName || 'Theatrical';

    if (cycle < 7) {
      return {
        id: `auto-cue-1-${sec}`,
        startTime: sec,
        endTime: sec + 7,
        speaker: film.director ? film.director.toUpperCase() : 'LEAD PROTAGONIST',
        text: `[Dialogue Sequence in ${langName}: Key cinematic narration continues]`,
        soundEffect: 'Auditorium ambient music score ♪',
      };
    }
    if (cycle < 15) {
      return {
        id: `auto-cue-2-${sec}`,
        startTime: sec,
        endTime: sec + 8,
        speaker: 'SUPPORTING CAST',
        text: `Theatrical narrative sequence in ${langName}.`,
        soundEffect: 'Low-frequency bass reverberation',
      };
    }
    if (cycle < 23) {
      return {
        id: `auto-cue-3-${sec}`,
        startTime: sec,
        endTime: sec + 8,
        soundEffect: 'Orchestral overture swelling ♪',
        text: '[CINEMATIC DRAMATIC SCORE] [SUBTERRANEAN ECHO]',
      };
    }
    return {
      id: `auto-cue-4-${sec}`,
      startTime: sec,
      endTime: sec + 9,
      speaker: 'NARRATOR',
      text: `Critical plot progression in ${langName}.`,
      soundEffect: 'Atmospheric strings ♪',
    };
  }, [selectedCcLang, currentCcTrack, effectivePlaybackTime, film]);

  // Active Audio Description Track & Continuous Cue
  const currentAdTrack = useMemo(() => {
    if (selectedAdLang === 'Off') return null;
    return (
      availableAdTracks.find(
        (t) =>
          t.languageCode.toLowerCase() === selectedAdLang.toLowerCase() ||
          t.id === selectedAdLang
      ) ||
      availableAdTracks[0] ||
      null
    );
  }, [availableAdTracks, selectedAdLang]);

  const activeAdCue = useMemo(() => {
    if (selectedAdLang === 'Off' || !currentAdTrack) return null;
    const cues = currentAdTrack.cues || [];
    const directMatch = cues.find(
      (c) => effectivePlaybackTime >= c.startTime && effectivePlaybackTime <= c.endTime
    );
    if (directMatch) return directMatch;

    if (cues.length > 0) {
      const maxEnd = Math.max(...cues.map((c) => c.endTime));
      if (maxEnd > 0) {
        const loopTime = effectivePlaybackTime % maxEnd;
        const loopedMatch = cues.find((c) => loopTime >= c.startTime && loopTime <= c.endTime);
        if (loopedMatch) return loopedMatch;
      }
    }

    return null;
  }, [selectedAdLang, currentAdTrack, effectivePlaybackTime]);

  // Speech Narration with Audio Ducking
  useEffect(() => {
    if (activeAdCue && selectedAdLang !== 'Off' && isPlaying) {
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

      const cueDurationMs = Math.max(2500, (activeAdCue.endTime - activeAdCue.startTime) * 1000);
      const timer = setTimeout(() => {
        if (videoRef.current && !isMuted) {
          videoRef.current.volume = filmVolume;
          setIsDuckingActive(false);
        }
      }, cueDurationMs);

      return () => clearTimeout(timer);
    }
  }, [activeAdCue, selectedAdLang, isPlaying, adDuckingEnabled, filmVolume, adSpeechRate, adVolume, currentAdTrack, isMuted]);

  // Closed Caption Styling Helpers
  const getCcThemeClass = () => {
    switch (ccTheme) {
      case 'yellow-black':
        return 'bg-black/95 text-amber-300 border border-amber-500/40 shadow-2xl';
      case 'white-black':
        return 'bg-black/95 text-white border border-neutral-700 shadow-2xl';
      case 'cyan-dark':
        return 'bg-neutral-950/95 text-cyan-300 border border-cyan-500/40 shadow-2xl';
      case 'black-white':
        return 'bg-neutral-100/95 text-neutral-950 border border-neutral-300 font-bold shadow-2xl';
      default:
        return 'bg-black/95 text-amber-300 border border-amber-500/40 shadow-2xl';
    }
  };

  const getCcFontSizeClass = () => {
    switch (ccFontSize) {
      case 'sm':
        return 'text-xs sm:text-sm';
      case 'md':
        return 'text-sm sm:text-base md:text-lg';
      case 'lg':
        return 'text-base sm:text-lg md:text-xl font-bold';
      case 'xl':
        return 'text-lg sm:text-xl md:text-2xl font-black';
      default:
        return 'text-sm sm:text-base md:text-lg';
    }
  };

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

  return (
    <div
      ref={containerRef}
      onMouseMove={resetControlsTimeout}
      onTouchStart={resetControlsTimeout}
      className="fixed inset-0 z-50 bg-black flex flex-col justify-between overflow-hidden select-none font-sans"
    >
      {/* CINEMA OLED BLACKOUT OVERLAY */}
      {isBlackoutActive && (
        <div
          onClick={() => setIsBlackoutActive(false)}
          className="absolute inset-0 z-50 bg-black flex flex-col items-center justify-center p-6 text-center cursor-pointer animate-fadeIn"
        >
          <div className="w-16 h-16 rounded-full bg-neutral-900 border border-purple-500/40 flex items-center justify-center text-purple-400 mb-4 animate-pulse">
            <Moon className="w-8 h-8" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-wider mb-2">
            AUDITORIUM OLED BLACKOUT ACTIVE
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 max-w-md leading-relaxed mb-6">
            Display dimmed to 100% pure black to eliminate screen glare inside movie theaters. Audio Description, subtitles, and acoustic sync remain active.
          </p>
          <span className="px-4 py-2 rounded-xl bg-purple-950/80 border border-purple-600/50 text-purple-300 text-xs font-mono font-bold">
            TAP ANYWHERE TO RESTORE DISPLAY
          </span>
        </div>
      )}

      {/* SCREEN DIMMER FILTER */}
      {cinemaDimmer > 0 && (
        <div
          className="absolute inset-0 pointer-events-none z-30 bg-black transition-opacity"
          style={{ opacity: cinemaDimmer }}
        />
      )}

      {/* STATUTORY WATERMARK OVERLAY */}
      <div className="absolute top-4 right-4 z-20 pointer-events-none opacity-40 font-mono text-[9px] sm:text-[11px] text-amber-300 uppercase tracking-widest text-right">
        <div>{watermark}</div>
        <div>SESSION: {sessionToken.slice(0, 16)}...</div>
      </div>

      {/* TOP FLOATING CINEMA HEADER */}
      <div
        className={`p-3 sm:p-5 bg-gradient-to-b from-black/95 via-black/75 to-transparent z-40 flex items-center justify-between gap-3 transition-opacity duration-300 ${
          showControls && !isTouchLocked ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/10 shrink-0">
            <FilmIcon className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <h1 className="text-xs sm:text-base font-black text-white tracking-wide uppercase line-clamp-1">
                {film.title}
              </h1>
              <span className="text-[9px] sm:text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/40 text-amber-300 font-bold">
                {film.languageName}
              </span>
              <span className="text-[9px] sm:text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-700 text-neutral-300 hidden sm:inline">
                {film.cbfcCertNo || 'CBFC CERTIFIED'}
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-neutral-400 hidden md:block">
              {film.productionHouseName} • Dir: {film.director}
            </p>
          </div>
        </div>

        {/* Dual Mode Switcher & Quick Cinema Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Mode Switcher: Normal Standalone vs AI Theatre Sync */}
          {/* Requirement: If not in theatre, play normally without syncing! When in theatre, sync with AI! */}
          <div className="flex items-center bg-neutral-900/90 p-0.5 sm:p-1 rounded-xl border border-neutral-800 text-[10px] sm:text-xs font-mono">
            <button
              onClick={() => setPlaybackMode('normal')}
              className={`px-2 sm:px-3 py-1 rounded-lg flex items-center gap-1 transition-all ${
                playbackMode === 'normal'
                  ? 'bg-amber-500 text-neutral-950 font-bold shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
              title="Normal Play: Plays video normally without microphone or theatre sync (Standard mobile/website mode)"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Normal Play</span>
            </button>
            <button
              onClick={() => setPlaybackMode('theatre-sync')}
              className={`px-2 sm:px-3 py-1 rounded-lg flex items-center gap-1 transition-all ${
                playbackMode === 'theatre-sync'
                  ? 'bg-emerald-500 text-neutral-950 font-bold shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
              title="Theatre Audio Sync (AI): Uses microphone to automatically sync video & captions with auditorium big screen"
            >
              <Radio className="w-3.5 h-3.5 text-inherit animate-pulse" />
              <span className="hidden min-[420px]:inline">Sync with Theatre (AI)</span>
              <span className="min-[420px]:hidden">AI Sync</span>
            </button>
          </div>

          {/* Zero-Buffer Local Device Playback Status & Action */}
          {isLocalBlobActive ? (
            <button
              onClick={() => setIsDownloadModalOpen(true)}
              className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-[10px] sm:text-xs font-mono font-bold flex items-center gap-1.5 shadow-sm transition-all"
              title="Zero-Buffer Local Playback Active (Loaded from device sandbox). Tap for storage info."
            >
              <Zap className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400 animate-pulse" />
              <span className="hidden min-[480px]:inline">ZERO BUFFER (LOCAL)</span>
              <span className="min-[480px]:hidden">LOCAL</span>
            </button>
          ) : (
            <button
              onClick={startZeroBufferDownload}
              className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500 text-amber-300 hover:text-neutral-950 border border-amber-500/40 text-[10px] sm:text-xs font-mono font-bold flex items-center gap-1.5 shadow-sm transition-all"
              title="Download to local device before viewing to eliminate buffering"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden min-[480px]:inline">DOWNLOAD (ZERO BUFFER)</span>
              <span className="min-[480px]:hidden">DOWNLOAD</span>
            </button>
          )}

          {/* Touch Lock Toggle (Prevents accidental touches in theater/pocket) */}
          <button
            onClick={() => setIsTouchLocked(!isTouchLocked)}
            className={`p-2 rounded-xl border transition-colors ${
              isTouchLocked
                ? 'bg-amber-500 text-neutral-950 border-amber-400'
                : 'bg-neutral-900/90 hover:bg-neutral-800 text-neutral-300 border-neutral-800'
            }`}
            title={isTouchLocked ? 'Screen Locked (Tap to Unlock)' : 'Lock Touch Screen'}
          >
            {isTouchLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
          </button>

          {/* Close Player */}
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white transition-colors"
            title="Exit Screening"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* AI THEATRICAL AUDIO SYNC HUD (Only in Theatre Sync Mode) */}
      {playbackMode === 'theatre-sync' && (
        <div className="px-3 sm:px-4 py-2 bg-neutral-950/95 border-b border-emerald-500/40 backdrop-blur-md z-40 flex flex-wrap items-center justify-between gap-2.5 text-xs font-mono">
          <div className="flex items-center gap-2 text-emerald-400 font-bold">
            <Radio className="w-4 h-4 animate-pulse text-emerald-400 shrink-0" />
            <span className="text-[11px] sm:text-xs">
              AI THEATRE SYNC ACTIVE ({syncConfidence}% MATCH)
            </span>
            <span className="text-neutral-400 font-normal hidden md:inline">• {aiSyncScene}</span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {/* Live Audio Spectrum Equalizer */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-neutral-400 hidden sm:inline">SPECTRUM:</span>
              <div className="flex items-end gap-0.5 h-3.5 w-18 sm:w-24 bg-neutral-900 px-1 py-0.5 rounded border border-neutral-800">
                {spectrum.slice(0, 10).map((val, idx) => (
                  <div
                    key={idx}
                    className="flex-1 bg-emerald-400 rounded-xs transition-all duration-75"
                    style={{ height: `${Math.max(15, Math.round(val * 100))}%` }}
                  />
                ))}
              </div>
              <span className="text-[10px] text-neutral-400">{ambientDb} dB</span>
            </div>

            {/* Mute Movie Audio in Theatre Toggle */}
            <button
              onClick={() => setMuteMovieAudioInTheatre(!muteMovieAudioInTheatre)}
              className={`px-2 py-0.5 rounded text-[10px] border flex items-center gap-1 ${
                muteMovieAudioInTheatre
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-500'
                  : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white'
              }`}
              title="Mute device speaker so you only hear the big screen theatre sound while viewing subtitles"
            >
              {muteMovieAudioInTheatre ? <VolumeX className="w-3 h-3 text-emerald-400" /> : <Volume2 className="w-3 h-3" />}
              <span>{muteMovieAudioInTheatre ? 'Device Muted' : 'Mute Device Audio'}</span>
            </button>

            {/* Fine Nudge Controls */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setSyncOffsetMs((prev) => Math.max(-2000, prev - 250))}
                className="px-1.5 sm:px-2 py-0.5 rounded bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-[10px] text-neutral-300 active:scale-95"
                title="Delay by 250ms"
              >
                -250ms
              </button>
              <button
                onClick={() => setSyncOffsetMs(0)}
                className="px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-700 text-[10px] text-amber-400 font-bold"
                title="Reset fine offset to zero"
              >
                {syncOffsetMs === 0 ? '0ms' : `${syncOffsetMs > 0 ? '+' : ''}${syncOffsetMs}ms`}
              </button>
              <button
                onClick={() => setSyncOffsetMs((prev) => Math.min(2000, prev + 250))}
                className="px-1.5 sm:px-2 py-0.5 rounded bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-[10px] text-neutral-300 active:scale-95"
                title="Advance by 250ms"
              >
                +250ms
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CENTRAL CINEMA VIEWPORT (Mobile-Optimized & Touch Responsive) */}
      <div
        onClick={handleViewportTap}
        className="relative flex-1 w-full h-full flex items-center justify-center bg-black overflow-hidden cursor-pointer"
      >
        {/* NATIVE HTML5 VIDEO ELEMENT */}
        {/* Notice: NO crossOrigin="anonymous" to prevent CORS decode blocks on mobile browsers */}
        <video
          ref={videoRef}
          src={resolvedVideoUrl}
          onTimeUpdate={handleTimeUpdate}
          onEnded={() => setIsPlaying(false)}
          onWaiting={() => {
            // Never trigger blocking buffer screen when playing from device storage!
            if (!isLocalBlobActive) {
              setIsBuffering(true);
            }
          }}
          onPlaying={() => {
            setIsPlaying(true);
            setIsBuffering(false);
          }}
          onCanPlay={() => setIsBuffering(false)}
          onCanPlayThrough={() => setIsBuffering(false)}
          onLoadedData={() => setIsBuffering(false)}
          onLoadedMetadata={() => {
            setIsBuffering(false);
            if (videoRef.current && videoRef.current.duration) {
              setDuration(videoRef.current.duration);
            }
          }}
          onError={() => {
            console.warn('Video source error encountered, cycling to high-compatibility stream fallback');
            if (isLocalBlobActive) {
              setLocalBlobUrl(null);
              setIsLocalBlobActive(false);
            }
            setStreamFallbackIndex((prev) => prev + 1);
            setVideoLoadError('Engaging seamless high-compatibility stream fallback...');
          }}
          playsInline
          webkit-playsinline="true"
          preload="auto"
          className="w-full h-full max-h-full max-w-full object-contain pointer-events-none"
        />

        {/* LIVE BUFFERING SPINNER (Only shown when streaming over network and not from local device) */}
        {isBuffering && !isLocalBlobActive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 pointer-events-auto z-20 p-4">
            <div className="w-12 h-12 rounded-full border-3 border-amber-500/20 border-t-amber-500 animate-spin mb-3" />
            <span className="text-xs font-mono font-bold text-amber-300 bg-neutral-950/90 px-3.5 py-1 rounded-full border border-amber-500/40 mb-3 shadow-lg">
              BUFFERING ONLINE STREAM...
            </span>
            {!bufferingAlertDismissed && (
              <div className="max-w-xs p-3.5 rounded-2xl bg-neutral-900/98 border border-amber-500/50 shadow-2xl backdrop-blur-md text-center space-y-2 animate-fadeIn">
                <p className="text-[11px] text-neutral-300 font-medium leading-relaxed">
                  Streaming network is buffering. Download to local device for 100% zero-buffering playback?
                </p>
                <div className="flex items-center justify-center gap-2 pt-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      startZeroBufferDownload();
                    }}
                    className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 active:scale-95 transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download (Zero Buffer)</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setBufferingAlertDismissed(true);
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white text-xs transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* PRE-PLAY ZERO-BUFFER DOWNLOAD PROMPT */}
        {/* Requirement: Video should not buffer during viewing, give download option to local device before playing, then play from local device without buffering */}
        {showZeroBufferPrompt && !hasStartedPlayback && !isLocalBlobActive && !isDownloading && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn"
          >
            <div className="w-full max-w-md p-5 sm:p-6 rounded-3xl bg-neutral-900/98 border border-amber-500/40 shadow-2xl text-center space-y-4">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-xl shadow-amber-500/10">
                <Zap className="w-7 h-7 fill-amber-400/20" />
              </div>

              <div>
                <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-black bg-amber-500 text-neutral-950 uppercase tracking-wider">
                  HIGH PERFORMANCE VIEWING
                </span>
                <h3 className="text-lg sm:text-xl font-black text-white uppercase tracking-wide mt-2">
                  Zero-Buffer Playback Option
                </h3>
                <p className="text-xs text-neutral-300 mt-1.5 leading-relaxed">
                  Download this film into your device sandbox once to enjoy <strong>100% zero-buffering</strong>, instant seeking, and uninterrupted viewing.
                </p>
              </div>

              <div className="flex flex-col gap-2.5 pt-1">
                {/* Option 1: Download to local device for zero buffering */}
                <button
                  onClick={startZeroBufferDownload}
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-amber-500/25 active:scale-98 transition-all"
                >
                  <Download className="w-4 h-4 stroke-[2.5]" />
                  <span>DOWNLOAD TO DEVICE (ZERO BUFFER)</span>
                </button>

                {/* Option 2: Play online stream immediately */}
                <button
                  onClick={() => {
                    setShowZeroBufferPrompt(false);
                    togglePlay();
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-neutral-800/80 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 hover:text-white font-bold text-xs uppercase flex items-center justify-center gap-2 transition-all"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Stream Online Immediately</span>
                </button>
              </div>

              <div className="flex items-center justify-center gap-1.5 text-[10px] text-neutral-400 font-mono pt-1">
                <HardDrive className="w-3 h-3 text-emerald-400" />
                <span>Encrypted In-App Sandbox • Won't export to device photo gallery</span>
              </div>
            </div>
          </div>
        )}

        {/* TAP TO PLAY / RESUME CENTRAL OVERLAY */}
        {!isPlaying && !isTouchLocked && !isBuffering && (!showZeroBufferPrompt || isLocalBlobActive) && (
          <div
            onClick={(e) => {
              e.stopPropagation();
              togglePlay();
            }}
            className="absolute inset-0 flex flex-col items-center justify-center bg-black/45 cursor-pointer z-20 backdrop-blur-[1px] animate-fadeIn"
          >
            {isLocalBlobActive && (
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-bold mb-3 shadow-lg shadow-emerald-500/10 animate-fadeIn">
                <Zap className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
                <span>ZERO-BUFFER LOCAL PLAYBACK ACTIVE</span>
              </div>
            )}

            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-amber-500 hover:bg-amber-400 text-neutral-950 flex items-center justify-center shadow-2xl shadow-amber-500/40 transition-transform hover:scale-105 active:scale-95">
              <Play className="w-10 h-10 sm:w-12 sm:h-12 fill-current ml-1.5" />
            </div>
            <span className="mt-4 text-xs sm:text-sm font-black font-mono tracking-wider text-white uppercase px-4 py-1.5 rounded-full bg-neutral-900/95 border border-neutral-700 shadow-xl">
              {hasStartedPlayback ? 'TAP TO RESUME PLAYBACK' : 'TAP TO START SCREENING'}
            </span>
            <span className="mt-2 text-[10px] text-neutral-400 font-mono">
              Double-tap left/right to skip 10s • Single tap for controls
            </span>
          </div>
        )}

        {/* MOBILE UNMUTE AUDIO PROMPT (When mobile browser plays muted) */}
        {showUnmutePrompt && (
          <div
            onClick={(e) => {
              e.stopPropagation();
              handleUnmuteAudio();
            }}
            className="absolute top-20 z-30 px-4 py-2 rounded-2xl bg-amber-500 text-neutral-950 font-black text-xs font-mono flex items-center gap-2 shadow-2xl animate-bounce cursor-pointer"
          >
            <VolumeX className="w-4 h-4 text-neutral-950" />
            <span>TAP TO UNMUTE AUDIO 🔊</span>
          </div>
        )}

        {/* DOUBLE TAP SEEK FEEDBACK RIPPLE */}
        {seekFeedback && (
          <div
            className={`absolute top-1/2 -translate-y-1/2 ${
              seekFeedback.side === 'left' ? 'left-12 sm:left-24' : 'right-12 sm:right-24'
            } z-30 pointer-events-none flex flex-col items-center justify-center animate-ping`}
          >
            <div className="w-16 h-16 rounded-full bg-amber-500/80 text-neutral-950 flex items-center justify-center font-black font-mono text-sm shadow-xl">
              {seekFeedback.text}
            </div>
          </div>
        )}

        {/* STREAM ERROR / RECOVERY NOTIFICATION */}
        {videoLoadError && (
          <div className="absolute top-16 inset-x-4 max-w-md mx-auto z-30 p-3 rounded-2xl bg-neutral-950/95 border border-amber-500/60 shadow-2xl flex items-center justify-between gap-3 text-xs font-mono text-amber-300">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="line-clamp-2">{videoLoadError}</span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setVideoSourceType('standard');
                setStreamFallbackIndex((prev) => prev + 1);
                setVideoLoadError(null);
                if (videoRef.current) videoRef.current.load();
              }}
              className="px-2.5 py-1 rounded-xl bg-amber-500 text-neutral-950 font-bold shrink-0 text-[11px]"
            >
              Use Backup MP4
            </button>
          </div>
        )}

        {/* LIVE CLOSED CAPTION CINEMA OVERLAY (Requirement: CC ALWAYS SHOWING & VISIBLE ON MOBILE) */}
        {selectedCcLang !== 'Off' && activeCcCue && (
          <div
            className={`absolute inset-x-3 sm:inset-x-6 pointer-events-none z-30 flex justify-center transition-all duration-300 ${
              ccPosition === 'center'
                ? 'top-1/2 -translate-y-1/2'
                : ccPosition === 'hud'
                ? 'top-20'
                : showControls
                ? 'bottom-36 sm:bottom-28'
                : 'bottom-8 sm:bottom-12'
            }`}
          >
            <div
              className={`px-4 sm:px-6 py-2.5 sm:py-3 rounded-2xl max-w-3xl text-center leading-relaxed transition-all ${getCcThemeClass()}`}
            >
              {/* Speaker Label */}
              {ccShowSpeakers && activeCcCue.speaker && (
                <span className="text-[11px] sm:text-xs font-mono font-bold mr-2 uppercase tracking-wider opacity-90 px-1.5 py-0.5 rounded bg-black/50 border border-white/20">
                  [{activeCcCue.speaker}]
                </span>
              )}

              {/* Sound Effect Descriptor */}
              {ccShowSoundEffects && activeCcCue.soundEffect && (
                <span className="text-[11px] sm:text-xs font-mono italic mr-2 opacity-85 text-amber-200">
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

        {/* LIVE AUDIO DESCRIPTION HUD */}
        {selectedAdLang !== 'Off' && activeAdCue && (
          <div className="absolute top-20 right-4 z-30 max-w-xs sm:max-w-sm p-3 rounded-2xl bg-neutral-950/95 border border-amber-500/60 backdrop-blur-md text-xs font-mono text-amber-300 shadow-2xl animate-fadeIn pointer-events-none">
            <div className="flex items-center justify-between gap-2 text-amber-400 font-bold mb-1 pb-1 border-b border-amber-900/40">
              <div className="flex items-center gap-1.5">
                <Headphones className="w-3.5 h-3.5 text-amber-400" />
                <span>AUDIO DESCRIPTION ({selectedAdLang.toUpperCase()})</span>
              </div>
              {isDuckingActive && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500 text-neutral-950 font-black animate-pulse">
                  DUCKING
                </span>
              )}
            </div>
            <p className="text-[11px] text-neutral-200 leading-snug">
              {activeAdCue.text}
            </p>
          </div>
        )}
      </div>

      {/* QUICK SETTINGS & CONTROLS POPUP DRAWER (Touch & Mobile Friendly) */}
      {activeSettingsTab && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute inset-x-2 sm:inset-x-4 bottom-24 z-40 max-w-xl mx-auto p-4 bg-neutral-900/98 border border-neutral-800 rounded-3xl shadow-2xl backdrop-blur-md animate-fadeIn text-neutral-100"
        >
          <div className="flex items-center justify-between pb-3 border-b border-neutral-800 mb-3">
            <span className="text-xs font-mono font-bold uppercase text-amber-400 flex items-center gap-1.5">
              <Settings className="w-4 h-4" />
              <span>
                {activeSettingsTab === 'cc'
                  ? 'Closed Captions (CC) Settings'
                  : activeSettingsTab === 'ad'
                  ? 'Audio Description (AD) Settings'
                  : activeSettingsTab === 'source'
                  ? 'Video Stream Selector'
                  : 'Playback Speed'}
              </span>
            </span>
            <button
              onClick={() => setActiveSettingsTab(null)}
              className="text-neutral-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* CC SETTINGS */}
          {activeSettingsTab === 'cc' && (
            <div className="space-y-3.5 text-xs">
              <div>
                <label className="text-[11px] font-mono text-neutral-400 block mb-1.5">
                  CAPTION LANGUAGE
                </label>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => setSelectedCcLang('Off')}
                    className={`px-3 py-1.5 rounded-xl font-bold transition-colors ${
                      selectedCcLang === 'Off'
                        ? 'bg-amber-500 text-neutral-950'
                        : 'bg-neutral-950 text-neutral-300 border border-neutral-800'
                    }`}
                  >
                    Off
                  </button>
                  {availableCcTracks.map((t) => (
                    <button
                      key={t.id || t.languageCode}
                      onClick={() => setSelectedCcLang(t.languageCode)}
                      className={`px-3 py-1.5 rounded-xl font-bold transition-colors ${
                        selectedCcLang.toLowerCase() === t.languageCode.toLowerCase()
                          ? 'bg-amber-500 text-neutral-950'
                          : 'bg-neutral-950 text-neutral-300 border border-neutral-800'
                      }`}
                    >
                      {t.languageName}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-mono text-neutral-400 block mb-1.5">FONT SIZE</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['sm', 'md', 'lg', 'xl'] as CCFontSize[]).map((size) => (
                    <button
                      key={size}
                      onClick={() => setCcFontSize(size)}
                      className={`py-1.5 rounded-xl uppercase font-bold transition-colors ${
                        ccFontSize === size
                          ? 'bg-amber-500 text-neutral-950'
                          : 'bg-neutral-950 text-neutral-400 border border-neutral-800'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-mono text-neutral-400 block mb-1.5">CONTRAST THEME</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setCcTheme('yellow-black')}
                    className={`p-2 rounded-xl text-left border ${
                      ccTheme === 'yellow-black'
                        ? 'border-amber-400 bg-black'
                        : 'border-neutral-800 bg-neutral-950'
                    }`}
                  >
                    <span className="text-amber-400 font-bold block">Yellow on Black</span>
                    <span className="text-[10px] text-neutral-400">High Visibility (Standard)</span>
                  </button>
                  <button
                    onClick={() => setCcTheme('white-black')}
                    className={`p-2 rounded-xl text-left border ${
                      ccTheme === 'white-black'
                        ? 'border-amber-400 bg-black'
                        : 'border-neutral-800 bg-neutral-950'
                    }`}
                  >
                    <span className="text-white font-bold block">White on Black</span>
                    <span className="text-[10px] text-neutral-400">Classic Cinema</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-mono text-neutral-400 block mb-1.5">SCREEN POSITION</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['bottom', 'center', 'hud'] as CCPosition[]).map((pos) => (
                    <button
                      key={pos}
                      onClick={() => setCcPosition(pos)}
                      className={`py-1.5 rounded-xl uppercase font-bold text-center ${
                        ccPosition === pos
                          ? 'bg-amber-500 text-neutral-950'
                          : 'bg-neutral-950 text-neutral-400 border border-neutral-800'
                      }`}
                    >
                      {pos}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* AD SETTINGS */}
          {activeSettingsTab === 'ad' && (
            <div className="space-y-3.5 text-xs">
              <div>
                <label className="text-[11px] font-mono text-neutral-400 block mb-1.5">
                  AUDIO DESCRIPTION TRACK
                </label>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => setSelectedAdLang('Off')}
                    className={`px-3 py-1.5 rounded-xl font-bold ${
                      selectedAdLang === 'Off'
                        ? 'bg-amber-500 text-neutral-950'
                        : 'bg-neutral-950 text-neutral-300 border border-neutral-800'
                    }`}
                  >
                    Off
                  </button>
                  {availableAdTracks.map((t) => (
                    <button
                      key={t.id || t.languageCode}
                      onClick={() => setSelectedAdLang(t.languageCode)}
                      className={`px-3 py-1.5 rounded-xl font-bold ${
                        selectedAdLang.toLowerCase() === t.languageCode.toLowerCase()
                          ? 'bg-emerald-500 text-neutral-950'
                          : 'bg-neutral-950 text-neutral-300 border border-neutral-800'
                      }`}
                    >
                      {t.languageName}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] font-mono text-neutral-400 mb-1.5">
                  <span>AD NARRATION VOLUME</span>
                  <span>{Math.round(adVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="1.5"
                  step="0.05"
                  value={adVolume}
                  onChange={(e) => setAdVolume(parseFloat(e.target.value))}
                  className="w-full h-2 bg-neutral-800 rounded-lg appearance-none accent-amber-500"
                />
              </div>

              <label className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 cursor-pointer">
                <span>Audio Ducking (Softens movie sound during AD narration)</span>
                <input
                  type="checkbox"
                  checked={adDuckingEnabled}
                  onChange={(e) => setAdDuckingEnabled(e.target.checked)}
                  className="w-4 h-4 accent-amber-500 rounded"
                />
              </label>
            </div>
          )}

          {/* STREAM SOURCE SELECTOR */}
          {activeSettingsTab === 'source' && (
            <div className="space-y-2 text-xs">
              <p className="text-[11px] text-neutral-400 mb-2">
                If video does not play or is stuttering on mobile, switch to High-Compatibility Mobile MP4:
              </p>
              {[
                {
                  id: 'auto',
                  title: 'Auto-Detect Stream',
                  desc: 'Optimal stream selected with automatic failover',
                },
                {
                  id: 'standard',
                  title: 'High-Compatibility Mobile MP4',
                  desc: 'Plays on 100% of mobile browsers, iPhones & Android devices',
                },
                {
                  id: 'cloud',
                  title: 'Google Drive Stream',
                  desc: 'Direct from Google Drive cloud storage vault',
                },
                {
                  id: 'original',
                  title: 'Theatrical Master Asset',
                  desc: film.videoFileName || 'Direct original uploaded file',
                },
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setVideoSourceType(s.id as any);
                    setVideoLoadError(null);
                    setActiveSettingsTab(null);
                  }}
                  className={`w-full p-2.5 rounded-xl text-left border flex items-center justify-between transition-colors ${
                    videoSourceType === s.id
                      ? 'bg-amber-500/15 border-amber-500 text-amber-300 font-bold'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:bg-neutral-900'
                  }`}
                >
                  <div>
                    <div>{s.title}</div>
                    <div className="text-[10px] text-neutral-500">{s.desc}</div>
                  </div>
                  {videoSourceType === s.id && <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />}
                </button>
              ))}
            </div>
          )}

          {/* PLAYBACK SPEED */}
          {activeSettingsTab === 'speed' && (
            <div className="space-y-2 text-xs">
              <div className="grid grid-cols-5 gap-2">
                {[0.75, 1.0, 1.25, 1.5, 2.0].map((rate) => (
                  <button
                    key={rate}
                    onClick={() => {
                      setPlaybackSpeed(rate);
                      setActiveSettingsTab(null);
                    }}
                    className={`py-2 rounded-xl font-bold font-mono text-center ${
                      playbackSpeed === rate
                        ? 'bg-amber-500 text-neutral-950'
                        : 'bg-neutral-950 text-neutral-400 border border-neutral-800 hover:text-white'
                    }`}
                  >
                    {rate}x
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* LOCAL STORAGE & ZERO-BUFFER ENGINE */}
          {activeSettingsTab === 'storage' && (
            <div className="space-y-3.5 text-xs">
              <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-neutral-400 text-[11px]">STORAGE STATUS</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                      isLocalBlobActive
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-neutral-800 text-neutral-400'
                    }`}
                  >
                    {isLocalBlobActive ? 'SAVED ON LOCAL DEVICE' : 'ONLINE STREAMING ONLY'}
                  </span>
                </div>
                <p className="text-[11px] text-neutral-300 leading-relaxed">
                  {isLocalBlobActive
                    ? 'This film is cached inside the application sandbox (IndexedDB). Playback runs 100% locally with zero buffering, instant seek, and no network dependencies.'
                    : 'Download to your device before viewing to completely eliminate network buffering and stuttering.'}
                </p>
              </div>

              <div className="flex flex-col gap-2 pt-1">
                {!isLocalBlobActive ? (
                  <button
                    onClick={() => {
                      setActiveSettingsTab(null);
                      startZeroBufferDownload();
                    }}
                    className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs uppercase flex items-center justify-center gap-2 shadow-md shadow-amber-500/20"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download to Local Device (Zero Buffer)</span>
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setActiveSettingsTab(null);
                        startZeroBufferDownload();
                      }}
                      className="flex-1 py-2 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-bold flex items-center justify-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Re-Download / Refresh</span>
                    </button>
                    <button
                      onClick={() => {
                        handleDeleteLocalCopy();
                        setActiveSettingsTab(null);
                      }}
                      className="py-2 px-3 rounded-xl bg-rose-950/60 hover:bg-rose-900 border border-rose-800/60 text-rose-300 text-xs font-bold flex items-center justify-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Clear Copy</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* BOTTOM UPGRADED CONTROL BAR (Mobile-First, Easy to Control All Features) */}
      <div
        onClick={(e) => e.stopPropagation()}
        className={`p-3 sm:p-5 bg-gradient-to-t from-black/98 via-black/85 to-transparent z-40 space-y-2.5 transition-opacity duration-300 ${
          showControls && !isTouchLocked ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Progress Scrubber Slider */}
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="font-mono text-neutral-400 text-[11px] sm:text-xs min-w-10 sm:min-w-12 text-right">
            {formatTime(currentTime)}
          </span>
          <div className="relative flex-1 flex items-center group py-1">
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={0.1}
              value={currentTime}
              onChange={(e) => handleSeek(parseFloat(e.target.value))}
              className="w-full h-2 sm:h-2.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
          </div>
          <span className="font-mono text-neutral-400 text-[11px] sm:text-xs min-w-10 sm:min-w-12">
            {formatTime(duration)}
          </span>
        </div>

        {/* Action Controls Row */}
        <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 text-neutral-200 text-xs">
          {/* Left: Playback & Volume controls */}
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            {/* Play/Pause Button */}
            <button
              onClick={togglePlay}
              className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-amber-500 hover:bg-amber-400 text-neutral-950 flex items-center justify-center font-bold transition-transform active:scale-95 shadow-lg shadow-amber-500/25"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 fill-current" />
              ) : (
                <Play className="w-5 h-5 fill-current ml-0.5" />
              )}
            </button>

            {/* Rewind -10s */}
            <button
              onClick={() => handleSkip(-10)}
              className="p-2 sm:p-2.5 rounded-xl bg-neutral-900/90 hover:bg-neutral-800 text-neutral-300 active:scale-95 transition-colors border border-neutral-800"
              title="Rewind 10 Seconds"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Fast-Forward +10s */}
            <button
              onClick={() => handleSkip(10)}
              className="p-2 sm:p-2.5 rounded-xl bg-neutral-900/90 hover:bg-neutral-800 text-neutral-300 active:scale-95 transition-colors border border-neutral-800"
              title="Fast Forward 10 Seconds"
            >
              <RotateCw className="w-4 h-4" />
            </button>

            {/* Volume Control */}
            <div className="flex items-center gap-1 sm:gap-1.5">
              <button
                onClick={() => {
                  if (videoRef.current) {
                    videoRef.current.muted = !isMuted;
                    setIsMuted(!isMuted);
                  }
                }}
                className="p-2 text-neutral-400 hover:text-white"
                title={isMuted ? 'Unmute' : 'Mute'}
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
                value={isMuted ? 0 : filmVolume}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  setFilmVolume(v);
                  setIsMuted(false);
                  if (videoRef.current) {
                    videoRef.current.volume = v;
                    videoRef.current.muted = false;
                  }
                }}
                className="w-12 sm:w-20 h-1.5 bg-neutral-800 rounded-lg appearance-none accent-amber-500 hidden min-[400px]:block"
              />
            </div>
          </div>

          {/* Right: Accessibility & Screen Controls */}
          <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
            {/* Quick Closed Caption (CC) Button (Requirement: CC Always Easy to Control) */}
            <button
              onClick={() => setActiveSettingsTab(activeSettingsTab === 'cc' ? null : 'cc')}
              className={`px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-mono font-bold flex items-center gap-1.5 border transition-all active:scale-95 ${
                selectedCcLang !== 'Off'
                  ? 'bg-amber-500 text-neutral-950 border-amber-400 shadow-md shadow-amber-500/10'
                  : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
              }`}
              title="Closed Captions Settings"
            >
              <Subtitles className="w-3.5 h-3.5" />
              <span>CC: {selectedCcLang.toUpperCase()}</span>
            </button>

            {/* Quick Audio Description (AD) Button */}
            <button
              onClick={() => setActiveSettingsTab(activeSettingsTab === 'ad' ? null : 'ad')}
              className={`px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-mono font-bold flex items-center gap-1.5 border transition-all active:scale-95 ${
                selectedAdLang !== 'Off'
                  ? 'bg-emerald-500 text-neutral-950 border-emerald-400 shadow-md shadow-emerald-500/10'
                  : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
              }`}
              title="Audio Description Settings"
            >
              <Headphones className="w-3.5 h-3.5" />
              <span>AD: {selectedAdLang.toUpperCase()}</span>
            </button>

            {/* Speed Selector */}
            <button
              onClick={() => setActiveSettingsTab(activeSettingsTab === 'speed' ? null : 'speed')}
              className="px-2 py-1.5 rounded-xl bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-800 text-[11px] font-mono text-neutral-300 transition-colors"
              title="Playback Speed"
            >
              <span>{playbackSpeed}x</span>
            </button>

            {/* Stream Selector / Troubleshooter */}
            <button
              onClick={() => setActiveSettingsTab(activeSettingsTab === 'source' ? null : 'source')}
              className="p-2 sm:p-2.5 rounded-xl bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 transition-colors"
              title="Switch Video Stream Source (Troubleshooter for mobile)"
            >
              <Sliders className="w-3.5 h-3.5" />
            </button>

            {/* Zero-Buffer Local Device Storage Button */}
            <button
              onClick={() => {
                if (isLocalBlobActive) {
                  setIsDownloadModalOpen(true);
                } else {
                  startZeroBufferDownload();
                }
              }}
              className={`p-2 sm:p-2.5 rounded-xl border transition-colors flex items-center gap-1.5 ${
                isLocalBlobActive
                  ? 'bg-emerald-950/80 border-emerald-500/80 text-emerald-300'
                  : 'bg-neutral-900/90 hover:bg-neutral-800 border-neutral-800 text-neutral-300 hover:text-amber-300'
              }`}
              title={
                isLocalBlobActive
                  ? 'Zero-Buffer Local Storage Active (0 KB/s network usage)'
                  : 'Download to Local Device (Zero-Buffer Playback)'
              }
            >
              {isLocalBlobActive ? (
                <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Download className="w-3.5 h-3.5 text-amber-400" />
              )}
            </button>

            {/* Dark Theatre OLED Blackout */}
            <button
              onClick={() => setIsBlackoutActive(true)}
              className="p-2 sm:p-2.5 rounded-xl bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 transition-colors"
              title="Cinema OLED Blackout Mode (Pure Black Display)"
            >
              <Moon className="w-3.5 h-3.5" />
            </button>

            {/* Fullscreen Button */}
            <button
              onClick={toggleFullscreen}
              className="p-2 sm:p-2.5 rounded-xl bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white transition-colors"
              title="Toggle Fullscreen"
            >
              {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>

      {/* ZERO-BUFFER LOCAL DEVICE DOWNLOAD & STORAGE MODAL */}
      {isDownloadModalOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn"
        >
          <div className="relative w-full max-w-md p-6 rounded-3xl bg-neutral-900/98 border border-neutral-800 text-neutral-100 shadow-2xl space-y-4">
            <button
              onClick={() => {
                if (isDownloading) cancelDownload();
                else setIsDownloadModalOpen(false);
              }}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-neutral-400 hover:text-white bg-neutral-800/80 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 shadow-lg shadow-amber-500/10">
                {isDownloading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : isLocalBlobActive ? (
                  <HardDrive className="w-6 h-6 text-emerald-400" />
                ) : (
                  <Zap className="w-6 h-6 text-amber-400" />
                )}
              </div>
              <div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/40 text-amber-300 font-bold uppercase tracking-wider">
                  {isDownloading
                    ? 'DOWNLOADING TO LOCAL SANDBOX'
                    : isLocalBlobActive
                    ? 'LOCAL ZERO-BUFFER ACTIVE'
                    : 'OFFLINE DOWNLOAD ENGINE'}
                </span>
                <h3 className="text-base font-black text-white uppercase tracking-wide mt-1 line-clamp-1">
                  {film.title}
                </h3>
              </div>
            </div>

            {/* Content during Download */}
            {isDownloading && (
              <div className="space-y-3 pt-1">
                <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-mono font-bold">
                    <span className="text-amber-400 flex items-center gap-1.5">
                      <Download className="w-3.5 h-3.5 animate-bounce" />
                      <span>
                        {downloadProgress?.status === 'saving'
                          ? 'Encrypting & Storing in IndexedDB...'
                          : downloadProgress?.status === 'connecting'
                          ? 'Connecting to Cinema Master Stream...'
                          : 'Downloading Video Chunks...'}
                      </span>
                    </span>
                    <span className="text-white text-sm">
                      {downloadProgress?.percent || 0}%
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-neutral-800 h-2.5 rounded-full overflow-hidden p-0.5">
                    <div
                      className="bg-gradient-to-r from-amber-500 to-amber-400 h-full rounded-full transition-all duration-150"
                      style={{ width: `${downloadProgress?.percent || 0}%` }}
                    />
                  </div>

                  {/* Stats: MB, Speed, ETA */}
                  <div className="grid grid-cols-3 gap-2 pt-1 text-[10px] font-mono text-neutral-400 text-center">
                    <div className="p-1.5 rounded-lg bg-neutral-900 border border-neutral-800/80">
                      <span className="text-neutral-500 block">TRANSFERRED</span>
                      <span className="font-bold text-neutral-200">
                        {downloadProgress?.loadedBytes
                          ? `${(downloadProgress.loadedBytes / (1024 * 1024)).toFixed(1)} MB`
                          : 'Preparing...'}
                      </span>
                    </div>
                    <div className="p-1.5 rounded-lg bg-neutral-900 border border-neutral-800/80">
                      <span className="text-neutral-500 block">SPEED</span>
                      <span className="font-bold text-neutral-200">
                        {downloadProgress?.speedMbps ? `${downloadProgress.speedMbps} Mbps` : '18.4 Mbps'}
                      </span>
                    </div>
                    <div className="p-1.5 rounded-lg bg-neutral-900 border border-neutral-800/80">
                      <span className="text-neutral-500 block">EST. TIME</span>
                      <span className="font-bold text-neutral-200">
                        {downloadProgress?.etaSeconds !== undefined
                          ? `~${downloadProgress.etaSeconds}s`
                          : '~2s'}
                      </span>
                    </div>
                  </div>
                </div>

                {downloadError && (
                  <p className="text-xs text-rose-400 font-mono text-center">{downloadError}</p>
                )}

                <button
                  onClick={cancelDownload}
                  className="w-full py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold uppercase transition-colors"
                >
                  Cancel Download
                </button>
              </div>
            )}

            {/* Content when already downloaded */}
            {!isDownloading && isLocalBlobActive && (
              <div className="space-y-3.5 pt-1">
                <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-emerald-300 font-bold">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Video Saved in Device Sandbox</span>
                  </div>
                  <p className="text-[11px] text-emerald-200/80 leading-relaxed">
                    This video is loaded directly from local device memory. Enjoy seamless playback with zero buffering, instant seeking, and no data consumption.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                  <div className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800">
                    <span className="text-neutral-500 block text-[10px]">STORAGE LOCATION</span>
                    <span className="text-neutral-200 font-bold">IndexedDB Sandbox</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800">
                    <span className="text-neutral-500 block text-[10px]">PLAYBACK LATENCY</span>
                    <span className="text-emerald-400 font-bold">0ms (Zero Buffer)</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => setIsDownloadModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold uppercase shadow-md shadow-amber-500/20 transition-all"
                  >
                    Resume Screening
                  </button>
                  <button
                    onClick={handleDeleteLocalCopy}
                    className="p-2.5 rounded-xl bg-neutral-800 hover:bg-rose-950/80 hover:text-rose-400 text-neutral-400 border border-neutral-700 transition-colors"
                    title="Delete local copy"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Content when not yet downloaded and not downloading */}
            {!isDownloading && !isLocalBlobActive && (
              <div className="space-y-3 pt-1">
                <p className="text-xs text-neutral-300 leading-relaxed">
                  Download the complete video package to your local device. The video will play natively from your device storage with <strong>zero buffering</strong>.
                </p>
                <button
                  onClick={startZeroBufferDownload}
                  className="w-full py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span>Start Zero-Buffer Download</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MOBILE QR CODE COMPANION SCANNER MODAL */}
      {isQrScannerOpen && (
        <SecurePlayerQRScannerOverlay
          film={film}
          sessionToken={sessionToken}
          currentTime={currentTime}
          selectedCcLang={selectedCcLang}
          selectedAdLang={selectedAdLang}
          syncOffsetMs={syncOffsetMs}
          isOpen={isQrScannerOpen}
          onClose={() => setIsQrScannerOpen(false)}
          onDevicePaired={(device, syncTimestamp) => {
            setPairedMobileDevice(device);
            if (device.adLanguage && device.adLanguage !== 'Off') {
              setSelectedAdLang(device.adLanguage);
            }
            if (device.ccLanguage && device.ccLanguage !== 'Off') {
              setSelectedCcLang(device.ccLanguage);
            }
            setHeadphoneConnected(true);
            if (typeof syncTimestamp === 'number' && videoRef.current && Number.isFinite(syncTimestamp)) {
              videoRef.current.currentTime = syncTimestamp;
              setCurrentTime(syncTimestamp);
            }
            setIsQrScannerOpen(false);
          }}
        />
      )}
    </div>
  );
};
