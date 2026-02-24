'use client';

import { useEffect, useState } from 'react';
import DashboardClient from './DashboardClient';
import Landing from '@/components/Landing';

export default function HomePage() {
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('edro_token');
    setAuthed(Boolean(token));
  }, []);

  if (authed === null) return null; // avoid flash
  if (authed) return <DashboardClient />;
  return <Landing />;
}
