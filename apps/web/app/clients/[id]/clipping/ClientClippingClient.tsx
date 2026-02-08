'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ClippingClient from '@/app/clipping/ClippingClient';
import ClientSocialListeningQuickClient from './ClientSocialListeningQuickClient';
import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';

type ClientClippingClientProps = {
  clientId: string;
};

export default function ClientClippingClient({ clientId }: ClientClippingClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [tab, setTab] = useState<'clipping' | 'social'>(() => (
    searchParams.get('tab') === 'social' ? 'social' : 'clipping'
  ));

  useEffect(() => {
    const next = searchParams.get('tab') === 'social' ? 'social' : 'clipping';
    setTab(next);
  }, [searchParams]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
      <Tabs
        value={tab}
        onChange={(_, value) => {
          setTab(value);
          const next = new URLSearchParams(searchParams.toString());
          if (value === 'social') next.set('tab', 'social');
          else next.delete('tab');
          const qs = next.toString();
          router.replace(qs ? `/clients/${clientId}/clipping?${qs}` : `/clients/${clientId}/clipping`);
        }}
        variant="scrollable"
        allowScrollButtonsMobile
        sx={{ borderBottom: '1px solid', borderColor: 'divider' }}
      >
        <Tab label="Clipping" value="clipping" />
        <Tab label="Social Listening" value="social" />
      </Tabs>

      {tab === 'clipping' ? (
        <ClippingClient clientId={clientId} noShell embedded />
      ) : (
        <ClientSocialListeningQuickClient clientId={clientId} />
      )}
    </Box>
  );
}
