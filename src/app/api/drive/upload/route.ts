import { NextRequest, NextResponse } from 'next/server';
import { getDriveAccessToken } from '@/lib/googleDriveOAuth';
import { prisma } from '@/lib/prisma';

const DRIVE_REST = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD = 'https://www.googleapis.com/upload/drive/v3';

/** Find or create a subfolder by name inside a parent folder. Returns the folder ID. */
async function getOrCreateDateFolder(
  accessToken: string,
  parentId: string,
  folderName: string
): Promise<string> {
  // Search for existing folder
  const q = `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and '${parentId}' in parents and trashed=false`;
  const searchRes = await fetch(
    `${DRIVE_REST}/files?q=${encodeURIComponent(q)}&fields=files(id,name)&pageSize=1`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (searchRes.ok) {
    const data = await searchRes.json();
    if (data.files?.length > 0) return data.files[0].id as string;
  }

  // Create new folder
  const createRes = await fetch(`${DRIVE_REST}/files?fields=id`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    }),
  });
  if (!createRes.ok) {
    throw new Error('ไม่สามารถสร้าง folder วันที่ได้');
  }
  const folder = await createRes.json();
  return folder.id as string;
}

export async function POST(req: NextRequest) {
  try {
    const { memberName, date, dataUrl } = await req.json();

    if (!dataUrl || !memberName || !date) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const folderConfig = await prisma.config.findUnique({ where: { key: 'drive_folder_id' } });
    if (!folderConfig?.value) {
      return NextResponse.json({ error: 'ยังไม่ได้ตั้งค่า Folder ID กรุณาตั้งค่าใน Settings' }, { status: 400 });
    }
    const rootFolderId = folderConfig.value;

    const accessToken = await getDriveAccessToken();

    // Get or create date subfolder (e.g. "2026-04-02")
    const folderId = await getOrCreateDateFolder(accessToken, rootFolderId, date);

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

    const webViewUrl = file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`;
    return NextResponse.json({ fileId: file.id, webViewUrl });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Upload failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
