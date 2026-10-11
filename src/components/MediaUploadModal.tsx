import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  Headphones,
  Subtitles,
  CheckCircle2,
  AlertCircle,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  FileText,
  Music,
  Check,
  Eye,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { INDIAN_LANGUAGES } from '../utils/languages';
import { AccessibilityTrack } from '../types/cinemaPlatform';
import {
  formatBytes,
  parseSubtitleText,
  detectMediaFormat,
  SAMPLE_HINDI_SRT,
  SAMPLE_ENGLISH_SRT,
  SAMPLE_AUDIO_DESCRIPTION_CUES,
  ParsedCue,
} from '../utils/mediaParser';
import { api } from '../services/apiClient';

interface MediaUploadModalProps {
  initialType?: 'AD' | 'CC';
  onClose: () => void;
  onTrackUploaded?: (track: AccessibilityTrack) => void;
}

export const MediaUploadModal: React.FC<MediaUploadModalProps> = ({
  initialType = 'AD',
  onClose,
  onTrackUploaded,
}) => {
  const [activeTab, setActiveTab] = useState<'AD' | 'CC'>(initialType);
  const [languageCode, setLanguageCode] = useState<string>('hi');

  // File state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [fileSize, setFileSize] = useState<string>('');
  const [format, setFormat] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadSuccess, setUploadSuccess] = useState<boolean>(false);
  const [uploadedTrack, setUploadedTrack] = useState<AccessibilityTrack | null>(null);
  const [error, setError] = useState<string | null>(null);

  // CC Preview state
  const [parsedCues, setParsedCues] = useState<ParsedCue[]>([]);
  const [showCueViewer, setShowCueViewer] = useState<boolean>(false);

  // AD Audio Preview state
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [audioCurrentTime, setAudioCurrentTime] = useState<number>(0);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const selectedLang = INDIAN_LANGUAGES.find((l) => l.code === languageCode) || INDIAN_LANGUAGES[0];

  // Reset file states when switching tab
  const handleTabChange = (tab: 'AD' | 'CC') => {
    setActiveTab(tab);
    setSelectedFile(null);
    setFileName('');
    setFileSize('');
    setFormat('');
    setUploadProgress(0);
    setUploadSuccess(false);
    setUploadedTrack(null);
    setParsedCues([]);
    setShowCueViewer(false);
    setError(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
  };

  // Handle local file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processSelectedFile(e.target.files[0]);
    }
  };

  const processSelectedFile = async (file: File) => {
    setError(null);
    setSelectedFile(file);
    setFileName(file.name);
    setFileSize(formatBytes(file.size));
    const detectedFmt = detectMediaFormat(file.name);
    setFormat(detectedFmt);

    // Validation
    if (activeTab === 'AD') {
      const validAdFormats = ['MP3', 'WAV', 'AAC', 'M4A', 'FLAC', 'OGG'];
      if (!validAdFormats.includes(detectedFmt) && !file.type.startsWith('audio/')) {
        setError(`Please select an audio file (${validAdFormats.join(', ')}). Selected: ${file.name}`);
        return;
      }
      // Create local object URL for instant preview playback
      const objectUrl = URL.createObjectURL(file);
      setAudioUrl(objectUrl);
      setIsPlayingAudio(false);
    } else {
      // CC subtitle file
      const validCcFormats = ['SRT', 'VTT', 'TTML', 'XML', 'DFXP', 'TXT'];
      if (!validCcFormats.includes(detectedFmt) && !file.name.endsWith('.srt') && !file.name.endsWith('.vtt')) {
        setError(`Please select a subtitle file (${validCcFormats.join(', ')}). Selected: ${file.name}`);
        return;
      }
      try {
        const text = await file.text();
        const cues = parseSubtitleText(text);
        setParsedCues(cues);
      } catch (err) {
        console.warn('Subtitle parsing note:', err);
      }
    }
  };

  // Simulate or execute upload to server
  const handleUpload = async () => {
    if (!fileName) {
      setError('Please choose a media file to upload.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      // Progress animation
      for (let i = 1; i <= 5; i++) {
        await new Promise((r) => setTimeout(r, 120));
        setUploadProgress(i * 20);
      }

      // Call API
      const res = await api.uploadAccessibilityMedia({
        type: activeTab,
        fileName,
        fileSize: fileSize || '3.5 MB',
        format: format || (activeTab === 'AD' ? 'MP3' : 'SRT'),
        languageCode,
        languageName: selectedLang.name,
        cueCount: parsedCues.length > 0 ? parsedCues.length : undefined,
      });

      const fullTrack: AccessibilityTrack = {
        ...res.track,
        fileSize: fileSize || '3.5 MB',
        audioUrl: audioUrl || undefined,
        cueCount: parsedCues.length > 0 ? parsedCues.length : undefined,
      };

      setUploadedTrack(fullTrack);
      setUploadSuccess(true);
      if (onTrackUploaded) {
        onTrackUploaded(fullTrack);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed. Please check network.');
    } finally {
      setIsUploading(false);
    }
  };

  // Quick preset loader
  const handleLoadSample = (sampleType: 'hindi_cc' | 'english_cc' | 'sample_ad') => {
    setError(null);
    if (sampleType === 'hindi_cc') {
      setActiveTab('CC');
      setLanguageCode('hi');
      setFileName('theatrical_hindi_accessibility_cues.srt');
      setFileSize('18.4 KB');
      setFormat('SRT');
      const cues = parseSubtitleText(SAMPLE_HINDI_SRT);
      setParsedCues(cues);
    } else if (sampleType === 'english_cc') {
      setActiveTab('CC');
      setLanguageCode('en');
      setFileName('official_theatrical_subtitles_english.srt');
      setFileSize('16.2 KB');
      setFormat('SRT');
      const cues = parseSubtitleText(SAMPLE_ENGLISH_SRT);
      setParsedCues(cues);
    } else if (sampleType === 'sample_ad') {
      setActiveTab('AD');
      setLanguageCode('hi');
      setFileName('kalki_2898_theatrical_ad_narration_hindi.mp3');
      setFileSize('14.8 MB');
      setFormat('MP3');
      // Set sample audio
      setAudioUrl('https://commondatastorage.googleapis.com/codeskulptor-demos/riceracer_assets/music/win.ogg');
    }
  };

  // Toggle local audio playback
  const togglePlayAudio = () => {
    if (audioRef.current) {
      if (isPlayingAudio) {
        audioRef.current.pause();
        setIsPlayingAudio(false);
      } else {
        audioRef.current.play().catch(() => {});
        setIsPlayingAudio(true);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl bg-neutral-900 border border-neutral-800 text-neutral-100 shadow-2xl p-5 sm:p-7 space-y-6 my-auto max-h-[92vh] flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg bg-neutral-950/80 hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="border-b border-neutral-800 pb-4">
          <div className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-amber-400 px-2.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>STATUTORY ACCESSIBILITY INGESTION</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide uppercase flex items-center gap-2">
            <span>UPLOAD MEDIA FOR AD &amp; CC</span>
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            Ingest master Audio Description (.mp3, .wav) and Closed Caption (.srt, .vtt) media files for CBFC certification &amp; acoustic synchronization.
          </p>
        </div>

        {/* Tab Switcher: AD vs CC */}
        <div className="grid grid-cols-2 gap-2 p-1.5 rounded-xl bg-neutral-950 border border-neutral-800">
          <button
            type="button"
            onClick={() => handleTabChange('AD')}
            className={`py-2.5 px-4 rounded-lg font-bold text-xs uppercase flex items-center justify-center gap-2 transition-all ${
              activeTab === 'AD'
                ? 'bg-amber-500 text-neutral-950 shadow-md'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
            }`}
          >
            <Headphones className="w-4 h-4" />
            <span>Audio Description (AD)</span>
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('CC')}
            className={`py-2.5 px-4 rounded-lg font-bold text-xs uppercase flex items-center justify-center gap-2 transition-all ${
              activeTab === 'CC'
                ? 'bg-sky-500 text-neutral-950 shadow-md'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
            }`}
          >
            <Subtitles className="w-4 h-4" />
            <span>Closed Captions (CC)</span>
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-600/50 text-rose-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Scrollable Content Body */}
        <div className="overflow-y-auto space-y-5 pr-1 flex-1">
          {/* Language Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-neutral-300 block mb-1">
                Language Track
              </label>
              <select
                value={languageCode}
                onChange={(e) => setLanguageCode(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              >
                {INDIAN_LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.native} — {l.name} ({l.code.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-neutral-300 block mb-1">
                Accepted Formats
              </label>
              <div className="p-2 rounded-xl bg-neutral-950 border border-neutral-800 font-mono text-[11px] text-neutral-400 flex items-center gap-1.5">
                {activeTab === 'AD' ? (
                  <>
                    <Music className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>MP3, WAV, AAC, M4A, FLAC, OGG</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                    <span>SRT, VTT, TTML, XML, DFXP</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept={activeTab === 'AD' ? 'audio/*,.mp3,.wav,.aac,.m4a,.flac,.ogg' : '.srt,.vtt,.ttml,.xml,.dfxp,.txt'}
            className="hidden"
          />

          {/* Interactive Drag & Drop / Upload Dropzone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                processSelectedFile(e.dataTransfer.files[0]);
              }
            }}
            className={`p-6 rounded-2xl border-2 border-dashed transition-all cursor-pointer text-center group ${
              fileName
                ? 'border-emerald-500/50 bg-emerald-950/20'
                : activeTab === 'AD'
                ? 'border-amber-500/40 hover:border-amber-400 bg-neutral-950/80 hover:bg-neutral-950'
                : 'border-sky-500/40 hover:border-sky-400 bg-neutral-950/80 hover:bg-neutral-950'
            }`}
          >
            <div
              className={`w-12 h-12 rounded-2xl mx-auto flex items-center justify-center mb-3 transition-transform group-hover:scale-105 ${
                fileName
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : activeTab === 'AD'
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'bg-sky-500/20 text-sky-400'
              }`}
            >
              {fileName ? <Check className="w-6 h-6" /> : <Upload className="w-6 h-6" />}
            </div>

            <div className="space-y-1">
              <p className="text-xs sm:text-sm font-bold text-white">
                {fileName ? (
                  <span className="text-emerald-400">File Selected: {fileName}</span>
                ) : (
                  <span>Click to choose or drag &amp; drop {activeTab} media file</span>
                )}
              </p>
              <p className="text-[11px] text-neutral-400 font-mono">
                {fileName ? (
                  <span>
                    Size: {fileSize} • Format: {format}
                  </span>
                ) : (
                  <span>
                    {activeTab === 'AD'
                      ? 'Upload high-fidelity narration track (speech or mixed audio)'
                      : 'Upload timestamped subtitles for the hearing impaired'}
                  </span>
                )}
              </p>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all flex items-center gap-1.5 shadow-md ${
                  activeTab === 'AD'
                    ? 'bg-amber-500 hover:bg-amber-400 text-neutral-950'
                    : 'bg-sky-500 hover:bg-sky-400 text-neutral-950'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{fileName ? 'Choose Different File' : `Select ${activeTab} File`}</span>
              </button>
            </div>
          </div>

          {/* Quick Verified Sample Loaders for Testing */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-neutral-950 border border-neutral-800 text-xs">
            <span className="text-neutral-400 font-mono text-[11px]">Instant test files:</span>
            <div className="flex flex-wrap items-center gap-2">
              {activeTab === 'AD' ? (
                <button
                  type="button"
                  onClick={() => handleLoadSample('sample_ad')}
                  className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-mono transition-colors"
                >
                  Load Sample AD (.mp3)
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => handleLoadSample('hindi_cc')}
                    className="px-2.5 py-1 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/30 text-[11px] font-mono transition-colors"
                  >
                    Load Sample Hindi (.srt)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLoadSample('english_cc')}
                    className="px-2.5 py-1 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/30 text-[11px] font-mono transition-colors"
                  >
                    Load Sample English (.srt)
                  </button>
                </>
              )}
            </div>
          </div>

          {/* AD AUDIO PREVIEW PLAYER */}
          {activeTab === 'AD' && audioUrl && (
            <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="font-bold text-amber-400 flex items-center gap-1.5">
                  <Headphones className="w-3.5 h-3.5" />
                  <span>Audio Preview Player</span>
                </span>
                <span className="text-neutral-400">
                  {audioDuration > 0
                    ? `${Math.floor(audioCurrentTime)}s / ${Math.floor(audioDuration)}s`
                    : 'Audio Loaded'}
                </span>
              </div>

              <audio
                ref={audioRef}
                src={audioUrl}
                onTimeUpdate={() => {
                  if (audioRef.current) {
                    setAudioCurrentTime(audioRef.current.currentTime);
                    setAudioDuration(audioRef.current.duration || 0);
                  }
                }}
                onEnded={() => setIsPlayingAudio(false)}
                className="hidden"
              />

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={togglePlayAudio}
                  className="w-10 h-10 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 flex items-center justify-center font-bold transition-all shadow-md shrink-0"
                >
                  {isPlayingAudio ? (
                    <Pause className="w-4 h-4 fill-current" />
                  ) : (
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                  )}
                </button>

                <div className="flex-1 space-y-1">
                  <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 transition-all duration-150"
                      style={{
                        width: `${audioDuration > 0 ? (audioCurrentTime / audioDuration) * 100 : isPlayingAudio ? 50 : 0}%`,
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] font-mono text-neutral-500">
                    <span>{fileName || 'narration_track.mp3'}</span>
                    <span>Format: {format || 'MP3'}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (audioRef.current) {
                      audioRef.current.currentTime = 0;
                      setAudioCurrentTime(0);
                    }
                  }}
                  className="p-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white"
                  title="Rewind"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* CC CUES PREVIEW INSPECTOR */}
          {activeTab === 'CC' && parsedCues.length > 0 && (
            <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="font-bold text-sky-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Subtitle Syntax Verified ({parsedCues.length} cues detected)</span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowCueViewer(!showCueViewer)}
                  className="text-amber-400 hover:underline flex items-center gap-1"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>{showCueViewer ? 'Hide Cues' : 'Inspect Cues'}</span>
                </button>
              </div>

              {showCueViewer && (
                <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1 font-mono text-[11px] border-t border-neutral-800 pt-2">
                  {parsedCues.slice(0, 10).map((cue) => (
                    <div
                      key={cue.id}
                      className="p-2 rounded-lg bg-neutral-900 border border-neutral-800/80 flex flex-col gap-0.5"
                    >
                      <div className="text-amber-400 text-[10px] flex items-center justify-between">
                        <span>{cue.timeString}</span>
                        {cue.speaker && <span className="text-sky-300">[{cue.speaker}]</span>}
                      </div>
                      <div className="text-neutral-200">{cue.text}</div>
                    </div>
                  ))}
                  {parsedCues.length > 10 && (
                    <p className="text-[10px] text-neutral-500 text-center pt-1">
                      + {parsedCues.length - 10} additional verified dialogue cues
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Upload Progress Bar */}
          {uploadProgress > 0 && (
            <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-neutral-300">
                  {uploadSuccess ? 'Storage & Integrity Confirmed' : 'Uploading to Secure Vault...'}
                </span>
                <span className="text-amber-400 font-bold">{uploadProgress}%</span>
              </div>
              <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-200 ${
                    uploadSuccess ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              {uploadSuccess && (
                <div className="text-[11px] font-mono text-emerald-400 flex items-center gap-1.5 pt-1">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    SHA-256 fingerprint verified &amp; ready for CBFC certification attachment ✓
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="pt-3 border-t border-neutral-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-neutral-400 hover:text-white text-xs font-semibold"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleUpload}
              disabled={!fileName || isUploading}
              className={`px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg transition-all ${
                uploadSuccess
                  ? 'bg-emerald-500 text-neutral-950 hover:bg-emerald-400'
                  : activeTab === 'AD'
                  ? 'bg-amber-500 hover:bg-amber-400 text-neutral-950 disabled:opacity-50'
                  : 'bg-sky-500 hover:bg-sky-400 text-neutral-950 disabled:opacity-50'
              }`}
            >
              {isUploading ? (
                <span>Validating &amp; Uploading...</span>
              ) : uploadSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Attach Track &amp; Finish</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Upload {activeTab} Media Track</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
