'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { apiGet, buildApiUrl } from '@/lib/api';
import Avatar from '@mui/material/Avatar';
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
import {
  IconUpload,
  IconRefresh,
  IconFileTypePdf,
  IconPhoto,
  IconVideo,
  IconFileDescription,
  IconFile,
} from '@tabler/icons-react';

type LibraryFile = {
  id: string;
  filename: string;
  original_filename?: string;
  file_type?: string;
  mime_type?: string;
  size?: number;
  client_id?: string;
  client_name?: string;
  category?: string;
  created_at?: string;
  url?: string;
};

type Client = {
  id: string;
  name: string;
};

function getFileIconProps(file: LibraryFile): { icon: React.ReactNode; bgcolor: string } {
  const mime = file.mime_type?.toLowerCase() || '';
  const ext = file.filename?.split('.').pop()?.toLowerCase() || '';
  if (mime.includes('pdf') || ext === 'pdf')
    return { icon: <IconFileTypePdf size={20} />, bgcolor: '#fee2e2' };
  if (mime.includes('image') || ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext))
    return { icon: <IconPhoto size={20} />, bgcolor: '#dbeafe' };
  if (mime.includes('video') || ['mp4', 'mov', 'avi', 'webm'].includes(ext))
    return { icon: <IconVideo size={20} />, bgcolor: '#f3e8ff' };
  if (['doc', 'docx', 'txt'].includes(ext))
    return { icon: <IconFileDescription size={20} />, bgcolor: '#fef9c3' };
  return { icon: <IconFile size={20} />, bgcolor: '#f1f5f9' };
}

