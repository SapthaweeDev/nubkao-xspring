import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, ExternalLink, HardDrive, X, Loader2, LogOut, ChevronDown, ChevronUp } from 'lucide-react';
import { googleDriveService } from '../services/googleDrive';

interface DriveSetupPanelProps {
  onClose?: () => void;
  compact?: boolean;
}

export function DriveSetupPanel({ onClose, compact = false }: DriveSetupPanelProps) {
  const [clientId, setClientId] = useState(googleDriveService.clientId);
  const [isAuthenticated, setIsAuthenticated] = useState(googleDriveService.isAuthenticated);
  const [status, setStatus] = useState<'idle' | 'connecting' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    const tick = setInterval(() => {
      setIsAuthenticated(googleDriveService.isAuthenticated);
    }, 2000);
    return () => clearInterval(tick);
  }, []);

  const handleSaveAndConnect = async () => {
    if (!clientId.trim()) {
      setErrorMsg('กรุณากรอก Client ID');
      return;
    }
    setStatus('connecting');
    setErrorMsg('');
    try {
      googleDriveService.setClientId(clientId.trim());
      await googleDriveService.authenticate();
      setIsAuthenticated(true);
      setStatus('success');
    } catch (err: any) {
      setStatus('error');
      setErrorMsg(err.message || 'เชื่อมต่อไม่สำเร็จ');
    }
  };

  const handleDisconnect = () => {
    googleDriveService.clearAuth();
    setIsAuthenticated(false);
    setStatus('idle');
  };

  const handleClearConfig = () => {
    googleDriveService.clearConfig();
    setClientId('');
    setIsAuthenticated(false);
    setStatus('idle');
  };

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <div className={`w-2.5 h-2.5 rounded-full ${isAuthenticated ? 'bg-emerald-400' : 'bg-gray-300'}`} />
        <span className="text-sm text-gray-600">
          {isAuthenticated ? 'Google Drive เชื่อมต่อแล้ว' : 'ยังไม่ได้เชื่อมต่อ Drive'}
        </span>
        {isAuthenticated && (
          <button onClick={handleDisconnect} className="text-xs text-gray-400 hover:text-red-500 transition-colors">
            ออกจากระบบ
          </button>
        )}
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
            <p className="text-gray-500 text-xs">เชื่อมต่อเพื่ออัพโหลดหลักฐานภาพ</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isAuthenticated && (
            <span className="flex items-center gap-1.5 bg-emerald-100 text-emerald-700 text-xs px-2.5 py-1 rounded-full" style={{ fontWeight: 600 }}>
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              เชื่อมต่อแล้ว
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
        {/* Connected state */}
        {isAuthenticated ? (
          <div className="space-y-3">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-center gap-3">
              <CheckCircle size={18} className="text-emerald-500 shrink-0" />
              <div>
                <p className="text-emerald-800 text-sm" style={{ fontWeight: 600 }}>เชื่อมต่อสำเร็จ!</p>
                <p className="text-emerald-600 text-xs">ภาพหลักฐานจะถูกบันทึกในโฟลเดอร์ "Step Tracker Proofs"</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleDisconnect}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors text-sm"
              >
                <LogOut size={14} />
                ออกจากระบบ
              </button>
              <button
                onClick={handleClearConfig}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-100 text-red-500 hover:bg-red-50 transition-colors text-sm"
              >
                <X size={14} />
                ล้างการตั้งค่า
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Client ID input */}
            <div>
              <label className="block text-sm text-gray-600 mb-1.5" style={{ fontWeight: 600 }}>
                OAuth 2.0 Client ID
              </label>
              <input
                type="text"
                value={clientId}
                onChange={e => setClientId(e.target.value)}
                placeholder="xxxxxx.apps.googleusercontent.com"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-300 font-mono"
              />
            </div>

            {/* Error */}
            {status === 'error' && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-2">
                <AlertCircle size={15} className="text-red-500 shrink-0 mt-0.5" />
                <p className="text-red-600 text-sm">{errorMsg}</p>
              </div>
            )}

            <button
              onClick={handleSaveAndConnect}
              disabled={status === 'connecting'}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white transition-all hover:opacity-90 active:scale-95 disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #4285F4, #1a73e8)' }}
            >
              {status === 'connecting' ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
              )}
              <span style={{ fontWeight: 600 }}>
                {status === 'connecting' ? 'กำลังเชื่อมต่อ...' : 'เชื่อมต่อกับ Google'}
              </span>
            </button>
          </>
        )}

        {/* Setup guide */}
        <div className="border border-gray-100 rounded-xl overflow-hidden">
          <button
            onClick={() => setShowGuide(!showGuide)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <span style={{ fontWeight: 600 }}>📋 วิธีรับ Client ID</span>
            {showGuide ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
          {showGuide && (
            <div className="px-4 pb-4 space-y-2 border-t border-gray-100">
              {[
                { step: '1', text: 'ไปที่ Google Cloud Console', link: 'https://console.cloud.google.com' },
                { step: '2', text: 'สร้างโปรเจกต์ใหม่หรือเลือกโปรเจกต์ที่มีอยู่' },
                { step: '3', text: 'ไปที่ APIs & Services → Enable APIs → เปิดใช้ Google Drive API' },
                { step: '4', text: 'ไปที่ Credentials → สร้าง OAuth 2.0 Client ID (Web application)' },
                { step: '5', text: 'เพิ่ม URL ของแอปนี้ใน Authorized JavaScript origins' },
                { step: '6', text: 'คัดลอก Client ID มากรอกในช่องด้านบน' },
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
