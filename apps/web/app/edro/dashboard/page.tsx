'use client';

import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import DashboardCard from '@/components/shared/DashboardCard';
import { apiGet, apiPost } from '@/lib/api';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import {
  IconClipboardList,
  IconClockHour4,
  IconAlertTriangle,
  IconRobot,
  IconTrendingUp,
  IconBrandInstagram,
  IconBrandFacebook,
  IconBrandLinkedin,
  IconChartBar,
  IconBrain,
  IconArrowUp,
  IconArrowDown,
  IconClock,
} from '@tabler/icons-react';

type ReporteiFormat = {
  format: string;
  score: number;
  kpis: { metric: string; value: number }[];
};

type ReporteiPlatform = {
  platform: string;
  updatedAt: string;
  topFormats: ReporteiFormat[];
  insights: string[];
};

type Metrics = {
  total: number;
  byStatus: Record<string, number>;
  avgTimePerStage: Record<string, number>;
  totalCopies: number;
  tasksByType: Record<string, number>;
  recentBriefings: number;
  overdue: number;
  bottlenecks: { stage: string; count: number }[];
  weeklyVelocity: { week: string; count: number }[];
  stageFunnel: { stage: string; count: number }[];
  copiesWeekly: { week: string; count: number }[];
  reporteiPlatforms: ReporteiPlatform[];
  predictiveTimes: {
    platform: string;
    day_of_week: number;
    hour: number;
    avg_engagement: number;
    sample_size: number;
  }[];
  learningInsights: {
    client_id: string;
    rebuilt_at: string;
    total_scored_copies: number;
    overall_avg_score: number;
    boost: string[];
    avoid: string[];
    preferred_formats: { format: string; avg_score: number; count: number }[];
  }[];
};

const STAGE_LABELS: Record<string, string> = {
  briefing: 'Briefing',
  iclips_in: 'iClips Entrada',
  alinhamento: 'Alinhamento',
  copy_ia: 'Copy IA',
  aprovacao: 'Aprovação',
  producao: 'Produção',
  revisao: 'Revisão',
  entrega: 'Entrega',
  iclips_out: 'iClips Saída',
  done: 'Concluído',
};

const STAGE_COLORS: Record<string, string> = {
  briefing: '#3b82f6',
  iclips_in: '#8b5cf6',
  alinhamento: '#eab308',
  copy_ia: '#06b6d4',
  aprovacao: '#f97316',
  producao: '#ec4899',
  revisao: '#6366f1',
  entrega: '#22c55e',
  iclips_out: '#a855f7',
  done: '#10b981',
};

const STAGE_ORDER = [
  'briefing', 'iclips_in', 'alinhamento', 'copy_ia',
  'aprovacao', 'producao', 'revisao', 'entrega', 'iclips_out', 'done',
];

function StatBox({ label, value, icon, color }: { label: string; value: string | number; icon: React.ReactNode; color: string }) {
  return (
    <DashboardCard sx={{ flex: 1, minWidth: 160 }}>
      <Stack direction="row" alignItems="center" spacing={2}>
        <Box
          sx={{
            width: 48, height: 48, borderRadius: 2,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            bgcolor: `${color}18`,
            color,
          }}
        >
          {icon}
        </Box>
        <Box>
          <Typography variant="h4" fontWeight={700}>{value}</Typography>
          <Typography variant="body2" color="text.secondary">{label}</Typography>
        </Box>
      </Stack>
    </DashboardCard>
  );
}

