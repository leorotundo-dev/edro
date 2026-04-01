'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Stepper from '@mui/material/Stepper';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import {
  IconBrandInstagram, IconBrandLinkedin, IconBrandFacebook,
  IconBrandTiktok, IconBrandGoogle, IconBrandYoutube,
  IconBrandWhatsapp, IconMail, IconWorld, IconApps,
  IconPhoto, IconTarget, IconPalette, IconDeviceLaptop,
  IconVideo, IconPresentation, IconDots, IconBulb,
} from '@tabler/icons-react';

// ── Constants ──────────────────────────────────────────────────────────────────

const BUDGET_RANGES = [
  'Até R$ 1.000', 'R$ 1.000–5.000', 'R$ 5.000–15.000', 'Acima de R$ 15.000', 'A definir',
];

const STEPS = ['Objetivo', 'Tipo & plataforma', 'Revisão com IA', 'Confirmar'];

const JOB_TYPES = [
  {
    value: 'Post para redes sociais',
    icon: IconPhoto,
    iconColor: '#E1306C',
    description: 'Conteúdo visual para feed, stories e reels',
    hint: 'Instagram · LinkedIn · TikTok · Facebook',
    keywords: ['post', 'publicação', 'feed', 'stories', 'reel', 'conteúdo', 'social'],
  },
  {
    value: 'Campanha de tráfego pago',
    icon: IconTarget,
    iconColor: '#4285F4',
    description: 'Anúncios com foco em conversão e alcance',
    hint: 'Google Ads · Meta Ads · LinkedIn Ads',
    keywords: ['anúncio', 'anuncio', 'tráfego', 'trafego', 'ads', 'campanha', 'cpc', 'pago'],
  },
  {
    value: 'Email marketing',
    icon: IconMail,
    iconColor: '#EA4335',
    description: 'Comunicação direta com sua base de contatos',
    hint: 'Template 600px · Newsletter',
    keywords: ['email', 'e-mail', 'newsletter', 'disparo'],
  },
  {
    value: 'Identidade visual',
    icon: IconPalette,
    iconColor: '#9C27B0',
    description: 'Logo, paleta de cores, tipografia e manual',
    hint: 'Vetorial + PNG exportáveis',
    keywords: ['logo', 'marca', 'branding', 'identidade', 'paleta', 'tipografia'],
  },
  {
    value: 'Landing page',
    icon: IconDeviceLaptop,
    iconColor: '#5D87FF',
    description: 'Página de alta conversão para leads e vendas',
    hint: 'Desktop 1440px · Mobile 390px',
    keywords: ['landing', 'página', 'pagina', 'site', 'hotsite', 'web', 'página'],
  },
  {
    value: 'Vídeo',
    icon: IconVideo,
    iconColor: '#FF0000',
    description: 'Conteúdo em movimento para engajar e converter',
    hint: '1080×1920 · 1080×1080 · 1280×720',
    keywords: ['vídeo', 'video', 'filme', 'motion', 'animação', 'animacao', 'reels'],
  },
  {
    value: 'Apresentação',
    icon: IconPresentation,
    iconColor: '#FF7A00',
    description: 'Slides profissionais para reuniões e pitches',
    hint: '16:9 · 1920×1080px',
    keywords: ['apresentação', 'apresentacao', 'slide', 'pitch', 'deck'],
  },
  {
    value: 'Outro',
    icon: IconDots,
    iconColor: '#6B7280',
    description: 'Solicitação personalizada — descreva o que precisa',
    hint: 'A definir com a equipe',
    keywords: [],
  },
];

