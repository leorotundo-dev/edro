'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormGroup from '@mui/material/FormGroup';
import FormLabel from '@mui/material/FormLabel';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import {
  IconArrowLeft,
  IconCheck,
  IconChevronDown,
  IconPlus,
  IconSend,
  IconTrash,
  IconX,
} from '@tabler/icons-react';
import { apiGet, apiPost } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface BehaviorCluster {
  id: string;
  cluster_type: string;
  cluster_label: string;
  preferred_amd: string;
  preferred_triggers: string[];
  preferred_format: string;
  avg_save_rate: number;
  avg_click_rate: number;
  avg_engagement_rate: number;
}

interface Piece {
  format_type: string;
  platform: string;
  versions: number;
  priority: 'alta' | 'media' | 'baixa';
  notes: string;
  sort_order: number;
}

interface BriefingData {
  context_trigger: string;
  consumer_moment: string;
  main_risk: string;
  main_objective: string;
  success_metrics: string[];
  target_cluster_ids: string[];
  specific_barriers: string[];
  message_structure: string;
  desired_emotion: string[];
  desired_amd: string;
  tone_override: null | Record<string, any>;
  regulatory_flags: string[];
  ref_links: string[];
  ref_notes: string;
}

const EMPTY: BriefingData = {
  context_trigger: '',
  consumer_moment: '',
  main_risk: '',
  main_objective: '',
  success_metrics: [],
  target_cluster_ids: [],
  specific_barriers: [],
  message_structure: '',
  desired_emotion: [],
  desired_amd: '',
  tone_override: null,
  regulatory_flags: [],
  ref_links: [],
  ref_notes: '',
};

const EMPTY_PIECE = (): Piece => ({
  format_type: 'post_feed',
  platform: 'instagram',
  versions: 1,
  priority: 'media',
  notes: '',
  sort_order: 0,
});

// ─── Option maps ──────────────────────────────────────────────────────────────

const CONTEXT_TRIGGERS = [
  { value: 'lançamento_produto', label: 'Lançamento de produto ou serviço' },
  { value: 'ativacao_sazonalidade', label: 'Ativação sazonal (data especial, período)' },
  { value: 'oportunidade_tendencia', label: 'Oportunidade de tendência ou notícia' },
  { value: 'demanda_cliente', label: 'Demanda direta do cliente' },
  { value: 'estrategia_proativa', label: 'Estratégia proativa (calendário editorial)' },
  { value: 'crise_reputacao', label: 'Gestão de crise ou reputação' },
];

const CONSUMER_MOMENTS = [
  { value: 'descobrindo_problema', label: 'Descobrindo o problema — ainda não sabe que precisa' },
  { value: 'comparando_solucoes', label: 'Comparando soluções — avaliando opções' },
  { value: 'decidindo_compra', label: 'Decidindo a compra — quase pronto para agir' },
  { value: 'ja_cliente_upsell', label: 'Já cliente — upsell ou cross-sell' },
  { value: 'pos_compra_retencao', label: 'Pós-compra — retenção e fidelização' },
];

const MAIN_RISKS = [
  { value: 'mensagem_generica', label: 'Mensagem genérica — poderia ser de qualquer marca' },
  { value: 'publico_errado', label: 'Público errado — não fala com quem importa' },
  { value: 'timing_incorreto', label: 'Timing incorreto — momento inadequado' },
  { value: 'tom_inadequado', label: 'Tom inadequado — fora da personalidade da marca' },
  { value: 'saturacao_formato', label: 'Saturação de formato — mesmo estilo repetido' },
];

const OBJECTIVES = [
  { value: 'reconhecimento', label: 'Reconhecimento de marca' },
  { value: 'engajamento', label: 'Engajamento e comunidade' },
  { value: 'conversao', label: 'Conversão (lead, venda, cadastro)' },
  { value: 'performance', label: 'Performance (tráfego, cliques, ROAS)' },
  { value: 'mix', label: 'Mix (múltiplos objetivos)' },
];

