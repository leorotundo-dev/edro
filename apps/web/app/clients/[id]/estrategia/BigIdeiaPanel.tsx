'use client';

import { useCallback, useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import FormControl from '@mui/material/FormControl';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import LinearProgress from '@mui/material/LinearProgress';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import {
  IconBulb, IconCheck, IconChevronDown, IconChevronUp,
  IconSparkles, IconThumbDown, IconTrophy, IconX,
} from '@tabler/icons-react';
import { apiGet, apiPost } from '@/lib/api';

type Campaign = { id: string; name: string; objective?: string };

type ScorecardBlock = { score: number; rationale: string };
type Scorecard = {
  nucleo_estrategico: ScorecardBlock;
  potencia_criativa:  ScorecardBlock;
  sustentacao:        ScorecardBlock;
  elasticidade:       ScorecardBlock;
  efetividade:        ScorecardBlock;
  total: number;
};

type BigIdeia = {
  id?: string;
  titulo: string;
  conceito_central: string;
  territorio_criativo: string;
  manifesto: string;
  maturity_level: 1 | 2 | 3 | 4 | 5;
  maturity_notes: string;
  status?: string;
  scorecard: Scorecard;
  created_at?: string;
};

const MATURITY_LABELS: Record<number, string> = {
  1: 'N1 — Intuição',
  2: 'N2 — Hipótese',
  3: 'N3 — Conceito',
  4: 'N4 — Sistema',
  5: 'N5 — Plataforma',
};

const MATURITY_COLOR: Record<number, string> = {
  1: '#94a3b8',
  2: '#f97316',
  3: '#3b82f6',
  4: '#8b5cf6',
  5: '#22c55e',
};

const SCORECARD_LABELS: (keyof Omit<Scorecard, 'total'>)[] = [
  'nucleo_estrategico', 'potencia_criativa', 'sustentacao', 'elasticidade', 'efetividade',
];
const SCORECARD_DISPLAY: Record<string, { label: string; weight: string }> = {
  nucleo_estrategico: { label: 'Núcleo Estratégico', weight: '25%' },
  potencia_criativa:  { label: 'Potência Criativa',  weight: '25%' },
  sustentacao:        { label: 'Sustentação',         weight: '20%' },
  elasticidade:       { label: 'Elasticidade',        weight: '15%' },
  efetividade:        { label: 'Efetividade',         weight: '15%' },
};

const STATUS_CHIP: Record<string, { label: string; color: 'default' | 'primary' | 'success' | 'error' | 'warning' }> = {
  proposta:   { label: 'Proposta',  color: 'default' },
  adotada:    { label: 'Adotada',   color: 'success' },
  descartada: { label: 'Descartada', color: 'error' },
  promovida:  { label: 'Promovida',  color: 'primary' },
};

type Props = { clientId: string };

export default function BigIdeiaPanel({ clientId }: Props) {
  const [campaigns, setCampaigns]       = useState<Campaign[]>([]);
  const [campaignId, setCampaignId]     = useState('');
  const [bigIdeas, setBigIdeas]         = useState<BigIdeia[]>([]);
  const [loading, setLoading]           = useState(false);
  const [generating, setGenerating]     = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [expandedId, setExpandedId]     = useState<string | null>(null);
  const [discardReason, setDiscardReason] = useState('');
  const [discardTarget, setDiscardTarget] = useState<string | null>(null);

  // Load campaigns for this client
  useEffect(() => {
    apiGet(`/campaigns?client_id=${clientId}&limit=30`)
      .then((data) => setCampaigns(data?.rows || data || []))
      .catch(() => {});
  }, [clientId]);

  const loadBigIdeas = useCallback(async () => {
    if (!campaignId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet(`/strategy/big-ideas/${campaignId}`);
      setBigIdeas(data || []);
    } catch {
      setError('Não foi possível carregar as Big Ideas.');
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => { loadBigIdeas(); }, [loadBigIdeas]);

  const handleGenerate = async () => {
    if (!campaignId) return;
    setGenerating(true);
    setError(null);
    try {
      await apiPost(`/strategy/big-ideas/${campaignId}/generate`, {});
      await loadBigIdeas();
    } catch {
      setError('Erro ao gerar Big Idea. Tente novamente.');
    } finally {
      setGenerating(false);
    }
  };

  const handleAdopt = async (id: string) => {
    try {
      await apiPost(`/strategy/big-ideas/${id}/adopt`, {});
      await loadBigIdeas();
    } catch {
      setError('Erro ao adotar Big Idea.');
    }
  };

  const handleDiscard = async (id: string) => {
    try {
      await apiPost(`/strategy/big-ideas/${id}/discard`, { reason: discardReason });
      setDiscardTarget(null);
      setDiscardReason('');
      await loadBigIdeas();
    } catch {
      setError('Erro ao descartar Big Idea.');
    }
  };

  const handlePromote = async (id: string) => {
    try {
      await apiPost(`/strategy/big-ideas/${id}/promote`, {});
      await loadBigIdeas();
    } catch {
      setError('Erro ao promover Big Idea.');
    }
  };

  return (
    <Box>
      <Typography variant="h6" fontWeight={600}>Big Idea por Campanha</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Proposta pelo Jarvis a partir das 3 camadas estratégicas. Uma Big Idea pode ser promovida a plataforma perene do cliente.
      </Typography>

      {/* Campaign selector */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="flex-end" sx={{ mb: 3 }}>
        <FormControl size="small" sx={{ minWidth: 280 }}>
          <InputLabel>Campanha</InputLabel>
          <Select
            label="Campanha"
            value={campaignId}
            onChange={(e) => setCampaignId(e.target.value)}
          >
            {campaigns.map((c) => (
              <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button
          variant="contained"
          startIcon={generating ? <CircularProgress size={14} color="inherit" /> : <IconSparkles size={16} />}
          onClick={handleGenerate}
          disabled={!campaignId || generating}
        >
          Gerar Big Idea
        </Button>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {!campaignId && (
        <Card variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <IconBulb size={32} color="#94a3b8" />
          <Typography color="text.secondary" sx={{ mt: 1 }}>
            Selecione uma campanha para ver ou gerar Big Ideas.
          </Typography>
        </Card>
      )}

      {loading && campaignId && (
        <Stack alignItems="center" sx={{ py: 6 }}>
          <CircularProgress size={24} />
        </Stack>
      )}

      {!loading && campaignId && bigIdeas.length === 0 && (
        <Card variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">
            Nenhuma Big Idea gerada ainda para esta campanha.
          </Typography>
        </Card>
      )}

      <Stack spacing={2}>
        {bigIdeas.map((bi) => {
          const isExpanded = expandedId === (bi.id ?? bi.titulo);
          const chipConfig = STATUS_CHIP[bi.status ?? 'proposta'];
          const maturityColor = MATURITY_COLOR[bi.maturity_level];

          return (
            <Card
              key={bi.id ?? bi.titulo}
              variant="outlined"
              sx={{
                borderColor: bi.status === 'adotada' ? 'success.main' : 'divider',
                borderWidth: bi.status === 'adotada' ? 2 : 1,
              }}
            >
              {/* Header */}
              <Box sx={{ p: 2.5 }}>
                <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1}>
                  <Stack spacing={0.5} sx={{ flex: 1, minWidth: 0 }}>
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                      <Typography variant="subtitle1" fontWeight={700}>
                        {bi.titulo}
                      </Typography>
                      <Chip
                        label={chipConfig.label}
                        size="small"
                        color={chipConfig.color}
                        variant={bi.status === 'adotada' ? 'filled' : 'outlined'}
                      />
                      <Chip
                        label={MATURITY_LABELS[bi.maturity_level]}
                        size="small"
                        sx={{ bgcolor: maturityColor + '22', color: maturityColor, border: `1px solid ${maturityColor}40` }}
                      />
                    </Stack>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      {bi.conceito_central}
                    </Typography>
                  </Stack>
                  <Stack direction="row" alignItems="center" spacing={0.5}>
                    {/* Score pill */}
                    <Box
                      sx={{
                        px: 1.5, py: 0.5, borderRadius: 2,
                        bgcolor: bi.scorecard.total >= 70 ? '#22c55e22' : bi.scorecard.total >= 50 ? '#f9731622' : '#ef444422',
                        color:   bi.scorecard.total >= 70 ? '#16a34a'  : bi.scorecard.total >= 50 ? '#ea580c'   : '#dc2626',
                        fontWeight: 700, fontSize: '0.9rem', whiteSpace: 'nowrap',
                      }}
                    >
                      {bi.scorecard.total}
                    </Box>
                    <IconButton size="small" onClick={() => setExpandedId(isExpanded ? null : (bi.id ?? bi.titulo))}>
                      {isExpanded ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
                    </IconButton>
                  </Stack>
                </Stack>
              </Box>

              {/* Expanded content */}
              {isExpanded && (
                <>
                  <Divider />
                  <Box sx={{ p: 2.5 }}>
                    {/* Território criativo */}
                    {bi.territorio_criativo && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                          Território Criativo
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 0.5 }}>{bi.territorio_criativo}</Typography>
                      </Box>
                    )}

                    {/* Manifesto */}
                    {bi.manifesto && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                          Manifesto
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: 'pre-line', fontStyle: 'italic' }}>
                          {bi.manifesto}
                        </Typography>
                      </Box>
                    )}

                    {/* Scorecard */}
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: 0.5, mb: 1, display: 'block' }}>
                        Scorecard
                      </Typography>
                      <Stack spacing={1.5}>
                        {SCORECARD_LABELS.map((key) => {
                          const block = bi.scorecard[key];
                          const { label, weight } = SCORECARD_DISPLAY[key];
                          const pct = block.score;
                          const color = pct >= 70 ? 'success' : pct >= 50 ? 'warning' : 'error';
                          return (
                            <Box key={key}>
                              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                                <Typography variant="caption" fontWeight={600}>{label}</Typography>
                                <Stack direction="row" spacing={1} alignItems="center">
                                  <Typography variant="caption" color="text.secondary">{weight}</Typography>
                                  <Typography variant="caption" fontWeight={700}>{pct}</Typography>
                                </Stack>
                              </Stack>
                              <LinearProgress variant="determinate" value={pct} color={color} sx={{ height: 6, borderRadius: 3 }} />
                              {block.rationale && (
                                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.25, display: 'block' }}>
                                  {block.rationale}
                                </Typography>
                              )}
                            </Box>
                          );
                        })}
                      </Stack>
                    </Box>

                    {/* Maturity notes */}
                    {bi.maturity_notes && (
                      <Alert severity="info" sx={{ mb: 2, py: 0.5 }}>
                        <Typography variant="caption">{bi.maturity_notes}</Typography>
                      </Alert>
                    )}

                    {/* Actions */}
                    {bi.status === 'proposta' && bi.id && (
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        <Button
                          size="small" variant="contained" color="success"
                          startIcon={<IconCheck size={14} />}
                          onClick={() => handleAdopt(bi.id!)}
                        >
                          Adotar
                        </Button>
                        <Button
                          size="small" variant="outlined" color="error"
                          startIcon={<IconX size={14} />}
                          onClick={() => setDiscardTarget(bi.id!)}
                        >
                          Descartar
                        </Button>
                      </Stack>
                    )}

                    {bi.status === 'adotada' && bi.id && bi.maturity_level >= 4 && (
                      <Tooltip title="Promove o território criativo desta Big Idea ao DNA perene do cliente">
                        <Button
                          size="small" variant="outlined" color="primary"
                          startIcon={<IconTrophy size={14} />}
                          onClick={() => handlePromote(bi.id!)}
                        >
                          Promover a Plataforma (N5)
                        </Button>
                      </Tooltip>
                    )}

                    {/* Discard dialog inline */}
                    {discardTarget === bi.id && (
                      <Box sx={{ mt: 1.5, p: 2, bgcolor: 'error.50', borderRadius: 2, border: '1px solid', borderColor: 'error.200' }}>
                        <Typography variant="body2" fontWeight={600} color="error.main" sx={{ mb: 1 }}>
                          Motivo do descarte (opcional)
                        </Typography>
                        <TextField
                          fullWidth size="small" multiline minRows={2}
                          placeholder="O que não funcionou nesta proposta..."
                          value={discardReason}
                          onChange={(e) => setDiscardReason(e.target.value)}
                          sx={{ mb: 1.5 }}
                        />
                        <Stack direction="row" spacing={1}>
                          <Button size="small" variant="contained" color="error" onClick={() => handleDiscard(bi.id!)}>
                            Confirmar
                          </Button>
                          <Button size="small" variant="text" onClick={() => { setDiscardTarget(null); setDiscardReason(''); }}>
                            Cancelar
                          </Button>
                        </Stack>
                      </Box>
                    )}
                  </Box>
                </>
              )}
            </Card>
          );
        })}
      </Stack>
    </Box>
  );
}
