'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import { IconBulb, IconClipboard, IconSearch, IconTrendingUp } from '@tabler/icons-react';
import ClientClippingClient from '../clipping/ClientClippingClient';
import ClientInsightsClient from '../insights/ClientInsightsClient';

type SubTabValue = 'clipping' | 'social' | 'perplexity' | 'insights';

const SUB_TABS = [
  { value: 'clipping' as const, label: 'Clipping', icon: <IconClipboard size={16} /> },
  { value: 'social' as const, label: 'Social Listening', icon: <IconTrendingUp size={16} /> },
  { value: 'perplexity' as const, label: 'Perplexity AI', icon: <IconSearch size={16} /> },
  { value: 'insights' as const, label: 'Insights', icon: <IconBulb size={16} /> },
];

function parseSubTab(value: string | null): SubTabValue {
  if (value === 'social') return 'social';
  if (value === 'perplexity') return 'perplexity';
  if (value === 'insights') return 'insights';
  return 'clipping';
}

export default function InteligenciaPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const clientId = params.id as string;
  const [tab, setTab] = useState<SubTabValue>(() => parseSubTab(searchParams.get('sub')));

  useEffect(() => {
    setTab(parseSubTab(searchParams.get('sub')));
  }, [searchParams]);

  const clippingTab = useMemo(() => {
    if (tab === 'social') return 'social';
    if (tab === 'perplexity') return 'perplexity';
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
    router.replace(qs ? `/clients/${clientId}/inteligencia?${qs}` : `/clients/${clientId}/inteligencia`);
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
      {tab === 'insights' ? (
        <ClientInsightsClient clientId={clientId} />
      ) : (
        <ClientClippingClient clientId={clientId} forceTab={clippingTab} />
      )}
    </Box>
  );
}
