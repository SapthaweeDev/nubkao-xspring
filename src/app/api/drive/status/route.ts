import { NextResponse } from 'next/server';
import { isDriveConfigured } from '@/lib/googleDriveOAuth';

export async function GET() {
  const configured = await isDriveConfigured();
  return NextResponse.json({ configured });
}