const SUCCESS_METRICS = [
  { value: 'taxa_salvamento', label: 'Taxa de salvamento' },
  { value: 'ctr', label: 'CTR (cliques no link)' },
  { value: 'leads', label: 'Leads gerados' },
  { value: 'alcance', label: 'Alcance orgânico' },
  { value: 'engajamento', label: 'Taxa de engajamento' },
  { value: 'vendas', label: 'Vendas diretas' },
  { value: 'compartilhamentos', label: 'Compartilhamentos' },
];

const BARRIERS = [
  { value: 'preco_alto', label: 'Preço percebido como alto' },
  { value: 'nao_conhece_marca', label: 'Não conhece a marca' },
  { value: 'momento_errado', label: 'Momento de vida errado' },
  { value: 'nao_percebe_valor', label: 'Não percebe o valor diferenciado' },
  { value: 'concorrente_preferido', label: 'Tem preferência por concorrente' },
  { value: 'excesso_informacao', label: 'Sobrecarga de informação' },
];

const MESSAGE_STRUCTURES = [
  { value: 'prova_social', label: 'Prova social — cases, depoimentos, números' },
  { value: 'transformacao', label: 'Transformação — antes e depois' },
  { value: 'contraste', label: 'Contraste — "errado vs. certo"' },
  { value: 'urgencia', label: 'Urgência — agir agora ou perder' },
  { value: 'curiosidade', label: 'Curiosidade — revelação progressiva' },
  { value: 'storytelling', label: 'Storytelling — narrativa emocional' },
  { value: 'dado_surpreendente', label: 'Dado surpreendente — fato inesperado como gancho' },
];

const EMOTIONS = [
  { value: 'confianca', label: 'Confiança' },
  { value: 'pertencimento', label: 'Pertencimento' },
  { value: 'urgencia', label: 'Urgência' },
  { value: 'admiracao', label: 'Admiração' },
  { value: 'alivio', label: 'Alívio' },
  { value: 'inspiracao', label: 'Inspiração' },
  { value: 'divertimento', label: 'Diversão' },
  { value: 'nostalgia', label: 'Nostalgia' },
];

const AMDS = [
  { value: 'salvar', label: 'Salvar o conteúdo' },
  { value: 'clicar', label: 'Clicar no link' },
  { value: 'compartilhar', label: 'Compartilhar' },
  { value: 'responder', label: 'Comentar ou responder' },
  { value: 'marcar_amigo', label: 'Marcar um amigo' },
  { value: 'proposta_direta', label: 'Solicitar proposta ou orçamento' },
];

const REGULATORY_FLAGS = [
  { value: 'linguagem_promocional', label: 'Linguagem promocional (sorteio, promoção, desconto)' },
  { value: 'produto_financeiro', label: 'Produto financeiro (banco, crédito, seguro)' },
  { value: 'alimento_bebida', label: 'Alimento ou bebida (ANVISA)' },
  { value: 'saude_medicamento', label: 'Saúde ou medicamento' },
  { value: 'infantil', label: 'Público infantil' },
  { value: 'politico', label: 'Contexto político ou eleitoral' },
  { value: 'sem_restricoes', label: 'Sem restrições regulatórias' },
];

const FORMAT_TYPES = [
  { value: 'post_feed', label: 'Post de feed' },
  { value: 'carrossel', label: 'Carrossel' },
  { value: 'reels', label: 'Reels / TikTok' },
  { value: 'stories', label: 'Stories' },
  { value: 'copy_legenda', label: 'Copy (legenda / texto)' },
  { value: 'roteiro_video', label: 'Roteiro de vídeo' },
  { value: 'blog', label: 'Post de blog' },
  { value: 'email', label: 'E-mail marketing' },
  { value: 'ads_copy', label: 'Copy para anúncio (Ads)' },
  { value: 'thread', label: 'Thread / fio' },
  { value: 'banner', label: 'Banner / display' },
  { value: 'outro', label: 'Outro' },
];

const PLATFORMS = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'blog', label: 'Blog' },
  { value: 'email', label: 'E-mail' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'outro', label: 'Outro' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toggleItem<T>(arr: T[], item: T): T[] {
  return arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item];
}

