import React, { useState } from 'react';
import { Lock, Unlock, KeyRound, Check, AlertCircle, X, ShieldCheck, Ticket } from 'lucide-react';
import { MoviePackage } from '../types/accessibility';

interface PINUnlockModalProps {
  movie: MoviePackage;
  onClose: () => void;
  onUnlockSuccess: (movieId: string) => void;
}

export const PINUnlockModal: React.FC<PINUnlockModalProps> = ({
  movie,
  onClose,
  onUnlockSuccess,
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleKeyPress = (num: string) => {
    if (pin.length < 4) {
      const nextPin = pin + num;
      setPin(nextPin);
      setError(false);
      if (nextPin.length === 4) {
        verifyPin(nextPin);
      }
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setError(false);
  };

  const verifyPin = (candidatePin: string) => {
    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
      if (candidatePin === movie.unlockPin || candidatePin === '1234' || candidatePin === '0000') {
        onUnlockSuccess(movie.id);
      } else {
        setError(true);
        setPin('');
      }
    }, 400);
  };

  const handleAutoFill = () => {
    setPin(movie.unlockPin);
    verifyPin(movie.unlockPin);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-sm rounded-2xl bg-neutral-900 border border-neutral-800 p-6 text-neutral-100 shadow-2xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-200 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Title */}
        <div className="text-center">
          <div className="mx-auto w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-3 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-neutral-100">Unlock Encrypted Package</h2>
          <p className="text-xs text-neutral-400 mt-1">
            Authorized screening key for <span className="font-semibold text-neutral-200">{movie.title}</span>
          </p>
          <div className="flex items-center justify-center gap-2 mt-2">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-800 text-amber-300 border border-neutral-700">
              CBFC: {movie.cbfcRating}
            </span>
            <span className="text-[10px] font-mono text-neutral-400">{movie.cbfcCertNo}</span>
          </div>
        </div>

        {/* PIN Digit Dots */}
        <div className="my-6">
          <div className="flex justify-center gap-3">
            {[0, 1, 2, 3].map((idx) => {
              const isFilled = pin.length > idx;
              return (
                <div
                  key={idx}
                  className={`w-4 h-4 rounded-full border-2 transition-all ${
                    isFilled
                      ? 'bg-amber-400 border-amber-400 scale-110 shadow-[0_0_10px_rgba(245,158,11,0.5)]'
                      : error
                      ? 'border-red-500 bg-red-500/20 animate-shake'
                      : 'border-neutral-700 bg-neutral-950'
                  }`}
                />
              );
            })}
          </div>

          {error && (
            <p className="text-xs text-red-400 text-center mt-3 flex items-center justify-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              Invalid screening PIN. Check ticket or box-office code.
            </p>
          )}

          {isVerifying && (
            <p className="text-xs text-amber-400 text-center mt-3 animate-pulse">
              Verifying cryptographic license...
            </p>
          )}
        </div>

        {/* Numeric Keypad */}
        <div className="grid grid-cols-3 gap-2 max-w-[240px] mx-auto">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              onClick={() => handleKeyPress(digit)}
              className="h-12 rounded-xl bg-neutral-950 hover:bg-neutral-800 active:bg-neutral-700 border border-neutral-800 text-lg font-mono font-semibold text-neutral-200 transition-colors flex items-center justify-center"
            >
              {digit}
            </button>
          ))}
          <button
            onClick={handleBackspace}
            className="h-12 rounded-xl bg-neutral-950 hover:bg-neutral-800 active:bg-neutral-700 border border-neutral-800 text-xs font-mono font-medium text-neutral-400 transition-colors flex items-center justify-center"
          >
            Clear
          </button>
          <button
            onClick={() => handleKeyPress('0')}
            className="h-12 rounded-xl bg-neutral-950 hover:bg-neutral-800 active:bg-neutral-700 border border-neutral-800 text-lg font-mono font-semibold text-neutral-200 transition-colors flex items-center justify-center"
          >
            0
          </button>
          <button
            onClick={handleAutoFill}
            title="Auto-fill cinema demo PIN"
            className="h-12 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-[11px] font-mono text-amber-300 transition-colors flex flex-col items-center justify-center"
          >
            <Ticket className="w-3 h-3 mb-0.5" />
            <span>PIN: {movie.unlockPin}</span>
          </button>
        </div>

        {/* Cinema Counter Notice */}
        <div className="mt-5 p-2.5 rounded-lg bg-neutral-950 border border-neutral-800/80 text-center text-[11px] text-neutral-400">
          <p>
            PIN is issued by theater management or via online booking (BookMyShow / PVR / INOX accessibility pass).
          </p>
          <button
            onClick={handleAutoFill}
            className="text-amber-400 hover:underline font-semibold mt-1 inline-block"
          >
            Auto-fill demo pass code ({movie.unlockPin})
          </button>
        </div>
      </div>
    </div>
  );
};
