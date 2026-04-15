'use client';

import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { IconClockHour4, IconRestore, IconX } from '@tabler/icons-react';

export type CopyVersionDrawerItem = {
  id: string;
  output: string;
  status?: 'draft' | 'approved' | 'rejected' | null;
  score?: number | null;
  feedback?: string | null;
  created_at?: string | null;
  model?: string | null;
  payload?: Record<string, any> | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  versions: CopyVersionDrawerItem[];
  activeId: string | null;
  onRestore: (version: CopyVersionDrawerItem) => void;
};

const STATUS_COLORS: Record<string, 'success' | 'error' | 'default'> = {
  approved: 'success',
  rejected: 'error',
  draft: 'default',
};

const STATUS_LABELS: Record<string, string> = {
  approved: 'Aprovada',
  rejected: 'Rejeitada',
  draft: 'Rascunho',
};

export default function CopyVersionDrawer({
  open,
  onClose,
  versions,
  activeId,
  onRestore,
}: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: 400 } }}>
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <IconClockHour4 size={18} />
          <Typography variant="subtitle1" fontWeight={600}>
            Histórico de versões
          </Typography>
          <Chip size="small" label={versions.length} />
        </Stack>
        <IconButton size="small" onClick={onClose}>
          <IconX size={18} />
        </IconButton>
      </Box>
      <Divider />

      <Stack spacing={0} sx={{ overflow: 'auto', flex: 1 }}>
        {versions.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ p: 3, textAlign: 'center' }}>
            Nenhuma versão gerada ainda.
          </Typography>
        )}
        {versions.map((version, index) => {
          const isActive = version.id === activeId;
          const isExpanded = expandedId === version.id;
          const createdAt = version.created_at ? new Date(version.created_at) : null;
          const label = createdAt
            ? `${String(createdAt.getDate()).padStart(2, '0')}/${String(createdAt.getMonth() + 1).padStart(2, '0')} ${String(createdAt.getHours()).padStart(2, '0')}:${String(createdAt.getMinutes()).padStart(2, '0')}`
            : 'Agora';
          const preview = `${version.output?.slice(0, 120) || ''}${(version.output?.length || 0) > 120 ? '…' : ''}`;

          return (
            <Box
              key={version.id}
              sx={{
                px: 2,
                py: 1.5,
                borderBottom: '1px solid',
                borderColor: 'divider',
                bgcolor: isActive ? 'primary.50' : 'transparent',
                cursor: 'pointer',
                '&:hover': { bgcolor: isActive ? 'primary.50' : 'action.hover' },
              }}
              onClick={() => setExpandedId(isExpanded ? null : version.id)}
            >
              <Stack direction="row" spacing={1} alignItems="flex-start" justifyContent="space-between">
                <Box flex={1} minWidth={0}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5, flexWrap: 'wrap' }}>
                    <Typography variant="caption" color="text.secondary">
                      #{versions.length - index} · {label}
                    </Typography>
                    {version.status && (
                      <Chip
                        size="small"
                        label={STATUS_LABELS[version.status] ?? version.status}
                        color={STATUS_COLORS[version.status] ?? 'default'}
                        sx={{ height: 18, fontSize: 10 }}
                      />
                    )}
                    {isActive && (
                      <Chip
                        size="small"
                        label="Atual"
                        color="primary"
                        variant="outlined"
                        sx={{ height: 18, fontSize: 10 }}
                      />
                    )}
                    {version.score != null && (
                      <Typography variant="caption" color="text.secondary">
                        score {version.score}
                      </Typography>
                    )}
                  </Stack>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      fontSize: 12,
                      lineHeight: 1.4,
                      whiteSpace: isExpanded ? 'pre-wrap' : 'normal',
                      overflow: 'hidden',
                    }}
                  >
                    {isExpanded ? version.output : preview}
                  </Typography>
                  {version.feedback && isExpanded && (
                    <Typography variant="caption" color="warning.main" sx={{ mt: 0.5, display: 'block' }}>
                      Feedback: {version.feedback}
                    </Typography>
                  )}
                </Box>

                {!isActive && (
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<IconRestore size={14} />}
                    sx={{ fontSize: 11, whiteSpace: 'nowrap', flexShrink: 0 }}
                    onClick={(event) => {
                      event.stopPropagation();
                      onRestore(version);
                    }}
                  >
                    Restaurar
                  </Button>
                )}
              </Stack>
            </Box>
          );
        })}
      </Stack>
    </Drawer>
  );
}
