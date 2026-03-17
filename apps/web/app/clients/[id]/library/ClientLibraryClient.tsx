'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { apiGet, apiPost, buildApiUrl } from '@/lib/api';
import { useConfirm } from '@/hooks/useConfirm';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import {
  IconBrandInstagram,
  IconBrush,
  IconCheck,
  IconExternalLink,
  IconFile,
  IconFileDownload,
  IconFileTypePdf,
  IconFileUpload,
  IconLink,
  IconMusic,
  IconPhoto,
  IconPresentation,
  IconRefresh,
  IconSparkles,
  IconTable,
  IconTrash,
  IconVideo,
  IconWand,
  IconWorld,
  IconX,
  IconFileText,
} from '@tabler/icons-react';

// ── Types ──────────────────────────────────────────────────────────────────────

type LibraryItem = {
  id: string;
  type: string;
  title: string;
  category: string;
  tags?: string[];
  created_at?: string;
  file_size?: number;
  file_size_bytes?: number;
  source_url?: string;
  file_mime?: string;
};

type AssetSlot = {
  key: string;
  label: string;
  description: string;
  formats: string;
  dimensions: string;
  maxSize: string;
  accept: string;
  category: string;
  subcategory?: string;
  icon: typeof IconFile;
  color: string;
  aiNote?: string;
};

// ── Asset slot definitions with format/size guidance ──────────────────────────

const IDENTITY_SLOTS: AssetSlot[] = [
  {
    key: 'logo',
    label: 'Logo principal',
    description: 'Fundo transparente para overlay nos layouts',
    formats: 'PNG · SVG',
    dimensions: 'mín 500×500px · ideal 1000×1000px',
    maxSize: '5 MB',
    accept: 'image/png,image/svg+xml',
    category: 'brand_identity',
    subcategory: 'logo',
    icon: IconBrush,
    color: '#5D87FF',
    aiNote: 'Usado como overlay nos layouts gerados pelo Canvas',
  },
  {
    key: 'logo_dark',
    label: 'Logo versão escura',
    description: 'Para fundos claros ou fundos neutros',
    formats: 'PNG · SVG',
    dimensions: 'mín 500×500px · ideal 1000×1000px',
    maxSize: '5 MB',
    accept: 'image/png,image/svg+xml',
    category: 'brand_identity',
    subcategory: 'logo_dark',
    icon: IconBrush,
    color: '#5D87FF',
  },
  {
    key: 'brandbook',
    label: 'Brandbook / Manual de VI',
    description: 'A IA extrai cores, tipografia e regras automáticamente',
    formats: 'PDF',
    dimensions: 'Qualquer resolução',
    maxSize: '50 MB',
    accept: 'application/pdf',
    category: 'brand_identity',
    subcategory: 'brandbook',
    icon: IconFileTypePdf,
    color: '#e53935',
    aiNote: 'Processado pela IA para extrair identidade visual',
  },
];

const PHOTO_SLOTS: AssetSlot[] = [
  {
    key: 'product_photo',
    label: 'Fotos de produto',
    description: 'Fundo branco ou neutro, objeto centralizado',
    formats: 'JPG · PNG',
    dimensions: 'mín 512×512px · ideal 1024×1024px · proporção 1:1',
    maxSize: '10 MB por foto',
    accept: 'image/jpeg,image/png,image/webp',
    category: 'photography',
    subcategory: 'product',
    icon: IconPhoto,
    color: '#7b1fa2',
    aiNote: 'Usadas como referência visual nas gerações do Canvas',
  },
  {
    key: 'brand_photo',
    label: 'Fotos de campanha aprovadas',
    description: 'Fotos já publicadas ou aprovadas pelo cliente',
    formats: 'JPG · PNG',
    dimensions: 'mín 512×512px · ideal 1080×1080px',
    maxSize: '10 MB por foto',
    accept: 'image/jpeg,image/png,image/webp',
    category: 'photography',
    subcategory: 'brand',
    icon: IconPhoto,
    color: '#7b1fa2',
    aiNote: '10+ fotos habilitam o treinamento de LoRA da marca',
  },
];

