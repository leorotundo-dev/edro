'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet, apiPatch, apiPost } from '@/lib/api';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import Popover from '@mui/material/Popover';
import Select from '@mui/material/Select';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import {
  IconAlertTriangle,
  IconBriefcase,
  IconBulb,
  IconCheck,
  IconClock,
  IconFileText,
  IconMessageCircle,
  IconRefresh,
  IconThumbDown,
  IconThumbUp,
} from '@tabler/icons-react';

const EDRO_GREEN = '#25D366';

type Insight = {
  id: string;
  insight_type: 'feedback' | 'approval' | 'request' | 'preference' | 'deadline' | 'complaint' | 'praise';
  summary: string;
  sentiment: 'positive' | 'negative' | 'neutral' | null;
  urgency: 'urgent' | 'normal' | 'low';
  entities: { topics?: string[]; deliverables?: string[]; people?: string[]; dates?: string[] } | null;
  created_at: string;
  sender_name: string | null;
  message_content: string | null;
};

type Digest = {
  id: string;
  period: 'daily' | 'weekly';
  period_start: string;
  summary: string;
  key_decisions: Array<{ decision: string; context?: string; date?: string }> | null;
  pending_actions: Array<{ action: string; owner?: string; deadline?: string }> | null;
  message_count: number;
  insight_count: number;
  created_at: string;
};

type Stats = {
  messages_7d: number;
  messages_30d: number;
  unactioned: number;
  urgent_unactioned: number;
  dominant_sentiment: string | null;
};

type IntelData = { stats: Stats; insights: Insight[]; digest: Digest | null };

// ── Helpers ──────────────────────────────────────────────────────────────

const TYPE_LABEL: Record<string, string> = {
  feedback: 'Feedback', approval: 'Aprovação', request: 'Pedido',
  preference: 'Preferência', deadline: 'Prazo', complaint: 'Reclamação', praise: 'Elogio',
};

const TYPE_COLOR: Record<string, string> = {
  feedback: '#1976d2', approval: '#388e3c', request: '#7b1fa2',
  preference: '#0288d1', deadline: '#f57c00', complaint: '#d32f2f', praise: '#2e7d32',
};

function SentimentChip({ sentiment }: { sentiment: string | null }) {
  if (!sentiment) return null;
  const map: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    positive: { label: 'Positivo', color: '#2e7d32', icon: <IconThumbUp size={11} /> },
    negative: { label: 'Negativo', color: '#c62828', icon: <IconThumbDown size={11} /> },
    neutral:  { label: 'Neutro',   color: '#616161', icon: null },
  };
  const cfg = map[sentiment] ?? map.neutral;
  return (
    <Chip
      size="small"
      icon={cfg.icon ? <span style={{ display: 'flex', marginLeft: 4 }}>{cfg.icon}</span> : undefined}
      label={cfg.label}
      sx={{ height: 18, fontSize: '0.62rem', bgcolor: `${cfg.color}15`, color: cfg.color, fontWeight: 600 }}
    />
  );
}

function fmtAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h = diff / 3600000;
  if (h < 1) return `${Math.round(diff / 60000)}min atrás`;
  if (h < 24) return `${Math.round(h)}h atrás`;
  return `${Math.round(h / 24)}d atrás`;
}

// ── Quick Job Creator Popover ─────────────────────────────────────────────

