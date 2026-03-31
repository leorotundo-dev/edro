'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import AppShell from '@/components/AppShell';
import AdminSubmenu from '@/components/admin/AdminSubmenu';
import EquipePageClient from '@/app/admin/equipe/EquipePageClient';
import PeopleDirectoryClient from './PeopleDirectoryClient';
import { AdminUsersView } from '@/app/admin/users/page';
import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';

const PEOPLE_TABS = [
  { value: 'equipe', label: 'Equipe & Freelancers' },
  { value: 'acessos', label: 'Acessos' },
  { value: 'diretorio', label: 'Diretório' },
] as const;

type PeopleTabValue = (typeof PEOPLE_TABS)[number]['value'];

function isPeopleTab(value: string | null): value is PeopleTabValue {
  return PEOPLE_TABS.some((tab) => tab.value === value);
}

export default function PessoasWorkspaceClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = isPeopleTab(searchParams.get('tab')) ? searchParams.get('tab') : 'equipe';

  const handleTabChange = (_: unknown, value: PeopleTabValue) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === 'equipe') {
      params.delete('tab');
    } else {
      params.set('tab', value);
    }
    const query = params.toString();
    router.replace(query ? `/admin/pessoas?${query}` : '/admin/pessoas');
  };

  return (
    <AppShell title="Pessoas">
      <Box>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" gutterBottom>Pessoas</Typography>
          <Typography variant="body2" color="text.secondary">
            Gestão unificada de acessos, equipe, freelancers e diretório de contatos.
          </Typography>
        </Box>

        <AdminSubmenu value="pessoas" />

        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="scrollable"
          allowScrollButtonsMobile
          scrollButtons="auto"
          sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
        >
          {PEOPLE_TABS.map((tab) => (
            <Tab key={tab.value} value={tab.value} label={tab.label} />
          ))}
        </Tabs>

        {activeTab === 'equipe' && <EquipePageClient embedded />}
        {activeTab === 'acessos' && <AdminUsersView embedded />}
        {activeTab === 'diretorio' && <PeopleDirectoryClient embedded />}
      </Box>
    </AppShell>
  );
}
