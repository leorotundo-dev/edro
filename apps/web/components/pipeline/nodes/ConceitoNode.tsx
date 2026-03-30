'use client';
import { Handle, Position } from '@xyflow/react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import {
  IconBulb, IconCheck, IconRefresh, IconFlame, IconBrain,
  IconEye, IconMoodSmile, IconArrowRight,
} from '@tabler/icons-react';
import { useState } from 'react';
import NodeShell from '../NodeShell';
import { usePipeline } from '../PipelineContext';
import { apiPost } from '@/lib/api';

const RISK_COLORS: Record<string, string> = {
  safe:      '#13DEB9',
  moderate:  '#F59E0B',
  bold:      '#EF4444',
};

const RISK_LABELS: Record<string, string> = {
  safe:      'Seguro',
  moderate:  'Moderado',
  bold:      'Arrojado',
};

type ConceptResult = {
  concept_id: string;
  headline_concept: string;
  emotional_truth: string;
  cultural_angle: string;
  visual_direction: string;
  suggested_structure: string;
  risk_level: 'safe' | 'moderate' | 'bold';
  rationale: string;
};

type ConceitoApiResult = {
  concepts: ConceptResult[];
  recommended_index: number;
  approved_index?: number;
  tensoes?: { top_tensao?: { formula: string } };
};

