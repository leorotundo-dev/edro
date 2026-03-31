'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AppShell from '@/components/AppShell';
import AdminSubmenu from '@/components/admin/AdminSubmenu';
import EquipePageClient from '@/app/admin/equipe/EquipePageClient';
import PeopleDirectoryClient from './PeopleDirectoryClient';
import { AdminUsersView } from '@/app/admin/users/page';
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
  IconAddressBook,
  IconShieldCheck,
  IconUserCheck,
  IconUsersGroup,
} from '@tabler/icons-react';

type PersonSummary = {
  id: string;
  display_name: string;
  is_internal: boolean;
};

type UserSummary = {
  id: string;
  status: string;
  role: string;
};

type FreelancerSummary = {
  id: string;
  is_active: boolean;
  active_timers?: { briefing_id: string }[];
};

const PEOPLE_TABS = [
  {
    value: 'equipe',
    label: 'Equipe & Freelancers',
    description: 'Freelas ativos, timers, cobrança e contatos operacionais.',
  },
  {
    value: 'acessos',
    label: 'Acessos',
    description: 'Papéis, status de conta e governança de acesso do sistema.',
  },
  {
    value: 'diretorio',
    label: 'Diretório',
    description: 'Contatos, duplicados, sync e merge de pessoas da operação.',
  },
] as const;

type PeopleTabValue = (typeof PEOPLE_TABS)[number]['value'];

type PeopleWorkspaceStats = {
  usersTotal: number;
  activeUsers: number;
  adminUsers: number;
  freelancersTotal: number;
  activeFreelancers: number;
  runningTimers: number;
  peopleTotal: number;
  internalPeople: number;
  externalPeople: number;
  duplicatePeople: number;
};

const EMPTY_STATS: PeopleWorkspaceStats = {
  usersTotal: 0,
  activeUsers: 0,
  adminUsers: 0,
  freelancersTotal: 0,
  activeFreelancers: 0,
  runningTimers: 0,
  peopleTotal: 0,
  internalPeople: 0,
  externalPeople: 0,
  duplicatePeople: 0,
};

function isPeopleTab(value: string | null): value is PeopleTabValue {
  return PEOPLE_TABS.some((tab) => tab.value === value);
}

