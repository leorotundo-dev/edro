'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import AppShell from '@/components/AppShell';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import { IconChecklist, IconChartBar, IconFileTypePdf } from '@tabler/icons-react';
import PainelExecutivoClient from './painel/PainelExecutivoClient';
import FilaDeAcaoClient from './fila/FilaDeAcaoClient';
import RelatoriosMensaisClient from './RelatoriosMensaisClient';

const REPORT_TABS = [
  {
    value: 'painel' as const,
    label: 'Painel Executivo',
    description: 'Saúde, risco, produção e leitura cruzada dos clientes da agência.',
  },
  {
    value: 'fila' as const,
    label: 'Fila de Ação',
    description: 'O que exige atenção agora, com prioridade e ação direta.',
  },
  {
    value: 'mensais' as const,
    label: 'Relatórios Mensais',
    description: 'PDFs gerados, histórico e geração manual para os clientes ativos.',
  },
] as const;

type ReportTabValue = (typeof REPORT_TABS)[number]['value'];

function isReportTab(value: string | null): value is ReportTabValue {
  return REPORT_TABS.some((tab) => tab.value === value);
}

export default function RelatoriosWorkspaceClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = isReportTab(searchParams.get('tab')) ? searchParams.get('tab') : 'painel';
  const currentTab = REPORT_TABS.find((tab) => tab.value === activeTab) ?? REPORT_TABS[0];

  const handleTabChange = (_: unknown, value: ReportTabValue) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === 'painel') {
      params.delete('tab');
    } else {
      params.set('tab', value);
    }
    const query = params.toString();
    router.replace(query ? `/admin/relatorios?${query}` : '/admin/relatorios');
  };

  return (
    <AppShell title="Relatórios">
      <Stack spacing={3}>
        <Card
          variant="outlined"
          sx={{
            borderRadius: 3,
            background:
              'linear-gradient(135deg, rgba(93,135,255,0.10) 0%, rgba(93,135,255,0.03) 55%, rgba(15,23,42,0.02) 100%)',
          }}
        >
          <Box sx={{ p: { xs: 2.5, md: 3 } }}>
            <Stack spacing={2.25}>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip label="Reports" color="primary" size="small" sx={{ fontWeight: 700 }} />
                <Chip icon={<IconChartBar size={14} />} label="painel executivo" size="small" variant="outlined" />
                <Chip icon={<IconChecklist size={14} />} label="fila de ação" size="small" variant="outlined" />
                <Chip icon={<IconFileTypePdf size={14} />} label="relatórios mensais" size="small" variant="outlined" />
              </Stack>

              <Box>
                <Typography variant="h4" fontWeight={800} sx={{ mb: 0.5 }}>
                  Relatórios
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  A família de leitura gerencial da agência agora vive num workspace só:
                  painel executivo, fila de ação e relatórios mensais na mesma gramática.
                </Typography>
              </Box>
            </Stack>
          </Box>
        </Card>

        <Card variant="outlined" sx={{ borderRadius: 3 }}>
          <Box sx={{ p: { xs: 2, md: 3 } }}>
            <Tabs
              value={activeTab}
              onChange={handleTabChange}
              variant="scrollable"
              scrollButtons="auto"
              sx={{ mb: 3, borderBottom: 1, borderColor: 'divider', '& .MuiTab-root': { minHeight: 44 } }}
            >
              <Tab value="painel" label="Painel Executivo" icon={<IconChartBar size={16} />} iconPosition="start" />
              <Tab value="fila" label="Fila de Ação" icon={<IconChecklist size={16} />} iconPosition="start" />
              <Tab value="mensais" label="Relatórios Mensais" icon={<IconFileTypePdf size={16} />} iconPosition="start" />
            </Tabs>

            <Box
              sx={(theme) => ({
                mb: 3,
                px: { xs: 1.5, md: 2 },
                py: 1.75,
                borderRadius: 2,
                border: `1px solid ${theme.palette.divider}`,
                backgroundColor: 'rgba(93,135,255,0.03)',
              })}
            >
              <Typography variant="h6" fontWeight={800} sx={{ mb: 0.5 }}>
                {currentTab.label}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {currentTab.description}
              </Typography>
            </Box>

            {activeTab === 'painel' && <PainelExecutivoClient embedded />}
            {activeTab === 'fila' && <FilaDeAcaoClient embedded />}
            {activeTab === 'mensais' && <RelatoriosMensaisClient embedded />}
          </Box>
        </Card>
      </Stack>
    </AppShell>
  );
}
