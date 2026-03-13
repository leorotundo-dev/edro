'use client';

import { useMemo, useState, type ReactElement, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ConfirmProvider } from '@/hooks/useConfirm';
import { useJarvis } from '@/contexts/JarvisContext';
import JarvisDrawer from '@/components/jarvis/JarvisDrawer';
import { OPS_COPY } from './copy';
import Autocomplete from '@mui/material/Autocomplete';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import {
  IconArrowUpRight,
  IconLayoutKanban,
  IconPlus,
  IconSearch,
  IconTargetArrow,
  IconTimeline,
  IconCalendarTime,
  IconAlertTriangle,
} from '@tabler/icons-react';

export type OperationsSection = 'overview' | 'jobs' | 'semana' | 'planner' | 'agenda' | 'radar';

type CommandOption = {
  label: string;
  subtitle: string;
  kind: 'route' | 'jarvis';
  href?: string;
  prompt?: string;
};

const SECTIONS: Array<{ key: OperationsSection; label: string; href: string; icon: ReactElement }> = [
  { key: 'overview', label: 'Visão Geral', href: '/admin/operacoes', icon: <IconTargetArrow size={15} /> },
  { key: 'jobs', label: 'Demandas', href: '/admin/operacoes/jobs', icon: <IconLayoutKanban size={15} /> },
  { key: 'semana', label: 'Semana', href: '/admin/operacoes/semana', icon: <IconCalendarTime size={15} /> },
  { key: 'planner', label: 'Alocação', href: '/admin/operacoes/planner', icon: <IconTimeline size={15} /> },
  { key: 'agenda', label: 'Agenda', href: '/admin/operacoes/agenda', icon: <IconCalendarTime size={15} /> },
  { key: 'radar', label: 'Riscos', href: '/admin/operacoes/radar', icon: <IconAlertTriangle size={15} /> },
];

const SECTION_COPY: Record<OperationsSection, { title: string; subtitle: string }> = {
  overview: {
    title: 'Central de Operações',
    subtitle: 'Entradas, gargalos, contexto e decisão.',
  },
  jobs: {
    title: 'Demandas',
    subtitle: 'Demandas classificadas, priorizadas e prontas para seguir no fluxo.',
  },
  semana: {
    title: 'Semana',
    subtitle: 'Jobs distribuídos na semana. Arraste para alocar.',
  },
  planner: {
    title: 'Alocação',
    subtitle: 'Semana, carga e responsáveis no mesmo mapa.',
  },
  agenda: {
    title: 'Agenda operacional',
    subtitle: 'Reuniões, prazos e produção no mesmo mapa temporal.',
  },
  radar: {
    title: 'Riscos',
    subtitle: 'O que exige decisão antes de virar problema no cliente.',
  },
};

const COMMANDS: CommandOption[] = [
  { label: 'Nova demanda', subtitle: 'Abrir cadastro guiado de demanda', kind: 'route', href: '/admin/operacoes/jobs?new=1' },
  { label: 'Demandas sem responsável', subtitle: 'Ir direto para a fila sem responsável definido', kind: 'route', href: '/admin/operacoes/jobs?unassigned=true' },
  { label: 'Alocação da semana', subtitle: 'Abrir carga da equipe e dos freelancers', kind: 'route', href: '/admin/operacoes/planner' },
  { label: 'Agenda operacional', subtitle: 'Ver impacto temporal supra-cliente', kind: 'route', href: '/admin/operacoes/agenda' },
  { label: 'Riscos críticos', subtitle: 'Abrir exceções e itens em risco', kind: 'route', href: '/admin/operacoes/radar' },
  { label: 'Jarvis, reorganize minha semana', subtitle: 'Enviar comando direto ao Jarvis', kind: 'jarvis', prompt: 'Reorganize minha semana operacional priorizando risco, prazo e capacidade.' },
  { label: 'Jarvis, o que vai atrasar amanhã?', subtitle: 'Pedir leitura de risco do dia seguinte', kind: 'jarvis', prompt: 'Quais itens provavelmente vão atrasar amanhã e por quê?' },
  { label: 'Jarvis, transforme o WhatsApp em demandas', subtitle: 'Transformar sinais em trabalho estruturado', kind: 'jarvis', prompt: 'Analise os sinais recentes do WhatsApp e sugira demandas operacionais.' },
];

