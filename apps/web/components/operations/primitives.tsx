'use client';

import Link from 'next/link';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import Grid from '@mui/material/Grid';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Stepper from '@mui/material/Stepper';
import Typography from '@mui/material/Typography';
import type { Theme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';
import {
  IconArrowRight,
  IconBriefcase,
  IconCalendarEvent,
  IconCalendarTime,
  IconCircleCheckFilled,
  IconFlag,
  IconFocus2,
  IconLink,
  IconMessageCircle,
  IconCalendarDue,
  IconBrandWhatsapp,
  IconBulb,
  IconBrush,
  IconVideo,
  IconFileText,
  IconSparkles,
  IconUser,
} from '@tabler/icons-react';
import DashboardCard from '@/components/shared/DashboardCard';
import {
  formatSkillLabel,
  formatSourceLabel,
  formatDateTime,
  formatMinutes,
  getNextAction,
  getRisk,
  getStageIndex,
  PRIORITY_LABELS,
  STAGE_FLOW,
  STAGE_LABELS,
  type OperationsJob,
} from './model';

const OPS_ACCENT = '#E85219';

function opsTokens(theme: Theme) {
  const dark = theme.palette.mode === 'dark';
  const fg = theme.palette.text.primary;
  const neutral = dark ? theme.palette.common.white : theme.palette.common.black;
  const accent = theme.palette.primary.main || OPS_ACCENT;

  return {
    accent,
    accentText: dark ? theme.palette.primary.light : theme.palette.primary.main,
    accentSoftBg: alpha(accent, dark ? 0.12 : 0.08),
    accentSoftBorder: alpha(accent, dark ? 0.24 : 0.18),
    surfaceBorder: alpha(neutral, dark ? 0.08 : 0.12),
    surfaceSoftBg: dark ? alpha(theme.palette.common.white, 0.02) : alpha(theme.palette.common.black, 0.025),
    surfaceBg: dark ? alpha(theme.palette.common.white, 0.012) : alpha(theme.palette.background.paper, 0.88),
    hoverBg: dark ? alpha(theme.palette.common.white, 0.03) : alpha(theme.palette.common.black, 0.035),
    mutedText: alpha(fg, dark ? 0.58 : 0.72),
    summaryText: alpha(fg, dark ? 0.92 : 0.88),
    drawerBg: dark ? '#0b0b0d' : theme.palette.background.default,
  };
}

function priorityTone(theme: Theme, priorityBand?: string) {
  const dark = theme.palette.mode === 'dark';
  switch (priorityBand) {
    case 'p0':
      return {
        bg: alpha(theme.palette.error.main, dark ? 0.16 : 0.1),
        color: dark ? theme.palette.error.light : theme.palette.error.dark,
        border: alpha(theme.palette.error.main, dark ? 0.5 : 0.24),
      };
    case 'p1':
      return {
        bg: alpha(theme.palette.warning.main, dark ? 0.14 : 0.1),
        color: dark ? theme.palette.warning.light : theme.palette.warning.dark,
        border: alpha(theme.palette.warning.main, dark ? 0.44 : 0.24),
      };
    case 'p2':
      return {
        bg: alpha(theme.palette.success.main, dark ? 0.14 : 0.1),
        color: dark ? theme.palette.success.light : theme.palette.success.dark,
        border: alpha(theme.palette.success.main, dark ? 0.4 : 0.22),
      };
    case 'p3':
      return {
        bg: alpha(theme.palette.info.main, dark ? 0.14 : 0.1),
        color: dark ? theme.palette.info.light : theme.palette.info.dark,
        border: alpha(theme.palette.info.main, dark ? 0.4 : 0.22),
      };
    default:
      return {
        bg: alpha(theme.palette.text.primary, dark ? 0.07 : 0.05),
        color: alpha(theme.palette.text.primary, dark ? 0.82 : 0.76),
        border: alpha(theme.palette.text.primary, dark ? 0.16 : 0.12),
      };
  }
}

function riskTone(level: string) {
  switch (level) {
    case 'critical':
      return { color: 'error' as const, icon: <IconFlag size={14} /> };
    case 'high':
      return { color: 'warning' as const, icon: <IconSparkles size={14} /> };
    case 'medium':
      return { color: 'info' as const, icon: <IconFlag size={14} /> };
    default:
      return { color: 'success' as const, icon: <IconCircleCheckFilled size={14} /> };
  }
}

function sourceIcon(source?: string | null, jobType?: string | null) {
  const value = String(source || jobType || '').toLowerCase();
  if (value.includes('whatsapp')) return <IconBrandWhatsapp size={15} />;
  if (value.includes('meeting') || value.includes('reuni')) return <IconCalendarDue size={15} />;
  if (value.includes('brief')) return <IconFileText size={15} />;
  if (value.includes('video')) return <IconVideo size={15} />;
  if (value.includes('design') || value.includes('creative') || value.includes('studio')) return <IconBrush size={15} />;
  if (value.includes('campaign') || value.includes('intel') || value.includes('jarvis')) return <IconBulb size={15} />;
  return <IconMessageCircle size={15} />;
}

export function initials(name?: string | null) {
  return String(name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || '?';
}

export function ClientThumb({
  name,
  logoUrl,
  accent = '#E85219',
  size = 28,
}: {
  name?: string | null;
  logoUrl?: string | null;
  accent?: string;
  size?: number;
}) {
  return (
    <Avatar
      src={logoUrl || undefined}
      alt={name || 'Cliente'}
      sx={{
        width: size,
        height: size,
        borderRadius: 1.25,
        fontSize: '0.72rem',
        fontWeight: 900,
        bgcolor: alpha(accent, 0.16),
        color: accent,
        border: `1px solid ${alpha(accent, 0.28)}`,
      }}
    >
      {initials(name)}
    </Avatar>
  );
}

export function PersonThumb({
  name,
  accent = '#5D87FF',
  size = 28,
}: {
  name?: string | null;
  accent?: string;
  size?: number;
}) {
  return (
    <Avatar
      sx={{
        width: size,
        height: size,
        borderRadius: 1.25,
        fontSize: '0.72rem',
        fontWeight: 900,
        bgcolor: alpha(accent, 0.16),
        color: accent,
        border: `1px solid ${alpha(accent, 0.28)}`,
      }}
    >
      {initials(name)}
    </Avatar>
  );
}

export function SourceThumb({
  source,
  jobType,
  accent = '#E85219',
}: {
  source?: string | null;
  jobType?: string | null;
  accent?: string;
}) {
  return (
    <Box
      sx={{
        width: 28,
        height: 28,
        borderRadius: 1.25,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: alpha(accent, 0.12),
        color: accent,
        border: `1px solid ${alpha(accent, 0.24)}`,
      }}
    >
      {sourceIcon(source, jobType)}
    </Box>
  );
}

function clientAccent(job: Partial<OperationsJob>) {
  return job.client_brand_color || OPS_ACCENT;
}

export function PriorityPill({ priorityBand }: { priorityBand?: string | null }) {
  const label = PRIORITY_LABELS[priorityBand || 'p4'] || 'P4 Solto';

  return (
    <Chip
      label={label}
      size="small"
      sx={(theme) => {
        const tone = priorityTone(theme, priorityBand || 'p4');
        return {
          height: 22,
          bgcolor: tone.bg,
          color: tone.color,
          border: `1px solid ${tone.border}`,
          fontWeight: 800,
          borderRadius: 1,
        };
      }}
    />
  );
}

export function RiskFlag({ job }: { job: Partial<OperationsJob> }) {
  const risk = getRisk(job);
  const tone = riskTone(risk.level);

  return (
    <Chip
      size="small"
      icon={tone.icon}
      color={tone.color}
      label={risk.label}
      sx={{ height: 22, fontWeight: 700, borderRadius: 1 }}
    />
  );
}

export function OpsPanel({
  eyebrow,
  title,
  subtitle,
  action,
  children,
  sticky = false,
  sx,
}: {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  sticky?: boolean;
  sx?: any;
}) {
  return (
    <Box
      sx={(theme) => ({
        position: sticky ? 'sticky' : 'relative',
        top: sticky ? 112 : 'auto',
        p: { xs: 2, md: 2.1 },
        borderRadius: 1.25,
        border: `1px solid ${opsTokens(theme).surfaceBorder}`,
        bgcolor: opsTokens(theme).surfaceBg,
        ...sx,
      })}
    >
      {(eyebrow || title || subtitle || action) ? (
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} justifyContent="space-between" alignItems={{ md: 'flex-start' }} sx={{ mb: 2 }}>
          <Box>
            {eyebrow ? (
              <Typography variant="overline" sx={(theme) => ({ color: opsTokens(theme).accentText, letterSpacing: '0.14em' })}>
                {eyebrow}
              </Typography>
            ) : null}
            {title ? <Typography variant="h5" sx={{ fontWeight: 900, lineHeight: 1.05 }}>{title}</Typography> : null}
            {subtitle ? <Typography variant="body2" color="text.secondary">{subtitle}</Typography> : null}
          </Box>
          {action ? <Box>{action}</Box> : null}
        </Stack>
      ) : null}
      {children}
    </Box>
  );
}

export function OpsSection({
  eyebrow,
  title,
  subtitle,
  action,
  children,
}: {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Box sx={{ py: 0.25 }}>
      {(eyebrow || title || subtitle || action) ? (
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={1.25}
          justifyContent="space-between"
          alignItems={{ md: 'flex-end' }}
          sx={{ mb: 1.75 }}
        >
          <Box>
            {eyebrow ? (
              <Typography variant="overline" sx={(theme) => ({ color: opsTokens(theme).accentText, letterSpacing: '0.14em' })}>
                {eyebrow}
              </Typography>
            ) : null}
            {title ? (
              <Typography variant="h6" sx={{ fontWeight: 900, lineHeight: 1.05 }}>
                {title}
              </Typography>
            ) : null}
            {subtitle ? (
              <Typography variant="body2" color="text.secondary">
                {subtitle}
              </Typography>
            ) : null}
          </Box>
          {action ? <Box>{action}</Box> : null}
        </Stack>
      ) : null}
      {children}
    </Box>
  );
}

export function OpsToolbar({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Box
      sx={(theme) => ({
        px: { xs: 1.25, md: 1.5 },
        py: 1.35,
        border: `1px solid ${opsTokens(theme).surfaceBorder}`,
        borderRadius: 1.25,
        bgcolor: opsTokens(theme).surfaceBg,
      })}
    >
      {children}
    </Box>
  );
}

export function OpsSurface({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Box
      sx={(theme) => ({
        px: { xs: 1.25, md: 1.5 },
        py: { xs: 1.5, md: 1.75 },
        border: `1px solid ${opsTokens(theme).surfaceBorder}`,
        borderRadius: 1.25,
        bgcolor: opsTokens(theme).surfaceBg,
      })}
    >
      {children}
    </Box>
  );
}

export function OpsDivider() {
  return <Divider sx={(theme) => ({ borderColor: opsTokens(theme).surfaceBorder })} />;
}

export function OpsSummaryStat({
  value,
  label,
  tone = 'default',
}: {
  value: string | number;
  label: string;
  tone?: 'default' | 'warning' | 'error';
}) {
  return (
    <Stack direction="row" spacing={0.9} alignItems="baseline" sx={{ minWidth: 0 }}>
      <Typography variant="body2" sx={(theme) => ({
        fontWeight: 900,
        lineHeight: 1,
        color:
          tone === 'error'
            ? (theme.palette.mode === 'dark' ? theme.palette.error.light : theme.palette.error.dark)
            : tone === 'warning'
              ? (theme.palette.mode === 'dark' ? theme.palette.warning.light : theme.palette.warning.dark)
              : opsTokens(theme).summaryText,
      })}>
        {value}
      </Typography>
      <Typography variant="caption" sx={(theme) => ({ color: opsTokens(theme).mutedText, whiteSpace: 'nowrap' })}>
        {label}
      </Typography>
    </Stack>
  );
}

export function OpsJobRow({
  job,
  selected,
  onClick,
  showStage = false,
  timeValue,
}: {
  job: OperationsJob;
  selected?: boolean;
  onClick?: () => void;
  showStage?: boolean;
  timeValue?: string | null;
}) {
  const nextAction = getNextAction(job);
  const risk = getRisk(job);

  return (
    <Box
      onClick={onClick}
      sx={(theme) => ({
        px: 1,
        py: 1.15,
        mx: -1,
        cursor: onClick ? 'pointer' : 'default',
        borderRadius: 1,
        border: selected ? `1px solid ${alpha(opsTokens(theme).accent, 0.28)}` : '1px solid transparent',
        bgcolor: selected ? alpha(opsTokens(theme).accent, theme.palette.mode === 'dark' ? 0.08 : 0.06) : 'transparent',
        transition: 'background-color 140ms ease, border-color 140ms ease, transform 140ms ease',
        '&:hover': {
          bgcolor: onClick ? opsTokens(theme).hoverBg : 'transparent',
          transform: onClick ? 'translateX(2px)' : 'none',
        },
      })}
    >
      <Stack spacing={1}>
        <Stack direction="row" spacing={1.25} justifyContent="space-between" alignItems="flex-start">
          <Stack direction="row" spacing={1.25} sx={{ minWidth: 0, flex: 1 }}>
            <Avatar
              src={job.client_logo_url || undefined}
              alt={job.client_name || 'Cliente'}
              sx={{
                width: 34,
                height: 34,
                borderRadius: 1.5,
                fontSize: '0.72rem',
                fontWeight: 900,
                bgcolor: alpha(clientAccent(job), 0.18),
                color: clientAccent(job),
                border: `1px solid ${alpha(clientAccent(job), 0.34)}`,
                flexShrink: 0,
              }}
            >
              {initials(job.client_name)}
            </Avatar>
            <Stack spacing={0.5} sx={{ minWidth: 0, flex: 1 }}>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                <Chip
                  size="small"
                icon={sourceIcon(job.source, job.job_type)}
                label={formatSourceLabel(job.source)}
                variant="outlined"
                  sx={{ height: 22, borderRadius: 1 }}
              />
              {showStage ? <Chip size="small" variant="outlined" label={STAGE_LABELS[job.status] || job.status} /> : null}
              <PriorityPill priorityBand={job.priority_band} />
              <RiskFlag job={job} />
              {job.is_urgent ? <Chip size="small" color="error" label="Urgente" /> : null}
              </Stack>
              <Typography variant="body1" fontWeight={800} sx={{ lineHeight: 1.15 }}>
                {job.title}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                {job.client_name || 'Sem cliente'} · {job.owner_name || 'Sem responsável'} · {formatSkillLabel(job.required_skill)}
              </Typography>
            </Stack>
          </Stack>
          <Stack spacing={0.35} alignItems="flex-end" sx={{ flexShrink: 0 }}>
            <Typography variant="caption" color={risk.level === 'critical' ? 'error.main' : 'text.secondary'} sx={{ fontWeight: 800 }}>
              {formatDateTime(timeValue ?? job.deadline_at)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {formatMinutes(job.estimated_minutes)}
            </Typography>
          </Stack>
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
          <Typography variant="caption" color="text.secondary">
            Próximo passo: {nextAction.label}
          </Typography>
          <Chip size="small" icon={<IconFocus2 size={12} />} label={job.status === 'blocked' ? 'resolver' : 'ver'} variant="outlined" sx={{ height: 22 }} />
        </Stack>
      </Stack>
    </Box>
  );
}

export function OpsStageGroup({
  title,
  subtitle,
  count,
  children,
}: {
  title: string;
  subtitle: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <Box sx={(theme) => ({ pt: 1.5, borderTop: `1px solid ${opsTokens(theme).surfaceBorder}` })}>
      <Stack direction="row" spacing={1.5} justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1.25 }}>
        <Box>
          <Typography variant="body1" fontWeight={900}>{title}</Typography>
          <Typography variant="caption" color="text.secondary">{subtitle}</Typography>
        </Box>
        <Chip size="small" label={`${count}`} />
      </Stack>
      <Stack spacing={0.35}>{children}</Stack>
    </Box>
  );
}