export default function ConceitoNode() {
  const { briefing, nodeStatus, setConceitoResult, conceitoResult } = usePipeline() as any;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<number | null>(null);

  const status = nodeStatus.conceito ?? (nodeStatus.briefing === 'done' ? 'active' : 'locked');
  const result: ConceitoApiResult | null = conceitoResult ?? null;

  const selectedConceito = result?.concepts?.[selected ?? result?.recommended_index ?? 0] ?? null;

  async function handleGenerate() {
    setLoading(true);
    setError('');
    try {
      const clientId = briefing?.client_id;
      const res = await apiPost<{ success: boolean; concepts: ConceptResult[]; recommended_index: number; tensoes?: any }>(
        '/studio/creative/conceito',
        {
          briefing: {
            title: briefing?.titulo ?? '',
            objective: briefing?.objetivo ?? '',
            context: briefing?.contexto,
          },
          clientProfile: briefing?.clientProfile,
          clientId,
          platform: briefing?.plataforma,
        },
      );
      if (!res.success) throw new Error('Falha ao gerar conceitos');
      setConceitoResult(res);
      setSelected(res.recommended_index ?? 0);
    } catch (e: any) {
      setError(e?.message ?? 'Erro');
    } finally {
      setLoading(false);
    }
  }

  function handleApprove() {
    if (!result || selected === null) return;
    setConceitoResult({ ...result, approved_index: selected });
  }

  const approved = result?.approved_index !== undefined;
  const approvedConceito = approved
    ? result?.concepts?.[result?.approved_index as number]
    : null;

  const collapsedSummary = approvedConceito ? (
    <Stack direction="row" spacing={0.75} alignItems="center">
      <IconCheck size={12} color="#13DEB9" />
      <Box>
        <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: 'text.primary', lineHeight: 1.2 }}>
          {approvedConceito.headline_concept.slice(0, 50)}
        </Typography>
        <Typography sx={{ fontSize: '0.6rem', color: 'text.disabled' }}>
          {approvedConceito.suggested_structure} · tensão: {result?.tensoes?.top_tensao?.formula?.slice(0, 40) ?? '—'}
        </Typography>
      </Box>
    </Stack>
  ) : null;

  return (
    <Box>
      <Handle type="target" position={Position.Left} id="conceito_in"
        style={{ background: '#444', width: 8, height: 8, border: 'none' }} />

      <NodeShell
        title="Conceito Criativo"
        icon={<IconBulb size={14} />}
        status={approved ? 'done' : status === 'locked' ? 'locked' : loading ? 'running' : 'active'}
        accentColor="#A855F7"
        collapsedSummary={collapsedSummary}
        onRerun={result ? handleGenerate : undefined}
      >
        {loading && (
          <Box sx={{ mb: 1.5 }}>
            <LinearProgress sx={{ borderRadius: 1, '& .MuiLinearProgress-bar': { background: 'linear-gradient(90deg,#A855F7,#EC4899)' } }} />
            <Typography sx={{ fontSize: '0.68rem', color: 'text.disabled', mt: 0.5 }}>
              Gerando conceitos criativos…
            </Typography>
          </Box>
        )}

        {error && (
          <Typography sx={{ fontSize: '0.7rem', color: '#EF4444', mb: 1 }}>{error}</Typography>
        )}

        {!result && !loading && (
          <Button
            size="small"
            variant="contained"
            startIcon={<IconBulb size={14} />}
            onClick={handleGenerate}
            disabled={status === 'locked'}
            sx={{ fontSize: '0.72rem', textTransform: 'none', background: 'linear-gradient(135deg,#A855F7,#EC4899)', '&:hover': { opacity: 0.9 } }}
          >
            Gerar Conceitos
          </Button>
        )}

        {result && !approved && (
          <Stack spacing={1}>
            {/* Tensão */}
            {result.tensoes?.top_tensao?.formula && (
              <Box sx={{ p: 1, borderRadius: 1, background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.2)' }}>
                <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 0.3 }}>
                  <IconFlame size={11} color="#A855F7" />
                  <Typography sx={{ fontSize: '0.62rem', color: '#A855F7', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Tensão Criativa
                  </Typography>
                </Stack>
                <Typography sx={{ fontSize: '0.7rem', color: 'text.primary', fontStyle: 'italic' }}>
                  "{result.tensoes.top_tensao.formula}"
                </Typography>
              </Box>
            )}

            {/* Concept cards */}
            {result.concepts.map((concept, idx) => {
              const isRec = idx === result.recommended_index;
              const isSel = idx === selected;
              return (
                <Box
                  key={concept.concept_id}
                  onClick={() => setSelected(idx)}
                  sx={{
                    p: 1, borderRadius: 1, cursor: 'pointer',
                    border: isSel ? '1px solid #A855F7' : '1px solid rgba(255,255,255,0.07)',
                    background: isSel ? 'rgba(168,85,247,0.1)' : 'rgba(255,255,255,0.02)',
                    transition: 'all 0.15s',
                    '&:hover': { borderColor: 'rgba(168,85,247,0.5)' },
                  }}
                >
                  <Stack direction="row" spacing={0.5} alignItems="flex-start" sx={{ mb: 0.5 }}>
                    <Chip
                      label={`C${idx + 1}${isRec ? ' ★' : ''}`}
                      size="small"
                      sx={{ fontSize: '0.58rem', height: 16, background: isSel ? '#A855F7' : 'rgba(255,255,255,0.08)', color: isSel ? '#fff' : 'text.secondary' }}
                    />
                    <Chip
                      label={RISK_LABELS[concept.risk_level]}
                      size="small"
                      sx={{ fontSize: '0.58rem', height: 16, background: `${RISK_COLORS[concept.risk_level]}22`, color: RISK_COLORS[concept.risk_level] }}
                    />
                    <Chip
                      label={concept.suggested_structure}
                      size="small"
                      sx={{ fontSize: '0.58rem', height: 16, background: 'rgba(255,255,255,0.06)', color: 'text.disabled' }}
                    />
                  </Stack>

                  <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: 'text.primary', lineHeight: 1.3, mb: 0.4 }}>
                    {concept.headline_concept}
                  </Typography>

                  <Stack spacing={0.3}>
                    <Stack direction="row" spacing={0.4} alignItems="flex-start">
                      <IconMoodSmile size={10} color="#EC4899" style={{ marginTop: 1, flexShrink: 0 }} />
                      <Typography sx={{ fontSize: '0.63rem', color: 'text.secondary', lineHeight: 1.3 }}>
                        {concept.emotional_truth}
                      </Typography>
                    </Stack>
                    {concept.visual_direction && (
                      <Stack direction="row" spacing={0.4} alignItems="flex-start">
                        <IconEye size={10} color="#5D87FF" style={{ marginTop: 1, flexShrink: 0 }} />
                        <Typography sx={{ fontSize: '0.63rem', color: 'text.secondary', lineHeight: 1.3 }}>
                          {concept.visual_direction}
                        </Typography>
                      </Stack>
                    )}
                  </Stack>
                </Box>
              );
            })}

            {/* Actions */}
            <Stack direction="row" spacing={0.75}>
              <Button
                size="small"
                variant="contained"
                startIcon={<IconCheck size={13} />}
                onClick={handleApprove}
                disabled={selected === null}
                sx={{ flex: 1, fontSize: '0.7rem', textTransform: 'none', background: '#A855F7', '&:hover': { background: '#9333EA' } }}
              >
                Adotar Conceito
              </Button>
              <Tooltip title="Regenerar conceitos">
                <IconButton size="small" onClick={handleGenerate} sx={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                  <IconRefresh size={13} />
                </IconButton>
              </Tooltip>
            </Stack>
          </Stack>
        )}

        {approved && approvedConceito && (
          <Box sx={{ p: 1, borderRadius: 1, background: 'rgba(13,222,185,0.06)', border: '1px solid rgba(13,222,185,0.2)' }}>
            <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 0.4 }}>
              <IconCheck size={12} color="#13DEB9" />
              <Typography sx={{ fontSize: '0.65rem', color: '#13DEB9', fontWeight: 700 }}>
                Conceito adotado — passa para Copy + Arte
              </Typography>
            </Stack>
            <Typography sx={{ fontSize: '0.7rem', color: 'text.primary', fontWeight: 600, mb: 0.3 }}>
              {approvedConceito.headline_concept}
            </Typography>
            <Typography sx={{ fontSize: '0.63rem', color: 'text.secondary' }}>
              {approvedConceito.emotional_truth}
            </Typography>
            {approvedConceito.visual_direction && (
              <Stack direction="row" spacing={0.4} alignItems="flex-start" sx={{ mt: 0.4 }}>
                <IconArrowRight size={10} color="#5D87FF" style={{ marginTop: 2 }} />
                <Typography sx={{ fontSize: '0.63rem', color: '#5D87FF' }}>
                  Arte: {approvedConceito.visual_direction}
                </Typography>
              </Stack>
            )}
          </Box>
        )}
      </NodeShell>

      <Handle type="source" position={Position.Right} id="conceito_out"
        style={{ background: '#A855F7', width: 8, height: 8, border: 'none' }} />
    </Box>
  );
}
