'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid';
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
  IconVideo, IconPresentation, IconDots,
} from '@tabler/icons-react';

const STEPS = ['Objetivo', 'Tipo & plataforma', 'Confirmar'];

const JOB_TYPES = [
  { value: 'Post para redes sociais', icon: IconPhoto, iconColor: '#E1306C', description: 'Conteúdo visual para feed, stories e reels', platforms: ['Instagram', 'LinkedIn', 'Facebook', 'TikTok', 'WhatsApp'] },
  { value: 'Campanha de tráfego pago', icon: IconTarget, iconColor: '#4285F4', description: 'Anúncios com foco em conversão e alcance', platforms: ['Google Ads', 'Instagram', 'Facebook', 'LinkedIn'] },
  { value: 'Email marketing', icon: IconMail, iconColor: '#EA4335', description: 'Comunicação direta com sua base de contatos', platforms: ['Email'] },
  { value: 'Identidade visual', icon: IconPalette, iconColor: '#9C27B0', description: 'Logo, paleta de cores, tipografia e manual', platforms: [] },
  { value: 'Landing page', icon: IconDeviceLaptop, iconColor: '#5D87FF', description: 'Página de alta conversão para leads e vendas', platforms: ['Site', 'Google Ads'] },
  { value: 'Vídeo', icon: IconVideo, iconColor: '#FF0000', description: 'Conteúdo em movimento para engajar e converter', platforms: ['YouTube', 'Instagram', 'TikTok', 'Facebook'] },
  { value: 'Apresentação', icon: IconPresentation, iconColor: '#FF7A00', description: 'Slides profissionais para reuniões e pitches', platforms: [] },
  { value: 'Outro', icon: IconDots, iconColor: '#6B7280', description: 'Solicitação personalizada — descreva o que precisa', platforms: [] },
];

const PLATFORMS = [
  { value: 'Instagram', icon: IconBrandInstagram, color: '#E1306C', formats: ['Feed 1080×1080', 'Stories 1080×1920', 'Reels 1080×1920'] },
  { value: 'LinkedIn', icon: IconBrandLinkedin, color: '#0077B5', formats: ['Post 1200×627'] },
  { value: 'Facebook', icon: IconBrandFacebook, color: '#1877F2', formats: ['Post 1200×630', 'Stories 1080×1920'] },
  { value: 'TikTok', icon: IconBrandTiktok, color: '#010101', formats: ['Vídeo 1080×1920'] },
  { value: 'Google Ads', icon: IconBrandGoogle, color: '#4285F4', formats: ['Banner 728×90', 'Quadrado 300×250'] },
  { value: 'YouTube', icon: IconBrandYoutube, color: '#FF0000', formats: ['Thumbnail 1280×720'] },
  { value: 'WhatsApp', icon: IconBrandWhatsapp, color: '#25D366', formats: ['Status 1080×1920'] },
  { value: 'Email', icon: IconMail, color: '#EA4335', formats: ['Largura 600px'] },
  { value: 'Site', icon: IconWorld, color: '#5D87FF', formats: ['Desktop 1440px', 'Mobile 390px'] },
  { value: 'Múltiplas', icon: IconApps, color: '#6B7280', formats: ['Formatos por plataforma'] },
];

type FormData = { objective: string; type: string; platform: string; deadline: string; notes: string };

function canProceed(step: number, form: FormData): boolean {
  if (step === 0) return form.objective.length >= 15;
  if (step === 1) {
    if (!form.type) return false;
    const jt = JOB_TYPES.find(j => j.value === form.type);
    if (!jt?.platforms.length) return true;
    return Boolean(form.platform);
  }
  return true;
}

