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
  Radio,
  X,
  RotateCcw,
  RotateCw,
  AlertCircle,
  ShieldCheck,
  CheckCircle2,
  Download,
  HardDrive,
  Check,
  Loader2,
  ChevronDown,
  Heart,
  MoreVertical,
  ArrowLeft,
  Search,
  User as UserIcon,
  Globe,
  Smartphone,
  Sparkles,
  Zap,
  Sliders,
  Info,
  Film as FilmIcon,
  Wifi,
  Battery,
} from 'lucide-react';
import { Film, AccessibilityTrack, User } from '../types/cinemaPlatform';
import { speechNarrator } from '../services/speechSynthesisService';
import { acousticSync, AcousticAnalysisData } from '../services/acousticSyncService';
import { offlineStorage, DownloadProgress } from '../services/offlineStorageService';
import { parseSubtitleText } from '../utils/mediaParser';
import { PlatformMode } from '../utils/platformEnvironment';

interface SecurePlayerProps {
  film: Film;
  sessionToken: string;
  watermark: string;
  onClose: () => void;
  isOfflineMode?: boolean;
  platformMode?: PlatformMode;
  onTogglePlatformMode?: (mode: PlatformMode) => void;
  currentUser?: User | null;
}

// Resilient fallback streams verified to play reliably with byte-range support
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
  platformMode = 'website',
  onTogglePlatformMode,
  currentUser,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 1. In-Player Platform View Mode: Desktop Website View vs Mobile App View
  const [activePlatformView, setActivePlatformView] = useState<PlatformMode>(platformMode);

  // Sync with prop if it changes externally
  useEffect(() => {
    setActivePlatformView(platformMode);
  }, [platformMode]);

  const handleSwitchPlatformView = (mode: PlatformMode) => {
    setActivePlatformView(mode);
    if (onTogglePlatformMode) {
      onTogglePlatformMode(mode);
    }
  };

  // 2. Playback State
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isBuffering, setIsBuffering] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(() => (film.durationMinutes || 120) * 60);
  const [volume, setVolume] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [showControls, setShowControls] = useState<boolean>(true);
  const [streamFallbackIndex, setStreamFallbackIndex] = useState<number>(0);
  const [videoLoadError, setVideoLoadError] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState<boolean>(false);
  const [showSettingsDrawer, setShowSettingsDrawer] = useState<boolean>(false);

  // 3. Zero-Buffer Local Device Sandbox State
  const [localBlobUrl, setLocalBlobUrl] = useState<string | null>(null);
  const [isLocalBlobActive, setIsLocalBlobActive] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState<boolean>(false);

  // Check local offline storage on startup
  useEffect(() => {
    let isMounted = true;
    const checkLocal = async () => {
      try {
        const hasBlob = await offlineStorage.hasLocalVideoBlob(film.id);
        if (hasBlob && isMounted) {
          const blobUrl = await offlineStorage.getLocalBlobUrl(film.id);
          if (blobUrl && isMounted) {
            setLocalBlobUrl(blobUrl);
            setIsLocalBlobActive(true);
          }
        }
      } catch (e) {
        console.warn('Error reading local video blob cache:', e);
      }
    };
    checkLocal();
    return () => {
      isMounted = false;
    };
  }, [film.id]);

  // 4. Resolve Best Playable Video URL
  const resolvedVideoUrl = useMemo(() => {
    // 1st Priority: Valid sandboxed local device blob for instant zero-buffering
    if (localBlobUrl) {
      return localBlobUrl;
    }

    // 2nd Priority: Error fallback cycling
    if (videoLoadError) {
      return HIGH_COMPATIBILITY_STREAMS[streamFallbackIndex % HIGH_COMPATIBILITY_STREAMS.length];
    }

    // 3rd Priority: Film's specific video URL if playable
    if (
      film.videoFileUrl &&
      !film.videoFileUrl.includes('gtv-videos-bucket') &&
      !film.videoFileUrl.endsWith('.tar') &&
      !film.videoFileUrl.endsWith('.dcp') &&
      !film.videoFileUrl.endsWith('.mxf')
    ) {
      return film.videoFileUrl;
    }

    // 4th Priority: Direct session streaming gateway
    if (sessionToken && !sessionToken.startsWith('offline_')) {
      return `/api/playback/video/${sessionToken}`;
    }

    // 5th Priority: Drive stream or high-compatibility master
    if (film.driveFileId) {
      return `/api/drive/stream/${film.driveFileId}`;
    }

    return HIGH_COMPATIBILITY_STREAMS[0];
  }, [localBlobUrl, videoLoadError, streamFallbackIndex, film.videoFileUrl, film.driveFileId, sessionToken]);

  // Handle URL change
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.load();
      if (isPlaying) {
        videoRef.current.play().catch((e) => {
          console.warn('Playback resume required gesture:', e);
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

  // Apply volume & mute
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = isMuted ? 0 : volume;
      videoRef.current.muted = isMuted;
    }
  }, [volume, isMuted]);

  // 5. Audio Description (AD) Tracks & Controls
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
        languageName: `${filmLang} (AD)`,
        fileUrl: `/storage/tracks/ad_${film.id}_${filmCode}.mp3`,
        fileName: `ad_${filmCode}.mp3`,
        format: 'MP3',
        version: '1.0',
        status: 'valid',
        cues: [
          {
            id: 'ad-cue-1',
            startTime: 0,
            endTime: 8,
            text: `Statutory theatrical certification sequence commences for ${film.title}. The auditorium settles as the main title appears.`,
          },
          {
            id: 'ad-cue-2',
            startTime: 8,
            endTime: 20,
            text: `Establishing panoramic vista: Dramatic atmospheric score plays while central figures advance across the terrain.`,
          },
          {
            id: 'ad-cue-3',
            startTime: 20,
            endTime: 34,
            text: `High-contrast cinematic lighting reveals key character expressions during the dialogue sequence.`,
          },
        ],
      },
      {
        id: `auto-ad-${film.id}-en`,
        filmId: film.id,
        type: 'AD',
        languageCode: 'en',
        languageName: 'English (AD)',
        fileUrl: `/storage/tracks/ad_${film.id}_en.mp3`,
        fileName: `ad_en.mp3`,
        format: 'MP3',
        version: '1.0',
        status: 'valid',
        cues: [
          {
            id: 'ad-cue-en-1',
            startTime: 0,
            endTime: 8,
            text: `Visual Scene Description: The statutory cinema certification emblem appears for ${film.title}. The title sequence commences.`,
          },
          {
            id: 'ad-cue-en-2',
            startTime: 8,
            endTime: 20,
            text: `Visual scene description in English: Wide panoramic shot introduces the central dramatic sequence under theatrical lighting.`,
          },
        ],
      },
    ];
  }, [film]);

  const [isAdEnabled, setIsAdEnabled] = useState<boolean>(true);
  const [selectedAdLang, setSelectedAdLang] = useState<string>(() => {
    return availableAdTracks.length > 0 ? availableAdTracks[0].languageCode : 'en';
  });
  const [isAdDropdownOpen, setIsAdDropdownOpen] = useState<boolean>(false);
  const [isDuckingActive, setIsDuckingActive] = useState<boolean>(false);

  // Active AD track
  const currentAdTrack = useMemo(() => {
    if (!isAdEnabled) return null;
    return (
      availableAdTracks.find(
        (t) =>
          t.languageCode.toLowerCase() === selectedAdLang.toLowerCase() ||
          t.id.toLowerCase() === selectedAdLang.toLowerCase()
      ) ||
      availableAdTracks[0] ||
      null
    );
  }, [availableAdTracks, selectedAdLang, isAdEnabled]);

  // Active AD Cue matching current playback time (single source of truth: startTime <= currentTime < endTime)
  const activeAdCue = useMemo(() => {
    if (!isAdEnabled || !currentAdTrack) return null;
    const cues = currentAdTrack.cues || [];

    // Direct timestamp match: startTime <= currentTime < endTime
    const directMatch = cues.find((c) => currentTime >= c.startTime && currentTime < c.endTime);
    return directMatch || null;
  }, [isAdEnabled, currentAdTrack, currentTime]);

  // Immediately cancel existing speech when AD language changes or is disabled
  useEffect(() => {
    speechNarrator.stop();
    speechNarrator.resetLastCue();
    if (videoRef.current && !isMuted) {
      videoRef.current.volume = volume;
      setIsDuckingActive(false);
    }
  }, [selectedAdLang, isAdEnabled, volume, isMuted]);

  // Audio Description Narration (TTS with gentle Audio Ducking)
  useEffect(() => {
    if (isAdEnabled && activeAdCue && isPlaying) {
      // Soften main film audio during visual scene description
      if (videoRef.current) {
        videoRef.current.volume = Math.max(0.15, volume * 0.3);
        setIsDuckingActive(true);
      }

      speechNarrator.speak(
        activeAdCue.id,
        activeAdCue.text,
        currentAdTrack?.languageName || 'English',
        1.0,
        1.0
      );

      const cueDurationMs = Math.max(2500, (activeAdCue.endTime - activeAdCue.startTime) * 1000);
      const timer = setTimeout(() => {
        if (videoRef.current && !isMuted) {
          videoRef.current.volume = volume;
          setIsDuckingActive(false);
        }
      }, cueDurationMs);

      return () => clearTimeout(timer);
    } else {
      speechNarrator.stop();
      if (videoRef.current && !isMuted) {
        videoRef.current.volume = volume;
        setIsDuckingActive(false);
      }
    }
  }, [activeAdCue, isAdEnabled, isPlaying, volume, currentAdTrack, isMuted]);

  // 6. Closed Captions (CC) Tracks & Controls
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
            id: 'c-1',
            startTime: 0,
            endTime: 7,
            speaker: 'CBFC CINEAD',
            text: `We have to protect this place for the next generation.`,
            soundEffect: 'Opening overture ♪',
          },
          {
            id: 'c-2',
            startTime: 7,
            endTime: 16,
            speaker: 'LEAD PROTAGONIST',
            text: `The statutory theatrical certification sequence has commenced. Stand firm.`,
            soundEffect: 'Dramatic orchestral crescendo ♪',
          },
          {
            id: 'c-3',
            startTime: 16,
            endTime: 25,
            speaker: 'NARRATOR',
            text: `Production house: ${film.productionHouseName}. All accessibility tracks certified under CBFC guidelines.`,
            soundEffect: 'Low-frequency bass reverberation',
          },
          {
            id: 'c-4',
            startTime: 25,
            endTime: 35,
            speaker: 'SUPPORTING CAST',
            text: `Energy matrix synchronized at one hundred percent. Our destiny awaits.`,
            soundEffect: 'Atmospheric strings ♪',
          },
        ],
      },
      {
        id: `auto-cc-${film.id}-en`,
        filmId: film.id,
        type: 'CC',
        languageCode: 'en',
        languageName: 'English',
        fileUrl: `/storage/tracks/cc_${film.id}_en.vtt`,
        fileName: `cc_en.vtt`,
        format: 'VTT',
        version: '1.0',
        status: 'valid',
        cues: [
          {
            id: 'c-en-1',
            startTime: 0,
            endTime: 7,
            speaker: 'NARRATOR',
            text: `We have to protect this place for the next generation.`,
            soundEffect: 'Opening orchestral score ♪',
          },
          {
            id: 'c-en-2',
            startTime: 7,
            endTime: 16,
            speaker: 'HERO',
            text: `No one steps past the sacred eastern gates of the fortress.`,
            soundEffect: 'Wind sweeping across arena',
          },
          {
            id: 'c-en-3',
            startTime: 16,
            endTime: 26,
            speaker: 'COMMANDER',
            text: `Three thousand warriors approach Sector 4. Hold the perimeter!`,
            soundEffect: 'Thunderous engine thrusters ignite ♪',
          },
        ],
      },
      {
        id: `auto-cc-${film.id}-hi`,
        filmId: film.id,
        type: 'CC',
        languageCode: 'hi',
        languageName: 'Hindi',
        fileUrl: `/storage/tracks/cc_${film.id}_hi.srt`,
        fileName: `cc_hi.srt`,
        format: 'SRT',
        version: '1.0',
        status: 'valid',
        cues: [
          {
            id: 'c-hi-1',
            startTime: 0,
            endTime: 7,
            speaker: 'नायक',
            text: `हमें आने वाली पीढ़ी के लिए इस पवित्र स्थल की रक्षा करनी होगी।`,
            soundEffect: 'धीमा गूंजता हुआ वायुमंडलीय संगीत ♪',
          },
          {
            id: 'c-hi-2',
            startTime: 7,
            endTime: 16,
            speaker: 'भैरव',
            text: `काशी का यह अंतिम द्वार कोई पार नहीं कर सकता। लक्ष्य सामने है।`,
            soundEffect: 'इंजन की तीव्र गड़गड़ाहट',
          },
        ],
      },
      {
        id: `auto-cc-${film.id}-bn`,
        filmId: film.id,
        type: 'CC',
        languageCode: 'bn',
        languageName: 'Bengali',
        fileUrl: `/storage/tracks/cc_${film.id}_bn.srt`,
        fileName: `cc_bn.srt`,
        format: 'SRT',
        version: '1.0',
        status: 'valid',
        cues: [
          {
            id: 'c-bn-1',
            startTime: 0,
            endTime: 7,
            speaker: 'বর্ণনাকারী',
            text: `আমাদের আগামী প্রজন্মের জন্য এই স্থানটিকে রক্ষা করতে হবে।`,
            soundEffect: 'গভীর সুরেলা সংগীত ♪',
          },
          {
            id: 'c-bn-2',
            startTime: 7,
            endTime: 16,
            speaker: 'ভৈরব',
            text: `এই সীমানা কেউ অতিক্রম করতে পারবে না। আমাদের সংকল্প অটুট।`,
            soundEffect: 'ঝড়ের গর্জন',
          },
        ],
      },
    ];
  }, [film]);

  const [isCcEnabled, setIsCcEnabled] = useState<boolean>(true);
  const [selectedCcLang, setSelectedCcLang] = useState<string>(() => {
    return availableCcTracks.length > 0 ? availableCcTracks[0].languageCode : 'en';
  });
  const [isCcDropdownOpen, setIsCcDropdownOpen] = useState<boolean>(false);

  // Active CC track
  const currentCcTrack = useMemo(() => {
    if (!isCcEnabled) return null;
    return (
      availableCcTracks.find(
        (t) =>
          t.languageCode.toLowerCase() === selectedCcLang.toLowerCase() ||
          t.id.toLowerCase() === selectedCcLang.toLowerCase()
      ) ||
      availableCcTracks[0] ||
      null
    );
  }, [availableCcTracks, selectedCcLang, isCcEnabled]);

  // Real-time Synchronized Closed Caption Cue: startTime <= currentTime < endTime
  const activeCcCue = useMemo(() => {
    if (!isCcEnabled || !currentCcTrack) return null;
    const cues = currentCcTrack.cues || [];

    // Direct timestamp match: startTime <= currentTime < endTime
    const directMatch = cues.find((c) => currentTime >= c.startTime && currentTime < c.endTime);
    return directMatch || null;
  }, [isCcEnabled, currentCcTrack, currentTime]);

  // Controls auto-hide timer
  const resetControlsTimeout = useCallback(() => {
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    setShowControls(true);
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
        setIsAdDropdownOpen(false);
        setIsCcDropdownOpen(false);
      }, 4000);
    }
  }, [isPlaying]);

  // Play / Pause Toggle
  const togglePlay = async () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
      speechNarrator.stop();
      setIsDuckingActive(false);
    } else {
      try {
        await videoRef.current.play();
        setIsPlaying(true);
        setIsBuffering(false);
        resetControlsTimeout();
      } catch (err) {
        console.warn('Direct unmuted play blocked by browser, auto-attempting muted play:', err);
        if (videoRef.current) {
          videoRef.current.muted = true;
          setIsMuted(true);
          try {
            await videoRef.current.play();
            setIsPlaying(true);
            setIsBuffering(false);
          } catch (e) {
            console.error('Video play failure:', e);
            setVideoLoadError('Playback was interrupted. Click Retry Playback to reload.');
          }
        }
      }
    }
  };

  // Seek handler
  const handleSeek = (newTime: number) => {
    if (!videoRef.current) return;
    const max = duration || 100;
    const clamped = Math.max(0, Math.min(max, newTime));
    videoRef.current.currentTime = clamped;
    setCurrentTime(clamped);
    speechNarrator.resetLastCue();
    speechNarrator.stop();
  };

  const handleSkip = (delta: number) => {
    handleSeek(currentTime + delta);
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

  // Zero-Buffer Download Controller
  const startZeroBufferDownload = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    setIsDownloadModalOpen(true);
    try {
      const streamUrl = film.videoFileUrl && !film.videoFileUrl.includes('gtv-videos-bucket')
        ? film.videoFileUrl
        : '/videos/theatrical_master_kalki.mp4';
      const result = await offlineStorage.downloadVideoForZeroBufferPlayback(
        film.id,
        film.title,
        streamUrl,
        (prog) => setDownloadProgress(prog),
        film
      );
      setLocalBlobUrl(result.blobUrl);
      setIsLocalBlobActive(true);
      setIsDownloading(false);
      setTimeout(() => setIsDownloadModalOpen(false), 500);
    } catch (err) {
      console.error('Download error:', err);
      setIsDownloading(false);
    }
  };

  // Time format helper (hh:mm:ss or mm:ss)
  const formatTime = (seconds: number) => {
    const total = Math.floor(Math.max(0, seconds));
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
      onClick={() => {
        setIsAdDropdownOpen(false);
        setIsCcDropdownOpen(false);
      }}
      className="fixed inset-0 z-50 bg-neutral-950/98 text-neutral-100 flex flex-col overflow-y-auto selection:bg-amber-500 selection:text-neutral-950 font-sans"
    >
      {/* ============================================================== */}
      {/* TOP APPLICATION / PLATFORM NAVIGATION BAR */}
      {/* ============================================================== */}
      <header className="sticky top-0 z-40 bg-neutral-950/95 backdrop-blur-md border-b border-neutral-800 px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        {/* Logo & Brand */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500 flex items-center justify-center text-neutral-950 font-black shadow-md shadow-amber-500/20">
              <FilmIcon className="w-4 h-4 fill-current" />
            </div>
            <span className="text-base sm:text-lg font-black tracking-wider text-white">
              CINE<span className="text-amber-400">AD</span>
            </span>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-5 ml-6 text-xs font-semibold text-neutral-400">
            <span className="text-amber-400 font-bold">Home</span>
            <span className="hover:text-white transition-colors cursor-pointer">Films</span>
            <span className="hover:text-white transition-colors cursor-pointer">My Watchlist</span>
            <span className="hover:text-white transition-colors cursor-pointer">Accessibility</span>
            <span className="hover:text-white transition-colors cursor-pointer">Profile</span>
          </nav>
        </div>

        {/* Right Controls: Platform Switcher (Website vs Mobile App) + User Profile + Close */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Platform Mode Selector (Website vs App) */}
          <div className="flex items-center bg-neutral-900 p-0.5 rounded-xl border border-neutral-800 text-[11px] font-mono">
            <button
              onClick={() => handleSwitchPlatformView('website')}
              className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-all ${
                activePlatformView === 'website'
                  ? 'bg-amber-500 text-neutral-950 font-bold shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
              title="Desktop Website Playback Interface"
            >
              <Globe className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Desktop Website</span>
              <span className="sm:hidden">Web</span>
            </button>
            <button
              onClick={() => handleSwitchPlatformView('app')}
              className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-all ${
                activePlatformView === 'app'
                  ? 'bg-amber-500 text-neutral-950 font-bold shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
              title="Mobile App Playback Interface"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Mobile App</span>
              <span className="sm:hidden">App</span>
            </button>
          </div>

          {/* User Name & Avatar */}
          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-xl bg-neutral-900 border border-neutral-800 text-xs">
            <div className="w-6 h-6 rounded-full bg-neutral-800 flex items-center justify-center text-neutral-300">
              <UserIcon className="w-3.5 h-3.5" />
            </div>
            <span className="text-neutral-200 font-medium truncate max-w-[120px]">
              {currentUser?.productionHouseName || 'User Account'}
            </span>
          </div>

          {/* Close Screening Button */}
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-800 transition-colors"
            title="Exit Player"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ============================================================== */}
      {/* MAIN PLAYBACK VIEWPORT: SUPPORTS DESKTOP WEBSITE & MOBILE APP */}
      {/* ============================================================== */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* ------------------------------------------------------------ */}
        {/* DESKTOP WEBSITE PLAYBACK INTERFACE */}
        {/* ------------------------------------------------------------ */}
        {activePlatformView === 'website' ? (
          <div className="space-y-6 animate-fadeIn">
            {/* Film Title Header */}
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight uppercase">
                {film.title}
              </h1>
              <p className="text-xs sm:text-sm text-neutral-400 mt-1 font-mono">
                Directed by {film.director || 'Director'} &nbsp;|&nbsp; 2024 &nbsp;|&nbsp;{' '}
                {film.durationMinutes ? `${Math.floor(film.durationMinutes / 60)}h ${film.durationMinutes % 60}m` : '2h 15m'}
              </p>
            </div>

            {/* THREE SECTIONS IN TOP PLAYBACK AREA */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
              {/* SECTION 1: MAIN VIDEO PLAYER (Span 7 cols on desktop) */}
              <div className="lg:col-span-7 flex flex-col rounded-2xl bg-neutral-900/90 border border-neutral-800 overflow-hidden shadow-2xl">
                {/* Section 1 Header */}
                <div className="px-4 py-3 bg-neutral-900 border-b border-neutral-800 flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                    1
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-white tracking-wide">Video Player</h3>
                    <p className="text-[10px] text-neutral-400">Main film playback area</p>
                  </div>
                </div>

                {/* Section 1 Video Container */}
                <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden group">
                  <video
                    ref={videoRef}
                    src={resolvedVideoUrl}
                    onTimeUpdate={() => {
                      if (videoRef.current) {
                        setCurrentTime(videoRef.current.currentTime);
                        const dur = videoRef.current.duration;
                        if (dur && !isNaN(dur) && dur > 0) setDuration(dur);
                      }
                    }}
                    onWaiting={() => {
                      if (!isLocalBlobActive) setIsBuffering(true);
                    }}
                    onPlaying={() => {
                      setIsPlaying(true);
                      setIsBuffering(false);
                    }}
                    onCanPlay={() => setIsBuffering(false)}
                    onCanPlayThrough={() => setIsBuffering(false)}
                    onLoadedMetadata={() => {
                      setIsBuffering(false);
                      if (videoRef.current?.duration) setDuration(videoRef.current.duration);
                    }}
                    onEnded={() => {
                      setIsPlaying(false);
                      speechNarrator.stop();
                      speechNarrator.resetLastCue();
                    }}
                    onSeeked={() => {
                      speechNarrator.stop();
                      speechNarrator.resetLastCue();
                    }}
                    onError={() => {
                      console.warn('Video playback error, activating fallback stream');
                      if (isLocalBlobActive) {
                        setLocalBlobUrl(null);
                        setIsLocalBlobActive(false);
                      }
                      setStreamFallbackIndex((prev) => prev + 1);
                      setVideoLoadError('Playback error encountered. Using high-compatibility backup stream.');
                    }}
                    playsInline
                    preload="auto"
                    className="w-full h-full object-contain"
                  />

                  {/* Buffering Spinner */}
                  {isBuffering && !isLocalBlobActive && (
                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center z-20">
                      <Loader2 className="w-10 h-10 text-amber-500 animate-spin mb-2" />
                      <span className="text-xs font-mono text-amber-300">Buffering Stream...</span>
                    </div>
                  )}

                  {/* Playback Error Recovery Banner */}
                  {videoLoadError && (
                    <div className="absolute top-3 inset-x-3 z-30 p-2.5 rounded-xl bg-neutral-950/95 border border-amber-500/60 flex items-center justify-between gap-2 text-xs font-mono text-amber-300 shadow-xl">
                      <div className="flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                        <span className="line-clamp-1">{videoLoadError}</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setVideoLoadError(null);
                          setStreamFallbackIndex((prev) => prev + 1);
                          if (videoRef.current) videoRef.current.load();
                        }}
                        className="px-2.5 py-1 rounded-lg bg-amber-500 text-neutral-950 font-bold text-[11px] shrink-0"
                      >
                        Retry Playback
                      </button>
                    </div>
                  )}

                  {/* Statutory Watermark */}
                  <div className="absolute top-2.5 right-2.5 z-20 pointer-events-none opacity-40 font-mono text-[9px] text-amber-300">
                    {watermark}
                  </div>

                  {/* Video Controls Bar Overlay */}
                  <div
                    className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/80 to-transparent p-3 pt-6 z-30 flex flex-col gap-2 transition-opacity duration-200 ${
                      showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
                    }`}
                  >
                    {/* Scrubber Timeline */}
                    <input
                      type="range"
                      min={0}
                      max={duration || 100}
                      step={0.1}
                      value={currentTime}
                      onChange={(e) => handleSeek(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                    />

                    {/* Controls Row */}
                    <div className="flex items-center justify-between text-white text-xs">
                      {/* Left: Play/Pause, Timestamp, Volume */}
                      <div className="flex items-center gap-2 sm:gap-3">
                        <button
                          onClick={togglePlay}
                          className="p-1.5 rounded-lg hover:bg-neutral-800 text-white transition-colors"
                          title={isPlaying ? 'Pause' : 'Play'}
                        >
                          {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                        </button>

                        <span className="font-mono text-[11px] text-neutral-300">
                          {formatTime(currentTime)} / {formatTime(duration)}
                        </span>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setIsMuted(!isMuted)}
                            className="p-1 hover:text-amber-400 transition-colors"
                          >
                            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
                          </button>
                          <input
                            type="range"
                            min={0}
                            max={1}
                            step={0.05}
                            value={isMuted ? 0 : volume}
                            onChange={(e) => {
                              const v = parseFloat(e.target.value);
                              setVolume(v);
                              setIsMuted(false);
                            }}
                            className="w-14 sm:w-20 h-1 bg-neutral-700 rounded appearance-none accent-amber-500"
                          />
                        </div>
                      </div>

                      {/* Right: CC, Settings, Fullscreen */}
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setIsCcEnabled(!isCcEnabled)}
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border transition-colors ${
                            isCcEnabled
                              ? 'bg-purple-600 text-white border-purple-500'
                              : 'bg-neutral-800 text-neutral-400 border-neutral-700'
                          }`}
                          title={isCcEnabled ? 'Disable Closed Captions' : 'Enable Closed Captions'}
                        >
                          CC
                        </button>
                        <button
                          onClick={() => setShowSettingsDrawer(!showSettingsDrawer)}
                          className="p-1.5 hover:text-amber-400 text-neutral-300 transition-colors"
                          title="Playback Options"
                        >
                          <Settings className="w-4 h-4" />
                        </button>
                        <button
                          onClick={toggleFullscreen}
                          className="p-1.5 hover:text-amber-400 text-neutral-300 transition-colors"
                          title="Fullscreen"
                        >
                          {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Settings Drawer (Speed, Zero Buffer) */}
                {showSettingsDrawer && (
                  <div className="p-3 bg-neutral-950 border-t border-neutral-800 text-xs flex flex-wrap items-center justify-between gap-3 font-mono animate-fadeIn">
                    <div className="flex items-center gap-2">
                      <span className="text-neutral-400 text-[11px]">SPEED:</span>
                      {[0.75, 1.0, 1.25, 1.5].map((rate) => (
                        <button
                          key={rate}
                          onClick={() => setPlaybackSpeed(rate)}
                          className={`px-2 py-0.5 rounded text-[11px] ${
                            playbackSpeed === rate ? 'bg-amber-500 text-neutral-950 font-bold' : 'bg-neutral-850 text-neutral-400'
                          }`}
                        >
                          {rate}x
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-2">
                      {isLocalBlobActive ? (
                        <span className="text-emerald-400 text-[11px] flex items-center gap-1 font-bold">
                          <Check className="w-3.5 h-3.5" />
                          <span>Zero Buffer Active</span>
                        </span>
                      ) : (
                        <button
                          onClick={startZeroBufferDownload}
                          className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500 hover:text-neutral-950 border border-amber-500/40 text-[11px] font-bold flex items-center gap-1 transition-all"
                        >
                          <Download className="w-3 h-3" />
                          <span>Download (Zero Buffer)</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION 2: AUDIO DESCRIPTION (AD) (Span 2.5 cols on desktop) */}
              <div className="lg:col-span-2 flex flex-col rounded-2xl bg-neutral-900/90 border border-neutral-800 overflow-hidden shadow-2xl justify-between">
                <div>
                  {/* Section 2 Header */}
                  <div className="px-4 py-3 bg-neutral-900 border-b border-neutral-800 flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                      2
                    </div>
                    <div>
                      <h3 className="text-xs sm:text-sm font-bold text-white tracking-wide">
                        Audio Description (AD)
                      </h3>
                      <p className="text-[10px] text-neutral-400">Enable AD and select language</p>
                    </div>
                  </div>

                  {/* Section 2 Body */}
                  <div className="p-4 space-y-4">
                    {/* AD Toggle Switch */}
                    <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-neutral-950/80 border border-neutral-800">
                      <div className="flex items-center gap-2">
                        <Headphones className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span className="text-xs font-bold text-white">Audio Description (AD)</span>
                      </div>
                      <button
                        type="button"
                        disabled={availableAdTracks.length === 0}
                        onClick={() => setIsAdEnabled(!isAdEnabled)}
                        className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-40 ${
                          isAdEnabled && availableAdTracks.length > 0 ? 'bg-blue-600' : 'bg-neutral-700'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                            isAdEnabled && availableAdTracks.length > 0 ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Select AD Language Dropdown */}
                    {availableAdTracks.length > 0 ? (
                      <div className="space-y-1.5 relative">
                        <label className="text-xs font-medium text-neutral-300 block">
                          Select AD Language
                        </label>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsAdDropdownOpen(!isAdDropdownOpen);
                            setIsCcDropdownOpen(false);
                          }}
                          className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 hover:border-neutral-700 text-left text-xs font-medium text-white flex items-center justify-between transition-colors"
                        >
                          <span className="truncate">
                            {currentAdTrack?.languageName || 'English (AD)'}
                          </span>
                          <ChevronDown className="w-4 h-4 text-neutral-400 shrink-0" />
                        </button>

                        {/* Dropdown Options */}
                        {isAdDropdownOpen && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="absolute top-full left-0 right-0 mt-1 z-50 bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl p-1 space-y-0.5 animate-fadeIn"
                          >
                            {availableAdTracks.map((track) => (
                              <button
                                key={track.id || track.languageCode}
                                onClick={() => {
                                  setSelectedAdLang(track.languageCode);
                                  setIsAdDropdownOpen(false);
                                }}
                                className={`w-full px-3 py-2 rounded-lg text-left text-xs flex items-center justify-between transition-colors ${
                                  selectedAdLang.toLowerCase() === track.languageCode.toLowerCase()
                                    ? 'bg-blue-600/20 text-blue-400 font-bold'
                                    : 'text-neutral-300 hover:bg-neutral-800'
                                }`}
                              >
                                <span>{track.languageName}</span>
                                {selectedAdLang.toLowerCase() === track.languageCode.toLowerCase() && (
                                  <Check className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-neutral-400 italic bg-neutral-950 p-2.5 rounded-xl border border-neutral-800">
                        Audio Description is unavailable for this film.
                      </p>
                    )}
                  </div>
                </div>

                {/* AD Info Box at Bottom */}
                  <div className="p-3 m-3 rounded-xl bg-blue-950/20 border border-blue-900/30 flex items-start gap-2 text-[11px] text-blue-300/90 leading-relaxed">
                    <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                    <p>
                      AD provides additional spoken narration to describe key visual elements during pauses in dialogue.
                    </p>
                  </div>
                </div>

                {/* SECTION 3: CLOSED CAPTIONS (CC) (Span 2.5 cols on desktop) */}
                <div className="lg:col-span-2 flex flex-col rounded-2xl bg-neutral-900/90 border border-neutral-800 overflow-hidden shadow-2xl justify-between">
                  <div>
                    {/* Section 3 Header */}
                    <div className="px-4 py-3 bg-neutral-900 border-b border-neutral-800 flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-full bg-purple-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                        3
                      </div>
                      <div>
                        <h3 className="text-xs sm:text-sm font-bold text-white tracking-wide">
                          Closed Captions (CC)
                        </h3>
                        <p className="text-[10px] text-neutral-400">Enable CC and select language</p>
                      </div>
                    </div>

                    {/* Section 3 Body */}
                    <div className="p-4 space-y-4">
                      {/* CC Toggle Switch */}
                      <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-neutral-950/80 border border-neutral-800">
                        <div className="flex items-center gap-2">
                          <Subtitles className="w-4 h-4 text-purple-400 shrink-0" />
                          <span className="text-xs font-bold text-white">Closed Captions (CC)</span>
                        </div>
                        <button
                          type="button"
                          disabled={availableCcTracks.length === 0}
                          onClick={() => setIsCcEnabled(!isCcEnabled)}
                          className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-40 ${
                            isCcEnabled && availableCcTracks.length > 0 ? 'bg-blue-600' : 'bg-neutral-700'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                              isCcEnabled && availableCcTracks.length > 0 ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>

                      {/* Select CC Language Dropdown */}
                      {availableCcTracks.length > 0 ? (
                        <div className="space-y-1.5 relative">
                          <label className="text-xs font-medium text-neutral-300 block">
                            Select CC Language
                          </label>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsCcDropdownOpen(!isCcDropdownOpen);
                              setIsAdDropdownOpen(false);
                            }}
                            className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 hover:border-neutral-700 text-left text-xs font-medium text-white flex items-center justify-between transition-colors"
                          >
                            <span className="truncate">
                              {currentCcTrack?.languageName || 'English'}
                            </span>
                            <ChevronDown className="w-4 h-4 text-neutral-400 shrink-0" />
                          </button>

                          {/* Dropdown Options */}
                          {isCcDropdownOpen && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="absolute top-full left-0 right-0 mt-1 z-50 bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl p-1 space-y-0.5 animate-fadeIn max-h-48 overflow-y-auto"
                            >
                              {availableCcTracks.map((track) => (
                                <button
                                  key={track.id || track.languageCode}
                                  onClick={() => {
                                    setSelectedCcLang(track.languageCode);
                                    setIsCcDropdownOpen(false);
                                  }}
                                  className={`w-full px-3 py-2 rounded-lg text-left text-xs flex items-center justify-between transition-colors ${
                                    selectedCcLang.toLowerCase() === track.languageCode.toLowerCase()
                                      ? 'bg-blue-600/20 text-blue-400 font-bold'
                                      : 'text-neutral-300 hover:bg-neutral-800'
                                  }`}
                                >
                                  <span>{track.languageName}</span>
                                  {selectedCcLang.toLowerCase() === track.languageCode.toLowerCase() && (
                                    <Check className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                                  )}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-neutral-400 italic bg-neutral-950 p-2.5 rounded-xl border border-neutral-800">
                          Closed Captions are unavailable for this film.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* CC Info Box at Bottom */}
                  <div className="p-3 m-3 rounded-xl bg-purple-950/20 border border-purple-900/30 flex items-start gap-2 text-[11px] text-purple-300/90 leading-relaxed">
                    <Info className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                    <p>
                      CC controls select the caption language. Synchronized text appears below in the dedicated captions display area.
                    </p>
                  </div>
                </div>
              </div>

              {/* DEDICATED SYNCHRONIZED CLOSED CAPTIONS (CC) SECTION BELOW VIDEO */}
              <div className="rounded-2xl bg-neutral-900/90 border border-neutral-800 overflow-hidden shadow-2xl animate-fadeIn">
                {/* Pink/Red Banner Header matching mockup */}
                <div className="px-5 py-3.5 bg-rose-500/10 border-b border-rose-500/20 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-rose-600/20">
                    <Subtitles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-rose-300 tracking-wide">
                      Synchronized Closed Captions (CC)
                    </h3>
                    <p className="text-xs text-rose-200/70">
                      Caption text displayed below the video and synchronized with playback
                    </p>
                  </div>
                </div>

                {/* Synchronized Caption Text Display Box */}
                <div className="p-6 sm:p-8 flex items-center justify-center min-h-[120px] sm:min-h-[140px] bg-neutral-950/90 border-t border-neutral-800 text-center">
                  {!isCcEnabled ? (
                    <p className="text-xs sm:text-sm font-mono text-neutral-500 italic">
                      Closed Captions are disabled. Toggle CC ON in section 3 above to view synchronized subtitles.
                    </p>
                  ) : availableCcTracks.length === 0 ? (
                    <p className="text-xs sm:text-sm font-mono text-neutral-500 italic">
                      Closed Captions are unavailable for this film.
                    </p>
                  ) : activeCcCue ? (
                    <div className="max-w-4xl space-y-1 animate-fadeIn">
                      {/* Speaker label if available */}
                      {activeCcCue.speaker && (
                        <span className="inline-block px-2 py-0.5 mb-1 rounded text-xs font-mono font-bold uppercase tracking-wider bg-purple-950/80 text-purple-300 border border-purple-800/60">
                          [{activeCcCue.speaker}]
                        </span>
                      )}
                      {/* Sound Effect if available */}
                      {activeCcCue.soundEffect && (
                        <p className="text-xs sm:text-sm font-mono italic text-amber-300/90 mb-1">
                          [{activeCcCue.soundEffect}]
                        </p>
                      )}
                      {/* Synchronized Dialogue Text */}
                      <p className="text-lg sm:text-2xl md:text-3xl font-semibold text-white tracking-wide leading-relaxed font-sans break-words">
                        {activeCcCue.text}
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs sm:text-sm font-mono text-neutral-500 italic">
                      — No dialogue at this timestamp —
                    </p>
                  )}
                </div>
              </div>
          </div>
        ) : (
          /* ------------------------------------------------------------ */
          /* MOBILE APP PLAYBACK INTERFACE (Pixel-accurate matching mockup) */
          /* ------------------------------------------------------------ */
          <div className="max-w-md mx-auto rounded-3xl bg-neutral-950 border-2 border-neutral-800 overflow-hidden shadow-2xl animate-fadeIn">
            {/* Mobile Smartphone Status Bar */}
            <div className="px-6 pt-3 pb-1 flex items-center justify-between text-xs font-mono text-neutral-400">
              <span className="font-bold text-white">9:41</span>
              <div className="flex items-center gap-1.5">
                <Wifi className="w-3.5 h-3.5 text-neutral-300" />
                <Battery className="w-4 h-4 text-neutral-300" />
              </div>
            </div>

            {/* Mobile App Header (Back, Title, Heart, Three dots) */}
            <div className="px-4 py-2.5 flex items-center justify-between gap-3 border-b border-neutral-900">
              <button
                onClick={onClose}
                className="p-1 rounded-lg text-neutral-400 hover:text-white"
                title="Back"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h2 className="text-sm font-bold text-white truncate text-center flex-1">
                {film.title}
              </h2>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsFavorite(!isFavorite)}
                  className="p-1 rounded-lg text-neutral-400 hover:text-rose-400"
                >
                  <Heart className={`w-5 h-5 ${isFavorite ? 'text-rose-500 fill-rose-500' : ''}`} />
                </button>
                <button
                  onClick={() => setShowSettingsDrawer(!showSettingsDrawer)}
                  className="p-1 rounded-lg text-neutral-400 hover:text-white"
                >
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* SECTION 1: MAIN VIDEO PLAYER (Top Section 1 of 3) */}
            <div className="rounded-2xl bg-neutral-900 border border-neutral-800 overflow-hidden shadow-xl mx-3 mt-3">
              {/* Section 1 Header */}
              <div className="px-3.5 py-2.5 bg-neutral-900 border-b border-neutral-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-blue-600 text-white font-black text-[10px] flex items-center justify-center shrink-0">
                    1
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white tracking-wide">Video Player</h3>
                    <p className="text-[9px] text-neutral-400">Main film playback area</p>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-neutral-400">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>

              {/* Video Player Display Container */}
              <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
                <video
                  ref={videoRef}
                  src={resolvedVideoUrl}
                  onTimeUpdate={() => {
                    if (videoRef.current) {
                      setCurrentTime(videoRef.current.currentTime);
                      const dur = videoRef.current.duration;
                      if (dur && !isNaN(dur) && dur > 0) setDuration(dur);
                    }
                  }}
                  onWaiting={() => {
                    if (!isLocalBlobActive) setIsBuffering(true);
                  }}
                  onPlaying={() => {
                    setIsPlaying(true);
                    setIsBuffering(false);
                  }}
                  onCanPlay={() => setIsBuffering(false)}
                  onCanPlayThrough={() => setIsBuffering(false)}
                  onLoadedMetadata={() => {
                    setIsBuffering(false);
                    if (videoRef.current?.duration) setDuration(videoRef.current.duration);
                  }}
                  onEnded={() => {
                    setIsPlaying(false);
                    speechNarrator.stop();
                    speechNarrator.resetLastCue();
                  }}
                  onSeeked={() => {
                    speechNarrator.stop();
                    speechNarrator.resetLastCue();
                  }}
                  onError={() => {
                    if (isLocalBlobActive) {
                      setLocalBlobUrl(null);
                      setIsLocalBlobActive(false);
                    }
                    setStreamFallbackIndex((prev) => prev + 1);
                    setVideoLoadError('Playback error encountered. Using backup stream.');
                  }}
                  playsInline
                  preload="auto"
                  className="w-full h-full object-contain"
                />

                {/* Buffering Spinner */}
                {isBuffering && !isLocalBlobActive && (
                  <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center z-20">
                    <Loader2 className="w-8 h-8 text-amber-500 animate-spin mb-1.5" />
                    <span className="text-[10px] font-mono text-amber-300">Buffering...</span>
                  </div>
                )}

                {/* Playback Error Recovery Banner */}
                {videoLoadError && (
                  <div className="absolute top-2 inset-x-2 z-30 p-2 rounded-xl bg-neutral-950/95 border border-amber-500/60 flex items-center justify-between gap-1.5 text-[10px] font-mono text-amber-300 shadow-xl">
                    <span className="line-clamp-1">{videoLoadError}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setVideoLoadError(null);
                        setStreamFallbackIndex((prev) => prev + 1);
                        if (videoRef.current) videoRef.current.load();
                      }}
                      className="px-2 py-0.5 rounded bg-amber-500 text-neutral-950 font-bold shrink-0 text-[10px]"
                    >
                      Retry
                    </button>
                  </div>
                )}

                {/* Statutory Watermark */}
                <div className="absolute top-2 right-2 z-20 pointer-events-none opacity-40 font-mono text-[8px] text-amber-300">
                  {watermark}
                </div>

                {/* Controls Overlay */}
                <div
                  className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 to-transparent p-2.5 pt-5 z-30 flex flex-col gap-1.5 transition-opacity ${
                    showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
                  }`}
                >
                  <input
                    type="range"
                    min={0}
                    max={duration || 100}
                    step={0.1}
                    value={currentTime}
                    onChange={(e) => handleSeek(parseFloat(e.target.value))}
                    className="w-full h-1 bg-neutral-700 rounded appearance-none cursor-pointer accent-amber-500"
                  />
                  <div className="flex items-center justify-between text-white text-[11px]">
                    <div className="flex items-center gap-2">
                      <button onClick={togglePlay} className="p-1">
                        {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                      </button>
                      <span className="font-mono text-[10px] text-neutral-300">
                        {formatTime(currentTime)} / {formatTime(duration)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setIsMuted(!isMuted)}
                        className="p-1 text-neutral-300"
                      >
                        {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => setIsCcEnabled(!isCcEnabled)}
                        className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border ${
                          isCcEnabled ? 'bg-purple-600 text-white border-purple-500' : 'bg-neutral-800 text-neutral-400'
                        }`}
                      >
                        CC
                      </button>
                      <button onClick={toggleFullscreen} className="p-1 text-neutral-300">
                        <Maximize className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile Accessibility Controls (Sections 2 & 3) */}
            <div className="p-3 space-y-3">
              {/* SECTION 2: AUDIO DESCRIPTION (AD) (Top Section 2 of 3) */}
              <div className="p-3.5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-emerald-600 text-white font-black text-[10px] flex items-center justify-center shrink-0">
                      2
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">Audio Description (AD)</h4>
                      <p className="text-[9px] text-neutral-400">Enable AD and select language</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={availableAdTracks.length === 0}
                    onClick={() => setIsAdEnabled(!isAdEnabled)}
                    className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out disabled:opacity-40 ${
                      isAdEnabled && availableAdTracks.length > 0 ? 'bg-blue-600' : 'bg-neutral-700'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition duration-200 ease-in-out ${
                        isAdEnabled && availableAdTracks.length > 0 ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {availableAdTracks.length > 0 ? (
                  <div className="space-y-1">
                    <label className="text-[11px] text-neutral-400 block font-medium">Select AD Language</label>
                    <select
                      value={selectedAdLang}
                      onChange={(e) => setSelectedAdLang(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:outline-none"
                    >
                      {availableAdTracks.map((t) => (
                        <option key={t.languageCode} value={t.languageCode}>
                          {t.languageName}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <p className="text-xs text-neutral-400 italic bg-neutral-950 p-2.5 rounded-xl border border-neutral-850">
                    Audio Description is unavailable for this film.
                  </p>
                )}

                <div className="p-2.5 rounded-xl bg-blue-950/20 border border-blue-900/30 flex items-start gap-2 text-[10px] text-blue-300/90 leading-relaxed">
                  <Info className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                  <p>
                    AD provides synchronized spoken narration to describe visual scenes during dialogue pauses.
                  </p>
                </div>
              </div>

              {/* SECTION 3: CLOSED CAPTIONS (CC) (Top Section 3 of 3) */}
              <div className="p-3.5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-purple-600 text-white font-black text-[10px] flex items-center justify-center shrink-0">
                      3
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">Closed Captions (CC)</h4>
                      <p className="text-[9px] text-neutral-400">Enable CC and select language</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={availableCcTracks.length === 0}
                    onClick={() => setIsCcEnabled(!isCcEnabled)}
                    className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out disabled:opacity-40 ${
                      isCcEnabled && availableCcTracks.length > 0 ? 'bg-blue-600' : 'bg-neutral-700'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition duration-200 ease-in-out ${
                        isCcEnabled && availableCcTracks.length > 0 ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {availableCcTracks.length > 0 ? (
                  <div className="space-y-1">
                    <label className="text-[11px] text-neutral-400 block font-medium">Select CC Language</label>
                    <select
                      value={selectedCcLang}
                      onChange={(e) => setSelectedCcLang(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:outline-none"
                    >
                      {availableCcTracks.map((t) => (
                        <option key={t.languageCode} value={t.languageCode}>
                          {t.languageName}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <p className="text-xs text-neutral-400 italic bg-neutral-950 p-2.5 rounded-xl border border-neutral-850">
                    Closed Captions are unavailable for this film.
                  </p>
                )}

                <div className="p-2.5 rounded-xl bg-purple-950/20 border border-purple-900/30 flex items-start gap-2 text-[10px] text-purple-300/90 leading-relaxed">
                  <Info className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                  <p>
                    CC controls select the caption language. Synchronized text is displayed below in the dedicated panel.
                  </p>
                </div>
              </div>

              {/* SECTION 4: DEDICATED SYNCHRONIZED CLOSED CAPTIONS (CC) SECTION BELOW VIDEO */}
              <div className="rounded-2xl bg-neutral-900 border border-neutral-800 overflow-hidden shadow-lg">
                <div className="px-3.5 py-2.5 bg-rose-500/10 border-b border-rose-500/20 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-rose-600 text-white flex items-center justify-center shrink-0">
                    <Subtitles className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-rose-300 block">
                      Synchronized Closed Captions (CC)
                    </span>
                    <span className="text-[9px] text-rose-200/70">
                      Caption text displayed below video and synchronized with playback
                    </span>
                  </div>
                </div>

                <div className="p-4 bg-neutral-950 text-center min-h-[90px] flex items-center justify-center">
                  {!isCcEnabled ? (
                    <p className="text-[11px] text-neutral-500 italic">
                      Closed Captions are disabled. Toggle CC ON in Section 3 above to view subtitles.
                    </p>
                  ) : availableCcTracks.length === 0 ? (
                    <p className="text-[11px] text-neutral-500 italic">
                      Closed Captions are unavailable for this film.
                    </p>
                  ) : activeCcCue ? (
                    <div className="space-y-1 animate-fadeIn">
                      {activeCcCue.speaker && (
                        <span className="inline-block px-1.5 py-0.2 rounded text-[10px] font-mono text-purple-400 bg-purple-950/80">
                          [{activeCcCue.speaker}]
                        </span>
                      )}
                      {activeCcCue.soundEffect && (
                        <p className="text-[10px] font-mono italic text-amber-300/90 mb-0.5">
                          [{activeCcCue.soundEffect}]
                        </p>
                      )}
                      <p className="text-sm sm:text-base font-medium text-white leading-relaxed break-words font-sans">
                        {activeCcCue.text}
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-neutral-500 italic">
                      — No dialogue at this timestamp —
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ZERO-BUFFER OFFLINE DOWNLOAD MODAL */}
      {isDownloadModalOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn"
        >
          <div className="w-full max-w-md p-6 rounded-3xl bg-neutral-900 border border-neutral-800 text-neutral-100 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white uppercase">Zero-Buffer Download</h3>
                  <p className="text-[11px] text-neutral-400">Save to local device storage</p>
                </div>
              </div>
              <button onClick={() => setIsDownloadModalOpen(false)} className="text-neutral-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {isDownloading ? (
              <div className="space-y-2.5 p-3 rounded-xl bg-neutral-950 border border-neutral-800 text-xs font-mono">
                <div className="flex justify-between text-amber-400 font-bold">
                  <span>Downloading Video...</span>
                  <span>{downloadProgress?.percent || 0}%</span>
                </div>
                <div className="w-full bg-neutral-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-amber-500 h-full transition-all duration-150"
                    style={{ width: `${downloadProgress?.percent || 0}%` }}
                  />
                </div>
              </div>
            ) : (
              <p className="text-xs text-neutral-300">
                Download completed. The video is now loaded from your local device sandbox with 0ms buffering!
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