function CreateJobPopover({
  clientId,
  anchorEl,
  prefill,
  isUrgent,
  onClose,
  onCreated,
}: {
  clientId: string;
  anchorEl: HTMLElement | null;
  prefill: string;
  isUrgent: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState(prefill.slice(0, 120));
  const [jobType, setJobType] = useState('request');
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => { setTitle(prefill.slice(0, 120)); setErr(''); }, [prefill]);

  const handleCreate = async () => {
    if (title.trim().length < 3) { setErr('Título muito curto'); return; }
    setCreating(true); setErr('');
    try {
      await apiPost('/jobs', {
        title: title.trim(),
        client_id: clientId,
        job_type: jobType,
        complexity: 's',
        source: 'whatsapp',
        is_urgent: isUrgent,
        summary: prefill,
      });
      onCreated();
      onClose();
    } catch (e: any) {
      setErr(e?.message ?? 'Erro ao criar job');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Popover
      open={Boolean(anchorEl)}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      PaperProps={{ sx: { p: 2, width: 320, borderRadius: 2 } }}
    >
      <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
        Criar job a partir do insight
      </Typography>
      <TextField
        fullWidth size="small" label="Título" multiline maxRows={3}
        value={title} onChange={e => setTitle(e.target.value)}
        sx={{ mb: 1.5 }}
      />
      <Select
        fullWidth size="small" value={jobType}
        onChange={e => setJobType(e.target.value as string)}
        sx={{ mb: 1.5 }}
      >
        <MenuItem value="request">Pedido do cliente</MenuItem>
        <MenuItem value="content">Conteúdo</MenuItem>
        <MenuItem value="design">Design</MenuItem>
        <MenuItem value="strategy">Estratégia</MenuItem>
        <MenuItem value="other">Outro</MenuItem>
      </Select>
      {isUrgent && (
        <Chip label="🔴 Urgente" size="small" color="error" variant="outlined" sx={{ mb: 1.5 }} />
      )}
      {err && <Alert severity="error" sx={{ mb: 1, fontSize: '0.75rem' }}>{err}</Alert>}
      <Stack direction="row" spacing={1} justifyContent="flex-end">
        <Button size="small" onClick={onClose} disabled={creating}>Cancelar</Button>
        <Button
          size="small" variant="contained" onClick={handleCreate}
          disabled={creating || title.trim().length < 3}
          startIcon={creating ? <CircularProgress size={12} color="inherit" /> : <IconBriefcase size={14} />}
        >
          Criar job
        </Button>
      </Stack>
    </Popover>
  );
}

// ── Insight Row ───────────────────────────────────────────────────────────

function InsightRow({
  insight,
  clientId,
  onActioned,
  onJobCreated,
}: {
  insight: Insight;
  clientId: string;
  onActioned: (id: string) => void;
  onJobCreated: () => void;
}) {
  const router = useRouter();
  const [actioning, setActioning] = useState(false);
  const [jobAnchor, setJobAnchor] = useState<HTMLElement | null>(null);

  const handleAction = async () => {
    setActioning(true);
    try {
      await apiPatch(`/whatsapp-groups/insights/${insight.id}/action`, {});
      onActioned(insight.id);
    } finally {
      setActioning(false);
    }
  };

  const showJobBtn = ['request', 'deadline', 'complaint'].includes(insight.insight_type);
  const showPautaBtn = ['request', 'feedback', 'deadline'].includes(insight.insight_type);
  const isUrgent = insight.urgency === 'urgent';

  return (
    <Box sx={{
      p: 1.5, borderRadius: 1.5,
      border: 1,
      borderColor: isUrgent ? '#f4433640' : 'divider',
      bgcolor: isUrgent ? '#fff5f5' : 'background.paper',
    }}>
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 0.75 }}>
        <Chip
          size="small"
          label={TYPE_LABEL[insight.insight_type] ?? insight.insight_type}
          sx={{
            height: 18, fontSize: '0.62rem', fontWeight: 700,
            bgcolor: `${TYPE_COLOR[insight.insight_type] ?? '#555'}15`,
            color: TYPE_COLOR[insight.insight_type] ?? '#555',
          }}
        />
        {isUrgent && (
          <Chip size="small" label="Urgente" icon={<IconAlertTriangle size={10} />}
            sx={{ height: 18, fontSize: '0.62rem', bgcolor: '#fdecea', color: '#c62828', fontWeight: 700 }}
          />
        )}
        <SentimentChip sentiment={insight.sentiment} />
        <Typography variant="caption" color="text.disabled" sx={{ ml: 'auto' }}>
          {insight.sender_name && `${insight.sender_name} · `}{fmtAgo(insight.created_at)}
        </Typography>
      </Stack>

      <Typography variant="body2" sx={{ fontSize: '0.82rem', lineHeight: 1.5, mb: 1 }}>
        {insight.summary}
      </Typography>

      {insight.message_content && (
        <Typography variant="caption" color="text.secondary"
          sx={{ display: 'block', fontStyle: 'italic', mb: 0.75,
            borderLeft: 2, borderColor: 'divider', pl: 1, lineHeight: 1.4 }}>
          "{insight.message_content.slice(0, 120)}{insight.message_content.length > 120 ? '…' : ''}"
        </Typography>
      )}

      <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
        <Button
          size="small" variant="outlined" color="success"
          startIcon={actioning ? <CircularProgress size={11} color="inherit" /> : <IconCheck size={13} />}
          disabled={actioning}
          onClick={handleAction}
          sx={{ fontSize: '0.7rem', height: 26, borderRadius: 1.5 }}
        >
          Feito
        </Button>
        {showPautaBtn && (
          <Button
            size="small" variant="outlined"
            startIcon={<IconFileText size={13} />}
            onClick={() => router.push(`/admin/editais/novo?client_id=${clientId}`)}
            sx={{ fontSize: '0.7rem', height: 26, borderRadius: 1.5 }}
          >
            Criar pauta
          </Button>
        )}
        {showJobBtn && (
          <Button
            size="small" variant="outlined" color="secondary"
            startIcon={<IconBriefcase size={13} />}
            onClick={e => setJobAnchor(e.currentTarget)}
            sx={{ fontSize: '0.7rem', height: 26, borderRadius: 1.5 }}
          >
            Criar job
          </Button>
        )}
      </Stack>

      <CreateJobPopover
        clientId={clientId}
        anchorEl={jobAnchor}
        prefill={insight.summary}
        isUrgent={isUrgent}
        onClose={() => setJobAnchor(null)}
        onCreated={onJobCreated}
      />
    </Box>
  );
}

