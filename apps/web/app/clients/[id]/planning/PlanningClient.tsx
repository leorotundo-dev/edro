'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiGet, apiPatch, apiPost, buildApiUrl } from '@/lib/api';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { IconBrain, IconSearch } from '@tabler/icons-react';

// Components
import AIAssistant, { ChatMessage, ProviderOption } from './components/AIAssistant';
import AntiRepetitionValidator, { ValidationResult } from './components/AntiRepetitionValidator';
import ContextPanel, { IntelligenceStats } from './components/ContextPanel';
import HealthMonitor, { HealthData } from './components/HealthMonitor';
import InsumosList, { ClippingItem, LibraryItem } from './components/InsumosList';
import OpportunitiesList, { Opportunity } from './components/OpportunitiesList';
import OutputsList, { Briefing, Copy } from './components/OutputsList';

type PlanningClientProps = {
  clientId: string;
};

export default function PlanningClient({ clientId }: PlanningClientProps) {
  // Mode
  const [mode, setMode] = useState<'exploration' | 'execution'>('exploration');

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

  // Copy Validation
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [validating, setValidating] = useState(false);
  const [copyToValidate, setCopyToValidate] = useState('');

  // Notes
  const [notesText, setNotesText] = useState('');
  const [saving, setSaving] = useState(false);

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

  // Initial Load
  useEffect(() => {
    loadContext();
    loadHealth();
    loadLibrary();
    loadOpportunities();
    loadOutputs();
    loadProviders();
  }, [loadContext, loadHealth, loadLibrary, loadOpportunities, loadOutputs, loadProviders]);

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

  // Send Chat Message (with 55s timeout)
  const sendChatMessage = async (message: string) => {
    setChatLoading(true);
    setChatMessages((prev) => [
      ...prev,
      { role: 'user', content: message, timestamp: new Date().toISOString() },
    ]);

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

  // Validate Copy
  const validateCopy = async () => {
    if (!copyToValidate.trim()) return;
    setValidating(true);
    try {
      const response = await apiPost<{ success?: boolean; data?: ValidationResult }>(
        `/clients/${clientId}/planning/validate-copy`,
        { copyText: copyToValidate }
      );
      if (response?.data) {
        setValidationResult(response.data);
      }
    } catch (err: any) {
      console.error('Validation failed:', err);
    } finally {
      setValidating(false);
    }
  };

  // Save Notes
  const saveNotes = async () => {
    setSaving(true);
    try {
      await apiPatch(`/clients/${clientId}/planning`, { notes: notesText });
    } catch (err) {
      console.error('Failed to save notes:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ p: '20px' }}>
      {/* Stats Bar */}
      <Card variant="outlined" sx={{ mb: 1.5 }}>
        <CardContent sx={{ py: 1, px: 2 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Stack direction="row" alignItems="center" spacing={2}>
              <IconBrain size={24} />
              <Typography variant="subtitle2">Jarvis Intelligence System</Typography>
              <ToggleButtonGroup
                value={mode}
                exclusive
                onChange={(_, v) => v && setMode(v)}
                size="small"
              >
                <ToggleButton value="exploration">
                  <IconSearch size={14} style={{ marginRight: 4 }} /> Exploração
                </ToggleButton>
                <ToggleButton value="execution">
                  <IconBrain size={14} style={{ marginRight: 4 }} /> Execução
                </ToggleButton>
              </ToggleButtonGroup>
            </Stack>

            {intelligenceStats && (
              <Stack direction="row" spacing={1.5}>
                <Chip size="small" label={`Library: ${intelligenceStats.library.totalItems}`} />
                <Chip size="small" label={`Clipping: ${intelligenceStats.clipping.totalMatches}`} />
                <Chip size="small" label={`Oportunidades: ${intelligenceStats.opportunities.active}`} />
                {intelligenceStats.opportunities.urgent > 0 && (
                  <Chip size="small" color="error" label={`⚠️ ${intelligenceStats.opportunities.urgent} urgente`} />
                )}
              </Stack>
            )}

            <Button size="small" variant="outlined" onClick={loadContext} disabled={contextLoading}>
              {contextLoading ? <CircularProgress size={14} /> : 'Refresh'}
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* 3-Column Layout */}
      <Grid container spacing={1.5}>
        {/* Left Column: Context & Insumos */}
        <Grid size={{ xs: 12, lg: 3 }}>
          <Stack spacing={1.5}>
            <ContextPanel
              loading={contextLoading}
              stats={intelligenceStats}
              error={contextError}
              onRefresh={loadContext}
            />
            <HealthMonitor
              clientId={clientId}
              healthData={healthData}
              loading={healthLoading}
              onRefresh={loadHealth}
            />
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
          </Stack>
        </Grid>

        {/* Middle Column: AI Assistant & Opportunities */}
        <Grid size={{ xs: 12, lg: 5 }}>
          <Stack spacing={1.5}>
            <Box sx={{ height: 650 }}>
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

            <OpportunitiesList
              opportunities={opportunities}
              loading={opportunitiesLoading}
              error={opportunitiesError}
              onCreateBriefing={createBriefingFromOpportunity}
              onDismiss={dismissOpportunity}
              onDetectNew={detectNewOpportunities}
              detecting={detecting}
            />
          </Stack>
        </Grid>

        {/* Right Column: Outputs & Validation */}
        <Grid size={{ xs: 12, lg: 4 }}>
          <Stack spacing={1.5}>
            <Box sx={{ height: 450 }}>
              <OutputsList
                briefings={briefings}
                copies={copies}
                loading={outputsLoading}
              />
            </Box>

            {/* Copy Validation */}
            <Card variant="outlined">
              <CardContent sx={{ p: 2 }}>
                <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                  Validação de Copy
                </Typography>
                <TextField
                  multiline
                  rows={3}
                  fullWidth
                  placeholder="Cole a copy aqui para validar..."
                  value={copyToValidate}
                  onChange={(e) => setCopyToValidate(e.target.value)}
                  sx={{ mb: 1.5 }}
                />
                <AntiRepetitionValidator
                  validationResult={validationResult}
                  loading={validating}
                  copyText={copyToValidate}
                  onValidate={validateCopy}
                />
              </CardContent>
            </Card>

            {/* Notes */}
            <Card variant="outlined">
              <CardContent sx={{ p: 2 }}>
                <Typography variant="overline" color="text.secondary">
                  Notas e direcionamentos
                </Typography>
                <TextField
                  multiline
                  rows={3}
                  fullWidth
                  value={notesText}
                  onChange={(e) => setNotesText(e.target.value)}
                  placeholder="Registre observações estratégicas, briefings internos e insights..."
                  sx={{ mt: 1, mb: 1 }}
                />
                <Button variant="contained" size="small" onClick={saveNotes} disabled={saving}>
                  {saving ? 'Salvando...' : 'Salvar notas'}
                </Button>
              </CardContent>
            </Card>
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
}
