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

// Target Google Drive account
export const TARGET_DRIVE_ACCOUNT = 'businessonaditi@gmail.com';
export const MAX_VIDEO_SIZE_BYTES = 10 * 1024 * 1024 * 1024; // 10 GB (Strict requirement)

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
  // Requirement #4: Collect all information of each film with video, ad and cc link of each film in a single row,
  // with name, number, email and all details provided during registration and upload with date and serial number.
  onStatusUpdate?.('Populating single-row master tracking database with full contact info, video links, AD & CC tracks...');

  const originUrl = typeof window !== 'undefined' ? window.location.origin : 'https://cinead.cc';

  const filmHeaderRow = [
    'S.No',
    'Upload Date & Time',
    'Registrant / Submitter Name',
    'Contact Mobile Number',
    'Registered Email Address',
    'Production House / Studio',
    'Film Title',
    'Submission Type',
    'Language',
    'Duration',
    'Director',
    'Producer',
    'Cinematographer',
    'Editor',
    'Music Director',
    'CBFC Certificate No',
    '9-Digit Preview Code',
    'Payment Status',
    'Video File Name',
    'Video File Size (Max 10GB)',
    'Video Direct Link (Drive / Stream)',
    'AD Link (Audio Description)',
    'AD Language & Track Info',
    'CC Link (Closed Captions)',
    'CC Language & Track Info',
    'Google Drive Account',
    'Google Drive File ID',
    'Poster Artwork Link',
    'Compliance Status',
    'Film Description / Synopsis',
  ];

  const filmRows = [
    filmHeaderRow,
    ...films.map((f, index) => {
      const serialNum = index + 1;
      const uploadDate = f.createdAt ? new Date(f.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : new Date().toLocaleString();
      const registrantName = f.submitterName || f.producer || f.productionHouseName || 'Registered Producer';
      const contactMobile = f.submitterMobile || '+919876500000';
      const registeredEmail = f.submitterEmail || 'producer@vyjayanthimovies.in';
      const entity = f.productionHouseName || 'Vyjayanthi Movies';
      const subType = f.submissionType === 'dcp' ? 'DCP DCI Package' : 'Theatrical Feature Film';

      // Direct Video Link (Google Drive web view link or direct streaming proxy)
      const videoLink = f.driveWebViewLink || (f.driveFileId ? `https://drive.google.com/file/d/${f.driveFileId}/view?usp=sharing` : (f.videoFileUrl?.startsWith('http') ? f.videoFileUrl : `${originUrl}${f.videoFileUrl}`));

      // Primary Audio Description (AD) track link
      const adTrack = f.uploadedAdTracks?.[0];
      const adLink = adTrack?.driveUrl || (adTrack?.fileUrl?.startsWith('http') ? adTrack.fileUrl : (adTrack?.fileUrl ? `${originUrl}${adTrack.fileUrl}` : 'N/A'));
      const adInfo = adTrack ? `${adTrack.languageName || adTrack.languageCode} [${adTrack.format || 'MP3'}]` : 'None';

      // Primary Closed Caption (CC) track link
      const ccTrack = f.uploadedCcTracks?.[0];
      const ccLink = ccTrack?.driveUrl || (ccTrack?.fileUrl?.startsWith('http') ? ccTrack.fileUrl : (ccTrack?.fileUrl ? `${originUrl}${ccTrack.fileUrl}` : 'N/A'));
      const ccInfo = ccTrack ? `${ccTrack.languageName || ccTrack.languageCode} [${ccTrack.format || 'VTT'}]` : 'None';

      const driveAccount = f.driveAccountEmail || TARGET_DRIVE_ACCOUNT;

      return [
        serialNum,
        uploadDate,
        registrantName,
        contactMobile,
        registeredEmail,
        entity,
        f.title,
        subType,
        f.languageName,
        `${f.durationMinutes || 120} Mins`,
        f.director,
        f.producer,
        f.cinematographer || 'N/A',
        f.editor || 'N/A',
        f.musicDirector || 'N/A',
        f.cbfcCertNo || 'Pending Statutory Review',
        f.previewCode || 'Locked (Payment Required)',
        f.paymentStatus === 'successful' ? 'Paid (Verified ₹15,000+)' : 'Payment Pending',
        f.videoFileName || 'N/A',
        f.videoFileSize || 'N/A',
        videoLink,
        adLink,
        adInfo,
        ccLink,
        ccInfo,
        driveAccount,
        f.driveFileId || 'N/A',
        f.posterUrl || 'N/A',
        f.status || 'ready',
        f.description || 'N/A',
      ];
    }),
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

// -------------------------------------------------------------
// Google Drive Direct Upload & Streaming Pipeline
// Linked to businessonaditi@gmail.com
// -------------------------------------------------------------

export interface DriveUploadProgress {
  percent: number;
  uploadedBytes: number;
  totalBytes: number;
  status: string;
}

export interface DriveUploadResult {
  fileId: string;
  name: string;
  size: number;
  mimeType: string;
  webViewLink: string;
  webContentLink: string;
  streamUrl: string;
  folderId: string;
  accountEmail: string;
}

/**
 * Ensures or creates the CINEAD.CC Vault folder in Google Drive
 */
export async function getOrCreateVaultFolder(
  folderName = 'CINEAD_CC_Vault_businessonaditi'
): Promise<string> {
  const token = getDriveAccessToken();
  if (!token) {
    throw new Error('Google Drive authorization required. Please sign in with Google first.');
  }

  // 1. Search existing folder
  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=name='${encodeURIComponent(folderName)}'+and+mimeType='application/vnd.google-apps.folder'+and+trashed=false&fields=files(id,name)`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (searchRes.ok) {
    const data = await searchRes.json();
    if (data.files && data.files.length > 0) {
      return data.files[0].id;
    }
  }

  // 2. Create folder if not found
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      description: `CINEAD.CC Theatrical Master Vault for ${TARGET_DRIVE_ACCOUNT}`,
    }),
  });

  if (!createRes.ok) {
    throw new Error(`Failed to initialize folder in Google Drive (${TARGET_DRIVE_ACCOUNT}).`);
  }

  const createdData = await createRes.json();
  return createdData.id;
}

/**
 * Grants read permission so video stream can sync smoothly to the player
 */
export async function makeDriveFileReadable(fileId: string): Promise<void> {
  const token = getDriveAccessToken();
  if (!token) return;

  try {
    await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        role: 'reader',
        type: 'anyone',
      }),
    });
  } catch (err) {
    console.warn('Could not set public read permission on Drive file:', err);
  }
}

/**
 * Uploads a file (video, poster, CC subtitle, or AD audio) to Google Drive.
 * Enforces the strict rule: "video should not be more then 10GB".
 * Uses resumable chunk upload for large files up to 10GB with real-time progress.
 */
export async function uploadFileToGoogleDrive(
  file: File | Blob,
  fileName: string,
  onProgress?: (progress: DriveUploadProgress) => void,
  targetFolderName = 'CINEAD_CC_Vault_businessonaditi'
): Promise<DriveUploadResult> {
  const token = getDriveAccessToken();
  if (!token) {
    throw new Error(
      `Google Drive is not connected. Please sign in to connect Google Drive linked to ${TARGET_DRIVE_ACCOUNT}.`
    );
  }

  const totalBytes = file.size;

  // STRICT RULE: Video file size limit: 10GB
  if (totalBytes > MAX_VIDEO_SIZE_BYTES) {
    const sizeInGb = (totalBytes / (1024 * 1024 * 1024)).toFixed(2);
    throw new Error(
      `File size (${sizeInGb} GB) exceeds the maximum allowed limit of 10 GB. Please upload a file under 10 GB.`
    );
  }

  onProgress?.({
    percent: 2,
    uploadedBytes: 0,
    totalBytes,
    status: `Connecting to Google Drive folder for ${TARGET_DRIVE_ACCOUNT}...`,
  });

  const folderId = await getOrCreateVaultFolder(targetFolderName);

  const mimeType = file.type || (
    fileName.endsWith('.mp4') ? 'video/mp4' :
    fileName.endsWith('.mov') ? 'video/quicktime' :
    fileName.endsWith('.mxf') ? 'application/mxf' :
    fileName.endsWith('.vtt') ? 'text/vtt' :
    fileName.endsWith('.srt') ? 'text/plain' :
    fileName.endsWith('.mp3') ? 'audio/mpeg' :
    fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') ? 'image/jpeg' :
    fileName.endsWith('.png') ? 'image/png' : 'application/octet-stream'
  );

  // For smaller files (< 5MB), do multipart upload directly
  const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks
  if (totalBytes <= CHUNK_SIZE) {
    onProgress?.({
      percent: 20,
      uploadedBytes: 0,
      totalBytes,
      status: `Uploading ${fileName} directly to Google Drive...`,
    });

    const metadata = {
      name: fileName,
      parents: [folderId],
      description: `Uploaded to CINEAD.CC Vault for ${TARGET_DRIVE_ACCOUNT}`,
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json; charset=UTF-8' }));
    form.append('file', file);

    const uploadRes = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,webViewLink,webContentLink',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: form,
      }
    );

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      throw new Error(`Google Drive upload failed: ${errText || uploadRes.statusText}`);
    }

    const result = await uploadRes.json();
    await makeDriveFileReadable(result.id);

    onProgress?.({
      percent: 100,
      uploadedBytes: totalBytes,
      totalBytes,
      status: 'Upload complete! Synced with Google Drive ✓',
    });

    return {
      fileId: result.id,
      name: result.name || fileName,
      size: totalBytes,
      mimeType: result.mimeType || mimeType,
      webViewLink: result.webViewLink || `https://drive.google.com/file/d/${result.id}/view`,
      webContentLink: result.webContentLink || `https://drive.google.com/uc?id=${result.id}&export=download`,
      streamUrl: `/api/drive/stream/${result.id}?token=${encodeURIComponent(token)}`,
      folderId,
      accountEmail: TARGET_DRIVE_ACCOUNT,
    };
  }

  // Resumable upload session for large files (supports up to 10GB!)
  onProgress?.({
    percent: 5,
    uploadedBytes: 0,
    totalBytes,
    status: `Initiating Google Drive resumable session for ${fileName} (${(totalBytes / (1024 * 1024)).toFixed(1)} MB)...`,
  });

  const sessionRes = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Type': mimeType,
        'X-Upload-Content-Length': totalBytes.toString(),
      },
      body: JSON.stringify({
        name: fileName,
        parents: [folderId],
        description: `Theatrical Video Master stored in Google Drive for ${TARGET_DRIVE_ACCOUNT}`,
      }),
    }
  );

  if (!sessionRes.ok) {
    const errText = await sessionRes.text();
    throw new Error(`Failed to initiate Google Drive upload session: ${errText || sessionRes.statusText}`);
  }

  const uploadLocation = sessionRes.headers.get('location');
  if (!uploadLocation) {
    throw new Error('Google Drive upload endpoint location header was not returned.');
  }

  // Chunk loop
  let offset = 0;
  let finalFileId = '';
  let finalResult: any = null;

  while (offset < totalBytes) {
    const end = Math.min(offset + CHUNK_SIZE, totalBytes);
    const chunk = file.slice(offset, end);
    const contentRange = `bytes ${offset}-${end - 1}/${totalBytes}`;

    const chunkRes = await fetch(uploadLocation, {
      method: 'PUT',
      headers: {
        'Content-Range': contentRange,
      },
      body: chunk,
    });

    if (chunkRes.status === 308) {
      // Resume incomplete, continue next chunk
      offset = end;
      const percent = Math.round((offset / totalBytes) * 98);
      onProgress?.({
        percent,
        uploadedBytes: offset,
        totalBytes,
        status: `Uploading to Google Drive... ${(offset / (1024 * 1024)).toFixed(1)} / ${(totalBytes / (1024 * 1024)).toFixed(1)} MB (${percent}%)`,
      });
    } else if (chunkRes.ok) {
      // Completed!
      finalResult = await chunkRes.json();
      finalFileId = finalResult.id;
      offset = totalBytes;
      break;
    } else {
      const errText = await chunkRes.text();
      throw new Error(`Google Drive chunk upload failed at byte ${offset}: ${errText}`);
    }
  }

  if (!finalFileId && finalResult) {
    finalFileId = finalResult.id;
  }

  if (finalFileId) {
    await makeDriveFileReadable(finalFileId);
  }

  onProgress?.({
    percent: 100,
    uploadedBytes: totalBytes,
    totalBytes,
    status: `Upload complete! Stored in Google Drive linked to ${TARGET_DRIVE_ACCOUNT} ✓`,
  });

  return {
    fileId: finalFileId,
    name: finalResult?.name || fileName,
    size: totalBytes,
    mimeType: finalResult?.mimeType || mimeType,
    webViewLink: finalResult?.webViewLink || `https://drive.google.com/file/d/${finalFileId}/view`,
    webContentLink: finalResult?.webContentLink || `https://drive.google.com/uc?id=${finalFileId}&export=download`,
    streamUrl: `/api/drive/stream/${finalFileId}?token=${encodeURIComponent(token)}`,
    folderId,
    accountEmail: TARGET_DRIVE_ACCOUNT,
  };
}

