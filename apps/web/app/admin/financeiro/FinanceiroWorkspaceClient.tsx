'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AppShell from '@/components/AppShell';
import AdminSubmenu from '@/components/admin/AdminSubmenu';
import WorkspaceHero from '@/components/shared/WorkspaceHero';
import { PagamentosView } from '@/app/admin/pagamentos/page';
import { AiCostsView } from '@/app/admin/ai-costs/page';
import FinanceiroCruzadoClient from '@/app/admin/relatorios/financeiro/FinanceiroCruzadoClient';
import { apiGet } from '@/lib/api';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import {
  IconCashBanknote,
  IconCoin,
  IconReceipt2,
  IconReportMoney,
} from '@tabler/icons-react';

type FinancialSummary = {
  invoiced: number;
  paid: number;
  overdue: number;
};

type FinanceStats = {
  invoiced: number;
  received: number;
  overdue: number;
  payablesOpen: number;
  platformCost: number;
  trackedPlatforms: number;
};

type PayableSummary = {
  amount_brl: string;
  status: 'open' | 'paid';
};

type PlatformCostSummary = {
  cost_brl: number;
};

const FINANCE_TABS = [
  {
    value: 'overview',
    label: 'Financeiro Cruzado',
    description: 'Receita, contratos, mídia e leitura consolidada do caixa da agência.',
  },
  {
    value: 'payments',
    label: 'Pagamentos',
    description: 'Honorários, ciclos D10, recibos e repasses para freelancers.',
  },
  {
    value: 'costs',
    label: 'Custos de Operação',
    description: 'IA, plataformas e despesas recorrentes que comem margem.',
  },
] as const;

type FinanceTabValue = (typeof FINANCE_TABS)[number]['value'];

const EMPTY_STATS: FinanceStats = {
  invoiced: 0,
  received: 0,
  overdue: 0,
  payablesOpen: 0,
  platformCost: 0,
  trackedPlatforms: 0,
};

function isFinanceTab(value: string | null): value is FinanceTabValue {
  return FINANCE_TABS.some((tab) => tab.value === value);
}

function brl(value: number) {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
  });
}

function WorkspaceStatCard({
  label,
  value,
  helper,
  icon,
}: {
  label: string;
  value: string;
  helper: string;
  icon: React.ReactNode;
}) {
  const theme = useTheme();

  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 3,
        px: 2.25,
        py: 2,
        height: '100%',
        borderColor: alpha(theme.palette.success.main, 0.12),
        backgroundImage: `linear-gradient(180deg, ${alpha(theme.palette.success.main, 0.04)} 0%, transparent 100%)`,
      }}
    >
      <Stack spacing={1.5}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
            {label}
          </Typography>
          <Box
            sx={{
              width: 34,
              height: 34,
              borderRadius: 2,
              display: 'grid',
              placeItems: 'center',
              bgcolor: alpha(theme.palette.success.main, 0.1),
              color: 'success.main',
            }}
          >
            {icon}
          </Box>
        </Stack>
        <Typography variant="h4" sx={{ fontWeight: 800, lineHeight: 1 }}>
          {value}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {helper}
        </Typography>
      </Stack>
    </Card>
  );
}

export default function FinanceiroWorkspaceClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = isFinanceTab(searchParams.get('tab')) ? searchParams.get('tab') : 'overview';
  const [stats, setStats] = useState<FinanceStats>(EMPTY_STATS);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    let active = true;
    const now = new Date();
    const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const loadStats = async () => {
      try {
        setLoadingStats(true);
        const [financeRes, payablesRes, platformCostsRes] = await Promise.all([
          apiGet<{ summary: FinancialSummary }>(`/admin/relatorios/financeiro?period=${currentPeriod}`).catch(
            () => ({ summary: { invoiced: 0, paid: 0, overdue: 0 } }),
          ),
          apiGet<{ payables: PayableSummary[] }>(`/freelancers/payables?month=${currentPeriod}`).catch(
            () => ({ payables: [] as PayableSummary[] }),
          ),
          apiGet<{ data: PlatformCostSummary[] }>('/admin/platform-costs').catch(
            () => ({ data: [] as PlatformCostSummary[] }),
          ),
        ]);

        if (!active) return;

        const payables = payablesRes.payables ?? [];
        const openPayables = payables
          .filter((payable) => payable.status === 'open')
          .reduce((sum, payable) => sum + Number(payable.amount_brl ?? 0), 0);
        const platformRows = platformCostsRes.data ?? [];
        const totalPlatformCost = platformRows.reduce((sum, row) => sum + Number(row.cost_brl ?? 0), 0);

        setStats({
          invoiced: financeRes.summary?.invoiced ?? 0,
          received: financeRes.summary?.paid ?? 0,
          overdue: financeRes.summary?.overdue ?? 0,
          payablesOpen: openPayables,
          platformCost: totalPlatformCost,
          trackedPlatforms: platformRows.length,
        });
      } finally {
        if (active) setLoadingStats(false);
      }
    };

    loadStats();
    return () => {
      active = false;
    };
  }, []);

  const handleTabChange = (_: unknown, value: FinanceTabValue) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === 'overview') {
      params.delete('tab');
    } else {
      params.set('tab', value);
    }
    const query = params.toString();
    router.replace(query ? `/admin/financeiro?${query}` : '/admin/financeiro');
  };

  const currentTab = FINANCE_TABS.find((tab) => tab.value === activeTab) ?? FINANCE_TABS[0];

  return (
    <AppShell title="Financeiro">
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <WorkspaceHero
          eyebrow="Invoice / Reports"
          eyebrowColor="success"
          title="Financeiro"
          description="Receita, repasses e custos no mesmo lugar. Aqui a agência decide margem, caixa e o que está entrando ou saindo do bolso."
          leftChips={[
            { label: brl(stats.invoiced) },
            { label: `${stats.trackedPlatforms} plataformas monitoradas` },
          ]}
          loading={loadingStats}
          loadingLabel="Carregando retrato financeiro..."
          rightContent={
            <>
              <Chip
                icon={<IconReceipt2 size={14} />}
                label={`${brl(stats.payablesOpen)} a repassar`}
                size="small"
                color="warning"
                variant="outlined"
              />
              <Chip
                icon={<IconCoin size={14} />}
                label={`${brl(stats.platformCost)} em plataforma`}
                size="small"
                color="default"
                variant="outlined"
              />
            </>
          }
        />

        <AdminSubmenu value="financeiro" />

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <WorkspaceStatCard
              label="Faturado"
              value={brl(stats.invoiced)}
              helper="entrada consolidada do período"
              icon={<IconReportMoney size={18} />}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <WorkspaceStatCard
              label="Recebido"
              value={brl(stats.received)}
              helper="caixa já confirmado no mês"
              icon={<IconCashBanknote size={18} />}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <WorkspaceStatCard
              label="Repasses"
              value={brl(stats.payablesOpen)}
              helper="honorários ainda em aberto"
              icon={<IconReceipt2 size={18} />}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <WorkspaceStatCard
              label="Operação"
              value={brl(stats.platformCost)}
              helper={`${stats.trackedPlatforms} plataformas com custo tracked`}
              icon={<IconCoin size={18} />}
            />
          </Grid>
        </Grid>

        <Box
          sx={(theme) => ({
            borderRadius: 4,
            border: `1px solid ${theme.palette.divider}`,
            bgcolor: 'background.paper',
            overflow: 'hidden',
          })}
        >
          <Box sx={{ px: { xs: 2, md: 3 }, pt: { xs: 2, md: 2.5 }, pb: 1.5 }}>
            <Tabs
              value={activeTab}
              onChange={handleTabChange}
              variant="scrollable"
              allowScrollButtonsMobile
              scrollButtons="auto"
            >
              {FINANCE_TABS.map((tab) => (
                <Tab key={tab.value} value={tab.value} label={tab.label} />
              ))}
            </Tabs>
          </Box>

          <Box
            sx={(theme) => ({
              px: { xs: 2, md: 3 },
              py: 2,
              borderTop: `1px solid ${theme.palette.divider}`,
              borderBottom: `1px solid ${theme.palette.divider}`,
              bgcolor: alpha(theme.palette.success.main, 0.03),
            })}
          >
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} justifyContent="space-between">
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 800, mb: 0.5 }}>
                  {currentTab.label}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {currentTab.description}
                </Typography>
              </Box>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                {activeTab === 'overview' && (
                  <>
                    <Chip label={brl(stats.received)} size="small" color="success" variant="outlined" />
                    <Chip label={brl(stats.overdue)} size="small" color={stats.overdue > 0 ? 'error' : 'default'} variant="outlined" />
                  </>
                )}
                {activeTab === 'payments' && (
                  <>
                    <Chip label={brl(stats.payablesOpen)} size="small" color="warning" variant="outlined" />
                    <Chip label="repasses e ciclos D10" size="small" variant="outlined" />
                  </>
                )}
                {activeTab === 'costs' && (
                  <>
                    <Chip label={brl(stats.platformCost)} size="small" variant="outlined" />
                    <Chip label={`${stats.trackedPlatforms} plataformas`} size="small" variant="outlined" />
                  </>
                )}
              </Stack>
            </Stack>
          </Box>

          <Box sx={{ px: { xs: 2, md: 3 }, py: { xs: 2, md: 3 } }}>
            {activeTab === 'overview' && <FinanceiroCruzadoClient embedded />}
            {activeTab === 'payments' && <PagamentosView embedded />}
            {activeTab === 'costs' && <AiCostsView embedded />}
          </Box>
        </Box>
      </Box>
    </AppShell>
  );
}
