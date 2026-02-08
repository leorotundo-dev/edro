'use client';

import { useState } from 'react';
import ClippingClient from '@/app/clipping/ClippingClient';
import ClientSocialListeningQuickClient from './ClientSocialListeningQuickClient';
import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';

type ClientClippingClientProps = {
  clientId: string;
};

export default function ClientClippingClient({ clientId }: ClientClippingClientProps) {
  const [tab, setTab] = useState<'clipping' | 'social'>('clipping');

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
      <Tabs
        value={tab}
        onChange={(_, value) => setTab(value)}
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
