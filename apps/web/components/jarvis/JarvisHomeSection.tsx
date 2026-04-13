'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Skeleton from '@mui/material/Skeleton';
import Divider from '@mui/material/Divider';
import Avatar from '@mui/material/Avatar';
import { alpha } from '@mui/material/styles';
import {
  IconBrain, IconSend, IconMessage,
  IconFileText, IconAlertTriangle, IconSparkles,
  IconMicrophone, IconChevronRight, IconInfoCircle,
  IconCheck, IconX,
} from '@tabler/icons-react';
import { apiPost } from '@/lib/api';
import { useJarvis } from '@/contexts/JarvisContext';
import { apiGet } from '@/lib/api';

const EDRO_ORANGE = '#E85219';

type RecentConversation = {
  id: string;
  title: string;
  updated_at: string;
  client_name?: string;
  client_text_id?: string;
  message_count: string;
};

type FeedItem = {
  id: string;
  kind: 'daily_brief' | 'system_health' | 'briefing' | 'alert' | 'auto_briefing' | 'proposal' | 'opportunity';
  title: string;
  subtitle?: string;
  reasoning?: string;   // fontes/raciocínio — transparência do Jarvis
  href?: string;
  color: string;
  icon: React.ReactNode;
  cta: string;
  proposalId?: string;  // para proposals com approve/discard inline
  systemAction?: 'auto_repair';
  repairActions?: Array<{ repair_type: string; label: string }>;
};

type JarvisFeed = {
  daily_brief?: {
    active_jobs_total: number;
    top_action: string | null;
    jobs_due_today: Array<any>;
    jobs_blocked: Array<any>;
    signals_critical: Array<any>;
  } | null;
  system_health?: {
    summary?: { status: string; open_issues: number; critical_issues: number };
    issues?: Array<{ key: string; title: string; message: string; severity: 'warning' | 'critical'; repair_type: string }>;
    repair_actions?: Array<{ repair_type: string; label: string }>;
  } | null;
  briefing_pending: any[];
  alerts: any[];
  auto_briefings: any[];
  proposals: any[];
  opportunities: any[];
  recent_workflows: Array<{
    id: string;
    fired_at: string;
    workflow_id?: string | null;
    workflow_json?: string | null;
    status: string;
    completed_steps: number;
    steps_total: number;
    attempt_count?: number;
    resume_from_step?: number;
    last_step?: string | null;
    failed_step?: string | null;
    last_error?: string | null;
    rollback_status?: string | null;
    rollback_total?: number;
    rollback_completed?: number;
    rollback_failures?: number;
    requires_manual_followup?: boolean;
    manual_followup?: string[];
    steps_preview?: Array<{ tool: string; success: boolean; error?: string | null; summary?: string | null }>;
    finished_at?: string | null;
  }>;
  recent_repairs: Array<{
    id: string;
    fired_at: string;
    repair_type?: string | null;
    before_summary?: { status?: string | null } | null;
    after_summary?: { status?: string | null } | null;
    executed_repairs?: Array<{ repair_type?: string | null }>;
    remaining_issues?: Array<{ key: string }>;
  }>;
  total_actions: number;
};

