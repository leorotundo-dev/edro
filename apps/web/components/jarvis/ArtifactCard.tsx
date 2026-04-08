'use client';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import Link from 'next/link';
import {
  IconFileText, IconLink, IconCircleCheck, IconBulb,
  IconRss, IconChartBar, IconSparkles, IconArchive,
  IconCalendar, IconBrain, IconExternalLink, IconCopy, IconMessageSearch, IconAlertTriangle,
} from '@tabler/icons-react';

export type Artifact = {
  type: string;
  message?: string;
  briefing_id?: string;
  pauta_id?: string;
  approvalUrl?: string;
  brief?: string;
  [key: string]: any;
};

export type JarvisClientAction = {
  type: 'apply_memory_governance' | 'apply_memory_governance_and_retry_creative' | 'retry_creative_with_confirmation';
  actions?: Array<{
    action: 'archive' | 'replace';
    target_fingerprint: string;
    replacement_fingerprint?: string | null;
    reason?: string | null;
  }>;
};

export type JarvisArtifactAction = {
  message: string;
  clientAction: JarvisClientAction;
  pageData?: Record<string, unknown> | null;
};

type ArtifactMeta = {
  icon: React.ElementType;
  label: string;
  color: string;
};

const ARTIFACT_MAP: Record<string, ArtifactMeta> = {
  create_briefing:           { icon: IconFileText,     label: 'Briefing criado',               color: '#3B82F6' },
  archive_briefing:          { icon: IconArchive,      label: 'Briefing arquivado',             color: '#6B7280' },
  delete_briefing:           { icon: IconFileText,     label: 'Briefing deletado',              color: '#EF4444' },
  generate_approval_link:    { icon: IconLink,         label: 'Link de aprovação gerado',       color: '#8B5CF6' },
  schedule_briefing:         { icon: IconCalendar,     label: 'Publicação agendada',            color: '#10B981' },
  prepare_post_approval:     { icon: IconLink,         label: 'Aprovação preparada',            color: '#8B5CF6' },
  schedule_post_publication: { icon: IconCalendar,     label: 'Post agendado',                  color: '#10B981' },
  publish_studio_post:       { icon: IconExternalLink, label: 'Post publicado',                 color: '#0EA5E9' },
  approve_pauta:             { icon: IconCircleCheck,  label: 'Pauta aprovada · Brief criado', color: '#10B981' },
  reject_pauta:              { icon: IconCircleCheck,  label: 'Pauta rejeitada',               color: '#EF4444' },
  generate_pauta:            { icon: IconSparkles,     label: 'Pauta enfileirada (A/B em breve)', color: '#F59E0B' },
  generate_strategic_brief:  { icon: IconBulb,         label: 'Brief estratégico',             color: '#8B5CF6' },
  compute_behavior_profiles: { icon: IconChartBar,     label: 'Perfis comportamentais recalculados', color: '#3B82F6' },
  compute_learning_rules:    { icon: IconBrain,        label: 'Regras de aprendizado recalculadas', color: '#3B82F6' },
  add_clipping_source:       { icon: IconRss,          label: 'Fonte de monitoramento adicionada', color: '#10B981' },
  add_calendar_event:        { icon: IconCalendar,     label: 'Evento adicionado ao calendário', color: '#F59E0B' },
  create_campaign:           { icon: IconSparkles,     label: 'Campanha criada',                color: '#8B5CF6' },
  retrieve_client_evidence:  { icon: IconMessageSearch,label: 'Evidências recuperadas',         color: '#0EA5E9' },
  create_post_pipeline:      { icon: IconSparkles,     label: 'Pipeline de post criado',        color: '#E85219' },
  creative_execution:        { icon: IconSparkles,     label: 'Direção criativa resolvida',     color: '#E85219' },
  memory_governance_gate:    { icon: IconAlertTriangle,label: 'Gate de governança da memória',  color: '#D97706' },
  memory_governance_applied: { icon: IconArchive,      label: 'Governança aplicada',            color: '#0EA5E9' },
  creative_conflict_gate:    { icon: IconAlertTriangle,label: 'Conflito criativo detectado',   color: '#EF4444' },
};

