import { NextResponse } from 'next/server';
import { isServiceAccountConfigured } from '@/lib/googleServiceAccount';

export async function GET() {
  const configured = await isServiceAccountConfigured();
  return NextResponse.json({ configured });
}
