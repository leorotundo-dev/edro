'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { swrFetcher, apiPost } from '@/lib/api';
import Alert from '@mui/material/Alert';
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
import { IconCheck, IconRefresh, IconMessage, IconArrowLeft } from '@tabler/icons-react';

type Job = { id: string; title: string; status: string; copy_approved_at: string | null; copy_approval_comment: string | null; updated_at: string };
type ThreadMessage = { id: string; author_type: 'agency' | 'client'; author_name: string | null; message: string; created_at: string };
type Artwork = { id: string; title: string; file_url: string; mime_type: string; version: number; status: 'pending' | 'approved' | 'revision'; approved_at: string | null; revision_comment: string | null; created_at: string };

const ART_STATUS: Record<string, { label: string; color: 'default' | 'success' | 'warning' }> = {
  approved: { label: 'Aprovado', color: 'success' },
  revision: { label: 'Revisão solicitada', color: 'warning' },
  pending:  { label: 'Aguardando retorno', color: 'default' },
};

// Client-facing status labels
const JOB_STATUS: Record<string, { label: string; color: 'default' | 'info' | 'warning' | 'success' }> = {
  backlog:     { label: 'Enviado', color: 'default' },
  todo:        { label: 'Em análise', color: 'info' },
  in_progress: { label: 'Em produção', color: 'info' },
  review:      { label: 'Aguardando aprovação', color: 'warning' },
  done:        { label: 'Entregue', color: 'success' },
};

