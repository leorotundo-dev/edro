'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import { apiGet, apiPost } from '@/lib/api';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Link from '@mui/material/Link';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import {
  IconArrowUpRight,
  IconBrain,
  IconChecklist,
  IconEyeSearch,
  IconFlame,
  IconRefresh,
  IconRoute,
  IconSparkles,
  IconTargetArrow,
} from '@tabler/icons-react';

type StoredClient = {
  id: string;
  name: string;
  segment?: string | null;
};

type Concept = {
  id: string;
  slug: string;
  title: string;
  category: string;
  definition: string;
  heuristics: string[];
  critique_checks: string[];
  when_to_use: string[];
  examples: string[];
  trust_score: number;
};

type Reference = {
  id: string;
  title: string;
  source_url: string;
  platform: string | null;
  format: string | null;
  segment: string | null;
  visual_intent: string | null;
  creative_direction: string | null;
  mood_words: string[];
  style_tags: string[];
  composition_tags: string[];
  typography_tags: string[];
  trend_score: number | null;
  confidence_score: number | null;
  rationale: string | null;
  discovered_at: string;
};

type Trend = {
  id: string;
  cluster_key: string;
  tag: string;
  sample_size: number;
  recent_count: number;
  previous_count: number;
  momentum: number;
  trust_score: number;
  trend_score: number;
  platform: string | null;
  segment: string | null;
};

type MemoryResponse = {
  success: boolean;
  degraded?: boolean;
  warning?: string;
  memory: {
    promptBlock: string;
    critiqueBlock: string;
  };
  concepts: Concept[];
  references: Reference[];
  trends: Trend[];
};

const PLATFORM_OPTIONS = ['Instagram', 'LinkedIn', 'Facebook', 'TikTok', 'YouTube', 'WhatsApp', 'General'];

function ScoreCard({
  title,
  value,
  subtitle,
  icon,
  color,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: ReactNode;
  color: string;
}) {
  return (
    <Card variant="outlined" sx={{ borderRadius: 3, height: '100%' }}>
      <CardContent>
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1.5}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              bgcolor: `${color}18`,
              color,
              display: 'grid',
              placeItems: 'center',
            }}
          >
            {icon}
          </Box>
          <Typography variant="caption" color="text.secondary">
            {title}
          </Typography>
        </Stack>
        <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.03em' }}>
          {value}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
          {subtitle}
        </Typography>
      </CardContent>
    </Card>
  );
}

function SectionCard({
  title,
  subtitle,
  children,
  action,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <Card variant="outlined" sx={{ borderRadius: 3 }}>
      <CardContent>
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" gap={2} mb={2}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {title}
            </Typography>
            {subtitle ? (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {subtitle}
              </Typography>
            ) : null}
          </Box>
          {action}
        </Stack>
        {children}
      </CardContent>
    </Card>
  );
}

