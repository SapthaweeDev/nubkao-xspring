import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { TeamMember, StepEntry } from '../types';

export const defaultMembers: TeamMember[] = [
  { id: '1', name: 'พรพิลาศ หาญชาญพานิชย์', color: '#6366F1', bgColor: '#EEF2FF' },
  { id: '2', name: 'สุวัฒน จันทะจิตต์', color: '#8B5CF6', bgColor: '#F5F3FF' },
  { id: '3', name: 'วาโย จันทราภานุสรณ์', color: '#EC4899', bgColor: '#FDF2F8' },
  { id: '4', name: 'กิตติพงษ์ เรืองทรัพย์เอนก', color: '#EF4444', bgColor: '#FEF2F2' },
  { id: '5', name: 'ศิระ เลิศนวศรีชัย', color: '#F59E0B', bgColor: '#FFFBEB' },
  { id: '6', name: 'ทรัพย์ทวี เพ็ชรสาย', color: '#10B981', bgColor: '#ECFDF5' },
  { id: '7', name: 'อนุวัตร ชาชุมพร', color: '#06B6D4', bgColor: '#ECFEFF' },
  { id: '8', name: 'พีรวัส นันท์สุทธิโกศล', color: '#7C3AED', bgColor: '#F5F3FF' },
  { id: '9', name: 'พัฒน์ชัย สุรัตวิศิษฏ์', color: '#3B82F6', bgColor: '#EFF6FF' },
  { id: '10', name: 'สุพรรณี เขียวสลับ', color: '#14B8A6', bgColor: '#F0FDFA' },
];

export function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

export function getDefaultStartDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

