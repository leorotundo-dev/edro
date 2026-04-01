'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { IconPlus, IconCheck, IconBriefcase, IconChevronRight } from '@tabler/icons-react';

type BriefingRequest = {
  id: string;
  status: 'pending' | 'enriching' | 'submitted' | 'accepted' | 'declined' | 'converted';
  form_data: { type?: string; objective?: string; platform?: string; deadline?: string };
  agency_notes?: string;
  created_at: string;
};

const STATUS_MAP: Record<string, { label: string; color: 'default' | 'info' | 'warning' | 'success' | 'error' }> = {
  pending:   { label: 'Rascunho', color: 'default' },
  enriching: { label: 'Analisando', color: 'info' },
  submitted: { label: 'Aguardando', color: 'warning' },
  accepted:  { label: 'Aceita', color: 'success' },
  declined:  { label: 'Recusada', color: 'error' },
  converted: { label: 'Em produção', color: 'warning' },
};

export default function BriefingListPage() {
  const router = useRouter();
  const [briefings, setBriefings] = useState<BriefingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/proxy/portal/client/briefings', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => setBriefings(d?.briefings ?? []))
      .catch(() => setError('Erro ao carregar solicitações.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Solicitações de Job</Typography>
          <Typography variant="body2" color="text.secondary">
            Acompanhe os pedidos que você enviou à agência.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<IconPlus size={16} />}
          onClick={() => router.push('/briefing/novo')}
        >
          Nova solicitação
        </Button>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Stack alignItems="center" py={6}><CircularProgress /></Stack>
      ) : briefings.length === 0 ? (
        <Card variant="outlined" sx={{ bgcolor: 'action.hover' }}>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
              Você ainda não enviou nenhuma solicitação.
            </Typography>
            <Button variant="contained" startIcon={<IconPlus size={16} />}
              onClick={() => router.push('/briefing/novo')}>
              Solicitar agora
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Stack spacing={1.5}>
          {briefings.map(b => {
            const s = STATUS_MAP[b.status] ?? { label: b.status, color: 'default' };
            const title = b.form_data?.type ?? 'Solicitação';
            const isAccepted = b.status === 'accepted';
            const isConverted = b.status === 'converted';
            return (
              <Card key={b.id} variant="outlined" sx={isConverted ? {
                borderColor: '#FFAE1F',
                '@keyframes pulse-border': {
                  '0%, 100%': { borderColor: '#FFAE1F' },
                  '50%': { borderColor: '#FFD06B' },
                },
                animation: 'pulse-border 2.5s ease-in-out infinite',
              } : {}}>
                <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={2}>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                        <Typography variant="body2" fontWeight={600}>{title}</Typography>
                        {b.form_data?.platform && (
                          <Chip label={b.form_data.platform} size="small" variant="outlined" />
                        )}
                      </Stack>
                      <Typography variant="body2" color="text.secondary" sx={{
                        overflow: 'hidden', display: '-webkit-box',
                        WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                      }}>
                        {b.form_data?.objective}
                      </Typography>
                      {b.form_data?.deadline && (
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                          Prazo: {new Date(b.form_data.deadline + 'T00:00').toLocaleDateString('pt-BR')}
                        </Typography>
                      )}

                      {/* Accepted strip */}
                      {isAccepted && (
                        <Box sx={{
                          mt: 1.5, px: 1.5, py: 1, borderRadius: 1.5,
                          bgcolor: 'success.light',
                          border: '1px solid', borderColor: 'success.main',
                          display: 'flex', alignItems: 'flex-start', gap: 1,
                        }}>
                          <IconCheck size={16} color="#2e7d32" style={{ marginTop: 1, flexShrink: 0 }} />
                          <Box>
                            <Typography variant="caption" fontWeight={600} color="success.dark" display="block">
                              Solicitação aceita — a equipe está organizando sua demanda.
                            </Typography>
                            {b.agency_notes && (
                              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.25 }}>
                                {b.agency_notes}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      )}

                      {/* In production strip */}
                      {isConverted && (
                        <Box sx={{
                          mt: 1.5, px: 1.5, py: 1, borderRadius: 1.5,
                          bgcolor: 'warning.light',
                          border: '1px solid', borderColor: 'warning.main',
                        }}>
                          <Stack direction="row" alignItems="center" justifyContent="space-between">
                            <Stack direction="row" alignItems="center" gap={1}>
                              <Box sx={{
                                width: 8, height: 8, borderRadius: '50%', bgcolor: 'warning.main',
                                '@keyframes blink': { '0%, 100%': { opacity: 1 }, '50%': { opacity: 0.3 } },
                                animation: 'blink 1.4s ease-in-out infinite',
                              }} />
                              <Box>
                                <Typography variant="caption" fontWeight={600} color="warning.dark" display="block">
                                  Em produção — a equipe está trabalhando na sua demanda.
                                </Typography>
                                {b.agency_notes && (
                                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.25 }}>
                                    {b.agency_notes}
                                  </Typography>
                                )}
                              </Box>
                            </Stack>
                            <Button
                              size="small"
                              variant="text"
                              endIcon={<IconChevronRight size={14} />}
                              onClick={() => router.push('/jobs')}
                              sx={{ flexShrink: 0, fontSize: '0.7rem', color: 'warning.dark' }}
                            >
                              Ver jobs
                            </Button>
                          </Stack>
                        </Box>
                      )}

                      {/* Declined note */}
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
  );
}
