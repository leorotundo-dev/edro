'use client';

import { useCallback, useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import {
  IconAt,
  IconBrain,
  IconBrandInstagram,
  IconBrandLinkedin,
  IconBrandTiktok,
  IconBrandTwitter,
  IconBulb,
  IconChartBar,
  IconPlus,
  IconRefresh,
  IconTarget,
  IconTrash,
  IconX,
} from '@tabler/icons-react';
import { apiDelete, apiGet, apiPost } from '@/lib/api';

// ── Types ──────────────────────────────────────────────────────────────────────

interface CompetitorProfile {
  id: string;
  handle: string;
  platform: string;
  display_name?: string;
  dominant_amd?: string;
  dominant_triggers?: string[];
  avg_engagement?: number;
  differentiation_insight?: string;
  counter_strategy?: string;
  last_analyzed_at?: string;
}

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  instagram: <IconBrandInstagram size={16} />,
  linkedin: <IconBrandLinkedin size={16} />,
  tiktok: <IconBrandTiktok size={16} />,
  twitter: <IconBrandTwitter size={16} />,
};

const AMD_LABELS: Record<string, { label: string; color: string }> = {
  salvar:       { label: 'Salvar', color: '#13DEB9' },
  compartilhar: { label: 'Compartilhar', color: '#5D87FF' },
  clicar:       { label: 'Clicar', color: '#FA896B' },
  responder:    { label: 'Responder', color: '#FFAE1F' },
  pedir_proposta: { label: 'Pedir Proposta', color: '#E040FB' },
};

// ── Main Component ─────────────────────────────────────────────────────────────

