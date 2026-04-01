import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, ExternalLink, HardDrive, X, ChevronDown, ChevronUp, Loader2, Trash2 } from 'lucide-react';

interface DriveSetupPanelProps {
  onClose?: () => void;
  compact?: boolean;
  isAdmin?: boolean;
}

export function DriveSetupPanel({ onClose, compact = false, isAdmin = false }: DriveSetupPanelProps) {
  const [isConfigured, setIsConfigured] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [showGuide, setShowGuide] = useState(false);
  const [jsonInput, setJsonInput] = useState('');
  const [folderUrl, setFolderUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const checkStatus = () => {
    fetch('/api/drive/status')
      .then(r => r.json())
      .then(d => { setIsConfigured(!!d.configured); setLoadingConfig(false); })
      .catch(() => setLoadingConfig(false));
  };

  useEffect(() => { checkStatus(); }, []);

  const handleSave = async () => {
    setSaveError('');
    let parsed: any;
    try {
      parsed = JSON.parse(jsonInput.trim());
    } catch {
      setSaveError('JSON ไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง');
      return;
    }
    if (!parsed.client_email || !parsed.private_key) {
      setSaveError('ไม่พบ client_email หรือ private_key ใน JSON');
      return;
    }

    // Extract folder ID from URL or use raw ID
    const folderMatch = folderUrl.trim().match(/folders\/([a-zA-Z0-9_-]+)/);
    const folderId = folderMatch ? folderMatch[1] : folderUrl.trim();
    if (!folderId) {
      setSaveError('กรุณากรอก URL หรือ ID ของโฟลเดอร์ Google Drive');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/drive/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: parsed.client_email, privateKey: parsed.private_key, folderId }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'บันทึกล้มเหลว');
      setJsonInput('');
      setFolderUrl('');
      setLoadingConfig(true);
      checkStatus();
    } catch (err: any) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    await fetch('/api/drive/config', { method: 'DELETE' });
    setLoadingConfig(true);
    checkStatus();
  };

  if (compact) {
    if (loadingConfig) return <div className="text-xs text-gray-400">กำลังโหลด...</div>;
    return (
      <div className="flex items-center gap-3">
        <div className={`w-2.5 h-2.5 rounded-full ${isConfigured ? 'bg-emerald-400' : 'bg-gray-300'}`} />
        <span className="text-sm text-gray-600">
          {isConfigured ? 'Google Drive พร้อมใช้งาน' : 'ยังไม่ได้ตั้งค่า Drive'}
        </span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100"
        style={{ background: 'linear-gradient(135deg, #EEF2FF, #F5F3FF)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center">
            <HardDrive size={18} className="text-indigo-600" />
          </div>
          <div>
            <h3 className="text-gray-800" style={{ fontWeight: 700 }}>Google Drive</h3>
            <p className="text-gray-500 text-xs">อัพโหลดผ่าน Service Account ของทีมงาน</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isConfigured && (
            <span className="flex items-center gap-1.5 bg-emerald-100 text-emerald-700 text-xs px-2.5 py-1 rounded-full" style={{ fontWeight: 600 }}>
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              พร้อมใช้งาน
            </span>
          )}
          {onClose && (
            <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-white/60 flex items-center justify-center transition-colors">
              <X size={16} className="text-gray-500" />
            </button>
          )}
        </div>
      </div>

      <div className="p-5 space-y-4">
        {loadingConfig ? (
          <div className="text-sm text-gray-400 py-2">กำลังตรวจสอบ...</div>
        ) : isConfigured ? (
          <div className="space-y-3">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-start gap-3">
              <CheckCircle size={18} className="text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-emerald-800 text-sm" style={{ fontWeight: 600 }}>Service Account พร้อมใช้งาน</p>
                <p className="text-emerald-600 text-xs mt-0.5">ภาพหลักฐานจะถูกบันทึกในโฟลเดอร์ "nubkao_xspring" บน Google Drive ของทีมงาน โดยไม่ต้อง Approve จาก User</p>
              </div>
            </div>
            {isAdmin && (
              <button
                onClick={handleClear}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-red-100 text-red-500 hover:bg-red-50 transition-colors text-sm"
              >
                <Trash2 size={14} />
                ลบ Service Account
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3">
              <AlertCircle size={18} className="text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-amber-800 text-sm" style={{ fontWeight: 600 }}>ยังไม่ได้ตั้งค่า Service Account</p>
                <p className="text-amber-600 text-xs mt-0.5">
                  {isAdmin ? 'วาง Service Account JSON ด้านล่างเพื่อเปิดใช้งาน' : 'กรุณาติดต่อ Admin เพื่อตั้งค่า Google Drive'}
                </p>
              </div>
            </div>
            {isAdmin && (
              <div className="space-y-2">
                <label className="block text-xs text-gray-600 font-semibold">Service Account JSON</label>
                <textarea
                  value={jsonInput}
                  onChange={e => { setJsonInput(e.target.value); setSaveError(''); }}
                  placeholder={'วาง JSON ที่ได้จาก Google Cloud Console ที่นี่...\n{\n  "type": "service_account",\n  "client_email": "...",\n  "private_key": "...",\n  ...\n}'}
                  rows={6}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-mono text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
                />
                <label className="block text-xs text-gray-600 font-semibold mt-2">
                  Google Drive Folder URL <span className="text-gray-400 font-normal">(ที่ share ให้ Service Account แล้ว)</span>
                </label>
                <input
                  type="text"
                  value={folderUrl}
                  onChange={e => { setFolderUrl(e.target.value); setSaveError(''); }}
                  placeholder="https://drive.google.com/drive/folders/xxxxxxxxxxxxxxxx"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-mono text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
                {saveError && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle size={12} /> {saveError}
                  </p>
                )}
                <button
                  onClick={handleSave}
                  disabled={saving || !jsonInput.trim()}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm disabled:opacity-50 transition-all"
                  style={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)' }}
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                  {saving ? 'กำลังบันทึก...' : 'บันทึก Service Account'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Setup guide */}
        <div className="border border-gray-100 rounded-xl overflow-hidden">
          <button
            onClick={() => setShowGuide(!showGuide)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <span style={{ fontWeight: 600 }}>📋 วิธีตั้งค่า Service Account</span>
            {showGuide ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
          {showGuide && (
            <div className="px-4 pb-4 space-y-2 border-t border-gray-100">
              {[
                { step: '1', text: 'ไปที่ Google Cloud Console', link: 'https://console.cloud.google.com' },
                { step: '2', text: 'สร้างโปรเจกต์ → ไปที่ APIs & Services → Enable Google Drive API' },
                { step: '3', text: 'ไปที่ IAM & Admin → Service Accounts → สร้าง Service Account ใหม่' },
                { step: '4', text: 'สร้าง Key (JSON) สำหรับ Service Account แล้วดาวน์โหลด' },
                { step: '5', text: 'เปิด Google Drive ส่วนตัว → สร้างโฟลเดอร์ใหม่ → คลิกขวา → Share → ใส่ client_email ของ Service Account → Editor' },
                { step: '6', text: 'คัดลอก URL ของโฟลเดอร์จาก Browser เช่น https://drive.google.com/drive/folders/xxxxxxxx' },
                { step: '7', text: 'วาง JSON และ Folder URL ในช่องด้านบนแล้วกด บันทึก' },
              ].map(item => (
                <div key={item.step} className="flex gap-3 pt-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 text-xs flex items-center justify-center shrink-0" style={{ fontWeight: 700 }}>
                    {item.step}
                  </span>
                  <p className="text-gray-600 text-xs leading-relaxed">
                    {item.text}
                    {item.link && (
                      <a href={item.link} target="_blank" rel="noopener noreferrer"
                        className="ml-1 text-indigo-500 hover:underline inline-flex items-center gap-0.5">
                        {item.link} <ExternalLink size={10} />
                      </a>
                    )}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


