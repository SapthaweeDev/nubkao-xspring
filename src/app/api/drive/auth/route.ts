import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

async function getOrigin(req: NextRequest): Promise<string> {
  const saved = await prisma.config.findUnique({ where: { key: 'app_url' } });
  if (saved?.value) return saved.value;
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || '';
  const proto = req.headers.get('x-forwarded-proto') || req.nextUrl.protocol.replace(':', '');
  if (host && !host.startsWith('0.0.0.0')) return `${proto}://${host}`;
  return req.nextUrl.origin;
}

export async function GET(req: NextRequest) {
  const rows = await prisma.config.findMany({
    where: { key: { in: ['drive_client_id', 'drive_client_secret'] } },
  });
  const map: Record<string, string> = {};
  rows.forEach(r => { map[r.key] = r.value; });

  if (!map.drive_client_id || !map.drive_client_secret) {
    return NextResponse.json({ error: 'กรุณาบันทึก Client ID และ Client Secret ก่อน' }, { status: 400 });
  }

  const origin = await getOrigin(req);
  const redirectUri = `${origin}/api/drive/callback`;

  const params = new URLSearchParams({
    client_id: map.drive_client_id,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/drive.file',
    access_type: 'offline',
    prompt: 'consent',
  });

  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
}
