'use client';
import { Handle, Position } from '@xyflow/react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import CircularProgress from '@mui/material/CircularProgress';
import Chip from '@mui/material/Chip';
import { IconMail, IconCheck, IconX, IconSend, IconClock } from '@tabler/icons-react';
import { useState, useEffect } from 'react';
import NodeShell from '../NodeShell';
import { usePipeline } from '../PipelineContext';

type ApprovalStatus = 'idle' | 'sending' | 'pending' | 'approved' | 'rejected';

export default function ApprovalNode() {
  const { nodeStatus, briefing, arteImageUrl, copyOptions, selectedCopyIdx } = usePipeline();
  const isAvailable = nodeStatus.export === 'active' || nodeStatus.arte === 'done';

  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState('');
  const [status, setStatus] = useState<ApprovalStatus>('idle');
  const [sentAt, setSentAt] = useState<Date | null>(null);
  const [elapsedLabel, setElapsedLabel] = useState('');
  const [error, setError] = useState('');

  // Tick clock for elapsed time
  useEffect(() => {
    if (status !== 'pending' || !sentAt) return;
    const tick = () => {
      const diffMs = Date.now() - sentAt.getTime();
      const diffH = Math.floor(diffMs / 3600000);
      const diffM = Math.floor((diffMs % 3600000) / 60000);
      setElapsedLabel(diffH > 0 ? `${diffH}h ${diffM}min` : `${diffM} min`);
    };
    tick();
    const id = setInterval(tick, 60000);
    return () => clearInterval(id);
  }, [status, sentAt]);

  const handleSend = async () => {
    if (!email || !briefing?.id) return;
    setStatus('sending');
    setError('');
    try {
      const { apiPost } = await import('@/lib/api');
      const copy = copyOptions[selectedCopyIdx];
      const copyText = copy ? [copy.title, copy.body, copy.cta].filter(Boolean).join('\n') : undefined;
      await apiPost(`/edro/briefings/${briefing.id}/send-approval`, {
        client_email: email,
        message: msg || undefined,
        include_arte: !!arteImageUrl,
        include_copy: true,
        copy_text: copyText || undefined,
        image_url: arteImageUrl || undefined,
      });
      setStatus('pending');
      setSentAt(new Date());
    } catch (e: any) {
      setError(e?.message || 'Erro ao enviar aprovação.');
      setStatus('idle');
    }
  };

  const shellStatus = !isAvailable ? 'locked' : status === 'pending' ? 'running' : status === 'approved' || status === 'rejected' ? 'done' : 'active';

  const collapsedSummary = (
    <Stack spacing={0.5}>
      {status === 'approved' ? (
        <Stack direction="row" spacing={0.75} alignItems="center">
          <IconCheck size={14} color="#13DEB9" />
          <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: '#13DEB9' }}>Aprovado pelo cliente</Typography>
        </Stack>
      ) : status === 'rejected' ? (
        <Stack direction="row" spacing={0.75} alignItems="center">
          <IconX size={14} color="#FF4D4D" />
          <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: '#FF4D4D' }}>Recusado pelo cliente</Typography>
        </Stack>
      ) : null}
      <Typography sx={{ fontSize: '0.6rem', color: 'text.disabled' }}>Enviado para {email}</Typography>
    </Stack>
  );

  return (
    <Box>
      <Handle type="target" position={Position.Left} id="approval_in"
        style={{ background: '#444', width: 8, height: 8, border: 'none' }} />
      <NodeShell
        title="Aprovação do Cliente"
        icon={<IconMail size={14} />}
        status={shellStatus}
        accentColor="#7C3AED"
        width={270}
        collapsedSummary={collapsedSummary}
      >
        <Stack spacing={1.25}>
          {/* IDLE: send form */}
          {(status === 'idle' || status === 'sending') && (
            <>
              <Typography sx={{ fontSize: '0.6rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                Enviar para aprovação
              </Typography>
              <TextField
                size="small" fullWidth
                placeholder="email@cliente.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                sx={{ '& .MuiInputBase-root': { fontSize: '0.65rem' } }}
              />
              <TextField
                size="small" fullWidth multiline rows={2}
                placeholder="Mensagem opcional para o cliente…"
                value={msg}
                onChange={(e) => setMsg(e.target.value)}
                sx={{ '& .MuiInputBase-root': { fontSize: '0.65rem' } }}
              />
              {error && <Typography sx={{ fontSize: '0.6rem', color: '#FF4D4D' }}>{error}</Typography>}
              <Button
                variant="contained" size="small" fullWidth
                onClick={handleSend}
                disabled={!email || status === 'sending' || !isAvailable}
                startIcon={status === 'sending' ? <CircularProgress size={12} sx={{ color: '#fff' }} /> : <IconSend size={13} />}
                sx={{
                  bgcolor: '#7C3AED', color: '#fff', fontWeight: 700,
                  fontSize: '0.7rem', textTransform: 'none',
                  '&:hover': { bgcolor: '#6d28d9' },
                  '&.Mui-disabled': { bgcolor: '#2a2a2a', color: '#555' },
                }}
              >
                {status === 'sending' ? 'Enviando…' : 'Enviar para Aprovação'}
              </Button>
            </>
          )}

          {/* PENDING: waiting */}
          {status === 'pending' && (
            <Stack spacing={1}>
              <Stack direction="row" spacing={0.75} alignItems="center">
                <IconClock size={14} color="#7C3AED" />
                <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: '#7C3AED' }}>Aguardando resposta</Typography>
              </Stack>
              <Typography sx={{ fontSize: '0.62rem', color: 'text.secondary' }}>
                Enviado para <strong>{email}</strong>
              </Typography>
              {elapsedLabel && (
                <Chip size="small" label={`Há ${elapsedLabel}`}
                  sx={{ height: 20, fontSize: '0.6rem', bgcolor: 'rgba(124,58,237,0.1)', color: '#7C3AED', alignSelf: 'flex-start' }} />
              )}
              <Stack direction="row" spacing={0.75} mt={0.5}>
                <Button size="small" variant="outlined" onClick={() => setStatus('approved')}
                  sx={{ textTransform: 'none', fontSize: '0.6rem', borderColor: '#13DEB944', color: '#13DEB9', flex: 1,
                    '&:hover': { borderColor: '#13DEB9', bgcolor: 'rgba(19,222,185,0.06)' } }}>
                  Marcar aprovado
                </Button>
                <Button size="small" variant="outlined" onClick={() => setStatus('rejected')}
                  sx={{ textTransform: 'none', fontSize: '0.6rem', borderColor: '#FF4D4D44', color: '#FF4D4D', flex: 1,
                    '&:hover': { borderColor: '#FF4D4D', bgcolor: 'rgba(255,77,77,0.06)' } }}>
                  Marcar recusado
                </Button>
              </Stack>
            </Stack>
          )}
        </Stack>
      </NodeShell>
      <Handle type="source" position={Position.Right} id="approval_out"
        style={{ background: '#7C3AED', width: 8, height: 8, border: 'none' }} />
    </Box>
  );
}