function buildFeedItems(feed: JarvisFeed): FeedItem[] {
  const items: FeedItem[] = [];

  if (feed.daily_brief) {
    items.push({
      id: 'daily-brief',
      kind: 'daily_brief',
      title: feed.daily_brief.top_action || 'Daily brief da operação pronto',
      subtitle: `${feed.daily_brief.active_jobs_total || 0} jobs ativos · ${feed.daily_brief.jobs_blocked?.length || 0} bloqueados · ${feed.daily_brief.jobs_due_today?.length || 0} vencem hoje`,
      reasoning: feed.daily_brief.signals_critical?.[0]?.title || 'Resumo automático do que está pegando hoje na agência.',
      href: '/admin/operacoes',
      color: '#8B5CF6',
      icon: <IconBrain size={14} />,
      cta: 'Abrir operação',
    });
  }

  if (feed.system_health?.summary && Number(feed.system_health.summary.open_issues || 0) > 0) {
    items.push({
      id: 'system-health',
      kind: 'system_health',
      title: feed.system_health.summary.status === 'critical'
        ? 'Jarvis detectou issues críticas no sistema'
        : 'Jarvis detectou gargalos operacionais no sistema',
      subtitle: `${feed.system_health.summary.open_issues || 0} issue(s) · ${feed.system_health.summary.critical_issues || 0} crítica(s)`,
      reasoning: feed.system_health.issues?.[0]?.message || 'Há filas, watches ou syncs que podem ser auto-reparados.',
      color: '#D97706',
      icon: <IconAlertTriangle size={14} />,
      cta: 'Auto-reparar',
      systemAction: 'auto_repair',
      repairActions: Array.isArray(feed.system_health.repair_actions)
        ? feed.system_health.repair_actions.slice(0, 2)
        : [],
    });
  }

  for (const j of feed.briefing_pending.slice(0, 3)) {
    items.push({
      id: `bp-${j.id}`,
      kind: 'briefing',
      title: j.title || 'Job sem título',
      subtitle: j.client_name,
      reasoning: 'Job em intake sem briefing preenchido',
      href: `/admin/operacoes/jobs/${j.id}/briefing`,
      color: '#FFAE1F',
      icon: <IconFileText size={14} />,
      cta: 'Preencher briefing',
    });
  }

  for (const a of feed.alerts.slice(0, 2)) {
    items.push({
      id: `al-${a.id}`,
      kind: 'alert',
      title: a.title,
      subtitle: a.client_name,
      reasoning: a.body || undefined,
      href: `/clients/${a.client_id}`,
      color: '#ef4444',
      icon: <IconAlertTriangle size={14} />,
      cta: 'Ver cliente',
    });
  }

  for (const b of feed.auto_briefings.slice(0, 2)) {
    items.push({
      id: `ab-${b.id}`,
      kind: 'auto_briefing',
      title: b.title,
      subtitle: b.client_name,
      reasoning: b.drop_pct ? `Queda de ${b.drop_pct}% de engajamento detectada` : 'Briefing gerado automaticamente pelo Jarvis',
      href: `/edro/${b.id}`,
      color: '#a855f7',
      icon: <IconSparkles size={14} />,
      cta: 'Aprovar briefing',
    });
  }

  for (const p of feed.proposals.slice(0, 3)) {
    items.push({
      id: `pr-${p.id}`,
      kind: 'proposal',
      title: p.title || p.meeting_title,
      subtitle: p.client_name,
      reasoning: p.reasoning ?? (p.meeting_title ? `Da reunião: "${p.meeting_title}"` : undefined),
      href: '/edro/jarvis',
      color: '#5D87FF',
      icon: <IconMicrophone size={14} />,
      cta: 'Aprovar',
      proposalId: p.id,
    });
  }

  for (const o of feed.opportunities.slice(0, 2)) {
    items.push({
      id: `op-${o.id}`,
      kind: 'opportunity',
      title: o.title,
      subtitle: o.client_name,
      reasoning: `${o.confidence}% de confiança · detectado via clipping/social`,
      href: `/clients/${o.client_id}`,
      color: '#13DEB9',
      icon: <IconSparkles size={14} />,
      cta: 'Ver oportunidade',
    });
  }

  return items.slice(0, 6);
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `${min}min atrás`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h atrás`;
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function initials(name?: string) {
  return String(name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || '?';
}

const QUICK_ACTIONS = [
  'O que está pegando hoje na agência?',
  'Me dá o daily brief da operação',
  'Me mostra a saúde do sistema',
  'O que o Jarvis pode corrigir sozinho agora?',
  'Quais são os alertas críticos do Jarvis agora?',
  'Quais briefings estão em aberto?',
];

export default function JarvisHomeSection() {
  const { open, setConversationId, clientId } = useJarvis();
  const [input, setInput] = useState('');
  const [conversations, setConversations] = useState<RecentConversation[]>([]);
  const [feed, setFeed] = useState<JarvisFeed | null>(null);
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState<string | null>(null);
  const [proposalAction, setProposalAction] = useState<Record<string, 'approving' | 'discarding' | 'done'>>({});
  const hasActiveWorkflow = Array.isArray(feed?.recent_workflows)
    && feed.recent_workflows.some((workflow) => workflow.status === 'running' || workflow.status === 'pending_confirmation');

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem('edro_user') || '{}');
      setUserName(u?.name?.split(' ')[0] ?? u?.email?.split('@')[0] ?? null);
    } catch {}
  }, []);

  const loadFeed = useCallback(async (keepLoading = false) => {
    if (!keepLoading) setLoading(true);
    await Promise.all([
      apiGet<{ data?: { conversations?: RecentConversation[] } }>('/planning/conversations?limit=5')
        .then(res => setConversations(res?.data?.conversations ?? []))
        .catch(() => setConversations([])),
      apiGet<JarvisFeed>('/jarvis/feed')
        .then(res => {
          setFeed(res);
          setFeedItems(buildFeedItems(res));
        })
        .catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    void loadFeed();

    const interval = window.setInterval(() => {
      void loadFeed(true);
    }, hasActiveWorkflow ? 10_000 : 60_000);

    const handleFocus = () => { void loadFeed(true); };
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        void loadFeed(true);
      }
    };
    const handleJarvisRefresh = () => { void loadFeed(true); };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('jarvis-feed-refresh', handleJarvisRefresh);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('jarvis-feed-refresh', handleJarvisRefresh);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [loadFeed, hasActiveWorkflow]);

  const handleSend = (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg) return;
    setInput('');
    setConversationId(null);
    open(clientId ?? undefined);
    // Small delay to let drawer open, then trigger message via custom event
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('jarvis-home-send', { detail: { message: msg } }));
    }, 100);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleProposalAction = async (proposalId: string, action: 'approve' | 'discard') => {
    setProposalAction((prev) => ({ ...prev, [proposalId]: action === 'approve' ? 'approving' : 'discarding' }));
    try {
      await apiPost(`/jarvis/proposals/${proposalId}/${action}`, {});
      setProposalAction((prev) => ({ ...prev, [proposalId]: 'done' }));
      await loadFeed(true);
    } catch {
      setProposalAction((prev) => { const next = { ...prev }; delete next[proposalId]; return next; });
    }
  };

  const handleSystemRepair = () => {
    setConversationId(null);
    open(clientId ?? undefined);
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('jarvis-home-send', {
        detail: {
          message: 'Confirma o auto-reparo seguro do sistema.',
          clientAction: {
            type: 'confirm_tool_call',
            tool_name: 'run_system_repair',
            tool_args: { repair_type: 'auto_repair' },
          },
        },
      }));
    }, 100);
  };

  const handleSpecificSystemRepair = (repairType: string, label?: string) => {
    setConversationId(null);
    open(clientId ?? undefined);
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('jarvis-home-send', {
        detail: {
          message: `Confirma o reparo ${label || repairType} no sistema.`,
          clientAction: {
            type: 'confirm_tool_call',
            tool_name: 'run_system_repair',
            tool_args: { repair_type: repairType },
          },
        },
      }));
    }, 100);
  };

  const triggerWorkflowAction = (workflow: JarvisFeed['recent_workflows'][number], mode: 'retry' | 'confirm') => {
    const workflowJson = String(workflow.workflow_json || '').trim();
    if (!workflowJson) return;
    setConversationId(null);
    open(clientId ?? undefined);
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('jarvis-home-send', {
        detail: {
          message: mode === 'confirm'
            ? 'Confirmo a execução deste workflow em lote.'
            : 'Tente novamente executar este workflow em lote.',
          clientAction: {
            type: 'confirm_tool_call',
            tool_name: 'execute_multi_step_workflow',
            tool_args: {
              workflow_json: workflowJson,
              workflow_id: workflow.workflow_id || undefined,
              resume_from_step: mode === 'retry'
                ? Number(workflow.resume_from_step || (workflow.completed_steps || 0) + 1)
                : 1,
            },
          },
        },
      }));
    }, 100);
  };

  return (
    <Box
      sx={{
        py: 0.5,
      }}
    >
      <Box sx={{ px: 0.25 }}>
        {/* Greeting */}
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2.5 }}>
          <Box
            sx={(theme) => ({
              p: 1,
              borderRadius: 1.5,
              bgcolor: alpha(EDRO_ORANGE, theme.palette.mode === 'dark' ? 0.12 : 0.08),
              border: `1px solid ${alpha(EDRO_ORANGE, theme.palette.mode === 'dark' ? 0.22 : 0.16)}`,
            })}
          >
            <IconBrain size={22} style={{ color: EDRO_ORANGE }} />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
              {getGreeting()}{userName ? `, ${userName}` : ''}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              O que fazemos hoje?
            </Typography>
          </Box>
        </Stack>

        {/* Fila de Decisões */}
        {(loading || feedItems.length > 0) && (
          <Box sx={{ mb: 2 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
              <Typography variant="overline" color="text.disabled" sx={{ fontSize: '0.6rem', letterSpacing: '0.1em' }}>
                Fila de decisões
              </Typography>
              {feed && feed.total_actions > 6 && (
                <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem' }}>
                  +{feed.total_actions - 6} mais
                </Typography>
              )}
            </Stack>
            <Stack spacing={0.5}>
              {loading
                ? [1, 2, 3].map((i) => <Skeleton key={i} height={44} sx={{ borderRadius: 1.5 }} />)
                : feedItems.map((item) => {
                    const isProposal = item.kind === 'proposal' && !!item.proposalId;
                    const isSystemHealth = item.kind === 'system_health' && item.systemAction === 'auto_repair';
                    const pAction = item.proposalId ? proposalAction[item.proposalId] : undefined;

                    return (
                    <Box
                      key={item.id}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        px: 1.25,
                        py: 0.75,
                        borderRadius: 1.5,
                        border: `1px solid ${alpha(item.color, 0.18)}`,
                        bgcolor: alpha(item.color, 0.05),
                        transition: 'all 120ms ease',
                        '&:hover': { bgcolor: alpha(item.color, 0.1), borderColor: alpha(item.color, 0.35) },
                      }}
                    >
                      <Box sx={{ color: item.color, display: 'flex', flexShrink: 0 }}>{item.icon}</Box>
                      <Box
                        component={isProposal ? 'div' : Link}
                        href={!isProposal ? (item.href ?? '#') : undefined}
                        sx={{ flex: 1, minWidth: 0, textDecoration: 'none' }}
                      >
                        <Typography variant="body2" sx={{ fontSize: '0.78rem', fontWeight: 600, color: 'text.primary', lineHeight: 1.2 }} noWrap>
                          {item.title}
                        </Typography>
                        {item.subtitle && (
                          <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem' }} noWrap>
                            {item.subtitle}
                          </Typography>
                        )}
                        {item.reasoning && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3, mt: 0.15 }}>
                            <IconInfoCircle size={10} style={{ color: 'var(--mui-palette-text-disabled)', flexShrink: 0 }} />
                            <Typography
                              variant="caption"
                              sx={{ fontSize: '0.6rem', color: 'text.disabled', lineHeight: 1.2, fontStyle: 'italic' }}
                              noWrap
                            >
                              {item.reasoning}
                            </Typography>
                          </Box>
                        )}
                      </Box>

                      {/* Proposal: inline approve/discard */}
                      {isProposal ? (
                        <Stack direction="row" spacing={0.4} flexShrink={0}>
                          <Chip
                            label={pAction === 'approving' ? '…' : <IconCheck size={11} />}
                            size="small"
                            onClick={() => !pAction && handleProposalAction(item.proposalId!, 'approve')}
                            sx={{
                              height: 22, width: 28, cursor: 'pointer',
                              bgcolor: alpha('#13DEB9', 0.12), color: '#13DEB9',
                              '& .MuiChip-label': { px: 0.5 },
                              '&:hover': { bgcolor: alpha('#13DEB9', 0.25) },
                            }}
                          />
                          <Chip
                            label={pAction === 'discarding' ? '…' : <IconX size={11} />}
                            size="small"
                            onClick={() => !pAction && handleProposalAction(item.proposalId!, 'discard')}
                            sx={{
                              height: 22, width: 28, cursor: 'pointer',
                              bgcolor: alpha('#EF4444', 0.12), color: '#EF4444',
                              '& .MuiChip-label': { px: 0.5 },
                              '&:hover': { bgcolor: alpha('#EF4444', 0.25) },
                            }}
                          />
                        </Stack>
                      ) : isSystemHealth ? (
                        <Stack direction="row" spacing={0.5} flexShrink={0} alignItems="center">
                          {Array.isArray(item.repairActions) && item.repairActions.map((repair) => (
                            <Button
                              key={repair.repair_type}
                              size="small"
                              variant="text"
                              onClick={() => handleSpecificSystemRepair(repair.repair_type, repair.label)}
                              sx={{ minHeight: 26, fontSize: '0.62rem', px: 0.75, whiteSpace: 'nowrap' }}
                            >
                              {repair.label}
                            </Button>
                          ))}
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={handleSystemRepair}
                            sx={{ minHeight: 26, fontSize: '0.62rem', flexShrink: 0, whiteSpace: 'nowrap' }}
                          >
                            {item.cta}
                          </Button>
                        </Stack>
                      ) : (
                        <Chip
                          label={item.cta}
                          size="small"
                          sx={{
                            height: 20,
                            fontSize: '0.62rem',
                            fontWeight: 600,
                            bgcolor: alpha(item.color, 0.12),
                            color: item.color,
                            flexShrink: 0,
                            '& .MuiChip-label': { px: 0.75 },
                          }}
                        />
                      )}
                    </Box>
                    );
                  })}
            </Stack>
          </Box>
        )}

        {feedItems.length === 0 && !loading && (
          <Box
            sx={{
              mb: 2, px: 1.5, py: 1.25, borderRadius: 1.5,
              bgcolor: (theme) => alpha(theme.palette.success.main, 0.06),
              border: (theme) => `1px solid ${alpha(theme.palette.success.main, 0.18)}`,
            }}
          >
            <Typography variant="body2" sx={{ fontSize: '0.78rem', color: 'success.main', fontWeight: 600 }}>
              Tudo em dia — nenhuma decisão pendente.
            </Typography>
          </Box>
        )}

        {(loading || (Array.isArray(feed?.recent_workflows) && feed!.recent_workflows.length > 0)) && (
          <Box sx={{ mb: 2 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
              <Typography variant="overline" color="text.disabled" sx={{ fontSize: '0.6rem', letterSpacing: '0.1em' }}>
                Execuções recentes
              </Typography>
            </Stack>
            <Stack spacing={0.5}>
              {loading
                ? [1, 2].map((i) => <Skeleton key={`wf-${i}`} height={40} sx={{ borderRadius: 1.5 }} />)
                : (feed?.recent_workflows || []).slice(0, 3).map((workflow) => {
                    const statusColor = workflow.status === 'completed'
                      ? '#13DEB9'
                      : workflow.status === 'rolling_back'
                      ? '#F59E0B'
                      : workflow.status === 'failed'
                      ? '#EF4444'
                      : workflow.status === 'pending_confirmation'
                      ? EDRO_ORANGE
                      : '#5D87FF';
                    const title = workflow.status === 'rolling_back'
                      ? 'Workflow compensando falha'
                      : workflow.status === 'failed' && workflow.rollback_status === 'partial_failure'
                      ? 'Workflow falhou com compensação parcial'
                      : workflow.status === 'failed'
                      ? `Workflow falhou em ${workflow.failed_step || 'uma etapa'}`
                      : workflow.status === 'completed'
                      ? 'Workflow concluído'
                      : workflow.status === 'pending_confirmation'
                      ? 'Workflow aguardando confirmação'
                      : 'Workflow em execução';

                    return (
                      <Box
                        key={workflow.id}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                          px: 1.25,
                          py: 0.75,
                          borderRadius: 1.5,
                          border: `1px solid ${alpha(statusColor, 0.18)}`,
                          bgcolor: alpha(statusColor, 0.05),
                        }}
                      >
                        <Box sx={{ color: statusColor, display: 'flex', flexShrink: 0 }}>
                          <IconBrain size={14} />
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body2" sx={{ fontSize: '0.78rem', fontWeight: 600, color: 'text.primary', lineHeight: 1.2 }} noWrap>
                            {title}
                          </Typography>
                          <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem' }} noWrap>
                            {workflow.workflow_id ? `Workflow ${String(workflow.workflow_id).slice(0, 8)} · ` : ''}
                            {workflow.completed_steps || 0}/{workflow.steps_total || 0} etapas
                            {workflow.attempt_count ? ` · tentativa ${workflow.attempt_count}` : ''}
                            {' · '}
                            {relativeTime(workflow.finished_at || workflow.fired_at)}
                          </Typography>
                          {workflow.last_step ? (
                            <Typography variant="caption" color="text.disabled" sx={{ display: 'block', fontSize: '0.6rem', lineHeight: 1.2 }} noWrap>
                              Última etapa: {workflow.last_step}
                              {workflow.status === 'running' && workflow.resume_from_step
                                ? ` · próxima ${workflow.resume_from_step}/${workflow.steps_total || 0}`
                                : ''}
                            </Typography>
                          ) : null}
                          {workflow.status === 'failed' && workflow.last_error ? (
                            <Typography variant="caption" color="error.main" sx={{ display: 'block', fontSize: '0.6rem', lineHeight: 1.2 }} noWrap>
                              {workflow.last_error}
                            </Typography>
                          ) : null}
                          {workflow.rollback_status && workflow.rollback_status !== 'not_needed' ? (
                            <Typography
                              variant="caption"
                              color={workflow.rollback_status === 'partial_failure' ? 'error.main' : 'text.disabled'}
                              sx={{ display: 'block', fontSize: '0.6rem', lineHeight: 1.2 }}
                              noWrap
                            >
                              Compensação: {workflow.rollback_completed || 0}/{workflow.rollback_total || 0}
                              {workflow.rollback_failures ? ` · ${workflow.rollback_failures} falha(s)` : ''}
                            </Typography>
                          ) : null}
                          {workflow.requires_manual_followup && Array.isArray(workflow.manual_followup) && workflow.manual_followup.length > 0 ? (
                            <Typography variant="caption" color="error.main" sx={{ display: 'block', fontSize: '0.6rem', lineHeight: 1.2 }} noWrap>
                              Manual: {workflow.manual_followup.join(' · ')}
                            </Typography>
                          ) : null}
                          {Array.isArray(workflow.steps_preview) && workflow.steps_preview.length > 0 ? (
                            <Typography variant="caption" color="text.disabled" sx={{ display: 'block', fontSize: '0.6rem', lineHeight: 1.2 }} noWrap>
                              {workflow.steps_preview.map((step) => `${step.success ? 'OK' : 'Falhou'} ${step.tool}${step.summary ? ` (${step.summary})` : ''}`).join(' · ')}
                            </Typography>
                          ) : null}
                        </Box>
                        {workflow.status === 'failed' && workflow.workflow_json && workflow.requires_manual_followup !== true ? (
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => triggerWorkflowAction(workflow, 'retry')}
                            sx={{ minHeight: 26, fontSize: '0.62rem', flexShrink: 0 }}
                          >
                            Retomar
                          </Button>
                        ) : workflow.status === 'pending_confirmation' && workflow.workflow_json ? (
                          <Button
                            size="small"
                            variant="contained"
                            onClick={() => triggerWorkflowAction(workflow, 'confirm')}
                            sx={{ minHeight: 26, fontSize: '0.62rem', flexShrink: 0 }}
                          >
                            Confirmar
                          </Button>
                        ) : (
                          <Chip
                            label={workflow.status}
                            size="small"
                            sx={{
                              height: 20,
                              fontSize: '0.62rem',
                              fontWeight: 600,
                              bgcolor: alpha(statusColor, 0.12),
                              color: statusColor,
                              flexShrink: 0,
                              '& .MuiChip-label': { px: 0.75 },
                            }}
                          />
                        )}
                      </Box>
                    );
                  })}
            </Stack>
          </Box>
        )}

        {(loading || (Array.isArray(feed?.recent_repairs) && feed!.recent_repairs.length > 0)) && (
          <Box sx={{ mb: 2 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
              <Typography variant="overline" color="text.disabled" sx={{ fontSize: '0.6rem', letterSpacing: '0.1em' }}>
                Auto-reparos recentes
              </Typography>
            </Stack>
            <Stack spacing={0.5}>
              {loading
                ? [1, 2].map((i) => <Skeleton key={`repair-${i}`} height={36} sx={{ borderRadius: 1.5 }} />)
                : (feed?.recent_repairs || []).slice(0, 3).map((repair) => (
                    <Box
                      key={repair.id}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        px: 1.25,
                        py: 0.75,
                        borderRadius: 1.5,
                        border: `1px solid ${alpha('#10B981', 0.18)}`,
                        bgcolor: alpha('#10B981', 0.05),
                      }}
                    >
                      <Box sx={{ color: '#10B981', display: 'flex', flexShrink: 0 }}>
                        <IconCheck size={14} />
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontSize: '0.78rem', fontWeight: 600, color: 'text.primary', lineHeight: 1.2 }} noWrap>
                          {String(repair.repair_type || 'auto_repair')}
                        </Typography>
                        <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem' }} noWrap>
                          {String(repair.before_summary?.status || 'unknown')} → {String(repair.after_summary?.status || 'ok')} · {relativeTime(repair.fired_at)}
                        </Typography>
                        <Typography variant="caption" color="text.disabled" sx={{ display: 'block', fontSize: '0.6rem', lineHeight: 1.2 }} noWrap>
                          {Array.isArray(repair.executed_repairs) && repair.executed_repairs.length
                            ? repair.executed_repairs.map((item) => String(item.repair_type || 'repair')).join(' · ')
                            : `${repair.remaining_issues?.length || 0} issue(s) remanescente(s)`}
                        </Typography>
                      </Box>
                      <Chip
                        label={`${repair.remaining_issues?.length || 0} pendente(s)`}
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: '0.62rem',
                          fontWeight: 600,
                          bgcolor: alpha('#10B981', 0.12),
                          color: '#10B981',
                          flexShrink: 0,
                          '& .MuiChip-label': { px: 0.75 },
                        }}
                      />
                    </Box>
                  ))}
            </Stack>
          </Box>
        )}

        {/* Input */}
        <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Fale com o Jarvis…"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 1.5,
                bgcolor: (theme) =>
                  theme.palette.mode === 'dark'
                    ? alpha(theme.palette.common.white, 0.02)
                    : alpha(theme.palette.common.black, 0.018),
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: EDRO_ORANGE },
              },
            }}
          />
          <IconButton
            onClick={() => handleSend()}
            disabled={!input.trim()}
            sx={(theme) => ({
              bgcolor: EDRO_ORANGE,
              color: theme.palette.getContrastText(EDRO_ORANGE),
              '&:hover': { bgcolor: '#c94215' },
              '&.Mui-disabled': {
                bgcolor: theme.palette.action.disabledBackground,
                color: theme.palette.action.disabled,
              },
              flexShrink: 0,
              width: 40,
              height: 40,
              borderRadius: 1.5,
            })}
          >
            <IconSend size={16} />
          </IconButton>
        </Box>

        {/* Quick actions */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 2.5 }}>
          {QUICK_ACTIONS.map(qa => (
            <Chip
              key={qa}
              label={qa}
              size="small"
              variant="outlined"
              clickable
              onClick={() => handleSend(qa)}
              sx={(theme) => ({
                fontSize: '0.68rem',
                borderRadius: 1,
                borderColor: alpha(EDRO_ORANGE, theme.palette.mode === 'dark' ? 0.28 : 0.22),
                color: theme.palette.text.secondary,
                '&:hover': {
                  borderColor: EDRO_ORANGE,
                  color: EDRO_ORANGE,
                  bgcolor: alpha(EDRO_ORANGE, theme.palette.mode === 'dark' ? 0.08 : 0.05),
                },
              })}
            />
          ))}
        </Box>

        {/* Recent conversations */}
        {(loading || conversations.length > 0) && (
          <>
            <Divider sx={{ mb: 1.5 }} />
            <Typography variant="overline" color="text.disabled" sx={{ fontSize: '0.65rem', display: 'block', mb: 1 }}>
              Conversas recentes
            </Typography>
            <Stack spacing={0.5}>
              {loading
                ? [1, 2, 3].map(i => <Skeleton key={i} height={32} sx={{ borderRadius: 2 }} />)
                : conversations.map(conv => (
                    <Box
                      key={conv.id}
                      onClick={() => {
                        setConversationId(conv.id);
                        open(conv.client_text_id ?? undefined);
                      }}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        px: 0.5,
                        py: 0.75,
                        cursor: 'pointer',
                        '&:hover': {
                          bgcolor: (theme) =>
                            theme.palette.mode === 'dark'
                              ? alpha(theme.palette.common.white, 0.03)
                              : alpha(theme.palette.common.black, 0.03),
                        },
                      }}
                    >
                      <Avatar
                        sx={(theme) => ({
                          width: 22,
                          height: 22,
                          fontSize: '0.62rem',
                          bgcolor: alpha(EDRO_ORANGE, theme.palette.mode === 'dark' ? 0.14 : 0.09),
                          color: EDRO_ORANGE,
                          border: `1px solid ${alpha(EDRO_ORANGE, theme.palette.mode === 'dark' ? 0.24 : 0.18)}`,
                          flexShrink: 0,
                        })}
                      >
                        {conv.client_name ? initials(conv.client_name) : <IconMessage size={11} />}
                      </Avatar>
                      <Typography variant="body2" sx={{ flex: 1, fontSize: '0.78rem' }} noWrap>
                        {conv.title || 'Conversa'}
                      </Typography>
                      {conv.client_name && (
                        <Chip label={conv.client_name} size="small" sx={{ fontSize: '0.6rem', height: 18, maxWidth: 100 }} />
                      )}
                      <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem', flexShrink: 0 }}>
                        {relativeTime(conv.updated_at)}
                      </Typography>
                    </Box>
                  ))
              }
            </Stack>
          </>
        )}
      </Box>
    </Box>
  );
}
