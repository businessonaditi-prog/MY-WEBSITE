import React, { useState } from 'react';
import { Download, Lock, Unlock, Play, ShieldCheck, Film, HardDrive, Plus, CheckCircle2, Search, Filter } from 'lucide-react';
import { MoviePackage } from '../types/accessibility';

interface PackageVaultProps {
  packages: MoviePackage[];
  onOpenDetails: (movie: MoviePackage) => void;
  onOpenUnlock: (movie: MoviePackage) => void;
  onDownload: (movieId: string) => void;
  onSelectForPlayback: (movie: MoviePackage) => void;
  onImportCustomPackage: () => void;
}

export const PackageVault: React.FC<PackageVaultProps> = ({
  packages,
  onOpenDetails,
  onOpenUnlock,
  onDownload,
  onSelectForPlayback,
  onImportCustomPackage,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'downloaded' | 'unlocked'>('all');

  const filtered = packages.filter((pkg) => {
    const matchesSearch =
      pkg.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pkg.producer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pkg.director.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pkg.originalLanguage.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;
    if (filterMode === 'downloaded') return pkg.isDownloaded;
    if (filterMode === 'unlocked') return pkg.isUnlocked;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Title & Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide flex items-center gap-2">
            <span>Approved Accessibility Packages</span>
            <span className="text-xs font-mono font-semibold px-2.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
              CBFC 2024
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 mt-1">
            Download encrypted Audio Description (AD) and Closed Caption (CC) packages prior to your screening.
          </p>
        </div>

        {/* Action button */}
        <div className="flex items-center gap-2">
          <button
            onClick={onImportCustomPackage}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-xs font-semibold text-neutral-200 transition-colors"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            <span>Import Custom Package JSON</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Tabs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search movie, language, or director..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-9 pr-4 py-2 text-xs sm:text-sm text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-neutral-900 border border-neutral-800 rounded-xl">
          <button
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filterMode === 'all'
                ? 'bg-amber-500 text-neutral-950 font-bold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            All Films ({packages.length})
          </button>
          <button
            onClick={() => setFilterMode('downloaded')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filterMode === 'downloaded'
                ? 'bg-amber-500 text-neutral-950 font-bold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Offline Ready
          </button>
          <button
            onClick={() => setFilterMode('unlocked')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filterMode === 'unlocked'
                ? 'bg-amber-500 text-neutral-950 font-bold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Unlocked PIN
          </button>
        </div>
      </div>

      {/* Movie Package Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((pkg) => {
          return (
            <div
              key={pkg.id}
              className="group relative rounded-2xl bg-neutral-900/90 border border-neutral-800 hover:border-neutral-700 transition-all duration-200 overflow-hidden shadow-xl flex flex-col justify-between"
            >
              {/* Card Image Banner */}
              <div className="relative h-44 overflow-hidden bg-neutral-950 cursor-pointer" onClick={() => onOpenDetails(pkg)}>
                <img
                  src={pkg.posterUrl}
                  alt={pkg.title}
                  className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300 opacity-80 group-hover:opacity-100"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-transparent to-black/40" />

                {/* Rating & Cert Badge */}
                <div className="absolute top-3 left-3 flex items-center gap-1.5">
                  <span className="px-2.5 py-0.5 rounded font-mono text-xs font-bold bg-neutral-950/80 text-amber-400 border border-neutral-700 backdrop-blur-md">
                    {pkg.cbfcRating}
                  </span>
                  <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-neutral-950/80 text-neutral-300 border border-neutral-800 backdrop-blur-md">
                    {pkg.durationMinutes} min
                  </span>
                </div>

                {/* Status Indicator */}
                <div className="absolute top-3 right-3">
                  {pkg.isUnlocked ? (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded font-mono text-[10px] bg-emerald-950/90 text-emerald-300 border border-emerald-500/50 backdrop-blur-md font-semibold">
                      <Unlock className="w-3 h-3 text-emerald-400" />
                      UNLOCKED
                    </span>
                  ) : pkg.isDownloaded ? (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded font-mono text-[10px] bg-amber-950/90 text-amber-300 border border-amber-500/50 backdrop-blur-md font-semibold">
                      <Lock className="w-3 h-3 text-amber-400" />
                      PIN LOCKED
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded font-mono text-[10px] bg-neutral-900/90 text-neutral-400 border border-neutral-700 backdrop-blur-md">
                      <HardDrive className="w-3 h-3" />
                      CLOUD READY
                    </span>
                  )}
                </div>

                <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-xs text-neutral-300">
                  <span className="font-mono text-[11px] text-neutral-400">{pkg.originalLanguage}</span>
                  <span className="font-mono text-[11px] text-neutral-400">{pkg.packageSize}</span>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <h3
                    onClick={() => onOpenDetails(pkg)}
                    className="font-bold text-base text-neutral-100 hover:text-amber-400 cursor-pointer transition-colors"
                  >
                    {pkg.title}
                  </h3>
                  <p className="text-xs text-neutral-400 mt-1 line-clamp-2 leading-relaxed">
                    {pkg.summary}
                  </p>

                  {/* Languages supported */}
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {pkg.availableLanguages.map((lang) => (
                      <span
                        key={lang}
                        className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-950 text-neutral-300 border border-neutral-800"
                      >
                        {lang}
                      </span>
                    ))}
                  </div>

                  {/* Download Progress Bar if in progress */}
                  {!pkg.isDownloaded && pkg.downloadProgress > 0 && pkg.downloadProgress < 100 && (
                    <div className="mt-3">
                      <div className="flex justify-between text-[10px] font-mono text-neutral-400 mb-1">
                        <span>Downloading package...</span>
                        <span>{pkg.downloadProgress}%</span>
                      </div>
                      <div className="h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-500 transition-all duration-150"
                          style={{ width: `${pkg.downloadProgress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Actions */}
                <div className="mt-4 pt-3 border-t border-neutral-800/80 flex items-center justify-between gap-2">
                  <button
                    onClick={() => onOpenDetails(pkg)}
                    className="text-xs text-neutral-400 hover:text-neutral-200 font-medium transition-colors"
                  >
                    Details &amp; Cert
                  </button>

                  <div className="flex items-center gap-2">
                    {!pkg.isDownloaded ? (
                      <button
                        onClick={() => onDownload(pkg.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold border border-neutral-700 transition-colors"
                      >
                        <Download className="w-3.5 h-3.5 text-amber-400" />
                        <span>Download</span>
                      </button>
                    ) : !pkg.isUnlocked ? (
                      <button
                        onClick={() => onOpenUnlock(pkg)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold transition-colors shadow-sm"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span>Unlock PIN</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => onSelectForPlayback(pkg)}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-neutral-950 text-xs font-black transition-colors shadow-sm"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Play in Theater</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