function FunnelBar({ stage, count, maxCount }: { stage: string; count: number; maxCount: number }) {
  const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
  const color = STAGE_COLORS[stage] || '#6366f1';
  return (
    <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1 }}>
      <Typography variant="body2" sx={{ width: 120, flexShrink: 0, textAlign: 'right' }}>
        {STAGE_LABELS[stage] || stage}
      </Typography>
      <Box sx={{ flex: 1, position: 'relative', height: 24 }}>
        <LinearProgress
          variant="determinate"
          value={pct}
          sx={{
            height: 24, borderRadius: 1,
            bgcolor: 'grey.100',
            '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 1 },
          }}
        />
        <Typography
          variant="caption"
          fontWeight={600}
          sx={{
            position: 'absolute', top: '50%', left: 8,
            transform: 'translateY(-50%)', color: pct > 15 ? '#fff' : 'text.primary',
          }}
        >
          {count}
        </Typography>
      </Box>
    </Stack>
  );
}

type LearningPreferences = {
  version: number;
  rebuilt_at: string;
  copy_feedback: {
    top_angles: { angle: string; avg_score: number; count: number }[];
    preferred_formats: { format: string; avg_score: number; count: number }[];
    anti_patterns: { pattern: string; avg_score: number; count: number }[];
    overall_avg_score: number;
    total_scored_copies: number;
  };
  directives: {
    boost: string[];
    avoid: string[];
  };
};

