'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { apiGet, apiPatch, apiPost, buildApiUrl } from '@/lib/api';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Stepper from '@mui/material/Stepper';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { IconFileUpload, IconLink, IconMessagePlus, IconRobot, IconSend, IconSparkles } from '@tabler/icons-react';

type ContentPillar = {
  id: string;
  title: string;
  description: string;
  icon: string;
};

type StrategicObjective = {
  id: string;
  text: string;
  completed: boolean;
};

type RoadmapItem = {
  id: string;
  title: string;
  label: string;
  color: string;
  startQ: number;
  spanQ: number;
};

type PlanningData = {
  brand_positioning?: string;
  primary_voice?: string;
  creative_direction_title?: string;
  creative_direction_description?: string;
  creative_tags?: string[];
  objectives?: StrategicObjective[];
  pillars?: ContentPillar[];
  roadmap?: RoadmapItem[];
  notes?: string;
  notes_updated_at?: string;
  notes_updated_by?: string;
};

type LibraryItem = {
  id: string;
  type: string;
  title: string;
  status?: string;
  created_at?: string;
  file_size_bytes?: number;
  source_url?: string;
};

type ProviderOption = {
  id: string;
  name: string;
  description?: string;
};

type ChatAction = {
  action: string;
  reason?: string;
  briefing?: { id: string; title: string; status?: string };
  copy?: { id: string; model?: string; provider?: string; preview?: string; count?: number };
  error?: string;
};

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  action?: ChatAction | null;
};

type PlanningClientProps = {
  clientId: string;
};

const DEFAULT_PILLARS: ContentPillar[] = [
  { id: '1', title: 'Product Heritage', description: 'Deep dives into sourcing, botanical history, and craft.', icon: 'history_edu' },
  { id: '2', title: 'Community Stories', description: 'User generated content and local tastemaker profiles.', icon: 'group' },
  { id: '3', title: 'Sustainability', description: 'Radical transparency on packaging and supply chain.', icon: 'eco' },
  { id: '4', title: 'Brand Moments', description: 'Lifestyle aesthetic moments and consumption rituals.', icon: 'auto_awesome' },
];

const DEFAULT_ROADMAP: RoadmapItem[] = [
  { id: '1', title: 'Brand Awareness', label: 'Always-On Narrative', color: '#ff6600', startQ: 0, spanQ: 3 },
  { id: '2', title: 'New Collection Launch', label: 'Summer Artisan Series', color: '#f97316', startQ: 1, spanQ: 1 },
  { id: '3', title: 'Holiday Push', label: 'Gifting Season', color: '#fb7185', startQ: 3, spanQ: 1 },
];