export function StageRail({ status }: { status: string }) {
  const activeStep = getStageIndex(status);

  return (
    <Stepper activeStep={activeStep} alternativeLabel sx={{ '& .MuiStepLabel-label': { fontSize: '0.72rem', fontWeight: 700 } }}>
      {STAGE_FLOW.map((step) => (
        <Step key={step.key}>
          <StepLabel>{step.label}</StepLabel>
        </Step>
      ))}
    </Stepper>
  );
}

export function CapacityBar({
  allocableMinutes,
  committedMinutes,
  tentativeMinutes,
  title,
}: {
  allocableMinutes: number;
  committedMinutes: number;
  tentativeMinutes?: number;
  title?: string;
}) {
  const safeAllocable = Math.max(1, allocableMinutes);
  const committedPct = Math.min(100, Math.round((committedMinutes / safeAllocable) * 100));
  const tentativePct = Math.min(100, Math.round(((tentativeMinutes || 0) / safeAllocable) * 100));
  const freeMinutes = Math.max(0, safeAllocable - committedMinutes - (tentativeMinutes || 0));

  return (
    <Stack spacing={1}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography variant="body2" fontWeight={700}>{title || 'Capacidade da semana'}</Typography>
        <Typography variant="caption" color="text.secondary">
          {formatMinutes(committedMinutes)} confirmados · {formatMinutes(freeMinutes)} livres
        </Typography>
      </Stack>
      <Box sx={{ position: 'relative' }}>
        <LinearProgress
          variant="determinate"
          value={Math.min(100, committedPct + tentativePct)}
          sx={{
            height: 8,
            borderRadius: 999,
            bgcolor: (theme) => opsTokens(theme).surfaceSoftBg,
            '& .MuiLinearProgress-bar': {
              bgcolor: committedPct > 90 ? '#FA896B' : committedPct > 75 ? '#FFAE1F' : '#13DEB9',
              borderRadius: 999,
            },
          }}
        />
        {tentativePct > 0 && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: `${committedPct}%`,
              width: `${Math.min(100 - committedPct, tentativePct)}%`,
              height: 8,
              borderRadius: 999,
              bgcolor: (theme) => opsTokens(theme).accent,
              opacity: 0.55,
            }}
          />
        )}
      </Box>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        <Chip size="small" label={`Alocável ${formatMinutes(allocableMinutes)}`} />
        <Chip size="small" color="success" label={`Confirmado ${formatMinutes(committedMinutes)}`} />
        {tentativeMinutes ? <Chip size="small" color="warning" label={`Reservado ${formatMinutes(tentativeMinutes)}`} /> : null}
      </Stack>
    </Stack>
  );
}

