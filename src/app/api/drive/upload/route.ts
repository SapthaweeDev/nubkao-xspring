import { NextRequest, NextResponse } from 'next/server';
import { getServiceAccountToken } from '@/lib/googleServiceAccount';
import { prisma } from '@/lib/prisma';

const DRIVE_REST = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD = 'https://www.googleapis.com/upload/drive/v3';

export async function POST(req: NextRequest) {
  try {
    const { memberName, date, dataUrl } = await req.json();

    if (!dataUrl || !memberName || !date) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get shared folder ID from DB
    const folderConfig = await prisma.config.findUnique({ where: { key: 'sa_folder_id' } });
    if (!folderConfig?.value) {
      return NextResponse.json({ error: 'ยังไม่ได้ตั้งค่า Folder ID กรุณาตั้งค่าใน Settings' }, { status: 400 });
    }
    const folderId = folderConfig.value;

    const accessToken = await getServiceAccountToken();

    const [header, base64Data] = dataUrl.split(',');
    const mimeType = header.match(/:(.*?);/)?.[1] ?? 'image/jpeg';
    const buffer = Buffer.from(base64Data, 'base64');
    const ext = mimeType.split('/')[1] ?? 'jpg';
    const filename = `proof_${memberName}_${date}.${ext}`;

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
      `${DRIVE_UPLOAD}/files?uploadType=multipart&fields=id,webViewLink&supportsAllDrives=true`,
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
    await fetch(`${DRIVE_REST}/files/${file.id}/permissions?supportsAllDrives=true`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'reader', type: 'anyone' }),
    }).catch(() => {});

    // Ensure webViewLink — fall back to constructing it if Drive omits it
    const webViewUrl = file.webViewLink ||
      `https://drive.google.com/file/d/${file.id}/view`;

    return NextResponse.json({ fileId: file.id, webViewUrl });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Upload failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