export default function NovoPedidoPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>({ objective: '', type: '', platform: '', deadline: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const set = (field: keyof FormData, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async () => {
    setSubmitting(true); setError('');
    try {
      const res = await fetch('/api/proxy/portal/client/briefings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ form_data: form }),
        cache: 'no-store',
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error((d as any)?.error ?? 'Erro ao enviar solicitação.');
      }
      setDone(true);
    } catch (e: any) { setError(e.message); }
    finally { setSubmitting(false); }
  };

  if (done) {
    return (
      <Box sx={{ maxWidth: 520, mx: 'auto', py: 6, textAlign: 'center' }}>
        <Box sx={{ fontSize: '3rem', mb: 2 }}>✅</Box>
        <Typography variant="h5" fontWeight={700} sx={{ mb: 1 }}>Pedido enviado!</Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Nossa equipe vai analisar e confirmar em breve. Você receberá um email quando o pedido for aceito.
        </Typography>
        <Stack direction="row" spacing={2} justifyContent="center">
          <Button variant="outlined" onClick={() => router.push('/pedidos')}>Ver pedidos</Button>
          <Button variant="contained" onClick={() => router.push('/')}>Voltar ao início</Button>
        </Stack>
      </Box>
    );
  }

  const selectedJobType = JOB_TYPES.find(jt => jt.value === form.type);
  const filteredPlatforms = selectedJobType?.platforms.length
    ? PLATFORMS.filter(p => selectedJobType.platforms.includes(p.value))
    : PLATFORMS;

  return (
    <Box sx={{ maxWidth: 720, mx: 'auto', py: 4, px: { xs: 2, md: 0 } }}>
      <Typography variant="overline" color="text.secondary">Pedidos</Typography>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 0.5 }}>Novo pedido</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Preencha os detalhes e nossa equipe entrará em contato para alinhar.
      </Typography>

      <Stepper activeStep={step} alternativeLabel sx={{ mb: 4 }}>
        {STEPS.map(label => (
          <Step key={label}>
            <StepLabel sx={{ '& .MuiStepLabel-label': { fontSize: '0.75rem' } }}>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Step 0: Objective */}
      {step === 0 && (
        <TextField
          label="O que você quer alcançar com este pedido?"
          multiline rows={6} fullWidth required
          placeholder="Ex: Precisamos de posts para o Instagram divulgando o lançamento do produto X, com foco em conversão. Tom moderno e jovem, público 25–35 anos."
          value={form.objective}
          onChange={e => set('objective', e.target.value)}
          helperText="Quanto mais contexto você der, melhor o resultado."
        />
      )}

      {/* Step 1: Type & Platform */}
      {step === 1 && (
        <Stack spacing={3}>
          <Box>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>Que tipo de pedido você precisa?</Typography>
            <Grid container spacing={1.5}>
              {JOB_TYPES.map(jt => {
                const selected = form.type === jt.value;
                const Icon = jt.icon;
                return (
                  <Grid key={jt.value} size={{ xs: 12, sm: 6 }}>
                    <Card
                      variant="outlined"
                      onClick={() => {
                        set('type', jt.value);
                        if (jt.platforms.length && !jt.platforms.includes(form.platform)) {
                          set('platform', jt.platforms.length === 1 ? jt.platforms[0] : '');
                        }
                      }}
                      sx={{ cursor: 'pointer', borderColor: selected ? jt.iconColor : 'divider', borderWidth: selected ? 1.5 : 1, transition: 'all 0.15s', '&:hover': { borderColor: jt.iconColor, boxShadow: 1 } }}
                    >
                      <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                        <Stack direction="row" spacing={1.5} alignItems="center">
                          <Avatar sx={{ width: 36, height: 36, bgcolor: `${jt.iconColor}1f`, color: jt.iconColor, flexShrink: 0 }}>
                            <Icon size={20} />
                          </Avatar>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="subtitle2" fontWeight={700}>{jt.value}</Typography>
                            <Typography variant="caption" color="text.secondary">{jt.description}</Typography>
                          </Box>
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          </Box>

          {(!selectedJobType || selectedJobType.platforms.length > 0) && (
            <Box>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>Para qual plataforma?</Typography>
              <Grid container spacing={1.5}>
                {filteredPlatforms.map(p => {
                  const selected = form.platform === p.value;
                  const Icon = p.icon;
                  return (
                    <Grid key={p.value} size={{ xs: 12, sm: 6, md: 4 }}>
                      <Card
                        variant="outlined"
                        onClick={() => set('platform', p.value)}
                        sx={{ cursor: 'pointer', borderColor: selected ? p.color : 'divider', borderWidth: selected ? 1.5 : 1, transition: 'all 0.15s', '&:hover': { borderColor: p.color, boxShadow: 1 } }}
                      >
                        <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                          <Stack direction="row" spacing={1.5} alignItems="center">
                            <Avatar sx={{ width: 36, height: 36, bgcolor: selected ? p.color : `${p.color}1f`, color: selected ? '#fff' : p.color, flexShrink: 0 }}>
                              <Icon size={20} />
                            </Avatar>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography variant="subtitle2" fontWeight={700}>{p.value}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {p.formats.slice(0, 2).join(' · ')}{p.formats.length > 2 ? ` +${p.formats.length - 2}` : ''}
                              </Typography>
                            </Box>
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid>
                  );
                })}
              </Grid>
            </Box>
          )}

          <Stack spacing={2}>
            <TextField
              label="Prazo desejado"
              type="date"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={form.deadline}
              onChange={e => set('deadline', e.target.value)}
            />
            <TextField
              label="Observações adicionais"
              multiline rows={2} fullWidth
              placeholder="Referências visuais, restrições, contato de responsável…"
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
            />
          </Stack>
        </Stack>
      )}

      {/* Step 2: Confirm */}
      {step === 2 && (
        <Stack spacing={2}>
          <Alert severity="info">
            Ao confirmar, a equipe receberá seu pedido e entrará em contato para alinhar detalhes.
          </Alert>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>Resumo do pedido</Typography>
              <Stack spacing={0.75}>
                {[
                  ['Tipo', form.type],
                  ['Plataforma', form.platform || '—'],
                  ['Objetivo', form.objective],
                  ['Prazo', form.deadline ? new Date(form.deadline + 'T00:00').toLocaleDateString('pt-BR') : '—'],
                  ['Observações', form.notes || '—'],
                ].map(([label, value]) => (
                  <Stack key={label} direction="row" spacing={1}>
                    <Typography variant="caption" color="text.secondary" sx={{ minWidth: 90, flexShrink: 0 }}>{label}:</Typography>
                    <Typography variant="caption" fontWeight={500}>{value}</Typography>
                  </Stack>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      )}

      <Stack direction="row" justifyContent="space-between" sx={{ mt: 4 }}>
        <Button
          variant="text" color="inherit"
          onClick={() => step === 0 ? router.push('/pedidos') : setStep(s => s - 1)}
        >
          {step === 0 ? 'Cancelar' : 'Voltar'}
        </Button>
        {step < 2 ? (
          <Button variant="contained" onClick={() => setStep(s => s + 1)} disabled={!canProceed(step, form)}>
            Continuar
          </Button>
        ) : (
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={submitting}
            startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            {submitting ? 'Enviando…' : 'Enviar pedido'}
          </Button>
        )}
      </Stack>
    </Box>
  );
}
