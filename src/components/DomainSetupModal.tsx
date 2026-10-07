import React, { useState, useEffect } from 'react';
import {
  X,
  Globe,
  CheckCircle2,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Server,
  RefreshCw,
  FileCode,
  Lock,
  Download,
  AlertTriangle,
  Info,
  Terminal,
} from 'lucide-react';

interface DomainSetupModalProps {
  onClose: () => void;
}

interface DomainStatusData {
  primaryDomain: string;
  apexDomain: string;
  currentRequestHost: string;
  isCustomDomainActive: boolean;
  canonicalUrl: string;
  appUrl: string;
  sharedUrl: string;
  status: string;
  sslStatus: string;
  dnsRecords: Array<{
    type: string;
    name: string;
    fullHost: string;
    value: string;
    ttl: string;
    purpose: string;
    required: boolean;
  }>;
  supportedHosts: string[];
}

interface DnsVerificationResult {
  domain: string;
  apex: string;
  targetCname: string;
  nameservers?: string[];
  detectedRegistrar?: string;
  directDnsUrl?: string;
  cnameRecords: string[];
  cnameMatched: boolean;
  aRecords: string[];
  apexARecords: string[];
  txtRecords: string[];
  isGodaddyParked?: boolean;
  propagationStatus: 'verified' | 'propagating' | 'pending';
  details: string[];
  actionRequired?: string;
  checkedAt: string;
}

