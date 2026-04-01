import { NextRequest, NextResponse } from 'next/server';
import { getDriveAccessToken } from '@/lib/googleDriveOAuth';

const DRIVE_REST = 'https://www.googleapis.com/drive/v3';

export async function DELETE(req: NextRequest) {
  try {
    const { fileId } = await req.json();

    if (!fileId) {
      return NextResponse.json({ error: 'Missing fileId' }, { status: 400 });
    }

    const accessToken = await getDriveAccessToken();

    const res = await fetch(`${DRIVE_REST}/files/${fileId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok && res.status !== 204 && res.status !== 404) {
      return NextResponse.json({ error: 'Drive delete failed' }, { status: res.status });
    }

    return new NextResponse(null, { status: 204 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Delete failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
