'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import TextField from '@mui/material/TextField';
import Stack from '@mui/material/Stack';
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import StepContent from '@mui/material/StepContent';
import Grid from '@mui/material/Grid';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Radio from '@mui/material/Radio';
import FormControlLabel from '@mui/material/FormControlLabel';
import RadioGroup from '@mui/material/RadioGroup';
import {
  IconBuilding, IconTag, IconBrandInstagram,
  IconCheck, IconArrowRight, IconArrowLeft, IconSparkles,
  IconRocket, IconPalette, IconSettings2, IconWorldSearch,
} from '@tabler/icons-react';
import { apiPost } from '@/lib/api';
import AppShell from '@/components/AppShell';

// ── Types ─────────────────────────────────────────────────────────────────────

type WizardData = {
  // Step 1 — Identidade
  name: string;
  segment_primary: string;
  city: string;
  uf: string;
  website: string;
  // Step 2 — Comunicação
  tone_profile: string;
  brand_promise: string;
  audience: string;
  content_pillars: string[];
  // Step 3 — Keywords & Redes
  keywords: string[];
  instagram: string;
  linkedin: string;
  facebook: string;
  // Step 4 — Configurações
  risk_tolerance: string;
  must_mentions: string;
  forbidden_claims: string;
};

const SEGMENTS = [
  'Varejo', 'Saúde', 'Educação', 'Tecnologia', 'Imobiliário',
  'Alimentação', 'Moda & Beleza', 'Financeiro', 'Jurídico',
  'Indústria', 'Logística', 'Transporte', 'Turismo', 'Serviços',
  'Terceiro Setor', 'Outro',
];

const TONES = [
  { value: 'institucional', label: 'Institucional', desc: 'Formal, sério, confiável' },
  { value: 'próximo', label: 'Próximo', desc: 'Amigável, acessível, humano' },
  { value: 'inspirador', label: 'Inspirador', desc: 'Motivacional, aspiracional' },
  { value: 'especialista', label: 'Especialista', desc: 'Técnico, detalhado, autoridade' },
  { value: 'descontraído', label: 'Descontraído', desc: 'Leve, bem-humorado, jovem' },
  { value: 'premium', label: 'Premium', desc: 'Exclusivo, sofisticado, aspiracional' },
];

const PILLAR_SUGGESTIONS = [
  'Dicas e Educação', 'Cases de Sucesso', 'Bastidores', 'Produtos/Serviços',
  'Mercado e Tendências', 'Depoimentos', 'Promoções', 'Conteúdo Sazonal',
];

const RISK_LEVELS = [
  { value: 'conservative', label: '🛡️ Conservador', desc: 'Evita polêmicas, linguagem segura e formal' },
  { value: 'moderate', label: '⚖️ Moderado', desc: 'Equilibrio entre cautela e criatividade' },
  { value: 'bold', label: '🚀 Ousado', desc: 'Temas controversos aceitos, linguagem forte' },
];

const STEPS = [
  { label: 'Identidade', icon: <IconBuilding size={18} /> },
  { label: 'Comunicação', icon: <IconPalette size={18} /> },
  { label: 'Keywords & Redes', icon: <IconTag size={18} /> },
  { label: 'Configurações', icon: <IconSettings2 size={18} /> },
  { label: 'Confirmar', icon: <IconRocket size={18} /> },
];

