/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Upload, ShieldCheck, Globe, Lock, Shield, KeyRound } from 'lucide-react';
import { Navigation } from './components/Navigation';
import { LandingPage } from './components/LandingPage';
import { CommonFilmGallery } from './components/CommonFilmGallery';
import { FilmUploadWorkflow } from './components/FilmUploadWorkflow';
import { MyFilmsView } from './components/MyFilmsView';
import { CBFCVerificationView } from './components/CBFCVerificationView';
import { AdminPanel } from './components/AdminPanel';
import { PaymentHistoryView } from './components/PaymentHistoryView';
import { ProfileView } from './components/ProfileView';
import { AuthModal } from './components/AuthModal';
import { PaymentModal } from './components/PaymentModal';
import { SecurePlayer } from './components/SecurePlayer';
import { ApiIntegrationModal } from './components/ApiIntegrationModal';
import { GoogleDriveDatabaseModal } from './components/GoogleDriveDatabaseModal';
import { DomainModal } from './components/DomainModal';
import { MediaUploadModal } from './components/MediaUploadModal';
import { User, Film, Payment } from './types/cinemaPlatform';
import { api } from './services/apiClient';
import { deviceAuthService } from './services/deviceAuthService';
import { crossSync } from './services/crossSyncService';
import { getDetectedPlatformMode, savePlatformMode, PlatformMode } from './utils/platformEnvironment';

