'use client';

import { useCallback, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import { IconCheck, IconZoomIn } from '@tabler/icons-react';
import { apiPost } from '@/lib/api';

// ── Types ─────────────────────────────────────────────────────────────────────

type ModelOption = { model: string; label: string };

type CompareResult = {
  model: string;
  label: string;
  image_url: string;
  image_urls: string[];
  ms: number;
  error?: string;
};

type ModelComparePanelProps = {
  prompt: string;
  negativePrompt?: string;
  aspectRatio?: string;
  clientId?: string;
  onSelect: (imageUrl: string, model: string) => void;
};

// ── Default models ─────────────────────────────────────────────────────────────

const DEFAULT_MODELS: ModelOption[] = [
  { model: 'flux-pro',      label: 'Flux Pro'      },
  { model: 'flux-realism',  label: 'Flux Realism'  },
  { model: 'ideogram-v2',   label: 'Ideogram v2'   },
];

const ALL_MODELS: ModelOption[] = [
  { model: 'flux-pro',          label: 'Flux Pro'          },
  { model: 'flux-pro-ultra',    label: 'Flux Ultra'        },
  { model: 'flux-realism',      label: 'Flux Realism'      },
  { model: 'flux-dev',          label: 'Flux Dev'          },
  { model: 'flux-lora',         label: 'Flux LoRA'         },
  { model: 'ideogram-v2',       label: 'Ideogram v2'       },
  { model: 'recraft-v3',        label: 'Recraft v3'        },
  { model: 'hidream-i1',        label: 'HiDream'           },
  { model: 'nano-banana-pro',   label: 'Gemini Pro'        },
  { model: 'nano-banana-2',     label: 'Gemini Flash'      },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function ModelComparePanel({
  prompt,
  negativePrompt,
  aspectRatio = '1:1',
  clientId,
  onSelect,
}: ModelComparePanelProps) {
  const [selectedModels, setSelectedModels] = useState<ModelOption[]>(DEFAULT_MODELS);
  const [results, setResults] = useState<CompareResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [winner, setWinner] = useState<string | null>(null);
  const [expandModel, setExpandModel] = useState<string | null>(null);

  const toggleModel = (m: ModelOption) => {
    setSelectedModels(prev => {
      const exists = prev.some(p => p.model === m.model);
      if (exists && prev.length <= 2) return prev; // min 2
      if (!exists && prev.length >= 4) return prev; // max 4
      return exists ? prev.filter(p => p.model !== m.model) : [...prev, m];
    });
  };

  const handleRun = useCallback(async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setError('');
    setResults([]);
    setWinner(null);
    try {
      const res = await apiPost<{ results: CompareResult[] }>('/studio/creative/compare-models', {
        prompt,
        negative_prompt: negativePrompt,
        models: selectedModels,
        aspect_ratio: aspectRatio,
        client_id: clientId,
      });
      setResults(res.results);
    } catch (err: any) {
      setError(err?.message || 'Erro ao comparar modelos');
    } finally {
      setLoading(false);
    }
  }, [prompt, negativePrompt, selectedModels, aspectRatio, clientId]);

  const handleSelect = (result: CompareResult) => {
    setWinner(result.model);
    onSelect(result.image_url, result.label);
  };

  const colCount = selectedModels.length <= 2 ? 2 : selectedModels.length;

  return (
    <Box>
      {/* Model picker */}
      <Box mb={2}>
        <Typography variant="caption" color="text.secondary" display="block" mb={0.75}>
          Modelos a comparar (2–4)
        </Typography>
        <Stack direction="row" flexWrap="wrap" gap={0.75}>
          {ALL_MODELS.map(m => {
            const active = selectedModels.some(s => s.model === m.model);
            return (
              <Chip
                key={m.model}
                label={m.label}
                size="small"
                onClick={() => toggleModel(m)}
                color={active ? 'primary' : 'default'}
                variant={active ? 'filled' : 'outlined'}
                sx={{ fontSize: 11, cursor: 'pointer' }}
              />
            );
          })}
        </Stack>
      </Box>

      {/* Run button */}
      <Button
        variant="contained"
        size="small"
        onClick={handleRun}
        disabled={loading || !prompt.trim() || selectedModels.length < 2}
        fullWidth
        sx={{ mb: 2, borderRadius: 2 }}
      >
        {loading ? `Gerando em ${selectedModels.length} modelos...` : `Comparar ${selectedModels.length} modelos`}
      </Button>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Loading skeletons */}
      {loading && (
        <Grid container spacing={1.5}>
          {selectedModels.map(m => (
            <Grid key={m.model} size={{ xs: 12 / Math.min(colCount, 2), sm: 12 / colCount }}>
              <Box sx={{ borderRadius: 1.5, overflow: 'hidden', border: 1, borderColor: 'divider' }}>
                <Skeleton variant="rectangular" width="100%" height={160} />
                <Box p={1}>
                  <Skeleton variant="text" width="60%" />
                </Box>
              </Box>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Results grid */}
      {!loading && results.length > 0 && (
        <Grid container spacing={1.5}>
          {results.map(r => {
            const isWinner = winner === r.model;
            const hasError = !!r.error || !r.image_url;
            return (
              <Grid key={r.model} size={{ xs: 12 / Math.min(colCount, 2), sm: 12 / colCount }}>
                <Box
                  sx={{
                    borderRadius: 1.5,
                    overflow: 'hidden',
                    border: 2,
                    borderColor: isWinner ? 'success.main' : hasError ? 'error.light' : 'divider',
                    position: 'relative',
                    cursor: hasError ? 'default' : 'pointer',
                    transition: 'border-color 0.15s',
                    '&:hover': hasError ? {} : { borderColor: 'primary.main' },
                  }}
                >
                  {/* Winner badge */}
                  {isWinner && (
                    <Box sx={{
                      position: 'absolute', top: 6, right: 6, zIndex: 2,
                      bgcolor: 'success.main', borderRadius: '50%',
                      width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <IconCheck size={14} color="white" />
                    </Box>
                  )}

                  {/* Image */}
                  {hasError ? (
                    <Box sx={{ height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'action.hover' }}>
                      <Typography variant="caption" color="error">{r.error || 'Falhou'}</Typography>
                    </Box>
                  ) : (
                    <Box
                      component="img"
                      src={r.image_url}
                      alt={r.label}
                      sx={{ width: '100%', display: 'block', aspectRatio: '1 / 1', objectFit: 'cover' }}
                    />
                  )}

                  {/* Footer */}
                  <Stack direction="row" alignItems="center" justifyContent="space-between" px={1} py={0.75}
                    sx={{ bgcolor: 'background.paper' }}>
                    <Box>
                      <Typography variant="caption" fontWeight={600}>{r.label}</Typography>
                      {r.ms > 0 && (
                        <Typography variant="caption" color="text.disabled" display="block">
                          {(r.ms / 1000).toFixed(1)}s
                        </Typography>
                      )}
                    </Box>
                    {!hasError && (
                      <Button
                        size="small"
                        variant={isWinner ? 'contained' : 'outlined'}
                        color={isWinner ? 'success' : 'primary'}
                        onClick={() => handleSelect(r)}
                        sx={{ fontSize: 10, py: 0.25, px: 1, minWidth: 0, borderRadius: 4 }}
                      >
                        {isWinner ? 'Selecionado' : 'Usar'}
                      </Button>
                    )}
                  </Stack>
                </Box>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Expand overlay (zoom) */}
      {expandModel && (() => {
        const r = results.find(x => x.model === expandModel);
        if (!r) return null;
        return (
          <Box
            onClick={() => setExpandModel(null)}
            sx={{
              position: 'fixed', inset: 0, zIndex: 1300,
              bgcolor: 'rgba(0,0,0,0.85)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'zoom-out',
            }}
          >
            <Box
              component="img"
              src={r.image_url}
              alt={r.label}
              sx={{ maxWidth: '80vw', maxHeight: '80vh', borderRadius: 2, boxShadow: 24 }}
            />
          </Box>
        );
      })()}
    </Box>
  );
}
