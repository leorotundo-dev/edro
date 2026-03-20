'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import { IconCircleCheck, IconEdit, IconThumbUp, IconThumbDown } from '@tabler/icons-react';

type BriefingData = {
  id: string;
  title: string;
  status: string;
  client_name: string | null;
  due_at: string | null;
  copy: string | null;
  notes: string | null;
  channels: string[];
  objective: string | null;
  target_audience: string | null;
  client_feedback: string | null;
};

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

function resolveBackend() {
  if (BACKEND_URL.startsWith('http')) {
    // Strip trailing /api if present
    return BACKEND_URL.replace(/\/api\/?$/, '');
  }
  if (typeof window !== 'undefined') return window.location.origin;
  return '';
}

async function fetchPublic(path: string) {
  const base = resolveBackend();
  const res = await fetch(`${base}${path}`);
  return res.json();
}

async function postPublic(path: string, body: unknown) {
  const base = resolveBackend();
  const res = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

export default function ClientApprovalPage() {
  const params = useParams<{ token: string }>();
  const token = params?.token ?? '';

  const [loading, setLoading] = useState(true);
  const [briefing, setBriefing] = useState<BriefingData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<'approved' | 'changes' | null>(null);

  useEffect(() => {
    if (!token) return;
    fetchPublic(`/api/edro/client-approval/${token}`)
      .then((res) => {
        if (!res.success) throw new Error(res.error ?? 'Link inválido');
        setBriefing(res.data);
      })
      .catch((err) => setError(err.message ?? 'Erro ao carregar'))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleAction(action: 'approve' | 'request_changes') {
    if (action === 'request_changes' && !feedback.trim()) return;
    setSubmitting(true);
    try {
      const res = await postPublic(`/api/edro/client-approval/${token}`, {
        action,
        feedback: feedback.trim() || undefined,
      });
      if (!res.success) throw new Error(res.error ?? 'Erro ao processar');
      setDone(action === 'approve' ? 'approved' : 'changes');
    } catch (err: any) {
      setError(err.message ?? 'Erro ao processar');
    } finally {
      setSubmitting(false);
    }
  }

  // ── Completed screens ────────────────────────────────────────────────────

  if (done === 'approved') {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3 }}>
        <Paper elevation={0} sx={{ maxWidth: 480, width: '100%', p: 5, textAlign: 'center', border: '1px solid #bbf7d0', borderRadius: 3 }}>
          <Box sx={{ mb: 2 }}><IconCircleCheck size={64} color="#16a34a" /></Box>
          <Typography variant="h5" fontWeight={700} gutterBottom>Aprovado!</Typography>
          <Typography color="text.secondary">
            Obrigado! O conteúdo foi aprovado e nossa equipe dará continuidade ao processo.
          </Typography>
        </Paper>
      </Box>
    );
  }

  if (done === 'changes') {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3 }}>
        <Paper elevation={0} sx={{ maxWidth: 480, width: '100%', p: 5, textAlign: 'center', border: '1px solid #fde68a', borderRadius: 3 }}>
          <Box sx={{ mb: 2 }}><IconEdit size={64} color="#d97706" /></Box>
          <Typography variant="h5" fontWeight={700} gutterBottom>Feedback enviado!</Typography>
          <Typography color="text.secondary">
            Recebemos seus comentários e nossa equipe fará os ajustes necessários. Em breve entraremos em contato.
          </Typography>
        </Paper>
      </Box>
    );
  }

  // ── Loading / error ──────────────────────────────────────────────────────

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !briefing) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: '#fafafa', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3 }}>
        <Paper elevation={0} sx={{ maxWidth: 480, width: '100%', p: 5, textAlign: 'center', border: '1px solid #fecaca', borderRadius: 3 }}>
          <Typography variant="h6" color="error" fontWeight={700} gutterBottom>Link inválido</Typography>
          <Typography color="text.secondary">
            {error ?? 'Este link de aprovação é inválido ou já expirou.'}
          </Typography>
        </Paper>
      </Box>
    );
  }

  const alreadyDone = briefing.status === 'concluido';
  const pendingFeedbackMode = briefing.status === 'ajustes';

  // ── Main approval view ───────────────────────────────────────────────────

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f8fafc', py: 6, px: 3 }}>
      <Box sx={{ maxWidth: 680, mx: 'auto' }}>

        {/* Header */}
        <Box sx={{ mb: 4, textAlign: 'center' }}>
          <Typography variant="h4" fontWeight={800} gutterBottom>
            Aprovação de Conteúdo
          </Typography>
          {briefing.client_name && (
            <Typography variant="body1" color="text.secondary">{briefing.client_name}</Typography>
          )}
        </Box>

        {/* Briefing card */}
        <Paper elevation={0} sx={{ p: 4, mb: 3, border: '1px solid #e2e8f0', borderRadius: 3 }}>
          <Typography variant="h6" fontWeight={700} gutterBottom>{briefing.title}</Typography>

          {briefing.objective && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">Objetivo</Typography>
              <Typography variant="body2" sx={{ mt: 0.5 }}>{briefing.objective}</Typography>
            </Box>
          )}

          {briefing.target_audience && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">Público-alvo</Typography>
              <Typography variant="body2" sx={{ mt: 0.5 }}>{briefing.target_audience}</Typography>
            </Box>
          )}

          {briefing.channels.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">Canais</Typography>
              <Box sx={{ mt: 0.5, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {briefing.channels.map((ch) => (
                  <Chip key={ch} label={ch} size="small" variant="outlined" />
                ))}
              </Box>
            </Box>
          )}

          {briefing.copy && (
            <>
              <Divider sx={{ my: 3 }} />
              <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">Conteúdo / Copy</Typography>
              <Box
                sx={{
                  mt: 1.5,
                  p: 2.5,
                  bgcolor: '#f8fafc',
                  borderRadius: 2,
                  border: '1px solid #e2e8f0',
                  whiteSpace: 'pre-wrap',
                  fontSize: 14,
                  lineHeight: 1.7,
                  fontFamily: 'inherit',
                }}
              >
                {briefing.copy}
              </Box>
            </>
          )}

          {briefing.notes && (
            <>
              <Divider sx={{ my: 3 }} />
              <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">Observações</Typography>
              <Typography variant="body2" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>{briefing.notes}</Typography>
            </>
          )}
        </Paper>

        {/* Previous feedback if returning */}
        {pendingFeedbackMode && briefing.client_feedback && (
          <Alert severity="info" sx={{ mb: 3 }}>
            <strong>Seu feedback anterior:</strong> {briefing.client_feedback}
            <br />Os ajustes foram feitos. Por favor revise e aprove ou solicite novas correções.
          </Alert>
        )}

        {/* Already approved */}
        {alreadyDone ? (
          <Alert severity="success" sx={{ mb: 3 }}>
            Este conteúdo já foi aprovado. Obrigado!
          </Alert>
        ) : (
          <Paper elevation={0} sx={{ p: 4, border: '1px solid #e2e8f0', borderRadius: 3 }}>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
              Sua avaliação
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Aprove o conteúdo ou deixe um comentário com os ajustes necessários.
            </Typography>

            <TextField
              fullWidth
              multiline
              rows={4}
              label="Comentários ou pedido de ajustes (opcional para aprovação)"
              placeholder="Ex: Gostei do texto, mas quero mudar a chamada principal para..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              sx={{ mb: 3 }}
            />

            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                color="success"
                size="large"
                startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : <IconThumbUp size={18} />}
                disabled={submitting}
                onClick={() => handleAction('approve')}
                sx={{ flex: 1, minWidth: 160, fontWeight: 700, py: 1.5 }}
              >
                Aprovar
              </Button>
              <Button
                variant="outlined"
                color="warning"
                size="large"
                startIcon={<IconThumbDown size={18} />}
                disabled={submitting || !feedback.trim()}
                onClick={() => handleAction('request_changes')}
                sx={{ flex: 1, minWidth: 160, fontWeight: 700, py: 1.5 }}
              >
                Solicitar Ajustes
              </Button>
            </Box>

            {!feedback.trim() && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1.5, display: 'block' }}>
                Para solicitar ajustes, preencha o campo de comentários acima.
              </Typography>
            )}
          </Paper>
        )}

        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 4 }}>
          Edro.Digital — Portal de Aprovação
        </Typography>
      </Box>
    </Box>
  );
}
