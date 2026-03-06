'use client';
import { Handle, Position } from '@xyflow/react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import { IconPalette } from '@tabler/icons-react';
import NodeShell from '../NodeShell';
import { usePipeline } from '../PipelineContext';

// Context node — shows brand identity info that feeds into Copy + Arte nodes
export default function ClientDNANode() {
  const { briefing, clientBrandColor } = usePipeline();
  const profile = briefing?.payload?.profile || {};
  const brandTokens = profile.brand_tokens;

  const summary = (
    <Stack spacing={0.5}>
      {clientBrandColor && (
        <Stack direction="row" alignItems="center" spacing={0.75}>
          <Box sx={{
            width: 14, height: 14, borderRadius: '50%',
            bgcolor: clientBrandColor, border: '1px solid rgba(255,255,255,0.2)', flexShrink: 0,
          }} />
          <Typography sx={{ fontSize: '0.62rem', color: 'text.secondary' }}>
            Cor primária: {clientBrandColor}
          </Typography>
        </Stack>
      )}
      {briefing?.client_name && (
        <Typography sx={{ fontSize: '0.62rem', color: 'text.secondary' }}>
          Cliente: {briefing.client_name}
        </Typography>
      )}
      {brandTokens?.imageStyle && (
        <Typography sx={{ fontSize: '0.62rem', color: 'text.secondary' }}>
          Estilo visual: {brandTokens.imageStyle}
        </Typography>
      )}
      {brandTokens?.moodWords?.length > 0 && (
        <Stack direction="row" spacing={0.5} flexWrap="wrap">
          {brandTokens.moodWords.slice(0, 3).map((word: string) => (
            <Chip key={word} size="small" label={word}
              sx={{ height: 16, fontSize: '0.55rem', bgcolor: 'rgba(93,135,255,0.12)', color: '#5D87FF' }} />
          ))}
        </Stack>
      )}
    </Stack>
  );

  return (
    <Box>
      <NodeShell
        title="DNA da Marca"
        icon={<IconPalette size={14} />}
        status="done"
        width={220}
        collapsedSummary={summary}
      >
        {summary}
      </NodeShell>
      <Handle type="source" position={Position.Right} id="dna_out"
        style={{ background: '#5D87FF', width: 8, height: 8, border: 'none' }} />
    </Box>
  );
}
