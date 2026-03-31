'use client';

import { StepProvider } from '../context/StepContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return <StepProvider>{children}</StepProvider>;
}
