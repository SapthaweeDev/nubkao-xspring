import { NextRequest, NextResponse } from 'next/server';

const DRIVE_REST = 'https://www.googleapis.com/drive/v3';

export async function DELETE(req: NextRequest) {
  try {
    const { accessToken, fileId } = await req.json();

    if (!accessToken || !fileId) {
      return NextResponse.json({ error: 'Missing accessToken or fileId' }, { status: 400 });
    }

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
