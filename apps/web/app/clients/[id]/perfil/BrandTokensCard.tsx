'use client';

import { useRef, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Collapse from '@mui/material/Collapse';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import {
  IconBrandFacebook, IconBrandInstagram, IconBrandLinkedin,
  IconBrandTiktok, IconBrandX, IconBrandYoutube,
  IconChevronDown, IconChevronUp, IconDeviceFloppy,
  IconFileTypePdf, IconPhoto, IconPlus, IconTrash, IconUpload,
  IconWand, IconWorld, IconX,
} from '@tabler/icons-react';
import { apiPatch, apiPost } from '@/lib/api';

type BrandTokens = {
  typography?: string;
  imageStyle?: string;
  moodWords?: string[];
  avoidElements?: string[];
  referenceStyles?: string[];
  logoUrl?: string;
  guidelinesUrl?: string;
  referenceImages?: string[];
};

type SocialProfiles = {
  instagram?: string;
  facebook?: string;
  linkedin?: string;
  tiktok?: string;
  youtube?: string;
  x?: string;
  other?: string;
};

type Props = {
  clientId: string;
  initialTokens?: BrandTokens | null;
  initialWebsite?: string;
  initialSocialProfiles?: SocialProfiles;
  onSaved?: (tokens: BrandTokens) => void;
};

// ── ChipListField ─────────────────────────────────────────────────────────────
function ChipListField({ label, placeholder, items, onChange }: {
  label: string; placeholder: string; items: string[]; onChange: (items: string[]) => void;
}) {
  const [input, setInput] = useState('');
  const add = () => {
    const val = input.trim();
    if (!val || items.includes(val)) { setInput(''); return; }
    onChange([...items, val]);
    setInput('');
  };
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>{label}</Typography>
      {items.length > 0 && (
        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mb: 0.75 }}>
          {items.map((item) => (
            <Chip key={item} label={item} size="small"
              onDelete={() => onChange(items.filter((i) => i !== item))}
              deleteIcon={<IconX size={12} />}
              sx={{ fontSize: '0.72rem' }} />
          ))}
        </Stack>
      )}
      <Stack direction="row" spacing={0.75} alignItems="center">
        <TextField size="small" placeholder={placeholder} value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          sx={{ flex: 1, '& .MuiInputBase-input': { fontSize: '0.8rem', py: 0.75 } }} />
        <Tooltip title="Adicionar">
          <IconButton size="small" onClick={add} sx={{ border: '1px solid rgba(0,0,0,0.15)' }}>
            <IconPlus size={15} />
          </IconButton>
        </Tooltip>
      </Stack>
    </Box>
  );
}

// ── FileUploadField ───────────────────────────────────────────────────────────
function FileUploadField({ clientId, assetType, label, accept, currentUrl, onUploaded, onRemove, icon }: {
  clientId: string;
  assetType: 'logo' | 'reference_image' | 'guidelines';
  label: string;
  accept: string;
  currentUrl?: string;
  onUploaded: (url: string) => void;
  onRemove: () => void;
  icon: React.ReactNode;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (e.target) e.target.value = '';
    setUploading(true);
    setError('');
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('assetType', assetType);
      const res = await fetch(`/api/clients/${clientId}/brand-assets/upload`, {
        method: 'POST',
        body: form,
        credentials: 'include',
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      onUploaded(data.url);
    } catch (err: any) {
      setError(err?.message || 'Falha no upload');
    } finally {
      setUploading(false);
    }
  };

  const isImage = accept.includes('image');
  const isPdf = accept.includes('pdf');

  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>{label}</Typography>
      <Box
        component="input" type="file" accept={accept} ref={inputRef}
        onChange={handleUpload} sx={{ display: 'none' }}
        aria-label={`Upload ${label}`}
      />
      {currentUrl ? (
        <Stack direction="row" spacing={1} alignItems="center">
          {isImage && (
            <Box sx={{ width: 64, height: 64, borderRadius: 1, overflow: 'hidden', border: '1px solid', borderColor: 'divider', flexShrink: 0 }}>
              <Box component="img" src={currentUrl} alt={label} sx={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
            </Box>
          )}
          {isPdf && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
              <IconFileTypePdf size={24} color="#dc2626" />
              <Typography variant="caption" sx={{ fontSize: '0.72rem', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {currentUrl.split('/').pop()?.split('%').pop() || 'arquivo.pdf'}
              </Typography>
            </Box>
          )}
          <Stack spacing={0.5}>
            <Button size="small" variant="outlined" startIcon={<IconUpload size={13} />}
              onClick={() => inputRef.current?.click()} disabled={uploading}
              sx={{ fontSize: '0.7rem' }}>
              Trocar
            </Button>
            <Button size="small" color="error" startIcon={<IconTrash size={13} />}
              onClick={onRemove} sx={{ fontSize: '0.7rem' }}>
              Remover
            </Button>
          </Stack>
        </Stack>
      ) : (
        <Button size="small" variant="outlined" color="secondary"
          startIcon={uploading ? <CircularProgress size={13} /> : icon}
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          sx={{ fontSize: '0.72rem' }}>
          {uploading ? 'Enviando...' : `Upload ${label}`}
        </Button>
      )}
      {error && <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.5, fontSize: '0.7rem' }}>{error}</Typography>}
    </Box>
  );
}

