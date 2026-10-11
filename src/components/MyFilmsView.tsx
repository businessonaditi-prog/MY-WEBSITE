import React, { useState, useEffect } from 'react';
import { Film as FilmType } from '../types/cinemaPlatform';
import { Play, Lock, KeyRound, Copy, Check, MessageSquare, CreditCard, RefreshCw, Upload, Plus, Download, Zap, HardDrive, Loader2 } from 'lucide-react';
import { api } from '../services/apiClient';
import { offlineStorage } from '../services/offlineStorageService';

interface MyFilmsViewProps {
  films: FilmType[];
  onWatchFilmWithoutCode: (film: FilmType) => void;
  onOpenPaymentModal: (film: FilmType) => void;
  onUploadNewFilm: () => void;
  onRefresh: () => void;
}

export const MyFilmsView: React.FC<MyFilmsViewProps> = ({
  films,
  onWatchFilmWithoutCode,
  onOpenPaymentModal,
  onUploadNewFilm,
  onRefresh,
}) => {
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const [resendingFilmId, setResendingFilmId] = useState<string | null>(null);
  const [resendStatus, setResendStatus] = useState<string | null>(null);
  const [downloadedFilmIds, setDownloadedFilmIds] = useState<string[]>([]);
  const [downloadingMap, setDownloadingMap] = useState<Record<string, number>>({});

  useEffect(() => {
    setDownloadedFilmIds(offlineStorage.getDownloadedFilmIds());
  }, []);

  const handleDownloadFilm = async (film: FilmType, e?: React.MouseEvent) => {
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
        (prog) => {
          setDownloadingMap((prev) => ({ ...prev, [film.id]: prog.percent }));
        },
        film
      );
      setDownloadedFilmIds(offlineStorage.getDownloadedFilmIds());
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

  const handleCopyCode = (filmId: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeId(filmId);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  const handleResendCode = async (filmId: string) => {
    setResendingFilmId(filmId);
    setResendStatus(null);
    try {
      const res = await api.resendPreviewCode(filmId);
      setResendStatus(res.message);
      setTimeout(() => setResendStatus(null), 4000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Resend failed.');
    } finally {
      setResendingFilmId(null);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Title & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-wide uppercase">
            MY FILMS &amp; MASTER ASSETS
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 mt-1">
            Certified theatrical uploads and preview management. You can stream your own paid films without entering a code.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            className="p-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 transition-colors"
            title="Refresh Film Statuses"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={onUploadNewFilm}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs uppercase shadow-md shadow-amber-500/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>UPLOAD NEW FILM</span>
          </button>
        </div>
      </div>

      {resendStatus && (
        <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-600/50 text-emerald-200 text-xs">
          {resendStatus}
        </div>
      )}

      {films.length === 0 ? (
        <div className="py-20 text-center rounded-2xl bg-neutral-900/40 border border-neutral-800 p-8 space-y-3">
          <Upload className="w-10 h-10 text-neutral-600 mx-auto" />
          <h3 className="text-base font-bold text-neutral-200">No Films Submitted Yet</h3>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto">
            Upload your feature film or DCP package with validated Closed Captions and Audio Description.
          </p>
          <button
            onClick={onUploadNewFilm}
            className="mt-2 px-5 py-2.5 rounded-xl bg-amber-500 text-neutral-950 font-bold text-xs uppercase"
          >
            Start First Film Upload
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {films.map((film) => (
            <div
              key={film.id}
              className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 transition-all shadow-xl flex flex-col md:flex-row gap-5 items-start md:items-center justify-between"
            >
              {/* Poster & Main Meta */}
              <div className="flex items-start gap-4">
                <img
                  src={film.posterUrl}
                  alt={film.title}
                  className="w-20 sm:w-24 aspect-[2/3] object-cover rounded-xl border border-neutral-800 shadow-md shrink-0"
                />
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                      {film.languageName}
                    </span>
                    {film.isDcp && (
                      <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-700/50">
                        DCP DCI
                      </span>
                    )}
                    {/* Payment Badge */}
                    <span
                      className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                        film.paymentStatus === 'successful'
                          ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-600/50'
                          : 'bg-rose-950/80 text-rose-300 border border-rose-600/50'
                      }`}
                    >
                      Payment: {film.paymentStatus.toUpperCase()}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-white">{film.title}</h3>
                  <p className="text-xs text-neutral-400 font-mono">
                    Dir: {film.director} • Prod: {film.producer}
                  </p>
                  <p className="text-[11px] text-neutral-500 font-mono">
                    Uploaded: {new Date(film.createdAt).toLocaleDateString()} • Asset: {film.videoFileName}
                  </p>
                </div>
              </div>

              {/* 9-Digit Code & Actions (Section #22, #50, #51) */}
              <div className="w-full md:w-auto flex flex-col sm:flex-row md:flex-col items-start md:items-end gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-neutral-800">
                {film.paymentStatus === 'successful' && film.previewCode ? (
                  <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 text-right w-full sm:w-auto">
                    <div className="flex items-center justify-between sm:justify-end gap-2 text-xs font-mono">
                      <span className="text-neutral-500 text-[10px]">9-DIGIT PREVIEW CODE:</span>
                      <strong className="text-amber-400 tracking-wider text-sm">
                        {film.previewCode}
                      </strong>
                    </div>

                    <div className="flex items-center justify-end gap-2 mt-1.5 text-[10px] font-mono">
                      <button
                        onClick={() => handleCopyCode(film.id, film.previewCode!)}
                        className="text-neutral-400 hover:text-white flex items-center gap-1"
                      >
                        {copiedCodeId === film.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedCodeId === film.id ? 'Copied' : 'Copy Code'}</span>
                      </button>
                      <span>•</span>
                      <button
                        onClick={() => handleResendCode(film.id)}
                        disabled={resendingFilmId === film.id}
                        className="text-amber-400 hover:underline flex items-center gap-1"
                      >
                        <MessageSquare className="w-3 h-3" />
                        <span>Resend Email/SMS</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => onOpenPaymentModal(film)}
                    className="w-full sm:w-auto px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs uppercase flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20"
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Complete Payment (₹15,000)</span>
                  </button>
                )}

                {/* Owner Watch Film Button & Zero-Buffer Local Download Option */}
                {film.paymentStatus === 'successful' && (
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    {downloadingMap[film.id] !== undefined ? (
                      <div className="px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center gap-2 text-xs font-mono text-amber-400">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving to Device ({downloadingMap[film.id]}%)...</span>
                      </div>
                    ) : downloadedFilmIds.includes(film.id) ? (
                      <span className="px-3 py-2 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-bold flex items-center justify-center gap-1.5 shadow-sm">
                        <Zap className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
                        <span>Zero-Buffer Ready</span>
                      </span>
                    ) : (
                      <button
                        onClick={(e) => handleDownloadFilm(film, e)}
                        className="px-3.5 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 hover:text-white font-bold text-xs uppercase flex items-center justify-center gap-1.5 transition-colors"
                        title="Download to local device for 100% buffer-free playback"
                      >
                        <Download className="w-3.5 h-3.5 text-amber-400" />
                        <span>Download (Zero Buffer)</span>
                      </button>
                    )}

                    <button
                      onClick={() => onWatchFilmWithoutCode(film)}
                      className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>WATCH FILM (OWNER ACCESS)</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
