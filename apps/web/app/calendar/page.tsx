import { Suspense } from 'react';
import CalendarClient from './CalendarClient';

export default function Page() {
  return (
    <Suspense fallback={<div className="loading-screen">Carregando calendario...</div>}>
      <CalendarClient />
    </Suspense>
  );
}
