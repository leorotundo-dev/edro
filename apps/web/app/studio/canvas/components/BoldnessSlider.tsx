'use client';

import Box from '@mui/material/Box';
import Slider from '@mui/material/Slider';
import Typography from '@mui/material/Typography';

type Props = {
  value: number;
  onChange: (v: number) => void;
};

const EDRO_ORANGE = '#E85219';

export default function BoldnessSlider({ value, onChange }: Props) {
  const label = value <= 0.3 ? 'Conservador'
    : value <= 0.7 ? 'Equilibrado'
    : 'Arrojado';

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 140 }}>
      <Typography variant="caption" sx={{ color: '#666', fontSize: '0.6rem', whiteSpace: 'nowrap' }}>
        {label}
      </Typography>
      <Slider
        size="small"
        min={0}
        max={1}
        step={0.1}
        value={value}
        onChange={(_, v) => onChange(v as number)}
        sx={{
          width: 80,
          color: EDRO_ORANGE,
          '& .MuiSlider-thumb': { width: 12, height: 12 },
          '& .MuiSlider-track': { height: 3 },
          '& .MuiSlider-rail': { height: 3, bgcolor: '#333' },
        }}
      />
    </Box>
  );
}
