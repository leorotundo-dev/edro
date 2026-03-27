'use client';


import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Drawer from '@mui/material/Drawer';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import {
  IconBrandWhatsapp,
  IconBuildingBank,
  IconCalendar,
  IconChartBar,
  IconCheck,
  IconClock,
  IconCurrencyDollar,
  IconEdit,
  IconExternalLink,
  IconId,
  IconMail,
  IconPhone,
  IconPlus,
  IconSearch,
  IconUserCheck,
  IconUsers,
  IconX,
} from '@tabler/icons-react';
import Collapse from '@mui/material/Collapse';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import { alpha } from '@mui/material/styles';
import { apiGet, apiPatch, apiPost } from '@/lib/api';

type FreelancerProfile = {
  id: string;
  user_id: string;
  email: string;
  display_name: string;
  specialty: string | null;
  hourly_rate_brl: string | null;
  pix_key: string | null;
  is_active: boolean;
  phone: string | null;
  whatsapp_jid: string | null;
  department: string | null;
  role_title: string | null;
  email_personal: string | null;
  notes: string | null;
  cpf: string | null;
  rg: string | null;
  birth_date: string | null;
  bank_name: string | null;
  bank_agency: string | null;
  bank_account: string | null;
  skills: string[] | null;
  available_days: string[] | null;
  available_hours_start: string | null;
  available_hours_end: string | null;
  weekly_capacity_hours: number | null;
  contract_type: string | null;
  tools: string[] | null;
  ai_tools: string[] | null;
  experience_level: 'junior' | 'mid' | 'senior' | null;
  max_concurrent_jobs: number | null;
  portfolio_url: string | null;
  platform_expertise: string[] | null;
  languages: string[] | null;
  punctuality_score: number | null;
  approval_rate: number | null;
  jobs_completed: number | null;
  unavailable_until: string | null;
  active_timers?: { briefing_id: string; briefing_title?: string; started_at: string }[];
};

type TenantUser = {
  id: string;
  email: string;
  name: string | null;
  role: string;
};

type InternalPerson = {
  id: string;
  display_name: string;
  is_internal: boolean;
  avatar_url: string | null;
  notes: string | null;
  identities: { type: string; value: string; primary: boolean }[] | null;
};

function initials(name: string) {
  return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

function formatHours(mins: number) {
  if (!mins) return '0h';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

function TimerDot({ startedAt }: { startedAt: string }) {
  const [secs, setSecs] = useState(
    Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000),
  );
  useEffect(() => {
    const t = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const pad = (n: number) => String(n).padStart(2, '0');
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  const display = h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
  return (
    <Stack direction="row" alignItems="center" spacing={0.5}>
      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'success.main', animation: 'pulse 1.4s infinite' }} />
      <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'success.main' }}>{display}</Typography>
    </Stack>
  );
}

// ---------------------------------------------------------------------------
// Contatos tab — contact directory for freelancers
// ---------------------------------------------------------------------------

type ContactForm = {
  phone: string;
  whatsapp_jid: string;
  department: string;
  role_title: string;
  email_personal: string;
  notes: string;
  cpf: string;
  rg: string;
  birth_date: string;
  pix_key: string;
  bank_name: string;
  bank_agency: string;
  bank_account: string;
  skills: string[];
  available_days: string[];
  available_hours_start: string;
  available_hours_end: string;
  weekly_capacity_hours: string;
  contract_type: string;
  tools: string[];
  ai_tools: string[];
  experience_level: string;
  max_concurrent_jobs: string;
  portfolio_url: string;
  platform_expertise: string[];
  languages: string[];
  unavailable_until: string;
};

const EMPTY_CONTACT_FORM: ContactForm = {
  phone: '',
  whatsapp_jid: '',
  department: '',
  role_title: '',
  email_personal: '',
  notes: '',
  cpf: '',
  rg: '',
  birth_date: '',
  pix_key: '',
  bank_name: '',
  bank_agency: '',
  bank_account: '',
  skills: [],
  available_days: [],
  available_hours_start: '',
  available_hours_end: '',
  weekly_capacity_hours: '',
  contract_type: '',
  tools: [],
  ai_tools: [],
  experience_level: '',
  max_concurrent_jobs: '',
  portfolio_url: '',
  platform_expertise: [],
  languages: [],
  unavailable_until: '',
};

const AVATAR_COLORS = [
  '#E85219', '#4570EA', '#13DEB9', '#7c3aed',
  '#f59e0b', '#10b981', '#3b82f6', '#ec4899',
  '#8b5cf6', '#ef4444',
];

function avatarColor(name: string): string {
  const code = (name?.charCodeAt(0) ?? 0) + (name?.charCodeAt(1) ?? 0);
  return AVATAR_COLORS[code % AVATAR_COLORS.length];
}

