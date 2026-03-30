'use client';
import { Handle, Position } from '@xyflow/react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import LinearProgress from '@mui/material/LinearProgress';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import {
  IconCalendarEvent, IconCheck, IconRefresh, IconSend,
  IconChevronDown, IconChevronUp, IconTarget,
} from '@tabler/icons-react';
import { useState } from 'react';
import NodeShell from '../NodeShell';
import { usePipeline } from '../PipelineContext';
import { apiPost } from '@/lib/api';

type TemplateType = 'lancamento' | 'data_comemorativa' | 'nurture' | 'reativacao';

const TEMPLATE_LABELS: Record<TemplateType, string> = {
  lancamento:        'Lançamento (7 peças)',
  data_comemorativa: 'Data Comemorativa (3 peças)',
  nurture:           'Nurture de Base (4 peças)',
  reativacao:        'Reativação (3 peças)',
};

const FUNIL_COLORS: Record<string, string> = {
  awareness:    '#5D87FF',
  consideracao: '#F59E0B',
  conversao:    '#13DEB9',
  retencao:     '#A855F7',
  reativacao:   '#EF4444',
};

type Peca = {
  id: string;
  posicao_no_funil: string;
  numero_na_sequencia: number;
  titulo_interno: string;
  plataforma: string;
  formato: string;
  copy: {
    headline: string;
    body: string;
    cta: string;
    contexto_assumido: string;
  };
  instrucao_visual: string;
  gatilho_psicologico: string;
  timing_days: number;
};

type CampanhaResult = {
  campanha_id: string;
  nome: string;
  template: string;
  conceito_usado: string;
  arco_narrativo: string;
  pecas: Peca[];
  calendario_sugerido: { peca_id: string; data_sugerida: string; plataforma: string; horario_sugerido: string }[];
  regras_de_consistencia: string[];
  metricas_de_sucesso: string[];
};