export default function CompetitorsClient({ clientId }: { clientId: string }) {
  const [competitors, setCompetitors] = useState<CompetitorProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeMsg, setAnalyzeMsg] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [addHandle, setAddHandle] = useState('');
  const [addPlatform, setAddPlatform] = useState<'instagram' | 'linkedin' | 'tiktok' | 'twitter'>('instagram');
  const [addName, setAddName] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet<{ competitors: CompetitorProfile[] }>(
        `/competitors?client_id=${clientId}`,
      );
      setCompetitors(data.competitors ?? []);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { void load(); }, [load]);

  const handleAdd = async () => {
    if (!addHandle.trim()) return;
    setSaving(true);
    try {
      await apiPost('/competitors', {
        client_id: clientId,
        handle: addHandle.trim().replace(/^@/, ''),
        platform: addPlatform,
        display_name: addName.trim() || undefined,
      });
      setAddOpen(false);
      setAddHandle('');
      setAddName('');
      await load();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await apiDelete(`/competitors/${id}`);
    setCompetitors(prev => prev.filter(c => c.id !== id));
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setAnalyzeMsg('');
    try {
      const data = await apiPost<{ message?: string }>('/competitors/analyze', { client_id: clientId });
      setAnalyzeMsg(data.message ?? 'Análise iniciada.');
      // Reload after a brief delay to pick up updated data
      setTimeout(() => { void load(); }, 5000);
    } catch {
      setAnalyzeMsg('Erro ao iniciar análise.');
    } finally {
      setAnalyzing(false);
    }
  };

  // Compute AMD coverage gap
  const competitorAmds = Array.from(new Set(competitors.map(c => c.dominant_amd).filter(Boolean))) as string[];
  const unusedAmds = Object.keys(AMD_LABELS).filter(amd => !competitorAmds.includes(amd));

  return (
    <Box>
      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3}>
        <Box>
          <Typography variant="h6" fontWeight={700}>Inteligência Competitiva</Typography>
          <Typography variant="body2" color="text.secondary">
            Monitore os concorrentes, identifique padrões e descubra oportunidades de diferenciação.
          </Typography>
        </Box>
        <Stack direction="row" gap={1}>
          <Button
            variant="outlined"
            size="small"
            startIcon={analyzing ? <CircularProgress size={14} /> : <IconRefresh size={16} />}
            onClick={handleAnalyze}
            disabled={analyzing || competitors.length === 0}
          >
            Analisar todos
          </Button>
          <Button
            variant="contained"
            size="small"
            startIcon={<IconPlus size={16} />}
            onClick={() => setAddOpen(true)}
            sx={{ bgcolor: '#5D87FF' }}
          >
            Adicionar concorrente
          </Button>
        </Stack>
      </Stack>

      {analyzeMsg && (
        <Alert severity="info" sx={{ mb: 2 }} onClose={() => setAnalyzeMsg('')}>
          {analyzeMsg}
        </Alert>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress />
        </Box>
      ) : competitors.length === 0 ? (
        <Card variant="outlined" sx={{ p: 4, textAlign: 'center', borderStyle: 'dashed' }}>
          <IconBrain size={40} color="#aaa" />
          <Typography mt={2} color="text.secondary">
            Nenhum concorrente adicionado ainda.
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            Adicione handles de concorrentes para monitorar seus padrões de conteúdo.
          </Typography>
          <Button
            variant="outlined"
            size="small"
            startIcon={<IconPlus size={14} />}
            onClick={() => setAddOpen(true)}
            sx={{ mt: 2 }}
          >
            Adicionar concorrente
          </Button>
        </Card>
      ) : (
        <Stack gap={2}>
          {/* AMD coverage gap banner */}
          {unusedAmds.length > 0 && (
            <Alert severity="success" icon={<IconBulb size={18} />}>
              <strong>Oportunidade de diferenciação:</strong> Seus concorrentes não estão usando os AMDs{' '}
              {unusedAmds.map(a => AMD_LABELS[a]?.label ?? a).join(', ')}.
              Esses são os ângulos menos saturados no seu mercado.
            </Alert>
          )}

          {/* Competitor cards */}
          {competitors.map(c => (
            <CompetitorCard key={c.id} competitor={c} onDelete={handleDelete} />
          ))}
        </Stack>
      )}

      {/* Add competitor dialog */}
      <Dialog open={addOpen} onClose={() => setAddOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            Adicionar concorrente
            <IconButton size="small" onClick={() => setAddOpen(false)}>
              <IconX size={18} />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Stack gap={2} pt={1}>
            <TextField
              label="Handle (ex: @marca)"
              value={addHandle}
              onChange={e => setAddHandle(e.target.value)}
              size="small"
              fullWidth
              InputProps={{ startAdornment: <IconAt size={16} style={{ marginRight: 4, color: '#aaa' }} /> }}
              placeholder="nomeda marca"
            />
            <Box>
              <Typography variant="caption" color="text.secondary" mb={0.5} display="block">
                Plataforma
              </Typography>
              <Select
                value={addPlatform}
                onChange={e => setAddPlatform(e.target.value as any)}
                size="small"
                fullWidth
              >
                <MenuItem value="instagram">Instagram</MenuItem>
                <MenuItem value="linkedin">LinkedIn</MenuItem>
                <MenuItem value="tiktok">TikTok</MenuItem>
                <MenuItem value="twitter">Twitter / X</MenuItem>
              </Select>
            </Box>
            <TextField
              label="Nome de exibição (opcional)"
              value={addName}
              onChange={e => setAddName(e.target.value)}
              size="small"
              fullWidth
              placeholder="Marca Concorrente SA"
            />
            <Button
              variant="contained"
              onClick={handleAdd}
              disabled={saving || !addHandle.trim()}
              sx={{ bgcolor: '#5D87FF' }}
            >
              {saving ? 'Salvando...' : 'Adicionar'}
            </Button>
          </Stack>
        </DialogContent>
      </Dialog>
    </Box>
  );
}

// ── Competitor Card ────────────────────────────────────────────────────────────