export function BlockReason({ reason, onResolve }: { reason?: string | null; onResolve?: () => void }) {
  return (
    <Alert
      severity="error"
      action={onResolve ? <Button color="inherit" size="small" onClick={onResolve}>Resolver</Button> : null}
      sx={{ borderRadius: 1.5 }}
    >
      <Typography variant="body2" fontWeight={700}>Bloqueio operacional</Typography>
      <Typography variant="caption" sx={{ display: 'block', mt: 0.25 }}>
        {reason || 'Este item está travado e precisa de decisão antes de avançar.'}
      </Typography>
    </Alert>
  );
}

export function EntityLinkCard({
  label,
  value,
  href,
  subtitle,
  thumbnail,
  accent,
}: {
  label: string;
  value: string;
  href?: string;
  subtitle?: string;
  thumbnail?: React.ReactNode;
  accent?: string;
}) {
  const isLink = Boolean(href);
  return (
    <Box
      component={href ? Link : 'div'}
      href={href}
      sx={(theme) => ({
        display: 'block',
        px: 0.15,
        py: 1,
        textDecoration: 'none',
        color: 'inherit',
        borderTop: `1px solid ${opsTokens(theme).surfaceBorder}`,
        transition: 'background-color 140ms ease, transform 140ms ease',
        '&:hover': isLink
          ? {
              bgcolor: opsTokens(theme).hoverBg,
              transform: 'translateX(2px)',
            }
          : undefined,
      })}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
        <Stack direction="row" spacing={1.25} alignItems="center" sx={{ minWidth: 0 }}>
          {thumbnail ? (
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: 1.25,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: alpha(accent || OPS_ACCENT, 0.14),
                color: accent || OPS_ACCENT,
                border: `1px solid ${alpha(accent || OPS_ACCENT, 0.26)}`,
                overflow: 'hidden',
                flexShrink: 0,
              }}
            >
              {thumbnail}
            </Box>
          ) : null}
          <Stack spacing={0.5} sx={{ minWidth: 0 }}>
            <Typography variant="caption" color="text.secondary">{label}</Typography>
            <Typography variant="body2" fontWeight={700} noWrap>{value}</Typography>
            {subtitle ? <Typography variant="caption" color="text.secondary">{subtitle}</Typography> : null}
          </Stack>
        </Stack>
        {href ? (
          <Button component="span" size="small" variant="text" endIcon={<IconLink size={14} />} sx={{ minWidth: 0, px: 0.5 }}>
            Abrir
          </Button>
        ) : null}
      </Stack>
    </Box>
  );
}

