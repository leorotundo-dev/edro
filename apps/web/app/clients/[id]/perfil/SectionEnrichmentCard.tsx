'use client';

import { useMemo, useState } from 'react';
import { apiDelete, apiPost } from '@/lib/api';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { IconBulb, IconCircleCheck, IconTrash } from '@tabler/icons-react';

type FieldSuggestion = {
  value: any;
  confidence?: number;
  source?: string;
  reasoning?: string;
  status?: string;
};

type SectionSuggestion = {
  suggested_at?: string;
  status?: string;
  fields?: Record<string, FieldSuggestion>;
};

type Props = {
  clientId: string;
  sectionKey: 'identity' | 'voice' | 'strategy' | 'competitors' | 'calendar';
  title: string;
  description?: string;
  suggestion?: SectionSuggestion | null;
  refreshedAt?: string | null;
  onChanged?: () => Promise<void> | void;
};

function formatValue(value: any) {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
}

function parseValue(text: string, original: any) {
  if (Array.isArray(original)) {
    return text
      .split(/[,;\n]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  if (original && typeof original === 'object') {
    try {
      return JSON.parse(text);
    } catch {
      return original;
    }
  }
  return text;
}

export default function SectionEnrichmentCard({
  clientId,
  sectionKey,
  title,
  description,
  suggestion,
  refreshedAt,
  onChanged,
}: Props) {
  const [loadingField, setLoadingField] = useState<string | null>(null);
  const [draftValues, setDraftValues] = useState<Record<string, string>>({});

  const fields = useMemo(() => {
    const entries = Object.entries(suggestion?.fields || {});
    return entries.filter(([, value]) => value?.status !== 'discarded');
  }, [suggestion]);

  if (!suggestion || !fields.length) {
    return (
      <Card variant="outlined">
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="subtitle2" fontWeight={700}>
              {title}
            </Typography>
            <Chip size="small" label="Sem sugestoes" />
          </Stack>
          {description ? (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {description}
            </Typography>
          ) : null}
        </CardContent>
      </Card>
    );
  }

  const handleConfirm = async (field: string, original: any) => {
    setLoadingField(field);
    try {
      const draft = draftValues[field];
      const parsedValue = draft == null ? original : parseValue(draft, original);
      await apiPost(`/clients/${clientId}/suggestions/confirm`, {
        section: sectionKey,
        field,
        value: parsedValue,
      });
      await onChanged?.();
    } finally {
      setLoadingField(null);
    }
  };

  const handleDiscard = async (field: string) => {
    setLoadingField(field);
    try {
      await apiDelete(`/clients/${clientId}/suggestions/${sectionKey}/${field}`);
      await onChanged?.();
    } finally {
      setLoadingField(null);
    }
  };

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
          <Box>
            <Typography variant="subtitle2" fontWeight={700}>
              {title}
            </Typography>
            {description ? (
              <Typography variant="caption" color="text.secondary">
                {description}
              </Typography>
            ) : null}
          </Box>
          <Stack direction="row" spacing={0.75} alignItems="center">
            <Chip
              size="small"
              icon={<IconBulb size={12} />}
              label={`${fields.length} sugest${fields.length > 1 ? 'oes' : 'ao'}`}
              sx={{ bgcolor: 'rgba(255,102,0,0.08)', color: '#ff6600' }}
            />
            {refreshedAt ? (
              <Typography variant="caption" color="text.secondary">
                {new Date(refreshedAt).toLocaleDateString('pt-BR')}
              </Typography>
            ) : null}
          </Stack>
        </Stack>

        <Stack spacing={1.5}>
          {fields.map(([field, entry], index) => {
            const textValue =
              draftValues[field] != null ? draftValues[field] : formatValue(entry.value);
            const confidence = Math.round(Number(entry.confidence || 0) * 100);
            return (
              <Box key={field}>
                {index > 0 ? <Divider sx={{ mb: 1.25 }} /> : null}
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.75 }}>
                  <Typography variant="caption" fontWeight={700} sx={{ textTransform: 'uppercase' }}>
                    {field}
                  </Typography>
                  <Stack direction="row" spacing={0.75} alignItems="center">
                    {confidence ? <Chip size="small" label={`${confidence}%`} /> : null}
                    {entry.source ? <Chip size="small" variant="outlined" label={entry.source} /> : null}
                  </Stack>
                </Stack>
                <TextField
                  fullWidth
                  size="small"
                  multiline
                  minRows={typeof entry.value === 'object' ? 3 : 1}
                  value={textValue}
                  onChange={(event) =>
                    setDraftValues((prev) => ({ ...prev, [field]: event.target.value }))
                  }
                />
                {entry.reasoning ? (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.75, display: 'block' }}>
                    {entry.reasoning}
                  </Typography>
                ) : null}
                <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<IconCircleCheck size={14} />}
                    onClick={() => handleConfirm(field, entry.value)}
                    disabled={loadingField === field}
                    sx={{ bgcolor: '#ff6600', '&:hover': { bgcolor: '#e65c00' } }}
                  >
                    Confirmar
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    color="inherit"
                    startIcon={<IconTrash size={14} />}
                    onClick={() => handleDiscard(field)}
                    disabled={loadingField === field}
                  >
                    Descartar
                  </Button>
                </Stack>
              </Box>
            );
          })}
        </Stack>
      </CardContent>
    </Card>
  );
}

