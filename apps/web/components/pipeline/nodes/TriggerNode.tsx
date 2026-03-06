'use client';
import { Handle, Position } from '@xyflow/react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import { IconBolt, IconCheck, IconChevronDown, IconSpeakerphone, IconUsers, IconShoppingCart } from '@tabler/icons-react';
import { useState } from 'react';
import NodeShell from '../NodeShell';
import RecommendationBanner from '../RecommendationBanner';
import { usePipeline, type FunnelPhase } from '../PipelineContext';

const TRIGGERS = [
  { id: 'G01', label: 'Escassez',     description: 'Urgência, tempo/quantidade limitado', color: '#FF4D4D', phases: ['conversao'] as FunnelPhase[] },
  { id: 'G02', label: 'Autoridade',   description: 'Credibilidade, números, especialistas', color: '#00B4FF', phases: ['awareness', 'consideracao'] as FunnelPhase[] },
  { id: 'G03', label: 'Prova Social', description: 'Depoimentos, comunidade, aprovação', color: '#13DEB9', phases: ['consideracao', 'conversao'] as FunnelPhase[] },
  { id: 'G04', label: 'Reciprocidade',description: 'Dar valor antes de pedir', color: '#F5C518', phases: ['awareness', 'consideracao'] as FunnelPhase[] },
  { id: 'G05', label: 'Curiosidade',  description: 'Lacuna, intriga, mistério', color: '#A855F7', phases: ['awareness'] as FunnelPhase[] },
  { id: 'G06', label: 'Identidade',   description: 'Pertencimento, estilo de vida', color: '#FB923C', phases: ['awareness', 'consideracao'] as FunnelPhase[] },
  { id: 'G07', label: 'Dor/Solução',  description: 'Nomear o problema e o alívio', color: '#888', phases: ['consideracao', 'conversao'] as FunnelPhase[] },
];

const FUNNEL_PHASES = [
  { id: 'awareness' as FunnelPhase,    label: 'Awareness',    icon: IconSpeakerphone, color: '#5D87FF',  description: 'Alcance e descoberta — apresentar a marca' },
  { id: 'consideracao' as FunnelPhase, label: 'Consideração', icon: IconUsers,        color: '#F8A800',  description: 'Nutrir interesse — educar e engajar' },
  { id: 'conversao' as FunnelPhase,    label: 'Conversão',    icon: IconShoppingCart, color: '#E85219',  description: 'Fechar — venda, lead, proposta' },
];

