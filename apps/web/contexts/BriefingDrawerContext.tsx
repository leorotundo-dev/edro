'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

type BriefingDrawerContextValue = {
  briefingId: string | null;
  open: (id: string) => void;
  close: () => void;
};

const BriefingDrawerContext = createContext<BriefingDrawerContextValue | null>(null);

export function useBriefingDrawer() {
  const ctx = useContext(BriefingDrawerContext);
  if (!ctx) throw new Error('useBriefingDrawer must be used within BriefingDrawerProvider');
  return ctx;
}

export function BriefingDrawerProvider({ children }: { children: ReactNode }) {
  const [briefingId, setBriefingId] = useState<string | null>(null);

  const open = useCallback((id: string) => setBriefingId(id), []);
  const close = useCallback(() => setBriefingId(null), []);

  return (
    <BriefingDrawerContext.Provider value={{ briefingId, open, close }}>
      {children}
    </BriefingDrawerContext.Provider>
  );
}
