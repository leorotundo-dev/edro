'use client';
import { Handle, Position } from '@xyflow/react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { IconUsers } from '@tabler/icons-react';

type Persona = {
  name?: string;
  age?: string;
  pain_points?: string[];
  desires?: string[];
  language?: string;
};

type Audience = {
  demographics?: string;
  pain_points?: string[];
  desires?: string[];
  language?: string;
};

interface Props {
  data: {
    personas?: Persona[];
    audience?: Audience | null;
  };
}

export default function PersonasNode({ data }: Props) {
  const personas = data.personas ?? [];
  const audience = data.audience;
  const hasData = personas.length > 0 || !!audience;

  return (
    <Box sx={{
      width: 240,
      bgcolor: 'rgba(168,85,247,0.05)',
      border: '1px dashed #A855F755',
      borderRadius: 2,
      overflow: 'hidden',
    }}>
      <Handle type="source" position={Position.Right} id="personas_out"
        style={{ background: '#A855F7', width: 8, height: 8, border: 'none', top: '50%' }} />

      {/* Header */}
      <Box sx={{ px: 1.5, py: 1, borderBottom: '1px solid #A855F722', display: 'flex', alignItems: 'center', gap: 0.75 }}>
        <IconUsers size={12} color="#A855F7" />
        <Typography sx={{ fontSize: '0.62rem', fontWeight: 700, color: '#A855F7', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Personas & Público
        </Typography>
        {personas.length > 0 && (
          <Typography sx={{ fontSize: '0.55rem', color: '#555', ml: 'auto' }}>
            {personas.length} ICP{personas.length > 1 ? 's' : ''}
          </Typography>
        )}
      </Box>

      <Box sx={{ p: 1.25 }}>
        {!hasData && (
          <Typography sx={{ fontSize: '0.6rem', color: '#444', textAlign: 'center', py: 0.5 }}>
            Sem personas definidas
          </Typography>
        )}

        {personas.slice(0, 2).map((p, i) => (
          <Box key={i} sx={{ mb: i < Math.min(personas.length, 2) - 1 ? 1 : 0 }}>
            <Stack direction="row" alignItems="center" spacing={0.5} mb={0.3}>
              <Box sx={{
                width: 16, height: 16, borderRadius: '50%',
                bgcolor: 'rgba(168,85,247,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <Typography sx={{ fontSize: '0.45rem', color: '#A855F7', fontWeight: 700 }}>{i + 1}</Typography>
              </Box>
              <Typography sx={{ fontSize: '0.62rem', fontWeight: 700, color: '#c084fc' }}>
                {p.name ?? `Persona ${i + 1}`}{p.age ? ` · ${p.age}` : ''}
              </Typography>
            </Stack>
            {p.pain_points?.[0] && (
              <Typography sx={{ fontSize: '0.57rem', color: '#666', ml: '20px', lineHeight: 1.3, mb: 0.2 }}>
                Dor: {p.pain_points[0].slice(0, 65)}{p.pain_points[0].length > 65 ? '…' : ''}
              </Typography>
            )}
            {p.desires?.[0] && (
              <Typography sx={{ fontSize: '0.57rem', color: '#666', ml: '20px', lineHeight: 1.3 }}>
                Desejo: {p.desires[0].slice(0, 65)}{p.desires[0].length > 65 ? '…' : ''}
              </Typography>
            )}
          </Box>
        ))}

        {!personas.length && audience && (
          <Box>
            {audience.demographics && (
              <Typography sx={{ fontSize: '0.6rem', color: '#888', lineHeight: 1.4, mb: 0.5 }}>
                {audience.demographics.slice(0, 110)}{audience.demographics.length > 110 ? '…' : ''}
              </Typography>
            )}
            {audience.pain_points?.slice(0, 3).map((pt, i) => (
              <Stack key={i} direction="row" spacing={0.5} alignItems="flex-start" mb={0.3}>
                <Box sx={{ mt: 0.35, width: 4, height: 4, borderRadius: '50%', bgcolor: '#A855F7', flexShrink: 0 }} />
                <Typography sx={{ fontSize: '0.57rem', color: '#666', lineHeight: 1.3 }}>
                  {pt.slice(0, 70)}{pt.length > 70 ? '…' : ''}
                </Typography>
              </Stack>
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
}
