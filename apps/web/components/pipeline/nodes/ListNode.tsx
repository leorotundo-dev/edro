'use client';
import { useEffect, useRef } from 'react';
import { useState } from 'react';
import { Handle, Position, type NodeProps, useReactFlow } from '@xyflow/react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import LinearProgress from '@mui/material/LinearProgress';
import Chip from '@mui/material/Chip';
import { IconList, IconX, IconPlus, IconPlayerPlay } from '@tabler/icons-react';
import NodeShell from '../NodeShell';
import { usePipeline } from '../PipelineContext';
import { useCanvasContext } from '../CanvasContext';

const ACCENT = '#F59E0B';

export default function ListNode({ id }: NodeProps) {
  const { nodeStatus } = usePipeline();
  const { registerNodeRunner, unregisterNodeRunner, duplicateNode, deleteNode, runNode } =
    useCanvasContext();
  const { getEdges } = useReactFlow();

  const [items, setItems] = useState<string[]>(['', '']);
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchProgress, setBatchProgress] = useState(0);

  const batchAbortRef = useRef(false);

  // Derive status from items
  const activeItems = items.filter((s) => s.trim());
  const status = activeItems.length > 0 ? 'active' : 'locked';
  // Override to running while batch is in progress
  const resolvedStatus = batchRunning ? 'running' : (nodeStatus as any)[id] ?? status;

  // ── Batch run ──────────────────────────────────────────────────────────────
  const handleBatchRun = () => {
    if (batchRunning || activeItems.length === 0) return;
    setBatchRunning(true);
    setBatchProgress(0);
    batchAbortRef.current = false;

    let idx = 0;
    const step = () => {
      if (batchAbortRef.current) {
        setBatchRunning(false);
        setBatchProgress(0);
        return;
      }
      if (idx >= activeItems.length) {
        setBatchRunning(false);
        setBatchProgress(0);
        return;
      }
      idx += 1;
      setBatchProgress(idx);

      // Fan-out: trigger all downstream nodes for this item
      const outgoingEdges = getEdges().filter((e) => e.source === id);
      outgoingEdges.forEach((e) => runNode(e.target));

      setTimeout(step, 2000);
    };
    setTimeout(step, 2000);
  };

  // Register runner so CanvasContext / action bar can trigger it
  useEffect(() => {
    registerNodeRunner(id, handleBatchRun);
    return () => unregisterNodeRunner(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, batchRunning, activeItems.length]);

  // ── Item helpers ──────────────────────────────────────────────────────────
  const handleChange = (index: number, value: string) => {
    setItems((prev) => prev.map((it, i) => (i === index ? value : it)));
  };

  const handleAddItem = () => {
    if (items.length >= 20) return;
    setItems((prev) => [...prev, '']);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 2) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // ── Collapsed summary ─────────────────────────────────────────────────────
  const collapsedSummary = (
    <Typography sx={{ fontSize: '0.64rem', color: '#aaa' }}>
      {activeItems.length} prompt{activeItems.length !== 1 ? 's' : ''} prontos para batch run
    </Typography>
  );

  return (
    <Box>
      <NodeShell
        title="Lista / Batch"
        icon={<IconList size={14} />}
        status={resolvedStatus}
        accentColor={ACCENT}
        width={300}
        collapsedSummary={collapsedSummary}
        onRun={handleBatchRun}
        onStop={() => {
          batchAbortRef.current = true;
        }}
        onDuplicate={() => duplicateNode(id)}
        onDelete={() => deleteNode(id)}
      >
        <Stack spacing={1}>
          {/* Header badge */}
          <Stack direction="row" alignItems="center" spacing={0.75}>
            <Chip
              label={`${activeItems.length} ${activeItems.length === 1 ? 'item' : 'itens'}`}
              size="small"
              sx={{
                bgcolor: `${ACCENT}18`,
                color: ACCENT,
                fontWeight: 700,
                fontSize: '0.56rem',
                height: 18,
                letterSpacing: '0.04em',
                '& .MuiChip-label': { px: 0.75 },
              }}
            />
            <Typography sx={{ fontSize: '0.58rem', color: '#555', ml: 'auto' }}>
              máx 20
            </Typography>
          </Stack>

          {/* Item list */}
          <Stack spacing={0.75}>
            {items.map((item, i) => (
              <Stack key={i} direction="row" alignItems="flex-start" spacing={0.5}>
                <TextField
                  value={item}
                  onChange={(e) => handleChange(i, e.target.value)}
                  size="small"
                  multiline
                  maxRows={3}
                  placeholder={`Item ${i + 1}...`}
                  disabled={batchRunning}
                  fullWidth
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      fontSize: '0.65rem',
                      bgcolor: '#0d0d0d',
                      '& fieldset': { borderColor: '#2a2a2a' },
                      '&:hover fieldset': { borderColor: '#3a3a3a' },
                      '&.Mui-focused fieldset': { borderColor: ACCENT },
                    },
                    '& .MuiInputBase-input': { fontSize: '0.65rem', py: 0.6, px: 0.9 },
                  }}
                />
                {items.length > 2 && (
                  <IconButton
                    size="small"
                    onClick={() => handleRemoveItem(i)}
                    disabled={batchRunning}
                    sx={{
                      mt: 0.25,
                      width: 22,
                      height: 22,
                      color: '#444',
                      flexShrink: 0,
                      '&:hover': { color: '#EF4444' },
                    }}
                  >
                    <IconX size={12} />
                  </IconButton>
                )}
              </Stack>
            ))}
          </Stack>

          {/* Add item button */}
          <Button
            size="small"
            startIcon={<IconPlus size={12} />}
            onClick={handleAddItem}
            disabled={items.length >= 20 || batchRunning}
            sx={{
              fontSize: '0.62rem',
              textTransform: 'none',
              color: items.length >= 20 ? '#333' : '#555',
              justifyContent: 'flex-start',
              px: 0.5,
              '&:hover': { color: ACCENT, bgcolor: `${ACCENT}0d` },
              '&.Mui-disabled': { color: '#333' },
            }}
          >
            Adicionar item
          </Button>

          {/* Batch progress */}
          {batchRunning && (
            <Box>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.4 }}>
                <Typography sx={{ fontSize: '0.58rem', color: ACCENT }}>
                  Executando item {batchProgress} de {activeItems.length}…
                </Typography>
                <Typography sx={{ fontSize: '0.58rem', color: '#555' }}>
                  {Math.round((batchProgress / activeItems.length) * 100)}%
                </Typography>
              </Stack>
              <LinearProgress
                variant="determinate"
                value={(batchProgress / activeItems.length) * 100}
                sx={{
                  height: 3,
                  borderRadius: 2,
                  bgcolor: '#1e1e1e',
                  '& .MuiLinearProgress-bar': { bgcolor: ACCENT },
                }}
              />
            </Box>
          )}

          {/* Batch run button */}
          {!batchRunning && (
            <Button
              size="small"
              variant="outlined"
              startIcon={<IconPlayerPlay size={12} />}
              onClick={handleBatchRun}
              disabled={activeItems.length === 0}
              fullWidth
              sx={{
                fontSize: '0.64rem',
                textTransform: 'none',
                fontWeight: 700,
                borderColor: activeItems.length === 0 ? '#2a2a2a' : ACCENT,
                color: activeItems.length === 0 ? '#444' : ACCENT,
                '&:hover': { borderColor: ACCENT, bgcolor: `${ACCENT}0d` },
                '&.Mui-disabled': { borderColor: '#2a2a2a', color: '#444' },
              }}
            >
              Executar em batch
            </Button>
          )}
        </Stack>
      </NodeShell>

      {/* Source handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="list_out"
        style={{ background: ACCENT, width: 8, height: 8, border: 'none' }}
      />
    </Box>
  );
}
