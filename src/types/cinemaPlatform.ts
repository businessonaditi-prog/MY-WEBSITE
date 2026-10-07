export type UserRole = 'production_house' | 'dcp_studio' | 'cbfc_official' | 'admin' | 'guest';

export interface User {
  id: string;
  productionHouseName: string;
  email: string;
  mobile: string;
  role: UserRole;
  emailVerified: boolean;
  mobileVerified: boolean;
  createdAt: string;
  code?: string;
  registeredDevices?: string[];
}

export interface IndianLanguage {
  code: string;
  name: string;
  native: string;
}

export type FilmStatus = 'draft' | 'uploading' | 'uploaded' | 'processing' | 'ready' | 'suspended';
export type PaymentStatus = 'pending' | 'processing' | 'successful' | 'failed' | 'refunded';
export type PreviewStatus = 'locked' | 'available' | 'suspended' | 'expired';

export interface AccessibilityTrack {
  id: string;
  filmId: string;
  type: 'CC' | 'AD';
  languageCode: string;
  languageName: string;
  fileUrl: string;
  fileName: string;
  format: string; // SRT, VTT, TTML, MP3, WAV, AAC
  version: string;
  status: 'valid' | 'invalid' | 'processing';
  cues?: Array<{
    id: string;
    startTime: number;
    endTime: number;
    text: string;
    speaker?: string;
    soundEffect?: string;
  }>;
}

export interface Film {
  id: string;
  userId: string;
  productionHouseName: string;
  submissionType: 'film' | 'dcp';
  title: string;
  languageCode: string;
  languageName: string;
  director: string;
  producer: string;
  cinematographer?: string;
  editor?: string;
  musicDirector?: string;
  writer?: string;
  soundDesigner?: string;
  description: string;
  posterUrl: string; // Mandatory
  videoFileUrl: string; // Protected URL
  videoFileName: string;
  videoFileSize: string;
  isDcp: boolean;
  dcpPackageName?: string;
  status: FilmStatus;
  paymentStatus: PaymentStatus;
  previewStatus: PreviewStatus;
  previewCode?: string; // 9-digit code (only visible to owner/admin, never public)
  previewCodeHash?: string;
  cbfcCertNo?: string;
  durationMinutes: number;
  uploadedCcTracks: AccessibilityTrack[];
  uploadedAdTracks: AccessibilityTrack[];
  availableCcLanguages?: Array<{ code: string; name: string }>;
  availableAdLanguages?: Array<{ code: string; name: string }>;
  isDownloadedOffline?: boolean;
  offlineDownloadProgress?: number;
  offlinePackageSize?: string;
  offlineEncryptedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  filmId: string;
  filmTitle: string;
  userId: string;
  productionHouseName: string;
  amount: number; // Min 15000 INR
  currency: 'INR';
  transactionId: string;
  gateway: 'UPI' | 'Debit Card' | 'Credit Card' | 'Net Banking';
  status: PaymentStatus;
  previewCodeGenerated?: string;
  createdAt: string;
}

export interface PreviewCodeRecord {
  id: string;
  filmId: string;
  filmTitle: string;
  code: string; // Exactly 9 digits
  codeHash: string;
  status: 'active' | 'used' | 'revoked' | 'locked';
  attemptsCount: number;
  maxAttempts: number;
  generatedAt: string;
  expiresAt: string;
  lastUsedAt?: string;
  lastUsedBy?: string;
}

export interface PlaybackSession {
  sessionToken: string;
  filmId: string;
  userId?: string;
  userRole?: UserRole;
  accessType: 'OWNER' | 'CBFC_CODE';
  expiresAt: string;
  watermark: string;
}

export interface AuditLog {
  id: string;
  userId?: string;
  userEmail?: string;
  filmId?: string;
  filmTitle?: string;
  action: string;
  ip: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
}
