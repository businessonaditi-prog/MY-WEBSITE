import React from 'react';
import { Film, ShieldCheck, UserCheck, LogOut, Lock, Upload, Play, CreditCard, User, Layers, Shield, Code, HardDrive, Globe } from 'lucide-react';
import { User as UserType } from '../types/cinemaPlatform';

interface NavigationProps {
  currentUser: UserType | null;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenAuth: (mode?: 'login' | 'register') => void;
  onLogout: () => void;
  onQuickRoleSwitch: (role: string) => void;
  onOpenApiDocs?: () => void;
  onOpenDriveDatabase?: () => void;
  onOpenDomainSetup?: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentUser,
  activeTab,
  setActiveTab,
  onOpenAuth,
  onLogout,
  onQuickRoleSwitch,
  onOpenApiDocs,
  onOpenDriveDatabase,
  onOpenDomainSetup,
}) => {
  const role = currentUser?.role || 'guest';

  return (
    <nav className="sticky top-0 z-40 bg-neutral-950/95 backdrop-blur-md border-b border-neutral-800 text-neutral-100 w-full max-w-full overflow-hidden">
      {/* Top Banner with Quick Role Demo Bar */}
      <div className="bg-neutral-900/80 border-b border-neutral-800/80 px-3 sm:px-4 py-1.5 text-[10px] sm:text-[11px] font-mono text-neutral-400 flex flex-wrap items-center justify-between gap-1.5 w-full">
        <div className="flex items-center gap-1.5 shrink-0">
          <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="font-semibold text-neutral-300">CBFC THEATRICAL PREVIEW &amp; ACCESSIBILITY</span>
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-neutral-500 hidden sm:inline">Role:</span>
          <button
            onClick={() => onQuickRoleSwitch('guest')}
            className={`px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] transition-colors ${
              role === 'guest' ? 'bg-neutral-700 text-white font-bold' : 'bg-neutral-950 hover:bg-neutral-800 text-neutral-400'
            }`}
          >
            Guest
          </button>
          <button
            onClick={() => onQuickRoleSwitch('production_house')}
            className={`px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] transition-colors ${
              role === 'production_house' ? 'bg-amber-500 text-neutral-950 font-bold' : 'bg-neutral-950 hover:bg-neutral-800 text-neutral-400'
            }`}
          >
            Production House
          </button>
          <button
            onClick={() => onQuickRoleSwitch('dcp_studio')}
            className={`px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] transition-colors ${
              role === 'dcp_studio' ? 'bg-cyan-500 text-neutral-950 font-bold' : 'bg-neutral-950 hover:bg-neutral-800 text-neutral-400'
            }`}
          >
            DCP Studio
          </button>
          <button
            onClick={() => onQuickRoleSwitch('cbfc_official')}
            className={`px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] transition-colors ${
              role === 'cbfc_official' ? 'bg-emerald-500 text-neutral-950 font-bold' : 'bg-neutral-950 hover:bg-neutral-800 text-neutral-400'
            }`}
          >
            CBFC Official
          </button>
          <button
            onClick={() => onQuickRoleSwitch('admin')}
            className={`px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] transition-colors ${
              role === 'admin' ? 'bg-purple-500 text-white font-bold' : 'bg-neutral-950 hover:bg-neutral-800 text-neutral-400'
            }`}
          >
            Admin
          </button>
        </div>
      </div>

      {/* Main Navigation Header */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 sm:py-3 w-full">
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          {/* Brand */}
          <div
            onClick={() => setActiveTab('home')}
            className="flex items-center gap-2.5 cursor-pointer select-none shrink-0"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center text-neutral-950 font-black shadow-lg shadow-amber-500/20 shrink-0">
              <Film className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="font-black text-base sm:text-lg tracking-wider text-white">
                  CINEAD<span className="text-amber-400">.CC</span>
                </span>
                <span className="text-[9px] sm:text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/40 text-amber-300 font-bold">
                  CBFC
                </span>
              </div>
              <p className="text-[10px] text-neutral-400 hidden md:block">
                Secure Film &amp; DCP Accessibility Platform
              </p>
            </div>
          </div>

          {/* Desktop Navigation Items: HOME, FILMS, UPLOAD, CBFC OFFICIAL, ADMIN all looking the same */}
          <div className="hidden lg:flex items-center gap-1.5 font-medium text-xs sm:text-sm">
            {/* 1. HOME */}
            <button
              onClick={() => setActiveTab('home')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold tracking-wider uppercase transition-colors whitespace-nowrap ${
                activeTab === 'home'
                  ? 'bg-amber-500 text-neutral-950 font-black shadow-md shadow-amber-500/20'
                  : 'text-neutral-300 hover:text-white hover:bg-neutral-900 border border-neutral-800/60'
              }`}
            >
              HOME
            </button>

            {/* 2. FILMS */}
            <button
              onClick={() => setActiveTab('gallery')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold tracking-wider uppercase transition-colors whitespace-nowrap ${
                activeTab === 'gallery'
                  ? 'bg-amber-500 text-neutral-950 font-black shadow-md shadow-amber-500/20'
                  : 'text-neutral-300 hover:text-white hover:bg-neutral-900 border border-neutral-800/60'
              }`}
            >
              FILMS
            </button>

            {/* 3. UPLOAD */}
            <button
              onClick={() => setActiveTab(role === 'dcp_studio' ? 'upload-dcp' : 'upload')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold tracking-wider uppercase transition-colors whitespace-nowrap ${
                activeTab === 'upload' || activeTab === 'upload-dcp'
                  ? 'bg-amber-500 text-neutral-950 font-black shadow-md shadow-amber-500/20'
                  : 'text-neutral-300 hover:text-white hover:bg-neutral-900 border border-neutral-800/60'
              }`}
            >
              UPLOAD
            </button>

            {/* 4. CBFC OFFICIAL */}
            <button
              onClick={() => setActiveTab('preview-code')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold tracking-wider uppercase transition-colors whitespace-nowrap ${
                activeTab === 'preview-code'
                  ? 'bg-amber-500 text-neutral-950 font-black shadow-md shadow-amber-500/20'
                  : 'text-neutral-300 hover:text-white hover:bg-neutral-900 border border-neutral-800/60'
              }`}
            >
              CBFC OFFICIAL
            </button>

            {/* 5. ADMIN */}
            <button
              onClick={() => setActiveTab('admin')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold tracking-wider uppercase transition-colors whitespace-nowrap ${
                activeTab === 'admin'
                  ? 'bg-amber-500 text-neutral-950 font-black shadow-md shadow-amber-500/20'
                  : 'text-neutral-300 hover:text-white hover:bg-neutral-900 border border-neutral-800/60'
              }`}
            >
              ADMIN
            </button>

            {/* Entity User Quick Access (when logged in as Production House or Studio) */}
            {currentUser && (role === 'production_house' || role === 'dcp_studio') && (
              <>
                <button
                  onClick={() => setActiveTab('my-films')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold tracking-wider uppercase transition-colors whitespace-nowrap ${
                    activeTab === 'my-films'
                      ? 'bg-amber-500 text-neutral-950 font-black shadow-md shadow-amber-500/20'
                      : 'text-neutral-300 hover:text-white hover:bg-neutral-900 border border-neutral-800/60'
                  }`}
                >
                  MY FILMS
                </button>
                <button
                  onClick={() => setActiveTab('payments')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold tracking-wider uppercase transition-colors whitespace-nowrap ${
                    activeTab === 'payments'
                      ? 'bg-amber-500 text-neutral-950 font-black shadow-md shadow-amber-500/20'
                      : 'text-neutral-300 hover:text-white hover:bg-neutral-900 border border-neutral-800/60'
                  }`}
                >
                  PAYMENTS
                </button>
              </>
            )}
          </div>

          {/* User Auth Info & Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {onOpenDomainSetup && (
              <button
                onClick={onOpenDomainSetup}
                className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-xs font-mono font-bold flex items-center gap-1 transition-colors"
                title="Manage www.cinead.cc parallel custom domain DNS & SSL configuration"
              >
                <Globe className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">WWW.CINEAD.CC</span>
              </button>
            )}

            {onOpenDriveDatabase && (
              <button
                onClick={onOpenDriveDatabase}
                className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-bold flex items-center gap-1 transition-colors"
                title="Connect businessonaditi@gmail.com Google Drive database and view spreadsheet tables"
              >
                <HardDrive className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">DRIVE DB</span>
              </button>
            )}

            {onOpenApiDocs && (
              <button
                onClick={onOpenApiDocs}
                className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-mono font-bold flex items-center gap-1 transition-colors"
                title="View live application links, webhook receivers and REST endpoints"
              >
                <Code className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">API</span>
              </button>
            )}

            {currentUser ? (
              <div className="flex items-center gap-2">
                <div
                  onClick={() => setActiveTab('profile')}
                  className="hidden xl:flex flex-col text-right cursor-pointer"
                >
                  <span className="text-xs font-semibold text-white max-w-[150px] truncate">
                    {currentUser.productionHouseName}
                  </span>
                  <div className="flex items-center gap-1 justify-end text-[10px] text-neutral-400">
                    <span className="text-emerald-400 font-mono">
                      {currentUser.emailVerified ? 'Email ✓' : 'Email ✗'}
                    </span>
                    <span>•</span>
                    <span className="text-emerald-400 font-mono">
                      {currentUser.mobileVerified ? 'Mobile ✓' : 'Mobile ✗'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setActiveTab('profile')}
                  className="p-1.5 sm:p-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-300"
                  title="Manage Profile"
                >
                  <User className="w-4 h-4" />
                </button>

                <button
                  onClick={onLogout}
                  className="p-1.5 sm:p-2 rounded-xl bg-neutral-900 hover:bg-red-950/60 hover:text-red-300 border border-neutral-700 text-neutral-400 transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => onOpenAuth()}
                className="px-3 sm:px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-black transition-all shadow-md shadow-amber-500/20 active:scale-95 whitespace-nowrap"
              >
                Sign UP/in
              </button>
            )}
          </div>
        </div>

        {/* Mobile & Tablet Navigation Grid (HOME, FILMS, UPLOAD, CBFC OFFICIAL, ADMIN all looking the same, NO left-right scroll) */}
        <div className={`grid lg:hidden ${
          currentUser && (role === 'production_house' || role === 'dcp_studio') ? 'grid-cols-6' : 'grid-cols-5'
        } gap-1 pt-2.5 mt-2 border-t border-neutral-800/80 text-xs font-bold uppercase tracking-wider w-full`}>
          <button
            onClick={() => setActiveTab('home')}
            className={`w-full py-1.5 px-0.5 sm:px-2 rounded-lg text-[9px] min-[360px]:text-[10px] sm:text-xs font-bold tracking-tight uppercase transition-colors text-center flex items-center justify-center leading-tight ${
              activeTab === 'home'
                ? 'bg-amber-500 text-neutral-950 font-black shadow-md shadow-amber-500/20'
                : 'text-neutral-300 hover:text-white hover:bg-neutral-900 border border-neutral-800/60 bg-neutral-950/60'
            }`}
          >
            HOME
          </button>
          <button
            onClick={() => setActiveTab('gallery')}
            className={`w-full py-1.5 px-0.5 sm:px-2 rounded-lg text-[9px] min-[360px]:text-[10px] sm:text-xs font-bold tracking-tight uppercase transition-colors text-center flex items-center justify-center leading-tight ${
              activeTab === 'gallery'
                ? 'bg-amber-500 text-neutral-950 font-black shadow-md shadow-amber-500/20'
                : 'text-neutral-300 hover:text-white hover:bg-neutral-900 border border-neutral-800/60 bg-neutral-950/60'
            }`}
          >
            FILMS
          </button>
          <button
            onClick={() => setActiveTab(role === 'dcp_studio' ? 'upload-dcp' : 'upload')}
            className={`w-full py-1.5 px-0.5 sm:px-2 rounded-lg text-[9px] min-[360px]:text-[10px] sm:text-xs font-bold tracking-tight uppercase transition-colors text-center flex items-center justify-center leading-tight ${
              activeTab === 'upload' || activeTab === 'upload-dcp'
                ? 'bg-amber-500 text-neutral-950 font-black shadow-md shadow-amber-500/20'
                : 'text-neutral-300 hover:text-white hover:bg-neutral-900 border border-neutral-800/60 bg-neutral-950/60'
            }`}
          >
            UPLOAD
          </button>
          <button
            onClick={() => setActiveTab('preview-code')}
            className={`w-full py-1.5 px-0.5 sm:px-2 rounded-lg text-[9px] min-[360px]:text-[10px] sm:text-xs font-bold tracking-tight uppercase transition-colors text-center flex items-center justify-center leading-tight ${
              activeTab === 'preview-code'
                ? 'bg-amber-500 text-neutral-950 font-black shadow-md shadow-amber-500/20'
                : 'text-neutral-300 hover:text-white hover:bg-neutral-900 border border-neutral-800/60 bg-neutral-950/60'
            }`}
          >
            CBFC OFFICIAL
          </button>
          <button
            onClick={() => setActiveTab('admin')}
            className={`w-full py-1.5 px-0.5 sm:px-2 rounded-lg text-[9px] min-[360px]:text-[10px] sm:text-xs font-bold tracking-tight uppercase transition-colors text-center flex items-center justify-center leading-tight ${
              activeTab === 'admin'
                ? 'bg-amber-500 text-neutral-950 font-black shadow-md shadow-amber-500/20'
                : 'text-neutral-300 hover:text-white hover:bg-neutral-900 border border-neutral-800/60 bg-neutral-950/60'
            }`}
          >
            ADMIN
          </button>
          {currentUser && (role === 'production_house' || role === 'dcp_studio') && (
            <button
              onClick={() => setActiveTab('my-films')}
              className={`w-full py-1.5 px-0.5 sm:px-2 rounded-lg text-[9px] min-[360px]:text-[10px] sm:text-xs font-bold tracking-tight uppercase transition-colors text-center flex items-center justify-center leading-tight ${
                activeTab === 'my-films'
                  ? 'bg-amber-500 text-neutral-950 font-black shadow-md shadow-amber-500/20'
                  : 'text-neutral-300 hover:text-white hover:bg-neutral-900 border border-neutral-800/60 bg-neutral-950/60'
              }`}
            >
              MY FILMS
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};
