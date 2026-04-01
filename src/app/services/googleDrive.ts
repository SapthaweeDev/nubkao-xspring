// Google Drive service — uploads via server-side Service Account (no OAuth popup for users)

export interface DriveUploadResult {
  fileId: string;
  webViewUrl: string;
}

class GoogleDriveService {
  private _configured: boolean = false;

  /** Check server whether Service Account is configured. Call once on app mount. */
  async init(): Promise<void> {
    try {
      const res = await fetch('/api/drive/status');
      if (res.ok) {
        const data = await res.json();
        this._configured = !!data.configured;
      }
    } catch { /* ignore */ }
  }

  get isConfigured(): boolean { return this._configured; }

  /** Upload an image via the Next.js API route (server uses Service Account) */
  async uploadImage(
    memberId: string,
    memberName: string,
    date: string,
    dataUrl: string
  ): Promise<DriveUploadResult> {
    const res = await fetch('/api/drive/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId, memberName, date, dataUrl }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as any).error || 'อัพโหลด Drive ล้มเหลว');
    }
    return res.json();
  }

  /** Delete a file via the Next.js API route */
  async deleteFile(fileId: string): Promise<void> {
    await fetch('/api/drive/delete', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileId }),
    });
  }
}

export const googleDriveService = new GoogleDriveService();

