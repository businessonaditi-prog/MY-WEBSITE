import React, { useState } from 'react';
import { X, CreditCard, ShieldCheck, CheckCircle2, AlertCircle, Copy, Check, MessageSquare, Mail, Film, ArrowRight } from 'lucide-react';
import { Film as FilmType, Payment } from '../types/cinemaPlatform';
import { api } from '../services/apiClient';

interface PaymentModalProps {
  film: FilmType;
  onClose: () => void;
  onPaymentSuccess: (payment: Payment, previewCode: string) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  film,
  onClose,
  onPaymentSuccess,
}) => {
  const [amount, setAmount] = useState<number>(15000); // Minimum ₹15,000 INR strictly enforced
  const [gateway, setGateway] = useState<'UPI' | 'Debit Card' | 'Credit Card' | 'Net Banking'>('UPI');
  const [upiId, setUpiId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Success State
  const [paymentSuccess, setPaymentSuccess] = useState<boolean>(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [deliveryInfo, setDeliveryInfo] = useState<{ email: string; mobile: string } | null>(null);

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount < 15000) {
      setError('Minimum statutory fee of ₹15,000 INR is strictly required.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await api.confirmPayment(film.id, amount, gateway);
      setPaymentSuccess(true);
      setGeneratedCode(res.previewCode);
      setDeliveryInfo({
        email: res.delivery.deliveredToEmail,
        mobile: res.delivery.deliveredToMobile,
      });
      onPaymentSuccess(res.payment, res.previewCode);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Payment transaction failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (generatedCode) {
      navigator.clipboard.writeText(generatedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg rounded-2xl bg-neutral-900 border border-neutral-800 p-6 text-neutral-100 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-neutral-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        {!paymentSuccess ? (
          <div>
            <div className="text-center mb-6">
              <div className="mx-auto w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-2 shadow-lg">
                <CreditCard className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-black text-white uppercase tracking-wide">
                STATUTORY PREVIEW FEE
              </h2>
              <p className="text-xs text-neutral-400 mt-1">
                Official CBFC certification submission for <span className="text-white font-semibold">{film.title}</span>
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-rose-950/60 border border-rose-600/50 text-rose-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handlePay} className="space-y-4">
              {/* Fee Amount Box */}
              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-mono text-neutral-400 block">SUBMISSION FEE (INR)</span>
                  <span className="text-[10px] text-amber-400 font-mono">Backend enforced minimum: ₹15,000</span>
                </div>
                <div className="text-right">
                  <div className="flex items-center text-xl font-mono font-bold text-emerald-400">
                    <span>₹</span>
                    <input
                      type="number"
                      min={15000}
                      step={500}
                      value={amount}
                      onChange={(e) => setAmount(Number(e.target.value))}
                      className="w-28 text-right bg-transparent border-b border-neutral-700 text-xl font-mono font-bold text-emerald-400 focus:outline-none focus:border-amber-500 ml-1"
                    />
                  </div>
                </div>
              </div>

              {/* Payment Gateway Selector */}
              <div>
                <label className="text-xs font-semibold text-neutral-300 block mb-2">
                  Select Indian Payment Gateway Method
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['UPI', 'Debit Card', 'Credit Card', 'Net Banking'] as const).map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setGateway(method)}
                      className={`p-3 rounded-xl border text-xs font-bold text-left transition-all ${
                        gateway === method
                          ? 'border-amber-500 bg-amber-500/10 text-amber-300 ring-1 ring-amber-500'
                          : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-white'
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              {gateway === 'UPI' && (
                <div>
                  <label className="text-xs font-semibold text-neutral-300 block mb-1">
                    UPI ID / VPA (Google Pay / PhonePe / Paytm / BHIM)
                  </label>
                  <input
                    type="text"
                    placeholder="producer@okhdfcbank"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              )}

              <div className="p-3 rounded-xl bg-neutral-950/60 border border-neutral-800 text-[11px] text-neutral-400 space-y-1">
                <div className="flex items-center gap-1.5 text-neutral-300 font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>256-Bit Encrypted Gateway</span>
                </div>
                <p>
                  Upon confirmed payment, a unique 9-digit preview code will be cryptographically minted
                  and dispatched to your registered email and WhatsApp/SMS.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || amount < 15000}
                className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-neutral-950 font-black text-xs uppercase tracking-wider shadow-xl shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
              >
                {loading ? 'Processing Payment...' : `CONFIRM PAYMENT OF ₹${amount.toLocaleString()} INR`}
              </button>
            </form>
          </div>
        ) : (
          // PAYMENT SUCCESS & 9-DIGIT CODE REVEAL
          <div className="space-y-6 text-center py-2 animate-fadeIn">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-xl shadow-emerald-500/20">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <span className="text-[11px] font-mono text-emerald-400 font-bold px-2.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-600/40">
                PAYMENT CONFIRMED (₹{amount.toLocaleString()} INR)
              </span>
              <h2 className="text-xl font-black text-white uppercase mt-2">
                UNIQUE 9-DIGIT PREVIEW CODE
              </h2>
              <p className="text-xs text-neutral-400 mt-1">
                Share this confidential code exclusively with the authorized CBFC official.
              </p>
            </div>

            {/* Huge 9-Digit Code Display */}
            <div className="p-5 rounded-2xl bg-neutral-950 border-2 border-amber-500/60 shadow-[0_0_30px_rgba(245,158,11,0.15)] flex flex-col items-center justify-center gap-2">
              <span className="text-xs font-mono text-neutral-500">OFFICIAL 9-DIGIT PREVIEW CODE:</span>
              <div className="text-3xl sm:text-4xl font-mono font-black tracking-widest text-amber-400 select-all">
                {generatedCode}
              </div>
              <button
                onClick={handleCopyCode}
                className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-xs font-mono text-neutral-300 border border-neutral-700 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied to Clipboard' : 'Copy 9-Digit Code'}</span>
              </button>
            </div>

            {/* Delivery Confirmation */}
            <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-left space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 font-bold font-mono">
                <CheckCircle2 className="w-4 h-4" />
                <span>Automated Delivery Dispatched:</span>
              </div>
              <div className="flex items-center gap-2 text-neutral-300 font-mono text-[11px]">
                <Mail className="w-3.5 h-3.5 text-neutral-400" />
                <span>Email dispatched to: <strong>{deliveryInfo?.email}</strong></span>
              </div>
              <div className="flex items-center gap-2 text-neutral-300 font-mono text-[11px]">
                <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                <span>WhatsApp / SMS dispatched to: <strong>{deliveryInfo?.mobile}</strong></span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20"
            >
              Done (View in My Films)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