const OTHER_SLOTS: AssetSlot[] = [
  {
    key: 'social_template',
    label: 'Templates de social media',
    description: 'Layouts aprovados, referências de estilo',
    formats: 'JPG · PNG · PDF · PSD · AI',
    dimensions: '1080×1080px (Feed) · 1080×1920px (Stories) · 1200×628px (LinkedIn)',
    maxSize: '20 MB',
    accept: 'image/jpeg,image/png,application/pdf',
    category: 'social_templates',
    subcategory: 'template',
    icon: IconPresentation,
    color: '#d24726',
  },
  {
    key: 'font',
    label: 'Fontes da marca',
    description: 'Tipografia oficial do cliente',
    formats: 'TTF · OTF · WOFF · WOFF2',
    dimensions: 'N/A',
    maxSize: '10 MB',
    accept: '.ttf,.otf,.woff,.woff2',
    category: 'brand_identity',
    subcategory: 'font',
    icon: IconFileText,
    color: '#2b579a',
  },
];

// ── Format/size spec badge ─────────────────────────────────────────────────────

function SpecBadge({ formats, dimensions, maxSize }: { formats: string; dimensions: string; maxSize: string }) {
  return (
    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
      <Chip size="small" label={formats} sx={{ bgcolor: '#f5f5f5', fontSize: '0.68rem', height: 20 }} />
      <Chip size="small" label={dimensions} sx={{ bgcolor: '#f0f4ff', color: '#3f5bd5', fontSize: '0.68rem', height: 20 }} />
      <Chip size="small" label={`máx ${maxSize}`} sx={{ bgcolor: '#fff8e1', color: '#b45309', fontSize: '0.68rem', height: 20 }} />
    </Stack>
  );
}

// ── Single asset upload slot ───────────────────────────────────────────────────