function ContextMetaRow({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <Stack direction="row" spacing={1.1} alignItems="center">
      <Box
        sx={{
          width: 28,
          height: 28,
          borderRadius: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: alpha(accent || OPS_ACCENT, 0.10),
          color: accent || OPS_ACCENT,
          flexShrink: 0,
        }}
      >
        {icon}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.1 }}>
          {label}
        </Typography>
        <Typography variant="body2" fontWeight={800} noWrap>
          {value}
        </Typography>
      </Box>
    </Stack>
  );
}

export function NextActionBar({
  job,
  onPrimaryAction,
  primaryLabel,
}: {
  job: Partial<OperationsJob>;
  onPrimaryAction?: () => void;
  primaryLabel?: string;
}) {
  const nextAction = getNextAction(job);

  return (
    <Box
      sx={{
        px: 1,
        py: 1.15,
        borderLeft: '2px solid',
        borderColor: (theme) => alpha(opsTokens(theme).accent, 0.72),
      }}
    >
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }} justifyContent="space-between">
        <Stack spacing={0.5}>
          <Typography variant="caption" color="text.secondary">Próximo passo</Typography>
          <Typography variant="body1" fontWeight={800}>{primaryLabel || nextAction.label}</Typography>
          <Typography variant="caption" color="text.secondary">
            {job.owner_name ? `Responsável atual: ${job.owner_name}` : 'Ainda sem responsável definido'} · {job.deadline_at ? formatDateTime(job.deadline_at) : 'Sem prazo definido'}
          </Typography>
        </Stack>
        {onPrimaryAction ? (
          <Button variant={nextAction.intent === 'default' ? 'outlined' : 'contained'} color={nextAction.intent === 'default' ? 'inherit' : nextAction.intent} onClick={onPrimaryAction} endIcon={<IconArrowRight size={16} />}>
            {primaryLabel || nextAction.label}
          </Button>
        ) : null}
      </Stack>
    </Box>
  );
}