// ── Digest Card ───────────────────────────────────────────────────────────

function DigestCard({ digest, clientId, onJobCreated }: { digest: Digest; clientId: string; onJobCreated: () => void }) {
  const router = useRouter();
  const [jobAnchors, setJobAnchors] = useState<Record<number, HTMLElement | null>>({});
  const decisions = digest.key_decisions ?? [];
  const actions = digest.pending_actions ?? [];

  return (
    <Card variant="outlined" sx={{ borderRadius: 2, borderColor: `${EDRO_GREEN}40` }}>
      <CardContent sx={{ pb: '12px !important' }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
          <IconBulb size={16} style={{ color: EDRO_GREEN }} />
          <Typography variant="subtitle2" fontWeight={700}>
            Resumo {digest.period === 'weekly' ? 'Semanal' : 'Diário'} ·{' '}
            {new Date(digest.period_start).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
          </Typography>
          <Chip size="small" label={`${digest.message_count} msgs`} sx={{ height: 18, fontSize: '0.62rem' }} />
          <Chip size="small" label={`${digest.insight_count} insights`} sx={{ height: 18, fontSize: '0.62rem' }} />
        </Stack>

        <Typography variant="body2" color="text.secondary"
          sx={{ fontSize: '0.8rem', lineHeight: 1.6, mb: 1.5, whiteSpace: 'pre-wrap' }}>
          {digest.summary}
        </Typography>

        {decisions.length > 0 && (
          <Box sx={{ mb: 1.5 }}>
            <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
              DECISÕES
            </Typography>
            <Stack spacing={0.75}>
              {decisions.map((d, i) => (
                <Stack key={i} direction="row" alignItems="flex-start" spacing={1}
                  sx={{ p: 1, bgcolor: '#f8f9fa', borderRadius: 1.5, border: 1, borderColor: 'divider' }}>
                  <Typography variant="body2" sx={{ flex: 1, fontSize: '0.8rem', lineHeight: 1.5 }}>
                    {d.decision}
                    {d.context && <Typography component="span" color="text.secondary"> · {d.context}</Typography>}
                  </Typography>
                  <Button
                    size="small" variant="outlined"
                    startIcon={<IconFileText size={11} />}
                    onClick={() => router.push(`/admin/editais/novo?client_id=${clientId}`)}
                    sx={{ fontSize: '0.65rem', height: 22, borderRadius: 1.5, whiteSpace: 'nowrap', flexShrink: 0 }}
                  >
                    Criar pauta
                  </Button>
                </Stack>
              ))}
            </Stack>
          </Box>
        )}

        {actions.length > 0 && (
          <Box>
            <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
              AÇÕES PENDENTES
            </Typography>
            <Stack spacing={0.75}>
              {actions.map((a, i) => (
                <Stack key={i} direction="row" alignItems="flex-start" spacing={1}
                  sx={{ p: 1, bgcolor: '#fff8e1', borderRadius: 1.5, border: 1, borderColor: '#ffe08240' }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" sx={{ fontSize: '0.8rem', lineHeight: 1.5 }}>{a.action}</Typography>
                    {(a.owner || a.deadline) && (
                      <Typography variant="caption" color="text.secondary">
                        {a.owner && `👤 ${a.owner}`}{a.owner && a.deadline && ' · '}{a.deadline && `⏰ ${a.deadline}`}
                      </Typography>
                    )}
                  </Box>
                  <Button
                    size="small" variant="outlined" color="secondary"
                    startIcon={<IconBriefcase size={11} />}
                    onClick={e => setJobAnchors(prev => ({ ...prev, [i]: e.currentTarget }))}
                    sx={{ fontSize: '0.65rem', height: 22, borderRadius: 1.5, whiteSpace: 'nowrap', flexShrink: 0 }}
                  >
                    Criar job
                  </Button>
                  <CreateJobPopover
                    clientId={clientId}
                    anchorEl={jobAnchors[i] ?? null}
                    prefill={a.action}
                    isUrgent={false}
                    onClose={() => setJobAnchors(prev => ({ ...prev, [i]: null }))}
                    onCreated={onJobCreated}
                  />
                </Stack>
              ))}
            </Stack>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

// ── Main Panel ────────────────────────────────────────────────────────────

export default function WhatsAppIntelligencePanel({ clientId }: { clientId: string }) {
  const [data, setData] = useState<IntelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [jobCreatedMsg, setJobCreatedMsg] = useState(false);
  const jobCreatedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await apiGet<{ success: boolean } & IntelData>(`/clients/${clientId}/whatsapp-intelligence`);
      setData({ stats: res.stats, insights: res.insights, digest: res.digest });
    } catch (e: any) {
      setError(e?.message ?? 'Erro ao carregar inteligência');
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { void load(); }, [load]);

  const handleActioned = (id: string) => {
    setData(prev => prev ? { ...prev, insights: prev.insights.filter(i => i.id !== id) } : prev);
  };

  const handleJobCreated = () => {
    setJobCreatedMsg(true);
    if (jobCreatedTimer.current) clearTimeout(jobCreatedTimer.current);
    jobCreatedTimer.current = setTimeout(() => setJobCreatedMsg(false), 4000);
  };

  if (loading) {
    return (
      <Box sx={{ p: 2 }}>
        <Skeleton variant="rounded" height={60} sx={{ mb: 2 }} />
        <Skeleton variant="rounded" height={120} sx={{ mb: 1.5 }} />
        <Skeleton variant="rounded" height={80} sx={{ mb: 1 }} />
        <Skeleton variant="rounded" height={80} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="error" action={<Button size="small" onClick={load}>Tentar novamente</Button>}>{error}</Alert>
      </Box>
    );
  }

  if (!data) return null;

  const { stats, insights, digest } = data;
  const urgentInsights = insights.filter(i => i.urgency === 'urgent');
  const otherInsights = insights.filter(i => i.urgency !== 'urgent');
  const hasData = stats.messages_7d > 0 || insights.length > 0 || digest;

  const sentimentColor = stats.dominant_sentiment === 'positive' ? '#2e7d32'
    : stats.dominant_sentiment === 'negative' ? '#c62828' : '#616161';
  const sentimentLabel = stats.dominant_sentiment === 'positive' ? 'Positivo'
    : stats.dominant_sentiment === 'negative' ? 'Negativo'
    : stats.dominant_sentiment === 'neutral' ? 'Neutro' : null;

  return (
    <Box sx={{ p: 2 }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        <IconMessageCircle size={18} style={{ color: EDRO_GREEN }} />
        <Typography variant="subtitle1" fontWeight={700}>Inteligência WhatsApp</Typography>
        <Box sx={{ flex: 1 }} />
        <Tooltip title="Atualizar">
          <Button size="small" onClick={load} sx={{ minWidth: 0, p: 0.5 }}>
            <IconRefresh size={15} />
          </Button>
        </Tooltip>
      </Stack>

      {jobCreatedMsg && (
        <Alert severity="success" sx={{ mb: 2, fontSize: '0.8rem' }}>
          Job criado com sucesso! Veja em Operações.
        </Alert>
      )}

      {/* KPI Strip */}
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
        <Chip
          icon={<IconMessageCircle size={13} />}
          label={`${stats.messages_7d} msgs (7d)`}
          size="small"
          sx={{ bgcolor: `${EDRO_GREEN}15`, color: EDRO_GREEN, fontWeight: 600 }}
        />
        <Chip
          label={`${stats.messages_30d} msgs (30d)`}
          size="small"
          variant="outlined"
        />
        {stats.unactioned > 0 && (
          <Chip
            icon={<IconBulb size={13} />}
            label={`${stats.unactioned} insights`}
            size="small"
            color={stats.urgent_unactioned > 0 ? 'warning' : 'default'}
            variant="outlined"
          />
        )}
        {stats.urgent_unactioned > 0 && (
          <Chip
            icon={<IconAlertTriangle size={13} />}
            label={`${stats.urgent_unactioned} urgentes`}
            size="small"
            color="error"
          />
        )}
        {sentimentLabel && (
          <Chip
            label={sentimentLabel}
            size="small"
            sx={{ bgcolor: `${sentimentColor}15`, color: sentimentColor, fontWeight: 600 }}
          />
        )}
      </Stack>

      {!hasData && (
        <Stack alignItems="center" sx={{ py: 6 }}>
          <IconMessageCircle size={32} style={{ color: '#ccc', marginBottom: 8 }} />
          <Typography variant="body2" color="text.secondary">
            Nenhuma atividade WhatsApp registrada ainda.
          </Typography>
        </Stack>
      )}

      {/* Urgent Insights */}
      {urgentInsights.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 1 }}>
            <IconAlertTriangle size={15} style={{ color: '#d32f2f' }} />
            <Typography variant="caption" fontWeight={700} color="error">
              URGENTES ({urgentInsights.length})
            </Typography>
          </Stack>
          <Stack spacing={1}>
            {urgentInsights.map(i => (
              <InsightRow key={i.id} insight={i} clientId={clientId}
                onActioned={handleActioned} onJobCreated={handleJobCreated} />
            ))}
          </Stack>
        </Box>
      )}

      {/* Latest Digest */}
      {digest && (
        <Box sx={{ mb: 2 }}>
          <DigestCard digest={digest} clientId={clientId} onJobCreated={handleJobCreated} />
        </Box>
      )}

      {/* Other Insights */}
      {otherInsights.length > 0 && (
        <Box>
          {(urgentInsights.length > 0 || digest) && (
            <Divider sx={{ mb: 1.5 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                OUTROS INSIGHTS ({otherInsights.length})
              </Typography>
            </Divider>
          )}
          <Stack spacing={1}>
            {otherInsights.map(i => (
              <InsightRow key={i.id} insight={i} clientId={clientId}
                onActioned={handleActioned} onJobCreated={handleJobCreated} />
            ))}
          </Stack>
        </Box>
      )}
    </Box>
  );
}
