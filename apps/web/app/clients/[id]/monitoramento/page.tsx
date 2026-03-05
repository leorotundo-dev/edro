'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import { IconClipboard, IconEyeOff, IconTrendingUp, IconWorldSearch } from '@tabler/icons-react';
import ClientClippingClient from '../clipping/ClientClippingClient';
import DarkFunnelPage from '../dark-funnel/page';

type SubTabValue = 'clipping' | 'social' | 'pesquisa' | 'dark-funnel';

const SUB_TABS = [
  { value: 'clipping' as const,    label: 'Clipping',         icon: <IconClipboard size={16} /> },
  { value: 'social' as const,      label: 'Social Listening', icon: <IconTrendingUp size={16} /> },
  { value: 'pesquisa' as const,    label: 'Pesquisa Web',     icon: <IconWorldSearch size={16} /> },
  { value: 'dark-funnel' as const, label: 'Dark Funnel',      icon: <IconEyeOff size={16} /> },
];

function parseSubTab(value: string | null): SubTabValue {
  if (value === 'social') return 'social';
  if (value === 'pesquisa') return 'pesquisa';
  if (value === 'dark-funnel') return 'dark-funnel';
  return 'clipping';
}

export default function MonitoramentoPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const clientId = params.id as string;
  const [tab, setTab] = useState<SubTabValue>(() => parseSubTab(searchParams.get('sub')));

  useEffect(() => {
    setTab(parseSubTab(searchParams.get('sub')));
  }, [searchParams]);

  const clippingForceTab = useMemo(() => {
    if (tab === 'social') return 'social';
    if (tab === 'pesquisa') return 'perplexity';
    return 'clipping';
  }, [tab]);

  const changeTab = (value: SubTabValue) => {
    setTab(value);
    const next = new URLSearchParams(searchParams.toString());
    if (value === 'clipping') {
      next.delete('sub');
    } else {
      next.set('sub', value);
    }
    const qs = next.toString();
    router.replace(qs ? `/clients/${clientId}/monitoramento?${qs}` : `/clients/${clientId}/monitoramento`);
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

      {tab === 'dark-funnel' ? (
        <DarkFunnelPage />
      ) : (
        <ClientClippingClient clientId={clientId} forceTab={clippingForceTab} />
      )}
    </Box>
  );
}