export function GuidedFormSection({
  title,
  subtitle,
  completed,
  children,
}: {
  title: string;
  subtitle?: string;
  completed?: boolean;
  children: React.ReactNode;
}) {
  return (
    <DashboardCard
      sx={{
        borderRadius: 2,
        borderColor: completed ? alpha('#13DEB9', 0.35) : undefined,
        bgcolor: completed ? alpha('#13DEB9', 0.04) : undefined,
      }}
      headerSx={{ pb: 1 }}
      title={title}
      subtitle={subtitle}
      action={completed ? <Chip size="small" color="success" label="Completo" /> : <Chip size="small" color="warning" label="Pendente" />}
    >
      {children}
    </DashboardCard>
  );
}

export function ContextDrawer({
  open,
  title,
  subtitle,
  onClose,
  actions,
  children,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: '100%', md: 620 },
          p: 0,
          bgcolor: (theme) => opsTokens(theme).drawerBg,
          borderLeft: '1px solid',
          borderColor: 'divider',
        },
      }}
    >
      <Stack sx={{ height: '100%' }}>
        <Box sx={(theme) => ({ p: 3, pb: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: opsTokens(theme).surfaceSoftBg })}>
          <Stack direction="row" spacing={2} justifyContent="space-between" alignItems="flex-start">
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="overline" color="text.secondary">Contexto operacional</Typography>
              <Typography variant="h5" fontWeight={800}>{title}</Typography>
              {subtitle ? <Typography variant="body2" color="text.secondary">{subtitle}</Typography> : null}
            </Box>
            <Button variant="outlined" size="small" onClick={onClose}>Fechar</Button>
          </Stack>
          {actions ? <Box sx={{ mt: 2 }}>{actions}</Box> : null}
        </Box>
        <Box sx={{ flex: 1, overflowY: 'auto', p: 3 }}>
          {children}
        </Box>
      </Stack>
    </Drawer>
  );
}

