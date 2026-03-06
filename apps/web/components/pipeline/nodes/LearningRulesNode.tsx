'use client';
import { Handle, Position } from '@xyflow/react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';
import { IconBrain, IconTrendingUp } from '@tabler/icons-react';

type LearningRule = {
  rule_name: string;
  effective_pattern: string;
  uplift_value: number;
  confidence_score: number;
};

interface Props {
  data: { rules?: LearningRule[]; loading?: boolean };
}

export default function LearningRulesNode({ data }: Props) {
  const { rules = [], loading = false } = data;

  return (
    <Box sx={{
      width: 220,
      bgcolor: 'rgba(93,135,255,0.05)',
      border: '1px dashed #5D87FF55',
      borderRadius: 2,
      overflow: 'hidden',
    }}>
      <Handle type="source" position={Position.Right} id="rules_out"
        style={{ background: '#5D87FF', width: 8, height: 8, border: 'none', top: '50%' }} />

      {/* Header */}
      <Box sx={{ px: 1.5, py: 1, borderBottom: '1px solid #5D87FF22', display: 'flex', alignItems: 'center', gap: 0.75 }}>
        <IconBrain size={12} color="#5D87FF" />
        <Typography sx={{ fontSize: '0.62rem', fontWeight: 700, color: '#5D87FF', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Regras Aprendidas
        </Typography>
      </Box>

      <Box sx={{ p: 1.25 }}>
        {loading && <LinearProgress sx={{ borderRadius: 1, bgcolor: '#5D87FF22', '& .MuiLinearProgress-bar': { bgcolor: '#5D87FF' } }} />}

        {!loading && rules.length === 0 && (
          <Typography sx={{ fontSize: '0.6rem', color: '#555', textAlign: 'center', py: 0.5 }}>
            Sem regras ainda para este cliente
          </Typography>
        )}

        {!loading && rules.slice(0, 3).map((rule, i) => (
          <Box key={i} sx={{ mb: i < 2 ? 1 : 0 }}>
            <Stack direction="row" alignItems="center" spacing={0.5} mb={0.25}>
              <IconTrendingUp size={9} color="#5D87FF" />
              <Typography sx={{ fontSize: '0.6rem', fontWeight: 700, color: '#7eb3ff', lineHeight: 1.3 }}>
                {rule.rule_name}
              </Typography>
            </Stack>
            <Typography sx={{ fontSize: '0.57rem', color: '#666', lineHeight: 1.3, mb: 0.4 }}>
              {rule.effective_pattern?.slice(0, 80)}{rule.effective_pattern?.length > 80 ? '…' : ''}
            </Typography>
            <Stack direction="row" spacing={0.75} alignItems="center">
              <Box sx={{ flex: 1, height: 3, bgcolor: '#5D87FF22', borderRadius: 1, overflow: 'hidden' }}>
                <Box sx={{ width: `${Math.min(100, Math.round(rule.confidence_score * 100))}%`, height: '100%', bgcolor: '#5D87FF', borderRadius: 1 }} />
              </Box>
              <Typography sx={{ fontSize: '0.52rem', color: '#5D87FF' }}>
                +{(rule.uplift_value * 100).toFixed(0)}%
              </Typography>
            </Stack>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