type Props = {
  artifact: Artifact;
  clientId?: string | null;
  onRunClientAction?: (action: JarvisArtifactAction) => void;
};

export default function ArtifactCard({ artifact, clientId, onRunClientAction }: Props) {
  const meta = ARTIFACT_MAP[artifact.type];
  if (!meta) return null;

  const Icon = meta.icon;
  const subtitle = artifact.message || artifact.brief?.slice(0, 80) || null;

  const href = artifact.post_url
    ? artifact.post_url
    : artifact.studio_url
    ? artifact.studio_url
    : artifact.briefing_id && clientId
    ? `/clients/${clientId}/briefings`
    : artifact.pauta_id && clientId
    ? `/clients/${clientId}/clipping`
    : null;
  const isExternalHref = Boolean(href && /^https?:\/\//i.test(href));

  const copyValue = artifact.approvalUrl ?? null;
  const evidenceItems = Array.isArray(artifact.evidence) ? artifact.evidence.slice(0, 3) : [];
  const governance = artifact.memory_governance || null;
  const keyFactsUsed = Array.isArray(artifact.key_facts_used) ? artifact.key_facts_used.slice(0, 5) : [];
  const governanceSuggestions = Array.isArray(artifact.suggested_actions)
    ? artifact.suggested_actions.slice(0, 4)
    : Array.isArray(governance?.suggestions)
    ? governance.suggestions.slice(0, 4)
    : [];
  const briefingCompensations = Array.isArray(artifact.briefing_compensations) ? artifact.briefing_compensations.slice(0, 4) : [];
  const ignoredMemoryFacts = Array.isArray(artifact.ignored_memory_facts) ? artifact.ignored_memory_facts.slice(0, 4) : [];
  const appliedGovernanceActions = Array.isArray(artifact.applied_governance_actions)
    ? artifact.applied_governance_actions
    : Array.isArray(artifact.applied_actions)
    ? artifact.applied_actions
    : [];
  const briefingConflicts = Array.isArray(artifact.briefing_diagnostics?.conflicts)
    ? artifact.briefing_diagnostics.conflicts.slice(0, 3)
    : Array.isArray(artifact.diagnostics?.conflicts)
    ? artifact.diagnostics.conflicts.slice(0, 3)
    : [];
  const artifactPageData = {
    currentJobId: artifact.job_id || undefined,
    jobId: artifact.job_id || undefined,
    currentBriefingId: artifact.briefing_id || undefined,
    briefingId: artifact.briefing_id || undefined,
    creativeSessionId: artifact.creative_session_id || undefined,
    sessionId: artifact.creative_session_id || undefined,
    clientId: clientId || undefined,
  };
  const jobStatus = String((artifact as any).job_status || '').trim().toLowerCase();
  const statusLabel = jobStatus === 'queued'
    ? 'na fila'
    : jobStatus === 'processing'
    ? 'em processamento'
    : jobStatus === 'failed'
    ? 'falhou'
    : jobStatus === 'done'
    ? 'pronto'
    : null;
  const statusColor = jobStatus === 'failed'
    ? '#EF4444'
    : jobStatus === 'done'
    ? '#10B981'
    : meta.color;

  return (
    <Box
      sx={{
        mt: 1,
        p: 1.5,
        borderRadius: 2,
        border: `1px solid ${meta.color}30`,
        bgcolor: `${meta.color}08`,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 1.5,
      }}
    >
      <Box sx={{ color: meta.color, mt: 0.25, flexShrink: 0 }}>
        <Icon size={16} />
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="caption" sx={{ fontWeight: 700, color: meta.color, display: 'block', lineHeight: 1.3 }}>
          {meta.label}
        </Typography>
        {subtitle && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25, lineHeight: 1.4, fontSize: '0.68rem' }}>
            {subtitle.length > 80 ? subtitle.slice(0, 80) + '…' : subtitle}
          </Typography>
        )}
        {artifact.type === 'create_post_pipeline' && (
          <>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.35, lineHeight: 1.45, fontSize: '0.68rem' }}>
              {artifact.briefing_title ? `${artifact.briefing_title} · ` : ''}{artifact.platform || ''}{artifact.format ? ` · ${artifact.format}` : ''}
            </Typography>
            {(statusLabel || artifact.error) && (
              <Box sx={{ mt: 0.75, display: 'flex', flexWrap: 'wrap', gap: 0.75, alignItems: 'center' }}>
                {statusLabel && (
                  <Chip
                    size="small"
                    label={statusLabel}
                    sx={{
                      height: 22,
                      fontSize: '0.68rem',
                      bgcolor: `${statusColor}12`,
                      color: statusColor,
                      border: `1px solid ${statusColor}30`,
                    }}
                  />
                )}
                {artifact.error && (
                  <Typography variant="caption" color="error.main" sx={{ fontSize: '0.68rem', lineHeight: 1.4 }}>
                    {artifact.error}
                  </Typography>
                )}
              </Box>
            )}
          </>
        )}
        {artifact.type === 'creative_execution' && (
          <>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.35, lineHeight: 1.45, fontSize: '0.68rem' }}>
              {artifact.concept_headline ? `Conceito: ${artifact.concept_headline}` : ''}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.35, lineHeight: 1.45, fontSize: '0.68rem' }}>
              {artifact.copy_title ? `Copy: ${artifact.copy_title} · ` : ''}{artifact.has_arte ? 'copy + arte prontas' : 'copy + visual brief prontos'}
            </Typography>
            {governance && (
              <Box sx={{ mt: 0.75, display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                <Chip size="small" label={`pressão ${governance.summary?.governance_pressure || 'low'}`} sx={{ height: 22, fontSize: '0.68rem', bgcolor: `${meta.color}12`, color: meta.color, border: `1px solid ${meta.color}30` }} />
                {governance.summary?.active_conflicts ? <Chip size="small" label={`${governance.summary.active_conflicts} conflito(s)`} sx={{ height: 22, fontSize: '0.68rem' }} /> : null}
                {governance.summary?.stale_facts ? <Chip size="small" label={`${governance.summary.stale_facts} fato(s) velhos`} sx={{ height: 22, fontSize: '0.68rem' }} /> : null}
              </Box>
            )}
            {keyFactsUsed.length > 0 && (
              <Box sx={{ mt: 0.75, display: 'flex', flexDirection: 'column', gap: 0.35 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.68rem', color: 'text.secondary' }}>
                  Fatos usados
                </Typography>
                {keyFactsUsed.map((item: any, index: number) => (
                  <Typography key={`${item.kind}-${index}`} variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.35, fontSize: '0.68rem' }}>
                    {item.kind}: {item.title}
                  </Typography>
                ))}
              </Box>
            )}
            {briefingCompensations.length > 0 && (
              <Box sx={{ mt: 0.75, display: 'flex', flexDirection: 'column', gap: 0.35 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.68rem', color: 'text.secondary' }}>
                  Compensações aplicadas
                </Typography>
                {briefingCompensations.map((item: string, index: number) => (
                  <Typography key={`comp-${index}`} variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.35, fontSize: '0.68rem' }}>
                    {item}
                  </Typography>
                ))}
              </Box>
            )}
            {ignoredMemoryFacts.length > 0 && (
              <Box sx={{ mt: 0.75, display: 'flex', flexDirection: 'column', gap: 0.35 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.68rem', color: 'text.secondary' }}>
                  Fatos atenuados por governança
                </Typography>
                {ignoredMemoryFacts.map((item: string, index: number) => (
                  <Typography key={`ignored-${index}`} variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.35, fontSize: '0.68rem' }}>
                    {item}
                  </Typography>
                ))}
              </Box>
            )}
            {appliedGovernanceActions.length > 0 && (
              <Box sx={{ mt: 0.75, display: 'flex', flexDirection: 'column', gap: 0.35 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.68rem', color: 'text.secondary' }}>
                  Limpeza aplicada
                </Typography>
                {appliedGovernanceActions.slice(0, 3).map((item: any, index: number) => (
                  <Typography key={`${item.target_fingerprint || index}`} variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.35, fontSize: '0.68rem' }}>
                    {item.action === 'replace' ? 'Substituído' : 'Arquivado'}: {item.target_title}{item.replacement_title ? ` → ${item.replacement_title}` : ''}
                  </Typography>
                ))}
              </Box>
            )}
            {briefingConflicts.length > 0 && (
              <Box sx={{ mt: 0.75, display: 'flex', flexDirection: 'column', gap: 0.35 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.68rem', color: 'text.secondary' }}>
                  Conflitos considerados
                </Typography>
                {briefingConflicts.map((item: any, index: number) => (
                  <Typography key={`${item.type || 'conflict'}-${index}`} variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.35, fontSize: '0.68rem' }}>
                    {item.message}
                  </Typography>
                ))}
              </Box>
            )}
          </>
        )}
        {(artifact.type === 'memory_governance_gate' || artifact.type === 'creative_conflict_gate') && (
          <>
            {governance && (
              <Box sx={{ mt: 0.75, display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                <Chip size="small" label={`pressão ${governance.summary?.governance_pressure || 'low'}`} sx={{ height: 22, fontSize: '0.68rem', bgcolor: `${meta.color}12`, color: meta.color, border: `1px solid ${meta.color}30` }} />
                {governance.summary?.active_conflicts ? <Chip size="small" label={`${governance.summary.active_conflicts} conflito(s)`} sx={{ height: 22, fontSize: '0.68rem' }} /> : null}
                {governance.summary?.stale_facts ? <Chip size="small" label={`${governance.summary.stale_facts} fato(s) velhos`} sx={{ height: 22, fontSize: '0.68rem' }} /> : null}
              </Box>
            )}
            {briefingConflicts.length > 0 && (
              <Box sx={{ mt: 0.75, display: 'flex', flexDirection: 'column', gap: 0.35 }}>
                {briefingConflicts.map((item: any, index: number) => (
                  <Typography key={`${item.type || 'conflict'}-${index}`} variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.35, fontSize: '0.68rem' }}>
                    {item.message}
                  </Typography>
                ))}
              </Box>
            )}
            {ignoredMemoryFacts.length > 0 && (
              <Box sx={{ mt: 0.75, display: 'flex', flexDirection: 'column', gap: 0.35 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.68rem', color: 'text.secondary' }}>
                  O que está sendo atenuado
                </Typography>
                {ignoredMemoryFacts.map((item: string, index: number) => (
                  <Typography key={`gate-ignored-${index}`} variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.35, fontSize: '0.68rem' }}>
                    {item}
                  </Typography>
                ))}
              </Box>
            )}
            {governanceSuggestions.length > 0 && (
              <Box sx={{ mt: 0.75, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                {governanceSuggestions.map((item: any) => (
                  <Box key={item.target?.fingerprint} sx={{ p: 0.75, borderRadius: 1.5, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', fontSize: '0.68rem' }}>
                      {item.action === 'replace' ? 'Substituir' : 'Arquivar'} · {item.target?.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25, lineHeight: 1.35, fontSize: '0.68rem' }}>
                      {item.reason}
                    </Typography>
                    {onRunClientAction && item.target?.fingerprint ? (
                      <Box sx={{ mt: 0.6, display: 'flex', gap: 0.6, flexWrap: 'wrap' }}>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => onRunClientAction({
                            message: `${item.action === 'replace' ? 'Substitua' : 'Arquive'} o fato "${item.target?.title}" na memória viva.`,
                            clientAction: {
                              type: 'apply_memory_governance',
                              actions: [{
                                action: item.action,
                                target_fingerprint: item.target.fingerprint,
                                replacement_fingerprint: item.replacement?.fingerprint || null,
                                reason: item.reason,
                              }],
                            },
                            pageData: artifactPageData,
                          })}
                          sx={{ minHeight: 28, fontSize: '0.68rem' }}
                        >
                          {item.action === 'replace' ? 'Substituir' : 'Arquivar'}
                        </Button>
                      </Box>
                    ) : null}
                  </Box>
                ))}
              </Box>
            )}
            {onRunClientAction && (
              <Box sx={{ mt: 0.9, display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                {artifact.type === 'memory_governance_gate' && governanceSuggestions.length > 0 ? (
                  <Button
                    size="small"
                    variant="contained"
                    onClick={() => onRunClientAction({
                      message: 'Aplique a limpeza sugerida e reexecute a criação.',
                      clientAction: {
                        type: 'apply_memory_governance_and_retry_creative',
                        actions: governanceSuggestions
                          .filter((item: any) => item?.target?.fingerprint)
                          .map((item: any) => ({
                            action: item.action,
                            target_fingerprint: item.target.fingerprint,
                            replacement_fingerprint: item.replacement?.fingerprint || null,
                            reason: item.reason,
                          })),
                      },
                      pageData: artifactPageData,
                    })}
                    sx={{ minHeight: 28, fontSize: '0.68rem' }}
                  >
                    Limpar e reexecutar
                  </Button>
                ) : null}
                <Button
                  size="small"
                  variant="text"
                  onClick={() => onRunClientAction({
                    message: 'Confirmo seguir com a criação mesmo com a memória/governança atual.',
                    clientAction: { type: 'retry_creative_with_confirmation' },
                    pageData: artifactPageData,
                  })}
                  sx={{ minHeight: 28, fontSize: '0.68rem' }}
                >
                  Seguir mesmo assim
                </Button>
              </Box>
            )}
          </>
        )}
        {artifact.type === 'memory_governance_applied' && appliedGovernanceActions.length > 0 && (
          <Box sx={{ mt: 0.75, display: 'flex', flexDirection: 'column', gap: 0.35 }}>
            {appliedGovernanceActions.slice(0, 4).map((item: any, index: number) => (
              <Typography key={`${item.target_fingerprint || index}`} variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.35, fontSize: '0.68rem' }}>
                {item.action === 'replace' ? 'Substituído' : 'Arquivado'}: {item.target_title}{item.replacement_title ? ` → ${item.replacement_title}` : ''}
              </Typography>
            ))}
          </Box>
        )}
        {artifact.type === 'retrieve_client_evidence' && evidenceItems.length > 0 && (
          <Box sx={{ mt: 0.75, display: 'flex', flexDirection: 'column', gap: 0.4 }}>
            {evidenceItems.map((item: any, index: number) => (
              <Typography key={`${item.source_id || index}`} variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.35, fontSize: '0.68rem' }}>
                {item.source_label}: {item.title}
              </Typography>
            ))}
          </Box>
        )}
        {(artifact.type === 'prepare_post_approval' || artifact.type === 'schedule_post_publication' || artifact.type === 'publish_studio_post') && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.35, lineHeight: 1.45, fontSize: '0.68rem' }}>
            {artifact.briefing_id ? `Briefing ${artifact.briefing_id.slice(0, 8)} · ` : ''}{artifact.channel ? `${artifact.channel} · ` : ''}{artifact.scheduled_for ? artifact.scheduled_for : ''}
          </Typography>
        )}
      </Box>
      {href && (
        <Tooltip title={artifact.post_url ? 'Abrir publicação' : artifact.studio_url ? 'Abrir no Studio' : 'Ver'}>
          {isExternalHref ? (
            <IconButton size="small" component="a" href={href} target="_blank" rel="noreferrer" sx={{ color: meta.color, p: 0.5 }}>
              <IconExternalLink size={14} />
            </IconButton>
          ) : (
            <IconButton size="small" component={Link} href={href} sx={{ color: meta.color, p: 0.5 }}>
              <IconExternalLink size={14} />
            </IconButton>
          )}
        </Tooltip>
      )}
      {copyValue && (
        <Tooltip title="Copiar link">
          <IconButton
            size="small"
            sx={{ color: meta.color, p: 0.5 }}
            onClick={() => navigator.clipboard.writeText(copyValue).catch(() => {})}
          >
            <IconCopy size={14} />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  );
}
