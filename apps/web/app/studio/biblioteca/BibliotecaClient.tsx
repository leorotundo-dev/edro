'use client';
import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import {
  IconPhoto,
  IconTrash,
  IconBrandInstagram,
  IconDownload,
  IconX,
  IconRefresh,
  IconCheck,
  IconExternalLink,
} from '@tabler/icons-react';
import { apiGet, apiPost, apiDelete } from '@/lib/api';
import { buildStudioHref } from '../studioWorkflow';

type Creative = {
  id: string;
  client_id: string | null;
  briefing_id: string | null;
  platform: string | null;
  format: string | null;
  trigger_id: string | null;
  copy_title: string | null;
  copy_body: string | null;
  copy_cta: string | null;
  copy_legenda: string | null;
  image_url: string;
  recipe_name: string | null;
  status: 'draft' | 'approved' | 'published';
  created_at: string;
};

const PLATFORM_COLORS: Record<string, string> = {
  instagram: '#E1306C',
  linkedin: '#0A66C2',
  facebook: '#1877F2',
  twitter: '#1DA1F2',
  tiktok: '#000000',
};

const STATUS_CHIP: Record<string, { label: string; color: string }> = {
  draft:     { label: 'Rascunho',  color: '#888' },
  approved:  { label: 'Aprovado',  color: '#13DEB9' },
  published: { label: 'Publicado', color: '#1877F2' },
};

