'use client';
import { Handle, Position } from '@xyflow/react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { IconBulb } from '@tabler/icons-react';

// Best-practice copy tips per platform/format
const FORMAT_TIPS: Record<string, { label: string; tips: string[] }> = {
  'instagram_feed': {
    label: 'Instagram Feed',
    tips: [
      'Primeira linha é decisiva — aparece sem expandir',
      'Emoji no início aumenta escaneabilidade',
      'CTA claro no final com verbo de ação',
    ],
  },
  'instagram_stories': {
    label: 'Instagram Stories',
    tips: [
      'Texto mínimo — imagem fala primeiro',
      'Urgência funciona bem (24h, hoje, agora)',
      'CTA em swipe up ou enquete',
    ],
  },
  'linkedin_feed': {
    label: 'LinkedIn',
    tips: [
      'Abertura com dado ou insight inesperado',
      'Tom profissional mas com voz humana',
      'Hashtags no fim, não no meio do texto',
    ],
  },
  'facebook_feed': {
    label: 'Facebook',
    tips: [
      'Storytelling curto converte bem',
      'Perguntas aumentam comentários',
      'Link no comentário, não na legenda',
    ],
  },
  'default': {
    label: 'Social Media',
    tips: [
      'Copy curto e direto ao ponto',
      'Benefício claro na primeira frase',
      'Um único CTA por peça',
    ],
  },
};

function resolveHints(platform?: string, format?: string) {
  const key = `${(platform || '').toLowerCase()}_${(format || '').toLowerCase().replace(/\s+/g, '_')}`;
  return FORMAT_TIPS[key] || FORMAT_TIPS[`${(platform || '').toLowerCase()}_feed`] || FORMAT_TIPS['default'];
}

interface Props {
  data: { platform?: string; format?: string };
}

export default function FormatHintsNode({ data }: Props) {
  const hints = resolveHints(data.platform, data.format);

  return (
    <Box sx={{
      width: 210,
      bgcolor: 'rgba(248,168,0,0.04)',
      border: '1px dashed #F8A80055',
      borderRadius: 2,
      overflow: 'hidden',
    }}>
      <Handle type="source" position={Position.Right} id="hints_out"
        style={{ background: '#F8A800', width: 8, height: 8, border: 'none', top: '50%' }} />

      {/* Header */}
      <Box sx={{ px: 1.5, py: 1, borderBottom: '1px solid #F8A80022', display: 'flex', alignItems: 'center', gap: 0.75 }}>
        <IconBulb size={12} color="#F8A800" />
        <Typography sx={{ fontSize: '0.62rem', fontWeight: 700, color: '#F8A800', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Boas Práticas
        </Typography>
        <Typography sx={{ fontSize: '0.55rem', color: '#555', ml: 'auto' }}>
          {hints.label}
        </Typography>
      </Box>

      <Box sx={{ p: 1.25 }}>
        <Stack spacing={0.75}>
          {hints.tips.map((tip, i) => (
            <Stack key={i} direction="row" spacing={0.75} alignItems="flex-start">
              <Box sx={{
                width: 14, height: 14, borderRadius: '50%', flexShrink: 0, mt: 0.1,
                bgcolor: 'rgba(248,168,0,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Typography sx={{ fontSize: '0.45rem', color: '#F8A800', fontWeight: 700 }}>
                  {i + 1}
                </Typography>
              </Box>
              <Typography sx={{ fontSize: '0.6rem', color: '#888', lineHeight: 1.4 }}>
                {tip}
              </Typography>
            </Stack>
          ))}
        </Stack>
      </Box>
    </Box>
  );
}
