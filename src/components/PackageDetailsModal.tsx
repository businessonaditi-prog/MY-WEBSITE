import React from 'react';
import { X, Download, Lock, Unlock, Play, Headphones, Subtitles, ShieldCheck, HardDrive, FileText } from 'lucide-react';
import { MoviePackage } from '../types/accessibility';

interface PackageDetailsModalProps {
  movie: MoviePackage;
  onClose: () => void;
  onDownload: (movieId: string) => void;
  onOpenUnlock: (movie: MoviePackage) => void;
  onSelectForPlayback: (movie: MoviePackage) => void;
}

export const PackageDetailsModal: React.FC<PackageDetailsModalProps> = ({
  movie,
  onClose,
  onDownload,
  onOpenUnlock,
  onSelectForPlayback,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-neutral-900 border border-neutral-800 text-neutral-100 shadow-2xl p-6">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-200 transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Top Hero Header with Poster */}
        <div className="flex flex-col sm:flex-row gap-5 items-start">
          <img
            src={movie.posterUrl}
            alt={movie.title}
            className="w-full sm:w-40 h-56 object-cover rounded-xl shadow-lg border border-neutral-800"
          />
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded font-mono text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                CBFC {movie.cbfcRating}
              </span>
              <span className="px-2 py-0.5 rounded font-mono text-[11px] bg-neutral-800 text-neutral-300">
                {movie.durationMinutes} mins
              </span>
              <span className="px-2 py-0.5 rounded font-mono text-[11px] bg-neutral-800 text-neutral-300">
                {movie.releaseYear}
              </span>
            </div>

            <h2 className="text-2xl font-black text-white tracking-wide">{movie.title}</h2>
            <p className="text-xs text-neutral-400 font-mono mt-1">
              Cert No: <span className="text-neutral-300">{movie.cbfcCertNo}</span> • Dir: {movie.director}
            </p>
            <p className="text-xs text-neutral-400 mt-0.5">Prod: {movie.producer}</p>

            <p className="text-xs sm:text-sm text-neutral-300 mt-3 leading-relaxed">
              {movie.summary}
            </p>
          </div>
        </div>

        {/* Accessibility Tracks Breakdown */}
        <div className="mt-6 pt-5 border-t border-neutral-800 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Audio Description Tracks */}
          <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-400 font-mono mb-2">
              <Headphones className="w-4 h-4" />
              <span>AUDIO DESCRIPTION (AD) TRACKS</span>
            </div>
            <div className="space-y-2">
              {Object.entries(movie.adTracks).map(([lang, track]) => (
                <div key={lang} className="text-xs bg-neutral-900/70 p-2.5 rounded-lg border border-neutral-800/80">
                  <div className="flex justify-between font-semibold text-neutral-200">
                    <span>{lang}</span>
                    <span className="text-[10px] text-amber-400 font-mono">{track.cues.length} Cues</span>
                  </div>
                  <div className="text-[11px] text-neutral-400 mt-0.5">Narrator: {track.narrator}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Closed Caption Tracks */}
          <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800">
            <div className="flex items-center gap-2 text-xs font-bold text-sky-400 font-mono mb-2">
              <Subtitles className="w-4 h-4" />
              <span>CLOSED CAPTION (CC) TRACKS</span>
            </div>
            <div className="space-y-2">
              {Object.entries(movie.ccTracks).map(([lang, track]) => (
                <div key={lang} className="text-xs bg-neutral-900/70 p-2.5 rounded-lg border border-neutral-800/80">
                  <div className="flex justify-between font-semibold text-neutral-200">
                    <span>{lang}</span>
                    <span className="text-[10px] text-sky-400 font-mono">{track.cues.length} Cues</span>
                  </div>
                  <div className="text-[11px] text-neutral-400 mt-0.5">
                    Includes sound effects, music markers &amp; speaker tags
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Technical Package Data */}
        <div className="mt-4 p-3 rounded-lg bg-neutral-950/60 border border-neutral-800 flex flex-wrap items-center justify-between text-xs font-mono text-neutral-400">
          <div className="flex items-center gap-2">
            <HardDrive className="w-3.5 h-3.5 text-neutral-400" />
            <span>Encrypted Package Size: <strong className="text-neutral-200">{movie.packageSize}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>SHA-256 Checksum Verified</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 pt-4 border-t border-neutral-800 flex flex-wrap items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-400 hover:text-white transition-colors"
          >
            Close
          </button>

          {!movie.isDownloaded ? (
            <button
              onClick={() => onDownload(movie.id)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Download Offline Package ({movie.packageSize})</span>
            </button>
          ) : !movie.isUnlocked ? (
            <button
              onClick={() => {
                onClose();
                onOpenUnlock(movie);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all"
            >
              <Lock className="w-4 h-4" />
              <span>Enter Screening PIN to Decrypt</span>
            </button>
          ) : (
            <button
              onClick={() => {
                onSelectForPlayback(movie);
                onClose();
              }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-black text-xs shadow-lg shadow-emerald-500/20 transition-all"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Launch in Cinema Player</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
