import React, { useState, useEffect } from 'react';
import {
  Film as FilmIcon,
  ShieldCheck,
  CheckCircle2,
  Lock,
  ArrowRight,
  Upload,
  CreditCard,
  KeyRound,
  Eye,
  Headphones,
  Subtitles,
  Layers,
  UserCheck,
  Play,
  Download,
  AlertCircle,
  X,
  HardDrive,
  Globe,
} from 'lucide-react';
import { Film, User } from '../types/cinemaPlatform';

interface LandingPageProps {
  onRegisterProductionHouse: () => void;
  onBrowseFilms: () => void;
  onDcpStudioLogin: () => void;
  onSelectFilmForPreviewWithCode?: (film: Film, code: string) => void;
  onOwnerWatchFilm?: (film: Film) => void;
  onOpenAuth?: (mode?: 'login' | 'register') => void;
  onOpenDomainSetup?: () => void;
  currentUser?: User | null;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onRegisterProductionHouse,
  onBrowseFilms,
  onDcpStudioLogin,
  onSelectFilmForPreviewWithCode,
  onOwnerWatchFilm,
  onOpenAuth,
  onOpenDomainSetup,
  currentUser,
}) => {
  const [films, setFilms] = useState<Film[]>([]);
  const [loadingFilms, setLoadingFilms] = useState(true);

  // Selected film for guest 9-digit code prompt
  const [activeFilmForCode, setActiveFilmForCode] = useState<Film | null>(null);
  const [inputCode, setInputCode] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);

  useEffect(() => {
    fetchFilms();
  }, []);

  const fetchFilms = async () => {
    setLoadingFilms(true);
    try {
      const res = await fetch('/api/films');
      const data = await res.json();
      setFilms(data.films || []);
    } catch (e) {
      console.error('Error fetching landing films:', e);
    } finally {
      setLoadingFilms(false);
    }
  };

  const handleVerifyCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCode.trim() || inputCode.length !== 9) {
      setCodeError('Please enter a valid 9-digit numeric preview code.');
      return;
    }

    if (activeFilmForCode && onSelectFilmForPreviewWithCode) {
      onSelectFilmForPreviewWithCode(activeFilmForCode, inputCode.trim());
      setActiveFilmForCode(null);
      setInputCode('');
    }
  };

  const steps = [
    {
      step: 'STEP 1',
      title: 'Register',
      desc: 'Production House or DCP Studio registers with official credentials and entity verification.',
      icon: <FilmIcon className="w-5 h-5 text-amber-400" />,
    },
    {
      step: 'STEP 2',
      title: '6-Digit Access Code',
      desc: 'Instant official authentication using registered email and secure 6-digit access code (no OTP required).',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
    },
    {
      step: 'STEP 3',
      title: 'Upload Film + CC + AD + Poster',
      desc: 'Upload master video/DCP, mandatory poster, validated Closed Captions, and Audio Description.',
      icon: <Upload className="w-5 h-5 text-sky-400" />,
    },
    {
      step: 'STEP 4',
      title: 'Pay (Min ₹15,000)',
      desc: 'Secure payment gateway processing for official statutory certification & preview submission.',
      icon: <CreditCard className="w-5 h-5 text-purple-400" />,
    },
    {
      step: 'STEP 5',
      title: 'Receive Unique 9-Digit Code',
      desc: 'Cryptographically generated 9-digit preview code dispatched via encrypted Email and WhatsApp/SMS.',
      icon: <KeyRound className="w-5 h-5 text-amber-400" />,
    },
    {
      step: 'STEP 6',
      title: 'Share Code with CBFC Official',
      desc: 'Provide the 9-digit preview code exclusively to the designated CBFC examining committee.',
      icon: <Lock className="w-5 h-5 text-emerald-400" />,
    },
    {
      step: 'STEP 7',
      title: 'Secure Film Preview',
      desc: 'Protected theatrical playback with dynamic CC/AD language switching and microphone synchronization.',
      icon: <Eye className="w-5 h-5 text-amber-400" />,
    },
  ];

  return (
    <div className="space-y-12 py-4 sm:py-8 animate-fadeIn">
      {/* 1. HERO SECTION */}
      <section className="text-center max-w-4xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono font-semibold">
          <ShieldCheck className="w-4 h-4 text-amber-400" />
          <span>CENTRAL BOARD THEATRICAL ACCESSIBILITY ARCHIVE</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight uppercase leading-tight">
          <span className="text-amber-400">CINEAD.CC</span> THEATRICAL ACCESSIBILITY PLATFORM
        </h1>

        <p className="text-sm sm:text-base text-neutral-300 max-w-2xl mx-auto leading-relaxed">
          Statutory cinema platform for film production houses, DCP studios, and CBFC preview committees.
          Synchronized Audio Description (AD) and Closed Captions (CC) compliance under Central Board guidelines.
        </p>

        {/* Parallel Domain Badge */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/70 border border-cyan-600/40 text-cyan-300 text-xs font-mono">
            <Globe className="w-3.5 h-3.5 text-cyan-400" />
            <span>Parallel Custom Domain: <strong className="text-white">www.cinead.cc</strong></span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          </div>
          {onOpenDomainSetup && (
            <button
              onClick={onOpenDomainSetup}
              className="px-2.5 py-1 rounded-full bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 text-xs font-mono hover:text-white transition-colors"
            >
              DNS &amp; Domain Setup &rarr;
            </button>
          )}
        </div>
      </section>

      {/* 2. REGISTRATION BUTTON PLACED PROMINENTLY ABOVE (User Requirement) */}
      <section className="max-w-5xl mx-auto">
        <div className="p-5 sm:p-7 rounded-3xl bg-gradient-to-r from-amber-500/20 via-yellow-500/10 to-neutral-900 border border-amber-500/40 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-black bg-amber-500 text-neutral-950 uppercase tracking-wider">
                REGISTRATION PORTAL
              </span>
              <span className="text-xs font-mono text-amber-300 font-bold">
                Production Houses &amp; Studios
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-wide">
              Register Production House or Create Account
            </h2>
            <p className="text-xs sm:text-sm text-neutral-300 max-w-xl leading-relaxed">
              Register your production entity to upload feature films, attach multi-language Closed Captions and Audio Description tracks, and generate 9-digit statutory preview codes.
            </p>
          </div>

          {/* Action Button ABOVE Thumbnails: Combined Sign UP/in */}
          <div className="flex flex-wrap items-center gap-3 shrink-0 w-full md:w-auto">
            <button
              onClick={() => (onOpenAuth ? onOpenAuth() : onRegisterProductionHouse())}
              className="w-full md:w-auto px-6 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-xs sm:text-sm uppercase tracking-wider shadow-xl shadow-amber-500/25 transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              <UserCheck className="w-4 h-4" />
              <span>Sign UP/in</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* 3. THUMBNAILS OF FILMS BELOW REGISTRATION BUTTON (User Requirement) */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-3 border-b border-neutral-800">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-mono text-amber-400 font-bold mb-1">
              <FilmIcon className="w-4 h-4" />
              <span>THEATRICAL EXHIBITION CATALOG</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-wide">
              Certified Theatrical Features &amp; Previews
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Guests can view film thumbnails and metadata freely. <strong>Playback is protected and requires an authorized 9-digit code.</strong>
            </p>
          </div>

          <button
            onClick={onBrowseFilms}
            className="self-start sm:self-auto px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-xs font-mono font-bold text-neutral-300 hover:text-white transition-colors"
          >
            VIEW ALL FILMS ({films.length}) →
          </button>
        </div>

        {/* Film Thumbnails Grid */}
        {loadingFilms ? (
          <div className="py-16 text-center text-neutral-500 font-mono text-xs">
            Loading theatrical film thumbnails...
          </div>
        ) : films.length === 0 ? (
          <div className="py-12 text-center rounded-2xl bg-neutral-900/40 border border-neutral-800 p-8 text-neutral-400 text-xs">
            No certified films currently cataloged.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {films.map((film) => (
              <div
                key={film.id}
                onClick={() => {
                  setActiveFilmForCode(film);
                  setInputCode('');
                  setCodeError(null);
                }}
                className="group rounded-2xl bg-neutral-900/90 border border-neutral-800 hover:border-amber-500/50 transition-all cursor-pointer overflow-hidden shadow-xl flex flex-col justify-between hover:shadow-amber-500/10"
              >
                {/* FILM THUMBNAIL (Poster) */}
                <div className="relative aspect-[2/3] bg-neutral-950 overflow-hidden">
                  <img
                    src={film.posterUrl}
                    alt={film.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-90 group-hover:opacity-100"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-transparent to-black/40" />

                  {/* Top Badges */}
                  <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-neutral-950/85 text-amber-300 border border-neutral-700 backdrop-blur-md">
                      {film.languageName}
                    </span>
                    {film.isDcp && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-950/90 text-cyan-300 border border-cyan-600/50 backdrop-blur-md">
                        DCP
                      </span>
                    )}
                  </div>

                  {/* Bottom Badges */}
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

                {/* Metadata & 9-Digit Code CTA BELOW THUMBNAIL */}
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

                  {/* Button below thumbnail: Enter Code to Play */}
                  <div className="pt-2 border-t border-neutral-800/80">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveFilmForCode(film);
                        setInputCode('');
                        setCodeError(null);
                      }}
                      className="w-full py-2 px-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500 text-amber-300 hover:text-neutral-950 border border-amber-500/40 text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-98"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>ENTER CODE TO PLAY</span>
                    </button>
                    <span className="text-[10px] font-mono text-neutral-500 block text-center mt-1">
                      Guest playback locked without code
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 4. GUEST 9-DIGIT PREVIEW CODE MODAL */}
      {activeFilmForCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-lg rounded-2xl bg-neutral-900 border border-neutral-800 p-6 text-neutral-100 shadow-2xl space-y-4">
            <button
              onClick={() => setActiveFilmForCode(null)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Poster Thumbnail & Header */}
            <div className="flex items-center gap-4">
              <img
                src={activeFilmForCode.posterUrl}
                alt={activeFilmForCode.title}
                className="w-16 aspect-[2/3] object-cover rounded-xl border border-neutral-800 shadow-md"
              />
              <div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  {activeFilmForCode.languageName} • {activeFilmForCode.durationMinutes} min
                </span>
                <h3 className="text-lg font-black text-white mt-1">{activeFilmForCode.title}</h3>
                <p className="text-xs text-neutral-400">{activeFilmForCode.productionHouseName}</p>
              </div>
            </div>

            {/* Guest Policy Explanation */}
            <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-amber-400">
                <Lock className="w-3.5 h-3.5" />
                <span>GUEST PREVIEW: 9-DIGIT CODE REQUIRED</span>
              </div>
              <p className="text-xs text-neutral-300">
                Guests can view this certified film by entering the 9-digit preview code issued by the production house or CBFC examining committee. <strong>Guests cannot play without the code.</strong>
              </p>
            </div>

            {/* 9-Digit Code Form */}
            <form onSubmit={handleVerifyCodeSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-mono font-bold text-neutral-300 block mb-1">
                  ENTER 9-DIGIT PREVIEW CODE:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={9}
                    value={inputCode}
                    onChange={(e) => {
                      setInputCode(e.target.value.replace(/\D/g, ''));
                      setCodeError(null);
                    }}
                    placeholder="e.g. 583921746"
                    className="flex-1 bg-neutral-950 border border-neutral-700 rounded-xl px-4 py-2.5 font-mono text-base tracking-widest text-amber-400 placeholder-neutral-600 focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="submit"
                    disabled={inputCode.length !== 9}
                    className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-neutral-950 font-black text-xs uppercase shadow-md shadow-amber-500/20 active:scale-95 transition-all"
                  >
                    VERIFY &amp; PLAY
                  </button>
                </div>
              </div>

              {codeError && (
                <p className="text-xs text-rose-400 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{codeError}</span>
                </p>
              )}

              {activeFilmForCode.previewCode && (
                <div className="text-[11px] font-mono text-neutral-400 text-center pt-1 bg-neutral-950/60 p-2 rounded-lg border border-neutral-800">
                  Demo hint: Valid preview code for {activeFilmForCode.title} is{' '}
                  <button
                    type="button"
                    onClick={() => setInputCode(activeFilmForCode.previewCode || '')}
                    className="text-amber-400 underline font-bold"
                  >
                    {activeFilmForCode.previewCode}
                  </button>
                </div>
              )}
            </form>

            <div className="pt-2 border-t border-neutral-800 flex items-center justify-between text-xs text-neutral-400">
              <span>Are you the producer/owner?</span>
              <button
                onClick={() => {
                  setActiveFilmForCode(null);
                  if (onOpenAuth) onOpenAuth();
                }}
                className="text-amber-400 hover:underline font-bold"
              >
                Login as Owner to Watch
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. VISUAL 7-STEP STATUTORY WORKFLOW */}
      <section className="space-y-6 pt-6 border-t border-neutral-800">
        <div className="text-center">
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide uppercase">
            Platform Workflow Overview
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 mt-1">
            End-to-end statutory certification and accessibility preview process
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {steps.map((s, idx) => (
            <div
              key={idx}
              className="p-5 rounded-2xl bg-neutral-900/80 border border-neutral-800 flex flex-col justify-between space-y-3 shadow-lg hover:border-neutral-700 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] font-black text-amber-400 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                  {s.step}
                </span>
                <div className="w-8 h-8 rounded-lg bg-neutral-950 flex items-center justify-center border border-neutral-800">
                  {s.icon}
                </div>
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">{s.title}</h3>
                <p className="text-xs text-neutral-400 mt-1 leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
