'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import {
  IconChartBar,
  IconChartDots,
  IconDna,
  IconFileAnalytics,
  IconHeartbeat,
  IconRocket,
  IconTrophy,
} from '@tabler/icons-react';
import ClientPerformanceClient from '../performance/ClientPerformanceClient';
import ClientReportsPage from '../reports/page';
import OperacionalPage from './OperacionalPage';
import ValorPage from './ValorPage';
import MarcaPage from './MarcaPage';
import EstrategiaPage from './EstrategiaPage';
import ClientAnalyticsCore from '../analytics/ClientAnalyticsCore';

const SUB_TABS = [
  { label: 'Performance', icon: <IconChartBar size={16} />,     value: 0 },
  { label: 'Relatórios',  icon: <IconFileAnalytics size={16} />, value: 1 },
  { label: 'Operacional', icon: <IconHeartbeat size={16} />,    value: 2 },
  { label: 'Valor',       icon: <IconTrophy size={16} />,       value: 3 },
  { label: 'Marca',       icon: <IconDna size={16} />,          value: 4 },
  { label: 'Estratégia',  icon: <IconRocket size={16} />,       value: 5 },
  { label: 'Analytics',   icon: <IconChartDots size={16} />,    value: 6 },
];

type MetricsSub = 'performance' | 'relatorios' | 'operacional' | 'valor' | 'marca' | 'estrategia' | 'analytics';

const SUB_BY_TAB: Record<number, MetricsSub> = {
  0: 'performance',
  1: 'relatorios',
  2: 'operacional',
  3: 'valor',
  4: 'marca',
  5: 'estrategia',
  6: 'analytics',
};

function parseTabFromSearch(sub: string | null): number {
  if (sub === 'performance') return 0;
  if (sub === 'relatorios') return 1;
  if (sub === 'operacional') return 2;
  if (sub === 'valor') return 3;
  if (sub === 'marca') return 4;
  if (sub === 'estrategia') return 5;
  if (sub === 'analytics') return 6;
  return 0;
}

export default function MetricasPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const clientId = params.id as string;
  const [tab, setTab] = useState(() => parseTabFromSearch(searchParams.get('sub')));

  useEffect(() => {
    setTab(parseTabFromSearch(searchParams.get('sub')));
  }, [searchParams]);

  const changeTab = (nextTab: number) => {
    setTab(nextTab);
    const next = new URLSearchParams(searchParams.toString());
    const sub = SUB_BY_TAB[nextTab];
    if (!sub || sub === 'performance') {
      next.delete('sub');
    } else {
      next.set('sub', sub);
    }
    const qs = next.toString();
    router.replace(qs ? `/clients/${clientId}/metricas?${qs}` : `/clients/${clientId}/metricas`);
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
          <Tab key={t.value} label={t.label} icon={t.icon} iconPosition="start" sx={{ fontSize: '0.85rem' }} />
        ))}
      </Tabs>
      {tab === 0 && <ClientPerformanceClient clientId={clientId} />}
      {tab === 1 && <ClientReportsPage />}
      {tab === 2 && <OperacionalPage clientId={clientId} />}
      {tab === 3 && <ValorPage clientId={clientId} />}
      {tab === 4 && <MarcaPage clientId={clientId} />}
      {tab === 5 && <EstrategiaPage clientId={clientId} />}
      {tab === 6 && <ClientAnalyticsCore clientId={clientId} />}
    </Box>
  );
}
