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
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [folderUrl, setFolderUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [flashMsg, setFlashMsg] = useState('');

  const checkStatus = () => {
    setLoadingConfig(true);
    fetch('/api/drive/status')
      .then(r => r.json())
      .then(d => { setIsConfigured(!!d.configured); setLoadingConfig(false); })
      .catch(() => setLoadingConfig(false));
  };

  useEffect(() => {
    checkStatus();
    // Check URL for OAuth callback result
    const params = new URLSearchParams(window.location.search);
    if (params.get('drive_connected') === '1') {
      setFlashMsg('เชื่อมต่อ Google Drive สำเร็จ!');
      window.history.replaceState({}, '', window.location.pathname);
    } else if (params.get('drive_error')) {
      setSaveError(decodeURIComponent(params.get('drive_error')!));
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const handleSaveAndConnect = async () => {
    setSaveError('');
    if (!clientId.trim() || !clientSecret.trim() || !folderUrl.trim()) {
      setSaveError('กรุณากรอกข้อมูลให้ครบทุกช่อง');
      return;
    }
    const folderMatch = folderUrl.trim().match(/folders\/([a-zA-Z0-9_-]+)/);
    const folderId = folderMatch ? folderMatch[1] : folderUrl.trim();

    setSaving(true);
    try {
      const res = await fetch('/api/drive/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: clientId.trim(), clientSecret: clientSecret.trim(), folderId }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'บันทึกล้มเหลว');
      // Redirect to Google OAuth
      window.location.href = '/api/drive/auth';
    } catch (err: any) {
      setSaveError(err.message);
      setSaving(false);
    }
  };

  const handleDisconnect = async () => {
    await fetch('/api/drive/config', { method: 'DELETE' });
    setIsConfigured(false);
    setClientId('');
    setClientSecret('');
    setFolderUrl('');
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
            <p className="text-gray-500 text-xs">อัพโหลดหลักฐานภาพไปที่ Drive ของทีมงาน</p>
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
        {flashMsg && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-center gap-2">
            <CheckCircle size={15} className="text-emerald-500" />
            <p className="text-emerald-700 text-sm">{flashMsg}</p>
          </div>
        )}

        {loadingConfig ? (
          <div className="text-sm text-gray-400 py-2">กำลังตรวจสอบ...</div>
        ) : isConfigured ? (
          <div className="space-y-3">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-start gap-3">
              <CheckCircle size={18} className="text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-emerald-800 text-sm" style={{ fontWeight: 600 }}>เชื่อมต่อสำเร็จ</p>
                <p className="text-emerald-600 text-xs mt-0.5">ภาพหลักฐานจะถูกบันทึกใน Google Drive ของทีมงาน</p>
              </div>
            </div>
            {isAdmin && (
              <button
                onClick={handleDisconnect}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-red-100 text-red-500 hover:bg-red-50 transition-colors text-sm"
              >
                <Trash2 size={14} />
                ยกเลิกการเชื่อมต่อ
              </button>
            )}
          </div>
        ) : (
          isAdmin ? (
            <div className="space-y-3">
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3">
                <AlertCircle size={18} className="text-amber-500 shrink-0 mt-0.5" />
                <p className="text-amber-800 text-sm">กรอกข้อมูลด้านล่างแล้วกด "เชื่อมต่อด้วย Google" เพื่อ Authorize</p>
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-gray-600">OAuth 2.0 Client ID</label>
                <input type="text" value={clientId} onChange={e => setClientId(e.target.value)}
                  placeholder="xxxxxxxx.apps.googleusercontent.com"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-mono text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                <label className="block text-xs font-semibold text-gray-600 mt-1">Client Secret</label>
                <input type="password" value={clientSecret} onChange={e => setClientSecret(e.target.value)}
                  placeholder="GOCSPX-xxxxxxxxxxxx"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-mono text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                <label className="block text-xs font-semibold text-gray-600 mt-1">Google Drive Folder URL</label>
                <input type="text" value={folderUrl} onChange={e => setFolderUrl(e.target.value)}
                  placeholder="https://drive.google.com/drive/folders/xxxxxxxxxxxxxxxx"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-mono text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
              </div>
              {saveError && (
                <div className="flex items-start gap-2 text-red-500 text-xs">
                  <AlertCircle size={12} className="mt-0.5 shrink-0" /> {saveError}
                </div>
              )}
              <button onClick={handleSaveAndConnect} disabled={saving}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white text-sm font-semibold disabled:opacity-60 transition-all"
                style={{ background: 'linear-gradient(135deg, #4285F4, #1a73e8)' }}>
                {saving ? <Loader2 size={15} className="animate-spin" /> : (
                  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                )}
                {saving ? 'กำลังบันทึก...' : 'เชื่อมต่อด้วย Google'}
              </button>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3">
              <AlertCircle size={18} className="text-amber-500 shrink-0 mt-0.5" />
              <p className="text-amber-800 text-sm">กรุณาติดต่อ Admin เพื่อตั้งค่า Google Drive</p>
            </div>
          )
        )}

        {/* Setup guide */}
        {isAdmin && (
          <div className="border border-gray-100 rounded-xl overflow-hidden">
            <button onClick={() => setShowGuide(!showGuide)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
              <span style={{ fontWeight: 600 }}>📋 วิธีรับ Client ID & Secret</span>
              {showGuide ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </button>
            {showGuide && (
              <div className="px-4 pb-4 space-y-2 border-t border-gray-100">
                {[
                  { step: '1', text: 'ไปที่ Google Cloud Console', link: 'https://console.cloud.google.com' },
                  { step: '2', text: 'APIs & Services → Enable Google Drive API' },
                  { step: '3', text: 'Credentials → Create → OAuth 2.0 Client ID → Web application' },
                  { step: '4', text: `เพิ่ม Authorized redirect URI: ${typeof window !== 'undefined' ? window.location.origin : 'https://yourapp.com'}/api/drive/callback` },
                  { step: '5', text: 'สร้างโฟลเดอร์ใน Google Drive → คัดลอก URL' },
                  { step: '6', text: 'กรอก Client ID, Client Secret, Folder URL แล้วกดเชื่อมต่อ' },
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
        )}
      </div>
    </div>
  );
}
