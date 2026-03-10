'use client';

import { useEffect, useState } from 'react';
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
  IconExternalLink,
  IconX,
} from '@tabler/icons-react';

type StudioLayoutProps = {
  children: React.ReactNode;
};

function PipelineLink() {
  const [href, setHref] = useState<string>('/edro');
  useEffect(() => {
    const id = typeof window !== 'undefined' ? window.localStorage.getItem('edro_briefing_id') : null;
    setHref(id ? `/studio/pipeline/${id}` : '/edro');
  }, []);
  return (
    <Box
      component={Link}
      href={href}
      sx={{
        display: 'flex', alignItems: 'center', gap: 1.5,
        px: 2, py: 1, borderRadius: 3, textDecoration: 'none',
        border: '1px solid rgba(93,135,255,0.3)',
        bgcolor: 'rgba(93,135,255,0.06)',
        color: '#5D87FF',
        transition: 'background-color 0.2s',
        '&:hover': { bgcolor: 'rgba(93,135,255,0.12)' },
      }}
    >
      <Box component="span" sx={{ fontSize: 16, lineHeight: 1 }}>✦</Box>
      <Typography sx={{ fontSize: '0.78rem', fontWeight: 600 }}>Pipeline IA</Typography>
    </Box>
  );
}

const ICON_MAP: Record<string, React.ElementType> = {
  edit_note: IconEditCircle,
  devices: IconDevices,
  brush: IconBrush,
  preview: IconEye,
  fact_check: IconChecklist,
  download: IconDownload,
};

const STUDIO_STEPS = [
  { label: 'Briefing',    path: '/studio/brief',     step: 1, icon: 'edit_note' },
  { label: 'Plataformas', path: '/studio/platforms',  step: 2, icon: 'devices' },
  { label: 'Criar',       path: '/studio/editor',     step: 3, icon: 'brush' },
  { label: 'Exportar',    path: '/studio/export',     step: 4, icon: 'download' },
];

function getCurrentStep(pathname: string): number {
  // /studio/mockups is embedded inside step 3 (Criar)
  if (pathname.startsWith('/studio/mockups')) return 3;
  // /studio/review is no longer in the nav — map to step 4 (Exportar) for progress bar
  if (pathname.startsWith('/studio/review')) return 4;
  const step = STUDIO_STEPS.find((s) => pathname.startsWith(s.path));
  return step?.step || 1;
}

type StoredClient = {
  id: string;
  name: string;
  segment?: string | null;
  tone?: string | null;
  pillars?: string[];
};

function formatDateBR(iso?: string) {
  if (!iso) return '';
  const [year, month, day] = iso.split('-');
  if (!year || !month || !day) return iso;
  return `${day}/${month}/${year}`;
}

type UserInfo = { name?: string; email?: string };

