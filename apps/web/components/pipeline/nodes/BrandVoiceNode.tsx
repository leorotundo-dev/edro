'use client';
import { Handle, Position } from '@xyflow/react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import { IconSpeakerphone } from '@tabler/icons-react';
import { useState } from 'react';

type BrandVoice = {
  personality?: string[];
  tone?: string[];
  vocabulary?: string[];
  dos?: string[];
  donts?: string[];
  content_themes?: string[];
};

interface Props {
  data: {
    brand_voice?: BrandVoice;
    must_mentions?: string[];
    rejection_patterns?: { type: string; keywords: string[]; reason?: string }[];
    formality_level?: number;
    emoji_usage?: string;
    risk_tolerance?: string;
  };
}

export default function BrandVoiceNode({ data }: Props) {
  const [tab, setTab] = useState<'voz' | 'restricoes'>('voz');
  const bv = data.brand_voice ?? {};
  const hasVoice = (bv.personality?.length ?? 0) + (bv.tone?.length ?? 0) + (bv.vocabulary?.length ?? 0) > 0;
  const hasRestr = (data.must_mentions?.length ?? 0) + (data.rejection_patterns?.length ?? 0) > 0;

  return (
    <Box sx={{
      width: 260,
      bgcolor: 'rgba(236,72,153,0.05)',
      border: '1px dashed #EC489955',
      borderRadius: 2,
      overflow: 'hidden',
    }}>
      <Handle type="source" position={Position.Right} id="voice_out"
        style={{ background: '#EC4899', width: 8, height: 8, border: 'none', top: '50%' }} />

      {/* Header with tab pills */}
      <Box sx={{ px: 1.5, py: 1, borderBottom: '1px solid #EC489922', display: 'flex', alignItems: 'center', gap: 0.75 }}>
        <IconSpeakerphone size={12} color="#EC4899" />
        <Typography sx={{ fontSize: '0.62rem', fontWeight: 700, color: '#EC4899', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Voz da Marca
        </Typography>
        <Stack direction="row" spacing={0.25} ml="auto">
          {(['voz', 'restricoes'] as const).map((t) => (
            <Box key={t} onClick={() => setTab(t)} sx={{
              px: 0.75, py: 0.2, borderRadius: 1, cursor: 'pointer',
              bgcolor: tab === t ? 'rgba(236,72,153,0.2)' : 'transparent',
              border: '1px solid', borderColor: tab === t ? '#EC4899' : 'transparent',
            }}>
              <Typography sx={{ fontSize: '0.5rem', color: tab === t ? '#EC4899' : '#555', fontWeight: tab === t ? 700 : 400 }}>
                {t === 'voz' ? 'Voz' : 'Restrições'}
              </Typography>
            </Box>
          ))}
        </Stack>
      </Box>

      <Box sx={{ p: 1.25 }}>
        {tab === 'voz' && (
          <>
            {!hasVoice && (
              <Typography sx={{ fontSize: '0.6rem', color: '#444', textAlign: 'center', py: 0.5 }}>
                Brand voice não configurado
              </Typography>
            )}
            {(bv.personality?.length ?? 0) > 0 && (
              <Box mb={0.75}>
                <Typography sx={{ fontSize: '0.52rem', color: '#555', mb: 0.3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Personalidade</Typography>
                <Stack direction="row" spacing={0.4} flexWrap="wrap" gap={0.4}>
                  {bv.personality!.slice(0, 4).map((p, i) => (
                    <Chip key={i} size="small" label={p}
                      sx={{ height: 16, fontSize: '0.52rem', bgcolor: 'rgba(236,72,153,0.12)', color: '#EC4899', border: 'none' }} />
                  ))}
                </Stack>
              </Box>
            )}
            {(bv.tone?.length ?? 0) > 0 && (
              <Box mb={0.75}>
                <Typography sx={{ fontSize: '0.52rem', color: '#555', mb: 0.3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Tom</Typography>
                <Stack direction="row" spacing={0.4} flexWrap="wrap" gap={0.4}>
                  {bv.tone!.slice(0, 4).map((t, i) => (
                    <Chip key={i} size="small" label={t}
                      sx={{ height: 16, fontSize: '0.52rem', bgcolor: 'rgba(236,72,153,0.08)', color: '#f472b6', border: 'none' }} />
                  ))}
                </Stack>
              </Box>
            )}
            {(bv.vocabulary?.length ?? 0) > 0 && (
              <Box mb={0.75}>
                <Typography sx={{ fontSize: '0.52rem', color: '#555', mb: 0.3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Vocabulário</Typography>
                <Typography sx={{ fontSize: '0.57rem', color: '#888', lineHeight: 1.4 }}>
                  {bv.vocabulary!.slice(0, 6).join(', ')}
                  {(bv.vocabulary?.length ?? 0) > 6 ? '…' : ''}
                </Typography>
              </Box>
            )}
            {(bv.donts?.length ?? 0) > 0 && (
              <Box>
                <Typography sx={{ fontSize: '0.52rem', color: '#EF4444', mb: 0.3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Nunca usar</Typography>
                {bv.donts!.slice(0, 2).map((d, i) => (
                  <Typography key={i} sx={{ fontSize: '0.57rem', color: '#666', lineHeight: 1.4 }}>
                    × {d.slice(0, 65)}{d.length > 65 ? '…' : ''}
                  </Typography>
                ))}
              </Box>
            )}
          </>
        )}

        {tab === 'restricoes' && (
          <>
            {!hasRestr && (
              <Typography sx={{ fontSize: '0.6rem', color: '#444', textAlign: 'center', py: 0.5 }}>
                Sem restrições configuradas
              </Typography>
            )}
            {(data.must_mentions?.length ?? 0) > 0 && (
              <Box mb={0.875}>
                <Typography sx={{ fontSize: '0.52rem', color: '#22D3EE', mb: 0.3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Mencionar sempre</Typography>
                {data.must_mentions!.slice(0, 3).map((m, i) => (
                  <Typography key={i} sx={{ fontSize: '0.57rem', color: '#888', lineHeight: 1.4 }}>
                    ✓ {m.slice(0, 65)}{m.length > 65 ? '…' : ''}
                  </Typography>
                ))}
              </Box>
            )}
            {(data.rejection_patterns?.length ?? 0) > 0 && (
              <Box mb={0.875}>
                <Typography sx={{ fontSize: '0.52rem', color: '#EF4444', mb: 0.3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Padrões rejeitados</Typography>
                {data.rejection_patterns!.slice(0, 2).map((rp, i) => (
                  <Stack key={i} direction="row" spacing={0.5} alignItems="flex-start" mb={0.3}>
                    <Box sx={{ mt: 0.3, width: 5, height: 5, borderRadius: '50%', bgcolor: '#EF4444', flexShrink: 0 }} />
                    <Typography sx={{ fontSize: '0.57rem', color: '#666', lineHeight: 1.3 }}>
                      {rp.type}: {rp.keywords?.slice(0, 3).join(', ')}{(rp.keywords?.length ?? 0) > 3 ? '…' : ''}
                    </Typography>
                  </Stack>
                ))}
              </Box>
            )}
            <Stack direction="row" spacing={1.5} flexWrap="wrap">
              {data.formality_level !== undefined && (
                <Box>
                  <Typography sx={{ fontSize: '0.5rem', color: '#555', mb: 0.2 }}>Formalidade</Typography>
                  <Typography sx={{ fontSize: '0.62rem', color: '#888', fontWeight: 700 }}>{data.formality_level}/5</Typography>
                </Box>
              )}
              {data.emoji_usage && (
                <Box>
                  <Typography sx={{ fontSize: '0.5rem', color: '#555', mb: 0.2 }}>Emoji</Typography>
                  <Typography sx={{ fontSize: '0.62rem', color: '#888', fontWeight: 700 }}>{data.emoji_usage}</Typography>
                </Box>
              )}
              {data.risk_tolerance && (
                <Box>
                  <Typography sx={{ fontSize: '0.5rem', color: '#555', mb: 0.2 }}>Risco</Typography>
                  <Typography sx={{ fontSize: '0.62rem', color: '#888', fontWeight: 700 }}>{data.risk_tolerance}</Typography>
                </Box>
              )}
            </Stack>
          </>
        )}
      </Box>
    </Box>
  );
}
