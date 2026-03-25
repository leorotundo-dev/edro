'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import { IconBrandReddit, IconEye, IconMicroscope, IconNews, IconUsersGroup } from '@tabler/icons-react';
import ClientClippingClient from '../clipping/ClientClippingClient';
import SocialListeningClient from '@/app/social-listening/SocialListeningClient';
import DarkFunnelPage from '../dark-funnel/page';
import CompetitorsClient from '../concorrentes/CompetitorsClient';

type RadarSub = 'clipping' | 'social' | 'dark_funnel' | 'concorrentes';

const SUB_TABS = [
  { value: 'clipping' as const,     label: 'Clipping',         icon: <IconNews size={16} /> },
  { value: 'social' as const,       label: 'Social Listening', icon: <IconUsersGroup size={16} /> },
  { value: 'dark_funnel' as const,  label: 'Dark Funnel',      icon: <IconEye size={16} /> },
  { value: 'concorrentes' as const, label: 'Concorrentes',     icon: <IconMicroscope size={16} /> },
];

function parseSub(v: string | null): RadarSub {
  if (v === 'social') return 'social';
  if (v === 'dark_funnel') return 'dark_funnel';
  if (v === 'concorrentes') return 'concorrentes';
  return 'clipping';
}

export default function RadarPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const clientId = params.id as string;
  const [tab, setTab] = useState<RadarSub>(() => parseSub(searchParams.get('sub')));

  useEffect(() => {
    setTab(parseSub(searchParams.get('sub')));
  }, [searchParams]);

  const changeTab = (value: RadarSub) => {
    setTab(value);
    const next = new URLSearchParams(searchParams.toString());
    if (value === 'clipping') {
      next.delete('sub');
    } else {
      next.set('sub', value);
    }
    const qs = next.toString();
    router.replace(qs ? `/clients/${clientId}/radar?${qs}` : `/clients/${clientId}/radar`);
  };

  return (
    <Box>
      <Tabs
        value={tab}
        onChange={(_, v) => changeTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider', '& .MuiTab-root': { minHeight: 44 } }}
      >
        {SUB_TABS.map((t) => (
          <Tab key={t.value} value={t.value} label={t.label} icon={t.icon} iconPosition="start" sx={{ fontSize: '0.85rem' }} />
        ))}
      </Tabs>

      {tab === 'clipping' && <ClientClippingClient clientId={clientId} />}
      {tab === 'social' && <SocialListeningClient clientId={clientId} noShell embedded />}
      {tab === 'dark_funnel' && <DarkFunnelPage />}
      {tab === 'concorrentes' && <CompetitorsClient clientId={clientId} />}
    </Box>
  );
}
