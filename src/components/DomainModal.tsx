import React, { useState, useEffect } from 'react';
import {
  X,
  Globe,
  CheckCircle2,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  AlertTriangle,
  Info,
  Server,
  Zap,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

interface DomainModalProps {
  onClose: () => void;
}

interface DomainDnsCheckResult {
  domain: string;
  apex: string;
  targetUrl: string;
  nameservers: string[];
  detectedRegistrar: string;
  directDnsUrl: string;
  cnameRecords: string[];
  cnameMatched: boolean;
  apexARecords: string[];
  isGodaddyParked: boolean;
  httpForwardingActive?: boolean;
  forwardedLocation?: string;
  propagationStatus: 'verified' | 'propagating' | 'pending';
  details: string[];
  recommendation: string;
  checkedAt: string;
}

export const DomainModal: React.FC<DomainModalProps> = ({ onClose }) => {
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [checkingDns, setCheckingDns] = useState<boolean>(false);
  const [dnsResult, setDnsResult] = useState<DomainDnsCheckResult | null>(null);
  const [activeTab, setActiveTab] = useState<'godaddy' | 'sync' | 'cloudflare' | 'records'>('godaddy');

  const appDirectUrl = 'https://ais-pre-w2c22yyo7draw2tdqvb3ax-279328455851.asia-southeast1.run.app';
  const customDomain = 'cinead.cc';
  const primaryDomain = 'www.cinead.cc';

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2500);
  };

  const runDnsCheck = async () => {
    setCheckingDns(true);
    try {
      const res = await fetch('/api/domain/verify-dns');
      if (res.ok) {
        const data = await res.json();
        setDnsResult(data);
      }
    } catch (err) {
      console.error('DNS check error:', err);
    } finally {
      setCheckingDns(false);
    }
  };

  useEffect(() => {
    runDnsCheck();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-neutral-900 border border-neutral-700/80 rounded-3xl p-5 sm:p-7 shadow-2xl space-y-6 my-auto text-neutral-200">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 shadow-lg shadow-amber-500/10">
              <Globe className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-black text-white uppercase tracking-wide">
                  Reconnect Domain: {customDomain}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  RECONNECTING
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                Link <strong>cinead.cc</strong> &amp; <strong>www.cinead.cc</strong> to your running CBFC accessibility platform.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-neutral-800/80 hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Status & Explanation of 404 */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-950/60 to-neutral-900 border border-cyan-500/30 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-cyan-300">
              <Zap className="w-4 h-4 text-cyan-400" />
              <span>WHY GOOGLE 404 HAPPENED &amp; THE INSTANT SOLUTION</span>
            </div>
            <button
              onClick={runDnsCheck}
              disabled={checkingDns}
              className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-xs font-mono font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${checkingDns ? 'animate-spin' : ''}`} />
              <span>{checkingDns ? 'Checking DNS...' : 'Check Live DNS'}</span>
            </button>
          </div>
          <p className="text-xs text-neutral-300 leading-relaxed">
            Google Cloud Run returns <em>&quot;404. That&apos;s an error. The requested URL / was not found&quot;</em> when a direct CNAME is used because Cloud Run only recognizes requests with its internal host header.
            <br />
            <strong className="text-amber-300">The foolproof solution:</strong> Configure <strong>GoDaddy Forwarding</strong> (below). GoDaddy immediately routes your domain visitors to your Cloud Run app with 0 errors!
          </p>

          {dnsResult && (
            <div className="p-3 rounded-xl bg-neutral-950/80 border border-neutral-800 font-mono text-[11px] space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-neutral-400">Detected Registrar:</span>
                <span className="text-amber-400 font-bold">{dnsResult.detectedRegistrar}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-400">Apex A Records:</span>
                <span className="text-neutral-200">{dnsResult.apexARecords?.join(', ') || 'Resolving...'}</span>
              </div>
              {dnsResult.httpForwardingActive ? (
                <div className="p-2.5 rounded-lg bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 flex items-center gap-2 font-sans font-bold text-xs mt-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>FORWARDING ACTIVE: cinead.cc is successfully connected and redirecting to your app!</span>
                </div>
              ) : dnsResult.isGodaddyParked ? (
                <div className="text-amber-400 flex items-center gap-1.5 pt-1 text-xs font-sans">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>Domain is currently on GoDaddy parking. Follow the 2 steps below in GoDaddy to activate forwarding!</span>
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-neutral-800 pb-2 flex-wrap">
          <button
            onClick={() => setActiveTab('godaddy')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold font-mono transition-colors ${
              activeTab === 'godaddy'
                ? 'bg-amber-500 text-neutral-950 shadow-md'
                : 'text-neutral-400 hover:text-white bg-neutral-800/50'
            }`}
          >
            GoDaddy Setup (Recommended)
          </button>
          <button
            onClick={() => setActiveTab('sync')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold font-mono transition-colors flex items-center gap-1.5 ${
              activeTab === 'sync'
                ? 'bg-emerald-500 text-neutral-950 shadow-md font-black'
                : 'text-emerald-400 hover:text-white bg-emerald-950/40 border border-emerald-500/30'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Live Sync: Web &amp; App</span>
          </button>
          <button
            onClick={() => setActiveTab('cloudflare')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold font-mono transition-colors ${
              activeTab === 'cloudflare'
                ? 'bg-amber-500 text-neutral-950 shadow-md'
                : 'text-neutral-400 hover:text-white bg-neutral-800/50'
            }`}
          >
            Cloudflare (Custom Host Proxy)
          </button>
          <button
            onClick={() => setActiveTab('records')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold font-mono transition-colors ${
              activeTab === 'records'
                ? 'bg-amber-500 text-neutral-950 shadow-md'
                : 'text-neutral-400 hover:text-white bg-neutral-800/50'
            }`}
          >
            DNS Records Reference
          </button>
        </div>

        {/* TAB 1: GODADDY FORWARDING */}
        {activeTab === 'godaddy' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-amber-500 text-neutral-950 text-xs font-black flex items-center justify-center">1</span>
                <span>Open GoDaddy DNS &amp; Forwarding Page</span>
              </h3>
              <p className="text-xs text-neutral-400">
                Go directly to your GoDaddy DNS settings for <strong>cinead.cc</strong>:
              </p>
              <a
                href="https://dcc.godaddy.com/manage/cinead.cc/dns"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs font-mono transition-colors shadow-lg shadow-amber-500/20"
              >
                <span>Open GoDaddy DNS Settings</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-amber-500 text-neutral-950 text-xs font-black flex items-center justify-center">2</span>
                <span>Configure Forwarding (Takes 30 Seconds)</span>
              </h3>
              <p className="text-xs text-neutral-400">
                On the GoDaddy DNS page, scroll down to the <strong>Forwarding</strong> section:
              </p>
              
              <div className="space-y-2 text-xs font-mono bg-neutral-900/90 p-3.5 rounded-xl border border-neutral-800">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-amber-400 font-bold">A. Domain Forwarding:</span>
                    <div className="text-neutral-300 mt-1">
                      Click <strong>Add Forwarding</strong> under <em>Domain</em>.
                    </div>
                    <div className="text-neutral-400 text-[11px] mt-0.5">
                      Destination URL:
                    </div>
                    <div className="text-emerald-400 break-all select-all mt-1 bg-black/60 p-2 rounded-lg border border-neutral-800">
                      {appDirectUrl}
                    </div>
                  </div>
                  <button
                    onClick={() => copyToClipboard(appDirectUrl, 'appUrl')}
                    className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[11px] flex items-center gap-1 shrink-0"
                  >
                    {copiedText === 'appUrl' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedText === 'appUrl' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <div className="text-[11px] text-neutral-400 pt-1">
                  Forward type: <strong>Permanent (301)</strong> • Forward settings: <strong>Forward only</strong>
                </div>
              </div>

              <div className="space-y-2 text-xs font-mono bg-neutral-900/90 p-3.5 rounded-xl border border-neutral-800">
                <div>
                  <span className="text-amber-400 font-bold">B. Subdomain Forwarding (for www):</span>
                  <div className="text-neutral-300 mt-1">
                    Under <em>Subdomain Forwarding</em>, click <strong>Add</strong>:
                  </div>
                  <div className="text-neutral-400 text-[11px] mt-0.5">
                    Subdomain: <code className="text-white bg-black/40 px-1.5 py-0.5 rounded">www</code> &rarr; forward to:
                  </div>
                  <div className="text-emerald-400 break-all select-all mt-1 bg-black/60 p-2 rounded-lg border border-neutral-800">
                    {appDirectUrl}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-600/30 text-emerald-300 text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Once saved, both <strong>cinead.cc</strong> and <strong>www.cinead.cc</strong> will redirect cleanly to your live app!</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB: REAL-TIME SYNC ARCHITECTURE */}
        {activeTab === 'sync' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span>Website &amp; Application Unified Architecture</span>
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  SYNCHRONIZED (100% SHARED STATE)
                </span>
              </div>
              <p className="text-xs text-neutral-300 leading-relaxed">
                Whether a user opens <strong>https://cinead.cc</strong> (custom domain website) or the direct cloud app URL, they experience the <strong>exact same features, design, and instant real-time data</strong>.
              </p>

              {/* Sync Diagram */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-neutral-900 to-neutral-950 border border-neutral-800 font-mono text-xs space-y-3">
                <div className="text-[11px] text-amber-400 font-bold uppercase tracking-wider">Zero-Latency State Flow</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-center">
                  <div className="p-3 rounded-lg bg-black/60 border border-neutral-800 space-y-1">
                    <div className="text-xs font-bold text-amber-300">Website</div>
                    <div className="text-[10px] text-neutral-400">cinead.cc</div>
                    <div className="text-[10px] text-emerald-400">Same UI &amp; Engine</div>
                  </div>
                  <div className="p-3 rounded-lg bg-neutral-900/90 border border-emerald-500/30 flex flex-col justify-center items-center">
                    <div className="text-[11px] font-bold text-emerald-300">⚡ Real-Time Sync Bus</div>
                    <div className="text-[10px] text-neutral-400">In-Memory + BroadcastChannel</div>
                    <div className="text-[9px] text-neutral-500">Google Drive DB Sync</div>
                  </div>
                  <div className="p-3 rounded-lg bg-black/60 border border-neutral-800 space-y-1">
                    <div className="text-xs font-bold text-cyan-300">Companion Mobile</div>
                    <div className="text-[10px] text-neutral-400">QR / PIN Screen Pairing</div>
                    <div className="text-[10px] text-emerald-400">Synchronized AD &amp; CC</div>
                  </div>
                </div>
              </div>

              {/* Feature Checklist */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 text-xs">
                <div className="p-3 rounded-xl bg-neutral-900/80 border border-neutral-800 space-y-1">
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Identical Visual Design</span>
                  </div>
                  <p className="text-[11px] text-neutral-400">
                    Cinema-grade dark theme, responsive navigation, and accessibility controls are 100% identical.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-neutral-900/80 border border-neutral-800 space-y-1">
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Real-Time Database Sync</span>
                  </div>
                  <p className="text-[11px] text-neutral-400">
                    User registrations, film submissions, and ₹15,000 CBFC fees reflect instantly across all clients.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-neutral-900/80 border border-neutral-800 space-y-1">
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Cross-Tab Instant Broadcast</span>
                  </div>
                  <p className="text-[11px] text-neutral-400">
                    Action in one tab/window immediately updates other tabs without manual page reload.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-neutral-900/80 border border-neutral-800 space-y-1">
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Theatrical Screening Sync</span>
                  </div>
                  <p className="text-[11px] text-neutral-400">
                    Auditorium screens and mobile companion headphones stay locked with millisecond acoustic sync.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-500/40 space-y-1 col-span-1 sm:col-span-2">
                  <div className="font-bold text-purple-300 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                    <span>Admin Panel Isolation: Available on Website Only</span>
                  </div>
                  <p className="text-[11px] text-neutral-300">
                    Per regulatory security guidelines, the <strong>Admin &amp; CBFC Compliance Panel</strong> is available <strong>only on the official website (cinead.cc)</strong>. It is strictly excluded and hidden in companion app clients.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CLOUDFLARE */}
        {activeTab === 'cloudflare' && (
          <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3 text-xs leading-relaxed">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Server className="w-4 h-4 text-amber-400" />
              <span>Cloudflare Zero-Downtime Proxying</span>
            </h3>
            <p className="text-neutral-300">
              If you want visitors to keep <strong>cinead.cc</strong> in the browser URL bar without any redirect:
            </p>
            <ol className="list-decimal list-inside space-y-2 text-neutral-400 font-mono">
              <li>Add <code>cinead.cc</code> to Cloudflare (Free plan).</li>
              <li>Change your GoDaddy nameservers to the two Cloudflare nameservers provided.</li>
              <li>
                In Cloudflare DNS, add CNAME:
                <div className="bg-black/60 p-2.5 rounded-lg border border-neutral-800 mt-1 text-neutral-200">
                  Name: <code>www</code> &nbsp;|&nbsp; Target: <code>ais-dev-w2c22yyo7draw2tdqvb3ax-279328455851.asia-southeast1.run.app</code> &nbsp;|&nbsp; Proxy: <strong>Proxied (Orange Cloud)</strong>
                </div>
              </li>
              <li>
                Under <strong>Rules &gt; Origin Rules</strong>, add a rule to set the Origin Host Header to <code>ais-dev-w2c22yyo7draw2tdqvb3ax-279328455851.asia-southeast1.run.app</code>.
              </li>
            </ol>
          </div>
        )}

        {/* TAB 3: RECORDS REFERENCE */}
        {activeTab === 'records' && (
          <div className="space-y-3 font-mono text-xs">
            <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-neutral-400">Record 1 (CNAME for www):</span>
                <button
                  onClick={() => copyToClipboard('ais-dev-w2c22yyo7draw2tdqvb3ax-279328455851.asia-southeast1.run.app', 'cnameVal')}
                  className="px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[10px] flex items-center gap-1"
                >
                  {copiedText === 'cnameVal' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedText === 'cnameVal' ? 'Copied' : 'Copy Value'}</span>
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] bg-neutral-900 p-2.5 rounded-lg border border-neutral-800">
                <div><span className="text-neutral-500 block">Type:</span>CNAME</div>
                <div><span className="text-neutral-500 block">Name:</span>www</div>
                <div className="col-span-2 sm:col-span-1"><span className="text-neutral-500 block">Value:</span><span className="text-amber-300 truncate block">ais-dev-w2c22yyo7draw2tdqvb3ax-279328455851.asia-southeast1.run.app</span></div>
                <div><span className="text-neutral-500 block">TTL:</span>1/2 Hour (Auto)</div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
              <span className="text-neutral-400">Record 2 (Google Cloud Anycast A):</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] bg-neutral-900 p-2.5 rounded-lg border border-neutral-800">
                <div><span className="text-neutral-500 block">Type:</span>A</div>
                <div><span className="text-neutral-500 block">Name:</span>@</div>
                <div className="col-span-2 sm:col-span-1"><span className="text-neutral-500 block">Value:</span><span className="text-emerald-400">216.239.32.21</span></div>
                <div><span className="text-neutral-500 block">TTL:</span>Auto</div>
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="pt-4 border-t border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-mono text-neutral-400">
            <span>Primary: <strong>{primaryDomain}</strong></span>
            <span>•</span>
            <span>Apex: <strong>{customDomain}</strong></span>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <a
              href={`https://${primaryDomain}`}
              target="_blank"
              rel="noreferrer"
              className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-colors border border-neutral-700"
            >
              <span>Test www.{customDomain}</span>
              <ExternalLink className="w-3.5 h-3.5 text-neutral-400" />
            </a>
            <button
              onClick={onClose}
              className="flex-1 sm:flex-none px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-mono font-black transition-colors shadow-lg shadow-amber-500/20"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
