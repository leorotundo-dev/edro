'use client';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { IconSparkles } from '@tabler/icons-react';

interface Props {
  text: string;
  confidence?: 'high' | 'medium' | 'low';
}

const CONFIDENCE_COLOR = {
  high:   '#13DEB9',
  medium: '#F8A800',
  low:    '#888',
};

export default function RecommendationBanner({ text, confidence = 'medium' }: Props) {
  const color = CONFIDENCE_COLOR[confidence];

  return (
    <Box sx={{
      borderRadius: 1.5,
      border: `1px solid ${color}33`,
      bgcolor: `${color}08`,
      px: 1.25,
      py: 0.9,
      mb: 1.25,
    }}>
      <Stack direction="row" spacing={0.75} alignItems="flex-start">
        <IconSparkles size={11} color={color} style={{ marginTop: 2, flexShrink: 0 }} />
        <Typography sx={{
          fontSize: '0.6rem',
          color: color,
          lineHeight: 1.5,
          fontStyle: 'italic',
        }}>
          {text}
        </Typography>
      </Stack>
    </Box>
  );
}
