'use client';

import { useMemo, useState, type ReactElement, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { OPS_COPY } from './copy';
import OperationsJarvisDrawer from './OperationsJarvisDrawer';
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
  IconSparkles,
  IconTargetArrow,
  IconCalendarTime,
  IconAlertTriangle,
  IconChecklist,
  IconUsers,
} from '@tabler/icons-react';

export type OperationsSection = 'overview' | 'jobs' | 'ia' | 'people' | 'semana' | 'radar' | 'quality';

type CommandOption = {
  label: string;
  subtitle: string;
  kind: 'route' | 'jarvis';
  href?: string;
  prompt?: string;
};

type LegacyViewAlias = {
  label: string;
  subtitle: string;
  href: string;
};

const SECTIONS: Array<{ key: OperationsSection; label: string; href: string; icon: ReactElement }> = [
  { key: 'overview', label: 'Hoje', href: '/admin/operacoes', icon: <IconTargetArrow size={16} /> },
  { key: 'jobs', label: 'Fila', href: '/admin/operacoes/jobs', icon: <IconLayoutKanban size={16} /> },
  { key: 'ia', label: 'IA', href: '/admin/operacoes/ia', icon: <IconSparkles size={16} /> },
  { key: 'people', label: 'Pessoas', href: '/admin/operacoes/pessoas', icon: <IconUsers size={16} /> },
  { key: 'semana', label: 'Semana', href: '/admin/operacoes/semana', icon: <IconCalendarTime size={16} /> },
  { key: 'radar', label: 'Riscos', href: '/admin/operacoes/radar', icon: <IconAlertTriangle size={16} /> },
  { key: 'quality', label: 'Qualidade', href: '/admin/operacoes/qualidade', icon: <IconChecklist size={16} /> },
];

const SECTION_COPY: Record<OperationsSection, { title: string; subtitle: string }> = {
  overview: { title: 'Hoje', subtitle: 'O retrato operacional da agência para decidir agora.' },
  jobs: { title: 'Fila', subtitle: 'Todas as demandas organizadas para triagem e ação.' },
  ia: { title: 'IA', subtitle: 'Briefings prontos para copy, produção e revisão num só fluxo.' },
  people: { title: 'Pessoas', subtitle: 'Pauta individual e carga da equipe num lugar direto.' },
  semana: { title: 'Semana', subtitle: 'Calendário, distribuição e capacidade na mesma leitura.' },
  radar: { title: 'Riscos', subtitle: 'Tudo que pode travar, atrasar ou estourar.' },
  quality: { title: 'Qualidade', subtitle: 'SLA e precisão operacional no mesmo lugar.' },
};

const COMMANDS: CommandOption[] = [
  { label: 'Nova demanda', subtitle: 'Abrir cadastro guiado de demanda', kind: 'route', href: '/admin/operacoes/jobs?new=1' },
  { label: 'Painel de Controle', subtitle: 'Abrir o cockpit principal da operação', kind: 'route', href: '/admin/operacoes' },
  { label: 'Banco de Dados (Filtros)', subtitle: 'Abrir a fila em tabela crua da operação', kind: 'route', href: '/admin/operacoes/jobs?view=table' },
  { label: 'Pauta Geral', subtitle: 'Abrir a fila agrupada por cliente', kind: 'route', href: '/admin/operacoes/jobs?view=table&group=client' },
  { label: 'Externos', subtitle: 'Abrir a mesa de risco e exceções', kind: 'route', href: '/admin/operacoes/radar' },
  { label: 'Auditoria SLA', subtitle: 'Abrir a leitura de SLA da operação', kind: 'route', href: '/admin/operacoes/qualidade' },
  { label: 'Extração para IA', subtitle: 'Abrir a bandeja operacional da redação', kind: 'route', href: '/admin/operacoes/ia' },
  { label: 'Pauta - Nome', subtitle: 'Abrir a pauta individual por pessoa', kind: 'route', href: '/admin/operacoes/pessoas' },
  { label: 'Demandas sem responsável', subtitle: 'Ir direto para a fila sem responsável definido', kind: 'route', href: '/admin/operacoes/jobs?unassigned=true' },
  { label: 'Bandeja IA', subtitle: 'Abrir os briefings prontos para copy e revisão', kind: 'route', href: '/admin/operacoes/ia' },
  { label: 'Pauta por pessoa', subtitle: 'Abrir a carga individual da equipe', kind: 'route', href: '/admin/operacoes/pessoas' },
  { label: 'Distribuição da semana', subtitle: 'Abrir a semana no modo distribuição da equipe', kind: 'route', href: '/admin/operacoes/semana?view=distribution' },
  { label: 'Agenda operacional', subtitle: 'Ver impacto temporal da semana em calendário', kind: 'route', href: '/admin/operacoes/semana?view=calendar' },
  { label: 'Riscos críticos', subtitle: 'Abrir exceções e itens em risco', kind: 'route', href: '/admin/operacoes/radar' },
  { label: 'Qualidade da operação', subtitle: 'Abrir SLA e calibração operacional', kind: 'route', href: '/admin/operacoes/qualidade' },
  { label: 'Jarvis, o que tá pegando fogo?', subtitle: 'Ver riscos críticos e bloqueios', kind: 'jarvis', prompt: 'O que tá pegando fogo? Me mostra os jobs atrasados, bloqueados e sem dono que precisam de ação agora.' },
  { label: 'Jarvis, o que vai atrasar amanhã?', subtitle: 'Leitura de risco do dia seguinte', kind: 'jarvis', prompt: 'Quais itens provavelmente vão atrasar amanhã e por quê?' },
  { label: 'Jarvis, quem tá sobrecarregado?', subtitle: 'Ver capacidade da equipe', kind: 'jarvis', prompt: 'Me mostra a carga de trabalho de cada pessoa da equipe. Quem tá sobrecarregado e quem tem espaço?' },
  { label: 'Jarvis, resumo da operação', subtitle: 'Snapshot completo da operação', kind: 'jarvis', prompt: 'Me dá um resumo executivo da operação: quantos jobs por status, gargalos, riscos e próximas ações.' },
];

