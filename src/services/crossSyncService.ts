/**
 * Cross-Device and Cross-Tab Real-Time Sync Service
 * Ensures the website (cinead.cc) and application instances stay 100% synchronized in real time:
 * - Immediate auth synchronization across windows and tabs
 * - Gallery & film upload sync
 * - Theatrical screening playback synchronization (Main Screen <-> Mobile Companion)
 */

export interface SyncMessage {
  type: 'AUTH_CHANGED' | 'FILM_UPDATED' | 'PLAYBACK_SYNC' | 'PAYMENT_COMPLETED' | 'SETTINGS_CHANGED';
  payload?: any;
  timestamp: number;
  origin: string;
}

export interface ScreeningSessionSyncData {
  pin: string;
  filmId: string;
  filmTitle: string;
  currentTime: number;
  isPlaying: boolean;
  adLang: string;
  ccLang: string;
  updatedAt: number;
}

class CrossSyncService {
  private channel: BroadcastChannel | null = null;
  private listeners: Set<(message: SyncMessage) => void> = new Set();
  private isSupported: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        if ('BroadcastChannel' in window) {
          this.channel = new BroadcastChannel('cinead_platform_sync');
          this.channel.onmessage = (event) => {
            this.notifyListeners(event.data);
          };
          this.isSupported = true;
        }

        // Storage fallback for cross-tab sync
        window.addEventListener('storage', (event) => {
          if (event.key === 'cinead_cross_sync_event' && event.newValue) {
            try {
              const msg: SyncMessage = JSON.parse(event.newValue);
              this.notifyListeners(msg);
            } catch {
              // ignore parse errors
            }
          }
        });
      } catch (err) {
        console.warn('CrossSync initialization note:', err);
      }
    }
  }

  public subscribe(callback: (message: SyncMessage) => void): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notifyListeners(message: SyncMessage) {
    this.listeners.forEach((fn) => {
      try {
        fn(message);
      } catch (e) {
        console.error('Sync listener error:', e);
      }
    });
  }

  public broadcast(type: SyncMessage['type'], payload?: any) {
    const msg: SyncMessage = {
      type,
      payload,
      timestamp: Date.now(),
      origin: typeof window !== 'undefined' ? window.location.origin : 'server',
    };

    if (this.channel) {
      try {
        this.channel.postMessage(msg);
      } catch {
        // channel error
      }
    }

    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.setItem('cinead_cross_sync_event', JSON.stringify(msg));
      } catch {
        // storage quota
      }
    }

    // Also notify local listeners in the current window
    this.notifyListeners(msg);
  }

  // --- Real-Time Theatrical Screening Synchronization ---

  public async pushScreeningState(data: ScreeningSessionSyncData): Promise<boolean> {
    // 1. Broadcast locally for instant multi-tab sync
    this.broadcast('PLAYBACK_SYNC', data);

    // 2. Push to server endpoint for mobile devices across networks
    try {
      const res = await fetch('/api/sync/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  public async pullScreeningState(pin: string): Promise<ScreeningSessionSyncData | null> {
    try {
      const res = await fetch(`/api/sync/session/${encodeURIComponent(pin)}`);
      if (res.ok) {
        const data = await res.json();
        return data.session as ScreeningSessionSyncData;
      }
    } catch {
      // offline or unreachable
    }
    return null;
  }
}

export const crossSync = new CrossSyncService();
