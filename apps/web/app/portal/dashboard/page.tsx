'use client';
/**
 * Portal do Cliente — Dashboard
 * Public-facing dashboard for clients with no login required.
 * Uses the JWT stored in sessionStorage by the /portal/[token] page.
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
import { IconBriefcase, IconCheck, IconClockHour3, IconMessagePlus, IconRefresh, IconX } from '@tabler/icons-react';
import { buildApiUrl } from '@/lib/api';

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

function portalHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? sessionStorage.getItem('portal_token') : null;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function portalFetch(path: string, opts: RequestInit = {}) {
  const url = buildApiUrl(path);
  const res = await fetch(url, { ...opts, headers: { ...portalHeaders(), ...(opts.headers ?? {}) } });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
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

  const clientName = typeof window !== 'undefined' ? sessionStorage.getItem('portal_client_name') ?? '' : '';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [meRes, jobsRes] = await Promise.all([
        portalFetch('/portal/client/me'),
        portalFetch('/portal/client/jobs'),
      ]);
      setClient(meRes.client ?? null);
      setJobs(jobsRes.jobs ?? []);
    } catch {
      // Token may be expired — redirect back
      router.replace('/portal/expired');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const token = sessionStorage.getItem('portal_token');
    if (!token) { router.replace('/portal/expired'); return; }
    load();
  }, [load, router]);

  const handleApprove = async (jobId: string) => {
    setApproving(jobId);
    try {
      await portalFetch(`/portal/client/jobs/${jobId}/approve`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      await load();
    } finally {
      setApproving(null);
    }
  };

  const handleSubmitRequest = async () => {
    if (!requestText.trim()) return;
    setSubmitting(true);
    setSubmitSuccess(false);
    try {
      await portalFetch('/portal/client/jobs/request', {
        method: 'POST',
        body: JSON.stringify({ message: requestText.trim() }),
      });
      setRequestText('');
      setSubmitSuccess(true);
    } catch {
      // Keep text so user can retry
    } finally {
      setSubmitting(false);
    }
  };

  const pendingApproval = jobs.filter(j => j.status === 'review');
  const inProgress = jobs.filter(j => j.status === 'in_progress' || j.status === 'draft');
  const done = jobs.filter(j => j.status === 'approved');

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#0f0f0f', color: '#fff', pb: 8 }}>
      {/* Header */}
      <Box sx={{ bgcolor: '#1a1a1a', borderBottom: '1px solid #2a2a2a', py: 2, px: { xs: 2, md: 4 } }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Avatar sx={{ bgcolor: EDRO_ORANGE, width: 36, height: 36, fontSize: '0.85rem', fontWeight: 700 }}>
              {(client?.name ?? clientName).charAt(0).toUpperCase()}
            </Avatar>
            <Box>
              <Typography variant="subtitle2" fontWeight={700} color="#fff">
                {client?.name ?? clientName}
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

            {/* Pending approval — highlighted */}
            {pendingApproval.length > 0 && (
              <Box>
                <Typography variant="subtitle2" fontWeight={700} color={EDRO_ORANGE} sx={{ mb: 1.5 }}>
                  Aguardando sua aprovação ({pendingApproval.length})
                </Typography>
                <Stack spacing={1.5}>
                  {pendingApproval.map(j => (
                    <Card key={j.id} variant="outlined" sx={{ bgcolor: '#1a1a1a', border: `1px solid ${EDRO_ORANGE}40` }}>
                      <CardContent sx={{ '&:last-child': { pb: 2 } }}>
                        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={2}>
                          <Box>
                            <Typography fontWeight={600} color="#fff" sx={{ mb: 0.5 }}>{j.title}</Typography>
                            <Chip
                              label={STATUS_LABELS[j.status] ?? j.status}
                              color={STATUS_COLORS[j.status] ?? 'default'}
                              size="small"
                              sx={{ fontSize: '0.65rem' }}
                            />
                          </Box>
                          <Button
                            variant="contained"
                            size="small"
                            startIcon={approving === j.id ? <CircularProgress size={12} color="inherit" /> : <IconCheck size={14} />}
                            disabled={approving === j.id}
                            onClick={() => handleApprove(j.id)}
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

            {/* In progress */}
            {inProgress.length > 0 && (
              <Box>
                <Typography variant="subtitle2" fontWeight={700} color="text.secondary" sx={{ mb: 1.5 }}>
                  <Stack component="span" direction="row" alignItems="center" spacing={0.5} sx={{ display: 'inline-flex' }}>
                    <IconClockHour3 size={16} />
                    <span>Em andamento ({inProgress.length})</span>
                  </Stack>
                </Typography>
                <Stack spacing={1}>
                  {inProgress.map(j => (
                    <Card key={j.id} variant="outlined" sx={{ bgcolor: '#1a1a1a', borderColor: '#2a2a2a' }}>
                      <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                        <Stack direction="row" alignItems="center" justifyContent="space-between">
                          <Typography variant="body2" fontWeight={600} color="#fff">{j.title}</Typography>
                          <Chip
                            label={STATUS_LABELS[j.status] ?? j.status}
                            color={STATUS_COLORS[j.status] ?? 'default'}
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

            {/* Done */}
            {done.length > 0 && (
              <Box>
                <Typography variant="subtitle2" fontWeight={700} color="text.secondary" sx={{ mb: 1.5 }}>
                  <Stack component="span" direction="row" alignItems="center" spacing={0.5} sx={{ display: 'inline-flex' }}>
                    <IconCheck size={16} />
                    <span>Concluídos ({done.length})</span>
                  </Stack>
                </Typography>
                <Stack spacing={1}>
                  {done.slice(0, 5).map(j => (
                    <Card key={j.id} variant="outlined" sx={{ bgcolor: '#1a1a1a', borderColor: '#2a2a2a', opacity: 0.7 }}>
                      <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                        <Stack direction="row" alignItems="center" justifyContent="space-between">
                          <Typography variant="body2" fontWeight={600} color="#ccc">{j.title}</Typography>
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

            {/* New request */}
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
                        Pedido enviado! Nossa equipe entrará em contato em breve.
                      </Typography>
                    </Stack>
                  </CardContent>
                </Card>
              )}
              <TextField
                fullWidth
                multiline
                minRows={3}
                placeholder="Descreva o que você precisa… Ex: 'Precisamos de um post para o lançamento do produto X com foco em engajamento.'"
                value={requestText}
                onChange={e => setRequestText(e.target.value)}
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
