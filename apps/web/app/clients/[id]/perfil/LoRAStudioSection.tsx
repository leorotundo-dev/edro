'use client';

import { useEffect, useState } from 'react';
import { apiGet, apiPost } from '@/lib/api';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Collapse from '@mui/material/Collapse';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import {
  IconBrain,
  IconCheck,
  IconChevronDown,
  IconChevronUp,
  IconClock,
  IconPlayerPlay,
  IconRefresh,
  IconX,
} from '@tabler/icons-react';

const ACCENT = '#5D87FF';

// ─── Types ────────────────────────────────────────────────────────────────────

type LoraJob = {
  id: string;
  status: 'pending' | 'training' | 'validating' | 'active' | 'failed' | 'archived';
  trigger_word: string;
  steps: number;
  version: number;
  fal_lora_url: string | null;
  training_images: string[];
  validation_images: string[];
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
  approved_at: string | null;
};

const STATUS_LABEL: Record<LoraJob['status'], string> = {
  pending:    'Aguardando',
  training:   'Treinando...',
  validating: 'Aguardando aprovação',
  active:     'Ativo',
  failed:     'Falhou',
  archived:   'Arquivado',
};

const STATUS_COLOR: Record<LoraJob['status'], string> = {
  pending:    '#f59e0b',
  training:   '#5D87FF',
  validating: '#8b5cf6',
  active:     '#22c55e',
  failed:     '#ef4444',
  archived:   '#9ca3af',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function ValidationImages({ images, triggerWord }: { images: string[]; triggerWord: string }) {
  if (!images.length) return null;
  return (
    <Box sx={{ mt: 1.5 }}>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
        Imagens de validação geradas com <code>{triggerWord}</code>
      </Typography>
      <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
        {images.map((url, i) => (
          <Box
            key={i}
            component="img"
            src={url}
            alt={`Validação ${i + 1}`}
            sx={{
              width: 80, height: 80, objectFit: 'cover', borderRadius: 1.5,
              border: '2px solid #e5e7eb',
              cursor: 'pointer',
              transition: 'transform 0.15s',
              '&:hover': { transform: 'scale(1.08)', borderColor: ACCENT },
            }}
            onClick={() => window.open(url, '_blank')}
          />
        ))}
      </Stack>
    </Box>
  );
}

function JobCard({
  job,
  onApprove,
  onReject,
  onRetry,
}: {
  job: LoraJob;
  onApprove: (jobId: string) => void;
  onReject: (jobId: string) => void;
  onRetry: () => void;
}) {
  const [expanded, setExpanded] = useState(job.status === 'validating');

  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 2,
        borderColor: job.status === 'active' ? `${STATUS_COLOR.active}40` : 'divider',
        bgcolor: job.status === 'active' ? `${STATUS_COLOR.active}04` : 'background.paper',
      }}
    >
      <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" alignItems="center" spacing={1}>
            <Chip
              size="small"
              label={STATUS_LABEL[job.status]}
              sx={{
                height: 20, fontSize: '0.65rem', fontWeight: 700,
                bgcolor: `${STATUS_COLOR[job.status]}18`,
                color: STATUS_COLOR[job.status],
                border: `1px solid ${STATUS_COLOR[job.status]}40`,
              }}
            />
            <Typography variant="body2" fontWeight={600}>
              v{job.version} — <code style={{ fontSize: '0.75rem' }}>{job.trigger_word}</code>
            </Typography>
            <Typography variant="caption" color="text.disabled">
              {job.steps} steps
            </Typography>
          </Stack>

          <Stack direction="row" spacing={0.5} alignItems="center">
            {job.status === 'training' && <CircularProgress size={14} sx={{ color: ACCENT }} />}
            {job.status === 'validating' && (
              <>
                <Tooltip title="Aprovar e ativar este LoRA">
                  <Button
                    size="small"
                    variant="contained"
                    color="success"
                    startIcon={<IconCheck size={14} />}
                    onClick={() => onApprove(job.id)}
                    sx={{ fontSize: '0.7rem', py: 0.3, px: 1 }}
                  >
                    Aprovar
                  </Button>
                </Tooltip>
                <Tooltip title="Descartar este LoRA">
                  <Button
                    size="small"
                    variant="outlined"
                    color="error"
                    startIcon={<IconX size={14} />}
                    onClick={() => onReject(job.id)}
                    sx={{ fontSize: '0.7rem', py: 0.3, px: 1 }}
                  >
                    Descartar
                  </Button>
                </Tooltip>
              </>
            )}
            {job.status === 'failed' && (
              <Tooltip title="Iniciar novo treinamento">
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<IconRefresh size={14} />}
                  onClick={onRetry}
                  sx={{ fontSize: '0.7rem', py: 0.3, px: 1 }}
                >
                  Retreinar
                </Button>
              </Tooltip>
            )}
            {(job.validation_images.length > 0 || job.error_message) && (
              <Button
                size="small"
                variant="text"
                onClick={() => setExpanded(!expanded)}
                sx={{ minWidth: 28, p: 0.5, color: '#888' }}
              >
                {expanded ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
              </Button>
            )}
          </Stack>
        </Stack>

        <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5, display: 'block' }}>
          Criado {new Date(job.created_at).toLocaleDateString('pt-BR')}
          {job.completed_at && ` · Concluído ${new Date(job.completed_at).toLocaleDateString('pt-BR')}`}
          {job.approved_at && ` · Ativado ${new Date(job.approved_at).toLocaleDateString('pt-BR')}`}
        </Typography>

        <Collapse in={expanded}>
          {job.error_message && (
            <Alert severity="error" sx={{ mt: 1, fontSize: '0.75rem' }}>{job.error_message}</Alert>
          )}
          <ValidationImages images={job.validation_images} triggerWord={job.trigger_word} />
        </Collapse>
      </CardContent>
    </Card>
  );
}

