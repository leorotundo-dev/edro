'use client';

import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { swrFetcher } from '@/lib/api';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import { IconCalendar, IconVideo, IconArrowRight } from '@tabler/icons-react';

type Job = { id: string; title: string; status: string; updated_at: string; due_at: string | null };
// NEW backend endpoint — GET /portal/client/calendar (agenda + meetings)
type CalendarEvent = {
  id: string;
  type: 'meeting' | 'delivery';
  title: string;
  date: string;
  description?: string;
  link?: string;
};

export default function AgendaPage() {
  const router = useRouter();
  const [tab, setTab] = useState(0);

  // Use existing jobs endpoint filtered for upcoming deadlines
  const { data: jobsData, isLoading: jobsLoading } = useSWR<{ jobs: Job[] }>('/portal/client/jobs', swrFetcher);

  // NEW endpoint — stub gracefully if not available yet
  // GET /portal/client/calendar
  const { data: calendarData, isLoading: calendarLoading } = useSWR<{ events: CalendarEvent[] }>(
    '/portal/client/calendar',
    swrFetcher,
  );

  const jobs = jobsData?.jobs ?? [];
  const upcomingDeliveries = jobs
    .filter((j) => j.due_at && j.status !== 'done')
    .sort((a, b) => new Date(a.due_at!).getTime() - new Date(b.due_at!).getTime());

  const meetings = (calendarData?.events ?? []).filter(e => e.type === 'meeting');
  const isLoading = jobsLoading || calendarLoading;

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="overline" color="text.secondary">Agenda</Typography>
        <Typography variant="h4" sx={{ mt: 0.25 }}>Agenda da conta</Typography>
        <Typography variant="body1" color="text.secondary">
          Próximas entregas, reuniões agendadas e disponibilidade de entrega.
        </Typography>
      </Box>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tab label="Entregas" />
        <Tab label="Reuniões" />
      </Tabs>

      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={24} /></Box>
      )}

      {!isLoading && tab === 0 && (
        <>
          {upcomingDeliveries.length === 0 ? (
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              Nenhuma entrega com prazo definido no momento.
            </Alert>
          ) : (
            <Card sx={{ borderRadius: 3 }}>
              <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                <Stack divider={<Divider />}>
                  {upcomingDeliveries.map((job) => {
                    const daysUntil = job.due_at
                      ? Math.ceil((new Date(job.due_at).getTime() - Date.now()) / 86400000)
                      : null;
                    const urgent = daysUntil !== null && daysUntil <= 3;
                    return (
                      <Box
                        key={job.id}
                        onClick={() => router.push(`/pedidos/${job.id}`)}
                        sx={{ px: 3, py: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                      >
                        <Stack direction="row" spacing={2} alignItems="center">
                          <Box
                            sx={{
                              p: 1.25, borderRadius: 2, display: 'flex',
                              bgcolor: urgent ? 'error.light' : 'info.light',
                              color: urgent ? 'error.dark' : 'info.dark',
                            }}
                          >
                            <IconCalendar size={18} />
                          </Box>
                          <Box>
                            <Typography variant="subtitle2">{job.title}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              Prazo: {new Date(job.due_at!).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })}
                              {daysUntil !== null && ` · ${daysUntil === 0 ? 'hoje' : daysUntil === 1 ? 'amanhã' : `em ${daysUntil} dias`}`}
                            </Typography>
                          </Box>
                        </Stack>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ flexShrink: 0 }}>
                          {urgent && <Chip label="Urgente" color="error" size="small" />}
                          <IconArrowRight size={16} color="#9ca3af" />
                        </Stack>
                      </Box>
                    );
                  })}
                </Stack>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {!isLoading && tab === 1 && (
        <>
          {meetings.length === 0 ? (
            <Card variant="outlined" sx={{ borderRadius: 3 }}>
              <CardContent sx={{ textAlign: 'center', py: 5 }}>
                <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center' }}>
                  <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 3 }}>
                    <IconVideo size={28} color="#6b7280" />
                  </Box>
                </Box>
                <Typography variant="h6" gutterBottom>Nenhuma reunião agendada</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Fale com sua equipe para agendar uma reunião de alinhamento.
                </Typography>
                <Button
                  variant="outlined"
                  onClick={() => router.push('/assistente')}
                  endIcon={<IconArrowRight size={14} />}
                >
                  Falar com o assistente
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card sx={{ borderRadius: 3 }}>
              <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                <Stack divider={<Divider />}>
                  {meetings.map((ev) => (
                    <Box key={ev.id} sx={{ px: 3, py: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Box sx={{ p: 1.25, bgcolor: 'primary.light', borderRadius: 2, color: 'primary.dark', display: 'flex' }}>
                          <IconVideo size={18} />
                        </Box>
                        <Box>
                          <Typography variant="subtitle2">{ev.title}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(ev.date).toLocaleString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </Typography>
                          {ev.description && (
                            <Typography variant="caption" color="text.secondary" display="block">{ev.description}</Typography>
                          )}
                        </Box>
                      </Stack>
                      {ev.link && (
                        <Button size="small" variant="outlined" href={ev.link} target="_blank" rel="noreferrer" sx={{ flexShrink: 0 }}>
                          Entrar
                        </Button>
                      )}
                    </Box>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </Stack>
  );
}
