import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import type { TeamMember } from '../../../types';

export async function POST(req: NextRequest) {
  try {
    const { members }: { members: TeamMember[] } = await req.json();

    if (!Array.isArray(members)) {
      return NextResponse.json({ error: 'members must be an array' }, { status: 400 });
    }

    const today = new Date().toISOString().split('T')[0];
    const rows: unknown[][] = [
      ['ชื่อสมาชิก', 'วันที่', 'จำนวนก้าว'],
      ...members.map(m => [m.name, today, 8000]),
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 25 }, { wch: 14 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, ws, 'ก้าว');

    const raw = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Uint8Array;
    const buffer = raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength) as ArrayBuffer;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="step_tracker_template.xlsx"',
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Template generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