function FreelancerContacts({
  freelancers,
  loading,
  onUpdated,
}: {
  freelancers: FreelancerProfile[];
  loading: boolean;
  onUpdated: () => Promise<void>;
}) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ContactForm>(EMPTY_CONTACT_FORM);
  const [saving, setSaving] = useState(false);

  const filtered = freelancers.filter((fl) => {
    if (!search.trim()) return fl.is_active;
    const q = search.toLowerCase();
    return (
      fl.display_name.toLowerCase().includes(q) ||
      fl.email?.toLowerCase().includes(q) ||
      fl.specialty?.toLowerCase().includes(q) ||
      fl.phone?.toLowerCase().includes(q) ||
      fl.department?.toLowerCase().includes(q) ||
      fl.role_title?.toLowerCase().includes(q) ||
      fl.whatsapp_jid?.toLowerCase().includes(q)
    );
  });

  const openEdit = (fl: FreelancerProfile) => {
    setEditingId(fl.id);
    setForm({
      phone: fl.phone ?? '',
      whatsapp_jid: fl.whatsapp_jid ?? '',
      department: fl.department ?? '',
      role_title: fl.role_title ?? '',
      email_personal: fl.email_personal ?? '',
      notes: fl.notes ?? '',
      cpf: fl.cpf ?? '',
      rg: fl.rg ?? '',
      birth_date: fl.birth_date ? fl.birth_date.slice(0, 10) : '',
      pix_key: fl.pix_key ?? '',
      bank_name: fl.bank_name ?? '',
      bank_agency: fl.bank_agency ?? '',
      bank_account: fl.bank_account ?? '',
      skills: fl.skills ?? [],
      available_days: fl.available_days ?? [],
      available_hours_start: fl.available_hours_start ?? '',
      available_hours_end: fl.available_hours_end ?? '',
      weekly_capacity_hours: fl.weekly_capacity_hours != null ? String(fl.weekly_capacity_hours) : '',
      contract_type: fl.contract_type ?? '',
      tools: fl.tools ?? [],
      ai_tools: fl.ai_tools ?? [],
      experience_level: fl.experience_level ?? '',
      max_concurrent_jobs: fl.max_concurrent_jobs != null ? String(fl.max_concurrent_jobs) : '',
      portfolio_url: fl.portfolio_url ?? '',
      platform_expertise: fl.platform_expertise ?? [],
      languages: fl.languages ?? [],
      unavailable_until: fl.unavailable_until ? fl.unavailable_until.slice(0, 10) : '',
    });
  };

  const handleSave = async () => {
    if (!editingId) return;
    setSaving(true);
    try {
      await apiPatch(`/freelancers/${editingId}`, {
        phone: form.phone.trim() || null,
        whatsapp_jid: form.whatsapp_jid.trim() || null,
        department: form.department.trim() || null,
        role_title: form.role_title.trim() || null,
        email_personal: form.email_personal.trim() || null,
        notes: form.notes.trim() || null,
        cpf: form.cpf.trim() || null,
        rg: form.rg.trim() || null,
        birth_date: form.birth_date.trim() || null,
        pix_key: form.pix_key.trim() || null,
        bank_name: form.bank_name.trim() || null,
        bank_agency: form.bank_agency.trim() || null,
        bank_account: form.bank_account.trim() || null,
        skills: form.skills.length > 0 ? form.skills : null,
        available_days: form.available_days.length > 0 ? form.available_days : null,
        available_hours_start: form.available_hours_start.trim() || null,
        available_hours_end: form.available_hours_end.trim() || null,
        weekly_capacity_hours: form.weekly_capacity_hours ? Number(form.weekly_capacity_hours) : null,
        contract_type: form.contract_type.trim() || null,
        tools: form.tools.length > 0 ? form.tools : null,
        ai_tools: form.ai_tools.length > 0 ? form.ai_tools : null,
        experience_level: form.experience_level.trim() || null,
        max_concurrent_jobs: form.max_concurrent_jobs ? Number(form.max_concurrent_jobs) : null,
        portfolio_url: form.portfolio_url.trim() || null,
        platform_expertise: form.platform_expertise.length > 0 ? form.platform_expertise : null,
        languages: form.languages.length > 0 ? form.languages : null,
        unavailable_until: form.unavailable_until.trim() || null,
      });
      setEditingId(null);
      await onUpdated();
    } catch { /* silent */ }
    finally { setSaving(false); }
  };

  const set = (patch: Partial<ContactForm>) => setForm((f) => ({ ...f, ...patch }));

  if (loading) {
    return <Stack alignItems="center" py={6}><CircularProgress /></Stack>;
  }

  return (
    <Stack spacing={2}>
      {/* Search */}
      <TextField
        size="small"
        placeholder="Buscar por nome, email, especialidade, departamento..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <IconSearch size={16} />
              </InputAdornment>
            ),
          },
        }}
        sx={{ maxWidth: 420 }}
      />

      {filtered.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
          {search ? 'Nenhum resultado encontrado.' : 'Nenhum freelancer ativo.'}
        </Typography>
      )}

      {/* Contact cards grid */}
      <Grid container spacing={2}>
        {filtered.map((fl) => {
          const color = avatarColor(fl.display_name);
          const isEditing = editingId === fl.id;
          const hasContact = fl.phone || fl.whatsapp_jid || fl.email_personal;
          const hasFinancial = fl.cpf || fl.pix_key || fl.bank_name;

          return (
            <Grid key={fl.id} size={{ xs: 12, sm: 6, md: 4 }}>
              <Card
                variant="outlined"
                sx={{
                  borderRadius: 2,
                  borderColor: isEditing ? 'rgba(232,82,25,0.4)' : 'divider',
                  transition: 'border-color 0.2s',
                }}
              >
                <CardContent sx={{ p: '14px !important' }}>
                  {/* Header */}
                  <Stack direction="row" spacing={1.5} alignItems="flex-start">
                    <Avatar
                      sx={{
                        bgcolor: color,
                        width: 42,
                        height: 42,
                        fontSize: '0.95rem',
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {initials(fl.display_name)}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="subtitle2" fontWeight={700} noWrap>
                        {fl.display_name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" noWrap>
                        {[fl.role_title, fl.department].filter(Boolean).join(' · ') || fl.specialty || fl.email}
                      </Typography>
                      {fl.specialty && (fl.role_title || fl.department) && (
                        <Chip
                          label={fl.specialty}
                          size="small"
                          sx={{ mt: 0.5, height: 18, fontSize: '0.65rem', bgcolor: 'action.hover' }}
                        />
                      )}
                    </Box>
                    <Tooltip title="Ver perfil">
                      <IconButton
                        size="small"
                        onClick={() => router.push(`/admin/equipe/${fl.id}`)}
                        sx={{ color: 'text.disabled', '&:hover': { color: '#4570EA' } }}
                      >
                        <IconExternalLink size={15} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Editar contato">
                      <IconButton
                        size="small"
                        onClick={() => isEditing ? setEditingId(null) : openEdit(fl)}
                        sx={{ color: isEditing ? '#E85219' : 'text.disabled', '&:hover': { color: '#E85219' } }}
                      >
                        {isEditing ? <IconX size={15} /> : <IconEdit size={15} />}
                      </IconButton>
                    </Tooltip>
                  </Stack>

                  {/* Contact chips */}
                  {hasContact && (
                    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 1.25 }}>
                      {fl.email_personal && (
                        <Chip
                          size="small"
                          icon={<IconMail size={11} />}
                          label={fl.email_personal}
                          variant="outlined"
                          sx={{ fontSize: '0.68rem', height: 20 }}
                        />
                      )}
                      {fl.phone && (
                        <Chip
                          size="small"
                          icon={<IconPhone size={11} />}
                          label={fl.phone}
                          variant="outlined"
                          sx={{ fontSize: '0.68rem', height: 20 }}
                        />
                      )}
                      {fl.whatsapp_jid && (
                        <Chip
                          size="small"
                          icon={<IconBrandWhatsapp size={11} />}
                          label={fl.whatsapp_jid.replace('@s.whatsapp.net', '')}
                          variant="outlined"
                          sx={{
                            fontSize: '0.68rem',
                            height: 20,
                            bgcolor: 'rgba(37,211,102,0.08)',
                            color: '#22a84d',
                            borderColor: 'rgba(37,211,102,0.3)',
                          }}
                        />
                      )}
                    </Stack>
                  )}
                  {!hasContact && !hasFinancial && !isEditing && (
                    <Typography variant="caption" color="text.disabled" sx={{ mt: 1, display: 'block', fontStyle: 'italic' }}>
                      Sem dados cadastrais — clique no lápis para adicionar
                    </Typography>
                  )}

                  {/* Personal / financial info */}
                  {hasFinancial && !isEditing && (
                    <Box sx={{ mt: 1.25 }}>
                      <Divider sx={{ mb: 0.75 }} />
                      <Stack spacing={0.25}>
                        {(fl.cpf || fl.rg || fl.birth_date) && (
                          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                            {fl.cpf && (
                              <Chip size="small" icon={<IconId size={11} />} label={`CPF ${fl.cpf}`} variant="outlined" sx={{ fontSize: '0.68rem', height: 20 }} />
                            )}
                            {fl.rg && (
                              <Chip size="small" icon={<IconId size={11} />} label={`RG ${fl.rg}`} variant="outlined" sx={{ fontSize: '0.68rem', height: 20 }} />
                            )}
                            {fl.birth_date && (
                              <Chip size="small" icon={<IconCalendar size={11} />} label={new Date(fl.birth_date).toLocaleDateString('pt-BR')} variant="outlined" sx={{ fontSize: '0.68rem', height: 20 }} />
                            )}
                          </Stack>
                        )}
                        {(fl.pix_key || fl.bank_name) && (
                          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
                            {fl.pix_key && (
                              <Chip size="small" icon={<IconCurrencyDollar size={11} />} label={`Pix: ${fl.pix_key}`} variant="outlined"
                                sx={{ fontSize: '0.68rem', height: 20, bgcolor: 'rgba(16,185,129,0.08)', borderColor: 'rgba(16,185,129,0.3)', color: '#059669' }} />
                            )}
                            {fl.bank_name && (
                              <Chip size="small" icon={<IconBuildingBank size={11} />}
                                label={[fl.bank_name, fl.bank_agency ? `Ag ${fl.bank_agency}` : '', fl.bank_account ? `Cc ${fl.bank_account}` : ''].filter(Boolean).join(' · ')}
                                variant="outlined" sx={{ fontSize: '0.68rem', height: 20 }} />
                            )}
                          </Stack>
                        )}
                      </Stack>
                    </Box>
                  )}

                  {fl.notes && !isEditing && (
                    <Typography
                      variant="caption"
                      color="text.disabled"
                      sx={{ mt: 0.75, display: 'block', fontStyle: 'italic', lineHeight: 1.4 }}
                    >
                      {fl.notes}
                    </Typography>
                  )}

                  {/* Scores + creative capacity badges */}
                  {!isEditing && (fl.punctuality_score != null || fl.approval_rate != null || fl.experience_level || (fl.skills?.length ?? 0) > 0) && (
                    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                      {fl.experience_level && (
                        <Chip size="small" label={{ junior: 'Jr', mid: 'Pl', senior: 'Sr' }[fl.experience_level] ?? fl.experience_level}
                          sx={{ height: 18, fontSize: '0.62rem', fontWeight: 700,
                            bgcolor: fl.experience_level === 'senior' ? 'rgba(69,112,234,0.12)' : fl.experience_level === 'mid' ? 'rgba(245,158,11,0.12)' : 'rgba(156,163,175,0.15)',
                            color: fl.experience_level === 'senior' ? '#3b5cc6' : fl.experience_level === 'mid' ? '#d97706' : '#6b7280' }} />
                      )}
                      {fl.punctuality_score != null && (
                        <Tooltip title="Pontualidade">
                          <Chip size="small" icon={<IconClock size={10} />}
                            label={`${Math.round(fl.punctuality_score)}%`}
                            sx={{ height: 18, fontSize: '0.62rem',
                              bgcolor: fl.punctuality_score >= 85 ? 'rgba(16,185,129,0.12)' : fl.punctuality_score >= 65 ? 'rgba(245,158,11,0.12)' : 'rgba(239,68,68,0.12)',
                              color: fl.punctuality_score >= 85 ? '#059669' : fl.punctuality_score >= 65 ? '#d97706' : '#dc2626' }} />
                        </Tooltip>
                      )}
                      {fl.approval_rate != null && (
                        <Tooltip title="Taxa de aprovação">
                          <Chip size="small" icon={<IconUserCheck size={10} />}
                            label={`${Math.round(fl.approval_rate)}%`}
                            sx={{ height: 18, fontSize: '0.62rem',
                              bgcolor: fl.approval_rate >= 85 ? 'rgba(16,185,129,0.12)' : fl.approval_rate >= 65 ? 'rgba(245,158,11,0.12)' : 'rgba(239,68,68,0.12)',
                              color: fl.approval_rate >= 85 ? '#059669' : fl.approval_rate >= 65 ? '#d97706' : '#dc2626' }} />
                        </Tooltip>
                      )}
                      {fl.jobs_completed != null && fl.jobs_completed > 0 && (
                        <Chip size="small" icon={<IconChartBar size={10} />} label={`${fl.jobs_completed} jobs`}
                          sx={{ height: 18, fontSize: '0.62rem', bgcolor: 'action.hover' }} />
                      )}
                    </Stack>
                  )}

                  {/* Unavailability banner */}
                  {!isEditing && fl.unavailable_until && new Date(fl.unavailable_until) >= new Date() && (
                    <Box sx={{ mt: 1, px: 1, py: 0.5, borderRadius: 1, bgcolor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                      <Typography variant="caption" sx={{ color: '#dc2626', fontWeight: 700, fontSize: '0.65rem' }}>
                        Indisponível até {new Date(fl.unavailable_until).toLocaleDateString('pt-BR')}
                      </Typography>
                    </Box>
                  )}

                  {/* Inline edit form */}
                  <Collapse in={isEditing} unmountOnExit>
                    <Divider sx={{ my: 1.5 }} />
                    <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>Profissional</Typography>
                    <Grid container spacing={1}>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                          fullWidth size="small" label="Cargo"
                          value={form.role_title}
                          onChange={(e) => set({ role_title: e.target.value })}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                          fullWidth size="small" label="Departamento"
                          value={form.department}
                          onChange={(e) => set({ department: e.target.value })}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                          fullWidth size="small" label="Celular"
                          value={form.phone}
                          onChange={(e) => set({ phone: e.target.value })}
                          placeholder="(13) 99711-2202"
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                          fullWidth size="small" label="E-mail pessoal"
                          type="email"
                          value={form.email_personal}
                          onChange={(e) => set({ email_personal: e.target.value })}
                        />
                      </Grid>
                      <Grid size={{ xs: 12 }}>
                        <TextField
                          fullWidth size="small" label="WhatsApp JID"
                          placeholder="5511999999999@s.whatsapp.net"
                          value={form.whatsapp_jid}
                          onChange={(e) => set({ whatsapp_jid: e.target.value })}
                          helperText="Identificador do contato no WhatsApp (Evolution API)"
                        />
                      </Grid>
                    </Grid>

                    <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ mt: 1.5, mb: 0.5, display: 'block' }}>Dados Pessoais</Typography>
                    <Grid container spacing={1}>
                      <Grid size={{ xs: 12, sm: 4 }}>
                        <TextField
                          fullWidth size="small" label="CPF"
                          value={form.cpf}
                          onChange={(e) => set({ cpf: e.target.value })}
                          placeholder="000.000.000-00"
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 4 }}>
                        <TextField
                          fullWidth size="small" label="RG"
                          value={form.rg}
                          onChange={(e) => set({ rg: e.target.value })}
                          placeholder="00.000.000-0"
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 4 }}>
                        <TextField
                          fullWidth size="small" label="Data de Nascimento"
                          type="date"
                          value={form.birth_date}
                          onChange={(e) => set({ birth_date: e.target.value })}
                          slotProps={{ inputLabel: { shrink: true } }}
                        />
                      </Grid>
                    </Grid>

                    <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ mt: 1.5, mb: 0.5, display: 'block' }}>Dados Bancários</Typography>
                    <Grid container spacing={1}>
                      <Grid size={{ xs: 12 }}>
                        <TextField
                          fullWidth size="small" label="Chave Pix"
                          value={form.pix_key}
                          onChange={(e) => set({ pix_key: e.target.value })}
                          placeholder="CPF, e-mail, telefone ou chave aleatória"
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 4 }}>
                        <TextField
                          fullWidth size="small" label="Banco"
                          value={form.bank_name}
                          onChange={(e) => set({ bank_name: e.target.value })}
                          placeholder="077 - Inter"
                        />
                      </Grid>
                      <Grid size={{ xs: 6, sm: 4 }}>
                        <TextField
                          fullWidth size="small" label="Agência"
                          value={form.bank_agency}
                          onChange={(e) => set({ bank_agency: e.target.value })}
                          placeholder="0001"
                        />
                      </Grid>
                      <Grid size={{ xs: 6, sm: 4 }}>
                        <TextField
                          fullWidth size="small" label="Conta"
                          value={form.bank_account}
                          onChange={(e) => set({ bank_account: e.target.value })}
                          placeholder="331975343"
                        />
                      </Grid>
                      <Grid size={{ xs: 12 }}>
                        <TextField
                          fullWidth size="small" label="Notas" multiline rows={2}
                          value={form.notes}
                          onChange={(e) => set({ notes: e.target.value })}
                        />
                      </Grid>
                    </Grid>

                    <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ mt: 1.5, mb: 0.5, display: 'block' }}>Perfil de Trabalho</Typography>
                    <Grid container spacing={1}>
                      <Grid size={{ xs: 12 }}>
                        <TextField
                          select fullWidth size="small" label="Tipo de Contrato"
                          value={form.contract_type}
                          onChange={(e) => set({ contract_type: e.target.value })}
                        >
                          <MenuItem value="">Selecione...</MenuItem>
                          <MenuItem value="clt">CLT</MenuItem>
                          <MenuItem value="pj">PJ</MenuItem>
                          <MenuItem value="freelancer">Freelancer</MenuItem>
                        </TextField>
                      </Grid>
                      <Grid size={{ xs: 12 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>Skills</Typography>
                        <ToggleButtonGroup
                          value={form.skills}
                          onChange={(_, newVal) => set({ skills: newVal as string[] })}
                          sx={{ flexWrap: 'wrap', gap: 0.5 }}
                        >
                          {[
                            { value: 'copy', label: 'Redação' },
                            { value: 'design', label: 'Design' },
                            { value: 'video', label: 'Vídeo' },
                            { value: 'social', label: 'Social Media' },
                            { value: 'estrategia', label: 'Estratégia' },
                            { value: 'operacao', label: 'Operação' },
                            { value: 'atendimento', label: 'Atendimento' },
                            { value: 'financeiro', label: 'Financeiro' },
                          ].map((opt) => (
                            <ToggleButton key={opt.value} value={opt.value} size="small" sx={{ fontSize: '0.65rem', py: 0.25, px: 0.75, height: 24 }}>
                              {opt.label}
                            </ToggleButton>
                          ))}
                        </ToggleButtonGroup>
                      </Grid>
                      <Grid size={{ xs: 12 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>Dias disponíveis</Typography>
                        <ToggleButtonGroup
                          value={form.available_days}
                          onChange={(_, newVal) => set({ available_days: newVal as string[] })}
                          sx={{ flexWrap: 'wrap', gap: 0.5 }}
                        >
                          {[
                            { value: 'mon', label: 'Seg' },
                            { value: 'tue', label: 'Ter' },
                            { value: 'wed', label: 'Qua' },
                            { value: 'thu', label: 'Qui' },
                            { value: 'fri', label: 'Sex' },
                            { value: 'sat', label: 'Sáb' },
                            { value: 'sun', label: 'Dom' },
                          ].map((opt) => (
                            <ToggleButton key={opt.value} value={opt.value} size="small" sx={{ fontSize: '0.65rem', py: 0.25, px: 0.75, height: 24 }}>
                              {opt.label}
                            </ToggleButton>
                          ))}
                        </ToggleButtonGroup>
                      </Grid>
                      <Grid size={{ xs: 6 }}>
                        <TextField
                          fullWidth size="small" label="De" type="time"
                          value={form.available_hours_start}
                          onChange={(e) => set({ available_hours_start: e.target.value })}
                          slotProps={{ inputLabel: { shrink: true } }}
                        />
                      </Grid>
                      <Grid size={{ xs: 6 }}>
                        <TextField
                          fullWidth size="small" label="Até" type="time"
                          value={form.available_hours_end}
                          onChange={(e) => set({ available_hours_end: e.target.value })}
                          slotProps={{ inputLabel: { shrink: true } }}
                        />
                      </Grid>
                      <Grid size={{ xs: 12 }}>
                        <TextField
                          fullWidth size="small" label="Capacidade semanal (horas)" type="number"
                          value={form.weekly_capacity_hours}
                          onChange={(e) => set({ weekly_capacity_hours: e.target.value })}
                          placeholder="40"
                        />
                      </Grid>
                      <Grid size={{ xs: 6 }}>
                        <TextField
                          select fullWidth size="small" label="Nível"
                          value={form.experience_level}
                          onChange={(e) => set({ experience_level: e.target.value })}
                        >
                          <MenuItem value="">Selecione...</MenuItem>
                          <MenuItem value="junior">Júnior</MenuItem>
                          <MenuItem value="mid">Pleno</MenuItem>
                          <MenuItem value="senior">Sênior</MenuItem>
                        </TextField>
                      </Grid>
                      <Grid size={{ xs: 6 }}>
                        <TextField
                          fullWidth size="small" label="Max jobs simultâneos" type="number"
                          value={form.max_concurrent_jobs}
                          onChange={(e) => set({ max_concurrent_jobs: e.target.value })}
                          placeholder="3"
                        />
                      </Grid>
                      <Grid size={{ xs: 12 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>Ferramentas</Typography>
                        <ToggleButtonGroup
                          value={form.tools}
                          onChange={(_, v) => set({ tools: v as string[] })}
                          sx={{ flexWrap: 'wrap', gap: 0.5 }}
                        >
                          {['Figma','Canva','Premiere','After Effects','Photoshop','Illustrator','CapCut','DaVinci'].map((t) => (
                            <ToggleButton key={t} value={t} size="small" sx={{ fontSize: '0.63rem', py: 0.25, px: 0.75, height: 24 }}>{t}</ToggleButton>
                          ))}
                        </ToggleButtonGroup>
                      </Grid>
                      <Grid size={{ xs: 12 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>IAs</Typography>
                        <ToggleButtonGroup
                          value={form.ai_tools}
                          onChange={(_, v) => set({ ai_tools: v as string[] })}
                          sx={{ flexWrap: 'wrap', gap: 0.5 }}
                        >
                          {['ChatGPT','Claude','Gemini','Midjourney','DALL-E','Sora','ElevenLabs','HeyGen'].map((t) => (
                            <ToggleButton key={t} value={t} size="small" sx={{ fontSize: '0.63rem', py: 0.25, px: 0.75, height: 24 }}>{t}</ToggleButton>
                          ))}
                        </ToggleButtonGroup>
                      </Grid>
                      <Grid size={{ xs: 12 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>Plataformas</Typography>
                        <ToggleButtonGroup
                          value={form.platform_expertise}
                          onChange={(_, v) => set({ platform_expertise: v as string[] })}
                          sx={{ flexWrap: 'wrap', gap: 0.5 }}
                        >
                          {['instagram','tiktok','linkedin','youtube','facebook','pinterest','twitter','threads'].map((p) => (
                            <ToggleButton key={p} value={p} size="small" sx={{ fontSize: '0.63rem', py: 0.25, px: 0.75, height: 24, textTransform: 'capitalize' }}>{p}</ToggleButton>
                          ))}
                        </ToggleButtonGroup>
                      </Grid>
                      <Grid size={{ xs: 12 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>Idiomas</Typography>
                        <ToggleButtonGroup
                          value={form.languages}
                          onChange={(_, v) => set({ languages: v as string[] })}
                          sx={{ flexWrap: 'wrap', gap: 0.5 }}
                        >
                          {[{ value: 'pt', label: 'PT' },{ value: 'en', label: 'EN' },{ value: 'es', label: 'ES' }].map((l) => (
                            <ToggleButton key={l.value} value={l.value} size="small" sx={{ fontSize: '0.63rem', py: 0.25, px: 0.75, height: 24 }}>{l.label}</ToggleButton>
                          ))}
                        </ToggleButtonGroup>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                          fullWidth size="small" label="Portfólio URL"
                          value={form.portfolio_url}
                          onChange={(e) => set({ portfolio_url: e.target.value })}
                          placeholder="https://..."
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                          fullWidth size="small" label="Indisponível até" type="date"
                          value={form.unavailable_until}
                          onChange={(e) => set({ unavailable_until: e.target.value })}
                          slotProps={{ inputLabel: { shrink: true } }}
                          helperText="Férias ou afastamento"
                        />
                      </Grid>
                    </Grid>
                    <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 1.5 }}>
                      <Button
                        size="small"
                        onClick={() => setEditingId(null)}
                        disabled={saving}
                        startIcon={<IconX size={14} />}
                      >
                        Cancelar
                      </Button>
                      <Button
                        size="small" variant="contained"
                        onClick={handleSave}
                        disabled={saving}
                        startIcon={saving ? <CircularProgress size={13} sx={{ color: '#fff' }} /> : <IconCheck size={14} />}
                        sx={{ bgcolor: '#E85219', '&:hover': { bgcolor: '#c43e10' } }}
                      >
                        {saving ? 'Salvando...' : 'Salvar'}
                      </Button>
                    </Stack>
                  </Collapse>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Stack>
  );
}

type TeamScore = {
  email: string;
  display_name: string;
  trello_member_id: string | null;
  freelancer_id: string | null;
  active_cards: number;
  completed_month: number;
  sla_rate: number | null;
  avg_days_variance: number | null;
  last_completed_at: string | null;
  last_completed_title: string | null;
  job_type_primary: string;
  score: number;
};

function scoreColor(score: number) {
  if (score >= 70) return '#13DEB9';
  if (score >= 50) return '#FFAE1F';
  return '#FA896B';
}

function scoreLabel(score: number) {
  if (score >= 80) return 'Excelente';
  if (score >= 70) return 'Bom';
  if (score >= 50) return 'Regular';
  if (score >= 30) return 'Atenção';
  return 'Crítico';
}

function relativeTime(iso: string | null) {
  if (!iso) return null;
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (diff === 0) return 'hoje';
  if (diff === 1) return 'ontem';
  if (diff < 7) return `${diff}d atrás`;
  if (diff < 30) return `${Math.floor(diff / 7)}sem atrás`;
  return `${Math.floor(diff / 30)}m atrás`;
}

function TeamScoreGrid({ scores, freelancers, loading }: {
  scores: TeamScore[];
  freelancers: FreelancerProfile[];
  loading: boolean;
}) {
  const router = useRouter();
  const [search, setSearch] = useState('');

  const filtered = scores.filter((s) =>
    !search || s.display_name.toLowerCase().includes(search.toLowerCase()),
  );

  // map email → freelancer profile for extra info
  const flByEmail = Object.fromEntries(
    freelancers.map((f) => [f.email.toLowerCase(), f]),
  );

  if (loading) return <Stack alignItems="center" py={6}><CircularProgress /></Stack>;

  return (
    <Stack spacing={2}>
      <TextField
        size="small"
        placeholder="Buscar colaborador..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        slotProps={{ input: { startAdornment: <InputAdornment position="start"><IconSearch size={16} /></InputAdornment> } }}
        sx={{ maxWidth: 340 }}
      />
      {filtered.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
          {scores.length === 0 ? 'Nenhum dado de produção ainda. Sincronize o Trello primeiro.' : 'Nenhum resultado.'}
        </Typography>
      )}
      <Grid container spacing={2}>
        {filtered.map((s) => {
          const color = scoreColor(s.score);
          const fl = flByEmail[s.email?.toLowerCase() ?? ''];
          const profileId = s.freelancer_id ?? fl?.id ?? null;
          const specialty = fl?.specialty ?? fl?.role_title ?? s.job_type_primary;
          const hasTimer = (fl?.active_timers ?? []).length > 0;

          const navTarget = profileId
            ? `/admin/equipe/${profileId}`
            : s.trello_member_id
            ? `/admin/equipe/m/${s.trello_member_id}`
            : null;

          return (
            <Grid key={s.email} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
              <Card
                onClick={() => navTarget && router.push(navTarget)}
                sx={(theme) => ({
                  borderRadius: 3,
                  border: '1px solid',
                  borderColor: alpha(color, 0.30),
                  borderTop: `4px solid ${color}`,
                  bgcolor: theme.palette.mode === 'dark' ? alpha(color, 0.06) : alpha(color, 0.03),
                  cursor: navTarget ? 'pointer' : 'default',
                  transition: 'all 180ms ease',
                  '&:hover': navTarget ? {
                    transform: 'translateY(-3px)',
                    boxShadow: `0 8px 24px ${alpha(color, 0.18)}`,
                  } : {},
                })}
              >
                <CardContent sx={{ p: '16px !important' }}>
                  {/* Header: avatar + name + score badge */}
                  <Stack direction="row" spacing={1.5} alignItems="flex-start" mb={1.5}>
                    <Box sx={{ position: 'relative', flexShrink: 0 }}>
                      <Avatar sx={{
                        width: 44, height: 44, fontSize: '0.9rem', fontWeight: 800,
                        bgcolor: alpha(color, 0.18), color,
                      }}>
                        {initials(s.display_name)}
                      </Avatar>
                      {hasTimer && (
                        <Box sx={{
                          position: 'absolute', bottom: 0, right: 0,
                          width: 10, height: 10, borderRadius: '50%',
                          bgcolor: '#13DEB9', border: '1.5px solid white',
                          animation: 'pulse 1.4s infinite',
                        }} />
                      )}
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" fontWeight={800} noWrap>{s.display_name}</Typography>
                      <Typography variant="caption" color="text.secondary" noWrap sx={{ fontSize: '0.68rem' }}>
                        {specialty ?? s.email}
                      </Typography>
                    </Box>
                    <Tooltip title={`Score de produção: ${scoreLabel(s.score)}`}>
                      <Box sx={{
                        px: 1, py: 0.25, borderRadius: 1.5,
                        bgcolor: alpha(color, 0.15),
                        border: `1px solid ${alpha(color, 0.35)}`,
                        flexShrink: 0,
                      }}>
                        <Typography variant="caption" fontWeight={900} sx={{ color, fontSize: '0.75rem', lineHeight: 1 }}>
                          {s.score}
                        </Typography>
                      </Box>
                    </Tooltip>
                  </Stack>

                  {/* Score bar */}
                  <Box sx={{ mb: 1.5 }}>
                    <Stack direction="row" justifyContent="space-between" mb={0.5}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.62rem' }}>
                        {scoreLabel(s.score)}
                      </Typography>
                      <Typography variant="caption" sx={{ color, fontSize: '0.62rem', fontWeight: 700 }}>
                        {s.sla_rate !== null ? `${s.sla_rate}% SLA` : 'Sem SLA'}
                      </Typography>
                    </Stack>
                    <Box sx={{ height: 4, borderRadius: 99, bgcolor: alpha(color, 0.12) }}>
                      <Box sx={{
                        height: 4, borderRadius: 99, bgcolor: color,
                        width: `${s.score}%`, transition: 'width 400ms ease',
                      }} />
                    </Box>
                  </Box>

                  {/* Stats row */}
                  <Stack direction="row" spacing={0} divider={
                    <Box sx={{ width: 1, bgcolor: 'divider', mx: 0.5 }} />
                  }>
                    <Box sx={{ flex: 1, textAlign: 'center' }}>
                      <Typography variant="body2" fontWeight={800} sx={{ lineHeight: 1.2 }}>{s.active_cards}</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>Ativos</Typography>
                    </Box>
                    <Box sx={{ flex: 1, textAlign: 'center' }}>
                      <Typography variant="body2" fontWeight={800} sx={{ lineHeight: 1.2 }}>{s.completed_month}</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>Concluídos/mês</Typography>
                    </Box>
                    <Box sx={{ flex: 1, textAlign: 'center' }}>
                      <Typography variant="body2" fontWeight={800} sx={{ lineHeight: 1.2, color: s.avg_days_variance == null ? 'text.disabled' : s.avg_days_variance <= 0 ? '#13DEB9' : '#FA896B' }}>
                        {s.avg_days_variance == null ? '—' : s.avg_days_variance > 0 ? `+${s.avg_days_variance}d` : `${s.avg_days_variance}d`}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>Variância</Typography>
                    </Box>
                  </Stack>

                  {/* Last activity */}
                  {s.last_completed_at && (
                    <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 1.25, fontSize: '0.62rem' }} noWrap>
                      Última entrega: {relativeTime(s.last_completed_at)}
                      {s.last_completed_title ? ` · ${s.last_completed_title}` : ''}
                    </Typography>
                  )}

                  {/* Job type chip */}
                  <Stack direction="row" spacing={0.75} mt={1} flexWrap="wrap" useFlexGap>
                    <Chip
                      size="small"
                      label={s.job_type_primary}
                      sx={{ height: 18, fontSize: '0.6rem', bgcolor: 'action.hover' }}
                    />
                    {hasTimer && (
                      <Chip size="small" label="● ao vivo" sx={{ height: 18, fontSize: '0.6rem', bgcolor: alpha('#13DEB9', 0.12), color: '#13DEB9', fontWeight: 700 }} />
                    )}
                    {!profileId && (
                      <Chip size="small" label="sem perfil" sx={{ height: 18, fontSize: '0.6rem', bgcolor: 'action.hover', color: 'text.disabled' }} />
                    )}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Stack>
  );
}

export default function EquipePage() {
  const [tab, setTab] = useState(0);

  const [freelancers, setFreelancers]         = useState<FreelancerProfile[]>([]);
  const [internalPeople, setInternalPeople]   = useState<InternalPerson[]>([]);
  const [allPeople, setAllPeople]             = useState<InternalPerson[]>([]);
  const [allPeopleLoading, setAllPeopleLoading] = useState(false);
  const [allPeopleLoaded, setAllPeopleLoaded] = useState(false);
  const [peopleSearch, setPeopleSearch]       = useState('');
  const [editPerson, setEditPerson]           = useState<InternalPerson | null>(null);
  const [editForm, setEditForm]               = useState({ display_name: '', is_internal: false, notes: '' });
  const [editSaving, setEditSaving]           = useState(false);
  const [loading, setLoading]                 = useState(true);
  const [error, setError]             = useState('');
  const [drawerFl, setDrawerFl]       = useState<FreelancerProfile | null>(null);
  const [flEntries, setFlEntries]     = useState<any[]>([]);
  const [flHours, setFlHours]         = useState<{ [id: string]: number }>({});
  const [teamScores, setTeamScores]   = useState<TeamScore[]>([]);
  const [scoresLoading, setScoresLoading] = useState(false);

  // Analytics state
  const [analyticsMonth, setAnalyticsMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [analyticsData, setAnalyticsData] = useState<{
    byFreelancer: { name: string; minutes: number; cost: number }[];
    byClient: { client: string; minutes: number; cost: number }[];
    pl: { receita: number; custo: number; margem: number }[];
  } | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // New freelancer dialog
  const [newOpen,    setNewOpen]    = useState(false);
  const [users,      setUsers]      = useState<TenantUser[]>([]);
  const [newMode,    setNewMode]    = useState<'new' | 'existing'>('new');
  const [newUserId,  setNewUserId]  = useState('');
  const [newEmail,   setNewEmail]   = useState('');
  const [newName,    setNewName]    = useState('');
  const [newSpec,    setNewSpec]    = useState('');
  const [newRate,    setNewRate]    = useState('');
  const [newPix,     setNewPix]     = useState('');
  const [newSaving,  setNewSaving]  = useState(false);
  const [newPhone,   setNewPhone]   = useState('');
  const [newWhatsapp, setNewWhatsapp] = useState('');
  const [newRole,    setNewRole]    = useState('');
  const [newDept,    setNewDept]    = useState('');
  const [newCpf,     setNewCpf]     = useState('');
  const [newRg,      setNewRg]      = useState('');
  const [newBirth,   setNewBirth]   = useState('');
  const [newBank,    setNewBank]    = useState('');
  const [newAgency,  setNewAgency]  = useState('');
  const [newAccount, setNewAccount] = useState('');

  const currentMonth = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  })();

  const load = async () => {
    setLoading(true);
    setScoresLoading(true);
    try {
      const [rows, peopleRes] = await Promise.all([
        apiGet<FreelancerProfile[]>('/freelancers'),
        apiGet<{ success: boolean; data: InternalPerson[] }>('/people?internal=true&limit=200').catch(() => ({ data: [] as InternalPerson[] })),
      ]);
      setFreelancers(rows);
      setInternalPeople(peopleRes.data ?? []);

      // Fetch hours per freelancer for current month
      const hoursMap: { [id: string]: number } = {};
      await Promise.all(
        rows.map(async (fl) => {
          try {
            const res: any = await apiGet(`/freelancers/${fl.id}/time-entries?month=${currentMonth}`);
            hoursMap[fl.id] = (res.entries ?? []).reduce((s: number, e: any) => s + (e.minutes ?? 0), 0);
          } catch { hoursMap[fl.id] = 0; }
        }),
      );
      setFlHours(hoursMap);
    } catch (e: any) {
      setError(e.message ?? 'Erro ao carregar equipe');
    } finally {
      setLoading(false);
    }

    // Load team scores from Trello production data
    try {
      const res = await apiGet<{ data: TeamScore[] }>('/trello/ops-team-scores');
      setTeamScores(res?.data ?? []);
    } catch { /* silent — Trello might not be configured */ }
    finally { setScoresLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const loadAllPeople = async () => {
    if (allPeopleLoaded) return;
    setAllPeopleLoading(true);
    try {
      const res = await apiGet<{ success: boolean; data: InternalPerson[] }>('/people?limit=300');
      setAllPeople(res.data ?? []);
      setAllPeopleLoaded(true);
    } catch { /* silent */ } finally { setAllPeopleLoading(false); }
  };

  useEffect(() => {
    if (tab !== 2) return;
    setAnalyticsLoading(true);
    Promise.all([
      apiGet<{ by_freelancer: any[]; by_client: any[] }>(`/financial/productivity?month=${analyticsMonth}`).catch(() => ({ by_freelancer: [], by_client: [] })),
      apiGet<{ rows: any[] }>(`/financial/pl?month=${analyticsMonth}`).catch(() => ({ rows: [] })),
    ]).then(([prod, plRes]) => {
      setAnalyticsData({
        byFreelancer: (prod.by_freelancer ?? []).map((r: any) => ({
          name: r.display_name,
          minutes: parseInt(r.total_minutes ?? '0'),
          cost: parseFloat(r.total_cost ?? '0'),
        })),
        byClient: (prod.by_client ?? []).map((r: any) => ({
          client: r.client_name ?? 'Sem cliente',
          minutes: parseInt(r.total_minutes ?? '0'),
          cost: parseFloat(r.total_cost ?? '0'),
        })),
        pl: (plRes as any).rows ?? [],
      });
    }).finally(() => setAnalyticsLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, analyticsMonth]);

  const openDrawer = async (fl: FreelancerProfile) => {
    setDrawerFl(fl);
    try {
      const res: any = await apiGet(`/freelancers/${fl.id}/time-entries?month=${currentMonth}`);
      setFlEntries(res.entries ?? []);
    } catch { setFlEntries([]); }
  };

  const handleDeactivate = async (id: string, active: boolean) => {
    await apiPatch(`/freelancers/${id}`, { is_active: active });
    setFreelancers((prev) => prev.map((f) => f.id === id ? { ...f, is_active: active } : f));
    if (drawerFl?.id === id) setDrawerFl((d) => d ? { ...d, is_active: active } : d);
  };

  const openNew = async () => {
    setNewOpen(true);
    setNewMode('new');
    try {
      const res: any = await apiGet('/admin/users');
      setUsers(res.users ?? res ?? []);
    } catch { setUsers([]); }
  };

  const handleCreate = async () => {
    const hasExistingUser = newMode === 'existing' && !!newUserId;
    const hasNewEmail = newMode === 'new' && !!newEmail.trim();
    if (!newName.trim() || (!hasExistingUser && !hasNewEmail)) return;

    setNewSaving(true);
    try {
      await apiPost('/freelancers', {
        user_id: newMode === 'existing' ? newUserId : null,
        user_email: newMode === 'new' ? newEmail.trim().toLowerCase() : null,
        display_name: newName.trim(),
        specialty: newSpec || null,
        hourly_rate_brl: newRate ? parseFloat(newRate) : null,
        pix_key: newPix || null,
        phone: newPhone || null,
        whatsapp_jid: newWhatsapp || null,
        role_title: newRole || null,
        department: newDept || null,
        cpf: newCpf || null,
        rg: newRg || null,
        birth_date: newBirth || null,
        bank_name: newBank || null,
        bank_agency: newAgency || null,
        bank_account: newAccount || null,
      });
      setNewOpen(false);
      setNewMode('new'); setNewUserId(''); setNewEmail(''); setNewName(''); setNewSpec(''); setNewRate(''); setNewPix('');
      setNewPhone(''); setNewWhatsapp(''); setNewRole(''); setNewDept('');
      setNewCpf(''); setNewRg(''); setNewBirth(''); setNewBank(''); setNewAgency(''); setNewAccount('');
      await load();
    } catch (e: any) {
      alert(e.message ?? 'Erro ao criar freelancer');
    } finally {
      setNewSaving(false);
    }
  };

  const totalHoursMonth = Object.values(flHours).reduce((s, m) => s + m, 0);
  const totalCostMonth = freelancers.reduce((s, fl) => {
    const mins = flHours[fl.id] ?? 0;
    const rate = parseFloat(fl.hourly_rate_brl ?? '0');
    return s + (mins / 60) * rate;
  }, 0);
  const activeCount = freelancers.filter((f) => f.is_active).length;
  const timerCount = freelancers.filter((f) => (f.active_timers ?? []).length > 0).length;

  const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const fmtH = (mins: number) => {
    if (!mins) return '0h';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}min` : `${h}h`;
  };

  return (
    <AppShell title="Equipe">
      <Box sx={{ p: 3, maxWidth: 1200 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <IconUserCheck size={22} />
            <Typography variant="h5" fontWeight={700}>Equipe</Typography>
          </Stack>
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<IconCurrencyDollar size={16} />}
              href="/admin/equipe/billing"
              component="a"
            >
              Cobrança
            </Button>
            <Button variant="contained" startIcon={<IconPlus size={16} />} onClick={openNew} size="small">
              Novo Freelancer
            </Button>
          </Stack>
        </Stack>

        {/* Summary cards */}
        <Grid container spacing={2} mb={2}>
          {[
            { label: 'Freelancers ativos', value: String(activeCount), icon: <IconUserCheck size={20} /> },
            { label: 'Timers rodando agora', value: String(timerCount), icon: <IconClock size={20} /> },
            { label: `Horas em ${currentMonth}`, value: fmtH(totalHoursMonth), icon: <IconChartBar size={20} /> },
            { label: 'Custo do mês', value: brl(totalCostMonth), icon: <IconCurrencyDollar size={20} /> },
          ].map((c) => (
            <Grid key={c.label} size={{ xs: 6, sm: 3 }}>
              <Card variant="outlined">
                <CardContent sx={{ py: 1.5 }}>
                  <Stack direction="row" alignItems="center" spacing={1} mb={0.5}>
                    <Box sx={{ color: 'primary.main' }}>{c.icon}</Box>
                    <Typography variant="caption" color="text.secondary">{c.label}</Typography>
                  </Stack>
                  <Typography variant="h5" fontWeight={700}>{c.value}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Tabs value={tab} onChange={(_, v) => { setTab(v); if (v === 3) loadAllPeople(); }} sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Tab label="Equipe" />
          <Tab icon={<IconUsers size={15} />} iconPosition="start" label="Contatos" sx={{ fontSize: '0.85rem' }} />
          <Tab label="Analytics do Mês" />
          <Tab icon={<IconUserCheck size={15} />} iconPosition="start" label="Diretório" sx={{ fontSize: '0.85rem' }} />
        </Tabs>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {tab === 2 && (
          <Box>
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
              <Typography variant="h6">Analytics de Produtividade</Typography>
              <TextField
                type="month"
                size="small"
                value={analyticsMonth}
                onChange={(e) => setAnalyticsMonth(e.target.value)}
                sx={{ width: 160 }}
              />
            </Stack>
            {analyticsLoading ? (
              <Stack alignItems="center" py={4}><CircularProgress /></Stack>
            ) : !analyticsData ? null : (
              <Stack spacing={3}>
                {/* By freelancer */}
                <Box>
                  <Typography variant="subtitle2" fontWeight={700} color="text.secondary" mb={1}>
                    Horas por Freelancer
                  </Typography>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Freelancer</TableCell>
                          <TableCell align="right">Horas</TableCell>
                          <TableCell align="right">Custo</TableCell>
                          <TableCell sx={{ width: 180 }}>Distribuição</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {analyticsData.byFreelancer.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={4} align="center">
                              <Typography color="text.secondary" variant="body2" py={2}>Sem dados para {analyticsMonth}</Typography>
                            </TableCell>
                          </TableRow>
                        )}
                        {analyticsData.byFreelancer.map((row) => {
                          const maxMins = Math.max(...analyticsData.byFreelancer.map((r) => r.minutes), 1);
                          const pct = (row.minutes / maxMins) * 100;
                          return (
                            <TableRow key={row.name}>
                              <TableCell sx={{ fontWeight: 600 }}>{row.name}</TableCell>
                              <TableCell align="right">{fmtH(row.minutes)}</TableCell>
                              <TableCell align="right">{brl(row.cost)}</TableCell>
                              <TableCell>
                                <Box sx={{ bgcolor: 'action.hover', borderRadius: 1, overflow: 'hidden', height: 8 }}>
                                  <Box sx={{ width: `${pct}%`, height: '100%', bgcolor: 'primary.main', borderRadius: 1 }} />
                                </Box>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>

                <Divider />

                {/* By client */}
                <Box>
                  <Typography variant="subtitle2" fontWeight={700} color="text.secondary" mb={1}>
                    Horas por Cliente
                  </Typography>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Cliente</TableCell>
                          <TableCell align="right">Horas investidas</TableCell>
                          <TableCell align="right">Custo interno</TableCell>
                          <TableCell align="right">Receita (P&L)</TableCell>
                          <TableCell align="right">Margem</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {analyticsData.byClient.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={5} align="center">
                              <Typography color="text.secondary" variant="body2" py={2}>Sem dados</Typography>
                            </TableCell>
                          </TableRow>
                        )}
                        {analyticsData.byClient.map((row) => {
                          const plRow = analyticsData.pl.find((p: any) =>
                            (p.client_name ?? '').toLowerCase().includes(row.client.toLowerCase()) ||
                            row.client.toLowerCase().includes((p.client_name ?? '').toLowerCase())
                          );
                          const receita = plRow ? (typeof plRow.receita === 'number' ? plRow.receita : 0) : 0;
                          const margem = receita - row.cost;
                          return (
                            <TableRow key={row.client} hover>
                              <TableCell>{row.client}</TableCell>
                              <TableCell align="right">{fmtH(row.minutes)}</TableCell>
                              <TableCell align="right">{brl(row.cost)}</TableCell>
                              <TableCell align="right">{receita > 0 ? brl(receita) : '—'}</TableCell>
                              <TableCell align="right">
                                {receita > 0 ? (
                                  <Chip
                                    label={brl(margem)}
                                    size="small"
                                    color={margem >= 0 ? 'success' : 'error'}
                                  />
                                ) : '—'}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              </Stack>
            )}
          </Box>
        )}

        {tab === 1 && (
          <FreelancerContacts freelancers={freelancers} loading={loading} onUpdated={load} />
        )}

        {tab === 0 && (
          <TeamScoreGrid scores={teamScores} freelancers={freelancers} loading={loading || scoresLoading} />
        )}

        {tab === 0 && false && loading ? (
          <Stack alignItems="center" py={6}><CircularProgress /></Stack>
        ) : tab === 0 && false && (
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Freelancer</TableCell>
                  <TableCell>Especialidade</TableCell>
                  <TableCell>Taxa/h</TableCell>
                  <TableCell>Horas ({currentMonth})</TableCell>
                  <TableCell>Timer ativo</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {freelancers.map((fl) => {
                  const activeTimers = fl.active_timers ?? [];
                  const mins = flHours[fl.id] ?? 0;
                  return (
                    <TableRow
                      key={fl.id}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => openDrawer(fl)}
                    >
                      <TableCell>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Avatar sx={{ width: 28, height: 28, fontSize: '0.65rem', bgcolor: 'primary.main' }}>
                            {initials(fl.display_name)}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight={600}>{fl.display_name}</Typography>
                            <Typography variant="caption" color="text.secondary">{fl.email}</Typography>
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">{fl.specialty ?? '—'}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {fl.hourly_rate_brl ? `R$ ${parseFloat(fl.hourly_rate_brl).toFixed(2)}/h` : 'Flat-fee'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" alignItems="center" spacing={0.5}>
                          <IconClock size={12} />
                          <Typography variant="body2">{formatHours(mins)}</Typography>
                          {fl.hourly_rate_brl && mins > 0 && (
                            <Typography variant="caption" color="text.secondary">
                              (R$ {((mins / 60) * parseFloat(fl.hourly_rate_brl)).toFixed(2)})
                            </Typography>
                          )}
                        </Stack>
                      </TableCell>
                      <TableCell>
                        {activeTimers.length > 0 ? (
                          <TimerDot startedAt={activeTimers[0].started_at} />
                        ) : (
                          <Typography variant="caption" color="text.disabled">—</Typography>
                        )}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Chip
                          label={fl.is_active ? 'Ativo' : 'Inativo'}
                          size="small"
                          color={fl.is_active ? 'success' : 'default'}
                          onClick={() => handleDeactivate(fl.id, !fl.is_active)}
                          sx={{ cursor: 'pointer', fontSize: '0.7rem' }}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
                {!freelancers.length && (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Typography variant="body2" color="text.disabled" py={3}>
                        Nenhum freelancer cadastrado ainda.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>

      {/* Internal people from Pessoas directory */}
      {tab === 0 && internalPeople.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
            <IconUserCheck size={18} color="#E85219" />
            <Typography variant="subtitle2" fontWeight={700}>
              Pessoas Internas ({internalPeople.length})
            </Typography>
            <Chip label="do Diretório de Pessoas" size="small" variant="outlined" sx={{ fontSize: '0.68rem', height: 20 }} />
          </Stack>
          <Grid container spacing={1.5}>
            {internalPeople.map((p) => {
              const email = p.identities?.find((i) => i.type === 'email')?.value ?? null;
              const phone = p.identities?.find((i) => i.type === 'phone_e164' || i.type === 'whatsapp_jid')?.value ?? null;
              return (
                <Grid key={p.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                  <Card variant="outlined" sx={{ borderRadius: 2 }}>
                    <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Avatar sx={{ width: 36, height: 36, fontSize: '0.75rem', bgcolor: avatarColor(p.display_name) }}>
                          {initials(p.display_name)}
                        </Avatar>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="body2" fontWeight={700} noWrap>{p.display_name}</Typography>
                          {email && <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>{email}</Typography>}
                          {phone && <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>{phone}</Typography>}
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </Box>
      )}

      {/* ── Diretório de Pessoas (tab 3) ─────────────────────────────── */}
      {tab === 3 && (
        <Box>
          <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2} flexWrap="wrap" gap={1}>
            <Typography variant="subtitle1" fontWeight={700}>
              Diretório de Pessoas {!allPeopleLoading && allPeople.length > 0 && `(${allPeople.length})`}
            </Typography>
            <TextField
              size="small"
              placeholder="Buscar pelo nome ou contato..."
              value={peopleSearch}
              onChange={(e) => setPeopleSearch(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start"><IconSearch size={16} /></InputAdornment> }}
              sx={{ width: 260 }}
            />
          </Stack>

          {allPeopleLoading && <CircularProgress size={24} />}

          {!allPeopleLoading && (
            <Grid container spacing={1.5}>
              {allPeople
                .filter((p) => {
                  if (!peopleSearch.trim()) return true;
                  const q = peopleSearch.toLowerCase();
                  if (p.display_name.toLowerCase().includes(q)) return true;
                  return (p.identities ?? []).some((i) => i.value.toLowerCase().includes(q));
                })
                .map((p) => {
                  const email = p.identities?.find((i) => i.type === 'email')?.value ?? null;
                  const phone = p.identities?.find((i) => i.type === 'phone_e164' || i.type === 'whatsapp_jid')?.value ?? null;
                  return (
                    <Grid key={p.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                      <Card
                        variant="outlined"
                        sx={{ borderRadius: 2, cursor: 'pointer', '&:hover': { borderColor: 'primary.main' } }}
                        onClick={() => { setEditPerson(p); setEditForm({ display_name: p.display_name, is_internal: p.is_internal ?? false, notes: p.notes ?? '' }); }}
                      >
                        <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                          <Stack direction="row" spacing={1.5} alignItems="center">
                            <Avatar sx={{ width: 36, height: 36, fontSize: '0.75rem', bgcolor: p.is_internal ? 'primary.main' : avatarColor(p.display_name) }}>
                              {initials(p.display_name)}
                            </Avatar>
                            <Box sx={{ minWidth: 0, flex: 1 }}>
                              <Stack direction="row" alignItems="center" spacing={0.5}>
                                <Typography variant="body2" fontWeight={700} noWrap>{p.display_name}</Typography>
                                {p.is_internal && <Chip label="interno" size="small" color="primary" sx={{ height: 16, fontSize: '0.6rem' }} />}
                              </Stack>
                              {email && <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>{email}</Typography>}
                              {phone && <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>{phone}</Typography>}
                            </Box>
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid>
                  );
                })}
            </Grid>
          )}
        </Box>
      )}

      {/* Edit person dialog */}
      <Dialog open={Boolean(editPerson)} onClose={() => setEditPerson(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Editar pessoa</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Nome"
              size="small"
              fullWidth
              value={editForm.display_name}
              onChange={(e) => setEditForm((f) => ({ ...f, display_name: e.target.value }))}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={editForm.is_internal}
                  onChange={(e) => setEditForm((f) => ({ ...f, is_internal: e.target.checked }))}
                  color="primary"
                />
              }
              label="Pessoa interna (equipe Edro)"
            />
            <TextField
              label="Notas"
              size="small"
              fullWidth
              multiline
              minRows={2}
              value={editForm.notes}
              onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditPerson(null)} disabled={editSaving}>Cancelar</Button>
          <Button
            variant="contained"
            disabled={editSaving || !editForm.display_name.trim()}
            onClick={async () => {
              if (!editPerson) return;
              setEditSaving(true);
              try {
                await apiPatch(`/people/${editPerson.id}`, {
                  display_name: editForm.display_name.trim(),
                  is_internal: editForm.is_internal,
                  notes: editForm.notes || null,
                });
                setAllPeople((prev) => prev.map((p) =>
                  p.id === editPerson.id
                    ? { ...p, display_name: editForm.display_name.trim(), is_internal: editForm.is_internal, notes: editForm.notes || null }
                    : p,
                ));
                setInternalPeople((prev) => prev.map((p) =>
                  p.id === editPerson.id
                    ? { ...p, display_name: editForm.display_name.trim(), is_internal: editForm.is_internal }
                    : p,
                ).filter((p) => p.is_internal));
                setEditPerson(null);
              } catch { /* TODO: show error */ }
              finally { setEditSaving(false); }
            }}
          >
            {editSaving ? <CircularProgress size={18} /> : 'Salvar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Freelancer detail drawer */}
      <Drawer
        anchor="right"
        open={Boolean(drawerFl)}
        onClose={() => { setDrawerFl(null); setFlEntries([]); }}
        PaperProps={{ sx: { width: { xs: '100vw', sm: 440 }, p: 3 } }}
      >
        {drawerFl && (
          <Stack spacing={2}>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Avatar sx={{ width: 40, height: 40, bgcolor: 'primary.main' }}>
                {initials(drawerFl.display_name)}
              </Avatar>
              <Box>
                <Typography variant="h6" fontWeight={700}>{drawerFl.display_name}</Typography>
                <Typography variant="caption" color="text.secondary">{drawerFl.email}</Typography>
              </Box>
            </Stack>

            <Stack spacing={0.5}>
              {drawerFl.specialty && (
                <Typography variant="body2"><strong>Especialidade:</strong> {drawerFl.specialty}</Typography>
              )}
              {drawerFl.role_title && (
                <Typography variant="body2"><strong>Cargo:</strong> {drawerFl.role_title}</Typography>
              )}
              {drawerFl.department && (
                <Typography variant="body2"><strong>Departamento:</strong> {drawerFl.department}</Typography>
              )}
              <Typography variant="body2">
                <strong>Taxa:</strong>{' '}
                {drawerFl.hourly_rate_brl ? `R$ ${parseFloat(drawerFl.hourly_rate_brl).toFixed(2)}/h` : 'Projeto (flat-fee)'}
              </Typography>
              {/* Contato */}
              {(drawerFl.phone || drawerFl.email_personal || drawerFl.whatsapp_jid) && (
                <>
                  <Divider sx={{ my: 0.5 }} />
                  <Typography variant="caption" fontWeight={700} color="text.secondary">Contato</Typography>
                  {drawerFl.phone && (
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <IconPhone size={13} />
                      <Typography variant="body2">{drawerFl.phone}</Typography>
                    </Stack>
                  )}
                  {drawerFl.email_personal && (
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <IconMail size={13} />
                      <Typography variant="body2">{drawerFl.email_personal}</Typography>
                    </Stack>
                  )}
                  {drawerFl.whatsapp_jid && (
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <IconBrandWhatsapp size={13} color="#25D366" />
                      <Typography variant="body2">{drawerFl.whatsapp_jid.replace('@s.whatsapp.net', '')}</Typography>
                    </Stack>
                  )}
                </>
              )}

              {/* Dados Pessoais */}
              {(drawerFl.cpf || drawerFl.rg || drawerFl.birth_date) && (
                <>
                  <Divider sx={{ my: 0.5 }} />
                  <Typography variant="caption" fontWeight={700} color="text.secondary">Dados Pessoais</Typography>
                  {drawerFl.cpf && (
                    <Typography variant="body2"><strong>CPF:</strong> {drawerFl.cpf}</Typography>
                  )}
                  {drawerFl.rg && (
                    <Typography variant="body2"><strong>RG:</strong> {drawerFl.rg}</Typography>
                  )}
                  {drawerFl.birth_date && (
                    <Typography variant="body2"><strong>Nascimento:</strong> {new Date(drawerFl.birth_date).toLocaleDateString('pt-BR')}</Typography>
                  )}
                </>
              )}

              {/* Dados Bancários */}
              {(drawerFl.pix_key || drawerFl.bank_name) && (
                <>
                  <Divider sx={{ my: 0.5 }} />
                  <Typography variant="caption" fontWeight={700} color="text.secondary">Dados Bancários</Typography>
                  {drawerFl.pix_key && (
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <IconCurrencyDollar size={13} color="#059669" />
                      <Typography variant="body2"><strong>Pix:</strong> {drawerFl.pix_key}</Typography>
                    </Stack>
                  )}
                  {drawerFl.bank_name && (
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <IconBuildingBank size={13} />
                      <Typography variant="body2"><strong>Banco:</strong> {drawerFl.bank_name}</Typography>
                    </Stack>
                  )}
                  {drawerFl.bank_agency && (
                    <Typography variant="body2"><strong>Agência:</strong> {drawerFl.bank_agency}</Typography>
                  )}
                  {drawerFl.bank_account && (
                    <Typography variant="body2"><strong>Conta:</strong> {drawerFl.bank_account}</Typography>
                  )}
                </>
              )}

              {/* Perfil Operacional */}
              {(drawerFl.skills?.length || drawerFl.available_days?.length || drawerFl.available_hours_start || drawerFl.weekly_capacity_hours || drawerFl.contract_type) && (
                <>
                  <Divider sx={{ my: 0.5 }} />
                  <Typography variant="caption" fontWeight={700} color="text.secondary">Perfil Operacional</Typography>
                  {drawerFl.contract_type && (
                    <Typography variant="body2">
                      <strong>Contrato:</strong>{' '}
                      {drawerFl.contract_type === 'clt' ? 'CLT' : drawerFl.contract_type === 'pj' ? 'PJ' : drawerFl.contract_type === 'freelancer' ? 'Freelancer' : drawerFl.contract_type}
                    </Typography>
                  )}
                  {drawerFl.weekly_capacity_hours != null && (
                    <Typography variant="body2"><strong>Capacidade semanal:</strong> {drawerFl.weekly_capacity_hours}h</Typography>
                  )}
                  {drawerFl.available_days?.length ? (
                    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap alignItems="center">
                      <Typography variant="body2" sx={{ fontWeight: 600, mr: 0.5 }}>Dias:</Typography>
                      {drawerFl.available_days.map((d) => {
                        const DAY_LABELS: Record<string, string> = { mon: 'Seg', tue: 'Ter', wed: 'Qua', thu: 'Qui', fri: 'Sex', sat: 'Sáb', sun: 'Dom' };
                        return <Chip key={d} label={DAY_LABELS[d] ?? d} size="small" sx={{ height: 18, fontSize: '0.65rem' }} />;
                      })}
                    </Stack>
                  ) : null}
                  {(drawerFl.available_hours_start || drawerFl.available_hours_end) && (
                    <Typography variant="body2">
                      <strong>Horário:</strong> {drawerFl.available_hours_start ?? '—'} às {drawerFl.available_hours_end ?? '—'}
                    </Typography>
                  )}
                  {drawerFl.skills?.length ? (
                    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap alignItems="center">
                      <Typography variant="body2" sx={{ fontWeight: 600, mr: 0.5 }}>Skills:</Typography>
                      {drawerFl.skills.map((s) => {
                        const SKILL_LABELS: Record<string, string> = { copy: 'Redação', design: 'Design', video: 'Vídeo', social: 'Social Media', estrategia: 'Estratégia', operacao: 'Operação', atendimento: 'Atendimento', financeiro: 'Financeiro' };
                        return <Chip key={s} label={SKILL_LABELS[s] ?? s} size="small" sx={{ height: 18, fontSize: '0.65rem', bgcolor: 'rgba(93,135,255,0.1)', color: '#5D87FF', borderColor: 'rgba(93,135,255,0.3)' }} variant="outlined" />;
                      })}
                    </Stack>
                  ) : null}
                </>
              )}

              {drawerFl.notes && (
                <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic', mt: 0.5 }}>
                  {drawerFl.notes}
                </Typography>
              )}
            </Stack>

            <Typography variant="subtitle2" fontWeight={700} color="text.secondary">
              Horas em {currentMonth}
            </Typography>
            {flEntries.length === 0 ? (
              <Typography variant="body2" color="text.disabled">Nenhuma entrada registrada.</Typography>
            ) : (
              <Stack spacing={0.75}>
                {flEntries.slice(0, 20).map((e: any) => (
                  <Stack key={e.id} direction="row" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Typography variant="caption" fontWeight={600}>{e.briefing_title ?? 'Job'}</Typography>
                      {e.description && (
                        <Typography variant="caption" color="text.secondary" display="block">{e.description}</Typography>
                      )}
                    </Box>
                    <Chip label={formatHours(e.minutes)} size="small" />
                  </Stack>
                ))}
              </Stack>
            )}

            <Button
              variant={drawerFl.is_active ? 'outlined' : 'contained'}
              color={drawerFl.is_active ? 'error' : 'success'}
              size="small"
              onClick={() => handleDeactivate(drawerFl.id, !drawerFl.is_active)}
            >
              {drawerFl.is_active ? 'Desativar' : 'Reativar'}
            </Button>
          </Stack>
        )}
      </Drawer>

      {/* New freelancer dialog */}
      <Dialog open={newOpen} onClose={() => setNewOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Novo Freelancer</DialogTitle>
        <DialogContent>
          <Stack spacing={2} pt={1}>
            <Tabs
              value={newMode}
              onChange={(_, value) => {
                setNewMode(value);
                if (value === 'new') {
                  setNewUserId('');
                } else {
                  setNewEmail('');
                }
              }}
              variant="fullWidth"
            >
              <Tab value="new" label="Criar novo" />
              <Tab value="existing" label="Vincular usuário" />
            </Tabs>

            <Alert severity="info" variant="outlined">
              Use <strong>Criar novo</strong> quando o freelancer ainda não existir no sistema.
              {' '}Use <strong>Vincular usuário</strong> só quando a pessoa já tiver conta.
            </Alert>

            {newMode === 'new' ? (
              <TextField
                label="E-mail de acesso"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                size="small"
                fullWidth
                placeholder="freela@exemplo.com"
                helperText="Esse e-mail vira a conta de acesso do freelancer no portal."
              />
            ) : (
              <Select
                value={newUserId}
                onChange={(e) => {
                  setNewUserId(e.target.value);
                  const u = users.find((u) => u.id === e.target.value);
                  if (u && !newName) setNewName(u.name ?? u.email.split('@')[0]);
                }}
                displayEmpty
                size="small"
                fullWidth
              >
                <MenuItem value="" disabled>Selecionar usuário existente</MenuItem>
                {users.map((u) => (
                  <MenuItem key={u.id} value={u.id}>
                    {u.name ?? u.email} ({u.role})
                  </MenuItem>
                ))}
              </Select>
            )}

            <TextField
              label="Nome de exibição"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              size="small"
              fullWidth
            />

            <Select
              value={newSpec}
              onChange={(e) => setNewSpec(e.target.value)}
              displayEmpty
              size="small"
              fullWidth
            >
              <MenuItem value=""><em>Especialidade (opcional)</em></MenuItem>
              <MenuItem value="copy">Copy</MenuItem>
              <MenuItem value="design">Design</MenuItem>
              <MenuItem value="video">Vídeo</MenuItem>
              <MenuItem value="revisao">Revisão</MenuItem>
              <MenuItem value="trafego">Tráfego</MenuItem>
            </Select>

            <TextField
              label="Taxa por hora (R$)"
              type="number"
              value={newRate}
              onChange={(e) => setNewRate(e.target.value)}
              size="small"
              fullWidth
              placeholder="Deixe vazio para flat-fee"
              helperText="Deixe vazio para cobrança por projeto"
            />

            <TextField
              label="Chave PIX"
              value={newPix}
              onChange={(e) => setNewPix(e.target.value)}
              size="small"
              fullWidth
              placeholder="CPF, e-mail ou chave aleatória"
            />

            <Divider><Typography variant="caption" color="text.secondary">Contato</Typography></Divider>

            <Stack direction="row" spacing={1.5}>
              <TextField
                label="Cargo"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                size="small"
                fullWidth
              />
              <TextField
                label="Departamento"
                value={newDept}
                onChange={(e) => setNewDept(e.target.value)}
                size="small"
                fullWidth
              />
            </Stack>
            <Stack direction="row" spacing={1.5}>
              <TextField
                label="Celular"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                size="small"
                fullWidth
                placeholder="(13) 99711-2202"
              />
              <TextField
                label="WhatsApp JID"
                value={newWhatsapp}
                onChange={(e) => setNewWhatsapp(e.target.value)}
                size="small"
                fullWidth
                placeholder="5511999@s.whatsapp.net"
              />
            </Stack>

            <Divider><Typography variant="caption" color="text.secondary">Dados Pessoais</Typography></Divider>

            <Stack direction="row" spacing={1.5}>
              <TextField
                label="CPF"
                value={newCpf}
                onChange={(e) => setNewCpf(e.target.value)}
                size="small"
                fullWidth
                placeholder="000.000.000-00"
              />
              <TextField
                label="RG"
                value={newRg}
                onChange={(e) => setNewRg(e.target.value)}
                size="small"
                fullWidth
                placeholder="00.000.000-0"
              />
              <TextField
                label="Nascimento"
                type="date"
                value={newBirth}
                onChange={(e) => setNewBirth(e.target.value)}
                size="small"
                fullWidth
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Stack>

            <Divider><Typography variant="caption" color="text.secondary">Dados Bancários</Typography></Divider>

            <Stack direction="row" spacing={1.5}>
              <TextField
                label="Banco"
                value={newBank}
                onChange={(e) => setNewBank(e.target.value)}
                size="small"
                fullWidth
                placeholder="077 - Inter"
              />
              <TextField
                label="Agência"
                value={newAgency}
                onChange={(e) => setNewAgency(e.target.value)}
                size="small"
                sx={{ width: 120 }}
                placeholder="0001"
              />
              <TextField
                label="Conta"
                value={newAccount}
                onChange={(e) => setNewAccount(e.target.value)}
                size="small"
                sx={{ width: 160 }}
                placeholder="331975343"
              />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            disabled={(!newName.trim() || (newMode === 'existing' ? !newUserId : !newEmail.trim()) || newSaving)}
            onClick={handleCreate}
          >
            {newSaving ? <CircularProgress size={16} /> : 'Criar'}
          </Button>
        </DialogActions>
      </Dialog>

      <style jsx global>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </AppShell>
  );
}