function formatFileSize(bytes?: number): string {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function formatTime(dateStr?: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

const QUICK_PROMPTS = [
  'Criar briefing para Instagram',
  'Gerar copy para o cliente',
  'Sugerir pilares de conteudo',
];

export default function PlanningClient({ clientId }: PlanningClientProps) {
  const [data, setData] = useState<PlanningData>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesText, setNotesText] = useState('');
  const [libraryItems, setLibraryItems] = useState<LibraryItem[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [libraryError, setLibraryError] = useState('');
  const [referenceUrl, setReferenceUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [providers, setProviders] = useState<ProviderOption[]>([]);
  const [provider, setProvider] = useState('openai');
  const [chatMode, setChatMode] = useState<'chat' | 'command'>('command');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [collabStep, setCollabStep] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadPlanning = useCallback(async () => {
    try {
      const res = await apiGet<{ planning: PlanningData }>(`/clients/${clientId}/planning`).catch(() => ({ planning: {} as PlanningData }));
      const planning: PlanningData = res.planning || {};
      setData({
        ...planning,
        pillars: planning.pillars?.length ? planning.pillars : DEFAULT_PILLARS,
        roadmap: planning.roadmap?.length ? planning.roadmap : DEFAULT_ROADMAP,
      });
      setNotesText(planning.notes || '');
    } catch (err) {
      console.error('Failed to load planning:', err);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  const loadLibrary = useCallback(async () => {
    setLibraryLoading(true);
    setLibraryError('');
    try {
      const response = await apiGet<LibraryItem[]>(`/clients/${clientId}/library`);
      setLibraryItems(Array.isArray(response) ? response.slice(0, 8) : []);
    } catch (err: any) {
      setLibraryError(err?.message || 'Falha ao carregar materiais.');
    } finally {
      setLibraryLoading(false);
    }
  }, [clientId]);

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

  useEffect(() => {
    loadPlanning();
    loadLibrary();
    loadProviders();
  }, [loadPlanning, loadLibrary, loadProviders]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, chatLoading]);

  useEffect(() => {
    if (!chatLoading || provider !== 'collaborative') {
      setCollabStep(0);
      return;
    }
    setCollabStep(0);
    const t1 = setTimeout(() => setCollabStep(1), 4000);
    const t2 = setTimeout(() => setCollabStep(2), 10000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [chatLoading, provider]);

  const saveNotes = async () => {
    setSaving(true);
    try {
      await apiPatch(`/clients/${clientId}/planning`, { notes: notesText });
      setData((prev) => ({ ...prev, notes: notesText, notes_updated_at: new Date().toISOString() }));
      setEditingNotes(false);
    } catch (err) {
      console.error('Failed to save notes:', err);
    } finally {
      setSaving(false);
    }
  };

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
        } catch { /* ignore parse errors */ }
        throw new Error(serverMsg || `Falha ao enviar (${response.status}).`);
      }
      await loadLibrary();
    } catch (err: any) {
      setLibraryError(err?.message || 'Falha ao enviar o arquivo.');
    } finally {
      setUploading(false);
    }
  };

  const addReference = async () => {
    if (!referenceUrl.trim()) return;
    setUploading(true);
    setLibraryError('');
    try {
      await apiPost(`/clients/${clientId}/library`, {
        type: 'link',
        title: referenceUrl,
        source_url: referenceUrl,
      });
      setReferenceUrl('');
      await loadLibrary();
    } catch (err: any) {
      setLibraryError(err?.message || 'Falha ao salvar o link.');
    } finally {
      setUploading(false);
    }
  };

  const sendChat = async () => {
    if (!chatInput.trim()) return;
    setChatLoading(true);
    const msg = chatInput;

    setChatMessages((prev) => [
      ...prev,
      { role: 'user', content: msg, timestamp: new Date().toISOString() },
    ]);
    setChatInput('');

    try {
      const response = await apiPost<{
        success?: boolean;
        data?: {
          response?: string;
          conversationId?: string;
          provider?: string;
          stages?: any[];
          action?: any;
        };
      }>(
        `/clients/${clientId}/planning/chat`,
        { message: msg, provider, mode: chatMode, conversationId }
      );
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
          } as ChatMessage,
        ]);
      }
    } catch (err: any) {
      setChatMessages((prev) => [
        ...prev,
        { role: 'assistant', content: err?.message || 'Erro ao conversar com a IA.', timestamp: new Date().toISOString() },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleChatKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!chatLoading && chatInput.trim()) sendChat();
    }
  };

  const startNewConversation = () => {
    setChatMessages([]);
    setConversationId(null);
    setChatInput('');
  };

  if (loading) {
    return (
      <Stack alignItems="center" justifyContent="center" sx={{ minHeight: 240 }}>
        <CircularProgress size={28} />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Carregando planning...
        </Typography>
      </Stack>
    );
  }

  return (
    <Box>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 7 }}>
          <Stack spacing={2}>
            <Card variant="outlined">
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                  <Typography variant="overline" color="text.secondary">
                    Insumos e referências
                  </Typography>
                  <Chip size="small" label={`${libraryItems.length} itens`} />
                </Stack>

                {libraryError ? <Typography color="error">{libraryError}</Typography> : null}

                <Stack spacing={2}>
                  <Button
                    variant="outlined"
                    startIcon={<IconFileUpload size={16} />}
                    component="label"
                    disabled={uploading}
                  >
                    Upload de arquivo
                    <input
                      type="file"
                      hidden
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) uploadFile(file);
                      }}
                    />
                  </Button>

                  <TextField
                    label="Link de referência"
                    value={referenceUrl}
                    onChange={(event) => setReferenceUrl(event.target.value)}
                    placeholder="https://..."
                    InputProps={{
                      endAdornment: (
                        <Button
                          size="small"
                          variant="contained"
                          onClick={addReference}
                          disabled={uploading || !referenceUrl}
                          startIcon={<IconLink size={14} />}
                        >
                          Adicionar
                        </Button>
                      ),
                    }}
                  />

                  <Divider />

                  <Stack spacing={1}>
                    {libraryLoading ? (
                      <LinearProgress />
                    ) : libraryItems.length > 0 ? (
                      libraryItems.map((item) => (
                        <Stack
                          key={item.id}
                          direction="row"
                          alignItems="center"
                          justifyContent="space-between"
                          spacing={2}
                          sx={{ p: 1.5, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}
                        >
                          <Box>
                            <Typography variant="subtitle2">{item.title}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {formatDate(item.created_at)} · {formatFileSize(item.file_size_bytes)}
                            </Typography>
                          </Box>
                          <Chip size="small" label={item.type} />
                        </Stack>
                      ))
                    ) : (
                      <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 2 }}>
                        Nenhum material enviado ainda.
                      </Typography>
                    )}
                  </Stack>
                </Stack>
              </CardContent>
            </Card>

            <Card variant="outlined">
              <CardContent>
                <Typography variant="overline" color="text.secondary">
                  Notas e direcionamentos
                </Typography>
                <TextField
                  multiline
                  rows={5}
                  value={notesText}
                  onChange={(event) => setNotesText(event.target.value)}
                  placeholder="Registre observações estratégicas, briefings internos e insights..."
                  sx={{ mt: 2 }}
                />
                <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                  <Button variant="contained" onClick={saveNotes} disabled={saving}>
                    {saving ? 'Salvando...' : 'Salvar notas'}
                  </Button>
                  {data.notes_updated_at ? (
                    <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center' }}>
                      Atualizado em {formatDate(data.notes_updated_at)}
                    </Typography>
                  ) : null}
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Grid>

        <Grid size={{ xs: 12, lg: 5 }}>
          <Stack spacing={2}>
            <Card
              variant="outlined"
              sx={{ display: 'flex', flexDirection: 'column', height: 540, overflow: 'hidden' }}
            >
              {/* Header */}
              <Stack
                direction="row"
                alignItems="center"
                spacing={1}
                sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider', flexShrink: 0 }}
              >
                <Avatar sx={{ width: 28, height: 28, bgcolor: 'primary.light', color: 'primary.main' }}>
                  <IconRobot size={16} />
                </Avatar>
                <Typography variant="subtitle2" sx={{ flex: 1 }}>
                  Assistente IA
                </Typography>
                <Tabs
                  value={chatMode}
                  onChange={(_, v) => setChatMode(v)}
                  sx={{
                    minHeight: 32,
                    '& .MuiTab-root': { minHeight: 32, py: 0, px: 1.5, fontSize: '0.75rem' },
                  }}
                >
                  <Tab value="command" label="Comandos" />
                  <Tab value="chat" label="Chat" />
                </Tabs>
                <TextField
                  select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  size="small"
                  sx={{
                    minWidth: 100,
                    '& .MuiInputBase-root': { fontSize: '0.75rem', height: 32 },
                    '& .MuiSelect-select': { py: 0.5, px: 1 },
                  }}
                >
                  {providers.length ? (
                    providers.map((opt) => (
                      <MenuItem key={opt.id} value={opt.id} sx={{ fontSize: '0.75rem' }}>
                        {opt.name}
                      </MenuItem>
                    ))
                  ) : (
                    <MenuItem value="openai" sx={{ fontSize: '0.75rem' }}>OpenAI</MenuItem>
                  )}
                </TextField>
                <Tooltip title="Nova conversa">
                  <IconButton size="small" onClick={startNewConversation}>
                    <IconMessagePlus size={16} />
                  </IconButton>
                </Tooltip>
              </Stack>

              {/* Messages */}
              <Box
                sx={{
                  flex: 1,
                  overflowY: 'auto',
                  px: 2,
                  py: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1.5,
                  bgcolor: 'grey.50',
                  '&::-webkit-scrollbar': { width: 6 },
                  '&::-webkit-scrollbar-thumb': { bgcolor: 'grey.300', borderRadius: 3 },
                }}
              >
                {chatMessages.length === 0 && !chatLoading ? (
                  <Stack alignItems="center" justifyContent="center" sx={{ flex: 1, py: 4 }}>
                    <Avatar sx={{ width: 48, height: 48, bgcolor: 'primary.light', color: 'primary.main', mb: 2 }}>
                      <IconRobot size={24} />
                    </Avatar>
                    <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                      Como posso ajudar?
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5, textAlign: 'center', maxWidth: 260 }}>
                      Crie briefings, gere copies e explore ideias para o cliente.
                    </Typography>
                    <Stack spacing={1} sx={{ width: '100%', maxWidth: 280 }}>
                      {QUICK_PROMPTS.map((prompt) => (
                        <Button
                          key={prompt}
                          variant="outlined"
                          size="small"
                          startIcon={<IconSparkles size={14} />}
                          onClick={() => setChatInput(prompt)}
                          sx={{
                            justifyContent: 'flex-start',
                            textTransform: 'none',
                            fontWeight: 500,
                            fontSize: '0.75rem',
                            borderColor: 'divider',
                            color: 'text.secondary',
                            '&:hover': { borderColor: 'primary.main', bgcolor: 'primary.light', color: 'primary.main' },
                          }}
                        >
                          {prompt}
                        </Button>
                      ))}
                    </Stack>
                  </Stack>
                ) : (
                  <>
                    {chatMessages.map((msg, idx) => (
                      <Stack
                        key={`${msg.timestamp}-${idx}`}
                        direction="row"
                        spacing={1}
                        justifyContent={msg.role === 'user' ? 'flex-end' : 'flex-start'}
                        alignItems="flex-end"
                      >
                        {msg.role === 'assistant' && (
                          <Avatar sx={{ width: 24, height: 24, bgcolor: 'grey.200', flexShrink: 0 }}>
                            <IconRobot size={14} />
                          </Avatar>
                        )}
                        <Box sx={{ maxWidth: '80%' }}>
                          <Box
                            sx={{
                              px: 1.75,
                              py: 1.25,
                              borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                              bgcolor: msg.role === 'user' ? 'primary.main' : '#ffffff',
                              color: msg.role === 'user' ? '#ffffff' : 'text.primary',
                              boxShadow: msg.role === 'assistant' ? '0 1px 3px 0 rgba(0,0,0,0.05)' : 'none',
                              border: msg.role === 'assistant' ? '1px solid' : 'none',
                              borderColor: 'divider',
                            }}
                          >
                            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                              {msg.content}
                            </Typography>
                          </Box>

                          {msg.action && msg.role === 'assistant' && (
                            <Box
                              sx={{
                                mt: 1,
                                p: 1.5,
                                borderRadius: 2,
                                bgcolor: msg.action.error ? 'error.light' : 'success.light',
                                border: '1px solid',
                                borderColor: msg.action.error ? 'error.main' : 'success.main',
                              }}
                            >
                              <Typography
                                variant="caption"
                                sx={{
                                  fontWeight: 600,
                                  color: msg.action.error ? 'error.dark' : 'success.dark',
                                  display: 'block',
                                  mb: 0.5,
                                }}
                              >
                                {msg.action.error
                                  ? 'Erro'
                                  : msg.action.briefing
                                    ? 'Briefing criado'
                                    : msg.action.copy
                                      ? 'Copy gerada'
                                      : msg.action.action}
                              </Typography>
                              {msg.action.briefing && (
                                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                  {msg.action.briefing.title}
                                </Typography>
                              )}
                              {msg.action.copy?.preview && (
                                <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap', mt: 0.5, maxHeight: 80, overflow: 'hidden' }}>
                                  {msg.action.copy.preview}
                                </Typography>
                              )}
                              {msg.action.error && (
                                <Typography variant="body2" color="error.dark">
                                  {msg.action.error}
                                </Typography>
                              )}
                            </Box>
                          )}

                          <Typography
                            variant="caption"
                            sx={{
                              display: 'block',
                              mt: 0.5,
                              px: 0.5,
                              fontSize: '0.625rem',
                              color: 'text.disabled',
                              textAlign: msg.role === 'user' ? 'right' : 'left',
                            }}
                          >
                            {formatTime(msg.timestamp)}
                          </Typography>
                        </Box>
                      </Stack>
                    ))}

                    {chatLoading && (
                      <Stack direction="row" spacing={1} alignItems="flex-end">
                        <Avatar sx={{ width: 24, height: 24, bgcolor: 'grey.200', flexShrink: 0 }}>
                          <IconRobot size={14} />
                        </Avatar>
                        <Box
                          sx={{
                            px: 2,
                            py: 1.5,
                            borderRadius: '14px 14px 14px 4px',
                            bgcolor: '#ffffff',
                            border: '1px solid',
                            borderColor: 'divider',
                          }}
                        >
                          {provider === 'collaborative' ? (
                            <Box sx={{ minWidth: 240 }}>
                              <Stepper activeStep={collabStep} sx={{ mb: 1, '& .MuiStepLabel-label': { fontSize: '0.7rem' } }}>
                                <Step><StepLabel>Gemini — Analisando</StepLabel></Step>
                                <Step><StepLabel>OpenAI — Planejando</StepLabel></Step>
                                <Step><StepLabel>Claude — Refinando</StepLabel></Step>
                              </Stepper>
                              <LinearProgress
                                variant="indeterminate"
                                color={collabStep === 0 ? 'primary' : collabStep === 1 ? 'warning' : 'secondary'}
                                sx={{ height: 3, borderRadius: 1 }}
                              />
                            </Box>
                          ) : (
                            <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                              {[0, 1, 2].map((i) => (
                                <Box
                                  key={i}
                                  sx={{
                                    width: 6,
                                    height: 6,
                                    borderRadius: '50%',
                                    bgcolor: 'grey.400',
                                    animation: 'chatBounce 1.4s infinite ease-in-out both',
                                    animationDelay: `${i * 0.16}s`,
                                    '@keyframes chatBounce': {
                                      '0%, 80%, 100%': { transform: 'scale(0.6)', opacity: 0.4 },
                                      '40%': { transform: 'scale(1)', opacity: 1 },
                                    },
                                  }}
                                />
                              ))}
                            </Box>
                          )}
                        </Box>
                      </Stack>
                    )}
                  </>
                )}
                <div ref={messagesEndRef} />
              </Box>

              {/* Input */}
              <Stack
                direction="row"
                spacing={1}
                alignItems="flex-end"
                sx={{ px: 2, py: 1.5, borderTop: '1px solid', borderColor: 'divider', flexShrink: 0 }}
              >
                <TextField
                  multiline
                  maxRows={3}
                  placeholder={chatMode === 'command' ? 'Ex: Criar briefing para Instagram...' : 'Pergunte algo sobre o cliente...'}
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={handleChatKeyDown}
                  disabled={chatLoading}
                  fullWidth
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', bgcolor: 'grey.50' } }}
                />
                <IconButton
                  onClick={sendChat}
                  disabled={chatLoading || !chatInput.trim()}
                  sx={{
                    bgcolor: 'primary.main',
                    color: '#ffffff',
                    width: 36,
                    height: 36,
                    flexShrink: 0,
                    '&:hover': { bgcolor: 'primary.dark' },
                    '&.Mui-disabled': { bgcolor: 'grey.200', color: 'grey.400' },
                  }}
                >
                  <IconSend size={16} />
                </IconButton>
              </Stack>
            </Card>

            <Card variant="outlined">
              <CardContent>
                <Stack direction="row" spacing={1} alignItems="center">
                  <IconRobot size={18} />
                  <Typography variant="overline" color="text.secondary">
                    Pilares e posicionamento
                  </Typography>
                </Stack>
                <Stack spacing={1} sx={{ mt: 2 }}>
                  {(data.pillars || DEFAULT_PILLARS).map((pillar) => (
                    <Box key={pillar.id} sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                      <Typography variant="subtitle2">{pillar.title}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {pillar.description}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
}
