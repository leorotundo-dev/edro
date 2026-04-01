'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AppShell from '@/components/AppShell';
import EquipePageClient from '@/app/admin/equipe/EquipePageClient';
import PeopleDirectoryClient from './PeopleDirectoryClient';
import WorkspaceHero from '@/components/shared/WorkspaceHero';
import { apiGet } from '@/lib/api';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import { IconAddressBook, IconUserCheck } from '@tabler/icons-react';

type PersonSummary = {
  id: string;
  display_name: string;
  is_internal: boolean;
};

type FreelancerSummary = {
  id: string;
  is_active: boolean;
  active_timers?: { briefing_id: string }[];
};

const PEOPLE_TABS = [
  {
    value: 'operacao',
    label: 'Operação',
    description: 'Quem está ativo, rodando timer e tocando a operação da Edro.',
  },
  {
    value: 'cadastro',
    label: 'Cadastro',
    description: 'Cadastros, perfis, funções e dados-base da equipe interna e dos freelancers.',
  },
  {
    value: 'financeiro',
    label: 'Financeiro',
    description: 'Horas, custos e leitura financeira da equipe.',
  },
  {
    value: 'clientes',
    label: 'Clientes',
    description: 'O diretório externo: quem representa os clientes da agência.',
  },
] as const;

type PeopleTabValue = (typeof PEOPLE_TABS)[number]['value'];

type PeopleWorkspaceStats = {
  freelancersTotal: number;
  activeFreelancers: number;
  runningTimers: number;
  internalPeople: number;
  externalPeople: number;
  duplicatePeople: number;
};

const EMPTY_STATS: PeopleWorkspaceStats = {
  freelancersTotal: 0,
  activeFreelancers: 0,
  runningTimers: 0,
  internalPeople: 0,
  externalPeople: 0,
  duplicatePeople: 0,
};

function isPeopleTab(value: string | null): value is PeopleTabValue {
  return PEOPLE_TABS.some((tab) => tab.value === value);
}

function normalizePeopleTab(value: string | null): PeopleTabValue {
  if (isPeopleTab(value)) return value;
  if (value === 'equipe') return 'operacao';
  if (value === 'contatos') return 'clientes';
  return 'operacao';
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

export default function PessoasWorkspaceClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = normalizePeopleTab(searchParams.get('tab'));
  const [stats, setStats] = useState<PeopleWorkspaceStats>(EMPTY_STATS);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    let active = true;

    const loadStats = async () => {
      try {
        setLoadingStats(true);
        const [freelancersRes, peopleRes] = await Promise.all([
          apiGet<FreelancerSummary[]>('/freelancers').catch(() => [] as FreelancerSummary[]),
          apiGet<{ success: boolean; data: PersonSummary[] }>('/people?limit=400').catch(
            () => ({ success: false, data: [] as PersonSummary[] }),
          ),
        ]);

        if (!active) return;

        const freelancers = freelancersRes ?? [];
        const people = peopleRes.data ?? [];

        setStats({
          freelancersTotal: freelancers.length,
          activeFreelancers: freelancers.filter((freelancer) => freelancer.is_active).length,
          runningTimers: freelancers.filter((freelancer) => (freelancer.active_timers ?? []).length > 0).length,
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
    if (value === 'operacao') {
      params.delete('tab');
    } else {
      params.set('tab', value);
    }
    const query = params.toString();
    router.replace(query ? `/admin/pessoas?${query}` : '/admin/pessoas');
  };

  const activeConfig = PEOPLE_TABS.find((tab) => tab.value === activeTab) ?? PEOPLE_TABS[0];

  return (
    <AppShell title="Pessoas">
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <WorkspaceHero
          eyebrow="Contacts / Users"
          title="Pessoas"
          description="Um único menu para decidir rápido entre operação, cadastro, financeiro e contatos dos clientes."
          leftChips={[
            { label: `${stats.activeFreelancers} freelas ativos` },
            { label: `${stats.externalPeople} contatos externos` },
          ]}
          loading={loadingStats}
          loadingLabel="Carregando retrato da equipe..."
          rightContent={
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
          }
        />

        <Box
          sx={(theme) => ({
            borderRadius: 4,
            border: `1px solid ${theme.palette.divider}`,
            bgcolor: 'background.paper',
            overflow: 'hidden',
          })}
        >
          <Box sx={{ px: { xs: 2, md: 3 }, pt: { xs: 2, md: 2.5 }, pb: 1.5 }}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} justifyContent="space-between">
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
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                {(activeTab === 'operacao' || activeTab === 'cadastro' || activeTab === 'financeiro') && (
                  <>
                    <Chip label={`${stats.freelancersTotal} freelancers`} size="small" variant="outlined" />
                    <Chip label={`${stats.internalPeople} internos`} size="small" variant="outlined" />
                    <Chip label={`${stats.runningTimers} em execução`} size="small" color="success" variant="outlined" />
                  </>
                )}
                {activeTab === 'clientes' && (
                  <>
                    <Chip label={`${stats.externalPeople} contatos externos`} size="small" variant="outlined" />
                    <Chip
                      label={`${stats.duplicatePeople} duplicados`}
                      size="small"
                      color={stats.duplicatePeople > 0 ? 'warning' : 'default'}
                      variant="outlined"
                    />
                  </>
                )}
              </Stack>
            </Stack>

            <Box sx={{ mt: 1.5 }}>
              <Typography variant="body2" color="text.secondary">
                {activeConfig.description}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ px: { xs: 2, md: 3 }, py: { xs: 2, md: 3 } }}>
            {activeTab === 'operacao' && <EquipePageClient embedded forcedTab={0} />}
            {activeTab === 'cadastro' && <EquipePageClient embedded forcedTab={1} />}
            {activeTab === 'financeiro' && <EquipePageClient embedded forcedTab={2} />}
            {activeTab === 'clientes' && (
              <PeopleDirectoryClient
                embedded
                fixedFilter="external"
                title="Contatos dos Clientes"
                description="Somente pessoas externas vinculadas aos clientes da agência."
              />
            )}
          </Box>
        </Box>
      </Box>
    </AppShell>
  );
}
