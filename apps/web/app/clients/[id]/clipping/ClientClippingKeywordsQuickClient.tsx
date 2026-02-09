'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import DashboardCard from '@/components/shared/DashboardCard';
import { apiGet, apiPatch, apiPost } from '@/lib/api';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { IconPlus, IconRefresh, IconSparkles, IconTrash, IconX } from '@tabler/icons-react';

type ClientRow = {
  id: string;
  name: string;
  segment_primary?: string | null;
  profile?: Record<string, any> | null;
};

function normalizeKeyword(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function splitKeywords(input: string) {
  return input
    // Split on comma / semicolon / line breaks. (Bugfix: avoid splitting on the letter "n".)
    .split(/[,;\n]+/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

function uniqKeywords(items: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of items) {
    const trimmed = String(item || '').trim();
    if (!trimmed) continue;
    const key = normalizeKeyword(trimmed);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
  }
  return result;
}

type ClientClippingKeywordsQuickClientProps = {
  clientId: string;
};

export default function ClientClippingKeywordsQuickClient({
  clientId,
}: ClientClippingKeywordsQuickClientProps) {
  const [client, setClient] = useState<ClientRow | null>(null);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rescoring, setRescoring] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [editOpen, setEditOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState('');

  const subtitle = useMemo(() => {
    if (!client) return undefined;
    return `${client.name} - ${client.segment_primary || 'Sem segmento'}`;
  }, [client]);

  const loadClient = useCallback(async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const response = await apiGet<ClientRow>(`/clients/${encodeURIComponent(clientId)}`);
      setClient(response);
      const required = (response as any)?.profile?.clipping?.required_keywords;
      setKeywords(Array.isArray(required) ? required.map((v: any) => String(v || '').trim()).filter(Boolean) : []);
    } catch (err: any) {
      setError(err?.message || 'Falha ao carregar dados do cliente.');
      setClient(null);
      setKeywords([]);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    void loadClient();
  }, [loadClient]);

  const saveKeywords = useCallback(
    async (nextKeywords: string[]) => {
      const normalized = uniqKeywords(nextKeywords);
      setSaving(true);
      setError('');
      setSuccess('');
      try {
        const response = await apiPatch<{ ok?: boolean; clipping?: { required_keywords?: string[] } }>(
          `/clients/${encodeURIComponent(clientId)}/clipping-profile`,
          { required_keywords: normalized }
        );
        const serverList = response?.clipping?.required_keywords;
        setKeywords(Array.isArray(serverList) ? serverList : normalized);
        setSuccess('Palavras do Clipping atualizadas.');
        return true;
      } catch (err: any) {
        setError(err?.message || 'Falha ao salvar palavras do Clipping.');
        // Keep local state as-is so the user can retry.
        setKeywords(normalized);
        return false;
      } finally {
        setSaving(false);
      }
    },
    [clientId]
  );

  const handleAdd = useCallback(async () => {
    const tokens = splitKeywords(keywordInput);
    if (!tokens.length) return;
    setKeywordInput('');
    const next = uniqKeywords([...keywords, ...tokens]);
    setKeywords(next);
    void saveKeywords(next);
  }, [keywordInput, keywords, saveKeywords]);

  const handleDelete = useCallback(
    async (value: string) => {
      const next = keywords.filter((kw) => kw !== value);
      setKeywords(next);
      void saveKeywords(next);
    },
    [keywords, saveKeywords]
  );

  const openEdit = useCallback(
    (idx: number) => {
      setEditingIndex(idx);
      setEditingValue(keywords[idx] || '');
      setEditOpen(true);
    },
    [keywords]
  );

  const handleEditSave = useCallback(async () => {
    if (editingIndex === null) return;
    const nextValue = editingValue.trim();
    if (nextValue.length < 2) return;
    const next = [...keywords];
    next[editingIndex] = nextValue;
    const unique = uniqKeywords(next);
    setEditOpen(false);
    setEditingIndex(null);
    setEditingValue('');
    setKeywords(unique);
    void saveKeywords(unique);
  }, [editingIndex, editingValue, keywords, saveKeywords]);

  const handleRescore = useCallback(async () => {
    setRescoring(true);
    setError('');
    setSuccess('');
    try {
      await apiPost('/clipping/score', { clientId, limit: 200 });
      setSuccess('Reprocessamento do Clipping iniciado.');
    } catch (err: any) {
      setError(err?.message || 'Falha ao reprocessar o Clipping.');
    } finally {
      setRescoring(false);
    }
  }, [clientId]);

  const handleClearAll = useCallback(async () => {
    const confirmed = window.confirm('Limpar todas as palavras obrigatorias do Clipping deste cliente?');
    if (!confirmed) return;
    setKeywords([]);
    void saveKeywords([]);
  }, [saveKeywords]);

  if (loading && !client) {
    return (
      <Stack alignItems="center" justifyContent="center" sx={{ minHeight: 160 }}>
        <CircularProgress size={28} />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Carregando setup do Clipping...
        </Typography>
      </Stack>
    );
  }

  return (
    <>
      {error ? (
        <Card variant="outlined">
          <CardContent>
            <Typography color="error">{error}</Typography>
          </CardContent>
        </Card>
      ) : null}
      {success ? (
        <Card variant="outlined">
          <CardContent>
            <Typography color="success.main">{success}</Typography>
          </CardContent>
        </Card>
      ) : null}

      <DashboardCard
        title="Setup rapido (Clipping)"
        subtitle={subtitle}
        action={<Chip size="small" label={`${keywords.length} palavras`} color="info" variant="outlined" />}
      >
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              label="Cliente"
              size="small"
              value={client?.name || ''}
              disabled
            />
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ height: '100%' }}>
              <Button
                variant="contained"
                startIcon={<IconSparkles size={16} />}
                onClick={handleRescore}
                disabled={loading || saving || rescoring}
              >
                {rescoring ? 'Reprocessando...' : 'Reprocessar'}
              </Button>
              <Button
                variant="outlined"
                startIcon={<IconRefresh size={16} />}
                onClick={loadClient}
                disabled={loading || saving || rescoring}
              >
                Atualizar
              </Button>
              {keywords.length ? (
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<IconTrash size={16} />}
                  onClick={handleClearAll}
                  disabled={loading || saving || rescoring}
                >
                  Limpar
                </Button>
              ) : null}
            </Stack>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Typography variant="body2" color="text.secondary">
              Estas palavras sao <b>obrigatorias</b> para uma materia entrar no Clipping do cliente. Use isso para aumentar o rigor e evitar temas irrelevantes.
            </Typography>
          </Grid>

          {keywords.length ? (
            <Grid size={{ xs: 12 }}>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {keywords.map((kw, idx) => (
                  <Chip
                    key={`${kw}-${idx}`}
                    size="small"
                    label={kw}
                    color="primary"
                    onClick={() => openEdit(idx)}
                    onDelete={() => void handleDelete(kw)}
                    deleteIcon={<IconTrash size={16} />}
                    disabled={saving || rescoring}
                  />
                ))}
              </Stack>
            </Grid>
          ) : (
            <Grid size={{ xs: 12 }}>
              <Typography variant="body2" color="text.secondary">
                Nenhuma palavra core configurada ainda. Adicione termos do negocio (ex: &quot;terminal portuario&quot;, &quot;cabotagem&quot;, &quot;ANTAQ&quot;).
              </Typography>
            </Grid>
          )}

          <Grid size={{ xs: 12 }}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems={{ md: 'center' }}>
              <TextField
                fullWidth
                size="small"
                label="Adicionar palavra"
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                disabled={saving || rescoring}
                placeholder="Digite uma palavra (ou cole varias separadas por virgula)"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (!saving && !rescoring && keywordInput.trim().length >= 2) {
                      void handleAdd();
                    }
                  }
                }}
              />
              <Button
                variant="outlined"
                startIcon={<IconPlus size={16} />}
                onClick={handleAdd}
                disabled={saving || rescoring || keywordInput.trim().length < 2}
              >
                Adicionar
              </Button>
            </Stack>
          </Grid>
        </Grid>
      </DashboardCard>

      <Dialog open={editOpen} onClose={() => !saving && setEditOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          Editar palavra
          <IconButton onClick={() => !saving && setEditOpen(false)} disabled={saving}>
            <IconX size={18} />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            size="small"
            label="Palavra"
            value={editingValue}
            onChange={(e) => setEditingValue(e.target.value)}
            disabled={saving}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => !saving && setEditOpen(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleEditSave}
            disabled={saving || editingValue.trim().length < 2}
          >
            Salvar
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
