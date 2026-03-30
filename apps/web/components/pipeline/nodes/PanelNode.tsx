'use client';
import { useState } from 'react';
import { NodeResizer, type NodeProps } from '@xyflow/react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import { IconPencil, IconDownload } from '@tabler/icons-react';
import { useCanvasContext } from '../CanvasContext';

export default function PanelNode({ id, data }: NodeProps) {
  const [label, setLabel] = useState((data as any).label ?? 'Grupo');
  const [editing, setEditing] = useState(false);
  const [hovered, setHovered] = useState(false);
  const { runNode, selectedNodeIds } = useCanvasContext();

  const isSelected = selectedNodeIds.includes(id);

  return (
    <Box
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      sx={{
        width: '100%',
        height: '100%',
        bgcolor: 'rgba(93,135,255,0.03)',
        border: `1.5px dashed ${
          hovered || isSelected
            ? 'rgba(93,135,255,0.5)'
            : 'rgba(93,135,255,0.2)'
        }`,
        borderRadius: '16px',
        transition: 'border-color 0.2s',
        position: 'relative',
      }}
    >
      <NodeResizer
        minWidth={300}
        minHeight={200}
        isVisible={hovered || isSelected}
        lineStyle={{ border: '1px solid rgba(93,135,255,0.4)' }}
        handleStyle={{
          background: '#5D87FF',
          width: 8,
          height: 8,
          borderRadius: 2,
          border: 'none',
        }}
      />

      {/* Header — floats above the top border */}
      <Stack
        direction="row"
        alignItems="center"
        spacing={0.75}
        sx={{
          position: 'absolute',
          top: -28,
          left: 0,
          bgcolor: 'rgba(93,135,255,0.1)',
          border: '1px solid rgba(93,135,255,0.25)',
          borderRadius: '8px 8px 0 0',
          px: 1,
          py: 0.4,
          opacity: hovered || isSelected ? 1 : 0.6,
          transition: 'opacity 0.2s',
          // Prevent ReactFlow from treating the header as a drag handle for the
          // nodes inside — let the panel itself remain draggable instead.
          pointerEvents: 'auto',
        }}
      >
        {/* Label — double-click to edit */}
        {editing ? (
          <TextField
            size="small"
            autoFocus
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onBlur={() => setEditing(false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') setEditing(false);
            }}
            sx={{
              '& .MuiInputBase-input': {
                fontSize: '0.62rem',
                py: 0.25,
                px: 0.5,
                color: '#5D87FF',
              },
              width: 120,
            }}
          />
        ) : (
          <Typography
            onDoubleClick={() => setEditing(true)}
            sx={{
              fontSize: '0.62rem',
              fontWeight: 700,
              color: '#5D87FF',
              cursor: 'text',
              userSelect: 'none',
            }}
          >
            {label}
          </Typography>
        )}

        {/* Edit label */}
        <Tooltip title="Editar label" placement="top" arrow>
          <IconButton
            size="small"
            onClick={() => setEditing(true)}
            sx={{ p: 0.2, color: '#5D87FF66', '&:hover': { color: '#5D87FF' } }}
          >
            <IconPencil size={10} />
          </IconButton>
        </Tooltip>

        {/* Export group results */}
        <Tooltip title="Exportar resultados do grupo" placement="top" arrow>
          <IconButton
            size="small"
            sx={{ p: 0.2, color: '#5D87FF66', '&:hover': { color: '#5D87FF' } }}
          >
            <IconDownload size={10} />
          </IconButton>
        </Tooltip>
      </Stack>
    </Box>
  );
}
