'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import { IconClipboard, IconBulb } from '@tabler/icons-react';
import ClientClippingClient from '../clipping/ClientClippingClient';
import ClientInsightsClient from '../insights/ClientInsightsClient';

const SUB_TABS = [
  { label: 'Radar', icon: <IconClipboard size={16} /> },
  { label: 'Insights', icon: <IconBulb size={16} /> },
];

export default function InteligenciaPage() {
  const params = useParams();
  const clientId = params.id as string;
  const [tab, setTab] = useState(0);

  return (
    <Box>
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider', '& .MuiTab-root': { minHeight: 44 } }}
      >
        {SUB_TABS.map((t, i) => (
          <Tab key={i} label={t.label} icon={t.icon} iconPosition="start" sx={{ fontSize: '0.85rem' }} />
        ))}
      </Tabs>
      {tab === 0 && <ClientClippingClient clientId={clientId} />}
      {tab === 1 && <ClientInsightsClient clientId={clientId} />}
    </Box>
  );
}
