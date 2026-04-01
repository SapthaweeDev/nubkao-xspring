import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const SA_EMAIL_KEY = 'sa_email';
const SA_KEY_KEY = 'sa_private_key';
const SA_FOLDER_KEY = 'sa_folder_id';

// Save service account credentials + folder ID to DB
export async function PUT(req: NextRequest) {
  try {
    const { email, privateKey, folderId } = await req.json();
    if (!email || !privateKey || !folderId) {
      return NextResponse.json({ error: 'Missing email, privateKey or folderId' }, { status: 400 });
    }

    await Promise.all([
      prisma.config.upsert({
        where: { key: SA_EMAIL_KEY },
        update: { value: email },
        create: { key: SA_EMAIL_KEY, value: email },
      }),
      prisma.config.upsert({
        where: { key: SA_KEY_KEY },
        update: { value: privateKey },
        create: { key: SA_KEY_KEY, value: privateKey },
      }),
      prisma.config.upsert({
        where: { key: SA_FOLDER_KEY },
        update: { value: folderId },
        create: { key: SA_FOLDER_KEY, value: folderId },
      }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to save config';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Clear service account credentials from DB
export async function DELETE() {
  try {
    await prisma.config.deleteMany({
      where: { key: { in: [SA_EMAIL_KEY, SA_KEY_KEY, SA_FOLDER_KEY] } },
    });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to clear config';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
