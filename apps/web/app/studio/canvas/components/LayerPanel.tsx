'use client';

import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Slider from '@mui/material/Slider';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import {
  IconX, IconEye, IconEyeOff, IconTrash,
  IconArrowUp, IconArrowDown, IconTypography,
  IconPhoto, IconShape, IconHandClick,
} from '@tabler/icons-react';
import type { LayoutLayer } from '../types';

const EDRO_ORANGE = '#E85219';
const BORDER = '#2a2a2a';

type Props = {
  layers: LayoutLayer[];
  selectedLayerId: string | null;
  onSelect: (id: string) => void;
  onClose: () => void;
  onDelete: (id: string) => void;
  onReorder: (id: string, dir: 'up' | 'down') => void;
  onUpdateLayer: (id: string, updates: Partial<LayoutLayer>) => void;
  onUpdateStyle: (id: string, style: Partial<LayoutLayer['style']>) => void;
};

function layerIcon(type: LayoutLayer['type']) {
  switch (type) {
    case 'image': return <IconPhoto size={12} />;
    case 'logo': return <IconPhoto size={12} />;
    case 'text': return <IconTypography size={12} />;
    case 'cta_button': return <IconHandClick size={12} />;
    case 'shape': return <IconShape size={12} />;
    default: return <IconShape size={12} />;
  }
}

function layerLabel(layer: LayoutLayer) {
  if (layer.id === 'bg_image') return 'Background';
  if (layer.type === 'text') return layer.content?.slice(0, 20) || 'Texto';
  if (layer.type === 'cta_button') return layer.content || 'CTA';
  if (layer.type === 'logo') return 'Logo';
  if (layer.type === 'shape') return 'Shape';
  return layer.id;
}

const inputSx = {
  '& .MuiOutlinedInput-root': {
    fontSize: '0.7rem', color: '#ccc',
    '& .MuiOutlinedInput-notchedOutline': { borderColor: '#333' },
    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: EDRO_ORANGE },
  },
};

