'use client';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  divider?: boolean;
};

/**
 * In-page section header with optional subtitle and actions slot.
 *
 * Usage:
 *   <PageHeader
 *     title="Campanhas"
 *     subtitle="3 ativas"
 *     actions={<Button size="small">Nova campanha</Button>}
 *   />
 */
export default function PageHeader({ title, subtitle, actions, divider = false }: PageHeaderProps) {
  return (
    <Box sx={{ mb: divider ? 0 : 3 }}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        spacing={2}
        sx={{ py: divider ? 1.5 : 0 }}
      >
        <Stack direction="row" alignItems="baseline" spacing={1.5}>
          <Typography variant="h5" fontWeight={700}>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body2" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Stack>

        {actions && (
          <Stack direction="row" alignItems="center" spacing={1}>
            {actions}
          </Stack>
        )}
      </Stack>

      {divider && <Divider sx={{ mt: 0.5, mb: 3 }} />}
    </Box>
  );
}