export function getDatesInRange(start: string, end: string): string[] {
  const dates: string[] = [];
  const current = new Date(start + 'T00:00:00');
  const endDate = new Date(end + 'T00:00:00');
  while (current <= endDate) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

function generateSampleEntries(members: TeamMember[], startDate: string): StepEntry[] {
  const entries: StepEntry[] = [];
  const today = getTodayString();
  const dates = getDatesInRange(startDate, today);

  const missingDays: Record<string, number[]> = {
    '1': [3, 7, 15, 22],
    '2': [5, 12, 19, 25, 28],
    '3': [2, 8, 14, 20],
    '4': [1, 6, 11, 17, 24],
    '5': [4, 9, 16, 23, 29],
    '6': [7, 13, 18, 26],
    '7': [3, 10, 17, 24, 30],
    '8': [5, 11, 18, 25],
    '9': [2, 9, 16, 22, 28],
    '10': [6, 12, 19, 27],
  };

  members.forEach(member => {
    const missSet = new Set(missingDays[member.id] || []);
    dates.forEach(date => {
      const dayOfMonth = parseInt(date.split('-')[2]);
      if (!missSet.has(dayOfMonth)) {
        const seed = parseInt(member.id) * 31 + dayOfMonth;
        const steps = 3000 + ((seed * 137 + dayOfMonth * 53) % 7000);
        entries.push({ memberId: member.id, date, steps });
      }
    });
  });

  return entries;
}

const STORAGE_KEY = 'step-tracker-v1';

interface StepContextValue {
  members: TeamMember[];
  entries: StepEntry[];
  startDate: string;
  setStartDate: (date: string) => void;
  addOrUpdateEntry: (memberId: string, date: string, steps: number, proof?: Partial<Pick<StepEntry, 'proofDriveFileId' | 'proofDriveUrl' | 'hasLocalProof'>>) => void;
  deleteEntry: (memberId: string, date: string) => void;
  updateEntryProof: (memberId: string, date: string, proof: Partial<Pick<StepEntry, 'proofDriveFileId' | 'proofDriveUrl' | 'hasLocalProof'>>) => void;
  getAllDates: () => string[];
  getMissingDates: (memberId: string) => string[];
  getSubmittedDates: (memberId: string) => string[];
  getTotalSteps: (memberId?: string) => number;
  getMemberEntries: (memberId: string) => StepEntry[];
  getMemberById: (memberId: string) => TeamMember | undefined;
  getEntryForDate: (memberId: string, date: string) => StepEntry | undefined;
}

const StepContext = createContext<StepContextValue | null>(null);

export function StepProvider({ children }: { children: React.ReactNode }) {
  const [members] = useState<TeamMember[]>(defaultMembers);
  const [startDate, setStartDateState] = useState<string>(getDefaultStartDate());
  const [entries, setEntries] = useState<StepEntry[]>([]);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const data = JSON.parse(stored);
        if (data.entries) setEntries(data.entries);
        if (data.startDate) setStartDateState(data.startDate);
      } catch {
        const sampleEntries = generateSampleEntries(defaultMembers, getDefaultStartDate());
        setEntries(sampleEntries);
      }
    } else {
      const sampleEntries = generateSampleEntries(defaultMembers, getDefaultStartDate());
      setEntries(sampleEntries);
    }
    setInitialized(true);
  }, []);

  useEffect(() => {
    if (!initialized) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ entries, startDate }));
  }, [entries, startDate, initialized]);

  const setStartDate = useCallback((date: string) => setStartDateState(date), []);

  const getAllDates = useCallback(() => {
    return getDatesInRange(startDate, getTodayString());
  }, [startDate]);

  const getMemberEntries = useCallback((memberId: string) =>
    entries.filter(e => e.memberId === memberId), [entries]);

  const getSubmittedDates = useCallback((memberId: string) =>
    entries.filter(e => e.memberId === memberId).map(e => e.date), [entries]);

  const getMissingDates = useCallback((memberId: string) => {
    const allDates = getDatesInRange(startDate, getTodayString());
    const submitted = new Set(entries.filter(e => e.memberId === memberId).map(e => e.date));
    return allDates.filter(d => !submitted.has(d));
  }, [entries, startDate]);

  const getTotalSteps = useCallback((memberId?: string) => {
    const filtered = memberId ? entries.filter(e => e.memberId === memberId) : entries;
    return filtered.reduce((sum, e) => sum + e.steps, 0);
  }, [entries]);

  const addOrUpdateEntry = useCallback((
    memberId: string,
    date: string,
    steps: number,
    proof?: Partial<Pick<StepEntry, 'proofDriveFileId' | 'proofDriveUrl' | 'hasLocalProof'>>
  ) => {
    setEntries(prev => {
      const idx = prev.findIndex(e => e.memberId === memberId && e.date === date);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], steps, ...(proof || {}) };
        return updated;
      }
      return [...prev, { memberId, date, steps, ...(proof || {}) }];
    });
  }, []);

  const updateEntryProof = useCallback((
    memberId: string,
    date: string,
    proof: Partial<Pick<StepEntry, 'proofDriveFileId' | 'proofDriveUrl' | 'hasLocalProof'>>
  ) => {
    setEntries(prev => {
      const idx = prev.findIndex(e => e.memberId === memberId && e.date === date);
      if (idx < 0) return prev;
      const updated = [...prev];
      updated[idx] = { ...updated[idx], ...proof };
      return updated;
    });
  }, []);

  const deleteEntry = useCallback((memberId: string, date: string) => {
    setEntries(prev => prev.filter(e => !(e.memberId === memberId && e.date === date)));
  }, []);

  const getMemberById = useCallback((memberId: string) =>
    members.find(m => m.id === memberId), [members]);

  const getEntryForDate = useCallback((memberId: string, date: string) =>
    entries.find(e => e.memberId === memberId && e.date === date), [entries]);

  return (
    <StepContext.Provider value={{
      members, entries, startDate, setStartDate,
      addOrUpdateEntry, updateEntryProof, deleteEntry,
      getAllDates, getMissingDates, getSubmittedDates,
      getTotalSteps, getMemberEntries, getMemberById, getEntryForDate,
    }}>
      {children}
    </StepContext.Provider>
  );
}

export function useStepContext() {
  const ctx = useContext(StepContext);
  if (!ctx) throw new Error('useStepContext must be used within StepProvider');
  return ctx;
}
