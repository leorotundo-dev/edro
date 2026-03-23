'use client';
/**
 * Portal do Cliente — Dashboard
 * Public-facing dashboard for clients with no login required.
 * Uses an HttpOnly portal session established by the /portal/[token] page.
 */
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { IconBriefcase, IconCheck, IconClockHour3, IconMessagePlus, IconRefresh } from '@tabler/icons-react';

const EDRO_ORANGE = '#E85219';

type Job = {
  id: string;
  title: string;
  status: string;
  due_at?: string;
  updated_at: string;
  copy_approved_at?: string;
  labels?: string[];
};

type ClientInfo = {
  id: string;
  name: string;
  status: string;
};

type PortalSessionResponse = {
  authenticated: boolean;
  client: ClientInfo | null;
};

async function portalFetch<T>(path: string, opts: RequestInit = {}) {
  const response = await fetch(path, {
    ...opts,
    headers: {
      ...(opts.body ? { 'Content-Type': 'application/json' } : {}),
      ...(opts.headers ?? {}),
    },
    cache: 'no-store',
  });

  const text = await response.text();
  let payload: any = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { raw: text };
    }
  }

  if (!response.ok) {
    const error = new Error(payload?.error || payload?.message || `API error ${response.status}`) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }

  return (payload ?? {}) as T;
}

const STATUS_COLORS: Record<string, 'default' | 'warning' | 'info' | 'success' | 'error'> = {
  draft: 'default',
  in_progress: 'info',
  review: 'warning',
  approved: 'success',
  cancelled: 'error',
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Rascunho',
  in_progress: 'Em andamento',
  review: 'Aguardando aprovação',
  approved: 'Aprovado',
  cancelled: 'Cancelado',
};