// ── ReferenceImagesField ──────────────────────────────────────────────────────
function ReferenceImagesField({ clientId, images, onChange }: {
  clientId: string; images: string[]; onChange: (images: string[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    if (e.target) e.target.value = '';
    setUploading(true);
    setError('');
    try {
      const urls: string[] = [];
      for (const file of files.slice(0, 6)) {
        const form = new FormData();
        form.append('file', file);
        form.append('assetType', 'reference_image');
        const res = await fetch(`/api/clients/${clientId}/brand-assets/upload`, {
          method: 'POST', body: form, credentials: 'include',
        });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        urls.push(data.url);
      }
      onChange([...images, ...urls].slice(0, 12));
    } catch (err: any) {
      setError(err?.message || 'Falha no upload');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.75 }}>
        <Typography variant="caption" color="text.secondary">Imagens de referência (IP-Adapter)</Typography>
        <Button size="small" variant="outlined" color="secondary"
          startIcon={uploading ? <CircularProgress size={12} /> : <IconUpload size={13} />}
          onClick={() => inputRef.current?.click()}
          disabled={uploading || images.length >= 12}
          sx={{ fontSize: '0.68rem', py: 0.25 }}>
          {uploading ? 'Enviando...' : '+ Adicionar'}
        </Button>
      </Stack>
      <Box component="input" type="file" accept="image/jpeg,image/png,image/webp"
        multiple ref={inputRef} onChange={handleUpload} sx={{ display: 'none' }}
        aria-label="Upload imagens de referência" />
      {images.length > 0 && (
        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
          {images.map((url, i) => (
            <Box key={i} sx={{ position: 'relative', width: 72, height: 72, borderRadius: 1, overflow: 'hidden', border: '1px solid', borderColor: 'divider', flexShrink: 0, '&:hover .del-btn': { opacity: 1 } }}>
              <Box component="img" src={url} alt={`Ref ${i + 1}`} sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              <IconButton className="del-btn" size="small"
                onClick={() => onChange(images.filter((_, j) => j !== i))}
                sx={{ opacity: 0, position: 'absolute', top: 2, right: 2, width: 18, height: 18, bgcolor: 'rgba(0,0,0,0.65)', color: 'white', transition: 'opacity 0.15s', '&:hover': { bgcolor: 'rgba(220,38,38,0.85)' } }}>
                <IconX size={10} />
              </IconButton>
            </Box>
          ))}
        </Stack>
      )}
      {images.length === 0 && (
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.72rem' }}>
          Fotos de campanhas anteriores usadas como guia visual no Art AI
        </Typography>
      )}
      {error && <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.5, fontSize: '0.7rem' }}>{error}</Typography>}
    </Box>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
const SOCIAL_KEYS = ['instagram', 'facebook', 'linkedin', 'tiktok', 'youtube', 'x'] as const;
const SOCIAL_ICONS: Record<string, React.ReactNode> = {
  instagram: <IconBrandInstagram size={14} />,
  facebook: <IconBrandFacebook size={14} />,
  linkedin: <IconBrandLinkedin size={14} />,
  tiktok: <IconBrandTiktok size={14} />,
  youtube: <IconBrandYoutube size={14} />,
  x: <IconBrandX size={14} />,
};
const SOCIAL_LABELS: Record<string, string> = {
  instagram: 'Instagram', facebook: 'Facebook', linkedin: 'LinkedIn',
  tiktok: 'TikTok', youtube: 'YouTube', x: 'X (Twitter)',
};

export default function BrandTokensCard({ clientId, initialTokens, initialWebsite = '', initialSocialProfiles = {}, onSaved }: Props) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState(0);

  const [tokens, setTokens] = useState<BrandTokens>({
    typography: initialTokens?.typography || '',
    imageStyle: initialTokens?.imageStyle || '',
    moodWords: initialTokens?.moodWords || [],
    avoidElements: initialTokens?.avoidElements || [],
    referenceStyles: initialTokens?.referenceStyles || [],
    logoUrl: initialTokens?.logoUrl || '',
    guidelinesUrl: initialTokens?.guidelinesUrl || '',
    referenceImages: initialTokens?.referenceImages || [],
  });

  const [website, setWebsite] = useState(initialWebsite);
  const [socials, setSocials] = useState<Record<string, string>>(initialSocialProfiles as Record<string, string>);

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const hasTokens = Boolean(
    tokens.typography || tokens.imageStyle || tokens.logoUrl ||
    tokens.moodWords?.length || tokens.avoidElements?.length ||
    tokens.referenceStyles?.length || tokens.referenceImages?.length
  );

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      // Save brand_tokens + knowledge_base (website + socials) in one patch
      const currentClient = await fetch(`/api/clients/${clientId}`, { credentials: 'include' })
        .then((r) => r.json()).catch(() => ({}));
      const currentKb = currentClient?.client?.profile?.knowledge_base || currentClient?.profile?.knowledge_base || {};
      await apiPatch(`/clients/${clientId}`, {
        brand_tokens: tokens,
        knowledge_base: { ...currentKb, website, social_profiles: socials },
      });
      setSuccess('Salvo! O Art AI usará essas informações nas próximas gerações.');
      onSaved?.(tokens);
    } catch (e: any) {
      setError(e?.message || 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card variant="outlined">
      <CardContent sx={{ pb: open ? 2 : '12px !important' }}>
        {/* Header */}
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" spacing={1} alignItems="center">
            <IconWand size={16} color="#9c27b0" />
            <Typography variant="subtitle2" fontWeight={700}>Art AI — Brand Identity</Typography>
            {hasTokens && !open && (
              <Chip label="configurado" size="small" color="secondary" sx={{ fontSize: '0.65rem', height: 18 }} />
            )}
          </Stack>
          <Stack direction="row" spacing={0.5} alignItems="center">
            {open && (
              <Button size="small" variant="contained" color="secondary"
                startIcon={saving ? <CircularProgress size={13} color="inherit" /> : <IconDeviceFloppy size={13} />}
                onClick={handleSave} disabled={saving} sx={{ fontSize: '0.72rem' }}>
                Salvar tudo
              </Button>
            )}
            <IconButton size="small" onClick={() => setOpen((v) => !v)}>
              {open ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
            </IconButton>
          </Stack>
        </Stack>

        {!open && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
            {hasTokens
              ? [tokens.logoUrl && 'logo', tokens.referenceImages?.length && `${tokens.referenceImages.length} refs`, tokens.typography && 'tipografia', (tokens.moodWords?.length || 0) > 0 && `${tokens.moodWords!.length} moods`].filter(Boolean).join(' · ')
              : 'Logo, referências visuais, tokens de IA, site e redes sociais para o Art Director'}
          </Typography>
        )}

        <Collapse in={open} unmountOnExit>
          <Divider sx={{ my: 1.5 }} />

          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, minHeight: 36, '& .MuiTab-root': { minHeight: 36, fontSize: '0.75rem', py: 0.5 } }}>
            <Tab label="Assets" />
            <Tab label="Online" />
            <Tab label="Tokens IA" />
          </Tabs>

          {/* Tab 0 — Assets visuais */}
          {tab === 0 && (
            <Stack spacing={2.5}>
              <FileUploadField
                clientId={clientId} assetType="logo" label="Logo da Marca"
                accept="image/png,image/svg+xml,image/webp,image/jpeg"
                currentUrl={tokens.logoUrl} icon={<IconPhoto size={13} />}
                onUploaded={(url) => setTokens((t) => ({ ...t, logoUrl: url }))}
                onRemove={() => setTokens((t) => ({ ...t, logoUrl: '' }))}
              />
              <Divider />
              <ReferenceImagesField
                clientId={clientId}
                images={tokens.referenceImages || []}
                onChange={(imgs) => setTokens((t) => ({ ...t, referenceImages: imgs }))}
              />
              <Divider />
              <FileUploadField
                clientId={clientId} assetType="guidelines" label="Manual de Marca (PDF)"
                accept="application/pdf"
                currentUrl={tokens.guidelinesUrl} icon={<IconFileTypePdf size={13} />}
                onUploaded={(url) => setTokens((t) => ({ ...t, guidelinesUrl: url }))}
                onRemove={() => setTokens((t) => ({ ...t, guidelinesUrl: '' }))}
              />
            </Stack>
          )}

          {/* Tab 1 — Online */}
          {tab === 1 && (
            <Stack spacing={1.5}>
              <Stack direction="row" spacing={1} alignItems="center">
                <IconWorld size={16} color="#64748b" />
                <TextField fullWidth size="small" label="Site" placeholder="https://exemplo.com.br"
                  value={website} onChange={(e) => setWebsite(e.target.value)} />
              </Stack>
              <Divider />
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Redes Sociais</Typography>
              {SOCIAL_KEYS.map((key) => (
                <Stack key={key} direction="row" spacing={1} alignItems="center">
                  <Box sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center' }}>
                    {SOCIAL_ICONS[key]}
                  </Box>
                  <TextField fullWidth size="small" label={SOCIAL_LABELS[key]}
                    placeholder={key === 'instagram' ? '@perfil' : 'URL ou @handle'}
                    value={socials[key] || ''}
                    onChange={(e) => setSocials((s) => ({ ...s, [key]: e.target.value }))} />
                </Stack>
              ))}
            </Stack>
          )}

          {/* Tab 2 — Tokens de IA */}
          {tab === 2 && (
            <Stack spacing={2}>
              <TextField fullWidth size="small" label="Tipografia"
                placeholder="Ex: sans-serif moderno, limpo, sem serifas"
                value={tokens.typography || ''}
                onChange={(e) => setTokens((t) => ({ ...t, typography: e.target.value }))}
                helperText="Descreva o estilo tipográfico da marca" />
              <TextField fullWidth size="small" label="Estilo visual / Fotografia"
                placeholder="Ex: fotografia real, cinematic, high contrast, luz natural"
                value={tokens.imageStyle || ''}
                onChange={(e) => setTokens((t) => ({ ...t, imageStyle: e.target.value }))}
                helperText="Guia o estilo das imagens geradas pelo Flux" />
              <ChipListField label="Palavras de mood" placeholder="Ex: confiança, agilidade, premium"
                items={tokens.moodWords || []}
                onChange={(items) => setTokens((t) => ({ ...t, moodWords: items }))} />
              <ChipListField label="Evitar elementos" placeholder="Ex: CGI exagerado, sorrisos forçados"
                items={tokens.avoidElements || []}
                onChange={(items) => setTokens((t) => ({ ...t, avoidElements: items }))} />
              <ChipListField label="Estilos de referência" placeholder="Ex: Apple 2024, Nubank, minimalismo"
                items={tokens.referenceStyles || []}
                onChange={(items) => setTokens((t) => ({ ...t, referenceStyles: items }))} />
            </Stack>
          )}

          {success && <Alert severity="success" sx={{ mt: 2, py: 0.5, fontSize: 12 }}>{success}</Alert>}
          {error && <Alert severity="error" sx={{ mt: 2, py: 0.5, fontSize: 12 }}>{error}</Alert>}
        </Collapse>
      </CardContent>
    </Card>
  );
}
