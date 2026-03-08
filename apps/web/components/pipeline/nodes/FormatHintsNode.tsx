'use client';
import { Handle, Position } from '@xyflow/react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import TextField from '@mui/material/TextField';
import CircularProgress from '@mui/material/CircularProgress';
import { IconBulb, IconSearch, IconX, IconCheck } from '@tabler/icons-react';
import React, { useState } from 'react';
import { usePipeline } from '../PipelineContext';

// Best-practice copy tips per platform/format
const FORMAT_TIPS: Record<string, { label: string; tips: string[] }> = {
  'instagram_feed': {
    label: 'Instagram Feed',
    tips: [
      'Primeira linha é decisiva — aparece sem expandir',
      'Emoji no início aumenta escaneabilidade',
      'CTA claro no final com verbo de ação',
    ],
  },
  'instagram_stories': {
    label: 'Instagram Stories',
    tips: [
      'Texto mínimo — imagem fala primeiro',
      'Urgência funciona bem (24h, hoje, agora)',
      'CTA em swipe up ou enquete',
    ],
  },
  'linkedin_feed': {
    label: 'LinkedIn',
    tips: [
      'Abertura com dado ou insight inesperado',
      'Tom profissional mas com voz humana',
      'Hashtags no fim, não no meio do texto',
    ],
  },
  'facebook_feed': {
    label: 'Facebook',
    tips: [
      'Storytelling curto converte bem',
      'Perguntas aumentam comentários',
      'Link no comentário, não na legenda',
    ],
  },
  'default': {
    label: 'Social Media',
    tips: [
      'Copy curto e direto ao ponto',
      'Benefício claro na primeira frase',
      'Um único CTA por peça',
    ],
  },
};

function resolveHints(platform?: string, format?: string) {
  const key = `${(platform || '').toLowerCase()}_${(format || '').toLowerCase().replace(/\s+/g, '_')}`;
  return FORMAT_TIPS[key] || FORMAT_TIPS[`${(platform || '').toLowerCase()}_feed`] || FORMAT_TIPS['default'];
}

type Reference = {
  url: string;
  title: string;
  description: string;
  relevanceScore: number;
};

