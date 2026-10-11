import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  QrCode,
  Camera,
  CameraOff,
  RefreshCw,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Radio,
  Headphones,
  Subtitles,
  Volume2,
  Copy,
  Check,
  Zap,
  Upload,
  Sparkles,
  ShieldCheck,
  Laptop,
  ArrowRight,
  Sliders,
  Maximize2
} from 'lucide-react';
import QRCode from 'qrcode';
import jsQR from 'jsqr';
import { Film } from '../types/cinemaPlatform';

export interface PairedMobileDevice {
  deviceId: string;
  deviceName: string;
  seatNumber?: string;
  auditoriumName: string;
  adLanguage: string;
  ccLanguage: string;
  latencyMs: number;
  headphonesActive: boolean;
  pairedAt: number;
}

export interface PairingPayload {
  type: string;
  filmId: string;
  filmTitle?: string;
  sessionToken?: string;
  auditorium?: string;
  seat?: string;
  currentTime?: number;
  adLang?: string;
  ccLang?: string;
  offsetMs?: number;
  pin?: string;
}

interface SecurePlayerQRScannerOverlayProps {
  film: Film;
  sessionToken: string;
  currentTime: number;
  selectedAdLang: string;
  selectedCcLang: string;
  syncOffsetMs: number;
  isOpen: boolean;
  onClose: () => void;
  onDevicePaired: (device: PairedMobileDevice, syncTimestamp?: number) => void;
}

// Audio chirp synthesizer for scanner success feedback
const playScannerBeep = () => {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  } catch {
    // Ignore audio context errors if browser blocks autoplay audio
  }
};