function formatSize(bytes?: number) {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function GlobalLibraryClient() {
  const [files, setFiles] = useState<LibraryFile[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [filesRes, clientsRes] = await Promise.all([
        apiGet<{ files: LibraryFile[] }>('/library'),
        apiGet<Client[]>('/clients'),
      ]);
      setFiles(filesRes?.files || []);
      setClients(clientsRes || []);
    } catch {
      setFiles([]);
      setClients([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList?.length) return;

    setUploading(true);
    try {
      const formData = new FormData();
      Array.from(fileList).forEach((file) => formData.append('files', file));

      const token = typeof window !== 'undefined' ? localStorage.getItem('edro_token') : null;
      await fetch(buildApiUrl('/library/upload'), {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      loadData();
    } catch {
      // ignore
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const filteredFiles = files.filter((file) => {
    if (search && !file.filename?.toLowerCase().includes(search.toLowerCase())) return false;
    if (clientFilter && file.client_id !== clientFilter) return false;
    if (typeFilter) {
      const { bgcolor } = getFileIconProps(file);
      if (typeFilter === 'pdf' && bgcolor !== '#fee2e2') return false;
      if (typeFilter === 'image' && bgcolor !== '#dbeafe') return false;
      if (typeFilter === 'video' && bgcolor !== '#f3e8ff') return false;
    }
    return true;
  });

  return (
    <Stack spacing={3}>
      {/* Header */}
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} spacing={2}>
        <Box>
          <Typography variant="h4">Global Reference Library</Typography>
          <Typography variant="body2" color="text.secondary">
            Centralize arquivos, guidelines e referencias para todos os times.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<IconUpload size={18} />}
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? 'Enviando...' : 'Enviar arquivos'}
        </Button>
      </Stack>

      <Grid container spacing={3}>
        {/* Sidebar */}
        <Grid size={{ xs: 12, md: 4, lg: 3 }}>
          <Stack spacing={2}>
            {/* Upload card */}
            <Card
              variant="outlined"
              sx={{
                cursor: 'pointer',
                border: '2px dashed',
                borderColor: 'divider',
                textAlign: 'center',
                p: 3,
                '&:hover': { borderColor: 'primary.main' },
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <CardContent>
                <input ref={fileInputRef} type="file" multiple hidden onChange={handleUpload} />
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    bgcolor: 'warning.light',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mx: 'auto',
                    mb: 1.5,
                  }}
                >
                  <IconUpload size={24} />
                </Box>
                <Typography variant="subtitle2">Upload rapido</Typography>
                <Typography variant="caption" color="text.secondary">
                  Arraste ou clique para enviar PDFs, imagens e videos.
                </Typography>
                <Typography
                  variant="caption"
                  color="primary"
                  display="block"
                  sx={{ mt: 1, fontWeight: 600 }}
                >
                  {uploading ? 'Enviando...' : 'Selecionar'}
                </Typography>
              </CardContent>
            </Card>

            {/* Filters card */}
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Filtros
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 2 }} display="block">
                  Refine por cliente e tipo de arquivo.
                </Typography>
                <Stack spacing={2}>
                  <TextField
                    size="small"
                    label="Buscar"
                    placeholder="Buscar arquivos..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    fullWidth
                  />
                  <TextField
                    select
                    size="small"
                    label="Cliente"
                    value={clientFilter}
                    onChange={(e) => setClientFilter(e.target.value)}
                    fullWidth
                  >
                    <MenuItem value="">Todos os clientes</MenuItem>
                    {clients.map((client) => (
                      <MenuItem key={client.id} value={client.id}>
                        {client.name}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    select
                    size="small"
                    label="Tipo"
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    fullWidth
                  >
                    <MenuItem value="">Todos os tipos</MenuItem>
                    <MenuItem value="pdf">PDF</MenuItem>
                    <MenuItem value="image">Imagem</MenuItem>
                    <MenuItem value="video">Video</MenuItem>
                  </TextField>
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Grid>

        {/* Content */}
        <Grid size={{ xs: 12, md: 8, lg: 9 }}>
          <Stack spacing={2}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="body2" color="text.secondary">
                Mostrando {filteredFiles.length} arquivos
              </Typography>
              <Button variant="outlined" size="small" startIcon={<IconRefresh size={16} />} onClick={loadData}>
                Atualizar
              </Button>
            </Stack>

            {loading ? (
              <Card variant="outlined">
                <CardContent>
                  <Stack alignItems="center" sx={{ py: 4 }}>
                    <CircularProgress size={28} />
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                      Carregando arquivos...
                    </Typography>
                  </Stack>
                </CardContent>
              </Card>
            ) : filteredFiles.length === 0 ? (
              <Card variant="outlined">
                <CardContent sx={{ textAlign: 'center', py: 6 }}>
                  <Typography variant="h6" sx={{ mb: 1 }}>
                    Nenhum arquivo encontrado
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Faca upload para comecar ou ajuste os filtros.
                  </Typography>
                </CardContent>
              </Card>
            ) : (
              <Card variant="outlined">
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Arquivo</TableCell>
                        <TableCell>Cliente</TableCell>
                        <TableCell>Categoria</TableCell>
                        <TableCell>Tamanho</TableCell>
                        <TableCell>Acoes</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredFiles.map((file) => {
                        const { icon, bgcolor } = getFileIconProps(file);
                        return (
                          <TableRow key={file.id}>
                            <TableCell>
                              <Stack direction="row" spacing={1.5} alignItems="center">
                                <Avatar sx={{ bgcolor, width: 36, height: 36 }}>{icon}</Avatar>
                                <Box>
                                  <Typography variant="subtitle2">
                                    {file.original_filename || file.filename}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {file.file_type || 'Arquivo'}
                                  </Typography>
                                </Box>
                              </Stack>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" color="text.secondary">
                                {file.client_name || 'Global'}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip size="small" label={file.category || 'General'} variant="outlined" />
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" color="text.secondary">
                                {formatSize(file.size)}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              {file.url ? (
                                <Button
                                  size="small"
                                  variant="text"
                                  href={file.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  Download
                                </Button>
                              ) : (
                                <Typography variant="body2" color="text.secondary">
                                  --
                                </Typography>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Card>
            )}
          </Stack>
        </Grid>
      </Grid>
    </Stack>
  );
}
