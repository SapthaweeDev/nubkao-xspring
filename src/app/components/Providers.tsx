'use client';

import { StepProvider } from '../context/StepContext';
import type { TeamMember, StepEntry } from '../types';

interface InitialData {
  members: TeamMember[];
  entries: StepEntry[];
  startDate: string;
}

export function Providers({ children, initialData }: { children: React.ReactNode; initialData: InitialData }) {
  return <StepProvider initialData={initialData}>{children}</StepProvider>;
}
