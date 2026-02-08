'use client';

import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { IconFileUpload, IconLink, IconPlus } from '@tabler/icons-react';

export type LibraryItem = {
  id: string;
  type: string;
  title: string;
  status?: string;
  created_at?: string;
  file_size_bytes?: number;
  source_url?: string;
};

export type ClippingItem = {
  id: string;
  title: string;
  excerpt?: string;
  score: number;
  published_at?: string;
};

type InsumosListProps = {
  clientId: string;
  libraryItems: LibraryItem[];
  clippingItems?: ClippingItem[];
  libraryLoading: boolean;
  libraryError?: string;
  uploading: boolean;
  onUploadFile: (file: File) => void;
  onAddReference: (url: string) => void;
  onAddToContext?: (item: LibraryItem | ClippingItem) => void;
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
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

export default function InsumosList({
  libraryItems,
  clippingItems = [],
  libraryLoading,
  libraryError,
  uploading,
  onUploadFile,
  onAddReference,
  onAddToContext,
}: InsumosListProps) {
  const [activeTab, setActiveTab] = useState<'library' | 'clipping'>('library');
  const [referenceUrl, setReferenceUrl] = useState('');

  const handleAddReference = () => {
    if (referenceUrl.trim()) {
      onAddReference(referenceUrl.trim());
      setReferenceUrl('');
    }
  };

  return (
    <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="overline" color="text.secondary">
            Insumos e referências
          </Typography>
          <Chip
            size="small"
            label={activeTab === 'library' ? `${libraryItems.length} itens` : `${clippingItems.length} matches`}
          />
        </Stack>

        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          sx={{ mb: 2, minHeight: 36, '& .MuiTab-root': { minHeight: 36, py: 0.5 } }}
        >
          <Tab value="library" label="Library" />
          <Tab value="clipping" label="Clipping" />
        </Tabs>

        {libraryError && <Typography color="error" variant="body2" sx={{ mb: 2 }}>{libraryError}</Typography>}

        {activeTab === 'library' && (
          <Stack spacing={2} sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <Button
              variant="outlined"
              size="small"
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
                  if (file) onUploadFile(file);
                }}
              />
            </Button>

            <TextField
              size="small"
              label="Link de referência"
              value={referenceUrl}
              onChange={(e) => setReferenceUrl(e.target.value)}
              placeholder="https://..."
              InputProps={{
                endAdornment: (
                  <Button
                    size="small"
                    variant="contained"
                    onClick={handleAddReference}
                    disabled={uploading || !referenceUrl.trim()}
                    startIcon={<IconLink size={14} />}
                  >
                    Add
                  </Button>
                ),
              }}
            />

            <Divider />

            <Box sx={{ flex: 1, overflowY: 'auto', pr: 1 }}>
              {libraryLoading ? (
                <LinearProgress />
              ) : libraryItems.length > 0 ? (
                <Stack spacing={1}>
                  {libraryItems.map((item) => (
                    <Stack
                      key={item.id}
                      direction="row"
                      alignItems="center"
                      justifyContent="space-between"
                      spacing={1}
                      sx={{
                        p: 1.5,
                        borderRadius: 2,
                        border: '1px solid',
                        borderColor: 'divider',
                        bgcolor: 'grey.50',
                        '&:hover': { bgcolor: 'grey.100', cursor: 'pointer' },
                      }}
                      onClick={() => onAddToContext?.(item)}
                    >
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="subtitle2" noWrap>
                          {item.title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatDate(item.created_at)} · {formatFileSize(item.file_size_bytes)}
                        </Typography>
                      </Box>
                      <Chip size="small" label={item.type} />
                    </Stack>
                  ))}
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
                  Nenhum material enviado ainda.
                </Typography>
              )}
            </Box>
          </Stack>
        )}

        {activeTab === 'clipping' && (
          <Box sx={{ flex: 1, overflowY: 'auto', pr: 1 }}>
            {clippingItems.length > 0 ? (
              <Stack spacing={1}>
                {clippingItems.map((item) => (
                  <Box
                    key={item.id}
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: 'divider',
                      bgcolor: 'grey.50',
                      '&:hover': { bgcolor: 'grey.100', cursor: 'pointer' },
                    }}
                    onClick={() => onAddToContext?.(item)}
                  >
                    <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1}>
                      <Typography variant="subtitle2" sx={{ flex: 1 }}>
                        {item.title}
                      </Typography>
                      <Chip
                        size="small"
                        label={item.score}
                        color={item.score > 90 ? 'success' : item.score > 80 ? 'warning' : 'default'}
                      />
                    </Stack>
                    {item.excerpt && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: 'block', mt: 0.5, lineHeight: 1.4 }}
                      >
                        {item.excerpt.slice(0, 120)}...
                      </Typography>
                    )}
                    <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 0.5 }}>
                      {formatDate(item.published_at)}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
                Nenhum clipping recente.
              </Typography>
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
