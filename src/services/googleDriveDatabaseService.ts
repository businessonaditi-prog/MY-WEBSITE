import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User as FirebaseUser,
  signOut,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { Film, Payment, AuditLog } from '../types/cinemaPlatform';

// Initialize Firebase App singleton
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

// Google Auth Provider with Drive & Sheets scopes
export const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/spreadsheets',
];

const provider = new GoogleAuthProvider();
SCOPES.forEach((scope) => provider.addScope(scope));

// In-memory access token cache (Rule: never persist to localStorage)
let cachedAccessToken: string | null = null;
let isSigningIn = false;

export const initDriveAuth = (
  onAuthSuccess?: (user: FirebaseUser, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: FirebaseUser | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const signInWithGoogleDrive = async (): Promise<{
  user: FirebaseUser;
  accessToken: string;
} | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to obtain Google OAuth access token');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (err) {
    console.error('Google Sign In error:', err);
    throw err;
  } finally {
    isSigningIn = false;
  }
};

export const getDriveAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const disconnectGoogleDrive = async () => {
  await signOut(auth);
  cachedAccessToken = null;
};

// -------------------------------------------------------------
// Google Drive & Sheets Database Operations
// -------------------------------------------------------------

export interface DriveDatabaseMeta {
  folderId?: string;
  spreadsheetId?: string;
  spreadsheetUrl?: string;
  lastSyncedAt?: string;
  recordsCount?: number;
}

/**
 * Creates or updates the CINEAD.CC Master Relational Database in Google Drive / Google Sheets
 */
export async function syncDatabaseToGoogleDrive(
  films: Film[],
  payments: Payment[],
  auditLogs: AuditLog[],
  onStatusUpdate?: (status: string) => void
): Promise<DriveDatabaseMeta> {
  const token = getDriveAccessToken();
  if (!token) {
    throw new Error('Google Drive authorization required. Please sign in with Google first.');
  }

  onStatusUpdate?.('Locating or creating "CINEAD.CC Cinema Platform Database" folder in Google Drive...');

  // 1. Search for existing CINEAD.CC folder or create one
  const searchFolderRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=name='CINEAD.CC+Cinema+Platform+Database'+and+mimeType='application/vnd.google-apps.folder'+and+trashed=false&fields=files(id,name)`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  let folderId = '';
  if (searchFolderRes.ok) {
    const searchData = await searchFolderRes.json();
    if (searchData.files && searchData.files.length > 0) {
      folderId = searchData.files[0].id;
    }
  }

  if (!folderId) {
    onStatusUpdate?.('Creating dedicated database folder in Google Drive...');
    const createFolderRes = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'CINEAD.CC Cinema Platform Database',
        mimeType: 'application/vnd.google-apps.folder',
      }),
    });

    if (!createFolderRes.ok) {
      throw new Error('Failed to create CINEAD.CC folder in Google Drive');
    }
    const folderData = await createFolderRes.json();
    folderId = folderData.id;
  }

  // 2. Search for existing Spreadsheet or create a new one
  onStatusUpdate?.('Initializing CINEAD.CC Relational Database Spreadsheet...');

  const searchSheetRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=name='CINEAD_CC_Database_Master'+and+mimeType='application/vnd.google-apps.spreadsheet'+and+'${folderId}'+in+parents+and+trashed=false&fields=files(id,name,webViewLink)`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  let spreadsheetId = '';
  let spreadsheetUrl = '';

  if (searchSheetRes.ok) {
    const sheetSearchData = await searchSheetRes.json();
    if (sheetSearchData.files && sheetSearchData.files.length > 0) {
      spreadsheetId = sheetSearchData.files[0].id;
      spreadsheetUrl = sheetSearchData.files[0].webViewLink;
    }
  }

  if (!spreadsheetId) {
    onStatusUpdate?.('Creating multi-table spreadsheet: Films, Accessibility, Payments, Audit Logs...');
    const createSheetRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: {
          title: 'CINEAD_CC_Database_Master',
        },
        sheets: [
          { properties: { title: 'Films' } },
          { properties: { title: 'Payments' } },
          { properties: { title: 'Accessibility_Tracks' } },
          { properties: { title: 'Audit_Logs' } },
        ],
      }),
    });

    if (!createSheetRes.ok) {
      // Fallback: create JSON database document in Drive
      onStatusUpdate?.('Saving structured JSON database file in Google Drive...');
      const fileData = {
        platform: 'CINEAD.CC Theatrical Accessibility Platform',
        version: '2.0',
        syncedAt: new Date().toISOString(),
        films,
        payments,
        auditLogs,
      };

      const jsonBlob = new Blob([JSON.stringify(fileData, null, 2)], { type: 'application/json' });
      const metadata = {
        name: 'CINEAD_CC_Database_Export.json',
        parents: [folderId],
      };

      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', jsonBlob);

      const jsonUploadRes = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink',
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: form,
        }
      );

      const jsonResult = await jsonUploadRes.json();
      return {
        folderId,
        spreadsheetId: jsonResult.id,
        spreadsheetUrl: jsonResult.webViewLink,
        lastSyncedAt: new Date().toISOString(),
        recordsCount: films.length + payments.length + auditLogs.length,
      };
    }

    const createdSheet = await createSheetRes.json();
    spreadsheetId = createdSheet.spreadsheetId;
    spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

    // Move created sheet into the CINEAD.CC folder
    await fetch(`https://www.googleapis.com/drive/v3/files/${spreadsheetId}?addParents=${folderId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  // 3. Write / Append data rows to Sheets
  onStatusUpdate?.('Populating tables with certified film records and audit trails...');

  const filmRows = [
    ['Film ID', 'Title', 'Language', 'Director', 'Producer', 'Status', 'Payment Status', '9-Digit Code', 'CBFC Cert No', 'Created At'],
    ...films.map((f) => [
      f.id,
      f.title,
      f.languageName,
      f.director,
      f.producer,
      f.status,
      f.paymentStatus,
      f.previewCode || 'N/A',
      f.cbfcCertNo || 'Pending',
      f.createdAt,
    ]),
  ];

  const paymentRows = [
    ['Transaction ID', 'Film Title', 'Production House', 'Amount (INR)', 'Gateway', 'Status', 'Date'],
    ...payments.map((p) => [
      p.transactionId,
      p.filmTitle,
      p.productionHouseName,
      p.amount,
      p.gateway,
      p.status,
      p.createdAt,
    ]),
  ];

  const auditRows = [
    ['Log ID', 'Action', 'Target Film', 'User Email', 'Timestamp', 'IP Address'],
    ...auditLogs.slice(0, 50).map((l) => [
      l.id,
      l.action,
      l.filmTitle || 'N/A',
      l.userEmail || 'System',
      l.timestamp,
      l.ip,
    ]),
  ];

  // Update Films Sheet
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Films!A1?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values: filmRows }),
    }
  );

  // Update Payments Sheet
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Payments!A1?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values: paymentRows }),
    }
  );

  // Update Audit Logs Sheet
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Audit_Logs!A1?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values: auditRows }),
    }
  );

  onStatusUpdate?.('Database sync complete! Google Drive updated.');

  return {
    folderId,
    spreadsheetId,
    spreadsheetUrl: spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
    lastSyncedAt: new Date().toISOString(),
    recordsCount: films.length + payments.length + auditLogs.length,
  };
}
