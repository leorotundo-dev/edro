'use client';

import { useRef, useCallback } from 'react';
import Box from '@mui/material/Box';
import type { LayoutLayer } from '../types';

type Props = {
  layer: LayoutLayer;
  canvasWidth: number;
  canvasHeight: number;
  selected: boolean;
  onSelect: (id: string) => void;
  onContentChange: (id: string, content: string) => void;
  onDragEnd: (id: string, x: number, y: number) => void;
  onResizeEnd: (id: string, width: number, height: number) => void;
};

export default function LayerRenderer({
  layer, canvasWidth, canvasHeight, selected,
  onSelect, onContentChange, onDragEnd, onResizeEnd,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const dragState = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const resizeState = useRef<{ startX: number; startY: number; origW: number; origH: number } | null>(null);

  const left = layer.x * canvasWidth;
  const top = layer.y * canvasHeight;
  const w = layer.width * canvasWidth;
  const h = layer.height * canvasHeight;

  // ── Drag ─────────────────────────────────────────────────
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (layer.type === 'image' && !selected) {
      onSelect(layer.id);
      return;
    }
    e.stopPropagation();
    onSelect(layer.id);
    dragState.current = {
      startX: e.clientX, startY: e.clientY,
      origX: layer.x, origY: layer.y,
    };

    const handleMove = (ev: MouseEvent) => {
      if (!dragState.current) return;
      const dx = (ev.clientX - dragState.current.startX) / canvasWidth;
      const dy = (ev.clientY - dragState.current.startY) / canvasHeight;
      const el = ref.current;
      if (el) {
        el.style.left = `${(dragState.current.origX + dx) * canvasWidth}px`;
        el.style.top = `${(dragState.current.origY + dy) * canvasHeight}px`;
      }
    };
    const handleUp = (ev: MouseEvent) => {
      if (dragState.current) {
        const dx = (ev.clientX - dragState.current.startX) / canvasWidth;
        const dy = (ev.clientY - dragState.current.startY) / canvasHeight;
        onDragEnd(layer.id, dragState.current.origX + dx, dragState.current.origY + dy);
      }
      dragState.current = null;
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  }, [layer, selected, canvasWidth, canvasHeight, onSelect, onDragEnd]);

  // ── Resize handle ────────────────────────────────────────
  const handleResizeDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    resizeState.current = {
      startX: e.clientX, startY: e.clientY,
      origW: layer.width, origH: layer.height,
    };

    const handleMove = (ev: MouseEvent) => {
      if (!resizeState.current) return;
      const dw = (ev.clientX - resizeState.current.startX) / canvasWidth;
      const dh = (ev.clientY - resizeState.current.startY) / canvasHeight;
      const el = ref.current;
      if (el) {
        el.style.width = `${Math.max(20, (resizeState.current.origW + dw) * canvasWidth)}px`;
        el.style.height = `${Math.max(20, (resizeState.current.origH + dh) * canvasHeight)}px`;
      }
    };
    const handleUp = (ev: MouseEvent) => {
      if (resizeState.current) {
        const dw = (ev.clientX - resizeState.current.startX) / canvasWidth;
        const dh = (ev.clientY - resizeState.current.startY) / canvasHeight;
        onResizeEnd(
          layer.id,
          Math.max(0.02, resizeState.current.origW + dw),
          Math.max(0.02, resizeState.current.origH + dh),
        );
      }
      resizeState.current = null;
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  }, [layer, canvasWidth, canvasHeight, onResizeEnd]);

  // ── Inline text edit ─────────────────────────────────────
  const handleBlur = useCallback((e: React.FocusEvent<HTMLDivElement>) => {
    const text = e.currentTarget.textContent || '';
    if (text !== layer.content) onContentChange(layer.id, text);
  }, [layer, onContentChange]);

  const isEditable = layer.type === 'text' || layer.type === 'cta_button';
  const isBackground = layer.id === 'bg_image' || (layer.type === 'image' && layer.x === 0 && layer.y === 0 && layer.width === 1 && layer.height === 1);

  // ── Render based on type ─────────────────────────────────
  const commonSx = {
    position: 'absolute' as const,
    left, top, width: w, height: h,
    zIndex: layer.zIndex,
    opacity: layer.opacity ?? 1,
    transform: layer.rotation ? `rotate(${layer.rotation}deg)` : undefined,
    outline: selected ? '2px solid #E85219' : 'none',
    outlineOffset: selected ? 1 : 0,
    cursor: isBackground ? 'default' : 'move',
    transition: 'outline 0.1s',
    boxSizing: 'border-box' as const,
  };

  if (layer.type === 'image' || layer.type === 'logo') {
    return (
      <Box
        ref={ref}
        onMouseDown={isBackground ? undefined : handleMouseDown}
        sx={commonSx}
      >
        {layer.imageUrl && (
          <Box
            component="img"
            src={layer.imageUrl}
            alt={layer.id}
            sx={{
              width: '100%', height: '100%',
              objectFit: layer.type === 'logo' ? 'contain' : 'cover',
              borderRadius: layer.style.borderRadius ? `${layer.style.borderRadius}px` : 0,
              pointerEvents: 'none',
              userSelect: 'none',
            }}
          />
        )}
        {selected && !isBackground && (
          <Box
            onMouseDown={handleResizeDown}
            sx={{
              position: 'absolute', right: -5, bottom: -5,
              width: 10, height: 10, bgcolor: '#E85219',
              borderRadius: '2px', cursor: 'nwse-resize', zIndex: 999,
            }}
          />
        )}
      </Box>
    );
  }

  if (layer.type === 'shape') {
    return (
      <Box
        ref={ref}
        onMouseDown={handleMouseDown}
        sx={{
          ...commonSx,
          backgroundColor: layer.style.backgroundColor ?? 'transparent',
          borderRadius: layer.style.borderRadius ? `${layer.style.borderRadius}px` : 0,
        }}
      />
    );
  }

  // text / cta_button
  return (
    <Box
      ref={ref}
      onMouseDown={handleMouseDown}
      sx={{
        ...commonSx,
        display: 'flex',
        alignItems: layer.type === 'cta_button' ? 'center' : 'flex-start',
        justifyContent: layer.style.textAlign === 'center' ? 'center'
          : layer.style.textAlign === 'right' ? 'flex-end' : 'flex-start',
        backgroundColor: layer.style.backgroundColor ?? 'transparent',
        borderRadius: layer.style.borderRadius ? `${layer.style.borderRadius}px` : 0,
        padding: layer.style.padding ? `${layer.style.padding}px` : 0,
        overflow: 'hidden',
      }}
    >
      <Box
        contentEditable={isEditable && selected}
        suppressContentEditableWarning
        onBlur={handleBlur}
        onClick={(e) => { e.stopPropagation(); onSelect(layer.id); }}
        sx={{
          width: '100%',
          fontFamily: layer.style.fontFamily ?? 'Inter, sans-serif',
          fontSize: layer.style.fontSize ? `${layer.style.fontSize}px` : '16px',
          fontWeight: layer.style.fontWeight ?? 400,
          color: layer.style.color ?? '#ffffff',
          textAlign: layer.style.textAlign ?? 'left',
          lineHeight: layer.style.lineHeight ?? 1.2,
          letterSpacing: layer.style.letterSpacing ? `${layer.style.letterSpacing}px` : undefined,
          textTransform: layer.style.textTransform ?? 'none',
          textShadow: layer.style.textShadow,
          outline: 'none',
          cursor: isEditable ? 'text' : 'move',
          userSelect: isEditable && selected ? 'text' : 'none',
          wordBreak: 'break-word',
        }}
      >
        {layer.content ?? ''}
      </Box>
      {selected && (
        <Box
          onMouseDown={handleResizeDown}
          sx={{
            position: 'absolute', right: -5, bottom: -5,
            width: 10, height: 10, bgcolor: '#E85219',
            borderRadius: '2px', cursor: 'nwse-resize', zIndex: 999,
          }}
        />
      )}
    </Box>
  );
}
