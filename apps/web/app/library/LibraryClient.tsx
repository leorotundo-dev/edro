'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { apiGet, apiPatch, apiPost, buildApiUrl } from '@/lib/api';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Grid from '@mui/material/Grid';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { IconUpload, IconNote, IconLink } from '@tabler/icons-react';

type ClientRow = {
  id: string;
  name: string;
  country?: string | null;
  uf?: string | null;
  city?: string | null;
  segment_primary?: string | null;
};

type LibraryItem = {
  id: string;
  type: string;
  title: string;
  category: string;
  weight: string;
  use_in_ai: boolean;
  status: string;
};

type LibraryClientProps = {
  clientId?: string;
  noShell?: boolean;
};

export default function LibraryClient({ clientId, noShell }: LibraryClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [selectedClient, setSelectedClient] = useState<ClientRow | null>(null);
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteSubmitting, setNoteSubmitting] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkTitle, setLinkTitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkSubmitting, setLinkSubmitting] = useState(false);

  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const lockedClientId = clientId || searchParams.get('clientId') || '';

  const CATEGORIES = [
    { value: '', label: 'Todas as categorias' },
    { value: 'brandbook', label: 'Brandbooks' },
    { value: 'logo', label: 'Logos' },
    { value: 'guidelines', label: 'Guidelines' },
    { value: 'asset', label: 'Brand Assets' },
    { value: 'planning', label: 'Planning' },
    { value: 'reference', label: 'Referências' },
    { value: 'general', label: 'Geral' },
  ];
  const isLocked = Boolean(lockedClientId);

  const loadClient = useCallback(async (id: string) => {
    setLoading(true);
    setError('');
    try {
      const response = await apiGet(`/clients/${id}`);
      if (response?.id) {
        setSelectedClient(response);
        setClients([response]);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load client.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadClients = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiGet('/clients');
      setClients(response || []);
      if (response?.length) {
        const desired = lockedClientId;
        const match = desired ? response.find((client: ClientRow) => client.id === desired) : null;
        setSelectedClient(match || response[0]);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load clients.');
    } finally {
      setLoading(false);
    }
  }, [lockedClientId]);

  const loadItems = useCallback(async () => {
    if (!selectedClient) return;
    setLoading(true);
    setError('');
    try {
      const qs = new URLSearchParams();
      if (query) qs.set('q', query);
      if (typeFilter) qs.set('type', typeFilter);
      if (categoryFilter) qs.set('category', categoryFilter);
      const response = await apiGet(`/clients/${selectedClient.id}/library?${qs.toString()}`);
      setItems(response || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load library.');
    } finally {
      setLoading(false);
    }
  }, [query, selectedClient, typeFilter, categoryFilter]);

  useEffect(() => {
    if (isLocked && lockedClientId) {
      loadClient(lockedClientId);
    } else {
      loadClients();
    }
  }, [isLocked, lockedClientId, loadClient, loadClients]);

  useEffect(() => {
    if (!selectedClient) return;
    loadItems();
  }, [selectedClient, loadItems]);

  const toggleAI = async (item: LibraryItem) => {
    setError('');
    try {
      await apiPatch(`/library/${item.id}`, { use_in_ai: !item.use_in_ai });
      await loadItems();
    } catch (err: any) {
      setError(err?.message || 'Failed to update item.');
    }
  };

  const createNote = () => {
    if (!selectedClient) return;
    setNoteTitle('');
    setNoteContent('');
    setNoteDialogOpen(true);
  };

  const handleSubmitNote = async () => {
    if (!selectedClient || !noteTitle.trim()) return;
    setNoteSubmitting(true);
    try {
      await apiPost(`/clients/${selectedClient.id}/library`, {
        type: 'note',
        title: noteTitle.trim(),
        notes: noteContent,
        category: 'general',
        tags: [],
        weight: 'medium',
        use_in_ai: true,
      });
      setNoteDialogOpen(false);
      await loadItems();
    } catch (err: any) {
      setError(err?.message || 'Failed to create note.');
    } finally {
      setNoteSubmitting(false);
    }
  };

  const createLink = () => {
    if (!selectedClient) return;
    setLinkTitle('');
    setLinkUrl('');
    setLinkDialogOpen(true);
  };

  const handleSubmitLink = async () => {
    if (!selectedClient || !linkTitle.trim() || !linkUrl.trim()) return;
    setLinkSubmitting(true);
    try {
      await apiPost(`/clients/${selectedClient.id}/library`, {
        type: 'link',
        title: linkTitle.trim(),
        source_url: linkUrl.trim(),
        category: 'general',
        tags: [],
        weight: 'medium',
        use_in_ai: true,
      });
      setLinkDialogOpen(false);
      await loadItems();
    } catch (err: any) {
      setError(err?.message || 'Failed to create link.');
    } finally {
      setLinkSubmitting(false);
    }
  };

  const uploadFile = async (file: File) => {
    if (!selectedClient) return;

    const form = new FormData();
    form.append('file', file);

    const response = await fetch(buildApiUrl(`/clients/${selectedClient.id}/library/upload`), {
      method: 'POST',
      body: form,
    });

    if (!response.ok) {
      setError('Failed to upload file.');
      return;
    }

    await loadItems();
  };

  const openFile = async (itemId: string, title: string) => {
    setError('');

    try {
      const response = await fetch(buildApiUrl(`/library/${itemId}/file`));
      if (!response.ok) throw new Error('Failed to open file.');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = title || 'library-file';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err?.message || 'Failed to open file.');
    }
  };

  const fileCount = useMemo(() => items.filter((item) => item.type === 'file').length, [items]);
  const noteCount = useMemo(() => items.filter((item) => item.type === 'note').length, [items]);
  const linkCount = useMemo(() => items.filter((item) => item.type === 'link').length, [items]);
  const aiEnabledCount = useMemo(() => items.filter((item) => item.use_in_ai).length, [items]);

  if (loading && clients.length === 0) {
    return (
      <Stack alignItems="center" justifyContent="center" sx={{ minHeight: 300 }}>
        <CircularProgress size={28} />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Loading library...
        </Typography>
      </Stack>
    );
  }

  const content = (
    <Stack spacing={3}>
      {error ? (
        <Card variant="outlined">
          <CardContent>
            <Typography color="error">{error}</Typography>
          </CardContent>
        </Card>
      ) : null}

      <Card
        variant="outlined"
        sx={{
          borderRadius: 3,
          background:
            'linear-gradient(135deg, rgba(93,135,255,0.10) 0%, rgba(93,135,255,0.03) 55%, rgba(15,23,42,0.02) 100%)',
        }}
      >
        <CardContent sx={{ p: '24px !important' }}>
          <Stack spacing={2.25}>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip label="Biblioteca" color="primary" size="small" sx={{ fontWeight: 700 }} />
              <Chip label={`${items.length} ativos`} size="small" variant="outlined" />
              {selectedClient?.name ? (
                <Chip label={selectedClient.name} size="small" variant="outlined" />
              ) : (
                <Chip label="Visão global" size="small" variant="outlined" />
              )}
            </Stack>

            <Box>
              <Typography variant="h4" fontWeight={800} sx={{ mb: 0.5 }}>
                Biblioteca de referências
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Um repositório só para brandbooks, notas, links e materiais que precisam entrar
                no contexto da agência e dos clientes.
              </Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(4, minmax(0, 1fr))' },
          gap: 1.5,
        }}
      >
        {[
          { label: 'Arquivos', value: fileCount, helper: 'brandbooks e anexos', color: '#5D87FF' },
          { label: 'Notas', value: noteCount, helper: 'contexto textual salvo', color: '#13DEB9' },
          { label: 'Links', value: linkCount, helper: 'URLs e referências externas', color: '#E85219' },
          { label: 'IA ligada', value: aiEnabledCount, helper: 'ativos usados no contexto', color: '#7B61FF' },
        ].map((item) => (
          <Card key={item.label} variant="outlined" sx={{ borderRadius: 3, height: '100%' }}>
            <CardContent sx={{ p: '18px !important' }}>
              <Stack spacing={1.25}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                    {item.label}
                  </Typography>
                  <Box
                    sx={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      bgcolor: item.color,
                      boxShadow: `0 0 0 6px ${alpha(item.color, 0.12)}`,
                    }}
                  />
                </Stack>
                <Typography variant="h4" fontWeight={800}>
                  {item.value}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {item.helper}
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Box>

      {/* Upload area */}
      <Card
        variant="outlined"
        sx={{
          border: '2px dashed',
          borderColor: 'divider',
          textAlign: 'center',
          p: 5,
          cursor: 'pointer',
          '&:hover': { borderColor: 'primary.main' },
        }}
      >
        <CardContent>
          <Box
            sx={{
              width: 64,
              height: 64,
              bgcolor: 'warning.light',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 2,
            }}
          >
            <IconUpload size={32} />
          </Box>
          <Typography variant="h6" sx={{ mb: 0.5 }}>
            Subir materiais de referência
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Arraste arquivos para cá ou selecione do computador. Suporta PDF, PNG, JPG e MP4.
          </Typography>
          <Button variant="contained" component="label" startIcon={<IconUpload size={18} />}>
            Selecionar arquivos
            <input
              type="file"
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) uploadFile(file);
              }}
            />
          </Button>
          <Stack direction="row" spacing={2} justifyContent="center" sx={{ mt: 2 }}>
            <Button size="small" variant="text" startIcon={<IconNote size={14} />} onClick={createNote}>
              Nova nota
            </Button>
            <Button size="small" variant="text" startIcon={<IconLink size={14} />} onClick={createLink}>
              Novo link
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card variant="outlined">
        <CardContent>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={2}
            alignItems={{ xs: 'stretch', md: 'center' }}
            justifyContent="space-between"
          >
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }}>
              <TextField
                size="small"
                placeholder="Buscar referências..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                sx={{ minWidth: 200 }}
              />
              <TextField
                select
                size="small"
                value={selectedClient?.id || ''}
                onChange={(event) => {
                  const match = clients.find((client) => client.id === event.target.value) || null;
                  setSelectedClient(match);
                  if (match) router.replace(`/library?clientId=${match.id}`);
                }}
                disabled={isLocked}
                sx={{ minWidth: 160 }}
              >
                {clients.map((client) => (
                  <MenuItem key={client.id} value={client.id}>
                    {client.name}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                size="small"
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value)}
                sx={{ minWidth: 120 }}
              >
                <MenuItem value="">Tipo</MenuItem>
                <MenuItem value="file">Arquivo</MenuItem>
                <MenuItem value="note">Nota</MenuItem>
                <MenuItem value="link">Link</MenuItem>
              </TextField>
              <TextField
                select
                size="small"
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
                sx={{ minWidth: 160 }}
              >
                {CATEGORIES.map((cat) => (
                  <MenuItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
            <Typography variant="overline" color="text.secondary">
              {items.length} itens
            </Typography>
          </Stack>
        </CardContent>
      </Card>

      {/* Table */}
      <Card variant="outlined">
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Ativo</TableCell>
                <TableCell>Cliente</TableCell>
                <TableCell>Categoria</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Peso</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Typography variant="subtitle2">{item.title}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {item.type === 'file' ? 'Arquivo' : item.type === 'note' ? 'Nota' : 'Link'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {selectedClient?.name || 'Global'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {item.category || 'Geral'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip size="small" label={item.status || 'ready'} />
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {item.weight || 'medium'}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => openFile(item.id, item.title)}
                      >
                        Abrir
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => toggleAI(item)}
                      >
                        {item.use_in_ai ? 'Desligar IA' : 'Ligar IA'}
                      </Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        {items.length === 0 ? (
          <Box sx={{ px: 3, py: 5 }}>
            <Typography variant="body2" color="text.secondary">
              Nenhum ativo cadastrado ainda.
            </Typography>
          </Box>
        ) : null}
      </Card>
    </Stack>
  );

  const noteDialog = (
    <Dialog open={noteDialogOpen} onClose={() => setNoteDialogOpen(false)} maxWidth="xs" fullWidth>
      <DialogTitle>Nova nota</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Título"
            value={noteTitle}
            onChange={(e) => setNoteTitle(e.target.value)}
            autoFocus
            fullWidth
          />
          <TextField
            label="Conteúdo"
            value={noteContent}
            onChange={(e) => setNoteContent(e.target.value)}
            multiline
            rows={3}
            fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setNoteDialogOpen(false)}>Cancelar</Button>
        <Button
          variant="contained"
          onClick={handleSubmitNote}
          disabled={noteSubmitting || !noteTitle.trim()}
        >
          {noteSubmitting ? <CircularProgress size={16} /> : 'Criar'}
        </Button>
      </DialogActions>
    </Dialog>
  );

  const linkDialog = (
    <Dialog open={linkDialogOpen} onClose={() => setLinkDialogOpen(false)} maxWidth="xs" fullWidth>
      <DialogTitle>Novo link</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Título"
            value={linkTitle}
            onChange={(e) => setLinkTitle(e.target.value)}
            autoFocus
            fullWidth
          />
          <TextField
            label="URL"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://"
            fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setLinkDialogOpen(false)}>Cancelar</Button>
        <Button
          variant="contained"
          onClick={handleSubmitLink}
          disabled={linkSubmitting || !linkTitle.trim() || !linkUrl.trim()}
        >
          {linkSubmitting ? <CircularProgress size={16} /> : 'Criar'}
        </Button>
      </DialogActions>
    </Dialog>
  );

  if (noShell) {
    return <>{content}{noteDialog}{linkDialog}</>;
  }

  return (
    <AppShell
      title="Biblioteca"
      topbarLeft={
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="body2" color="text.secondary">Studio</Typography>
          <Typography variant="body2" color="text.secondary">/</Typography>
          <Typography variant="body2" fontWeight={600}>Biblioteca</Typography>
        </Stack>
      }
    >
      {content}
      {noteDialog}
      {linkDialog}
    </AppShell>
  );
}