export default function LayerPanel({
  layers, selectedLayerId, onSelect, onClose,
  onDelete, onReorder, onUpdateLayer, onUpdateStyle,
}: Props) {
  const selected = layers.find(l => l.id === selectedLayerId);
  const sortedLayers = [...layers].sort((a, b) => b.zIndex - a.zIndex);

  return (
    <Box sx={{ width: 240, borderLeft: `1px solid ${BORDER}`, bgcolor: '#161616', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
      {/* Header */}
      <Box sx={{ px: 1.5, py: 1, borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="caption" sx={{ color: '#aaa', fontWeight: 700, fontSize: '0.75rem' }}>Layers</Typography>
        <IconButton size="small" onClick={onClose} sx={{ color: '#666' }}><IconX size={12} /></IconButton>
      </Box>

      {/* Layer list */}
      <Box sx={{ flex: selected ? 'none' : 1, maxHeight: selected ? 200 : undefined, overflowY: 'auto', p: 1 }}>
        <Stack spacing={0.5}>
          {sortedLayers.map(layer => (
            <Box
              key={layer.id}
              onClick={() => onSelect(layer.id)}
              sx={{
                display: 'flex', alignItems: 'center', gap: 0.75, px: 0.75, py: 0.5,
                borderRadius: 1, cursor: 'pointer',
                bgcolor: selectedLayerId === layer.id ? `${EDRO_ORANGE}15` : 'transparent',
                border: selectedLayerId === layer.id ? `1px solid ${EDRO_ORANGE}40` : '1px solid transparent',
                '&:hover': { bgcolor: '#1e1e1e' },
              }}
            >
              <Box sx={{ color: '#666', flexShrink: 0 }}>{layerIcon(layer.type)}</Box>
              <Typography variant="caption" sx={{
                color: '#ccc', fontSize: '0.7rem', flex: 1,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {layerLabel(layer)}
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.25, flexShrink: 0 }}>
                <IconButton size="small" onClick={e => { e.stopPropagation(); onReorder(layer.id, 'up'); }} sx={{ color: '#555', p: 0.25 }}>
                  <IconArrowUp size={10} />
                </IconButton>
                <IconButton size="small" onClick={e => { e.stopPropagation(); onReorder(layer.id, 'down'); }} sx={{ color: '#555', p: 0.25 }}>
                  <IconArrowDown size={10} />
                </IconButton>
              </Box>
            </Box>
          ))}
        </Stack>
      </Box>

      {/* Properties panel for selected layer */}
      {selected && (
        <Box sx={{ borderTop: `1px solid ${BORDER}`, flex: 1, overflowY: 'auto', p: 1.5 }}>
          <Typography variant="caption" sx={{ color: '#888', fontWeight: 700, fontSize: '0.7rem', mb: 1, display: 'block' }}>
            Propriedades — {layerLabel(selected)}
          </Typography>
          <Stack spacing={1}>
            {/* Content (for text/cta) */}
            {(selected.type === 'text' || selected.type === 'cta_button') && (
              <TextField
                size="small"
                label="Texto"
                value={selected.content ?? ''}
                onChange={e => onUpdateLayer(selected.id, { content: e.target.value })}
                multiline
                maxRows={3}
                sx={inputSx}
                InputLabelProps={{ sx: { fontSize: '0.7rem', color: '#666' } }}
              />
            )}

            {/* Font size */}
            {(selected.type === 'text' || selected.type === 'cta_button') && (
              <Box>
                <Typography variant="caption" sx={{ color: '#666', fontSize: '0.6rem' }}>
                  Fonte: {selected.style.fontSize ?? 16}px
                </Typography>
                <Slider
                  size="small" min={10} max={120}
                  value={selected.style.fontSize ?? 16}
                  onChange={(_, v) => onUpdateStyle(selected.id, { fontSize: v as number })}
                  sx={{ color: EDRO_ORANGE, '& .MuiSlider-thumb': { width: 10, height: 10 } }}
                />
              </Box>
            )}

            {/* Font weight */}
            {(selected.type === 'text' || selected.type === 'cta_button') && (
              <Select
                size="small"
                value={selected.style.fontWeight ?? 400}
                onChange={e => onUpdateStyle(selected.id, { fontWeight: Number(e.target.value) })}
                sx={{ fontSize: '0.7rem', color: '#ccc', '& .MuiOutlinedInput-notchedOutline': { borderColor: '#333' } }}
              >
                <MenuItem value={300}>Light (300)</MenuItem>
                <MenuItem value={400}>Regular (400)</MenuItem>
                <MenuItem value={600}>Semi-Bold (600)</MenuItem>
                <MenuItem value={700}>Bold (700)</MenuItem>
                <MenuItem value={800}>Extra-Bold (800)</MenuItem>
                <MenuItem value={900}>Black (900)</MenuItem>
              </Select>
            )}

            {/* Text color */}
            {(selected.type === 'text' || selected.type === 'cta_button') && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="caption" sx={{ color: '#666', fontSize: '0.6rem' }}>Cor</Typography>
                <input
                  type="color"
                  value={selected.style.color ?? '#ffffff'}
                  onChange={e => onUpdateStyle(selected.id, { color: e.target.value })}
                  style={{ width: 24, height: 24, border: 'none', background: 'none', cursor: 'pointer' }}
                />
                <Typography variant="caption" sx={{ color: '#555', fontSize: '0.6rem' }}>
                  {selected.style.color ?? '#ffffff'}
                </Typography>
              </Box>
            )}

            {/* Background color (shape/cta) */}
            {(selected.type === 'shape' || selected.type === 'cta_button') && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="caption" sx={{ color: '#666', fontSize: '0.6rem' }}>Fundo</Typography>
                <input
                  type="color"
                  value={selected.style.backgroundColor?.replace(/rgba?\([^)]+\)/, '#000000') ?? '#000000'}
                  onChange={e => onUpdateStyle(selected.id, { backgroundColor: e.target.value })}
                  style={{ width: 24, height: 24, border: 'none', background: 'none', cursor: 'pointer' }}
                />
              </Box>
            )}

            {/* Text align */}
            {(selected.type === 'text' || selected.type === 'cta_button') && (
              <Select
                size="small"
                value={selected.style.textAlign ?? 'left'}
                onChange={e => onUpdateStyle(selected.id, { textAlign: e.target.value as 'left' | 'center' | 'right' })}
                sx={{ fontSize: '0.7rem', color: '#ccc', '& .MuiOutlinedInput-notchedOutline': { borderColor: '#333' } }}
              >
                <MenuItem value="left">Esquerda</MenuItem>
                <MenuItem value="center">Centro</MenuItem>
                <MenuItem value="right">Direita</MenuItem>
              </Select>
            )}

            {/* Opacity */}
            <Box>
              <Typography variant="caption" sx={{ color: '#666', fontSize: '0.6rem' }}>
                Opacidade: {Math.round((selected.opacity ?? 1) * 100)}%
              </Typography>
              <Slider
                size="small" min={0} max={1} step={0.05}
                value={selected.opacity ?? 1}
                onChange={(_, v) => onUpdateLayer(selected.id, { opacity: v as number })}
                sx={{ color: EDRO_ORANGE, '& .MuiSlider-thumb': { width: 10, height: 10 } }}
              />
            </Box>

            {/* Delete */}
            {selected.id !== 'bg_image' && (
              <Tooltip title="Excluir layer">
                <IconButton
                  size="small"
                  onClick={() => onDelete(selected.id)}
                  sx={{ color: '#666', '&:hover': { color: '#ff4444' }, alignSelf: 'flex-start' }}
                >
                  <IconTrash size={14} />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
        </Box>
      )}
    </Box>
  );
}
