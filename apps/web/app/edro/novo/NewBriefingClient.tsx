'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Alert from '@mui/material/Alert';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Collapse from '@mui/material/Collapse';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import {
  IconArrowRight,
  IconBrain,
  IconCalendar,
  IconCheck,
  IconChevronRight,
  IconEdit,
  IconRefresh,
  IconSend,
  IconSparkles,
  IconUser,
} from '@tabler/icons-react';
import AppShell from '@/components/AppShell';
import { apiGet, apiPost } from '@/lib/api';

type EdroClient = { id: string; name: string; segment?: string };

type ParsedJob = {
  title: string;
  objective: string;
  objective_label: string;
  target_audience: string;
  channels: string[];
  due_hint: string | null;
  format_hint: string | null;
  notes: string;
  confidence: number;
};

const OBJECTIVE_OPTIONS = [
  { value: 'awareness',   label: 'Awareness / Reconhecimento de Marca' },
  { value: 'engagement',  label: 'Engajamento' },
  { value: 'conversao',   label: 'Conversão / Vendas' },
  { value: 'leads',       label: 'Geração de Leads' },
  { value: 'branding',    label: 'Branding / Institucional' },
  { value: 'lancamento',  label: 'Lançamento de Produto' },
  { value: 'outro',       label: 'Outro' },
];

const ALL_CHANNELS = [
  'Instagram', 'Facebook', 'LinkedIn', 'TikTok', 'YouTube',
  'WhatsApp', 'Email', 'Google Ads', 'Meta Ads', 'Site/Blog',
];

const STEP_LABELS = ['Contexto', 'Revisão IA', 'Confirmar'];

