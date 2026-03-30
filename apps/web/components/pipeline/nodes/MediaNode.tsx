'use client';
import { useRef, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import { IconUpload, IconPhoto, IconVideo, IconRefresh, IconDownload } from '@tabler/icons-react';
import NodeShell from '../NodeShell';
import { usePipeline } from '../PipelineContext';
import { useCanvasContext } from '../CanvasContext';

const ACCENT = '#06B6D4';

export default function MediaNode({ id }: NodeProps) {
  const { nodeStatus, handleGenerateArteChainStream } = usePipeline();
  const { duplicateNode, deleteNode } = useCanvasContext();

  const [assetUrl, setAssetUrl] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Derived status ────────────────────────────────────────────────────────
  const status = assetUrl ? 'done' : uploading ? 'running' : 'active';

  // ── Upload handler ────────────────────────────────────────────────────────
  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const { buildApiUrl } = await import('@/lib/api');
      const res = await fetch(buildApiUrl('/studio/creative/upload-asset'), {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setAssetUrl(data.assetUrl);
        setMimeType(data.mimeType.startsWith('video') ? 'video' : 'image');
      } else {
        setError(data.error || 'Erro no upload');
      }
    } catch (e: any) {
      setError(e?.message || 'Erro no upload');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleImg2Img = () => {
    if (!assetUrl) return;
    handleGenerateArteChainStream({ visualReferences: [assetUrl] });
  };

  // ── Collapsed summary (thumbnail) ────────────────────────────────────────
  const collapsedSummary = assetUrl ? (
    <Box sx={{ width: '100%' }}>
      {mimeType === 'video' ? (
        <Box
          component="video"
          src={assetUrl}
          sx={{ width: '100%', borderRadius: 1.5, maxHeight: 80, display: 'block' }}
        />
      ) : (
        <Box
          component="img"
          src={assetUrl}
          sx={{ width: '100%', borderRadius: 1.5, maxHeight: 80, objectFit: 'cover', display: 'block' }}
        />
      )}
    </Box>
  ) : null;

  return (
    <Box>
      <NodeShell
        title="Mídia"
        icon={<IconPhoto size={14} />}
        status={status}
        accentColor={ACCENT}
        width={280}
        collapsedSummary={collapsedSummary ?? undefined}
        onDuplicate={() => duplicateNode(id)}
        onDelete={() => deleteNode(id)}
      >
        <Stack spacing={1}>
          {/* No asset — drag-drop zone */}
          {!assetUrl && !uploading && (
            <>
              <Box
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                sx={{
                  border: `2px dashed ${dragOver ? ACCENT : '#2a2a2a'}`,
                  borderRadius: 2,
                  p: 2.5,
                  textAlign: 'center',
                  cursor: 'pointer',
                  bgcolor: dragOver ? 'rgba(6,182,212,0.06)' : 'transparent',
                  transition: 'all 0.15s',
                }}
              >
                <IconUpload size={24} color={dragOver ? ACCENT : '#444'} />
                <Typography sx={{ fontSize: '0.62rem', color: '#555', mt: 0.75 }}>
                  Arraste ou clique para fazer upload
                </Typography>
                <Typography sx={{ fontSize: '0.55rem', color: '#444', mt: 0.5 }}>
                  Imagens e vídeos até 50MB
                </Typography>
              </Box>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                style={{ display: 'none' }}
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
            </>
          )}

          {/* Uploading state */}
          {uploading && (
            <Stack alignItems="center" spacing={1} sx={{ py: 2 }}>
              <CircularProgress size={24} sx={{ color: ACCENT }} />
              <Typography sx={{ fontSize: '0.62rem', color: '#555' }}>
                Fazendo upload…
              </Typography>
            </Stack>
          )}

          {/* Asset loaded */}
          {assetUrl && !uploading && (
            <Stack spacing={0.75}>
              {mimeType === 'video' ? (
                <Box
                  component="video"
                  src={assetUrl}
                  controls
                  sx={{ width: '100%', borderRadius: 1.5, maxHeight: 180, display: 'block' }}
                />
              ) : (
                <Box
                  component="img"
                  src={assetUrl}
                  sx={{
                    width: '100%',
                    borderRadius: 1.5,
                    maxHeight: 180,
                    objectFit: 'cover',
                    display: 'block',
                  }}
                />
              )}

              {/* File info row */}
              <Stack direction="row" alignItems="center" spacing={0.75}>
                <Box sx={{ color: ACCENT, display: 'flex', flexShrink: 0 }}>
                  {mimeType === 'video' ? (
                    <IconVideo size={13} />
                  ) : (
                    <IconPhoto size={13} />
                  )}
                </Box>
                <Typography sx={{ fontSize: '0.6rem', color: '#666', flex: 1, textTransform: 'capitalize' }}>
                  {mimeType ?? 'arquivo'}
                </Typography>

                {/* Download link */}
                <Box
                  component="a"
                  href={assetUrl}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    color: '#555',
                    textDecoration: 'none',
                    '&:hover': { color: ACCENT },
                    transition: 'color 0.15s',
                  }}
                >
                  <IconDownload size={13} />
                </Box>

                {/* Swap button */}
                <Button
                  size="small"
                  startIcon={<IconRefresh size={11} />}
                  onClick={() => {
                    setAssetUrl(null);
                    setMimeType(null);
                    setError('');
                  }}
                  sx={{
                    fontSize: '0.58rem',
                    textTransform: 'none',
                    color: '#555',
                    minWidth: 0,
                    px: 0.75,
                    py: 0.3,
                    '&:hover': { color: '#ccc', bgcolor: '#1a1a1a' },
                  }}
                >
                  Trocar
                </Button>
              </Stack>

              {/* img2img trigger */}
              {!mimeType?.startsWith('video') && (
                <Button
                  size="small"
                  variant="outlined"
                  fullWidth
                  onClick={handleImg2Img}
                  sx={{
                    mt: 0.5,
                    fontSize: '0.6rem', textTransform: 'none',
                    borderColor: '#2a2a2a', color: '#888',
                    '&:hover': { borderColor: ACCENT, color: ACCENT },
                  }}
                >
                  Usar como img2img
                </Button>
              )}
            </Stack>
          )}

          {/* Error message */}
          {error && (
            <Typography sx={{ fontSize: '0.6rem', color: '#EF4444' }}>{error}</Typography>
          )}
        </Stack>
      </NodeShell>

      {/* Source handle only — no incoming connections */}
      <Handle
        type="source"
        position={Position.Right}
        id="media_out"
        style={{ background: ACCENT, width: 8, height: 8, border: 'none' }}
      />
    </Box>
  );
}
