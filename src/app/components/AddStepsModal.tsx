import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Save, Trash2, AlertCircle, Upload, Image, ExternalLink, Loader2, CheckCircle, XCircle, Camera } from 'lucide-react';
import { useStepContext, getTodayString } from '../context/StepContext';
import { imageStorage } from '../services/imageStorage';
import { googleDriveService } from '../services/googleDrive';

interface AddStepsModalProps {
  isOpen: boolean;
  memberId?: string;
  date?: string;
  onClose: () => void;
  onSuccess?: () => void;
}

type UploadState = 'idle' | 'uploading' | 'success' | 'error';

export function AddStepsModal({ isOpen, memberId: initMemberId, date: initDate, onClose, onSuccess }: AddStepsModalProps) {
  const { members, addOrUpdateEntry, deleteEntry, getEntryForDate, startDate, updateEntryProof } = useStepContext();

  const [selectedMemberId, setSelectedMemberId] = useState(initMemberId || '');
  const [selectedDate, setSelectedDate] = useState(initDate || getTodayString());
  const [steps, setSteps] = useState('');
  const [error, setError] = useState('');

  // Proof image state
  const [proofDataUrl, setProofDataUrl] = useState<string | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [uploadError, setUploadError] = useState('');
  const [driveUrl, setDriveUrl] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const today = getTodayString();
  const existingEntry = selectedMemberId && selectedDate
    ? getEntryForDate(selectedMemberId, selectedDate)
    : undefined;

  // Load existing proof when entry changes
  useEffect(() => {
    if (!isOpen) return;
    setProofDataUrl(null);
    setProofFile(null);
    setUploadState('idle');
    setUploadError('');
    setDriveUrl(null);

    if (existingEntry) {
      if (existingEntry.proofDriveUrl) setDriveUrl(existingEntry.proofDriveUrl);
      if (existingEntry.hasLocalProof) {
        const key = imageStorage.proofKey(
          selectedMemberId || initMemberId || '',
          selectedDate || initDate || ''
        );
        imageStorage.getImage(key).then((url: string | null) => {
          if (url) setProofDataUrl(url);
        });
      }
    }
  }, [existingEntry, isOpen]);

  useEffect(() => {
    if (isOpen) {
      setSelectedMemberId(initMemberId || '');
      setSelectedDate(initDate || getTodayString());
      setError('');
    }
  }, [isOpen, initMemberId, initDate]);

  useEffect(() => {
    if (existingEntry) {
      setSteps(String(existingEntry.steps));
    } else {
      setSteps('');
    }
  }, [existingEntry?.steps]);

  if (!isOpen) return null;

  const selectedMember = members.find(m => m.id === selectedMemberId);

  // ── Image handlers ───────────────────────────────────────────────────────────
  const handleFileSelected = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setUploadError('กรุณาเลือกไฟล์ภาพเท่านั้น (JPG, PNG, HEIC...)');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setUploadError('ไฟล์ใหญ่เกินไป (สูงสุด 20MB)');
      return;
    }
    setUploadError('');
    setProofFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setProofDataUrl(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelected(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelected(file);
  };

  const removeProof = () => {
    setProofDataUrl(null);
    setProofFile(null);
    setDriveUrl(null);
    setUploadState('idle');
    setUploadError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Save proof (local + Drive) ───────────────────────────────────────────────
  const saveProof = async (memberId: string, date: string): Promise<{ hasLocalProof: boolean; driveFileId?: string; driveUrl?: string }> => {
    if (!proofDataUrl) return { hasLocalProof: false };

    // Resize for storage
    const resized = await imageStorage.resizeImage(proofDataUrl);

    // Save locally (IndexedDB)
    const localKey = imageStorage.proofKey(memberId, date);
    await imageStorage.saveImage(localKey, resized);

    // Upload to Google Drive if authenticated
    if (googleDriveService.isAuthenticated) {
      setUploadState('uploading');
      try {
        const member = members.find(m => m.id === memberId);
        const result = await googleDriveService.uploadImage(
          memberId,
          member?.name || memberId,
          date,
          resized
        );
        setDriveUrl(result.webViewUrl);
        setUploadState('success');
        return { hasLocalProof: true, driveFileId: result.fileId, driveUrl: result.webViewUrl };
      } catch (err: any) {
        setUploadState('error');
        setUploadError(`Drive: ${err.message}`);
        return { hasLocalProof: true }; // saved locally even if Drive failed
      }
    }

    return { hasLocalProof: true };
  };

  // ── Form submit ──────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedMemberId) { setError('กรุณาเลือกสมาชิก'); return; }
    if (!selectedDate) { setError('กรุณาเลือกวันที่'); return; }
    if (selectedDate > today) { setError('ไม่สามารถเพิ่มข้อมูลสำหรับวันในอนาคตได้'); return; }
    if (selectedDate < startDate) { setError(`ไม่สามารถเพิ่มข้อมูลก่อนวันเริ่มต้น (${formatDate(startDate)})`); return; }

    const stepsNum = parseInt(steps);
    if (!steps || isNaN(stepsNum) || stepsNum < 0) { setError('กรุณากรอกจำนวนก้าวที่ถูกต้อง'); return; }
    if (stepsNum > 100000) { setError('จำนวนก้าวต้องไม่เกิน 100,000 ก้าวต่อวัน'); return; }

    // Save proof if new image selected, or if existing local proof not yet on Drive
    let proof: { hasLocalProof?: boolean; proofDriveFileId?: string; proofDriveUrl?: string } = {};
    if (proofFile) {
      // New image selected → save locally + upload to Drive if connected
      const result = await saveProof(selectedMemberId, selectedDate);
      proof = {
        hasLocalProof: result.hasLocalProof,
        proofDriveFileId: result.driveFileId,
        proofDriveUrl: result.driveUrl,
      };
    } else if (proofDataUrl && googleDriveService.isAuthenticated && !existingEntry?.proofDriveUrl) {
      // Existing local proof not yet on Drive, Drive is now connected → auto-upload
      const result = await saveProof(selectedMemberId, selectedDate);
      proof = {
        hasLocalProof: result.hasLocalProof ?? existingEntry?.hasLocalProof,
        proofDriveFileId: result.driveFileId ?? existingEntry?.proofDriveFileId,
        proofDriveUrl: result.driveUrl ?? existingEntry?.proofDriveUrl,
      };
    } else if (existingEntry) {
      // Keep existing proof data
      proof = {
        hasLocalProof: existingEntry.hasLocalProof,
        proofDriveFileId: existingEntry.proofDriveFileId,
        proofDriveUrl: existingEntry.proofDriveUrl,
      };
    }

    try {
      await addOrUpdateEntry(selectedMemberId, selectedDate, stepsNum, proof);
    } catch {
      setError('บันทึกข้อมูลไม่สำเร็จ กรุณาลองใหม่');
      return;
    }
    onSuccess?.();
    onClose();
  };

  const handleDelete = () => {
    if (existingEntry && selectedMemberId && selectedDate) {
      // Clean up local proof
      const key = imageStorage.proofKey(selectedMemberId, selectedDate);
      imageStorage.deleteImage(key).catch(() => {});
      // Optionally delete from Drive
      if (existingEntry.proofDriveFileId && googleDriveService.isAuthenticated) {
        googleDriveService.deleteFile(existingEntry.proofDriveFileId).catch(() => {});
      }
      deleteEntry(selectedMemberId, selectedDate);
      onSuccess?.();
      onClose();
    }
  };

  const driveConnected = googleDriveService.isConfigured;
  const accentColor = selectedMember?.color || '#6366F1';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col">

        {/* Header */}
        <div
          className="px-6 py-5 flex items-center justify-between shrink-0"
          style={{
            background: `linear-gradient(135deg, ${accentColor}18, ${accentColor}08)`,
            borderBottom: `2px solid ${accentColor}25`,
          }}
        >
          <div>
            <h2 className="text-gray-800" style={{ fontSize: '1.1rem', fontWeight: 700 }}>
              {existingEntry ? '✏️ แก้ไขข้อมูลก้าว' : '➕ เพิ่มข้อมูลก้าว'}
            </h2>
            <p className="text-gray-500 text-xs mt-0.5">
              {existingEntry ? 'อัพเดตข้อมูลการนับก้าวและหลักฐาน' : 'กรอกข้อมูลและแนบหลักฐาน'}
            </p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-gray-100 transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Scrollable body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* Member */}
          <div>
            <label className="block text-sm text-gray-600 mb-1.5" style={{ fontWeight: 600 }}>สมาชิก</label>
            <select
              value={selectedMemberId}
              onChange={e => setSelectedMemberId(e.target.value)}
              disabled={!!initMemberId}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:bg-gray-50 disabled:cursor-not-allowed transition"
            >
              <option value="">-- เลือกสมาชิก --</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm text-gray-600 mb-1.5" style={{ fontWeight: 600 }}>วันที่</label>
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              min={startDate}
              max={today}
              disabled={!!initDate}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:bg-gray-50 disabled:cursor-not-allowed transition"
            />
            {existingEntry && (
              <p className="text-amber-600 text-xs mt-1.5 flex items-center gap-1">
                <AlertCircle size={12} />
                มีข้อมูลอยู่แล้ว {existingEntry.steps.toLocaleString('th-TH')} ก้าว — การบันทึกจะเป็นการแก้ไข
              </p>
            )}
          </div>

          {/* Steps */}
          <div>
            <label className="block text-sm text-gray-600 mb-1.5" style={{ fontWeight: 600 }}>จำนวนก้าว</label>
            <div className="relative">
              <input
                type="number"
                value={steps}
                onChange={e => setSteps(e.target.value)}
                placeholder="เช่น 8500"
                min="0"
                max="100000"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-16 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-300 transition"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">ก้าว</span>
            </div>
            {steps && !isNaN(parseInt(steps)) && parseInt(steps) > 0 && (
              <div className="mt-2 flex items-center gap-2">
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min((parseInt(steps) / 10000) * 100, 100)}%`,
                      background: parseInt(steps) >= 10000 ? '#10B981' : parseInt(steps) >= 7500 ? accentColor : '#F59E0B',
                    }}
                  />
                </div>
                <span className="text-xs text-gray-500">
                  {parseInt(steps) >= 10000 ? '🎉 เป้าหมาย!' : `${Math.round((parseInt(steps) / 10000) * 100)}% ของ 10,000`}
                </span>
              </div>
            )}
          </div>

          {/* ── Proof Image ─────────────────────────────────────────────────────── */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm text-gray-600" style={{ fontWeight: 600 }}>
                📸 ภาพหลักฐาน
              </label>
              <div className="flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${driveConnected ? 'bg-emerald-400' : 'bg-gray-300'}`} />
                <span className="text-xs text-gray-400">
                  {driveConnected ? 'Drive พร้อม' : 'Drive ยังไม่เชื่อมต่อ'}
                </span>
              </div>
            </div>

            {proofDataUrl ? (
              /* Preview */
              <div className="relative rounded-xl overflow-hidden border border-gray-200">
                <img
                  src={proofDataUrl}
                  alt="หลักฐาน"
                  className="w-full h-48 object-cover"
                />
                {/* Overlay actions */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-end p-3 gap-2">
                  {/* Upload status */}
                  {uploadState === 'uploading' && (
                    <div className="flex items-center gap-2 bg-blue-500/90 text-white text-xs rounded-lg px-3 py-2">
                      <Loader2 size={13} className="animate-spin" />
                      กำลังอัพโหลดไปยัง Drive...
                    </div>
                  )}
                  {uploadState === 'success' && driveUrl && (
                    <div className="flex items-center justify-between bg-emerald-500/90 text-white text-xs rounded-lg px-3 py-2">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle size={13} />
                        บันทึกใน Drive แล้ว
                      </span>
                      <a href={driveUrl} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 underline hover:no-underline">
                        เปิด <ExternalLink size={11} />
                      </a>
                    </div>
                  )}
                  {existingEntry?.proofDriveUrl && uploadState === 'idle' && (
                    <a href={existingEntry.proofDriveUrl} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-xs rounded-lg px-3 py-2 w-fit transition-colors">
                      <ExternalLink size={12} />
                      ดูใน Google Drive
                    </a>
                  )}
                  {uploadState === 'error' && (
                    <div className="flex items-center gap-1.5 bg-red-500/90 text-white text-xs rounded-lg px-3 py-2">
                      <XCircle size={13} />
                      {uploadError}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-xs rounded-lg px-3 py-2 transition-colors"
                    >
                      <Camera size={12} />
                      เปลี่ยนรูป
                    </button>
                    <button
                      type="button"
                      onClick={removeProof}
                      className="flex items-center gap-1.5 bg-red-500/80 hover:bg-red-500 text-white text-xs rounded-lg px-3 py-2 transition-colors"
                    >
                      <X size={12} />
                      ลบ
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Drop zone */
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all"
                style={{
                  borderColor: isDragOver ? accentColor : '#E5E7EB',
                  background: isDragOver ? `${accentColor}08` : '#FAFAFA',
                }}
              >
                <div className="flex flex-col items-center gap-2">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: `${accentColor}15` }}>
                    <Image size={20} style={{ color: accentColor }} />
                  </div>
                  <div>
                    <p className="text-gray-700 text-sm" style={{ fontWeight: 600 }}>
                      {isDragOver ? 'วางภาพที่นี่' : 'แนบภาพหลักฐาน'}
                    </p>
                    <p className="text-gray-400 text-xs mt-0.5">
                      ลากมาวางหรือคลิกเพื่อเลือก • JPG, PNG, HEIC (สูงสุด 20MB)
                    </p>
                  </div>
                  {driveConnected && (
                    <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5 mt-1">
                      <CheckCircle size={12} className="text-emerald-500" />
                      <span className="text-emerald-700 text-xs">จะอัพโหลดไปยัง Google Drive อัตโนมัติ</span>
                    </div>
                  )}
                  {!driveConnected && (
                    <p className="text-gray-400 text-xs">
                      ภาพจะถูกเก็บในเครื่อง —
                      <span className="text-indigo-500"> ตั้งค่า Drive ในหน้าหลักเพื่ออัพโหลด</span>
                    </p>
                  )}
                </div>
              </div>
            )}

            {uploadError && uploadState !== 'error' && (
              <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                <AlertCircle size={11} />
                {uploadError}
              </p>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileInput}
              className="hidden"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-2">
              <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            {existingEntry && (
              <button
                type="button"
                onClick={handleDelete}
                className="flex items-center gap-2 px-4 py-3 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
              >
                <Trash2 size={16} />
                <span className="text-sm">ลบ</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors text-sm"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={uploadState === 'uploading'}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-white transition-all hover:opacity-90 active:scale-95 disabled:opacity-60"
              style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}CC)` }}
            >
              {uploadState === 'uploading' ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Save size={16} />
              )}
              <span className="text-sm" style={{ fontWeight: 600 }}>
                {uploadState === 'uploading' ? 'กำลังบันทึก...' : 'บันทึก'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('th-TH', {
    year: 'numeric', month: 'short', day: 'numeric'
  });
}