const PLATFORMS = [
  {
    value: 'Instagram',
    icon: IconBrandInstagram,
    color: '#E1306C',
    bgLight: '#FDF2F7',
    formats: ['Feed 1080×1080', 'Stories 1080×1920', 'Reels 1080×1920'],
    keywords: ['instagram', 'ig', 'feed', 'stories', 'reels'],
  },
  {
    value: 'LinkedIn',
    icon: IconBrandLinkedin,
    color: '#0077B5',
    bgLight: '#EEF6FC',
    formats: ['Post 1200×627', 'Story 1080×1920'],
    keywords: ['linkedin', 'b2b', 'profissional', 'corporativo'],
  },
  {
    value: 'Facebook',
    icon: IconBrandFacebook,
    color: '#1877F2',
    bgLight: '#EEF4FF',
    formats: ['Post 1200×630', 'Stories 1080×1920'],
    keywords: ['facebook', 'fb'],
  },
  {
    value: 'TikTok',
    icon: IconBrandTiktok,
    color: '#010101',
    bgLight: '#F5F5F5',
    formats: ['Vídeo 1080×1920'],
    keywords: ['tiktok', 'tik tok', 'viral'],
  },
  {
    value: 'Google Ads',
    icon: IconBrandGoogle,
    color: '#4285F4',
    bgLight: '#EEF2FF',
    formats: ['Banner 728×90', 'Quadrado 300×250', 'Retângulo 300×600'],
    keywords: ['google', 'ads', 'tráfego', 'trafego', 'cpc', 'search'],
  },
  {
    value: 'YouTube',
    icon: IconBrandYoutube,
    color: '#FF0000',
    bgLight: '#FFF0F0',
    formats: ['Thumbnail 1280×720', 'Banner 2560×1440'],
    keywords: ['youtube', 'yt', 'video', 'vídeo', 'canal'],
  },
  {
    value: 'WhatsApp',
    icon: IconBrandWhatsapp,
    color: '#25D366',
    bgLight: '#F0FBF4',
    formats: ['Status 1080×1920', 'Link 800×418'],
    keywords: ['whatsapp', 'wpp', 'zap'],
  },
  {
    value: 'Email',
    icon: IconMail,
    color: '#EA4335',
    bgLight: '#FFF0EE',
    formats: ['Largura 600px', 'Header 600×200'],
    keywords: ['email', 'newsletter'],
  },
  {
    value: 'Site',
    icon: IconWorld,
    color: '#5D87FF',
    bgLight: '#EEF2FF',
    formats: ['Desktop 1440px', 'Mobile 390px'],
    keywords: ['site', 'landing', 'web', 'hotsite'],
  },
  {
    value: 'Múltiplas',
    icon: IconApps,
    color: '#6B7280',
    bgLight: '#F3F4F6',
    formats: ['Formatos por plataforma'],
    keywords: ['multiplas', 'várias', 'todas'],
  },
];

// ── Jarvis analysis ────────────────────────────────────────────────────────────

function analyzeObjective(text: string): { types: string[]; platforms: string[] } {
  const lower = text.toLowerCase();
  const types: string[] = [];
  const platforms: string[] = [];

  for (const jt of JOB_TYPES) {
    if (jt.keywords.some(kw => lower.includes(kw))) types.push(jt.value);
  }
  for (const p of PLATFORMS) {
    if (p.keywords.some(kw => lower.includes(kw))) platforms.push(p.value);
  }

  // Intent-based extras
  if (/lançamento|lançar|lancar|novo produto|novidade/.test(lower)) {
    if (!platforms.includes('Instagram')) platforms.push('Instagram');
    if (!types.includes('Post para redes sociais')) types.push('Post para redes sociais');
  }
  if (/conversão|conversao|venda|compra|checkout/.test(lower)) {
    if (!platforms.includes('Google Ads')) platforms.push('Google Ads');
    if (!types.includes('Campanha de tráfego pago')) types.push('Campanha de tráfego pago');
  }
  if (/awareness|reconhecimento|alcance|marca/.test(lower)) {
    if (!platforms.includes('Instagram')) platforms.push('Instagram');
    if (!types.includes('Post para redes sociais')) types.push('Post para redes sociais');
  }

  return { types: types.slice(0, 2), platforms: platforms.slice(0, 4) };
}

// ── Types ──────────────────────────────────────────────────────────────────────

type FormData = {
  objective: string;
  type: string;
  platform: string;
  deadline: string;
  budget_range: string;
  notes: string;
};

type AiEnriched = {
  suggested_title?: string;
  job_type?: string;
  urgency?: string;
  key_deliverables?: string[];
  suggested_platforms?: string[];
  estimated_complexity?: string;
  internal_notes?: string;
};

type JarvisHints = { types: string[]; platforms: string[] } | null;

// ── Component ──────────────────────────────────────────────────────────────────

