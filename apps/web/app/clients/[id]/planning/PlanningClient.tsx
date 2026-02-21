'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet, apiPost, apiDelete, apiPatch, buildApiUrl } from '@/lib/api';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import LinearProgress from '@mui/material/LinearProgress';
import Link from 'next/link';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import {
  IconAlertTriangle,
  IconBrain,
  IconCalendar,
  IconClipboard,
  IconDatabase,
  IconRefresh,
  IconTrendingUp,
} from '@tabler/icons-react';

import AIAssistant, { ChatMessage, ProviderOption } from './components/AIAssistant';
import type { IntelligenceStats } from './components/ContextPanel';
import type { HealthData, SourceHealth } from './components/HealthMonitor';
import OutputsList, { Briefing, Copy } from './components/OutputsList';

type PlanningClientProps = {
  clientId: string;
};

export default function PlanningClient({ clientId }: PlanningClientProps) {
  const router = useRouter();

  // Intelligence Context
  const [intelligenceStats, setIntelligenceStats] = useState<IntelligenceStats | null>(null);
  const [contextLoading, setContextLoading] = useState(false);
  const [contextError, setContextError] = useState('');

  // Health Monitor
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);

  // Outputs (briefings & copies)
  const [briefings, setBriefings] = useState<Briefing[]>([]);
  const [copies, setCopies] = useState<Copy[]>([]);
  const [outputsLoading, setOutputsLoading] = useState(false);

  // Intelligence Score
  const [intelligenceScore, setIntelligenceScore] = useState<number | null>(null);

  // AI Chat
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [providers, setProviders] = useState<ProviderOption[]>([]);
  const [provider, setProvider] = useState('openai');

  // Load Intelligence Context (30s timeout)
  const loadContext = useCallback(async () => {
    setContextLoading(true);
    setContextError('');
    try {
      const res = await Promise.race([
        apiPost<{ data?: { stats?: IntelligenceStats; partial?: boolean; warning?: string } }>(
          `/clients/${clientId}/planning/context`,
          {}
        ),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 30000)),
      ]);
      if (res?.data?.stats) setIntelligenceStats(res.data.stats);
      if (res?.data?.partial) setContextError(res.data.warning || 'Contexto carregado parcialmente.');
    } catch (err: any) {
      setContextError(
        err?.message === 'timeout'
          ? 'Contexto demorou demais. Clique Refresh para tentar novamente.'
          : err?.message || 'Falha ao carregar contexto.'
      );
    } finally {
      setContextLoading(false);
    }
  }, [clientId]);

  // Load Health (15s timeout)
  const loadHealth = useCallback(async () => {
    setHealthLoading(true);
    try {
      const res = await Promise.race([
        apiPost<{ data?: HealthData }>(`/clients/${clientId}/planning/health`, {}),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 15000)),
      ]);
      if (res?.data) setHealthData(res.data);
    } catch {
      // silent
    } finally {
      setHealthLoading(false);
    }
  }, [clientId]);

  // Load Outputs (briefings + copies)
  const loadOutputs = useCallback(async () => {
    setOutputsLoading(true);
    try {
      const [briefingsRes, copiesRes] = await Promise.allSettled([
        apiGet<{ briefings?: Briefing[] }>(`/clients/${clientId}/briefings`),
        apiGet<{ copies?: Copy[] }>(`/clients/${clientId}/copies`),
      ]);
      if (briefingsRes.status === 'fulfilled')
        setBriefings(Array.isArray(briefingsRes.value?.briefings) ? briefingsRes.value.briefings : []);
      if (copiesRes.status === 'fulfilled')
        setCopies(Array.isArray(copiesRes.value?.copies) ? copiesRes.value.copies : []);
    } finally {
      setOutputsLoading(false);
    }
  }, [clientId]);

  // Load AI Providers
  const loadProviders = useCallback(async () => {
    try {
      const res = await apiGet<{ data?: { providers?: ProviderOption[] } }>(`/planning/providers`);
      const list = res?.data?.providers || [];
      if (list.length) {
        setProviders(list);
        if (!list.find((p) => p.id === provider)) setProvider(list[0].id);
      }
    } catch {
      // silent
    }
  }, [provider]);

  // Bootstrap + initial load
  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        await apiPost(`/clients/${clientId}/planning/bootstrap`, {});
      } catch {
        // bootstrap is best-effort
      }
      if (cancelled) return;
      loadContext();
      loadHealth();
      loadOutputs();
      loadProviders();
      apiGet<{ intelligence_score?: number }>(`/clients/${clientId}/suggestions`)
        .then((res) => { if (!cancelled) setIntelligenceScore(Number(res?.intelligence_score || 0)); })
        .catch(() => {});
    }
    init();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  // Upload file to library and return ID for chat attachment
  const uploadFileForChat = async (file: File): Promise<string | null> => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('edro_token') : null;
    if (!token) return null;
    const form = new FormData();
    form.append('file', file);
    try {
      const res = await fetch(buildApiUrl(`/clients/${clientId}/library/upload`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data?.data?.id || data?.id || null;
    } catch {
      return null;
    }
  };

  // Send Chat Message (55s timeout, always agent mode)
  const sendChatMessage = async (message: string, files?: File[]) => {
    setChatLoading(true);

    const fileNames = files?.map((f) => f.name) || [];
    const userContent =
      fileNames.length > 0 ? `${message}${message ? '\n' : ''}📎 ${fileNames.join(', ')}` : message;

    setChatMessages((prev) => [
      ...prev,
      { role: 'user', content: userContent, timestamp: new Date().toISOString() },
    ]);

    // Upload files first, get attachment IDs
    let attachmentIds: string[] = [];
    if (files?.length) {
      const results = await Promise.all(files.map(uploadFileForChat));
      attachmentIds = results.filter((id): id is string => id !== null);
    }

    try {
      const res = await Promise.race([
        apiPost<{
          data?: {
            response?: string;
            conversationId?: string;
            provider?: string;
            action?: any;
          };
        }>(`/clients/${clientId}/planning/chat`, {
          message,
          provider,
          mode: 'agent',
          conversationId,
          ...(attachmentIds.length > 0 && { attachmentIds }),
        }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 55000)),
      ]);

      if (res?.data?.conversationId) setConversationId(res.data.conversationId);
      if (res?.data?.response) {
        setChatMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: res.data!.response!,
            timestamp: new Date().toISOString(),
            provider: res.data!.provider,
            action: res.data!.action,
          } as ChatMessage,
        ]);
      }

      // Refresh outputs whenever the agent took an action
      if (res?.data?.action) void loadOutputs();
    } catch (err: any) {
      const errorMsg =
        err?.message === 'timeout'
          ? 'A IA demorou demais. Tente novamente.'
          : err?.message || 'Erro ao conversar com a IA.';
      setChatMessages((prev) => [
        ...prev,
        { role: 'assistant', content: errorMsg, timestamp: new Date().toISOString() },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const sources = healthData?.sources as Record<string, SourceHealth> | undefined;

  const contextItems = intelligenceStats
    ? [
        { key: 'library', label: 'Library', value: intelligenceStats.library?.totalItems ?? 0, icon: <IconDatabase size={13} /> },
        { key: 'clipping', label: 'Clipping', value: intelligenceStats.clipping?.totalMatches ?? 0, icon: <IconClipboard size={13} /> },
        { key: 'social', label: 'Social', value: intelligenceStats.social?.totalMentions ?? 0, icon: <IconTrendingUp size={13} /> },
        { key: 'calendar', label: 'Calendário', value: intelligenceStats.calendar?.next14Days ?? 0, icon: <IconCalendar size={13} /> },
        { key: 'opportunities', label: 'Oportunidades', value: intelligenceStats.opportunities?.active ?? 0, icon: <IconBrain size={13} /> },
      ]
    : [];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, height: '100%' }}>

      {/* Context strip */}
      <Card sx={{ borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: 'none' }}>
        <CardContent sx={{ py: 1, px: 2, '&:last-child': { pb: 1 } }}>
          {/* Intelligence score bar */}
          {intelligenceScore !== null && (
            <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: intelligenceStats ? 1 : 0 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, whiteSpace: 'nowrap', minWidth: 110 }}>
                IA Readiness
              </Typography>
              <Box sx={{ flex: 1 }}>
                <LinearProgress
                  variant="determinate"
                  value={intelligenceScore}
                  sx={{
                    height: 7,
                    borderRadius: 4,
                    bgcolor: 'grey.100',
                    '& .MuiLinearProgress-bar': {
                      borderRadius: 4,
                      bgcolor:
                        intelligenceScore >= 85
                          ? '#16a34a'
                          : intelligenceScore >= 60
                            ? '#2563eb'
                            : intelligenceScore >= 30
                              ? '#d97706'
                              : '#dc2626',
                    },
                  }}
                />
              </Box>
              <Typography variant="caption" sx={{ fontWeight: 700, minWidth: 32, textAlign: 'right' }}>
                {intelligenceScore}%
              </Typography>
              {intelligenceScore < 60 && (
                <Tooltip title="Preencha o perfil do cliente para melhorar a qualidade da IA" arrow>
                  <Typography
                    variant="caption"
                    component={Link}
                    href={`/clients/${clientId}/perfil`}
                    sx={{ color: '#d97706', fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap', '&:hover': { textDecoration: 'underline' } }}
                  >
                    Melhorar perfil →
                  </Typography>
                </Tooltip>
              )}
            </Stack>
          )}

          <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" useFlexGap rowGap={0.75}>
            {contextItems.length > 0 ? (
              <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                {contextItems.map((item) => {
                  const health = sources?.[item.key];
                  const hasIssue = health && health.status !== 'healthy';
                  return (
                    <Tooltip key={item.key} title={hasIssue ? health.message : `${item.label}: ${item.value}`} arrow>
                      <Chip
                        size="small"
                        icon={hasIssue ? <IconAlertTriangle size={13} /> : item.icon}
                        label={`${item.label}: ${item.value}`}
                        color={hasIssue ? (health.status === 'error' ? 'error' : 'warning') : 'default'}
                        variant={hasIssue ? 'filled' : 'outlined'}
                        sx={{ fontWeight: 600, fontSize: '0.68rem' }}
                      />
                    </Tooltip>
                  );
                })}
                {(intelligenceStats?.opportunities?.urgent ?? 0) > 0 && (
                  <Chip
                    size="small"
                    color="error"
                    label={`${intelligenceStats!.opportunities!.urgent} urgente`}
                    sx={{ fontWeight: 700, cursor: 'default' }}
                  />
                )}
              </Stack>
            ) : (
              !contextLoading && (
                <Typography variant="caption" color="text.secondary">
                  Clique Refresh para carregar o contexto de inteligência.
                </Typography>
              )
            )}

            <Stack direction="row" spacing={0.5} alignItems="center">
              {(contextLoading || healthLoading) && <CircularProgress size={12} />}
              <Button
                size="small"
                variant="outlined"
                onClick={() => { loadContext(); loadHealth(); }}
                disabled={contextLoading}
                sx={{ fontSize: '0.72rem', py: 0.25 }}
              >
                <IconRefresh size={13} style={{ marginRight: 4 }} /> Refresh
              </Button>
            </Stack>
          </Stack>

          {contextError && (
            <Alert severity="warning" sx={{ mt: 1, py: 0.25, fontSize: '0.72rem' }}>
              {contextError}
            </Alert>
          )}

          {(contextLoading || healthLoading) && (
            <LinearProgress sx={{ mt: 1, height: 2, borderRadius: 1 }} />
          )}
        </CardContent>
      </Card>

      {/* Chat — full width, tall */}
      <Box sx={{ flex: 1, minHeight: 520 }}>
        <AIAssistant
          messages={chatMessages}
          providers={providers}
          selectedProvider={provider}
          mode="command"
          loading={chatLoading}
          onSendMessage={sendChatMessage}
          onChangeProvider={setProvider}
          onChangeMode={() => {}}
          onNewConversation={() => {
            setChatMessages([]);
            setConversationId(null);
          }}
          contextLoaded={!!intelligenceStats}
          clientId={clientId}
        />
      </Box>

      {/* Outputs — briefings & copies below chat */}
      <OutputsList
        briefings={briefings}
        copies={copies}
        loading={outputsLoading}
        onViewBriefing={(id) => router.push(`/edro/${id}`)}
        onDeleteBriefing={async (id) => {
          try {
            await apiDelete(`/clients/${clientId}/briefings/${id}`);
            setBriefings((prev) => prev.filter((b) => b.id !== id));
          } catch {
            // ignore
          }
        }}
        onArchiveBriefing={async (id) => {
          try {
            await apiPatch(`/clients/${clientId}/briefings/${id}/archive`);
            setBriefings((prev) => prev.map((b) => (b.id === id ? { ...b, status: 'archived' } : b)));
          } catch {
            // ignore
          }
        }}
      />
    </Box>
  );
}
