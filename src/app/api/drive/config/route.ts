import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const SA_EMAIL_KEY = 'sa_email';
const SA_KEY_KEY = 'sa_private_key';

// Save service account credentials to DB
export async function PUT(req: NextRequest) {
  try {
    const { email, privateKey } = await req.json();
    if (!email || !privateKey) {
      return NextResponse.json({ error: 'Missing email or privateKey' }, { status: 400 });
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
      where: { key: { in: [SA_EMAIL_KEY, SA_KEY_KEY] } },
    });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to clear config';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
