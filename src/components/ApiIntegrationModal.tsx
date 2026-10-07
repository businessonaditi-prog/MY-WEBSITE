import React, { useState } from 'react';
import { X, Code, Copy, Check, ExternalLink, Globe, ShieldCheck, Terminal, Server } from 'lucide-react';

interface ApiIntegrationModalProps {
  onClose: () => void;
}

export const ApiIntegrationModal: React.FC<ApiIntegrationModalProps> = ({ onClose }) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const devUrl = 'https://ais-dev-w2c22yyo7draw2tdqvb3ax-279328455851.asia-southeast1.run.app';
  const sharedUrl = 'https://ais-pre-w2c22yyo7draw2tdqvb3ax-279328455851.asia-southeast1.run.app';

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const endpoints = [
    {
      method: 'GET',
      path: '/api/health',
      desc: 'System health check and live API service status',
      sample: `curl -X GET "${devUrl}/api/health"`,
    },
    {
      method: 'GET',
      path: '/api/films',
      desc: 'Fetch public common gallery film catalog metadata',
      sample: `curl -X GET "${devUrl}/api/films"`,
    },
    {
      method: 'POST',
      path: '/api/auth/login',
      desc: 'Authenticate entity via Email & 6-digit code (no OTP required)',
      sample: `curl -X POST "${devUrl}/api/auth/login" \\
  -H "Content-Type: application/json" \\
  -d '{"email":"producer@vyjayanthimovies.in","code":"123456"}'`,
    },
    {
      method: 'POST',
      path: '/api/auth/send-otp',
      desc: 'Dispatch 6-digit mobile OTP for verification',
      sample: `curl -X POST "${devUrl}/api/auth/send-otp" \\
  -H "Content-Type: application/json" \\
  -d '{"mobile":"+919876543210"}'`,
    },
    {
      method: 'POST',
      path: '/api/preview/verify-code',
      desc: 'Verify 9-digit preview code and receive short-lived playback token',
      sample: `curl -X POST "${devUrl}/api/preview/verify-code" \\
  -H "Authorization: Bearer <YOUR_TOKEN>" \\
  -H "Content-Type: application/json" \\
  -d '{"code":"583921746"}'`,
    },
    {
      method: 'POST',
      path: '/api/webhooks/payment',
      desc: 'Payment gateway webhook listener (Razorpay, Cashfree, PayU, Stripe)',
      sample: `curl -X POST "${devUrl}/api/webhooks/payment" \\
  -H "Content-Type: application/json" \\
  -d '{"event":"payment.captured","filmId":"film-kalki-2898","amount":15000}'`,
    },
    {
      method: 'POST',
      path: '/api/webhooks/cbfc-status',
      desc: 'CBFC official examining committee certification update webhook',
      sample: `curl -X POST "${devUrl}/api/webhooks/cbfc-status" \\
  -H "Content-Type: application/json" \\
  -d '{"filmId":"film-kalki-2898","certNumber":"DIL/2/184/2024-HYD","rating":"U/A 13+"}'`,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-neutral-900 border border-neutral-800 p-6 text-neutral-100 shadow-2xl space-y-6">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-neutral-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Server className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white uppercase tracking-wide">
              API Connection &amp; Webhook Endpoints
            </h2>
            <p className="text-xs text-neutral-400">
              Use these live URLs to connect your external backend, payment gateway IPN, or CBFC automation.
            </p>
          </div>
        </div>

        {/* Live App URLs Section */}
        <div className="space-y-3">
          <span className="text-xs font-mono font-bold text-neutral-300 block uppercase">
            Live Application Base URLs:
          </span>

          <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-[11px] font-mono text-amber-400 font-bold block">
                DEVELOPMENT APP URL (Live Dev Server &amp; APIs)
              </span>
              <span className="font-mono text-xs text-neutral-200 select-all">{devUrl}</span>
            </div>
            <button
              onClick={() => handleCopy(devUrl, 'devUrl')}
              className="px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-xs font-mono text-neutral-300 border border-neutral-700 flex items-center gap-1.5 shrink-0 transition-colors"
            >
              {copiedKey === 'devUrl' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedKey === 'devUrl' ? 'Copied' : 'Copy URL'}</span>
            </button>
          </div>

          <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-[11px] font-mono text-emerald-400 font-bold block">
                SHARED APP URL (Live Production / Staging)
              </span>
              <span className="font-mono text-xs text-neutral-200 select-all">{sharedUrl}</span>
            </div>
            <button
              onClick={() => handleCopy(sharedUrl, 'sharedUrl')}
              className="px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-xs font-mono text-neutral-300 border border-neutral-700 flex items-center gap-1.5 shrink-0 transition-colors"
            >
              {copiedKey === 'sharedUrl' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedKey === 'sharedUrl' ? 'Copied' : 'Copy URL'}</span>
            </button>
          </div>
        </div>

        {/* REST API Endpoints List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-neutral-300 uppercase">
              Core REST Endpoints:
            </span>
            <span className="text-[11px] font-mono text-neutral-500">JSON API • Bearer Token Auth</span>
          </div>

          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {endpoints.map((ep, idx) => (
              <div key={idx} className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        ep.method === 'GET'
                          ? 'bg-sky-950 text-sky-400 border border-sky-800'
                          : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                      }`}
                    >
                      {ep.method}
                    </span>
                    <span className="font-mono text-xs text-white font-bold">{ep.path}</span>
                  </div>
                  <button
                    onClick={() => handleCopy(ep.sample, `sample-${idx}`)}
                    className="text-[11px] font-mono text-amber-400 hover:underline flex items-center gap-1"
                  >
                    {copiedKey === `sample-${idx}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedKey === `sample-${idx}` ? 'Copied cURL' : 'Copy cURL'}</span>
                  </button>
                </div>
                <p className="text-xs text-neutral-400">{ep.desc}</p>
                <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800 font-mono text-[10px] sm:text-[11px] text-neutral-300 whitespace-pre-wrap break-all leading-relaxed">
                  {ep.sample}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-amber-500 text-neutral-950 font-bold text-xs uppercase"
          >
            Close Documentation
          </button>
        </div>
      </div>
    </div>
  );
};