export default function NovoBriefingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>({
    objective: '', type: '', platform: '', deadline: '', budget_range: '', notes: '',
  });
  const [enriched, setEnriched] = useState<AiEnriched | null>(null);
  const [enriching, setEnriching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const set = (field: keyof FormData, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const jarvisHints: JarvisHints = useMemo(() => {
    if (form.objective.length < 20) return null;
    const result = analyzeObjective(form.objective);
    if (!result.types.length && !result.platforms.length) return null;
    return result;
  }, [form.objective]);

  const handleNext = async () => {
    setError('');
    if (step === 1) {
      // Step 1 → 2: call AI enrichment
      setEnriching(true);
      try {
        const res = await fetch('/api/proxy/portal/client/briefings/enrich', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
          cache: 'no-store',
        });
        if (res.ok) {
          const data = await res.json();
          setEnriched(data.enriched ?? null);
        }
      } catch { /* non-blocking */ } finally { setEnriching(false); }
    }
    setStep(s => s + 1);
  };

  const handleSubmit = async () => {
    setSubmitting(true); setError('');
    try {
      const res = await fetch('/api/proxy/portal/client/briefings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ form_data: form, ai_enriched: enriched }),
        cache: 'no-store',
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d?.error ?? 'Erro ao enviar solicitação.');
      }
      setDone(true);
    } catch (e: any) { setError(e.message); }
    finally { setSubmitting(false); }
  };

  if (done) {
    return (
      <Box sx={{ maxWidth: 520, mx: 'auto', py: 6, textAlign: 'center' }}>
        <Box sx={{ fontSize: '3rem', mb: 2 }}>✅</Box>
        <Typography variant="h5" fontWeight={700} sx={{ mb: 1 }}>Solicitação enviada!</Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Nossa equipe vai analisar e confirmar em breve. Você receberá um email quando a solicitação for aceita.
        </Typography>
        <Stack direction="row" spacing={2} justifyContent="center">
          <Button variant="outlined" onClick={() => router.push('/briefing')}>Ver solicitações</Button>
          <Button variant="contained" onClick={() => router.push('/')}>Voltar ao início</Button>
        </Stack>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 720, mx: 'auto', py: 4, px: { xs: 2, md: 0 } }}>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 0.5 }}>Solicitar novo job</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Preencha os detalhes — nossa IA vai organizar e encaminhar para a equipe.
      </Typography>

      <Stepper activeStep={step} alternativeLabel sx={{ mb: 4 }}>
        {STEPS.map(label => (
          <Step key={label}>
            <StepLabel sx={{ '& .MuiStepLabel-label': { fontSize: '0.75rem' } }}>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {step === 0 && <StepObjective form={form} set={set} jarvisHints={jarvisHints} />}
      {step === 1 && <StepTypeAndPlatform form={form} set={set} jarvisHints={jarvisHints} />}
      {step === 2 && <StepAiReview form={form} enriched={enriched} enriching={enriching} />}
      {step === 3 && <StepConfirm form={form} enriched={enriched} />}

      <Stack direction="row" justifyContent="space-between" sx={{ mt: 4 }}>
        <Button
          variant="text" color="inherit"
          onClick={() => step === 0 ? router.back() : setStep(s => s - 1)}
        >
          {step === 0 ? 'Cancelar' : 'Voltar'}
        </Button>
        {step < 3 ? (
          <Button
            variant="contained"
            onClick={handleNext}
            disabled={!canProceed(step, form) || enriching}
            endIcon={enriching ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            {step === 1 ? (enriching ? 'Analisando…' : 'Analisar com IA') : 'Continuar'}
          </Button>
        ) : (
          <Button variant="contained" onClick={handleSubmit} disabled={submitting}
            startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : undefined}>
            {submitting ? 'Enviando…' : 'Enviar solicitação'}
          </Button>
        )}
      </Stack>
    </Box>
  );
}

// ── Step 0: Objetivo ───────────────────────────────────────────────────────────

function StepObjective({
  form, set, jarvisHints,
}: { form: FormData; set: (f: keyof FormData, v: string) => void; jarvisHints: JarvisHints }) {
  return (
    <Stack spacing={3}>
      <TextField
        label="O que você quer alcançar com este job?"
        multiline rows={5} fullWidth required
        placeholder="Ex: Precisamos de posts para o Instagram e Facebook divulgando o lançamento do produto X, com foco em conversão. O tom deve ser moderno e jovem, voltado para o público 25–35 anos."
        value={form.objective}
        onChange={e => set('objective', e.target.value)}
        helperText="Quanto mais contexto você der, melhor o resultado. Fale sobre o produto, público, tom de voz e resultados esperados."
      />

      {jarvisHints && (
        <Box sx={{
          p: 2, borderRadius: 2,
          bgcolor: 'rgba(93, 135, 255, 0.06)',
          borderLeft: '3px solid',
          borderColor: 'primary.main',
        }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
            <IconBulb size={16} />
            <Typography variant="caption" fontWeight={700} color="primary.main">
              Jarvis identificou na sua descrição
            </Typography>
          </Stack>
          {jarvisHints.types.length > 0 && (
            <Box sx={{ mb: 1.25 }}>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                Tipo de job:
              </Typography>
              <Stack direction="row" flexWrap="wrap" gap={0.75}>
                {jarvisHints.types.map(t => (
                  <Chip key={t} label={t} size="small" color="primary" variant="outlined" />
                ))}
              </Stack>
            </Box>
          )}
          {jarvisHints.platforms.length > 0 && (
            <Box>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                Plataformas identificadas:
              </Typography>
              <Stack direction="row" flexWrap="wrap" gap={0.75}>
                {jarvisHints.platforms.map(p => (
                  <Chip key={p} label={p} size="small" color="primary" variant="outlined" />
                ))}
              </Stack>
            </Box>
          )}
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1.25, display: 'block' }}>
            No próximo passo você poderá confirmar ou ajustar esses dados.
          </Typography>
        </Box>
      )}
    </Stack>
  );
}

