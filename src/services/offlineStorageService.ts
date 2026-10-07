/**
 * In-App Encrypted Offline Storage Manager
 * Stores film accessibility packages and video streams strictly inside the application sandbox (IndexedDB).
 * CRITICAL RULE: Never exports or saves to the device photo/video gallery or file manager.
 */

const DB_NAME = 'CINEAD_CC_OFFLINE_ENCRYPTED_VAULT';
const STORE_NAME = 'offline_packages';
const DB_VERSION = 1;

export interface EncryptedOfflinePackage {
  filmId: string;
  title: string;
  encryptedBlobKey: string;
  downloadedAt: string;
  packageSize: string;
  isUnlocked: boolean;
  offlineAccessExpiry: string;
  cachedFilmData?: any;
}

class OfflineStorageManager {
  private dbPromise: Promise<IDBDatabase> | null = null;
  private inMemoryCache: Map<string, EncryptedOfflinePackage> = new Map();

  constructor() {
    this.initDb();
  }

  private initDb(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB not supported'));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'filmId' });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return this.dbPromise;
  }

  public async downloadForInAppOffline(
    filmId: string,
    title: string,
    packageSize: string = '42.8 MB',
    onProgress: (percent: number) => void,
    filmData?: any
  ): Promise<EncryptedOfflinePackage> {
    // Simulate chunked streaming & sandbox encryption into in-app storage
    for (let p = 15; p <= 100; p += 20) {
      await new Promise((r) => setTimeout(r, 160));
      onProgress(Math.min(100, p));
    }

    const pkg: EncryptedOfflinePackage = {
      filmId,
      title,
      encryptedBlobKey: `aes_256_cinegate_vault_${filmId}_${Date.now()}`,
      downloadedAt: new Date().toISOString(),
      packageSize,
      isUnlocked: true,
      offlineAccessExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days in-app
      cachedFilmData: filmData,
    };

    try {
      const db = await this.initDb();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(pkg);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch {
      // In-memory fallback
      this.inMemoryCache.set(filmId, pkg);
    }

    // Save in localStorage indicator as well
    const downloadedIds = this.getDownloadedFilmIds();
    if (!downloadedIds.includes(filmId)) {
      downloadedIds.push(filmId);
      localStorage.setItem('cinegate_in_app_offline_ids', JSON.stringify(downloadedIds));
    }

    // Save package manifest in localStorage for instant access
    try {
      const manifests = this.getStoredManifests();
      manifests[filmId] = pkg;
      localStorage.setItem('cinegate_offline_packages_manifest', JSON.stringify(manifests));
    } catch (e) {
      console.warn('LocalStorage manifest cache error:', e);
    }

    return pkg;
  }

  public getStoredManifests(): Record<string, EncryptedOfflinePackage> {
    try {
      const data = localStorage.getItem('cinegate_offline_packages_manifest');
      return data ? JSON.parse(data) : {
        'film-kalki-2898': {
          filmId: 'film-kalki-2898',
          title: 'Kalki 2898 AD',
          encryptedBlobKey: 'aes_256_cinegate_vault_kalki_demo',
          downloadedAt: new Date().toISOString(),
          packageSize: '42.8 MB',
          isUnlocked: true,
          offlineAccessExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        }
      };
    } catch {
      return {};
    }
  }

  public getOfflinePackage(filmId: string): EncryptedOfflinePackage | null {
    const manifests = this.getStoredManifests();
    return manifests[filmId] || this.inMemoryCache.get(filmId) || null;
  }

  public getDownloadedFilmIds(): string[] {
    try {
      const data = localStorage.getItem('cinegate_in_app_offline_ids');
      return data ? JSON.parse(data) : ['film-kalki-2898']; // Default pre-cached demo film
    } catch {
      return ['film-kalki-2898'];
    }
  }

  public isFilmDownloaded(filmId: string): boolean {
    return this.getDownloadedFilmIds().includes(filmId);
  }

  public async deleteOfflineFilm(filmId: string): Promise<void> {
    const ids = this.getDownloadedFilmIds().filter((id) => id !== filmId);
    localStorage.setItem('cinegate_in_app_offline_ids', JSON.stringify(ids));

    try {
      const manifests = this.getStoredManifests();
      delete manifests[filmId];
      localStorage.setItem('cinegate_offline_packages_manifest', JSON.stringify(manifests));
    } catch {
      // ignore
    }

    try {
      const db = await this.initDb();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(filmId);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch {
      this.inMemoryCache.delete(filmId);
    }
  }
}

export const offlineStorage = new OfflineStorageManager();
