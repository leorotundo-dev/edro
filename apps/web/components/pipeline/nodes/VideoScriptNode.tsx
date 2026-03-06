'use client';
import { Handle, Position } from '@xyflow/react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import { IconMovie, IconCheck, IconPlayerPlay } from '@tabler/icons-react';
import { useState } from 'react';
import NodeShell from '../NodeShell';
import { usePipeline } from '../PipelineContext';

type Scene = {
  id: string;
  label: string;
  duration_label: string;
  narration: string;
  visual: string;
  duration_seconds: number;
};

type VideoScript = {
  scenes: Scene[];
  total_seconds: number;
  style_note?: string;
};

const SCENE_COLORS: Record<string, string> = {
  hook: '#E85219',
  dev:  '#5D87FF',
  cta:  '#13DEB9',
};

export default function VideoScriptNode() {
  const { nodeStatus, copyOptions, selectedCopyIdx, activeFormat } = usePipeline();
  const status = nodeStatus.copy === 'done' ? 'active' : 'locked';

  const [generating, setGenerating] = useState(false);
  const [script, setScript] = useState<VideoScript | null>(null);
  const [error, setError] = useState('');
  const [duration, setDuration] = useState(30);

  const handleGenerate = async () => {
    const copy = copyOptions[selectedCopyIdx];
    if (!copy) return;
    setGenerating(true);
    setError('');
    try {
      const { apiPost } = await import('@/lib/api');
      const res = await apiPost<{ success: boolean; data: VideoScript }>('/studio/creative/video-script', {
        copy_title: copy.title,
        copy_body: copy.body,
        copy_cta: copy.cta,
        platform: activeFormat?.platform,
        format: activeFormat?.format,
        duration_seconds: duration,
      });
      if (!res.success) throw new Error('Falha ao gerar roteiro.');
      setScript(res.data);
    } catch (e: any) {
      setError(e?.message || 'Erro ao gerar roteiro.');
    } finally {
      setGenerating(false);
    }
  };

  const collapsedSummary = (
    <Stack spacing={0.5}>
      <Stack direction="row" spacing={0.75} alignItems="center">
        <IconCheck size={12} color="#13DEB9" />
        <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: 'text.primary' }}>
          Roteiro {script?.total_seconds}s gerado
        </Typography>
      </Stack>
      <Stack direction="row" spacing={0.5}>
        {script?.scenes.map((s) => (
          <Box key={s.id} sx={{
            px: 0.75, py: 0.25, borderRadius: 1,
            bgcolor: `${SCENE_COLORS[s.id] || '#888'}22`,
            border: `1px solid ${SCENE_COLORS[s.id] || '#888'}44`,
          }}>
            <Typography sx={{ fontSize: '0.55rem', color: SCENE_COLORS[s.id] || '#888', fontWeight: 600 }}>
              {s.label} {s.duration_label}
            </Typography>
          </Box>
        ))}
      </Stack>
    </Stack>
  );

  return (
    <Box>
      <Handle type="target" position={Position.Left} id="videoscript_in"
        style={{ background: '#444', width: 8, height: 8, border: 'none' }} />
      <NodeShell
        title="Roteiro de Vídeo"
        icon={<IconMovie size={14} />}
        status={script ? 'done' : generating ? 'running' : status}
        accentColor="#A855F7"
        width={280}
        collapsedSummary={collapsedSummary}
      >
        <Stack spacing={1.25}>
          {!script ? (
            <>
              <Typography sx={{ fontSize: '0.6rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                Roteiro para vídeo social
              </Typography>

              {/* Duration selector */}
              <Stack direction="row" spacing={0.5} alignItems="center">
                <Typography sx={{ fontSize: '0.62rem', color: 'text.secondary' }}>Duração:</Typography>
                {[15, 30, 60].map((d) => (
                  <Box
                    key={d}
                    onClick={() => setDuration(d)}
                    sx={{
                      px: 0.75, py: 0.25, borderRadius: 1, cursor: 'pointer',
                      border: `1px solid ${duration === d ? '#A855F7' : '#2a2a2a'}`,
                      bgcolor: duration === d ? 'rgba(168,85,247,0.1)' : 'transparent',
                      transition: 'all 0.15s',
                    }}
                  >
                    <Typography sx={{ fontSize: '0.6rem', color: duration === d ? '#A855F7' : '#555', fontWeight: duration === d ? 700 : 400 }}>
                      {d}s
                    </Typography>
                  </Box>
                ))}
              </Stack>

              {error && (
                <Typography sx={{ fontSize: '0.6rem', color: '#FF4D4D' }}>{error}</Typography>
              )}

              <Button
                variant="contained" size="small" fullWidth
                onClick={handleGenerate}
                disabled={generating || status === 'locked'}
                startIcon={generating ? <CircularProgress size={12} sx={{ color: '#fff' }} /> : <IconMovie size={13} />}
                sx={{
                  bgcolor: '#A855F7', color: '#fff', fontWeight: 700,
                  fontSize: '0.7rem', textTransform: 'none',
                  '&:hover': { bgcolor: '#9333ea' },
                  '&.Mui-disabled': { bgcolor: '#2a2a2a', color: '#555' },
                }}
              >
                {generating ? 'Gerando roteiro…' : 'Gerar Roteiro'}
              </Button>
            </>
          ) : (
            <>
              {script.style_note && (
                <Typography sx={{ fontSize: '0.6rem', color: '#A855F7', fontStyle: 'italic', lineHeight: 1.5 }}>
                  {script.style_note}
                </Typography>
              )}
              <Stack spacing={0.75}>
                {script.scenes.map((scene, i) => {
                  const color = SCENE_COLORS[scene.id] || '#888';
                  return (
                    <Box key={scene.id}>
                      {i > 0 && <Divider sx={{ borderColor: '#1e1e1e', mb: 0.75 }} />}
                      <Stack direction="row" spacing={0.75} alignItems="center" mb={0.5}>
                        <Box sx={{
                          px: 0.6, py: 0.15, borderRadius: 0.75,
                          bgcolor: `${color}22`, border: `1px solid ${color}44`,
                        }}>
                          <Typography sx={{ fontSize: '0.55rem', color, fontWeight: 700 }}>
                            {scene.label}
                          </Typography>
                        </Box>
                        <Typography sx={{ fontSize: '0.55rem', color: '#555' }}>{scene.duration_label}</Typography>
                      </Stack>
                      <Typography sx={{ fontSize: '0.6rem', color: 'text.primary', lineHeight: 1.5, mb: 0.5 }}>
                        "{scene.narration}"
                      </Typography>
                      <Typography sx={{ fontSize: '0.58rem', color: 'text.disabled', lineHeight: 1.4 }}>
                        📷 {scene.visual}
                      </Typography>
                    </Box>
                  );
                })}
              </Stack>
              <Button
                variant="outlined" size="small" fullWidth
                onClick={() => setScript(null)}
                sx={{
                  textTransform: 'none', fontSize: '0.65rem',
                  borderColor: '#A855F744', color: '#A855F7',
                  '&:hover': { borderColor: '#A855F7', bgcolor: 'rgba(168,85,247,0.06)' },
                }}
              >
                Regenerar
              </Button>
            </>
          )}
        </Stack>
      </NodeShell>
      <Handle type="source" position={Position.Right} id="videoscript_out"
        style={{ background: '#A855F7', width: 8, height: 8, border: 'none' }} />
    </Box>
  );
}