export default function EdroDashboardPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [learning, setLearning] = useState<LearningPreferences | null>(null);
  const [rebuildingLearning, setRebuildingLearning] = useState(false);

  useEffect(() => {
    apiGet<{ data: Metrics }>('/edro/metrics')
      .then((res) => setMetrics(res?.data ?? null))
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  const active = (metrics?.byStatus?.active ?? 0) + (metrics?.byStatus?.in_progress ?? 0);
  const done = metrics?.byStatus?.done ?? 0;
  const funnelMax = Math.max(...(metrics?.stageFunnel?.map((s) => s.count) ?? [1]), 1);

  const sortedFunnel = [...(metrics?.stageFunnel ?? [])].sort(
    (a, b) => STAGE_ORDER.indexOf(a.stage) - STAGE_ORDER.indexOf(b.stage)
  );

  const sortedAvgTime = Object.entries(metrics?.avgTimePerStage ?? {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  return (
    <AppShell title="Dashboard Edro">
      <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
        {loading ? (
          <LinearProgress />
        ) : !metrics ? (
          <Typography color="text.secondary">Sem dados disponíveis.</Typography>
        ) : (
          <Stack spacing={3}>
            {/* Top Stats */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <StatBox
                label="Total Briefings"
                value={metrics.total}
                icon={<IconClipboardList size={24} />}
                color="#3b82f6"
              />
              <StatBox
                label="Em Andamento"
                value={active}
                icon={<IconTrendingUp size={24} />}
                color="#f59e0b"
              />
              <StatBox
                label="Concluídos"
                value={done}
                icon={<IconClipboardList size={24} />}
                color="#22c55e"
              />
              <StatBox
                label="Atrasados"
                value={metrics.overdue}
                icon={<IconAlertTriangle size={24} />}
                color="#ef4444"
              />
              <StatBox
                label="Copies Geradas"
                value={metrics.totalCopies}
                icon={<IconRobot size={24} />}
                color="#8b5cf6"
              />
            </Stack>

            {/* Funnel + Bottleneck Row */}
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <DashboardCard title="Funil por Etapa" sx={{ flex: 2 }}>
                {sortedFunnel.length > 0 ? (
                  sortedFunnel.map((item) => (
                    <FunnelBar key={item.stage} stage={item.stage} count={item.count} maxCount={funnelMax} />
                  ))
                ) : (
                  <Typography variant="body2" color="text.secondary">Sem briefings ativos.</Typography>
                )}
              </DashboardCard>

              <DashboardCard title="Tempo Médio por Etapa" subtitle="Horas (etapas concluídas)" sx={{ flex: 1 }}>
                {sortedAvgTime.length > 0 ? (
                  <Stack spacing={1}>
                    {sortedAvgTime.map(([stage, hours]) => (
                      <Stack key={stage} direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2">{STAGE_LABELS[stage] || stage}</Typography>
                        <Chip
                          label={`${hours}h`}
                          size="small"
                          sx={{
                            bgcolor: hours > 48 ? '#fef2f2' : hours > 24 ? '#fefce8' : '#f0fdf4',
                            color: hours > 48 ? '#dc2626' : hours > 24 ? '#ca8a04' : '#16a34a',
                            fontWeight: 600,
                          }}
                        />
                      </Stack>
                    ))}
                  </Stack>
                ) : (
                  <Typography variant="body2" color="text.secondary">Sem dados de tempo.</Typography>
                )}
              </DashboardCard>
            </Stack>

            {/* Bottlenecks + Weekly Velocity */}
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <DashboardCard title="Gargalos Atuais" subtitle="Etapas com mais briefings parados" sx={{ flex: 1 }}>
                {metrics.bottlenecks.length > 0 ? (
                  <Stack spacing={1}>
                    {metrics.bottlenecks.map((item) => (
                      <Stack key={item.stage} direction="row" justifyContent="space-between" alignItems="center">
                        <Chip
                          label={STAGE_LABELS[item.stage] || item.stage}
                          size="small"
                          sx={{ bgcolor: STAGE_COLORS[item.stage] + '20', color: STAGE_COLORS[item.stage], fontWeight: 600 }}
                        />
                        <Typography variant="h6" fontWeight={700}>{item.count}</Typography>
                      </Stack>
                    ))}
                  </Stack>
                ) : (
                  <Typography variant="body2" color="text.secondary">Nenhum gargalo detectado.</Typography>
                )}
              </DashboardCard>

              <DashboardCard title="Velocidade Semanal" subtitle="Briefings concluídos por semana" sx={{ flex: 2 }}>
                {metrics.weeklyVelocity.length > 0 ? (
                  <Stack spacing={0.5}>
                    {metrics.weeklyVelocity.map((item) => {
                      const weekLabel = new Date(item.week).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
                      const max = Math.max(...metrics.weeklyVelocity.map((v) => v.count), 1);
                      return (
                        <Stack key={item.week} direction="row" alignItems="center" spacing={1}>
                          <Typography variant="caption" sx={{ width: 60, flexShrink: 0, textAlign: 'right' }}>
                            {weekLabel}
                          </Typography>
                          <Box sx={{ flex: 1, height: 20, position: 'relative' }}>
                            <LinearProgress
                              variant="determinate"
                              value={(item.count / max) * 100}
                              sx={{
                                height: 20, borderRadius: 1,
                                bgcolor: 'grey.100',
                                '& .MuiLinearProgress-bar': { bgcolor: '#6366f1', borderRadius: 1 },
                              }}
                            />
                            <Typography
                              variant="caption"
                              fontWeight={600}
                              sx={{
                                position: 'absolute', top: '50%', left: 8,
                                transform: 'translateY(-50%)', color: item.count > 0 ? '#fff' : 'text.secondary',
                              }}
                            >
                              {item.count}
                            </Typography>
                          </Box>
                        </Stack>
                      );
                    })}
                  </Stack>
                ) : (
                  <Typography variant="body2" color="text.secondary">Nenhum briefing concluído nas últimas 8 semanas.</Typography>
                )}
              </DashboardCard>
            </Stack>

            {/* Recent Activity */}
            <DashboardCard title="Atividade Recente">
              <Stack direction="row" spacing={3} alignItems="center">
                <Box>
                  <Typography variant="h3" fontWeight={700} color="primary.main">{metrics.recentBriefings}</Typography>
                  <Typography variant="body2" color="text.secondary">briefings criados nos últimos 7 dias</Typography>
                </Box>
                {metrics.copiesWeekly.length > 0 && (
                  <Box>
                    <Typography variant="h3" fontWeight={700} color="secondary.main">
                      {metrics.copiesWeekly.reduce((sum, w) => sum + w.count, 0)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">copies geradas nas últimas 8 semanas</Typography>
                  </Box>
                )}
              </Stack>
            </DashboardCard>

            {/* Reportei Performance */}
            {metrics.reporteiPlatforms && metrics.reporteiPlatforms.length > 0 && (
              <>
                <Typography variant="h6" fontWeight={700} sx={{ mt: 1 }}>
                  Performance Reportei
                </Typography>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                  {metrics.reporteiPlatforms.map((plat) => {
                    const platformIcon = plat.platform.toLowerCase().includes('instagram')
                      ? <IconBrandInstagram size={20} />
                      : plat.platform.toLowerCase().includes('facebook') || plat.platform.toLowerCase().includes('meta')
                      ? <IconBrandFacebook size={20} />
                      : plat.platform.toLowerCase().includes('linkedin')
                      ? <IconBrandLinkedin size={20} />
                      : <IconChartBar size={20} />;

                    return (
                      <DashboardCard key={plat.platform} sx={{ flex: 1 }}>
                        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                          <Box sx={{ color: '#6366f1' }}>{platformIcon}</Box>
                          <Typography variant="subtitle1" fontWeight={700}>{plat.platform}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(plat.updatedAt).toLocaleDateString('pt-BR')}
                          </Typography>
                        </Stack>

                        {plat.topFormats.length > 0 && (
                          <Stack spacing={1} sx={{ mb: 1.5 }}>
                            {plat.topFormats.map((fmt) => (
                              <Box key={fmt.format}>
                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                  <Typography variant="body2">{fmt.format}</Typography>
                                  <Chip
                                    label={`${fmt.score}/100`}
                                    size="small"
                                    sx={{
                                      bgcolor: fmt.score >= 70 ? '#f0fdf4' : fmt.score >= 40 ? '#fefce8' : '#fef2f2',
                                      color: fmt.score >= 70 ? '#16a34a' : fmt.score >= 40 ? '#ca8a04' : '#dc2626',
                                      fontWeight: 600,
                                    }}
                                  />
                                </Stack>
                                {fmt.kpis.length > 0 && (
                                  <Stack direction="row" spacing={1} sx={{ mt: 0.5, flexWrap: 'wrap' }}>
                                    {fmt.kpis.map((kpi) => (
                                      <Typography key={kpi.metric} variant="caption" color="text.secondary">
                                        {kpi.metric}: {typeof kpi.value === 'number' && kpi.value > 1000
                                          ? `${(kpi.value / 1000).toFixed(1)}k`
                                          : typeof kpi.value === 'number' && kpi.value < 1
                                          ? `${(kpi.value * 100).toFixed(1)}%`
                                          : kpi.value}
                                      </Typography>
                                    ))}
                                  </Stack>
                                )}
                              </Box>
                            ))}
                          </Stack>
                        )}

                        {plat.insights.length > 0 && (
                          <Box sx={{ borderTop: '1px solid', borderColor: 'divider', pt: 1 }}>
                            {plat.insights.map((insight, idx) => (
                              <Typography key={idx} variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                                {insight}
                              </Typography>
                            ))}
                          </Box>
                        )}
                      </DashboardCard>
                    );
                  })}
                </Stack>
              </>
            )}
            {/* Predictive Intelligence */}
            {metrics.predictiveTimes && metrics.predictiveTimes.length > 0 && (
              <>
                <Typography variant="h6" fontWeight={700} sx={{ mt: 1 }}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <IconClock size={22} />
                    <span>Inteligencia Preditiva — Melhores Horarios</span>
                  </Stack>
                </Typography>
                <DashboardCard>
                  <Stack spacing={1}>
                    {(() => {
                      const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
                      const maxEng = Math.max(...metrics.predictiveTimes.map((t) => t.avg_engagement), 1);
                      return metrics.predictiveTimes.slice(0, 10).map((slot, idx) => (
                        <Stack key={idx} direction="row" alignItems="center" spacing={1.5}>
                          <Chip
                            label={slot.platform}
                            size="small"
                            sx={{ minWidth: 80, bgcolor: '#eff6ff', color: '#2563eb', fontWeight: 600 }}
                          />
                          <Typography variant="body2" sx={{ minWidth: 80, fontWeight: 600 }}>
                            {dayNames[slot.day_of_week]} {String(slot.hour).padStart(2, '0')}:00
                          </Typography>
                          <Box sx={{ flex: 1, position: 'relative', height: 20 }}>
                            <LinearProgress
                              variant="determinate"
                              value={(slot.avg_engagement / maxEng) * 100}
                              sx={{
                                height: 20, borderRadius: 1, bgcolor: 'grey.100',
                                '& .MuiLinearProgress-bar': { bgcolor: '#10b981', borderRadius: 1 },
                              }}
                            />
                            <Typography
                              variant="caption"
                              fontWeight={600}
                              sx={{
                                position: 'absolute', top: '50%', left: 8,
                                transform: 'translateY(-50%)',
                                color: slot.avg_engagement > maxEng * 0.15 ? '#fff' : 'text.secondary',
                              }}
                            >
                              {slot.avg_engagement.toFixed(0)}
                            </Typography>
                          </Box>
                          <Typography variant="caption" color="text.secondary" sx={{ minWidth: 40 }}>
                            n={slot.sample_size}
                          </Typography>
                        </Stack>
                      ));
                    })()}
                  </Stack>
                </DashboardCard>
              </>
            )}

            {/* Learning Insights */}
            {metrics.learningInsights && metrics.learningInsights.length > 0 && (
              <>
                <Typography variant="h6" fontWeight={700} sx={{ mt: 1 }}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <IconBrain size={22} />
                    <span>Learning Loop — Preferencias Aprendidas</span>
                  </Stack>
                </Typography>
                {metrics.learningInsights.map((li) => (
                  <DashboardCard key={li.client_id}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="subtitle2" fontWeight={700}>
                          Score medio: {li.overall_avg_score}/5
                        </Typography>
                        <Chip label={`${li.total_scored_copies} copies avaliadas`} size="small" variant="outlined" />
                      </Stack>
                      <Typography variant="caption" color="text.secondary">
                        Atualizado: {new Date(li.rebuilt_at).toLocaleDateString('pt-BR')}
                      </Typography>
                    </Stack>

                    {li.boost.length > 0 && (
                      <Box sx={{ mb: 1.5 }}>
                        <Typography variant="caption" fontWeight={700} color="success.main" sx={{ mb: 0.5, display: 'block' }}>
                          PRIORIZAR
                        </Typography>
                        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                          {li.boost.map((b, idx) => (
                            <Chip key={idx} label={b} size="small" icon={<IconArrowUp size={14} />}
                              sx={{ bgcolor: '#f0fdf4', color: '#16a34a', fontWeight: 500, mb: 0.5 }} />
                          ))}
                        </Stack>
                      </Box>
                    )}

                    {li.avoid.length > 0 && (
                      <Box sx={{ mb: 1.5 }}>
                        <Typography variant="caption" fontWeight={700} color="error.main" sx={{ mb: 0.5, display: 'block' }}>
                          EVITAR
                        </Typography>
                        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                          {li.avoid.map((a, idx) => (
                            <Chip key={idx} label={a} size="small" icon={<IconArrowDown size={14} />}
                              sx={{ bgcolor: '#fef2f2', color: '#dc2626', fontWeight: 500, mb: 0.5 }} />
                          ))}
                        </Stack>
                      </Box>
                    )}

                    {li.preferred_formats.length > 0 && (
                      <Box>
                        <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                          FORMATOS PREFERIDOS
                        </Typography>
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                          {li.preferred_formats.map((f) => (
                            <Chip key={f.format} label={`${f.format} (${f.avg_score}/5)`} size="small"
                              sx={{ bgcolor: '#eff6ff', color: '#2563eb', fontWeight: 600 }} />
                          ))}
                        </Stack>
                      </Box>
                    )}
                  </DashboardCard>
                ))}
              </>
            )}
          </Stack>
        )}
      </Box>
    </AppShell>
  );
}
