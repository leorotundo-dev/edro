'use client';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Chip from '@mui/material/Chip';
import Link from 'next/link';
import {
  IconFileText, IconLink, IconCircleCheck, IconBulb,
  IconRss, IconChartBar, IconSparkles, IconArchive,
  IconCalendar, IconBrain, IconExternalLink, IconCopy, IconMessageSearch,
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
};

type Props = { artifact: Artifact; clientId?: string | null };

export default function ArtifactCard({ artifact, clientId }: Props) {
  const meta = ARTIFACT_MAP[artifact.type];
  if (!meta) return null;

  const Icon = meta.icon;
  const subtitle = artifact.message || artifact.brief?.slice(0, 80) || null;

  // Determine action (link or copy)
  const href = artifact.studio_url
    ? artifact.studio_url
    : artifact.briefing_id && clientId
    ? `/clients/${clientId}/briefings`
    : artifact.pauta_id && clientId
    ? `/clients/${clientId}/clipping`
    : null;

  const copyValue = artifact.approvalUrl ?? null;
  const evidenceItems = Array.isArray(artifact.evidence) ? artifact.evidence.slice(0, 3) : [];
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
        {artifact.type === 'retrieve_client_evidence' && evidenceItems.length > 0 && (
          <Box sx={{ mt: 0.75, display: 'flex', flexDirection: 'column', gap: 0.4 }}>
            {evidenceItems.map((item: any, index: number) => (
              <Typography key={`${item.source_id || index}`} variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.35, fontSize: '0.68rem' }}>
                {item.source_label}: {item.title}
              </Typography>
            ))}
          </Box>
        )}
      </Box>
      {href && (
        <Tooltip title={artifact.studio_url ? 'Abrir no Studio' : 'Ver'}>
          <IconButton size="small" component={Link} href={href} sx={{ color: meta.color, p: 0.5 }}>
            <IconExternalLink size={14} />
          </IconButton>
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
