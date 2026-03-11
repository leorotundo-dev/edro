'use client';

import { useState, useCallback, useRef } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import {
  IconX, IconDownload, IconRefresh, IconEye,
  IconLayoutBoard,
} from '@tabler/icons-react';
import type { CampaignPieceResult, GeneratedLayout } from '../types';

const EDRO_ORANGE = '#E85219';
const BORDER = '#2a2a2a';

type Props = {
  campaignName: string;
  pieces: CampaignPieceResult[];
  onOpenPiece: (piece: CampaignPieceResult) => void;
  onRegeneratePiece: (pieceIndex: number) => void;
  onClose: () => void;
  regeneratingIdx: number | null;
};

function MiniCanvas({ piece }: { piece: CampaignPieceResult }) {
  const layout = piece.layout;
  if (!layout?.layers?.length) {
    return (
      <Box sx={{
        width: '100%', aspectRatio: '1', bgcolor: '#1a1a1a',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: 1, border: `1px solid ${BORDER}`,
      }}>
        <Typography variant="caption" sx={{ color: '#555' }}>
          {piece.error ? 'Erro' : 'Vazio'}
        </Typography>
      </Box>
    );
  }

  // Determine aspect ratio for thumbnail
  const ar = layout.width / layout.height;
  const thumbW = 200;
  const thumbH = thumbW / ar;

  const sortedLayers = [...layout.layers].sort((a, b) => a.zIndex - b.zIndex);

  return (
    <Box sx={{
      position: 'relative', width: thumbW, height: thumbH,
      backgroundColor: layout.backgroundColor,
      borderRadius: 1, overflow: 'hidden',
      boxShadow: '0 2px 12px rgba(0,0,0,0.4)',
    }}>
      {sortedLayers.map(layer => {
        const l = layer;
        const left = l.x * thumbW;
        const top = l.y * thumbH;
        const w = l.width * thumbW;
        const h = l.height * thumbH;
        const scale = thumbW / layout.width;

        if (l.type === 'image' || l.type === 'logo') {
          return l.imageUrl ? (
            <Box key={l.id} component="img" src={l.imageUrl} sx={{
              position: 'absolute', left, top, width: w, height: h,
              objectFit: l.type === 'logo' ? 'contain' : 'cover',
              zIndex: l.zIndex, opacity: l.opacity ?? 1,
            }} />
          ) : null;
        }

        if (l.type === 'shape') {
          return (
            <Box key={l.id} sx={{
              position: 'absolute', left, top, width: w, height: h,
              backgroundColor: l.style.backgroundColor ?? 'transparent',
              zIndex: l.zIndex, opacity: l.opacity ?? 1,
              borderRadius: l.style.borderRadius ? `${l.style.borderRadius * scale}px` : 0,
            }} />
          );
        }

        // text / cta_button
        return (
          <Box key={l.id} sx={{
            position: 'absolute', left, top, width: w, height: h,
            zIndex: l.zIndex, opacity: l.opacity ?? 1,
            display: 'flex', alignItems: l.type === 'cta_button' ? 'center' : 'flex-start',
            justifyContent: l.style.textAlign === 'center' ? 'center'
              : l.style.textAlign === 'right' ? 'flex-end' : 'flex-start',
            backgroundColor: l.style.backgroundColor ?? 'transparent',
            borderRadius: l.style.borderRadius ? `${l.style.borderRadius * scale}px` : 0,
            padding: l.style.padding ? `${l.style.padding * scale}px` : 0,
            overflow: 'hidden',
          }}>
            <Typography sx={{
              fontFamily: l.style.fontFamily ?? 'Inter, sans-serif',
              fontSize: `${(l.style.fontSize ?? 16) * scale}px`,
              fontWeight: l.style.fontWeight ?? 400,
              color: l.style.color ?? '#ffffff',
              textAlign: l.style.textAlign ?? 'left',
              lineHeight: l.style.lineHeight ?? 1.2,
              textTransform: l.style.textTransform ?? 'none',
              textShadow: l.style.textShadow,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              wordBreak: 'break-word',
            }}>
              {l.content ?? ''}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
}

export default function CampaignCanvasView({
  campaignName, pieces, onOpenPiece, onRegeneratePiece,
  onClose, regeneratingIdx,
}: Props) {
  const [exporting, setExporting] = useState(false);

  const handleExportAll = useCallback(async () => {
    setExporting(true);
    try {
      const validPieces = pieces.filter(p => p.image_url && !p.error);
      for (let i = 0; i < validPieces.length; i++) {
        const p = validPieces[i];
        const res = await fetch(p.image_url!);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${campaignName.replace(/[^a-zA-Z0-9]/g, '_')}_${p.format.replace(/[^a-zA-Z0-9]/g, '')}_${i + 1}.png`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        // Small delay between downloads to avoid browser throttling
        if (i < validPieces.length - 1) await new Promise(r => setTimeout(r, 300));
      }
    } catch { /* silent */ } finally {
      setExporting(false);
    }
  }, [pieces, campaignName]);

  return (
    <Box sx={{
      position: 'fixed', inset: 0, zIndex: 1300,
      bgcolor: 'rgba(0,0,0,0.85)', display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <Box sx={{
        display: 'flex', alignItems: 'center', px: 3, py: 1.5,
        borderBottom: `1px solid ${BORDER}`,
      }}>
        <IconLayoutBoard size={20} style={{ color: EDRO_ORANGE, marginRight: 8 }} />
        <Typography variant="subtitle1" sx={{ color: '#eee', fontWeight: 700, flex: 1 }}>
          {campaignName} — {pieces.length} peças
        </Typography>
        <Chip
          label={`${pieces.filter(p => !p.error).length}/${pieces.length} geradas`}
          size="small"
          sx={{ bgcolor: `${EDRO_ORANGE}20`, color: EDRO_ORANGE, mr: 2 }}
        />
        <Tooltip title="Baixar todas as peças">
          <IconButton
            onClick={handleExportAll}
            disabled={exporting || !pieces.some(p => p.image_url)}
            sx={{ color: EDRO_ORANGE, mr: 1 }}
          >
            {exporting ? <CircularProgress size={16} sx={{ color: EDRO_ORANGE }} /> : <IconDownload size={18} />}
          </IconButton>
        </Tooltip>
        <IconButton onClick={onClose} sx={{ color: '#666' }}>
          <IconX size={18} />
        </IconButton>
      </Box>

      {/* Grid of pieces */}
      <Box sx={{
        flex: 1, overflowY: 'auto', p: 3,
        display: 'flex', flexWrap: 'wrap', gap: 3,
        justifyContent: 'center', alignContent: 'flex-start',
      }}>
        {pieces.map((piece, i) => (
          <Box key={i} sx={{
            display: 'flex', flexDirection: 'column', gap: 1,
            alignItems: 'center',
          }}>
            {/* Thumbnail */}
            <Box sx={{
              position: 'relative', cursor: 'pointer',
              '&:hover .piece-overlay': { opacity: 1 },
              transition: 'transform 0.15s',
              '&:hover': { transform: 'scale(1.02)' },
            }}
              onClick={() => !piece.error && onOpenPiece(piece)}
            >
              <MiniCanvas piece={piece} />

              {/* Hover overlay */}
              <Box className="piece-overlay" sx={{
                position: 'absolute', inset: 0,
                bgcolor: 'rgba(0,0,0,0.6)', opacity: 0,
                transition: 'opacity 0.2s',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 1, borderRadius: 1,
              }}>
                <Tooltip title="Abrir no editor">
                  <IconButton size="small" sx={{ color: '#fff', bgcolor: `${EDRO_ORANGE}80` }}>
                    <IconEye size={16} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Regenerar">
                  <IconButton size="small"
                    onClick={(e) => { e.stopPropagation(); onRegeneratePiece(i); }}
                    sx={{ color: '#fff', bgcolor: 'rgba(255,255,255,0.15)' }}
                  >
                    {regeneratingIdx === i
                      ? <CircularProgress size={14} sx={{ color: '#fff' }} />
                      : <IconRefresh size={16} />}
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>

            {/* Info */}
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Chip label={piece.format} size="small"
                sx={{ fontSize: '0.6rem', height: 18, bgcolor: '#222', color: '#aaa' }}
              />
              <Chip label={piece.platform} size="small"
                sx={{ fontSize: '0.6rem', height: 18, bgcolor: '#222', color: '#aaa' }}
              />
            </Stack>
            {piece.copy?.headline && (
              <Typography variant="caption" sx={{
                color: '#888', fontSize: '0.65rem', maxWidth: 200,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                textAlign: 'center',
              }}>
                {piece.copy.headline}
              </Typography>
            )}
            {piece.error && (
              <Typography variant="caption" sx={{ color: '#ff4444', fontSize: '0.6rem' }}>
                Erro: {piece.error}
              </Typography>
            )}
          </Box>
        ))}
      </Box>
    </Box>
  );
}