// ── Step 1: Tipo & Plataforma ──────────────────────────────────────────────────

function StepTypeAndPlatform({
  form, set, jarvisHints,
}: { form: FormData; set: (f: keyof FormData, v: string) => void; jarvisHints: JarvisHints }) {
  return (
    <Stack spacing={3.5}>
      {/* Job type cards */}
      <Box>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
          <Typography variant="subtitle1" fontWeight={700}>Que tipo de job você precisa?</Typography>
          {jarvisHints?.types.length ? (
            <Chip
              label="Jarvis sugeriu" size="small" color="primary" variant="outlined"
              icon={<IconBulb size={12} />}
              sx={{ height: 22, '& .MuiChip-label': { fontSize: '0.65rem' } }}
            />
          ) : null}
        </Stack>
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
          gap: 1.5,
        }}>
          {JOB_TYPES.map(jt => {
            const selected = form.type === jt.value;
            const suggested = jarvisHints?.types.includes(jt.value) ?? false;
            const Icon = jt.icon;
            return (
              <Card
                key={jt.value}
                variant="outlined"
                onClick={() => set('type', jt.value)}
                sx={{
                  cursor: 'pointer',
                  borderColor: selected ? 'primary.main' : suggested ? 'primary.light' : 'divider',
                  borderWidth: selected ? 2 : 1,
                  bgcolor: selected ? 'rgba(93,135,255,0.08)' : 'background.paper',
                  transition: 'all 0.15s ease',
                  '&:hover': {
                    borderColor: 'primary.main',
                    bgcolor: selected ? 'rgba(93,135,255,0.08)' : 'action.hover',
                    transform: 'translateY(-1px)',
                    boxShadow: 1,
                  },
                }}
              >
                <CardContent sx={{ p: 1.75, '&:last-child': { pb: 1.75 } }}>
                  {suggested && !selected && (
                    <Typography sx={{ fontSize: '0.6rem', color: 'primary.main', fontWeight: 700, mb: 0.75 }}>
                      ✨ Sugerido
                    </Typography>
                  )}
                  <Box sx={{ mb: 1.25 }}>
                    <Icon
                      size={26}
                      color={selected ? '#5D87FF' : jt.iconColor}
                    />
                  </Box>
                  <Typography variant="body2" fontWeight={700} sx={{ mb: 0.4, lineHeight: 1.25, fontSize: '0.8rem' }}>
                    {jt.value}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.35, mb: 0.75, fontSize: '0.7rem' }}>
                    {jt.description}
                  </Typography>
                  <Typography sx={{ fontSize: '0.6rem', color: 'text.disabled', lineHeight: 1.3 }}>
                    {jt.hint}
                  </Typography>
                </CardContent>
              </Card>
            );
          })}
        </Box>
      </Box>

      {/* Platform cards */}
      <Box>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
          <Typography variant="subtitle1" fontWeight={700}>Para qual plataforma?</Typography>
          {jarvisHints?.platforms.length ? (
            <Chip
              label="Jarvis sugeriu" size="small" color="primary" variant="outlined"
              icon={<IconBulb size={12} />}
              sx={{ height: 22, '& .MuiChip-label': { fontSize: '0.65rem' } }}
            />
          ) : null}
        </Stack>
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(5, 1fr)' },
          gap: 1.5,
        }}>
          {PLATFORMS.map(p => {
            const selected = form.platform === p.value;
            const suggested = jarvisHints?.platforms.includes(p.value) ?? false;
            const Icon = p.icon;
            return (
              <Card
                key={p.value}
                variant="outlined"
                onClick={() => set('platform', p.value)}
                sx={{
                  cursor: 'pointer',
                  borderColor: selected ? p.color : suggested ? `${p.color}80` : 'divider',
                  borderWidth: selected ? 2 : 1,
                  bgcolor: selected ? p.bgLight : 'background.paper',
                  transition: 'all 0.15s ease',
                  '&:hover': {
                    borderColor: p.color,
                    bgcolor: p.bgLight,
                    transform: 'translateY(-1px)',
                    boxShadow: 1,
                  },
                }}
              >
                <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                  {suggested && !selected && (
                    <Typography sx={{ fontSize: '0.55rem', color: p.color, fontWeight: 700, mb: 0.5 }}>
                      ✨ Sugerido
                    </Typography>
                  )}
                  <Box sx={{ mb: 0.75 }}>
                    <Icon size={22} color={selected ? p.color : '#9CA3AF'} />
                  </Box>
                  <Typography variant="body2" fontWeight={700} sx={{ mb: 0.5, fontSize: '0.78rem' }}>
                    {p.value}
                  </Typography>
                  <Stack spacing={0.2}>
                    {p.formats.slice(0, 2).map(f => (
                      <Typography key={f} sx={{ fontSize: '0.6rem', color: 'text.secondary', lineHeight: 1.35 }}>
                        {f}
                      </Typography>
                    ))}
                    {p.formats.length > 2 && (
                      <Typography sx={{ fontSize: '0.55rem', color: 'text.disabled' }}>
                        +{p.formats.length - 2} formato{p.formats.length - 2 > 1 ? 's' : ''}
                      </Typography>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            );
          })}
        </Box>
      </Box>

      {/* Details */}
      <Stack spacing={2}>
        <TextField
          label="Prazo desejado"
          type="date"
          fullWidth
          InputLabelProps={{ shrink: true }}
          value={form.deadline}
          onChange={e => set('deadline', e.target.value)}
        />
        <Box>
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
            Orçamento estimado
          </Typography>
          <Stack direction="row" flexWrap="wrap" gap={1}>
            {BUDGET_RANGES.map(b => (
              <Chip
                key={b} label={b} clickable
                color={form.budget_range === b ? 'primary' : 'default'}
                variant={form.budget_range === b ? 'filled' : 'outlined'}
                onClick={() => set('budget_range', b)}
              />
            ))}
          </Stack>
        </Box>
        <TextField
          label="Observações adicionais"
          multiline rows={2} fullWidth
          placeholder="Referências visuais, restrições, contato de responsável…"
          value={form.notes}
          onChange={e => set('notes', e.target.value)}
        />
      </Stack>
    </Stack>
  );
}

