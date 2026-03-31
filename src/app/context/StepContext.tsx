import React, { createContext, useContext, useState, useCallback } from 'react';
import { TeamMember, StepEntry } from '../types';

export function getTodayString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
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
    dates.push(`${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`);
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

interface InitialData {
  members: TeamMember[];
  entries: StepEntry[];
  startDate: string;
}

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

export function StepProvider({ children, initialData }: { children: React.ReactNode; initialData: InitialData }) {
  const [members] = useState<TeamMember[]>(initialData.members);
  const [startDate, setStartDateState] = useState<string>(initialData.startDate);
  const [entries, setEntries] = useState<StepEntry[]>(initialData.entries);

  const setStartDate = useCallback((date: string) => {
    setStartDateState(date);
    void fetch('/api/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'startDate', value: date }),
    });
  }, []);

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
    // Optimistic local update
    setEntries(prev => {
      const idx = prev.findIndex(e => e.memberId === memberId && e.date === date);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], steps, ...(proof || {}) };
        return updated;
      }
      return [...prev, { memberId, date, steps, ...(proof || {}) }];
    });
    // Persist to DB
    void fetch('/api/entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId, date, steps, ...(proof || {}) }),
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
    void fetch('/api/entries', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId, date, ...proof }),
    });
  }, []);

  const deleteEntry = useCallback((memberId: string, date: string) => {
    setEntries(prev => prev.filter(e => !(e.memberId === memberId && e.date === date)));
    void fetch('/api/entries', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId, date }),
    });
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
