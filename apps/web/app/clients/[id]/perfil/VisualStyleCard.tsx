'use client';

import { useEffect, useState } from 'react';
import { apiGet, apiPost } from '@/lib/api';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Collapse from '@mui/material/Collapse';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import {
  IconBrandInstagram,
  IconPalette,
  IconRefresh,
  IconChevronDown,
  IconChevronUp,
  IconPhoto,
} from '@tabler/icons-react';

const EDRO_ORANGE = '#E85219';

type VisualStyle = {
  dominant_colors: string[];
  color_harmony: string;
  photo_style: string;
  composition: string;
  mood: string;
  typography_style: string;
  text_placement: string;
  style_summary: string;
  sample_count: number;
  expires_at: string;
  analyzed_at: string;
};

type Props = {
  clientId: string;
};

const LABEL_MAP: Record<string, string> = {
  color_harmony: 'Harmonia',
  photo_style: 'Estilo foto',
  composition: 'Composição',
  mood: 'Mood',
  typography_style: 'Tipografia',
  text_placement: 'Texto',
};

export default function VisualStyleCard({ clientId }: Props) {
  const [style, setStyle] = useState<VisualStyle | null>(null);
  const [expired, setExpired] = useState(true);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [expanded, setExpanded] = useState(false);

  async function fetchStyle() {
    setLoading(true);
    try {
      const res = await apiGet(`/clients/${clientId}/visual-style`);
      setStyle(res.style || null);
      setExpired(res.expired ?? true);
    } catch {
      setStyle(null);
    } finally {
      setLoading(false);
    }
  }

  async function triggerAnalysis(force = false) {
    setAnalyzing(true);
    try {
      const res = await apiPost(`/clients/${clientId}/analyze-visual`, { force });
      if (res.style) {
        setStyle(res.style);
        setExpired(false);
      }
    } catch {
      // silent
    } finally {
      setAnalyzing(false);
    }
  }

  useEffect(() => { fetchStyle(); }, [clientId]);

  if (loading) {
    return (
      <Card variant="outlined" sx={{ opacity: 0.6 }}>
        <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 2 }}>
          <CircularProgress size={16} />
          <Typography variant="caption" color="text.secondary">Carregando estilo visual...</Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="space-between" sx={{ mb: style ? 1.5 : 0 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Avatar sx={{ bgcolor: '#fdeee8', color: EDRO_ORANGE, width: 32, height: 32 }}>
              <IconPalette size={18} />
            </Avatar>
            <Box>
              <Typography variant="subtitle2" fontWeight={700}>DNA Visual</Typography>
              <Typography variant="caption" color="text.secondary">
                {style
                  ? `${style.sample_count} posts analisados via Instagram`
                  : 'Nenhuma análise visual disponível'}
              </Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={0.5}>
            {style && (
              <Tooltip title={expanded ? 'Recolher' : 'Expandir detalhes'}>
                <Button
                  size="small"
                  variant="text"
                  onClick={() => setExpanded(!expanded)}
                  sx={{ minWidth: 28, p: 0.5, color: '#888' }}
                >
                  {expanded ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
                </Button>
              </Tooltip>
            )}
            <Tooltip title={style ? 'Reanalisar Instagram' : 'Analisar Instagram'}>
              <Button
                size="small"
                variant="outlined"
                onClick={() => triggerAnalysis(true)}
                disabled={analyzing}
                startIcon={analyzing ? <CircularProgress size={12} /> : <IconRefresh size={14} />}
                sx={{
                  borderRadius: 1.5, fontSize: 11, textTransform: 'none',
                  borderColor: `${EDRO_ORANGE}60`, color: EDRO_ORANGE,
                  '&:hover': { borderColor: EDRO_ORANGE, bgcolor: `${EDRO_ORANGE}08` },
                }}
              >
                {analyzing ? 'Analisando...' : style ? 'Atualizar' : 'Analisar'}
              </Button>
            </Tooltip>
          </Stack>
        </Stack>

        {!style && !analyzing && (
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <IconBrandInstagram size={32} style={{ color: '#ccc', marginBottom: 8 }} />
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Analise os posts do Instagram para extrair o DNA visual do cliente.
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Cores, estilo fotográfico, composição, mood e tipografia.
            </Typography>
          </Box>
        )}

        {style && (
          <>
            {/* Color palette */}
            <Box sx={{ mb: 1.5 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem', mb: 0.5, display: 'block' }}>
                Paleta dominante
              </Typography>
              <Stack direction="row" spacing={0.5} flexWrap="wrap">
                {style.dominant_colors.map((color, i) => (
                  <Tooltip key={i} title={color}>
                    <Box sx={{
                      width: 28, height: 28, borderRadius: 1,
                      bgcolor: color,
                      border: '2px solid rgba(0,0,0,0.08)',
                      cursor: 'pointer',
                      transition: 'transform 0.1s',
                      '&:hover': { transform: 'scale(1.15)' },
                    }} />
                  </Tooltip>
                ))}
              </Stack>
            </Box>

            {/* Attribute chips */}
            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
              {Object.entries(LABEL_MAP).map(([key, label]) => {
                const value = (style as any)[key];
                if (!value) return null;
                return (
                  <Chip
                    key={key}
                    size="small"
                    label={`${label}: ${value.replace(/_/g, ' ')}`}
                    sx={{
                      fontSize: '0.65rem', height: 22,
                      bgcolor: `${EDRO_ORANGE}0A`, color: '#666',
                      border: `1px solid ${EDRO_ORANGE}20`,
                    }}
                  />
                );
              })}
            </Stack>

            {/* Expandable summary */}
            <Collapse in={expanded}>
              <Box sx={{
                mt: 1, p: 1.5, bgcolor: '#f8f8f8', borderRadius: 1.5,
                border: '1px solid #eee',
              }}>
                <Typography variant="caption" fontWeight={700} sx={{ mb: 0.5, display: 'block', color: '#555' }}>
                  Resumo do Estilo Visual
                </Typography>
                <Typography variant="body2" sx={{ fontSize: '0.8rem', color: '#444', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                  {style.style_summary}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block', fontSize: '0.6rem' }}>
                  Analisado em {new Date(style.analyzed_at).toLocaleDateString('pt-BR')}
                  {' · '}Expira em {new Date(style.expires_at).toLocaleDateString('pt-BR')}
                </Typography>
              </Box>
            </Collapse>
          </>
        )}
      </CardContent>
    </Card>
  );
}