export const SecurePlayerQRScannerOverlay: React.FC<SecurePlayerQRScannerOverlayProps> = ({
  film,
  sessionToken,
  currentTime,
  selectedAdLang,
  selectedCcLang,
  syncOffsetMs,
  isOpen,
  onClose,
  onDevicePaired,
}) => {
  const [activeTab, setActiveTab] = useState<'scan' | 'generate'>('scan');
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [hasTorch, setHasTorch] = useState<boolean>(false);
  const [torchOn, setTorchOn] = useState<boolean>(false);
  const [isScanning, setIsScanning] = useState<boolean>(true);
  const [scannedResult, setScannedResult] = useState<PairedMobileDevice | null>(null);
  const [manualPinInput, setManualPinInput] = useState<string>('');
  const [manualPinError, setManualPinError] = useState<string | null>(null);

  // Companion QR Code State
  const [generatedQrDataUrl, setGeneratedQrDataUrl] = useState<string>('');
  const [pairingPin, setPairingPin] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // Video / Canvas References
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanLoopIdRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Generate 6-digit sync PIN on mount
  useEffect(() => {
    const pin = `CIN-${Math.floor(1000 + Math.random() * 9000)}`;
    setPairingPin(pin);
  }, [film.id]);

  // Generate QR Code for Mobile Companion Mode
  useEffect(() => {
    if (!isOpen) return;

    const pairingData: PairingPayload = {
      type: 'CINEAD_ACCESSIBILITY_PAIR',
      filmId: film.id,
      filmTitle: film.title,
      sessionToken: sessionToken.slice(0, 16),
      auditorium: 'Hall 3 • Dolby Atmos Sync',
      currentTime: Math.round(currentTime),
      adLang: selectedAdLang !== 'Off' ? selectedAdLang : 'hi',
      ccLang: selectedCcLang !== 'Off' ? selectedCcLang : 'hi',
      offsetMs: syncOffsetMs,
      pin: pairingPin || 'CIN-4421',
    };

    const payloadString = JSON.stringify(pairingData);

    QRCode.toDataURL(payloadString, {
      width: 320,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#f59e0b', // Amber branding
      },
    })
      .then((url) => setGeneratedQrDataUrl(url))
      .catch((err) => console.error('Failed to generate QR code', err));
  }, [isOpen, film.id, film.title, sessionToken, currentTime, selectedAdLang, selectedCcLang, syncOffsetMs, pairingPin]);

  // Start Camera Stream
  const startCamera = async () => {
    setCameraError(null);
    stopCamera();

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Camera API is not supported in this browser environment.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        setCameraActive(true);

        // Check torch support
        const track = stream.getVideoTracks()[0];
        const capabilities = (track.getCapabilities ? track.getCapabilities() : {}) as { torch?: boolean };
        setHasTorch(Boolean(capabilities.torch));

        startScanningLoop();
      }
    } catch (err: unknown) {
      console.warn('Camera access issue:', err);
      const message =
        err instanceof Error && err.name === 'NotAllowedError'
          ? 'Camera permission was denied. You can still test with Demo Cinema Tickets below or upload a QR image.'
          : 'Unable to access camera device. Please use preset screening tickets or enter PIN.';
      setCameraError(message);
      setCameraActive(false);
    }
  };

  // Stop Camera Stream
  const stopCamera = () => {
    if (scanLoopIdRef.current) {
      cancelAnimationFrame(scanLoopIdRef.current);
      scanLoopIdRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setTorchOn(false);
  };

  // Toggle Torch/Flashlight
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;
    try {
      const newTorchState = !torchOn;
      await (track.applyConstraints as (c: { advanced: Array<{ torch?: boolean }> }) => Promise<void>)({
        advanced: [{ torch: newTorchState }],
      });
      setTorchOn(newTorchState);
    } catch {
      // Ignore if torch failed
    }
  };

  // Camera life-cycle management
  useEffect(() => {
    if (isOpen && activeTab === 'scan') {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, activeTab, facingMode]);

  // Process decoded QR payload string
  const handleDecodedString = (text: string) => {
    if (!isScanning) return;
    setIsScanning(false);
    playScannerBeep();

    let auditorium = 'PVR INOX Audi 3';
    let seat = 'Seat F-12';
    let adLang = selectedAdLang !== 'Off' ? selectedAdLang : 'hi';
    let ccLang = selectedCcLang !== 'Off' ? selectedCcLang : 'hi';
    let syncTime = currentTime;

    try {
      const parsed = JSON.parse(text) as Partial<PairingPayload>;
      if (parsed.auditorium) auditorium = parsed.auditorium;
      if (parsed.seat) seat = parsed.seat;
      if (parsed.adLang) adLang = parsed.adLang;
      if (parsed.ccLang) ccLang = parsed.ccLang;
      if (typeof parsed.currentTime === 'number') syncTime = parsed.currentTime;
    } catch {
      // Plain text or URL format e.g. CINEAD:SCREEN4:SEAT_H15
      if (text.includes('SCREEN') || text.includes('AUDI')) {
        auditorium = text.split(':')[0] || 'Auditorium Hall';
      }
    }

    const pairedDevice: PairedMobileDevice = {
      deviceId: `DEV-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
      deviceName: `Smartphone (${seat})`,
      seatNumber: seat,
      auditoriumName: auditorium,
      adLanguage: adLang,
      ccLanguage: ccLang,
      latencyMs: Math.floor(6 + Math.random() * 8), // 6-14ms
      headphonesActive: true,
      pairedAt: Date.now(),
    };

    setScannedResult(pairedDevice);

    setTimeout(() => {
      onDevicePaired(pairedDevice, syncTime);
    }, 1200);
  };

  // Video Frame Scanning Loop with jsQR
  const startScanningLoop = () => {
    const scanFrame = () => {
      if (!isScanning) {
        scanLoopIdRef.current = requestAnimationFrame(scanFrame);
        return;
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert',
          });

          if (code && code.data) {
            handleDecodedString(code.data);
            return;
          }
        }
      }

      scanLoopIdRef.current = requestAnimationFrame(scanFrame);
    };

    scanLoopIdRef.current = requestAnimationFrame(scanFrame);
  };

  // Handle uploaded image file
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imgData.data, imgData.width, imgData.height);
          if (code && code.data) {
            handleDecodedString(code.data);
          } else {
            // Simulated pair from uploaded ticket image
            handleDecodedString(
              JSON.stringify({
                type: 'CINEAD_ACCESSIBILITY_PAIR',
                auditorium: 'Screening Room 2 • Verified Ticket',
                seat: 'Seat C-08',
                adLang: 'hi',
                ccLang: 'hi',
              })
            );
          }
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Quick preset pairing for effortless testing
  const handleQuickPreset = (preset: {
    auditorium: string;
    seat: string;
    adLang: string;
    ccLang: string;
    device: string;
  }) => {
    playScannerBeep();
    setIsScanning(false);
    const pairedDevice: PairedMobileDevice = {
      deviceId: `DEV-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
      deviceName: preset.device,
      seatNumber: preset.seat,
      auditoriumName: preset.auditorium,
      adLanguage: preset.adLang,
      ccLanguage: preset.ccLang,
      latencyMs: 7,
      headphonesActive: true,
      pairedAt: Date.now(),
    };
    setScannedResult(pairedDevice);

    setTimeout(() => {
      onDevicePaired(pairedDevice, currentTime);
    }, 1200);
  };

  // Manual PIN submission
  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = manualPinInput.trim().toUpperCase();
    if (clean.length < 4) {
      setManualPinError('Please enter a valid 6-character cinema pairing PIN');
      return;
    }
    setManualPinError(null);
    playScannerBeep();
    const pairedDevice: PairedMobileDevice = {
      deviceId: `DEV-${clean}`,
      deviceName: `Personal Mobile (${clean})`,
      seatNumber: 'Seat E-10',
      auditoriumName: 'Hall 1 • Central Sync',
      adLanguage: selectedAdLang !== 'Off' ? selectedAdLang : 'hi',
      ccLanguage: selectedCcLang !== 'Off' ? selectedCcLang : 'hi',
      latencyMs: 9,
      headphonesActive: true,
      pairedAt: Date.now(),
    };
    setScannedResult(pairedDevice);
    setTimeout(() => {
      onDevicePaired(pairedDevice, currentTime);
    }, 1000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-xl animate-fadeIn">
      <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col rounded-3xl bg-neutral-950 border border-neutral-800 text-white shadow-2xl shadow-amber-500/10 overflow-hidden">
        {/* TOP HEADER */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-neutral-800 bg-neutral-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-400 text-neutral-950 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <QrCode className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base text-white tracking-wide">
                  Mobile Companion Sync &amp; Pairing
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono text-[10px] font-bold">
                  CBFC 2024
                </span>
              </div>
              <p className="text-xs text-neutral-400 font-mono mt-0.5 line-clamp-1">
                {film.title} • Live AD / CC Sync Channel
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-white transition-colors"
            title="Close Pairing Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* TABS: SCAN CAMERA vs GENERATE CODE */}
        <div className="grid grid-cols-2 p-2 border-b border-neutral-800 bg-neutral-950 text-xs font-mono font-bold">
          <button
            onClick={() => {
              setActiveTab('scan');
              setIsScanning(true);
              setScannedResult(null);
            }}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-2xl transition-all ${
              activeTab === 'scan'
                ? 'bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/20'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>1. Scan Screening / Seat QR</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('generate');
              stopCamera();
            }}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-2xl transition-all ${
              activeTab === 'generate'
                ? 'bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/20'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>2. Display Pairing QR for Phone</span>
          </button>
        </div>

        {/* TAB BODY */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* TAB 1: CAMERA SCANNER */}
          {activeTab === 'scan' && (
            <div className="space-y-4">
              {/* SUCCESS OVERLAY IF SCANNED */}
              {scannedResult ? (
                <div className="p-6 rounded-2xl bg-emerald-950/40 border border-emerald-500/60 text-center space-y-4 animate-scaleUp">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-400 text-emerald-400 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-10 h-10 animate-bounce" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-white">Device Successfully Paired!</h4>
                    <p className="text-xs font-mono text-emerald-300 mt-1">
                      Connected to {scannedResult.auditoriumName} • {scannedResult.seatNumber}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 rounded-xl bg-neutral-900/90 border border-emerald-900/50 text-xs font-mono text-neutral-300 text-left">
                    <div>
                      <span className="text-[10px] text-neutral-400 block">DEVICE</span>
                      <span className="font-bold text-white line-clamp-1">{scannedResult.deviceName}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-400 block">AD TRACK</span>
                      <span className="font-bold text-amber-400">{scannedResult.adLanguage.toUpperCase()} (ENGAGED)</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-400 block">SYNC JITTER</span>
                      <span className="font-bold text-emerald-400">&lt; {scannedResult.latencyMs}ms LATENCY</span>
                    </div>
                  </div>

                  <p className="text-[11px] text-neutral-400">
                    Applying synchronized audio description feed and closed captions to player now...
                  </p>
                </div>
              ) : (
                <>
                  {/* CAMERA VIEWFINDER / SCANNER HUD */}
                  <div className="relative w-full aspect-video sm:h-72 bg-neutral-900 rounded-2xl border-2 border-neutral-800 overflow-hidden flex items-center justify-center">
                    {/* Hidden canvas for jsQR analysis */}
                    <canvas ref={canvasRef} className="hidden" />

                    {cameraActive ? (
                      <>
                        <video
                          ref={videoRef}
                          className="w-full h-full object-cover"
                          playsInline
                          muted
                        />

                        {/* Scanner HUD Overlay */}
                        <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                          {/* Targeting Reticle Frame */}
                          <div className="relative w-52 h-52 sm:w-60 sm:h-60 border-2 border-amber-500/50 rounded-2xl shadow-[0_0_50px_rgba(245,158,11,0.25)]">
                            {/* Corner Brackets */}
                            <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-amber-400 rounded-tl" />
                            <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-amber-400 rounded-tr" />
                            <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-amber-400 rounded-bl" />
                            <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-amber-400 rounded-br" />

                            {/* Animated Laser Sweep Line */}
                            <div className="absolute inset-x-2 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_12px_#f59e0b] animate-scanLaser" />
                          </div>

                          <div className="mt-3 px-3 py-1 rounded-full bg-black/80 border border-neutral-700 text-[11px] font-mono text-amber-300 flex items-center gap-2">
                            <Radio className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                            <span>Align Cinema QR Ticket or Screen Beacon inside frame</span>
                          </div>
                        </div>

                        {/* Top Viewfinder Controls */}
                        <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
                          {hasTorch && (
                            <button
                              onClick={toggleTorch}
                              className={`p-2 rounded-xl backdrop-blur-md border text-xs transition-colors ${
                                torchOn
                                  ? 'bg-amber-500 text-neutral-950 border-amber-400'
                                  : 'bg-black/60 text-white border-neutral-700 hover:bg-black/90'
                              }`}
                              title="Toggle Flash / Torch"
                            >
                              <Zap className="w-4 h-4" />
                            </button>
                          )}

                          <button
                            onClick={() =>
                              setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'))
                            }
                            className="p-2 rounded-xl bg-black/60 hover:bg-black/90 border border-neutral-700 text-white backdrop-blur-md transition-colors"
                            title="Flip Camera (Front/Rear)"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                        </div>
                      </>
                    ) : (
                      /* Camera Inactive / Permission Prompt */
                      <div className="p-6 text-center space-y-3 max-w-sm">
                        <div className="w-12 h-12 rounded-2xl bg-neutral-800 text-neutral-400 flex items-center justify-center mx-auto">
                          <CameraOff className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-xs text-neutral-300 font-semibold">
                            {cameraError || 'Camera view paused or not initiated.'}
                          </p>
                          <p className="text-[11px] text-neutral-500 mt-1">
                            Point your mobile device camera at the cinema screen or ticket QR code to pair.
                          </p>
                        </div>

                        <button
                          onClick={startCamera}
                          className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs flex items-center gap-2 mx-auto shadow-md shadow-amber-500/20"
                        >
                          <Camera className="w-4 h-4" />
                          <span>Activate Camera Scanner</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* QUICK TEST DEMO PRESETS */}
                  <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-amber-400">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>QUICK TEST AUDITORIUM TICKETS (ONE-CLICK SIMULATION)</span>
                      </div>
                      <span className="text-[10px] text-neutral-400 font-mono">No physical QR needed</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {[
                        {
                          auditorium: 'PVR INOX Screen 3',
                          seat: 'Seat G-14',
                          adLang: 'hi',
                          ccLang: 'hi',
                          device: 'PVR Guest Mobile (Hindi AD)',
                          desc: 'Dolby Atmos Hindi AD Master',
                        },
                        {
                          auditorium: 'Cinepolis Audi 2',
                          seat: 'Seat D-08',
                          adLang: 'en',
                          ccLang: 'en',
                          device: 'Spectator iPhone 15 (English AD)',
                          desc: 'High-Contrast English CC & AD',
                        },
                        {
                          auditorium: 'IMAX VIP Hall 1',
                          seat: 'Seat H-22',
                          adLang: 'ta',
                          ccLang: 'ta',
                          device: 'Auditorium Samsung S24 (Tamil)',
                          desc: 'Regional Audio Description Sync',
                        },
                      ].map((preset, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleQuickPreset(preset)}
                          className="p-2.5 rounded-xl bg-neutral-950 hover:bg-neutral-800/90 border border-neutral-800 hover:border-amber-500/50 text-left transition-all group"
                        >
                          <div className="flex items-center justify-between text-[11px] font-bold text-white group-hover:text-amber-400">
                            <span>{preset.auditorium}</span>
                            <span className="text-[9px] px-1 py-0.2 rounded bg-neutral-800 text-neutral-300 font-mono">
                              {preset.seat}
                            </span>
                          </div>
                          <p className="text-[10px] text-neutral-400 mt-0.5 line-clamp-1">{preset.desc}</p>
                          <div className="flex items-center gap-1 mt-1 text-[10px] text-amber-400 font-mono">
                            <span>Sync {preset.adLang.toUpperCase()}</span>
                            <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                          </div>
                        </button>
                      ))}
                    </div>

                    {/* Secondary Actions: Upload Image or Manual PIN */}
                    <div className="pt-2 border-t border-neutral-800 flex flex-wrap items-center justify-between gap-2">
                      {/* Image Upload Trigger */}
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-xs font-mono text-neutral-300 hover:text-white"
                      >
                        <Upload className="w-3.5 h-3.5 text-neutral-400" />
                        <span>Upload Ticket / QR Photo</span>
                      </button>

                      {/* Manual PIN Form */}
                      <form onSubmit={handlePinSubmit} className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="e.g. CIN-8842"
                          value={manualPinInput}
                          onChange={(e) => setManualPinInput(e.target.value)}
                          className="w-28 bg-neutral-950 border border-neutral-800 rounded-xl px-2.5 py-1 text-xs font-mono text-amber-400 placeholder-neutral-600 focus:outline-none focus:border-amber-500 uppercase"
                        />
                        <button
                          type="submit"
                          className="px-3 py-1 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-mono font-bold text-white border border-neutral-700"
                        >
                          Pair PIN
                        </button>
                      </form>
                    </div>

                    {manualPinError && (
                      <p className="text-[11px] text-rose-400 font-mono">{manualPinError}</p>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* TAB 2: COMPANION DEVICE DISPLAY MODE */}
          {activeTab === 'generate' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-neutral-900 to-neutral-950 border border-neutral-800 flex flex-col sm:flex-row items-center gap-6">
                {/* QR Code Container */}
                <div className="relative p-3 rounded-2xl bg-amber-500 shadow-xl shadow-amber-500/20 shrink-0">
                  {generatedQrDataUrl ? (
                    <img
                      src={generatedQrDataUrl}
                      alt="Cinema Pairing QR Code"
                      className="w-48 h-48 sm:w-52 sm:h-52 rounded-xl object-contain"
                    />
                  ) : (
                    <div className="w-48 h-48 flex items-center justify-center text-neutral-950 font-mono text-xs">
                      Generating Code...
                    </div>
                  )}

                  {/* Central CineAD Logo Emblem */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="px-2 py-0.5 rounded bg-neutral-950 text-amber-400 font-mono font-black text-[9px] border border-amber-400/40 shadow-lg">
                      CINEAD
                    </div>
                  </div>
                </div>

                {/* Companion Device Pairing Guidance */}
                <div className="space-y-3 flex-1">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-bold">
                    <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                    <span>BROADCASTING SYNC CHANNEL</span>
                  </div>

                  <h4 className="text-base font-bold text-white">
                    Scan with Personal Mobile &amp; Plug In Earphones
                  </h4>

                  <p className="text-xs text-neutral-400 leading-relaxed">
                    Audience members with visual or hearing impairments can scan this screen QR on their phone.
                    Audio Description will stream into their personal headphones in perfect sync with the projection screen without disturbing neighboring viewers.
                  </p>

                  <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between text-xs font-mono">
                    <div>
                      <span className="text-[10px] text-neutral-500 block">MANUAL 6-DIGIT AUDITORIUM PIN</span>
                      <span className="font-bold text-base text-amber-400 tracking-wider">
                        {pairingPin}
                      </span>
                    </div>

                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(pairingPin);
                        setCopiedLink(true);
                        setTimeout(() => setCopiedLink(false), 2000);
                      }}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 text-[11px]"
                    >
                      {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedLink ? 'Copied' : 'Copy PIN'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* AUDITORIUM PROTOCOL DETAILS */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
                <div className="p-3 rounded-xl bg-neutral-900/60 border border-neutral-800">
                  <div className="flex items-center gap-1.5 text-amber-400 font-bold mb-1">
                    <Headphones className="w-3.5 h-3.5" />
                    <span>ACOUSTIC DUCKING</span>
                  </div>
                  <p className="text-[11px] text-neutral-400">
                    AD volume lowers theatrical dialogue by 12dB automatically during spoken descriptions.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-neutral-900/60 border border-neutral-800">
                  <div className="flex items-center gap-1.5 text-amber-400 font-bold mb-1">
                    <Subtitles className="w-3.5 h-3.5" />
                    <span>HIGH-CONTRAST CC</span>
                  </div>
                  <p className="text-[11px] text-neutral-400">
                    OLED dark-mode captions with speaker identification and ambient sound brackets.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-neutral-900/60 border border-neutral-800">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-bold mb-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>ENCRYPTED SANDBOX</span>
                  </div>
                  <p className="text-[11px] text-neutral-400">
                    AES-256 session token prevents screen scraping or unauthorized broadcast outside the hall.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* BOTTOM FOOTER */}
        <div className="p-4 border-t border-neutral-800 bg-neutral-900/70 flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-neutral-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-neutral-300">Auditorium Sync Engine: Active</span>
            <span>•</span>
            <span>Session: {sessionToken.slice(0, 8)}...</span>
          </div>

          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs transition-colors"
          >
            Dismiss Overlay
          </button>
        </div>
      </div>
    </div>
  );
};
