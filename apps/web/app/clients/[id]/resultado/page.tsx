'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import { IconChartBar, IconCoin, IconPresentation, IconStars } from '@tabler/icons-react';
import ClientPerformanceClient from '../performance/ClientPerformanceClient';
import ReporteiMetricsClient from '../metricas/ReporteiMetricsClient';
import ValorPage from '../metricas/ValorPage';
import OperacionalPage from '../metricas/OperacionalPage';
import ClientReportsPage from '../reports/page';
import EstrategiaPage from '../metricas/EstrategiaPage';
import MarcaPage from '../metricas/MarcaPage';
import BoardPresentationIndexClient from '../board-presentations/BoardPresentationIndexClient';

type ResultadoSub = 'performance' | 'financeiro' | 'estrategia' | 'board';

const SUB_TABS = [
  { value: 'performance' as const, label: 'Performance', icon: <IconChartBar size={16} /> },
  { value: 'financeiro' as const,  label: 'Financeiro',  icon: <IconCoin size={16} /> },
  { value: 'estrategia' as const,  label: 'Estratégia',  icon: <IconStars size={16} /> },
  { value: 'board' as const,  label: 'Board',  icon: <IconPresentation size={16} /> },
];

function parseSub(v: string | null): ResultadoSub {
  if (v === 'financeiro') return 'financeiro';
  if (v === 'estrategia') return 'estrategia';
  if (v === 'board') return 'board';
  return 'performance';
}

// ── Performance — Reportei + posts + métricas ─────────────────────────────────

function PerformanceSection({ clientId }: { clientId: string }) {
  return (
    <Box>
      <ClientPerformanceClient clientId={clientId} />
      <Divider sx={{ my: 5 }} />
      <ReporteiMetricsClient clientId={clientId} />
    </Box>
  );
}

// ── Financeiro — ROI + saúde operacional + relatórios ─────────────────────────

function FinanceiroSection({ clientId }: { clientId: string }) {
  return (
    <Box>
      <ValorPage clientId={clientId} />
      <Divider sx={{ my: 5 }} />
      <OperacionalPage clientId={clientId} />
      <Divider sx={{ my: 5 }} />
      <ClientReportsPage />
    </Box>
  );
}

// ── Estratégia — Estratégia do mês + Marca + Big Idea ─────────────────────────

function EstrategiaSection({ clientId }: { clientId: string }) {
  return (
    <Box>
      <EstrategiaPage clientId={clientId} />
      <Divider sx={{ my: 5 }} />
      <MarcaPage clientId={clientId} />
    </Box>
  );
}

function BoardSection({ clientId }: { clientId: string }) {
  return <BoardPresentationIndexClient clientId={clientId} embedded />;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ResultadoPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const clientId = params.id as string;
  const [tab, setTab] = useState<ResultadoSub>(() => parseSub(searchParams.get('sub')));

  useEffect(() => {
    setTab(parseSub(searchParams.get('sub')));
  }, [searchParams]);

  const changeTab = (value: ResultadoSub) => {
    setTab(value);
    const next = new URLSearchParams(searchParams.toString());
    if (value === 'performance') {
      next.delete('sub');
    } else {
      next.set('sub', value);
    }
    const qs = next.toString();
    router.replace(qs ? `/clients/${clientId}/resultado?${qs}` : `/clients/${clientId}/resultado`);
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

      {tab === 'performance' && <PerformanceSection clientId={clientId} />}
      {tab === 'financeiro'  && <FinanceiroSection  clientId={clientId} />}
      {tab === 'estrategia'  && <EstrategiaSection  clientId={clientId} />}
      {tab === 'board'       && <BoardSection       clientId={clientId} />}
    </Box>
  );
}
