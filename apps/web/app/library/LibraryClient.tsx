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

  const createNote = async () => {
    if (!selectedClient) return;
    const title = window.prompt('Note title:');
    if (!title) return;
    const notes = window.prompt('Note content:') || '';
    try {
      await apiPost(`/clients/${selectedClient.id}/library`, {
        type: 'note',
        title,
        notes,
        category: 'general',
        tags: [],
        weight: 'medium',
        use_in_ai: true,
      });
      await loadItems();
    } catch (err: any) {
      setError(err?.message || 'Failed to create note.');
    }
  };

  const createLink = async () => {
    if (!selectedClient) return;
    const title = window.prompt('Link title:');
    if (!title) return;
    const sourceUrl = window.prompt('URL:');
    if (!sourceUrl) return;
    try {
      await apiPost(`/clients/${selectedClient.id}/library`, {
        type: 'link',
        title,
        source_url: sourceUrl,
        category: 'general',
        tags: [],
        weight: 'medium',
        use_in_ai: true,
      });
      await loadItems();
    } catch (err: any) {
      setError(err?.message || 'Failed to create link.');
    }
  };

  const uploadFile = async (file: File) => {
    if (!selectedClient) return;
    const token = typeof window !== 'undefined' ? localStorage.getItem('edro_token') : null;
    if (!token) return;

    const form = new FormData();
    form.append('file', file);

    const response = await fetch(buildApiUrl(`/clients/${selectedClient.id}/library/upload`), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: form,
    });

    if (!response.ok) {
      setError('Failed to upload file.');
      return;
    }

    await loadItems();
  };

  const openFile = async (itemId: string, title: string) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('edro_token') : null;
    if (!token) return;
    setError('');

    try {
      const response = await fetch(buildApiUrl(`/library/${itemId}/file`), {
        headers: { Authorization: `Bearer ${token}` },
      });
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

  const totalLabel = useMemo(() => `Showing ${items.length} files`, [items.length]);

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

      <Box>
        <Typography variant="h4">Global Reference Library Hub</Typography>
        <Typography variant="body2" color="text.secondary">
          Centralized repository for operational assets, brand guidelines, and reference materials.
        </Typography>
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
            Upload Reference Materials
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Drag and drop your documents here, or browse from your computer. Supports PDF, PNG, JPG, and MP4.
          </Typography>
          <Button variant="contained" component="label" startIcon={<IconUpload size={18} />}>
            Select Files
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
              New note
            </Button>
            <Button size="small" variant="text" startIcon={<IconLink size={14} />} onClick={createLink}>
              New link
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
                placeholder="Search references..."
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
                <MenuItem value="">File Type</MenuItem>
                <MenuItem value="file">File</MenuItem>
                <MenuItem value="note">Note</MenuItem>
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
              {totalLabel}
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
                <TableCell>File Name</TableCell>
                <TableCell>Client Association</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Weight</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Typography variant="subtitle2">{item.title}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {item.type}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {selectedClient?.name || 'Global'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {item.category || 'General'}
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
                        Open
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => toggleAI(item)}
                      >
                        {item.use_in_ai ? 'Disable AI' : 'Enable AI'}
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
              No documents added yet.
            </Typography>
          </Box>
        ) : null}
      </Card>
    </Stack>
  );

  if (noShell) {
    return content;
  }

  return (
    <AppShell
      title="Library"
      topbarLeft={
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="body2" color="text.secondary">Studio</Typography>
          <Typography variant="body2" color="text.secondary">/</Typography>
          <Typography variant="body2" fontWeight={600}>Global Reference Library</Typography>
        </Stack>
      }
    >
      {content}
    </AppShell>
  );
}
