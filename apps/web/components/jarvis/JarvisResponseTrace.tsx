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
  execution?: {
    traceId?: string | null;
    taskType: string;
    actorProfile: string;
    confidence: {
      score: number;
      band: 'low' | 'medium' | 'high';
      mode: 'respond' | 'act' | 'confirm' | 'escalate';
      reasons: string[];
    };
  };
  memoryAudit?: {
    governancePressure: 'low' | 'medium' | 'high';
    evidenceUsed: Array<{
      fact_type: string | null;
      fingerprint: string | null;
      title: string;
      summary: string | null;
      source_type: string | null;
      source_id: string | null;
      related_at: string | null;
      confidence_score: number | null;
    }>;
    suppressedFacts: Array<{
      fact_type: string | null;
      fingerprint: string | null;
      title: string;
      summary: string | null;
      source_type: string | null;
      source_id: string | null;
      related_at: string | null;
      confidence_score: number | null;
    }>;
  };
  simulation?: {
    avgOverall: number | null;
    highestRisk: 'low' | 'medium' | 'high' | null;
    blockedActions: number;
    topConcerns: string[];
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

function formatConfidenceMode(mode?: 'respond' | 'act' | 'confirm' | 'escalate') {
  switch (mode) {
    case 'act':
      return 'agir';
    case 'confirm':
      return 'confirmar';
    case 'escalate':
      return 'escalar';
    default:
      return 'responder';
  }
}

function shortFingerprint(value?: string | null) {
  const normalized = String(value || '').trim();
  return normalized ? normalized.slice(0, 8) : null;
}

function formatEvidenceLine(item: {
  fact_type: string | null;
  fingerprint: string | null;
  title: string;
  summary: string | null;
  source_type: string | null;
  related_at: string | null;
  confidence_score: number | null;
}) {
  const parts = [
    item.fact_type ? `[${item.fact_type}]` : null,
    item.title,
    item.source_type ? `fonte ${item.source_type}` : null,
    shortFingerprint(item.fingerprint) ? `fp ${shortFingerprint(item.fingerprint)}` : null,
    item.confidence_score != null ? `score ${Number(item.confidence_score).toFixed(1)}` : null,
  ].filter(Boolean);
  return `${parts.join(' | ')}${item.summary ? ` — ${item.summary}` : ''}`;
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
        {observability.execution ? <Chip size="small" label={`Tarefa: ${observability.execution.taskType}`} variant="outlined" /> : null}
        {observability.execution ? <Chip size="small" label={`Perfil: ${observability.execution.actorProfile}`} variant="outlined" /> : null}
        {observability.autonomy ? <Chip size="small" label={formatAutonomy(observability.autonomy.highestLevel)} variant="outlined" /> : null}
        {observability.execution ? <Chip size="small" label={`Confiança: ${observability.execution.confidence.band} / ${formatConfidenceMode(observability.execution.confidence.mode)}`} variant="outlined" /> : null}
        {typeof observability.toolsUsed === 'number' ? <Chip size="small" label={`Tools: ${observability.toolsUsed}`} variant="outlined" /> : null}
        {observability.retrievalBudget.contextBlocks ? <Chip size="small" label={`Blocos: ${observability.retrievalBudget.contextBlocks}`} variant="outlined" /> : null}
        {formatDuration(observability.durationMs) ? <Chip size="small" label={`Tempo: ${formatDuration(observability.durationMs)}`} variant="outlined" /> : null}
      </Box>
      {observability.execution?.traceId ? (
        <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'text.secondary' }}>
          Trace: {observability.execution.traceId}
        </Typography>
      ) : null}
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
      {observability.memoryAudit?.evidenceUsed?.length ? (
        <Box sx={{ mt: 0.5 }}>
          <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', fontWeight: 700 }}>
            Evidências usadas
          </Typography>
          {observability.memoryAudit.evidenceUsed.slice(0, 3).map((item) => (
            <Typography key={`${item.fingerprint || item.title}-${item.source_type || 'src'}`} variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
              {formatEvidenceLine(item)}
            </Typography>
          ))}
        </Box>
      ) : null}
      {observability.memoryAudit?.suppressedFacts?.length ? (
        <Box sx={{ mt: 0.5 }}>
          <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', fontWeight: 700 }}>
            Fatos suprimidos
          </Typography>
          {observability.memoryAudit.suppressedFacts.slice(0, 2).map((item) => (
            <Typography key={`${item.fingerprint || item.title}-${item.source_type || 'src'}`} variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
              {formatEvidenceLine(item)}
            </Typography>
          ))}
        </Box>
      ) : null}
      {observability.simulation?.avgOverall != null ? (
        <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'text.secondary' }}>
          Simulação: score {observability.simulation.avgOverall} / risco {observability.simulation.highestRisk || 'n/a'}
          {observability.simulation.topConcerns.length ? ` — ${observability.simulation.topConcerns.join(' | ')}` : ''}
        </Typography>
      ) : null}
    </Box>
  );
}
