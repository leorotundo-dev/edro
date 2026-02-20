'use client';

import { useEffect, useState } from 'react';
import { apiGet } from '@/lib/api';
import CalendarClient from '@/app/calendar/CalendarClient';

type ClientCalendarClientProps = {
  clientId: string;
};

export default function ClientCalendarClient({ clientId }: ClientCalendarClientProps) {
  const [brandColor, setBrandColor] = useState<string | undefined>();

  useEffect(() => {
    apiGet<any>(`/clients/${clientId}`)
      .then((res) => {
        const colors: string[] = res?.profile?.brand_colors || res?.client?.profile?.brand_colors || [];
        if (colors[0]) setBrandColor(colors[0]);
      })
      .catch(() => {});
  }, [clientId]);

  return <CalendarClient initialClientId={clientId} noShell embedded lockClient brandColor={brandColor} />;
}
