'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiGet, apiPatch, apiPost, buildApiUrl } from '@/lib/api';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import LinearProgress from '@mui/material/LinearProgress';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { IconFileUpload, IconLink, IconRobot, IconSend } from '@tabler/icons-react';

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
    if (!token) return;
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
      if (!response.ok) throw new Error('Falha ao enviar o arquivo.');
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
      await apiPost(`/clients/${clientId}/library/link`, { url: referenceUrl });
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
    const payload = {
      clientId,
      provider,
      mode: chatMode,
      conversationId,
      message: chatInput,
    };

    setChatMessages((prev) => [
      ...prev,
      { role: 'user', content: chatInput, timestamp: new Date().toISOString() },
    ]);
    setChatInput('');

    try {
      const response = await apiPost<{ data?: { reply?: ChatMessage; conversationId?: string } }>(
        '/planning/chat',
        payload
      );
      if (response?.data?.conversationId) {
        setConversationId(response.data.conversationId);
      }
      if (response?.data?.reply) {
        setChatMessages((prev) => [...prev, response.data.reply as ChatMessage]);
      }
    } catch (err) {
      setChatMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Erro ao conversar com a IA.', timestamp: new Date().toISOString() },
      ]);
    } finally {
      setChatLoading(false);
    }
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
            <Card variant="outlined">
              <CardContent>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                  <Typography variant="overline" color="text.secondary">
                    Chat IA
                  </Typography>
                  <Chip size="small" label={chatMode === 'command' ? 'Comandos' : 'Chat'} />
                </Stack>

                <Tabs
                  value={chatMode}
                  onChange={(_, value) => setChatMode(value)}
                  variant="fullWidth"
                  sx={{ mb: 2 }}
                >
                  <Tab value="command" label="Comandos" />
                  <Tab value="chat" label="Chat" />
                </Tabs>

                <TextField
                  select
                  label="Modelo"
                  value={provider}
                  onChange={(event) => setProvider(event.target.value)}
                  sx={{ mb: 2 }}
                >
                  {providers.length ? (
                    providers.map((option) => (
                      <MenuItem key={option.id} value={option.id}>
                        {option.name}
                      </MenuItem>
                    ))
                  ) : (
                    <MenuItem value="openai">OpenAI</MenuItem>
                  )}
                </TextField>

                <Stack spacing={1} sx={{ maxHeight: 320, overflowY: 'auto', mb: 2 }}>
                  {chatMessages.length ? (
                    chatMessages.map((msg, idx) => (
                      <Box
                        key={`${msg.timestamp}-${idx}`}
                        sx={{
                          p: 1.5,
                          borderRadius: 2,
                          bgcolor: msg.role === 'user' ? 'primary.light' : 'grey.100',
                        }}
                      >
                        <Typography variant="caption" color="text.secondary">
                          {msg.role === 'user' ? 'Você' : 'IA'} · {formatDate(msg.timestamp)}
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 0.5 }}>
                          {msg.content}
                        </Typography>
                      </Box>
                    ))
                  ) : (
                    <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
                      Sem mensagens ainda. Comece a conversar.
                    </Typography>
                  )}
                </Stack>

                <Stack direction="row" spacing={1}>
                  <TextField
                    placeholder="Escreva um comando ou pergunte algo..."
                    value={chatInput}
                    onChange={(event) => setChatInput(event.target.value)}
                    fullWidth
                  />
                  <Button
                    variant="contained"
                    onClick={sendChat}
                    disabled={chatLoading}
                    startIcon={<IconSend size={16} />}
                  >
                    {chatLoading ? 'Enviando' : 'Enviar'}
                  </Button>
                </Stack>
              </CardContent>
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
