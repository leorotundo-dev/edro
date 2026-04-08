'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import { IconArrowUpRight, IconExternalLink, IconUserOff, IconUsers } from '@tabler/icons-react';
import OperationsShell from '@/components/operations/OperationsShell';
import { apiGet } from '@/lib/api';
import type { OperationsJob } from '@/components/operations/model';

type PlannerOwner = {
  owner: {
    id: string;
    name: string;
    email?: string | null;
    role?: string | null;
    specialty?: string | null;
    person_type?: 'internal' | 'freelancer';
    freelancer_profile_id?: string | null;
    avatar_url?: string | null;
  };
  allocable_minutes: number;
  committed_minutes: number;
  tentative_minutes: number;
  usage: number;
  jobs: OperationsJob[];
};

type PlannerData = {
  owners: PlannerOwner[];
  unassigned_jobs: OperationsJob[];
};

function formatHours(minutes: number) {
  const safeMinutes = Math.max(0, Math.round(minutes || 0));
  const hours = Math.floor(safeMinutes / 60);
  const mins = safeMinutes % 60;
  if (!hours) return `${mins}min`;
  if (!mins) return `${hours}h`;
  return `${hours}h${mins}`;
}

function ownerState(usage: number) {
  if (usage >= 1) return { label: 'Estourado', color: '#FA896B' };
  if (usage >= 0.85) return { label: 'Atenção', color: '#FFAE1F' };
  return { label: 'Controlado', color: '#13DEB9' };
}