export default function StudioLayout({ children }: StudioLayoutProps) {
  const pathname = usePathname();
  const currentStep = getCurrentStep(pathname);
  const [activeClient, setActiveClient] = useState<StoredClient | null>(null);
  const [studioEvent, setStudioEvent] = useState<{ event: string; date: string } | null>(null);
  const [user, setUser] = useState<UserInfo>({});

  // Canvas and Pipeline get full-screen — no Studio chrome
  const isFullscreen = pathname.startsWith('/studio/canvas') || pathname.startsWith('/studio/pipeline');

  useEffect(() => {
    if (typeof window === 'undefined' || isFullscreen) return;

    // Load user from localStorage
    try {
      const stored = window.localStorage.getItem('edro_user');
      if (stored) setUser(JSON.parse(stored) as UserInfo);
    } catch { /* ignore */ }

    const readClient = () => {
      try {
        const selected = JSON.parse(
          window.localStorage.getItem('edro_selected_clients') || '[]'
        ) as StoredClient[];
        const activeId = window.localStorage.getItem('edro_active_client_id') || '';
        const contextRaw = window.localStorage.getItem('edro_studio_context') || '{}';
        const context = JSON.parse(contextRaw || '{}') as Record<string, any>;
        const fallback = selected[0] || null;
        const found = activeId
          ? selected.find((client) => client.id === activeId) || fallback
          : fallback;
        if (!found) {
          setActiveClient(null);
        } else {
          setActiveClient({
            ...found,
            tone: context?.tone || found.tone || null,
            pillars: Array.isArray(context?.pillars)
              ? context.pillars
              : String(context?.pillars || '')
                  .split(/[,;\n]/)
                  .map((item) => item.trim())
                  .filter(Boolean)
                  .slice(0, 2),
          });
        }
        // Evento + data do contexto
        const ev = context?.event || '';
        const dt = context?.date || '';
        setStudioEvent(ev ? { event: ev, date: dt } : null);
      } catch {
        setActiveClient(null);
        setStudioEvent(null);
      }
    };

    readClient();
    window.addEventListener('edro-studio-context-change', readClient);
    window.addEventListener('storage', readClient);
    return () => {
      window.removeEventListener('edro-studio-context-change', readClient);
      window.removeEventListener('storage', readClient);
    };
  }, [isFullscreen]);

  if (isFullscreen) return <>{children}</>;

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
            component="img"
            src="/brand/icon-orange.png"
            alt="edro"
            sx={{ width: 32, height: 32, objectFit: 'contain' }}
          />
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, letterSpacing: '-0.01em' }}>
              Creative Studio
            </Typography>
            <Typography variant="caption" color="text.secondary">
              edro.studio
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
                        bgcolor: 'rgba(232,82,25,0.08)',
                        color: 'primary.main',
                        fontWeight: 600,
                        border: 1,
                        borderColor: 'rgba(232,82,25,0.25)',
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

        {/* Pipeline IA link */}
        <Box sx={{ px: 2, pb: 1 }}>
          <PipelineLink />
        </Box>

        {/* Livro de Receitas link */}
        <Box sx={{ px: 2, pb: 1 }}>
          <Box
            component={Link}
            href="/studio/recipes"
            sx={{
              display: 'flex', alignItems: 'center', gap: 1.5,
              px: 2, py: 1, borderRadius: 3, textDecoration: 'none',
              border: '1px solid rgba(248,168,0,0.2)',
              bgcolor: 'rgba(248,168,0,0.04)',
              color: '#F8A800',
              transition: 'background-color 0.2s',
              '&:hover': { bgcolor: 'rgba(248,168,0,0.08)' },
            }}
          >
            <Box component="span" className="material-symbols-rounded" sx={{ fontSize: 18 }}>menu_book</Box>
            <Typography sx={{ fontSize: '0.78rem', fontWeight: 600 }}>Livro de Receitas</Typography>
          </Box>
        </Box>

        {/* Progress */}
        <Box sx={{ p: 3 }}>
          <Box sx={{ p: 2, bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 3, boxShadow: 1 }}>
            <Typography variant="overline" color="text.secondary" sx={{ fontSize: 10, fontWeight: 700, mb: 1 }}>
              Progresso
            </Typography>
            <LinearProgress
              variant="determinate"
              value={(currentStep / 4) * 100}
              sx={{ height: 6, borderRadius: 3 }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              Etapa {currentStep} de 4
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
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.08em' }}>
                Creative Studio
              </Typography>
              <IconChevronRight size={14} />
              <Typography variant="overline" color="text.primary">
                {STUDIO_STEPS.find((s) => pathname.startsWith(s.path))?.label || 'Briefing'}
              </Typography>
            </Stack>
            {activeClient ? (
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                sx={{
                  px: 1.25,
                  py: 0.6,
                  borderRadius: 1.5,
                  bgcolor: 'rgba(232,82,25,0.04)',
                  border: '1px solid rgba(232,82,25,0.12)',
                  overflow: 'hidden',
                  maxWidth: 480,
                  flexShrink: 1,
                }}
              >
                <Avatar sx={{ width: 22, height: 22, bgcolor: '#E85219', fontSize: '0.7rem' }}>
                  {activeClient.name?.[0] || 'C'}
                </Avatar>
                <Typography variant="caption" sx={{ fontWeight: 700 }}>
                  {activeClient.name}
                </Typography>
                {activeClient.tone ? (
                  <Chip
                    size="small"
                    label={activeClient.tone.length > 28 ? activeClient.tone.slice(0, 28) + '…' : activeClient.tone}
                    title={activeClient.tone}
                    sx={{ height: 18, fontSize: '0.62rem', maxWidth: 160 }}
                  />
                ) : null}
                {(activeClient.pillars || []).slice(0, 2).map((pillar) => (
                  <Chip
                    key={pillar}
                    size="small"
                    label={pillar.length > 20 ? pillar.slice(0, 20) + '…' : pillar}
                    title={pillar}
                    sx={{
                      height: 18,
                      fontSize: '0.62rem',
                      maxWidth: 130,
                      bgcolor: 'rgba(232,82,25,0.08)',
                      color: '#E85219',
                    }}
                  />
                ))}
                <IconButton
                  size="small"
                  component={Link}
                  href={`/clients/${activeClient.id}`}
                  target="_blank"
                  sx={{ color: 'text.secondary' }}
                >
                  <IconExternalLink size={12} />
                </IconButton>
              </Stack>
            ) : null}
            {studioEvent ? (
              <Stack
                direction="row"
                spacing={0.75}
                alignItems="center"
                sx={{
                  px: 1.25,
                  py: 0.6,
                  borderRadius: 1.5,
                  bgcolor: 'rgba(232,82,25,0.04)',
                  border: '1px solid rgba(232,82,25,0.15)',
                }}
              >
                <Typography variant="caption" sx={{ fontWeight: 700, color: 'primary.main' }}>
                  {studioEvent.event.length > 32 ? studioEvent.event.slice(0, 32) + '…' : studioEvent.event}
                </Typography>
                {studioEvent.date ? (
                  <Chip
                    size="small"
                    label={formatDateBR(studioEvent.date)}
                    sx={{ height: 18, fontSize: '0.62rem', bgcolor: 'rgba(232,82,25,0.1)', color: 'primary.main' }}
                  />
                ) : null}
              </Stack>
            ) : null}
          </Stack>

          <Stack direction="row" spacing={2} alignItems="center">
            <Chip
              label={`ETAPA ${currentStep} DE 4`}
              size="small"
              color="primary"
              variant="outlined"
              sx={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em' }}
            />
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Box sx={{ textAlign: 'right', display: { xs: 'none', sm: 'block' } }}>
                <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', lineHeight: 1 }}>
                  {user?.name || user?.email?.split('@')[0] || 'Edro User'}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>
                  {user?.email || ''}
                </Typography>
              </Box>
              <Avatar
                sx={{
                  width: 36, height: 36,
                  bgcolor: '#E85219', color: '#fff',
                  fontSize: '0.8rem', fontWeight: 700,
                  border: 1, borderColor: 'divider',
                }}
              >
                {(user?.name || user?.email || 'E').slice(0, 2).toUpperCase()}
              </Avatar>
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
