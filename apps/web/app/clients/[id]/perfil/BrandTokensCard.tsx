'use client';

import { useState } from 'react';
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
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { IconChevronDown, IconChevronUp, IconDeviceFloppy, IconPlus, IconWand, IconX } from '@tabler/icons-react';
import { apiPatch } from '@/lib/api';

type BrandTokens = {
  typography?: string;
  imageStyle?: string;
  moodWords?: string[];
  avoidElements?: string[];
  referenceStyles?: string[];
};

type Props = {
  clientId: string;
  initialTokens?: BrandTokens | null;
  onSaved?: (tokens: BrandTokens) => void;
};

function ChipListField({
  label,
  placeholder,
  items,
  onChange,
}: {
  label: string;
  placeholder: string;
  items: string[];
  onChange: (items: string[]) => void;
}) {
  const [input, setInput] = useState('');

  const add = () => {
    const val = input.trim();
    if (!val || items.includes(val)) { setInput(''); return; }
    onChange([...items, val]);
    setInput('');
  };

  const remove = (item: string) => onChange(items.filter((i) => i !== item));

  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>{label}</Typography>
      {items.length > 0 && (
        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mb: 0.75 }}>
          {items.map((item) => (
            <Chip
              key={item}
              label={item}
              size="small"
              onDelete={() => remove(item)}
              deleteIcon={<IconX size={12} />}
              sx={{ fontSize: '0.72rem' }}
            />
          ))}
        </Stack>
      )}
      <Stack direction="row" spacing={0.75} alignItems="center">
        <TextField
          size="small"
          placeholder={placeholder}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          sx={{ flex: 1, '& .MuiInputBase-input': { fontSize: '0.8rem', py: 0.75 } }}
        />
        <Tooltip title="Adicionar">
          <IconButton size="small" onClick={add} sx={{ border: '1px solid rgba(0,0,0,0.15)' }}>
            <IconPlus size={15} />
          </IconButton>
        </Tooltip>
      </Stack>
    </Box>
  );
}

export default function BrandTokensCard({ clientId, initialTokens, onSaved }: Props) {
  const [open, setOpen] = useState(false);
  const [tokens, setTokens] = useState<BrandTokens>({
    typography: initialTokens?.typography || '',
    imageStyle: initialTokens?.imageStyle || '',
    moodWords: initialTokens?.moodWords || [],
    avoidElements: initialTokens?.avoidElements || [],
    referenceStyles: initialTokens?.referenceStyles || [],
  });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const hasTokens = Boolean(
    tokens.typography || tokens.imageStyle ||
    tokens.moodWords?.length || tokens.avoidElements?.length || tokens.referenceStyles?.length
  );

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await apiPatch(`/clients/${clientId}`, { brand_tokens: tokens });
      setSuccess('Brand tokens salvos! O Art AI usará esses dados nas próximas gerações.');
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
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" spacing={1} alignItems="center">
            <IconWand size={16} color="#9c27b0" />
            <Typography variant="subtitle2" fontWeight={700}>Art AI — Brand Tokens</Typography>
            {hasTokens && !open && (
              <Chip label="configurado" size="small" color="secondary" sx={{ fontSize: '0.65rem', height: 18 }} />
            )}
          </Stack>
          <Stack direction="row" spacing={0.5} alignItems="center">
            {open && (
              <Button
                size="small"
                variant="contained"
                color="secondary"
                startIcon={saving ? <CircularProgress size={13} color="inherit" /> : <IconDeviceFloppy size={13} />}
                onClick={handleSave}
                disabled={saving}
                sx={{ fontSize: '0.72rem' }}
              >
                Salvar
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
              ? `Tipografia, estilo visual e ${(tokens.moodWords?.length || 0) + (tokens.avoidElements?.length || 0)} palavras configuradas`
              : 'Configure estilo visual, tipografia e palavras-chave para o Art Director de IA'}
          </Typography>
        )}

        <Collapse in={open} unmountOnExit>
          <Divider sx={{ my: 1.5 }} />
          <Stack spacing={2}>
            <TextField
              fullWidth
              size="small"
              label="Tipografia"
              placeholder="Ex: sans-serif moderno, limpo, sem serifas"
              value={tokens.typography || ''}
              onChange={(e) => setTokens((t) => ({ ...t, typography: e.target.value }))}
              helperText="Descreva o estilo tipográfico da marca"
            />
            <TextField
              fullWidth
              size="small"
              label="Estilo visual / Fotografia"
              placeholder="Ex: fotografia real, cinematic, high contrast, luz natural"
              value={tokens.imageStyle || ''}
              onChange={(e) => setTokens((t) => ({ ...t, imageStyle: e.target.value }))}
              helperText="Guia o estilo das imagens geradas pelo Flux"
            />
            <ChipListField
              label="Palavras de mood"
              placeholder="Ex: confiança, agilidade, premium"
              items={tokens.moodWords || []}
              onChange={(items) => setTokens((t) => ({ ...t, moodWords: items }))}
            />
            <ChipListField
              label="Evitar elementos"
              placeholder="Ex: CGI exagerado, sorrisos forçados"
              items={tokens.avoidElements || []}
              onChange={(items) => setTokens((t) => ({ ...t, avoidElements: items }))}
            />
            <ChipListField
              label="Estilos de referência"
              placeholder="Ex: Apple 2024, Nubank, minimalismo"
              items={tokens.referenceStyles || []}
              onChange={(items) => setTokens((t) => ({ ...t, referenceStyles: items }))}
            />
            {success && <Alert severity="success" sx={{ py: 0.5, fontSize: 12 }}>{success}</Alert>}
            {error && <Alert severity="error" sx={{ py: 0.5, fontSize: 12 }}>{error}</Alert>}
          </Stack>
        </Collapse>
      </CardContent>
    </Card>
  );
}
