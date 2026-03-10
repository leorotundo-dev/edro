'use client';

import { useRef, useCallback, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { IconBrush } from '@tabler/icons-react';
import LayerRenderer from './LayerRenderer';
import type { LayoutLayer } from '../types';

type Props = {
  layers: LayoutLayer[];
  canvasWidth: number;
  canvasHeight: number;
  backgroundColor: string;
  selectedLayerId: string | null;
  onSelectLayer: (id: string | null) => void;
  onContentChange: (id: string, content: string) => void;
  onDragEnd: (id: string, x: number, y: number) => void;
  onResizeEnd: (id: string, width: number, height: number) => void;
  /** Ref to the canvas container for export */
  exportRef?: React.RefObject<HTMLDivElement | null>;
};

const VIEWPORT_BG = '#0a0a0a';

export default function CanvasViewport({
  layers, canvasWidth, canvasHeight, backgroundColor,
  selectedLayerId, onSelectLayer, onContentChange,
  onDragEnd, onResizeEnd, exportRef,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0 });

  // Fit canvas to viewport
  const getScale = useCallback(() => {
    const container = containerRef.current;
    if (!container) return 1;
    const maxW = container.clientWidth - 80;
    const maxH = container.clientHeight - 80;
    return Math.min(maxW / canvasWidth, maxH / canvasHeight, 1);
  }, [canvasWidth, canvasHeight]);

  const scale = getScale() * zoom;
  const displayW = canvasWidth * scale;
  const displayH = canvasHeight * scale;

  // ── Zoom via wheel ──────────────────────────────────────
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      setZoom(z => Math.max(0.1, Math.min(5, z - e.deltaY * 0.002)));
    }
  }, []);

  // ── Pan ─────────────────────────────────────────────────
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Middle-click or alt+click to pan
    if (e.button === 1 || e.altKey) {
      setIsPanning(true);
      panStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
      e.preventDefault();
    }
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      setPan({ x: e.clientX - panStart.current.x, y: e.clientY - panStart.current.y });
    }
  }, [isPanning]);

  const handleMouseUp = useCallback(() => { setIsPanning(false); }, []);

  // Click on empty space deselects
  const handleBackgroundClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onSelectLayer(null);
  }, [onSelectLayer]);

  const sortedLayers = [...layers].sort((a, b) => a.zIndex - b.zIndex);
  const hasLayers = layers.length > 0;

  return (
    <Box
      ref={containerRef}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      sx={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden', bgcolor: VIEWPORT_BG,
        cursor: isPanning ? 'grabbing' : 'default',
        position: 'relative',
      }}
    >
      {hasLayers ? (
        <Box
          sx={{
            transform: `translate(${pan.x}px, ${pan.y}px)`,
            transition: isPanning ? 'none' : 'transform 0.1s',
          }}
        >
          {/* The actual canvas — this is what gets exported */}
          <Box
            ref={exportRef}
            onClick={handleBackgroundClick}
            sx={{
              position: 'relative',
              width: displayW,
              height: displayH,
              backgroundColor,
              overflow: 'hidden',
              borderRadius: '4px',
              boxShadow: '0 8px 60px rgba(0,0,0,0.6)',
            }}
          >
            {sortedLayers.map(layer => (
              <LayerRenderer
                key={layer.id}
                layer={layer}
                canvasWidth={displayW}
                canvasHeight={displayH}
                selected={selectedLayerId === layer.id}
                onSelect={onSelectLayer}
                onContentChange={onContentChange}
                onDragEnd={onDragEnd}
                onResizeEnd={onResizeEnd}
              />
            ))}
          </Box>
        </Box>
      ) : (
        <Box sx={{ textAlign: 'center', color: '#444' }}>
          <IconBrush size={72} style={{ opacity: 0.2, marginBottom: 20 }} />
          <Typography variant="h6" sx={{ color: '#444', fontWeight: 600 }}>Seu canvas</Typography>
          <Typography variant="body2" sx={{ color: '#3a3a3a', maxWidth: 400 }}>
            Use &quot;Gerar Peça&quot; ou descreva o que quer no chat.
          </Typography>
        </Box>
      )}
    </Box>
  );
}