// ── Step 2: AI Review ──────────────────────────────────────────────────────────

function StepAiReview({
  form, enriched, enriching,
}: { form: FormData; enriched: AiEnriched | null; enriching: boolean }) {
  const URGENCY_COLORS: Record<string, 'default' | 'info' | 'warning' | 'error'> = {
    low: 'default', medium: 'info', high: 'warning', urgent: 'error',
  };
  const URGENCY_LABELS: Record<string, string> = {
    low: 'Baixa', medium: 'Média', high: 'Alta', urgent: 'Urgente',
  };
  const COMPLEXITY_LABELS: Record<string, string> = {
    small: 'Pequeno', medium: 'Médio', large: 'Grande',
  };

  if (enriching) {
    return (
      <Stack alignItems="center" spacing={2} py={4}>
        <CircularProgress />
        <Typography variant="body2" color="text.secondary">
          Analisando sua solicitação com IA…
        </Typography>
        <LinearProgress sx={{ width: '100%', borderRadius: 1 }} />
      </Stack>
    );
  }

  const platformObj = PLATFORMS.find(p => p.value === form.platform);

  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        Revise como nossa IA interpretou sua solicitação. A equipe usará essas informações para priorizar.
      </Typography>

      {/* Original summary */}
      <Card variant="outlined">
        <CardContent>
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.25 }}>Sua solicitação</Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 1.25 }}>
            {form.type && (
              <Chip
                label={form.type} size="small"
                icon={(() => { const jt = JOB_TYPES.find(j => j.value === form.type); return jt ? <jt.icon size={12} /> : undefined; })()}
              />
            )}
            {form.platform && platformObj && (
              <Chip
                label={form.platform} size="small"
                sx={{ borderColor: platformObj.color, color: platformObj.color, borderWidth: 1, borderStyle: 'solid' }}
                variant="outlined"
                icon={<platformObj.icon size={12} color={platformObj.color} />}
              />
            )}
            {form.deadline && (
              <Chip
                label={`Prazo: ${new Date(form.deadline + 'T00:00').toLocaleDateString('pt-BR')}`}
                size="small"
              />
            )}
          </Stack>
          <Typography variant="body2">{form.objective}</Typography>
        </CardContent>
      </Card>

      {/* AI enrichment */}
      {enriched ? (
        <Card variant="outlined" sx={{ borderColor: 'primary.main', bgcolor: 'rgba(93,135,255,0.04)' }}>
          <CardContent>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
              <IconBulb size={16} />
              <Typography variant="subtitle2" fontWeight={700}>Análise do Jarvis</Typography>
              {enriched.urgency && (
                <Chip
                  label={URGENCY_LABELS[enriched.urgency] ?? enriched.urgency}
                  size="small"
                  color={URGENCY_COLORS[enriched.urgency] ?? 'default'}
                />
              )}
              {enriched.estimated_complexity && (
                <Chip
                  label={`Porte: ${COMPLEXITY_LABELS[enriched.estimated_complexity] ?? enriched.estimated_complexity}`}
                  size="small" variant="outlined"
                />
              )}
            </Stack>

            {enriched.suggested_title && (
              <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
                "{enriched.suggested_title}"
              </Typography>
            )}

            {enriched.key_deliverables?.length ? (
              <Box sx={{ mb: 1 }}>
                <Typography variant="caption" fontWeight={600} display="block" sx={{ mb: 0.5 }}>
                  Entregas identificadas:
                </Typography>
                <Stack direction="row" flexWrap="wrap" gap={0.5}>
                  {enriched.key_deliverables.map(d => (
                    <Chip key={d} label={d} size="small" variant="outlined" />
                  ))}
                </Stack>
              </Box>
            ) : null}

            {enriched.internal_notes && (
              <Typography variant="caption" color="text.secondary">{enriched.internal_notes}</Typography>
            )}
          </CardContent>
        </Card>
      ) : (
        <Alert severity="info">
          A análise com IA não foi concluída. Você pode continuar mesmo assim — a equipe revisará manualmente.
        </Alert>
      )}
    </Stack>
  );
}

