'use client';

import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import { IconBrain } from '@tabler/icons-react';
import { useJarvis } from '@/contexts/JarvisContext';

interface Props {
  message: string;
  label?: string;
  tooltip?: string;
  size?: 'small' | 'medium';
  variant?: 'text' | 'outlined' | 'contained';
}

/**
 * Inline button that opens Jarvis with a pre-filled context-aware question.
 * Place next to metrics, sections, or data points to invite analysis.
 */
export default function AskJarvisButton({
  message,
  label = 'Perguntar ao Jarvis',
  tooltip,
  size = 'small',
  variant = 'text',
}: Props) {
  const { openWithMessage } = useJarvis();
  const tipText = tooltip ?? (message.length > 60 ? `${message.slice(0, 60)}…` : message);

  return (
    <Tooltip title={tipText} placement="top">
      <Button
        size={size}
        variant={variant}
        onClick={() => openWithMessage(message)}
        startIcon={<IconBrain size={14} />}
        sx={{
          color: '#E85219',
          borderColor: 'rgba(232,82,25,0.4)',
          fontSize: '0.75rem',
          textTransform: 'none',
          fontWeight: 500,
          px: 1.5,
          '&:hover': {
            bgcolor: 'rgba(232,82,25,0.06)',
            borderColor: '#E85219',
          },
        }}
      >
        {label}
      </Button>
    </Tooltip>
  );
}
