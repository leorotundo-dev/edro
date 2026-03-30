'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import {
  IconCheck,
  IconExternalLink,
  IconSearch,
  IconX,
} from '@tabler/icons-react';
import { apiGet, apiPatch } from '@/lib/api';

// ── Types ─────────────────────────────────────────────────────────────────────

type Ref = {
  id: string;
  title: string;
  source_url: string;
  image_url: string | null;
  domain: string | null;
  segment: string | null;
  visual_intent: string | null;
  creative_direction: string | null;
  style_tags: string[];
  mood_words: string[];
  trust_score: number | null;
  confidence_score: number | null;
  status: 'discovered' | 'analyzed' | 'rejected' | 'archived';
  source_name: string | null;
  snippet: string | null;
};

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { label: 'Todos', value: '' },
  { label: 'Publicidade', value: 'Advertising' },
  { label: 'Branding', value: 'Branding' },
  { label: 'Design gráfico', value: 'Graphic Design' },
  { label: 'Fotografia', value: 'Photography' },
  { label: 'Ilustração', value: 'Illustration' },
  { label: 'Motion', value: 'Motion Graphics' },
  { label: 'Embalagem', value: 'Packaging' },
  { label: 'Print', value: 'Print' },
];

const SOURCE_LABELS: Record<string, string> = {
  'behance.net': 'Behance',
  'adsoftheworld.com': 'Ads of the World',
  'canneslions.com': 'Cannes',
  'dandad.org': 'D&AD',
  'ccb.org.br': 'CCB',
  'luerzersarchive.com': "Lürzer's",
  'itsnicethat.com': "It's Nice That",
  'underconsideration.com': 'Brand New',
  'thedieline.com': 'The Dieline',
  'fontsinuse.com': 'Fonts In Use',
  'awwwards.com': 'Awwwards',
  'dribbble.com': 'Dribbble',
  'motionographer.com': 'Motionographer',
  'pinterest.com': 'Pinterest',
  'elojodeiberoamerica.com': 'El Ojo',
  'meioemensagem.com.br': 'M&M',
};