export default function PedidoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data, mutate, isLoading } = useSWR<{ job: Job; thread: ThreadMessage[] }>(`/portal/client/jobs/${id}`, swrFetcher);
  const { data: artData, mutate: mutateArt } = useSWR<{ artworks: Artwork[] }>(`/portal/client/jobs/${id}/artworks`, swrFetcher);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [action, setAction] = useState<'approve' | 'revision' | null>(null);
  const [artAction, setArtAction] = useState<{ id: string; type: 'approve' | 'revision' } | null>(null);
  const [artComment, setArtComment] = useState('');
  const [artSubmitting, setArtSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const handleSubmit = async (type: 'approve' | 'revision') => {
    if (!message && type === 'revision') return;
    setSubmitting(true); setSubmitError('');
    try {
      await apiPost(`/portal/client/jobs/${id}/${type}`, { comment: message });
      setMessage(''); setAction(null); mutate();
    } catch (err: any) { setSubmitError(err.message ?? 'Erro ao enviar'); } finally { setSubmitting(false); }
  };

  const submitArtAction = async () => {
    if (!artAction) return;
    if (artAction.type === 'revision' && !artComment) return;
    setArtSubmitting(true);
    try {
      await apiPost(`/portal/client/artworks/${artAction.id}/${artAction.type}`, { comment: artComment || undefined });
      setArtAction(null); setArtComment(''); mutateArt();
    } catch (err: any) { setSubmitError(err.message ?? 'Erro ao enviar'); } finally { setArtSubmitting(false); }
  };

  const job = data?.job;
  const thread = data?.thread ?? [];
  const artworks = artData?.artworks ?? [];
  const jobSt = job ? (JOB_STATUS[job.status] ?? { label: job.status, color: 'default' as const }) : null;

  if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>;
  if (!job) return <Alert severity="error" sx={{ borderRadius: 2 }}>Pedido não encontrado.</Alert>;

  return (
    <Stack spacing={3}>
      {/* Back + Header */}
      <Box>
        <Button
          startIcon={<IconArrowLeft size={16} />}
          variant="text"
          onClick={() => router.push('/pedidos')}
          sx={{ color: 'text.secondary', mb: 1, pl: 0 }}
        >
          Pedidos
        </Button>
        <Typography variant="overline" color="text.secondary">Pedido</Typography>
        <Stack direction="row" spacing={1.5} alignItems="center" mt={0.25}>
          <Typography variant="h4">{job.title}</Typography>
          {jobSt && <Chip label={jobSt.label} color={jobSt.color} size="small" />}
        </Stack>
        <Typography variant="caption" color="text.secondary">
          Atualizado em {new Date(job.updated_at).toLocaleDateString('pt-BR')}
        </Typography>
      </Box>

      {submitError && <Alert severity="error" sx={{ borderRadius: 2 }}>{submitError}</Alert>}

      {/* Copy approval */}
      {!job.copy_approved_at && job.status === 'review' && (
        <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'warning.main' }}>
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
              <Box>
                <Typography variant="h6">Aguardando sua aprovação</Typography>
                <Typography variant="body2" color="text.secondary">
                  Valide a copy ou devolva com orientação objetiva para a equipe.
                </Typography>
              </Box>
              <Chip label="Em revisão" color="warning" size="small" />
            </Stack>
            {action === null ? (
              <Stack direction="row" spacing={1}>
                <Button variant="contained" startIcon={<IconCheck size={16} />} onClick={() => setAction('approve')}>Aprovar copy</Button>
                <Button variant="outlined" startIcon={<IconRefresh size={16} />} onClick={() => setAction('revision')}>Solicitar revisão</Button>
              </Stack>
            ) : (
              <Stack spacing={2}>
                <TextField
                  multiline rows={3} fullWidth
                  label={action === 'approve' ? 'Comentário (opcional)' : 'Descreva o ajuste necessário'}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required={action === 'revision'}
                />
                <Stack direction="row" spacing={1}>
                  <Button
                    variant={action === 'approve' ? 'contained' : 'outlined'}
                    disabled={submitting}
                    onClick={() => handleSubmit(action)}
                  >
                    {submitting ? 'Enviando...' : action === 'approve' ? 'Confirmar aprovação' : 'Enviar revisão'}
                  </Button>
                  <Button variant="text" onClick={() => { setAction(null); setMessage(''); }} sx={{ color: 'text.secondary' }}>
                    Cancelar
                  </Button>
                </Stack>
              </Stack>
            )}
          </CardContent>
        </Card>
      )}

      {/* Copy approved badge */}
      {job.copy_approved_at && (
        <Alert severity="success" sx={{ borderRadius: 2 }}>
          <Typography variant="subtitle2">Copy aprovada</Typography>
          <Typography variant="caption">
            Aprovada em {new Date(job.copy_approved_at).toLocaleDateString('pt-BR')}.
            {job.copy_approval_comment ? ` "${job.copy_approval_comment}"` : ''}
          </Typography>
        </Alert>
      )}

      {/* Artworks */}
      {artworks.length > 0 && (
        <Card sx={{ borderRadius: 3 }}>
          <CardContent>
            <Typography variant="h6" mb={2}>Criativos para avaliação</Typography>
            <Stack spacing={2}>
              {artworks.map((art) => {
                const st = ART_STATUS[art.status] ?? ART_STATUS.pending;
                const isImage = art.mime_type.startsWith('image/');
                return (
                  <Box key={art.id} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
                    {isImage && (
                      <Box component="img" src={art.file_url} alt={art.title} sx={{ width: '100%', maxHeight: 320, objectFit: 'cover', display: 'block' }} />
                    )}
                    <Box sx={{ p: 2 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                        <Box>
                          <Typography variant="subtitle2">{art.title}</Typography>
                          <Typography variant="caption" color="text.secondary">Versão {art.version}</Typography>
                        </Box>
                        <Chip label={st.label} color={st.color} size="small" />
                      </Stack>
                      {art.status === 'pending' && (
                        <Stack direction="row" spacing={1} mt={1.5}>
                          <Button size="small" variant="contained" startIcon={<IconCheck size={14} />} onClick={() => setArtAction({ id: art.id, type: 'approve' })}>Aprovar</Button>
                          <Button size="small" variant="outlined" startIcon={<IconRefresh size={14} />} onClick={() => { setArtAction({ id: art.id, type: 'revision' }); setArtComment(''); }}>Solicitar revisão</Button>
                        </Stack>
                      )}
                    </Box>
                  </Box>
                );
              })}
            </Stack>

            {artAction && (
              <Box sx={{ mt: 2, p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
                <Typography variant="subtitle2" mb={1}>
                  {artAction.type === 'approve' ? 'Confirmar aprovação do criativo' : 'Solicitar revisão do criativo'}
                </Typography>
                <TextField
                  multiline rows={3} fullWidth
                  label={artAction.type === 'approve' ? 'Comentário (opcional)' : 'Descreva o ajuste necessário'}
                  value={artComment}
                  onChange={(e) => setArtComment(e.target.value)}
                  sx={{ mb: 1.5 }}
                />
                <Stack direction="row" spacing={1}>
                  <Button
                    size="small"
                    variant={artAction.type === 'approve' ? 'contained' : 'outlined'}
                    disabled={artSubmitting || (artAction.type === 'revision' && !artComment)}
                    onClick={submitArtAction}
                  >
                    {artSubmitting ? 'Enviando...' : artAction.type === 'approve' ? 'Confirmar' : 'Enviar revisão'}
                  </Button>
                  <Button size="small" variant="text" onClick={() => { setArtAction(null); setArtComment(''); }} sx={{ color: 'text.secondary' }}>
                    Cancelar
                  </Button>
                </Stack>
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      {/* Thread */}
      {thread.length > 0 && (
        <Card sx={{ borderRadius: 3 }}>
          <CardContent>
            <Stack direction="row" spacing={1} alignItems="center" mb={2}>
              <IconMessage size={18} color="#6b7280" />
              <Typography variant="h6">Histórico de comentários</Typography>
            </Stack>
            <Stack spacing={1.5}>
              {thread.map((msg) => (
                <Box
                  key={msg.id}
                  sx={{
                    p: 1.5, borderRadius: 2,
                    bgcolor: msg.author_type === 'client' ? 'primary.light' : 'action.hover',
                    alignSelf: msg.author_type === 'client' ? 'flex-end' : 'flex-start',
                    maxWidth: '80%',
                  }}
                >
                  <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                    {msg.author_name ?? (msg.author_type === 'client' ? 'Você' : 'Agência')} · {new Date(msg.created_at).toLocaleString('pt-BR')}
                  </Typography>
                  <Typography variant="body2">{msg.message}</Typography>
                </Box>
              ))}
            </Stack>
          </CardContent>
        </Card>
      )}
    </Stack>
  );
}
