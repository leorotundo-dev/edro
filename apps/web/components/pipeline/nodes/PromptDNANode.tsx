'use client';
import { Handle, Position } from '@xyflow/react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import { IconCode } from '@tabler/icons-react';
import { usePipeline } from '../PipelineContext';

// Mirrors backend promptDNA.ts AMD → taskType + trigger stack resolution
const AMD_TASK_MAP: Record<string, { taskType: string; triggers: string[]; patterns: string[] }> = {
  compartilhar: {
    taskType:  'viral_copy',
    triggers:  ['Curiosidade', 'Dark Social', 'Identidade'],
    patterns:  ['afirmação de identidade', 'revelação de insider', 'tendência emergente'],
  },
  salvar: {
    taskType:  'educational_copy',
    triggers:  ['Autoridade', 'Reciprocidade'],
    patterns:  ['lista de valor', 'dica acionável', 'framework'],
  },
  clicar: {
    taskType:  'cta_copy',
    triggers:  ['Escassez', 'Prova Social'],
    patterns:  ['benefício claro', 'redução de risco', 'CTA imperativo'],
  },
  responder: {
    taskType:  'engagement_copy',
    triggers:  ['Curiosidade', 'Identidade'],
    patterns:  ['pergunta aberta', 'opinião dividida', 'incomplete loop'],
  },
  pedir_proposta: {
    taskType:  'conversion_copy',
    triggers:  ['Escassez', 'Dor/Solução', 'Prova Social'],
    patterns:  ['dor específica', 'solução imediata', 'prova de resultado'],
  },
};

const VAK_MAP: Record<string, string> = {
  Inspirador:   'K · Cinestésico — sinta, vivencie, transforme',
  Profissional: 'V · Visual — veja, observe, imagine',
  Casual:       'A · Auditório — ouça, ecoe, ressoe',
  Persuasivo:   'K · Cinestésico — ação, resultado, impacto',
};

const COGNITIVE_LOAD: Record<string, { label: string; chars: string }> = {
  instagram:  { label: 'Instagram', chars: '≤ 125 chars visíveis' },
  linkedin:   { label: 'LinkedIn',  chars: '≤ 210 chars antes do "ver mais"' },
  twitter:    { label: 'Twitter',   chars: '≤ 280 chars totais' },
  facebook:   { label: 'Facebook',  chars: '≤ 80 chars para maior engajamento' },
};

export default function PromptDNANode() {
  const { amd, tone, funnelPhase, activeFormat } = usePipeline();

  const amdData = amd ? AMD_TASK_MAP[amd] : null;
  const vakLabel = tone ? VAK_MAP[tone] : null;

  const hour = new Date().getHours();
  const bioSync =
    hour < 6  ? { label: 'Madrugada', note: 'evitar conteúdo demandante' } :
    hour < 12 ? { label: 'Manhã',     note: 'foco, aprendizado, decisões' } :
    hour < 18 ? { label: 'Tarde',     note: 'ação, comparação, pesquisa' } :
                { label: 'Noite',     note: 'entretenimento, inspiração, escape' };

  const platform = activeFormat?.platform?.toLowerCase();
  const cognitiveLoad = platform ? COGNITIVE_LOAD[platform] ?? null : null;

  const FUNNEL_COPY: Record<string, string> = {
    awareness:    'Awareness — alcance e descoberta',
    consideracao: 'Consideração — nutrir e educar',
    conversao:    'Conversão — fechar e vender',
  };

  return (
    <Box sx={{
      width: 240,
      bgcolor: 'rgba(34,211,238,0.04)',
      border: '1px dashed #22D3EE55',
      borderRadius: 2,
      overflow: 'hidden',
    }}>
      <Handle type="source" position={Position.Right} id="prompt_out"
        style={{ background: '#22D3EE', width: 8, height: 8, border: 'none', top: '50%' }} />

      {/* Header */}
      <Box sx={{ px: 1.5, py: 1, borderBottom: '1px solid #22D3EE22', display: 'flex', alignItems: 'center', gap: 0.75 }}>
        <IconCode size={12} color="#22D3EE" />
        <Typography sx={{ fontSize: '0.62rem', fontWeight: 700, color: '#22D3EE', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Parâmetros do Prompt
        </Typography>
      </Box>

      <Box sx={{ p: 1.25 }}>
        <Stack spacing={0.875}>

          {/* AMD → taskType resolution */}
          <Box>
            <Typography sx={{ fontSize: '0.52rem', color: '#22D3EE', mb: 0.3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              AMD → Pipeline IA
            </Typography>
            {amdData ? (
              <>
                <Typography sx={{ fontSize: '0.62rem', color: '#67e8f9', fontWeight: 700, mb: 0.3 }}>
                  {amdData.taskType}
                </Typography>
                <Stack direction="row" spacing={0.4} flexWrap="wrap" gap={0.4}>
                  {amdData.triggers.slice(0, 3).map((t, i) => (
                    <Chip key={i} size="small" label={t}
                      sx={{ height: 15, fontSize: '0.5rem', bgcolor: 'rgba(34,211,238,0.1)', color: '#22D3EE', border: 'none' }} />
                  ))}
                </Stack>
              </>
            ) : (
              <Typography sx={{ fontSize: '0.57rem', color: '#444', fontStyle: 'italic' }}>
                Defina AMD no Briefing para ativar o pipeline ideal
              </Typography>
            )}
          </Box>

          {/* VAK modality */}
          <Box>
            <Typography sx={{ fontSize: '0.52rem', color: '#555', mb: 0.3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Modalidade VAK
            </Typography>
            <Typography sx={{ fontSize: '0.57rem', color: vakLabel ? '#67e8f9' : '#444', fontStyle: vakLabel ? 'normal' : 'italic' }}>
              {vakLabel ?? 'Inferida do tom de voz (definir no Briefing)'}
            </Typography>
          </Box>

          {/* Bio-Sincronia */}
          <Box>
            <Typography sx={{ fontSize: '0.52rem', color: '#555', mb: 0.3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Bio-Sincronia · Agora
            </Typography>
            <Stack direction="row" spacing={0.75} alignItems="center">
              <Chip size="small" label={bioSync.label}
                sx={{ height: 16, fontSize: '0.5rem', bgcolor: 'rgba(34,211,238,0.12)', color: '#22D3EE', border: 'none', flexShrink: 0 }} />
              <Typography sx={{ fontSize: '0.55rem', color: '#555', lineHeight: 1.3 }}>{bioSync.note}</Typography>
            </Stack>
          </Box>

          {/* Funil phase */}
          <Box>
            <Typography sx={{ fontSize: '0.52rem', color: '#555', mb: 0.3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Fase do Funil
            </Typography>
            <Typography sx={{ fontSize: '0.57rem', color: '#888' }}>
              {FUNNEL_COPY[funnelPhase] ?? funnelPhase}
            </Typography>
          </Box>

          {/* Cognitive load */}
          {cognitiveLoad && (
            <Box>
              <Typography sx={{ fontSize: '0.52rem', color: '#555', mb: 0.3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Carga Cognitiva · {cognitiveLoad.label}
              </Typography>
              <Typography sx={{ fontSize: '0.57rem', color: '#888' }}>
                {cognitiveLoad.chars}
              </Typography>
            </Box>
          )}

        </Stack>
      </Box>
    </Box>
  );
}
