import { prisma } from './prisma';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';

let _cachedToken: string | null = null;
let _tokenExpiry: number = 0;

export async function getDriveAccessToken(): Promise<string> {
  if (_cachedToken && Date.now() < _tokenExpiry) return _cachedToken;

  const rows = await prisma.config.findMany({
    where: { key: { in: ['drive_client_id', 'drive_client_secret', 'drive_refresh_token'] } },
  });
  const map: Record<string, string> = {};
  rows.forEach(r => { map[r.key] = r.value; });

  if (!map.drive_client_id || !map.drive_client_secret || !map.drive_refresh_token) {
    throw new Error('กรุณาเชื่อมต่อ Google Drive ก่อนใช้งาน');
  }

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: map.drive_client_id,
      client_secret: map.drive_client_secret,
      refresh_token: map.drive_refresh_token,
      grant_type: 'refresh_token',
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).error_description || 'ขอ Google Drive token ล้มเหลว');
  }

  const data = await res.json();
  _cachedToken = data.access_token;
  _tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
  return _cachedToken!;
}

export async function isDriveConfigured(): Promise<boolean> {
  try {
    const rows = await prisma.config.findMany({
      where: { key: { in: ['drive_refresh_token', 'drive_folder_id'] } },
    });
    return rows.length === 2;
  } catch {
    return false;
  }
}