export default function PortalDashboard() {
  const router = useRouter();
  const [client, setClient] = useState<ClientInfo | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestText, setRequestText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [approving, setApproving] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sessionRes, jobsRes] = await Promise.all([
        portalFetch<PortalSessionResponse>('/api/portal/session'),
        portalFetch<{ jobs?: Job[] }>('/api/portal/proxy/client/jobs'),
      ]);
      setClient(sessionRes.client ?? null);
      setJobs(jobsRes.jobs ?? []);
    } catch {
      router.replace('/portal/expired');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  const handleApprove = async (jobId: string) => {
    setApproving(jobId);
    try {
      await portalFetch(`/api/portal/proxy/client/jobs/${encodeURIComponent(jobId)}/approve`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      await load();
    } catch (err: any) {
      if (err?.status === 401) {
        router.replace('/portal/expired');
      }
    } finally {
      setApproving(null);
    }
  };

  const handleSubmitRequest = async () => {
    if (!requestText.trim()) return;
    setSubmitting(true);
    setSubmitSuccess(false);
    try {
      await portalFetch('/api/portal/proxy/client/jobs/request', {
        method: 'POST',
        body: JSON.stringify({ message: requestText.trim() }),
      });
      setRequestText('');
      setSubmitSuccess(true);
    } catch (err: any) {
      if (err?.status === 401) {
        router.replace('/portal/expired');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const pendingApproval = jobs.filter((job) => job.status === 'review');
  const inProgress = jobs.filter((job) => job.status === 'in_progress' || job.status === 'draft');
  const done = jobs.filter((job) => job.status === 'approved');

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#0f0f0f', color: '#fff', pb: 8 }}>
      <Box sx={{ bgcolor: '#1a1a1a', borderBottom: '1px solid #2a2a2a', py: 2, px: { xs: 2, md: 4 } }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Avatar sx={{ bgcolor: EDRO_ORANGE, width: 36, height: 36, fontSize: '0.85rem', fontWeight: 700 }}>
              {(client?.name ?? '').charAt(0).toUpperCase()}
            </Avatar>
            <Box>
              <Typography variant="subtitle2" fontWeight={700} color="#fff">
                {client?.name ?? 'Portal do Cliente'}
              </Typography>
              <Typography variant="caption" color="text.secondary">Portal do Cliente</Typography>
            </Box>
          </Stack>
          <Button
            size="small"
            startIcon={<IconRefresh size={14} />}
            onClick={load}
            sx={{ color: 'text.secondary', minWidth: 0 }}
          >
            Atualizar
          </Button>
        </Stack>
      </Box>

      <Box sx={{ maxWidth: 860, mx: 'auto', px: { xs: 2, md: 3 }, pt: 3 }}>
        {loading ? (
          <Stack alignItems="center" py={8}>
            <CircularProgress size={28} sx={{ color: EDRO_ORANGE }} />
          </Stack>
        ) : (
          <Stack spacing={3}>
            {pendingApproval.length > 0 && (
              <Box>
                <Typography variant="subtitle2" fontWeight={700} color={EDRO_ORANGE} sx={{ mb: 1.5 }}>
                  Aguardando sua aprovação ({pendingApproval.length})
                </Typography>
                <Stack spacing={1.5}>
                  {pendingApproval.map((job) => (
                    <Card key={job.id} variant="outlined" sx={{ bgcolor: '#1a1a1a', border: `1px solid ${EDRO_ORANGE}40` }}>
                      <CardContent sx={{ '&:last-child': { pb: 2 } }}>
                        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={2}>
                          <Box>
                            <Typography fontWeight={600} color="#fff" sx={{ mb: 0.5 }}>{job.title}</Typography>
                            <Chip
                              label={STATUS_LABELS[job.status] ?? job.status}
                              color={STATUS_COLORS[job.status] ?? 'default'}
                              size="small"
                              sx={{ fontSize: '0.65rem' }}
                            />
                          </Box>
                          <Button
                            variant="contained"
                            size="small"
                            startIcon={approving === job.id ? <CircularProgress size={12} color="inherit" /> : <IconCheck size={14} />}
                            disabled={approving === job.id}
                            onClick={() => handleApprove(job.id)}
                            sx={{ bgcolor: EDRO_ORANGE, '&:hover': { bgcolor: '#c44a15' }, whiteSpace: 'nowrap' }}
                          >
                            Aprovar
                          </Button>
                        </Stack>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              </Box>
            )}

            {inProgress.length > 0 && (
              <Box>
                <Typography variant="subtitle2" fontWeight={700} color="text.secondary" sx={{ mb: 1.5 }}>
                  <Stack component="span" direction="row" alignItems="center" spacing={0.5} sx={{ display: 'inline-flex' }}>
                    <IconClockHour3 size={16} />
                    <span>Em andamento ({inProgress.length})</span>
                  </Stack>
                </Typography>
                <Stack spacing={1}>
                  {inProgress.map((job) => (
                    <Card key={job.id} variant="outlined" sx={{ bgcolor: '#1a1a1a', borderColor: '#2a2a2a' }}>
                      <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                        <Stack direction="row" alignItems="center" justifyContent="space-between">
                          <Typography variant="body2" fontWeight={600} color="#fff">{job.title}</Typography>
                          <Chip
                            label={STATUS_LABELS[job.status] ?? job.status}
                            color={STATUS_COLORS[job.status] ?? 'default'}
                            size="small"
                            sx={{ fontSize: '0.65rem' }}
                          />
                        </Stack>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              </Box>
            )}

            {done.length > 0 && (
              <Box>
                <Typography variant="subtitle2" fontWeight={700} color="text.secondary" sx={{ mb: 1.5 }}>
                  <Stack component="span" direction="row" alignItems="center" spacing={0.5} sx={{ display: 'inline-flex' }}>
                    <IconCheck size={16} />
                    <span>Concluidos ({done.length})</span>
                  </Stack>
                </Typography>
                <Stack spacing={1}>
                  {done.slice(0, 5).map((job) => (
                    <Card key={job.id} variant="outlined" sx={{ bgcolor: '#1a1a1a', borderColor: '#2a2a2a', opacity: 0.7 }}>
                      <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                        <Stack direction="row" alignItems="center" justifyContent="space-between">
                          <Typography variant="body2" fontWeight={600} color="#ccc">{job.title}</Typography>
                          <IconCheck size={16} color="#4ade80" />
                        </Stack>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              </Box>
            )}

            {jobs.length === 0 && (
              <Stack alignItems="center" py={6} spacing={2}>
                <IconBriefcase size={40} color="#444" />
                <Typography color="text.secondary" variant="body2">Nenhum job no momento.</Typography>
              </Stack>
            )}

            <Divider sx={{ borderColor: '#2a2a2a' }} />

            <Box>
              <Typography variant="subtitle2" fontWeight={700} color="#fff" sx={{ mb: 1.5 }}>
                <Stack component="span" direction="row" alignItems="center" spacing={0.5} sx={{ display: 'inline-flex' }}>
                  <IconMessagePlus size={16} />
                  <span>Novo Pedido</span>
                </Stack>
              </Typography>
              {submitSuccess && (
                <Card variant="outlined" sx={{ bgcolor: '#14532d20', borderColor: '#4ade8040', mb: 2 }}>
                  <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <IconCheck size={16} color="#4ade80" />
                      <Typography variant="body2" color="#4ade80">
                        Pedido enviado! Nossa equipe entrara em contato em breve.
                      </Typography>
                    </Stack>
                  </CardContent>
                </Card>
              )}
              <TextField
                fullWidth
                multiline
                minRows={3}
                placeholder="Descreva o que voce precisa... Ex: 'Precisamos de um post para o lancamento do produto X com foco em engajamento.'"
                value={requestText}
                onChange={(event) => setRequestText(event.target.value)}
                sx={{
                  mb: 1.5,
                  '& .MuiOutlinedInput-root': {
                    bgcolor: '#1a1a1a',
                    color: '#fff',
                    '& fieldset': { borderColor: '#2a2a2a' },
                    '&:hover fieldset': { borderColor: '#444' },
                    '&.Mui-focused fieldset': { borderColor: EDRO_ORANGE },
                  },
                  '& .MuiInputBase-input::placeholder': { color: '#666' },
                }}
              />
              <Button
                variant="contained"
                disabled={!requestText.trim() || submitting}
                onClick={handleSubmitRequest}
                startIcon={submitting ? <CircularProgress size={14} color="inherit" /> : <IconMessagePlus size={16} />}
                sx={{ bgcolor: EDRO_ORANGE, '&:hover': { bgcolor: '#c44a15' } }}
              >
                Enviar pedido
              </Button>
            </Box>
          </Stack>
        )}
      </Box>
    </Box>
  );
}
