import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { TrendingUp, Plus, AlertTriangle, CheckCircle, ChevronRight, Settings, FileSpreadsheet, HardDrive, Image } from 'lucide-react';
import { useStepContext, getTodayString } from '../context/StepContext';
import { AddStepsModal } from './AddStepsModal';
import { ExcelImportModal } from './ExcelImportModal';
import { DriveSetupPanel } from './DriveSetupPanel';
import { AddStepModalState } from '../types';
import { googleDriveService } from '../services/googleDrive';

function formatSteps(n: number) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}ล.`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toLocaleString('th-TH');
}

function getInitials(name: string) {
  return name.split(' ').map(p => p[0]).join('').slice(0, 2);
}

export function Dashboard() {
  const router = useRouter();
  const { members, getAllDates, getMissingDates, getSubmittedDates, getTotalSteps, startDate, setStartDate, entries } = useStepContext();

  const [modal, setModal] = useState<AddStepModalState>({ isOpen: false });
  const [showExcel, setShowExcel] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [tempStartDate, setTempStartDate] = useState(startDate);
  const [sortBy, setSortBy] = useState<'steps' | 'missing' | 'name'>('steps');
  const [driveConnected, setDriveConnected] = useState(googleDriveService.isConfigured);

  const [isAdmin, setIsAdmin] = useState(false);
  React.useEffect(() => {
    if (sessionStorage.getItem('isAdmin') === 'true') setIsAdmin(true);
  }, []);
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const logoClickCount = React.useRef(0);
  const logoClickTimer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const handleLogoClick = () => {
    if (isAdmin) return;
    logoClickCount.current += 1;
    if (logoClickCount.current >= 5) {
      logoClickCount.current = 0;
      clearTimeout(logoClickTimer.current);
      setShowPinDialog(true);
    } else {
      clearTimeout(logoClickTimer.current);
      logoClickTimer.current = setTimeout(() => { logoClickCount.current = 0; }, 2000);
    }
  };

  const handlePinSubmit = () => {
    const adminPin = process.env.NEXT_PUBLIC_ADMIN_PIN || '1234';
    if (pinInput === adminPin) {
      setIsAdmin(true);
      sessionStorage.setItem('isAdmin', 'true');
      setShowPinDialog(false);
      setPinInput('');
      setPinError(false);
    } else {
      setPinError(true);
      setPinInput('');
    }
  };

  // Refresh Drive status
  React.useEffect(() => {
    const tick = setInterval(() => setDriveConnected(googleDriveService.isConfigured), 2000);
    return () => clearInterval(tick);
  }, []);

  const today = getTodayString();
  const allDates = getAllDates();
  const totalDays = allDates.length;

  const memberStats = useMemo(() => {
    return members.map(member => {
      const submitted = getSubmittedDates(member.id);
      const missing = getMissingDates(member.id);
      const totalSteps = getTotalSteps(member.id);
      const completionRate = totalDays > 0 ? Math.round((submitted.length / totalDays) * 100) : 0;
      const avgSteps = submitted.length > 0 ? Math.round(totalSteps / submitted.length) : 0;
      const proofCount = entries.filter(e => e.memberId === member.id && (e.hasLocalProof || e.proofDriveUrl)).length;
      return { member, submitted: submitted.length, missing: missing.length, totalSteps, completionRate, avgSteps, proofCount };
    });
  }, [members, getSubmittedDates, getMissingDates, getTotalSteps, totalDays, entries]);

  const sortedStats = useMemo(() => {
    return [...memberStats].sort((a, b) => {
      if (sortBy === 'steps') return b.totalSteps - a.totalSteps;
      if (sortBy === 'missing') return b.missing - a.missing;
      return a.member.name.localeCompare(b.member.name, 'th');
    });
  }, [memberStats, sortBy]);

  const teamTotal = getTotalSteps();
  const totalMissingAll = memberStats.reduce((s, m) => s + m.missing, 0);
  const perfectMembers = memberStats.filter(m => m.missing === 0).length;
  const overallCompletion = totalDays > 0
    ? Math.round((memberStats.reduce((s, m) => s + m.submitted, 0) / (members.length * totalDays)) * 100)
    : 0;
  const totalProofs = entries.filter(e => e.hasLocalProof || e.proofDriveUrl).length;

  const handleSaveSettings = () => {
    setStartDate(tempStartDate);
    setShowSettings(false);
  };

  const formatDateDisplay = (d: string) =>
    new Date(d + 'T00:00:00').toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #4338ca 100%)' }}>
        <div className="absolute inset-0 opacity-10">
          {[...Array(18)].map((_, i) => (
            <div key={i} className="absolute rounded-full bg-white"
              style={{
                width: `${20 + (i * 17 % 60)}px`, height: `${20 + (i * 17 % 60)}px`,
                left: `${(i * 23 % 100)}%`, top: `${(i * 31 % 100)}%`, opacity: 0.3 + (i % 5) * 0.1,
              }}
            />
          ))}
        </div>

        <div className="relative max-w-5xl mx-auto px-4 py-8">
          {/* Top bar */}
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-xl cursor-pointer select-none" onClick={handleLogoClick}>🚶</div>
              <div>
                <h1 className="text-white" style={{ fontWeight: 700, fontSize: '1.25rem' }}>Nubkao(ช้ากว่าเต่า ก็พวกเรานี่แหละ)</h1>
                <p className="text-indigo-200 text-xs">{formatDateDisplay(startDate)} — {formatDateDisplay(today)}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Drive status pill */}
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs ${driveConnected ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/10 text-white/50'}`}>
                <HardDrive size={13} />
                {driveConnected ? 'Drive พร้อม' : 'Drive ยังไม่เชื่อม'}
              </div>

              <button
                onClick={() => setShowExcel(true)}
                className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white text-sm px-3 py-2 rounded-xl transition-colors"
              >
                <FileSpreadsheet size={15} />
                <span>นำเข้า Excel</span>
              </button>

              {isAdmin && (
                <button
                  onClick={() => { setTempStartDate(startDate); setShowSettings(!showSettings); }}
                  className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white text-sm px-3 py-2 rounded-xl transition-colors"
                >
                  <Settings size={15} />
                  <span>ตั้งค่า</span>
                </button>
              )}

              <button
                onClick={() => setModal({ isOpen: true })}
                className="flex items-center gap-1.5 bg-white text-indigo-700 hover:bg-indigo-50 text-sm px-4 py-2 rounded-xl transition-colors"
                style={{ fontWeight: 600 }}
              >
                <Plus size={15} />
                <span>เพิ่มก้าว</span>
              </button>
            </div>
          </div>

          {/* Settings panel */}
          {showSettings && (
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-5 mb-6 space-y-5">
              {/* Date range */}
              <div>
                <h3 className="text-white mb-3" style={{ fontWeight: 600 }}>⚙️ ตั้งค่าช่วงเวลา</h3>
                <div className="flex items-end gap-3 flex-wrap">
                  <div>
                    <label className="text-indigo-200 text-xs block mb-1">วันเริ่มต้น</label>
                    <input
                      type="date"
                      value={tempStartDate}
                      max={today}
                      onChange={e => setTempStartDate(e.target.value)}
                      className="bg-white/10 border border-white/30 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/40"
                    />
                  </div>
                  <div>
                    <label className="text-indigo-200 text-xs block mb-1">วันสิ้นสุด</label>
                    <div className="bg-white/10 border border-white/20 text-white/60 rounded-xl px-3 py-2 text-sm">
                      {formatDateDisplay(today)} (วันนี้)
                    </div>
                  </div>
                  <button
                    onClick={handleSaveSettings}
                    className="bg-white text-indigo-700 px-4 py-2 rounded-xl text-sm hover:bg-indigo-50 transition-colors"
                    style={{ fontWeight: 600 }}
                  >
                    บันทึก
                  </button>
                </div>
              </div>

              {/* Drive setup */}
              <div>
                <h3 className="text-white mb-3" style={{ fontWeight: 600 }}>🔗 Google Drive (สำหรับบันทึกภาพหลักฐาน)</h3>
                <div className="bg-white rounded-xl overflow-hidden">
                  <DriveSetupPanel />
                </div>
              </div>
            </div>
          )}

          {/* Big total */}
          <div className="text-center py-4">
            <p className="text-indigo-200 text-sm mb-1">ก้าวรวมทั้งทีม</p>
            <div className="text-white" style={{ fontSize: '3.5rem', fontWeight: 800, lineHeight: 1 }}>
              {teamTotal.toLocaleString('th-TH')}
            </div>
            <p className="text-indigo-300 text-sm mt-1">ก้าว</p>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-4 gap-3 mt-6">
            {[
              { label: 'วันที่ติดตาม', value: totalDays, color: 'text-white' },
              { label: 'ส่งข้อมูลครบ', value: `${overallCompletion}%`, color: 'text-emerald-300' },
              { label: 'วันที่ขาดหาย', value: totalMissingAll, color: 'text-amber-300' },
              { label: 'ภาพหลักฐาน', value: totalProofs, color: 'text-sky-300' },
            ].map((s, i) => (
              <div key={i} className="bg-white/10 rounded-2xl p-4 text-center border border-white/10">
                <div className={s.color} style={{ fontSize: '1.75rem', fontWeight: 700 }}>{s.value}</div>
                <p className="text-indigo-200 text-xs mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Alert missing */}
        {totalMissingAll > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex items-start gap-3 mb-6">
            <AlertTriangle size={20} className="text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-amber-800" style={{ fontWeight: 600 }}>มีข้อมูลที่ยังไม่ได้ส่ง</p>
              <p className="text-amber-600 text-sm mt-0.5">
                ทีมมีข้อมูลขาดหายรวม {totalMissingAll} วัน — กดที่สมาชิกเพื่อดูรายละเอียดและเพิ่มข้อมูลย้อนหลัง
                {' '}หรือ <button onClick={() => setShowExcel(true)} className="underline hover:no-underline">นำเข้าจาก Excel</button>
              </p>
            </div>
          </div>
        )}

        {perfectMembers > 0 && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-4 flex items-center gap-3 mb-6">
            <CheckCircle size={20} className="text-emerald-500 shrink-0" />
            <p className="text-emerald-700 text-sm">
              🎉 มี <strong>{perfectMembers} คน</strong> ที่ส่งข้อมูลครบทุกวัน!
            </p>
          </div>
        )}

        {/* Leaderboard */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <TrendingUp size={18} className="text-indigo-500" />
              <h2 className="text-gray-800" style={{ fontWeight: 700 }}>อันดับสมาชิก</h2>
              <span className="bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded-full">{members.length} คน</span>
            </div>
            <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
              {(['steps', 'missing', 'name'] as const).map(s => (
                <button key={s} onClick={() => setSortBy(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs transition-all ${sortBy === s ? 'bg-white shadow text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                  style={{ fontWeight: sortBy === s ? 600 : 400 }}
                >
                  {s === 'steps' ? '🏆 ก้าว' : s === 'missing' ? '⚠️ ขาด' : '🔤 ชื่อ'}
                </button>
              ))}
            </div>
          </div>

          <div className="divide-y divide-gray-50">
            {sortedStats.map((stat, index) => {
              const rank = sortBy === 'steps' ? index + 1 : null;
              const rankEmoji = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null;

              return (
                <div
                  key={stat.member.id}
                  onClick={() => router.push(`/member/${stat.member.id}`)}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 cursor-pointer transition-colors group"
                >
                  <div className="w-8 text-center shrink-0">
                    {rankEmoji
                      ? <span className="text-lg">{rankEmoji}</span>
                      : <span className="text-gray-400 text-sm" style={{ fontWeight: 600 }}>{rank || (index + 1)}</span>
                    }
                  </div>

                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm shrink-0"
                    style={{ background: stat.member.color, fontWeight: 700 }}>
                    {getInitials(stat.member.name)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-gray-800" style={{ fontWeight: 600 }}>{stat.member.name}</span>
                      {stat.missing === 0
                        ? <span className="bg-emerald-100 text-emerald-600 text-xs px-2 py-0.5 rounded-full" style={{ fontWeight: 600 }}>ครบ ✓</span>
                        : <span className="bg-rose-100 text-rose-600 text-xs px-2 py-0.5 rounded-full" style={{ fontWeight: 600 }}>⚠️ ขาด {stat.missing} วัน</span>
                      }
                      {stat.proofCount > 0 && (
                        <span className="bg-sky-100 text-sky-600 text-xs px-2 py-0.5 rounded-full flex items-center gap-1" style={{ fontWeight: 600 }}>
                          <Image size={10} />
                          {stat.proofCount} รูป
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1.5">
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all"
                          style={{
                            width: `${stat.completionRate}%`,
                            background: stat.completionRate === 100 ? '#10B981' : stat.completionRate >= 75 ? stat.member.color : '#F59E0B',
                          }}
                        />
                      </div>
                      <span className="text-gray-400 text-xs shrink-0">{stat.completionRate}%</span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div style={{ color: stat.member.color, fontWeight: 700, fontSize: '1.1rem' }}>{formatSteps(stat.totalSteps)}</div>
                    <div className="text-gray-400 text-xs">ก้าว</div>
                  </div>
                  <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-400 transition-colors shrink-0" />
                </div>
              );
            })}
          </div>
        </div>

        {/* Summary cards */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h3 className="text-gray-700 mb-4 flex items-center gap-2" style={{ fontWeight: 700 }}>
              <span className="w-7 h-7 bg-rose-100 rounded-lg flex items-center justify-center text-sm">⚠️</span>
              ขาดส่งมากที่สุด
            </h3>
            <div className="space-y-3">
              {[...memberStats].sort((a, b) => b.missing - a.missing).slice(0, 5).map(stat => (
                <div key={stat.member.id}
                  onClick={() => router.push(`/member/${stat.member.id}`)}
                  className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 rounded-xl p-2 -mx-2 transition-colors">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs shrink-0"
                    style={{ background: stat.member.color, fontWeight: 700 }}>
                    {getInitials(stat.member.name)}
                  </div>
                  <span className="text-sm text-gray-700 flex-1">{stat.member.name}</span>
                  <span className={`text-sm ${stat.missing === 0 ? 'text-emerald-500' : 'text-rose-500'}`} style={{ fontWeight: 600 }}>
                    {stat.missing === 0 ? '✓ ครบ' : `${stat.missing} วัน`}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h3 className="text-gray-700 mb-4 flex items-center gap-2" style={{ fontWeight: 700 }}>
              <span className="w-7 h-7 bg-amber-100 rounded-lg flex items-center justify-center text-sm">🏆</span>
              ก้าวมากที่สุด
            </h3>
            <div className="space-y-3">
              {[...memberStats].sort((a, b) => b.totalSteps - a.totalSteps).slice(0, 5).map((stat, i) => (
                <div key={stat.member.id}
                  onClick={() => router.push(`/member/${stat.member.id}`)}
                  className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 rounded-xl p-2 -mx-2 transition-colors">
                  <span className="text-sm w-6 text-center">
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
                  </span>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs shrink-0"
                    style={{ background: stat.member.color, fontWeight: 700 }}>
                    {getInitials(stat.member.name)}
                  </div>
                  <span className="text-sm text-gray-700 flex-1">{stat.member.name}</span>
                  <span className="text-sm" style={{ color: stat.member.color, fontWeight: 700 }}>
                    {formatSteps(stat.totalSteps)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* FAB */}
      <button
        onClick={() => setModal({ isOpen: true })}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white transition-all hover:scale-105 active:scale-95 z-40"
        style={{ background: 'linear-gradient(135deg, #6366F1, #4338CA)' }}
      >
        <Plus size={24} />
      </button>

      <AddStepsModal
        isOpen={modal.isOpen}
        memberId={modal.memberId}
        date={modal.date}
        onClose={() => setModal({ isOpen: false })}
      />
      <ExcelImportModal isOpen={showExcel} onClose={() => setShowExcel(false)} />

      {/* Admin PIN Dialog */}
      {showPinDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-80">
            <h2 className="text-gray-800 text-lg mb-1" style={{ fontWeight: 700 }}>🔐 Admin</h2>
            <p className="text-gray-500 text-sm mb-4">กรอก PIN เพื่อเข้าสู่โหมดผู้ดูแล</p>
            <input
              type="password"
              inputMode="numeric"
              placeholder="PIN"
              value={pinInput}
              onChange={e => { setPinInput(e.target.value); setPinError(false); }}
              onKeyDown={e => e.key === 'Enter' && handlePinSubmit()}
              autoFocus
              className={`w-full border rounded-xl px-4 py-2.5 text-sm text-center tracking-widest focus:outline-none focus:ring-2 mb-1 ${pinError ? 'border-rose-400 focus:ring-rose-300' : 'border-gray-200 focus:ring-indigo-300'}`}
            />
            {pinError && <p className="text-rose-500 text-xs text-center mb-3">PIN ไม่ถูกต้อง</p>}
            {!pinError && <div className="mb-3" />}
            <div className="flex gap-2">
              <button
                onClick={() => { setShowPinDialog(false); setPinInput(''); setPinError(false); }}
                className="flex-1 px-4 py-2 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-gray-50 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={handlePinSubmit}
                className="flex-1 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm hover:bg-indigo-700 transition-colors"
                style={{ fontWeight: 600 }}
              >
                เข้าสู่ระบบ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
