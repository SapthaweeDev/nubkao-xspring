import React, { useState, useRef, useCallback } from 'react';
import { X, Upload, FileSpreadsheet, CheckCircle, AlertCircle, Download, Loader2, ChevronDown, RefreshCw } from 'lucide-react';
import { parseExcelFile, generateExcelTemplate, ColumnMap } from '../services/excelImport';
import { useStepContext, getTodayString } from '../context/StepContext';
import { ExcelRowParsed } from '../types';

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MONTH_NAMES_SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
function fmtDate(d: string | null): string {
  if (!d) return '—';
  const dt = new Date(d + 'T00:00:00');
  return `${dt.getDate()} ${MONTH_NAMES_SHORT[dt.getMonth()]} ${dt.getFullYear() + 543}`;
}

type Step = 'upload' | 'preview' | 'done';

export function ExcelImportModal({ isOpen, onClose }: ExcelImportModalProps) {
  const { members, addOrUpdateEntry, getEntryForDate, startDate } = useStepContext();
  const today = getTodayString();

  const [step, setStep] = useState<Step>('upload');
  const [isDragOver, setIsDragOver] = useState(false);
  const [fileName, setFileName] = useState('');
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState(0);
  const [headers, setHeaders] = useState<string[]>([]);
  const [parsedRows, setParsedRows] = useState<ExcelRowParsed[]>([]);
  const [columnMap, setColumnMap] = useState<ColumnMap | null>(null);
  const [buffer, setBuffer] = useState<ArrayBuffer | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: number; skipped: number; errors: number } | null>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'valid' | 'invalid'>('all');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setStep('upload');
    setFileName('');
    setSheetNames([]);
    setSelectedSheet(0);
    setHeaders([]);
    setParsedRows([]);
    setColumnMap(null);
    setBuffer(null);
    setSelectedRows(new Set());
    setImporting(false);
    setImportResult(null);
    setFilterMode('all');
  };

  const processBuffer = useCallback(async (buf: ArrayBuffer, sheetIdx: number) => {
    const result = await parseExcelFile(buf, members, sheetIdx);
    setSheetNames(result.sheetNames);
    setHeaders(result.headers);
    setParsedRows(result.parsedRows);
    setColumnMap(result.columnMap);
    const validIndices = new Set<number>(
      result.parsedRows
        .map((r: ExcelRowParsed, i: number) => ({ r, i }))
        .filter(({ r }: { r: ExcelRowParsed; i: number }) => r.isValid)
        .map(({ i }: { r: ExcelRowParsed; i: number }) => i)
    );
    setSelectedRows(validIndices);
    setStep('preview');
  }, [members]);

  const handleFile = async (file: File) => {
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      alert('กรุณาเลือกไฟล์ .xlsx, .xls หรือ .csv เท่านั้น');
      return;
    }
    setFileName(file.name);
    const buf = await file.arrayBuffer();
    setBuffer(buf);
    void processBuffer(buf, 0);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleSheetChange = (idx: number) => {
    setSelectedSheet(idx);
    if (buffer) void processBuffer(buffer, idx);
  };

  const toggleRow = (idx: number) => {
    setSelectedRows(prev => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  const toggleAll = () => {
    const validIndices = parsedRows.map((_, i) => i).filter(i => parsedRows[i].isValid);
    const allSelected = validIndices.every(i => selectedRows.has(i));
    if (allSelected) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(validIndices));
    }
  };

  const handleImport = async () => {
    setImporting(true);
    let success = 0, skipped = 0, errors = 0;

    for (const idx of selectedRows) {
      const row = parsedRows[idx];
      if (!row.isValid || !row.matchedMemberId || !row.date || row.steps === null) {
        errors++;
        continue;
      }
      // Skip if date out of range
      if (row.date < startDate || row.date > today) { skipped++; continue; }

      addOrUpdateEntry(row.matchedMemberId, row.date, row.steps);
      success++;
    }

    await new Promise(r => setTimeout(r, 400)); // small delay for UX
    setImportResult({ success, skipped, errors });
    setStep('done');
    setImporting(false);
  };

  const filteredRows = parsedRows.filter((r, i) => {
    if (filterMode === 'valid') return r.isValid;
    if (filterMode === 'invalid') return !r.isValid;
    return true;
  });

  const validCount = parsedRows.filter(r => r.isValid).length;
  const selectedCount = selectedRows.size;
  const memberName = (id: string | null) => members.find(m => m.id === id)?.name || '—';
  const memberColor = (id: string | null) => members.find(m => m.id === id)?.color || '#9CA3AF';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 shrink-0"
          style={{ background: 'linear-gradient(135deg, #F0FDF4, #ECFDF5)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <FileSpreadsheet size={20} className="text-emerald-600" />
            </div>
            <div>
              <h2 className="text-gray-800" style={{ fontWeight: 700, fontSize: '1.1rem' }}>นำเข้าข้อมูลจาก Excel</h2>
              <p className="text-gray-500 text-xs mt-0.5">
                {step === 'upload' && 'รองรับ .xlsx, .xls, .csv'}
                {step === 'preview' && `${fileName} • ${parsedRows.length} รายการ`}
                {step === 'done' && 'นำเข้าเสร็จสิ้น'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {step !== 'upload' && (
              <button onClick={reset}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm transition-colors">
                <RefreshCw size={13} />
                ใหม่
              </button>
            )}
            <button onClick={onClose} className="rounded-full p-2 hover:bg-white/60 transition-colors">
              <X size={20} className="text-gray-500" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">

          {/* ── Upload step ── */}
          {step === 'upload' && (
            <div className="p-6 space-y-5">
              {/* Drop zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                className="border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all"
                style={{
                  borderColor: isDragOver ? '#10B981' : '#D1FAE5',
                  background: isDragOver ? '#F0FDF4' : '#F9FFF9',
                }}
              >
                <div className="flex flex-col items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center">
                    <Upload size={26} className="text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-gray-700" style={{ fontWeight: 700 }}>
                      {isDragOver ? 'วางไฟล์ที่นี่' : 'ลากไฟล์มาวาง หรือคลิกเพื่อเลือก'}
                    </p>
                    <p className="text-gray-400 text-sm mt-1">รองรับ .xlsx, .xls, .csv</p>
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
                  className="hidden"
                />
              </div>

              {/* Format guide */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-blue-800 text-sm mb-2" style={{ fontWeight: 700 }}>📋 รูปแบบที่รองรับ</p>
                <div className="overflow-x-auto rounded-lg border border-blue-200">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-blue-100">
                        {['ชื่อสมาชิก', 'วันที่', 'จำนวนก้าว'].map(h => (
                          <th key={h} className="px-4 py-2 text-left text-blue-700" style={{ fontWeight: 700 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {members.slice(0, 3).map(m => (
                        <tr key={m.id} className="border-t border-blue-100">
                          <td className="px-4 py-2 text-blue-800">{m.name}</td>
                          <td className="px-4 py-2 text-blue-800">{today}</td>
                          <td className="px-4 py-2 text-blue-800">8,500</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-blue-600 text-xs mt-2">
                  * ชื่อคอลัมน์ไม่ต้องตรงทุกตัว — ระบบจะจับคู่ให้อัตโนมัติ
                </p>
              </div>

              {/* Download template */}
              <button
                onClick={() => { void generateExcelTemplate(members); }}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50 transition-colors"
                style={{ fontWeight: 600 }}
              >
                <Download size={16} />
                ดาวน์โหลด Template Excel
              </button>
            </div>
          )}

          {/* ── Preview step ── */}
          {step === 'preview' && (
            <div className="flex flex-col">
              {/* Toolbar */}
              <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-3 flex-wrap bg-gray-50 shrink-0">
                {/* Sheet selector */}
                {sheetNames.length > 1 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">ชีท:</span>
                    <div className="relative">
                      <select
                        value={selectedSheet}
                        onChange={e => handleSheetChange(parseInt(e.target.value))}
                        className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white pr-7 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                      >
                        {sheetNames.map((s, i) => <option key={i} value={i}>{s}</option>)}
                      </select>
                      <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                )}

                {/* Column map status */}
                {columnMap ? (
                  <div className="flex items-center gap-1.5 bg-emerald-100 text-emerald-700 text-xs px-2.5 py-1 rounded-full">
                    <CheckCircle size={12} />
                    ตรวจพบคอลัมน์อัตโนมัติ
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 bg-amber-100 text-amber-700 text-xs px-2.5 py-1 rounded-full">
                    <AlertCircle size={12} />
                    ตรวจหัวคอลัมน์ไม่ครบ — กรุณาใช้ชื่อ: ชื่อสมาชิก, วันที่, จำนวนก้าว
                  </div>
                )}

                <div className="ml-auto flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-1">
                  {(['all', 'valid', 'invalid'] as const).map(f => (
                    <button key={f}
                      onClick={() => setFilterMode(f)}
                      className={`px-2.5 py-1 rounded-lg text-xs transition-all ${filterMode === f ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-700'}`}
                      style={{ fontWeight: filterMode === f ? 600 : 400 }}
                    >
                      {f === 'all' ? `ทั้งหมด (${parsedRows.length})` : f === 'valid' ? `✓ ถูกต้อง (${validCount})` : `⚠ ข้อผิดพลาด (${parsedRows.length - validCount})`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-gray-50 border-b border-gray-200 z-10">
                    <tr>
                      <th className="px-4 py-3 text-left w-10">
                        <input
                          type="checkbox"
                          checked={validCount > 0 && parsedRows.filter(r => r.isValid).every((_, i) => selectedRows.has(parsedRows.findIndex(r => r.isValid && r === parsedRows.find(x => x.isValid && parsedRows.indexOf(x) >= i))))}
                          onChange={toggleAll}
                          className="rounded"
                        />
                      </th>
                      <th className="px-4 py-3 text-left text-gray-500" style={{ fontWeight: 600 }}>แถว</th>
                      <th className="px-4 py-3 text-left text-gray-500" style={{ fontWeight: 600 }}>ชื่อ (Excel)</th>
                      <th className="px-4 py-3 text-left text-gray-500" style={{ fontWeight: 600 }}>จับคู่กับ</th>
                      <th className="px-4 py-3 text-left text-gray-500" style={{ fontWeight: 600 }}>วันที่</th>
                      <th className="px-4 py-3 text-right text-gray-500" style={{ fontWeight: 600 }}>ก้าว</th>
                      <th className="px-4 py-3 text-center text-gray-500" style={{ fontWeight: 600 }}>สถานะ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredRows.map((row) => {
                      const originalIdx = parsedRows.indexOf(row);
                      const isSelected = selectedRows.has(originalIdx);
                      const existing = row.matchedMemberId && row.date
                        ? getEntryForDate(row.matchedMemberId, row.date)
                        : null;

                      return (
                        <tr
                          key={originalIdx}
                          className={`transition-colors ${row.isValid ? 'hover:bg-gray-50 cursor-pointer' : 'bg-red-50/50 opacity-70'} ${isSelected ? 'bg-emerald-50/40' : ''}`}
                          onClick={() => row.isValid && toggleRow(originalIdx)}
                        >
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              disabled={!row.isValid}
                              onChange={() => toggleRow(originalIdx)}
                              onClick={e => e.stopPropagation()}
                              className="rounded"
                            />
                          </td>
                          <td className="px-4 py-3 text-gray-400 text-xs">{row.rowIndex}</td>
                          <td className="px-4 py-3 text-gray-700">{row.rawName || <span className="text-gray-300 italic">ว่าง</span>}</td>
                          <td className="px-4 py-3">
                            {row.matchedMemberId ? (
                              <span className="inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full"
                                style={{ background: `${memberColor(row.matchedMemberId)}15`, color: memberColor(row.matchedMemberId), fontWeight: 600 }}>
                                <div className="w-1.5 h-1.5 rounded-full" style={{ background: memberColor(row.matchedMemberId) }} />
                                {memberName(row.matchedMemberId)}
                              </span>
                            ) : (
                              <span className="text-red-400 text-xs">ไม่พบ</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-gray-600 text-xs">{fmtDate(row.date)}</td>
                          <td className="px-4 py-3 text-right" style={{ fontWeight: 600, color: row.steps !== null ? '#374151' : '#9CA3AF' }}>
                            {row.steps !== null ? row.steps.toLocaleString('th-TH') : '—'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {row.isValid ? (
                              existing ? (
                                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full" style={{ fontWeight: 600 }}>แทนที่</span>
                              ) : (
                                <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full" style={{ fontWeight: 600 }}>ใหม่</span>
                              )
                            ) : (
                              <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full" title={row.error}>
                                {row.error}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {filteredRows.length === 0 && (
                  <div className="py-12 text-center text-gray-400 text-sm">ไม่มีรายการ</div>
                )}
              </div>
            </div>
          )}

          {/* ── Done step ── */}
          {step === 'done' && importResult && (
            <div className="p-8 flex flex-col items-center gap-6 text-center">
              <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center">
                <CheckCircle size={32} className="text-emerald-500" />
              </div>
              <div>
                <h3 className="text-gray-800 mb-1" style={{ fontWeight: 700, fontSize: '1.25rem' }}>นำเข้าสำเร็จ!</h3>
                <p className="text-gray-500 text-sm">ข้อมูลถูกบันทึกเข้าระบบแล้ว</p>
              </div>
              <div className="grid grid-cols-3 gap-4 w-full max-w-sm">
                {[
                  { label: 'นำเข้าสำเร็จ', value: importResult.success, color: '#10B981', bg: '#F0FDF4' },
                  { label: 'ข้ามแล้ว', value: importResult.skipped, color: '#F59E0B', bg: '#FFFBEB' },
                  { label: 'ข้อผิดพลาด', value: importResult.errors, color: '#EF4444', bg: '#FEF2F2' },
                ].map(item => (
                  <div key={item.label} className="rounded-xl p-4" style={{ background: item.bg }}>
                    <div style={{ color: item.color, fontWeight: 800, fontSize: '1.75rem' }}>{item.value}</div>
                    <p className="text-xs text-gray-500 mt-0.5">{item.label}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-3 w-full max-w-sm">
                <button onClick={reset}
                  className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm transition-colors">
                  นำเข้าอีกครั้ง
                </button>
                <button onClick={onClose}
                  className="flex-1 py-3 rounded-xl text-white text-sm transition-all hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg, #10B981, #059669)', fontWeight: 600 }}>
                  เสร็จสิ้น
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer (preview step only) */}
        {step === 'preview' && (
          <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between gap-4 bg-white shrink-0">
            <p className="text-sm text-gray-600">
              เลือก <strong style={{ color: '#10B981' }}>{selectedCount}</strong> รายการจาก {validCount} รายการที่ถูกต้อง
            </p>
            <div className="flex gap-3">
              <button onClick={onClose}
                className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm transition-colors">
                ยกเลิก
              </button>
              <button
                onClick={handleImport}
                disabled={selectedCount === 0 || importing}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white transition-all hover:opacity-90 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: 'linear-gradient(135deg, #10B981, #059669)', fontWeight: 600 }}
              >
                {importing ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
                <span className="text-sm">
                  {importing ? 'กำลังนำเข้า...' : `นำเข้า ${selectedCount} รายการ`}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
