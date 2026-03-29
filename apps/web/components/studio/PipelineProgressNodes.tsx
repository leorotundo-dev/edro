'use client';

import { useEffect, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Tooltip from '@mui/material/Tooltip';
import { IconCheck, IconAlertCircle } from '@tabler/icons-react';

// ── Types ─────────────────────────────────────────────────────────────────────

type NodeStatus = 'idle' | 'loading' | 'done' | 'error';

type PipelineNode = {
  id: string;
  label: string;
  sublabel?: string;
  status: NodeStatus;
  detail?: string; // shown when done
};

type AgentDAResult = {
  imageUrl?: string;
  imageUrls?: string[];
  critique?: { score: number; pass: boolean; attempts?: number };
  copyAlignment?: { alignment_score: number };
  multiFormat?: Array<{ format: string }>;
  payload?: { prompt?: string };
  brandVisual?: { loraId?: string };
};

type PipelineProgressNodesProps = {
  active: boolean;
  result?: AgentDAResult | null;
};

// ── Timing estimates (ms) ──────────────────────────────────────────────────────

const NODES_CONFIG: Array<{ id: string; label: string; sublabel: string; estimatedMs: number }> = [
  { id: 'p1', label: 'Marca',        sublabel: 'Identidade visual',  estimatedMs: 1200  },
  { id: 'p2', label: 'Prompt',       sublabel: 'Engenharia de cena', estimatedMs: 3000  },
  { id: 'p3', label: 'Render',       sublabel: 'Geração de imagem',  estimatedMs: 9000  },
  { id: 'p4', label: 'Crítica',      sublabel: 'Avaliação visual',   estimatedMs: 11500 },
  { id: 'p4b', label: 'Alinhamento', sublabel: 'Copy ↔ Imagem',      estimatedMs: 13000 },
  { id: 'p6', label: 'Formatos',     sublabel: 'Multi-formato',      estimatedMs: 15500 },
];

// ── Node Icon ─────────────────────────────────────────────────────────────────

function NodeIcon({ status }: { status: NodeStatus }) {
  if (status === 'done') return <IconCheck size={13} />;
  if (status === 'error') return <IconAlertCircle size={13} />;
  if (status === 'loading') return <CircularProgress size={13} color="inherit" />;
  return null;
}

// ── Single Node ───────────────────────────────────────────────────────────────

function PNode({ node }: { node: PipelineNode }) {
  const colorMap: Record<NodeStatus, string> = {
    idle:    'text.disabled',
    loading: 'primary.main',
    done:    'success.main',
    error:   'error.main',
  };
  const bgMap: Record<NodeStatus, string> = {
    idle:    'action.hover',
    loading: 'primary.light',
    done:    'success.light',
    error:   'error.light',
  };
  const color = colorMap[node.status];
  const bg = bgMap[node.status];

  return (
    <Tooltip title={node.detail ?? node.sublabel} placement="top" arrow>
      <Stack
        alignItems="center"
        spacing={0.5}
        sx={{
          minWidth: 64,
          opacity: node.status === 'idle' ? 0.45 : 1,
          transition: 'opacity 0.3s',
        }}
      >
        {/* Circle icon */}
        <Box
          sx={{
            width: 32, height: 32, borderRadius: '50%',
            bgcolor: bg,
            color,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: 1, borderColor: color,
            transition: 'all 0.3s',
          }}
        >
          <NodeIcon status={node.status} />
        </Box>
        {/* Label */}
        <Typography
          variant="caption"
          fontWeight={node.status !== 'idle' ? 600 : 400}
          color={color}
          sx={{ fontSize: 10, textAlign: 'center', lineHeight: 1.2 }}
        >
          {node.label}
        </Typography>
        {/* Detail line when done */}
        {node.status === 'done' && node.detail && (
          <Typography
            variant="caption"
            color="text.disabled"
            sx={{ fontSize: 9, maxWidth: 70, textAlign: 'center', lineHeight: 1.1, wordBreak: 'break-all' }}
          >
            {node.detail}
          </Typography>
        )}
      </Stack>
    </Tooltip>
  );
}

// ── Connector ─────────────────────────────────────────────────────────────────

function Connector({ active }: { active: boolean }) {
  return (
    <Box
      sx={{
        flex: 1, height: 1.5, minWidth: 8,
        bgcolor: active ? 'success.main' : 'divider',
        transition: 'background-color 0.3s',
        alignSelf: 'center',
        mt: '-16px', // align with circle center
      }}
    />
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function PipelineProgressNodes({ active, result }: PipelineProgressNodesProps) {
  const [nodes, setNodes] = useState<PipelineNode[]>(
    NODES_CONFIG.map(c => ({ id: c.id, label: c.label, sublabel: c.sublabel, status: 'idle' })),
  );
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const startRef = useRef<number>(0);

  // Reset and start animation when active becomes true
  useEffect(() => {
    if (!active) return;

    // Reset all
    setNodes(NODES_CONFIG.map(c => ({ id: c.id, label: c.label, sublabel: c.sublabel, status: 'idle' })));
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    startRef.current = Date.now();

    // Schedule each node's loading start at estimatedMs - 1500ms before its deadline
    NODES_CONFIG.forEach((cfg, i) => {
      const loadingAt = i === 0 ? 0 : NODES_CONFIG[i - 1].estimatedMs + 200;
      const doneAt = cfg.estimatedMs;

      const t1 = setTimeout(() => {
        setNodes(prev => prev.map(n => n.id === cfg.id ? { ...n, status: 'loading' } : n));
      }, loadingAt);

      // Mark done only if result hasn't arrived yet
      const t2 = setTimeout(() => {
        setNodes(prev => {
          // Don't override if result already filled it
          const node = prev.find(n => n.id === cfg.id);
          if (node?.status === 'done') return prev;
          // P6 only shows as done if real result has multiFormat
          if (cfg.id === 'p6') return prev;
          return prev.map(n => n.id === cfg.id ? { ...n, status: 'done' } : n);
        });
      }, doneAt);

      timersRef.current.push(t1, t2);
    });

    return () => {
      timersRef.current.forEach(clearTimeout);
    };
  }, [active]);

  // Populate nodes with real data when result arrives
  useEffect(() => {
    if (!result) return;

    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];

    setNodes(prev => prev.map(n => {
      if (n.status === 'done') return n; // already done
      switch (n.id) {
        case 'p1': {
          const hasLora = !!(result as any).brandVisual?.loraId;
          return { ...n, status: 'done', detail: hasLora ? 'LoRA ativo' : 'Refs carregadas' };
        }
        case 'p2': {
          const prompt = (result as any).payload?.prompt as string | undefined;
          return { ...n, status: 'done', detail: prompt ? prompt.slice(0, 36) + '…' : undefined };
        }
        case 'p3':
          return { ...n, status: 'done', detail: result.imageUrls ? `${result.imageUrls.length} variação(ões)` : undefined };
        case 'p4': {
          const c = result.critique;
          if (!c) return { ...n, status: 'done' };
          return {
            ...n, status: 'done',
            detail: `${c.score}/100 · ${c.pass ? 'aprovado' : 'retry'}`,
          };
        }
        case 'p4b': {
          const a = result.copyAlignment;
          if (!a) return { ...n, status: 'idle' }; // not run
          return { ...n, status: 'done', detail: `${a.alignment_score}/100` };
        }
        case 'p6': {
          const mf = result.multiFormat;
          if (!mf?.length) return { ...n, status: 'idle' }; // not run
          return { ...n, status: 'done', detail: `${mf.length} formato(s)` };
        }
        default:
          return { ...n, status: 'done' };
      }
    }));
  }, [result]);

  // Also handle currently-loading nodes when result comes
  useEffect(() => {
    if (!result) return;
    setNodes(prev => prev.map(n => {
      if (n.status !== 'loading') return n;
      return { ...n, status: 'done' };
    }));
  }, [result]);

  if (!active && nodes.every(n => n.status === 'idle')) return null;

  return (
    <Box
      sx={{
        mt: 1.5, mb: 1,
        p: 1.5,
        borderRadius: 2,
        border: 1,
        borderColor: 'divider',
        bgcolor: 'background.default',
        overflowX: 'auto',
      }}
    >
      <Typography variant="caption" color="text.disabled" display="block" mb={1} sx={{ fontSize: 10, letterSpacing: 0.5, textTransform: 'uppercase' }}>
        Pipeline IA
      </Typography>
      <Stack direction="row" alignItems="flex-start" sx={{ minWidth: 360 }}>
        {nodes.map((node, i) => (
          <Stack key={node.id} direction="row" alignItems="flex-start" sx={{ flex: i < nodes.length - 1 ? 1 : 'none' }}>
            <PNode node={node} />
            {i < nodes.length - 1 && <Connector active={node.status === 'done'} />}
          </Stack>
        ))}
      </Stack>
    </Box>
  );
}
