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
    style?: string | null;
    sandboxOnly?: boolean;
    confidence: {
      score: number;
      band: 'low' | 'medium' | 'high';
      mode: 'respond' | 'act' | 'confirm' | 'escalate';
      reasons: string[];
    };
  };
  memoryAudit?: {
    governancePressure: 'low' | 'medium' | 'high';
    actionPolicy?: {
      preferredMode: string | null;
      preferredStyle: string | null;
      modeSignals: Array<{
        mode: string;
        learning_score: number;
        sample_count: number;
      }>;
      styleSignals: Array<{
        style: string;
        learning_score: number;
        sample_count: number;
      }>;
    };
    retrievalLearning?: {
      taskType: string | null;
      actorProfile: string | null;
      boostedFacts: Array<{
        fingerprint: string;
        title: string | null;
        learning_score: number;
      }>;
      penalizedFacts: Array<{
        fingerprint: string;
        title: string | null;
        learning_score: number;
      }>;
    };
    retrievalStrategy?: {
      favoredSourceTypes: string[];
      favoredFactTypes: string[];
      budget: {
        directives: number;
        commitments: number;
        evidence: number;
        documents: number;
      };
    };
    toolPolicy?: {
      preferredTools: Array<{
        tool_name: string;
        learning_score: number;
        sample_count: number;
      }>;
      penalizedTools: Array<{
        tool_name: string;
        learning_score: number;
        sample_count: number;
      }>;
    };
    evidenceUsed: Array<{
      fact_type: string | null;
      fingerprint: string | null;
      title: string;
      summary: string | null;
      source_type: string | null;
      source_id: string | null;
      related_at: string | null;
      confidence_score: number | null;
      source_excerpt?: string | null;
      topic_tags?: string[];
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
      source_excerpt?: string | null;
      topic_tags?: string[];
    }>;
    topicMaps?: Array<{
      topic: string;
      score: number;
      evidence_count: number;
      source_types: string[];
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
  source_excerpt?: string | null;
  topic_tags?: string[];
}) {
  const parts = [
    item.fact_type ? `[${item.fact_type}]` : null,
    item.title,
    item.source_type ? `fonte ${item.source_type}` : null,
    shortFingerprint(item.fingerprint) ? `fp ${shortFingerprint(item.fingerprint)}` : null,
    item.confidence_score != null ? `score ${Number(item.confidence_score).toFixed(1)}` : null,
  ].filter(Boolean);
  const body = item.source_excerpt || item.summary;
  const topics = item.topic_tags?.length ? ` [${item.topic_tags.join(', ')}]` : '';
  return `${parts.join(' | ')}${body ? ` — ${body}` : ''}${topics}`;
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
        {observability.execution?.style ? <Chip size="small" label={`Estilo: ${observability.execution.style}`} variant="outlined" /> : null}
        {observability.execution?.sandboxOnly ? <Chip size="small" label="Sandbox" color="warning" variant="outlined" /> : null}
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
      {observability.memoryAudit?.actionPolicy?.modeSignals?.length ? (
        <Box sx={{ mt: 0.5 }}>
          <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', fontWeight: 700 }}>
            Política de ação
          </Typography>
          <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
            Preferido: {observability.memoryAudit.actionPolicy.preferredMode || 'n/a'}
            {observability.memoryAudit.actionPolicy.preferredStyle ? ` / estilo ${observability.memoryAudit.actionPolicy.preferredStyle}` : ''}
          </Typography>
          {observability.memoryAudit.actionPolicy.modeSignals.slice(0, 2).map((item) => (
            <Typography key={`mode-${item.mode}`} variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
              modo {item.mode} — ganho {Number(item.learning_score).toFixed(2)} em {item.sample_count} casos
            </Typography>
          ))}
        </Box>
      ) : null}
      {observability.memoryAudit?.toolPolicy?.preferredTools?.length ? (
        <Box sx={{ mt: 0.5 }}>
          <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', fontWeight: 700 }}>
            Política de ferramentas
          </Typography>
          {observability.memoryAudit.toolPolicy.preferredTools.slice(0, 3).map((item) => (
            <Typography key={`tool-pref-${item.tool_name}`} variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
              preferida {item.tool_name} — ganho {Number(item.learning_score).toFixed(2)} em {item.sample_count} casos
            </Typography>
          ))}
          {observability.memoryAudit.toolPolicy.penalizedTools.slice(0, 2).map((item) => (
            <Typography key={`tool-pen-${item.tool_name}`} variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
              cautela {item.tool_name} — peso {Number(item.learning_score).toFixed(2)} em {item.sample_count} casos
            </Typography>
          ))}
        </Box>
      ) : null}
      {observability.memoryAudit?.retrievalLearning?.boostedFacts?.length ? (
        <Box sx={{ mt: 0.5 }}>
          <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', fontWeight: 700 }}>
            Retrieval favoreceu
          </Typography>
          {observability.memoryAudit.retrievalLearning.boostedFacts.slice(0, 3).map((item) => (
            <Typography key={`boost-${item.fingerprint}`} variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
              {(item.title || shortFingerprint(item.fingerprint) || item.fingerprint)} — ganho {Number(item.learning_score).toFixed(2)}
            </Typography>
          ))}
        </Box>
      ) : null}
      {observability.memoryAudit?.retrievalLearning?.penalizedFacts?.length ? (
        <Box sx={{ mt: 0.5 }}>
          <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', fontWeight: 700 }}>
            Retrieval atenuou
          </Typography>
          {observability.memoryAudit.retrievalLearning.penalizedFacts.slice(0, 2).map((item) => (
            <Typography key={`penalty-${item.fingerprint}`} variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
              {(item.title || shortFingerprint(item.fingerprint) || item.fingerprint)} — peso {Number(item.learning_score).toFixed(2)}
            </Typography>
          ))}
        </Box>
      ) : null}
      {observability.memoryAudit?.retrievalStrategy ? (
        <Box sx={{ mt: 0.5 }}>
          <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', fontWeight: 700 }}>
            Estratégia de retrieval
          </Typography>
          <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
            fontes {observability.memoryAudit.retrievalStrategy.favoredSourceTypes.join(' | ') || 'n/a'} / fatos {observability.memoryAudit.retrievalStrategy.favoredFactTypes.join(' | ') || 'n/a'}
          </Typography>
          <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
            budget D{observability.memoryAudit.retrievalStrategy.budget.directives} C{observability.memoryAudit.retrievalStrategy.budget.commitments} E{observability.memoryAudit.retrievalStrategy.budget.evidence} Doc{observability.memoryAudit.retrievalStrategy.budget.documents}
          </Typography>
        </Box>
      ) : null}
      {observability.memoryAudit?.topicMaps?.length ? (
        <Box sx={{ mt: 0.5 }}>
          <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', fontWeight: 700 }}>
            Mapas de tema
          </Typography>
          {observability.memoryAudit.topicMaps.slice(0, 4).map((item) => (
            <Typography key={`topic-${item.topic}`} variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
              {item.topic} — score {Number(item.score).toFixed(2)} em {item.evidence_count} sinais ({item.source_types.join(' | ')})
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