export default function FormatHintsNode() {
  const { activeFormat, visualReferences, setVisualReferences, briefing } = usePipeline();
  const hints = resolveHints(activeFormat?.platform, activeFormat?.format);

  const [showInsights, setShowInsights] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Reference[]>([]);
  const [selectedRefs, setSelectedRefs] = useState<Set<string>>(new Set(visualReferences));
  const [searchError, setSearchError] = useState('');
  const [categoryOverride, setCategoryOverride] = useState('');

  const handleSearch = async () => {
    setSearching(true);
    setSearchError('');
    try {
      const category = categoryOverride.trim()
        || briefing?.payload?.segment
        || briefing?.title
        || activeFormat?.platform
        || 'advertising';
      const res = await fetch('/api/studio/creative/visual-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          platform: activeFormat?.platform ?? 'Instagram',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSearchResults(data.references ?? []);
      } else {
        setSearchError(data.error ?? 'Erro na busca');
      }
    } catch {
      setSearchError('Erro de conexão');
    } finally {
      setSearching(false);
    }
  };

  const toggleRef = (url: string) => {
    setSelectedRefs((prev) => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else if (next.size < 4) next.add(url);
      return next;
    });
  };

  const applyRefs = () => {
    setVisualReferences(Array.from(selectedRefs));
  };

  const clearRefs = () => {
    setSelectedRefs(new Set());
    setVisualReferences([]);
  };

  return (
    <Box sx={{
      width: 230,
      bgcolor: 'rgba(248,168,0,0.04)',
      border: '1px dashed #F8A80055',
      borderRadius: 2,
      overflow: 'hidden',
    }}>
      <Handle type="source" position={Position.Right} id="hints_out"
        style={{ background: '#F8A800', width: 8, height: 8, border: 'none', top: '50%' }} />

      {/* Header */}
      <Box sx={{ px: 1.5, py: 1, borderBottom: '1px solid #F8A80022', display: 'flex', alignItems: 'center', gap: 0.75 }}>
        <IconBulb size={12} color="#F8A800" />
        <Typography sx={{ fontSize: '0.62rem', fontWeight: 700, color: '#F8A800', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Boas Práticas
        </Typography>
        <Typography sx={{ fontSize: '0.55rem', color: '#555', ml: 'auto' }}>
          {hints.label}
        </Typography>
      </Box>

      {/* Tips */}
      <Box sx={{ p: 1.25, borderBottom: showInsights ? '1px solid #F8A80022' : 'none' }}>
        <Stack spacing={0.75}>
          {hints.tips.map((tip, i) => (
            <Stack key={i} direction="row" spacing={0.75} alignItems="flex-start">
              <Box sx={{
                width: 14, height: 14, borderRadius: '50%', flexShrink: 0, mt: 0.1,
                bgcolor: 'rgba(248,168,0,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Typography sx={{ fontSize: '0.45rem', color: '#F8A800', fontWeight: 700 }}>
                  {i + 1}
                </Typography>
              </Box>
              <Typography sx={{ fontSize: '0.6rem', color: '#888', lineHeight: 1.4 }}>
                {tip}
              </Typography>
            </Stack>
          ))}
        </Stack>
      </Box>

      {/* Visual Insights toggle */}
      <Box sx={{ px: 1.25, py: 0.875 }}>
        <Stack direction="row" spacing={0.5} alignItems="center" mb={showInsights ? 1 : 0}>
          <Button
            size="small" fullWidth variant="outlined"
            onClick={() => setShowInsights(p => !p)}
            startIcon={<IconSearch size={11} />}
            sx={{
              textTransform: 'none', fontSize: '0.6rem', fontWeight: 600,
              borderColor: showInsights ? '#5D87FF66' : '#222',
              color: showInsights ? '#5D87FF' : '#555',
              bgcolor: showInsights ? 'rgba(93,135,255,0.06)' : 'transparent',
              py: 0.4,
            }}
          >
            Visual Insights
          </Button>
          {visualReferences.length > 0 && (
            <Chip
              size="small"
              label={`${visualReferences.length} ref`}
              onDelete={clearRefs}
              deleteIcon={<IconX size={9} />}
              sx={{ height: 18, fontSize: '0.5rem', bgcolor: 'rgba(93,135,255,0.12)', color: '#5D87FF',
                '& .MuiChip-deleteIcon': { color: '#5D87FF' } }}
            />
          )}
        </Stack>

        {showInsights && (
          <Stack spacing={0.75}>
            <TextField
              size="small" fullWidth
              placeholder={`Categoria: ${briefing?.payload?.segment ?? briefing?.title ?? 'ex: tênis running'}`}
              value={categoryOverride}
              onChange={(e) => setCategoryOverride(e.target.value)}
              sx={{ '& .MuiInputBase-root': { fontSize: '0.6rem' } }}
            />
            <Button
              size="small" fullWidth variant="contained"
              onClick={handleSearch}
              disabled={searching}
              startIcon={searching ? <CircularProgress size={10} sx={{ color: '#fff' }} /> : <IconSearch size={10} />}
              sx={{ bgcolor: '#5D87FF', textTransform: 'none', fontSize: '0.6rem', py: 0.5,
                '&:hover': { bgcolor: '#4a6fe0' } }}
            >
              {searching ? 'Buscando…' : 'Buscar referências visuais'}
            </Button>

            {searchError && (
              <Typography sx={{ fontSize: '0.52rem', color: 'error.main' }}>{searchError}</Typography>
            )}

            {/* Results grid */}
            {searchResults.length > 0 && (
              <Stack spacing={0.625}>
                <Typography sx={{ fontSize: '0.5rem', color: '#555', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                  Selecione até 4 referências
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0.5 }}>
                  {searchResults.map((ref) => {
                    const isSelected = selectedRefs.has(ref.url);
                    const isImg = /\.(jpg|jpeg|png|webp)/i.test(ref.url);
                    return (
                      <Box key={ref.url} onClick={() => toggleRef(ref.url)}
                        sx={{
                          borderRadius: 1, overflow: 'hidden', cursor: 'pointer', position: 'relative',
                          border: '2px solid',
                          borderColor: isSelected ? '#5D87FF' : '#1e1e1e',
                          transition: 'all 0.15s',
                          bgcolor: '#111',
                          '&:hover': { borderColor: '#5D87FF88' },
                        }}
                      >
                        {isImg ? (
                          <Box
                            component="img"
                            src={ref.url}
                            alt={ref.title}
                            onError={(e: React.SyntheticEvent<HTMLImageElement>) => { e.currentTarget.style.display = 'none'; }}
                            sx={{ width: '100%', height: 44, objectFit: 'cover', display: 'block' }}
                          />
                        ) : (
                          <Box sx={{ height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 0.5 }}>
                            <Typography sx={{ fontSize: '0.42rem', color: '#555', textAlign: 'center', lineHeight: 1.3 }}>
                              {ref.title.slice(0, 30)}
                            </Typography>
                          </Box>
                        )}
                        {isSelected && (
                          <Box sx={{
                            position: 'absolute', top: 2, right: 2,
                            width: 12, height: 12, borderRadius: '50%', bgcolor: '#5D87FF',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <IconCheck size={8} color="#fff" />
                          </Box>
                        )}
                      </Box>
                    );
                  })}
                </Box>

                {selectedRefs.size > 0 && (
                  <Button
                    size="small" fullWidth variant="outlined"
                    onClick={applyRefs}
                    startIcon={<IconCheck size={10} />}
                    sx={{
                      textTransform: 'none', fontSize: '0.58rem', py: 0.4,
                      borderColor: '#5D87FF55', color: '#5D87FF',
                      '&:hover': { borderColor: '#5D87FF', bgcolor: 'rgba(93,135,255,0.06)' },
                    }}
                  >
                    Aplicar {selectedRefs.size} referência{selectedRefs.size > 1 ? 's' : ''} ao DA
                  </Button>
                )}

                {visualReferences.length > 0 && (
                  <Chip
                    size="small"
                    label={`✓ ${visualReferences.length} ref. ativas no Agente DA`}
                    sx={{ height: 18, fontSize: '0.5rem', bgcolor: 'rgba(93,135,255,0.1)', color: '#5D87FF' }}
                  />
                )}
              </Stack>
            )}
          </Stack>
        )}
      </Box>
    </Box>
  );
}
