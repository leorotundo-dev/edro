'use client';
import { useRef, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Chip from '@mui/material/Chip';
import { IconVideo, IconUpload, IconX, IconCheck, IconPlayerPlay } from '@tabler/icons-react';
import NodeShell from '../NodeShell';

type Clip = { url: string; name: string };

const TRANSITIONS = [
  { id: 'cut',     label: 'Corte direto' },
  { id: 'fade',    label: 'Fade' },
  { id: 'dissolve', label: 'Dissolve' },
];

export default function VideoCombinerNode({ id }: NodeProps) {
  const [clips, setClips] = useState<Clip[]>([]);
  const [audioUrl, setAudioUrl] = useState('');
  const [transition, setTransition] = useState<'cut' | 'fade' | 'dissolve'>('cut');
  const [combining, setCombining] = useState(false);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const clipInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  const status = outputUrl ? 'done' : combining ? 'running' : clips.length >= 2 ? 'active' : 'locked';

  const handleAddClip = async (file: File) => {
    if (clips.length >= 4) return;
    // For now just use a local object URL as preview
    const url = URL.createObjectURL(file);
    setClips((prev) => [...prev, { url, name: file.name }]);
  };

  const handleRemoveClip = (idx: number) => {
    setClips((prev) => {
      const next = [...prev];
      URL.revokeObjectURL(next[idx].url);
      next.splice(idx, 1);
      return next;
    });
  };

  const handleCombine = async () => {
    if (clips.length < 2) return;
    setCombining(true);
    setError('');
    try {
      const { apiPost } = await import('@/lib/api');
      const res = await apiPost<{ success: boolean; jobId?: string; error?: string; status?: string }>(
        '/studio/creative/combine-videos',
        {
          clip_urls: clips.map((c) => c.url),
          audio_url: audioUrl || undefined,
          transition,
        },
      );
      if (res.success && res.jobId) {
        setJobId(res.jobId);
        // Poll for completion
        pollJobStatus(res.jobId);
      } else if (!res.success) {
        setError(res.error || 'Erro ao combinar vídeos.');
        setCombining(false);
      }
    } catch (e: any) {
      if (e?.message?.includes('501')) {
        setError('Combinação de vídeos requer FFmpeg no servidor. Em breve!');
      } else {
        setError(e?.message || 'Erro ao combinar vídeos.');
      }
      setCombining(false);
    }
  };

  const pollJobStatus = async (jId: string) => {
    const { apiGet } = await import('@/lib/api');
    const maxAttempts = 60;
    let attempts = 0;
    const poll = async () => {
      if (attempts++ >= maxAttempts) { setError('Timeout ao aguardar combinação.'); setCombining(false); return; }
      try {
        const res = await apiGet<{ status: string; outputUrl?: string }>(`/studio/creative/combine-videos/${jId}/status`);
        if (res.status === 'done' && res.outputUrl) {
          setOutputUrl(res.outputUrl);
          setCombining(false);
        } else if (res.status === 'error') {
          setError('Falha na combinação do vídeo.');
          setCombining(false);
        } else {
          setTimeout(poll, 3000);
        }
      } catch { setTimeout(poll, 5000); }
    };
    poll();
  };

  const collapsedSummary = (
    <Stack spacing={0.5}>
      <Stack direction="row" spacing={0.75} alignItems="center">
        <IconCheck size={12} color="#13DEB9" />
        <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: 'text.primary' }}>
          Vídeo combinado
        </Typography>
      </Stack>
      {outputUrl && (
        <Box component="video" src={outputUrl} controls
          sx={{ width: '100%', borderRadius: 1, maxHeight: 80 }} />
      )}
    </Stack>
  );

  return (
    <Box>
      <Handle type="target" position={Position.Left} id="combine_in"
        style={{ background: '#444', width: 8, height: 8, border: 'none' }} />
      <NodeShell
        title="Combinar Vídeos"
        icon={<IconVideo size={14} />}
        status={status}
        accentColor="#6366F1"
        width={300}
        collapsedSummary={collapsedSummary}
      >
        <Stack spacing={1.25}>
          {/* Clip slots */}
          <Stack spacing={0.5}>
            {clips.map((clip, i) => (
              <Stack key={i} direction="row" spacing={0.75} alignItems="center"
                sx={{ px: 0.75, py: 0.5, bgcolor: '#0d0d0d', border: '1px solid #1e1e1e', borderRadius: 1.5 }}>
                <IconVideo size={12} color="#6366F1" />
                <Typography sx={{ fontSize: '0.6rem', color: '#aaa', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {i + 1}. {clip.name}
                </Typography>
                <Box onClick={() => handleRemoveClip(i)} sx={{ cursor: 'pointer', color: '#444', '&:hover': { color: '#EF4444' }, display: 'flex' }}>
                  <IconX size={11} />
                </Box>
              </Stack>
            ))}

            {clips.length < 4 && (
              <Box
                onClick={() => clipInputRef.current?.click()}
                sx={{
                  border: '1.5px dashed #2a2a2a', borderRadius: 1.5, py: 1, px: 1,
                  textAlign: 'center', cursor: 'pointer', transition: 'all 0.15s',
                  '&:hover': { borderColor: '#6366F1', bgcolor: 'rgba(99,102,241,0.04)' },
                }}
              >
                <Typography sx={{ fontSize: '0.6rem', color: '#555' }}>
                  + Adicionar clipe ({clips.length}/4)
                </Typography>
              </Box>
            )}

            <input ref={clipInputRef} type="file" accept="video/*" style={{ display: 'none' }}
              onChange={(e) => { if (e.target.files?.[0]) handleAddClip(e.target.files[0]); e.target.value = ''; }} />
          </Stack>

          {/* Audio track */}
          <Stack spacing={0.5}>
            <Typography sx={{ fontSize: '0.58rem', color: '#555', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Trilha de áudio (opcional)
            </Typography>
            {audioUrl ? (
              <Stack direction="row" spacing={0.75} alignItems="center"
                sx={{ px: 0.75, py: 0.5, bgcolor: '#0d0d0d', border: '1px solid #1e1e1e', borderRadius: 1.5 }}>
                <Typography sx={{ fontSize: '0.6rem', color: '#aaa', flex: 1 }}>Áudio carregado</Typography>
                <Box onClick={() => setAudioUrl('')} sx={{ cursor: 'pointer', color: '#444', '&:hover': { color: '#EF4444' }, display: 'flex' }}>
                  <IconX size={11} />
                </Box>
              </Stack>
            ) : (
              <Box onClick={() => audioInputRef.current?.click()}
                sx={{
                  border: '1.5px dashed #1e1e1e', borderRadius: 1.5, py: 0.75, px: 1,
                  textAlign: 'center', cursor: 'pointer', transition: 'all 0.15s',
                  '&:hover': { borderColor: '#6366F155', bgcolor: 'rgba(99,102,241,0.03)' },
                }}>
                <Typography sx={{ fontSize: '0.58rem', color: '#444' }}>+ Áudio / trilha</Typography>
              </Box>
            )}
            <input ref={audioInputRef} type="file" accept="audio/*" style={{ display: 'none' }}
              onChange={(e) => {
                if (e.target.files?.[0]) setAudioUrl(URL.createObjectURL(e.target.files[0]));
                e.target.value = '';
              }} />
          </Stack>

          {/* Transition */}
          <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap">
            <Typography sx={{ fontSize: '0.58rem', color: '#555', mr: 0.25 }}>Transição:</Typography>
            {TRANSITIONS.map((t) => (
              <Chip
                key={t.id}
                label={t.label}
                size="small"
                onClick={() => setTransition(t.id as any)}
                sx={{
                  height: 18, fontSize: '0.55rem', cursor: 'pointer',
                  bgcolor: transition === t.id ? 'rgba(99,102,241,0.15)' : 'transparent',
                  border: `1px solid ${transition === t.id ? '#6366F1' : '#2a2a2a'}`,
                  color: transition === t.id ? '#6366F1' : '#555',
                }}
              />
            ))}
          </Stack>

          {error && <Typography sx={{ fontSize: '0.6rem', color: '#FF4D4D' }}>{error}</Typography>}

          <Button
            variant="contained" size="small" fullWidth
            onClick={handleCombine}
            disabled={clips.length < 2 || combining}
            startIcon={combining ? <CircularProgress size={12} sx={{ color: '#fff' }} /> : <IconPlayerPlay size={13} />}
            sx={{
              bgcolor: '#6366F1', color: '#fff', fontWeight: 700,
              fontSize: '0.7rem', textTransform: 'none',
              '&:hover': { bgcolor: '#4f46e5' },
              '&.Mui-disabled': { bgcolor: '#2a2a2a', color: '#555' },
            }}
          >
            {combining ? 'Combinando…' : 'Combinar Vídeos'}
          </Button>
        </Stack>
      </NodeShell>
      <Handle type="source" position={Position.Right} id="combine_out"
        style={{ background: '#6366F1', width: 8, height: 8, border: 'none' }} />
    </Box>
  );
}
