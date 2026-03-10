'use client';

import { useState, useCallback, useRef } from 'react';
import type { LayoutLayer, GeneratedLayout } from '../types';

type HistorySnapshot = {
  layers: LayoutLayer[];
  backgroundColor: string;
  compositionType: string;
};

export function useCanvasLayers() {
  const [layers, setLayers] = useState<LayoutLayer[]>([]);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [backgroundColor, setBackgroundColor] = useState('#000000');
  const [compositionType, setCompositionType] = useState('');
  const [canvasSize, setCanvasSize] = useState({ width: 1080, height: 1080 });

  // ── History ──────────────────────────────────────────────
  const historyRef = useRef<HistorySnapshot[]>([]);
  const historyIdxRef = useRef(-1);

  const pushSnapshot = useCallback(() => {
    const snap: HistorySnapshot = {
      layers: layers.map(l => ({ ...l, style: { ...l.style } })),
      backgroundColor,
      compositionType,
    };
    historyRef.current = historyRef.current.slice(0, historyIdxRef.current + 1);
    historyRef.current.push(snap);
    historyIdxRef.current++;
    if (historyRef.current.length > 50) {
      historyRef.current.shift();
      historyIdxRef.current--;
    }
  }, [layers, backgroundColor, compositionType]);

  const undo = useCallback(() => {
    if (historyIdxRef.current <= 0) return;
    historyIdxRef.current--;
    const snap = historyRef.current[historyIdxRef.current];
    setLayers(snap.layers);
    setBackgroundColor(snap.backgroundColor);
    setCompositionType(snap.compositionType);
  }, []);

  const redo = useCallback(() => {
    if (historyIdxRef.current >= historyRef.current.length - 1) return;
    historyIdxRef.current++;
    const snap = historyRef.current[historyIdxRef.current];
    setLayers(snap.layers);
    setBackgroundColor(snap.backgroundColor);
    setCompositionType(snap.compositionType);
  }, []);

  // ── Load from GeneratedLayout ────────────────────────────
  const loadLayout = useCallback((layout: GeneratedLayout) => {
    setLayers(layout.layers);
    setBackgroundColor(layout.backgroundColor);
    setCompositionType(layout.compositionType);
    setCanvasSize({ width: layout.width, height: layout.height });
    setSelectedLayerId(null);
    // Push initial snapshot
    historyRef.current = [{
      layers: layout.layers.map(l => ({ ...l, style: { ...l.style } })),
      backgroundColor: layout.backgroundColor,
      compositionType: layout.compositionType,
    }];
    historyIdxRef.current = 0;
  }, []);

  // ── Layer mutations ──────────────────────────────────────
  const updateLayer = useCallback((id: string, updates: Partial<LayoutLayer>) => {
    pushSnapshot();
    setLayers(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
  }, [pushSnapshot]);

  const updateLayerStyle = useCallback((id: string, styleUpdates: Partial<LayoutLayer['style']>) => {
    pushSnapshot();
    setLayers(prev => prev.map(l =>
      l.id === id ? { ...l, style: { ...l.style, ...styleUpdates } } : l
    ));
  }, [pushSnapshot]);

  const moveLayer = useCallback((id: string, x: number, y: number) => {
    pushSnapshot();
    setLayers(prev => prev.map(l =>
      l.id === id ? { ...l, x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)) } : l
    ));
  }, [pushSnapshot]);

  const resizeLayer = useCallback((id: string, width: number, height: number) => {
    pushSnapshot();
    setLayers(prev => prev.map(l =>
      l.id === id ? { ...l, width: Math.min(1, width), height: Math.min(1, height) } : l
    ));
  }, [pushSnapshot]);

  const updateContent = useCallback((id: string, content: string) => {
    pushSnapshot();
    setLayers(prev => prev.map(l =>
      l.id === id ? { ...l, content } : l
    ));
  }, [pushSnapshot]);

  const deleteLayer = useCallback((id: string) => {
    pushSnapshot();
    setLayers(prev => prev.filter(l => l.id !== id));
    if (selectedLayerId === id) setSelectedLayerId(null);
  }, [pushSnapshot, selectedLayerId]);

  const reorderLayer = useCallback((id: string, direction: 'up' | 'down') => {
    pushSnapshot();
    setLayers(prev => {
      const idx = prev.findIndex(l => l.id === id);
      if (idx < 0) return prev;
      const target = direction === 'up' ? idx + 1 : idx - 1;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      // Swap zIndex
      const tmpZ = next[idx].zIndex;
      next[idx] = { ...next[idx], zIndex: next[target].zIndex };
      next[target] = { ...next[target], zIndex: tmpZ };
      return next;
    });
  }, [pushSnapshot]);

  const selectedLayer = layers.find(l => l.id === selectedLayerId) ?? null;

  return {
    layers, selectedLayerId, selectedLayer, backgroundColor, compositionType, canvasSize,
    setSelectedLayerId, loadLayout,
    updateLayer, updateLayerStyle, moveLayer, resizeLayer,
    updateContent, deleteLayer, reorderLayer,
    undo, redo,
    canUndo: historyIdxRef.current > 0,
    canRedo: historyIdxRef.current < historyRef.current.length - 1,
  };
}