function dispatchJarvisPrompt(prompt: string) {
  window.dispatchEvent(new CustomEvent('jarvis-home-send', { detail: { message: prompt } }));
}

export default function OperationsShell({
  section,
  children,
  summary,
}: {
  section: OperationsSection;
  children: ReactNode;
  summary?: ReactNode;
}) {
  const router = useRouter();
  const { open } = useJarvis();
  const [commandInput, setCommandInput] = useState('');
  const copy = SECTION_COPY[section];

  const commandOptions = useMemo(() => COMMANDS, []);

  const handleRunCommand = (value: string | CommandOption | null) => {
    const trimmed = typeof value === 'string' ? value.trim() : '';
    if (!value || (!trimmed && typeof value === 'string')) return;

    if (typeof value !== 'string') {
      if (value.kind === 'route' && value.href) {
        router.push(value.href);
      } else if (value.kind === 'jarvis' && value.prompt) {
        open();
        setTimeout(() => dispatchJarvisPrompt(value.prompt!), 120);
      }
      setCommandInput('');
      return;
    }

    open();
    setTimeout(() => dispatchJarvisPrompt(trimmed), 120);
    setCommandInput('');
  };

  return (
    <ConfirmProvider>
      <Box
        sx={(theme) => ({
          minHeight: '100vh',
          bgcolor: theme.palette.background.default,
          backgroundImage: `
            radial-gradient(circle at top left, ${alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.16 : 0.08)}, transparent 26%),
            radial-gradient(circle at top right, ${alpha(theme.palette.info.main, theme.palette.mode === 'dark' ? 0.12 : 0.08)}, transparent 22%),
            linear-gradient(180deg, ${theme.palette.mode === 'dark' ? '#0b0b0d' : alpha(theme.palette.background.paper, 0.96)} 0%, ${theme.palette.background.default} 100%)
          `,
        })}
      >
        <Box
          sx={(theme) => ({
            position: 'sticky',
            top: 0,
            zIndex: 20,
            backdropFilter: 'blur(18px)',
            borderBottom: `1px solid ${alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.08 : 0.1)}`,
            bgcolor: alpha(theme.palette.background.default, theme.palette.mode === 'dark' ? 0.84 : 0.9),
          })}
        >
        <Container maxWidth={false} sx={{ px: { xs: 2, md: 3 } }}>
            <Stack spacing={1.25} sx={{ py: 1.15 }}>
              <Stack direction="row" spacing={1.75} alignItems="center">
                <Stack direction="row" spacing={1.1} alignItems="center" sx={{ minWidth: 0, flexShrink: 0 }}>
                  <Avatar
                    variant="rounded"
                    sx={(theme) => ({
                      width: 32,
                      height: 32,
                      borderRadius: 1,
                      bgcolor: alpha(theme.palette.primary.main, 0.16),
                      color: theme.palette.primary.main,
                      border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                    })}
                  >
                    <IconTargetArrow size={18} />
                  </Avatar>
                  <Box sx={{ minWidth: 0, lineHeight: 1 }}>
                    <Typography variant="caption" sx={(theme) => ({ color: alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.52 : 0.62), textTransform: 'uppercase', letterSpacing: '0.14em', display: 'block', lineHeight: 1.1 })}>
                      Edro Ops
                    </Typography>
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                      <Typography variant="body1" sx={{ fontWeight: 900, lineHeight: 1 }}>
                        {copy.title}
                      </Typography>
                      <Chip size="small" label={OPS_COPY.shell.badge} color="warning" sx={{ height: 18, fontWeight: 800, borderRadius: 1 }} />
                    </Stack>
                  </Box>
                </Stack>

                <Autocomplete
                  freeSolo
                  size="small"
                  options={commandOptions}
                  getOptionLabel={(option) => (typeof option === 'string' ? option : option.label)}
                  inputValue={commandInput}
                  onInputChange={(_event, value) => setCommandInput(value)}
                  onChange={(_event, value) => handleRunCommand(value)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      placeholder={OPS_COPY.shell.commandPlaceholder}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          handleRunCommand(commandInput);
                        }
                      }}
                      InputProps={{
                        ...params.InputProps,
                        startAdornment: <IconSearch size={16} style={{ marginRight: 8, opacity: 0.72 }} />,
                      }}
                    />
                  )}
                  renderOption={(props, option) => (
                    <Box component="li" {...props} key={option.label}>
                      <Stack spacing={0.25}>
                        <Typography variant="body2" fontWeight={800}>{option.label}</Typography>
                        <Typography variant="caption" color="text.secondary">{option.subtitle}</Typography>
                      </Stack>
                    </Box>
                  )}
                  sx={(theme) => ({
                    flex: 1,
                    '& .MuiOutlinedInput-root': {
                      minHeight: 48,
                      borderRadius: 1.5,
                      bgcolor: theme.palette.mode === 'dark' ? alpha(theme.palette.common.white, 0.035) : alpha(theme.palette.background.paper, 0.82),
                    },
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.1 : 0.14),
                    },
                    '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.18 : 0.24),
                    },
                  })}
                />

                <Stack direction="row" spacing={1} alignItems="center" sx={{ flexShrink: 0 }}>
                  <Button
                    variant="contained"
                    startIcon={<IconPlus size={16} />}
                    onClick={() => router.push('/admin/operacoes/jobs?new=1')}
                    sx={{ borderRadius: 1.25, fontWeight: 800, px: 1.75 }}
                  >
                    {OPS_COPY.shell.newDemand}
                  </Button>
                  <Button
                    component={Link}
                    href="/home"
                    variant="text"
                    endIcon={<IconArrowUpRight size={16} />}
                    sx={(theme) => ({ color: alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.72 : 0.76), whiteSpace: 'nowrap', minWidth: 0, px: 0.5 })}
                  >
                    {OPS_COPY.shell.modules}
                  </Button>
                </Stack>
              </Stack>

              <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} justifyContent="space-between" alignItems={{ md: 'center' }}>
                <Tabs
                  value={section}
                  onChange={(_event, value) => router.push(SECTIONS.find((item) => item.key === value)?.href || '/admin/operacoes')}
                  variant="scrollable"
                  allowScrollButtonsMobile
                  sx={{
                    flex: 1,
                    minHeight: 36,
                    '& .MuiTabs-indicator': {
                      display: 'none',
                    },
                  }}
                >
                  {SECTIONS.map((item) => (
                    <Tab
                      key={item.key}
                      value={item.key}
                      label={item.label}
                      icon={item.icon}
                      iconPosition="start"
                      sx={(theme) => ({
                        minHeight: 0,
                        minWidth: 96,
                        px: 1.25,
                        py: 0.7,
                        color: alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.68 : 0.74),
                        fontWeight: 800,
                        borderRadius: 1.25,
                        mr: 0.5,
                        border: '1px solid transparent',
                        '&.Mui-selected': {
                          color: theme.palette.text.primary,
                          bgcolor: theme.palette.mode === 'dark' ? alpha(theme.palette.common.white, 0.04) : alpha(theme.palette.common.black, 0.04),
                          borderColor: alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.08 : 0.12),
                        },
                      })}
                    />
                  ))}
                </Tabs>
              </Stack>
            </Stack>
          </Container>
        </Box>

        <Container maxWidth={false} sx={{ px: { xs: 2, md: 3 }, py: 3 }}>
          <Stack spacing={3}>
            {summary ? (
              <Box
                sx={(theme) => ({
                  py: 1.15,
                  px: 0.5,
                  borderTop: `1px solid ${alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.07 : 0.1)}`,
                  borderBottom: `1px solid ${alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.07 : 0.1)}`,
                })}
              >
                {summary}
              </Box>
            ) : null}
            <Box sx={{ animation: 'edroOpsEnter 180ms ease-out' }}>
              {children}
            </Box>
          </Stack>
        </Container>

        <JarvisDrawer />
      </Box>

      <Box
        sx={{
          '@keyframes edroOpsEnter': {
            from: { opacity: 0, transform: 'translateY(8px)' },
            to: { opacity: 1, transform: 'translateY(0)' },
          },
        }}
      />
    </ConfirmProvider>
  );
}
