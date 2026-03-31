import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import type { TeamMember, ExcelRowParsed } from '../../../types';

const NAME_ALIASES = ['ชื่อสมาชิก', 'ชื่อ', 'สมาชิก', 'name', 'member', 'ผู้ใช้'];
const DATE_ALIASES = ['วันที่', 'date', 'วัน', 'day'];
const STEPS_ALIASES = ['จำนวนก้าว', 'ก้าว', 'steps', 'step', 'นับก้าว', 'จำนวน'];

function normalise(s: string): string {
  return s?.toString().trim().toLowerCase().replace(/\s+/g, '') || '';
}

function findColumn(headers: string[], aliases: string[]): number {
  const normAliases = aliases.map(a => normalise(a));
  for (let i = 0; i < headers.length; i++) {
    if (normAliases.includes(normalise(headers[i]))) return i;
  }
  return -1;
}

function parseExcelDate(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === 'number') {
    const d = XLSX.SSF.parse_date_code(value);
    if (d) return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
  }
  const str = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  const dmyMatch = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
  if (dmyMatch) {
    const [, d, m, y] = dmyMatch;
    let year = parseInt(y);
    if (year > 2400) year -= 543;
    if (y.length === 2) year += 2000;
    return `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  const mdyMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdyMatch) {
    const [, m, d, y] = mdyMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  const jsDate = new Date(str);
  if (!isNaN(jsDate.getTime())) return jsDate.toISOString().split('T')[0];
  return null;
}

function matchMember(name: string, members: TeamMember[]): TeamMember | null {
  if (!name) return null;
  const norm = normalise(name);
  let found = members.find(m => normalise(m.name) === norm);
  if (found) return found;
  found = members.find(m => {
    const mn = normalise(m.name);
    return mn.includes(norm) || norm.includes(mn);
  });
  if (found) return found;
  const first = normalise(name.trim().split(/\s+/)[0]);
  return members.find(m => normalise(m.name.split(' ')[0]) === first) ?? null;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const membersRaw = formData.get('members');
    const sheetIndex = parseInt((formData.get('sheetIndex') as string) ?? '0') || 0;

    if (!file || !membersRaw) {
      return NextResponse.json({ error: 'Missing file or members' }, { status: 400 });
    }

    const members: TeamMember[] = JSON.parse(membersRaw as string);
    const buffer = await file.arrayBuffer();

    const workbook = XLSX.read(buffer, { type: 'array', cellDates: false });
    const sheetNames = workbook.SheetNames;
    const sheet = workbook.Sheets[sheetNames[sheetIndex]];
    const rawRows: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: '',
      raw: true,
    }) as unknown[][];

    if (rawRows.length === 0) {
      return NextResponse.json({ headers: [], rows: [], columnMap: null, parsedRows: [], sheetNames, totalRows: 0 });
    }

    let headerIdx = 0;
    for (let i = 0; i < Math.min(5, rawRows.length); i++) {
      if (rawRows[i].some(c => c !== '')) { headerIdx = i; break; }
    }
    const headers = rawRows[headerIdx].map((h: unknown) => h?.toString() || '');
    const dataRows = rawRows.slice(headerIdx + 1).filter(r => r.some(c => c !== ''));

    const nameCol = findColumn(headers, NAME_ALIASES);
    const dateCol = findColumn(headers, DATE_ALIASES);
    const stepsCol = findColumn(headers, STEPS_ALIASES);
    const columnMap = nameCol >= 0 && dateCol >= 0 && stepsCol >= 0 ? { nameCol, dateCol, stepsCol } : null;

    const parsedRows: ExcelRowParsed[] = dataRows.map((row, idx) => {
      const rawName = columnMap ? row[columnMap.nameCol]?.toString() || '' : '';
      const rawDate = columnMap ? row[columnMap.dateCol] : null;
      const rawSteps = columnMap ? row[columnMap.stepsCol] : null;

      const member = matchMember(rawName, members);
      const date = parseExcelDate(rawDate);
      const stepsNum = rawSteps !== '' && rawSteps !== null
        ? parseInt(String(rawSteps).replace(/,/g, ''))
        : null;

      const errors: string[] = [];
      if (!member) errors.push('ไม่พบสมาชิก');
      if (!date) errors.push('วันที่ไม่ถูกต้อง');
      if (stepsNum === null || isNaN(stepsNum) || stepsNum < 0) errors.push('จำนวนก้าวไม่ถูกต้อง');

      return {
        rowIndex: idx + headerIdx + 2,
        rawName,
        matchedMemberId: member?.id ?? null,
        date,
        steps: stepsNum,
        error: errors.length > 0 ? errors.join(', ') : undefined,
        isValid: errors.length === 0,
      };
    });

    return NextResponse.json({ headers, rows: dataRows, columnMap, parsedRows, sheetNames, totalRows: dataRows.length });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Parse failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
