/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Upload, ShieldCheck } from 'lucide-react';
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
import { DomainSetupModal } from './components/DomainSetupModal';
import { User, Film, Payment } from './types/cinemaPlatform';
import { api } from './services/apiClient';
import { deviceAuthService } from './services/deviceAuthService';

export default function App() {
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

  // Secure Playback State (Only active when authenticated + valid token)
  const [playbackSession, setPlaybackSession] = useState<{
    film: Film;
    sessionToken: string;
    watermark: string;
  } | null>(null);

  // User's Films Cache
  const [myFilms, setMyFilms] = useState<Film[]>([]);
  const [galleryRefreshTrigger, setGalleryRefreshTrigger] = useState<number>(0);

  // Initial session check
  useEffect(() => {
    checkCurrentUser();
  }, []);

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

    if (roleName === 'dcp_studio') {
      email = 'ops@qubedcpstudios.com';
      targetTab = 'my-films';
    } else if (roleName === 'cbfc_official') {
      email = 'cbfc.preview.mum@gov.in';
      targetTab = 'preview-code';
    } else if (roleName === 'admin') {
      email = 'admin@cbfc-accessibility.gov.in';
      targetTab = 'admin';
    } else if (roleName === 'production_house') {
      email = 'producer@vyjayanthimovies.in';
      targetTab = 'my-films';
    }

    try {
      const res = await api.login(email, '123456');
      api.setToken(res.token);
      deviceAuthService.registerDevice(res.user.email, res.user.productionHouseName, res.user.role);
      setCurrentUser(res.user);
      setActiveTab(targetTab);
      loadMyFilms();
    } catch (err) {
      console.error('Quick switch error:', err);
    }
  };

  const handleLogout = () => {
    api.setToken(null);
    setCurrentUser(null);
    setActiveTab('home');
    setPlaybackSession(null);
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

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans selection:bg-amber-500 selection:text-neutral-950 w-full max-w-full overflow-x-hidden">
      {/* Navigation */}
      <Navigation
        currentUser={currentUser}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAuth={() => setAuthModalState({ isOpen: true, mode: 'email-check' })}
        onLogout={handleLogout}
        onQuickRoleSwitch={handleQuickRoleSwitch}
        onOpenApiDocs={() => setIsApiDocsOpen(true)}
        onOpenDriveDatabase={() => setIsDriveModalOpen(true)}
        onOpenDomainSetup={() => setIsDomainModalOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-6 overflow-x-hidden">
        {/* TAB 1: HOME LANDING PAGE (Section #3) */}
        {activeTab === 'home' && (
          <LandingPage
            onRegisterProductionHouse={() => setAuthModalState({ isOpen: true, mode: 'email-check' })}
            onBrowseFilms={() => setActiveTab('gallery')}
            onDcpStudioLogin={() => handleQuickRoleSwitch('dcp_studio')}
            onSelectFilmForPreviewWithCode={handleVerifyCodePlayback}
            onOwnerWatchFilm={handleOwnerWatchFilm}
            onOpenAuth={() => setAuthModalState({ isOpen: true, mode: 'email-check' })}
            onOpenDomainSetup={() => setIsDomainModalOpen(true)}
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

        {/* TAB 5: MY FILMS (Section #22, #35) */}
        {activeTab === 'my-films' && (
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

        {/* TAB 7: PAYMENTS HISTORY (Section #34) */}
        {activeTab === 'payments' && <PaymentHistoryView />}

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

        {/* TAB 9: ADMIN PANEL (Section #36, #58) */}
        {activeTab === 'admin' && (
          <AdminPanel
            currentUser={currentUser}
            onLoginAsAdmin={() => handleQuickRoleSwitch('admin')}
            onOpenAuth={() => setAuthModalState({ isOpen: true, mode: 'email-check' })}
            onOpenDomainSetup={() => setIsDomainModalOpen(true)}
          />
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
              className="text-amber-400 hover:text-amber-300 hover:underline flex items-center gap-1 font-bold"
            >
              <span>Domain: www.cinead.cc</span>
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
          onClose={() => setIsDriveModalOpen(false)}
        />
      )}

      {isDomainModalOpen && (
        <DomainSetupModal onClose={() => setIsDomainModalOpen(false)} />
      )}

      {/* SECURE CINEMA PLAYER OVERLAY (Sections #23, #24, #25, #26, #30) */}
      {playbackSession && (
        <SecurePlayer
          film={playbackSession.film}
          sessionToken={playbackSession.sessionToken}
          watermark={playbackSession.watermark}
          isOfflineMode={playbackSession.sessionToken.startsWith('offline_')}
          onClose={() => setPlaybackSession(null)}
        />
      )}
    </div>
  );
}
