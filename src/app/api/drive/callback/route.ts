import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const error = req.nextUrl.searchParams.get('error');
  const origin = req.nextUrl.origin;

  if (error || !code) {
    return NextResponse.redirect(`${origin}/?drive_error=${encodeURIComponent(error || 'no_code')}`);
  }

  const rows = await prisma.config.findMany({
    where: { key: { in: ['drive_client_id', 'drive_client_secret'] } },
  });
  const map: Record<string, string> = {};
  rows.forEach(r => { map[r.key] = r.value; });

  const redirectUri = `${origin}/api/drive/callback`;

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: map.drive_client_id,
        client_secret: map.drive_client_secret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.json().catch(() => ({}));
      return NextResponse.redirect(`${origin}/?drive_error=${encodeURIComponent((err as any).error_description || 'token_failed')}`);
    }

    const tokenData = await tokenRes.json();

    if (!tokenData.refresh_token) {
      return NextResponse.redirect(`${origin}/?drive_error=${encodeURIComponent('ไม่ได้รับ refresh_token กรุณาลองใหม่')}`);
    }

    await prisma.config.upsert({
      where: { key: 'drive_refresh_token' },
      update: { value: tokenData.refresh_token },
      create: { key: 'drive_refresh_token', value: tokenData.refresh_token },
    });

    return NextResponse.redirect(`${origin}/?drive_connected=1`);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    return NextResponse.redirect(`${origin}/?drive_error=${encodeURIComponent(message)}`);
  }
}
