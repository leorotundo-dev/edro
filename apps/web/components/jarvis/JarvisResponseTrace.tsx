'use client';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';

const EDRO_ORANGE = '#E85219';

export type JarvisObservability = {
  intent: string;
  route: 'operations' | 'planning';
  primaryMemory: string;
  secondaryMemories: string[];
  sourceLabels: {
    primary: string;
    secondary: string[];
  };
  retrievalBudget: {
    historyMessages: number;
    toolIterations: number;
    contextBlocks: number;
  };
  durationMs?: number;
  toolsUsed?: number;
  provider?: string;
  model?: string;
  loadedMemoryBlocks?: string[];
  autonomy?: {
    highestLevel: 'auto' | 'review' | 'confirm';
    requiresConfirmation: boolean;
    executedWithConfirmation: boolean;
    tools: Array<{
      toolName: string;
      level: 'auto' | 'review' | 'confirm';
      category: string;
      reason: string;
      confirmed: boolean;
      executed: boolean;
    }>;
  };
};

function formatDuration(value?: number) {
  if (!value || value < 1000) return value ? `${value}ms` : null;
  return `${(value / 1000).toFixed(1)}s`;
}

function formatIntent(intent: string) {
  switch (intent) {
    case 'operations_control':
      return 'Controle operacional';
    case 'creative_execution':
      return 'Execucao criativa';
    case 'client_memory':
      return 'Contexto interno';
    case 'strategy_planning':
    default:
      return 'Planejamento';
  }
}

function isClientMemoryLabel(value?: string | null) {
  const normalized = String(value || '').trim().toLowerCase();
  return normalized === 'memoria do cliente' || normalized === 'memória do cliente';
}

function formatAutonomy(level?: 'auto' | 'review' | 'confirm') {
  switch (level) {
    case 'confirm':
      return 'Autonomia: confirmação';
    case 'review':
      return 'Autonomia: revisão';
    default:
      return 'Autonomia: automática';
  }
}

export default function JarvisResponseTrace({ observability }: { observability?: JarvisObservability | null }) {
  if (!observability) return null;

  const visibleSecondaryLabels = observability.sourceLabels.secondary.filter((label) => !isClientMemoryLabel(label));
  const visibleLoadedBlocks = (observability.loadedMemoryBlocks ?? []).filter((label) => !isClientMemoryLabel(label));
  const showPrimaryBase = !isClientMemoryLabel(observability.sourceLabels.primary);
  const showIntentChip = observability.intent !== 'client_memory';

  return (
    <Box
      sx={{
        mt: 0.75,
        p: 1,
        borderRadius: 2,
        border: 1,
        borderColor: 'divider',
        bgcolor: 'background.default',
      }}
    >
      <Typography variant="caption" sx={{ display: 'block', mb: 0.75, color: 'text.secondary', fontWeight: 700 }}>
        Como o Jarvis respondeu
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
        <Chip size="small" label={observability.route === 'operations' ? 'Rota: Operacoes' : 'Rota: Planejamento'} />
        {showPrimaryBase ? (
          <Chip size="small" label={`Base: ${observability.sourceLabels.primary}`} sx={{ borderColor: `${EDRO_ORANGE}40`, color: EDRO_ORANGE }} variant="outlined" />
        ) : null}
        {showIntentChip ? <Chip size="small" label={`Intent: ${formatIntent(observability.intent)}`} variant="outlined" /> : null}
        {observability.autonomy ? <Chip size="small" label={formatAutonomy(observability.autonomy.highestLevel)} variant="outlined" /> : null}
        {typeof observability.toolsUsed === 'number' ? <Chip size="small" label={`Tools: ${observability.toolsUsed}`} variant="outlined" /> : null}
        {observability.retrievalBudget.contextBlocks ? <Chip size="small" label={`Blocos: ${observability.retrievalBudget.contextBlocks}`} variant="outlined" /> : null}
        {formatDuration(observability.durationMs) ? <Chip size="small" label={`Tempo: ${formatDuration(observability.durationMs)}`} variant="outlined" /> : null}
      </Box>
      {visibleSecondaryLabels.length ? (
        <Typography variant="caption" sx={{ display: 'block', mt: 0.75, color: 'text.secondary' }}>
          Apoios: {visibleSecondaryLabels.join(' + ')}
        </Typography>
      ) : null}
      {visibleLoadedBlocks.length ? (
        <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'text.secondary' }}>
          Carregou: {visibleLoadedBlocks.join(' + ')}
        </Typography>
      ) : null}
      {observability.autonomy?.tools?.length ? (
        <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'text.secondary' }}>
          Governança: {observability.autonomy.tools.map((tool) => `${tool.toolName} (${tool.level}${tool.confirmed ? ', confirmado' : ''})`).join(' + ')}
        </Typography>
      ) : null}
    </Box>
  );
}
