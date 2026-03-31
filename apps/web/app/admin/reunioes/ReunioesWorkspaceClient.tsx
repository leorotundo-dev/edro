'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import AppShell from '@/components/AppShell';
import CalendarHubPage from '@/app/calendar/CalendarClient';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import { IconCalendarEvent, IconMicrophone, IconRobot } from '@tabler/icons-react';
import MeetingsDashboardClient from './MeetingsDashboardClient';

const REUNIOES_TABS = [
  {
    value: 'meetings' as const,
    label: 'Reuniões IA',
    description: 'Agendamento, recall, transcrição e criação automática de ações com Jarvis.',
  },
  {
    value: 'agenda' as const,
    label: 'Agenda',
    description: 'Calendário editorial e operacional da agência na mesma família visual.',
  },
] as const;

type ReunioesTabValue = (typeof REUNIOES_TABS)[number]['value'];

function isReunioesTab(value: string | null): value is ReunioesTabValue {
  return REUNIOES_TABS.some((tab) => tab.value === value);
}

export default function ReunioesWorkspaceClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = isReunioesTab(searchParams.get('tab')) ? searchParams.get('tab') : 'meetings';
  const currentTab = REUNIOES_TABS.find((tab) => tab.value === activeTab) ?? REUNIOES_TABS[0];

  const handleTabChange = (_: unknown, value: ReunioesTabValue) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === 'meetings') {
      params.delete('tab');
    } else {
      params.set('tab', value);
    }
    const query = params.toString();
    router.replace(query ? `/admin/reunioes?${query}` : '/admin/reunioes');
  };

  return (
    <AppShell title="Reuniões">
      <Stack spacing={3}>
        <Card
          variant="outlined"
          sx={{
            borderRadius: 3,
            background:
              'linear-gradient(135deg, rgba(232,82,25,0.10) 0%, rgba(232,82,25,0.03) 55%, rgba(15,23,42,0.02) 100%)',
          }}
        >
          <Box sx={{ p: { xs: 2.5, md: 3 } }}>
            <Stack spacing={2.25}>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip label="Calendar" color="primary" size="small" sx={{ fontWeight: 700 }} />
                <Chip icon={<IconRobot size={14} />} label="reuniões com Jarvis Bot" size="small" variant="outlined" />
                <Chip icon={<IconCalendarEvent size={14} />} label="agenda editorial + operacional" size="small" variant="outlined" />
              </Stack>

              <Box>
                <Typography variant="h4" fontWeight={800} sx={{ mb: 0.5 }}>
                  Reuniões
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  A família de calendário da agência agora vive num workspace só:
                  reuniões inteligentes de um lado, agenda operacional do outro.
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
              <Tab value="meetings" label="Reuniões IA" icon={<IconMicrophone size={16} />} iconPosition="start" />
              <Tab value="agenda" label="Agenda" icon={<IconCalendarEvent size={16} />} iconPosition="start" />
            </Tabs>

            <Box
              sx={(theme) => ({
                mb: 3,
                px: { xs: 1.5, md: 2 },
                py: 1.75,
                borderRadius: 2,
                border: `1px solid ${theme.palette.divider}`,
                backgroundColor: 'rgba(232,82,25,0.03)',
              })}
            >
              <Typography variant="h6" fontWeight={800} sx={{ mb: 0.5 }}>
                {currentTab.label}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {currentTab.description}
              </Typography>
            </Box>

            {activeTab === 'meetings' ? (
              <MeetingsDashboardClient embedded />
            ) : (
              <CalendarHubPage noShell embedded brandColor="#E85219" />
            )}
          </Box>
        </Card>
      </Stack>
    </AppShell>
  );
}
