'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiGet, apiPost, buildApiUrl } from '@/lib/api';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { IconAlertTriangle, IconBrain, IconCalendar, IconClipboard, IconDatabase, IconRefresh, IconTrendingUp } from '@tabler/icons-react';

// Components
import AIAssistant, { ChatMessage, ProviderOption } from './components/AIAssistant';
import type { IntelligenceStats } from './components/ContextPanel';
import type { HealthData, SourceHealth } from './components/HealthMonitor';
import InsumosList, { ClippingItem, LibraryItem } from './components/InsumosList';
import OpportunitiesList, { Opportunity } from './components/OpportunitiesList';
import OutputsList, { Briefing, Copy } from './components/OutputsList';

type PlanningClientProps = {
  clientId: string;
};

export default function PlanningClient({ clientId }: PlanningClientProps) {
  // Intelligence Context
  const [intelligenceStats, setIntelligenceStats] = useState<IntelligenceStats | null>(null);
  const [contextLoading, setContextLoading] = useState(false);
  const [contextError, setContextError] = useState('');

  // Health Monitor
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);

  // Library
  const [libraryItems, setLibraryItems] = useState<LibraryItem[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [libraryError, setLibraryError] = useState('');
  const [uploading, setUploading] = useState(false);

  // Clipping (mock for now)
  const [clippingItems] = useState<ClippingItem[]>([]);

  // Opportunities
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [opportunitiesLoading, setOpportunitiesLoading] = useState(false);
  const [opportunitiesError, setOpportunitiesError] = useState('');
  const [detecting, setDetecting] = useState(false);

  // Outputs
  const [briefings, setBriefings] = useState<Briefing[]>([]);
  const [copies, setCopies] = useState<Copy[]>([]);
  const [outputsLoading, setOutputsLoading] = useState(false);

  // AI Chat
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [providers, setProviders] = useState<ProviderOption[]>([]);
  const [provider, setProvider] = useState('openai');
  const [chatMode, setChatMode] = useState<'chat' | 'command'>('command');

  // Load Intelligence Context (with 30s client-side timeout)
  const loadContext = useCallback(async () => {
    setContextLoading(true);
    setContextError('');
    try {
      const contextPromise = apiPost<{
        success?: boolean;
        data?: {
          context?: any;
          stats?: IntelligenceStats;
          partial?: boolean;
          warning?: string;
        };
      }>(`/clients/${clientId}/planning/context`, {});

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 30000)
      );

      const response = await Promise.race([contextPromise, timeoutPromise]);

      if (response?.data?.stats) {
        setIntelligenceStats(response.data.stats);
      }
      if (response?.data?.partial) {
        setContextError(response.data.warning || 'Contexto carregado parcialmente.');
      }
    } catch (err: any) {
      const msg = err?.message === 'timeout'
        ? 'Contexto demorou demais. Clique Refresh para tentar novamente.'
        : (err?.message || 'Falha ao carregar contexto.');
      setContextError(msg);
    } finally {
      setContextLoading(false);
    }
  }, [clientId]);

  // Load Health (with 15s timeout)
  const loadHealth = useCallback(async () => {
    setHealthLoading(true);
    try {
      const healthPromise = apiPost<{
        success?: boolean;
        data?: HealthData;
      }>(`/clients/${clientId}/planning/health`, {});

      const response = await Promise.race([
        healthPromise,
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 15000)),
      ]);

      if (response?.data) {
        setHealthData(response.data);
      }
    } catch (err: any) {
      console.error('Failed to load health:', err);
    } finally {
      setHealthLoading(false);
    }
  }, [clientId]);

  // Load Library
  const loadLibrary = useCallback(async () => {
    setLibraryLoading(true);
    setLibraryError('');
    try {
      const response = await apiGet<LibraryItem[]>(`/clients/${clientId}/library`);
      setLibraryItems(Array.isArray(response) ? response.slice(0, 10) : []);
    } catch (err: any) {
      setLibraryError(err?.message || 'Falha ao carregar materiais.');
    } finally {
      setLibraryLoading(false);
    }
  }, [clientId]);

  // Load Opportunities
  const loadOpportunities = useCallback(async () => {
    setOpportunitiesLoading(true);
    setOpportunitiesError('');
    try {
      const response = await apiGet<{ opportunities?: Opportunity[] }>(`/clients/${clientId}/planning/opportunities`);
      setOpportunities(response?.opportunities || []);
    } catch (err: any) {
      setOpportunitiesError(err?.message || 'Falha ao carregar oportunidades.');
    } finally {
      setOpportunitiesLoading(false);
    }
  }, [clientId]);

  // Load Outputs (Briefings & Copies)
  const loadOutputs = useCallback(async () => {
    setOutputsLoading(true);
    try {
      const [briefingsRes, copiesRes] = await Promise.allSettled([
        apiGet<{ briefings?: Briefing[] }>(`/clients/${clientId}/briefings`),
        apiGet<{ copies?: Copy[] }>(`/clients/${clientId}/copies`),
      ]);

      if (briefingsRes.status === 'fulfilled') {
        setBriefings(briefingsRes.value?.briefings || []);
      }
      if (copiesRes.status === 'fulfilled') {
        setCopies(copiesRes.value?.copies || []);
      }
    } catch (err) {
      console.error('Failed to load outputs:', err);
    } finally {
      setOutputsLoading(false);
    }
  }, [clientId]);

  // Load Providers
  const loadProviders = useCallback(async () => {
    try {
      const response = await apiGet<{ data?: { providers?: ProviderOption[] } }>(`/planning/providers`);
      const list = response?.data?.providers || [];
      if (list.length) {
        setProviders(list);
        if (!list.find((p) => p.id === provider)) {
          setProvider(list[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load providers', err);
    }
  }, [provider]);

  // Initial Load — bootstrap seeds calendar + opportunities if empty, then load all panels
  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        await apiPost(`/clients/${clientId}/planning/bootstrap`, {});
      } catch { /* bootstrap is best-effort */ }
      if (cancelled) return;
      loadContext();
      loadHealth();
      loadLibrary();
      loadOpportunities();
      loadOutputs();
      loadProviders();
    }
    init();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  // Upload File
  const uploadFile = async (file: File) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('edro_token') : null;
    if (!token) {
      setLibraryError('Sessão expirada. Faça login novamente.');
      return;
    }
    setUploading(true);
    setLibraryError('');
    const form = new FormData();
    form.append('file', file);

    try {
      const response = await fetch(buildApiUrl(`/clients/${clientId}/library/upload`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      if (!response.ok) {
        let serverMsg = '';
        try {
          const data = await response.json();
          serverMsg = data?.error || data?.message || '';
        } catch {
          /* ignore parse errors */
        }
        throw new Error(serverMsg || `Falha ao enviar (${response.status}).`);
      }
      await loadLibrary();
      await loadContext(); // Refresh context after upload
    } catch (err: any) {
      setLibraryError(err?.message || 'Falha ao enviar o arquivo.');
    } finally {
      setUploading(false);
    }
  };

  // Add Reference
  const addReference = async (url: string) => {
    setUploading(true);
    setLibraryError('');
    try {
      await apiPost(`/clients/${clientId}/library`, {
        type: 'link',
        title: url,
        source_url: url,
      });
      await loadLibrary();
      await loadContext();
    } catch (err: any) {
      setLibraryError(err?.message || 'Falha ao salvar o link.');
    } finally {
      setUploading(false);
    }
  };

  // Detect New Opportunities
  const detectNewOpportunities = async () => {
    setDetecting(true);
    try {
      await apiPost(`/clients/${clientId}/planning/opportunities/detect`, {});
      await loadOpportunities();
    } catch (err: any) {
      setOpportunitiesError(err?.message || 'Falha ao detectar oportunidades.');
    } finally {
      setDetecting(false);
    }
  };

  // Create Briefing from Opportunity
  const createBriefingFromOpportunity = async (opportunityId: string) => {
    try {
      await apiPost(`/clients/${clientId}/planning/opportunities/${opportunityId}/action`, {
        action: 'create_briefing',
      });
      await loadOpportunities();
      await loadOutputs();
    } catch (err: any) {
      console.error('Failed to create briefing:', err);
    }
  };

  // Dismiss Opportunity
  const dismissOpportunity = async (opportunityId: string) => {
    try {
      await apiPost(`/clients/${clientId}/planning/opportunities/${opportunityId}/action`, {
        action: 'dismiss',
      });
      await loadOpportunities();
    } catch (err: any) {
      console.error('Failed to dismiss opportunity:', err);
    }
  };

  // Upload file to library and return the item ID
  const uploadFileForChat = async (file: File): Promise<string | null> => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('edro_token') : null;
    if (!token) return null;
    const form = new FormData();
    form.append('file', file);
    try {
      const response = await fetch(buildApiUrl(`/clients/${clientId}/library/upload`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      if (!response.ok) return null;
      const data = await response.json();
      return data?.data?.id || data?.id || null;
    } catch {
      return null;
    }
  };

  // Send Chat Message (with 55s timeout)
  const sendChatMessage = async (message: string, files?: File[]) => {
    setChatLoading(true);

    const fileNames = files?.map((f) => f.name) || [];
    const userContent = fileNames.length > 0
      ? `${message}${message ? '\n' : ''}📎 ${fileNames.join(', ')}`
      : message;

    setChatMessages((prev) => [
      ...prev,
      { role: 'user', content: userContent, timestamp: new Date().toISOString() },
    ]);

    // Upload files to library first
    let attachmentIds: string[] = [];
    if (files?.length) {
      const uploadResults = await Promise.all(files.map(uploadFileForChat));
      attachmentIds = uploadResults.filter((id): id is string => id !== null);
    }

    try {
      const chatPromise = apiPost<{
        success?: boolean;
        data?: {
          response?: string;
          conversationId?: string;
          provider?: string;
          stages?: any[];
          action?: any;
        };
      }>(`/clients/${clientId}/planning/chat`, {
        message,
        provider,
        mode: chatMode,
        conversationId,
        ...(attachmentIds.length > 0 && { attachmentIds }),
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 55000)
      );

      const response = await Promise.race([chatPromise, timeoutPromise]);

      if (response?.data?.conversationId) {
        setConversationId(response.data.conversationId);
      }
      if (response?.data?.response) {
        setChatMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: response.data!.response!,
            timestamp: new Date().toISOString(),
            provider: response.data!.provider,
            action: response.data!.action,
          } as ChatMessage,
        ]);
      }

      // Refresh outputs if action was taken
      if (response?.data?.action) {
        await loadOutputs();
      }
    } catch (err: any) {
      const errorMsg = err?.message === 'timeout'
        ? 'A IA demorou demais para responder. Tente novamente.'
        : (err?.message || 'Erro ao conversar com a IA.');
      setChatMessages((prev) => [
        ...prev,
        { role: 'assistant', content: errorMsg, timestamp: new Date().toISOString() },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const sectionCardSx = { borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: 'none' };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Stats Bar */}
      <Card sx={sectionCardSx}>
        <CardContent sx={{ py: 0.75, px: 2, '&:last-child': { pb: 0.75 } }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" useFlexGap rowGap={1}>
            {intelligenceStats && (() => {
              const sources = healthData?.sources as Record<string, SourceHealth> | undefined;
              const items = [
                { key: 'library', label: 'Library', value: intelligenceStats.library.totalItems, icon: <IconDatabase size={14} /> },
                { key: 'clipping', label: 'Clipping', value: intelligenceStats.clipping.totalMatches, icon: <IconClipboard size={14} /> },
                { key: 'social', label: 'Social', value: intelligenceStats.social.totalMentions, icon: <IconTrendingUp size={14} /> },
                { key: 'calendar', label: 'Calendário', value: intelligenceStats.calendar.next14Days, icon: <IconCalendar size={14} /> },
                { key: 'opportunities', label: 'Oportunidades', value: intelligenceStats.opportunities.active, icon: <IconBrain size={14} /> },
              ];
              return (
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {items.map((item) => {
                    const health = sources?.[item.key];
                    const hasIssue = health && health.status !== 'healthy';
                    return (
                      <Tooltip
                        key={item.key}
                        title={hasIssue ? health.message : `${item.label}: ${item.value}`}
                        arrow
                      >
                        <Chip
                          size="small"
                          icon={hasIssue ? <IconAlertTriangle size={14} /> : item.icon}
                          label={`${item.label}: ${item.value}`}
                          color={hasIssue ? (health.status === 'error' ? 'error' : 'warning') : 'default'}
                          variant={hasIssue ? 'filled' : 'outlined'}
                          sx={{ fontWeight: 600, fontSize: '0.7rem' }}
                        />
                      </Tooltip>
                    );
                  })}
                  {intelligenceStats.opportunities.urgent > 0 && (
                    <Chip size="small" color="error" label={`${intelligenceStats.opportunities.urgent} urgente`} sx={{ fontWeight: 700 }} />
                  )}
                </Stack>
              );
            })()}

            <Stack direction="row" spacing={0.5} alignItems="center">
              {(contextLoading || healthLoading) && <CircularProgress size={14} />}
              <Button size="small" variant="outlined" onClick={() => { loadContext(); loadHealth(); }} disabled={contextLoading}>
                <IconRefresh size={14} style={{ marginRight: 4 }} /> Refresh
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {/* Main: AI Chat (left) | Insumos + Oportunidades (right) */}
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Box sx={{ height: 520 }}>
            <AIAssistant
              messages={chatMessages}
              providers={providers}
              selectedProvider={provider}
              mode={chatMode}
              loading={chatLoading}
              onSendMessage={sendChatMessage}
              onChangeProvider={setProvider}
              onChangeMode={setChatMode}
              onNewConversation={() => {
                setChatMessages([]);
                setConversationId(null);
              }}
              contextLoaded={!!intelligenceStats}
            />
          </Box>
        </Grid>
        <Grid size={{ xs: 12, lg: 4 }}>
          <Stack spacing={2} sx={{ height: 520, overflow: 'hidden' }}>
            <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
              <InsumosList
                clientId={clientId}
                libraryItems={libraryItems}
                clippingItems={clippingItems}
                libraryLoading={libraryLoading}
                libraryError={libraryError}
                uploading={uploading}
                onUploadFile={uploadFile}
                onAddReference={addReference}
              />
            </Box>
            <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
              <OpportunitiesList
                opportunities={opportunities}
                loading={opportunitiesLoading}
                error={opportunitiesError}
                onCreateBriefing={createBriefingFromOpportunity}
                onDismiss={dismissOpportunity}
                onDetectNew={detectNewOpportunities}
                detecting={detecting}
              />
            </Box>
          </Stack>
        </Grid>
      </Grid>

      {/* Outputs */}
      <OutputsList
        briefings={briefings}
        copies={copies}
        loading={outputsLoading}
      />
    </Box>
  );
}
