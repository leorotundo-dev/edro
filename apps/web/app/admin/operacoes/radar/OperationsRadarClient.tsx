'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { apiGet } from '@/lib/api';
import OperationsShell from '@/components/operations/OperationsShell';
import JobWorkbenchDrawer from '@/components/operations/JobWorkbenchDrawer';
import {
  ClientThumb,
  EmptyOperationState,
  EntityLinkCard,
  OperationsContextRail,
  OpsDivider,
  OpsJobRow,
  OpsSection,
  OpsSummaryStat,
  OpsSurface,
  PersonThumb,
  SourceThumb,
} from '@/components/operations/primitives';
import { jobsByAttentionClient, sortByOperationalPriority } from '@/components/operations/derived';
import { formatSourceLabel, getNextAction, getRisk, STAGE_LABELS, type OperationsJob } from '@/components/operations/model';
import { useOperationsData } from '@/components/operations/useOperationsData';
import { OPS_COPY } from '@/components/operations/copy';

export default function OperationsRadarClient() {
  const router = useRouter();
  const { jobs, lookups, loading, error, refresh, currentUserId, createJob, updateJob, changeStatus, fetchJob } = useOperationsData('?active=true');
  const [selectedJob, setSelectedJob] = useState<OperationsJob | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [riskLoading, setRiskLoading] = useState(true);
  const [riskError, setRiskError] = useState('');
  const [riskData, setRiskData] = useState<{
    critical: OperationsJob[];
    high: OperationsJob[];
    client_risk: Array<{
      clientId: string;
      clientName: string;
      clientLogoUrl?: string | null;
      clientBrandColor?: string | null;
      total: number;
      critical: number;
      open: number;
    }>;
  }>({ critical: [], high: [], client_risk: [] });

  useEffect(() => {
    let active = true;
    const loadRisks = async () => {
      setRiskLoading(true);
      setRiskError('');
      try {
        const response = await apiGet<{ data?: typeof riskData }>('/operations/risks');
        if (!active) return;
        setRiskData(response?.data || { critical: [], high: [], client_risk: [] });
      } catch (err: any) {
        if (!active) return;
        setRiskError(err?.message || 'Falha ao carregar os riscos.');
      } finally {
        if (active) setRiskLoading(false);
      }
    };
    loadRisks();
    return () => {
      active = false;
    };
  }, [jobs.length]);

  const critical = riskData.critical;
  const high = riskData.high;
  const clientRisk = riskData.client_risk;
  const focusedAction = selectedJob ? getNextAction(selectedJob) : null;
  const isStandaloneRiskItem = Boolean(selectedJob?.metadata?.calendar_item?.standalone);
  const isNativeMeeting = selectedJob?.metadata?.calendar_item?.source_type === 'meeting';

  useEffect(() => {
    if (!selectedJob) {
      setSelectedJob(critical[0] || high[0] || null);
      return;
    }
    const fresh = jobs.find((job) => job.id === selectedJob.id);
    if (fresh) setSelectedJob(fresh);
  }, [critical, high, jobs, selectedJob]);

  return (
    <OperationsShell
      section="radar"
      summary={
        <Stack direction="row" spacing={2.25} flexWrap="wrap" useFlexGap alignItems="center">
          <OpsSummaryStat value={critical.length} label={OPS_COPY.radar.summaryCritical} tone={critical.length ? 'error' : 'default'} />
          <OpsSummaryStat value={high.length} label={OPS_COPY.radar.summaryHigh} tone={high.length ? 'warning' : 'default'} />
          <OpsSummaryStat value={clientRisk.filter((item) => item.critical > 0).length} label={OPS_COPY.radar.summaryClients} tone={clientRisk.some((item) => item.critical > 0) ? 'error' : 'default'} />
        </Stack>
      }
    >
      {error ? <Alert severity="error">{error}</Alert> : null}
      {riskError ? <Alert severity="error">{riskError}</Alert> : null}

      {loading || riskLoading ? (
        <Box sx={{ py: 10, display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>
      ) : (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, lg: 7.6 }}>
            <Stack spacing={3}>
              <OpsSection
                eyebrow="Pontos de atenção"
                title={OPS_COPY.radar.title}
                subtitle={OPS_COPY.radar.subtitle}
                action={
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Chip size="small" color={critical.length ? 'error' : 'default'} label={`${critical.length} críticos`} />
                    <Chip size="small" color={high.length ? 'warning' : 'default'} label={`${high.length} altos`} />
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={async () => {
                        await refresh();
                        const response = await apiGet<{ data?: typeof riskData }>('/operations/risks');
                        setRiskData(response?.data || { critical: [], high: [], client_risk: [] });
                      }}
                    >
                      {OPS_COPY.radar.refresh}
                    </Button>
                  </Stack>
                }
              >
                <OpsSurface>
                  <Stack spacing={2.5}>
                    <Box>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.25 }}>
                        <Box>
                          <Typography variant="body1" fontWeight={900}>Crítico</Typography>
                          <Typography variant="caption" color="text.secondary">{OPS_COPY.radar.criticalSubtitle}</Typography>
                        </Box>
                        <Chip size="small" color="error" label={`${critical.length}`} />
                      </Stack>
                      <Stack spacing={0.5}>
                        {critical.length ? critical.map((job) => (
                          <Box key={job.id}>
                            <OpsJobRow job={job} selected={selectedJob?.id === job.id} onClick={() => setSelectedJob(job)} showStage />
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', pl: 1, pt: 0.4 }}>
                              Próxima ação sugerida: {getNextAction(job).label}
                            </Typography>
                          </Box>
                        )) : (
                          <EmptyOperationState title={OPS_COPY.radar.emptyCriticalTitle} description={OPS_COPY.radar.emptyCriticalDescription} />
                        )}
                      </Stack>
                    </Box>

                    <OpsDivider />

                    <Box>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.25 }}>
                        <Box>
                          <Typography variant="body1" fontWeight={900}>Risco alto</Typography>
                          <Typography variant="caption" color="text.secondary">{OPS_COPY.radar.highSubtitle}</Typography>
                        </Box>
                        <Chip size="small" color={high.length ? 'warning' : 'default'} label={`${high.length}`} />
                      </Stack>
                      <Stack spacing={0.5}>
                        {high.length ? high.map((job) => (
                          <Box key={job.id}>
                            <OpsJobRow job={job} selected={selectedJob?.id === job.id} onClick={() => setSelectedJob(job)} showStage />
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', pl: 1, pt: 0.4 }}>
                              Próxima ação sugerida: {getNextAction(job).label}
                            </Typography>
                          </Box>
                        )) : (
                          <Typography variant="body2" color="text.secondary">
                            {OPS_COPY.radar.emptyHigh}
                          </Typography>
                        )}
                      </Stack>
                    </Box>
                  </Stack>
                </OpsSurface>
              </OpsSection>
            </Stack>
          </Grid>

          <Grid size={{ xs: 12, lg: 4.4 }}>
            <OperationsContextRail
              eyebrow={OPS_COPY.common.contextEyebrow}
              title={OPS_COPY.common.focusTitle}
              subtitle={OPS_COPY.radar.focusSubtitle}
              job={selectedJob}
              primaryLabel={isNativeMeeting ? 'Abrir reuniões' : focusedAction?.label}
              onPrimaryAction={() => {
                if (!selectedJob) return;
                if (isNativeMeeting) {
                  router.push('/admin/reunioes');
                  return;
                }
                setDetailOpen(true);
              }}
              emptyTitle="Selecione uma demanda"
              emptyDescription={OPS_COPY.radar.focusEmptySubtitle}
              links={
                selectedJob ? (
                  <Grid container spacing={1.25}>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <EntityLinkCard
                        label="Cliente"
                        value={selectedJob.client_name || 'Sem cliente'}
                        href={selectedJob.client_id ? `/clients/${selectedJob.client_id}` : undefined}
                        subtitle="Conta em risco"
                        accent={selectedJob.client_brand_color || '#E85219'}
                        thumbnail={<ClientThumb name={selectedJob.client_name} logoUrl={selectedJob.client_logo_url} accent={selectedJob.client_brand_color || '#E85219'} size={26} />}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <EntityLinkCard
                        label="Responsável"
                        value={selectedJob.owner_name || 'Sem responsável'}
                        href="/admin/operacoes/planner"
                        subtitle="Quem precisa agir primeiro"
                        thumbnail={<PersonThumb name={selectedJob.owner_name} accent="#5D87FF" size={26} />}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <EntityLinkCard
                        label="Agenda"
                        value={selectedJob.deadline_at ? 'Prazo em andamento' : 'Sem prazo'}
                        href="/admin/operacoes/agenda"
                        subtitle={selectedJob.deadline_at ? 'Acompanhar impacto no calendário' : 'Defina prazo para medir risco'}
                        thumbnail={<SourceThumb source="agenda" jobType="meeting" accent="#13DEB9" />}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <EntityLinkCard
                        label="Origem"
                        value={formatSourceLabel(selectedJob.source)}
                        subtitle={selectedJob.job_type}
                        thumbnail={<SourceThumb source={selectedJob.source} jobType={selectedJob.job_type} accent="#E85219" />}
                      />
                    </Grid>
                  </Grid>
                ) : null
              }
              sections={[
                {
                  title: OPS_COPY.radar.attentionClientsTitle,
                  content: clientRisk.length ? (
                    <Stack spacing={1}>
                      {clientRisk.map((item) => (
                        <Box
                          key={item.clientId}
                          sx={(theme) => ({
                            px: 1,
                            py: 1.1,
                            borderRadius: 1.5,
                            border: `1px solid ${alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.08 : 0.1)}`,
                            bgcolor: alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.015 : 0.02),
                          })}
                        >
                          <Stack direction="row" spacing={1.25} alignItems="center" justifyContent="space-between">
                            <Stack direction="row" spacing={1.1} alignItems="center" sx={{ minWidth: 0 }}>
                              <ClientThumb
                                name={item.clientName}
                                logoUrl={item.clientLogoUrl}
                                accent={item.clientBrandColor || '#E85219'}
                                size={30}
                              />
                              <Box sx={{ minWidth: 0 }}>
                                <Typography variant="body2" fontWeight={800} noWrap>{item.clientName}</Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {item.open} demandas ativas · {item.total} min previstos
                                </Typography>
                              </Box>
                            </Stack>
                            <Chip size="small" color={item.critical > 0 ? 'error' : 'default'} label={`${item.critical} em risco`} />
                          </Stack>
                        </Box>
                      ))}
                    </Stack>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      {OPS_COPY.radar.attentionClientsEmpty}
                    </Typography>
                  ),
                },
                {
                  title: OPS_COPY.radar.rulesTitle,
                  content: (
                    <Stack spacing={1.25}>
                      <Alert severity="info">Bloqueado, atrasado ou P0 sem responsável sobe para risco crítico.</Alert>
                      <Alert severity="warning">Prazo em até 24h e aprovação pendente contam como risco alto.</Alert>
                      <Alert severity="info">Entrada incompleta e demanda sem responsável entram como risco médio até a operação resolver.</Alert>
                    </Stack>
                  ),
                },
                {
                  content: (
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      <Button
                        variant="contained"
                        onClick={() => {
                          if (!selectedJob) return;
                          if (isNativeMeeting) {
                            router.push('/admin/reunioes');
                            return;
                          }
                          setDetailOpen(true);
                        }}
                        disabled={!selectedJob}
                      >
                        {isNativeMeeting ? 'Abrir reuniões' : OPS_COPY.common.openDetail}
                      </Button>
                      <Button
                        variant="outlined"
                        onClick={async () => {
                          await refresh();
                          const response = await apiGet<{ data?: typeof riskData }>('/operations/risks');
                          setRiskData(response?.data || { critical: [], high: [], client_risk: [] });
                        }}
                      >
                        {OPS_COPY.radar.refresh}
                      </Button>
                      <Button
                        variant="outlined"
                        onClick={() => selectedJob && fetchJob(selectedJob.id).then((job) => setSelectedJob(job))}
                        disabled={!selectedJob || isStandaloneRiskItem}
                      >
                        {isNativeMeeting ? 'Demanda indisponível' : OPS_COPY.common.refreshDetail}
                      </Button>
                    </Stack>
                  ),
                },
              ]}
            />
          </Grid>
        </Grid>
      )}

      <JobWorkbenchDrawer
        open={detailOpen && Boolean(selectedJob) && !isStandaloneRiskItem}
        mode="edit"
        job={selectedJob}
        jobTypes={lookups.jobTypes}
        skills={lookups.skills}
        channels={lookups.channels}
        clients={lookups.clients}
        owners={lookups.owners}
        currentUserId={currentUserId}
        onClose={() => setDetailOpen(false)}
        onCreate={createJob}
        onUpdate={async (jobId, payload) => {
          const updated = await updateJob(jobId, payload);
          await refresh();
          const response = await apiGet<{ data?: typeof riskData }>('/operations/risks');
          setRiskData(response?.data || { critical: [], high: [], client_risk: [] });
          setSelectedJob(updated as OperationsJob);
          return updated;
        }}
        onStatusChange={async (jobId, status, reason) => {
          const updated = await changeStatus(jobId, status, reason);
          await refresh();
          const response = await apiGet<{ data?: typeof riskData }>('/operations/risks');
          setRiskData(response?.data || { critical: [], high: [], client_risk: [] });
          setSelectedJob(updated as OperationsJob);
          return updated;
        }}
        onFetchDetail={fetchJob}
      />
    </OperationsShell>
  );
}