function CompetitorCard({
  competitor,
  onDelete,
}: {
  competitor: CompetitorProfile;
  onDelete: (id: string) => void;
}) {
  const amdInfo = competitor.dominant_amd ? AMD_LABELS[competitor.dominant_amd] : null;
  const engPct = competitor.avg_engagement != null
    ? (Number(competitor.avg_engagement) * 100).toFixed(2) + '%'
    : null;
  const analyzedAt = competitor.last_analyzed_at
    ? new Date(competitor.last_analyzed_at).toLocaleDateString('pt-BR')
    : null;

  return (
    <Card variant="outlined" sx={{ p: 2.5 }}>
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" gap={2}>
        {/* Left: identity */}
        <Stack direction="row" alignItems="center" gap={1.5} flexShrink={0}>
          <Box
            sx={{
              width: 38, height: 38, borderRadius: 2,
              bgcolor: '#f0f0f0',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#555',
            }}
          >
            {PLATFORM_ICONS[competitor.platform] ?? <IconAt size={16} />}
          </Box>
          <Box>
            <Typography fontWeight={600} fontSize="0.9rem">
              {competitor.display_name || `@${competitor.handle}`}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              @{competitor.handle} · {competitor.platform}
              {analyzedAt && ` · analisado em ${analyzedAt}`}
            </Typography>
          </Box>
        </Stack>

        {/* Right: AMD badge + delete */}
        <Stack direction="row" alignItems="center" gap={1}>
          {amdInfo && (
            <Chip
              label={`AMD: ${amdInfo.label}`}
              size="small"
              sx={{ bgcolor: amdInfo.color + '22', color: amdInfo.color, fontWeight: 600, fontSize: '0.7rem' }}
            />
          )}
          {engPct && (
            <Chip
              icon={<IconChartBar size={12} />}
              label={engPct}
              size="small"
              variant="outlined"
              sx={{ fontSize: '0.7rem' }}
            />
          )}
          <Tooltip title="Remover concorrente">
            <IconButton size="small" onClick={() => onDelete(competitor.id)} sx={{ color: '#aaa' }}>
              <IconTrash size={15} />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      {/* Triggers */}
      {competitor.dominant_triggers && competitor.dominant_triggers.length > 0 && (
        <Stack direction="row" gap={0.5} mt={1.5} flexWrap="wrap">
          <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5, lineHeight: '22px' }}>
            Gatilhos dominantes:
          </Typography>
          {competitor.dominant_triggers.map(t => (
            <Chip key={t} label={t} size="small" sx={{ fontSize: '0.65rem', height: 20 }} />
          ))}
        </Stack>
      )}

      {/* Insights */}
      {(competitor.differentiation_insight || competitor.counter_strategy) && (
        <>
          <Divider sx={{ my: 1.5 }} />
          <Stack gap={1}>
            {competitor.differentiation_insight && (
              <Stack direction="row" gap={1} alignItems="flex-start">
                <IconBulb size={15} color="#FFAE1F" style={{ flexShrink: 0, marginTop: 2 }} />
                <Typography variant="body2" color="text.secondary">
                  <strong>Oportunidade:</strong> {competitor.differentiation_insight}
                </Typography>
              </Stack>
            )}
            {competitor.counter_strategy && (
              <Stack direction="row" gap={1} alignItems="flex-start">
                <IconTarget size={15} color="#5D87FF" style={{ flexShrink: 0, marginTop: 2 }} />
                <Typography variant="body2" color="text.secondary">
                  <strong>Estratégia:</strong> {competitor.counter_strategy}
                </Typography>
              </Stack>
            )}
          </Stack>
        </>
      )}

      {/* No analysis yet */}
      {!competitor.dominant_amd && !competitor.differentiation_insight && (
        <Typography variant="caption" color="text.secondary" mt={1.5} display="block">
          Aguardando análise — clique em "Analisar todos" para processar os posts coletados.
        </Typography>
      )}
    </Card>
  );
}
