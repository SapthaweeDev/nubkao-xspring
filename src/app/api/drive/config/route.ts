import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const DRIVE_KEYS = ['drive_client_id', 'drive_client_secret', 'drive_folder_id', 'drive_refresh_token'];

// Save drive credentials to DB
export async function PUT(req: NextRequest) {
  try {
    const { clientId, clientSecret, folderId } = await req.json();
    if (!clientId || !clientSecret || !folderId) {
      return NextResponse.json({ error: 'Missing clientId, clientSecret or folderId' }, { status: 400 });
    }

    await Promise.all([
      prisma.config.upsert({
        where: { key: 'drive_client_id' },
        update: { value: clientId },
        create: { key: 'drive_client_id', value: clientId },
      }),
      prisma.config.upsert({
        where: { key: 'drive_client_secret' },
        update: { value: clientSecret },
        create: { key: 'drive_client_secret', value: clientSecret },
      }),
      prisma.config.upsert({
        where: { key: 'drive_folder_id' },
        update: { value: folderId },
        create: { key: 'drive_folder_id', value: folderId },
      }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to save config';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Clear all drive config from DB
export async function DELETE() {
  try {
    await prisma.config.deleteMany({ where: { key: { in: DRIVE_KEYS } } });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to clear config';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
