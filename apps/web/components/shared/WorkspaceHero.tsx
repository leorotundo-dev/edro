'use client';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import type { ChipProps } from '@mui/material/Chip';

type HeroChip = {
  label: string;
  color?: ChipProps['color'];
  variant?: ChipProps['variant'];
  icon?: React.ReactElement;
  sx?: ChipProps['sx'];
};

type WorkspaceHeroProps = {
  eyebrow?: string;
  eyebrowColor?: ChipProps['color'];
  title: string;
  description: string;
  leftChips?: HeroChip[];
  rightContent?: React.ReactNode;
  loadingLabel?: string;
  loading?: boolean;
};

export default function WorkspaceHero({
  eyebrow,
  eyebrowColor = 'primary',
  title,
  description,
  leftChips = [],
  rightContent,
  loadingLabel,
  loading = false,
}: WorkspaceHeroProps) {
  const theme = useTheme();

  return (
    <Box
      sx={{
        borderRadius: 4,
        px: { xs: 2.5, md: 3.5 },
        py: { xs: 2.5, md: 3 },
        border: `1px solid ${alpha(theme.palette.primary.main, 0.14)}`,
        backgroundImage: `linear-gradient(140deg, ${alpha(theme.palette.primary.main, 0.08)} 0%, ${alpha(theme.palette.background.paper, 0.98)} 58%)`,
      }}
    >
      <Stack
        direction={{ xs: 'column', lg: 'row' }}
        spacing={2.5}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', lg: 'center' }}
      >
        <Stack spacing={1.25} sx={{ maxWidth: 780 }}>
          {(eyebrow || leftChips.length > 0) && (
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              {eyebrow ? (
                <Chip
                  label={eyebrow}
                  color={eyebrowColor}
                  size="small"
                  sx={{ fontWeight: 700 }}
                />
              ) : null}
              {leftChips.map((chip) => (
                <Chip
                  key={chip.label}
                  label={chip.label}
                  size="small"
                  color={chip.color}
                  variant={chip.variant ?? 'outlined'}
                  icon={chip.icon}
                  sx={chip.sx}
                />
              ))}
            </Stack>
          )}
          <Box>
            <Typography variant="h3" sx={{ fontWeight: 800, mb: 0.75 }}>
              {title}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {description}
            </Typography>
          </Box>
        </Stack>

        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
          {loading ? (
            <Stack direction="row" spacing={1} alignItems="center">
              <CircularProgress size={18} />
              <Typography variant="body2" color="text.secondary">
                {loadingLabel ?? 'Carregando...'}
              </Typography>
            </Stack>
          ) : (
            rightContent
          )}
        </Stack>
      </Stack>
    </Box>
  );
}
