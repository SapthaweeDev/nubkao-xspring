// Google Drive client service
// Handles GIS OAuth2 auth in the browser; delegates all Drive API calls to Next.js API routes.

const CONFIG_KEY = 'drive-config-v1';
const SCOPE = 'https://www.googleapis.com/auth/drive.file';

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: any) => any;
          revoke: (token: string, done: () => void) => void;
        };
      };
    };
  }
}

export interface DriveUploadResult {
  fileId: string;
  webViewUrl: string;
}

export interface DriveConfigStored {
  clientId: string;
}

class GoogleDriveService {
  private _clientId: string = '';
  private _accessToken: string = '';
  private _tokenExpiry: number = 0;
  private _tokenClient: any = null;
  private _gisLoaded: boolean = false;
  private _loadPromise: Promise<void> | null = null;

  constructor() {
    this._loadConfig();
  }

  private _loadConfig() {
    try {
      const raw = localStorage.getItem(CONFIG_KEY);
      if (raw) {
        const cfg: DriveConfigStored = JSON.parse(raw);
        this._clientId = cfg.clientId || '';
      }
    } catch { /* ignore */ }
  }

  private _saveConfig() {
    localStorage.setItem(CONFIG_KEY, JSON.stringify({ clientId: this._clientId }));
  }

  get clientId(): string { return this._clientId; }
  get isConfigured(): boolean { return !!this._clientId; }
  get isAuthenticated(): boolean {
    return !!this._accessToken && Date.now() < this._tokenExpiry;
  }

  setClientId(id: string) {
    this._clientId = id.trim();
    this._tokenClient = null;
    this._saveConfig();
  }

  clearAuth() {
    if (this._accessToken && window.google?.accounts?.oauth2) {
      window.google.accounts.oauth2.revoke(this._accessToken, () => {});
    }
    this._accessToken = '';
    this._tokenExpiry = 0;
  }

  clearConfig() {
    this.clearAuth();
    this._clientId = '';
    localStorage.removeItem(CONFIG_KEY);
  }

  /** Dynamically load the Google Identity Services script */
  private _loadGIS(): Promise<void> {
    if (this._gisLoaded && window.google?.accounts?.oauth2) return Promise.resolve();
    if (this._loadPromise) return this._loadPromise;
    this._loadPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector('script[src*="accounts.google.com/gsi/client"]');
      if (existing) {
        const wait = () => {
          if (window.google?.accounts?.oauth2) { this._gisLoaded = true; resolve(); }
          else setTimeout(wait, 100);
        };
        wait();
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => { this._gisLoaded = true; resolve(); };
      script.onerror = () => reject(new Error('ไม่สามารถโหลด Google Identity Services ได้'));
      document.head.appendChild(script);
    });
    return this._loadPromise;
  }

  private async _ensureTokenClient(): Promise<void> {
    if (!this._clientId) throw new Error('ยังไม่ได้ตั้งค่า Client ID');
    await this._loadGIS();
    if (!this._tokenClient) {
      this._tokenClient = window.google!.accounts.oauth2.initTokenClient({
        client_id: this._clientId,
        scope: SCOPE,
        callback: () => {},
      });
    }
  }

  /** Request an access token via GIS popup (skipped if token is still valid) */
  authenticate(): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        await this._ensureTokenClient();
        this._tokenClient.callback = (resp: any) => {
          if (resp.error) {
            reject(new Error(resp.error_description || resp.error));
            return;
          }
          this._accessToken = resp.access_token;
          this._tokenExpiry = Date.now() + (resp.expires_in - 60) * 1000;
          resolve();
        };
        if (this.isAuthenticated) { resolve(); return; }
        this._tokenClient.requestAccessToken({ prompt: 'consent' });
      } catch (err) {
        reject(err);
      }
    });
  }

  private async _token(): Promise<string> {
    if (!this.isAuthenticated) await this.authenticate();
    return this._accessToken;
  }

  /** Upload an image via the Next.js API route */
  async uploadImage(
    memberId: string,
    memberName: string,
    date: string,
    dataUrl: string
  ): Promise<DriveUploadResult> {
    const accessToken = await this._token();
    const res = await fetch('/api/drive/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessToken, memberId, memberName, date, dataUrl }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as any).error || 'อัพโหลด Drive ล้มเหลว');
    }
    return res.json();
  }

  /** Delete a file via the Next.js API route */
  async deleteFile(fileId: string): Promise<void> {
    const accessToken = await this._token();
    await fetch('/api/drive/delete', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessToken, fileId }),
    });
  }
}

export const googleDriveService = new GoogleDriveService();
