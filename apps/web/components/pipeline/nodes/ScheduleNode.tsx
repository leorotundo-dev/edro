'use client';
import { Handle, Position } from '@xyflow/react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Chip from '@mui/material/Chip';
import { IconCalendar, IconCheck, IconSparkles, IconBrandInstagram, IconBrandLinkedin, IconBrandTwitter, IconBrandTiktok, IconBrandFacebook } from '@tabler/icons-react';
import { useState } from 'react';
import NodeShell from '../NodeShell';
import { usePipeline } from '../PipelineContext';

const PLATFORMS = [
  { id: 'Instagram', label: 'Instagram', icon: <IconBrandInstagram size={14} />, bestTime: 'Terça-feira, 18h–20h' },
  { id: 'LinkedIn',  label: 'LinkedIn',  icon: <IconBrandLinkedin size={14} />,  bestTime: 'Quarta-feira, 08h–10h' },
  { id: 'Twitter',   label: 'Twitter',   icon: <IconBrandTwitter size={14} />,   bestTime: 'Sexta-feira, 12h–14h' },
  { id: 'TikTok',    label: 'TikTok',    icon: <IconBrandTiktok size={14} />,    bestTime: 'Domingo, 19h–21h' },
  { id: 'Facebook',  label: 'Facebook',  icon: <IconBrandFacebook size={14} />,  bestTime: 'Quinta-feira, 13h–15h' },
];

function formatScheduled(d: string): string {
  try {
    return new Date(d).toLocaleString('pt-BR', {
      weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
    });
  } catch { return d; }
}

export default function ScheduleNode() {
  const { nodeStatus, briefing, arteImageUrl, copyOptions, selectedCopyIdx, activeFormat } = usePipeline();
  const isAvailable = nodeStatus.export === 'active' || nodeStatus.arte === 'done';

  const defaultPlatform = activeFormat?.platform || 'Instagram';
  const [platform, setPlatform] = useState(defaultPlatform);
  const [scheduledAt, setScheduledAt] = useState('');
  const [scheduling, setScheduling] = useState(false);
  const [scheduled, setScheduled] = useState<string | null>(null);
  const [error, setError] = useState('');

  const bestTime = PLATFORMS.find((p) => p.id === platform)?.bestTime || '';

  const handleSchedule = async () => {
    if (!scheduledAt) return;
    setScheduling(true);
    setError('');
    try {
      const { apiPost } = await import('@/lib/api');
      const copy = copyOptions[selectedCopyIdx];
      const copyText = [copy?.title, copy?.body, copy?.cta].filter(Boolean).join(' ');
      await apiPost('/studio/creative/schedule', {
        briefing_id: briefing?.id || undefined,
        platform,
        scheduled_at: new Date(scheduledAt).toISOString(),
        copy_text: copyText || undefined,
        image_url: arteImageUrl || undefined,
      });
      setScheduled(scheduledAt);
    } catch (e: any) {
      setError(e?.message || 'Erro ao agendar publicação.');
    } finally {
      setScheduling(false);
    }
  };

  const collapsedSummary = (
    <Stack spacing={0.5}>
      <Stack direction="row" spacing={0.75} alignItems="center">
        <IconCheck size={12} color="#13DEB9" />
        <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: 'text.primary' }}>
          Agendado no {platform}
        </Typography>
      </Stack>
      <Typography sx={{ fontSize: '0.62rem', color: 'text.secondary' }}>
        {scheduled ? formatScheduled(scheduled) : ''}
      </Typography>
    </Stack>
  );

  return (
    <Box>
      <Handle type="target" position={Position.Left} id="schedule_in"
        style={{ background: '#444', width: 8, height: 8, border: 'none' }} />
      <NodeShell
        title="Agendar Publicação"
        icon={<IconCalendar size={14} />}
        status={scheduled ? 'done' : scheduling ? 'running' : isAvailable ? 'active' : 'locked'}
        accentColor="#7C3AED"
        width={270}
        collapsedSummary={collapsedSummary}
      >
        <Stack spacing={1.25}>
          <Typography sx={{ fontSize: '0.6rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            Plataforma
          </Typography>

          {/* Platform picker */}
          <Stack direction="row" spacing={0.5} flexWrap="wrap">
            {PLATFORMS.map((p) => (
              <Box
                key={p.id}
                onClick={() => setPlatform(p.id)}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 0.5,
                  px: 0.75, py: 0.4, borderRadius: 1.5, cursor: 'pointer',
                  border: `1px solid ${platform === p.id ? '#7C3AED' : '#2a2a2a'}`,
                  bgcolor: platform === p.id ? 'rgba(124,58,237,0.1)' : 'transparent',
                  transition: 'all 0.15s',
                  color: platform === p.id ? '#7C3AED' : '#555',
                }}
              >
                {p.icon}
                <Typography sx={{ fontSize: '0.58rem', fontWeight: platform === p.id ? 700 : 400 }}>
                  {p.label}
                </Typography>
              </Box>
            ))}
          </Stack>

          {/* AI best time badge */}
          {bestTime && (
            <Stack direction="row" spacing={0.5} alignItems="center">
              <IconSparkles size={11} color="#7C3AED" />
              <Typography sx={{ fontSize: '0.6rem', color: '#7C3AED', fontStyle: 'italic' }}>
                IA sugere: {bestTime}
              </Typography>
            </Stack>
          )}

          {/* DateTime input */}
          <Box>
            <Typography sx={{ fontSize: '0.6rem', color: '#888', mb: 0.5 }}>Data e hora</Typography>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              style={{
                width: '100%', padding: '6px 8px',
                background: '#1a1a1a', border: '1px solid #2a2a2a',
                borderRadius: 6, color: '#ddd', fontSize: '0.65rem',
                outline: 'none', boxSizing: 'border-box',
              }}
            />
          </Box>

          {error && <Typography sx={{ fontSize: '0.6rem', color: '#FF4D4D' }}>{error}</Typography>}

          <Button
            variant="contained" size="small" fullWidth
            onClick={handleSchedule}
            disabled={!scheduledAt || scheduling || !isAvailable}
            startIcon={scheduling ? <CircularProgress size={12} sx={{ color: '#fff' }} /> : <IconCalendar size={13} />}
            sx={{
              bgcolor: '#7C3AED', color: '#fff', fontWeight: 700,
              fontSize: '0.7rem', textTransform: 'none',
              '&:hover': { bgcolor: '#6d28d9' },
              '&.Mui-disabled': { bgcolor: '#2a2a2a', color: '#555' },
            }}
          >
            {scheduling ? 'Agendando…' : 'Agendar Publicação'}
          </Button>
        </Stack>
      </NodeShell>
      <Handle type="source" position={Position.Right} id="schedule_out"
        style={{ background: '#7C3AED', width: 8, height: 8, border: 'none' }} />
    </Box>
  );
}