export default function OperationsPeopleClient() {
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [plannerData, setPlannerData] = useState<PlannerData>({ owners: [], unassigned_jobs: [] });
  const [selectedOwnerId, setSelectedOwnerId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await apiGet<{ data?: PlannerData }>('/trello/ops-planner');
        if (!active) return;
        const data = response?.data || { owners: [], unassigned_jobs: [] };
        setPlannerData(data);
        setSelectedOwnerId((current) => current || data.owners[0]?.owner.id || null);
      } catch (err: any) {
        if (!active) return;
        setError(err?.message || 'Falha ao carregar a pauta por pessoa.');
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, []);

  const selectedOwner = useMemo(
    () => plannerData.owners.find((item) => item.owner.id === selectedOwnerId) || plannerData.owners[0] || null,
    [plannerData.owners, selectedOwnerId]
  );

  const overloadedOwners = plannerData.owners.filter((owner) => owner.usage >= 1).length;
  const ownersWithSlack = plannerData.owners.filter((owner) => owner.usage < 0.55).length;

  return (
    <OperationsShell
      section="people"
      titleOverride="Pessoas"
      subtitleOverride="Quem está com o quê agora. Redistribuição temporal e encaixe moram em Semana."
      summary={
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Chip label={`${plannerData.owners.length} pessoas`} size="small" />
          <Chip label={`${ownersWithSlack} com folga`} size="small" color={ownersWithSlack ? 'success' : 'default'} />
          <Chip label={`${overloadedOwners} sob pressão`} size="small" color={overloadedOwners ? 'error' : 'default'} />
        </Stack>
      }
    >
      <Stack spacing={3}>
        <Paper
          elevation={0}
          sx={{
            borderRadius: 3,
            px: 2.5,
            py: 2.25,
            border: `1px solid ${alpha(theme.palette.primary.main, dark ? 0.24 : 0.14)}`,
            bgcolor: dark ? alpha(theme.palette.primary.main, 0.08) : alpha(theme.palette.primary.main, 0.03),
          }}
        >
          <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} justifyContent="space-between">
            <Box>
              <Typography variant="overline" sx={{ color: 'primary.main', fontWeight: 900, letterSpacing: '0.18em' }}>
                LEITURA INDIVIDUAL
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 900, mt: 0.4 }}>
                Quem está com o quê agora
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 760, mt: 0.8 }}>
                Use esta vista para ler a pauta atual por pessoa. Se precisar mexer em dias, folga e encaixe da
                semana, vá para Semana. O que está sem dono entra aqui só para não escapar da leitura.
              </Typography>
            </Box>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
              <Button component={Link} href="/admin/operacoes/jobs?view=table&group=client" variant="text">
                Abrir pauta geral
              </Button>
              <Button component={Link} href="/admin/operacoes/semana?view=distribution" variant="contained">
                Abrir semana
              </Button>
              <Button component={Link} href="/admin/operacoes/jobs?unassigned=true" variant="outlined">
                Resolver sem dono
              </Button>
            </Stack>
          </Stack>
        </Paper>

        {error ? <Alert severity="error">{error}</Alert> : null}

        {loading ? (
          <Stack alignItems="center" justifyContent="center" sx={{ py: 10 }}>
            <CircularProgress size={28} />
          </Stack>
        ) : (
          <>
            <Grid container spacing={2}>
              {plannerData.owners.map((row) => {
                const state = ownerState(row.usage);
                const freeMinutes = Math.max(0, row.allocable_minutes - row.committed_minutes - row.tentative_minutes);
                const selected = selectedOwner?.owner.id === row.owner.id;
                return (
                  <Grid key={row.owner.id} size={{ xs: 12, sm: 6, lg: 4, xl: 3 }}>
                    <Paper
                      elevation={0}
                      onClick={() => setSelectedOwnerId(row.owner.id)}
                      sx={{
                        borderRadius: 2.5,
                        px: 2,
                        py: 1.75,
                        cursor: 'pointer',
                        border: selected
                          ? `2px solid ${state.color}`
                          : `1px solid ${alpha(theme.palette.text.primary, dark ? 0.08 : 0.07)}`,
                        bgcolor: selected
                          ? (dark ? alpha(state.color, 0.14) : alpha(state.color, 0.07))
                          : (dark ? alpha(theme.palette.common.white, 0.02) : '#fff'),
                        transition: 'all 180ms ease',
                        '&:hover': {
                          borderColor: alpha(state.color, 0.45),
                          bgcolor: dark ? alpha(state.color, 0.1) : alpha(state.color, 0.05),
                        },
                      }}
                    >
                      <Stack spacing={1.2}>
                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                          <Stack direction="row" spacing={1.25} alignItems="center" sx={{ minWidth: 0, flex: 1, mr: 1 }}>
                            <Avatar
                              src={row.owner.avatar_url || undefined}
                              alt={row.owner.name}
                              sx={{ width: 36, height: 36, fontSize: '0.85rem', flexShrink: 0 }}
                            >
                              {row.owner.name.charAt(0).toUpperCase()}
                            </Avatar>
                            <Box sx={{ minWidth: 0 }}>
                              <Stack direction="row" spacing={0.5} alignItems="center">
                                <Typography variant="subtitle2" sx={{ fontWeight: 900 }} noWrap>
                                  {row.owner.name}
                                </Typography>
                                {row.owner.freelancer_profile_id ? (
                                  <Tooltip title="Ver perfil">
                                    <Box
                                      component={Link}
                                      href={`/admin/equipe/${row.owner.freelancer_profile_id}`}
                                      onClick={(e) => e.stopPropagation()}
                                      sx={{ display: 'inline-flex', color: 'text.disabled', '&:hover': { color: 'primary.main' } }}
                                    >
                                      <IconExternalLink size={12} />
                                    </Box>
                                  </Tooltip>
                                ) : null}
                              </Stack>
                              <Typography variant="caption" color="text.secondary" noWrap>
                                {row.owner.specialty || row.owner.role || 'Equipe'}
                              </Typography>
                            </Box>
                          </Stack>
                          <Chip
                            size="small"
                            label={state.label}
                            sx={{
                              bgcolor: alpha(state.color, 0.14),
                              color: state.color,
                              fontWeight: 900,
                              flexShrink: 0,
                            }}
                          />
                        </Stack>

                        <Stack direction="row" spacing={2.5}>
                          <Box>
                            <Typography variant="h5" sx={{ fontWeight: 900 }}>
                              {row.jobs.length}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              jobs ativos
                            </Typography>
                          </Box>
                          <Box>
                            <Typography variant="h5" sx={{ fontWeight: 900 }}>
                              {formatHours(freeMinutes)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              livres
                            </Typography>
                          </Box>
                        </Stack>

                        <Box>
                          <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.6 }}>
                            <Typography variant="caption" color="text.secondary">
                              Carga comprometida
                            </Typography>
                            <Typography variant="caption" sx={{ color: state.color, fontWeight: 800 }}>
                              {Math.round(row.usage * 100)}%
                            </Typography>
                          </Stack>
                          <Box sx={{ height: 6, borderRadius: 99, bgcolor: alpha(state.color, 0.14) }}>
                            <Box
                              sx={{
                                height: 6,
                                borderRadius: 99,
                                width: `${Math.min(100, Math.round(row.usage * 100))}%`,
                                bgcolor: state.color,
                              }}
                            />
                          </Box>
                        </Box>
                      </Stack>
                    </Paper>
                  </Grid>
                );
              })}
            </Grid>

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, xl: 8 }}>
                <Paper
                  elevation={0}
                  sx={{
                    borderRadius: 2.5,
                    border: `1px solid ${alpha(theme.palette.text.primary, dark ? 0.08 : 0.07)}`,
                    bgcolor: dark ? alpha(theme.palette.common.white, 0.02) : '#fff',
                  }}
                >
                  <Stack spacing={1.5} sx={{ p: 2 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0 }}>
                        {selectedOwner ? (
                          <Avatar
                            src={selectedOwner.owner.avatar_url || undefined}
                            alt={selectedOwner.owner.name}
                            sx={{ width: 40, height: 40, flexShrink: 0 }}
                          >
                            {selectedOwner.owner.name.charAt(0).toUpperCase()}
                          </Avatar>
                        ) : null}
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>
                            {selectedOwner ? selectedOwner.owner.name : 'Selecione uma pessoa'}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {selectedOwner
                              ? 'A pauta atual dessa pessoa. Para redistribuir dias e encaixe, abra Semana.'
                              : 'Escolha uma pessoa para ver a pauta.'}
                          </Typography>
                        </Box>
                      </Stack>
                      {selectedOwner ? (
                        <Stack direction="row" spacing={1} flexShrink={0}>
                          {selectedOwner.owner.freelancer_profile_id ? (
                            <Button
                              component={Link}
                              href={`/admin/equipe/${selectedOwner.owner.freelancer_profile_id}`}
                              variant="text"
                              size="small"
                              endIcon={<IconExternalLink size={14} />}
                            >
                              Ver perfil
                            </Button>
                          ) : null}
                          <Button
                            component={Link}
                            href={`/admin/operacoes/jobs?owner_id=${encodeURIComponent(selectedOwner.owner.id)}`}
                            variant="outlined"
                            size="small"
                            endIcon={<IconArrowUpRight size={14} />}
                          >
                            Abrir na fila
                          </Button>
                        </Stack>
                      ) : null}
                    </Stack>

                    <Stack spacing={1.2}>
                      {selectedOwner?.jobs.length ? (
                        selectedOwner.jobs.map((job) => (
                          <Paper
                            key={job.id}
                            elevation={0}
                            sx={{
                              borderRadius: 2,
                              px: 1.5,
                              py: 1.35,
                              border: `1px solid ${alpha(theme.palette.text.primary, dark ? 0.08 : 0.06)}`,
                              bgcolor: dark ? alpha(theme.palette.common.white, 0.02) : alpha(theme.palette.common.black, 0.012),
                            }}
                          >
                            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.25} justifyContent="space-between">
                              <Box sx={{ minWidth: 0 }}>
                                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 800 }}>
                                  {job.client_name || 'Sem cliente'}
                                </Typography>
                                <Typography variant="body2" sx={{ fontWeight: 800, mt: 0.3 }}>
                                  {job.title}
                                </Typography>
                              </Box>
                              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
                                <Chip size="small" label={job.status || 'Sem status'} />
                                {job.deadline_at ? <Chip size="small" label={new Date(job.deadline_at).toLocaleDateString('pt-BR')} variant="outlined" /> : null}
                                <Button
                                  component={Link}
                                  href={`/admin/operacoes/jobs?highlight=${encodeURIComponent(job.id)}`}
                                  size="small"
                                  variant="text"
                                >
                                  Abrir demanda
                                </Button>
                              </Stack>
                            </Stack>
                          </Paper>
                        ))
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          Nada atribuído para essa pessoa agora.
                        </Typography>
                      )}
                    </Stack>
                  </Stack>
                </Paper>
              </Grid>

              <Grid size={{ xs: 12, xl: 4 }}>
                <Paper
                  elevation={0}
                  sx={{
                    borderRadius: 2.5,
                    border: `1px solid ${alpha(theme.palette.text.primary, dark ? 0.08 : 0.07)}`,
                    bgcolor: dark ? alpha(theme.palette.common.white, 0.02) : '#fff',
                  }}
                >
                  <Stack spacing={1.5} sx={{ p: 2 }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Box sx={{ color: 'warning.main', display: 'inline-flex' }}>
                        <IconUserOff size={16} />
                      </Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>
                        Aguardando dono
                      </Typography>
                    </Stack>

                    <Typography variant="body2" color="text.secondary">
                      Itens que ainda não entraram na leitura individual porque a operação não definiu responsável.
                    </Typography>

                    {plannerData.unassigned_jobs.length ? (
                      <>
                        {plannerData.unassigned_jobs.slice(0, 8).map((job) => (
                          <Paper
                            key={job.id}
                            elevation={0}
                            sx={{
                              borderRadius: 2,
                              px: 1.4,
                              py: 1.2,
                              border: `1px solid ${alpha('#FFAE1F', 0.24)}`,
                              bgcolor: dark ? alpha('#FFAE1F', 0.08) : alpha('#FFAE1F', 0.05),
                            }}
                          >
                            <Typography variant="body2" sx={{ fontWeight: 800 }}>
                              {job.title}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.35 }}>
                              {job.client_name || 'Sem cliente'}
                            </Typography>
                          </Paper>
                        ))}
                        <Button component={Link} href="/admin/operacoes/jobs?unassigned=true" variant="outlined" size="small">
                          Resolver na pauta geral
                        </Button>
                      </>
                    ) : (
                      <Stack spacing={1.2} alignItems="flex-start">
                        <Stack direction="row" spacing={1} alignItems="center">
                          <IconUsers size={16} color="#13DEB9" />
                          <Typography variant="body2" color="text.secondary">
                            Toda a fila já está distribuída.
                          </Typography>
                        </Stack>
                      </Stack>
                    )}
                  </Stack>
                </Paper>
              </Grid>
            </Grid>
          </>
        )}
      </Stack>
    </OperationsShell>
  );
}
