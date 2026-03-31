'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import AppShell from '@/components/AppShell';
import AdminSubmenu from '@/components/admin/AdminSubmenu';
import { PagamentosView } from '@/app/admin/pagamentos/page';
import { AiCostsView } from '@/app/admin/ai-costs/page';
import FinanceiroCruzadoClient from '@/app/admin/relatorios/financeiro/FinanceiroCruzadoClient';
import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';

const FINANCE_TABS = [
  { value: 'overview', label: 'Financeiro Cruzado' },
  { value: 'payments', label: 'Pagamentos' },
  { value: 'costs', label: 'Custos de Operação' },
] as const;

type FinanceTabValue = (typeof FINANCE_TABS)[number]['value'];

function isFinanceTab(value: string | null): value is FinanceTabValue {
  return FINANCE_TABS.some((tab) => tab.value === value);
}

export default function FinanceiroWorkspaceClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = isFinanceTab(searchParams.get('tab')) ? searchParams.get('tab') : 'overview';

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

  return (
    <AppShell title="Financeiro">
      <Box>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" gutterBottom>Financeiro</Typography>
          <Typography variant="body2" color="text.secondary">
            Receita, pagamentos, custos de operação e visão financeira consolidada da agência.
          </Typography>
        </Box>

        <AdminSubmenu value="financeiro" />

        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="scrollable"
          allowScrollButtonsMobile
          scrollButtons="auto"
          sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
        >
          {FINANCE_TABS.map((tab) => (
            <Tab key={tab.value} value={tab.value} label={tab.label} />
          ))}
        </Tabs>

        {activeTab === 'overview' && <FinanceiroCruzadoClient embedded />}
        {activeTab === 'payments' && <PagamentosView embedded />}
        {activeTab === 'costs' && <AiCostsView embedded />}
      </Box>
    </AppShell>
  );
}
