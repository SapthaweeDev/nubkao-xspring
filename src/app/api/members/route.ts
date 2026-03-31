import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const members = await prisma.member.findMany({ orderBy: { createdAt: 'asc' } });
    return NextResponse.json(members);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch members';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
