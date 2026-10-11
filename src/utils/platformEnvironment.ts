/**
 * Platform Environment Detection & Management
 * 
 * Enforces the architectural rule:
 * 1. Website (cinead.cc / www.cinead.cc): Same features, layout, and theme, SYNCED with app.
 *    ADMIN PANEL is EXCLUSIVELY available on the website.
 * 2. App (PWA, mobile companion, standalone): Same features, layout, and theme, SYNCED with website.
 *    ADMIN PANEL is STRICTLY HIDDEN / UNAVAILABLE in the app.
 */

export type PlatformMode = 'website' | 'app';

export function getDetectedPlatformMode(): PlatformMode {
  if (typeof window === 'undefined') return 'website';

  // 1. Explicit query parameter override (e.g. ?platform=app or ?platform=website)
  try {
    const params = new URLSearchParams(window.location.search);
    const platformParam = (params.get('platform') || params.get('mode') || '').toLowerCase();
    if (platformParam === 'app') return 'app';
    if (platformParam === 'website') return 'website';
  } catch {
    // Ignore URL parse errors
  }

  // 2. Custom domain check: cinead.cc or www.cinead.cc is explicitly the Website
  const hostname = (window.location.hostname || '').toLowerCase();
  if (hostname === 'cinead.cc' || hostname === 'www.cinead.cc') {
    return 'website';
  }

  // 3. Standalone installed app / PWA display mode detection
  try {
    const isStandalone =
      (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
      Boolean((window.navigator as unknown as { standalone?: boolean }).standalone);
    if (isStandalone) {
      return 'app';
    }
  } catch {
    // Media query fallback
  }

  // 4. Check user-selected simulation preference in localStorage
  try {
    const saved = localStorage.getItem('cinead_platform_mode');
    if (saved === 'app' || saved === 'website') {
      return saved as PlatformMode;
    }
  } catch {
    // Storage fallback
  }

  // Default to website
  return 'website';
}

export function savePlatformMode(mode: PlatformMode): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('cinead_platform_mode', mode);
    } catch {
      // Storage quota or sandboxed
    }
  }
}