const LEGACY_VIEWS: LegacyViewAlias[] = [
  { label: 'Painel de Controle', subtitle: 'Hoje', href: '/admin/operacoes' },
  { label: 'Banco de Dados (Filtros)', subtitle: 'Fila > Tabela', href: '/admin/operacoes/jobs?view=table' },
  { label: 'Pauta Geral', subtitle: 'Fila > Cliente', href: '/admin/operacoes/jobs?view=table&group=client' },
  { label: 'Extração para IA', subtitle: 'IA', href: '/admin/operacoes/ia' },
  { label: 'Pauta - Nome', subtitle: 'Pessoas', href: '/admin/operacoes/pessoas' },
  { label: 'Externos', subtitle: 'Riscos', href: '/admin/operacoes/radar' },
  { label: 'Auditoria SLA', subtitle: 'Qualidade', href: '/admin/operacoes/qualidade' },
];

function dispatchOpsJarvisPrompt(prompt: string) {
  window.dispatchEvent(new CustomEvent('jarvis-ops-send', { detail: { message: prompt } }));
}

export default function OperationsShell({
  section,
  children,
  summary,
  onNewDemand,
}: {
  section: OperationsSection;
  children: ReactNode;
  summary?: ReactNode;
  onNewDemand?: () => void;
}) {
  const router = useRouter();
  const [commandInput, setCommandInput] = useState('');
  const [jarvisOpen, setJarvisOpen] = useState(false);
  const copy = SECTION_COPY[section];

  const commandOptions = useMemo(() => COMMANDS, []);

  const handleRunCommand = (value: string | CommandOption | null) => {
    const trimmed = typeof value === 'string' ? value.trim() : '';
    if (!value || (!trimmed && typeof value === 'string')) return;

    if (typeof value !== 'string') {
      if (value.kind === 'route' && value.label === OPS_COPY.shell.newDemand && onNewDemand) {
        onNewDemand();
      } else if (value.kind === 'route' && value.href) {
        router.push(value.href);
      } else if (value.kind === 'jarvis' && value.prompt) {
        setJarvisOpen(true);
        setTimeout(() => dispatchOpsJarvisPrompt(value.prompt!), 200);
      }
      setCommandInput('');
      return;
    }

    setJarvisOpen(true);
    setTimeout(() => dispatchOpsJarvisPrompt(trimmed), 200);
    setCommandInput('');
  };

  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';

  return (
    <AppShell
      title={copy.title}
      meta={copy.subtitle}
      action={{ label: OPS_COPY.shell.newDemand, icon: <IconPlus size={16} />, onClick: () => (onNewDemand ? onNewDemand() : router.push('/admin/operacoes/jobs?new=1')) }}
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
          bgcolor: 'background.paper',
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
                borderRadius: 2,
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
                      borderRadius: 1.5,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      fontSize: '0.78rem',
                      fontWeight: isActive ? 800 : 600,
                      color: isActive
                        ? '#fff'
                        : dark ? alpha(theme.palette.text.primary, 0.6) : alpha(theme.palette.text.primary, 0.55),
                      bgcolor: isActive
                        ? 'primary.main'
                        : 'transparent',
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
                  borderRadius: 2,
                  fontSize: '0.8rem',
                  bgcolor: dark ? alpha(theme.palette.common.white, 0.04) : alpha(theme.palette.common.black, 0.03),
                },
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: alpha(theme.palette.divider, dark ? 0.2 : 0.15),
                },
              }}
            />
          </Stack>

          <Box
            sx={{
              pt: 1,
              pb: summary ? 0.5 : 0.25,
              borderTop: `1px solid ${alpha(theme.palette.divider, dark ? 0.1 : 0.08)}`,
            }}
          >
            <Stack spacing={0.85}>
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 900,
                  color: 'text.secondary',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}
              >
                Vistas da planilha
              </Typography>
              <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                {LEGACY_VIEWS.map((view) => (
                  <Box
                    key={view.label}
                    onClick={() => router.push(view.href)}
                    sx={{
                      px: 1.25,
                      py: 0.8,
                      borderRadius: 1.5,
                      cursor: 'pointer',
                      border: `1px solid ${alpha(theme.palette.divider, dark ? 0.2 : 0.14)}`,
                      bgcolor: dark ? alpha(theme.palette.common.white, 0.03) : alpha(theme.palette.common.black, 0.02),
                      minWidth: { xs: 'calc(50% - 6px)', lg: 'auto' },
                      transition: 'all 160ms ease',
                      '&:hover': {
                        borderColor: alpha(theme.palette.primary.main, 0.35),
                        bgcolor: alpha(theme.palette.primary.main, dark ? 0.12 : 0.05),
                      },
                    }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                      {view.label}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.2 }}>
                      {view.subtitle}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </Stack>
          </Box>

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
      <Box>
        {children}
      </Box>

      {/* Operations Jarvis Drawer */}
      <OperationsJarvisDrawer open={jarvisOpen} onClose={() => setJarvisOpen(false)} />
    </AppShell>
  );
}
