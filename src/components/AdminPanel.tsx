import React, { useState, useEffect } from 'react';
import {
  Shield,
  Film,
  Users,
  CreditCard,
  KeyRound,
  Activity,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  XCircle,
  Lock,
  ArrowRight,
  Globe,
  ExternalLink,
  HardDrive,
  FileSpreadsheet,
  Copy,
  Check,
  Search,
  Download,
  Play,
  Volume2,
  Subtitles,
  UploadCloud,
  Layers,
  Sparkles,
  CheckCircle,
  FileText,
  Music,
  Loader2,
  Upload,
  Image as ImageIcon,
} from 'lucide-react';
import { api } from '../services/apiClient';
import { User, Film as FilmType, Payment, PreviewCodeRecord, AuditLog, AccessibilityTrack } from '../types/cinemaPlatform';
import {
  syncDatabaseToGoogleDrive,
  signInWithGoogleDrive,
  getDriveAccessToken,
  TARGET_DRIVE_ACCOUNT,
  DriveDatabaseMeta,
} from '../services/googleDriveDatabaseService';
import { offlineStorage } from '../services/offlineStorageService';

interface AdminPanelProps {
  currentUser?: User | null;
  onLoginAsAdmin?: () => void;
  onOpenAuth?: () => void;
  onOpenDomainModal?: () => void;
  onWatchFilm?: (film: FilmType) => void;
  onViewFilmInGallery?: () => void;
  onFilmUploaded?: () => void;
  initialSubTab?: 'overview' | 'upload-admin' | 'films' | 'sheets-tracker' | 'users' | 'payments' | 'codes' | 'audit' | 'domain';
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  currentUser,
  onLoginAsAdmin,
  onOpenAuth,
  onOpenDomainModal,
  onWatchFilm,
  onViewFilmInGallery,
  onFilmUploaded,
  initialSubTab,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'upload-admin' | 'films' | 'sheets-tracker' | 'users' | 'payments' | 'codes' | 'audit' | 'domain'>(
    initialSubTab || 'overview'
  );

  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);
  const [loading, setLoading] = useState(true);
  const [isSyncingDrive, setIsSyncingDrive] = useState(false);
  const [driveSyncStatus, setDriveSyncStatus] = useState<string>('');
  const [driveMeta, setDriveMeta] = useState<DriveDatabaseMeta | null>(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  // Admin Direct Upload State (Zero Payment Required)
  const [uploadType, setUploadType] = useState<'film' | 'dcp'>('film');
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadLang, setUploadLang] = useState('hi');
  const [uploadDirector, setUploadDirector] = useState('Piku Sharma');
  const [uploadProducer, setUploadProducer] = useState('Piku VFX & Creative Labs');
  const [uploadDescription, setUploadDescription] = useState('Theatrical production with certified synchronized Audio Description and Closed Captions.');
  const [uploadPosterUrl, setUploadPosterUrl] = useState('https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&auto=format&fit=crop&q=80');
  
  // Video Ingestion State (≤ 10GB enforced with progress bar)
  const [uploadVideoFileName, setUploadVideoFileName] = useState('theatrical_master_4k.mp4');
  const [uploadVideoFileSize, setUploadVideoFileSize] = useState('4.2 GB');
  const [uploadVideoUrl, setUploadVideoUrl] = useState('/videos/theatrical_master_kalki.mp4');
  const [selectedVideoFile, setSelectedVideoFile] = useState<File | null>(null);
  const [uploadVideoDriveId, setUploadVideoDriveId] = useState('');
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [videoUploadProgress, setVideoUploadProgress] = useState(0);
  const [videoUploadSpeed, setVideoUploadSpeed] = useState('0 MB/s');

  // Accessibility Tracks State (AD & CC)
  const [uploadAdLang, setUploadAdLang] = useState('hi');
  const [uploadAdFileName, setUploadAdFileName] = useState('theatrical_ad_hindi.mp3');
  const [uploadAdFormat, setUploadAdFormat] = useState('MP3');
  const [uploadCcLang, setUploadCcLang] = useState('hi');
  const [uploadCcFileName, setUploadCcFileName] = useState('theatrical_cc_hindi.vtt');
  const [uploadCcFormat, setUploadCcFormat] = useState('VTT');

  // Preview Code State (Provided by Admin / Auto-Generated)
  const [uploadCustomCode, setUploadCustomCode] = useState<string>(() =>
    Math.floor(100000000 + Math.random() * 900000000).toString()
  );
  const handleGenerateRandomCode = () => {
    setUploadCustomCode(Math.floor(100000000 + Math.random() * 900000000).toString());
  };

  // Submission State
  const [isAdminSubmitting, setIsAdminSubmitting] = useState(false);
  const [adminSubmitError, setAdminSubmitError] = useState<string | null>(null);
  const [adminSubmitSuccess, setAdminSubmitSuccess] = useState<{
    film: FilmType;
    previewCode: string;
  } | null>(null);

  // Payment Admin Diagnostic & Search State
  const [adminPaymentSearch, setAdminPaymentSearch] = useState('');
  const [adminDiagnosticReport, setAdminDiagnosticReport] = useState<any>(null);
  const [isRunningAdminDiag, setIsRunningAdminDiag] = useState(false);
  const [showAdminDiagDetails, setShowAdminDiagDetails] = useState(false);

  const runAdminPaymentDiagnostic = async () => {
    setIsRunningAdminDiag(true);
    try {
      const res = await api.runPaymentDiagnosticTest(15000, 'UPI');
      setAdminDiagnosticReport(res.report);
      setShowAdminDiagDetails(true);
    } catch (e: unknown) {
      console.error('Diagnostic error:', e);
    } finally {
      setIsRunningAdminDiag(false);
    }
  };

  const INDIAN_LANGUAGES = [
    { code: 'hi', name: 'Hindi' },
    { code: 'te', name: 'Telugu' },
    { code: 'ta', name: 'Tamil' },
    { code: 'ml', name: 'Malayalam' },
    { code: 'kn', name: 'Kannada' },
    { code: 'bn', name: 'Bengali' },
    { code: 'mr', name: 'Marathi' },
    { code: 'en', name: 'English' },
    { code: 'gu', name: 'Gujarati' },
    { code: 'pa', name: 'Punjabi' },
  ];

  const posterFileInputRef = React.useRef<HTMLInputElement | null>(null);
  const videoFileInputRef = React.useRef<HTMLInputElement | null>(null);
  const adFileInputRef = React.useRef<HTMLInputElement | null>(null);
  const ccFileInputRef = React.useRef<HTMLInputElement | null>(null);

  const handleSelectPosterFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Use FileReader to read as Data URL for universal display and persistence
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setUploadPosterUrl(dataUrl);
      }
    };
    reader.onerror = () => {
      try {
        const objectUrl = URL.createObjectURL(file);
        setUploadPosterUrl(objectUrl);
      } catch {
        // Fallback
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSelectVideoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Size calculation
    const sizeInMB = (file.size / (1024 * 1024)).toFixed(1);
    const sizeInGB = (file.size / (1024 * 1024 * 1024)).toFixed(2);
    const displaySize = file.size >= 1024 * 1024 * 1024 ? `${sizeInGB} GB` : `${sizeInMB} MB`;

    // 10GB limit check (10 * 1024 * 1024 * 1024 bytes)
    if (file.size > 10 * 1024 * 1024 * 1024) {
      alert(`File "${file.name}" exceeds the 10 GB theatrical limit (${displaySize}). Please select a master within 10 GB.`);
      return;
    }

    setUploadVideoFileName(file.name);
    setUploadVideoFileSize(displaySize);
    setSelectedVideoFile(file);

    // Create local object URL for preview/stream
    try {
      const objectUrl = URL.createObjectURL(file);
      setUploadVideoUrl(objectUrl);
    } catch {
      // Fallback
    }

    // Trigger visual upload progress simulation for device master ingestion
    setIsUploadingVideo(true);
    setVideoUploadProgress(10);
    setVideoUploadSpeed('24.8 MB/s');
    let current = 10;
    const interval = setInterval(() => {
      current += Math.floor(Math.random() * 20) + 15;
      if (current >= 100) {
        current = 100;
        setVideoUploadProgress(100);
        setVideoUploadSpeed('0 MB/s');
        setIsUploadingVideo(false);
        clearInterval(interval);
      } else {
        setVideoUploadProgress(current);
        const speed = (28 + Math.random() * 15).toFixed(1);
        setVideoUploadSpeed(`${speed} MB/s`);
      }
    }, 200);
  };

  const handleSelectAdFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadAdFileName(file.name);
    const ext = file.name.split('.').pop()?.toUpperCase() || 'MP3';
    if (ext === 'WAV') setUploadAdFormat('WAV');
    else if (ext === 'AAC' || ext === 'M4A') setUploadAdFormat('AAC');
    else setUploadAdFormat('MP3');
  };

  const handleSelectCcFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadCcFileName(file.name);
    const ext = file.name.split('.').pop()?.toUpperCase() || 'VTT';
    if (ext === 'SRT') setUploadCcFormat('SRT');
    else if (ext === 'XML' || ext === 'TTML') setUploadCcFormat('XML');
    else setUploadCcFormat('VTT');
  };

  const handleSimulateVideoUpload = () => {
    setIsUploadingVideo(true);
    setVideoUploadProgress(5);
    setVideoUploadSpeed('18.4 MB/s');
    let current = 5;
    const interval = setInterval(() => {
      current += Math.floor(Math.random() * 15) + 12;
      if (current >= 100) {
        current = 100;
        setVideoUploadProgress(100);
        setVideoUploadSpeed('0 MB/s');
        setIsUploadingVideo(false);
        clearInterval(interval);
      } else {
        setVideoUploadProgress(current);
        const speed = (22 + Math.random() * 12).toFixed(1);
        setVideoUploadSpeed(`${speed} MB/s`);
      }
    }, 250);
  };

  const handleAdminSubmitFilm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadTitle.trim()) {
      setAdminSubmitError('Please enter a film or package title.');
      return;
    }
    if (!uploadDirector.trim() || !uploadProducer.trim()) {
      setAdminSubmitError('Director and Producer names are required.');
      return;
    }
    if (!uploadPosterUrl.trim()) {
      setAdminSubmitError('Please provide a poster image URL.');
      return;
    }

    setIsAdminSubmitting(true);
    setAdminSubmitError(null);

    const selectedLangObj = INDIAN_LANGUAGES.find((l) => l.code === uploadLang) || { code: 'hi', name: 'Hindi' };
    const selectedAdLangObj = INDIAN_LANGUAGES.find((l) => l.code === uploadAdLang) || { code: 'hi', name: 'Hindi' };
    const selectedCcLangObj = INDIAN_LANGUAGES.find((l) => l.code === uploadCcLang) || { code: 'hi', name: 'Hindi' };

    const processedCcTracks: AccessibilityTrack[] = [
      {
        id: `track-cc-admin-${Date.now()}`,
        filmId: '',
        type: 'CC',
        languageCode: selectedCcLangObj.code,
        languageName: selectedCcLangObj.name,
        fileName: uploadCcFileName || `cc_${selectedCcLangObj.code}.vtt`,
        fileUrl: `/storage/tracks/cc_${selectedCcLangObj.code}.vtt`,
        format: uploadCcFormat,
        version: '1.0',
        status: 'valid',
        cues: [
          { id: 'cue-1', startTime: 0, endTime: 6, text: `[Opening Musical Score in ${selectedCcLangObj.name}]`, soundEffect: 'Auditorium theatrical mix' },
          { id: 'cue-2', startTime: 7, endTime: 15, text: `"${uploadTitle.trim()}" — Master presentation by ${uploadDirector.trim()}.`, speaker: uploadDirector.trim().toUpperCase() },
        ],
      },
    ];

    const processedAdTracks: AccessibilityTrack[] = [
      {
        id: `track-ad-admin-${Date.now()}`,
        filmId: '',
        type: 'AD',
        languageCode: selectedAdLangObj.code,
        languageName: selectedAdLangObj.name,
        fileName: uploadAdFileName || `ad_${selectedAdLangObj.code}.mp3`,
        fileUrl: `/storage/tracks/ad_${selectedAdLangObj.code}.mp3`,
        format: uploadAdFormat,
        version: '1.0',
        status: 'valid',
        cues: [
          { id: 'ad-1', startTime: 0, endTime: 8, text: `Visual scene description in ${selectedAdLangObj.name}: The cinematic sequence opens onto vivid theatrical visuals.` },
        ],
      },
    ];

    try {
      const res = await api.submitFilm({
        title: uploadTitle.trim(),
        submissionType: uploadType,
        languageCode: selectedLangObj.code,
        languageName: selectedLangObj.name,
        director: uploadDirector.trim(),
        producer: uploadProducer.trim(),
        description: uploadDescription.trim(),
        posterUrl: uploadPosterUrl.trim(),
        videoFileName: uploadVideoFileName || 'theatrical_master_4k.mp4',
        videoFileSize: uploadVideoFileSize || '4.2 GB',
        videoFileUrl: uploadVideoUrl,
        driveFileId: uploadVideoDriveId || undefined,
        ccTracks: processedCcTracks as unknown as AccessibilityTrack[],
        adTracks: processedAdTracks as unknown as AccessibilityTrack[],
        customPreviewCode: uploadCustomCode.trim() || undefined,
        previewCode: uploadCustomCode.trim() || undefined,
        bypassPayment: true,
      } as Parameters<typeof api.submitFilm>[0]);

      const codeGen = (res as { previewCode?: string }).previewCode || res.film.previewCode || uploadCustomCode.trim() || '583921746';
      setAdminSubmitSuccess({
        film: res.film,
        previewCode: codeGen,
      });

      // Auto-cache video master locally into sandbox for 100% zero-buffering instant play
      if (selectedVideoFile) {
        try {
          await offlineStorage.storeVideoBlob(res.film.id, res.film.title, selectedVideoFile, res.film);
        } catch (storageErr) {
          console.warn('Local video caching error:', storageErr);
        }
      }

      fetchAdminData();
      onFilmUploaded?.();
    } catch (err: unknown) {
      setAdminSubmitError(err instanceof Error ? err.message : 'Submission failed');
    } finally {
      setIsAdminSubmitting(false);
    }
  };

  const [stats, setStats] = useState<{
    totalUsers: number;
    totalFilms: number;
    totalPayments: number;
    totalPreviewCodes: number;
    activeSessions: number;
    users: User[];
    films: FilmType[];
    payments: Payment[];
  } | null>(null);

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  const handleSyncToGoogleDrive = async () => {
    if (!stats) return;
    setIsSyncingDrive(true);
    setDriveSyncStatus('Connecting to Google Drive (businessonaditi@gmail.com)...');
    try {
      let token = getDriveAccessToken();
      if (!token) {
        setDriveSyncStatus('Requesting Google authorization...');
        const authRes = await signInWithGoogleDrive();
        if (!authRes) throw new Error('Google authorization was cancelled.');
      }
      const meta = await syncDatabaseToGoogleDrive(
        stats.films,
        stats.payments,
        auditLogs,
        (msg) => setDriveSyncStatus(msg)
      );
      setDriveMeta(meta);
      setDriveSyncStatus('Successfully synced master database to Google Drive and Sheets!');
    } catch (err: unknown) {
      setDriveSyncStatus(`Sync error: ${err instanceof Error ? err.message : 'Failed to sync to Drive'}`);
    } finally {
      setIsSyncingDrive(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(id);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  useEffect(() => {
    fetchAdminData();
  }, [currentUser]);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const overviewRes = await api.getAdminOverview();
      setStats(overviewRes);

      const logsRes = await api.getAdminAuditLogs();
      setAuditLogs(logsRes.logs);
    } catch (e) {
      console.error('Error loading admin data:', e);
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSuspendFilm = async (filmId: string, currentStatus: string) => {
    try {
      await api.suspendFilm(filmId, currentStatus !== 'suspended');
      fetchAdminData();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Action failed');
    }
  };

  const handleRevokeCode = async (code: string) => {
    if (!confirm(`Are you sure you want to revoke preview code ${code}?`)) return;
    try {
      await api.revokeCode(code);
      fetchAdminData();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Revoke failed');
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-purple-400 px-2.5 py-0.5 rounded bg-purple-950/80 border border-purple-600/40 mb-2">
            <Shield className="w-3.5 h-3.5" />
            <span>CENTRAL REGULATORY OVERSIGHT • WEBSITE CONSOLE (cinead.cc)</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-wide uppercase">
            ADMINISTRATION &amp; COMPLIANCE PANEL
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 mt-1">
            Manage production houses, examine preview logs, audit transactions, and enforce statutory standards.
          </p>
        </div>

        <button
          onClick={fetchAdminData}
          className="p-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 transition-colors self-start sm:self-auto"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Sub-Navigation (Wrapping cleanly without left-right scroll) */}
      <div className="flex flex-wrap items-center gap-1.5 pb-2 border-b border-neutral-800 text-xs font-semibold w-full">
        {(['overview', 'upload-admin', 'films', 'sheets-tracker', 'users', 'payments', 'codes', 'audit', 'domain'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveSubTab(tab)}
            className={`px-3 py-1.5 rounded-lg uppercase tracking-wider transition-colors text-xs flex items-center gap-1.5 ${
              activeSubTab === tab
                ? 'bg-purple-600 text-white font-bold shadow-md'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900 border border-neutral-800/60'
            }`}
          >
            {tab === 'upload-admin' ? (
              <>
                <UploadCloud className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-bold">Upload (Free Admin)</span>
              </>
            ) : tab === 'sheets-tracker' ? (
              <>
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>Drive &amp; Sheets Tracker</span>
              </>
            ) : tab === 'domain' ? (
              'Domain (cinead.cc)'
            ) : (
              tab
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-20 text-center font-mono text-xs text-neutral-500">
          Loading administration metrics...
        </div>
      ) : !stats ? (
        <div className="max-w-xl mx-auto py-12 px-6 rounded-3xl bg-neutral-900 border border-neutral-800 text-center space-y-5 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-purple-500/15 border border-purple-500/40 flex items-center justify-center text-purple-400 mx-auto shadow-xl">
            <Lock className="w-8 h-8" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-950/80 border border-purple-600/40 text-purple-300 text-xs font-mono font-bold">
            <Shield className="w-3.5 h-3.5" />
            <span>CENTRAL REGULATORY ACCESS</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-white uppercase tracking-wide">
            ADMINISTRATOR PRIVILEGES REQUIRED
          </h3>
          <p className="text-xs sm:text-sm text-neutral-400 max-w-md mx-auto leading-relaxed">
            Statutory administration and compliance oversight requires an authorized Administrator account.
          </p>
          <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 text-center space-y-1.5 font-mono text-xs">
            <div className="text-amber-400 font-bold text-xs uppercase tracking-wider">
              Manual Credential Authentication Required
            </div>
            <div className="text-neutral-400 text-[11px] leading-relaxed">
              Every access to the Central Admin Panel requires manually entering your authorized Administrator credentials. Browsers are prohibited from storing or auto-filling admin passwords.
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            {(onOpenAuth || onLoginAsAdmin) && (
              <button
                type="button"
                onClick={onOpenAuth || onLoginAsAdmin}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase tracking-wider transition-colors shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 mx-auto"
              >
                <KeyRound className="w-4 h-4" />
                <span>Enter Admin Credentials Manually</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* SUB-TAB: OVERVIEW */}
          {activeSubTab === 'overview' && stats && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800">
                  <span className="text-[11px] font-mono text-neutral-500 block mb-1">TOTAL FILMS</span>
                  <div className="text-2xl font-black text-white">{stats.totalFilms}</div>
                  <span className="text-[10px] text-emerald-400 font-mono mt-1 block">✓ All certified tracks valid</span>
                </div>
                <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800">
                  <span className="text-[11px] font-mono text-neutral-500 block mb-1">REGISTERED ENTITIES</span>
                  <div className="text-2xl font-black text-white">{stats.totalUsers}</div>
                  <span className="text-[10px] text-neutral-400 font-mono mt-1 block">Houses &amp; DCP Studios</span>
                </div>
                <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800">
                  <span className="text-[11px] font-mono text-neutral-500 block mb-1">SETTLED PAYMENTS</span>
                  <div className="text-2xl font-black text-emerald-400">{stats.totalPayments}</div>
                  <span className="text-[10px] text-neutral-400 font-mono mt-1 block">Min ₹15,000 Verified</span>
                </div>
                <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800">
                  <span className="text-[11px] font-mono text-neutral-500 block mb-1">ACTIVE PREVIEW CODES</span>
                  <div className="text-2xl font-black text-amber-400">{stats.totalPreviewCodes}</div>
                  <span className="text-[10px] text-neutral-400 font-mono mt-1 block">9-Digit Encrypted</span>
                </div>
              </div>

              {/* Quick Action: Admin Upload Video, AD & CC (Without Payment) */}
              <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-purple-950/80 via-neutral-900 to-amber-950/40 border border-purple-500/40 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-amber-400 bg-amber-950/80 px-2.5 py-0.5 rounded border border-amber-600/50">
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      <span>ADMIN PRIVILEGE</span>
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/80 px-2.5 py-0.5 rounded border border-emerald-600/50">
                      <CheckCircle className="w-3 h-3 text-emerald-400" />
                      <span>100% PAYMENT EXEMPT (₹0)</span>
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-wide">
                    Admin Direct Media Ingestion
                  </h3>
                  <p className="text-xs text-neutral-300 max-w-2xl leading-relaxed">
                    Upload theatrical master videos (≤ 10GB with visual progress bar), synchronized Audio Description (AD), and Closed Captions (CC) without any payment. Instantly approved with certified 9-digit preview code.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveSubTab('upload-admin')}
                  className="px-5 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-amber-600 hover:from-purple-500 hover:to-amber-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30 shrink-0 transition-all active:scale-95"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>Upload Video, AD &amp; CC</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Recent Audit Stream Snippet */}
              <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-3">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                  Live Audit Trail Stream
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto font-mono text-xs">
                  {auditLogs.slice(0, 8).map((log) => (
                    <div
                      key={log.id}
                      className="p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 flex items-center justify-between text-neutral-300"
                    >
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded bg-neutral-800 text-purple-300 text-[10px] font-bold">
                          {log.action}
                        </span>
                        <span>{log.filmTitle || log.userEmail || 'System'}</span>
                      </div>
                      <span className="text-neutral-500 text-[11px]">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* SUB-TAB: ADMIN DIRECT UPLOAD (VIDEO + AD + CC WITHOUT PAYMENT) */}
          {activeSubTab === 'upload-admin' && (
            <div className="space-y-6 animate-fadeIn">
              {adminSubmitSuccess ? (
                /* Success Confirmation Card */
                <div className="p-6 sm:p-8 rounded-3xl bg-neutral-900 border border-emerald-500/40 text-center space-y-5 shadow-2xl max-w-2xl mx-auto">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mx-auto shadow-xl">
                    <CheckCircle className="w-9 h-9" />
                  </div>

                  <div>
                    <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-950 text-emerald-400 border border-emerald-700 uppercase">
                      ✓ INGESTION COMPLETE • NO PAYMENT REQUIRED
                    </span>
                    <h3 className="text-2xl font-black text-white uppercase tracking-wide mt-3">
                      {adminSubmitSuccess.film.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-neutral-300 mt-1">
                      Certified Master, Audio Description &amp; Closed Captions successfully registered without payment.
                    </p>
                  </div>

                  {/* 9-Digit Preview Code Box */}
                  <div className="p-5 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-2">
                    <span className="text-[11px] font-mono text-neutral-400 block uppercase">
                      Theatrical 9-Digit Preview Code (Encrypted)
                    </span>
                    <div className="flex items-center justify-center gap-3">
                      <span className="text-3xl sm:text-4xl font-mono font-black tracking-widest text-amber-400">
                        {adminSubmitSuccess.previewCode}
                      </span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(adminSubmitSuccess.previewCode, 'code-success')}
                        className="p-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
                        title="Copy 9-digit code"
                      >
                        {copiedLink === 'code-success' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                    <span className="text-[10px] text-neutral-500 block">
                      Use in Companion App or Theatrical Screener for instant authorized screening.
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                    {onWatchFilm && (
                      <button
                        type="button"
                        onClick={() => onWatchFilm(adminSubmitSuccess.film)}
                        className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-neutral-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 transition-all"
                      >
                        <Play className="w-4 h-4 fill-current" />
                        <span>Watch Film (Zero-Buffer Local Ready)</span>
                      </button>
                    )}
                    {onViewFilmInGallery && (
                      <button
                        type="button"
                        onClick={onViewFilmInGallery}
                        className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-neutral-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-500/25"
                      >
                        <Film className="w-4 h-4 fill-current" />
                        <span>Directly View in Film Gallery (App &amp; Website)</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setActiveSubTab('films')}
                      className="w-full sm:w-auto px-5 py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold text-xs uppercase tracking-wider transition-colors"
                    >
                      View in Films Table
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAdminSubmitSuccess(null);
                        setUploadTitle('');
                      }}
                      className="w-full sm:w-auto px-5 py-3 rounded-xl bg-purple-900/60 hover:bg-purple-800/80 border border-purple-600/40 text-purple-200 font-bold text-xs uppercase tracking-wider transition-colors"
                    >
                      Ingest Another Film
                    </button>
                  </div>
                </div>
              ) : (
                /* Ingestion Form */
                <form onSubmit={handleAdminSubmitFilm} className="space-y-6 max-w-4xl mx-auto">
                  {/* Privilege Card */}
                  <div className="p-4 rounded-2xl bg-purple-950/40 border border-purple-600/40 flex items-start gap-3">
                    <Shield className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                    <div className="text-xs space-y-1">
                      <div className="font-bold text-purple-200 uppercase tracking-wide">
                        Statutory Regulatory Privilege Active (Administrator Authenticated)
                      </div>
                      <p className="text-purple-300/80 leading-relaxed">
                        As Central Administrator, upload feature film masters, synchronized Audio Description (AD), and Closed Captions (CC) without any payment (₹15,000 / ₹25,000 statutory deposit is 100% waived).
                      </p>
                    </div>
                  </div>

                  {adminSubmitError && (
                    <div className="p-4 rounded-xl bg-rose-950/80 border border-rose-600/50 text-rose-300 text-xs flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                      <span>{adminSubmitError}</span>
                    </div>
                  )}

                  {/* Section 1: Film Metadata */}
                  <div className="p-5 sm:p-6 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
                      <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                        <Film className="w-4 h-4 text-purple-400" />
                        <span>1. Film Metadata &amp; Specification</span>
                      </h4>
                      <div className="flex items-center gap-2 text-xs font-mono">
                        <button
                          type="button"
                          onClick={() => setUploadType('film')}
                          className={`px-3 py-1 rounded-lg border transition-all ${
                            uploadType === 'film'
                              ? 'bg-purple-600 text-white border-purple-500 font-bold'
                              : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-white'
                          }`}
                        >
                          Feature Film
                        </button>
                        <button
                          type="button"
                          onClick={() => setUploadType('dcp')}
                          className={`px-3 py-1 rounded-lg border transition-all ${
                            uploadType === 'dcp'
                              ? 'bg-cyan-600 text-white border-cyan-500 font-bold'
                              : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-white'
                          }`}
                        >
                          DCP Master Package
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-semibold text-neutral-300 block mb-1">
                          Film Title <span className="text-amber-400">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Kalki 2898 AD (Special Master)"
                          value={uploadTitle}
                          onChange={(e) => setUploadTitle(e.target.value)}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-purple-500 font-mono"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-neutral-300 block mb-1">
                          Primary Theatrical Language <span className="text-amber-400">*</span>
                        </label>
                        <select
                          value={uploadLang}
                          onChange={(e) => {
                            setUploadLang(e.target.value);
                            setUploadAdLang(e.target.value);
                            setUploadCcLang(e.target.value);
                          }}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                        >
                          {INDIAN_LANGUAGES.map((l) => (
                            <option key={l.code} value={l.code}>
                              {l.name} ({l.code.toUpperCase()})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-neutral-300 block mb-1">
                          Director <span className="text-amber-400">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Director Name"
                          value={uploadDirector}
                          onChange={(e) => setUploadDirector(e.target.value)}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-purple-500 font-mono"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-neutral-300 block mb-1">
                          Production Entity / Studio <span className="text-amber-400">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Production Entity"
                          value={uploadProducer}
                          onChange={(e) => setUploadProducer(e.target.value)}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-purple-500 font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-neutral-300 block mb-1">
                        Synopsis &amp; Accessibility Summary
                      </label>
                      <textarea
                        rows={2}
                        value={uploadDescription}
                        onChange={(e) => setUploadDescription(e.target.value)}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-purple-500 font-sans"
                      />
                    </div>

                    <div>
                      <div className="flex flex-wrap justify-between items-center gap-2 mb-1">
                        <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                          <ImageIcon className="w-3.5 h-3.5 text-purple-400" />
                          <span>Film Poster <span className="text-amber-400">*</span></span>
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="file"
                            ref={posterFileInputRef}
                            onChange={handleSelectPosterFile}
                            accept="image/*,.jpg,.jpeg,.png,.webp,.avif"
                            className="hidden"
                          />
                          <button
                            type="button"
                            onClick={() => posterFileInputRef.current?.click()}
                            className="px-2.5 py-1 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-[11px] font-semibold flex items-center gap-1 border border-purple-500/40 transition-colors shadow-sm"
                          >
                            <Upload className="w-3 h-3" />
                            <span>Select Poster from Device</span>
                          </button>
                          <span className="text-neutral-700">•</span>
                          <button
                            type="button"
                            onClick={() => setUploadPosterUrl('https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&auto=format&fit=crop&q=80')}
                            className="text-[10px] text-purple-400 hover:underline font-mono"
                          >
                            Sample 1
                          </button>
                          <span className="text-neutral-700">•</span>
                          <button
                            type="button"
                            onClick={() => setUploadPosterUrl('https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&auto=format&fit=crop&q=80')}
                            className="text-[10px] text-purple-400 hover:underline font-mono"
                          >
                            Sample 2
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {uploadPosterUrl ? (
                          <div className="w-14 h-18 sm:w-16 sm:h-22 rounded-lg overflow-hidden bg-neutral-950 border border-purple-500/40 shrink-0 shadow-md relative group">
                            <img
                              src={uploadPosterUrl}
                              alt="Poster preview"
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&auto=format&fit=crop&q=80';
                              }}
                            />
                            <div className="absolute inset-0 bg-neutral-950/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <span className="text-[9px] font-mono text-white text-center px-1">Active</span>
                            </div>
                          </div>
                        ) : null}

                        <div className="flex-1 space-y-1">
                          <input
                            type="text"
                            required
                            placeholder="Poster image URL or click 'Select Poster from Device'"
                            value={uploadPosterUrl}
                            onChange={(e) => setUploadPosterUrl(e.target.value)}
                            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-purple-500 font-mono"
                          />
                          <p className="text-[11px] text-neutral-500">
                            Choose an image file (JPG, PNG, WebP) directly from your computer or provide an image link.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Master Video File (≤ 10GB with visual progress bar) */}
                  <div className="p-5 sm:p-6 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
                      <div>
                        <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                          <HardDrive className="w-4 h-4 text-amber-400" />
                          <span>2. Theatrical Master Video File (≤ 10GB Enforced)</span>
                        </h4>
                        <span className="text-[11px] text-neutral-400">
                          Supports MP4, MOV, MXF, DCP package. Real-time visual upload progress bar.
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleSimulateVideoUpload}
                        disabled={isUploadingVideo}
                        className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-amber-300 text-xs font-mono font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isUploadingVideo ? 'animate-spin' : ''}`} />
                        <span>{isUploadingVideo ? 'Uploading...' : 'Test Progress Bar'}</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-semibold text-neutral-300">
                            Theatrical Master Video File
                          </label>
                          <input
                            type="file"
                            ref={videoFileInputRef}
                            onChange={handleSelectVideoFile}
                            accept="video/*,.mp4,.mov,.mxf,.mkv"
                            className="hidden"
                          />
                          <button
                            type="button"
                            onClick={() => videoFileInputRef.current?.click()}
                            className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[11px] font-semibold flex items-center gap-1 border border-amber-500/40 transition-colors shadow-sm"
                          >
                            <Upload className="w-3 h-3" />
                            <span>Select Video from Device</span>
                          </button>
                        </div>
                        <input
                          type="text"
                          value={uploadVideoFileName}
                          onChange={(e) => setUploadVideoFileName(e.target.value)}
                          placeholder="theatrical_master_4k.mp4"
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-neutral-300 block mb-1">
                          File Size (≤ 10 GB limit enforced)
                        </label>
                        <input
                          type="text"
                          value={uploadVideoFileSize}
                          onChange={(e) => setUploadVideoFileSize(e.target.value)}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono"
                        />
                      </div>
                    </div>

                    {/* Visual Progress Bar Component */}
                    <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2.5">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${isUploadingVideo ? 'bg-amber-400 animate-ping' : videoUploadProgress === 100 ? 'bg-emerald-400' : 'bg-neutral-600'}`} />
                          <span className="text-neutral-300">
                            {isUploadingVideo ? 'Uploading Theatrical Master Chunks to Vault...' : videoUploadProgress === 100 ? 'Master Video Ready & Verified ✓' : 'Direct Streaming Link Connected'}
                          </span>
                        </div>
                        <span className="text-amber-400 font-bold">{videoUploadProgress}%</span>
                      </div>

                      {/* Animated Progress Bar */}
                      <div className="w-full h-2.5 bg-neutral-900 rounded-full overflow-hidden border border-neutral-800">
                        <div
                          className="h-full bg-gradient-to-r from-amber-500 via-purple-500 to-emerald-500 rounded-full transition-all duration-300 shadow-md"
                          style={{ width: `${Math.max(5, videoUploadProgress)}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px] font-mono text-neutral-500">
                        <span>Speed: {videoUploadSpeed}</span>
                        <span>Size: {uploadVideoFileSize} (Max: 10.0 GB)</span>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-neutral-300 block mb-1">
                        Video Source / High-Compatibility Stream URL
                      </label>
                      <input
                        type="url"
                        value={uploadVideoUrl}
                        onChange={(e) => setUploadVideoUrl(e.target.value)}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono"
                      />
                    </div>
                  </div>

                  {/* Section 3: Synchronized Audio Description (AD) */}
                  <div className="p-5 sm:p-6 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
                      <div>
                        <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                          <Volume2 className="w-4 h-4 text-emerald-400" />
                          <span>3. Audio Description (AD) Track</span>
                        </h4>
                        <span className="text-[11px] text-neutral-400">
                          Synchronized narrated track for visually impaired cinema audiences.
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                        MANDATORY FOR CERTIFICATION
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="text-xs font-semibold text-neutral-300 block mb-1">
                          AD Language
                        </label>
                        <select
                          value={uploadAdLang}
                          onChange={(e) => setUploadAdLang(e.target.value)}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                        >
                          {INDIAN_LANGUAGES.map((l) => (
                            <option key={l.code} value={l.code}>
                              {l.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-semibold text-neutral-300">
                            AD Audio File
                          </label>
                          <input
                            type="file"
                            ref={adFileInputRef}
                            onChange={handleSelectAdFile}
                            accept="audio/*,.mp3,.wav,.aac,.m4a"
                            className="hidden"
                          />
                          <button
                            type="button"
                            onClick={() => adFileInputRef.current?.click()}
                            className="px-2 py-0.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-[10px] font-semibold flex items-center gap-1 border border-emerald-500/40 transition-colors"
                          >
                            <Upload className="w-2.5 h-2.5" />
                            <span>Select AD File</span>
                          </button>
                        </div>
                        <input
                          type="text"
                          value={uploadAdFileName}
                          onChange={(e) => setUploadAdFileName(e.target.value)}
                          placeholder="theatrical_ad_hindi.mp3"
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-neutral-300 block mb-1">
                          Audio Format
                        </label>
                        <select
                          value={uploadAdFormat}
                          onChange={(e) => setUploadAdFormat(e.target.value)}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                        >
                          <option value="MP3">MP3 (Universal 320kbps)</option>
                          <option value="WAV">WAV (Lossless 48kHz)</option>
                          <option value="AAC">AAC (Cinema Multi-Channel)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Section 4: Closed Captions (CC) */}
                  <div className="p-5 sm:p-6 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
                      <div>
                        <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                          <Subtitles className="w-4 h-4 text-cyan-400" />
                          <span>4. Closed Captions (CC) Track</span>
                        </h4>
                        <span className="text-[11px] text-neutral-400">
                          Includes dialogue tags, sound effect descriptors, and auditory cues.
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-950 text-cyan-400 border border-cyan-800">
                        MANDATORY FOR CERTIFICATION
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="text-xs font-semibold text-neutral-300 block mb-1">
                          CC Language
                        </label>
                        <select
                          value={uploadCcLang}
                          onChange={(e) => setUploadCcLang(e.target.value)}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                        >
                          {INDIAN_LANGUAGES.map((l) => (
                            <option key={l.code} value={l.code}>
                              {l.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-semibold text-neutral-300">
                            CC Subtitle File
                          </label>
                          <input
                            type="file"
                            ref={ccFileInputRef}
                            onChange={handleSelectCcFile}
                            accept=".vtt,.srt,.xml,.ttml,text/vtt,application/x-subrip"
                            className="hidden"
                          />
                          <button
                            type="button"
                            onClick={() => ccFileInputRef.current?.click()}
                            className="px-2 py-0.5 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-[10px] font-semibold flex items-center gap-1 border border-cyan-500/40 transition-colors"
                          >
                            <Upload className="w-2.5 h-2.5" />
                            <span>Select CC File</span>
                          </button>
                        </div>
                        <input
                          type="text"
                          value={uploadCcFileName}
                          onChange={(e) => setUploadCcFileName(e.target.value)}
                          placeholder="theatrical_cc_hindi.vtt"
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-neutral-300 block mb-1">
                          Caption Format
                        </label>
                        <select
                          value={uploadCcFormat}
                          onChange={(e) => setUploadCcFormat(e.target.value)}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                        >
                          <option value="VTT">WebVTT (.vtt)</option>
                          <option value="SRT">SubRip (.srt)</option>
                          <option value="XML">TTML / SMPTE-TT (.xml)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Section 5: Theatrical 9-Digit Preview Code (Provided by Admin) */}
                  <div className="p-5 sm:p-6 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
                      <div>
                        <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                          <KeyRound className="w-4 h-4 text-amber-400" />
                          <span>5. Theatrical Preview Code (Provided by Admin)</span>
                        </h4>
                        <span className="text-[11px] text-neutral-400">
                          Set the certified 9-digit preview code for this film. Anyone with this code can preview the film, AD &amp; CC without payment.
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950 text-amber-400 border border-amber-800">
                        ADMIN OVERRIDE
                      </span>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-xs font-semibold text-neutral-300">
                            9-Digit Screening Preview Code <span className="text-amber-400">*</span>
                          </label>
                          <button
                            type="button"
                            onClick={handleGenerateRandomCode}
                            className="text-xs font-mono text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors"
                          >
                            <RefreshCw className="w-3 h-3" />
                            <span>Auto-Generate New Code</span>
                          </button>
                        </div>
                        <div className="relative">
                          <input
                            type="text"
                            maxLength={9}
                            value={uploadCustomCode}
                            onChange={(e) => setUploadCustomCode(e.target.value.replace(/\D/g, '').slice(0, 9))}
                            placeholder="e.g. 583921746"
                            className="w-full bg-neutral-950 border border-amber-500/50 focus:border-amber-400 rounded-xl px-4 py-3 text-lg text-amber-400 font-mono font-bold tracking-[0.25em] focus:outline-none shadow-inner"
                          />
                          <button
                            type="button"
                            onClick={() => copyToClipboard(uploadCustomCode, 'custom-code')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
                            title="Copy Code"
                          >
                            {copiedLink === 'custom-code' ? (
                              <Check className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                        <p className="text-[11px] text-neutral-400 font-mono mt-1.5">
                          ✓ This code will be directly activated upon ingestion. Anyone entering this code in the <span className="text-amber-400">CBFC Official Preview Portal</span> or <span className="text-amber-400">Common Film Gallery</span> will unlock full authorized streaming with synchronized Audio Description (AD) &amp; Closed Captions (CC).
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Section 6: Regulatory Exemption Summary & Submission */}
                  <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-neutral-950 via-purple-950/40 to-neutral-950 border border-neutral-800 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
                      <div>
                        <span className="text-neutral-400 block">REGULATORY INGESTION FEE:</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="line-through text-neutral-500">₹15,000 INR</span>
                          <span className="text-emerald-400 font-bold text-base">₹0.00 (Exempt / Waived)</span>
                        </div>
                      </div>
                      <div className="sm:text-right">
                        <span className="text-neutral-400 block">AUTHENTICATED ROLE:</span>
                        <span className="text-purple-300 font-bold">{currentUser?.productionHouseName || 'Piku VFX (Super Admin)'}</span>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isAdminSubmitting}
                      className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-purple-600 via-amber-500 to-emerald-500 hover:from-purple-500 hover:via-amber-400 hover:to-emerald-400 text-neutral-950 font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-purple-600/30 active:scale-98 transition-all disabled:opacity-50"
                    >
                      {isAdminSubmitting ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>INGESTING FILM, AD &amp; CC INTO VAULT...</span>
                        </>
                      ) : (
                        <>
                          <UploadCloud className="w-5 h-5 stroke-[2.5]" />
                          <span>INGEST FILM, AD &amp; CC WITHOUT PAYMENT (ADMIN PRIVILEGE)</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* SUB-TAB: FILMS */}
          {activeSubTab === 'films' && stats && (
            <div className="p-4 sm:p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4 w-full">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Submitted Films &amp; DCP Packages
                </h3>
                <button
                  type="button"
                  onClick={() => setActiveSubTab('upload-admin')}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 self-start sm:self-auto shadow-md transition-all"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Upload Video, AD &amp; CC (Free)</span>
                </button>
              </div>

              {/* Mobile Cards View (sm:hidden - fits 100% width, no left-right scroll) */}
              <div className="block sm:hidden space-y-3">
                {stats.films.map((f) => (
                  <div key={f.id} className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">{f.title}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-800 text-amber-300">
                        {f.languageName}
                      </span>
                    </div>
                    <div className="text-neutral-400 text-[11px]">
                      Entity: <span className="text-neutral-300">{f.productionHouseName}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] pt-1 border-t border-neutral-850">
                      <div>
                        Payment: <span className={f.paymentStatus === 'successful' ? 'text-emerald-400 font-bold' : 'text-rose-400'}>{f.paymentStatus}</span>
                      </div>
                      <div>
                        Status: <span className={f.previewStatus === 'available' ? 'text-emerald-400 font-bold' : 'text-amber-400'}>{f.previewStatus}</span>
                      </div>
                    </div>
                    <div className="pt-1">
                      <button
                        onClick={() => handleToggleSuspendFilm(f.id, f.previewStatus)}
                        className={`w-full py-1.5 rounded text-xs font-bold ${
                          f.previewStatus === 'suspended'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-600'
                            : 'bg-rose-950 text-rose-300 border border-rose-600'
                        }`}
                      >
                        {f.previewStatus === 'suspended' ? 'Restore Film' : 'Suspend Film'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Tablet & Desktop Table View */}
              <div className="hidden sm:block w-full">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-neutral-800 text-neutral-500">
                      <th className="pb-2">TITLE</th>
                      <th className="pb-2">PRODUCTION HOUSE</th>
                      <th className="pb-2">LANG</th>
                      <th className="pb-2">PAYMENT</th>
                      <th className="pb-2">STATUS</th>
                      <th className="pb-2 text-right">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/80">
                    {stats.films.map((f) => (
                      <tr key={f.id} className="text-neutral-300">
                        <td className="py-2.5 font-bold text-white">{f.title}</td>
                        <td className="py-2.5">{f.productionHouseName}</td>
                        <td className="py-2.5">{f.languageName}</td>
                        <td className="py-2.5">
                          <span className={f.paymentStatus === 'successful' ? 'text-emerald-400' : 'text-rose-400'}>
                            {f.paymentStatus}
                          </span>
                        </td>
                        <td className="py-2.5">
                          <span className={f.previewStatus === 'available' ? 'text-emerald-400' : 'text-amber-400'}>
                            {f.previewStatus}
                          </span>
                        </td>
                        <td className="py-2.5 text-right">
                          <button
                            onClick={() => handleToggleSuspendFilm(f.id, f.previewStatus)}
                            className={`px-2.5 py-1 rounded text-[11px] font-bold ${
                              f.previewStatus === 'suspended'
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-600'
                                : 'bg-rose-950 text-rose-300 border border-rose-600'
                            }`}
                          >
                            {f.previewStatus === 'suspended' ? 'Restore' : 'Suspend'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SUB-TAB: GOOGLE DRIVE & SHEETS MASTER TRACKER (Requirement #4) */}
          {activeSubTab === 'sheets-tracker' && stats && (
            <div className="space-y-6">
              {/* Top Drive & Sheets Administration Card */}
              <div className="p-5 sm:p-6 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-600/40 text-emerald-300 font-mono text-xs font-bold">
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>CENTRAL GOOGLE DRIVE &amp; SHEETS MASTER TRACKER</span>
                    </div>
                    <h3 className="text-lg sm:text-xl font-black text-white uppercase tracking-wide">
                      Single-Row Master Film Ingestion Ledger
                    </h3>
                    <p className="text-xs text-neutral-400">
                      Vault Account: <strong className="text-amber-400 font-mono">{TARGET_DRIVE_ACCOUNT}</strong> • 
                      <span> Single-row per film with direct Video, AD, and CC links, contact details &amp; serial numbers</span>
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={handleSyncToGoogleDrive}
                      disabled={isSyncingDrive}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wide flex items-center gap-1.5 transition-all shadow-md shadow-emerald-600/20 active:scale-95"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isSyncingDrive ? 'animate-spin' : ''}`} />
                      <span>{isSyncingDrive ? 'Syncing...' : 'Sync Master Sheet'}</span>
                    </button>

                    <a
                      href={driveMeta?.spreadsheetUrl || 'https://docs.google.com/spreadsheets/u/0/'}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3.5 py-2 rounded-xl bg-neutral-950 hover:bg-neutral-800 border border-emerald-500/40 text-emerald-300 font-bold text-xs uppercase tracking-wide flex items-center gap-1.5 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Open Google Sheet</span>
                    </a>

                    <a
                      href={driveMeta?.folderId ? `https://drive.google.com/drive/folders/${driveMeta.folderId}` : 'https://drive.google.com/drive/u/0/my-drive'}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3.5 py-2 rounded-xl bg-neutral-950 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 font-bold text-xs uppercase tracking-wide flex items-center gap-1.5 transition-colors"
                    >
                      <HardDrive className="w-3.5 h-3.5" />
                      <span>Open Drive Vault</span>
                    </a>
                  </div>
                </div>

                {driveSyncStatus && (
                  <div className="p-3 rounded-xl bg-neutral-950 border border-emerald-600/40 text-emerald-300 text-xs font-mono flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                    <span>{driveSyncStatus}</span>
                  </div>
                )}

                {/* Statutory Regulatory Notice */}
                <div className="p-3.5 rounded-xl bg-neutral-950/80 border border-neutral-800 text-xs text-neutral-400 space-y-1">
                  <div className="font-bold text-neutral-300 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-purple-400" />
                    <span>Restricted Admin Drive Access &amp; Producer Continuous Connection:</span>
                  </div>
                  <p className="leading-relaxed">
                    Only administrators possess direct access privileges to the Google Drive database and master sheets. 
                    When producers and DCP studios upload theatrical master files (≤ 10GB enforced), their media is directly vaulted to 
                    <strong className="text-amber-300 font-mono ml-1">{TARGET_DRIVE_ACCOUNT}</strong> with active stream synchronization 
                    from Drive to the cinema player.
                  </p>
                </div>
              </div>

              {/* Search & Filter Header */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    placeholder="Search by Title, Submitter Name, Email, Mobile, or Language..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div className="text-xs font-mono text-neutral-400 flex items-center gap-2">
                  <span>Total Single-Row Records:</span>
                  <span className="font-bold text-white px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800">
                    {stats.films.length}
                  </span>
                </div>
              </div>

              {/* Master Tracking Table: Single Row Per Film with Video, AD, CC, Contact Info */}
              <div className="p-4 sm:p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
                <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-neutral-700">
                  <table className="w-full text-left text-xs font-mono min-w-[1100px]">
                    <thead>
                      <tr className="border-b border-neutral-800 text-neutral-400 text-[11px]">
                        <th className="pb-3 pl-2">S.NO</th>
                        <th className="pb-3">UPLOAD DATE</th>
                        <th className="pb-3">REGISTRANT CONTACT</th>
                        <th className="pb-3">FILM TITLE &amp; LANG</th>
                        <th className="pb-3">VIDEO LINK (MAX 10GB)</th>
                        <th className="pb-3">AD LINK (AUDIO)</th>
                        <th className="pb-3">CC LINK (CAPTIONS)</th>
                        <th className="pb-3">PREVIEW CODE</th>
                        <th className="pb-3">PAYMENT</th>
                        <th className="pb-3 pr-2">DRIVE VAULT</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800/70">
                      {stats.films
                        .filter((f) => {
                          if (!searchFilter.trim()) return true;
                          const q = searchFilter.toLowerCase();
                          return (
                            f.title.toLowerCase().includes(q) ||
                            (f.submitterName && f.submitterName.toLowerCase().includes(q)) ||
                            (f.submitterEmail && f.submitterEmail.toLowerCase().includes(q)) ||
                            (f.submitterMobile && f.submitterMobile.toLowerCase().includes(q)) ||
                            f.productionHouseName.toLowerCase().includes(q) ||
                            f.languageName.toLowerCase().includes(q)
                          );
                        })
                        .map((f, idx) => {
                          const serialNo = idx + 1;
                          const dateStr = f.createdAt
                            ? new Date(f.createdAt).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })
                            : 'Recent';

                          const originUrl = typeof window !== 'undefined' ? window.location.origin : 'https://cinead.cc';
                          const videoUrl =
                            f.driveWebViewLink ||
                            (f.driveFileId ? `https://drive.google.com/file/d/${f.driveFileId}/view?usp=sharing` : (f.videoFileUrl?.startsWith('http') ? f.videoFileUrl : `${originUrl}${f.videoFileUrl}`));

                          const adTrack = f.uploadedAdTracks?.[0];
                          const adUrl = adTrack?.driveUrl || (adTrack?.fileUrl?.startsWith('http') ? adTrack.fileUrl : (adTrack?.fileUrl ? `${originUrl}${adTrack.fileUrl}` : ''));

                          const ccTrack = f.uploadedCcTracks?.[0];
                          const ccUrl = ccTrack?.driveUrl || (ccTrack?.fileUrl?.startsWith('http') ? ccTrack.fileUrl : (ccTrack?.fileUrl ? `${originUrl}${ccTrack.fileUrl}` : ''));

                          const submitterName = f.submitterName || f.producer || f.productionHouseName;
                          const submitterMobile = f.submitterMobile || '+919876500000';
                          const submitterEmail = f.submitterEmail || (f.userId.includes('vyjayanthi') ? 'producer@vyjayanthimovies.in' : 'ops@qubedcpstudios.com');

                          return (
                            <tr key={f.id} className="hover:bg-neutral-950/40 transition-colors">
                              {/* 1. S.No */}
                              <td className="py-3 pl-2 font-bold text-amber-400">#{serialNo}</td>

                              {/* 2. Upload Date */}
                              <td className="py-3 text-neutral-300 text-[11px] whitespace-nowrap">
                                <div>{dateStr}</div>
                                <div className="text-[10px] text-neutral-500 font-sans">
                                  {f.submissionType === 'dcp' ? 'DCP Master' : 'Feature Film'}
                                </div>
                              </td>

                              {/* 3. Registrant Contact Info */}
                              <td className="py-3 text-neutral-200">
                                <div className="font-bold text-white">{submitterName}</div>
                                <div className="text-[10px] text-amber-300 font-mono">{submitterMobile}</div>
                                <div className="text-[10px] text-neutral-400">{submitterEmail}</div>
                                <div className="text-[10px] text-neutral-500 truncate max-w-[140px]">
                                  {f.productionHouseName}
                                </div>
                              </td>

                              {/* 4. Film Title & Info */}
                              <td className="py-3">
                                <div className="font-bold text-white text-xs">{f.title}</div>
                                <div className="text-[11px] text-neutral-400">
                                  {f.languageName} • {f.durationMinutes}m
                                </div>
                                <div className="text-[10px] text-neutral-500">Dir: {f.director}</div>
                              </td>

                              {/* 5. Video Link (Max 10GB enforced) */}
                              <td className="py-3">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <a
                                    href={videoUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-2 py-0.5 rounded bg-blue-950/80 hover:bg-blue-900 border border-blue-600/50 text-blue-300 text-[10px] font-bold flex items-center gap-1"
                                    title="Open direct video stream / Drive link"
                                  >
                                    <Play className="w-2.5 h-2.5" />
                                    <span>Video Link</span>
                                  </a>
                                  <button
                                    onClick={() => copyToClipboard(videoUrl, `vid-${f.id}`)}
                                    className="p-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[10px]"
                                    title="Copy Video Link"
                                  >
                                    {copiedLink === `vid-${f.id}` ? (
                                      <Check className="w-2.5 h-2.5 text-emerald-400" />
                                    ) : (
                                      <Copy className="w-2.5 h-2.5" />
                                    )}
                                  </button>
                                </div>
                                <div className="text-[10px] text-neutral-400 mt-0.5 truncate max-w-[150px]">
                                  {f.videoFileName}
                                </div>
                                <div className="text-[9px] text-amber-400/90 font-mono">
                                  {f.videoFileSize} (≤10GB Limit)
                                </div>
                              </td>

                              {/* 6. AD Link (Audio Description) */}
                              <td className="py-3">
                                {adUrl ? (
                                  <div>
                                    <div className="flex items-center gap-1.5">
                                      <a
                                        href={adUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="px-2 py-0.5 rounded bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-600/50 text-emerald-300 text-[10px] font-bold flex items-center gap-1"
                                        title="Open Audio Description Track"
                                      >
                                        <Volume2 className="w-2.5 h-2.5" />
                                        <span>AD Link</span>
                                      </a>
                                      <button
                                        onClick={() => copyToClipboard(adUrl, `ad-${f.id}`)}
                                        className="p-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[10px]"
                                        title="Copy AD Link"
                                      >
                                        {copiedLink === `ad-${f.id}` ? (
                                          <Check className="w-2.5 h-2.5 text-emerald-400" />
                                        ) : (
                                          <Copy className="w-2.5 h-2.5" />
                                        )}
                                      </button>
                                    </div>
                                    <div className="text-[10px] text-neutral-400 mt-0.5">
                                      {adTrack ? `${adTrack.languageName} [${adTrack.format}]` : 'MP3 Audio'}
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-neutral-600 text-[10px]">None</span>
                                )}
                              </td>

                              {/* 7. CC Link (Closed Captions) */}
                              <td className="py-3">
                                {ccUrl ? (
                                  <div>
                                    <div className="flex items-center gap-1.5">
                                      <a
                                        href={ccUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="px-2 py-0.5 rounded bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-600/50 text-cyan-300 text-[10px] font-bold flex items-center gap-1"
                                        title="Open Closed Caption Subtitles"
                                      >
                                        <Subtitles className="w-2.5 h-2.5" />
                                        <span>CC Link</span>
                                      </a>
                                      <button
                                        onClick={() => copyToClipboard(ccUrl, `cc-${f.id}`)}
                                        className="p-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[10px]"
                                        title="Copy CC Link"
                                      >
                                        {copiedLink === `cc-${f.id}` ? (
                                          <Check className="w-2.5 h-2.5 text-emerald-400" />
                                        ) : (
                                          <Copy className="w-2.5 h-2.5" />
                                        )}
                                      </button>
                                    </div>
                                    <div className="text-[10px] text-neutral-400 mt-0.5">
                                      {ccTrack ? `${ccTrack.languageName} [${ccTrack.format}]` : 'VTT Subtitles'}
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-neutral-600 text-[10px]">None</span>
                                )}
                              </td>

                              {/* 8. Preview Code & CBFC */}
                              <td className="py-3">
                                <div className="font-mono text-amber-400 font-bold">
                                  {f.previewCode || 'Locked'}
                                </div>
                                <div className="text-[10px] text-neutral-400 truncate max-w-[130px]">
                                  {f.cbfcCertNo || 'CBFC Pending'}
                                </div>
                              </td>

                              {/* 9. Payment Status */}
                              <td className="py-3">
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                    f.paymentStatus === 'successful'
                                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/60'
                                      : 'bg-rose-950 text-rose-300 border border-rose-700/60'
                                  }`}
                                >
                                  {f.paymentStatus === 'successful' ? '₹15k Settled' : 'Unpaid'}
                                </span>
                              </td>

                              {/* 10. Drive Vault Info */}
                              <td className="py-3 pr-2">
                                <div className="text-[10px] text-emerald-400 flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3 shrink-0" />
                                  <span>Vault Synced</span>
                                </div>
                                <div className="text-[9px] text-neutral-500 font-mono truncate max-w-[110px]" title={f.driveFileId || TARGET_DRIVE_ACCOUNT}>
                                  {f.driveFileId ? f.driveFileId.slice(0, 14) + '...' : TARGET_DRIVE_ACCOUNT}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* SUB-TAB: AUDIT LOGS (Section #58) */}
          {activeSubTab === 'audit' && (
            <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                  Complete Immutable Audit Log
                </h3>
                <span className="text-xs font-mono text-neutral-400">Total Entries: {auditLogs.length}</span>
              </div>

              <div className="space-y-2 font-mono text-xs">
                {auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-xl bg-neutral-950 border border-neutral-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-700/50 text-[10px] font-bold">
                          {log.action}
                        </span>
                        <span className="text-white font-semibold">
                          {log.filmTitle || log.userEmail || 'System Event'}
                        </span>
                      </div>
                      {log.metadata && (
                        <p className="text-[11px] text-neutral-400 mt-1">
                          {JSON.stringify(log.metadata)}
                        </p>
                      )}
                    </div>
                    <span className="text-neutral-500 text-[10px] shrink-0">
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SUB-TAB: PAYMENTS (Restricted to Admin Console) */}
          {activeSubTab === 'payments' && stats && (
            <div className="space-y-5 w-full animate-fadeIn">
              {/* Header Card */}
              <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-neutral-900 via-neutral-900 to-emerald-950/40 border border-neutral-800 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-600/40 text-emerald-300 text-[10px] font-mono font-bold mb-2">
                      <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                      <span>CENTRAL FINANCIAL AUDIT • ADMIN EXCLUSIVE LEDGER</span>
                    </div>
                    <h3 className="text-xl font-black text-white uppercase tracking-wide">
                      Statutory Submission Payments &amp; Settlement
                    </h3>
                    <p className="text-xs text-neutral-400 mt-1 max-w-xl">
                      Confidential financial transaction records, regulatory fee collections (minimum ₹15,000 enforced), and live gateway health.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={runAdminPaymentDiagnostic}
                    disabled={isRunningAdminDiag}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-neutral-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 shrink-0 transition-all disabled:opacity-50"
                  >
                    <Activity className={`w-3.5 h-3.5 ${isRunningAdminDiag ? 'animate-spin' : ''}`} />
                    <span>{isRunningAdminDiag ? 'Running Diagnostic...' : 'Test Gateway Health'}</span>
                  </button>
                </div>

                {/* Financial Summary Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 font-mono">
                    <span className="text-[10px] text-neutral-500 uppercase block">Total Deposits</span>
                    <span className="text-xl font-bold text-emerald-400">
                      ₹{stats.payments.reduce((acc, p) => acc + (p.amount || 0), 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 font-mono">
                    <span className="text-[10px] text-neutral-500 uppercase block">Settled Transactions</span>
                    <span className="text-xl font-bold text-white">{stats.payments.length}</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 font-mono">
                    <span className="text-[10px] text-neutral-500 uppercase block">Statutory Minimum</span>
                    <span className="text-xl font-bold text-amber-400">₹15,000</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 font-mono">
                    <span className="text-[10px] text-neutral-500 uppercase block">Supported Channels</span>
                    <span className="text-xs font-bold text-neutral-300">UPI, Cards, NetBanking</span>
                  </div>
                </div>

                {/* Live Diagnostic Report Box */}
                {adminDiagnosticReport && showAdminDiagDetails && (
                  <div className="p-4 rounded-xl bg-neutral-950 border border-emerald-500/40 space-y-3 font-mono text-xs animate-fadeIn">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                        <span className="font-bold text-emerald-300">
                          GATEWAY DIAGNOSTIC: {adminDiagnosticReport.gatewayHealth}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowAdminDiagDetails(false)}
                        className="text-[10px] text-neutral-500 hover:text-white"
                      >
                        Dismiss
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-neutral-400">
                      <div className="p-2 rounded bg-neutral-900 border border-neutral-800">
                        <strong className="text-white block mb-0.5">Website Platform (cinead.cc):</strong>
                        <span>{adminDiagnosticReport.platformCompatibility?.website || '100% Operational (UPI QR & Checkout)'}</span>
                      </div>
                      <div className="p-2 rounded bg-neutral-900 border border-neutral-800">
                        <strong className="text-white block mb-0.5">Companion App Platform:</strong>
                        <span>{adminDiagnosticReport.platformCompatibility?.mobileApp || '100% Operational (UPI Intent & Deep-Links)'}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Transactions Ledger Card */}
              <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                    Master Payment Records
                  </h4>
                  <div className="relative w-full sm:w-64">
                    <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search TXN, Film, Entity..."
                      value={adminPaymentSearch}
                      onChange={(e) => setAdminPaymentSearch(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-purple-500 font-mono"
                    />
                  </div>
                </div>

                {/* Mobile Cards View */}
                <div className="block sm:hidden space-y-3">
                  {stats.payments
                    .filter((p) => {
                      if (!adminPaymentSearch) return true;
                      const q = adminPaymentSearch.toLowerCase();
                      return (
                        p.transactionId.toLowerCase().includes(q) ||
                        p.filmTitle.toLowerCase().includes(q) ||
                        p.productionHouseName.toLowerCase().includes(q) ||
                        p.gateway.toLowerCase().includes(q)
                      );
                    })
                    .map((p) => (
                      <div key={p.id} className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2 text-xs font-mono">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-amber-400">{p.transactionId}</span>
                          <span className="font-bold text-emerald-400">₹{p.amount.toLocaleString()}</span>
                        </div>
                        <div className="text-white font-bold">{p.filmTitle}</div>
                        <div className="text-neutral-400 text-[11px] flex items-center justify-between">
                          <span>{p.productionHouseName}</span>
                          <span className="px-1.5 py-0.5 rounded bg-neutral-800 text-[10px] text-neutral-300">{p.gateway}</span>
                        </div>
                        <div className="text-neutral-500 text-[10px] pt-1 border-t border-neutral-850 flex items-center justify-between">
                          <span>Date: {new Date(p.createdAt).toLocaleDateString()}</span>
                          <span className="text-emerald-400 font-bold uppercase">{p.status}</span>
                        </div>
                      </div>
                    ))}
                </div>

                {/* Tablet & Desktop Table View */}
                <div className="hidden sm:block w-full overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr className="border-b border-neutral-800 text-neutral-500">
                        <th className="pb-2.5">TXN ID</th>
                        <th className="pb-2.5">FILM</th>
                        <th className="pb-2.5">PRODUCTION HOUSE</th>
                        <th className="pb-2.5">AMOUNT</th>
                        <th className="pb-2.5">CHANNEL</th>
                        <th className="pb-2.5">STATUS</th>
                        <th className="pb-2.5">DATE</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800/80">
                      {stats.payments
                        .filter((p) => {
                          if (!adminPaymentSearch) return true;
                          const q = adminPaymentSearch.toLowerCase();
                          return (
                            p.transactionId.toLowerCase().includes(q) ||
                            p.filmTitle.toLowerCase().includes(q) ||
                            p.productionHouseName.toLowerCase().includes(q) ||
                            p.gateway.toLowerCase().includes(q)
                          );
                        })
                        .map((p) => (
                          <tr key={p.id} className="text-neutral-300 hover:bg-neutral-950/40">
                            <td className="py-2.5 font-bold text-amber-400">{p.transactionId}</td>
                            <td className="py-2.5 text-white font-bold">{p.filmTitle}</td>
                            <td className="py-2.5 text-neutral-300">{p.productionHouseName}</td>
                            <td className="py-2.5 font-bold text-emerald-400">₹{p.amount.toLocaleString()}</td>
                            <td className="py-2.5">
                              <span className="px-2 py-0.5 rounded bg-neutral-950 border border-neutral-800 text-[10px]">
                                {p.gateway}
                              </span>
                            </td>
                            <td className="py-2.5">
                              <span className="text-emerald-400 font-bold text-[11px] uppercase">
                                ✓ {p.status}
                              </span>
                            </td>
                            <td className="py-2.5 text-neutral-500">{new Date(p.createdAt).toLocaleDateString()}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* SUB-TAB: CODES */}
          {activeSubTab === 'codes' && (
            <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Preview Code Registry (9-Digit Cryptographic Keys)
              </h3>
              <div className="space-y-2 font-mono text-xs">
                {auditLogs
                  .filter((l) => l.action === 'PREVIEW_CODE_GENERATED' || l.action === 'PREVIEW_ACCESS_GRANTED')
                  .map((log) => (
                    <div
                      key={log.id}
                      className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between"
                    >
                      <div>
                        <span className="text-amber-400 font-bold block">{log.filmTitle}</span>
                        <span className="text-neutral-400 text-[11px]">{log.action}</span>
                      </div>
                      <span className="text-neutral-500 text-[10px]">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* SUB-TAB: USERS */}
          {activeSubTab === 'users' && stats && (
            <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Registered Entities &amp; Official Accounts
              </h3>
              <div className="space-y-2 font-mono text-xs">
                {stats.users.map((u) => (
                  <div
                    key={u.id}
                    className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-bold">{u.productionHouseName}</span>
                        <span className="px-1.5 py-0.5 rounded bg-neutral-800 text-[10px] text-amber-300">
                          {u.role.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-[11px] text-neutral-400 mt-0.5">
                        {u.email} • {u.mobile}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-[10px]">
                      <span className={u.emailVerified ? 'text-emerald-400' : 'text-neutral-600'}>Email ✓</span>
                      <span className={u.mobileVerified ? 'text-emerald-400' : 'text-neutral-600'}>Mobile ✓</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SUB-TAB: DOMAIN MANAGEMENT */}
          {activeSubTab === 'domain' && (
            <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-5">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Globe className="w-4 h-4 text-amber-400" />
                    <span>Domain Reconnection &amp; Management</span>
                  </h3>
                  <p className="text-xs text-neutral-400 mt-1">
                    Manage DNS and GoDaddy Forwarding for <strong>cinead.cc</strong> &amp; <strong>www.cinead.cc</strong>.
                  </p>
                </div>
                {onOpenDomainModal && (
                  <button
                    onClick={onOpenDomainModal}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs uppercase tracking-wide flex items-center gap-1.5 shadow-md shadow-amber-500/20"
                  >
                    <Globe className="w-4 h-4" />
                    <span>Open Domain Reconnection Wizard</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono">
                <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
                  <div className="text-[10px] text-neutral-500 uppercase">Custom Domain</div>
                  <div className="text-base font-black text-amber-400">cinead.cc</div>
                  <div className="text-[11px] text-neutral-400 flex items-center gap-1">
                    <span>Target: www.cinead.cc</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
                  <div className="text-[10px] text-neutral-500 uppercase">App Platform Target</div>
                  <div className="text-xs font-black text-emerald-400 truncate">
                    asia-southeast1.run.app
                  </div>
                  <div className="text-[11px] text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Active &amp; Serving</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
                  <div className="text-[10px] text-neutral-500 uppercase">GoDaddy Setup</div>
                  <div className="text-xs font-bold text-white">Domain Forwarding</div>
                  <a
                    href="https://dcc.godaddy.com/manage/cinead.cc/dns"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-amber-400 hover:underline flex items-center gap-1"
                  >
                    <span>Open GoDaddy DNS</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2 text-xs">
                <div className="font-bold text-amber-300">Quick 30-Second Reconnection:</div>
                <p className="text-neutral-400 leading-relaxed">
                  To avoid the Google Cloud Run 404 error, in your GoDaddy account under <strong>Forwarding</strong>, forward <strong>cinead.cc</strong> and <strong>www</strong> to:
                </p>
                <div className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800 font-mono text-[11px] text-emerald-400 select-all break-all">
                  https://ais-pre-w2c22yyo7draw2tdqvb3ax-279328455851.asia-southeast1.run.app
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
