'use client';

import { useMemo, useState, type ReactElement, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { OPS_COPY } from './copy';
import { useJarvis } from '@/contexts/JarvisContext';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
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
  IconCalendarTime,
  IconAlertTriangle,
  IconChecklist,
  IconUsers,
  IconBrain,
  IconInbox,
} from '@tabler/icons-react';

export type OperationsSection = 'overview' | 'jobs' | 'ia' | 'people' | 'semana' | 'radar' | 'quality' | 'pauta';

type CommandOption = {
  label: string;
  subtitle: string;
  href: string;
  searchTerms?: string[];
};

const SECTIONS: Array<{ key: OperationsSection; label: string; href: string; icon: ReactElement }> = [
  { key: 'overview', label: 'Hoje', href: '/admin/operacoes', icon: <IconTargetArrow size={16} /> },
  { key: 'jobs', label: 'Pauta Geral', href: '/admin/operacoes/jobs?view=table&group=client', icon: <IconLayoutKanban size={16} /> },
  { key: 'pauta', label: 'Pauta Inbox', href: '/admin/operacoes/pauta', icon: <IconInbox size={16} /> },
  { key: 'ia', label: 'Handoff', href: '/admin/operacoes/ia', icon: <IconBrain size={16} /> },
  { key: 'people', label: 'Pessoas', href: '/admin/operacoes/pessoas', icon: <IconUsers size={16} /> },
  { key: 'semana', label: 'Semana', href: '/admin/operacoes/semana', icon: <IconCalendarTime size={16} /> },
  { key: 'radar', label: 'Riscos', href: '/admin/operacoes/radar', icon: <IconAlertTriangle size={16} /> },
  { key: 'quality', label: 'SLA', href: '/admin/operacoes/qualidade', icon: <IconChecklist size={16} /> },
];

const SECTION_COPY: Record<OperationsSection, { title: string; subtitle: string }> = {
  overview: { title: 'Hoje', subtitle: 'Mesa de decisão da operação para agir agora.' },
  jobs: { title: 'Pauta Geral', subtitle: 'A carteira operacional da agência para leitura, triagem e decisão.' },
  ia: { title: 'Handoff criativo', subtitle: 'Demandas que precisam de briefing, copy ou aprovação dentro da pauta.' },
  people: { title: 'Pessoas', subtitle: 'Leitura individual da pauta por responsável e do que ainda está sem dono.' },
  semana: { title: 'Semana', subtitle: 'Distribuição, capacidade e encaixe temporal da operação.' },
  radar: { title: 'Riscos', subtitle: 'Mesa de exceção para sinais, bloqueios e itens que podem estourar.' },
  quality: { title: 'SLA', subtitle: 'Prazo, estimativa e precisão operacional no mesmo lugar.' },
  pauta: { title: 'Pauta Inbox', subtitle: 'Sugestões de pauta geradas pelo Motor — aprove, ajuste ou descarte.' },
};

const COMMANDS: CommandOption[] = [
  { label: 'Nova demanda', subtitle: 'Abrir cadastro guiado de demanda', href: '/admin/operacoes/jobs?new=1' },
  { label: 'Hoje', subtitle: 'Abrir a mesa de decisão da operação', href: '/admin/operacoes', searchTerms: ['painel de controle'] },
  { label: 'Pauta Geral', subtitle: 'Abrir a carteira agrupada por cliente', href: '/admin/operacoes/jobs?view=table&group=client' },
  { label: 'Banco de Dados', subtitle: 'Abrir a fila em tabela crua da operação', href: '/admin/operacoes/jobs?view=table', searchTerms: ['banco de dados filtros', 'fila tabela'] },
  { label: 'Fila', subtitle: 'Abrir a fila operacional bruta da agência', href: '/admin/operacoes/jobs' },
  { label: 'Pessoas', subtitle: 'Abrir a pauta individual por responsável', href: '/admin/operacoes/pessoas', searchTerms: ['pauta nome', 'pauta por pessoa'] },
  { label: 'Semana', subtitle: 'Abrir distribuição e encaixe temporal da operação', href: '/admin/operacoes/semana' },
  { label: 'Riscos', subtitle: 'Abrir a mesa de exceção da operação', href: '/admin/operacoes/radar', searchTerms: ['externos', 'riscos críticos'] },
  { label: 'SLA', subtitle: 'Abrir a leitura de prazo e estimativa da operação', href: '/admin/operacoes/qualidade', searchTerms: ['auditoria sla', 'qualidade'] },
  { label: 'Pauta Inbox', subtitle: 'Aprovar ou rejeitar sugestões de pauta geradas pelo Motor', href: '/admin/operacoes/pauta', searchTerms: ['sugestões pauta', 'inbox pauta', 'aprovar pauta'] },
  { label: 'Handoff criativo', subtitle: 'Abrir a bandeja de briefing, copy e aprovação', href: '/admin/operacoes/ia', searchTerms: ['extração para ia', 'prontos para copy'] },
  { label: 'Demandas sem responsável', subtitle: 'Ir direto para a fila sem responsável definido', href: '/admin/operacoes/jobs?unassigned=true' },
  { label: 'Distribuição da semana', subtitle: 'Abrir a semana no modo distribuição da equipe', href: '/admin/operacoes/semana?view=distribution' },
  { label: 'Agenda operacional', subtitle: 'Ver impacto temporal da semana em calendário', href: '/admin/operacoes/semana?view=calendar' },
];

export default function OperationsShell({
  section,
  children,
  summary,
  onNewDemand,
  titleOverride,
  subtitleOverride,
}: {
  section: OperationsSection;
  children: ReactNode;
  summary?: ReactNode;
  onNewDemand?: () => void;
  titleOverride?: string;
  subtitleOverride?: string;
}) {
  const router = useRouter();
  const { open: openJarvis } = useJarvis();
  const [commandInput, setCommandInput] = useState('');
  const copy = SECTION_COPY[section];
  const title = titleOverride || copy.title;
  const subtitle = subtitleOverride || copy.subtitle;

  const commandOptions = useMemo(() => COMMANDS, []);

  const handleRunCommand = (value: CommandOption | null) => {
    if (!value) return;
    if (value.label === OPS_COPY.shell.newDemand && onNewDemand) {
      onNewDemand();
    } else {
      router.push(value.href);
    }
    setCommandInput('');
  };

  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';

  return (
    <AppShell
      title={title}
      meta={subtitle}
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

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ width: { xs: '100%', md: 'auto' }, flexShrink: 0 }}>
              <Autocomplete
                size="small"
                options={commandOptions}
                getOptionLabel={(option) => option.label}
                inputValue={commandInput}
                onInputChange={(_event, value) => setCommandInput(value)}
                onChange={(_event, value) => handleRunCommand(value)}
                filterOptions={(options, state) => {
                  const query = state.inputValue.trim().toLowerCase();
                  if (!query) return options;
                  return options.filter((option) => {
                    const haystack = [option.label, option.subtitle, ...(option.searchTerms || [])].join(' ').toLowerCase();
                    return haystack.includes(query);
                  });
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="Ir para uma vista da Central..."
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
                  width: { xs: '100%', md: 280 },
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
              <Button
                variant="outlined"
                onClick={() => openJarvis()}
                startIcon={<IconBrain size={16} />}
                sx={{
                  minHeight: 36,
                  borderRadius: 2,
                  whiteSpace: 'nowrap',
                  borderColor: alpha(theme.palette.primary.main, 0.28),
                }}
              >
                Chamar Jarvis
              </Button>
            </Stack>
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
      <Box>
        {children}
      </Box>
    </AppShell>
  );
}
