import { NextRequest, NextResponse } from 'next/server';

const DRIVE_REST = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD = 'https://www.googleapis.com/upload/drive/v3';
const FOLDER_NAME = 'nubkao_xspring';

async function ensureFolder(accessToken: string): Promise<string> {
  const headers = { Authorization: `Bearer ${accessToken}` };
  const q = `name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;

  const searchRes = await fetch(
    `${DRIVE_REST}/files?q=${encodeURIComponent(q)}&fields=files(id,name)`,
    { headers }
  );
  if (!searchRes.ok) throw new Error('ค้นหาโฟลเดอร์ Drive ล้มเหลว');
  const searchData = await searchRes.json();

  if (searchData.files?.length > 0) {
    return searchData.files[0].id as string;
  }

  const createRes = await fetch(`${DRIVE_REST}/files`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: FOLDER_NAME, mimeType: 'application/vnd.google-apps.folder' }),
  });
  if (!createRes.ok) throw new Error('สร้างโฟลเดอร์ Drive ล้มเหลว');
  const folder = await createRes.json();
  return folder.id as string;
}

export async function POST(req: NextRequest) {
  try {
    const { accessToken, memberName, date, dataUrl } = await req.json();

    if (!accessToken || !dataUrl || !memberName || !date) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const [header, base64Data] = dataUrl.split(',');
    const mimeType = header.match(/:(.*?);/)?.[1] ?? 'image/jpeg';
    const buffer = Buffer.from(base64Data, 'base64');
    const ext = mimeType.split('/')[1] ?? 'jpg';
    const filename = `proof_${memberName}_${date}.${ext}`;

    const folderId = await ensureFolder(accessToken);

    const metaBlob = new Blob(
      [JSON.stringify({
        name: filename,
        parents: [folderId],
        description: `หลักฐานนับก้าว: ${memberName} วันที่ ${date}`,
      })],
      { type: 'application/json' }
    );

    const form = new FormData();
    form.append('metadata', metaBlob);
    form.append('file', new Blob([buffer], { type: mimeType }), filename);

    const uploadRes = await fetch(
      `${DRIVE_UPLOAD}/files?uploadType=multipart&fields=id,webViewLink`,
      { method: 'POST', headers: { Authorization: `Bearer ${accessToken}` }, body: form }
    );

    if (!uploadRes.ok) {
      const err = await uploadRes.json().catch(() => ({}));
      return NextResponse.json(
        { error: (err as any)?.error?.message ?? 'อัพโหลด Drive ล้มเหลว' },
        { status: 502 }
      );
    }

    const file = await uploadRes.json();

    // Make publicly viewable by anyone with link (non-critical)
    await fetch(`${DRIVE_REST}/files/${file.id}/permissions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'reader', type: 'anyone' }),
    }).catch(() => {});

    return NextResponse.json({ fileId: file.id, webViewUrl: file.webViewLink });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Upload failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
