'use client';

import CalendarClient from '@/app/calendar/CalendarClient';

type ClientCalendarClientProps = {
  clientId: string;
};

export default function ClientCalendarClient({ clientId }: ClientCalendarClientProps) {
  return <CalendarClient initialClientId={clientId} noShell embedded lockClient />;
}
