'use client';
import { Handle, Position } from '@xyflow/react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { IconScaleOutline, IconCheck } from '@tabler/icons-react';
import { useState } from 'react';
import NodeShell from '../NodeShell';
import { usePipeline } from '../PipelineContext';
import ModelComparePanel from '@/components/studio/ModelComparePanel';

export default function CompareNode() {
  const { nodeStatus, arteChainResult, activeFormat, useArte: applyArte } = usePipeline();
  const status = nodeStatus.arte === 'done' ? 'active' : 'locked';

  const [selected, setSelected] = useState<{ url: string; model: string } | null>(null);

  const artePrompt = arteChainResult?.payload?.prompt ?? '';
  const clientId = typeof window !== 'undefined'
    ? window.localStorage.getItem('edro_active_client_id') ?? undefined
    : undefined;

  const handleSelect = (imageUrl: string, model: string) => {
    setSelected({ url: imageUrl, model });
    applyArte(imageUrl);
  };

  const collapsedSummary = selected ? (
    <Stack direction="row" spacing={0.75} alignItems="center">
      <IconCheck size={12} color="#13DEB9" />
      <Box>
        <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: 'text.primary' }}>
          {selected.model} selecionado
        </Typography>
        <Typography sx={{ fontSize: '0.6rem', color: 'text.disabled' }}>
          Imagem aplicada ao canvas
        </Typography>
      </Box>
    </Stack>
  ) : null;

  return (
    <Box>
      <Handle type="target" position={Position.Left} id="compare_in"
        style={{ background: '#444', width: 8, height: 8, border: 'none' }} />
      <NodeShell
        title="Comparar Modelos"
        icon={<IconScaleOutline size={14} />}
        status={selected ? 'done' : status}
        accentColor="#F59E0B"
        width={340}
        collapsedSummary={collapsedSummary}
      >
        {!artePrompt && nodeStatus.arte !== 'done' ? (
          <Typography sx={{ fontSize: '0.62rem', color: '#555' }}>
            Execute o Agente DA primeiro para obter o prompt.
          </Typography>
        ) : (
          <ModelComparePanel
            prompt={artePrompt || 'Generate creative marketing image'}
            aspectRatio={activeFormat?.format === 'Story' ? '9:16' : '1:1'}
            clientId={clientId}
            onSelect={handleSelect}
          />
        )}
      </NodeShell>
      <Handle type="source" position={Position.Right} id="compare_out"
        style={{ background: '#F59E0B', width: 8, height: 8, border: 'none' }} />
    </Box>
  );
}
