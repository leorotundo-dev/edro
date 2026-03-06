'use client';
import { Handle, Position } from '@xyflow/react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import { IconBrain, IconCheck, IconArrowUpRight, IconSparkles } from '@tabler/icons-react';
import { useState } from 'react';
import NodeShell from '../NodeShell';
import { usePipeline } from '../PipelineContext';

type Insight = {
  label: string;
  uplift: string;
  color: string;
  ruleText: string;
};

export default function LearningFeedbackNode() {
  const { nodeStatus, selectedTrigger, activeFormat, briefing } = usePipeline();
  const isAvailable = nodeStatus.arte === 'done';

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  // Build synthetic insights from what we know about this pipeline run
  const insights: Insight[] = [];
  if (selectedTrigger) {
    const TRIGGER_NAMES: Record<string, string> = {
      G01: 'Escassez', G02: 'Autoridade', G03: 'Prova Social',
      G04: 'Reciprocidade', G05: 'Curiosidade', G06: 'Identidade', G07: 'Dor/Solução',
    };
    insights.push({
      label: `Gatilho ${selectedTrigger} — ${TRIGGER_NAMES[selectedTrigger] || ''}`,
      uplift: '+estimado',
      color: '#13DEB9',
      ruleText: `Usar gatilho ${selectedTrigger} (${TRIGGER_NAMES[selectedTrigger]}) para objetivo "${briefing?.payload?.objective || 'engajamento'}"`,
    });
  }
  if (activeFormat?.platform && activeFormat?.format) {
    insights.push({
      label: `${activeFormat.platform} ${activeFormat.format}`,
      uplift: '+estimado',
      color: '#5D87FF',
      ruleText: `Formato ${activeFormat.format} no ${activeFormat.platform} para "${briefing?.payload?.objective || 'engajamento'}"`,
    });
  }
  if (briefing?.payload?.objective) {
    insights.push({
      label: `Objetivo: ${briefing.payload.objective}`,
      uplift: '',
      color: '#F8A800',
      ruleText: `Pipeline completo para objetivo "${briefing.payload.objective}"`,
    });
  }

  const handleSave = async () => {
    const clientId = typeof window !== 'undefined'
      ? window.localStorage.getItem('edro_active_client_id')
      : null;
    if (!clientId || !insights.length) {
      setSaved(true);
      return;
    }
    setSaving(true);
    setError('');
    try {
      const { apiPost } = await import('@/lib/api');
      await Promise.allSettled(
        insights.map((ins) =>
          apiPost(`/clients/${clientId}/learning-rules/compute`, {
            rule_name: ins.label,
            effective_pattern: ins.ruleText,
            uplift_metric: 'engagement_rate',
            uplift_value: 0,
            confidence: 0.5,
          })
        )
      );
      setSaved(true);
    } catch (e: any) {
      setError(e?.message || 'Erro ao salvar aprendizados.');
    } finally {
      setSaving(false);
    }
  };

  const collapsedSummary = (
    <Stack direction="row" spacing={0.75} alignItems="center">
      <IconCheck size={12} color="#13DEB9" />
      <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: 'text.primary' }}>
        {insights.length} aprendizado{insights.length !== 1 ? 's' : ''} salvo{insights.length !== 1 ? 's' : ''}
      </Typography>
    </Stack>
  );

  return (
    <Box>
      <Handle type="target" position={Position.Left} id="feedback_in"
        style={{ background: '#444', width: 8, height: 8, border: 'none' }} />
      <NodeShell
        title="Fechar Loop de Aprendizado"
        icon={<IconBrain size={14} />}
        status={saved ? 'done' : saving ? 'running' : isAvailable ? 'active' : 'locked'}
        accentColor="#0EA5E9"
        width={280}
        collapsedSummary={collapsedSummary}
      >
        <Stack spacing={1.25}>
          <Stack direction="row" spacing={0.5} alignItems="center">
            <IconSparkles size={12} color="#0EA5E9" />
            <Typography sx={{ fontSize: '0.6rem', color: '#0EA5E9', fontWeight: 600 }}>
              O sistema aprendeu com este pipeline
            </Typography>
          </Stack>

          {insights.length > 0 ? (
            <Stack spacing={0.75}>
              {insights.map((ins, i) => (
                <Box key={i} sx={{
                  p: 0.75, borderRadius: 1.5,
                  bgcolor: `${ins.color}08`, border: `1px solid ${ins.color}33`,
                }}>
                  <Stack direction="row" spacing={0.5} alignItems="flex-start">
                    <IconArrowUpRight size={12} color={ins.color} style={{ flexShrink: 0, marginTop: 1 }} />
                    <Box>
                      <Typography sx={{ fontSize: '0.62rem', fontWeight: 600, color: ins.color }}>
                        {ins.label}
                        {ins.uplift && (
                          <Typography component="span" sx={{ fontSize: '0.55rem', color: '#888', ml: 0.5 }}>
                            {ins.uplift}
                          </Typography>
                        )}
                      </Typography>
                      <Typography sx={{ fontSize: '0.58rem', color: 'text.disabled', lineHeight: 1.4, mt: 0.2 }}>
                        {ins.ruleText}
                      </Typography>
                    </Box>
                  </Stack>
                </Box>
              ))}
            </Stack>
          ) : (
            <Typography sx={{ fontSize: '0.62rem', color: '#555' }}>
              Complete o pipeline (gatilho + arte) para gerar aprendizados.
            </Typography>
          )}

          {error && <Typography sx={{ fontSize: '0.6rem', color: '#FF4D4D' }}>{error}</Typography>}

          <Button
            variant="contained" size="small" fullWidth
            onClick={handleSave}
            disabled={saving || !isAvailable || insights.length === 0}
            startIcon={saving ? <CircularProgress size={12} sx={{ color: '#fff' }} /> : <IconBrain size={13} />}
            sx={{
              bgcolor: '#0EA5E9', color: '#fff', fontWeight: 700,
              fontSize: '0.7rem', textTransform: 'none',
              '&:hover': { bgcolor: '#0284c7' },
              '&.Mui-disabled': { bgcolor: '#2a2a2a', color: '#555' },
            }}
          >
            {saving ? 'Salvando…' : 'Salvar Aprendizados'}
          </Button>

          <Typography sx={{ fontSize: '0.58rem', color: '#444', textAlign: 'center', lineHeight: 1.4 }}>
            Esses aprendizados aparecem no próximo briefing similar, influenciando o pipeline recomendado.
          </Typography>
        </Stack>
      </NodeShell>
      {/* Loop-back handle — pink edge connects back to Briefing node */}
      <Handle type="source" position={Position.Top} id="feedback_loop"
        style={{ background: '#EC4899', width: 8, height: 8, border: 'none' }} />
    </Box>
  );
}