export default function CampanhaNode() {
  const { briefing, nodeStatus, conceitoResult } = usePipeline() as any;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<CampanhaResult | null>(null);
  const [template, setTemplate] = useState<TemplateType>('nurture');
  const [expandedPeca, setExpandedPeca] = useState<string | null>(null);

  const status = nodeStatus.campanha ?? (nodeStatus.briefing === 'done' ? 'active' : 'locked');
  const approved = !!result;

  const approvedConceito = conceitoResult?.approved_index !== undefined
    ? conceitoResult?.concepts?.[conceitoResult.approved_index]
    : null;

  async function handleGenerate() {
    setLoading(true);
    setError('');
    try {
      const res = await apiPost<{ success: boolean; data: CampanhaResult }>(
        '/studio/creative/campanha',
        {
          template,
          conceito: approvedConceito ?? null,
          briefing: {
            produto:        briefing?.titulo ?? '',
            objetivo_final: briefing?.objetivo ?? '',
            mensagem_chave: approvedConceito?.headline_concept ?? briefing?.objetivo ?? '',
            audiencia:      briefing?.clientProfile?.knowledge_base?.target_audience ?? 'Público-alvo geral',
            tom:            briefing?.clientProfile?.knowledge_base?.brand_voice ?? 'Profissional e próximo',
          },
          clientId:    briefing?.client_id,
          plataformas: briefing?.plataforma ? [briefing.plataforma] : ['instagram'],
        },
      );
      if (!res.success) throw new Error('Falha ao gerar campanha');
      setResult(res.data);
    } catch (e: any) {
      setError(e?.message ?? 'Erro');
    } finally {
      setLoading(false);
    }
  }

  const collapsedSummary = result ? (
    <Stack direction="row" spacing={0.75} alignItems="center">
      <IconCheck size={12} color="#13DEB9" />
      <Box>
        <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: 'text.primary', lineHeight: 1.2 }}>
          {result.nome.slice(0, 45)}
        </Typography>
        <Typography sx={{ fontSize: '0.6rem', color: 'text.disabled' }}>
          {result.pecas.length} peças · {TEMPLATE_LABELS[result.template as TemplateType] ?? result.template}
        </Typography>
      </Box>
    </Stack>
  ) : null;

  return (
    <Box>
      <Handle type="target" position={Position.Left} id="campanha_in"
        style={{ background: '#444', width: 8, height: 8, border: 'none' }} />

      <NodeShell
        title="Campanha Sequencial"
        icon={<IconCalendarEvent size={14} />}
        status={approved ? 'done' : status === 'locked' ? 'locked' : loading ? 'running' : 'active'}
        accentColor="#F59E0B"
        collapsedSummary={collapsedSummary}
        onRerun={result ? handleGenerate : undefined}
      >
        {loading && (
          <Box sx={{ mb: 1.5 }}>
            <LinearProgress sx={{ borderRadius: 1, '& .MuiLinearProgress-bar': { background: 'linear-gradient(90deg,#F59E0B,#EF4444)' } }} />
            <Typography sx={{ fontSize: '0.68rem', color: 'text.disabled', mt: 0.5 }}>
              Gerando campanha sequencial…
            </Typography>
          </Box>
        )}

        {error && (
          <Typography sx={{ fontSize: '0.7rem', color: '#EF4444', mb: 1 }}>{error}</Typography>
        )}

        {!result && !loading && (
          <Stack spacing={1.5}>
            {approvedConceito && (
              <Box sx={{ p: 0.75, borderRadius: 1, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
                <Typography sx={{ fontSize: '0.62rem', color: '#F59E0B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', mb: 0.3 }}>
                  Conceito adotado
                </Typography>
                <Typography sx={{ fontSize: '0.68rem', color: 'text.primary' }}>
                  {approvedConceito.headline_concept.slice(0, 60)}
                </Typography>
              </Box>
            )}

            <Box>
              <Typography sx={{ fontSize: '0.65rem', color: 'text.secondary', mb: 0.5 }}>Template</Typography>
              <Select
                size="small"
                value={template}
                onChange={(e) => setTemplate(e.target.value as TemplateType)}
                fullWidth
                sx={{ fontSize: '0.72rem', '& .MuiSelect-select': { py: 0.6 } }}
                disabled={status === 'locked'}
              >
                {(Object.entries(TEMPLATE_LABELS) as [TemplateType, string][]).map(([val, label]) => (
                  <MenuItem key={val} value={val} sx={{ fontSize: '0.72rem' }}>{label}</MenuItem>
                ))}
              </Select>
            </Box>

            <Button
              size="small"
              variant="contained"
              startIcon={<IconCalendarEvent size={14} />}
              onClick={handleGenerate}
              disabled={status === 'locked'}
              sx={{ fontSize: '0.72rem', textTransform: 'none', background: 'linear-gradient(135deg,#F59E0B,#EF4444)', '&:hover': { opacity: 0.9 } }}
            >
              Gerar Campanha
            </Button>
          </Stack>
        )}

        {result && (
          <Stack spacing={1}>
            {/* Arco narrativo */}
            <Box sx={{ p: 0.75, borderRadius: 1, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
              <Typography sx={{ fontSize: '0.62rem', color: '#F59E0B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', mb: 0.3 }}>
                Arco Narrativo
              </Typography>
              <Typography sx={{ fontSize: '0.68rem', color: 'text.primary', lineHeight: 1.4 }}>
                {result.arco_narrativo}
              </Typography>
            </Box>

            {/* Peças */}
            <Typography sx={{ fontSize: '0.65rem', color: 'text.disabled', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {result.pecas.length} Peças
            </Typography>

            {result.pecas.map((peca) => {
              const isExpanded = expandedPeca === peca.id;
              const cal = result.calendario_sugerido.find(c => c.peca_id === peca.id);
              const funilColor = FUNIL_COLORS[peca.posicao_no_funil] ?? '#888';

              return (
                <Box
                  key={peca.id}
                  sx={{
                    borderRadius: 1,
                    border: `1px solid ${funilColor}44`,
                    background: `${funilColor}08`,
                    overflow: 'hidden',
                  }}
                >
                  <Stack
                    direction="row"
                    alignItems="center"
                    spacing={0.5}
                    sx={{ px: 1, py: 0.75, cursor: 'pointer' }}
                    onClick={() => setExpandedPeca(isExpanded ? null : peca.id)}
                  >
                    <Box sx={{
                      minWidth: 18, height: 18, borderRadius: '50%',
                      background: funilColor, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Typography sx={{ fontSize: '0.58rem', fontWeight: 700, color: '#fff' }}>
                        {peca.numero_na_sequencia}
                      </Typography>
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, color: 'text.primary', lineHeight: 1.2 }} noWrap>
                        {peca.titulo_interno}
                      </Typography>
                      <Stack direction="row" spacing={0.4} alignItems="center">
                        <Chip label={peca.posicao_no_funil} size="small"
                          sx={{ fontSize: '0.55rem', height: 14, background: `${funilColor}22`, color: funilColor }} />
                        {cal && (
                          <Typography sx={{ fontSize: '0.58rem', color: 'text.disabled' }}>
                            D+{peca.timing_days} · {cal.horario_sugerido}
                          </Typography>
                        )}
                      </Stack>
                    </Box>
                    {isExpanded ? <IconChevronUp size={12} /> : <IconChevronDown size={12} />}
                  </Stack>

                  {isExpanded && (
                    <Box sx={{ px: 1, pb: 1, borderTop: `1px solid ${funilColor}22` }}>
                      <Stack spacing={0.75} sx={{ pt: 0.75 }}>
                        <Box>
                          <Typography sx={{ fontSize: '0.6rem', color: 'text.disabled', mb: 0.2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Headline</Typography>
                          <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, color: 'text.primary' }}>
                            {peca.copy.headline}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography sx={{ fontSize: '0.6rem', color: 'text.disabled', mb: 0.2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Body</Typography>
                          <Typography sx={{ fontSize: '0.63rem', color: 'text.secondary', lineHeight: 1.4 }}>
                            {peca.copy.body.slice(0, 120)}{peca.copy.body.length > 120 ? '…' : ''}
                          </Typography>
                        </Box>
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <Chip label={`CTA: ${peca.copy.cta}`} size="small"
                            sx={{ fontSize: '0.6rem', height: 18, background: 'rgba(255,255,255,0.06)', color: 'text.secondary', maxWidth: 180 }} />
                          <Chip label={peca.gatilho_psicologico} size="small"
                            sx={{ fontSize: '0.6rem', height: 18, background: 'rgba(255,255,255,0.06)', color: 'text.disabled' }} />
                        </Stack>
                        {peca.copy.contexto_assumido && (
                          <Typography sx={{ fontSize: '0.6rem', color: 'text.disabled', fontStyle: 'italic', lineHeight: 1.3 }}>
                            ↩ {peca.copy.contexto_assumido}
                          </Typography>
                        )}
                      </Stack>
                    </Box>
                  )}
                </Box>
              );
            })}

            <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)' }} />

            {/* Regras de consistência */}
            <Box>
              <Typography sx={{ fontSize: '0.62rem', color: 'text.disabled', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', mb: 0.5 }}>
                Regras de Consistência
              </Typography>
              <Stack spacing={0.3}>
                {result.regras_de_consistencia.slice(0, 3).map((regra, i) => (
                  <Stack key={i} direction="row" spacing={0.4} alignItems="flex-start">
                    <Box sx={{ width: 4, height: 4, borderRadius: '50%', background: '#F59E0B', mt: 0.7, flexShrink: 0 }} />
                    <Typography sx={{ fontSize: '0.62rem', color: 'text.secondary', lineHeight: 1.4 }}>
                      {regra}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            </Box>

            <Stack direction="row" spacing={0.75}>
              <Tooltip title="Regenerar campanha">
                <IconButton size="small" onClick={handleGenerate} sx={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                  <IconRefresh size={13} />
                </IconButton>
              </Tooltip>
              <Chip
                label={`${result.pecas.length} peças · ${TEMPLATE_LABELS[result.template as TemplateType] ?? result.template}`}
                size="small"
                icon={<IconTarget size={11} />}
                sx={{ fontSize: '0.62rem', height: 22, background: 'rgba(245,158,11,0.12)', color: '#F59E0B', flex: 1, justifyContent: 'flex-start' }}
              />
            </Stack>
          </Stack>
        )}
      </NodeShell>

      <Handle type="source" position={Position.Right} id="campanha_out"
        style={{ background: '#F59E0B', width: 8, height: 8, border: 'none' }} />
    </Box>
  );
}
