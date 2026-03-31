import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Get all config as { key: value } map
export async function GET() {
  try {
    const configs = await prisma.config.findMany();
    const result: Record<string, string> = {};
    configs.forEach(c => { result[c.key] = c.value; });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch config';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Upsert a config key/value
export async function PUT(req: NextRequest) {
  try {
    const { key, value } = await req.json();

    if (!key || value === undefined) {
      return NextResponse.json({ error: 'Missing key or value' }, { status: 400 });
    }

    const config = await prisma.config.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });

    return NextResponse.json(config);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update config';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
