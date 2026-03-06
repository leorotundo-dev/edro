'use client';
import { Handle, Position } from '@xyflow/react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Chip from '@mui/material/Chip';
import { IconBrain } from '@tabler/icons-react';
import NodeShell from '../NodeShell';
import type { NodeStatus } from '../PipelineContext';

export type DirectorInsight = {
  step: 'copy' | 'trigger' | 'arte' | 'final';
  score: number;          // 0–10
  aligned: boolean;
  message: string;        // "Copy alinhada ao objetivo de awareness"
  suggestions?: string[]; // proactive suggestions
};

interface DirectorNodeProps {
  insights: DirectorInsight[];
  analyzing: boolean;
  status: NodeStatus;
}

export default function DirectorNode({ insights, analyzing, status }: DirectorNodeProps) {
  const latestInsight = insights[insights.length - 1];

  const collapsedSummary = latestInsight ? (
    <Stack spacing={0.5}>
      <Stack direction="row" alignItems="center" spacing={0.75}>
        <Box sx={{
          width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
          bgcolor: latestInsight.aligned ? 'rgba(19,222,185,0.15)' : 'rgba(232,82,25,0.15)',
          border: '1.5px solid',
          borderColor: latestInsight.aligned ? '#13DEB9' : '#E85219',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Typography sx={{ fontSize: '0.62rem', fontWeight: 800,
            color: latestInsight.aligned ? '#13DEB9' : '#E85219' }}>
            {latestInsight.score}
          </Typography>
        </Box>
        <Typography sx={{ fontSize: '0.65rem', color: 'text.secondary', flex: 1, lineHeight: 1.4 }}>
          {latestInsight.message}
        </Typography>
      </Stack>
    </Stack>
  ) : null;

  return (
    <Box>
      {/* Connects from all main nodes via invisible top/bottom handles */}
      <Handle type="target" position={Position.Top} id="director_in"
        style={{ background: '#5D87FF', width: 8, height: 8, border: 'none' }} />

      <NodeShell
        title="Diretor AI"
        icon={<IconBrain size={14} />}
        status={status}
        width={260}
        collapsedSummary={collapsedSummary}
      >
        <Stack spacing={1}>
          <Typography sx={{ fontSize: '0.6rem', color: 'text.secondary', lineHeight: 1.5 }}>
            Avalia se o criativo resolve o problema do briefing a cada step.
          </Typography>

          {analyzing && (
            <Stack direction="row" spacing={1} alignItems="center">
              <CircularProgress size={12} sx={{ color: '#5D87FF' }} />
              <Typography sx={{ fontSize: '0.62rem', color: '#5D87FF' }}>Analisando...</Typography>
            </Stack>
          )}

          {insights.map((ins, i) => (
            <Box key={i} sx={{
              p: 0.75, borderRadius: 1.5,
              border: '1px solid', borderColor: ins.aligned ? 'rgba(19,222,185,0.3)' : 'rgba(232,82,25,0.3)',
              bgcolor: ins.aligned ? 'rgba(19,222,185,0.04)' : 'rgba(232,82,25,0.04)',
            }}>
              <Stack direction="row" alignItems="flex-start" spacing={0.75}>
                <Chip size="small" label={`${ins.step} · ${ins.score}/10`}
                  sx={{ height: 16, fontSize: '0.55rem', flexShrink: 0,
                    bgcolor: ins.aligned ? 'rgba(19,222,185,0.15)' : 'rgba(232,82,25,0.15)',
                    color: ins.aligned ? '#13DEB9' : '#E85219' }} />
                <Typography sx={{ fontSize: '0.6rem', color: 'text.secondary', lineHeight: 1.4, flex: 1 }}>
                  {ins.message}
                </Typography>
              </Stack>
              {ins.suggestions?.map((s, j) => (
                <Typography key={j} sx={{ fontSize: '0.58rem', color: 'text.disabled', mt: 0.5, pl: 0.5 }}>
                  → {s}
                </Typography>
              ))}
            </Box>
          ))}

          {!analyzing && insights.length === 0 && (
            <Typography sx={{ fontSize: '0.6rem', color: 'text.disabled', textAlign: 'center', py: 1 }}>
              Aguardando primeiro step...
            </Typography>
          )}
        </Stack>
      </NodeShell>

      <Handle type="source" position={Position.Bottom} id="director_out"
        style={{ background: '#5D87FF', width: 8, height: 8, border: 'none' }} />
    </Box>
  );
}
