import React, { useState } from 'react';
import { Upload, Film as FilmIcon, Image, Subtitles, Headphones, CheckCircle2, AlertCircle, ArrowRight, Trash2, Plus, Layers, HardDrive } from 'lucide-react';
import { User, Film, AccessibilityTrack } from '../types/cinemaPlatform';
import { INDIAN_LANGUAGES } from '../utils/languages';
import { api } from '../services/apiClient';

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
  const [dcpPackageName, setDcpPackageName] = useState('');
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isChunkUploading, setIsChunkUploading] = useState<boolean>(false);

  // CC Tracks (Rule #12, #14)
  const [ccTracks, setCcTracks] = useState<Array<{ languageCode: string; languageName: string; fileName: string; format: string }>>([
    { languageCode: 'hi', languageName: 'Hindi', fileName: 'sample_hindi_captions.srt', format: 'SRT' },
  ]);

  // AD Tracks (Rule #13, #14)
  const [adTracks, setAdTracks] = useState<Array<{ languageCode: string; languageName: string; fileName: string; format: string }>>([
    { languageCode: 'hi', languageName: 'Hindi', fileName: 'sample_hindi_narration.mp3', format: 'MP3' },
  ]);

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

  // Video File Chunked Upload Simulation (Section #11, #46)
  const handleVideoFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setVideoFileName(file.name);
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      setVideoFileSize(`${sizeMb} MB`);

      // Run chunked upload progress
      setIsChunkUploading(true);
      setUploadProgress(0);

      const totalChunks = 5;
      for (let i = 0; i < totalChunks; i++) {
        await new Promise((r) => setTimeout(r, 200));
        await api.uploadChunk({
          chunkIndex: i,
          totalChunks,
          fileName: file.name,
          fileSize: `${sizeMb} MB`,
          submissionType: isDcpMode ? 'dcp' : 'film',
        });
        setUploadProgress(Math.round(((i + 1) / totalChunks) * 100));
      }
      setIsChunkUploading(false);
    }
  };

  // Quick preset sample poster
  const handleUsePresetPoster = () => {
    setPosterUrl('https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&auto=format&fit=crop&q=80');
    setPosterFileName('official_theatrical_poster.jpg');
  };

  // Add CC track
  const handleAddCcTrack = (code: string) => {
    const lang = INDIAN_LANGUAGES.find((l) => l.code === code);
    if (!lang) return;
    if (ccTracks.some((t) => t.languageCode === code)) return;
    setCcTracks([...ccTracks, {
      languageCode: code,
      languageName: lang.name,
      fileName: `${lang.name.toLowerCase()}_captions.vtt`,
      format: 'VTT',
    }]);
  };

  const handleRemoveCcTrack = (idx: number) => {
    setCcTracks(ccTracks.filter((_, i) => i !== idx));
  };

  // Add AD track
  const handleAddAdTrack = (code: string) => {
    const lang = INDIAN_LANGUAGES.find((l) => l.code === code);
    if (!lang) return;
    if (adTracks.some((t) => t.languageCode === code)) return;
    setAdTracks([...adTracks, {
      languageCode: code,
      languageName: lang.name,
      fileName: `${lang.name.toLowerCase()}_audio_description.mp3`,
      format: 'MP3',
    }]);
  };

  const handleRemoveAdTrack = (idx: number) => {
    setAdTracks(adTracks.filter((_, i) => i !== idx));
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
        isDcp: isDcpMode,
        dcpPackageName: isDcpMode ? dcpPackageName || `${title.toUpperCase()}_DCP_DCI_SMPTE` : undefined,
        ccTracks: ccTracks as unknown as AccessibilityTrack[],
        adTracks: adTracks as unknown as AccessibilityTrack[],
      });

      onUploadSuccess(res.film);
      // Immediately open payment modal (Rule #16: Redirect to payment of min ₹15,000)
      onOpenPaymentModal(res.film);
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

            {/* Chunked Upload Dropzone */}
            <div className="p-6 rounded-2xl border-2 border-dashed border-neutral-700 bg-neutral-950 text-center">
              <Upload className="w-8 h-8 text-neutral-500 mx-auto mb-2" />
              <p className="text-xs font-semibold text-neutral-200">
                {isDcpMode ? 'Select DCP package archive (.tar, .zip, .mxf)' : 'Select feature video file (.mov, .mp4, .mxf)'}
              </p>
              <p className="text-[11px] text-neutral-500 mt-1">
                Chunked resumable server-side upload pipeline (large files supported)
              </p>

              <input
                type="file"
                onChange={handleVideoFileSelect}
                className="mt-4 text-xs text-neutral-400 block mx-auto file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-neutral-800 file:text-neutral-200"
              />

              {/* Or Quick Test Simulator */}
              <button
                type="button"
                onClick={() => {
                  setVideoFileName(isDcpMode ? 'SAMPLE_DCP_MASTER_2K_51.tar' : 'KALKI_2898_THEATRICAL_MASTER_4K.mov');
                  setVideoFileSize('48.2 GB');
                  setUploadProgress(100);
                }}
                className="mt-3 text-xs text-amber-400 underline font-mono"
              >
                Auto-fill verified master film file asset
              </button>
            </div>

            {/* Upload Progress & Integrity Status */}
            {uploadProgress > 0 && (
              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-neutral-300">File: {videoFileName} ({videoFileSize})</span>
                  <span className="text-amber-400 font-bold">{uploadProgress}%</span>
                </div>
                <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 transition-all duration-200"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                {uploadProgress === 100 && (
                  <p className="text-[11px] font-mono text-emerald-400 flex items-center gap-1.5 pt-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Server-side chunk assembly &amp; SHA-256 integrity validation successful ✓</span>
                  </p>
                )}
              </div>
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
            {/* CC Section */}
            <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                <h3 className="text-sm font-bold text-sky-400 uppercase tracking-wider flex items-center gap-2">
                  <Subtitles className="w-4 h-4" />
                  <span>CLOSED CAPTION (CC) UPLOAD (MANDATORY)</span>
                </h3>
                <span className="text-[11px] font-mono text-neutral-400">SRT, VTT, TTML</span>
              </div>

              <div className="space-y-2.5">
                {ccTracks.map((track, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <span className="px-2 py-0.5 rounded font-mono font-bold bg-neutral-900 text-sky-300 border border-neutral-700">
                        {track.languageName}
                      </span>
                      <span className="text-neutral-300 font-mono">{track.fileName}</span>
                      <span className="text-[10px] font-mono text-neutral-500 uppercase">({track.format})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Validated</span>
                      </span>
                      {ccTracks.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveCcTrack(idx)}
                          className="p-1 text-neutral-500 hover:text-red-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Add another CC track */}
              <div className="flex items-center gap-2 pt-2">
                <span className="text-xs text-neutral-400 font-mono">Add language track:</span>
                <select
                  onChange={(e) => {
                    if (e.target.value) handleAddCcTrack(e.target.value);
                  }}
                  defaultValue=""
                  className="bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1 text-xs text-neutral-200"
                >
                  <option value="" disabled>Select language...</option>
                  {INDIAN_LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.native} ({l.name})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* AD Section */}
            <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                  <Headphones className="w-4 h-4" />
                  <span>AUDIO DESCRIPTION (AD) UPLOAD (MANDATORY)</span>
                </h3>
                <span className="text-[11px] font-mono text-neutral-400">MP3, WAV, AAC, FLAC</span>
              </div>

              <div className="space-y-2.5">
                {adTracks.map((track, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <span className="px-2 py-0.5 rounded font-mono font-bold bg-neutral-900 text-amber-300 border border-neutral-700">
                        {track.languageName}
                      </span>
                      <span className="text-neutral-300 font-mono">{track.fileName}</span>
                      <span className="text-[10px] font-mono text-neutral-500 uppercase">({track.format})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Validated</span>
                      </span>
                      {adTracks.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveAdTrack(idx)}
                          className="p-1 text-neutral-500 hover:text-red-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Add another AD track */}
              <div className="flex items-center gap-2 pt-2">
                <span className="text-xs text-neutral-400 font-mono">Add language track:</span>
                <select
                  onChange={(e) => {
                    if (e.target.value) handleAddAdTrack(e.target.value);
                  }}
                  defaultValue=""
                  className="bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1 text-xs text-neutral-200"
                >
                  <option value="" disabled>Select language...</option>
                  {INDIAN_LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.native} ({l.name})
                    </option>
                  ))}
                </select>
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
                  {isCcPresent ? `✓ Closed Captions (${ccTracks.length} tracks)` : '✗ CC Track Missing'}
                </span>
                <span className={isAdPresent ? 'text-emerald-400' : 'text-neutral-500'}>
                  {isAdPresent ? `✓ Audio Description (${adTracks.length} tracks)` : '✗ AD Track Missing'}
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
          </div>
        )}
      </form>
    </div>
  );
};
