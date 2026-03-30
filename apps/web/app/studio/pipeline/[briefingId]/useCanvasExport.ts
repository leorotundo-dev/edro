'use client';
import { useCallback } from 'react';
import { useReactFlow } from '@xyflow/react';

type ExportItem = {
  nodeId: string;
  nodeType: string;
  label: string;
  type: 'image' | 'video' | 'text';
  url?: string;
  text?: string;
};

/**
 * Collects all "done" node outputs and downloads them as a ZIP.
 * Uses JSZip if available, otherwise falls back to sequential individual downloads.
 */
export function useCanvasExport() {
  const { getNodes } = useReactFlow();

  const collectExportItems = useCallback((): ExportItem[] => {
    const nodes = getNodes();
    const items: ExportItem[] = [];

    for (const node of nodes) {
      const d = node.data as Record<string, any>;

      // ArteNode / MultiFormatNode
      if (d.arteImageUrl) {
        items.push({ nodeId: node.id, nodeType: node.type ?? '', label: 'Arte principal', type: 'image', url: d.arteImageUrl });
      }
      if (Array.isArray(d.arteImageUrls)) {
        d.arteImageUrls.forEach((url: string, i: number) => {
          items.push({ nodeId: node.id, nodeType: node.type ?? '', label: `Arte variante ${i + 1}`, type: 'image', url });
        });
      }

      // MediaNode
      if (node.type === 'media' && d.assetUrl) {
        const isVideo = (d.mimeType ?? '').startsWith('video');
        items.push({ nodeId: node.id, nodeType: 'media', label: 'Mídia enviada', type: isVideo ? 'video' : 'image', url: d.assetUrl });
      }

      // CopyNode / AssistantNode — text outputs
      if (d.selectedCopy) {
        const copy = d.selectedCopy as { title?: string; body?: string; cta?: string };
        const text = [copy.title, copy.body, copy.cta].filter(Boolean).join('\n\n');
        if (text) items.push({ nodeId: node.id, nodeType: node.type ?? '', label: 'Copy selecionada', type: 'text', text });
      }
      if (node.type === 'assistant' && d.result) {
        items.push({ nodeId: node.id, nodeType: 'assistant', label: 'Resultado do Assistente', type: 'text', text: d.result });
      }
    }

    return items;
  }, [getNodes]);

  const exportAsZip = useCallback(async () => {
    const items = collectExportItems();
    if (!items.length) {
      alert('Nenhum resultado encontrado para exportar. Complete pelo menos um node de geração.');
      return;
    }

    // Try to use JSZip
    let JSZip: any;
    try {
      JSZip = (await import('jszip')).default;
    } catch {
      JSZip = null;
    }

    if (!JSZip) {
      // Fallback: download each item individually
      for (const item of items) {
        if (item.url) {
          const a = document.createElement('a');
          a.href = item.url;
          a.download = `${item.label.replace(/\s+/g, '-')}-${item.nodeId}.${item.type === 'video' ? 'mp4' : 'jpg'}`;
          a.target = '_blank';
          a.click();
          await new Promise((r) => setTimeout(r, 300));
        } else if (item.text) {
          const blob = new Blob([item.text], { type: 'text/plain' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${item.label.replace(/\s+/g, '-')}-${item.nodeId}.txt`;
          a.click();
          URL.revokeObjectURL(url);
        }
      }
      return;
    }

    const zip = new JSZip();
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    const folder = zip.folder(`studio-export-${timestamp}`);
    if (!folder) return;

    const fetches = items.map(async (item, idx) => {
      const safe = item.label.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-_]/g, '');
      if (item.url) {
        try {
          const res = await fetch(item.url, { mode: 'cors' });
          const blob = await res.blob();
          const ext = item.type === 'video' ? 'mp4' : item.url.includes('.png') ? 'png' : 'jpg';
          folder.file(`${String(idx + 1).padStart(2, '0')}-${safe}.${ext}`, blob);
        } catch {
          // If CORS fails, skip this item silently
        }
      } else if (item.text) {
        folder.file(`${String(idx + 1).padStart(2, '0')}-${safe}.txt`, item.text);
      }
    });

    await Promise.allSettled(fetches);

    const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `studio-export-${timestamp}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  }, [collectExportItems]);

  return { exportAsZip, collectExportItems };
}