export default function BibliotecaClient() {
  const searchParams = useSearchParams();
  const [creatives, setCreatives] = useState<Creative[]>([]);
  const [loading, setLoading] = useState(true);
  const [platform, setPlatform] = useState('');
  const [status, setStatus] = useState('');
  const [selected, setSelected] = useState<Creative | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishedId, setPublishedId] = useState<string | null>(null);
  const [publishError, setPublishError] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (platform) params.set('platform', platform);
      if (status) params.set('status', status);
      const res = await apiGet<{ success: boolean; data: Creative[] }>(`/studio/biblioteca?${params}`);
      setCreatives(res?.data ?? []);
    } finally {
      setLoading(false);
    }
  }, [platform, status]);

  useEffect(() => { load(); }, [load]);

  const handlePublishMeta = async (creative: Creative) => {
    const clientId = typeof window !== 'undefined'
      ? window.localStorage.getItem('edro_active_client_id')
      : null;
    if (!clientId || !creative.image_url) return;
    setPublishing(true);
    setPublishError('');
    try {
      const caption = [creative.copy_title, creative.copy_body, creative.copy_cta, creative.copy_legenda]
        .filter(Boolean).join('\n\n');
      await apiPost('/studio/creative/publish-meta', {
        client_id: clientId,
        image_url: creative.image_url,
        caption,
        briefing_id: creative.briefing_id || undefined,
        creative_id: creative.id,
      });
      setPublishedId(creative.id);
      setCreatives((prev) =>
        prev.map((c) => c.id === creative.id ? { ...c, status: 'published' } : c)
      );
      if (selected?.id === creative.id) setSelected({ ...creative, status: 'published' });
    } catch (e: any) {
      setPublishError(e?.message || 'Erro ao publicar no Meta.');
    } finally {
      setPublishing(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      await apiDelete(`/studio/biblioteca/${id}`);
      setCreatives((prev) => prev.filter((c) => c.id !== id));
      if (selected?.id === id) setSelected(null);
    } finally {
      setDeleting(null);
    }
  };

  const handleDownload = (url: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = 'edro-creative.png';
    a.target = '_blank';
    a.click();
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <IconPhoto size={22} color="#5D87FF" />
          <Typography variant="h5" fontWeight={700}>Biblioteca de Peças</Typography>
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center">
          {/* Platform filter */}
          <Select
            size="small"
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            displayEmpty
            sx={{ fontSize: '0.8rem', minWidth: 130 }}
          >
            <MenuItem value="">Todas plataformas</MenuItem>
            {['instagram', 'linkedin', 'facebook', 'twitter', 'tiktok'].map((p) => (
              <MenuItem key={p} value={p} sx={{ textTransform: 'capitalize' }}>{p}</MenuItem>
            ))}
          </Select>
          {/* Status filter */}
          <Select
            size="small"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            displayEmpty
            sx={{ fontSize: '0.8rem', minWidth: 120 }}
          >
            <MenuItem value="">Todos status</MenuItem>
            <MenuItem value="draft">Rascunho</MenuItem>
            <MenuItem value="approved">Aprovado</MenuItem>
            <MenuItem value="published">Publicado</MenuItem>
          </Select>
          <IconButton onClick={load} size="small">
            <IconRefresh size={16} />
          </IconButton>
        </Stack>
      </Stack>

      {/* Grid */}
      {loading ? (
        <Box display="flex" justifyContent="center" py={8}>
          <CircularProgress />
        </Box>
      ) : creatives.length === 0 ? (
        <Box textAlign="center" py={10}>
          <IconPhoto size={40} color="#333" />
          <Typography sx={{ color: 'text.disabled', mt: 1.5 }}>
            Nenhuma peça na biblioteca ainda.
          </Typography>
          <Typography sx={{ color: 'text.disabled', fontSize: '0.8rem', mt: 0.5 }}>
            Exporte uma peça pelo Pipeline para ela aparecer aqui.
          </Typography>
        </Box>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: 2,
          }}
        >
          {creatives.map((c) => (
            <Box
              key={c.id}
              onClick={() => setSelected(c)}
              sx={{
                borderRadius: 2,
                border: '1px solid #1e1e1e',
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'border-color 0.15s',
                '&:hover': { borderColor: '#5D87FF88' },
              }}
            >
              {/* Image */}
              <Box sx={{ width: '100%', aspectRatio: '1/1', bgcolor: '#111', overflow: 'hidden' }}>
                <img
                  src={c.image_url}
                  alt={c.copy_title || 'creative'}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </Box>
              {/* Meta */}
              <Box sx={{ p: 1 }}>
                {c.copy_title && (
                  <Typography sx={{
                    fontSize: '0.7rem', fontWeight: 600, mb: 0.5,
                    overflow: 'hidden', display: '-webkit-box',
                    WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                  }}>
                    {c.copy_title}
                  </Typography>
                )}
                <Stack direction="row" spacing={0.5} flexWrap="wrap" gap={0.4}>
                  {c.platform && (
                    <Chip
                      label={c.platform}
                      size="small"
                      sx={{
                        height: 16, fontSize: '0.58rem',
                        bgcolor: `${PLATFORM_COLORS[c.platform] ?? '#555'}22`,
                        color: PLATFORM_COLORS[c.platform] ?? '#aaa',
                        border: `1px solid ${PLATFORM_COLORS[c.platform] ?? '#555'}44`,
                      }}
                    />
                  )}
                  {c.trigger_id && (
                    <Chip label={c.trigger_id} size="small"
                      sx={{ height: 16, fontSize: '0.58rem', bgcolor: '#E8521922', color: '#E85219' }} />
                  )}
                  <Chip
                    label={STATUS_CHIP[c.status]?.label ?? c.status}
                    size="small"
                    sx={{ height: 16, fontSize: '0.58rem', color: STATUS_CHIP[c.status]?.color ?? '#888' }}
                  />
                </Stack>
              </Box>
            </Box>
          ))}
        </Box>
      )}

      {/* Detail modal */}
      <Dialog
        open={!!selected}
        onClose={() => { setSelected(null); setPublishedId(null); setPublishError(''); }}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { bgcolor: '#0f0f0f', border: '1px solid #1e1e1e', borderRadius: 3 } }}
      >
        {selected && (
          <>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 0 }}>
              <Typography fontWeight={700} fontSize="1rem">
                {selected.recipe_name || selected.copy_title || 'Peça criativa'}
              </Typography>
              <IconButton onClick={() => setSelected(null)} size="small">
                <IconX size={16} />
              </IconButton>
            </DialogTitle>
            <DialogContent>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} mt={1}>
                {/* Image */}
                <Box sx={{ flexShrink: 0, width: { xs: '100%', sm: 280 } }}>
                  <Box sx={{ borderRadius: 2, overflow: 'hidden', border: '1px solid #1e1e1e' }}>
                    <img
                      src={selected.image_url}
                      alt={selected.copy_title || 'creative'}
                      style={{ width: '100%', display: 'block', objectFit: 'cover' }}
                    />
                  </Box>
                  {/* Chips */}
                  <Stack direction="row" spacing={0.75} flexWrap="wrap" gap={0.5} mt={1.5}>
                    {selected.platform && (
                      <Chip label={selected.platform} size="small"
                        sx={{ bgcolor: `${PLATFORM_COLORS[selected.platform] ?? '#555'}22`, color: PLATFORM_COLORS[selected.platform] ?? '#aaa' }} />
                    )}
                    {selected.format && <Chip label={selected.format} size="small" />}
                    {selected.trigger_id && (
                      <Chip label={selected.trigger_id} size="small"
                        sx={{ bgcolor: '#E8521922', color: '#E85219' }} />
                    )}
                    <Chip
                      label={STATUS_CHIP[selected.status]?.label ?? selected.status}
                      size="small"
                      sx={{ color: STATUS_CHIP[selected.status]?.color ?? '#888' }}
                    />
                  </Stack>
                </Box>

                {/* Copy + actions */}
                <Stack flex={1} spacing={2}>
                  {selected.copy_title && (
                    <Box>
                      <Typography sx={{ fontSize: '0.65rem', color: '#888', textTransform: 'uppercase', mb: 0.5 }}>Título</Typography>
                      <Typography sx={{ fontSize: '0.9rem', fontWeight: 700 }}>{selected.copy_title}</Typography>
                    </Box>
                  )}
                  {selected.copy_body && (
                    <Box>
                      <Typography sx={{ fontSize: '0.65rem', color: '#888', textTransform: 'uppercase', mb: 0.5 }}>Corpo</Typography>
                      <Typography sx={{ fontSize: '0.82rem', lineHeight: 1.6, color: 'text.secondary' }}>{selected.copy_body}</Typography>
                    </Box>
                  )}
                  {selected.copy_cta && (
                    <Box>
                      <Typography sx={{ fontSize: '0.65rem', color: '#888', textTransform: 'uppercase', mb: 0.5 }}>CTA</Typography>
                      <Typography sx={{ fontSize: '0.82rem', fontWeight: 600 }}>{selected.copy_cta}</Typography>
                    </Box>
                  )}
                  {selected.copy_legenda && (
                    <Box>
                      <Typography sx={{ fontSize: '0.65rem', color: '#888', textTransform: 'uppercase', mb: 0.5 }}>Legenda</Typography>
                      <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary', whiteSpace: 'pre-wrap' }}>{selected.copy_legenda}</Typography>
                    </Box>
                  )}

                  <Divider sx={{ borderColor: '#1e1e1e' }} />

                  {/* Actions */}
                  <Stack spacing={1}>
                    {/* Pipeline link */}
                    {selected.briefing_id && (
                      <Button
                        variant="outlined" size="small" fullWidth
                        component="a"
                        href={buildStudioHref(`/studio/pipeline/${selected.briefing_id}`, searchParams)}
                        startIcon={<IconExternalLink size={14} />}
                        sx={{ textTransform: 'none', fontSize: '0.78rem', borderColor: '#5D87FF66', color: '#5D87FF',
                          '&:hover': { borderColor: '#5D87FF', bgcolor: 'rgba(93,135,255,0.06)' } }}
                      >
                        Reutilizar Pipeline
                      </Button>
                    )}

                    {/* Download */}
                    <Button
                      variant="outlined" size="small" fullWidth
                      onClick={() => handleDownload(selected.image_url)}
                      startIcon={<IconDownload size={14} />}
                      sx={{ textTransform: 'none', fontSize: '0.78rem', borderColor: '#13DEB966', color: '#13DEB9',
                        '&:hover': { borderColor: '#13DEB9', bgcolor: 'rgba(19,222,185,0.06)' } }}
                    >
                      Download
                    </Button>

                    {/* Publish Meta */}
                    {selected.status !== 'published' && publishedId !== selected.id ? (
                      <Stack spacing={0.5}>
                        {publishError && (
                          <Typography sx={{ fontSize: '0.68rem', color: '#FF4D4D' }}>{publishError}</Typography>
                        )}
                        <Button
                          variant="outlined" size="small" fullWidth
                          onClick={() => handlePublishMeta(selected)}
                          disabled={publishing}
                          startIcon={publishing
                            ? <CircularProgress size={13} sx={{ color: '#1877F2' }} />
                            : <IconBrandInstagram size={14} />}
                          sx={{ textTransform: 'none', fontSize: '0.78rem', borderColor: '#1877F266', color: '#1877F2',
                            '&:hover': { borderColor: '#1877F2', bgcolor: 'rgba(24,119,242,0.06)' },
                            '&.Mui-disabled': { borderColor: '#333', color: '#555' } }}
                        >
                          {publishing ? 'Publicando…' : 'Publicar no Meta'}
                        </Button>
                      </Stack>
                    ) : (
                      <Stack direction="row" spacing={0.75} alignItems="center" justifyContent="center">
                        <IconCheck size={14} color="#1877F2" />
                        <Typography sx={{ fontSize: '0.75rem', color: '#1877F2' }}>Publicado no Meta</Typography>
                      </Stack>
                    )}

                    {/* Delete */}
                    <Tooltip title="Excluir da biblioteca">
                      <span>
                        <Button
                          variant="text" size="small" fullWidth
                          onClick={() => handleDelete(selected.id)}
                          disabled={deleting === selected.id}
                          startIcon={deleting === selected.id
                            ? <CircularProgress size={13} sx={{ color: '#FF4D4D' }} />
                            : <IconTrash size={14} />}
                          sx={{ textTransform: 'none', fontSize: '0.75rem', color: '#FF4D4D55',
                            '&:hover': { color: '#FF4D4D', bgcolor: 'rgba(255,77,77,0.06)' } }}
                        >
                          Excluir
                        </Button>
                      </span>
                    </Tooltip>
                  </Stack>
                </Stack>
              </Stack>
            </DialogContent>
          </>
        )}
      </Dialog>
    </Box>
  );
}
