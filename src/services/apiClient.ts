import { User, Film, Payment, AuditLog } from '../types/cinemaPlatform';

class ApiClient {
  private token: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('cbfc_auth_token');
    }
  }

  public setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('cbfc_auth_token', token);
    } else {
      localStorage.removeItem('cbfc_auth_token');
    }
  }

  public getToken(): string | null {
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(endpoint, {
      ...options,
      headers,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || `Request failed with status ${response.status}`);
    }

    return data as T;
  }

  // Auth API
  public sendOtp(mobile: string) {
    return this.request<{ success: boolean; message: string; debugOtp?: string; expiresInSeconds: number }>(
      '/api/auth/send-otp',
      { method: 'POST', body: JSON.stringify({ mobile }) }
    );
  }

  public verifyOtp(mobile: string, otp: string) {
    return this.request<{ success: boolean; message: string }>(
      '/api/auth/verify-otp',
      { method: 'POST', body: JSON.stringify({ mobile, otp }) }
    );
  }

  public checkEmail(email: string) {
    return this.request<{
      exists: boolean;
      email: string;
      productionHouseName?: string;
      role?: string;
    }>('/api/auth/check-email', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  public register(data: {
    productionHouseName: string;
    email: string;
    mobile?: string;
    code: string;
    password?: string;
    role?: string;
    deviceId?: string;
  }) {
    return this.request<{ success: boolean; user: User; token: string; message: string }>(
      '/api/auth/register',
      {
        method: 'POST',
        body: JSON.stringify({
          ...data,
          password: data.code || data.password,
          code: data.code,
        }),
      }
    );
  }

  public verifyEmail() {
    return this.request<{ success: boolean; user: User; message: string }>(
      '/api/auth/verify-email',
      { method: 'POST' }
    );
  }

  public login(email: string, code: string, deviceId?: string) {
    return this.request<{ success: boolean; user: User; token: string }>(
      '/api/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({
          email,
          code,
          password: code,
          deviceId,
        }),
      }
    );
  }

  public recoverCode(email: string) {
    return this.request<{ success: boolean; code: string; message: string }>(
      '/api/auth/recover-code',
      { method: 'POST', body: JSON.stringify({ email }) }
    );
  }

  public getMe() {
    return this.request<{ user: User }>('/api/auth/me');
  }

  // Films API
  public getCommonFilms() {
    return this.request<{ films: Partial<Film>[] }>('/api/films');
  }

  public getFilmDetails(id: string) {
    return this.request<{ film: Film & { isOwner: boolean } }>(`/api/films/${id}`);
  }

  public getMyFilms() {
    return this.request<{ films: Film[] }>('/api/films/user/my-films');
  }

  public uploadChunk(payload: {
    chunkIndex: number;
    totalChunks: number;
    fileName: string;
    fileSize: string;
    submissionType: string;
  }) {
    return this.request<{ success: boolean; progressPercent: number; isComplete: boolean; storedPath?: string }>(
      '/api/films/upload-chunk',
      { method: 'POST', body: JSON.stringify(payload) }
    );
  }

  public submitFilm(payload: Partial<Film> & { ccTracks: unknown[]; adTracks: unknown[] }) {
    return this.request<{ success: boolean; film: Film; minimumPaymentRequired: number; message: string }>(
      '/api/films/submit',
      { method: 'POST', body: JSON.stringify(payload) }
    );
  }

  // Payment API
  public confirmPayment(filmId: string, amount: number, gateway: string) {
    return this.request<{
      success: boolean;
      payment: Payment;
      film: Film;
      previewCode: string;
      delivery: {
        emailSent: boolean;
        whatsAppSmsSent: boolean;
        deliveredToEmail: string;
        deliveredToMobile: string;
        message: string;
      };
      message: string;
    }>('/api/payment/confirm', {
      method: 'POST',
      body: JSON.stringify({ filmId, amount, gateway }),
    });
  }

  public getPaymentHistory() {
    return this.request<{ payments: Payment[] }>('/api/payment/history');
  }

  // Preview & Playback API
  public verifyPreviewCode(code: string, filmId?: string) {
    return this.request<{
      success: boolean;
      sessionToken: string;
      film: Film;
      watermark: string;
    }>('/api/preview/verify-code', {
      method: 'POST',
      body: JSON.stringify({ code, filmId }),
    });
  }

  public authorizeOwnerPlayback(filmId: string) {
    return this.request<{
      success: boolean;
      sessionToken: string;
      film: Film;
      watermark: string;
    }>('/api/playback/authorize-owner', {
      method: 'POST',
      body: JSON.stringify({ filmId }),
    });
  }

  public getStreamManifest(token: string) {
    return this.request<{
      streamUrl: string;
      title: string;
      durationMinutes: number;
      watermark: string;
      expiresAt: string;
    }>(`/api/playback/stream/${token}`);
  }

  public resendPreviewCode(filmId: string) {
    return this.request<{ success: boolean; message: string; delivery: { code: string } }>(
      '/api/preview/resend-code',
      { method: 'POST', body: JSON.stringify({ filmId }) }
    );
  }

  // Admin API
  public getAdminOverview() {
    return this.request<{
      totalUsers: number;
      totalFilms: number;
      totalPayments: number;
      totalPreviewCodes: number;
      activeSessions: number;
      users: User[];
      films: Film[];
      payments: Payment[];
    }>('/api/admin/overview');
  }

  public getAdminAuditLogs() {
    return this.request<{ logs: AuditLog[] }>('/api/admin/audit-logs');
  }

  public suspendFilm(filmId: string, suspend: boolean) {
    return this.request<{ success: boolean; film: Film }>('/api/admin/suspend-film', {
      method: 'POST',
      body: JSON.stringify({ filmId, suspend }),
    });
  }

  public revokeCode(code: string) {
    return this.request<{ success: boolean; message: string }>('/api/admin/revoke-code', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  }
}

export const api = new ApiClient();