export default function NewBriefingClient() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const descRef      = useRef<HTMLTextAreaElement>(null);

  const prefillClientName = searchParams.get('client_name') || '';
  const prefillTitle      = searchParams.get('title') || '';
  const prefillDate       = searchParams.get('date') || '';

  const [step,           setStep]           = useState(0);
  const [clients,        setClients]        = useState<EdroClient[]>([]);
  const [selectedClient, setSelectedClient] = useState<EdroClient | null>(null);
  const [description,    setDescription]    = useState(prefillTitle);
  const [analyzing,      setAnalyzing]      = useState(false);
  const [parsed,         setParsed]         = useState<ParsedJob | null>(null);
  const [editedTitle,    setEditedTitle]    = useState('');
  const [editedObjective,setEditedObjective]= useState('');
  const [editedAudience, setEditedAudience] = useState('');
  const [editedChannels, setEditedChannels] = useState<string[]>([]);
  const [editedDue,      setEditedDue]      = useState(prefillDate);
  const [editedNotes,    setEditedNotes]    = useState('');
  const [trafficOwner,   setTrafficOwner]   = useState('');
  const [submitting,     setSubmitting]     = useState(false);
  const [error,          setError]          = useState('');

  useEffect(() => {
    apiGet<{ data: EdroClient[] }>('/edro/clients')
      .then((res) => {
        const list = res?.data ?? [];
        setClients(list);
        if (prefillClientName) {
          const found = list.find(
            (c) => c.name.toLowerCase() === prefillClientName.toLowerCase()
          );
          if (found) setSelectedClient(found);
        }
      })
      .catch(() => {});
  }, [prefillClientName]);

  const handleAnalyze = useCallback(async () => {
    if (!description.trim() || description.trim().length < 10) {
      setError('Descreva o job em pelo menos 10 caracteres.');
      return;
    }
    setError('');
    setAnalyzing(true);
    try {
      const res = await apiPost<{ ok: boolean; data: ParsedJob }>('/edro/ai/parse-job', {
        description: description.trim(),
        client_name: selectedClient?.name,
      });
      if (!res?.ok || !res.data) throw new Error('Falha ao analisar.');
      const d = res.data;
      setParsed(d);
      setEditedTitle(d.title);
      setEditedObjective(d.objective);
      setEditedAudience(d.target_audience);
      setEditedChannels(d.channels?.length ? d.channels : []);
      setEditedDue(d.due_hint ?? prefillDate);
      setEditedNotes(d.notes);
      setStep(1);
    } catch (e: any) {
      setError(e?.message || 'Erro ao analisar o job com IA.');
    } finally {
      setAnalyzing(false);
    }
  }, [description, selectedClient, prefillDate]);

  const handleSubmit = async () => {
    if (!editedTitle.trim()) { setError('Título é obrigatório.'); return; }
    setError('');
    setSubmitting(true);
    try {
      const payload: Record<string, any> = {
        ...(selectedClient?.id
          ? { client_id: selectedClient.id }
          : { client_name: selectedClient?.name ?? description.split(' ').slice(0, 3).join(' ') }),
        title: editedTitle.trim(),
        payload: {
          objective:       editedObjective,
          target_audience: editedAudience,
          channels:        editedChannels.join(', '),
          format_hint:     parsed?.format_hint ?? null,
          additional_notes: editedNotes,
          original_description: description,
          ai_confidence:   parsed?.confidence ?? null,
        },
        due_at:             editedDue || undefined,
        traffic_owner:      trafficOwner || undefined,
        notify_traffic:     Boolean(trafficOwner),
        source:             'novo_job_ai',
        auto_create_trello: true,
        auto_copy_ia:       true,
      };

      const response = await apiPost<{ success: boolean; data: { briefing: { id: string } } }>(
        '/edro/briefings', payload
      );

      if (response?.data?.briefing?.id) {
        router.push(`/edro/${response.data.briefing.id}`);
      } else {
        setError('Job criado mas ID não retornado.');
      }
    } catch (err: any) {
      setError(err?.message || 'Erro ao criar job.');
    } finally {
      setSubmitting(false);
    }
  };

  const confidenceColor = parsed
    ? parsed.confidence >= 0.75 ? '#13DEB9' : parsed.confidence >= 0.5 ? '#FFAE1F' : '#FA896B'
    : '#999';

  return (
    <AppShell
      title="Novo Job"
      topbarLeft={
        <Stack direction="row" spacing={1} alignItems="center">
          <Button size="small" onClick={() => router.push('/edro')} sx={{ color: 'text.secondary', textTransform: 'none' }}>
            Edro
          </Button>
          <IconChevronRight size={14} />
          <Typography variant="body2" fontWeight={500}>Novo Job</Typography>
        </Stack>
      }
    >
      <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 760, mx: 'auto' }}>

        {/* Step indicator */}
        <Stack direction="row" spacing={0} alignItems="center" sx={{ mb: 3 }}>
          {STEP_LABELS.map((label, i) => (
            <Stack key={i} direction="row" alignItems="center" spacing={0}>
              <Stack alignItems="center" spacing={0.25}>
                <Box sx={{
                  width: 28, height: 28, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  bgcolor: i < step ? '#13DEB9' : i === step ? 'primary.main' : 'action.disabledBackground',
                  color: i <= step ? '#fff' : 'text.disabled',
                  fontSize: '0.75rem', fontWeight: 700,
                }}>
                  {i < step ? <IconCheck size={14} /> : i + 1}
                </Box>
                <Typography variant="caption" sx={{ fontSize: '0.65rem', fontWeight: i === step ? 700 : 400, color: i === step ? 'primary.main' : 'text.secondary' }}>
                  {label}
                </Typography>
              </Stack>
              {i < STEP_LABELS.length - 1 && (
                <Box sx={{ width: 48, height: 2, bgcolor: i < step ? '#13DEB9' : 'divider', mb: 1.8 }} />
              )}
            </Stack>
          ))}
        </Stack>

        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

        {/* ── STEP 0: Contexto ── */}
        {step === 0 && (
          <Stack spacing={2.5}>
            <Card variant="outlined">
              <CardContent>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                  <Box sx={{ width: 32, height: 32, borderRadius: 2, bgcolor: alpha('#5D87FF', 0.12), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <IconUser size={18} color="#5D87FF" />
                  </Box>
                  <Typography variant="subtitle2" fontWeight={700}>Para qual cliente é esse job?</Typography>
                </Stack>

                <Autocomplete
                  options={clients}
                  getOptionLabel={(o) => o.name}
                  value={selectedClient}
                  onChange={(_, v) => setSelectedClient(v)}
                  freeSolo
                  onInputChange={(_, val) => {
                    if (!clients.find((c) => c.name === val)) {
                      setSelectedClient({ id: '', name: val });
                    }
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      size="small"
                      label="Cliente *"
                      placeholder="Comece a digitar o nome do cliente..."
                      required
                    />
                  )}
                  renderOption={(props, option) => (
                    <li {...props} key={option.id}>
                      <Stack>
                        <Typography variant="body2" fontWeight={600}>{option.name}</Typography>
                        {option.segment && (
                          <Typography variant="caption" color="text.secondary">{option.segment}</Typography>
                        )}
                      </Stack>
                    </li>
                  )}
                />
              </CardContent>
            </Card>

            <Card variant="outlined" sx={{ borderColor: analyzing ? 'primary.main' : undefined }}>
              <CardContent>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                  <Box sx={{ width: 32, height: 32, borderRadius: 2, bgcolor: alpha('#7B5EA7', 0.12), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <IconBrain size={18} color="#7B5EA7" />
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" fontWeight={700}>Descreva o job</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Fale naturalmente — a IA vai estruturar o briefing por você
                    </Typography>
                  </Box>
                </Stack>

                <TextField
                  fullWidth
                  multiline
                  rows={5}
                  inputRef={descRef}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={`Ex: "Preciso de um post para o Instagram do Banco BBC divulgando a abertura de conta digital para jovens de 18 a 25 anos. Queremos algo moderno, descontraído. Prazo até sexta-feira."`}
                  variant="outlined"
                  sx={{ '& .MuiOutlinedInput-root': { fontSize: '0.9rem' } }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleAnalyze();
                  }}
                />

                <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5, display: 'block' }}>
                  Ctrl+Enter para analisar rapidamente
                </Typography>
              </CardContent>
            </Card>

            <Button
              variant="contained"
              size="large"
              onClick={handleAnalyze}
              disabled={analyzing || !description.trim() || description.trim().length < 10}
              endIcon={analyzing ? <CircularProgress size={16} color="inherit" /> : <IconSparkles size={18} />}
              sx={{ py: 1.5, fontWeight: 700 }}
            >
              {analyzing ? 'A IA está analisando...' : 'Analisar com IA'}
            </Button>
          </Stack>
        )}

        {/* ── STEP 1: Revisão ── */}
        {step === 1 && parsed && (
          <Stack spacing={2.5}>
            {/* IA confidence badge */}
            <Stack direction="row" spacing={1} alignItems="center">
              <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: confidenceColor }} />
              <Typography variant="caption" color="text.secondary">
                Confiança da IA: <strong style={{ color: confidenceColor }}>{Math.round(parsed.confidence * 100)}%</strong>
                {parsed.confidence < 0.6 && ' — preencha os campos em branco'}
              </Typography>
              <Box sx={{ flex: 1 }} />
              <Button size="small" startIcon={<IconRefresh size={14} />} onClick={() => setStep(0)} sx={{ textTransform: 'none', fontSize: '0.75rem' }}>
                Reescrever
              </Button>
            </Stack>

            {/* Original description collapsed */}
            <Card variant="outlined" sx={{ bgcolor: alpha('#7B5EA7', 0.04) }}>
              <CardContent sx={{ py: '8px !important', px: '12px !important' }}>
                <Stack direction="row" spacing={1} alignItems="flex-start">
                  <IconBrain size={14} color="#7B5EA7" style={{ marginTop: 3, flexShrink: 0 }} />
                  <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic', lineHeight: 1.5 }}>
                    {description.length > 160 ? description.slice(0, 160) + '…' : description}
                  </Typography>
                </Stack>
              </CardContent>
            </Card>

            <Card variant="outlined">
              <CardContent>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                  <IconEdit size={16} color="#5D87FF" />
                  <Typography variant="subtitle2" fontWeight={700}>Revise e complete os campos</Typography>
                </Stack>

                <Stack spacing={2}>
                  <TextField
                    fullWidth size="small"
                    label="Título do Job *"
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    required
                    helperText="O título vai aparecer no card do Trello"
                  />

                  <TextField
                    fullWidth size="small" select
                    label="Objetivo"
                    value={editedObjective}
                    onChange={(e) => setEditedObjective(e.target.value)}
                  >
                    {OBJECTIVE_OPTIONS.map((o) => (
                      <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                    ))}
                  </TextField>

                  <TextField
                    fullWidth size="small" multiline rows={2}
                    label="Público-Alvo"
                    value={editedAudience}
                    onChange={(e) => setEditedAudience(e.target.value)}
                    placeholder="Ex: Mulheres, 25-40 anos, classes A/B..."
                  />

                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 0.75, display: 'block' }}>
                      Canais
                    </Typography>
                    <Stack direction="row" flexWrap="wrap" gap={0.75}>
                      {ALL_CHANNELS.map((ch) => {
                        const active = editedChannels.includes(ch);
                        return (
                          <Chip
                            key={ch}
                            label={ch}
                            size="small"
                            variant={active ? 'filled' : 'outlined'}
                            color={active ? 'primary' : 'default'}
                            onClick={() =>
                              setEditedChannels((prev) =>
                                prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch]
                              )
                            }
                            sx={{ cursor: 'pointer' }}
                          />
                        );
                      })}
                    </Stack>
                  </Box>

                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <TextField
                      fullWidth size="small"
                      label="Prazo de Entrega"
                      type="date"
                      value={editedDue}
                      onChange={(e) => setEditedDue(e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      InputProps={{ startAdornment: <IconCalendar size={14} style={{ marginRight: 6, color: '#999' }} /> }}
                    />
                    <TextField
                      fullWidth size="small"
                      label="Gestor Responsável (email)"
                      type="email"
                      value={trafficOwner}
                      onChange={(e) => setTrafficOwner(e.target.value)}
                      placeholder="email@edro.digital"
                      InputProps={{ startAdornment: <IconUser size={14} style={{ marginRight: 6, color: '#999' }} /> }}
                    />
                  </Stack>

                  {parsed.format_hint && (
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="caption" color="text.secondary">Formato detectado:</Typography>
                      <Chip label={parsed.format_hint} size="small" variant="outlined" />
                    </Stack>
                  )}

                  <TextField
                    fullWidth size="small" multiline rows={2}
                    label="Observações Adicionais"
                    value={editedNotes}
                    onChange={(e) => setEditedNotes(e.target.value)}
                  />
                </Stack>
              </CardContent>
            </Card>

            <Stack direction="row" spacing={1.5} justifyContent="flex-end">
              <Button variant="outlined" onClick={() => setStep(0)}>Voltar</Button>
              <Button
                variant="contained"
                onClick={() => { setError(''); setStep(2); }}
                disabled={!editedTitle.trim()}
                endIcon={<IconArrowRight size={16} />}
                sx={{ fontWeight: 700 }}
              >
                Próximo
              </Button>
            </Stack>
          </Stack>
        )}

        {/* ── STEP 2: Confirmação ── */}
        {step === 2 && (
          <Stack spacing={2.5}>
            <Card variant="outlined" sx={{ borderColor: 'primary.main', borderWidth: 2 }}>
              <CardContent>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                  <IconCheck size={18} color="#5D87FF" />
                  <Typography variant="subtitle1" fontWeight={800}>Confirme o Job</Typography>
                </Stack>

                <Stack spacing={1.5}>
                  {[
                    { label: 'Cliente',        value: selectedClient?.name || '—' },
                    { label: 'Título',          value: editedTitle },
                    { label: 'Objetivo',        value: (OBJECTIVE_OPTIONS.find((o) => o.value === editedObjective)?.label ?? editedObjective) || '—' },
                    { label: 'Público',         value: editedAudience || '—' },
                    { label: 'Canais',          value: editedChannels.length ? editedChannels.join(', ') : '—' },
                    { label: 'Prazo',           value: editedDue ? new Date(editedDue + 'T12:00:00').toLocaleDateString('pt-BR') : '—' },
                    { label: 'Gestor',          value: trafficOwner || '—' },
                  ].map(({ label, value }) => (
                    <Stack key={label} direction="row" spacing={1} alignItems="flex-start">
                      <Typography variant="caption" color="text.secondary" sx={{ minWidth: 90, pt: 0.1 }}>{label}</Typography>
                      <Typography variant="caption" fontWeight={600}>{value}</Typography>
                    </Stack>
                  ))}
                </Stack>

                <Divider sx={{ my: 2 }} />

                <Collapse in>
                  <Stack spacing={0.75}>
                    {[
                      { icon: '🃏', text: 'Card criado automaticamente no Trello do cliente' },
                      { icon: '🤖', text: 'Copy IA será gerada automaticamente pelo sistema' },
                      { icon: '🔔', text: trafficOwner ? `${trafficOwner} será notificado(a)` : 'Gestores serão notificados via painel' },
                    ].map((item) => (
                      <Stack key={item.text} direction="row" spacing={1} alignItems="flex-start">
                        <Typography sx={{ fontSize: '0.85rem', mt: '1px' }}>{item.icon}</Typography>
                        <Typography variant="caption" color="text.secondary">{item.text}</Typography>
                      </Stack>
                    ))}
                  </Stack>
                </Collapse>
              </CardContent>
            </Card>

            <Stack direction="row" spacing={1.5} justifyContent="flex-end">
              <Button variant="outlined" onClick={() => setStep(1)} disabled={submitting}>Editar</Button>
              <Button
                variant="contained"
                onClick={handleSubmit}
                disabled={submitting}
                endIcon={submitting ? <CircularProgress size={16} color="inherit" /> : <IconSend size={16} />}
                sx={{ fontWeight: 700, minWidth: 160 }}
              >
                {submitting ? 'Criando Job...' : 'Criar Job'}
              </Button>
            </Stack>
          </Stack>
        )}
      </Box>
    </AppShell>
  );
}