export function OperationCard({
  job,
  onClick,
  primaryAction,
}: {
  job: OperationsJob;
  onClick?: () => void;
  primaryAction?: React.ReactNode;
}) {
  const risk = getRisk(job);
  const nextAction = getNextAction(job);

  return (
    <Box
      onClick={onClick}
      sx={{
        cursor: onClick ? 'pointer' : 'default',
        borderTop: (theme) => `1px solid ${opsTokens(theme).surfaceBorder}`,
        py: 1.5,
        transition: 'background-color 140ms ease, transform 140ms ease',
        '&:hover': {
          bgcolor: onClick ? (theme) => opsTokens(theme).hoverBg : 'transparent',
          transform: onClick ? 'translateX(2px)' : 'none',
        },
      }}
    >
      <Stack spacing={1.5}>
        <Stack direction="row" spacing={1} justifyContent="space-between" alignItems="flex-start">
          <Stack spacing={1} sx={{ minWidth: 0 }}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <PriorityPill priorityBand={job.priority_band} />
              <RiskFlag job={job} />
              <Chip size="small" variant="outlined" label={STAGE_LABELS[job.status] || job.status} />
            </Stack>
            <Box>
              <Typography variant="h6" fontWeight={800} sx={{ lineHeight: 1.2 }}>
                {job.title}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {job.client_name || 'Sem cliente'} · {job.owner_name || 'Sem responsável'} · {formatSkillLabel(job.required_skill)}
              </Typography>
            </Box>
          </Stack>
          {primaryAction}
        </Stack>

        {job.summary ? (
          <Typography variant="body2" color="text.secondary" sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {job.summary}
          </Typography>
        ) : null}

        <Grid container spacing={1.25}>
          <Grid size={{ xs: 6, md: 3 }}>
            <Typography variant="caption" color="text.secondary">Prazo</Typography>
            <Typography variant="body2" fontWeight={700}>{formatDateTime(job.deadline_at)}</Typography>
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <Typography variant="caption" color="text.secondary">Estimativa</Typography>
            <Typography variant="body2" fontWeight={700}>{formatMinutes(job.estimated_minutes)}</Typography>
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <Typography variant="caption" color="text.secondary">Origem</Typography>
            <Typography variant="body2" fontWeight={700}>{formatSourceLabel(job.source)}</Typography>
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <Typography variant="caption" color="text.secondary">Próximo passo</Typography>
            <Typography variant="body2" fontWeight={700}>{nextAction.label}</Typography>
          </Grid>
        </Grid>

        <Box sx={{ pt: 0.5 }}>
          <StageRail status={job.status} />
        </Box>
      </Stack>
    </Box>
  );
}

