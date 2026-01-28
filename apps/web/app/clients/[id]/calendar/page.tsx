import { Suspense } from 'react';
import CalendarClient from '@/app/calendar/CalendarClient';

export default function Page({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={<div className="loading-screen">Carregando calendario...</div>}>
      <CalendarClient initialClientId={params.id} />
    </Suspense>
  );
}
