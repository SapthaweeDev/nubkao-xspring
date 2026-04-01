import { NextRequest, NextResponse } from 'next/server';
import { getServiceAccountToken } from '@/lib/googleServiceAccount';

const DRIVE_REST = 'https://www.googleapis.com/drive/v3';

export async function DELETE(req: NextRequest) {
  try {
    const { fileId } = await req.json();

    if (!fileId) {
      return NextResponse.json({ error: 'Missing fileId' }, { status: 400 });
    }

    const accessToken = await getServiceAccountToken();

    const res = await fetch(`${DRIVE_REST}/files/${fileId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    // 204 = deleted, 404 = already gone — both are acceptable
    if (!res.ok && res.status !== 204 && res.status !== 404) {
      return NextResponse.json({ error: 'Drive delete failed' }, { status: res.status });
    }

    return new NextResponse(null, { status: 204 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Delete failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
