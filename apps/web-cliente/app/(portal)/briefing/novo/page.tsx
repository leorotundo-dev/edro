'use client';

import { useState } from 'react';
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
// ── Constants ──────────────────────────────────────────────────────────────────

const JOB_TYPES = [
  'Post para redes sociais', 'Campanha de tráfego pago', 'Email marketing',
  'Identidade visual', 'Landing page', 'Vídeo', 'Apresentação', 'Outro',
];
const PLATFORMS = [
  'Instagram', 'LinkedIn', 'Facebook', 'TikTok', 'Google Ads', 'YouTube',
  'WhatsApp', 'Email', 'Site', 'Múltiplas',
];
const BUDGET_RANGES = [
  'Até R$ 1.000', 'R$ 1.000–5.000', 'R$ 5.000–15.000', 'Acima de R$ 15.000', 'A definir',
];

const STEPS = ['Tipo e plataforma', 'Objetivo e prazo', 'Revisão com IA', 'Confirmar'];

// ── Types ──────────────────────────────────────────────────────────────────────

type FormData = {
  type: string;
  platform: string;
  objective: string;
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

// ── Component ──────────────────────────────────────────────────────────────────

export default function NovoBriefingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>({
    type: '', platform: '', objective: '', deadline: '', budget_range: '', notes: '',
  });
  const [enriched, setEnriched] = useState<AiEnriched | null>(null);
  const [enriching, setEnriching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const set = (field: keyof FormData, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const handleNext = async () => {
    setError('');
    if (step === 1) {
      // Step 2 → Step 3: call AI enrichment
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
      <>
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
      </>
    );
  }

  return (
    <Box sx={{ maxWidth: 640, mx: 'auto', py: 4, px: { xs: 2, md: 0 } }}>
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

        {step === 0 && <Step0 form={form} set={set} />}
        {step === 1 && <Step1 form={form} set={set} />}
        {step === 2 && <Step2 form={form} enriched={enriched} enriching={enriching} />}
        {step === 3 && <Step3 form={form} enriched={enriched} />}

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

// ── Step components ────────────────────────────────────────────────────────────

function Step0({ form, set }: { form: FormData; set: (f: keyof FormData, v: string) => void }) {
  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
          Que tipo de job você precisa?
        </Typography>
        <Stack direction="row" flexWrap="wrap" gap={1}>
          {JOB_TYPES.map(t => (
            <Chip
              key={t} label={t} clickable
              color={form.type === t ? 'primary' : 'default'}
              variant={form.type === t ? 'filled' : 'outlined'}
              onClick={() => set('type', t)}
            />
          ))}
        </Stack>
      </Box>
      <Box>
        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
          Para qual plataforma?
        </Typography>
        <Stack direction="row" flexWrap="wrap" gap={1}>
          {PLATFORMS.map(p => (
            <Chip
              key={p} label={p} clickable
              color={form.platform === p ? 'primary' : 'default'}
              variant={form.platform === p ? 'filled' : 'outlined'}
              onClick={() => set('platform', p)}
            />
          ))}
        </Stack>
      </Box>
    </Stack>
  );
}

function Step1({ form, set }: { form: FormData; set: (f: keyof FormData, v: string) => void }) {
  return (
    <Stack spacing={2.5}>
      <TextField
        label="Qual o objetivo deste job?"
        multiline rows={4} fullWidth required
        placeholder="Ex: Precisamos de 4 posts para o Instagram divulgando o lançamento do produto X com foco em conversão."
        value={form.objective}
        onChange={e => set('objective', e.target.value)}
        helperText="Quanto mais detalhe, melhor. Inclua contexto, tom de voz, referências."
      />
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
  );
}

function Step2({
  form, enriched, enriching,
}: {
  form: FormData; enriched: AiEnriched | null; enriching: boolean;
}) {
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

  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        Revise como nossa IA interpretou sua solicitação. A equipe usará essas informações para priorizar.
      </Typography>

      {/* Original summary */}
      <Card variant="outlined">
        <CardContent>
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Sua solicitação</Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 1 }}>
            {form.type && <Chip label={form.type} size="small" />}
            {form.platform && <Chip label={form.platform} size="small" />}
            {form.deadline && <Chip label={`Prazo: ${new Date(form.deadline + 'T00:00').toLocaleDateString('pt-BR')}`} size="small" />}
          </Stack>
          <Typography variant="body2">{form.objective}</Typography>
        </CardContent>
      </Card>

      {/* AI enrichment */}
      {enriched ? (
        <Card variant="outlined" sx={{ borderColor: 'primary.light', bgcolor: 'primary.light', opacity: 0.95 }}>
          <CardContent>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
              <Typography variant="subtitle2" fontWeight={700}>Análise da IA</Typography>
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
                <Typography variant="caption" fontWeight={600} display="block">Entregas identificadas:</Typography>
                <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ mt: 0.5 }}>
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

function Step3({ form, enriched }: { form: FormData; enriched: AiEnriched | null }) {
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
                <Typography variant="caption" color="text.secondary" sx={{ minWidth: 90 }}>{label}:</Typography>
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
  if (step === 0) return Boolean(form.type && form.platform);
  if (step === 1) return form.objective.length >= 10;
  return true;
}
