import crypto from 'crypto';
import { prisma } from './prisma';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SCOPE = 'https://www.googleapis.com/auth/drive.file';
const SA_EMAIL_KEY = 'sa_email';
const SA_KEY_KEY = 'sa_private_key';

let _cachedToken: string | null = null;
let _tokenExpiry: number = 0;

function base64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function makeJwt(email: string, rawPrivateKey: string): string {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })));
  const payload = base64url(Buffer.from(JSON.stringify({
    iss: email,
    scope: SCOPE,
    aud: TOKEN_URL,
    exp: now + 3600,
    iat: now,
  })));
  const signingInput = `${header}.${payload}`;

  // Normalize: replace literal \n with real newlines, then trim
  const pem = rawPrivateKey.replace(/\\n/g, '\n').trim();
  const keyObject = crypto.createPrivateKey(pem);
  const sig = base64url(crypto.sign('sha256', Buffer.from(signingInput), keyObject));
  return `${signingInput}.${sig}`;
}

async function getCredentials(): Promise<{ email: string; privateKey: string } | null> {
  try {
    const rows = await prisma.config.findMany({
      where: { key: { in: [SA_EMAIL_KEY, SA_KEY_KEY] } },
    });
    const map: Record<string, string> = {};
    rows.forEach(r => { map[r.key] = r.value; });
    if (map[SA_EMAIL_KEY] && map[SA_KEY_KEY]) {
      return { email: map[SA_EMAIL_KEY], privateKey: map[SA_KEY_KEY] };
    }
  } catch { /* ignore */ }
  return null;
}

export async function getServiceAccountToken(): Promise<string> {
  if (_cachedToken && Date.now() < _tokenExpiry) return _cachedToken;

  const creds = await getCredentials();
  if (!creds) throw new Error('กรุณาตั้งค่า Service Account ก่อนใช้งาน');

  const jwt = makeJwt(creds.email, creds.privateKey);

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).error_description || 'ขอ Service Account token ล้มเหลว');
  }

  const data = await res.json();
  _cachedToken = data.access_token;
  _tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
  return _cachedToken!;
}

export async function isServiceAccountConfigured(): Promise<boolean> {
  try {
    const rows = await prisma.config.findMany({
      where: { key: { in: [SA_EMAIL_KEY, SA_KEY_KEY, 'sa_folder_id'] } },
    });
    return rows.length === 3;
  } catch {
    return false;
  }
}