// ── Step 3: Confirm ────────────────────────────────────────────────────────────

function StepConfirm({ form, enriched }: { form: FormData; enriched: AiEnriched | null }) {
  return (
    <Stack spacing={2}>
      <Alert severity="info">
        Ao confirmar, a equipe receberá sua solicitação e entrará em contato para alinhar detalhes.
      </Alert>
      <Card variant="outlined">
        <CardContent>
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>Resumo da solicitação</Typography>
          <Stack spacing={0.75}>
            {[
              ['Tipo', enriched?.suggested_title ?? form.type],
              ['Plataforma', form.platform],
              ['Objetivo', form.objective],
              ['Prazo', form.deadline ? new Date(form.deadline + 'T00:00').toLocaleDateString('pt-BR') : '—'],
              ['Orçamento', form.budget_range || '—'],
              ['Observações', form.notes || '—'],
            ].map(([label, value]) => (
              <Stack key={label} direction="row" spacing={1}>
                <Typography variant="caption" color="text.secondary" sx={{ minWidth: 90, flexShrink: 0 }}>
                  {label}:
                </Typography>
                <Typography variant="caption" fontWeight={500}>{value}</Typography>
              </Stack>
            ))}
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function canProceed(step: number, form: FormData): boolean {
  if (step === 0) return form.objective.length >= 15;
  if (step === 1) return Boolean(form.type && form.platform);
  return true;
}