function CheckboxGroup({
  label,
  options,
  value,
  onChange,
  max,
}: {
  label?: string;
  options: { value: string; label: string }[];
  value: string[];
  onChange: (v: string[]) => void;
  max?: number;
}) {
  return (
    <FormControl component="fieldset" sx={{ width: '100%' }}>
      {label && <FormLabel component="legend" sx={{ mb: 1, fontSize: '0.85rem', fontWeight: 600 }}>{label}</FormLabel>}
      <FormGroup row sx={{ gap: 0.5, flexWrap: 'wrap' }}>
        {options.map((opt) => {
          const checked = value.includes(opt.value);
          const disabled = !checked && max !== undefined && value.length >= max;
          return (
            <FormControlLabel
              key={opt.value}
              control={
                <Checkbox
                  size="small"
                  checked={checked}
                  disabled={disabled}
                  onChange={() => onChange(toggleItem(value, opt.value))}
                />
              }
              label={opt.label}
              sx={{ m: 0, mr: 1 }}
            />
          );
        })}
      </FormGroup>
      {max && <Typography variant="caption" color="text.secondary">{value.length}/{max} selecionados</Typography>}
    </FormControl>
  );
}

function RadioCards({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  const theme = useTheme();
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
      {options.map((opt) => {
        const selected = value === opt.value;
        return (
          <Paper
            key={opt.value}
            onClick={() => onChange(opt.value)}
            sx={{
              px: 2,
              py: 1,
              cursor: 'pointer',
              border: '1.5px solid',
              borderColor: selected ? theme.palette.primary.main : theme.palette.divider,
              bgcolor: selected ? alpha(theme.palette.primary.main, 0.07) : 'background.paper',
              borderRadius: 2,
              transition: 'all 0.15s',
              '&:hover': { borderColor: theme.palette.primary.main },
            }}
          >
            <Typography variant="body2" fontWeight={selected ? 700 : 400} color={selected ? 'primary' : 'text.primary'}>
              {opt.label}
            </Typography>
          </Paper>
        );
      })}
    </Box>
  );
}

