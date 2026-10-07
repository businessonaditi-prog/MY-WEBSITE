import React, { useState } from 'react';
import { User, CheckCircle2, AlertCircle, Building2, Mail, Phone, Calendar, ShieldCheck, Smartphone, RotateCcw } from 'lucide-react';
import { User as UserType } from '../types/cinemaPlatform';
import { deviceAuthService } from '../services/deviceAuthService';

interface ProfileViewProps {
  user: UserType;
  filmCount: number;
  onTriggerEmailVerify: () => void;
  onTriggerMobileVerify: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  user,
  filmCount,
  onTriggerEmailVerify,
  onTriggerMobileVerify,
}) => {
  const [deviceResetMsg, setDeviceResetMsg] = useState<string | null>(null);
  const isDeviceBound = deviceAuthService.isDeviceRegistered();

  const handleResetDevice = () => {
    deviceAuthService.clearRegisteredDevice();
    setDeviceResetMsg('Device binding cleared. On next login, email and 6-digit code will both be required.');
    setTimeout(() => setDeviceResetMsg(null), 4000);
  };
  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fadeIn pb-12">
      <div className="pb-4 border-b border-neutral-800">
        <h2 className="text-2xl sm:text-3xl font-black text-white tracking-wide uppercase">
          ENTITY PROFILE &amp; VERIFICATION
        </h2>
        <p className="text-xs sm:text-sm text-neutral-400 mt-1">
          Authorized entity credentials registered under CBFC digital compliance standards.
        </p>
      </div>

      <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-6 shadow-xl">
        {/* Entity Card */}
        <div className="flex items-center gap-4 pb-6 border-b border-neutral-800">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Building2 className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-white">{user.productionHouseName}</h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-neutral-800 text-amber-300">
                {user.role.toUpperCase()}
              </span>
            </div>
            <p className="text-xs text-neutral-400 font-mono mt-0.5">
              Entity ID: {user.id}
            </p>
          </div>
        </div>

        {/* Verification Checks (Section #5, #33) */}
        <div className="space-y-3">
          <span className="text-xs font-mono text-neutral-400 block uppercase">
            Statutory Verification Badges:
          </span>

          <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-neutral-400" />
              <div>
                <span className="text-neutral-300 font-mono">{user.email}</span>
                <span className="block text-[10px] text-neutral-500">Official Communication Channel</span>
              </div>
            </div>

            {user.emailVerified ? (
              <span className="px-2.5 py-1 rounded-md bg-emerald-950/80 border border-emerald-600/40 text-emerald-300 font-bold font-mono text-xs flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Email Verified ✓</span>
              </span>
            ) : (
              <button
                onClick={onTriggerEmailVerify}
                className="px-2.5 py-1 rounded-md bg-amber-500 text-neutral-950 font-bold text-xs"
              >
                Verify Email Now
              </button>
            )}
          </div>

          <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              <Phone className="w-4 h-4 text-neutral-400" />
              <div>
                <span className="text-neutral-300 font-mono">{user.mobile || 'Registered'}</span>
                <span className="block text-[10px] text-emerald-400 font-mono">6-Digit Access Code Enabled (No OTP Required)</span>
              </div>
            </div>

            <span className="px-2.5 py-1 rounded-md bg-emerald-950/80 border border-emerald-600/40 text-emerald-300 font-bold font-mono text-xs flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Direct Code Active ✓</span>
            </span>
          </div>

          {/* Registered Device Status */}
          <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              <Smartphone className="w-4 h-4 text-emerald-400" />
              <div>
                <span className="text-neutral-200 font-bold">This Device Registration Status</span>
                <span className="block text-[10px] text-neutral-400">
                  {isDeviceBound
                    ? 'Registered device: Login only requires your 6-digit code (no email needed).'
                    : 'Unregistered device: Email and 6-digit code both required on login.'}
                </span>
              </div>
            </div>

            {isDeviceBound ? (
              <button
                type="button"
                onClick={handleResetDevice}
                className="px-2.5 py-1 rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-mono text-[11px] flex items-center gap-1.5 transition-colors"
                title="Clear device binding to simulate new device"
              >
                <RotateCcw className="w-3 h-3 text-amber-400" />
                <span>Reset Device</span>
              </button>
            ) : (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/10 text-amber-300 border border-amber-500/20">
                Unbound
              </span>
            )}
          </div>

          {deviceResetMsg && (
            <div className="p-2.5 rounded-lg bg-amber-950/60 border border-amber-600/40 text-amber-200 text-xs font-mono">
              {deviceResetMsg}
            </div>
          )}
        </div>

        {/* Statistics & Metadata */}
        <div className="pt-4 border-t border-neutral-800 grid grid-cols-2 gap-4 text-xs font-mono">
          <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800">
            <span className="text-neutral-500 block mb-1">TOTAL FILMS ON FILE</span>
            <span className="text-xl font-bold text-white">{filmCount}</span>
          </div>
          <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800">
            <span className="text-neutral-500 block mb-1">REGISTRATION DATE</span>
            <span className="text-white font-bold">{new Date(user.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
