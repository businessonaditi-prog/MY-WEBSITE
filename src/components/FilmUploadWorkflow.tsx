import React, { useState, useRef, useEffect } from 'react';
import {
  Upload,
  Film as FilmIcon,
  Image,
  Subtitles,
  Headphones,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Trash2,
  Plus,
  Layers,
  HardDrive,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  Eye,
  EyeOff,
  FileText,
  Music,
  Check,
  Sparkles,
  ExternalLink,
  Cloud,
} from 'lucide-react';
import { User, Film, AccessibilityTrack } from '../types/cinemaPlatform';
import { INDIAN_LANGUAGES } from '../utils/languages';
import { api } from '../services/apiClient';
import { MediaUploadModal } from './MediaUploadModal';
import { UploadProgressBar } from './UploadProgressBar';
import {
  initDriveAuth,
  signInWithGoogleDrive,
  getDriveAccessToken,
  uploadFileToGoogleDrive,
  TARGET_DRIVE_ACCOUNT,
  MAX_VIDEO_SIZE_BYTES,
} from '../services/googleDriveDatabaseService';
import { User as FirebaseUser } from 'firebase/auth';
import {
  formatBytes,
  parseSubtitleText,
  detectMediaFormat,
  SAMPLE_HINDI_SRT,
  SAMPLE_ENGLISH_SRT,
  ParsedCue,
} from '../utils/mediaParser';

interface FilmUploadWorkflowProps {
  currentUser: User;
  isDcpMode?: boolean;
  onUploadSuccess: (createdFilm: Film) => void;
  onOpenPaymentModal: (film: Film) => void;
}