function computeDuplicatePeople(people: PersonSummary[]) {
  const counts = new Map<string, number>();
  for (const person of people) {
    const normalized = person.display_name.trim().toLowerCase();
    if (!normalized || normalized === 'pessoa sem nome') continue;
    counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
  }
  let duplicates = 0;
  for (const count of Array.from(counts.values())) {
    if (count > 1) duplicates += count;
  }
  return duplicates;
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
        borderColor: alpha(theme.palette.primary.main, 0.14),
        backgroundImage: `linear-gradient(180deg, ${alpha(theme.palette.primary.main, 0.04)} 0%, transparent 100%)`,
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
              bgcolor: alpha(theme.palette.primary.main, 0.1),
              color: 'primary.main',
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

export default function PessoasWorkspaceClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = isPeopleTab(searchParams.get('tab')) ? searchParams.get('tab') : 'equipe';
  const [stats, setStats] = useState<PeopleWorkspaceStats>(EMPTY_STATS);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    let active = true;

    const loadStats = async () => {
      try {
        setLoadingStats(true);
        const [usersRes, freelancersRes, peopleRes] = await Promise.all([
          apiGet<{ users: UserSummary[] }>('/admin/users').catch(() => ({ users: [] as UserSummary[] })),
          apiGet<FreelancerSummary[]>('/freelancers').catch(() => [] as FreelancerSummary[]),
          apiGet<{ success: boolean; data: PersonSummary[] }>('/people?limit=400').catch(
            () => ({ success: false, data: [] as PersonSummary[] }),
          ),
        ]);

        if (!active) return;

        const users = usersRes.users ?? [];
        const freelancers = freelancersRes ?? [];
        const people = peopleRes.data ?? [];

        setStats({
          usersTotal: users.length,
          activeUsers: users.filter((user) => user.status === 'active').length,
          adminUsers: users.filter((user) => user.role === 'admin').length,
          freelancersTotal: freelancers.length,
          activeFreelancers: freelancers.filter((freelancer) => freelancer.is_active).length,
          runningTimers: freelancers.filter((freelancer) => (freelancer.active_timers ?? []).length > 0).length,
          peopleTotal: people.length,
          internalPeople: people.filter((person) => person.is_internal).length,
          externalPeople: people.filter((person) => !person.is_internal).length,
          duplicatePeople: computeDuplicatePeople(people),
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

  const currentTab = PEOPLE_TABS.find((tab) => tab.value === activeTab) ?? PEOPLE_TABS[0];

  return (
    <AppShell title="Pessoas">
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Box
          sx={(theme) => ({
            borderRadius: 4,
            px: { xs: 2.5, md: 3.5 },
            py: { xs: 2.5, md: 3 },
            border: `1px solid ${alpha(theme.palette.primary.main, 0.14)}`,
            backgroundImage: `linear-gradient(140deg, ${alpha(theme.palette.primary.main, 0.08)} 0%, ${alpha(theme.palette.background.paper, 0.98)} 58%)`,
          })}
        >
          <Stack
            direction={{ xs: 'column', lg: 'row' }}
            spacing={2.5}
            justifyContent="space-between"
            alignItems={{ xs: 'flex-start', lg: 'center' }}
          >
            <Stack spacing={1.25} sx={{ maxWidth: 780 }}>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                <Chip
                  label="Contacts / Users"
                  color="primary"
                  size="small"
                  sx={{ fontWeight: 700 }}
                />
                <Chip
                  label={`${stats.activeFreelancers} freelas ativos`}
                  size="small"
                  variant="outlined"
                />
                <Chip
                  label={`${stats.activeUsers} acessos ativos`}
                  size="small"
                  variant="outlined"
                />
              </Stack>
              <Box>
                <Typography variant="h3" sx={{ fontWeight: 800, mb: 0.75 }}>
                  Pessoas
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Um workspace só para equipe, acessos e diretório. A lógica aqui é simples:
                  quem faz, quem acessa e quem existe no ecossistema da agência.
                </Typography>
              </Box>
            </Stack>

            <Stack
              direction={{ xs: 'row', sm: 'row' }}
              spacing={1}
              flexWrap="wrap"
              useFlexGap
              alignItems="center"
            >
              {loadingStats ? (
                <Stack direction="row" spacing={1} alignItems="center">
                  <CircularProgress size={18} />
                  <Typography variant="body2" color="text.secondary">
                    Carregando retrato da equipe...
                  </Typography>
                </Stack>
              ) : (
                <>
                  <Chip
                    icon={<IconUserCheck size={14} />}
                    label={`${stats.runningTimers} timers rodando`}
                    size="small"
                    color="success"
                    variant="outlined"
                  />
                  <Chip
                    icon={<IconAddressBook size={14} />}
                    label={`${stats.duplicatePeople} contatos para revisar`}
                    size="small"
                    color={stats.duplicatePeople > 0 ? 'warning' : 'default'}
                    variant="outlined"
                  />
                </>
              )}
            </Stack>
          </Stack>
        </Box>

        <AdminSubmenu value="pessoas" />

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <WorkspaceStatCard
              label="Equipe"
              value={String(stats.activeFreelancers)}
              helper={`${stats.runningTimers} com timer rodando agora`}
              icon={<IconUserCheck size={18} />}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <WorkspaceStatCard
              label="Acessos"
              value={String(stats.activeUsers)}
              helper={`${stats.adminUsers} admins entre ${stats.usersTotal} contas`}
              icon={<IconShieldCheck size={18} />}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <WorkspaceStatCard
              label="Diretório"
              value={String(stats.peopleTotal)}
              helper={`${stats.internalPeople} internos e ${stats.externalPeople} externos`}
              icon={<IconUsersGroup size={18} />}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <WorkspaceStatCard
              label="Higiene"
              value={String(stats.duplicatePeople)}
              helper="contatos com nome duplicado para merge"
              icon={<IconAddressBook size={18} />}
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
              {PEOPLE_TABS.map((tab) => (
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
              bgcolor: alpha(theme.palette.primary.main, 0.03),
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
                {activeTab === 'equipe' && (
                  <>
                    <Chip label={`${stats.freelancersTotal} freelancers`} size="small" variant="outlined" />
                    <Chip label={`${stats.runningTimers} em execução`} size="small" color="success" variant="outlined" />
                  </>
                )}
                {activeTab === 'acessos' && (
                  <>
                    <Chip label={`${stats.usersTotal} contas`} size="small" variant="outlined" />
                    <Chip label={`${stats.activeUsers} ativas`} size="small" color="primary" variant="outlined" />
                  </>
                )}
                {activeTab === 'diretorio' && (
                  <>
                    <Chip label={`${stats.peopleTotal} pessoas`} size="small" variant="outlined" />
                    <Chip
                      label={`${stats.duplicatePeople} duplicadas`}
                      size="small"
                      color={stats.duplicatePeople > 0 ? 'warning' : 'default'}
                      variant="outlined"
                    />
                  </>
                )}
              </Stack>
            </Stack>
          </Box>

          <Box sx={{ px: { xs: 2, md: 3 }, py: { xs: 2, md: 3 } }}>
            {activeTab === 'equipe' && <EquipePageClient embedded />}
            {activeTab === 'acessos' && <AdminUsersView embedded />}
            {activeTab === 'diretorio' && <PeopleDirectoryClient embedded />}
          </Box>
        </Box>
      </Box>
    </AppShell>
  );
}
