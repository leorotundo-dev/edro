'use client';

import { useMemo, useState, type ReactElement, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { useJarvis } from '@/contexts/JarvisContext';
import { OPS_COPY } from './copy';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
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
    <AppShell
      title={copy.title}
      meta={copy.subtitle}
      action={{ label: OPS_COPY.shell.newDemand, icon: <IconPlus size={16} />, onClick: () => router.push('/admin/operacoes/jobs?new=1') }}
    >
      {/* Ops sub-header: command bar + tabs */}
      <Box
        sx={(theme) => ({
          mx: -3,
          mt: -3,
          mb: 2,
          px: 3,
          pt: 1.5,
          pb: 0,
          borderBottom: `1px solid ${alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.08 : 0.1)}`,
          bgcolor: alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.3 : 0.6),
        })}
      >
        <Stack spacing={1.25}>
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
              '& .MuiOutlinedInput-root': {
                minHeight: 40,
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

          {/* Section tabs */}
          <Tabs
            value={section}
            onChange={(_event, value) => router.push(SECTIONS.find((item) => item.key === value)?.href || '/admin/operacoes')}
            variant="scrollable"
            allowScrollButtonsMobile
            sx={{
              minHeight: 36,
              '& .MuiTabs-indicator': { display: 'none' },
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
                  minWidth: 80,
                  px: 1.25,
                  py: 0.7,
                  color: alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.68 : 0.74),
                  fontWeight: 800,
                  fontSize: '0.8rem',
                  borderRadius: 1.25,
                  mr: 0.5,
                  border: '1px solid transparent',
                  '&.Mui-selected': {
                    color: theme.palette.text.primary,
                    bgcolor: theme.palette.mode === 'dark' ? alpha(theme.palette.common.white, 0.06) : alpha(theme.palette.common.black, 0.05),
                    borderColor: alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.1 : 0.14),
                  },
                })}
              />
            ))}
          </Tabs>
        </Stack>
      </Box>

      {/* Summary stats row */}
      {summary ? (
        <Box
          sx={(theme) => ({
            py: 1.15,
            px: 0.5,
            mb: 2,
            borderBottom: `1px solid ${alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.07 : 0.1)}`,
          })}
        >
          {summary}
        </Box>
      ) : null}

      {/* Page content */}
      <Box sx={{ animation: 'edroOpsEnter 180ms ease-out' }}>
        {children}
      </Box>

      <Box
        sx={{
          '@keyframes edroOpsEnter': {
            from: { opacity: 0, transform: 'translateY(8px)' },
            to: { opacity: 1, transform: 'translateY(0)' },
          },
        }}
      />
    </AppShell>
  );
}
