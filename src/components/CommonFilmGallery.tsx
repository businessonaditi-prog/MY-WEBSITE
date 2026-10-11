import React, { useState, useEffect } from 'react';
import {
  Film as FilmIcon,
  Search,
  Filter,
  Lock,
  Play,
  ShieldCheck,
  Subtitles,
  Headphones,
  X,
  AlertCircle,
  Download,
  Check,
  HardDrive,
  Trash2,
  UserCheck,
  KeyRound,
  ArrowRight,
  Copy,
} from 'lucide-react';
import { Film, User } from '../types/cinemaPlatform';
import { INDIAN_LANGUAGES } from '../utils/languages';
import { offlineStorage, EncryptedOfflinePackage } from '../services/offlineStorageService';

interface CommonFilmGalleryProps {
  currentUser: User | null;
  onOpenAuth: (mode?: 'login' | 'register') => void;
  onSelectFilmForPreviewWithCode: (film: Film, code: string) => void;
  onOwnerWatchFilm: (film: Film) => void;
  onPlayOfflineFilm?: (film: Film) => void;
  refreshTrigger?: number;
}

export const CommonFilmGallery: React.FC<CommonFilmGalleryProps> = ({
  currentUser,
  onOpenAuth,
  onSelectFilmForPreviewWithCode,
  onOwnerWatchFilm,
  onPlayOfflineFilm,
  refreshTrigger,
}) => {
  const [films, setFilms] = useState<Film[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('all');
  const [galleryTab, setGalleryTab] = useState<'all' | 'offline_vault'>('all');

  // Offline Download State
  const [downloadingMap, setDownloadingMap] = useState<Record<string, number>>({});
  const [downloadedFilmIds, setDownloadedFilmIds] = useState<string[]>([]);
  const [offlineManifests, setOfflineManifests] = useState<Record<string, EncryptedOfflinePackage>>({});

  // Selected Film for Details Modal
  const [detailsFilm, setDetailsFilm] = useState<Film | null>(null);

  // 9-Digit Code prompt inside modal
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  useEffect(() => {
    fetchFilms();
    refreshOfflineState();
  }, [refreshTrigger, currentUser]);

  const refreshOfflineState = () => {
    setDownloadedFilmIds(offlineStorage.getDownloadedFilmIds());
    setOfflineManifests(offlineStorage.getStoredManifests());
  };

  const fetchFilms = async () => {
    setLoading(true);
    try {
      const headers: Record<string, string> = {};
      const token = localStorage.getItem('cbfc_auth_token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch('/api/films', { headers });
      const data = await res.json();
      setFilms(data.films || []);
    } catch (e) {
      console.error('Error fetching gallery films:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadFilm = async (film: Film, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (downloadingMap[film.id] !== undefined) return;

    setDownloadingMap((prev) => ({ ...prev, [film.id]: 10 }));
    try {
      const streamUrl =
        film.videoFileUrl && !film.videoFileUrl.includes('gtv-videos-bucket')
          ? film.videoFileUrl
          : '/videos/theatrical_master_kalki.mp4';

      await offlineStorage.downloadVideoForZeroBufferPlayback(
        film.id,
        film.title,
        streamUrl,
        (progress) => setDownloadingMap((prev) => ({ ...prev, [film.id]: progress.percent })),
        film
      );
      refreshOfflineState();
    } catch (err) {
      console.error('Download error:', err);
    } finally {
      setDownloadingMap((prev) => {
        const next = { ...prev };
        delete next[film.id];
        return next;
      });
    }
  };

  const handleDeleteOffline = async (filmId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    await offlineStorage.deleteOfflineFilm(filmId);
    refreshOfflineState();
  };

  // Check if current logged-in user is the verified owner of a film
  const isFilmOwner = (film: Film): boolean => {
    if (!currentUser) return false;
    if (film.isOwner) return true;
    if (film.userId && film.userId === currentUser.id) return true;
    if (currentUser.productionHouseName && film.productionHouseName &&
        currentUser.productionHouseName.toLowerCase() === film.productionHouseName.toLowerCase()) {
      return true;
    }
    return false;
  };

  const handleCopyCode = (filmId: string, codeToCopy: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    navigator.clipboard.writeText(codeToCopy);
    setCopiedCodeId(filmId);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  // Open modal - if current user is owner, they can watch directly; others must enter code
  const handleFilmCardClick = (film: Film) => {
    setDetailsFilm(film);
    setCode('');
    setCodeError(null);
    if (isFilmOwner(film)) {
      setShowCodeInput(false);
    } else {
      setShowCodeInput(true);
    }
  };

  const handleVerifyCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || code.length !== 9) {
      setCodeError('Please enter a valid 9-digit numeric code.');
      return;
    }

    if (detailsFilm) {
      onSelectFilmForPreviewWithCode(detailsFilm, code.trim());
      setDetailsFilm(null);
      setShowCodeInput(false);
      setCode('');
    }
  };

  const filteredFilms = films.filter((f) => {
    const matchesSearch =
      f.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.productionHouseName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.director.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesLang = selectedLanguage === 'all' || f.languageCode === selectedLanguage;
    const matchesTab = galleryTab === 'all' || downloadedFilmIds.includes(f.id);

    return matchesSearch && matchesLang && matchesTab;
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* 1. REGISTRATION BUTTON PLACED PROMINENTLY ABOVE (User Requirement) */}
      <div className="p-4 sm:p-6 rounded-2xl bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-neutral-900 border border-amber-500/35 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-black bg-amber-500 text-neutral-950 uppercase tracking-wider">
              {currentUser ? 'ACCOUNT ACTIVE' : 'REGISTRATION PORTAL'}
            </span>
            <span className="text-xs font-mono text-amber-300 font-bold">
              Central Board Theatrical Certification
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-wide">
            {currentUser
              ? `Welcome, ${currentUser.productionHouseName}`
              : 'Register Production House or DCP Studio'}
          </h2>
          <p className="text-xs sm:text-sm text-neutral-300 mt-1 max-w-2xl leading-relaxed">
            {currentUser
              ? 'Browse certified films below. Guests and authorized reviewers can preview any film using their 9-digit code.'
              : 'Submit feature films with validated Closed Captions (CC) & Audio Description (AD). Guests can inspect all films below, but cannot play without a valid 9-digit preview code.'}
          </p>
        </div>

        {/* Action Button ABOVE Thumbnails: Unified Sign UP/in */}
        <div className="flex items-center gap-3 shrink-0 w-full sm:w-auto">
          {!currentUser ? (
            <button
              onClick={() => onOpenAuth()}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/25 transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              <UserCheck className="w-4 h-4" />
              <span>Sign UP/in</span>
            </button>
          ) : (
            <div className="px-4 py-2 rounded-xl bg-neutral-900/90 border border-neutral-800 text-right">
              <span className="text-[10px] font-mono text-neutral-400 block">LOGGED IN AS</span>
              <span className="text-xs font-bold text-amber-400 font-mono">
                {currentUser.role.toUpperCase()}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 2. SECURITY NOTICE: GUESTS CANNOT PLAY WITHOUT CODE */}
      <div className="p-3.5 rounded-2xl bg-neutral-900/90 border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5 text-neutral-300">
          <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <strong className="text-white block font-mono">
              GUEST ACCESS POLICY: 9-DIGIT PREVIEW CODE MANDATORY
            </strong>
            <span className="text-[11px] text-neutral-400">
              All films below are certified for viewing. Guests can browse thumbnails freely, but playback requires an authorized 9-digit code.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto font-mono text-[11px] text-neutral-400 shrink-0">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>CBFC Security Enforced</span>
        </div>
      </div>

      {/* 3. TABS & FILTER BAR */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Gallery View Switcher */}
        <div className="grid grid-cols-2 sm:flex sm:items-center p-1 rounded-xl bg-neutral-900 border border-neutral-800 w-full sm:w-auto">
          <button
            onClick={() => setGalleryTab('all')}
            className={`px-2 sm:px-4 py-2 rounded-lg text-[10px] sm:text-xs font-bold font-mono transition-colors flex items-center justify-center gap-1.5 ${
              galleryTab === 'all'
                ? 'bg-amber-500 text-neutral-950 shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <FilmIcon className="w-3.5 h-3.5" />
            <span>ALL FILMS ({films.length})</span>
          </button>
          <button
            onClick={() => setGalleryTab('offline_vault')}
            className={`px-2 sm:px-4 py-2 rounded-lg text-[10px] sm:text-xs font-bold font-mono transition-colors flex items-center justify-center gap-1.5 ${
              galleryTab === 'offline_vault'
                ? 'bg-emerald-500 text-neutral-950 shadow-md'
                : 'text-neutral-400 hover:text-emerald-400'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>DOWNLOADED ({downloadedFilmIds.length})</span>
          </button>
        </div>

        {/* Search and Language Filter */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search title, director..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-neutral-400 shrink-0" />
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-amber-500"
            >
              <option value="all">All Languages</option>
              {INDIAN_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 4. THUMBNAILS OF FILMS BELOW REGISTRATION BUTTON (User Requirement) */}
      {loading ? (
        <div className="py-20 text-center text-neutral-500 font-mono text-xs">
          Loading certified theatrical films...
        </div>
      ) : filteredFilms.length === 0 ? (
        <div className="py-16 text-center rounded-2xl bg-neutral-900/40 border border-neutral-800 p-8 space-y-2">
          <FilmIcon className="w-10 h-10 text-neutral-600 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-neutral-300">
            {galleryTab === 'offline_vault'
              ? 'No Films Downloaded for Offline Playback Yet'
              : 'No Films Found Matching Criteria'}
          </h3>
          <p className="text-xs text-neutral-500">
            {galleryTab === 'offline_vault'
              ? 'Switch to "ALL THEATRICAL FILMS" to view and download films into your in-app sandbox.'
              : 'Try adjusting your search query or language filter.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {filteredFilms.map((film) => {
            const isDownloaded = downloadedFilmIds.includes(film.id);
            const downloadProgress = downloadingMap[film.id];
            const isDownloading = downloadProgress !== undefined;
            const isOwner = isFilmOwner(film);

            return (
              <div
                key={film.id}
                onClick={() => handleFilmCardClick(film)}
                className="group rounded-2xl bg-neutral-900/90 border border-neutral-800 hover:border-amber-500/50 transition-all cursor-pointer overflow-hidden shadow-xl flex flex-col justify-between hover:shadow-amber-500/5"
              >
                {/* FILM THUMBNAIL (Poster artwork) */}
                <div className="relative aspect-[2/3] bg-neutral-950 overflow-hidden">
                  <img
                    src={film.posterUrl}
                    alt={film.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-90 group-hover:opacity-100"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-transparent to-black/40" />

                  {/* Top Badges on Thumbnail */}
                  <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-neutral-950/85 text-amber-300 border border-neutral-700 backdrop-blur-md">
                      {film.languageName}
                    </span>

                    {/* Offline In-App Badge */}
                    {isDownloaded && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950/90 text-emerald-300 border border-emerald-600/50 backdrop-blur-md">
                        <HardDrive className="w-2.5 h-2.5" />
                        <span>In-App Vault</span>
                      </span>
                    )}
                  </div>

                  {/* Bottom Badges on Thumbnail */}
                  <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between text-[10px] font-mono text-neutral-300">
                    <span className="flex items-center gap-1 bg-neutral-950/85 px-1.5 py-0.5 rounded border border-neutral-800">
                      <Subtitles className="w-3 h-3 text-sky-400" />
                      <span>{film.uploadedCcTracks?.length || 1} CC</span>
                    </span>
                    <span className="flex items-center gap-1 bg-neutral-950/85 px-1.5 py-0.5 rounded border border-neutral-800">
                      <Headphones className="w-3 h-3 text-amber-400" />
                      <span>{film.uploadedAdTracks?.length || 1} AD</span>
                    </span>
                  </div>
                </div>

                {/* Thumbnail Metadata & Action Button */}
                <div className="p-3.5 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <h3 className="font-bold text-sm text-white group-hover:text-amber-400 transition-colors line-clamp-1">
                      {film.title}
                    </h3>
                    <p className="text-[11px] text-neutral-400 mt-0.5 truncate">
                      {film.productionHouseName}
                    </p>
                    <p className="text-[10px] text-neutral-500 font-mono mt-0.5">
                      Dir: {film.director} • {film.durationMinutes} min
                    </p>
                  </div>

                  {/* ACTIONS & CODE DISPLAY BELOW THUMBNAIL */}
                  <div className="pt-2 border-t border-neutral-800/80 flex flex-col gap-2">
                    {/* If current user is the owner of this film: show code below thumbnail & allow 1-click play without code */}
                    {isOwner ? (
                      <div className="space-y-2">
                        {/* 9-Digit Code Display below thumbnail of own film */}
                        {film.previewCode ? (
                          <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs font-mono">
                            <div>
                              <span className="text-[9px] text-amber-400 font-bold block uppercase tracking-wider">
                                YOUR 9-DIGIT CODE:
                              </span>
                              <span className="text-amber-300 font-black text-sm tracking-wider">
                                {film.previewCode}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => handleCopyCode(film.id, film.previewCode!, e)}
                              className="px-2 py-1 rounded bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-neutral-950 font-bold text-[10px] flex items-center gap-1 transition-all"
                              title="Copy your film preview code to share"
                            >
                              {copiedCodeId === film.id ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-400" />
                                  <span>COPIED</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>COPY</span>
                                </>
                              )}
                            </button>
                          </div>
                        ) : (
                          <div className="px-2 py-1 rounded bg-neutral-950/80 border border-neutral-800 text-[10px] font-mono text-emerald-400 flex items-center gap-1.5">
                            <Check className="w-3 h-3" />
                            <span>YOUR UPLOADED FILM • OWNER ACCESS ACTIVE</span>
                          </div>
                        )}

                        {/* Owner 1-Click Play - No Code Required */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOwnerWatchFilm(film);
                          }}
                          className="w-full py-2.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 text-xs font-mono font-black uppercase flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 active:scale-98 transition-all"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>PLAY FILM (OWNER - NO CODE)</span>
                        </button>
                      </div>
                    ) : (
                      /* Other user's film: Protected. Cannot be played without code! */
                      <div className="space-y-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFilmCardClick(film);
                          }}
                          className="w-full py-2 px-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500 text-amber-300 hover:text-neutral-950 border border-amber-500/40 text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-98"
                        >
                          <Lock className="w-3.5 h-3.5" />
                          <span>ENTER CODE TO PLAY</span>
                        </button>
                        <span className="text-[10px] font-mono text-neutral-500 block text-center">
                          Code required from filmmaker
                        </span>
                      </div>
                    )}

                    {/* Download / Storage option */}
                    {isDownloading ? (
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-mono text-amber-400 font-bold">
                          <span>Downloading to Sandbox...</span>
                          <span>{downloadProgress}%</span>
                        </div>
                        <div className="w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-amber-500 h-full transition-all duration-200"
                            style={{ width: `${downloadProgress}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between text-[10px] text-neutral-400 pt-1">
                        {isDownloaded ? (
                          <span className="flex items-center gap-1 text-emerald-400 font-mono" title="Saved locally - 100% zero-buffering playback">
                            <Check className="w-3 h-3" />
                            <span>Zero-Buffer Ready</span>
                          </span>
                        ) : (
                          <button
                            onClick={(e) => handleDownloadFilm(film, e)}
                            className="text-neutral-400 hover:text-amber-300 flex items-center gap-1 transition-colors"
                            title="Download to local device for zero-buffering playback"
                          >
                            <Download className="w-3 h-3" />
                            <span>Download (Zero Buffer)</span>
                          </button>
                        )}
                        <span className="font-mono text-neutral-400">
                          {isOwner ? 'Owner Unlocked' : 'Code Protected'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. FILM PREVIEW & 9-DIGIT CODE MODAL (Guests cannot play without code) */}
      {detailsFilm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-neutral-900 border border-neutral-800 p-6 text-neutral-100 shadow-2xl">
            <button
              onClick={() => setDetailsFilm(null)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Poster & Film Info */}
            <div className="flex flex-col sm:flex-row gap-5 items-start">
              <img
                src={detailsFilm.posterUrl}
                alt={detailsFilm.title}
                className="w-full sm:w-44 aspect-[2/3] object-cover rounded-xl border border-neutral-800 shadow-xl"
              />
              <div className="flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded font-mono text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                    {detailsFilm.languageName}
                  </span>
                  {detailsFilm.cbfcCertNo && (
                    <span className="px-2 py-0.5 rounded font-mono text-[11px] bg-neutral-800 text-neutral-300">
                      {detailsFilm.cbfcCertNo}
                    </span>
                  )}
                  {detailsFilm.durationMinutes && (
                    <span className="px-2 py-0.5 rounded font-mono text-[11px] bg-neutral-800 text-neutral-300">
                      {detailsFilm.durationMinutes} mins
                    </span>
                  )}
                  {downloadedFilmIds.includes(detailsFilm.id) && (
                    <span className="px-2 py-0.5 rounded font-mono text-[11px] bg-emerald-950/80 text-emerald-300 border border-emerald-600/40">
                      Downloaded In-App
                    </span>
                  )}
                </div>

                <h2 className="text-2xl font-black text-white">{detailsFilm.title}</h2>
                <p className="text-xs text-neutral-300 font-semibold">
                  Production House: <span className="text-white">{detailsFilm.productionHouseName}</span>
                </p>

                <div className="text-xs text-neutral-400 space-y-0.5 font-mono">
                  <p>Director: <strong className="text-neutral-200">{detailsFilm.director}</strong></p>
                  <p>Producer: <strong className="text-neutral-200">{detailsFilm.producer}</strong></p>
                </div>

                <p className="text-xs text-neutral-300 pt-2 leading-relaxed">
                  {detailsFilm.description}
                </p>
              </div>
            </div>

            {/* In-App Offline Sandbox Management Section */}
            <div className="mt-5 p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-mono text-xs font-bold text-neutral-200">
                  <HardDrive className="w-4 h-4 text-emerald-400" />
                  <span>IN-APP ENCRYPTED OFFLINE SANDBOX (ZERO-BUFFER ENGINE)</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-900 text-neutral-400">
                  IndexedDB Storage
                </span>
              </div>

              <p className="text-xs text-neutral-400 leading-relaxed">
                Download to view inside CINEAD.CC with <strong>100% zero network buffering</strong> and offline capability. <strong>This file is NOT saved to your phone gallery or device media library</strong>.
              </p>

              {downloadingMap[detailsFilm.id] !== undefined ? (
                <div className="space-y-1.5 p-3 rounded-lg bg-neutral-900 border border-neutral-800">
                  <div className="flex justify-between text-xs font-mono text-amber-400 font-bold">
                    <span>Downloading to Device Sandbox...</span>
                    <span>{downloadingMap[detailsFilm.id]}%</span>
                  </div>
                  <div className="w-full bg-neutral-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-amber-500 h-full transition-all duration-150"
                      style={{ width: `${downloadingMap[detailsFilm.id]}%` }}
                    />
                  </div>
                </div>
              ) : downloadedFilmIds.includes(detailsFilm.id) ? (
                <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-950/40 border border-emerald-600/40 text-xs">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div>
                      <span className="font-bold text-emerald-300 block">Saved In App Sandbox (Zero-Buffer Ready)</span>
                      <span className="text-[11px] text-emerald-200/70">Plays with 0ms buffering. Requires 9-digit code.</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteOffline(detailsFilm.id)}
                    className="p-1.5 rounded-lg bg-neutral-900 hover:bg-rose-950 text-neutral-400 hover:text-rose-400 border border-neutral-700"
                    title="Remove from in-app storage"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => handleDownloadFilm(detailsFilm)}
                  className="w-full py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-200 hover:text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors"
                >
                  <Download className="w-4 h-4 text-amber-400" />
                  <span>Download for Zero-Buffer Offline Playback</span>
                </button>
              )}
            </div>

            {/* Accessibility Tracks Manifest */}
            <div className="mt-4 p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="font-mono text-neutral-500 block mb-1">AVAILABLE CLOSED CAPTIONS (CC):</span>
                <div className="flex flex-wrap gap-1">
                  {detailsFilm.uploadedCcTracks?.map((t) => (
                    <span key={t.languageCode} className="px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-300 text-[11px]">
                      {t.languageName}
                    </span>
                  )) || <span className="text-neutral-500">Standard Tracks</span>}
                </div>
              </div>
              <div>
                <span className="font-mono text-neutral-500 block mb-1">AVAILABLE AUDIO DESCRIPTION (AD):</span>
                <div className="flex flex-wrap gap-1">
                  {detailsFilm.uploadedAdTracks?.map((t) => (
                    <span key={t.languageCode} className="px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-300 text-[11px]">
                      {t.languageName}
                    </span>
                  )) || <span className="text-neutral-500">Standard Tracks</span>}
                </div>
              </div>
            </div>

            {/* 6. PLAYBACK AUTHORIZATION: 9-DIGIT CODE MANDATORY FOR GUESTS */}
            <div className="mt-5 pt-4 border-t border-neutral-800 space-y-3">
              {isFilmOwner(detailsFilm) ? (
                // OWNER ACCESS: CAN PLAY WITHOUT CODE
                <div className="flex items-center justify-between bg-emerald-950/40 border border-emerald-600/40 p-4 rounded-xl">
                  <div>
                    <span className="text-xs font-bold text-emerald-300 block">
                      Production House Owner Access
                    </span>
                    <span className="text-[11px] text-emerald-200/70">
                      You own this film. You may stream directly without entering a 9-digit code.
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      onOwnerWatchFilm(detailsFilm);
                      setDetailsFilm(null);
                    }}
                    className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-black text-xs uppercase flex items-center gap-1.5 shadow-lg shadow-emerald-500/20"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>WATCH AS OWNER</span>
                  </button>
                </div>
              ) : (
                // GUEST ACCESS: MUST ENTER 9-DIGIT CODE TO PLAY
                <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-amber-400" />
                      <span className="text-xs font-mono font-bold text-white uppercase">
                        ENTER 9-DIGIT PREVIEW CODE TO PLAY
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-neutral-400">
                      Guests cannot play without code
                    </span>
                  </div>

                  <p className="text-xs text-neutral-300">
                    To play this film with synchronized CC and AD, enter the 9-digit preview code issued by the production house or CBFC.
                  </p>

                  <form onSubmit={handleVerifyCodeSubmit} className="space-y-3 pt-1">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        maxLength={9}
                        value={code}
                        onChange={(e) => {
                          setCode(e.target.value.replace(/\D/g, ''));
                          setCodeError(null);
                        }}
                        placeholder="Enter 9-digit code (e.g. 583921746)"
                        className="flex-1 bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-2.5 font-mono text-base tracking-widest text-amber-400 placeholder-neutral-600 focus:outline-none focus:border-amber-500"
                      />
                      <button
                        type="submit"
                        disabled={code.length !== 9}
                        className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-neutral-950 font-black text-xs uppercase shadow-md shadow-amber-500/20 active:scale-95 transition-all"
                      >
                        VERIFY &amp; PLAY
                      </button>
                    </div>

                    {codeError && (
                      <p className="text-xs text-rose-400 flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{codeError}</span>
                      </p>
                    )}

                    {isFilmOwner(detailsFilm) && detailsFilm.previewCode && (
                      <div className="text-[11px] font-mono text-neutral-400 text-center pt-1 bg-neutral-900/60 p-2 rounded-lg border border-neutral-800">
                        Your film preview code:{' '}
                        <button
                          type="button"
                          onClick={() => setCode(detailsFilm.previewCode || '')}
                          className="text-amber-400 underline font-bold"
                        >
                          {detailsFilm.previewCode}
                        </button>
                      </div>
                    )}
                  </form>

                  {!currentUser && (
                    <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between text-xs text-neutral-400">
                      <span>Are you the owner of this film?</span>
                      <button
                        onClick={() => {
                          setDetailsFilm(null);
                          onOpenAuth();
                        }}
                        className="text-amber-400 hover:underline font-bold"
                      >
                        Login as Owner
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