export function OperationDetailDialog({
  open,
  title,
  body,
  onClose,
  onConfirm,
  confirmLabel,
}: {
  open: boolean;
  title: string;
  body: React.ReactNode;
  onClose: () => void;
  onConfirm?: () => void;
  confirmLabel?: string;
}) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>{body}</DialogContent>
      <DialogActions>
        <Button variant="outlined" onClick={onClose}>Cancelar</Button>
        {onConfirm ? <Button variant="contained" onClick={onConfirm}>{confirmLabel || 'Confirmar'}</Button> : null}
      </DialogActions>
    </Dialog>
  );
}

export function AttentionStrip({
  title,
  subtitle,
  actionLabel,
  onAction,
}: {
  title: string;
  subtitle: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <Box
      sx={(theme) => ({
        p: 1.5,
        borderRadius: 1.5,
        bgcolor: opsTokens(theme).accentSoftBg,
        border: `1px solid ${opsTokens(theme).accentSoftBorder}`,
      })}
    >
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ md: 'center' }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box sx={(theme) => ({ width: 38, height: 38, borderRadius: 1.5, bgcolor: opsTokens(theme).accent, color: theme.palette.getContrastText(opsTokens(theme).accent), display: 'flex', alignItems: 'center', justifyContent: 'center' })}>
            <IconBriefcase size={18} />
          </Box>
          <Box>
            <Typography variant="body1" fontWeight={800}>{title}</Typography>
            <Typography variant="body2" color="text.secondary">{subtitle}</Typography>
          </Box>
        </Stack>
        {onAction && actionLabel ? <Button variant="contained" onClick={onAction}>{actionLabel}</Button> : null}
      </Stack>
    </Box>
  );
}

export function EmptyOperationState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <Card
      variant="outlined"
      sx={(theme) => ({
        borderRadius: 1.25,
        borderStyle: 'dashed',
        borderColor: alpha(opsTokens(theme).accent, 0.25),
        bgcolor: alpha(opsTokens(theme).accent, theme.palette.mode === 'dark' ? 0.012 : 0.04),
        p: 2.25,
      })}
    >
      <Stack spacing={2} alignItems="center" textAlign="center">
        <Box sx={(theme) => ({ width: 56, height: 56, borderRadius: 1.5, bgcolor: alpha(opsTokens(theme).accent, 0.10), color: opsTokens(theme).accent, display: 'flex', alignItems: 'center', justifyContent: 'center' })}>
          <IconCalendarEvent size={24} />
        </Box>
        <Box>
          <Typography variant="h6" fontWeight={800}>{title}</Typography>
          <Typography variant="body2" color="text.secondary">{description}</Typography>
        </Box>
        {onAction && actionLabel ? <Button variant="outlined" onClick={onAction}>{actionLabel}</Button> : null}
      </Stack>
    </Card>
  );
}

export function JobFocusRail({
  job,
  title = 'Demanda em foco',
  subtitle = 'O detalhe fica fixo à direita, sem forçar troca de tela.',
  primaryLabel,
  onPrimaryAction,
  emptyTitle = 'Selecione uma demanda',
  emptyDescription = 'Clique em uma demanda para ver o contexto completo.',
  links,
  footer,
  sections = [],
  eyebrow = 'Contexto e ação',
}: {
  job: OperationsJob | null;
  title?: string;
  subtitle?: string;
  primaryLabel?: string;
  onPrimaryAction?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  links?: React.ReactNode;
  footer?: React.ReactNode;
  sections?: Array<{ title?: string; action?: React.ReactNode; content: React.ReactNode }>;
  eyebrow?: string;
}) {
  return (
    <OperationsContextRail
      job={job}
      title={title}
      subtitle={subtitle}
      primaryLabel={primaryLabel}
      onPrimaryAction={onPrimaryAction}
      emptyTitle={emptyTitle}
      emptyDescription={emptyDescription}
      links={links}
      sections={[...(sections || []), ...(footer ? [{ content: footer }] : [])]}
      eyebrow={eyebrow}
    />
  );
}

