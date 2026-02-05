'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiGet, apiPost, buildApiUrl } from '@/lib/api';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import { IconExternalLink, IconFileDownload, IconFileUpload, IconLink, IconSearch, IconTrash } from '@tabler/icons-react';
import InputAdornment from '@mui/material/InputAdornment';

type LibraryItem = {
  id: string;
  type: string;
  title: string;
  category: string;
  created_at?: string;
  file_size?: number;
  source_url?: string;
};

type ClientLibraryClientProps = {
  clientId: string;
};

function formatFileSize(bytes?: number): string {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function ClientLibraryClient({ clientId }: ClientLibraryClientProps) {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [referenceUrl, setReferenceUrl] = useState('');
  const [socialLink, setSocialLink] = useState('');
  const [uploading, setUploading] = useState(false);
  const [clientName, setClientName] = useState<string>('');

  const CATEGORIES = [
    { value: '', label: 'Todos' },
    { value: 'brand_identity', label: 'Brand Identity' },
    { value: 'social_templates', label: 'Social Templates' },
    { value: 'photography', label: 'Photography' },
    { value: 'guidelines', label: 'Guidelines' },
    { value: 'reference', label: 'References' },
  ];

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const qs = new URLSearchParams();
      if (query) qs.set('q', query);
      if (categoryFilter) qs.set('category', categoryFilter);
      const response = await apiGet(`/clients/${clientId}/library?${qs.toString()}`);
      setItems(response || []);
    } catch (err: any) {
      setError(err?.message || 'Falha ao carregar biblioteca.');
    } finally {
      setLoading(false);
    }
  }, [clientId, query, categoryFilter]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  useEffect(() => {
    apiGet<any>(`/clients/${clientId}`).then((res) => {
      const name = res?.client?.name ?? res?.data?.client?.name ?? res?.data?.name ?? res?.name ?? '';
      setClientName(name);
    }).catch(() => {});
  }, [clientId]);

  const uploadFile = async (file: File) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('edro_token') : null;
    if (!token) return;

    setUploading(true);
    setError('');
    const form = new FormData();
    form.append('file', file);

    try {
      const response = await fetch(buildApiUrl(`/clients/${clientId}/library/upload`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });

      if (!response.ok) throw new Error('Falha ao enviar o arquivo.');
      await loadItems();
    } catch (err: any) {
      setError(err?.message || 'Falha ao enviar o arquivo.');
    } finally {
      setUploading(false);
    }
  };

  const addUrl = async (url: string, type: 'reference' | 'social') => {
    if (!url.trim()) return;
    setError('');
    try {
      await apiPost(`/clients/${clientId}/library`, {
        type: 'link',
        title: url,
        source_url: url,
        category: type === 'social' ? 'social_templates' : 'reference',
        tags: [type],
        weight: 'medium',
        use_in_ai: true,
      });
      if (type === 'reference') setReferenceUrl('');
      else setSocialLink('');
      await loadItems();
    } catch (err: any) {
      setError(err?.message || 'Falha ao adicionar link.');
    }
  };

  const downloadFile = async (itemId: string, title: string) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('edro_token') : null;
    if (!token) return;

    try {
      const response = await fetch(buildApiUrl(`/library/${itemId}/file`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Falha ao baixar o arquivo.');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = title || 'library-file';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err?.message || 'Falha ao baixar o arquivo.');
    }
  };

  const deleteItem = async (itemId: string) => {
    if (!window.confirm('Deseja remover este item?')) return;
    const token = typeof window !== 'undefined' ? localStorage.getItem('edro_token') : null;
    if (!token) return;

    try {
      const response = await fetch(buildApiUrl(`/library/${itemId}`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Falha ao remover item.');
      await loadItems();
    } catch (err: any) {
      setError(err?.message || 'Falha ao remover item.');
    }
  };

  return (
    <Box>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 4 }}>
          <Stack spacing={2}>
            {error ? (
              <Card variant="outlined">
                <CardContent>
                  <Typography color="error">{error}</Typography>
                </CardContent>
              </Card>
            ) : null}

            <Card variant="outlined">
              <CardContent>
                <Typography variant="overline" color="text.secondary">
                  Upload de referências
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Envie brandbooks, logos e ativos usados pela IA.
                </Typography>
                {clientName && (
                  <Alert severity="info" sx={{ mb: 2, py: 0 }}>
                    Enviando para: <strong>{clientName}</strong>
                  </Alert>
                )}
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={<IconFileUpload size={16} />}
                  disabled={uploading}
                >
                  {uploading ? 'Enviando...' : 'Selecionar arquivo'}
                  <input
                    type="file"
                    hidden
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) uploadFile(file);
                    }}
                  />
                </Button>
              </CardContent>
            </Card>

            <Card variant="outlined">
              <CardContent>
                <Typography variant="overline" color="text.secondary">
                  Links externos
                </Typography>
                <Stack spacing={2} sx={{ mt: 2 }}>
                  <TextField
                    label="URL de referência"
                    value={referenceUrl}
                    onChange={(event) => setReferenceUrl(event.target.value)}
                    placeholder="Cole o link principal"
                  />
                  <Button variant="outlined" startIcon={<IconLink size={16} />} onClick={() => addUrl(referenceUrl, 'reference')}>
                    Adicionar link
                  </Button>
                  <Divider />
                  <TextField
                    label="Link social"
                    value={socialLink}
                    onChange={(event) => setSocialLink(event.target.value)}
                    placeholder="Instagram, TikTok, LinkedIn..."
                  />
                  <Button variant="outlined" startIcon={<IconExternalLink size={16} />} onClick={() => addUrl(socialLink, 'social')}>
                    Adicionar social
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Grid>

        <Grid size={{ xs: 12, lg: 8 }}>
          <Stack spacing={2}>
            <Card variant="outlined">
              <CardContent>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }}>
                  <Box>
                    <Typography variant="h6">Biblioteca do cliente</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Organize referências, templates e assets estratégicos.
                    </Typography>
                  </Box>
                  <Chip size="small" label={`${items.length} itens`} />
                </Stack>

                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mt: 2 }}>
                  <TextField
                    placeholder="Buscar assets..."
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <IconSearch size={16} />
                        </InputAdornment>
                      ),
                    }}
                    fullWidth
                  />
                  <TextField
                    select
                    label="Categoria"
                    value={categoryFilter}
                    onChange={(event) => setCategoryFilter(event.target.value)}
                    sx={{ minWidth: 200 }}
                  >
                    {CATEGORIES.map((cat) => (
                      <MenuItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </MenuItem>
                    ))}
                  </TextField>
                  <Button variant="outlined" onClick={loadItems}>
                    Atualizar
                  </Button>
                </Stack>
              </CardContent>
            </Card>

            {loading ? (
              <Card variant="outlined">
                <CardContent>
                  <Stack alignItems="center" spacing={1} sx={{ py: 4 }}>
                    <CircularProgress size={28} />
                    <Typography variant="body2" color="text.secondary">
                      Carregando biblioteca...
                    </Typography>
                  </Stack>
                </CardContent>
              </Card>
            ) : items.length === 0 ? (
              <Card variant="outlined">
                <CardContent sx={{ textAlign: 'center', py: 6 }}>
                  <Typography variant="h6" gutterBottom>
                    Nenhum material cadastrado
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Envie arquivos ou adicione links para começar.
                  </Typography>
                </CardContent>
              </Card>
            ) : (
              <Stack spacing={1}>
                {items.map((item) => (
                  <Card key={item.id} variant="outlined">
                    <CardContent>
                      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between">
                        <Box>
                          <Typography variant="subtitle2">{item.title}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {item.type} · {formatDate(item.created_at)} · {formatFileSize(item.file_size)}
                          </Typography>
                          <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                            <Chip size="small" label={(item.category || 'general').replace(/_/g, ' ')} />
                          </Stack>
                        </Box>
                        <Stack direction="row" spacing={1} alignItems="center">
                          {item.type === 'link' && item.source_url ? (
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<IconExternalLink size={14} />}
                              href={item.source_url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Abrir
                            </Button>
                          ) : (
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<IconFileDownload size={14} />}
                              onClick={() => downloadFile(item.id, item.title)}
                            >
                              Download
                            </Button>
                          )}
                          <Button
                            size="small"
                            color="error"
                            variant="outlined"
                            startIcon={<IconTrash size={14} />}
                            onClick={() => deleteItem(item.id)}
                          >
                            Remover
                          </Button>
                        </Stack>
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            )}
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
}