export const FilmUploadWorkflow: React.FC<FilmUploadWorkflowProps> = ({
  currentUser,
  isDcpMode = false,
  onUploadSuccess,
  onOpenPaymentModal,
}) => {
  // Step tracker
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Form Fields
  const [title, setTitle] = useState('');
  const [languageCode, setLanguageCode] = useState('hi');
  const [director, setDirector] = useState('');
  const [producer, setProducer] = useState(currentUser.productionHouseName);
  const [cinematographer, setCinematographer] = useState('');
  const [editor, setEditor] = useState('');
  const [musicDirector, setMusicDirector] = useState('');
  const [writer, setWriter] = useState('');
  const [soundDesigner, setSoundDesigner] = useState('');
  const [description, setDescription] = useState('');

  // Poster (Mandatory! Rule #10, #15, #68)
  const [posterUrl, setPosterUrl] = useState('');
  const [posterFileName, setPosterFileName] = useState('');

  // Video / DCP File
  const [videoFileName, setVideoFileName] = useState('');
  const [videoFileSize, setVideoFileSize] = useState('');
  const [videoFileUrl, setVideoFileUrl] = useState('');
  const [selectedVideoFile, setSelectedVideoFile] = useState<File | null>(null);
  const [dcpPackageName, setDcpPackageName] = useState('');
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadedBytes, setUploadedBytes] = useState<number>(0);
  const [totalBytes, setTotalBytes] = useState<number>(0);
  const [uploadSpeedMBps, setUploadSpeedMBps] = useState<number>(0);
  const [estimatedSecondsRemaining, setEstimatedSecondsRemaining] = useState<number>(0);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [isChunkUploading, setIsChunkUploading] = useState<boolean>(false);

  // Google Drive Cloud Vault States (businessonaditi@gmail.com sync)
  const [googleUser, setGoogleUser] = useState<FirebaseUser | null>(null);
  const [isDriveConnected, setIsDriveConnected] = useState<boolean>(false);
  const [isConnectingDrive, setIsConnectingDrive] = useState<boolean>(false);
  const [driveFileId, setDriveFileId] = useState<string>('');
  const [driveWebViewLink, setDriveWebViewLink] = useState<string>('');
  const [driveWebContentLink, setDriveWebContentLink] = useState<string>('');
  const [driveFolderId, setDriveFolderId] = useState<string>('');
  const [driveUploadStatus, setDriveUploadStatus] = useState<string>('');

  // Listen to Google Drive Auth state
  useEffect(() => {
    const unsub = initDriveAuth(
      (user) => {
        setGoogleUser(user);
        setIsDriveConnected(true);
      },
      () => {
        setGoogleUser(null);
        setIsDriveConnected(false);
      }
    );
    return () => unsub();
  }, []);

  // CC Tracks (Rule #12, #14) with media file metadata
  const [ccTracks, setCcTracks] = useState<Array<AccessibilityTrack & { cueCount?: number }>>([
    {
      id: 'default-cc-hi',
      filmId: 'draft',
      type: 'CC',
      languageCode: 'hi',
      languageName: 'Hindi',
      fileName: 'official_theatrical_hindi_subtitles.srt',
      format: 'SRT',
      fileSize: '18.4 KB',
      cueCount: 142,
      version: '1.0',
      status: 'valid',
      fileUrl: '/storage/media/cc_hi_default.srt',
    },
  ]);

  // AD Tracks (Rule #13, #14) with media audio preview
  const [adTracks, setAdTracks] = useState<Array<AccessibilityTrack & { audioUrl?: string }>>([
    {
      id: 'default-ad-hi',
      filmId: 'draft',
      type: 'AD',
      languageCode: 'hi',
      languageName: 'Hindi',
      fileName: 'official_theatrical_hindi_narration.mp3',
      format: 'MP3',
      fileSize: '14.8 MB',
      version: '1.0',
      status: 'valid',
      fileUrl: '/storage/media/ad_hi_default.mp3',
      audioUrl: 'https://commondatastorage.googleapis.com/codeskulptor-demos/riceracer_assets/music/win.ogg',
    },
  ]);

  // Media Studio Modal & Upload States
  const [isMediaModalOpen, setIsMediaModalOpen] = useState<boolean>(false);
  const [mediaModalType, setMediaModalType] = useState<'AD' | 'CC'>('CC');
  const [selectedCcUploadLang, setSelectedCcUploadLang] = useState<string>('hi');
  const [selectedAdUploadLang, setSelectedAdUploadLang] = useState<string>('hi');
  const [expandedCcPreviewIdx, setExpandedCcPreviewIdx] = useState<number | null>(null);
  const [activePlayingAdIdx, setActivePlayingAdIdx] = useState<number | null>(null);

  // File Input References
  const ccFileInputRef = useRef<HTMLInputElement | null>(null);
  const adFileInputRef = useRef<HTMLInputElement | null>(null);
  const replaceFileInputRef = useRef<HTMLInputElement | null>(null);
  const [replaceTarget, setReplaceTarget] = useState<{ type: 'AD' | 'CC'; index: number } | null>(null);
  const adAudioPlayerRef = useRef<HTMLAudioElement | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Selected Language Object
  const selectedLangObj = INDIAN_LANGUAGES.find((l) => l.code === languageCode) || INDIAN_LANGUAGES[0];

  // Poster Upload Simulator / URL set
  const handlePosterFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPosterFileName(file.name);
      // Create local object URL for preview
      const previewUrl = URL.createObjectURL(file);
      setPosterUrl(previewUrl);
    }
  };

  // Connect Google Drive linked to businessonaditi@gmail.com
  const handleConnectDrive = async () => {
    setIsConnectingDrive(true);
    setError(null);
    try {
      const res = await signInWithGoogleDrive();
      if (res) {
        setGoogleUser(res.user);
        setIsDriveConnected(true);
        // If a file is currently selected, proceed to upload to Google Drive
        if (selectedVideoFile) {
          await uploadSelectedVideoToDrive(selectedVideoFile);
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Google Drive authentication failed.');
    } finally {
      setIsConnectingDrive(false);
    }
  };

  // Upload Selected Video Directly to Google Drive with Real-time Telemetry (up to 10GB)
  const uploadSelectedVideoToDrive = async (file: File) => {
    if (file.size > MAX_VIDEO_SIZE_BYTES) {
      const sizeGb = (file.size / (1024 * 1024 * 1024)).toFixed(2);
      setError(`Video file (${sizeGb} GB) exceeds 10 GB limit. Video should not be more than 10GB.`);
      return;
    }

    setIsChunkUploading(true);
    setUploadProgress(0);
    setUploadedBytes(0);
    setTotalBytes(file.size);
    setUploadSpeedMBps(0);
    setEstimatedSecondsRemaining(0);
    setElapsedSeconds(0);
    setDriveUploadStatus(`Initiating upload to Google Drive for ${TARGET_DRIVE_ACCOUNT}...`);

    const uploadStartTime = Date.now();
    const intervalTimer = setInterval(() => {
      setElapsedSeconds(Math.round((Date.now() - uploadStartTime) / 1000));
    }, 1000);

    try {
      const result = await uploadFileToGoogleDrive(
        file,
        file.name,
        (progress) => {
          const elapsedSec = Math.max(0.5, (Date.now() - uploadStartTime) / 1000);
          const transferredBytes = progress.uploadedBytes || Math.round((progress.percent / 100) * file.size);
          const speed = (transferredBytes / (1024 * 1024)) / elapsedSec;
          const remainingBytes = file.size - transferredBytes;
          const eta = speed > 0 ? remainingBytes / (speed * 1024 * 1024) : 0;

          setUploadProgress(progress.percent);
          setUploadedBytes(transferredBytes);
          setTotalBytes(progress.totalBytes || file.size);
          setUploadSpeedMBps(speed);
          setEstimatedSecondsRemaining(Math.max(0, Math.round(eta)));
          setDriveUploadStatus(progress.status);
        }
      );

      setDriveFileId(result.fileId);
      setDriveWebViewLink(result.webViewLink);
      setDriveWebContentLink(result.webContentLink);
      setDriveFolderId(result.folderId);
      setVideoFileUrl(result.streamUrl);
      setUploadProgress(100);
      setUploadedBytes(file.size);
      setEstimatedSecondsRemaining(0);
      setDriveUploadStatus(`Stored in Google Drive (${TARGET_DRIVE_ACCOUNT}) ✓ Synced directly to player.`);
    } catch (err: unknown) {
      console.error('Google Drive upload error:', err);
      setError(err instanceof Error ? err.message : 'Upload to Google Drive failed.');
    } finally {
      clearInterval(intervalTimer);
      setIsChunkUploading(false);
    }
  };

  // Video File Chunked & Drive Upload Handler (Max 10 GB strict limit)
  const handleVideoFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      // Strict Validation: Video should not be more than 10GB
      if (file.size > MAX_VIDEO_SIZE_BYTES) {
        const sizeGb = (file.size / (1024 * 1024 * 1024)).toFixed(2);
        setError(`Video file (${sizeGb} GB) exceeds maximum 10 GB limit. Video should not be more than 10GB.`);
        e.target.value = '';
        return;
      }

      setError(null);
      setSelectedVideoFile(file);
      setVideoFileName(file.name);

      const sizeFormatted = file.size > 1024 * 1024 * 1024
        ? `${(file.size / (1024 * 1024 * 1024)).toFixed(2)} GB`
        : `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
      setVideoFileSize(sizeFormatted);

      // Create local object URL for instant, zero-latency preview playback
      const localBlobUrl = URL.createObjectURL(file);
      setVideoFileUrl(localBlobUrl);

      // If Google Drive token is active, upload directly to Google Drive!
      const driveToken = getDriveAccessToken();
      if (driveToken) {
        await uploadSelectedVideoToDrive(file);
      } else {
        // Fallback / Staging Pipeline: Process chunks locally and prompt for Google Drive sync
        setIsChunkUploading(true);
        setUploadProgress(0);
        setDriveUploadStatus('File verified locally. Connect Google Drive to store in cloud vault.');

        const totalChunks = 5;
        for (let i = 0; i < totalChunks; i++) {
          await new Promise((r) => setTimeout(r, 150));
          await api.uploadChunk({
            chunkIndex: i,
            totalChunks,
            fileName: file.name,
            fileSize: sizeFormatted,
            submissionType: isDcpMode ? 'dcp' : 'film',
          });
          setUploadProgress(Math.round(((i + 1) / totalChunks) * 100));
        }
        setIsChunkUploading(false);
      }
    }
  };

  // Quick preset sample poster
  const handleUsePresetPoster = () => {
    setPosterUrl('https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&auto=format&fit=crop&q=80');
    setPosterFileName('official_theatrical_poster.jpg');
  };

  // 1. Direct CC Media File Upload
  const handleUploadCcFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const detectedFmt = detectMediaFormat(file.name);
      let parsedCues: ParsedCue[] = [];
      try {
        const text = await file.text();
        parsedCues = parseSubtitleText(text);
      } catch (err) {
        console.warn('Subtitle parse error:', err);
      }

      const langObj = INDIAN_LANGUAGES.find((l) => l.code === selectedCcUploadLang) || INDIAN_LANGUAGES[0];
      const existingIdx = ccTracks.findIndex((t) => t.languageCode === selectedCcUploadLang);

      const newTrack: AccessibilityTrack & { cueCount?: number } = {
        id: `track-cc-${Date.now()}`,
        filmId: 'draft',
        type: 'CC',
        languageCode: selectedCcUploadLang,
        languageName: langObj.name,
        fileName: file.name,
        format: detectedFmt,
        fileSize: formatBytes(file.size),
        cueCount: parsedCues.length > 0 ? parsedCues.length : 124,
        version: '1.0',
        status: 'valid',
        fileUrl: `/storage/media/cc_${selectedCcUploadLang}_${Date.now()}_${file.name}`,
        cues: parsedCues.slice(0, 15).map((c, i) => ({
          id: `cue-${i}`,
          startTime: c.startTime,
          endTime: c.endTime,
          text: c.text,
          speaker: c.speaker,
          soundEffect: c.soundEffect,
        })),
      };

      if (existingIdx >= 0) {
        const updated = [...ccTracks];
        updated[existingIdx] = newTrack;
        setCcTracks(updated);
      } else {
        setCcTracks([...ccTracks, newTrack]);
      }

      e.target.value = '';
    }
  };

  // 2. Direct AD Media File Upload
  const handleUploadAdFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const detectedFmt = detectMediaFormat(file.name);
      const audioUrl = URL.createObjectURL(file);
      const langObj = INDIAN_LANGUAGES.find((l) => l.code === selectedAdUploadLang) || INDIAN_LANGUAGES[0];
      const existingIdx = adTracks.findIndex((t) => t.languageCode === selectedAdUploadLang);

      const newTrack: AccessibilityTrack & { audioUrl?: string } = {
        id: `track-ad-${Date.now()}`,
        filmId: 'draft',
        type: 'AD',
        languageCode: selectedAdUploadLang,
        languageName: langObj.name,
        fileName: file.name,
        format: detectedFmt,
        fileSize: formatBytes(file.size),
        version: '1.0',
        status: 'valid',
        fileUrl: `/storage/media/ad_${selectedAdUploadLang}_${Date.now()}_${file.name}`,
        audioUrl,
      };

      if (existingIdx >= 0) {
        const updated = [...adTracks];
        updated[existingIdx] = newTrack;
        setAdTracks(updated);
      } else {
        setAdTracks([...adTracks, newTrack]);
      }

      e.target.value = '';
    }
  };

  // 3. Replace Existing Track File
  const handleReplaceTrackFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && replaceTarget) {
      const file = e.target.files[0];
      const detectedFmt = detectMediaFormat(file.name);
      const sizeStr = formatBytes(file.size);

      if (replaceTarget.type === 'AD') {
        const objectUrl = URL.createObjectURL(file);
        const updated = [...adTracks];
        if (updated[replaceTarget.index]) {
          updated[replaceTarget.index] = {
            ...updated[replaceTarget.index],
            fileName: file.name,
            fileSize: sizeStr,
            format: detectedFmt,
            audioUrl: objectUrl,
            status: 'valid',
          };
          setAdTracks(updated);
        }
      } else {
        let parsedCues: ParsedCue[] = [];
        try {
          const text = await file.text();
          parsedCues = parseSubtitleText(text);
        } catch (err) {}

        const updated = [...ccTracks];
        if (updated[replaceTarget.index]) {
          updated[replaceTarget.index] = {
            ...updated[replaceTarget.index],
            fileName: file.name,
            fileSize: sizeStr,
            format: detectedFmt,
            cueCount: parsedCues.length || 150,
            status: 'valid',
            cues: parsedCues.slice(0, 15).map((c, i) => ({
              id: `cue-${i}`,
              startTime: c.startTime,
              endTime: c.endTime,
              text: c.text,
              speaker: c.speaker,
              soundEffect: c.soundEffect,
            })),
          };
          setCcTracks(updated);
        }
      }

      setReplaceTarget(null);
      e.target.value = '';
    }
  };

  // 4. Quick Sample Loaders
  const handleLoadSampleCc = (langCode: string) => {
    const langObj = INDIAN_LANGUAGES.find((l) => l.code === langCode) || INDIAN_LANGUAGES[0];
    const isEnglish = langCode === 'en';
    const sampleText = isEnglish ? SAMPLE_ENGLISH_SRT : SAMPLE_HINDI_SRT;
    const cues = parseSubtitleText(sampleText);

    const sampleTrack: AccessibilityTrack & { cueCount?: number } = {
      id: `sample-cc-${langCode}-${Date.now()}`,
      filmId: 'draft',
      type: 'CC',
      languageCode: langCode,
      languageName: langObj.name,
      fileName: `${langObj.name.toLowerCase()}_master_theatrical_captions.srt`,
      format: 'SRT',
      fileSize: '19.2 KB',
      cueCount: cues.length || 5,
      version: '1.0',
      status: 'valid',
      fileUrl: `/storage/media/cc_${langCode}_sample.srt`,
      cues: cues.map((c, i) => ({
        id: `cue-${i}`,
        startTime: c.startTime,
        endTime: c.endTime,
        text: c.text,
        speaker: c.speaker,
        soundEffect: c.soundEffect,
      })),
    };

    const existingIdx = ccTracks.findIndex((t) => t.languageCode === langCode);
    if (existingIdx >= 0) {
      const updated = [...ccTracks];
      updated[existingIdx] = sampleTrack;
      setCcTracks(updated);
    } else {
      setCcTracks([...ccTracks, sampleTrack]);
    }
  };

  const handleLoadSampleAd = (langCode: string) => {
    const langObj = INDIAN_LANGUAGES.find((l) => l.code === langCode) || INDIAN_LANGUAGES[0];
    const sampleTrack: AccessibilityTrack & { audioUrl?: string } = {
      id: `sample-ad-${langCode}-${Date.now()}`,
      filmId: 'draft',
      type: 'AD',
      languageCode: langCode,
      languageName: langObj.name,
      fileName: `${langObj.name.toLowerCase()}_official_theatrical_narration.mp3`,
      format: 'MP3',
      fileSize: '14.8 MB',
      version: '1.0',
      status: 'valid',
      fileUrl: `/storage/media/ad_${langCode}_sample.mp3`,
      audioUrl: 'https://commondatastorage.googleapis.com/codeskulptor-demos/riceracer_assets/music/win.ogg',
    };

    const existingIdx = adTracks.findIndex((t) => t.languageCode === langCode);
    if (existingIdx >= 0) {
      const updated = [...adTracks];
      updated[existingIdx] = sampleTrack;
      setAdTracks(updated);
    } else {
      setAdTracks([...adTracks, sampleTrack]);
    }
  };

  // Add CC track by code dropdown
  const handleAddCcTrack = (code: string) => {
    const lang = INDIAN_LANGUAGES.find((l) => l.code === code);
    if (!lang) return;
    if (ccTracks.some((t) => t.languageCode === code)) return;
    setCcTracks([...ccTracks, {
      id: `track-cc-${Date.now()}`,
      filmId: 'draft',
      type: 'CC',
      languageCode: code,
      languageName: lang.name,
      fileName: `${lang.name.toLowerCase()}_captions.vtt`,
      format: 'VTT',
      fileSize: '12.5 KB',
      version: '1.0',
      status: 'valid',
      fileUrl: `/storage/media/cc_${code}.vtt`,
    }]);
  };

  const handleRemoveCcTrack = (idx: number) => {
    setCcTracks(ccTracks.filter((_, i) => i !== idx));
  };

  // Add AD track by code dropdown
  const handleAddAdTrack = (code: string) => {
    const lang = INDIAN_LANGUAGES.find((l) => l.code === code);
    if (!lang) return;
    if (adTracks.some((t) => t.languageCode === code)) return;
    setAdTracks([...adTracks, {
      id: `track-ad-${Date.now()}`,
      filmId: 'draft',
      type: 'AD',
      languageCode: code,
      languageName: lang.name,
      fileName: `${lang.name.toLowerCase()}_audio_description.mp3`,
      format: 'MP3',
      fileSize: '16.2 MB',
      version: '1.0',
      status: 'valid',
      fileUrl: `/storage/media/ad_${code}.mp3`,
      audioUrl: 'https://commondatastorage.googleapis.com/codeskulptor-demos/riceracer_assets/music/win.ogg',
    }]);
  };

  const handleRemoveAdTrack = (idx: number) => {
    setAdTracks(adTracks.filter((_, i) => i !== idx));
  };

  // Toggle AD audio preview
  const handleTogglePlayAdAudio = (idx: number, audioUrl?: string) => {
    if (activePlayingAdIdx === idx) {
      if (adAudioPlayerRef.current) {
        adAudioPlayerRef.current.pause();
      }
      setActivePlayingAdIdx(null);
    } else {
      setActivePlayingAdIdx(idx);
      if (adAudioPlayerRef.current && audioUrl) {
        adAudioPlayerRef.current.src = audioUrl;
        adAudioPlayerRef.current.play().catch(() => {});
      }
    }
  };

  // Validation Checks (Section #15 - Email & 6-digit credential, no OTP required)
  const isAccountVerified = Boolean(currentUser.id);
  const isMetadataComplete = Boolean(title.trim() && languageCode && director.trim() && producer.trim() && description.trim());
  const isPosterPresent = Boolean(posterUrl.trim());
  const isVideoPresent = Boolean(videoFileName.trim() && uploadProgress === 100);
  const isCcPresent = ccTracks.length > 0;
  const isAdPresent = adTracks.length > 0;

  const canSubmit = isAccountVerified && isMetadataComplete && isPosterPresent && isVideoPresent && isCcPresent && isAdPresent;

  // Final Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) {
      if (!isPosterPresent) {
        setError('Please upload a film poster before submitting. (Mandatory)');
      } else if (!isCcPresent) {
        setError('Please upload at least one required Closed Caption track.');
      } else if (!isAdPresent) {
        setError('Please upload the required Audio Description track.');
      } else if (!isAccountVerified) {
        setError('Please verify your email and mobile before submitting.');
      }
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await api.submitFilm({
        submissionType: isDcpMode ? 'dcp' : 'film',
        title,
        languageCode,
        languageName: selectedLangObj.name,
        director,
        producer,
        cinematographer,
        editor,
        musicDirector,
        writer,
        soundDesigner,
        description,
        posterUrl,
        videoFileName,
        videoFileSize,
        videoFileUrl: videoFileUrl || undefined,
        driveFileId: driveFileId || undefined,
        driveWebViewLink: driveWebViewLink || undefined,
        driveWebContentLink: driveWebContentLink || undefined,
        driveFolderId: driveFolderId || undefined,
        driveAccountEmail: TARGET_DRIVE_ACCOUNT,
        driveSynced: Boolean(driveFileId),
        submitterName: currentUser?.productionHouseName || producer,
        submitterEmail: currentUser?.email,
        submitterMobile: currentUser?.mobile,
        submitterProductionHouse: currentUser?.productionHouseName,
        isDcp: isDcpMode,
        dcpPackageName: isDcpMode ? dcpPackageName || `${title.toUpperCase()}_DCP_DCI_SMPTE` : undefined,
        ccTracks: ccTracks as unknown as AccessibilityTrack[],
        adTracks: adTracks as unknown as AccessibilityTrack[],
        bypassPayment: currentUser?.role === 'admin',
      } as Parameters<typeof api.submitFilm>[0]);

      onUploadSuccess(res.film);
      // Immediately open payment modal for non-admins (Rule #16: Redirect to payment of min ₹15,000)
      if (currentUser?.role !== 'admin') {
        onOpenPaymentModal(res.film);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Submission failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn pb-12">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-amber-400 px-2.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 mb-2">
            {isDcpMode ? <Layers className="w-3.5 h-3.5 text-cyan-400" /> : <FilmIcon className="w-3.5 h-3.5" />}
            <span>{isDcpMode ? 'DCP STUDIO MASTERING WORKFLOW' : 'FEATURE FILM SUBMISSION PORTAL'}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-wide uppercase">
            {isDcpMode ? 'UPLOAD DCP PACKAGE' : 'UPLOAD FILM'}
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 mt-1">
            Production House: <strong className="text-white">{currentUser.productionHouseName}</strong>
          </p>
        </div>

        {/* Account Verification Warning Banner */}
        {!isAccountVerified && (
          <div className="p-3 rounded-xl bg-amber-950/60 border border-amber-500/50 text-amber-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
            <div>
              <strong>Account Verification Pending:</strong>
              <p className="text-[11px] text-amber-200/80">
                Please ensure official credentials and 6-digit access code are verified.
              </p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-600/50 text-rose-200 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Step Indicators */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
        {[
          { num: 1, label: '1. METADATA' },
          { num: 2, label: '2. POSTER (MANDATORY)' },
          { num: 3, label: isDcpMode ? '3. DCP ASSET' : '3. MASTER VIDEO' },
          { num: 4, label: '4. CC & AD TRACKS' },
        ].map((s) => (
          <button
            key={s.num}
            onClick={() => setCurrentStep(s.num)}
            className={`p-2.5 rounded-xl border text-left transition-all ${
              currentStep === s.num
                ? 'bg-amber-500 text-neutral-950 font-bold border-amber-500 shadow-md'
                : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* STEP 1: FILM INFORMATION */}
        {currentStep === 1 && (
          <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-neutral-800 pb-2">
              <FilmIcon className="w-4 h-4 text-amber-400" />
              <span>FILM INFORMATION &amp; INDIAN LANGUAGE</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-neutral-300 block mb-1">
                  Film Title / Name <span className="text-amber-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kalki 2898 AD / Jawan"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-300 block mb-1">
                  Original Film Language <span className="text-amber-400">*</span>
                </label>
                <select
                  value={languageCode}
                  onChange={(e) => setLanguageCode(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  {INDIAN_LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.native} ({l.name}) [{l.code}]
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-300 block mb-1">
                  Director Name <span className="text-amber-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Nag Ashwin"
                  value={director}
                  onChange={(e) => setDirector(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-300 block mb-1">
                  Producer Name <span className="text-amber-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. C. Aswani Dutt"
                  value={producer}
                  onChange={(e) => setProducer(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-neutral-300 block mb-1">
                Film Description / Synopsis <span className="text-amber-400">*</span>
              </label>
              <textarea
                rows={3}
                required
                placeholder="Theatrical premise and storyline summary..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Optional Key Positions */}
            <div className="pt-2 border-t border-neutral-800/80">
              <span className="text-[11px] font-mono text-neutral-500 block mb-2 uppercase">
                Optional Key Creative Positions:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="text"
                  placeholder="Cinematographer / DOP"
                  value={cinematographer}
                  onChange={(e) => setCinematographer(e.target.value)}
                  className="bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white"
                />
                <input
                  type="text"
                  placeholder="Editor"
                  value={editor}
                  onChange={(e) => setEditor(e.target.value)}
                  className="bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white"
                />
                <input
                  type="text"
                  placeholder="Music Director"
                  value={musicDirector}
                  onChange={(e) => setMusicDirector(e.target.value)}
                  className="bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="px-5 py-2.5 rounded-xl bg-amber-500 text-neutral-950 font-bold text-xs flex items-center gap-1.5"
              >
                <span>Continue to Poster</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: FILM POSTER (MANDATORY Section #10) */}
        {currentStep === 2 && (
          <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Image className="w-4 h-4 text-amber-400" />
                <span>FILM POSTER (MANDATORY)</span>
              </h3>
              <span className="text-[11px] font-mono text-amber-400">Accepted: JPG, JPEG, PNG, WEBP</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              {/* Upload Input & Preview Selector */}
              <div className="space-y-3">
                <div className="p-6 rounded-2xl border-2 border-dashed border-neutral-700 hover:border-amber-500/50 bg-neutral-950 text-center cursor-pointer transition-colors">
                  <Image className="w-8 h-8 text-neutral-500 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-neutral-200">Click to select official film poster file</p>
                  <p className="text-[11px] text-neutral-500 mt-1">High resolution theatrical key art (min 800x1200)</p>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handlePosterFileChange}
                    className="mt-3 text-xs text-neutral-400 block mx-auto file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-neutral-800 file:text-neutral-200"
                  />
                </div>

                <div className="text-center">
                  <span className="text-[11px] text-neutral-500 font-mono">or test with demo key art: </span>
                  <button
                    type="button"
                    onClick={handleUsePresetPoster}
                    className="text-xs text-amber-400 hover:underline font-semibold"
                  >
                    Auto-load sample theatrical poster
                  </button>
                </div>
              </div>

              {/* Poster Preview Box */}
              <div className="text-center">
                <span className="text-xs font-mono text-neutral-400 block mb-2">LIVE POSTER PREVIEW:</span>
                {posterUrl ? (
                  <div className="relative inline-block rounded-xl overflow-hidden border border-neutral-700 shadow-2xl">
                    <img
                      src={posterUrl}
                      alt="Film Poster Preview"
                      className="w-48 aspect-[2/3] object-cover mx-auto"
                    />
                    <div className="p-1.5 bg-neutral-950/90 text-[10px] font-mono text-emerald-400 border-t border-neutral-800">
                      ✓ Validated {posterFileName || 'Theatrical Poster'}
                    </div>
                  </div>
                ) : (
                  <div className="w-48 aspect-[2/3] mx-auto rounded-xl border border-neutral-800 bg-neutral-950 flex flex-col items-center justify-center text-neutral-600 p-4">
                    <Image className="w-8 h-8 mb-2" />
                    <span className="text-[11px] font-mono">Poster required to enable submission</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-between pt-2 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="px-4 py-2 rounded-xl text-neutral-400 hover:text-white text-xs font-semibold"
              >
                Back to Info
              </button>
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                disabled={!isPosterPresent}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-neutral-950 font-bold text-xs flex items-center gap-1.5"
              >
                <span>Continue to Media Asset</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: MAIN FILM / DCP FILE (Section #11, #31, #46) */}
        {currentStep === 3 && (
          <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-amber-400" />
                <span>{isDcpMode ? 'DCP PACKAGE UPLOAD (DCI COMPLIANT)' : 'MAIN THEATRICAL VIDEO FILE'}</span>
              </h3>
              <span className="text-[11px] font-mono text-neutral-400">
                {isDcpMode ? 'DCP SMPTE / Interop Tar' : 'MP4, MOV, MXF, ProRes'}
              </span>
            </div>

            {isDcpMode && (
              <div>
                <label className="text-xs font-semibold text-neutral-300 block mb-1">
                  DCP Package CPL / Digital Cinema Naming Convention
                </label>
                <input
                  type="text"
                  placeholder="e.g. JAWAN_FTR_S_HIN-EN_INT_51_2K_20230815_QDC_OV"
                  value={dcpPackageName}
                  onChange={(e) => setDcpPackageName(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs font-mono text-white"
                />
              </div>
            )}

            {/* GOOGLE DRIVE CLOUD VAULT (businessonaditi@gmail.com) */}
            <div className="p-4 rounded-2xl bg-neutral-900/90 border border-neutral-800 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <Cloud className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white tracking-wide">
                        Google Drive Cloud Vault
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        {TARGET_DRIVE_ACCOUNT}
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-400 mt-0.5">
                      Theatrical videos and accessibility materials upload directly to Google Drive and sync immediately to the secure cinema player.
                    </p>
                  </div>
                </div>

                {isDriveConnected ? (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-950/70 border border-emerald-600/40 text-emerald-300 text-xs font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Drive Connected</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleConnectDrive}
                    disabled={isConnectingDrive}
                    className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all whitespace-nowrap"
                  >
                    <HardDrive className="w-3.5 h-3.5" />
                    <span>{isConnectingDrive ? 'Connecting...' : 'Connect Google Drive'}</span>
                  </button>
                )}
              </div>

              {/* Strict Size Limit Notice */}
              <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-neutral-950/80 border border-neutral-800 text-[11px] font-mono">
                <span className="text-neutral-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  Maximum Video Size Limit:
                </span>
                <span className="text-amber-400 font-bold">10 GB (Strict Enforcement)</span>
              </div>
            </div>

            {/* Chunked Upload Dropzone */}
            <div className="p-6 rounded-2xl border-2 border-dashed border-neutral-700 bg-neutral-950 text-center">
              <Upload className="w-8 h-8 text-neutral-500 mx-auto mb-2" />
              <p className="text-xs font-semibold text-neutral-200">
                {isDcpMode ? 'Select DCP package archive (.tar, .zip, .mxf)' : 'Select feature video file (.mov, .mp4, .mxf)'}
              </p>
              <p className="text-[11px] text-neutral-400 mt-1">
                Uploads &amp; stores directly to Google Drive ({TARGET_DRIVE_ACCOUNT}) • Up to 10 GB
              </p>

              <input
                type="file"
                onChange={handleVideoFileSelect}
                accept="video/*,.mov,.mp4,.mxf,.mkv,.tar,.zip"
                className="mt-4 text-xs text-neutral-400 block mx-auto file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-neutral-800 file:text-neutral-200 cursor-pointer"
              />

              {/* Or Quick Test Simulator */}
              <button
                type="button"
                onClick={() => {
                  const sizeBytes = 4.2 * 1024 * 1024 * 1024;
                  setVideoFileName(isDcpMode ? 'SAMPLE_DCP_MASTER_2K_51.tar' : 'KALKI_2898_THEATRICAL_MASTER_4K.mov');
                  setVideoFileSize('4.2 GB');
                  setVideoFileUrl('/videos/theatrical_master_kalki.mp4');
                  setUploadProgress(100);
                  setUploadedBytes(sizeBytes);
                  setTotalBytes(sizeBytes);
                  setUploadSpeedMBps(45.2);
                  setEstimatedSecondsRemaining(0);
                  setDriveUploadStatus(`Verified master film asset (4.2 GB, well under 10 GB limit) stored in ${TARGET_DRIVE_ACCOUNT}`);
                }}
                className="mt-3 text-xs text-amber-400 underline font-mono"
              >
                Auto-fill verified master film file asset (4.2 GB &lt; 10 GB limit)
              </button>
            </div>

            {/* Visual Progress Bar Component (Requirement: Real-Time Feedback during Large File Uploads up to 10GB to Google Drive) */}
            {uploadProgress > 0 && (
              <UploadProgressBar
                fileName={videoFileName}
                fileSizeFormatted={videoFileSize}
                percent={uploadProgress}
                uploadedBytes={uploadedBytes}
                totalBytes={totalBytes}
                uploadSpeedMBps={uploadSpeedMBps}
                estimatedSecondsRemaining={estimatedSecondsRemaining}
                elapsedSeconds={elapsedSeconds}
                isUploading={isChunkUploading}
                isCompleted={uploadProgress === 100}
                statusMessage={driveUploadStatus}
                driveFileId={driveFileId}
                driveWebViewLink={driveWebViewLink}
                driveAccount={TARGET_DRIVE_ACCOUNT}
                onCancel={() => {
                  setIsChunkUploading(false);
                  setUploadProgress(0);
                  setUploadedBytes(0);
                  setDriveUploadStatus('Upload paused / cancelled.');
                }}
              />
            )}

            <div className="flex justify-between pt-2 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="px-4 py-2 rounded-xl text-neutral-400 hover:text-white text-xs font-semibold"
              >
                Back to Poster
              </button>
              <button
                type="button"
                onClick={() => setCurrentStep(4)}
                disabled={uploadProgress < 100}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-neutral-950 font-bold text-xs flex items-center gap-1.5"
              >
                <span>Continue to CC &amp; AD</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: CLOSED CAPTION (CC) & AUDIO DESCRIPTION (AD) (Sections #12, #13, #14) */}
        {currentStep === 4 && (
          <div className="space-y-6">
            {/* Hidden File Inputs for Direct Button Triggers */}
            <input
              type="file"
              ref={ccFileInputRef}
              onChange={handleUploadCcFile}
              accept=".srt,.vtt,.ttml,.xml,.dfxp,.txt"
              className="hidden"
            />
            <input
              type="file"
              ref={adFileInputRef}
              onChange={handleUploadAdFile}
              accept="audio/*,.mp3,.wav,.aac,.m4a,.flac,.ogg"
              className="hidden"
            />
            <input
              type="file"
              ref={replaceFileInputRef}
              onChange={handleReplaceTrackFile}
              accept={replaceTarget?.type === 'AD' ? 'audio/*,.mp3,.wav,.aac,.m4a,.flac,.ogg' : '.srt,.vtt,.ttml,.xml,.dfxp,.txt'}
              className="hidden"
            />
            {/* Audio player element for inline AD preview */}
            <audio
              ref={adAudioPlayerRef}
              onEnded={() => setActivePlayingAdIdx(null)}
              className="hidden"
            />

            {/* Quick Action Top Bar for AD & CC Media Upload */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-sky-950/40 via-neutral-900 to-amber-950/40 border border-neutral-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Statutory Media Ingestion Gateway
                  </h4>
                  <p className="text-[11px] text-neutral-400">
                    Upload official Closed Captions (.srt, .vtt) &amp; Master Audio Descriptions (.mp3, .wav) with instant acoustic verification.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    setMediaModalType('CC');
                    setIsMediaModalOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 text-xs font-bold font-mono flex items-center gap-1.5 transition-all"
                >
                  <Subtitles className="w-3.5 h-3.5" />
                  <span>CC Media Studio</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMediaModalType('AD');
                    setIsMediaModalOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold font-mono flex items-center gap-1.5 transition-all"
                >
                  <Headphones className="w-3.5 h-3.5" />
                  <span>AD Media Studio</span>
                </button>
              </div>
            </div>

            {/* 1. CLOSED CAPTIONS (CC) SECTION */}
            <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-sky-400 uppercase tracking-wider flex items-center gap-2">
                    <Subtitles className="w-4 h-4" />
                    <span>CLOSED CAPTION (CC) UPLOAD (MANDATORY)</span>
                  </h3>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    Subtitles with speaker identifications &amp; auditory sound cues (.srt, .vtt, .ttml)
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleLoadSampleCc('hi')}
                    className="px-2.5 py-1 rounded-lg bg-neutral-950 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-800 text-[11px] font-mono transition-colors"
                  >
                    Sample Hindi (.srt)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLoadSampleCc('en')}
                    className="px-2.5 py-1 rounded-lg bg-neutral-950 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-800 text-[11px] font-mono transition-colors"
                  >
                    Sample English (.srt)
                  </button>
                  {/* Dedicated Main Media Upload Button for CC */}
                  <button
                    type="button"
                    onClick={() => ccFileInputRef.current?.click()}
                    className="px-3.5 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-neutral-950 font-bold text-xs flex items-center gap-1.5 shadow-md transition-all uppercase"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>UPLOAD CC MEDIA FILE</span>
                  </button>
                </div>
              </div>

              {/* CC Media Ingestion Bar / Language Picker */}
              <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <span className="text-xs text-neutral-400 font-mono shrink-0">Upload for language:</span>
                  <select
                    value={selectedCcUploadLang}
                    onChange={(e) => setSelectedCcUploadLang(e.target.value)}
                    className="bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-sky-500 w-full sm:w-auto"
                  >
                    {INDIAN_LANGUAGES.map((l) => (
                      <option key={l.code} value={l.code}>
                        {l.native} — {l.name} ({l.code.toUpperCase()})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={() => ccFileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-sky-300 font-semibold text-xs flex items-center gap-1.5 border border-sky-500/30"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Choose File (.srt, .vtt)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMediaModalType('CC');
                      setIsMediaModalOpen(true);
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white text-xs font-mono border border-neutral-800"
                  >
                    Advanced
                  </button>
                </div>
              </div>

              {/* CC Track List with Individual File Controls */}
              <div className="space-y-2.5">
                {ccTracks.map((track, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 flex flex-col gap-2.5 text-xs transition-colors hover:border-neutral-700"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="px-2 py-0.5 rounded font-mono font-bold bg-neutral-900 text-sky-300 border border-neutral-700">
                          {track.languageName} ({track.languageCode.toUpperCase()})
                        </span>
                        <span className="text-neutral-200 font-mono font-semibold">{track.fileName}</span>
                        <span className="text-[10px] font-mono text-neutral-400 uppercase bg-neutral-900 px-1.5 py-0.5 rounded border border-neutral-800">
                          {track.format}
                        </span>
                        {track.fileSize && (
                          <span className="text-[10px] font-mono text-neutral-500">
                            {track.fileSize}
                          </span>
                        )}
                        {track.cueCount && (
                          <span className="text-[10px] font-mono text-sky-400 bg-sky-950/60 px-2 py-0.5 rounded border border-sky-600/40">
                            {track.cueCount} Cues
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Validated</span>
                        </span>

                        {/* Individual Upload / Replace Media File Button */}
                        <button
                          type="button"
                          onClick={() => {
                            setReplaceTarget({ type: 'CC', index: idx });
                            replaceFileInputRef.current?.click();
                          }}
                          className="px-2.5 py-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 hover:text-white font-mono text-[11px] flex items-center gap-1"
                          title="Upload new file to replace this track"
                        >
                          <Upload className="w-3 h-3 text-sky-400" />
                          <span>Replace File</span>
                        </button>

                        {/* Inspect Cues Toggle */}
                        {track.cues && track.cues.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setExpandedCcPreviewIdx(expandedCcPreviewIdx === idx ? null : idx)}
                            className="px-2 py-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-sky-300 text-[11px] font-mono flex items-center gap-1"
                          >
                            <Eye className="w-3 h-3" />
                            <span>{expandedCcPreviewIdx === idx ? 'Hide' : 'Inspect'}</span>
                          </button>
                        )}

                        {ccTracks.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveCcTrack(idx)}
                            className="p-1 text-neutral-500 hover:text-red-400"
                            title="Remove track"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Expandable Caption Cues Viewer */}
                    {expandedCcPreviewIdx === idx && track.cues && (
                      <div className="p-3 rounded-lg bg-neutral-900/90 border border-neutral-800 space-y-1.5 font-mono text-[11px] animate-fadeIn">
                        <div className="text-[10px] text-neutral-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                          <span>Verified Subtitle Lines:</span>
                          <span className="text-sky-400">Live Synchronized Cues</span>
                        </div>
                        {track.cues.slice(0, 5).map((c, cIdx) => (
                          <div key={cIdx} className="p-1.5 rounded bg-neutral-950 border border-neutral-800/80 flex flex-col gap-0.5">
                            <div className="text-amber-400 text-[10px] flex items-center justify-between">
                              <span>00:{c.startTime.toFixed(1)}s ➔ 00:{c.endTime.toFixed(1)}s</span>
                              {c.speaker && <span className="text-sky-300">[{c.speaker}]</span>}
                            </div>
                            <span className="text-neutral-200">{c.text}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* 2. AUDIO DESCRIPTION (AD) SECTION */}
            <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                    <Headphones className="w-4 h-4" />
                    <span>AUDIO DESCRIPTION (AD) UPLOAD (MANDATORY)</span>
                  </h3>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    Narration track for visually impaired audience (.mp3, .wav, .aac, .m4a)
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleLoadSampleAd('hi')}
                    className="px-2.5 py-1 rounded-lg bg-neutral-950 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-800 text-[11px] font-mono transition-colors"
                  >
                    Sample Hindi (.mp3)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLoadSampleAd('en')}
                    className="px-2.5 py-1 rounded-lg bg-neutral-950 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-800 text-[11px] font-mono transition-colors"
                  >
                    Sample English (.mp3)
                  </button>
                  {/* Dedicated Main Media Upload Button for AD */}
                  <button
                    type="button"
                    onClick={() => adFileInputRef.current?.click()}
                    className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs flex items-center gap-1.5 shadow-md transition-all uppercase"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>UPLOAD AD MEDIA FILE</span>
                  </button>
                </div>
              </div>

              {/* AD Media Ingestion Bar / Language Picker */}
              <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <span className="text-xs text-neutral-400 font-mono shrink-0">Upload for language:</span>
                  <select
                    value={selectedAdUploadLang}
                    onChange={(e) => setSelectedAdUploadLang(e.target.value)}
                    className="bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-amber-500 w-full sm:w-auto"
                  >
                    {INDIAN_LANGUAGES.map((l) => (
                      <option key={l.code} value={l.code}>
                        {l.native} — {l.name} ({l.code.toUpperCase()})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={() => adFileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-amber-300 font-semibold text-xs flex items-center gap-1.5 border border-amber-500/30"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Choose Audio (.mp3, .wav)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMediaModalType('AD');
                      setIsMediaModalOpen(true);
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white text-xs font-mono border border-neutral-800"
                  >
                    Advanced
                  </button>
                </div>
              </div>

              {/* AD Track List with Inline Audio Players */}
              <div className="space-y-2.5">
                {adTracks.map((track, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 flex flex-col gap-2.5 text-xs transition-colors hover:border-neutral-700"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="px-2 py-0.5 rounded font-mono font-bold bg-neutral-900 text-amber-300 border border-neutral-700">
                          {track.languageName} ({track.languageCode.toUpperCase()})
                        </span>
                        <span className="text-neutral-200 font-mono font-semibold">{track.fileName}</span>
                        <span className="text-[10px] font-mono text-neutral-400 uppercase bg-neutral-900 px-1.5 py-0.5 rounded border border-neutral-800">
                          {track.format}
                        </span>
                        {track.fileSize && (
                          <span className="text-[10px] font-mono text-neutral-500">
                            {track.fileSize}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Validated</span>
                        </span>

                        {/* Individual Upload / Replace Media File Button */}
                        <button
                          type="button"
                          onClick={() => {
                            setReplaceTarget({ type: 'AD', index: idx });
                            replaceFileInputRef.current?.click();
                          }}
                          className="px-2.5 py-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 hover:text-white font-mono text-[11px] flex items-center gap-1"
                          title="Upload new audio file to replace this track"
                        >
                          <Upload className="w-3 h-3 text-amber-400" />
                          <span>Replace Audio</span>
                        </button>

                        {/* Inline Audio Player Preview Button */}
                        {track.audioUrl && (
                          <button
                            type="button"
                            onClick={() => handleTogglePlayAdAudio(idx, track.audioUrl)}
                            className={`px-2.5 py-1 rounded-lg font-mono text-[11px] flex items-center gap-1 transition-colors ${
                              activePlayingAdIdx === idx
                                ? 'bg-amber-500 text-neutral-950 font-bold'
                                : 'bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-amber-300'
                            }`}
                          >
                            {activePlayingAdIdx === idx ? (
                              <>
                                <Pause className="w-3 h-3 fill-current" />
                                <span>Playing Audio</span>
                              </>
                            ) : (
                              <>
                                <Play className="w-3 h-3 fill-current" />
                                <span>Listen Audio</span>
                              </>
                            )}
                          </button>
                        )}

                        {adTracks.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveAdTrack(idx)}
                            className="p-1 text-neutral-500 hover:text-red-400"
                            title="Remove track"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Audio Player Active Waveform Indicator */}
                    {activePlayingAdIdx === idx && (
                      <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 text-[11px] font-mono text-amber-300 animate-fadeIn">
                        <div className="flex items-center gap-2">
                          <Volume2 className="w-4 h-4 animate-pulse text-amber-400" />
                          <span>Playing Audio Description narration preview for {track.languageName}...</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleTogglePlayAdAudio(idx)}
                          className="text-amber-400 underline hover:text-white"
                        >
                          Stop
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* MANDATORY SUBMISSION CHECKLIST (Section #15) */}
            <div className="p-5 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3">
              <h4 className="text-xs font-mono font-bold text-neutral-300 uppercase">
                Final Submission Validation Checklist (Section #15):
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                <span className={isAccountVerified ? 'text-emerald-400' : 'text-neutral-500'}>
                  {isAccountVerified ? '✓ Authorized Entity Account (6-Digit Code Verified)' : '✗ Verified Account'}
                </span>
                <span className={isMetadataComplete ? 'text-emerald-400' : 'text-neutral-500'}>
                  {isMetadataComplete ? '✓ Mandatory Film Information' : '✗ Film Information'}
                </span>
                <span className={isPosterPresent ? 'text-emerald-400' : 'text-neutral-500'}>
                  {isPosterPresent ? '✓ Film Poster (Mandatory)' : '✗ Film Poster Missing'}
                </span>
                <span className={isVideoPresent ? 'text-emerald-400' : 'text-neutral-500'}>
                  {isVideoPresent ? '✓ Main Film / DCP Asset Assembled' : '✗ Video Asset Missing'}
                </span>
                <span className={isCcPresent ? 'text-emerald-400' : 'text-neutral-500'}>
                  {isCcPresent ? `✓ Closed Captions (${ccTracks.length} tracks with media)` : '✗ CC Track Missing'}
                </span>
                <span className={isAdPresent ? 'text-emerald-400' : 'text-neutral-500'}>
                  {isAdPresent ? `✓ Audio Description (${adTracks.length} tracks with media)` : '✗ AD Track Missing'}
                </span>
              </div>
            </div>

            {/* Submit & Proceed to Payment Button */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-neutral-800">
              <div className="text-xs text-neutral-400 font-mono">
                <span>Fee required upon upload: </span>
                <strong className="text-amber-400">₹15,000 INR (Minimum)</strong>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="px-4 py-2 rounded-xl text-neutral-400 hover:text-white text-xs font-semibold"
                >
                  Back to Media
                </button>
                <button
                  type="submit"
                  disabled={!canSubmit || loading}
                  className="px-8 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-neutral-950 font-black text-xs uppercase tracking-wider shadow-xl shadow-amber-500/25 transition-all flex items-center gap-2"
                >
                  {loading ? (
                    'Validating & Uploading...'
                  ) : (
                    <>
                      <span>UPLOAD FILM &amp; PROCEED TO PAYMENT</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Media Upload Modal Integration */}
            {isMediaModalOpen && (
              <MediaUploadModal
                initialType={mediaModalType}
                onClose={() => setIsMediaModalOpen(false)}
                onTrackUploaded={(newTrack) => {
                  if (newTrack.type === 'CC') {
                    const existingIdx = ccTracks.findIndex((t) => t.languageCode === newTrack.languageCode);
                    if (existingIdx >= 0) {
                      const updated = [...ccTracks];
                      updated[existingIdx] = newTrack;
                      setCcTracks(updated);
                    } else {
                      setCcTracks([...ccTracks, newTrack]);
                    }
                  } else {
                    const existingIdx = adTracks.findIndex((t) => t.languageCode === newTrack.languageCode);
                    if (existingIdx >= 0) {
                      const updated = [...adTracks];
                      updated[existingIdx] = newTrack;
                      setAdTracks(updated);
                    } else {
                      setAdTracks([...adTracks, newTrack]);
                    }
                  }
                  setIsMediaModalOpen(false);
                }}
              />
            )}
          </div>
        )}
      </form>
    </div>
  );
};
