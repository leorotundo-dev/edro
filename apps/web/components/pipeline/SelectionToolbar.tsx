'use client';
import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import Divider from '@mui/material/Divider';
import {
  IconTrash, IconCopy, IconLayoutGrid,
  IconAlignLeft, IconAlignCenter, IconAlignRight,
  IconAlignBoxTopCenter, IconAlignBoxCenterMiddle, IconAlignBoxBottomCenter,
  IconX,
} from '@tabler/icons-react';
import { useReactFlow, type Node } from '@xyflow/react';

interface SelectionToolbarProps {
  selectedNodeIds: string[];
  onClose: () => void;
}

export default function SelectionToolbar({ selectedNodeIds, onClose }: SelectionToolbarProps) {
  const { getNodes, setNodes } = useReactFlow();
  const count = selectedNodeIds.length;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  if (count < 2) return null;

  // ── Bulk delete ──────────────────────────────────────────────────────────────
  const handleDelete = () => {
    setNodes((prev) => prev.filter((n) => !selectedNodeIds.includes(n.id)));
    onClose();
  };

  // ── Bulk duplicate ───────────────────────────────────────────────────────────
  const handleDuplicate = () => {
    const nodes = getNodes();
    const selected = nodes.filter((n) => selectedNodeIds.includes(n.id));
    const copies: Node[] = selected.map((n) => ({
      ...n,
      id: `${n.id}-copy-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      position: { x: n.position.x + 80, y: n.position.y + 80 },
      selected: false,
      data: { ...n.data },
    }));
    setNodes((prev) => [...prev.map((n) => ({ ...n, selected: false })), ...copies]);
    onClose();
  };

  // ── Group in Panel ───────────────────────────────────────────────────────────
  const handleGroup = () => {
    const nodes = getNodes();
    const selected = nodes.filter((n) => selectedNodeIds.includes(n.id));
    if (!selected.length) return;

    const xs = selected.map((n) => n.position.x);
    const ys = selected.map((n) => n.position.y);
    const minX = Math.min(...xs) - 40;
    const minY = Math.min(...ys) - 60;
    const maxX = Math.max(...xs) + 420;
    const maxY = Math.max(...ys) + 260;

    const panelId = `panel-${Date.now()}`;
    const panelNode: Node = {
      id: panelId,
      type: 'panel',
      position: { x: minX, y: minY },
      style: { width: maxX - minX, height: maxY - minY, zIndex: -1 },
      data: { label: 'Grupo' },
      selected: false,
    };

    setNodes((prev) => [
      panelNode,
      ...prev.map((n) =>
        selectedNodeIds.includes(n.id)
          ? { ...n, parentId: panelId, extent: 'parent' as const, position: { x: n.position.x - minX, y: n.position.y - minY } }
          : n
      ),
    ]);
    onClose();
  };

  // ── Alignment helpers ────────────────────────────────────────────────────────
  const align = (axis: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
    const nodes = getNodes();
    const selected = nodes.filter((n) => selectedNodeIds.includes(n.id));
    if (!selected.length) return;

    const xs = selected.map((n) => n.position.x);
    const ys = selected.map((n) => n.position.y);
    const ws = selected.map((n) => (n.measured?.width ?? (n.style?.width as number) ?? 380));
    const hs = selected.map((n) => (n.measured?.height ?? (n.style?.height as number) ?? 200));

    const minX = Math.min(...xs);
    const maxX = Math.max(...xs.map((x, i) => x + ws[i]));
    const midX = (minX + maxX) / 2;

    const minY = Math.min(...ys);
    const maxY = Math.max(...ys.map((y, i) => y + hs[i]));
    const midY = (minY + maxY) / 2;

    setNodes((prev) =>
      prev.map((n) => {
        if (!selectedNodeIds.includes(n.id)) return n;
        const w = n.measured?.width ?? (n.style?.width as number) ?? 380;
        const h = n.measured?.height ?? (n.style?.height as number) ?? 200;
        let x = n.position.x;
        let y = n.position.y;
        if (axis === 'left')   x = minX;
        if (axis === 'center') x = midX - w / 2;
        if (axis === 'right')  x = maxX - w;
        if (axis === 'top')    y = minY;
        if (axis === 'middle') y = midY - h / 2;
        if (axis === 'bottom') y = maxY - h;
        return { ...n, position: { x, y } };
      })
    );
  };

  return (
    <Box
      sx={{
        position: 'absolute', top: 12, left: '50%', transform: `translateX(-50%) translateY(${visible ? 0 : -8}px)`,
        zIndex: 30,
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.15s, transform 0.15s',
        display: 'flex', alignItems: 'center',
        bgcolor: '#111', border: '1px solid #2a2a2a', borderRadius: '20px',
        px: 1, py: 0.5,
        boxShadow: '0 4px 24px rgba(0,0,0,0.7)',
        gap: 0.25,
        pointerEvents: 'all',
      }}
    >
      {/* Count badge */}
      <Box sx={{ px: 0.875, py: 0.25, bgcolor: 'rgba(93,135,255,0.15)', borderRadius: '12px', mr: 0.5 }}>
        <Typography sx={{ fontSize: '0.58rem', color: '#5D87FF', fontWeight: 700 }}>
          {count} selecionados
        </Typography>
      </Box>

      {/* Duplicate */}
      <Tooltip title="Duplicar seleção" placement="bottom" arrow>
        <IconButton size="small" onClick={handleDuplicate}
          sx={{ p: 0.375, color: '#666', '&:hover': { color: '#ccc' } }}>
          <IconCopy size={13} />
        </IconButton>
      </Tooltip>

      {/* Group */}
      <Tooltip title="Agrupar em Panel" placement="bottom" arrow>
        <IconButton size="small" onClick={handleGroup}
          sx={{ p: 0.375, color: '#666', '&:hover': { color: '#5D87FF' } }}>
          <IconLayoutGrid size={13} />
        </IconButton>
      </Tooltip>

      <Divider orientation="vertical" flexItem sx={{ borderColor: '#2a2a2a', mx: 0.25 }} />

      {/* Align H */}
      <Tooltip title="Alinhar à esquerda" placement="bottom" arrow>
        <IconButton size="small" onClick={() => align('left')}
          sx={{ p: 0.375, color: '#666', '&:hover': { color: '#ccc' } }}>
          <IconAlignLeft size={13} />
        </IconButton>
      </Tooltip>
      <Tooltip title="Centralizar horizontalmente" placement="bottom" arrow>
        <IconButton size="small" onClick={() => align('center')}
          sx={{ p: 0.375, color: '#666', '&:hover': { color: '#ccc' } }}>
          <IconAlignCenter size={13} />
        </IconButton>
      </Tooltip>
      <Tooltip title="Alinhar à direita" placement="bottom" arrow>
        <IconButton size="small" onClick={() => align('right')}
          sx={{ p: 0.375, color: '#666', '&:hover': { color: '#ccc' } }}>
          <IconAlignRight size={13} />
        </IconButton>
      </Tooltip>

      <Divider orientation="vertical" flexItem sx={{ borderColor: '#2a2a2a', mx: 0.25 }} />

      {/* Align V */}
      <Tooltip title="Alinhar ao topo" placement="bottom" arrow>
        <IconButton size="small" onClick={() => align('top')}
          sx={{ p: 0.375, color: '#666', '&:hover': { color: '#ccc' } }}>
          <IconAlignBoxTopCenter size={13} />
        </IconButton>
      </Tooltip>
      <Tooltip title="Centralizar verticalmente" placement="bottom" arrow>
        <IconButton size="small" onClick={() => align('middle')}
          sx={{ p: 0.375, color: '#666', '&:hover': { color: '#ccc' } }}>
          <IconAlignBoxCenterMiddle size={13} />
        </IconButton>
      </Tooltip>
      <Tooltip title="Alinhar à base" placement="bottom" arrow>
        <IconButton size="small" onClick={() => align('bottom')}
          sx={{ p: 0.375, color: '#666', '&:hover': { color: '#ccc' } }}>
          <IconAlignBoxBottomCenter size={13} />
        </IconButton>
      </Tooltip>

      <Divider orientation="vertical" flexItem sx={{ borderColor: '#2a2a2a', mx: 0.25 }} />

      {/* Delete */}
      <Tooltip title="Remover selecionados" placement="bottom" arrow>
        <IconButton size="small" onClick={handleDelete}
          sx={{ p: 0.375, color: '#666', '&:hover': { color: '#EF4444' } }}>
          <IconTrash size={13} />
        </IconButton>
      </Tooltip>

      {/* Close */}
      <Tooltip title="Desselecionar" placement="bottom" arrow>
        <IconButton size="small" onClick={onClose}
          sx={{ p: 0.375, color: '#444', '&:hover': { color: '#888' }, ml: 0.25 }}>
          <IconX size={11} />
        </IconButton>
      </Tooltip>
    </Box>
  );
}
