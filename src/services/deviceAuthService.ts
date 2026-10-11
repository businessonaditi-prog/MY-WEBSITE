// Client Device Registration Service for CINEAD.CC

export interface RegisteredDeviceProfile {
  deviceId: string;
  email: string;
  productionHouseName?: string;
  role?: string;
  registeredAt: string;
  lastLoginAt: string;
}

const DEVICE_ID_KEY = 'cinegate_device_id';
const REGISTERED_DEVICE_KEY = 'cinegate_registered_device_profile';

export const deviceAuthService = {
  // Retrieve or create persistent unique device UUID
  getDeviceId(): string {
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      id = 'dev-' + Math.random().toString(36).substring(2, 10) + '-' + Date.now().toString(36);
      localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  },

  // Get currently registered device profile (Never returns admin profiles)
  getRegisteredProfile(): RegisteredDeviceProfile | null {
    try {
      const data = localStorage.getItem(REGISTERED_DEVICE_KEY);
      if (!data) return null;
      const profile = JSON.parse(data) as RegisteredDeviceProfile;
      // Strict security: Administrator credentials must NEVER be remembered or bound by browser
      if (profile.role === 'admin' || profile.email.toLowerCase().includes('pikuvfx')) {
        localStorage.removeItem(REGISTERED_DEVICE_KEY);
        return null;
      }
      return profile;
    } catch {
      return null;
    }
  },

  // Register or update current device for a user (Never saves admin profiles)
  registerDevice(email: string, productionHouseName?: string, role?: string): RegisteredDeviceProfile {
    const deviceId = this.getDeviceId();
    const now = new Date().toISOString();
    const cleanEmail = email.trim().toLowerCase();

    // Security policy: Admin credentials must NEVER be remembered by browser/device
    if (role === 'admin' || cleanEmail.includes('pikuvfx')) {
      localStorage.removeItem(REGISTERED_DEVICE_KEY);
      return {
        deviceId,
        email: cleanEmail,
        productionHouseName: productionHouseName || 'Admin Console',
        role: 'admin',
        registeredAt: now,
        lastLoginAt: now,
      };
    }

    const existing = this.getRegisteredProfile();

    const profile: RegisteredDeviceProfile = {
      deviceId,
      email: cleanEmail,
      productionHouseName: productionHouseName || existing?.productionHouseName || 'Official Entity',
      role: role || existing?.role || 'production_house',
      registeredAt: existing?.email === cleanEmail ? existing.registeredAt : now,
      lastLoginAt: now,
    };

    localStorage.setItem(REGISTERED_DEVICE_KEY, JSON.stringify(profile));
    return profile;
  },

  // Clear device registration (e.g. to simulate new device or switch accounts)
  clearRegisteredDevice(): void {
    localStorage.removeItem(REGISTERED_DEVICE_KEY);
  },

  // Check if current device is registered
  isDeviceRegistered(): boolean {
    const profile = this.getRegisteredProfile();
    return Boolean(profile && profile.email);
  },
};