function timeAgo(value?: string | null) {
  if (!value) return 'sem data';
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return value;
  const diff = Date.now() - then;
  const minutes = Math.max(1, Math.round(diff / 60000));
  if (minutes < 60) return `${minutes} min atrás`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h atrás`;
  const days = Math.round(hours / 24);
  return `${days} d atrás`;
}

function uniqueTags(reference: Reference) {
  return Array.from(
    new Set([
      ...(reference.style_tags || []),
      ...(reference.composition_tags || []),
      ...(reference.typography_tags || []),
    ].filter(Boolean)),
  ).slice(0, 5);
}

export default function DaControlClient() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<'discover' | 'refresh' | null>(null);
  const [error, setError] = useState<string>('');
  const [warning, setWarning] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [activeClient, setActiveClient] = useState<StoredClient | null>(null);
  const [clientId, setClientId] = useState<string>('');
  const [platform, setPlatform] = useState<string>('Instagram');
  const [segment, setSegment] = useState<string>('');
  const [category, setCategory] = useState<string>('social media');
  const [mood, setMood] = useState<string>('');
  const [data, setData] = useState<MemoryResponse | null>(null);

  useEffect(() => {
    const fromQuery = searchParams?.get('clientId') || '';
    if (fromQuery) {
      setClientId(fromQuery);
      return;
    }
    try {
      const selected = JSON.parse(window.localStorage.getItem('edro_selected_clients') || '[]') as StoredClient[];
      const activeId = window.localStorage.getItem('edro_active_client_id') || '';
      const found = selected.find((client) => client.id === activeId) || selected[0] || null;
      setActiveClient(found);
      if (found?.id) setClientId(found.id);
      if (found?.segment) {
        setSegment(found.segment);
        setCategory(found.segment);
      }
    } catch {
      // ignore
    }
  }, [searchParams]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    setWarning('');
    try {
      const params = new URLSearchParams();
      if (clientId) params.set('client_id', clientId);
      if (platform) params.set('platform', platform);
      if (segment) params.set('segment', segment);
      params.set('concept_limit', '8');
      params.set('reference_limit', '8');
      params.set('trend_limit', '6');
      const response = await apiGet<MemoryResponse>(`/studio/creative/da-memory?${params.toString()}`);
      setData(response);
      if (response.degraded) {
        setWarning('A memória de DA ainda não está totalmente provisionada. O painel abriu em modo degradado.');
      }
    } catch (err: any) {
      setError(err?.message || 'Falha ao carregar motor de DA');
    } finally {
      setLoading(false);
    }
  }, [clientId, platform, segment]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleDiscover = async () => {
    setBusy('discover');
    setError('');
    setSuccess('');
    try {
      const response = await apiPost<{ inserted: number; queries: string[] }>('/studio/creative/da-memory/discover', {
        client_id: clientId || undefined,
        platform,
        segment: segment || undefined,
        category: category || undefined,
        mood: mood || undefined,
      });
      setSuccess(`Descoberta executada. ${response.inserted ?? 0} referências salvas.`);
      await load();
    } catch (err: any) {
      setError(err?.message || 'Falha ao buscar referências');
    } finally {
      setBusy(null);
    }
  };

  const handleRefresh = async () => {
    setBusy('refresh');
    setError('');
    setSuccess('');
    try {
      const response = await apiPost<{ analyzed: number; snapshots: number }>('/studio/creative/da-memory/refresh', {
        client_id: clientId || undefined,
        limit: 12,
        window_days: 30,
        recent_days: 7,
      });
      setSuccess(`Memória atualizada. ${response.analyzed ?? 0} referências analisadas, ${response.snapshots ?? 0} snapshots de tendência.`);
      await load();
    } catch (err: any) {
      setError(err?.message || 'Falha ao recalcular memória');
    } finally {
      setBusy(null);
    }
  };

  const sendFeedback = async (referenceId: string, eventType: 'used' | 'approved' | 'rejected' | 'saved') => {
    setError('');
    setSuccess('');
    try {
      await apiPost('/studio/creative/da-memory/feedback', {
        client_id: clientId || undefined,
        reference_id: referenceId,
        event_type: eventType,
        metadata: {
          source: 'studio_da_dashboard',
          platform,
          segment,
        },
      });
      setSuccess(`Feedback registrado: ${eventType}.`);
    } catch (err: any) {
      setError(err?.message || 'Falha ao registrar feedback');
    }
  };

  const topTrend = useMemo(() => data?.trends?.[0] ?? null, [data]);

  return (
    <Box sx={{ maxWidth: 1440, mx: 'auto', px: { xs: 2, md: 4 }, py: 4 }}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="overline" sx={{ color: '#E85219', fontWeight: 800, letterSpacing: '0.08em' }}>
            Motor de DA
          </Typography>
          <Typography variant="h3" sx={{ fontWeight: 800, letterSpacing: '-0.04em', mt: 0.5 }}>
            Direção de Arte Intelligence
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mt: 1, maxWidth: 860 }}>
            Painel de governança do cérebro de direção de arte da Edro. Aqui você controla o canon, aciona a
            descoberta web, acompanha as tendências e alimenta o sistema com feedback humano.
          </Typography>
        </Box>

        {error ? <Alert severity="error">{error}</Alert> : null}
        {warning ? <Alert severity="warning">{warning}</Alert> : null}
        {success ? <Alert severity="success">{success}</Alert> : null}

        <Grid container spacing={2.5}>
          <Grid size={{ xs: 12, md: 3 }}>
            <ScoreCard
              title="Canon ativo"
              value={data?.concepts?.length ?? 0}
              subtitle="conceitos relevantes no recorte atual"
              icon={<IconBrain size={20} />}
              color="#5D87FF"
            />
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <ScoreCard
              title="Memória de referência"
              value={data?.references?.length ?? 0}
              subtitle="casos visuais analisados e prontos para uso"
              icon={<IconEyeSearch size={20} />}
              color="#13DEB9"
            />
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <ScoreCard
              title="Trend radar"
              value={data?.trends?.length ?? 0}
              subtitle={topTrend ? `principal sinal: ${topTrend.tag}` : 'nenhum snapshot no recorte'}
              icon={<IconFlame size={20} />}
              color="#FFAE1F"
            />
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <ScoreCard
              title="Cliente em foco"
              value={activeClient?.name || (clientId ? 'Selecionado' : 'Global')}
              subtitle={segment || activeClient?.segment || 'sem segmentação'}
              icon={<IconTargetArrow size={20} />}
              color="#FA896B"
            />
          </Grid>
        </Grid>

        <SectionCard
          title="Controle do motor"
          subtitle="Ajuste o recorte, force ingestão e reanalise o que o sistema já aprendeu."
          action={
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                startIcon={busy === 'refresh' ? <CircularProgress size={14} /> : <IconRefresh size={16} />}
                onClick={handleRefresh}
                disabled={busy !== null}
              >
                Recalcular
              </Button>
              <Button
                variant="contained"
                startIcon={busy === 'discover' ? <CircularProgress size={14} /> : <IconSparkles size={16} />}
                onClick={handleDiscover}
                disabled={busy !== null}
              >
                Buscar referências
              </Button>
            </Stack>
          }
        >
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField
                fullWidth
                label="Client ID"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                placeholder="id do cliente"
              />
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField
                select
                fullWidth
                label="Plataforma"
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
              >
                {PLATFORM_OPTIONS.map((item) => (
                  <MenuItem key={item} value={item}>{item}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField
                fullWidth
                label="Segmento"
                value={segment}
                onChange={(e) => setSegment(e.target.value)}
                placeholder="varejo, saúde, industrial..."
              />
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField
                fullWidth
                label="Categoria de busca"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="social media, retail, editorial..."
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                label="Mood opcional"
                value={mood}
                onChange={(e) => setMood(e.target.value)}
                placeholder="premium, clean, bold, documentary..."
              />
            </Grid>
            <Grid size={{ xs: 12, md: 8 }}>
              <Paper
                variant="outlined"
                sx={{
                  p: 1.5,
                  height: '100%',
                  borderRadius: 2,
                  bgcolor: 'rgba(93,135,255,0.03)',
                }}
              >
                <Typography variant="caption" color="text.secondary">
                  O motor combina três camadas:
                </Typography>
                <Stack direction="row" gap={1} flexWrap="wrap" mt={1}>
                  <Chip size="small" label="Design Canon" />
                  <Chip size="small" label="Reference Memory" />
                  <Chip size="small" label="Trend Memory" />
                  <Chip size="small" label="Feedback Loop" />
                </Stack>
              </Paper>
            </Grid>
          </Grid>
        </SectionCard>

        <Grid container spacing={2.5}>
          <Grid size={{ xs: 12, lg: 6 }}>
            <SectionCard
              title="Canon e critérios"
              subtitle="Conceitos que o sistema usa como linguagem-base para geração e crítica."
            >
              {loading ? (
                <Stack alignItems="center" py={6}><CircularProgress size={28} /></Stack>
              ) : (
                <Stack spacing={1.5}>
                  {(data?.concepts ?? []).map((concept) => (
                    <Paper key={concept.id} variant="outlined" sx={{ p: 1.5, borderRadius: 2.5 }}>
                      <Stack direction="row" justifyContent="space-between" gap={2} mb={1}>
                        <Box>
                          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{concept.title}</Typography>
                          <Typography variant="body2" color="text.secondary">{concept.definition}</Typography>
                        </Box>
                        <Chip size="small" label={concept.category} />
                      </Stack>
                      <Stack direction="row" gap={1} flexWrap="wrap">
                        {concept.heuristics.slice(0, 3).map((item) => (
                          <Chip key={item} size="small" variant="outlined" label={item} />
                        ))}
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              )}
            </SectionCard>
          </Grid>

          <Grid size={{ xs: 12, lg: 6 }}>
            <SectionCard
              title="Trend radar"
              subtitle="Padrões recorrentes detectados nas referências analisadas."
            >
              {loading ? (
                <Stack alignItems="center" py={6}><CircularProgress size={28} /></Stack>
              ) : (
                <Stack spacing={1.25}>
                  {(data?.trends ?? []).map((trend) => (
                    <Paper key={trend.id} variant="outlined" sx={{ p: 1.5, borderRadius: 2.5 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" gap={2}>
                        <Box>
                          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{trend.tag}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {trend.cluster_key} {trend.platform ? `• ${trend.platform}` : ''} {trend.segment ? `• ${trend.segment}` : ''}
                          </Typography>
                        </Box>
                        <Chip
                          size="small"
                          color={trend.momentum > 0 ? 'success' : 'default'}
                          label={`score ${Number(trend.trend_score || 0).toFixed(0)}`}
                        />
                      </Stack>
                      <Stack direction="row" gap={1} mt={1.25} flexWrap="wrap">
                        <Chip size="small" label={`momentum ${Number(trend.momentum || 0).toFixed(2)}`} />
                        <Chip size="small" label={`amostra ${trend.sample_size}`} />
                        <Chip size="small" label={`trust ${Number(trend.trust_score || 0).toFixed(2)}`} />
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              )}
            </SectionCard>
          </Grid>
        </Grid>

        <SectionCard
          title="Reference memory"
          subtitle="Referências já capturadas e analisadas que o motor usa como repertório vivo."
        >
          {loading ? (
            <Stack alignItems="center" py={6}><CircularProgress size={28} /></Stack>
          ) : (
            <Grid container spacing={2}>
              {(data?.references ?? []).map((reference) => (
                <Grid key={reference.id} size={{ xs: 12, xl: 6 }}>
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, height: '100%' }}>
                    <Stack direction="row" justifyContent="space-between" gap={2}>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                          {reference.title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {reference.platform || 'geral'}{reference.format ? ` • ${reference.format}` : ''}{reference.segment ? ` • ${reference.segment}` : ''} • {timeAgo(reference.discovered_at)}
                        </Typography>
                      </Box>
                      <Button
                        size="small"
                        component={Link}
                        href={reference.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        endIcon={<IconArrowUpRight size={14} />}
                      >
                        Abrir
                      </Button>
                    </Stack>

                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      {reference.rationale || reference.creative_direction || reference.visual_intent || 'Sem racional salvo.'}
                    </Typography>

                    <Stack direction="row" gap={1} flexWrap="wrap" mt={1.5}>
                      {(uniqueTags(reference)).map((tag) => (
                        <Chip key={tag} size="small" variant="outlined" label={tag} />
                      ))}
                    </Stack>

                    <Divider sx={{ my: 1.5 }} />

                    <Stack direction="row" gap={1} flexWrap="wrap">
                      <Chip size="small" label={`trend ${Number(reference.trend_score || 0).toFixed(0)}`} />
                      <Chip size="small" label={`confidence ${Number(reference.confidence_score || 0).toFixed(2)}`} />
                      <Button size="small" onClick={() => void sendFeedback(reference.id, 'used')}>Usada</Button>
                      <Button size="small" onClick={() => void sendFeedback(reference.id, 'approved')}>Aprovada</Button>
                      <Button size="small" color="error" onClick={() => void sendFeedback(reference.id, 'rejected')}>Ruim</Button>
                    </Stack>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          )}
        </SectionCard>

        <Grid container spacing={2.5}>
          <Grid size={{ xs: 12, lg: 6 }}>
            <SectionCard
              title="Bloco de prompt"
              subtitle="O resumo que o motor envia para geração como memória externa."
              action={<IconRoute size={18} color="#5D87FF" />}
            >
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5, bgcolor: '#0f172a', color: '#e2e8f0', overflowX: 'auto' }}>
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'ui-monospace, SFMono-Regular, monospace', fontSize: 12 }}>
                  {data?.memory?.promptBlock || 'Sem bloco gerado ainda para este recorte.'}
                </pre>
              </Paper>
            </SectionCard>
          </Grid>
          <Grid size={{ xs: 12, lg: 6 }}>
            <SectionCard
              title="Bloco de critique"
              subtitle="Os critérios extras que entram na revisão de direção de arte."
              action={<IconChecklist size={18} color="#13DEB9" />}
            >
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5, bgcolor: '#111827', color: '#d1fae5', overflowX: 'auto' }}>
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'ui-monospace, SFMono-Regular, monospace', fontSize: 12 }}>
                  {data?.memory?.critiqueBlock || 'Sem bloco crítico gerado ainda para este recorte.'}
                </pre>
              </Paper>
            </SectionCard>
          </Grid>
        </Grid>
      </Stack>
    </Box>
  );
}