export function OperationsContextRail({
  job,
  title = 'Demanda em foco',
  subtitle = 'O detalhe fica fixo à direita, sem forçar troca de tela.',
  primaryLabel,
  onPrimaryAction,
  emptyTitle = 'Selecione uma demanda',
  emptyDescription = 'Clique em uma demanda para ver o contexto completo.',
  links,
  sections = [],
  eyebrow = 'Contexto e ação',
  lead,
}: {
  job: OperationsJob | null;
  title?: string;
  subtitle?: string;
  primaryLabel?: string;
  onPrimaryAction?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  links?: React.ReactNode;
  sections?: Array<{ title?: string; action?: React.ReactNode; content: React.ReactNode }>;
  eyebrow?: string;
  lead?: React.ReactNode;
}) {
  return (
    <Box
      sx={(theme) => ({
        position: 'sticky',
        top: 104,
        pl: { xs: 0, md: 2.25 },
        borderLeft: { xs: 'none', md: `1px solid ${opsTokens(theme).surfaceBorder}` },
      })}
    >
      <Stack spacing={2}>
        <Box>
          <Typography variant="overline" sx={(theme) => ({ color: opsTokens(theme).accentText, letterSpacing: '0.14em' })}>
            {eyebrow}
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 900, lineHeight: 1.05 }}>
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {subtitle}
          </Typography>
        </Box>

        {lead ? (
          <>
            {lead}
            <OpsDivider />
          </>
        ) : null}

        {job ? (
          <Stack spacing={2}>
            <Box
              sx={{
                pb: 1.5,
                borderBottom: (theme) => `1px solid ${opsTokens(theme).surfaceBorder}`,
              }}
            >
              <Stack direction="row" spacing={1.15} alignItems="center" sx={{ minWidth: 0 }}>
                <ClientThumb
                  name={job.client_name}
                  logoUrl={job.client_logo_url}
                  accent={job.client_brand_color || OPS_ACCENT}
                  size={34}
                />
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.15 }}>
                    {job.client_name || 'Sem cliente'}
                  </Typography>
                  <Typography variant="body1" fontWeight={900} sx={{ lineHeight: 1.1 }}>
                    {job.title}
                  </Typography>
                </Box>
              </Stack>

              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1.1 }}>
                <PriorityPill priorityBand={job.priority_band} />
                <RiskFlag job={job} />
                <Chip size="small" variant="outlined" label={STAGE_LABELS[job.status] || job.status} sx={{ borderRadius: 1 }} />
              </Stack>

              <Typography variant="body2" color="text.secondary" sx={{ mt: 1.1 }}>
                {job.summary || 'Esta demanda ainda precisa de um resumo curto para orientar a equipe.'}
              </Typography>
            </Box>

            <Grid container spacing={1.25}>
              <Grid size={{ xs: 12, md: 6 }}>
                <ContextMetaRow
                  icon={<IconUser size={15} />}
                  label="Responsável"
                  value={job.owner_name || 'Sem responsável'}
                  accent="#5D87FF"
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <ContextMetaRow
                  icon={<IconCalendarTime size={15} />}
                  label="Prazo"
                  value={formatDateTime(job.deadline_at)}
                  accent="#13DEB9"
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <ContextMetaRow
                  icon={sourceIcon(job.source, job.job_type)}
                  label="Origem"
                  value={formatSourceLabel(job.source)}
                  accent={OPS_ACCENT}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <ContextMetaRow
                  icon={<IconBriefcase size={15} />}
                  label="Especialidade"
                  value={formatSkillLabel(job.required_skill)}
                  accent="#FFAE1F"
                />
              </Grid>
            </Grid>

            <StageRail status={job.status} />

            <NextActionBar job={job} primaryLabel={primaryLabel} onPrimaryAction={onPrimaryAction} />

            {job.status === 'blocked' ? (
              <BlockReason reason={job.summary || 'Esta demanda está bloqueada e precisa de decisão para continuar.'} />
            ) : null}

            {links ? (
              <Box sx={(theme) => ({ pt: 0.25, borderTop: `1px solid ${opsTokens(theme).surfaceBorder}` })}>
                {links}
              </Box>
            ) : null}
          </Stack>
        ) : (
          <Box sx={{ py: 0.75 }}>
            <Typography variant="body1" fontWeight={900}>
              {emptyTitle}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {emptyDescription}
            </Typography>
          </Box>
        )}

        {sections.map((section, index) => (
          <Box key={index}>
            <OpsDivider />
            <Box sx={{ pt: 1.75 }}>
              {section.title || section.action ? (
                <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1.5} sx={{ mb: 1 }}>
                  {section.title ? (
                    <Typography variant="body2" fontWeight={900}>
                      {section.title}
                    </Typography>
                  ) : <Box />}
                  {section.action ? section.action : null}
                </Stack>
              ) : null}
              {section.content}
            </Box>
          </Box>
        ))}
      </Stack>
    </Box>
  );
}