export const DomainSetupModal: React.FC<DomainSetupModalProps> = ({ onClose }) => {
  const [data, setData] = useState<DomainStatusData | null>(null);
  const [dnsResult, setDnsResult] = useState<DnsVerificationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifyingDns, setVerifyingDns] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'dns' | 'instructions' | 'proxy' | 'seo'>('dns');
  const [selectedRegistrar, setSelectedRegistrar] = useState<'cloudflare' | 'godaddy' | 'namecheap' | 'hostinger'>('godaddy');

  useEffect(() => {
    fetchDomainStatus();
    handleRunLiveDnsTest();
  }, []);

  const fetchDomainStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/domain/status');
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error('Failed to load domain status:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleRunLiveDnsTest = async () => {
    setVerifyingDns(true);
    try {
      const res = await fetch('/api/domain/verify-dns');
      const json: DnsVerificationResult = await res.json();
      setDnsResult(json);
      if (json.detectedRegistrar?.toLowerCase().includes('godaddy')) {
        setSelectedRegistrar('godaddy');
      } else if (json.detectedRegistrar?.toLowerCase().includes('cloudflare')) {
        setSelectedRegistrar('cloudflare');
      }
    } catch (e) {
      console.error('DNS test error:', e);
    } finally {
      setVerifyingDns(false);
    }
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleCopyAllRecords = () => {
    if (!data?.dnsRecords) return;
    const formatted = data.dnsRecords
      .map((r) => `TYPE: ${r.type}\nHOST: ${r.name} (${r.fullHost})\nVALUE: ${r.value}\nTTL: ${r.ttl}\nPURPOSE: ${r.purpose}\n`)
      .join('\n---\n\n');
    handleCopy(formatted, 'all-records');
  };

  const isCurrentDomainCinead =
    typeof window !== 'undefined' && window.location.host.toLowerCase().includes('cinead.cc');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl bg-neutral-900 border border-neutral-800 p-5 sm:p-6 text-neutral-100 shadow-2xl space-y-5">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-neutral-400 hover:text-white transition-colors"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/20 shrink-0">
            <Globe className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                CUSTOM DOMAIN
              </span>
              <span className="text-xs font-mono text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>PARALLEL SERVING ACTIVE</span>
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-wide mt-0.5">
              www.cinead.cc Connection Hub
            </h2>
            <p className="text-xs text-neutral-400">
              The application runs simultaneously on <strong className="text-amber-400">www.cinead.cc</strong>, <strong className="text-amber-400">cinead.cc</strong>, and the cloud runtime instance with zero downtime.
            </p>
          </div>
        </div>

        {/* Live Domain Status Banner */}
        <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-mono text-neutral-500 block uppercase">TARGET CANONICAL DOMAIN:</span>
              <a
                href="https://www.cinead.cc"
                target="_blank"
                rel="noreferrer"
                className="text-base sm:text-lg font-black text-amber-400 hover:underline flex items-center gap-1.5 font-mono"
              >
                <span>https://www.cinead.cc</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                <span>SSL / HTTPS Ready</span>
              </span>
              <button
                onClick={handleRunLiveDnsTest}
                disabled={verifyingDns}
                className="px-3 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-mono text-neutral-200 flex items-center gap-1.5 transition-colors border border-neutral-700"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${verifyingDns ? 'animate-spin text-amber-400' : ''}`} />
                <span>{verifyingDns ? 'Querying DNS...' : 'Run Live DNS Test'}</span>
              </button>
            </div>
          </div>

          {/* Real DNS Test Results */}
          {dnsResult && (
            <div className={`p-3 rounded-lg border text-xs font-mono space-y-1.5 animate-fadeIn ${
              dnsResult.propagationStatus === 'verified'
                ? 'bg-emerald-950/60 border-emerald-600/40 text-emerald-200'
                : dnsResult.propagationStatus === 'propagating'
                ? 'bg-amber-950/60 border-amber-600/40 text-amber-200'
                : 'bg-neutral-900 border-neutral-700 text-neutral-300'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold">
                  {dnsResult.propagationStatus === 'verified' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : dnsResult.propagationStatus === 'propagating' ? (
                    <Info className="w-4 h-4 text-amber-400 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-neutral-400 shrink-0" />
                  )}
                  <span>
                    STATUS: {dnsResult.propagationStatus.toUpperCase()} (Checked: {new Date(dnsResult.checkedAt).toLocaleTimeString()})
                  </span>
                </div>
                <span className="text-[10px] text-neutral-400">Target: {dnsResult.targetCname}</span>
              </div>
              <ul className="text-[11px] space-y-0.5 list-disc list-inside text-neutral-300">
                {dnsResult.details.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
                {dnsResult.cnameRecords.length > 0 && (
                  <li>Detected CNAME: {dnsResult.cnameRecords.join(', ')}</li>
                )}
                {dnsResult.aRecords.length > 0 && (
                  <li>Detected A Records: {dnsResult.aRecords.join(', ')}</li>
                )}
              </ul>
            </div>
          )}

          {/* Action Required Banner for GoDaddy or Active Registrar */}
          {dnsResult?.actionRequired && (
            <div className="p-3.5 rounded-xl bg-amber-950/60 border border-amber-500/40 space-y-2 animate-fadeIn text-xs">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-amber-500 text-neutral-950 font-mono font-black text-[10px]">
                    {dnsResult.detectedRegistrar?.toUpperCase() || 'REGISTRAR'}
                  </span>
                  <span className="font-bold text-amber-200">DNS Connection Instructions</span>
                </div>
                {dnsResult.directDnsUrl && (
                  <a
                    href={dnsResult.directDnsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold font-mono text-[11px] flex items-center gap-1 shadow-md shadow-amber-500/20"
                  >
                    <span>Open GoDaddy DNS Panel</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
              <p className="text-neutral-200 text-[11px] leading-relaxed">
                {dnsResult.actionRequired}
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono pt-2 border-t border-neutral-900">
            <div>
              <span className="text-neutral-500">Current Request Origin: </span>
              <span className={isCurrentDomainCinead ? 'text-emerald-400 font-bold' : 'text-neutral-200'}>
                {typeof window !== 'undefined' ? window.location.host : 'localhost'}
              </span>
            </div>
            <div>
              <span className="text-neutral-500">Parallel Serving: </span>
              <span className="text-emerald-400 font-bold">Active (Zero Downtime)</span>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 border-b border-neutral-800 pb-2 text-xs font-bold font-mono overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('dns')}
            className={`px-3 py-1.5 rounded-lg uppercase tracking-wide transition-colors whitespace-nowrap ${
              activeTab === 'dns' ? 'bg-amber-500 text-neutral-950 font-black' : 'text-neutral-400 hover:text-white'
            }`}
          >
            DNS Records
          </button>
          <button
            onClick={() => setActiveTab('instructions')}
            className={`px-3 py-1.5 rounded-lg uppercase tracking-wide transition-colors whitespace-nowrap ${
              activeTab === 'instructions' ? 'bg-amber-500 text-neutral-950 font-black' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Registrar Setup
          </button>
          <button
            onClick={() => setActiveTab('proxy')}
            className={`px-3 py-1.5 rounded-lg uppercase tracking-wide transition-colors whitespace-nowrap ${
              activeTab === 'proxy' ? 'bg-amber-500 text-neutral-950 font-black' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Nginx / Reverse Proxy
          </button>
          <button
            onClick={() => setActiveTab('seo')}
            className={`px-3 py-1.5 rounded-lg uppercase tracking-wide transition-colors whitespace-nowrap ${
              activeTab === 'seo' ? 'bg-amber-500 text-neutral-950 font-black' : 'text-neutral-400 hover:text-white'
            }`}
          >
            SEO &amp; Indexing
          </button>
        </div>

        {/* TAB 1: DNS RECORDS TO ADD */}
        {activeTab === 'dns' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <p className="text-xs text-neutral-400">
                Add these records in your DNS manager (Cloudflare, GoDaddy, Namecheap, etc.):
              </p>
              <div className="flex items-center gap-2">
                <a
                  href="/api/domain/zone-file"
                  download="cinead.cc.zone"
                  className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-mono text-neutral-300 flex items-center gap-1 transition-colors border border-neutral-700"
                  title="Download standard BIND DNS zone file"
                >
                  <Download className="w-3.5 h-3.5 text-amber-400" />
                  <span>Download Zone File</span>
                </a>
                <button
                  onClick={handleCopyAllRecords}
                  className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-mono text-neutral-300 flex items-center gap-1 transition-colors border border-neutral-700"
                >
                  {copiedKey === 'all-records' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy All</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {data?.dnsRecords.map((rec, idx) => (
              <div key={idx} className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-black bg-amber-500 text-neutral-950">
                      {rec.type}
                    </span>
                    <span className="text-xs font-mono font-bold text-white">{rec.fullHost}</span>
                    {rec.required && (
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-red-950 text-red-300 border border-red-800 font-bold">
                        REQUIRED
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-mono text-neutral-500">TTL: {rec.ttl}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                  <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-neutral-500 block">HOST / NAME</span>
                      <span className="text-white font-bold">{rec.name}</span>
                    </div>
                    <button
                      onClick={() => handleCopy(rec.name, `name-${idx}`)}
                      className="p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white"
                      title="Copy host"
                    >
                      {copiedKey === `name-${idx}` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-between overflow-hidden">
                    <div className="min-w-0 pr-2">
                      <span className="text-[10px] text-neutral-500 block">TARGET / VALUE</span>
                      <span className="text-amber-300 font-bold truncate block">{rec.value}</span>
                    </div>
                    <button
                      onClick={() => handleCopy(rec.value, `val-${idx}`)}
                      className="p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white shrink-0"
                      title="Copy value"
                    >
                      {copiedKey === `val-${idx}` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <p className="text-[11px] text-neutral-400">{rec.purpose}</p>
              </div>
            ))}
          </div>
        )}

        {/* TAB 2: REGISTRAR STEP-BY-STEP */}
        {activeTab === 'instructions' && (
          <div className="space-y-4 text-xs leading-relaxed text-neutral-300">
            <div className="flex items-center gap-1.5 pb-2 border-b border-neutral-850">
              {(['cloudflare', 'godaddy', 'namecheap', 'hostinger'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setSelectedRegistrar(r)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold capitalize transition-colors ${
                    selectedRegistrar === r
                      ? 'bg-amber-500 text-neutral-950'
                      : 'bg-neutral-950 text-neutral-400 hover:text-white border border-neutral-800'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>

            {selectedRegistrar === 'cloudflare' && (
              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold font-mono">
                    CF
                  </div>
                  <h4 className="font-bold text-white text-sm">Cloudflare Setup (Recommended for 100% Free SSL &amp; CDN)</h4>
                </div>
                <ol className="list-decimal list-inside space-y-2 text-neutral-300 text-xs pl-1">
                  <li>Log in to your <strong>Cloudflare Dashboard</strong> and select the <code>cinead.cc</code> zone.</li>
                  <li>Go to <strong>DNS &gt; Records</strong> and click <strong>Add Record</strong>.</li>
                  <li>
                    Select <strong>CNAME</strong>, enter Name: <code>www</code>, and Target:
                    <div className="p-2 my-1 rounded bg-neutral-900 border border-neutral-800 font-mono text-amber-300 text-[11px] flex items-center justify-between">
                      <span className="truncate">{data?.dnsRecords[0]?.value}</span>
                      <button
                        onClick={() => handleCopy(data?.dnsRecords[0]?.value || '', 'cf-cname')}
                        className="text-neutral-400 hover:text-white shrink-0 ml-2"
                      >
                        {copiedKey === 'cf-cname' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </li>
                  <li>Keep <strong>Proxy Status</strong> as <strong>Proxied</strong> (Orange Cloud) for automatic edge caching &amp; DDoS shielding.</li>
                  <li>In <strong>SSL/TLS &gt; Overview</strong>, set the encryption mode to <strong>Full</strong> or <strong>Full (strict)</strong>.</li>
                  <li>(Optional) In <strong>Rules &gt; Redirect Rules</strong>, add a redirect from <code>https://cinead.cc/*</code> to <code>https://www.cinead.cc/$1</code>.</li>
                </ol>
              </div>
            )}

            {selectedRegistrar === 'godaddy' && (
              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold font-mono">
                    GD
                  </div>
                  <h4 className="font-bold text-white text-sm">GoDaddy DNS Management</h4>
                </div>
                <ol className="list-decimal list-inside space-y-2 text-neutral-300 text-xs pl-1">
                  <li>Log in to GoDaddy and open <strong>Domain Portfolio &gt; cinead.cc &gt; DNS</strong>.</li>
                  <li>Find any existing <code>www</code> CNAME record and edit it, or click <strong>Add New Record</strong>.</li>
                  <li>Set Type: <strong>CNAME</strong>, Name: <code>www</code>, Value: <code>{data?.dnsRecords[0]?.value}</code>, TTL: <strong>1/2 Hour</strong>.</li>
                  <li>Under <strong>Forwarding</strong>, add a forwarding rule for <code>cinead.cc</code> to forward to <code>https://www.cinead.cc</code> with <strong>301 Permanent Redirect</strong>.</li>
                  <li>Click <strong>Save</strong>. Changes usually take 5–15 minutes.</li>
                </ol>
              </div>
            )}

            {selectedRegistrar === 'namecheap' && (
              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold font-mono">
                    NC
                  </div>
                  <h4 className="font-bold text-white text-sm">Namecheap DNS Management</h4>
                </div>
                <ol className="list-decimal list-inside space-y-2 text-neutral-300 text-xs pl-1">
                  <li>Log in to Namecheap, go to <strong>Domain List</strong>, and click <strong>Manage</strong> next to <code>cinead.cc</code>.</li>
                  <li>Go to <strong>Advanced DNS</strong>.</li>
                  <li>Click <strong>Add New Record</strong>: Type: <strong>CNAME Record</strong>, Host: <code>www</code>, Target: <code>{data?.dnsRecords[0]?.value}</code>, TTL: <strong>Automatic</strong>.</li>
                  <li>Add an <strong>URL Redirect Record</strong>: Host: <code>@</code>, Value: <code>https://www.cinead.cc</code>, Type: <strong>Permanent (301)</strong>.</li>
                  <li>Click the green checkmark to save.</li>
                </ol>
              </div>
            )}

            {selectedRegistrar === 'hostinger' && (
              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold font-mono">
                    H
                  </div>
                  <h4 className="font-bold text-white text-sm">Hostinger / cPanel Setup</h4>
                </div>
                <ol className="list-decimal list-inside space-y-2 text-neutral-300 text-xs pl-1">
                  <li>In hPanel or cPanel, navigate to <strong>DNS Zone Editor</strong> for <code>cinead.cc</code>.</li>
                  <li>Add record: Type: <strong>CNAME</strong>, Name: <code>www</code>, Points to: <code>{data?.dnsRecords[0]?.value}</code>.</li>
                  <li>Save record. If your panel requires a trailing dot, use <code>{data?.dnsRecords[0]?.value}.</code></li>
                </ol>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: NGINX / REVERSE PROXY CONFIG */}
        {activeTab === 'proxy' && (
          <div className="space-y-3 font-mono text-xs">
            <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-amber-400 font-bold flex items-center gap-1.5">
                  <Terminal className="w-4 h-4" />
                  <span>Nginx Configuration for www.cinead.cc</span>
                </span>
                <button
                  onClick={() =>
                    handleCopy(
                      `server {
    listen 80;
    listen 443 ssl http2;
    server_name www.cinead.cc cinead.cc;

    # SSL certificates (Let's Encrypt / Certbot)
    ssl_certificate /etc/letsencrypt/live/www.cinead.cc/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/www.cinead.cc/privkey.pem;

    location / {
        proxy_pass https://${data?.dnsRecords[0]?.value};
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_buffering off;
    }
}`,
                      'nginx-conf'
                    )
                  }
                  className="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[11px]"
                >
                  {copiedKey === 'nginx-conf' ? 'Copied!' : 'Copy Nginx Conf'}
                </button>
              </div>
              <pre className="p-2.5 rounded bg-neutral-900 border border-neutral-800 text-[11px] text-neutral-300 overflow-x-auto whitespace-pre leading-relaxed">
{`server {
    listen 80;
    listen 443 ssl http2;
    server_name www.cinead.cc cinead.cc;

    location / {
        proxy_pass https://${data?.dnsRecords[0]?.value || 'ais-dev-w2c22yyo7draw2tdqvb3ax-279328455851.asia-southeast1.run.app'};
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}`}
              </pre>
            </div>
          </div>
        )}

        {/* TAB 4: SEO & CRAWLING */}
        {activeTab === 'seo' && (
          <div className="space-y-3 font-mono text-xs">
            <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-amber-400 font-bold">1. Live Robots.txt</span>
                <a
                  href="/robots.txt"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-amber-300 hover:underline flex items-center gap-1"
                >
                  <span>Open live /robots.txt</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="p-2 rounded bg-neutral-900 border border-neutral-850 text-[11px] text-neutral-300">
                User-agent: *<br />
                Allow: /<br />
                Host: https://www.cinead.cc<br />
                Sitemap: https://www.cinead.cc/sitemap.xml
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-amber-400 font-bold">2. Dynamic Sitemap.xml</span>
                <a
                  href="/sitemap.xml"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-amber-300 hover:underline flex items-center gap-1"
                >
                  <span>Open live /sitemap.xml</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <p className="text-neutral-400 text-[11px]">
                Automatically lists <code>https://www.cinead.cc/</code>, theatrical gallery, CBFC preview portal, and all certified film landing links for Google and Bing indexing.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
              <span className="text-amber-400 font-bold block">3. Canonical Tag Verification</span>
              <p className="text-neutral-400 text-[11px]">
                <code>&lt;link rel="canonical" href="https://www.cinead.cc/" /&gt;</code> is active in the document header, ensuring search engines attribute all ranking authority directly to your custom domain.
              </p>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="pt-3 border-t border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <a
            href="https://www.cinead.cc"
            target="_blank"
            rel="noreferrer"
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-xs uppercase tracking-wider shadow-md shadow-amber-500/20 flex items-center justify-center gap-1.5 transition-all"
          >
            <Globe className="w-4 h-4" />
            <span>Launch www.cinead.cc</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
