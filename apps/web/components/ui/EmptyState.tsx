'use client';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';

type EmptyStateProps = {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  iconColor?: string;
  iconBg?: string;
  gradient?: boolean;
  size?: 'small' | 'default';
};

export default function EmptyState({
  icon,
  title,
  description,
  action,
  iconColor,
  iconBg,
  gradient,
  size = 'default',
}: EmptyStateProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1.5,
        py: size === 'small' ? 4 : 8,
        px: 3,
        textAlign: 'center',
        ...(gradient && {
          background: 'radial-gradient(ellipse at 50% 0%, rgba(93,135,255,0.06) 0%, transparent 70%)',
          borderRadius: 3,
        }),
      }}
    >
      {icon && (
        <Box
          sx={{
            width: 56,
            height: 56,
            borderRadius: '14px',
            bgcolor: iconBg ?? 'action.hover',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mb: 0.5,
            color: iconColor ?? 'text.disabled',
          }}
        >
          {icon}
        </Box>
      )}

      <Typography variant="h6" fontWeight={600} color="text.primary">
        {title}
      </Typography>

      {description && (
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 320 }}>
          {description}
        </Typography>
      )}

      {action && (
        <Button
          variant="outlined"
          size="small"
          onClick={action.onClick}
          startIcon={action.icon}
          sx={{ mt: 1 }}
        >
          {action.label}
        </Button>
      )}
    </Box>
  );
}