const EMPTY: WizardData = {
  name: '', segment_primary: '', city: '', uf: '', website: '',
  tone_profile: '', brand_promise: '', audience: '', content_pillars: [],
  keywords: [], instagram: '', linkedin: '', facebook: '',
  risk_tolerance: 'moderate', must_mentions: '', forbidden_claims: '',
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function NewClientWizardPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<WizardData>(EMPTY);
  const [keywordInput, setKeywordInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [createdId, setCreatedId] = useState('');
  const [researching, setResearching] = useState(false);
  const [researchDone, setResearchDone] = useState(false);
  const [researchFieldsFound, setResearchFieldsFound] = useState(0);

  const set = (field: keyof WizardData, value: any) => setData((prev) => ({ ...prev, [field]: value }));

  const handleResearch = async () => {
    if (!data.name.trim()) { setError('Informe o nome do cliente antes de pesquisar.'); return; }
    setResearching(true);
    setError('');
    try {
      const res = await apiPost<{ ok: boolean; data: Partial<WizardData> & { audience?: string; brand_promise?: string } }>(
        '/clients/prospect-research',
        { name: data.name.trim() }
      );
      if (res.ok && res.data) {
        const d = res.data;
        let filled = 0;
        setData((prev) => {
          const next = { ...prev };
          if (d.segment_primary) { next.segment_primary = d.segment_primary; filled++; }
          if (d.city) { next.city = d.city; filled++; }
          if (d.uf) { next.uf = d.uf; filled++; }
          if (d.website) { next.website = d.website; filled++; }
          if (d.keywords?.length) { next.keywords = d.keywords; filled++; }
          if (d.audience) { next.audience = d.audience; filled++; }
          if (d.brand_promise) { next.brand_promise = d.brand_promise; filled++; }
          if (d.instagram) { next.instagram = d.instagram; filled++; }
          if (d.linkedin) { next.linkedin = d.linkedin; filled++; }
          if (d.facebook) { next.facebook = d.facebook; filled++; }
          return next;
        });
        setResearchFieldsFound(filled);
        if (filled === 0) {
          setError('Não encontramos informações sobre este cliente na internet. Preencha manualmente.');
        } else {
          setResearchDone(true);
        }
      }
    } catch {
      setError('Não foi possível buscar informações. Preencha manualmente.');
    } finally {
      setResearching(false);
    }
  };

  const togglePillar = (p: string) => {
    set('content_pillars', data.content_pillars.includes(p)
      ? data.content_pillars.filter((x) => x !== p)
      : [...data.content_pillars, p]
    );
  };

  const addKeyword = () => {
    const kw = keywordInput.trim();
    if (kw && !data.keywords.includes(kw)) {
      set('keywords', [...data.keywords, kw]);
    }
    setKeywordInput('');
  };

  const removeKeyword = (kw: string) => set('keywords', data.keywords.filter((k) => k !== kw));

  const validateStep = (s: number): string => {
    if (s === 0) {
      if (!data.name.trim()) return 'Informe o nome do cliente.';
      if (!data.segment_primary) return 'Selecione o segmento.';
    }
    if (s === 1) {
      if (!data.tone_profile) return 'Selecione o tom de voz.';
    }
    return '';
  };

  const next = () => {
    const err = validateStep(step);
    if (err) { setError(err); return; }
    setError('');
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const back = () => { setError(''); setStep((s) => Math.max(s - 1, 0)); };

  const handleCreate = async () => {
    setSaving(true);
    setError('');
    try {
      const payload = {
        name: data.name.trim(),
        segment_primary: data.segment_primary,
        city: data.city || undefined,
        uf: data.uf || undefined,
        risk_tolerance: data.risk_tolerance || undefined,
        tone_profile: data.tone_profile || undefined,
        keywords: data.keywords,
        pillars: data.content_pillars,
        knowledge_base: {
          website: data.website || undefined,
          brand_promise: data.brand_promise || undefined,
          audience: data.audience || undefined,
          must_mentions: data.must_mentions ? data.must_mentions.split(',').map((s) => s.trim()).filter(Boolean) : [],
          forbidden_claims: data.forbidden_claims ? data.forbidden_claims.split(',').map((s) => s.trim()).filter(Boolean) : [],
          social_profiles: {
            instagram: data.instagram || undefined,
            linkedin: data.linkedin || undefined,
            facebook: data.facebook || undefined,
          },
        },
      };

      const created = await apiPost<{ id: string }>('/clients', payload);
      setCreatedId(created.id);
      setStep(STEPS.length); // done screen

      // Background: trigger intelligence sync
      void Promise.allSettled([
        apiPost('/clipping/score', { clientId: created.id, limit: 200 }),
        apiPost(`/clients/${created.id}/planning/context`, {}),
      ]);
    } catch (e: any) {
      setError(e?.message || 'Erro ao criar cliente.');
    } finally {
      setSaving(false);
    }
  };

  // Done screen
  if (step === STEPS.length) {
    return (
      <AppShell title="Novo Cliente">
      <Box sx={{ maxWidth: 600, mx: 'auto', textAlign: 'center', py: 6 }}>
        <Box sx={{ width: 80, height: 80, borderRadius: '50%', bgcolor: '#13DEB920', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 3 }}>
          <IconCheck size={40} color="#13DEB9" />
        </Box>
        <Typography variant="h4" fontWeight={800} sx={{ mb: 1 }}>Cliente criado!</Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          <strong>{data.name}</strong> foi configurado e já está disponível na plataforma.
          O sistema está processando clipping, calendário e oportunidades em segundo plano.
        </Typography>
        <Stack direction="row" spacing={2} justifyContent="center">
          <Button variant="contained" onClick={() => router.push(`/clients/${createdId}`)}
            sx={{ bgcolor: '#E85219', '&:hover': { bgcolor: '#c43e10' } }}>
            Abrir Painel do Cliente
          </Button>
          <Button variant="outlined" onClick={() => router.push(`/clients/${createdId}/analytics`)}>
            Ver Analytics
          </Button>
          <Button variant="text" onClick={() => { setData(EMPTY); setCreatedId(''); setStep(0); }}>
            Criar outro
          </Button>
        </Stack>
      </Box>
      </AppShell>
    );
  }

  return (
    <AppShell title="Novo Cliente">
    <Box sx={{ maxWidth: 720, mx: 'auto', px: { xs: 2, sm: 4 }, py: 3 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" fontWeight={700}>Novo Cliente</Typography>
        <Typography variant="body2" color="text.secondary">Configure um novo cliente em 5 passos.</Typography>
      </Box>

      {/* Stepper header */}
      <Stepper activeStep={step} sx={{ mb: 4 }}>
        {STEPS.map((s, i) => (
          <Step key={s.label} completed={i < step}>
            <StepLabel
              StepIconComponent={() => (
                <Box sx={{
                  width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  bgcolor: i < step ? '#13DEB9' : i === step ? '#E85219' : 'action.hover',
                  color: i <= step ? '#fff' : 'text.secondary',
                }}>
                  {i < step ? <IconCheck size={16} /> : s.icon}
                </Box>
              )}
            >
              <Typography variant="caption" sx={{ display: { xs: 'none', sm: 'block' } }}>{s.label}</Typography>
            </StepLabel>
          </Step>
        ))}
      </Stepper>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent sx={{ p: 3 }}>

          {/* ── STEP 0: Identidade ──────────────────────────────────── */}
          {step === 0 && (
            <Box>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 3 }}>
                <IconBuilding size={22} color="#E85219" />
                <Typography variant="h6" fontWeight={700}>Identidade do Cliente</Typography>
              </Stack>
              <Stack spacing={3}>
                <Box>
                  <TextField
                    label="Nome do cliente *" fullWidth
                    value={data.name} onChange={(e) => { set('name', e.target.value); setResearchDone(false); }}
                    placeholder="Ex: CS Portos, Clínica Silva..."
                    autoFocus
                    onKeyDown={(e) => { if (e.key === 'Enter' && data.name.trim()) handleResearch(); }}
                  />
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1.5 }}>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={researching ? <CircularProgress size={14} /> : <IconWorldSearch size={16} />}
                      onClick={handleResearch}
                      disabled={researching || !data.name.trim()}
                      sx={{ borderColor: '#E85219', color: '#E85219', '&:hover': { borderColor: '#c43e10', bgcolor: 'rgba(232,82,25,0.05)' } }}
                    >
                      {researching ? 'Pesquisando...' : 'Pesquisar na internet'}
                    </Button>
                    {researchDone && (
                      <Chip
                        size="small"
                        label={`${researchFieldsFound} campo${researchFieldsFound !== 1 ? 's' : ''} preenchido${researchFieldsFound !== 1 ? 's' : ''} automaticamente`}
                        icon={<IconCheck size={13} />}
                        sx={{ bgcolor: 'rgba(19,222,185,0.12)', color: '#0fc9a8', fontWeight: 600 }}
                      />
                    )}
                  </Stack>
                </Box>
                <Box>
                  <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5 }}>Segmento *</Typography>
                  <Stack direction="row" flexWrap="wrap" gap={1}>
                    {SEGMENTS.map((seg) => (
                      <Chip
                        key={seg} label={seg} clickable
                        onClick={() => set('segment_primary', seg)}
                        sx={{
                          bgcolor: data.segment_primary === seg ? '#E85219' : undefined,
                          color: data.segment_primary === seg ? '#fff' : undefined,
                          fontWeight: data.segment_primary === seg ? 700 : undefined,
                        }}
                      />
                    ))}
                  </Stack>
                </Box>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField label="Cidade" fullWidth value={data.city} onChange={(e) => set('city', e.target.value)} />
                  </Grid>
                  <Grid size={{ xs: 6, sm: 3 }}>
                    <TextField label="Estado (UF)" fullWidth value={data.uf} onChange={(e) => set('uf', e.target.value)} inputProps={{ maxLength: 2 }} />
                  </Grid>
                  <Grid size={{ xs: 6, sm: 3 }}>
                    <TextField label="Website" fullWidth value={data.website} onChange={(e) => set('website', e.target.value)} placeholder="edro.studio" />
                  </Grid>
                </Grid>
              </Stack>
            </Box>
          )}

          {/* ── STEP 1: Comunicação ─────────────────────────────────── */}
          {step === 1 && (
            <Box>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 3 }}>
                <IconPalette size={22} color="#E85219" />
                <Typography variant="h6" fontWeight={700}>Comunicação e Tom de Voz</Typography>
              </Stack>
              <Stack spacing={3}>
                <Box>
                  <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5 }}>Tom de Voz *</Typography>
                  <Grid container spacing={1.5}>
                    {TONES.map((t) => (
                      <Grid key={t.value} size={{ xs: 12, sm: 4 }}>
                        <Card
                          variant="outlined"
                          onClick={() => set('tone_profile', t.value)}
                          sx={{
                            cursor: 'pointer', p: 1.5,
                            borderColor: data.tone_profile === t.value ? '#E85219' : 'divider',
                            borderWidth: data.tone_profile === t.value ? 2 : 1,
                            bgcolor: data.tone_profile === t.value ? 'rgba(232,82,25,0.05)' : 'transparent',
                          }}
                        >
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Radio checked={data.tone_profile === t.value} size="small" sx={{ p: 0, color: '#E85219', '&.Mui-checked': { color: '#E85219' } }} />
                            <Box>
                              <Typography variant="subtitle2" fontWeight={700}>{t.label}</Typography>
                              <Typography variant="caption" color="text.secondary">{t.desc}</Typography>
                            </Box>
                          </Stack>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
                <TextField
                  label="Promessa da Marca" fullWidth multiline rows={2}
                  value={data.brand_promise} onChange={(e) => set('brand_promise', e.target.value)}
                  placeholder="O que a marca entrega de único para os clientes?"
                  helperText="Frase que resume o posicionamento da marca"
                />
                <TextField
                  label="Público-Alvo" fullWidth
                  value={data.audience} onChange={(e) => set('audience', e.target.value)}
                  placeholder="Ex: Homens e mulheres 30-50 anos, empresários do interior de SP..."
                />
                <Box>
                  <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                    Pilares de Conteúdo <Typography component="span" variant="caption" color="text.secondary">(selecione os principais)</Typography>
                  </Typography>
                  <Stack direction="row" flexWrap="wrap" gap={1}>
                    {PILLAR_SUGGESTIONS.map((p) => (
                      <Chip
                        key={p} label={p} clickable
                        onClick={() => togglePillar(p)}
                        sx={{
                          bgcolor: data.content_pillars.includes(p) ? '#E85219' : undefined,
                          color: data.content_pillars.includes(p) ? '#fff' : undefined,
                        }}
                      />
                    ))}
                  </Stack>
                </Box>
              </Stack>
            </Box>
          )}

          {/* ── STEP 2: Keywords & Redes ────────────────────────────── */}
          {step === 2 && (
            <Box>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 3 }}>
                <IconTag size={22} color="#E85219" />
                <Typography variant="h6" fontWeight={700}>Keywords & Redes Sociais</Typography>
              </Stack>
              <Stack spacing={3}>
                <Box>
                  <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                    Keywords <Typography component="span" variant="caption" color="text.secondary">(usadas no Radar, Clipping e IA)</Typography>
                  </Typography>
                  <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                    <TextField
                      size="small" placeholder="Adicionar keyword..."
                      value={keywordInput} onChange={(e) => setKeywordInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addKeyword(); } }}
                      sx={{ flex: 1 }}
                    />
                    <Button variant="outlined" onClick={addKeyword} size="small">Adicionar</Button>
                  </Stack>
                  <Stack direction="row" flexWrap="wrap" gap={0.5}>
                    {data.keywords.map((kw) => (
                      <Chip key={kw} label={kw} size="small" onDelete={() => removeKeyword(kw)}
                        sx={{ bgcolor: 'rgba(232,82,25,0.1)', color: '#E85219' }} />
                    ))}
                    {data.keywords.length === 0 && (
                      <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                        Nenhuma keyword adicionada ainda.
                      </Typography>
                    )}
                  </Stack>
                </Box>
                <Divider />
                <Box>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                    <IconBrandInstagram size={20} color="#E4405F" />
                    <Typography variant="subtitle2" fontWeight={600}>Perfis nas Redes Sociais</Typography>
                  </Stack>
                  <Stack spacing={2}>
                    <TextField label="Instagram" fullWidth size="small" value={data.instagram}
                      onChange={(e) => set('instagram', e.target.value)} placeholder="@usuario ou URL" />
                    <TextField label="LinkedIn" fullWidth size="small" value={data.linkedin}
                      onChange={(e) => set('linkedin', e.target.value)} placeholder="URL do perfil/empresa" />
                    <TextField label="Facebook" fullWidth size="small" value={data.facebook}
                      onChange={(e) => set('facebook', e.target.value)} placeholder="URL da página" />
                  </Stack>
                </Box>
              </Stack>
            </Box>
          )}

          {/* ── STEP 3: Configurações ───────────────────────────────── */}
          {step === 3 && (
            <Box>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 3 }}>
                <IconSettings2 size={22} color="#7c3aed" />
                <Typography variant="h6" fontWeight={700}>Configurações de Conteúdo</Typography>
              </Stack>
              <Stack spacing={3}>
                <Box>
                  <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5 }}>Tolerância a Risco</Typography>
                  <Stack spacing={1.5}>
                    {RISK_LEVELS.map((r) => (
                      <Card
                        key={r.value} variant="outlined"
                        onClick={() => set('risk_tolerance', r.value)}
                        sx={{
                          cursor: 'pointer', p: 1.5,
                          borderColor: data.risk_tolerance === r.value ? '#7c3aed' : 'divider',
                          borderWidth: data.risk_tolerance === r.value ? 2 : 1,
                          bgcolor: data.risk_tolerance === r.value ? 'rgba(124,58,237,0.04)' : 'transparent',
                        }}
                      >
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Radio checked={data.risk_tolerance === r.value} size="small" sx={{ p: 0, color: '#7c3aed', '&.Mui-checked': { color: '#7c3aed' } }} />
                          <Box>
                            <Typography variant="subtitle2" fontWeight={700}>{r.label}</Typography>
                            <Typography variant="caption" color="text.secondary">{r.desc}</Typography>
                          </Box>
                        </Stack>
                      </Card>
                    ))}
                  </Stack>
                </Box>
                <TextField
                  label="Menções Obrigatórias" fullWidth
                  value={data.must_mentions} onChange={(e) => set('must_mentions', e.target.value)}
                  placeholder="Separados por vírgula: CRECI-SP, CRM 12345..."
                  helperText="Informações que devem aparecer em copies quando relevante"
                />
                <TextField
                  label="Afirmações Proibidas" fullWidth
                  value={data.forbidden_claims} onChange={(e) => set('forbidden_claims', e.target.value)}
                  placeholder="Ex: cura garantida, sem efeitos colaterais..."
                  helperText="O que a IA nunca deve afirmar para este cliente"
                />
              </Stack>
            </Box>
          )}

          {/* ── STEP 4: Confirmar ───────────────────────────────────── */}
          {step === 4 && (
            <Box>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 3 }}>
                <IconRocket size={22} color="#13DEB9" />
                <Typography variant="h6" fontWeight={700}>Confirmação</Typography>
              </Stack>
              <Stack spacing={2}>
                {[
                  { label: 'Nome', value: data.name },
                  { label: 'Segmento', value: data.segment_primary },
                  { label: 'Localização', value: [data.city, data.uf].filter(Boolean).join(', ') || '—' },
                  { label: 'Tom de Voz', value: data.tone_profile || '—' },
                  { label: 'Pilares', value: data.content_pillars.join(', ') || '—' },
                  { label: 'Keywords', value: data.keywords.join(', ') || '—' },
                  { label: 'Instagram', value: data.instagram || '—' },
                  { label: 'Tolerância a Risco', value: data.risk_tolerance },
                ].map(({ label, value }) => (
                  <Stack key={label} direction="row" justifyContent="space-between" sx={{ borderBottom: '1px solid', borderColor: 'divider', pb: 1 }}>
                    <Typography variant="body2" color="text.secondary">{label}</Typography>
                    <Typography variant="body2" fontWeight={600} sx={{ maxWidth: '60%', textAlign: 'right' }}>{value}</Typography>
                  </Stack>
                ))}
              </Stack>
              <Alert severity="info" sx={{ mt: 3 }} icon={<IconSparkles size={18} />}>
                Após criar, o sistema iniciará automaticamente o processamento de clipping, análise de oportunidades e configuração do calendar IA.
              </Alert>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <Stack direction="row" justifyContent="space-between">
        <Button variant="outlined" startIcon={<IconArrowLeft size={18} />}
          onClick={step === 0 ? () => router.push('/clients') : back}
          disabled={saving}>
          {step === 0 ? 'Cancelar' : 'Voltar'}
        </Button>
        {step < STEPS.length - 1 ? (
          <Button variant="contained" endIcon={<IconArrowRight size={18} />}
            onClick={next}
            sx={{ bgcolor: '#E85219', '&:hover': { bgcolor: '#c43e10' } }}>
            Próximo
          </Button>
        ) : (
          <Button variant="contained" endIcon={saving ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : <IconRocket size={18} />}
            onClick={handleCreate} disabled={saving}
            sx={{ bgcolor: '#13DEB9', color: '#000', '&:hover': { bgcolor: '#0fc9a8' }, fontWeight: 700 }}>
            {saving ? 'Criando...' : 'Criar Cliente'}
          </Button>
        )}
      </Stack>
    </Box>
    </AppShell>
  );
}

// Need Divider for step 2
function Divider() {
  return <Box sx={{ borderTop: '1px solid', borderColor: 'divider', my: 1 }} />;
}
