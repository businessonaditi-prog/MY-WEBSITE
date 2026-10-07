import React, { useState } from 'react';
import { Lock, KeyRound, ShieldCheck, ArrowRight, AlertCircle, Film, Radio } from 'lucide-react';
import { api } from '../services/apiClient';
import { Film as FilmType } from '../types/cinemaPlatform';

interface CBFCVerificationViewProps {
  onVerificationSuccess: (film: FilmType, sessionToken: string, watermark: string) => void;
  onOpenAuth: () => void;
  isAuthenticated: boolean;
}

export const CBFCVerificationView: React.FC<CBFCVerificationViewProps> = ({
  onVerificationSuccess,
  onOpenAuth,
  isAuthenticated,
}) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      setError('Please login to an authorized CBFC account to verify preview codes.');
      return;
    }

    if (!code.trim() || code.length !== 9) {
      setError('Preview code must contain exactly 9 numeric digits.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await api.verifyPreviewCode(code.trim());
      onVerificationSuccess(res.film, res.sessionToken, res.watermark);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid preview code or unauthorized access.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto py-8 space-y-6 animate-fadeIn">
      {/* Title Card */}
      <div className="text-center space-y-3">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mx-auto shadow-xl">
          <Lock className="w-8 h-8" />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-600/40 text-emerald-300 text-xs font-mono font-bold">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>CBFC EXAMINING OFFICER GATEWAY</span>
        </div>

        <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-wide">
          SECURE FILM PREVIEW
        </h2>

        <p className="text-xs sm:text-sm text-neutral-400 max-w-md mx-auto leading-relaxed">
          Enter the unique 9-digit confidential code provided by the film production house or DCP mastering studio.
        </p>
      </div>

      {/* Code Input Form */}
      <form onSubmit={handleVerify} className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-5 shadow-2xl">
        {!isAuthenticated && (
          <div className="p-3.5 rounded-xl bg-amber-950/60 border border-amber-600/40 text-amber-200 text-xs flex items-center justify-between">
            <span>Official login required to start examination session.</span>
            <button
              type="button"
              onClick={onOpenAuth}
              className="px-3 py-1 rounded-lg bg-amber-500 text-neutral-950 font-bold"
            >
              Login
            </button>
          </div>
        )}

        <div>
          <label className="text-xs font-mono font-bold text-neutral-300 block mb-2">
            9-DIGIT PREVIEW CODE
          </label>
          <input
            type="text"
            maxLength={9}
            value={code}
            onChange={(e) => {
              setCode(e.target.value.replace(/\D/g, ''));
              setError(null);
            }}
            placeholder="583921746"
            className="w-full text-center font-mono text-xl sm:text-3xl font-bold tracking-widest bg-neutral-950 border border-neutral-700 rounded-xl py-3 text-amber-400 focus:outline-none focus:border-amber-500 shadow-inner"
          />
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-600/50 text-rose-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || code.length !== 9}
          className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-neutral-950 font-black text-xs uppercase tracking-wider shadow-xl shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
        >
          {loading ? 'Verifying Authorization...' : 'VERIFY & WATCH FILM'}
          <ArrowRight className="w-4 h-4" />
        </button>

        {/* Quick Demo Codes Strip */}
        <div className="pt-4 border-t border-neutral-800/80 text-center">
          <span className="text-[11px] font-mono text-neutral-500 block mb-2">
            CLICK TO TEST REGISTERED THEATRICAL PREVIEW CODES:
          </span>
          <div className="flex flex-wrap justify-center gap-2 text-xs font-mono">
            <button
              type="button"
              onClick={() => setCode('583921746')}
              className="px-3 py-1.5 rounded-lg bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-neutral-300"
            >
              🎬 Kalki 2898 AD (<span className="text-amber-400 font-bold">583921746</span>)
            </button>
            <button
              type="button"
              onClick={() => setCode('918273645')}
              className="px-3 py-1.5 rounded-lg bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-neutral-300"
            >
              📦 Jawan DCP (<span className="text-cyan-400 font-bold">918273645</span>)
            </button>
          </div>
        </div>
      </form>

      {/* Security Protocol Notice */}
      <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800/80 text-[11px] font-mono text-neutral-500 text-center space-y-1">
        <p className="text-neutral-400 font-semibold">CBFC DIGITAL INTEGRITY MANDATE</p>
        <p>Brute-force protection enabled. Failed attempts are rate-limited and logged in the immutable audit trail.</p>
      </div>
    </div>
  );
};
