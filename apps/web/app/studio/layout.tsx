'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';
import Chip from '@mui/material/Chip';
import Avatar from '@mui/material/Avatar';
import IconButton from '@mui/material/IconButton';
import {
  IconEditCircle,
  IconDevices,
  IconBrush,
  IconEye,
  IconChecklist,
  IconDownload,
  IconCheckupList,
  IconChevronRight,
  IconX,
} from '@tabler/icons-react';

type StudioLayoutProps = {
  children: React.ReactNode;
};

const ICON_MAP: Record<string, React.ElementType> = {
  edit_note: IconEditCircle,
  devices: IconDevices,
  brush: IconBrush,
  preview: IconEye,
  fact_check: IconChecklist,
  download: IconDownload,
};

const STUDIO_STEPS = [
  { label: 'Briefing', path: '/studio/brief', step: 1, icon: 'edit_note' },
  { label: 'Plataformas', path: '/studio/platforms', step: 2, icon: 'devices' },
  { label: 'Editor', path: '/studio/editor', step: 3, icon: 'brush' },
  { label: 'Mockups', path: '/studio/mockups', step: 4, icon: 'preview' },
  { label: 'Revisão', path: '/studio/review', step: 5, icon: 'fact_check' },
  { label: 'Exportar', path: '/studio/export', step: 6, icon: 'download' },
];

function getCurrentStep(pathname: string): number {
  const step = STUDIO_STEPS.find((s) => pathname.startsWith(s.path));
  return step?.step || 1;
}

export default function StudioLayout({ children }: StudioLayoutProps) {
  const pathname = usePathname();
  const currentStep = getCurrentStep(pathname);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', fontFamily: 'sans-serif', color: 'text.primary', bgcolor: 'background.default' }}>
      {/* Studio Sidebar */}
      <Box
        component="aside"
        sx={{
          width: 288,
          bgcolor: 'background.paper',
          borderRight: 1,
          borderColor: 'divider',
          display: 'flex',
          flexDirection: 'column',
          position: 'sticky',
          top: 0,
          height: '100vh',
          overflowY: 'auto',
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ p: 3 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 2,
              bgcolor: 'white',
              border: 1,
              borderColor: 'divider',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 1,
            }}
          >
            <Box component="img" src="/modernize/images/logos/logoIcon.svg" alt="Modernize logo" sx={{ width: 24, height: 24 }} />
          </Box>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, letterSpacing: '-0.01em' }}>
              Edro Creative
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Studio
            </Typography>
          </Box>
        </Stack>

        {/* Steps Navigation */}
        <Box component="nav" sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 0.5, px: 2, flex: 1 }}>
          {STUDIO_STEPS.map((step) => {
            const isActive = pathname.startsWith(step.path);
            const isPast = step.step < currentStep;
            const StepIcon = isPast ? IconCheckupList : ICON_MAP[step.icon] || IconEditCircle;

            return (
              <Box
                key={step.path}
                component={Link}
                href={step.path}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  px: 2,
                  py: 1.25,
                  borderRadius: 3,
                  textDecoration: 'none',
                  transition: 'background-color 0.2s',
                  ...(isActive
                    ? {
                        bgcolor: 'primary.lighter',
                        color: 'primary.main',
                        fontWeight: 600,
                        border: 1,
                        borderColor: 'primary.light',
                      }
                    : isPast
                      ? {
                          color: 'text.secondary',
                          '&:hover': { bgcolor: 'action.hover' },
                        }
                      : {
                          color: 'text.disabled',
                          '&:hover': { bgcolor: 'action.hover' },
                        }),
                }}
              >
                <StepIcon
                  size={18}
                  color={isActive ? 'inherit' : isPast ? 'green' : undefined}
                />
                <Typography variant="body2">{step.label}</Typography>
                <Typography
                  variant="caption"
                  sx={{
                    ml: 'auto',
                    fontSize: 10,
                    fontWeight: 700,
                    color: isActive ? 'primary.main' : 'text.disabled',
                  }}
                >
                  {step.step}
                </Typography>
              </Box>
            );
          })}
        </Box>

        {/* Progress */}
        <Box sx={{ p: 3 }}>
          <Box sx={{ p: 2, bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 3, boxShadow: 1 }}>
            <Typography variant="overline" color="text.secondary" sx={{ fontSize: 10, fontWeight: 700, mb: 1 }}>
              Progresso
            </Typography>
            <LinearProgress
              variant="determinate"
              value={(currentStep / 6) * 100}
              sx={{ height: 6, borderRadius: 3 }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              Etapa {currentStep} de 6
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Main Content */}
      <Box component="main" sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: 'background.default' }}>
        {/* Studio Header */}
        <Box
          component="header"
          sx={{
            position: 'sticky',
            top: 0,
            zIndex: 30,
            bgcolor: 'background.paper',
            borderBottom: 1,
            borderColor: 'divider',
            height: 64,
            px: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.08em' }}>
              Creative Studio
            </Typography>
            <IconChevronRight size={14} />
            <Typography variant="overline" color="text.primary">
              {STUDIO_STEPS.find((s) => pathname.startsWith(s.path))?.label || 'Briefing'}
            </Typography>
          </Stack>

          <Stack direction="row" spacing={2} alignItems="center">
            <Chip
              label={`ETAPA ${currentStep} DE 6`}
              size="small"
              color="primary"
              variant="outlined"
              sx={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em' }}
            />
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', lineHeight: 1 }}>
                  Leo Rotundo
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>
                  Admin
                </Typography>
              </Box>
              <Avatar
                src="/modernize/images/profile/user-1.jpg"
                alt="User avatar"
                sx={{ width: 36, height: 36, border: 1, borderColor: 'divider' }}
              />
            </Stack>
            <IconButton component={Link} href="/clients" size="small" sx={{ color: 'text.secondary' }}>
              <IconX size={20} />
            </IconButton>
          </Stack>
        </Box>

        {/* Page Content */}
        <Box sx={{ flex: 1, p: { xs: 4, md: 6 } }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}
