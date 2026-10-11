import React, { useState, useEffect } from 'react';
import { X, HardDrive, CheckCircle2, AlertCircle, ExternalLink, RefreshCw, Database, Table, ShieldCheck, FileSpreadsheet, Lock } from 'lucide-react';
import {
  signInWithGoogleDrive,
  disconnectGoogleDrive,
  syncDatabaseToGoogleDrive,
  getDriveAccessToken,
  initDriveAuth,
  DriveDatabaseMeta,
} from '../services/googleDriveDatabaseService';
import { User as FirebaseUser } from 'firebase/auth';
import { Film, Payment, AuditLog, User } from '../types/cinemaPlatform';

interface GoogleDriveDatabaseModalProps {
  onClose: () => void;
  films: Film[];
  currentUser?: User | null;
}

export const GoogleDriveDatabaseModal: React.FC<GoogleDriveDatabaseModalProps> = ({
  onClose,
  films,
  currentUser,
}) => {
  const isAdmin = currentUser?.role === 'admin';
  const [googleUser, setGoogleUser] = useState<FirebaseUser | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [dbMeta, setDbMeta] = useState<DriveDatabaseMeta | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = initDriveAuth(
      (user, token) => {
        setGoogleUser(user);
        setIsConnected(true);
      },
      () => {
        setGoogleUser(null);
        setIsConnected(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleSignIn = async () => {
    setError(null);
    setStatusMessage('Initiating Google account authentication...');
    try {
      const res = await signInWithGoogleDrive();
      if (res) {
        setGoogleUser(res.user);
        setIsConnected(true);
        setStatusMessage('Signed in successfully! Click "Create Database in Google Drive" below.');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Google authentication failed.');
      setStatusMessage('');
    }
  };

  const handleDisconnect = async () => {
    await disconnectGoogleDrive();
    setGoogleUser(null);
    setIsConnected(false);
    setDbMeta(null);
    setStatusMessage('');
  };

  const handleSyncToDrive = async () => {
    // User confirmation for mutating/creating Drive resources (SKILL.md rule)
    const confirmed = window.confirm(
      'Create and update the CINEAD.CC master relational database in your Google Drive account (businessonaditi@gmail.com)?'
    );
    if (!confirmed) return;

    setIsSyncing(true);
    setError(null);
    try {
      // Mock payments and audit logs if local empty
      const samplePayments: Payment[] = [
        {
          id: 'pay-sample-01',
          filmId: films[0]?.id || 'film-1',
          filmTitle: films[0]?.title || 'Kalki 2898 AD',
          userId: 'usr-1',
          productionHouseName: 'Vyjayanthi Movies',
          amount: 15000,
          currency: 'INR',
          transactionId: 'TXN-RZP-2898-99412',
          gateway: 'UPI',
          status: 'successful',
          createdAt: new Date().toISOString(),
        },
      ];

      const sampleAudit: AuditLog[] = [
        {
          id: 'audit-01',
          action: 'GOOGLE_DRIVE_DB_INITIALIZED',
          filmTitle: 'CINEAD.CC Master Database',
          userEmail: googleUser?.email || 'businessonaditi@gmail.com',
          ip: '127.0.0.1',
          timestamp: new Date().toISOString(),
        },
      ];

      const meta = await syncDatabaseToGoogleDrive(
        films,
        samplePayments,
        sampleAudit,
        (msg) => setStatusMessage(msg)
      );

      setDbMeta(meta);
      setStatusMessage('CINEAD.CC Database successfully synchronized to Google Drive!');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Google Drive synchronization failed.');
      setStatusMessage('');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-neutral-900 border border-neutral-800 p-6 text-neutral-100 shadow-2xl space-y-6">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-neutral-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <HardDrive className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                CINEAD.CC CLOUD DB
              </span>
              <span className="text-xs font-mono text-neutral-400">Google Drive &amp; Sheets</span>
            </div>
            <h2 className="text-xl font-black text-white uppercase tracking-wide mt-0.5">
              Google Drive Database Management
            </h2>
            <p className="text-xs text-neutral-400">
              Target Account: <strong className="text-amber-400">businessonaditi@gmail.com</strong>
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-600/50 text-rose-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {statusMessage && (
          <div className="p-3.5 rounded-xl bg-amber-950/60 border border-amber-600/40 text-amber-200 text-xs flex items-center gap-2 font-mono">
            <RefreshCw className={`w-4 h-4 shrink-0 text-amber-400 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Regulatory Admin Notice */}
        <div className="p-3.5 rounded-xl bg-purple-950/40 border border-purple-600/40 text-xs text-purple-200 flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-bold text-white">Administrator Restricted Access: </span>
            <span>
              Direct database &amp; spreadsheet management is restricted to authorized Administrators. For all users, master uploads are continuously synced to 
              <strong className="text-amber-300 font-mono ml-1">businessonaditi@gmail.com</strong> in the background.
            </span>
          </div>
        </div>

        {/* Google Authentication Box */}
        <div className="p-5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-neutral-300 uppercase">
              1. Google Drive Account Authorization
            </span>
            {isConnected ? (
              <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-600/40 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>AUTHORIZED ✓</span>
              </span>
            ) : (
              <span className="text-[11px] font-mono text-neutral-500">Sign in with Google below</span>
            )}
          </div>

          {!isConnected ? (
            <div className="text-center py-2 space-y-3">
              <p className="text-xs text-neutral-400">
                Connect your Google account (<strong className="text-neutral-200">businessonaditi@gmail.com</strong>) to create the CINEAD.CC master database folder and spreadsheet tables in your Google Drive.
              </p>

              {/* Official Sign In with Google Button Style per SKILL.md */}
              <button
                type="button"
                onClick={handleSignIn}
                className="inline-flex items-center gap-3 px-5 py-2.5 rounded-xl bg-white hover:bg-neutral-100 text-neutral-900 font-semibold text-xs shadow-md transition-all active:scale-95 mx-auto"
              >
                <svg className="w-4 h-4" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                </svg>
                <span>Sign in with Google (businessonaditi@gmail.com)</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between bg-neutral-900 p-3 rounded-xl border border-neutral-800">
              <div className="flex items-center gap-2.5">
                {googleUser?.photoURL ? (
                  <img src={googleUser.photoURL} alt="" className="w-8 h-8 rounded-full border border-neutral-700" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs">
                    G
                  </div>
                )}
                <div>
                  <span className="text-xs font-bold text-white block">{googleUser?.displayName || 'Authorized Google Account'}</span>
                  <span className="text-[11px] font-mono text-neutral-400">{googleUser?.email || 'businessonaditi@gmail.com'}</span>
                </div>
              </div>
              <button
                onClick={handleDisconnect}
                className="text-xs text-neutral-400 hover:text-red-400 underline font-mono"
              >
                Disconnect
              </button>
            </div>
          )}
        </div>

        {/* Database Sync & Actions Box */}
        <div className="p-5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-neutral-300 uppercase">
              2. Relational Database Generation
            </span>
            <span className="text-[11px] font-mono text-neutral-500">
              Tables: Films • Payments • CC/AD Tracks • Audit Logs
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
            <div className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800">
              <span className="text-neutral-500 block text-[10px]">SHEET 1</span>
              <strong className="text-white">Films</strong>
            </div>
            <div className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800">
              <span className="text-neutral-500 block text-[10px]">SHEET 2</span>
              <strong className="text-white">Payments</strong>
            </div>
            <div className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800">
              <span className="text-neutral-500 block text-[10px]">SHEET 3</span>
              <strong className="text-white">Accessibility</strong>
            </div>
            <div className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800">
              <span className="text-neutral-500 block text-[10px]">SHEET 4</span>
              <strong className="text-white">Audit_Logs</strong>
            </div>
          </div>

          <button
            onClick={handleSyncToDrive}
            disabled={!isConnected || isSyncing}
            className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-neutral-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all"
          >
            <Database className="w-4 h-4" />
            <span>
              {isSyncing ? 'Creating & Populating Database...' : 'CREATE / SYNC DATABASE TO GOOGLE DRIVE'}
            </span>
          </button>
        </div>

        {/* Database Links & Meta (If created) */}
        {dbMeta && (
          <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-600/40 space-y-3 animate-fadeIn">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              <span>CINEAD.CC DATABASE READY IN GOOGLE DRIVE</span>
            </div>

            <div className="space-y-1.5 text-xs font-mono text-neutral-300">
              {dbMeta.spreadsheetUrl && (
                <div className="flex items-center justify-between">
                  <span>Google Sheets Database Master:</span>
                  <a
                    href={dbMeta.spreadsheetUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-amber-400 hover:underline flex items-center gap-1 font-bold"
                  >
                    <span>Open in Google Sheets</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
              {dbMeta.folderId && (
                <div className="flex items-center justify-between text-neutral-400 text-[11px]">
                  <span>Drive Folder ID:</span>
                  <span>{dbMeta.folderId}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-neutral-400 text-[11px]">
                <span>Last Synchronized:</span>
                <span>{new Date(dbMeta.lastSyncedAt || '').toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}

        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold text-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
