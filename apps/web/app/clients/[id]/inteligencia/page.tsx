'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import { IconBrain, IconBulb, IconDna, IconShieldCheck } from '@tabler/icons-react';
import ClientInsightsClient from '../insights/ClientInsightsClient';
import ClientLearningClient from './ClientLearningClient';
import BrandVoiceSection from '../analytics/sections/BrandVoiceSection';
import CopyQualitySection from './CopyQualitySection';

type SubTabValue = 'insights' | 'aprendizado' | 'dna' | 'qualidade';

const SUB_TABS = [
  { value: 'insights' as const,    label: 'Insights',        icon: <IconBulb size={16} /> },
  { value: 'aprendizado' as const, label: 'Aprendizado',     icon: <IconBrain size={16} /> },
  { value: 'dna' as const,         label: 'DNA de Marca',    icon: <IconDna size={16} /> },
  { value: 'qualidade' as const,   label: 'Qualidade Copy',  icon: <IconShieldCheck size={16} /> },
];

function parseSubTab(value: string | null): SubTabValue {
  if (value === 'aprendizado') return 'aprendizado';
  if (value === 'dna') return 'dna';
  if (value === 'qualidade') return 'qualidade';
  return 'insights';
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

  const changeTab = (value: SubTabValue) => {
    setTab(value);
    const next = new URLSearchParams(searchParams.toString());
    if (value === 'insights') {
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

      {tab === 'aprendizado' ? (
        <ClientLearningClient clientId={clientId} />
      ) : tab === 'dna' ? (
        <BrandVoiceSection clientId={clientId} />
      ) : tab === 'qualidade' ? (
        <CopyQualitySection clientId={clientId} />
      ) : (
        <ClientInsightsClient clientId={clientId} />
      )}
    </Box>
  );
}