function SectionHeader({ number, title, subtitle }: { number: number; title: string; subtitle?: string }) {
  const theme = useTheme();
  return (
    <Stack direction="row" spacing={1.5} alignItems="flex-start">
      <Box
        sx={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          bgcolor: theme.palette.primary.main,
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 700,
          fontSize: '0.8rem',
          flexShrink: 0,
          mt: 0.2,
        }}
      >
        {number}
      </Box>
      <Box>
        <Typography variant="subtitle1" fontWeight={700}>{title}</Typography>
        {subtitle && <Typography variant="caption" color="text.secondary">{subtitle}</Typography>}
      </Box>
    </Stack>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function BriefingFormClient({ jobId }: { jobId: string }) {
  const router = useRouter();
  const theme = useTheme();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [job, setJob] = useState<any>(null);
  const [clientCtx, setClientCtx] = useState<any>({});
  const [briefingStatus, setBriefingStatus] = useState<string>('draft');

  const [form, setForm] = useState<BriefingData>(EMPTY);
  const [pieces, setPieces] = useState<Piece[]>([EMPTY_PIECE()]);
  const [toneOverrideOpen, setToneOverrideOpen] = useState(false);

  // ── Load ────────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet<any>(`/jobs/${jobId}/briefing`);
      setJob(res.job);
      setClientCtx(res.client_context ?? {});
      if (res.briefing) {
        const b = res.briefing;
        setBriefingStatus(b.status);
        setForm({
          context_trigger: b.context_trigger ?? '',
          consumer_moment: b.consumer_moment ?? '',
          main_risk: b.main_risk ?? '',
          main_objective: b.main_objective ?? '',
          success_metrics: b.success_metrics ?? [],
          target_cluster_ids: b.target_cluster_ids ?? [],
          specific_barriers: b.specific_barriers ?? [],
          message_structure: b.message_structure ?? '',
          desired_emotion: b.desired_emotion ?? [],
          desired_amd: b.desired_amd ?? '',
          tone_override: b.tone_override ?? null,
          regulatory_flags: b.regulatory_flags ?? [],
          ref_links: b.ref_links ?? [],
          ref_notes: b.ref_notes ?? '',
        });
        if (b.tone_override) setToneOverrideOpen(true);
      }
      if (res.pieces?.length) {
        setPieces(res.pieces.map((p: any) => ({
          format_type: p.format_type,
          platform: p.platform ?? 'instagram',
          versions: p.versions ?? 1,
          priority: p.priority ?? 'media',
          notes: p.notes ?? '',
          sort_order: p.sort_order ?? 0,
        })));
      }
    } catch (e: any) {
      setError(e.message || 'Erro ao carregar briefing.');
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => { load(); }, [load]);

  // ── Save ────────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await apiPost(`/jobs/${jobId}/briefing`, {
        ...form,
        context_trigger: form.context_trigger || null,
        consumer_moment: form.consumer_moment || null,
        main_risk: form.main_risk || null,
        main_objective: form.main_objective || null,
        desired_amd: form.desired_amd || null,
        message_structure: form.message_structure || null,
        tone_override: toneOverrideOpen ? form.tone_override : null,
        pieces: pieces.map((p, i) => ({ ...p, sort_order: i, notes: p.notes || null })),
      });
      setSuccessMsg('Briefing salvo.');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (e: any) {
      setError(e.message || 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await handleSave();
      await apiPost(`/jobs/${jobId}/briefing/submit`, {});
      setBriefingStatus('submitted');
      setSuccessMsg('Briefing submetido para aprovação.');
    } catch (e: any) {
      setError(e.message || 'Erro ao submeter.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Validation ──────────────────────────────────────────────────────────────
  const checks = {
    cliente: !!job?.client_id,
    objetivo: !!form.main_objective,
    amd: !!form.desired_amd,
    contexto: !!form.context_trigger,
    pecas: pieces.length > 0 && !!pieces[0]?.format_type,
  };
  const allValid = Object.values(checks).every(Boolean);
  const isReadOnly = briefingStatus !== 'draft';

  // ── Pieces helpers ──────────────────────────────────────────────────────────
  const addPiece = () => setPieces((p) => [...p, { ...EMPTY_PIECE(), sort_order: p.length }]);
  const removePiece = (i: number) => setPieces((p) => p.filter((_, idx) => idx !== i));
  const updatePiece = (i: number, patch: Partial<Piece>) =>
    setPieces((p) => p.map((piece, idx) => (idx === i ? { ...piece, ...patch } : piece)));

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  const accordionSx = {
    mb: 1,
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: '12px !important',
    '&:before': { display: 'none' },
    boxShadow: 'none',
  };

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', py: 3, px: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
        <IconButton onClick={() => router.back()} size="small">
          <IconArrowLeft size={18} />
        </IconButton>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h5" fontWeight={700}>Briefing Inteligente</Typography>
          {job && (
            <Typography variant="body2" color="text.secondary">
              {job.title} · {job.client_name}
            </Typography>
          )}
        </Box>
        {briefingStatus !== 'draft' && (
          <Chip
            label={briefingStatus === 'submitted' ? 'Aguardando aprovação' : briefingStatus === 'approved' ? 'Aprovado' : briefingStatus}
            color={briefingStatus === 'approved' ? 'success' : 'warning'}
            size="small"
          />
        )}
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {successMsg && <Alert severity="success" sx={{ mb: 2 }}>{successMsg}</Alert>}

      {isReadOnly && (
        <Alert severity="info" sx={{ mb: 2 }}>
          O briefing foi submetido e não pode ser editado. Para editar, solicite rejeição ao responsável.
        </Alert>
      )}

      {/* Bloco 1: Identificação */}
      <Accordion defaultExpanded sx={accordionSx}>
        <AccordionSummary expandIcon={<IconChevronDown size={18} />}>
          <SectionHeader number={1} title="Identificação" subtitle="Dados do job — preenchidos automaticamente" />
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={2}>
            <Stack direction="row" spacing={2} flexWrap="wrap">
              <Box sx={{ flex: 1, minWidth: 200 }}>
                <Typography variant="caption" color="text.secondary">Cliente</Typography>
                <Typography fontWeight={600}>{job?.client_name ?? '—'}</Typography>
              </Box>
              <Box sx={{ flex: 1, minWidth: 200 }}>
                <Typography variant="caption" color="text.secondary">Tipo de job</Typography>
                <Typography fontWeight={600}>{job?.job_type ?? '—'}</Typography>
              </Box>
            </Stack>
            <Box>
              <Typography variant="caption" color="text.secondary">Título</Typography>
              <Typography fontWeight={600}>{job?.title ?? '—'}</Typography>
            </Box>
          </Stack>
        </AccordionDetails>
      </Accordion>

      {/* Bloco 2: Contexto */}
      <Accordion defaultExpanded sx={accordionSx}>
        <AccordionSummary expandIcon={<IconChevronDown size={18} />}>
          <SectionHeader number={2} title="O Contexto" subtitle="Por que este job existe agora?" />
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={3}>
            <Box>
              <Typography variant="subtitle2" gutterBottom>Por que este job existe?</Typography>
              <RadioCards
                options={CONTEXT_TRIGGERS}
                value={form.context_trigger}
                onChange={(v) => !isReadOnly && setForm((f) => ({ ...f, context_trigger: v }))}
              />
            </Box>
            <Box>
              <Typography variant="subtitle2" gutterBottom>Momento do consumidor</Typography>
              <RadioCards
                options={CONSUMER_MOMENTS}
                value={form.consumer_moment}
                onChange={(v) => !isReadOnly && setForm((f) => ({ ...f, consumer_moment: v }))}
              />
            </Box>
            <Box>
              <Typography variant="subtitle2" gutterBottom>Principal risco deste job</Typography>
              <RadioCards
                options={MAIN_RISKS}
                value={form.main_risk}
                onChange={(v) => !isReadOnly && setForm((f) => ({ ...f, main_risk: v }))}
              />
            </Box>
          </Stack>
        </AccordionDetails>
      </Accordion>

      {/* Bloco 3: Objetivo */}
      <Accordion defaultExpanded sx={accordionSx}>
        <AccordionSummary expandIcon={<IconChevronDown size={18} />}>
          <SectionHeader number={3} title="O Objetivo" subtitle="O que este job precisa gerar?" />
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={3}>
            <Box>
              <Typography variant="subtitle2" gutterBottom>Objetivo principal</Typography>
              <RadioCards
                options={OBJECTIVES}
                value={form.main_objective}
                onChange={(v) => !isReadOnly && setForm((f) => ({ ...f, main_objective: v }))}
              />
            </Box>
            <CheckboxGroup
              label="Como medir o sucesso? (selecione até 3)"
              options={SUCCESS_METRICS}
              value={form.success_metrics}
              onChange={(v) => !isReadOnly && setForm((f) => ({ ...f, success_metrics: v }))}
              max={3}
            />
          </Stack>
        </AccordionDetails>
      </Accordion>

      {/* Bloco 4: Público */}
      <Accordion defaultExpanded sx={accordionSx}>
        <AccordionSummary expandIcon={<IconChevronDown size={18} />}>
          <SectionHeader number={4} title="O Público" subtitle="Quem queremos atingir com este job?" />
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={3}>
            {clientCtx.behavior_clusters?.length > 0 ? (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Segmentos de audiência deste cliente (selecione até 2)
                </Typography>
                <Stack spacing={1}>
                  {clientCtx.behavior_clusters.map((c: BehaviorCluster) => {
                    const selected = form.target_cluster_ids.includes(c.id);
                    const disabled = !selected && form.target_cluster_ids.length >= 2;
                    return (
                      <Paper
                        key={c.id}
                        onClick={() => {
                          if (isReadOnly || disabled) return;
                          setForm((f) => ({
                            ...f,
                            target_cluster_ids: toggleItem(f.target_cluster_ids, c.id),
                          }));
                        }}
                        sx={{
                          p: 1.5,
                          cursor: disabled ? 'not-allowed' : 'pointer',
                          border: '1.5px solid',
                          borderColor: selected ? theme.palette.primary.main : theme.palette.divider,
                          bgcolor: selected ? alpha(theme.palette.primary.main, 0.05) : 'background.paper',
                          borderRadius: 2,
                          opacity: disabled ? 0.5 : 1,
                        }}
                      >
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Box>
                            <Typography variant="body2" fontWeight={700}>{c.cluster_label}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              AMD preferido: {c.preferred_amd} · Formato: {c.preferred_format}
                            </Typography>
                          </Box>
                          <Stack direction="row" spacing={1}>
                            <Chip label={`${((c.avg_save_rate ?? 0) * 100).toFixed(1)}% save`} size="small" variant="outlined" />
                            <Chip label={`${((c.avg_engagement_rate ?? 0) * 100).toFixed(1)}% eng.`} size="small" variant="outlined" />
                          </Stack>
                        </Stack>
                      </Paper>
                    );
                  })}
                </Stack>
                {!clientCtx.behavior_clusters.length && (
                  <Alert severity="info" sx={{ mt: 1 }}>
                    Nenhum cluster calculado ainda. Serão usados benchmarks gerais.
                  </Alert>
                )}
              </Box>
            ) : (
              <Alert severity="info">
                Cliente sem clusters de audiência calculados. Os dados de performance precisam ser sincronizados para gerar clusters.
              </Alert>
            )}
            <CheckboxGroup
              label="Principais barreiras de conversão para este job (selecione até 3)"
              options={BARRIERS}
              value={form.specific_barriers}
              onChange={(v) => !isReadOnly && setForm((f) => ({ ...f, specific_barriers: v }))}
              max={3}
            />
          </Stack>
        </AccordionDetails>
      </Accordion>

      {/* Bloco 5: A Mensagem */}
      <Accordion defaultExpanded sx={accordionSx}>
        <AccordionSummary expandIcon={<IconChevronDown size={18} />}>
          <SectionHeader number={5} title="A Mensagem" subtitle="Como a comunicação deve funcionar?" />
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={3}>
            <Box>
              <Typography variant="subtitle2" gutterBottom>Estrutura da mensagem</Typography>
              <RadioCards
                options={MESSAGE_STRUCTURES}
                value={form.message_structure}
                onChange={(v) => !isReadOnly && setForm((f) => ({ ...f, message_structure: v }))}
              />
            </Box>
            <CheckboxGroup
              label="Emoção desejada no público (selecione até 2)"
              options={EMOTIONS}
              value={form.desired_emotion}
              onChange={(v) => !isReadOnly && setForm((f) => ({ ...f, desired_emotion: v }))}
              max={2}
            />
            <Box>
              <Typography variant="subtitle2" gutterBottom>Ação desejada (AMD)</Typography>
              <RadioCards
                options={AMDS}
                value={form.desired_amd}
                onChange={(v) => !isReadOnly && setForm((f) => ({ ...f, desired_amd: v }))}
              />
            </Box>
          </Stack>
        </AccordionDetails>
      </Accordion>

      {/* Bloco 6: Tom de Voz — pré-preenchido do perfil */}
      <Accordion sx={accordionSx}>
        <AccordionSummary expandIcon={<IconChevronDown size={18} />}>
          <SectionHeader
            number={6}
            title="Tom de Voz"
            subtitle="Carregado do perfil do cliente — ajuste apenas se necessário"
          />
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={2}>
            <Card variant="outlined" sx={{ bgcolor: alpha(theme.palette.info.main, 0.04) }}>
              <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                  Tom registrado no perfil do cliente
                </Typography>
                <Stack spacing={0.5}>
                  {clientCtx.tone_description && (
                    <Typography variant="body2"><strong>Tom:</strong> {clientCtx.tone_description}</Typography>
                  )}
                  {clientCtx.personality_traits?.length > 0 && (
                    <Typography variant="body2">
                      <strong>Traços:</strong> {clientCtx.personality_traits.join(', ')}
                    </Typography>
                  )}
                  {clientCtx.formality_level && (
                    <Typography variant="body2"><strong>Formalidade:</strong> {clientCtx.formality_level}</Typography>
                  )}
                  {clientCtx.reference_brands?.length > 0 && (
                    <Typography variant="body2">
                      <strong>Referências de tom:</strong> {clientCtx.reference_brands.join(', ')}
                    </Typography>
                  )}
                  {clientCtx.forbidden_claims?.length > 0 && (
                    <Typography variant="body2">
                      <strong>Evitar:</strong> {clientCtx.forbidden_claims.join(', ')}
                    </Typography>
                  )}
                  {!clientCtx.tone_description && !clientCtx.personality_traits?.length && (
                    <Typography variant="body2" color="text.secondary">
                      Perfil de tom não configurado ainda. Configure no cadastro do cliente.
                    </Typography>
                  )}
                </Stack>
              </CardContent>
            </Card>

            {!isReadOnly && (
              <FormControlLabel
                control={
                  <Switch
                    checked={toneOverrideOpen}
                    onChange={(e) => {
                      setToneOverrideOpen(e.target.checked);
                      if (!e.target.checked) setForm((f) => ({ ...f, tone_override: null }));
                      else setForm((f) => ({ ...f, tone_override: {} }));
                    }}
                  />
                }
                label="Ajustar tom especificamente para este job"
              />
            )}

            {toneOverrideOpen && (
              <Stack spacing={2}>
                <TextField
                  label="Descrição de tom para este job"
                  size="small"
                  fullWidth
                  value={form.tone_override?.tone_description ?? ''}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, tone_override: { ...f.tone_override, tone_description: e.target.value } }))
                  }
                  disabled={isReadOnly}
                  placeholder="Ex: mais urgente e direto do que o habitual"
                />
                <TextField
                  label="Formalidade"
                  size="small"
                  fullWidth
                  value={form.tone_override?.formality_level ?? ''}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, tone_override: { ...f.tone_override, formality_level: e.target.value } }))
                  }
                  disabled={isReadOnly}
                />
              </Stack>
            )}
          </Stack>
        </AccordionDetails>
      </Accordion>

      {/* Bloco 7: Restrições */}
      <Accordion sx={accordionSx}>
        <AccordionSummary expandIcon={<IconChevronDown size={18} />}>
          <SectionHeader number={7} title="Restrições" subtitle="Regulatórias específicas deste job" />
        </AccordionSummary>
        <AccordionDetails>
          <CheckboxGroup
            options={REGULATORY_FLAGS}
            value={form.regulatory_flags}
            onChange={(v) => !isReadOnly && setForm((f) => ({ ...f, regulatory_flags: v }))}
          />
        </AccordionDetails>
      </Accordion>

      {/* Bloco 8: As Peças */}
      <Accordion defaultExpanded sx={accordionSx}>
        <AccordionSummary expandIcon={<IconChevronDown size={18} />}>
          <SectionHeader number={8} title="As Peças" subtitle="Formatos e entregáveis solicitados" />
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={2}>
            {pieces.map((piece, i) => (
              <Paper key={i} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                <Stack spacing={2}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="subtitle2" fontWeight={700}>Peça {i + 1}</Typography>
                    {!isReadOnly && pieces.length > 1 && (
                      <IconButton size="small" onClick={() => removePiece(i)} color="error">
                        <IconTrash size={16} />
                      </IconButton>
                    )}
                  </Stack>
                  <Stack direction="row" spacing={2} flexWrap="wrap">
                    <FormControl size="small" sx={{ minWidth: 180 }}>
                      <Select
                        value={piece.format_type}
                        onChange={(e) => updatePiece(i, { format_type: e.target.value })}
                        disabled={isReadOnly}
                        displayEmpty
                      >
                        {FORMAT_TYPES.map((f) => (
                          <MenuItem key={f.value} value={f.value}>{f.label}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ minWidth: 140 }}>
                      <Select
                        value={piece.platform}
                        onChange={(e) => updatePiece(i, { platform: e.target.value })}
                        disabled={isReadOnly}
                      >
                        {PLATFORMS.map((p) => (
                          <MenuItem key={p.value} value={p.value}>{p.label}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <TextField
                      label="Versões"
                      type="number"
                      size="small"
                      value={piece.versions}
                      onChange={(e) => updatePiece(i, { versions: Math.max(1, Math.min(10, Number(e.target.value))) })}
                      disabled={isReadOnly}
                      sx={{ width: 90 }}
                      inputProps={{ min: 1, max: 10 }}
                    />
                    <FormControl size="small" sx={{ minWidth: 110 }}>
                      <Select
                        value={piece.priority}
                        onChange={(e) => updatePiece(i, { priority: e.target.value as Piece['priority'] })}
                        disabled={isReadOnly}
                      >
                        <MenuItem value="alta">Alta</MenuItem>
                        <MenuItem value="media">Média</MenuItem>
                        <MenuItem value="baixa">Baixa</MenuItem>
                      </Select>
                    </FormControl>
                  </Stack>
                  <TextField
                    label="Instruções específicas (opcional)"
                    size="small"
                    fullWidth
                    value={piece.notes}
                    onChange={(e) => updatePiece(i, { notes: e.target.value })}
                    disabled={isReadOnly}
                    multiline
                    rows={2}
                  />
                </Stack>
              </Paper>
            ))}

            {!isReadOnly && (
              <Button
                startIcon={<IconPlus size={16} />}
                onClick={addPiece}
                variant="outlined"
                size="small"
                sx={{ alignSelf: 'flex-start' }}
              >
                Adicionar peça
              </Button>
            )}
          </Stack>
        </AccordionDetails>
      </Accordion>

      {/* Bloco 9: Referências */}
      <Accordion sx={accordionSx}>
        <AccordionSummary expandIcon={<IconChevronDown size={18} />}>
          <SectionHeader number={9} title="Referências" subtitle="Visuais e instruções específicas" />
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={2}>
            {clientCtx.visual_style && (
              <Card variant="outlined" sx={{ bgcolor: alpha(theme.palette.info.main, 0.04) }}>
                <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                    Estilo visual do cliente (carregado do perfil)
                  </Typography>
                  <Typography variant="body2">{clientCtx.visual_style}</Typography>
                  {clientCtx.dominant_colors?.length > 0 && (
                    <Stack direction="row" spacing={0.5} sx={{ mt: 1 }}>
                      {clientCtx.dominant_colors.slice(0, 6).map((c: string, i: number) => (
                        <Tooltip key={i} title={c}>
                          <Box sx={{ width: 20, height: 20, bgcolor: c, borderRadius: '4px', border: '1px solid rgba(0,0,0,0.1)' }} />
                        </Tooltip>
                      ))}
                    </Stack>
                  )}
                </CardContent>
              </Card>
            )}

            <TextField
              label="Notas e referências específicas para este job"
              fullWidth
              multiline
              rows={3}
              size="small"
              value={form.ref_notes}
              onChange={(e) => !isReadOnly && setForm((f) => ({ ...f, ref_notes: e.target.value }))}
              disabled={isReadOnly}
              placeholder="Descreva referências visuais, campanhas que inspiram, instruções específicas..."
            />
          </Stack>
        </AccordionDetails>
      </Accordion>

      {/* Bloco 10: Validação */}
      <Accordion defaultExpanded sx={accordionSx}>
        <AccordionSummary expandIcon={<IconChevronDown size={18} />}>
          <SectionHeader number={10} title="Validação" subtitle="Checklist automático antes de submeter" />
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={1}>
            {[
              { key: 'cliente', label: 'Cliente associado ao job' },
              { key: 'objetivo', label: 'Objetivo principal definido' },
              { key: 'amd', label: 'Ação desejada (AMD) selecionada' },
              { key: 'contexto', label: 'Contexto do job preenchido' },
              { key: 'pecas', label: 'Pelo menos uma peça definida' },
            ].map(({ key, label }) => {
              const ok = checks[key as keyof typeof checks];
              return (
                <Stack key={key} direction="row" spacing={1} alignItems="center">
                  <Box
                    sx={{
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      bgcolor: ok ? 'success.main' : 'action.disabled',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {ok ? <IconCheck size={12} color="#fff" /> : <IconX size={12} color="#fff" />}
                  </Box>
                  <Typography variant="body2" color={ok ? 'text.primary' : 'text.secondary'}>
                    {label}
                  </Typography>
                </Stack>
              );
            })}
          </Stack>

          {!allValid && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              Preencha todos os itens obrigatórios antes de submeter.
            </Alert>
          )}
        </AccordionDetails>
      </Accordion>

      {/* Action buttons */}
      {!isReadOnly && (
        <Stack direction="row" spacing={2} justifyContent="flex-end" sx={{ mt: 3 }}>
          <Button
            variant="outlined"
            onClick={handleSave}
            disabled={saving || submitting}
            startIcon={saving ? <CircularProgress size={16} /> : undefined}
          >
            Salvar rascunho
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={!allValid || submitting || saving}
            startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : <IconSend size={16} />}
          >
            Submeter para aprovação
          </Button>
        </Stack>
      )}
    </Box>
  );
}