// ─── Start Training Form ───────────────────────────────────────────────────────

function StartTrainingForm({
  clientId,
  onStarted,
}: {
  clientId: string;
  onStarted: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [triggerWord, setTriggerWord] = useState('');
  const [imageUrls, setImageUrls] = useState('');
  const [steps, setSteps] = useState('1000');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleStart() {
    setError(null);
    const images = imageUrls.split('\n').map((s) => s.trim()).filter(Boolean);
    if (images.length < 10) {
      setError('Mínimo de 10 URLs de imagens');
      return;
    }
    if (!triggerWord.match(/^[A-Z0-9_]+$/)) {
      setError('Trigger word deve conter apenas MAIÚSCULAS, números e underscores');
      return;
    }
    setLoading(true);
    try {
      await apiPost(`/clients/${clientId}/lora/start-training`, {
        training_images: images,
        trigger_word: triggerWord,
        steps: parseInt(steps, 10) || 1000,
      });
      setOpen(false);
      setTriggerWord('');
      setImageUrls('');
      onStarted();
    } catch (err: any) {
      setError(err?.message ?? 'Erro ao iniciar treinamento');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box>
      {!open ? (
        <Button
          variant="outlined"
          size="small"
          startIcon={<IconPlayerPlay size={14} />}
          onClick={() => setOpen(true)}
          sx={{
            fontSize: '0.75rem', textTransform: 'none',
            borderColor: `${ACCENT}60`, color: ACCENT,
            '&:hover': { borderColor: ACCENT, bgcolor: `${ACCENT}08` },
          }}
        >
          Iniciar novo treinamento
        </Button>
      ) : (
        <Card variant="outlined" sx={{ borderRadius: 2, borderColor: `${ACCENT}30` }}>
          <CardContent>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
              Novo treinamento de LoRA
            </Typography>

            <Stack spacing={1.5}>
              <TextField
                label="Trigger word"
                size="small"
                value={triggerWord}
                onChange={(e) => setTriggerWord(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''))}
                placeholder="CLIENTNAME_BRAND"
                helperText="Palavra-gatilho que ativa o estilo — ex: CSPORTOS_BRAND"
                fullWidth
              />

              <TextField
                label="URLs das imagens (1 por linha)"
                size="small"
                value={imageUrls}
                onChange={(e) => setImageUrls(e.target.value)}
                multiline
                rows={5}
                placeholder={'https://storage.exemplo.com/img1.jpg\nhttps://storage.exemplo.com/img2.jpg\n...'}
                helperText={`${imageUrls.split('\n').filter((s) => s.trim()).length} imagens · mínimo 10, ideal 20–30`}
                fullWidth
              />

              <TextField
                label="Steps de treinamento"
                size="small"
                type="number"
                value={steps}
                onChange={(e) => setSteps(e.target.value)}
                inputProps={{ min: 500, max: 2000 }}
                helperText="500–2000 · mais steps = mais fiel ao estilo (≈15–30 min na Fal.ai)"
                fullWidth
              />

              {error && <Alert severity="error" sx={{ fontSize: '0.75rem' }}>{error}</Alert>}

              <Stack direction="row" spacing={1}>
                <Button
                  variant="contained"
                  size="small"
                  onClick={handleStart}
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={12} /> : <IconPlayerPlay size={14} />}
                  sx={{ fontSize: '0.75rem', textTransform: 'none' }}
                >
                  {loading ? 'Enfileirando...' : 'Iniciar treinamento'}
                </Button>
                <Button
                  variant="text"
                  size="small"
                  onClick={() => setOpen(false)}
                  sx={{ fontSize: '0.75rem', textTransform: 'none', color: '#888' }}
                >
                  Cancelar
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}

// ─── Main Section ─────────────────────────────────────────────────────────────

export default function LoRAStudioSection({ clientId }: { clientId: string }) {
  const [jobs, setJobs] = useState<LoraJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function fetchJobs() {
    setLoading(true);
    try {
      const res = await apiGet<{ jobs: LoraJob[] }>(`/clients/${clientId}/lora/jobs`);
      setJobs(res.jobs ?? []);
    } catch {
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchJobs(); }, [clientId]);

  const activeJob = jobs.find((j) => j.status === 'active');
  const inProgressJob = jobs.find((j) => j.status === 'training' || j.status === 'pending');
  const validatingJob = jobs.find((j) => j.status === 'validating');

  async function handleApprove(jobId: string) {
    setActionLoading(jobId);
    setError(null);
    try {
      await apiPost(`/clients/${clientId}/lora/jobs/${jobId}/approve`);
      await fetchJobs();
    } catch (err: any) {
      setError(err?.message ?? 'Erro ao aprovar LoRA');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleReject(jobId: string) {
    setActionLoading(jobId);
    setError(null);
    try {
      await apiPost(`/clients/${clientId}/lora/jobs/${jobId}/reject`);
      await fetchJobs();
    } catch (err: any) {
      setError(err?.message ?? 'Erro ao descartar LoRA');
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <Card variant="outlined">
      <CardContent>
        {/* Header */}
        <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Avatar sx={{ bgcolor: `${ACCENT}15`, color: ACCENT, width: 32, height: 32 }}>
              <IconBrain size={18} />
            </Avatar>
            <Box>
              <Typography variant="subtitle2" fontWeight={700}>Modelo IA (LoRA)</Typography>
              <Typography variant="caption" color="text.secondary">
                Fine-tuning Flux com o DNA visual do cliente
              </Typography>
            </Box>
          </Stack>
          <Tooltip title="Atualizar status">
            <Button
              size="small"
              variant="text"
              onClick={fetchJobs}
              disabled={loading}
              sx={{ minWidth: 32, p: 0.5, color: '#888' }}
            >
              {loading ? <CircularProgress size={14} /> : <IconRefresh size={16} />}
            </Button>
          </Tooltip>
        </Stack>

        {/* Active status banner */}
        {activeJob ? (
          <Box sx={{
            mb: 2, p: 1.5, borderRadius: 1.5,
            bgcolor: `${STATUS_COLOR.active}0A`,
            border: `1px solid ${STATUS_COLOR.active}30`,
          }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <IconCheck size={16} color={STATUS_COLOR.active} />
              <Box>
                <Typography variant="body2" fontWeight={700} sx={{ color: STATUS_COLOR.active }}>
                  LoRA ativo — v{activeJob.version}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Trigger: <code>{activeJob.trigger_word}</code>
                  {' · '}Todas as imagens geradas para este cliente usarão este modelo
                </Typography>
              </Box>
            </Stack>
          </Box>
        ) : (
          <Box sx={{
            mb: 2, p: 1.5, borderRadius: 1.5,
            bgcolor: '#f8f8f8', border: '1px solid #e5e7eb',
          }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <IconBrain size={16} color="#9ca3af" />
              <Typography variant="body2" color="text.secondary">
                Nenhum LoRA ativo — imagens usam prompts genéricos de estilo
              </Typography>
            </Stack>
          </Box>
        )}

        {/* Training in progress notice */}
        {inProgressJob && (
          <Alert
            severity="info"
            icon={<IconClock size={16} />}
            sx={{ mb: 2, fontSize: '0.75rem' }}
          >
            Treinamento em andamento (v{inProgressJob.version}) — tempo estimado: 15–30 min.
            O status atualiza automaticamente.
          </Alert>
        )}

        {/* Validation pending notice */}
        {validatingJob && !inProgressJob && (
          <Alert
            severity="warning"
            sx={{ mb: 2, fontSize: '0.75rem' }}
          >
            LoRA v{validatingJob.version} aguarda aprovação — verifique as imagens de validação abaixo.
          </Alert>
        )}

        {error && <Alert severity="error" sx={{ mb: 1.5, fontSize: '0.75rem' }}>{error}</Alert>}

        {/* Start training button (only if no job in progress) */}
        {!inProgressJob && (
          <Box sx={{ mb: 2 }}>
            <StartTrainingForm clientId={clientId} onStarted={fetchJobs} />
          </Box>
        )}

        {/* Job history */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress size={20} />
          </Box>
        ) : jobs.length > 0 ? (
          <>
            <Divider sx={{ mb: 1.5 }}>
              <Typography variant="caption" color="text.disabled">Histórico</Typography>
            </Divider>
            <Stack spacing={1}>
              {jobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  onRetry={() => {}} // opens the form above
                />
              ))}
            </Stack>
          </>
        ) : (
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Nenhum treinamento de LoRA iniciado ainda.
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Após treinar com 20–30 imagens de referência, o Motor de DA passa a gerar
              imagens que respeitam automaticamente o estilo visual do cliente.
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
