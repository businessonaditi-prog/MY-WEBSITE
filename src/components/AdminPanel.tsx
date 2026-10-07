import React, { useState, useEffect } from 'react';
import { Shield, Film, Users, CreditCard, KeyRound, Activity, AlertTriangle, CheckCircle2, RefreshCw, XCircle, Lock, ArrowRight, Globe, ExternalLink } from 'lucide-react';
import { api } from '../services/apiClient';
import { User, Film as FilmType, Payment, PreviewCodeRecord, AuditLog } from '../types/cinemaPlatform';

interface AdminPanelProps {
  currentUser?: User | null;
  onLoginAsAdmin?: () => void;
  onOpenAuth?: () => void;
  onOpenDomainSetup?: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  currentUser,
  onLoginAsAdmin,
  onOpenAuth,
  onOpenDomainSetup,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'films' | 'users' | 'payments' | 'codes' | 'audit' | 'domain'>('overview');
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState<{
    totalUsers: number;
    totalFilms: number;
    totalPayments: number;
    totalPreviewCodes: number;
    activeSessions: number;
    users: User[];
    films: FilmType[];
    payments: Payment[];
  } | null>(null);

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    fetchAdminData();
  }, [currentUser]);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const overviewRes = await api.getAdminOverview();
      setStats(overviewRes);

      const logsRes = await api.getAdminAuditLogs();
      setAuditLogs(logsRes.logs);
    } catch (e) {
      console.error('Error loading admin data:', e);
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSuspendFilm = async (filmId: string, currentStatus: string) => {
    try {
      await api.suspendFilm(filmId, currentStatus !== 'suspended');
      fetchAdminData();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Action failed');
    }
  };

  const handleRevokeCode = async (code: string) => {
    if (!confirm(`Are you sure you want to revoke preview code ${code}?`)) return;
    try {
      await api.revokeCode(code);
      fetchAdminData();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Revoke failed');
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-purple-400 px-2.5 py-0.5 rounded bg-purple-950/80 border border-purple-600/40 mb-2">
            <Shield className="w-3.5 h-3.5" />
            <span>CENTRAL REGULATORY OVERSIGHT &amp; AUDIT</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-wide uppercase">
            ADMINISTRATION &amp; COMPLIANCE PANEL
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 mt-1">
            Manage production houses, examine preview logs, audit transactions, and enforce statutory standards.
          </p>
        </div>

        <button
          onClick={fetchAdminData}
          className="p-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 transition-colors self-start sm:self-auto"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Sub-Navigation (Wrapping cleanly without left-right scroll) */}
      <div className="flex flex-wrap items-center gap-1.5 pb-2 border-b border-neutral-800 text-xs font-semibold w-full">
        {(['overview', 'films', 'users', 'payments', 'codes', 'audit', 'domain'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveSubTab(tab)}
            className={`px-3 py-1.5 rounded-lg uppercase tracking-wider transition-colors text-xs ${
              activeSubTab === tab
                ? 'bg-purple-600 text-white font-bold shadow-md'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900 border border-neutral-800/60'
            }`}
          >
            {tab === 'domain' ? 'Domain (cinead.cc)' : tab}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-20 text-center font-mono text-xs text-neutral-500">
          Loading administration metrics...
        </div>
      ) : !stats ? (
        <div className="max-w-xl mx-auto py-12 px-6 rounded-3xl bg-neutral-900 border border-neutral-800 text-center space-y-5 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-purple-500/15 border border-purple-500/40 flex items-center justify-center text-purple-400 mx-auto shadow-xl">
            <Lock className="w-8 h-8" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-950/80 border border-purple-600/40 text-purple-300 text-xs font-mono font-bold">
            <Shield className="w-3.5 h-3.5" />
            <span>CENTRAL REGULATORY ACCESS</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-white uppercase tracking-wide">
            ADMINISTRATOR PRIVILEGES REQUIRED
          </h3>
          <p className="text-xs sm:text-sm text-neutral-400 max-w-md mx-auto leading-relaxed">
            Statutory administration and compliance oversight requires an authorized Administrator account.
          </p>
          <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 text-left space-y-1 font-mono text-xs">
            <div className="text-neutral-500 text-[10px]">AUTHORIZED CREDENTIALS:</div>
            <div className="text-neutral-200">Email: <span className="text-purple-300">admin@cbfc-accessibility.gov.in</span></div>
            <div className="text-neutral-200">6-Digit Code: <span className="text-purple-300">123456</span></div>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            {onLoginAsAdmin && (
              <button
                type="button"
                onClick={onLoginAsAdmin}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase tracking-wider transition-colors shadow-lg shadow-purple-600/30"
              >
                Sign In as Admin
              </button>
            )}
            {onOpenAuth && (
              <button
                type="button"
                onClick={onOpenAuth}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold text-xs uppercase tracking-wider transition-colors"
              >
                Enter Credentials
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* SUB-TAB: OVERVIEW */}
          {activeSubTab === 'overview' && stats && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800">
                  <span className="text-[11px] font-mono text-neutral-500 block mb-1">TOTAL FILMS</span>
                  <div className="text-2xl font-black text-white">{stats.totalFilms}</div>
                  <span className="text-[10px] text-emerald-400 font-mono mt-1 block">✓ All certified tracks valid</span>
                </div>
                <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800">
                  <span className="text-[11px] font-mono text-neutral-500 block mb-1">REGISTERED ENTITIES</span>
                  <div className="text-2xl font-black text-white">{stats.totalUsers}</div>
                  <span className="text-[10px] text-neutral-400 font-mono mt-1 block">Houses &amp; DCP Studios</span>
                </div>
                <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800">
                  <span className="text-[11px] font-mono text-neutral-500 block mb-1">SETTLED PAYMENTS</span>
                  <div className="text-2xl font-black text-emerald-400">{stats.totalPayments}</div>
                  <span className="text-[10px] text-neutral-400 font-mono mt-1 block">Min ₹15,000 Verified</span>
                </div>
                <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800">
                  <span className="text-[11px] font-mono text-neutral-500 block mb-1">ACTIVE PREVIEW CODES</span>
                  <div className="text-2xl font-black text-amber-400">{stats.totalPreviewCodes}</div>
                  <span className="text-[10px] text-neutral-400 font-mono mt-1 block">9-Digit Encrypted</span>
                </div>
              </div>

              {/* Recent Audit Stream Snippet */}
              <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-3">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                  Live Audit Trail Stream
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto font-mono text-xs">
                  {auditLogs.slice(0, 8).map((log) => (
                    <div
                      key={log.id}
                      className="p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 flex items-center justify-between text-neutral-300"
                    >
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded bg-neutral-800 text-purple-300 text-[10px] font-bold">
                          {log.action}
                        </span>
                        <span>{log.filmTitle || log.userEmail || 'System'}</span>
                      </div>
                      <span className="text-neutral-500 text-[11px]">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* SUB-TAB: FILMS */}
          {activeSubTab === 'films' && stats && (
            <div className="p-4 sm:p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4 w-full">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Submitted Films &amp; DCP Packages
              </h3>

              {/* Mobile Cards View (sm:hidden - fits 100% width, no left-right scroll) */}
              <div className="block sm:hidden space-y-3">
                {stats.films.map((f) => (
                  <div key={f.id} className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">{f.title}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-800 text-amber-300">
                        {f.languageName}
                      </span>
                    </div>
                    <div className="text-neutral-400 text-[11px]">
                      Entity: <span className="text-neutral-300">{f.productionHouseName}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] pt-1 border-t border-neutral-850">
                      <div>
                        Payment: <span className={f.paymentStatus === 'successful' ? 'text-emerald-400 font-bold' : 'text-rose-400'}>{f.paymentStatus}</span>
                      </div>
                      <div>
                        Status: <span className={f.previewStatus === 'available' ? 'text-emerald-400 font-bold' : 'text-amber-400'}>{f.previewStatus}</span>
                      </div>
                    </div>
                    <div className="pt-1">
                      <button
                        onClick={() => handleToggleSuspendFilm(f.id, f.previewStatus)}
                        className={`w-full py-1.5 rounded text-xs font-bold ${
                          f.previewStatus === 'suspended'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-600'
                            : 'bg-rose-950 text-rose-300 border border-rose-600'
                        }`}
                      >
                        {f.previewStatus === 'suspended' ? 'Restore Film' : 'Suspend Film'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Tablet & Desktop Table View */}
              <div className="hidden sm:block w-full">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-neutral-800 text-neutral-500">
                      <th className="pb-2">TITLE</th>
                      <th className="pb-2">PRODUCTION HOUSE</th>
                      <th className="pb-2">LANG</th>
                      <th className="pb-2">PAYMENT</th>
                      <th className="pb-2">STATUS</th>
                      <th className="pb-2 text-right">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/80">
                    {stats.films.map((f) => (
                      <tr key={f.id} className="text-neutral-300">
                        <td className="py-2.5 font-bold text-white">{f.title}</td>
                        <td className="py-2.5">{f.productionHouseName}</td>
                        <td className="py-2.5">{f.languageName}</td>
                        <td className="py-2.5">
                          <span className={f.paymentStatus === 'successful' ? 'text-emerald-400' : 'text-rose-400'}>
                            {f.paymentStatus}
                          </span>
                        </td>
                        <td className="py-2.5">
                          <span className={f.previewStatus === 'available' ? 'text-emerald-400' : 'text-amber-400'}>
                            {f.previewStatus}
                          </span>
                        </td>
                        <td className="py-2.5 text-right">
                          <button
                            onClick={() => handleToggleSuspendFilm(f.id, f.previewStatus)}
                            className={`px-2.5 py-1 rounded text-[11px] font-bold ${
                              f.previewStatus === 'suspended'
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-600'
                                : 'bg-rose-950 text-rose-300 border border-rose-600'
                            }`}
                          >
                            {f.previewStatus === 'suspended' ? 'Restore' : 'Suspend'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SUB-TAB: AUDIT LOGS (Section #58) */}
          {activeSubTab === 'audit' && (
            <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                  Complete Immutable Audit Log
                </h3>
                <span className="text-xs font-mono text-neutral-400">Total Entries: {auditLogs.length}</span>
              </div>

              <div className="space-y-2 font-mono text-xs">
                {auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-xl bg-neutral-950 border border-neutral-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-700/50 text-[10px] font-bold">
                          {log.action}
                        </span>
                        <span className="text-white font-semibold">
                          {log.filmTitle || log.userEmail || 'System Event'}
                        </span>
                      </div>
                      {log.metadata && (
                        <p className="text-[11px] text-neutral-400 mt-1">
                          {JSON.stringify(log.metadata)}
                        </p>
                      )}
                    </div>
                    <span className="text-neutral-500 text-[10px] shrink-0">
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SUB-TAB: PAYMENTS */}
          {activeSubTab === 'payments' && stats && (
            <div className="p-4 sm:p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4 w-full">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Statutory Submission Payments (Minimum ₹15,000 Enforced)
              </h3>

              {/* Mobile Cards View (sm:hidden - fits 100% width, no left-right scroll) */}
              <div className="block sm:hidden space-y-3">
                {stats.payments.map((p) => (
                  <div key={p.id} className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2 text-xs font-mono">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-amber-400">{p.transactionId}</span>
                      <span className="font-bold text-emerald-400">₹{p.amount.toLocaleString()}</span>
                    </div>
                    <div className="text-white font-bold">{p.filmTitle}</div>
                    <div className="text-neutral-400 text-[11px] flex items-center justify-between">
                      <span>{p.productionHouseName}</span>
                      <span>{p.gateway}</span>
                    </div>
                    <div className="text-neutral-500 text-[10px] pt-1 border-t border-neutral-850">
                      Date: {new Date(p.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>

              {/* Tablet & Desktop Table View */}
              <div className="hidden sm:block w-full">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-neutral-800 text-neutral-500">
                      <th className="pb-2">TXN ID</th>
                      <th className="pb-2">FILM</th>
                      <th className="pb-2">ENTITY</th>
                      <th className="pb-2">AMOUNT</th>
                      <th className="pb-2">GATEWAY</th>
                      <th className="pb-2">DATE</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/80">
                    {stats.payments.map((p) => (
                      <tr key={p.id} className="text-neutral-300">
                        <td className="py-2.5 font-bold text-amber-400">{p.transactionId}</td>
                        <td className="py-2.5 text-white">{p.filmTitle}</td>
                        <td className="py-2.5">{p.productionHouseName}</td>
                        <td className="py-2.5 font-bold text-emerald-400">₹{p.amount.toLocaleString()}</td>
                        <td className="py-2.5">{p.gateway}</td>
                        <td className="py-2.5 text-neutral-500">{new Date(p.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SUB-TAB: CODES */}
          {activeSubTab === 'codes' && (
            <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Preview Code Registry (9-Digit Cryptographic Keys)
              </h3>
              <div className="space-y-2 font-mono text-xs">
                {auditLogs
                  .filter((l) => l.action === 'PREVIEW_CODE_GENERATED' || l.action === 'PREVIEW_ACCESS_GRANTED')
                  .map((log) => (
                    <div
                      key={log.id}
                      className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between"
                    >
                      <div>
                        <span className="text-amber-400 font-bold block">{log.filmTitle}</span>
                        <span className="text-neutral-400 text-[11px]">{log.action}</span>
                      </div>
                      <span className="text-neutral-500 text-[10px]">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* SUB-TAB: USERS */}
          {activeSubTab === 'users' && stats && (
            <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Registered Entities &amp; Official Accounts
              </h3>
              <div className="space-y-2 font-mono text-xs">
                {stats.users.map((u) => (
                  <div
                    key={u.id}
                    className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-bold">{u.productionHouseName}</span>
                        <span className="px-1.5 py-0.5 rounded bg-neutral-800 text-[10px] text-amber-300">
                          {u.role.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-[11px] text-neutral-400 mt-0.5">
                        {u.email} • {u.mobile}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-[10px]">
                      <span className={u.emailVerified ? 'text-emerald-400' : 'text-neutral-600'}>Email ✓</span>
                      <span className={u.mobileVerified ? 'text-emerald-400' : 'text-neutral-600'}>Mobile ✓</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SUB-TAB: DOMAIN MANAGEMENT */}
          {activeSubTab === 'domain' && (
            <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-5">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Globe className="w-4 h-4 text-amber-400" />
                    <span>www.cinead.cc Production Domain Management</span>
                  </h3>
                  <p className="text-xs text-neutral-400 mt-1">
                    Manage DNS records, parallel serving certificates, and statutory search indexing for <strong>www.cinead.cc</strong>.
                  </p>
                </div>
                {onOpenDomainSetup && (
                  <button
                    onClick={onOpenDomainSetup}
                    className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-xs uppercase tracking-wide flex items-center gap-1.5 shadow-md shadow-amber-500/20"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>Open DNS Setup Hub</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
                  <div className="text-[10px] font-mono text-neutral-500 uppercase">Target Domain</div>
                  <div className="text-base font-black text-white font-mono flex items-center gap-1.5">
                    <span>www.cinead.cc</span>
                    <a
                      href="https://www.cinead.cc"
                      target="_blank"
                      rel="noreferrer"
                      className="text-amber-400 hover:underline"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                  <div className="text-[11px] text-emerald-400 font-mono flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>SSL / TLS 1.3 Ready</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
                  <div className="text-[10px] font-mono text-neutral-500 uppercase">Apex Domain Forwarding</div>
                  <div className="text-base font-black text-white font-mono flex items-center gap-1.5">
                    <span>cinead.cc</span>
                  </div>
                  <div className="text-[11px] text-neutral-400 font-mono">
                    Permanent 301 Redirect to www
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
                  <div className="text-[10px] font-mono text-neutral-500 uppercase">Parallel Serving Mode</div>
                  <div className="text-base font-black text-emerald-400 font-mono">
                    Zero Downtime
                  </div>
                  <div className="text-[11px] text-neutral-400 font-mono">
                    Cloud Run + Custom Domain Sync
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3 font-mono text-xs">
                <div className="text-xs font-bold text-amber-300 uppercase">Primary DNS Entry</div>
                <div className="p-3 rounded-lg bg-neutral-900 border border-neutral-800 text-[11px] space-y-1">
                  <div><strong className="text-neutral-400">Record Type:</strong> CNAME</div>
                  <div><strong className="text-neutral-400">Host / Name:</strong> www</div>
                  <div><strong className="text-neutral-400">Points To:</strong> <span className="text-amber-300">ais-dev-w2c22yyo7draw2tdqvb3ax-279328455851.asia-southeast1.run.app</span></div>
                  <div><strong className="text-neutral-400">TTL:</strong> 300 (or Automatic)</div>
                </div>
                <div className="flex items-center gap-3 pt-1 text-[11px]">
                  <a
                    href="/robots.txt"
                    target="_blank"
                    rel="noreferrer"
                    className="text-amber-400 hover:underline flex items-center gap-1"
                  >
                    <span>/robots.txt</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <a
                    href="/sitemap.xml"
                    target="_blank"
                    rel="noreferrer"
                    className="text-amber-400 hover:underline flex items-center gap-1"
                  >
                    <span>/sitemap.xml</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <a
                    href="/api/domain/zone-file"
                    download="cinead.cc.zone"
                    className="text-emerald-400 hover:underline flex items-center gap-1"
                  >
                    <span>Download Zone File</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