function AssetSlotCard({
  slot,
  items,
  clientId,
  onUploaded,
  onDeleted,
  token,
}: {
  slot: AssetSlot;
  items: LibraryItem[];
  clientId: string;
  onUploaded: () => void;
  onDeleted: (id: string) => void;
  token: string | null;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const matchingItems = items.filter(
    (i) => i.category === slot.category && (i.tags ?? []).includes(slot.subcategory ?? '')
  );
  const hasItems = matchingItems.length > 0;

  const handleFile = async (file: File) => {
    if (!token) return;
    setUploading(true);
    setError('');
    const form = new FormData();
    form.append('file', file);
    const qs = `category=${slot.category}${slot.subcategory ? `&subcategory=${slot.subcategory}` : ''}`;
    try {
      const res = await fetch(buildApiUrl(`/clients/${clientId}/library/upload?${qs}`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      if (!res.ok) throw new Error('Falha ao enviar');
      onUploaded();
    } catch (e: any) {
      setError(e?.message || 'Erro no upload');
    } finally {
      setUploading(false);
    }
  };

  const Icon = slot.icon;

  return (
    <Card variant="outlined" sx={{ borderColor: hasItems ? '#c8e6c9' : undefined }}>
      <CardContent sx={{ pb: '12px !important' }}>
        <Stack spacing={1.5}>
          <Stack direction="row" spacing={1.5} alignItems="flex-start">
            <Avatar sx={{ width: 36, height: 36, bgcolor: `${slot.color}15` }}>
              <Icon size={18} color={slot.color} />
            </Avatar>
            <Box flex={1} minWidth={0}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="subtitle2">{slot.label}</Typography>
                {hasItems && (
                  <Chip
                    size="small"
                    icon={<IconCheck size={11} />}
                    label={`${matchingItems.length}`}
                    color="success"
                    sx={{ height: 18, fontSize: '0.65rem' }}
                  />
                )}
              </Stack>
              <Typography variant="caption" color="text.secondary">{slot.description}</Typography>
            </Box>
          </Stack>

          <SpecBadge formats={slot.formats} dimensions={slot.dimensions} maxSize={slot.maxSize} />

          {slot.aiNote && (
            <Stack direction="row" spacing={0.5} alignItems="center">
              <IconSparkles size={11} color="#5D87FF" />
              <Typography variant="caption" sx={{ color: '#5D87FF', fontSize: '0.65rem' }}>
                {slot.aiNote}
              </Typography>
            </Stack>
          )}

          {error && <Typography variant="caption" color="error">{error}</Typography>}

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Button
              size="small"
              variant={hasItems ? 'outlined' : 'contained'}
              startIcon={uploading ? <CircularProgress size={12} /> : <IconFileUpload size={14} />}
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
              sx={{ fontSize: '0.72rem' }}
            >
              {uploading ? 'Enviando...' : hasItems ? 'Adicionar' : 'Fazer upload'}
            </Button>
            <input
              ref={fileRef}
              type="file"
              hidden
              accept={slot.accept}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
            />
            {matchingItems.map((item) => (
              <Chip
                key={item.id}
                size="small"
                label={item.title.length > 22 ? item.title.slice(0, 20) + '…' : item.title}
                onDelete={() => onDeleted(item.id)}
                deleteIcon={<IconX size={12} />}
                sx={{ fontSize: '0.68rem', maxWidth: 200 }}
              />
            ))}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}

// ── Photo grid section (product / brand photos) ───────────────────────────────

function PhotoGridSection({
  slot,
  items,
  clientId,
  onUploaded,
  onDeleted,
  token,
}: {
  slot: AssetSlot;
  items: LibraryItem[];
  clientId: string;
  onUploaded: () => void;
  onDeleted: (id: string) => void;
  token: string | null;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const matchingItems = items.filter(
    (i) => i.category === slot.category && (i.tags ?? []).includes(slot.subcategory ?? '')
  );
  const count = matchingItems.length;
  const LORA_THRESHOLD = 10;
  const isBrandSlot = slot.subcategory === 'brand';
  const loraReady = isBrandSlot && count >= LORA_THRESHOLD;

  const handleFiles = async (files: FileList) => {
    if (!token) return;
    setUploading(true);
    setError('');
    const qs = `category=${slot.category}&subcategory=${slot.subcategory}`;
    for (const file of Array.from(files)) {
      const form = new FormData();
      form.append('file', file);
      try {
        await fetch(buildApiUrl(`/clients/${clientId}/library/upload?${qs}`), {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: form,
        });
      } catch { /* non-fatal, continue */ }
    }
    setUploading(false);
    onUploaded();
  };

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={2}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
            <Box>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="subtitle2">{slot.label}</Typography>
                <Chip
                  size="small"
                  label={`${count} foto${count !== 1 ? 's' : ''}`}
                  color={isBrandSlot && count < LORA_THRESHOLD ? 'warning' : 'default'}
                  sx={{ height: 18, fontSize: '0.65rem' }}
                />
                {loraReady && (
                  <Chip
                    size="small"
                    icon={<IconWand size={11} />}
                    label="Pronto para LoRA"
                    color="success"
                    sx={{ height: 18, fontSize: '0.65rem' }}
                  />
                )}
              </Stack>
              <Typography variant="caption" color="text.secondary">{slot.description}</Typography>
            </Box>
            <Button
              size="small"
              variant="outlined"
              startIcon={uploading ? <CircularProgress size={12} /> : <IconFileUpload size={14} />}
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
              sx={{ fontSize: '0.72rem', flexShrink: 0 }}
            >
              {uploading ? 'Enviando...' : 'Upload múltiplo'}
            </Button>
            <input
              ref={fileRef}
              type="file"
              hidden
              accept={slot.accept}
              multiple
              onChange={(e) => { if (e.target.files?.length) handleFiles(e.target.files); e.target.value = ''; }}
            />
          </Stack>

          <SpecBadge formats={slot.formats} dimensions={slot.dimensions} maxSize={slot.maxSize} />

          {slot.aiNote && (
            <Stack direction="row" spacing={0.5} alignItems="center">
              <IconSparkles size={11} color="#5D87FF" />
              <Typography variant="caption" sx={{ color: '#5D87FF', fontSize: '0.65rem' }}>
                {slot.aiNote}
              </Typography>
            </Stack>
          )}

          {isBrandSlot && (
            <Box>
              <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                <Typography variant="caption" color="text.secondary">
                  {count}/{LORA_THRESHOLD} fotos para treinar LoRA
                </Typography>
                {loraReady && (
                  <Typography variant="caption" sx={{ color: '#2e7d32', fontWeight: 600 }}>
                    LoRA treinável ✓
                  </Typography>
                )}
              </Stack>
              <LinearProgress
                variant="determinate"
                value={Math.min(100, (count / LORA_THRESHOLD) * 100)}
                color={loraReady ? 'success' : 'warning'}
                sx={{ height: 4, borderRadius: 2 }}
              />
            </Box>
          )}

          {error && <Typography variant="caption" color="error">{error}</Typography>}

          {count > 0 && (
            <Grid container spacing={1}>
              {matchingItems.slice(0, 12).map((item) => (
                <Grid key={item.id} size={{ xs: 4, sm: 3, md: 2 }}>
                  <Box
                    sx={{
                      position: 'relative',
                      aspectRatio: '1',
                      borderRadius: 1,
                      overflow: 'hidden',
                      bgcolor: '#f5f5f5',
                      border: '1px solid #e0e0e0',
                      '&:hover .delete-btn': { opacity: 1 },
                    }}
                  >
                    {item.file_mime?.startsWith('image/') ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={buildApiUrl(`/library/${item.id}/file`)}
                        alt={item.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <Stack alignItems="center" justifyContent="center" sx={{ height: '100%' }}>
                        <IconPhoto size={24} color="#bdbdbd" />
                      </Stack>
                    )}
                    <Box
                      className="delete-btn"
                      sx={{
                        position: 'absolute', top: 2, right: 2,
                        opacity: 0, transition: 'opacity 0.15s',
                      }}
                    >
                      <IconButton
                        size="small"
                        onClick={() => onDeleted(item.id)}
                        sx={{ bgcolor: 'rgba(0,0,0,0.6)', color: '#fff', p: 0.25, '&:hover': { bgcolor: '#d32f2f' } }}
                      >
                        <IconX size={12} />
                      </IconButton>
                    </Box>
                  </Box>
                </Grid>
              ))}
              {count > 12 && (
                <Grid size={{ xs: 4, sm: 3, md: 2 }}>
                  <Box sx={{
                    aspectRatio: '1', borderRadius: 1, border: '1px dashed #bdbdbd',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Typography variant="caption" color="text.secondary">+{count - 12} mais</Typography>
                  </Box>
                </Grid>
              )}
            </Grid>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function ClientLibraryClient({ clientId }: { clientId: string }) {
  const confirm = useConfirm();
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [enrichingWeb, setEnrichingWeb] = useState(false);
  const [analyzingInsta, setAnalyzingInsta] = useState(false);
  const [enrichMsg, setEnrichMsg] = useState('');
  const [referenceUrl, setReferenceUrl] = useState('');
  const [addingUrl, setAddingUrl] = useState(false);

  const token = typeof window !== 'undefined' ? localStorage.getItem('edro_token') : null;

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiGet(`/clients/${clientId}/library`);
      setItems(res || []);
    } catch (e: any) {
      setError(e?.message || 'Falha ao carregar biblioteca.');
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: string) => {
    if (!await confirm('Remover este item?')) return;
    if (!token) return;
    try {
      await fetch(buildApiUrl(`/library/${id}`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (e: any) {
      setError(e?.message || 'Falha ao remover.');
    }
  };

  const triggerWebEnrich = async () => {
    setEnrichingWeb(true);
    setEnrichMsg('');
    try {
      await apiPost(`/clients/${clientId}/enrich`, { sections: ['visual', 'identity'], trigger: 'manual' });
      setEnrichMsg('Análise de website iniciada. Pode levar 1-2 minutos.');
    } catch (e: any) {
      setEnrichMsg(e?.message || 'Erro ao iniciar análise.');
    } finally {
      setEnrichingWeb(false);
    }
  };

  const triggerInstagramAnalysis = async () => {
    setAnalyzingInsta(true);
    setEnrichMsg('');
    try {
      await apiPost(`/clients/${clientId}/analyze-visual`, { force: true });
      setEnrichMsg('Análise do Instagram iniciada. Resultado em 1-2 minutos.');
    } catch (e: any) {
      setEnrichMsg(e?.message || 'Erro ao analisar Instagram.');
    } finally {
      setAnalyzingInsta(false);
    }
  };

  const addUrl = async () => {
    if (!referenceUrl.trim()) return;
    setAddingUrl(true);
    try {
      await apiPost(`/clients/${clientId}/library`, {
        type: 'link',
        title: referenceUrl.trim(),
        source_url: referenceUrl.trim(),
        category: 'reference',
        tags: ['external'],
        weight: 'medium',
        use_in_ai: true,
      });
      setReferenceUrl('');
      load();
    } catch (e: any) {
      setError(e?.message || 'Falha ao adicionar link.');
    } finally {
      setAddingUrl(false);
    }
  };

  // counts
  const allPhotos = items.filter((i) => i.category === 'photography');
  const brandPhotos = allPhotos.filter((i) => (i.tags ?? []).includes('brand'));
  const docsCount = items.filter((i) => i.category === 'brand_identity').length;

  if (loading) {
    return (
      <Stack alignItems="center" sx={{ py: 8 }}>
        <CircularProgress size={28} />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Carregando biblioteca...</Typography>
      </Stack>
    );
  }

  return (
    <Stack spacing={3}>
      {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}

      {/* ── SEÇÃO 1: Identidade Visual ──────────────────────────────────────── */}
      <Box>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
          <IconBrush size={18} color="#5D87FF" />
          <Typography variant="h6" sx={{ fontSize: '0.95rem', fontWeight: 700 }}>Identidade Visual</Typography>
          <Chip size="small" label={`${docsCount} arquivo${docsCount !== 1 ? 's' : ''}`} sx={{ height: 18, fontSize: '0.65rem' }} />
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Logo, brandbook e fontes — alimentam diretamente o Canvas ao gerar layouts.
        </Typography>
        <Stack spacing={1.5}>
          {IDENTITY_SLOTS.map((slot) => (
            <AssetSlotCard
              key={slot.key}
              slot={slot}
              items={items}
              clientId={clientId}
              onUploaded={load}
              onDeleted={handleDelete}
              token={token}
            />
          ))}
        </Stack>
      </Box>

      <Divider />

      {/* ── SEÇÃO 2: Fotos para IA Generativa ──────────────────────────────── */}
      <Box>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
          <IconPhoto size={18} color="#7b1fa2" />
          <Typography variant="h6" sx={{ fontSize: '0.95rem', fontWeight: 700 }}>Fotos para IA Generativa</Typography>
          <Chip size="small" label={`${allPhotos.length} foto${allPhotos.length !== 1 ? 's' : ''}`} sx={{ height: 18, fontSize: '0.65rem' }} />
          {brandPhotos.length >= 10 && (
            <Chip size="small" icon={<IconWand size={11} />} label="LoRA disponível" color="success" sx={{ height: 18, fontSize: '0.65rem' }} />
          )}
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Fotos de produto e campanha usadas como referência no Canvas. Com 10+ fotos de campanha, é possível treinar um modelo exclusivo da marca (LoRA).
        </Typography>
        <Stack spacing={1.5}>
          {PHOTO_SLOTS.map((slot) => (
            <PhotoGridSection
              key={slot.key}
              slot={slot}
              items={items}
              clientId={clientId}
              onUploaded={load}
              onDeleted={handleDelete}
              token={token}
            />
          ))}
        </Stack>
      </Box>

      <Divider />

      {/* ── SEÇÃO 3: Buscar automaticamente na web ──────────────────────────── */}
      <Box>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
          <IconWorld size={18} color="#2e7d32" />
          <Typography variant="h6" sx={{ fontSize: '0.95rem', fontWeight: 700 }}>Buscar automaticamente na web</Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          A IA extrai cores, estilo visual e identidade de marca diretamente do website e redes sociais.
        </Typography>
        <Card variant="outlined">
          <CardContent>
            <Stack spacing={2}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <Button
                  variant="outlined"
                  startIcon={enrichingWeb ? <CircularProgress size={14} /> : <IconWorld size={16} />}
                  disabled={enrichingWeb}
                  onClick={triggerWebEnrich}
                  sx={{ flexShrink: 0 }}
                >
                  {enrichingWeb ? 'Analisando...' : 'Analisar website'}
                </Button>
                <Button
                  variant="outlined"
                  startIcon={analyzingInsta ? <CircularProgress size={14} /> : <IconBrandInstagram size={16} />}
                  disabled={analyzingInsta}
                  onClick={triggerInstagramAnalysis}
                  sx={{ flexShrink: 0 }}
                >
                  {analyzingInsta ? 'Analisando...' : 'Analisar Instagram'}
                </Button>
              </Stack>
              <Stack direction="row" spacing={1}>
                <TextField
                  size="small"
                  label="URL de referência adicional"
                  placeholder="https://..."
                  value={referenceUrl}
                  onChange={(e) => setReferenceUrl(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') addUrl(); }}
                  sx={{ flex: 1 }}
                />
                <Button
                  variant="outlined"
                  startIcon={addingUrl ? <CircularProgress size={12} /> : <IconLink size={14} />}
                  disabled={addingUrl || !referenceUrl.trim()}
                  onClick={addUrl}
                >
                  Adicionar
                </Button>
              </Stack>
              {enrichMsg && (
                <Alert severity="info" sx={{ py: 0 }}>{enrichMsg}</Alert>
              )}
            </Stack>
          </CardContent>
        </Card>
      </Box>

      <Divider />

      {/* ── SEÇÃO 4: Templates e outros ─────────────────────────────────────── */}
      <Box>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
          <IconPresentation size={18} color="#d24726" />
          <Typography variant="h6" sx={{ fontSize: '0.95rem', fontWeight: 700 }}>Templates e outros</Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Layouts de referência, fontes e materiais extras.
        </Typography>
        <Stack spacing={1.5}>
          {OTHER_SLOTS.map((slot) => (
            <AssetSlotCard
              key={slot.key}
              slot={slot}
              items={items}
              clientId={clientId}
              onUploaded={load}
              onDeleted={handleDelete}
              token={token}
            />
          ))}
        </Stack>
      </Box>

      {/* ── Outros arquivos da biblioteca (links externos, docs soltos) ─────── */}
      {items.filter((i) => !['brand_identity', 'photography', 'social_templates'].includes(i.category)).length > 0 && (
        <>
          <Divider />
          <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
              <Typography variant="subtitle2" color="text.secondary">Outros itens</Typography>
              <Button size="small" startIcon={<IconRefresh size={14} />} onClick={load}>Atualizar</Button>
            </Stack>
            <Stack spacing={1}>
              {items
                .filter((i) => !['brand_identity', 'photography', 'social_templates'].includes(i.category))
                .map((item) => (
                  <Card key={item.id} variant="outlined">
                    <CardContent sx={{ py: '8px !important' }}>
                      <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                        <Stack direction="row" spacing={1} alignItems="center" minWidth={0}>
                          <IconFile size={16} color="#757575" />
                          <Typography variant="body2" noWrap>{item.title}</Typography>
                          {item.category && (
                            <Chip size="small" label={item.category} variant="outlined" sx={{ fontSize: '0.65rem', height: 18 }} />
                          )}
                        </Stack>
                        <Stack direction="row" spacing={0.5}>
                          {item.type === 'link' && item.source_url ? (
                            <Tooltip title="Abrir link">
                              <IconButton size="small" component="a" href={item.source_url} target="_blank">
                                <IconExternalLink size={14} />
                              </IconButton>
                            </Tooltip>
                          ) : (
                            <Tooltip title="Download">
                              <IconButton
                                size="small"
                                onClick={async () => {
                                  if (!token) return;
                                  const res = await fetch(buildApiUrl(`/library/${item.id}/file`), {
                                    headers: { Authorization: `Bearer ${token}` },
                                  });
                                  const blob = await res.blob();
                                  const url = URL.createObjectURL(blob);
                                  const a = document.createElement('a');
                                  a.href = url; a.download = item.title; a.click();
                                  URL.revokeObjectURL(url);
                                }}
                              >
                                <IconFileDownload size={14} />
                              </IconButton>
                            </Tooltip>
                          )}
                          <Tooltip title="Remover">
                            <IconButton size="small" color="error" onClick={() => handleDelete(item.id)}>
                              <IconTrash size={14} />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
            </Stack>
          </Box>
        </>
      )}
    </Stack>
  );
}
