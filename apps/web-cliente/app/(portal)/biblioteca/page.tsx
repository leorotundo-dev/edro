'use client';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import useSWR from 'swr';
import { swrFetcher } from '@/lib/api';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import { IconBooks, IconDownload, IconFileText, IconPhoto, IconFolder, IconBrandInstagram } from '@tabler/icons-react';

// NEW backend endpoint — GET /portal/client/library
type LibraryItem = {
  id: string;
  title: string;
  type: 'delivery' | 'brand' | 'campaign' | 'document';
  file_url?: string | null;
  mime_type?: string | null;
  created_at: string;
  tags?: string[];
  campaign_name?: string | null;
};

const TYPE_META: Record<string, { label: string; color: 'default' | 'primary' | 'secondary' | 'info' | 'success' }> = {
  delivery:  { label: 'Entrega', color: 'primary' },
  brand:     { label: 'Marca', color: 'secondary' },
  campaign:  { label: 'Campanha', color: 'info' },
  document:  { label: 'Documento', color: 'default' },
};

function getFileIcon(mimeType?: string | null) {
  if (!mimeType) return <IconFileText size={18} />;
  if (mimeType.startsWith('image/')) return <IconPhoto size={18} />;
  if (mimeType === 'application/pdf') return <IconFileText size={18} />;
  return <IconFileText size={18} />;
}

export default function BibliotecaPage() {
  const [tab, setTab] = useState(0);

  // NEW endpoint: GET /portal/client/library
  const { data, isLoading } = useSWR<{ items: LibraryItem[] }>('/portal/client/library', swrFetcher);
  const items = data?.items ?? [];

  const tabFilters: Array<LibraryItem['type'] | 'all'> = ['all', 'delivery', 'brand', 'campaign', 'document'];
  const activeFilter = tabFilters[tab];
  const filtered = activeFilter === 'all' ? items : items.filter(i => i.type === activeFilter);

  return (
    <Stack spacing={3}>
      <Stack direction="row" spacing={1.5} alignItems="center">
        <Box sx={{ p: 1.5, bgcolor: 'secondary.light', borderRadius: 2, color: 'secondary.dark', display: 'flex' }}>
          <IconBooks size={22} />
        </Box>
        <Box>
          <Typography variant="overline" color="text.secondary">Biblioteca</Typography>
          <Typography variant="h4" sx={{ mt: 0 }}>Biblioteca da conta</Typography>
        </Box>
      </Stack>
      <Typography variant="body1" color="text.secondary">
        Entregas aprovadas, ativos de marca, documentos e campanhas — a memória da conta em um só lugar.
      </Typography>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tab label="Todos" />
        <Tab label="Entregas" />
        <Tab label="Marca" />
        <Tab label="Campanhas" />
        <Tab label="Documentos" />
      </Tabs>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={24} /></Box>
      ) : filtered.length === 0 ? (
        <Card variant="outlined" sx={{ borderRadius: 3 }}>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center' }}>
              <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 3 }}>
                <IconFolder size={32} color="#9ca3af" />
              </Box>
            </Box>
            <Typography variant="h6" gutterBottom>
              {activeFilter === 'all' ? 'Biblioteca vazia' : `Nenhum item de ${TYPE_META[activeFilter]?.label ?? activeFilter}`}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Os arquivos e entregas da conta aparecerão aqui conforme forem sendo produzidos e aprovados.
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={2}>
          {filtered.map((item) => {
            const meta = TYPE_META[item.type] ?? TYPE_META.document;
            const isImage = item.mime_type?.startsWith('image/');
            return (
              <Grid key={item.id} size={{ xs: 12, sm: 6, md: 4 }}>
                <Card
                  variant="outlined"
                  sx={{
                    borderRadius: 3,
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    '&:hover': { boxShadow: 2 },
                    transition: 'box-shadow 0.2s',
                  }}
                >
                  {isImage && item.file_url && (
                    <Box
                      component="img"
                      src={item.file_url}
                      alt={item.title}
                      sx={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: '12px 12px 0 0' }}
                    />
                  )}
                  <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
                        <Box sx={{ color: 'text.secondary', flexShrink: 0 }}>
                          {getFileIcon(item.mime_type)}
                        </Box>
                        <Typography variant="subtitle2" noWrap>{item.title}</Typography>
                      </Stack>
                      <Chip label={meta.label} color={meta.color} size="small" sx={{ flexShrink: 0 }} />
                    </Stack>

                    {item.campaign_name && (
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <IconBrandInstagram size={12} color="#9ca3af" />
                        <Typography variant="caption" color="text.secondary">{item.campaign_name}</Typography>
                      </Stack>
                    )}

                    {item.tags && item.tags.length > 0 && (
                      <Stack direction="row" flexWrap="wrap" gap={0.5}>
                        {item.tags.slice(0, 3).map(tag => (
                          <Chip key={tag} label={tag} size="small" variant="outlined" />
                        ))}
                      </Stack>
                    )}

                    <Box sx={{ mt: 'auto', pt: 1 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="caption" color="text.secondary">
                          {new Date(item.created_at).toLocaleDateString('pt-BR')}
                        </Typography>
                        {item.file_url && (
                          <Button
                            size="small"
                            startIcon={<IconDownload size={14} />}
                            href={item.file_url}
                            target="_blank"
                            rel="noreferrer"
                            variant="outlined"
                          >
                            Baixar
                          </Button>
                        )}
                      </Stack>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}
    </Stack>
  );
}