export default function App() {
  // Platform Mode State (Website: cinead.cc vs Companion App)
  const [platformMode, setPlatformModeState] = useState<PlatformMode>(getDetectedPlatformMode());

  // Authentication & User State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<string>('home');

  // Modals State
  const [authModalState, setAuthModalState] = useState<{
    isOpen: boolean;
    mode?: 'email-check' | 'login' | 'register' | 'registered-login' | 'forgot';
    initialEmail?: string;
  }>({
    isOpen: false,
    mode: 'email-check',
  });
  const [paymentModalFilm, setPaymentModalFilm] = useState<Film | null>(null);
  const [isApiDocsOpen, setIsApiDocsOpen] = useState<boolean>(false);
  const [isDriveModalOpen, setIsDriveModalOpen] = useState<boolean>(false);
  const [isDomainModalOpen, setIsDomainModalOpen] = useState<boolean>(false);
  const [mediaUploadModalState, setMediaUploadModalState] = useState<{
    isOpen: boolean;
    initialType: 'AD' | 'CC';
  }>({
    isOpen: false,
    initialType: 'AD',
  });

  // Secure Playback State (Only active when authenticated + valid token)
  const [playbackSession, setPlaybackSession] = useState<{
    film: Film;
    sessionToken: string;
    watermark: string;
  } | null>(null);

  // User's Films Cache
  const [myFilms, setMyFilms] = useState<Film[]>([]);
  const [galleryRefreshTrigger, setGalleryRefreshTrigger] = useState<number>(0);

  // Initial session check & Cross-device sync listener
  useEffect(() => {
    checkCurrentUser();

    const unsubscribe = crossSync.subscribe((msg) => {
      if (msg.type === 'AUTH_CHANGED') {
        checkCurrentUser();
      } else if (msg.type === 'FILM_UPDATED' || msg.type === 'PAYMENT_COMPLETED') {
        loadMyFilms();
        setGalleryRefreshTrigger((prev) => prev + 1);
      }
    });

    return unsubscribe;
  }, []);

  // Requirement #3: Once logged out, MY Film tab is not there; once logged in then only user can access My Films
  useEffect(() => {
    if (!currentUser && activeTab === 'my-films') {
      setActiveTab('home');
    }
  }, [currentUser, activeTab]);

  const checkCurrentUser = async () => {
    const token = api.getToken();
    if (token) {
      try {
        const res = await api.getMe();
        setCurrentUser(res.user);
        loadMyFilms();
      } catch {
        api.setToken(null);
        setCurrentUser(null);
      }
    }
  };

  const loadMyFilms = async () => {
    try {
      const res = await api.getMyFilms();
      setMyFilms(res.films);
    } catch (e) {
      console.error('Error loading user films:', e);
    }
  };

  // Quick Role Switcher (Convenient for evaluating all 5 roles)
  const handleQuickRoleSwitch = async (roleName: string) => {
    if (roleName === 'guest') {
      api.setToken(null);
      setCurrentUser(null);
      setActiveTab('home');
      return;
    }

    let email = 'producer@vyjayanthimovies.in';
    let targetTab = 'my-films';

    if (roleName === 'admin') {
      // Security policy: Admin requires credentials entered manually every time.
      // No automatic role-switch, no stored credentials.
      setAuthModalState({ isOpen: true, mode: 'email-check' });
      return;
    } else if (roleName === 'dcp_studio') {
      email = 'ops@qubedcpstudios.com';
      targetTab = 'my-films';
    } else if (roleName === 'cbfc_official') {
      email = 'cbfc.preview.mum@gov.in';
      targetTab = 'preview-code';
    } else if (roleName === 'production_house') {
      email = 'producer@vyjayanthimovies.in';
      targetTab = 'my-films';
    }

    try {
      const accessCode = '123456';
      const res = await api.login(email, accessCode);
      api.setToken(res.token);
      deviceAuthService.registerDevice(res.user.email, res.user.productionHouseName, res.user.role);
      setCurrentUser(res.user);
      setActiveTab(targetTab);
      loadMyFilms();
      crossSync.broadcast('AUTH_CHANGED');
    } catch (err) {
      console.error('Quick switch error:', err);
    }
  };

  const handleLogout = () => {
    api.setToken(null);
    setCurrentUser(null);
    setActiveTab('home');
    setPlaybackSession(null);
    crossSync.broadcast('AUTH_CHANGED');
  };

  // Owner Playback Flow (Section #22, #50, #51: Without code!)
  const handleOwnerWatchFilm = async (film: Film) => {
    try {
      const res = await api.authorizeOwnerPlayback(film.id);
      setPlaybackSession({
        film: res.film,
        sessionToken: res.sessionToken,
        watermark: res.watermark,
      });
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Playback authorization failed.');
    }
  };

  // In-App Offline Playback Flow (Sandboxed IndexedDB Storage)
  const handlePlayOfflineFilm = (film: Film) => {
    setPlaybackSession({
      film,
      sessionToken: `offline_sandbox_${film.id}_${Date.now()}`,
      watermark: 'CINEAD.CC OFFLINE SANDBOX • IN-APP ONLY',
    });
  };

  // CBFC / 9-Digit Code Playback Flow (Section #37, #51)
  const handleVerifyCodePlayback = async (film: Film, code: string) => {
    try {
      const res = await api.verifyPreviewCode(code, film.id);
      setPlaybackSession({
        film: res.film,
        sessionToken: res.sessionToken,
        watermark: res.watermark,
      });
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Invalid code or access denied.');
    }
  };

  // Platform Mode Switcher (Website: cinead.cc vs Companion App)
  const handleTogglePlatformMode = (newMode: PlatformMode) => {
    setPlatformModeState(newMode);
    savePlatformMode(newMode);
    if (newMode === 'app' && activeTab === 'admin') {
      setActiveTab('home');
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans selection:bg-amber-500 selection:text-neutral-950 w-full max-w-full overflow-x-hidden">
      {/* Navigation */}
      <Navigation
        currentUser={currentUser}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAuth={(mode) => setAuthModalState({ isOpen: true, mode: mode || 'email-check' })}
        onLogout={handleLogout}
        onQuickRoleSwitch={handleQuickRoleSwitch}
        onOpenApiDocs={() => setIsApiDocsOpen(true)}
        onOpenDriveDatabase={() => setIsDriveModalOpen(true)}
        onOpenDomainModal={() => setIsDomainModalOpen(true)}
        onOpenMediaUpload={(type) => setMediaUploadModalState({ isOpen: true, initialType: type || 'AD' })}
        platformMode={platformMode}
        onTogglePlatformMode={handleTogglePlatformMode}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-6 overflow-x-hidden">
        {/* TAB 1: HOME LANDING PAGE (Section #3) */}
        {activeTab === 'home' && (
          <LandingPage
            onRegisterProductionHouse={() => setAuthModalState({ isOpen: true, mode: 'register' })}
            onBrowseFilms={() => setActiveTab('gallery')}
            onDcpStudioLogin={() => handleQuickRoleSwitch('dcp_studio')}
            onSelectFilmForPreviewWithCode={handleVerifyCodePlayback}
            onOwnerWatchFilm={handleOwnerWatchFilm}
            onOpenAuth={(mode) => setAuthModalState({ isOpen: true, mode: mode || 'email-check' })}
            onOpenDomainModal={() => setIsDomainModalOpen(true)}
            currentUser={currentUser}
          />
        )}

        {/* TAB 2: COMMON FILM GALLERY (Section #20, #21, #49, #63) */}
        {activeTab === 'gallery' && (
          <CommonFilmGallery
            currentUser={currentUser}
            onOpenAuth={() => setAuthModalState({ isOpen: true, mode: 'email-check' })}
            onSelectFilmForPreviewWithCode={handleVerifyCodePlayback}
            onOwnerWatchFilm={handleOwnerWatchFilm}
            onPlayOfflineFilm={handlePlayOfflineFilm}
            refreshTrigger={galleryRefreshTrigger}
          />
        )}

        {/* TAB 3: FILM UPLOAD (Section #8, #10, #11, #12, #13, #15, #16) */}
        {activeTab === 'upload' && currentUser && (
          <FilmUploadWorkflow
            currentUser={currentUser}
            isDcpMode={false}
            onUploadSuccess={(createdFilm) => {
              setMyFilms((prev) => [createdFilm, ...prev]);
              setGalleryRefreshTrigger((prev) => prev + 1);
            }}
            onOpenPaymentModal={(film) => setPaymentModalFilm(film)}
          />
        )}

        {/* TAB 4: DCP STUDIO WORKFLOW (Section #31, #65) */}
        {activeTab === 'upload-dcp' && currentUser && (
          <FilmUploadWorkflow
            currentUser={currentUser}
            isDcpMode={true}
            onUploadSuccess={(createdFilm) => {
              setMyFilms((prev) => [createdFilm, ...prev]);
              setGalleryRefreshTrigger((prev) => prev + 1);
            }}
            onOpenPaymentModal={(film) => setPaymentModalFilm(film)}
          />
        )}

        {/* UNREGISTERED / GUEST UPLOAD GATE */}
        {(activeTab === 'upload' || activeTab === 'upload-dcp') && !currentUser && (
          <div className="max-w-xl mx-auto py-12 px-6 rounded-3xl bg-neutral-900 border border-neutral-800 text-center space-y-5 shadow-2xl animate-fadeIn">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400 mx-auto shadow-xl">
              <Upload className="w-8 h-8" />
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/80 border border-amber-600/40 text-amber-300 text-xs font-mono font-bold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>STATUTORY INGESTION GATEWAY</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-wide">
              UPLOAD FILM &amp; ACCESSIBILITY TRACKS
            </h2>
            <p className="text-xs sm:text-sm text-neutral-400 max-w-md mx-auto leading-relaxed">
              Authentication required to upload theatrical master video/DCP, synchronized Audio Description (AD), and Closed Captions (CC) for CBFC certification preview.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
              <button
                type="button"
                onClick={() => setAuthModalState({ isOpen: true, mode: 'email-check' })}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-xs uppercase tracking-wider transition-colors shadow-lg shadow-amber-500/20"
              >
                Sign UP/in
              </button>
              <button
                type="button"
                onClick={() => handleQuickRoleSwitch('production_house')}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-neutral-950 hover:bg-neutral-900 border border-amber-500/40 text-amber-300 font-mono text-xs transition-colors"
              >
                Demo Producer Sign-In
              </button>
            </div>
          </div>
        )}

        {/* TAB 5: MY FILMS (Requirement #3: Once logged out MY Film tab will be not there; once logged in then only user can access) */}
        {activeTab === 'my-films' && currentUser && (
          <MyFilmsView
            films={myFilms}
            onWatchFilmWithoutCode={handleOwnerWatchFilm}
            onOpenPaymentModal={(film) => setPaymentModalFilm(film)}
            onUploadNewFilm={() => setActiveTab(currentUser?.role === 'dcp_studio' ? 'upload-dcp' : 'upload')}
            onRefresh={loadMyFilms}
          />
        )}

        {/* TAB 6: SECURE 9-DIGIT PREVIEW CODE PORTAL (Section #37) */}
        {activeTab === 'preview-code' && (
          <CBFCVerificationView
            isAuthenticated={Boolean(currentUser)}
            onOpenAuth={() => setAuthModalState({ isOpen: true, mode: 'email-check' })}
            onVerificationSuccess={(film, sessionToken, watermark) => {
              setPlaybackSession({ film, sessionToken, watermark });
            }}
          />
        )}

        {/* TAB 7: PAYMENTS (Restricted Exclusively to Admin Panel) */}
        {activeTab === 'payments' && (
          currentUser?.role === 'admin' ? (
            platformMode === 'website' ? (
              <AdminPanel
                currentUser={currentUser}
                onLoginAsAdmin={() => handleQuickRoleSwitch('admin')}
                onOpenAuth={() => setAuthModalState({ isOpen: true, mode: 'email-check' })}
                onOpenDomainModal={() => setIsDomainModalOpen(true)}
                onWatchFilm={handleOwnerWatchFilm}
                onViewFilmInGallery={() => {
                  setGalleryRefreshTrigger((prev) => prev + 1);
                  setActiveTab('gallery');
                }}
                onFilmUploaded={() => {
                  loadMyFilms();
                  setGalleryRefreshTrigger((prev) => prev + 1);
                }}
                initialSubTab="payments"
              />
            ) : (
              <div className="max-w-xl mx-auto py-16 px-6 rounded-3xl bg-neutral-900 border border-neutral-800 text-center space-y-5 shadow-2xl animate-fadeIn">
                <div className="w-16 h-16 rounded-2xl bg-purple-500/15 border border-purple-500/40 flex items-center justify-center text-purple-400 mx-auto shadow-xl">
                  <Lock className="w-8 h-8" />
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-950/80 border border-purple-600/40 text-purple-300 text-xs font-mono font-bold">
                  <Shield className="w-3.5 h-3.5" />
                  <span>WEBSITE EXCLUSIVE CONSOLE</span>
                </div>
                <h2 className="text-2xl font-black text-white uppercase tracking-wide">
                  PAYMENT AUDIT ACCESSIBLE ON WEBSITE
                </h2>
                <p className="text-xs sm:text-sm text-neutral-400 max-w-md mx-auto leading-relaxed">
                  Financial transaction ledgers and statutory payment audits are accessible via the Admin Panel on the website console (<strong className="text-white">cinead.cc</strong>).
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => handleTogglePlatformMode('website')}
                    className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase tracking-wider transition-colors shadow-lg shadow-purple-600/30"
                  >
                    Switch to Website View (cinead.cc)
                  </button>
                </div>
              </div>
            )
          ) : (
            <div className="max-w-xl mx-auto py-16 px-6 rounded-3xl bg-neutral-900 border border-neutral-800 text-center space-y-5 shadow-2xl animate-fadeIn">
              <div className="w-16 h-16 rounded-2xl bg-rose-500/15 border border-rose-500/40 flex items-center justify-center text-rose-400 mx-auto shadow-xl">
                <Lock className="w-8 h-8" />
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-950/80 border border-rose-600/40 text-rose-300 text-xs font-mono font-bold">
                <Shield className="w-3.5 h-3.5" />
                <span>RESTRICTED ACCESS • ADMIN ONLY</span>
              </div>
              <h2 className="text-2xl font-black text-white uppercase tracking-wide">
                PAYMENT DETAILS ARE RESTRICTED
              </h2>
              <p className="text-xs sm:text-sm text-neutral-400 max-w-md mx-auto leading-relaxed">
                Statutory payment ledgers, transaction records, and fee audits are strictly confidential and visible exclusively within the <strong className="text-white">Central Admin Panel</strong>. General users are not permitted to inspect payment details.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setActiveTab(currentUser ? 'my-films' : 'home')}
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-xs uppercase tracking-wider transition-colors shadow-lg shadow-amber-500/20"
                >
                  Return to {currentUser ? 'My Films' : 'Home'}
                </button>
              </div>
            </div>
          )
        )}

        {/* TAB 8: PROFILE (Section #33) */}
        {activeTab === 'profile' && currentUser && (
          <ProfileView
            user={currentUser}
            filmCount={myFilms.length}
            onTriggerEmailVerify={async () => {
              await api.verifyEmail();
              checkCurrentUser();
            }}
            onTriggerMobileVerify={() => setAuthModalState({ isOpen: true, mode: 'email-check' })}
          />
        )}

        {/* TAB 9: ADMIN PANEL (Available on both App and Website) */}
        {activeTab === 'admin' && (
          currentUser?.role === 'admin' ? (
            <AdminPanel
              currentUser={currentUser}
              onLoginAsAdmin={() => setAuthModalState({ isOpen: true, mode: 'email-check' })}
              onOpenAuth={() => setAuthModalState({ isOpen: true, mode: 'email-check' })}
              onOpenDomainModal={() => setIsDomainModalOpen(true)}
              onWatchFilm={handleOwnerWatchFilm}
              onViewFilmInGallery={() => {
                setGalleryRefreshTrigger((prev) => prev + 1);
                setActiveTab('gallery');
              }}
              onFilmUploaded={() => {
                loadMyFilms();
                setGalleryRefreshTrigger((prev) => prev + 1);
              }}
            />
          ) : (
            <div className="max-w-xl mx-auto py-16 px-6 rounded-3xl bg-neutral-900 border border-neutral-800 text-center space-y-5 shadow-2xl animate-fadeIn">
              <div className="w-16 h-16 rounded-2xl bg-purple-500/15 border border-purple-500/40 flex items-center justify-center text-purple-400 mx-auto shadow-xl">
                <Lock className="w-8 h-8" />
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-950/80 border border-purple-600/40 text-purple-300 text-xs font-mono font-bold">
                <Shield className="w-3.5 h-3.5" />
                <span>RESTRICTED ACCESS • ADMIN ONLY</span>
              </div>
              <h2 className="text-2xl font-black text-white uppercase tracking-wide">
                ADMINISTRATOR LOGIN REQUIRED
              </h2>
              <p className="text-xs sm:text-sm text-neutral-400 max-w-md mx-auto leading-relaxed">
                The Admin Panel allows zero-payment direct uploads, code assignment, and regulatory oversight across both the App and Website. You must enter your administrator credentials manually to log in.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setAuthModalState({ isOpen: true, mode: 'email-check' })}
                  className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase tracking-wider transition-colors shadow-lg shadow-purple-600/30 flex items-center gap-2 mx-auto"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>Enter Admin Credentials</span>
                </button>
              </div>
            </div>
          )
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-900 bg-neutral-950 py-6 text-xs text-neutral-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            <p className="font-semibold text-neutral-300">
              CINEAD.CC • Central Board of Film Certification (CBFC) Accessibility System
            </p>
            <p className="text-[11px] text-neutral-500 mt-0.5">
              Rights of Persons with Disabilities Act (2016) • Statutory Audio Description &amp; Closed Captions Delivery
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 font-mono text-[11px] text-neutral-400">
            <button
              onClick={() => setIsDomainModalOpen(true)}
              className="text-emerald-400 hover:text-emerald-300 hover:underline flex items-center gap-1.5 font-bold"
              title="Real-time sync active: Website (cinead.cc) and App are synchronized in real time"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Sync: Web &amp; App Linked</span>
            </button>
            <span>•</span>
            <button
              onClick={() => setIsDomainModalOpen(true)}
              className="text-amber-400 hover:text-amber-300 hover:underline flex items-center gap-1 font-bold"
            >
              <span>Domain: cinead.cc</span>
            </button>
            <span>•</span>
            <span>Fee: ₹15,000 INR</span>
            <span>•</span>
            <button
              onClick={() => setIsDriveModalOpen(true)}
              className="text-emerald-400 hover:text-emerald-300 hover:underline"
            >
              Google Drive DB
            </button>
            <span>•</span>
            <button
              onClick={() => setIsApiDocsOpen(true)}
              className="text-neutral-400 hover:text-white hover:underline"
            >
              API Docs
            </button>
          </div>
        </div>
      </footer>

      {/* MODALS */}
      {authModalState.isOpen && (
        <AuthModal
          initialMode={authModalState.mode}
          initialEmail={authModalState.initialEmail}
          onClose={() => setAuthModalState({ isOpen: false, mode: 'email-check' })}
          onSuccess={(user) => {
            setCurrentUser(user);
            setActiveTab(user.role === 'dcp_studio' ? 'screening-lab' : 'my-films');
            loadMyFilms();
          }}
        />
      )}

      {paymentModalFilm && (
        <PaymentModal
          film={paymentModalFilm}
          onClose={() => setPaymentModalFilm(null)}
          onPaymentSuccess={(_payment, _code) => {
            loadMyFilms();
            setGalleryRefreshTrigger((prev) => prev + 1);
          }}
        />
      )}

      {isApiDocsOpen && (
        <ApiIntegrationModal onClose={() => setIsApiDocsOpen(false)} />
      )}

      {isDriveModalOpen && (
        <GoogleDriveDatabaseModal
          films={myFilms}
          currentUser={currentUser}
          onClose={() => setIsDriveModalOpen(false)}
        />
      )}

      {isDomainModalOpen && (
        <DomainModal onClose={() => setIsDomainModalOpen(false)} />
      )}

      {mediaUploadModalState.isOpen && (
        <MediaUploadModal
          initialType={mediaUploadModalState.initialType}
          onClose={() => setMediaUploadModalState({ isOpen: false, initialType: 'AD' })}
          onTrackUploaded={(_track) => {
            setMediaUploadModalState({ isOpen: false, initialType: 'AD' });
            if (activeTab !== 'upload' && activeTab !== 'upload-dcp') {
              setActiveTab('upload');
            }
          }}
        />
      )}

      {/* SECURE CINEMA PLAYER OVERLAY (Sections #23, #24, #25, #26, #30) */}
      {playbackSession && (
        <SecurePlayer
          film={playbackSession.film}
          sessionToken={playbackSession.sessionToken}
          watermark={playbackSession.watermark}
          isOfflineMode={playbackSession.sessionToken.startsWith('offline_')}
          onClose={() => setPlaybackSession(null)}
          platformMode={platformMode}
          onTogglePlatformMode={handleTogglePlatformMode}
          currentUser={currentUser}
        />
      )}
    </div>
  );
}