export default function TriggerNode() {
  const {
    selectedTrigger, setSelectedTrigger, triggerConfirmed, confirmTrigger, editTrigger,
    nodeStatus, triggerRanking, recommendations, funnelPhase, setFunnelPhase,
  } = usePipeline();

  const [showAll, setShowAll] = useState(false);
  const status = nodeStatus.trigger;
  const trigger = TRIGGERS.find(t => t.id === selectedTrigger);

  // Filter triggers by funnel phase — primary ones first, others still shown but dimmed
  const phaseFiltered = TRIGGERS.filter(t => t.phases.includes(funnelPhase));
  const phaseOther = TRIGGERS.filter(t => !t.phases.includes(funnelPhase));

  // Sort by AI ranking within each group if available
  const sortByRanking = (arr: typeof TRIGGERS) =>
    triggerRanking.length > 0
      ? [...arr].sort((a, b) => {
          const sa = triggerRanking.find(r => r.id === a.id)?.score ?? 0;
          const sb = triggerRanking.find(r => r.id === b.id)?.score ?? 0;
          return sb - sa;
        })
      : arr;

  const ranked = sortByRanking(phaseFiltered);
  const otherRanked = sortByRanking(phaseOther);

  // Top 2 always visible; rest behind "Ver mais"
  const visible = showAll ? [...ranked, ...otherRanked] : ranked.slice(0, 2);
  const hasMore = !showAll;

  const activePhase = FUNNEL_PHASES.find(p => p.id === funnelPhase)!;

  const collapsedSummary = (
    <Stack direction="row" spacing={0.75} alignItems="center">
      <Chip size="small" label={activePhase.label}
        sx={{ height: 18, fontSize: '0.58rem', bgcolor: `${activePhase.color}22`, color: activePhase.color }} />
      {trigger ? (
        <>
          <Chip size="small" label={trigger.id}
            sx={{ height: 18, fontSize: '0.6rem', bgcolor: `${trigger.color}22`, color: trigger.color, borderColor: trigger.color, border: '1px solid' }} />
          <Typography sx={{ fontSize: '0.65rem', color: 'text.secondary' }}>{trigger.description}</Typography>
        </>
      ) : (
        <Typography sx={{ fontSize: '0.65rem', color: 'text.disabled' }}>Sem gatilho</Typography>
      )}
    </Stack>
  );

  return (
    <Box>
      <Handle type="target" position={Position.Left} id="trigger_in"
        style={{ background: '#444', width: 10, height: 10, border: 'none' }} />

      <NodeShell
        title="Gatilho & Funil"
        icon={<IconBolt size={14} />}
        status={status}
        width={310}
        collapsedSummary={collapsedSummary}
        onEdit={editTrigger}
      >
        <Stack spacing={1.25}>
          {/* AI Recommendation */}
          {recommendations?.trigger && (
            <RecommendationBanner text={recommendations.trigger.text} confidence={recommendations.trigger.confidence} />
          )}

          {/* Funnel phase selector */}
          <Box>
            <Typography sx={{ fontSize: '0.58rem', color: '#555', mb: 0.6, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              Fase do funil
            </Typography>
            <Stack spacing={0.5}>
              {FUNNEL_PHASES.map((phase) => {
                const PhaseIcon = phase.icon;
                const isActive = funnelPhase === phase.id;
                return (
                  <Box key={phase.id} onClick={() => setFunnelPhase(phase.id)}
                    sx={{
                      display: 'flex', alignItems: 'center', gap: 1,
                      p: 0.75, borderRadius: 1.5, cursor: 'pointer',
                      border: '1.5px solid', transition: 'all 0.15s',
                      borderColor: isActive ? phase.color : '#1e1e1e',
                      bgcolor: isActive ? `${phase.color}10` : 'transparent',
                      '&:hover': { borderColor: `${phase.color}66` },
                    }}>
                    <PhaseIcon size={13} color={isActive ? phase.color : '#555'} />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontSize: '0.62rem', fontWeight: isActive ? 700 : 400,
                        color: isActive ? phase.color : 'text.secondary' }}>
                        {phase.label}
                      </Typography>
                      <Typography sx={{ fontSize: '0.55rem', color: '#555', lineHeight: 1.3 }}>
                        {phase.description}
                      </Typography>
                    </Box>
                    {isActive && (
                      <IconCheck size={11} color={phase.color} />
                    )}
                  </Box>
                );
              })}
            </Stack>
          </Box>

          {/* Triggers filtered for phase */}
          <Box>
            <Typography sx={{ fontSize: '0.58rem', color: '#555', mb: 0.5, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              {triggerRanking.length > 0 ? 'Gatilhos recomendados pela IA' : `Gatilhos para ${activePhase.label}`}
            </Typography>

            <Stack spacing={0.5}>
              {visible.map((t, i) => {
                const rank = triggerRanking.find(r => r.id === t.id);
                const isPhaseMatch = t.phases.includes(funnelPhase);
                const isSelected = selectedTrigger === t.id;
                return (
                  <Box key={t.id}
                    onClick={() => setSelectedTrigger(isSelected ? null : t.id)}
                    sx={{
                      p: 0.75, borderRadius: 1.5, cursor: 'pointer',
                      border: '1.5px solid', transition: 'all 0.15s',
                      borderColor: isSelected ? t.color : isPhaseMatch ? `${t.color}55` : 'divider',
                      bgcolor: isSelected ? `${t.color}12` : isPhaseMatch ? `${t.color}06` : 'transparent',
                      opacity: isPhaseMatch ? 1 : 0.5,
                      '&:hover': { borderColor: t.color, opacity: 1 },
                    }}
                  >
                    <Stack direction="row" alignItems="center" spacing={1} mb={rank?.reason ? 0.4 : 0}>
                      <Chip size="small" label={t.id}
                        sx={{ height: 18, fontSize: '0.58rem', bgcolor: `${t.color}22`, color: t.color,
                          border: 'none', flexShrink: 0, fontWeight: 700 }} />
                      <Typography sx={{ fontSize: '0.62rem', color: isSelected ? 'text.primary' : 'text.secondary', flex: 1 }}>
                        {t.label} — {t.description}
                      </Typography>
                      {rank && (
                        <Typography sx={{ fontSize: '0.55rem', color: t.color, fontWeight: 700, flexShrink: 0 }}>
                          {rank.score}%
                        </Typography>
                      )}
                    </Stack>
                    {rank?.reason && (
                      <Typography sx={{ fontSize: '0.57rem', color: '#666', ml: '26px', lineHeight: 1.4 }}>
                        {rank.reason}
                      </Typography>
                    )}
                  </Box>
                );
              })}
            </Stack>

            {hasMore && (
              <Button
                size="small" variant="text"
                onClick={() => setShowAll(true)}
                endIcon={<IconChevronDown size={12} />}
                sx={{ textTransform: 'none', fontSize: '0.6rem', color: '#555', py: 0, justifyContent: 'flex-start' }}
              >
                Ver outros gatilhos (outras fases)
              </Button>
            )}
          </Box>

          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined" size="small" fullWidth
              onClick={() => { setSelectedTrigger(null); confirmTrigger(); }}
              sx={{ textTransform: 'none', fontSize: '0.68rem', borderColor: 'divider', color: 'text.secondary' }}
            >
              Pular
            </Button>
            <Button
              variant="contained" size="small" fullWidth
              onClick={confirmTrigger}
              startIcon={<IconCheck size={13} />}
              sx={{ bgcolor: '#13DEB9', color: '#000', fontWeight: 700, fontSize: '0.68rem',
                textTransform: 'none', '&:hover': { bgcolor: '#0fb89e' } }}
            >
              Confirmar
            </Button>
          </Stack>
        </Stack>
      </NodeShell>

      <Handle type="source" position={Position.Right} id="trigger_out"
        style={{ background: triggerConfirmed ? '#13DEB9' : '#E85219', width: 10, height: 10, border: 'none' }} />
    </Box>
  );
}
