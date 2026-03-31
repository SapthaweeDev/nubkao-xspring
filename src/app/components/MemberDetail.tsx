import React, { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Plus, CheckCircle, AlertCircle, Calendar, BarChart2, Edit2, ChevronLeft, ChevronRight, Image as ImageIcon, ExternalLink } from 'lucide-react';
import { useStepContext, getTodayString } from '../context/StepContext';
import { AddStepsModal } from './AddStepsModal';
import { AddStepModalState } from '../types';

const DAY_NAMES = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
const MONTH_NAMES = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];

function getInitials(name: string) {
  return name.split(' ').map(p => p[0]).join('').slice(0, 2);
}

function formatShortDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`;
}

function formatFullDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear() + 543}`;
}

export function MemberDetail() {
  const params = useParams();
  const memberId = params.memberId as string;
  const router = useRouter();
  const { getMemberById, getMissingDates, getSubmittedDates, getTotalSteps, getAllDates, getEntryForDate, startDate } = useStepContext();

  const member = getMemberById(memberId || '');
  const [modal, setModal] = useState<AddStepModalState>({ isOpen: false });
  const [activeTab, setActiveTab] = useState<'calendar' | 'list'>('calendar');

  const today = getTodayString();
  const allDates = getAllDates();
  const missingDates = getMissingDates(memberId || '');
  const submittedDates = getSubmittedDates(memberId || '');
  const totalSteps = getTotalSteps(memberId);
  const submittedSet = new Set(submittedDates);

  const todayDate = new Date(today + 'T00:00:00');
  const [calYear, setCalYear] = useState(todayDate.getFullYear());
  const [calMonth, setCalMonth] = useState(todayDate.getMonth());

  const calendarDays = useMemo(() => {
    const firstDay = new Date(calYear, calMonth, 1);
    const lastDay = new Date(calYear, calMonth + 1, 0);
    const startDow = firstDay.getDay();
    const days: (string | null)[] = [];
    for (let i = 0; i < startDow; i++) days.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(`${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
    }
    while (days.length % 7 !== 0) days.push(null);
    return days;
  }, [calYear, calMonth]);

  const prevMonth = () => {
    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
    else setCalMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
    else setCalMonth(m => m + 1);
  };

  const startMonthDate = new Date(parseInt(startDate.slice(0, 4)), parseInt(startDate.slice(5, 7)) - 1, 1);
  const currentMonthDate = new Date(calYear, calMonth, 1);
  const canGoPrev = currentMonthDate > startMonthDate;
  const canGoNext = currentMonthDate < new Date(todayDate.getFullYear(), todayDate.getMonth(), 1);

  const avgSteps = submittedDates.length > 0 ? Math.round(totalSteps / submittedDates.length) : 0;
  const completionRate = allDates.length > 0 ? Math.round((submittedDates.length / allDates.length) * 100) : 0;
  const proofCount = submittedDates.filter(d => {
    const e = getEntryForDate(memberId || '', d);
    return e?.hasLocalProof || e?.proofDriveUrl;
  }).length;

  if (!member) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 text-lg">ไม่พบสมาชิก</p>
          <button onClick={() => router.push('/')} className="mt-4 text-indigo-600 hover:underline">กลับหน้าหลัก</button>
        </div>
      </div>
    );
  }

  const getDayStatus = (dateStr: string | null): 'submitted' | 'missing' | 'future' | 'out-of-range' | 'empty' => {
    if (!dateStr) return 'empty';
    if (dateStr > today) return 'future';
    if (dateStr < startDate) return 'out-of-range';
    if (submittedSet.has(dateStr)) return 'submitted';
    return 'missing';
  };

  const getDayStyle = (status: string, color: string) => {
    switch (status) {
      case 'submitted': return { bg: `${color}15`, border: `${color}40`, text: color, dot: color };
      case 'missing': return { bg: '#FEF2F2', border: '#FECACA', text: '#EF4444', dot: '#EF4444' };
      case 'future': return { bg: '#F9FAFB', border: '#E5E7EB', text: '#9CA3AF', dot: 'transparent' };
      case 'out-of-range': return { bg: '#F9FAFB', border: '#E5E7EB', text: '#D1D5DB', dot: 'transparent' };
      default: return { bg: 'transparent', border: 'transparent', text: 'transparent', dot: 'transparent' };
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-30" style={{ background: `linear-gradient(135deg, ${member.color}EE, ${member.color}CC)` }}>
        <div className="max-w-3xl mx-auto px-4 py-4">
          <button onClick={() => router.push('/')} className="flex items-center gap-1.5 text-white/80 hover:text-white transition-colors mb-4">
            <ArrowLeft size={18} />
            <span className="text-sm">กลับหน้าหลัก</span>
          </button>

          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-lg"
              style={{ background: `${member.color}CC`, fontWeight: 800, fontSize: '1.25rem' }}>
              {getInitials(member.name)}
            </div>
            <div className="flex-1">
              <h1 className="text-white" style={{ fontWeight: 800, fontSize: '1.375rem' }}>{member.name}</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-white/70 text-sm">สมาชิกทีม #{member.id}</p>
                {proofCount > 0 && (
                  <span className="flex items-center gap-1 bg-white/20 text-white text-xs px-2 py-0.5 rounded-full">
                    <ImageIcon size={11} />
                    {proofCount} หลักฐาน
                  </span>
                )}
              </div>
            </div>
            <button onClick={() => setModal({ isOpen: true, memberId: member.id })}
              className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white px-4 py-2.5 rounded-xl transition-colors"
              style={{ fontWeight: 600 }}>
              <Plus size={16} />
              <span className="text-sm">เพิ่มก้าว</span>
            </button>
          </div>

          <div className="grid grid-cols-4 gap-3 mt-5">
            {[
              { label: 'ก้าวรวม', value: totalSteps.toLocaleString('th-TH') },
              { label: 'เฉลี่ย/วัน', value: avgSteps.toLocaleString('th-TH') },
              { label: 'ส่งแล้ว', value: `${submittedDates.length}/${allDates.length}` },
              { label: 'ขาดหาย', value: String(missingDates.length) },
            ].map((item, i) => (
              <div key={i} className="bg-white/15 rounded-xl p-3 text-center">
                <div className="text-white" style={{ fontWeight: 700 }}>{item.value}</div>
                <div className="text-white/60 text-xs mt-0.5">{item.label}</div>
              </div>
            ))}
          </div>

          <div className="mt-4">
            <div className="flex justify-between text-white/70 text-xs mb-1.5">
              <span>ความสมบูรณ์</span>
              <span>{completionRate}%</span>
            </div>
            <div className="h-2.5 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${completionRate}%`, background: 'white' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-3xl mx-auto px-4">
        <div className="flex gap-1 bg-white rounded-2xl shadow-sm border border-gray-100 p-1.5 mt-5">
          {[
            { key: 'calendar', label: 'ปฏิทิน', icon: <Calendar size={15} /> },
            { key: 'list', label: 'รายการ', icon: <BarChart2 size={15} />, badge: missingDates.length },
          ].map(tab => (
            <button key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm transition-all ${activeTab === tab.key ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              style={{ fontWeight: activeTab === tab.key ? 600 : 400 }}>
              {tab.icon}
              {tab.label}
              {tab.badge ? (
                <span className="bg-rose-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center" style={{ fontWeight: 700 }}>
                  {tab.badge}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 pb-8">

        {/* ── Calendar View ── */}
        {activeTab === 'calendar' && (
          <div className="mt-5 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <button onClick={prevMonth} disabled={!canGoPrev}
                className="w-9 h-9 rounded-xl hover:bg-gray-100 flex items-center justify-center transition-colors disabled:opacity-30">
                <ChevronLeft size={18} className="text-gray-600" />
              </button>
              <div className="text-center">
                <p className="text-gray-800" style={{ fontWeight: 700 }}>{MONTH_NAMES[calMonth]}</p>
                <p className="text-gray-400 text-xs">{calYear + 543}</p>
              </div>
              <button onClick={nextMonth} disabled={!canGoNext}
                className="w-9 h-9 rounded-xl hover:bg-gray-100 flex items-center justify-center transition-colors disabled:opacity-30">
                <ChevronRight size={18} className="text-gray-600" />
              </button>
            </div>

            <div className="flex items-center gap-4 px-5 py-3 bg-gray-50 border-b border-gray-100 flex-wrap">
              {[
                { color: member.color, bg: `${member.color}15`, label: 'ส่งแล้ว' },
                { color: '#EF4444', bg: '#FEF2F2', label: 'ยังไม่ส่ง' },
                { color: '#9CA3AF', bg: '#F9FAFB', label: 'วันอนาคต' },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded-md border" style={{ background: item.bg, borderColor: `${item.color}40` }} />
                  <span className="text-gray-500 text-xs">{item.label}</span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 border-b border-gray-100">
              {DAY_NAMES.map(d => (
                <div key={d} className="text-center py-2.5 text-xs text-gray-400" style={{ fontWeight: 600 }}>{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1 p-3">
              {calendarDays.map((dateStr, i) => {
                const status = getDayStatus(dateStr);
                const style = getDayStyle(status, member.color);
                const entry = dateStr ? getEntryForDate(member.id, dateStr) : undefined;
                const dayNum = dateStr ? parseInt(dateStr.split('-')[2]) : null;
                const isToday = dateStr === today;
                const hasProof = entry?.hasLocalProof || entry?.proofDriveUrl;

                return (
                  <div key={i}
                    onClick={() => {
                      if (dateStr && (status === 'submitted' || status === 'missing')) {
                        setModal({ isOpen: true, memberId: member.id, date: dateStr });
                      }
                    }}
                    className={`relative aspect-square rounded-xl flex flex-col items-center justify-center transition-all ${status === 'submitted' || status === 'missing' ? 'cursor-pointer hover:scale-105 hover:shadow-sm' : ''} ${isToday ? 'ring-2 ring-offset-1' : ''}`}
                    style={{ background: style.bg, border: `1px solid ${style.border}` }}
                    title={dateStr ? `${formatShortDate(dateStr)}${entry ? ` — ${entry.steps.toLocaleString('th-TH')} ก้าว${hasProof ? ' 📸' : ''}` : ''}` : ''}
                  >
                    {dayNum && (
                      <>
                        <span className="text-xs" style={{ color: style.text, fontWeight: isToday ? 800 : 500 }}>
                          {dayNum}
                        </span>
                        {entry && (
                          <span className="hidden sm:block" style={{ color: style.text, fontSize: '0.5rem', fontWeight: 600 }}>
                            {entry.steps >= 1000 ? `${(entry.steps / 1000).toFixed(0)}K` : entry.steps}
                          </span>
                        )}
                        {status === 'missing' && <span style={{ fontSize: '0.45rem' }}>⚠️</span>}
                        {status === 'submitted' && (
                          <div className="flex items-center gap-0.5 mt-0.5">
                            <div className="w-1 h-1 rounded-full" style={{ background: style.dot }} />
                            {hasProof && <div className="w-1 h-1 rounded-full bg-sky-400" />}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
              <span>กดที่วันเพื่อเพิ่มหรือแก้ไขข้อมูล</span>
              <span className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                = มีภาพหลักฐาน
              </span>
            </div>
          </div>
        )}

        {/* ── List View ── */}
        {activeTab === 'list' && (
          <div className="mt-5 space-y-4">

            {/* Missing days */}
            {missingDates.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                  <div className="w-7 h-7 bg-rose-100 rounded-lg flex items-center justify-center">
                    <AlertCircle size={14} className="text-rose-500" />
                  </div>
                  <h3 className="text-gray-800" style={{ fontWeight: 700 }}>วันที่ยังไม่ได้ส่งข้อมูล</h3>
                  <span className="bg-rose-100 text-rose-600 text-xs px-2 py-0.5 rounded-full ml-auto" style={{ fontWeight: 600 }}>
                    {missingDates.length} วัน
                  </span>
                </div>
                <div className="divide-y divide-gray-50">
                  {missingDates.map(date => (
                    <div key={date} className="flex items-center justify-between px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-rose-50 rounded-xl flex items-center justify-center">
                          <span className="text-rose-500 text-sm" style={{ fontWeight: 700 }}>{parseInt(date.split('-')[2])}</span>
                        </div>
                        <div>
                          <p className="text-gray-700 text-sm" style={{ fontWeight: 600 }}>{formatFullDate(date)}</p>
                          <p className="text-rose-400 text-xs">ยังไม่มีข้อมูล</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setModal({ isOpen: true, memberId: member.id, date })}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-white text-sm transition-all hover:opacity-90 active:scale-95"
                        style={{ background: member.color, fontWeight: 600 }}>
                        <Plus size={14} />
                        เพิ่มก้าว
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Submitted days */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                <div className="w-7 h-7 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <CheckCircle size={14} className="text-emerald-500" />
                </div>
                <h3 className="text-gray-800" style={{ fontWeight: 700 }}>ประวัติการส่งข้อมูล</h3>
                <span className="bg-emerald-100 text-emerald-600 text-xs px-2 py-0.5 rounded-full ml-auto" style={{ fontWeight: 600 }}>
                  {submittedDates.length} วัน
                </span>
              </div>

              {submittedDates.length === 0 ? (
                <div className="py-10 text-center text-gray-400 text-sm">ยังไม่มีข้อมูล</div>
              ) : (
                <div className="divide-y divide-gray-50 max-h-[520px] overflow-y-auto">
                  {[...submittedDates]
                    .sort((a, b) => b.localeCompare(a))
                    .map(date => {
                      const entry = getEntryForDate(member.id, date);
                      const steps = entry?.steps || 0;
                      const pct = Math.min((steps / 10000) * 100, 100);
                      const hasDriveProof = !!entry?.proofDriveUrl;
                      const hasLocalProof = !!entry?.hasLocalProof;

                      return (
                        <div key={date} className="flex items-center gap-3 px-5 py-3.5">
                          {/* Day number */}
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                            style={{ background: `${member.color}15` }}>
                            <span className="text-sm" style={{ color: member.color, fontWeight: 700 }}>
                              {parseInt(date.split('-')[2])}
                            </span>
                          </div>

                          {/* Date & progress */}
                          <div className="flex-1 min-w-0">
                            <p className="text-gray-700 text-sm" style={{ fontWeight: 600 }}>{formatFullDate(date)}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full rounded-full"
                                  style={{ width: `${pct}%`, background: steps >= 10000 ? '#10B981' : member.color }} />
                              </div>
                              <span className="text-gray-400 text-xs">{pct.toFixed(0)}%</span>
                            </div>
                          </div>

                          {/* Proof badges */}
                          <div className="shrink-0 flex flex-col gap-1 items-end">
                            {hasDriveProof && (
                              <a href={entry!.proofDriveUrl!} target="_blank" rel="noopener noreferrer"
                                onClick={e => e.stopPropagation()}
                                className="flex items-center gap-1 bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-600 text-xs px-2 py-0.5 rounded-full transition-colors"
                                style={{ fontWeight: 600 }}>
                                <ImageIcon size={10} />
                                Drive
                                <ExternalLink size={9} />
                              </a>
                            )}
                            {hasLocalProof && !hasDriveProof && (
                              <span className="flex items-center gap-1 bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded-full">
                                <ImageIcon size={10} />
                                มีรูป
                              </span>
                            )}
                          </div>

                          {/* Steps */}
                          <div className="text-right shrink-0">
                            <p style={{ color: member.color, fontWeight: 700 }}>
                              {steps.toLocaleString('th-TH')}
                            </p>
                            <p className="text-gray-400 text-xs">ก้าว</p>
                          </div>

                          {/* Edit */}
                          <button
                            onClick={() => setModal({ isOpen: true, memberId: member.id, date })}
                            className="w-8 h-8 rounded-xl hover:bg-gray-100 flex items-center justify-center transition-colors shrink-0">
                            <Edit2 size={13} className="text-gray-400" />
                          </button>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            {missingDates.length === 0 && submittedDates.length > 0 && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-4 flex items-center gap-3">
                <span className="text-2xl">🎉</span>
                <p className="text-emerald-700" style={{ fontWeight: 600 }}>ส่งข้อมูลครบทุกวันแล้ว! ยอดเยี่ยมมาก</p>
              </div>
            )}
          </div>
        )}
      </div>

      <AddStepsModal
        isOpen={modal.isOpen}
        memberId={modal.memberId}
        date={modal.date}
        onClose={() => setModal({ isOpen: false })}
      />
    </div>
  );
}
