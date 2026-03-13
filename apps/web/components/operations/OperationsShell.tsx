'use client';

import { useMemo, useState, type ReactElement, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { useJarvis } from '@/contexts/JarvisContext';
import { OPS_COPY } from './copy';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import InputAdornment from '@mui/material/InputAdornment';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import {
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
  { key: 'overview', label: 'Visão Geral', href: '/admin/operacoes', icon: <IconTargetArrow size={16} /> },
  { key: 'jobs', label: 'Demandas', href: '/admin/operacoes/jobs', icon: <IconLayoutKanban size={16} /> },
  { key: 'semana', label: 'Semana', href: '/admin/operacoes/semana', icon: <IconCalendarTime size={16} /> },
  { key: 'planner', label: 'Alocação', href: '/admin/operacoes/planner', icon: <IconTimeline size={16} /> },
  { key: 'agenda', label: 'Agenda', href: '/admin/operacoes/agenda', icon: <IconCalendarTime size={16} /> },
  { key: 'radar', label: 'Riscos', href: '/admin/operacoes/radar', icon: <IconAlertTriangle size={16} /> },
];

const SECTION_COPY: Record<OperationsSection, { title: string; subtitle: string }> = {
  overview: { title: 'Central de Operações', subtitle: 'Sinais, gargalos e decisões num só lugar.' },
  jobs: { title: 'Demandas', subtitle: 'Todas as demandas classificadas por etapa.' },
  semana: { title: 'Semana', subtitle: 'Jobs distribuídos na semana. Arraste para alocar.' },
  planner: { title: 'Alocação', subtitle: 'Carga e responsáveis no mesmo mapa.' },
  agenda: { title: 'Agenda', subtitle: 'Prazos, reuniões e produção no calendário.' },
  radar: { title: 'Riscos', subtitle: 'O que precisa de decisão antes de estourar.' },
};

const COMMANDS: CommandOption[] = [
  { label: 'Nova demanda', subtitle: 'Abrir cadastro guiado de demanda', kind: 'route', href: '/admin/operacoes/jobs?new=1' },
  { label: 'Demandas sem responsável', subtitle: 'Ir direto para a fila sem responsável definido', kind: 'route', href: '/admin/operacoes/jobs?unassigned=true' },
  { label: 'Alocação da semana', subtitle: 'Abrir carga da equipe e dos freelancers', kind: 'route', href: '/admin/operacoes/planner' },
  { label: 'Agenda operacional', subtitle: 'Ver impacto temporal supra-cliente', kind: 'route', href: '/admin/operacoes/agenda' },
  { label: 'Riscos críticos', subtitle: 'Abrir exceções e itens em risco', kind: 'route', href: '/admin/operacoes/radar' },
  { label: 'Jarvis, reorganize minha semana', subtitle: 'Enviar comando direto ao Jarvis', kind: 'jarvis', prompt: 'Reorganize minha semana operacional priorizando risco, prazo e capacidade.' },
  { label: 'Jarvis, o que vai atrasar amanhã?', subtitle: 'Pedir leitura de risco do dia seguinte', kind: 'jarvis', prompt: 'Quais itens provavelmente vão atrasar amanhã e por quê?' },
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

  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';

  return (
    <AppShell
      title={copy.title}
      meta={copy.subtitle}
      action={{ label: OPS_COPY.shell.newDemand, icon: <IconPlus size={16} />, onClick: () => router.push('/admin/operacoes/jobs?new=1') }}
    >
      {/* Ops navigation bar — glass + pill nav */}
      <Box
        sx={{
          mx: { xs: -2, sm: -3 },
          mt: { xs: -2, sm: -3 },
          mb: 3,
          px: { xs: 2, sm: 3 },
          pt: 1.5,
          pb: summary ? 0 : 1.5,
          background: dark
            ? `linear-gradient(180deg, ${alpha(theme.palette.background.paper, 0.6)} 0%, ${alpha(theme.palette.background.default, 0.3)} 100%)`
            : `linear-gradient(180deg, ${alpha('#fff', 0.9)} 0%, ${alpha(theme.palette.background.default, 0.5)} 100%)`,
          backdropFilter: 'blur(16px)',
          borderBottom: `1px solid ${alpha(theme.palette.divider, dark ? 0.15 : 0.12)}`,
        }}
      >
        <Stack spacing={1.25}>
          {/* Top row: pill nav + command bar */}
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ md: 'center' }}>
            {/* Pill navigation */}
            <Stack
              direction="row"
              spacing={0.5}
              sx={{
                flex: 1,
                overflowX: 'auto',
                py: 0.25,
                px: 0.5,
                borderRadius: 100,
                bgcolor: dark ? alpha(theme.palette.common.white, 0.04) : alpha(theme.palette.common.black, 0.04),
                '&::-webkit-scrollbar': { display: 'none' },
              }}
            >
              {SECTIONS.map((item) => {
                const isActive = item.key === section;
                return (
                  <Box
                    key={item.key}
                    onClick={() => router.push(item.href)}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.6,
                      px: 1.75,
                      py: 0.7,
                      borderRadius: 100,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      fontSize: '0.78rem',
                      fontWeight: isActive ? 800 : 600,
                      color: isActive
                        ? '#fff'
                        : dark ? alpha(theme.palette.text.primary, 0.6) : alpha(theme.palette.text.primary, 0.55),
                      background: isActive
                        ? `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`
                        : 'transparent',
                      boxShadow: isActive
                        ? `0 2px 8px ${alpha(theme.palette.primary.main, 0.35)}`
                        : 'none',
                      transition: 'all 200ms cubic-bezier(0.4,0,0.2,1)',
                      '&:hover': isActive ? {} : {
                        bgcolor: dark ? alpha(theme.palette.common.white, 0.06) : alpha(theme.palette.common.black, 0.05),
                        color: theme.palette.text.primary,
                      },
                      '& svg': {
                        opacity: isActive ? 1 : 0.6,
                        transition: 'opacity 200ms ease',
                      },
                    }}
                  >
                    {item.icon}
                    {item.label}
                  </Box>
                );
              })}
            </Stack>

            {/* Command bar */}
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
                  placeholder="Buscar ou pedir ao Jarvis..."
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      handleRunCommand(commandInput);
                    }
                  }}
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: (
                      <InputAdornment position="start">
                        <IconSearch size={15} style={{ opacity: 0.4 }} />
                      </InputAdornment>
                    ),
                  }}
                />
              )}
              renderOption={(props, option) => (
                <Box component="li" {...props} key={option.label} sx={{ '&.MuiAutocomplete-option': { py: 1 } }}>
                  <Stack spacing={0.15}>
                    <Typography variant="body2" fontWeight={700}>{option.label}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>{option.subtitle}</Typography>
                  </Stack>
                </Box>
              )}
              sx={{
                width: { xs: '100%', md: 260 },
                flexShrink: 0,
                '& .MuiOutlinedInput-root': {
                  height: 36,
                  borderRadius: 100,
                  fontSize: '0.8rem',
                  bgcolor: dark ? alpha(theme.palette.common.white, 0.04) : alpha(theme.palette.common.black, 0.03),
                },
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: alpha(theme.palette.divider, dark ? 0.2 : 0.15),
                },
              }}
            />
          </Stack>

          {/* Summary stats row */}
          {summary ? (
            <Box sx={{
              pt: 1,
              pb: 1.25,
              borderTop: `1px solid ${alpha(theme.palette.divider, dark ? 0.1 : 0.08)}`,
            }}>
              {summary}
            </Box>
          ) : null}
        </Stack>
      </Box>

      {/* Page content */}
      <Box sx={{
        animation: 'edroOpsEnter 300ms cubic-bezier(0.4,0,0.2,1)',
        '@keyframes edroOpsEnter': {
          from: { opacity: 0, transform: 'translateY(10px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
      }}>
        {children}
      </Box>
    </AppShell>
  );
}