const SOURCE_COLORS: Record<string, string> = {
  'canneslions.com': '#c8a800',
  'dandad.org': '#f4c300',
  'ccb.org.br': '#009c3b',
  'adsoftheworld.com': '#e8491d',
  'behance.net': '#1769ff',
  'itsnicethat.com': '#ff3c00',
  'underconsideration.com': '#222',
  'dribbble.com': '#ea4c89',
  'elojodeiberoamerica.com': '#d4af37',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function sourceBadgeColor(domain: string | null): string {
  return SOURCE_COLORS[domain ?? ''] ?? '#5D87FF';
}

function sourceLabel(ref: Ref): string {
  return ref.source_name ?? SOURCE_LABELS[ref.domain ?? ''] ?? ref.domain ?? 'Web';
}

function trustColor(score: number | null): string {
  if (!score) return '#9e9e9e';
  if (score >= 0.85) return '#00b894';
  if (score >= 0.70) return '#fdcb6e';
  return '#ff7675';
}

// ── Card ──────────────────────────────────────────────────────────────────────

function RefCard({
  ref: r,
  onApprove,
  onReject,
}: {
  ref: Ref;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}) {
  const tags = [...(r.style_tags ?? []), ...(r.mood_words ?? [])].slice(0, 3);

  return (
    <Box
      sx={{
        borderRadius: 3,
        overflow: 'hidden',
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        display: 'flex',
        flexDirection: 'column',
        '&:hover .card-actions': { opacity: 1 },
        '&:hover .card-img': { transform: 'scale(1.04)' },
        transition: 'box-shadow 0.2s',
        '&:hover': { boxShadow: 4 },
      }}
    >
      {/* Thumbnail */}
      <Box sx={{ position: 'relative', overflow: 'hidden', bgcolor: 'grey.100', aspectRatio: '4/3' }}>
        {r.image_url ? (
          <Box
            component="img"
            src={r.image_url}
            alt={r.title}
            className="card-img"
            sx={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
              transition: 'transform 0.35s ease',
            }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <Box
            sx={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Typography variant="h3" color="text.disabled" fontWeight={700}>
              {sourceLabel(r).charAt(0)}
            </Typography>
          </Box>
        )}

        {/* Source badge */}
        <Box
          sx={{
            position: 'absolute',
            top: 8,
            left: 8,
            bgcolor: sourceBadgeColor(r.domain),
            color: '#fff',
            fontSize: 10,
            fontWeight: 700,
            px: 1,
            py: 0.25,
            borderRadius: 1,
            letterSpacing: 0.3,
          }}
        >
          {sourceLabel(r)}
        </Box>

        {/* Status badge */}
        {r.status === 'discovered' && (
          <Box
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              bgcolor: 'warning.main',
              color: '#fff',
              fontSize: 10,
              fontWeight: 700,
              px: 1,
              py: 0.25,
              borderRadius: 1,
            }}
          >
            Na fila
          </Box>
        )}

        {/* Hover actions */}
        <Box
          className="card-actions"
          sx={{
            position: 'absolute',
            inset: 0,
            bgcolor: 'rgba(0,0,0,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1,
            opacity: 0,
            transition: 'opacity 0.2s',
          }}
        >
          <Tooltip title="Aprovar referência">
            <IconButton
              size="small"
              onClick={() => onApprove(r.id)}
              sx={{ bgcolor: 'success.main', color: '#fff', '&:hover': { bgcolor: 'success.dark' } }}
            >
              <IconCheck size={16} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Abrir original">
            <IconButton
              size="small"
              component="a"
              href={r.source_url}
              target="_blank"
              rel="noopener noreferrer"
              sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: '#fff', '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' } }}
            >
              <IconExternalLink size={16} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Rejeitar">
            <IconButton
              size="small"
              onClick={() => onReject(r.id)}
              sx={{ bgcolor: 'error.main', color: '#fff', '&:hover': { bgcolor: 'error.dark' } }}
            >
              <IconX size={16} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Body */}
      <Box sx={{ p: 1.5, flex: 1, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
        <Typography
          variant="body2"
          fontWeight={600}
          sx={{
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            lineHeight: 1.3,
            fontSize: '0.80rem',
          }}
        >
          {r.title}
        </Typography>

        {r.creative_direction && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 1,
              WebkitBoxOrient: 'vertical',
              fontSize: '0.72rem',
            }}
          >
            {r.creative_direction}
          </Typography>
        )}

        {tags.length > 0 && (
          <Stack direction="row" flexWrap="wrap" gap={0.5}>
            {tags.map((tag) => (
              <Chip key={tag} label={tag} size="small" sx={{ fontSize: '0.65rem', height: 18, px: 0 }} />
            ))}
          </Stack>
        )}

        {/* Trust score bar */}
        {r.trust_score != null && (
          <Box>
            <LinearProgress
              variant="determinate"
              value={Math.round(r.trust_score * 100)}
              sx={{
                height: 3,
                borderRadius: 2,
                bgcolor: 'grey.100',
                '& .MuiLinearProgress-bar': { bgcolor: trustColor(r.trust_score) },
              }}
            />
          </Box>
        )}
      </Box>
    </Box>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ReferenceGallerySection() {
  const [segment, setSegment] = useState('');
  const [search, setSearch] = useState('');
  const [refs, setRefs] = useState<Ref[]>([]);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const fetchRefs = useCallback(async (seg: string) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '96' });
      params.append('statuses', 'analyzed');
      params.append('statuses', 'discovered');
      if (seg) params.set('segment', seg);
      const res = await apiGet<{ success: boolean; references: Ref[] }>(
        `/studio/creative/da-memory/references?${params}`,
      );
      setRefs(res.references ?? []);
    } catch {
      // aborted or network error — ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRefs(segment); }, [segment, fetchRefs]);

  const handleApprove = useCallback(async (id: string) => {
    await apiPatch(`/studio/creative/da-memory/references/${id}`, { status: 'analyzed' }).catch(() => {});
    setRefs((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'analyzed' } : r)));
  }, []);

  const handleReject = useCallback(async (id: string) => {
    await apiPatch(`/studio/creative/da-memory/references/${id}`, { status: 'rejected' }).catch(() => {});
    setRefs((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const filtered = search.trim()
    ? refs.filter((r) => {
        const q = search.toLowerCase();
        return (
          r.title?.toLowerCase().includes(q) ||
          r.creative_direction?.toLowerCase().includes(q) ||
          r.style_tags?.some((t) => t.toLowerCase().includes(q)) ||
          r.mood_words?.some((t) => t.toLowerCase().includes(q)) ||
          r.domain?.toLowerCase().includes(q)
        );
      })
    : refs;

  return (
    <Box>
      {/* Category chips — top nav like Behance */}
      <Box
        sx={{
          display: 'flex',
          gap: 1,
          overflowX: 'auto',
          pb: 1,
          mb: 2,
          '&::-webkit-scrollbar': { display: 'none' },
        }}
      >
        {CATEGORIES.map((cat) => (
          <Chip
            key={cat.value}
            label={cat.label}
            onClick={() => setSegment(cat.value)}
            variant={segment === cat.value ? 'filled' : 'outlined'}
            color={segment === cat.value ? 'primary' : 'default'}
            sx={{ flexShrink: 0, fontWeight: segment === cat.value ? 700 : 400 }}
          />
        ))}
      </Box>

      {/* Search */}
      <TextField
        size="small"
        placeholder="Buscar por título, tag, estilo, fonte…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        sx={{ mb: 2.5, maxWidth: 420 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <IconSearch size={16} />
            </InputAdornment>
          ),
        }}
      />

      {/* Count */}
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
        {loading ? 'Carregando…' : `${filtered.length} referências`}
        {search && !loading && ` · filtradas de ${refs.length}`}
      </Typography>

      {/* Grid */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress size={32} />
        </Box>
      ) : !filtered.length ? (
        <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>
          <Typography variant="body2">
            {search ? 'Nenhuma referência encontrada para esta busca.' : 'Nenhuma referência ainda. Rode "Descobrir" para alimentar o acervo.'}
          </Typography>
        </Box>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: 'repeat(2, 1fr)',
              sm: 'repeat(3, 1fr)',
              md: 'repeat(4, 1fr)',
              lg: 'repeat(5, 1fr)',
              xl: 'repeat(6, 1fr)',
            },
            gap: 2,
          }}
        >
          {filtered.map((r) => (
            <RefCard key={r.id} ref={r} onApprove={handleApprove} onReject={handleReject} />
          ))}
        </Box>
      )}
    </Box>
  );
}
