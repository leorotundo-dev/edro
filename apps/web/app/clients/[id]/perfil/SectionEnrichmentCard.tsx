'use client';

import { useMemo, useState } from 'react';
import { apiDelete, apiPost } from '@/lib/api';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Collapse from '@mui/material/Collapse';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { IconBulb, IconCircleCheck, IconEdit, IconTrash } from '@tabler/icons-react';

type ManualField = { key: string; label: string; multiline?: boolean; hint?: string };

const MANUAL_FIELDS: Record<string, ManualField[]> = {
  identity: [
    { key: 'description', label: 'Descrição do cliente', multiline: true },
    { key: 'audience', label: 'Público-alvo', multiline: true },
    { key: 'brand_promise', label: 'Promessa da marca' },
    { key: 'differentiators', label: 'Diferenciais', multiline: true },
    { key: 'website', label: 'Website' },
  ],
  voice: [
    { key: 'tone_description', label: 'Descrição do tom de voz', multiline: true },
    { key: 'personality_traits', label: 'Traços de personalidade', hint: 'Separe por vírgula' },
    { key: 'formality_level', label: 'Nível de formalidade' },
    { key: 'emoji_usage', label: 'Uso de emojis (ex: nunca, raramente, frequente)' },
  ],
  strategy: [
    { key: 'pillars', label: 'Pilares de conteúdo', hint: 'Separe por vírgula' },
    { key: 'keywords', label: 'Palavras-chave', hint: 'Separe por vírgula' },
    { key: 'negative_keywords', label: 'Palavras a evitar', hint: 'Separe por vírgula' },
    { key: 'content_mix', label: 'Mix de conteúdo (ex: 40% educativo, 30% entretenimento...)', multiline: true },
  ],
  competitors: [
    { key: 'competitors', label: 'Concorrentes', hint: 'Separe por vírgula', multiline: true },
  ],
  calendar: [
    { key: 'strategic_dates', label: 'Datas estratégicas', hint: 'Separe por vírgula (ex: 12/06 Dia dos Namorados)', multiline: true },
  ],
};

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
  existingValues?: Record<string, string>;
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
  existingValues,
  onChanged,
}: Props) {
  const [loadingField, setLoadingField] = useState<string | null>(null);
  const [draftValues, setDraftValues] = useState<Record<string, string>>({});
  const [doneFields, setDoneFields] = useState<Set<string>>(new Set());
  const [manualMode, setManualMode] = useState(false);
  const [manualValues, setManualValues] = useState<Record<string, string>>({});
  const [savingManual, setSavingManual] = useState(false);

  const fields = useMemo(() => {
    const entries = Object.entries(suggestion?.fields || {});
    return entries.filter(([key, value]) => value?.status !== 'discarded' && value?.status !== 'confirmed' && !doneFields.has(key));
  }, [suggestion, doneFields]);

  const allDone = doneFields.size > 0 && fields.length === 0;

  const hasExistingData = Object.values(existingValues || {}).some((v) => v && String(v).trim());

  const manualFields = MANUAL_FIELDS[sectionKey] || [];

  const handleSaveManual = async () => {
    const filledEntries = Object.entries(manualValues).filter(([, v]) => v.trim());
    if (!filledEntries.length) return;
    setSavingManual(true);
    try {
      for (const [field, rawValue] of filledEntries) {
        const originalField = MANUAL_FIELDS[sectionKey]?.find((f) => f.key === field);
        const isArray = Boolean(originalField?.hint?.toLowerCase().includes('vírgula'));
        const value = isArray
          ? rawValue.split(/[,;\n]/).map((v) => v.trim()).filter(Boolean)
          : rawValue.trim();
        await apiPost(`/clients/${clientId}/suggestions/confirm`, {
          section: sectionKey,
          field,
          value,
        });
      }
      setManualMode(false);
      setManualValues({});
      onChanged?.();
    } finally {
      setSavingManual(false);
    }
  };

  if (!suggestion || (!fields.length && !allDone)) {
    return (
      <Card
        variant="outlined"
        sx={hasExistingData ? { borderColor: 'success.light', bgcolor: 'rgba(46,125,50,0.04)' } : undefined}
      >
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="subtitle2" fontWeight={700}>
              {title}
            </Typography>
            <Stack direction="row" spacing={0.75} alignItems="center">
              {hasExistingData ? (
                <Chip
                  size="small"
                  icon={<IconCircleCheck size={14} />}
                  label="Aplicado ao perfil"
                  sx={{ bgcolor: 'rgba(46,125,50,0.12)', color: 'success.dark' }}
                />
              ) : (
                <Chip size="small" label="Sem sugestões" />
              )}
              {manualFields.length > 0 && !manualMode && (
                <Button
                  size="small"
                  variant="outlined"
                  color="inherit"
                  startIcon={<IconEdit size={13} />}
                  onClick={() => {
                    setManualValues(existingValues || {});
                    setManualMode(true);
                  }}
                  sx={{ fontSize: '0.7rem', py: 0.25, px: 1, minWidth: 0 }}
                >
                  {hasExistingData ? 'Editar' : 'Preencher'}
                </Button>
              )}
            </Stack>
          </Stack>
          {description ? (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {description}
            </Typography>
          ) : null}

          <Collapse in={manualMode} unmountOnExit>
            <Stack spacing={1.5} sx={{ mt: 2 }}>
              <Divider />
              {manualFields.map((mf) => (
                <Box key={mf.key}>
                  <Typography variant="caption" fontWeight={600} sx={{ mb: 0.5, display: 'block' }}>
                    {mf.label}
                  </Typography>
                  <TextField
                    fullWidth
                    size="small"
                    multiline={mf.multiline}
                    minRows={mf.multiline ? 2 : 1}
                    placeholder={mf.hint || ''}
                    value={manualValues[mf.key] || ''}
                    onChange={(e) =>
                      setManualValues((prev) => ({ ...prev, [mf.key]: e.target.value }))
                    }
                  />
                </Box>
              ))}
              <Stack direction="row" spacing={1} sx={{ pt: 0.5 }}>
                <Button
                  size="small"
                  variant="contained"
                  onClick={handleSaveManual}
                  disabled={savingManual}
                  sx={{ bgcolor: '#E85219', '&:hover': { bgcolor: '#c43e10' } }}
                >
                  {savingManual ? 'Salvando...' : 'Salvar'}
                </Button>
                <Button
                  size="small"
                  variant="text"
                  color="inherit"
                  onClick={() => { setManualMode(false); setManualValues({}); }}
                  disabled={savingManual}
                >
                  Cancelar
                </Button>
              </Stack>
            </Stack>
          </Collapse>
        </CardContent>
      </Card>
    );
  }

  if (allDone) {
    return (
      <Card variant="outlined" sx={{ borderColor: 'success.light', bgcolor: 'rgba(46,125,50,0.04)' }}>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="subtitle2" fontWeight={700}>{title}</Typography>
            <Chip
              size="small"
              icon={<IconCircleCheck size={14} />}
              label="Aplicado ao perfil"
              sx={{ bgcolor: 'rgba(46,125,50,0.12)', color: 'success.dark' }}
            />
          </Stack>
          {description ? (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
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
      // Remoção otimista: campo some imediatamente após confirmar
      setDoneFields((prev) => { const next = new Set(prev); next.add(field); return next; });
      onChanged?.();
    } finally {
      setLoadingField(null);
    }
  };

  const handleDiscard = async (field: string) => {
    setLoadingField(field);
    try {
      await apiDelete(`/clients/${clientId}/suggestions/${sectionKey}/${field}`);
      // Remoção otimista: campo some imediatamente após descartar
      setDoneFields((prev) => { const next = new Set(prev); next.add(field); return next; });
      onChanged?.();
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
              sx={{ bgcolor: 'rgba(232,82,25,0.08)', color: '#E85219' }}
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
                    sx={{ bgcolor: '#E85219', '&:hover': { bgcolor: '#c43e10' } }}
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

