'use client';

import { useEffect } from 'react';
import { StepProvider } from '../context/StepContext';
import { googleDriveService } from '../services/googleDrive';
import type { TeamMember, StepEntry } from '../types';

interface InitialData {
  members: TeamMember[];
  entries: StepEntry[];
  startDate: string;
}

export function Providers({ children, initialData }: { children: React.ReactNode; initialData: InitialData }) {
  // Init Google Drive once on app mount — loads config + attempts silent auth
  useEffect(() => {
    googleDriveService.init();
  }, []);

  return <StepProvider initialData={initialData}>{children}</StepProvider>;
}
