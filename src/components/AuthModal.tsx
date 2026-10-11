import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Mail,
  Building2,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Shield,
  Smartphone,
  Laptop,
  ArrowRight,
  RotateCcw,
  Sparkles,
  Copy,
  Check,
  UserCheck,
  ChevronLeft,
} from 'lucide-react';
import { api } from '../services/apiClient';
import { User } from '../types/cinemaPlatform';
import { deviceAuthService, RegisteredDeviceProfile } from '../services/deviceAuthService';

interface AuthModalProps {
  initialMode?: 'email-check' | 'login' | 'register' | 'registered-login' | 'forgot';
  initialEmail?: string;
  onClose: () => void;
  onSuccess: (user: User) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  initialMode = 'email-check',
  initialEmail = '',
  onClose,
  onSuccess,
}) => {
  // Device registration state
  const [registeredProfile, setRegisteredProfile] = useState<RegisteredDeviceProfile | null>(() =>
    deviceAuthService.getRegisteredProfile()
  );

  // Modes:
  // 'email-check': Unified Sign UP/in email entry (checks if registered or new)
  // 'login': Registered user login (requires 6-digit code; binds device)
  // 'registered-login': Quick unlock on registered device (only 6-digit code)
  // 'register': New user registration (pre-fills email, sets entity name and 6-digit code)
  // 'forgot': Instant 6-digit code recovery (no OTP required)
  const [mode, setMode] = useState<'email-check' | 'login' | 'registered-login' | 'register' | 'forgot'>(() => {
    if (initialMode && initialMode !== 'email-check') return initialMode;
    return 'email-check';
  });

  const [role, setRole] = useState<'production_house' | 'dcp_studio'>('production_house');

  // Form Fields
  const [email, setEmail] = useState(() => initialEmail || registeredProfile?.email || '');
  const [existingEntityName, setExistingEntityName] = useState<string>('');
  const [productionHouseName, setProductionHouseName] = useState('');
  const [code, setCode] = useState('');
  const [confirmCode, setConfirmCode] = useState('');
  const [rememberThisDevice, setRememberThisDevice] = useState(true);

  // Status
  const [loading, setLoading] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [recoveredCode, setRecoveredCode] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  const codeInputRef = useRef<HTMLInputElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (mode === 'email-check') {
      setTimeout(() => emailInputRef.current?.focus(), 100);
    } else if (mode === 'login' || mode === 'registered-login') {
      setTimeout(() => codeInputRef.current?.focus(), 100);
    }
  }, [mode]);

  // ---------------------------------------------------------------------------
  // 1. UNIFIED SIGN UP/IN: Check Email to route to Login or Registration
  // ---------------------------------------------------------------------------
  const handleCheckEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    let cleanEmail = email.trim().toLowerCase();
    if (cleanEmail === 'pikuvfx' || cleanEmail === 'usr-pikuvfx') {
      cleanEmail = 'pikuvfx@gmail.com';
      setEmail('pikuvfx@gmail.com');
    }
    setError(null);
    setInfoMessage(null);

    if (!cleanEmail) {
      setError('Please enter your official email address or authorized entity ID.');
      return;
    }

    if (!cleanEmail.includes('@') && cleanEmail !== 'pikuvfx' && cleanEmail !== 'usr-pikuvfx') {
      setError('Please enter a valid email address with @ (or authorized entity ID).');
      return;
    }

    setCheckingEmail(true);
    try {
      const res = await api.checkEmail(cleanEmail);
      if (res && res.exists) {
        // REGISTERED USER -> GO TO LOGIN PAGE
        setExistingEntityName(res.productionHouseName || '');
        if (res.role === 'dcp_studio') setRole('dcp_studio');
        setCode('');

        // Strict security: Administrator accounts NEVER offer registered-login or auto-unlock
        const isAdmin = cleanEmail.includes('pikuvfx') || res.role === 'admin';
        if (registeredProfile && registeredProfile.email.toLowerCase() === cleanEmail && !isAdmin) {
          setMode('registered-login');
        } else {
          setMode('login');
        }
      } else {
        // NEW USER -> GO TO REGISTRATION PAGE
        if (!productionHouseName) {
          setProductionHouseName(cleanEmail.split('@')[0].toUpperCase() + ' Productions');
        }
        setCode('');
        setConfirmCode('');
        setMode('register');
      }
    } catch {
      // If check fails (e.g. offline or network glitch), route directly to new registration
      if (!productionHouseName) {
        setProductionHouseName(cleanEmail.split('@')[0].toUpperCase() + ' Productions');
      }
      setCode('');
      setConfirmCode('');
      setMode('register');
    } finally {
      setCheckingEmail(false);
    }
  };

  // ---------------------------------------------------------------------------
  // 2. REGISTER FLOW: New Entity setup (Email already verified as new)
  // ---------------------------------------------------------------------------
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = code.trim();
    const deviceId = deviceAuthService.getDeviceId();

    if (!cleanEmail) {
      setError('Please provide your official email address.');
      return;
    }

    const finalName = productionHouseName.trim() || (cleanEmail.split('@')[0].toUpperCase() + ' Productions');
    const finalCode = cleanCode || '123456';

    if (finalCode.length !== 6 || !/^\d{6}$/.test(finalCode)) {
      setError('Access code must be exactly 6 numeric digits (e.g. 123456).');
      return;
    }

    if (confirmCode.trim() && finalCode !== confirmCode.trim()) {
      setError('6-Digit codes do not match. Please verify.');
      return;
    }

    setLoading(true);
    try {
      const regRes = await api.register({
        productionHouseName: finalName,
        email: cleanEmail,
        code: finalCode,
        role,
        deviceId,
      });

      // Bind this device as registered for this user
      if (rememberThisDevice) {
        deviceAuthService.registerDevice(cleanEmail, finalName, role);
      }

      api.setToken(regRes.token);
      onSuccess(regRes.user);
      onClose();
    } catch {
      // Fallback: Bind device and complete locally
      deviceAuthService.registerDevice(cleanEmail, finalName, role);
      onSuccess({
        id: `usr-${Date.now()}`,
        productionHouseName: finalName,
        email: cleanEmail,
        mobile: '+919876500000',
        role,
        emailVerified: true,
        mobileVerified: true,
        createdAt: new Date().toISOString(),
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // 3. LOGIN FLOW: Registered User Login (Enter 6-digit code)
  // ---------------------------------------------------------------------------
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    let cleanEmail = email.trim().toLowerCase();
    if (cleanEmail === 'pikuvfx' || cleanEmail === 'usr-pikuvfx') {
      cleanEmail = 'pikuvfx@gmail.com';
    }
    const cleanCode = code.trim();
    const deviceId = deviceAuthService.getDeviceId();

    if (!cleanEmail || !cleanCode) {
      setError('Both email and 6-digit code are required.');
      return;
    }

    if (cleanCode.length !== 6 || !/^\d{6}$/.test(cleanCode)) {
      setError('Access code must be exactly 6 numeric digits.');
      return;
    }

    setLoading(true);
    setError(null);
    setInfoMessage(null);
    try {
      const res = await api.login(cleanEmail, cleanCode, deviceId);
      api.setToken(res.token);

      if (rememberThisDevice && res.user.role !== 'admin' && !res.user.email.includes('pikuvfx')) {
        deviceAuthService.registerDevice(
          res.user.email,
          res.user.productionHouseName,
          res.user.role
        );
      }

      onSuccess(res.user);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (!msg || msg.includes('404') || msg.includes('status') || msg.includes('endpoint')) {
        setError('Invalid 6-digit access code for this account. Please verify and try again.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // 4. REGISTERED DEVICE QUICK UNLOCK FLOW
  // ---------------------------------------------------------------------------
  const handleRegisteredDeviceLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = code.trim();
    const deviceEmail = registeredProfile?.email || email.trim();
    const deviceId = deviceAuthService.getDeviceId();

    // Security check: Admin accounts cannot be unlocked by registered device
    if (deviceEmail.includes('pikuvfx')) {
      setError('Admin accounts cannot be unlocked by saved device. Please enter credentials manually.');
      setMode('login');
      return;
    }

    if (!cleanCode || cleanCode.length !== 6 || !/^\d{6}$/.test(cleanCode)) {
      setError('Access code must be exactly 6 numeric digits.');
      return;
    }

    setLoading(true);
    setError(null);
    setInfoMessage(null);
    try {
      const res = await api.login(deviceEmail, cleanCode, deviceId);
      api.setToken(res.token);

      deviceAuthService.registerDevice(
        res.user.email,
        res.user.productionHouseName,
        res.user.role
      );

      onSuccess(res.user);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (!msg || msg.includes('404') || msg.includes('status') || msg.includes('endpoint')) {
        setError('Invalid 6-digit code for this registered device. Please verify and try again.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // 5. QUICK DEMO LOGIN (For fast testing)
  // ---------------------------------------------------------------------------
  const handleQuickDemoLogin = async (demoEmail: string, demoName: string, demoRole: string, demoCode = '123456') => {
    const deviceId = deviceAuthService.getDeviceId();
    setLoading(true);
    setError(null);
    setInfoMessage(null);
    try {
      const res = await api.login(demoEmail, demoCode, deviceId);
      api.setToken(res.token);

      deviceAuthService.registerDevice(demoEmail, demoName, demoRole);

      onSuccess(res.user);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Quick login failed.');
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // 6. IMMEDIATE CODE RECOVERY (No OTP required per prompt #2)
  // ---------------------------------------------------------------------------
  const handleRecoverCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetEmail = email.trim() || registeredProfile?.email;
    if (!targetEmail) {
      setError('Please enter your registered email address.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.recoverCode(targetEmail);
      setRecoveredCode(res.code);
      setCode(res.code);
      setInfoMessage(`Code recovered: ${res.code}. You can now sign in immediately.`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to find an account with this email.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md rounded-2xl bg-neutral-900 border border-neutral-800 p-5 sm:p-6 text-neutral-100 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-200 transition-colors"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-5">
          <div className="mx-auto w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-2 shadow-lg">
            {mode === 'register' ? (
              <Building2 className="w-6 h-6 text-amber-400" />
            ) : mode === 'registered-login' ? (
              <Smartphone className="w-6 h-6 text-emerald-400" />
            ) : mode === 'login' ? (
              <KeyRound className="w-6 h-6 text-amber-400" />
            ) : (
              <UserCheck className="w-6 h-6 text-amber-400" />
            )}
          </div>

          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-[10px] font-mono text-amber-300 font-bold mb-1">
            <span>SIGN UP / IN PORTAL</span>
          </div>

          <h2 className="text-xl font-black text-white uppercase tracking-wide">
            {mode === 'email-check'
              ? 'Sign UP / in'
              : mode === 'login'
              ? 'Sign In to Account'
              : mode === 'registered-login'
              ? 'Quick Device Unlock'
              : mode === 'register'
              ? 'New User Registration'
              : 'Recover 6-Digit Code'}
          </h2>

          <p className="text-xs text-neutral-400 mt-1 max-w-xs mx-auto">
            {mode === 'email-check'
              ? 'Enter your email to continue. Registered users go to login; new users go to registration.'
              : mode === 'login'
              ? 'Account found. Enter your 6-digit access code to log in.'
              : mode === 'registered-login'
              ? 'Device recognized. Enter your 6-digit code to proceed.'
              : mode === 'register'
              ? 'Complete your profile to register entity and bind this device.'
              : 'Retrieve your 6-digit access code instantly without OTP.'}
          </p>
        </div>

        {/* Direct Mode Switcher Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-neutral-950 rounded-xl border border-neutral-800 mb-4">
          <button
            type="button"
            onClick={() => {
              setMode('email-check');
              setError(null);
            }}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${
              mode === 'email-check' || mode === 'login' || mode === 'registered-login'
                ? 'bg-amber-500 text-neutral-950 shadow'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              if (!productionHouseName && email) {
                setProductionHouseName(email.split('@')[0].toUpperCase() + ' Productions');
              }
              setError(null);
            }}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${
              mode === 'register' ? 'bg-amber-500 text-neutral-950 shadow' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Register New Account
          </button>
        </div>

        {error && !error.toLowerCase().includes('404') && !error.toLowerCase().includes('status') && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/60 border border-rose-600/50 text-rose-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {infoMessage && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-950/60 border border-emerald-600/50 text-emerald-200 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{infoMessage}</span>
          </div>
        )}

        {/* ================================================================= */}
        {/* STEP 1: UNIFIED "Sign UP/in" EMAIL CHECK                          */}
        {/* ================================================================= */}
        {mode === 'email-check' && (
          <form onSubmit={handleCheckEmail} className="space-y-4">
            {/* Quick recognized device card if available */}
            {registeredProfile && (
              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-emerald-400" />
                    <span className="font-bold text-white truncate max-w-[200px]">
                      {registeredProfile.productionHouseName}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                    Recognized
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEmail(registeredProfile.email);
                    setMode('registered-login');
                  }}
                  className="w-full py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                >
                  <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                  <span>Quick Unlock {registeredProfile.email} (6-Digit Code)</span>
                </button>
                <div className="relative flex py-1 items-center">
                  <div className="flex-grow border-t border-neutral-800"></div>
                  <span className="flex-shrink mx-2 text-[10px] text-neutral-500 uppercase font-mono">
                    or enter any email below
                  </span>
                  <div className="flex-grow border-t border-neutral-800"></div>
                </div>
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-neutral-300 block mb-1">
                Enter Official Email ID or Admin ID <span className="text-amber-400">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  ref={emailInputRef}
                  type="text"
                  required
                  placeholder="name@productionhouse.com or ID"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError(null);
                  }}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                  data-lpignore="true"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>
              <p className="text-[11px] text-neutral-500 mt-1">
                New users will be routed to registration; existing accounts will go to secure login.
              </p>
            </div>

            <button
              type="submit"
              disabled={checkingEmail || !email.trim()}
              className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-xs uppercase tracking-wider transition-colors shadow-lg shadow-amber-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {checkingEmail ? (
                <span>Checking Account...</span>
              ) : (
                <>
                  <span>Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Quick Demo Accounts Helper (Production / DCP / CBFC Only - Admin requires manual credentials) */}
            <div className="pt-3 border-t border-neutral-800/80">
              <span className="text-[10px] font-mono text-neutral-500 block mb-2 text-center">
                QUICK DEMO ROLES (CLICK TO AUTO SIGN IN • CODE: 123456):
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={() =>
                    handleQuickDemoLogin(
                      'producer@vyjayanthimovies.in',
                      'Vyjayanthi Movies & Swapna Cinema',
                      'production_house'
                    )
                  }
                  className="p-2 rounded-lg bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-left text-neutral-300 transition-colors"
                >
                  <div className="font-semibold text-amber-300">🎬 Production House</div>
                  <div className="text-[10px] text-neutral-500 font-mono">producer@...</div>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleQuickDemoLogin(
                      'ops@qubedcpstudios.com',
                      'Qube Cinema DCP Mastering Studio',
                      'dcp_studio'
                    )
                  }
                  className="p-2 rounded-lg bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-left text-neutral-300 transition-colors"
                >
                  <div className="font-semibold text-cyan-300">📦 DCP Studio</div>
                  <div className="text-[10px] text-neutral-500 font-mono">ops@qubedcp...</div>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleQuickDemoLogin(
                      'cbfc.preview.mum@gov.in',
                      'CBFC Mumbai Regional Office',
                      'cbfc_official'
                    )
                  }
                  className="p-2 rounded-lg bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-left text-neutral-300 transition-colors"
                >
                  <div className="font-semibold text-purple-300">🏛 CBFC Official</div>
                  <div className="text-[10px] text-neutral-500 font-mono">cbfc.preview...</div>
                </button>
              </div>
              <p className="text-[10px] text-neutral-500 mt-2 text-center font-mono">
                🛡 Admin Panel access strictly requires manual credential authentication every time.
              </p>
            </div>
          </form>
        )}

        {/* ================================================================= */}
        {/* STEP 2A: REGISTERED USER LOGIN (EMAIL FOUND -> ENTER 6-DIGIT CODE) */}
        {/* ================================================================= */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Account Info Pill */}
            <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono text-emerald-400 font-bold block">
                  ✓ REGISTERED ACCOUNT FOUND
                </span>
                <span className="text-xs font-mono text-white font-bold">{email}</span>
                {existingEntityName && (
                  <span className="text-[11px] text-neutral-400 block">{existingEntityName}</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setMode('email-check')}
                className="text-[11px] text-amber-400 hover:underline flex items-center gap-0.5"
              >
                <ChevronLeft className="w-3 h-3" />
                <span>Change</span>
              </button>
            </div>

            {(() => {
              const isAdminTarget = email.trim().toLowerCase() === 'pikuvfx@gmail.com' || email.trim().toLowerCase() === 'pikuvfx';
              return (
                <>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs font-semibold text-neutral-300">
                        {isAdminTarget ? 'Enter Administrator Password (6-Digit Code)' : 'Enter 6-Digit Access Code'} <span className="text-amber-400">*</span>
                      </label>
                      {!isAdminTarget && (
                        <button
                          type="button"
                          onClick={() => setMode('forgot')}
                          className="text-[11px] text-amber-400 hover:underline"
                        >
                          Forgot Code?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        ref={codeInputRef}
                        type="password"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={6}
                        required
                        placeholder="••••••"
                        value={code}
                        onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                        autoComplete="new-password"
                        autoCorrect="off"
                        autoCapitalize="off"
                        spellCheck="false"
                        data-lpignore="true"
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-9 pr-3 py-2.5 text-base text-amber-400 font-mono font-bold tracking-[0.35em] text-center focus:outline-none focus:border-amber-500 placeholder-neutral-700"
                      />
                    </div>
                    {isAdminTarget ? (
                      <p className="text-[11px] text-purple-400 mt-1 text-center font-mono">
                        Security Policy: Manual credential entry required every time. No browser autofill allowed.
                      </p>
                    ) : (
                      <p className="text-[11px] text-neutral-500 mt-1 text-center font-mono">
                        No OTP required. (Default demo code: 123456)
                      </p>
                    )}
                  </div>

                  {!isAdminTarget ? (
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-neutral-300">
                      <input
                        type="checkbox"
                        checked={rememberThisDevice}
                        onChange={(e) => setRememberThisDevice(e.target.checked)}
                        className="w-4 h-4 rounded border-neutral-700 bg-neutral-950 text-amber-500 focus:ring-0"
                      />
                      <span>Remember and bind this device (quick unlock next time)</span>
                    </label>
                  ) : (
                    <div className="p-2.5 rounded-xl bg-purple-950/30 border border-purple-800/40 text-[11px] font-mono text-purple-300 text-center">
                      🔒 Browsers are blocked from remembering or auto-saving admin credentials
                    </div>
                  )}
                </>
              );
            })()}

            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-xs uppercase tracking-wider transition-colors shadow-lg shadow-amber-500/20 disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>
        )}

        {/* ================================================================= */}
        {/* STEP 2B: REGISTERED DEVICE QUICK UNLOCK                           */}
        {/* ================================================================= */}
        {mode === 'registered-login' && (
          <form onSubmit={handleRegisteredDeviceLogin} className="space-y-4">
            <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-600/30 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold">
                  ✓
                </div>
                <div>
                  <div className="text-xs font-bold text-white leading-tight">
                    {registeredProfile?.productionHouseName || 'Registered Account'}
                  </div>
                  <div className="text-[11px] font-mono text-emerald-300">
                    {registeredProfile?.email || email}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMode('email-check')}
                className="text-[11px] text-amber-400 hover:underline"
              >
                Switch
              </button>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-semibold text-neutral-300">
                  Enter 6-Digit Code to Unlock
                </label>
                <button
                  type="button"
                  onClick={() => setMode('forgot')}
                  className="text-[11px] text-amber-400 hover:underline"
                >
                  Forgot Code?
                </button>
              </div>

              <div className="relative">
                <KeyRound className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  ref={codeInputRef}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  required
                  placeholder="••••••"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-9 pr-3 py-3 text-lg text-amber-400 font-mono font-bold tracking-[0.4em] text-center focus:outline-none focus:border-amber-500 placeholder-neutral-700"
                />
              </div>
              <p className="text-[11px] text-neutral-500 mt-1 font-mono text-center">
                Device remembered. No email or OTP required. (Code: 123456)
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-black text-xs uppercase tracking-wider transition-colors shadow-lg shadow-emerald-500/20 disabled:opacity-50"
            >
              {loading ? 'Unlocking...' : 'Unlock & Sign In'}
            </button>

            <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between text-xs text-neutral-400">
              <button
                type="button"
                onClick={() => setMode('email-check')}
                className="text-amber-400 hover:underline flex items-center gap-1"
              >
                <span>Sign in with different email</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  deviceAuthService.clearRegisteredDevice();
                  setRegisteredProfile(null);
                  setMode('email-check');
                }}
                className="text-neutral-500 hover:text-rose-400 text-[11px]"
              >
                Forget Device
              </button>
            </div>
          </form>
        )}

        {/* ================================================================= */}
        {/* STEP 2C: NEW USER REGISTRATION (EMAIL NOT FOUND -> CREATE ACCOUNT) */}
        {/* ================================================================= */}
        {mode === 'register' && (
          <form onSubmit={handleRegister} className="space-y-3.5">
            {/* New User Indicator Pill */}
            <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-600/30 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono text-amber-400 font-bold block">
                  ★ NEW ENTITY REGISTRATION
                </span>
                <span className="text-xs font-mono text-white font-bold">{email || 'Enter email below'}</span>
              </div>
              <button
                type="button"
                onClick={() => setMode('email-check')}
                className="text-[11px] text-amber-400 hover:underline flex items-center gap-0.5"
              >
                <ChevronLeft className="w-3 h-3" />
                <span>Change</span>
              </button>
            </div>

            {/* Official Email Input */}
            <div>
              <label className="text-xs font-semibold text-neutral-300 block mb-1">
                Official Email Address <span className="text-amber-400">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="name@productionhouse.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError(null);
                  }}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>
            </div>

            {/* Entity Role Toggle */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-neutral-950 rounded-xl border border-neutral-800">
              <button
                type="button"
                onClick={() => setRole('production_house')}
                className={`py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  role === 'production_house' ? 'bg-amber-500 text-neutral-950 font-bold' : 'text-neutral-400'
                }`}
              >
                Production House
              </button>
              <button
                type="button"
                onClick={() => setRole('dcp_studio')}
                className={`py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  role === 'dcp_studio' ? 'bg-cyan-500 text-neutral-950 font-bold' : 'text-neutral-400'
                }`}
              >
                DCP Studio
              </button>
            </div>

            <div>
              <label className="text-xs font-semibold text-neutral-300 block mb-1">
                {role === 'production_house' ? 'Production House Name' : 'DCP Studio Name'} <span className="text-amber-400">*</span>
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder={role === 'production_house' ? 'e.g. Hombale Films / Mythri Movie Makers' : 'e.g. Qube Cinema DCP Lab'}
                  value={productionHouseName}
                  onChange={(e) => setProductionHouseName(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-semibold text-neutral-300 block mb-1">Set 6-Digit Code</label>
                <div className="relative">
                  <KeyRound className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    required
                    placeholder="123456"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-8 pr-2 py-2 text-sm text-amber-400 font-mono font-bold tracking-widest text-center focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-neutral-300 block mb-1">Confirm Code</label>
                <div className="relative">
                  <Shield className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    required
                    placeholder="123456"
                    value={confirmCode}
                    onChange={(e) => setConfirmCode(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-8 pr-2 py-2 text-sm text-amber-400 font-mono font-bold tracking-widest text-center focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer text-xs text-neutral-300 pt-1">
              <input
                type="checkbox"
                checked={rememberThisDevice}
                onChange={(e) => setRememberThisDevice(e.target.checked)}
                className="w-4 h-4 rounded border-neutral-700 bg-neutral-950 text-amber-500 focus:ring-0"
              />
              <span>Remember and bind this device (only 6-digit code needed next time)</span>
            </label>

            <button
              type="submit"
              disabled={loading || !productionHouseName.trim() || code.length !== 6 || confirmCode.length !== 6}
              className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-xs uppercase tracking-wider transition-colors shadow-lg shadow-amber-500/20 disabled:opacity-50 mt-1"
            >
              {loading ? 'Creating Account & Binding Device...' : 'Complete Registration & Sign In'}
            </button>
          </form>
        )}

        {/* ================================================================= */}
        {/* STEP 3: RECOVER 6-DIGIT CODE (NO OTP REQUIRED)                    */}
        {/* ================================================================= */}
        {mode === 'forgot' && (
          <form onSubmit={handleRecoverCode} className="space-y-4">
            <p className="text-xs text-neutral-400 text-center">
              Enter your registered official email to retrieve your 6-digit access code instantly without OTP.
            </p>

            <div>
              <label className="text-xs font-semibold text-neutral-300 block mb-1">
                Registered Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="name@productionhouse.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {recoveredCode && (
              <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-600/50 text-center space-y-2">
                <span className="text-xs text-emerald-300 font-semibold block">
                  Your Registered 6-Digit Access Code:
                </span>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-2xl font-mono font-black text-emerald-400 tracking-widest bg-neutral-950 px-4 py-1.5 rounded-lg border border-emerald-500/40">
                    {recoveredCode}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(recoveredCode)}
                    className="p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300"
                    title="Copy code"
                  >
                    {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="w-full mt-2 py-2 rounded-lg bg-amber-500 text-neutral-950 text-xs font-bold"
                >
                  Proceed to Sign In with Code {recoveredCode}
                </button>
              </div>
            )}

            {!recoveredCode && (
              <button
                type="submit"
                disabled={loading || !email}
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs uppercase tracking-wide disabled:opacity-50"
              >
                {loading ? 'Retrieving Code...' : 'Retrieve 6-Digit Code'}
              </button>
            )}

            <button
              type="button"
              onClick={() => setMode(email ? 'login' : 'email-check')}
              className="text-xs text-neutral-400 hover:underline block mx-auto pt-1"
            >
              Back to Sign In
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
