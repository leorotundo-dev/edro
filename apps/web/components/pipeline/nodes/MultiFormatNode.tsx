'use client';
import { Handle, Position } from '@xyflow/react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import { IconLayersLinked, IconCheck, IconPhoto } from '@tabler/icons-react';
import { useState } from 'react';
import NodeShell from '../NodeShell';
import { usePipeline } from '../PipelineContext';

const FORMATS = [
  { id: 'ig-story',   label: 'Story',          platform: 'Instagram', ratio: '9:16', est: '~20s' },
  { id: 'ig-feed',    label: 'Feed 1:1',        platform: 'Instagram', ratio: '1:1',  est: '~15s' },
  { id: 'li-post',    label: 'LinkedIn 4:5',    platform: 'LinkedIn',  ratio: '4:5',  est: '~15s' },
  { id: 'tw-header',  label: 'Twitter Banner',  platform: 'Twitter',   ratio: '3:1',  est: '~20s' },
  { id: 'yt-thumb',   label: 'YouTube Thumb',   platform: 'YouTube',   ratio: '16:9', est: '~20s' },
  { id: 'pin-post',   label: 'Pinterest',       platform: 'Pinterest', ratio: '2:3',  est: '~15s' },
];

export default function MultiFormatNode() {
  const { nodeStatus, copyOptions, selectedCopyIdx, selectedTrigger, clientBrandColor, activeFormat } = usePipeline();
  const status = nodeStatus.copy === 'done' ? 'active' : 'locked';
  const [selected, setSelected] = useState<Set<string>>(new Set(['ig-feed', 'ig-story']));
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState<Record<string, string | null>>({});
  const [done, setDone] = useState(false);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleGenerate = async () => {
    setGenerating(true);
    const copy = copyOptions[selectedCopyIdx];
    const copyText = [copy?.title, copy?.body, copy?.cta].filter(Boolean).join(' ');
    const targets = FORMATS.filter((f) => selected.has(f.id));

    const pending: Record<string, null> = {};
    targets.forEach((f) => { pending[f.id] = null; });
    setResults(pending);

    // Generate in parallel (fire-and-forget per format)
    await Promise.allSettled(
      targets.map(async (fmt) => {
        try {
          const { apiPost } = await import('@/lib/api');
          const res = await apiPost<any>('/studio/creative/orchestrate', {
            copy: copyText,
            gatilho: selectedTrigger || undefined,
            brand_color: clientBrandColor,
            platform: fmt.platform,
            format: `${fmt.label} ${fmt.ratio}`,
            with_image: true,
            num_variants: 1,
          });
          const url: string | null = res?.image_urls?.[0] ?? res?.image_url ?? null;
          setResults((prev) => ({ ...prev, [fmt.id]: url }));
        } catch {
          setResults((prev) => ({ ...prev, [fmt.id]: 'error' }));
        }
      })
    );
    setGenerating(false);
    setDone(true);
  };

  const doneCount = Object.values(results).filter((v) => v && v !== 'error').length;

  const collapsedSummary = (
    <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap">
      <IconLayersLinked size={14} color="#F97316" />
      <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: '#F97316' }}>
        {doneCount} formato{doneCount !== 1 ? 's' : ''} gerado{doneCount !== 1 ? 's' : ''}
      </Typography>
      <Stack direction="row" spacing={0.5} mt={0.5} flexWrap="wrap">
        {Object.entries(results).filter(([, v]) => v && v !== 'error').map(([id, url]) => (
          <Box key={id} sx={{ width: 36, height: 36, borderRadius: 1, overflow: 'hidden', border: '1px solid #F9731633' }}>
            <img src={url!} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </Box>
        ))}
      </Stack>
    </Stack>
  );

  return (
    <Box>
      <Handle type="target" position={Position.Left} id="multiformat_in"
        style={{ background: '#444', width: 8, height: 8, border: 'none' }} />
      <NodeShell
        title="Multi-Formato"
        icon={<IconLayersLinked size={14} />}
        status={done ? 'done' : generating ? 'running' : status}
        accentColor="#F97316"
        width={260}
        collapsedSummary={collapsedSummary}
      >
        <Stack spacing={1.25}>
          <Typography sx={{ fontSize: '0.6rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            Selecione os formatos
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.75 }}>
            {FORMATS.map((fmt) => {
              const isSelected = selected.has(fmt.id);
              const resultUrl = results[fmt.id];
              const isReady = resultUrl && resultUrl !== 'error';
              const isError = resultUrl === 'error';
              const isPending = generating && !resultUrl;
              return (
                <Box
                  key={fmt.id}
                  onClick={() => !generating && toggle(fmt.id)}
                  sx={{
                    p: 0.75, borderRadius: 1.5, cursor: generating ? 'default' : 'pointer',
                    border: `1px solid ${isSelected ? '#F97316' : '#2a2a2a'}`,
                    bgcolor: isSelected ? 'rgba(249,115,22,0.06)' : 'transparent',
                    transition: 'all 0.15s',
                    position: 'relative', overflow: 'hidden',
                  }}
                >
                  {isReady && (
                    <Box sx={{ position: 'absolute', inset: 0, zIndex: 1 }}>
                      <img src={resultUrl!} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.5 }} />
                      <Box sx={{ position: 'absolute', top: 4, right: 4 }}>
                        <IconCheck size={12} color="#13DEB9" />
                      </Box>
                    </Box>
                  )}
                  {isError && (
                    <Box sx={{ position: 'absolute', top: 4, right: 4 }}>
                      <Typography sx={{ fontSize: '0.5rem', color: '#FF4D4D' }}>erro</Typography>
                    </Box>
                  )}
                  {isPending && (
                    <Box sx={{ position: 'absolute', top: 4, right: 4 }}>
                      <CircularProgress size={10} sx={{ color: '#F97316' }} />
                    </Box>
                  )}
                  <Typography sx={{ fontSize: '0.6rem', fontWeight: 600, color: isSelected ? '#F97316' : '#888', position: 'relative', zIndex: 2 }}>
                    {fmt.label}
                  </Typography>
                  <Stack direction="row" spacing={0.5} alignItems="center" sx={{ position: 'relative', zIndex: 2 }}>
                    <Typography sx={{ fontSize: '0.52rem', color: '#555' }}>{fmt.ratio}</Typography>
                    <Typography sx={{ fontSize: '0.52rem', color: '#444' }}>· {fmt.est}</Typography>
                  </Stack>
                </Box>
              );
            })}
          </Box>

          {!done && (
            <Button
              variant="contained" size="small" fullWidth
              onClick={handleGenerate}
              disabled={generating || selected.size === 0 || status === 'locked'}
              startIcon={generating ? <CircularProgress size={12} sx={{ color: '#fff' }} /> : <IconPhoto size={13} />}
              sx={{
                bgcolor: '#F97316', color: '#fff', fontWeight: 700,
                fontSize: '0.7rem', textTransform: 'none',
                '&:hover': { bgcolor: '#ea6b0e' },
                '&.Mui-disabled': { bgcolor: '#2a2a2a', color: '#555' },
              }}
            >
              {generating ? 'Gerando…' : `Gerar ${selected.size} formato${selected.size !== 1 ? 's' : ''}`}
            </Button>
          )}
        </Stack>
      </NodeShell>
      <Handle type="source" position={Position.Right} id="multiformat_out"
        style={{ background: '#F97316', width: 8, height: 8, border: 'none' }} />
    </Box>
  );
}
