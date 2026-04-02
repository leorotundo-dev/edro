'use client';

import { useState } from 'react';
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
import { IconChevronRight, IconPlus } from '@tabler/icons-react';

type Job = { id: string; title: string; status: string; updated_at: string; due_at: string | null };
type BriefingRequest = {
  id: string;
  status: 'pending' | 'enriching' | 'submitted' | 'accepted' | 'declined' | 'converted';
  form_data: { type?: string; objective?: string; platform?: string; deadline?: string };
  agency_notes?: string;
  created_at: string;
};

// Translate internal statuses to client-facing labels
const JOB_STATUS: Record<string, { label: string; color: 'default' | 'info' | 'warning' | 'success' }> = {
  backlog:     { label: 'Enviado', color: 'default' },
  todo:        { label: 'Em análise', color: 'info' },
  in_progress: { label: 'Em produção', color: 'info' },
  review:      { label: 'Aguardando aprovação', color: 'warning' },
  done:        { label: 'Entregue', color: 'success' },
};

const BRIEFING_STATUS: Record<string, { label: string; color: 'default' | 'info' | 'warning' | 'success' | 'error' }> = {
  pending:   { label: 'Rascunho', color: 'default' },
  enriching: { label: 'Analisando', color: 'info' },
  submitted: { label: 'Enviado', color: 'warning' },
  accepted:  { label: 'Aceito', color: 'success' },
  declined:  { label: 'Recusado', color: 'error' },
  converted: { label: 'Em produção', color: 'info' },
};

export default function PedidosPage() {
  const router = useRouter();
  const [tab, setTab] = useState(0);

  const { data: jobsData, isLoading: jobsLoading } = useSWR<{ jobs: Job[] }>('/portal/client/jobs', swrFetcher);
  const { data: briefingsData, isLoading: briefingsLoading } = useSWR<{ briefings: BriefingRequest[] }>('/portal/client/briefings', swrFetcher);

  const jobs = jobsData?.jobs ?? [];
  const briefings = briefingsData?.briefings ?? [];

  const isLoading = jobsLoading || briefingsLoading;

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'flex-end' }} spacing={2}>
        <Box>
          <Typography variant="overline" color="text.secondary">Pedidos</Typography>
          <Typography variant="h4" sx={{ mt: 0.25 }}>Seus pedidos</Typography>
          <Typography variant="body1" color="text.secondary">
            Todos os pedidos, do briefing até a entrega, em um só lugar.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<IconPlus size={16} />}
          onClick={() => router.push('/pedidos/novo')}
          sx={{ flexShrink: 0 }}
        >
          Novo pedido
        </Button>
      </Stack>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tab label={`Em produção (${jobs.filter(j => ['in_progress', 'review'].includes(j.status)).length})`} />
        <Tab label={`Solicitações (${briefings.filter(b => !['converted'].includes(b.status)).length})`} />
        <Tab label={`Concluídos (${jobs.filter(j => j.status === 'done').length})`} />
      </Tabs>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={24} /></Box>
      ) : (
        <>
          {/* Tab 0: Active jobs */}
          {tab === 0 && (
            <>
              {jobs.filter(j => j.status !== 'done').length === 0 ? (
                <Alert severity="info" sx={{ borderRadius: 2 }}>Nenhum pedido ativo no momento.</Alert>
              ) : (
                <Card sx={{ borderRadius: 3 }}>
                  <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                    <Stack divider={<Divider />}>
                      {jobs.filter(j => j.status !== 'done').map((job) => {
                        const st = JOB_STATUS[job.status] ?? { label: job.status, color: 'default' as const };
                        return (
                          <Box
                            key={job.id}
                            onClick={() => router.push(`/pedidos/${job.id}`)}
                            sx={{ px: 3, py: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                          >
                            <Box sx={{ minWidth: 0, mr: 2 }}>
                              <Typography variant="subtitle2" noWrap>{job.title}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                Atualizado em {new Date(job.updated_at).toLocaleDateString('pt-BR')}
                                {job.due_at ? ` · Prazo: ${new Date(job.due_at).toLocaleDateString('pt-BR')}` : ''}
                              </Typography>
                            </Box>
                            <Stack direction="row" spacing={1} alignItems="center" sx={{ flexShrink: 0 }}>
                              <Chip label={st.label} color={st.color} size="small" variant="outlined" />
                              <IconChevronRight size={16} color="#9ca3af" />
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

          {/* Tab 1: Briefings / requests */}
          {tab === 1 && (
            <>
              {briefings.filter(b => b.status !== 'converted').length === 0 ? (
                <Alert severity="info" sx={{ borderRadius: 2 }}>Nenhuma solicitação pendente.</Alert>
              ) : (
                <Stack spacing={1.5}>
                  {briefings.filter(b => b.status !== 'converted').map((b) => {
                    const s = BRIEFING_STATUS[b.status] ?? { label: b.status, color: 'default' as const };
                    const title = b.form_data?.type ?? 'Solicitação';
                    return (
                      <Card key={b.id} variant="outlined" sx={{ borderRadius: 3 }}>
                        <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                          <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={2}>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                                <Typography variant="body2" fontWeight={600}>{title}</Typography>
                                {b.form_data?.platform && (
                                  <Chip label={b.form_data.platform} size="small" variant="outlined" />
                                )}
                              </Stack>
                              <Typography variant="body2" color="text.secondary" sx={{ overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                                {b.form_data?.objective}
                              </Typography>
                              {b.form_data?.deadline && (
                                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                                  Prazo desejado: {new Date(b.form_data.deadline + 'T00:00').toLocaleDateString('pt-BR')}
                                </Typography>
                              )}
                              {b.agency_notes && b.status === 'declined' && (
                                <Typography variant="caption" color="error.main" sx={{ mt: 0.5, display: 'block' }}>
                                  Nota: {b.agency_notes}
                                </Typography>
                              )}
                            </Box>
                            <Stack alignItems="flex-end" spacing={0.5} sx={{ flexShrink: 0 }}>
                              <Chip label={s.label} size="small" color={s.color} />
                              <Typography variant="caption" color="text.secondary">
                                {new Date(b.created_at).toLocaleDateString('pt-BR')}
                              </Typography>
                            </Stack>
                          </Stack>
                        </CardContent>
                      </Card>
                    );
                  })}
                </Stack>
              )}
            </>
          )}

          {/* Tab 2: Delivered */}
          {tab === 2 && (
            <>
              {jobs.filter(j => j.status === 'done').length === 0 ? (
                <Alert severity="info" sx={{ borderRadius: 2 }}>Nenhuma entrega concluída ainda.</Alert>
              ) : (
                <Card sx={{ borderRadius: 3 }}>
                  <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                    <Stack divider={<Divider />}>
                      {jobs.filter(j => j.status === 'done').map((job) => (
                        <Box
                          key={job.id}
                          onClick={() => router.push(`/pedidos/${job.id}`)}
                          sx={{ px: 3, py: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                        >
                          <Box sx={{ minWidth: 0, mr: 2 }}>
                            <Typography variant="subtitle2" noWrap>{job.title}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              Atualizado em {new Date(job.updated_at).toLocaleDateString('pt-BR')}
                            </Typography>
                          </Box>
                          <Stack direction="row" spacing={1} alignItems="center" sx={{ flexShrink: 0 }}>
                            <Chip label="Entregue" color="success" size="small" variant="outlined" />
                            <IconChevronRight size={16} color="#9ca3af" />
                          </Stack>
                        </Box>
                      ))}
                    </Stack>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </>
      )}
    </Stack>
  );
}
