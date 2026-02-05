'use client';

import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';
import type { SxProps, Theme } from '@mui/material/styles';

type DashboardCardProps = {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  footer?: React.ReactNode;
  noPadding?: boolean;
  hoverable?: boolean;
  children: React.ReactNode;
  sx?: SxProps<Theme>;
  headerSx?: SxProps<Theme>;
};

export default function DashboardCard({
  title,
  subtitle,
  action,
  footer,
  noPadding,
  hoverable,
  children,
  sx,
  headerSx,
}: DashboardCardProps) {
  return (
    <Card
      sx={{
        ...(hoverable && {
          cursor: 'pointer',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          },
        }),
        ...sx,
      }}
    >
      {(title || subtitle || action) && (
        <CardHeader
          title={title}
          subheader={subtitle}
          action={action}
          sx={headerSx}
        />
      )}
      <CardContent sx={noPadding ? { p: '0 !important' } : undefined}>
        {children}
      </CardContent>
      {footer}
    </Card>
  );
}
