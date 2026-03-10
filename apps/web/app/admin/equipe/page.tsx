'use client';

import { useEffect, useState } from 'react';
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
  IconChartBar,
  IconCheck,
  IconClock,
  IconCurrencyDollar,
  IconEdit,
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
  active_timers?: { briefing_id: string; briefing_title?: string; started_at: string }[];
};

type TenantUser = {
  id: string;
  email: string;
  name: string | null;
  role: string;
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
};

const EMPTY_CONTACT_FORM: ContactForm = {
  phone: '',
  whatsapp_jid: '',
  department: '',
  role_title: '',
  email_personal: '',
  notes: '',
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
                  {!hasContact && !isEditing && (
                    <Typography variant="caption" color="text.disabled" sx={{ mt: 1, display: 'block', fontStyle: 'italic' }}>
                      Sem dados de contato — clique no lápis para adicionar
                    </Typography>
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

                  {/* Inline edit form */}
                  <Collapse in={isEditing} unmountOnExit>
                    <Divider sx={{ my: 1.5 }} />
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
                          fullWidth size="small" label="Telefone"
                          value={form.phone}
                          onChange={(e) => set({ phone: e.target.value })}
                          placeholder="+5511999999999"
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
                      <Grid size={{ xs: 12 }}>
                        <TextField
                          fullWidth size="small" label="Notas" multiline rows={2}
                          value={form.notes}
                          onChange={(e) => set({ notes: e.target.value })}
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

export default function EquipePage() {
  const [tab, setTab] = useState(0);

  const [freelancers, setFreelancers] = useState<FreelancerProfile[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [drawerFl, setDrawerFl]       = useState<FreelancerProfile | null>(null);
  const [flEntries, setFlEntries]     = useState<any[]>([]);
  const [flHours, setFlHours]         = useState<{ [id: string]: number }>({});

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
  const [newUserId,  setNewUserId]  = useState('');
  const [newName,    setNewName]    = useState('');
  const [newSpec,    setNewSpec]    = useState('');
  const [newRate,    setNewRate]    = useState('');
  const [newPix,     setNewPix]     = useState('');
  const [newSaving,  setNewSaving]  = useState(false);
  const [newPhone,   setNewPhone]   = useState('');
  const [newWhatsapp, setNewWhatsapp] = useState('');
  const [newRole,    setNewRole]    = useState('');
  const [newDept,    setNewDept]    = useState('');

  const currentMonth = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  })();

  const load = async () => {
    setLoading(true);
    try {
      const rows: FreelancerProfile[] = await apiGet('/freelancers');
      setFreelancers(rows);

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
  };

  useEffect(() => { load(); }, []);

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
    try {
      const res: any = await apiGet('/admin/users');
      setUsers(res.users ?? res ?? []);
    } catch { setUsers([]); }
  };

  const handleCreate = async () => {
    if (!newUserId || !newName) return;
    setNewSaving(true);
    try {
      await apiPost('/freelancers', {
        user_id: newUserId,
        display_name: newName,
        specialty: newSpec || null,
        hourly_rate_brl: newRate ? parseFloat(newRate) : null,
        pix_key: newPix || null,
        phone: newPhone || null,
        whatsapp_jid: newWhatsapp || null,
        role_title: newRole || null,
        department: newDept || null,
      });
      setNewOpen(false);
      setNewUserId(''); setNewName(''); setNewSpec(''); setNewRate(''); setNewPix('');
      setNewPhone(''); setNewWhatsapp(''); setNewRole(''); setNewDept('');
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
          <Button variant="contained" startIcon={<IconPlus size={16} />} onClick={openNew} size="small">
            Novo Freelancer
          </Button>
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

        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Tab label="Equipe" />
          <Tab icon={<IconUsers size={15} />} iconPosition="start" label="Contatos" sx={{ fontSize: '0.85rem' }} />
          <Tab label="Analytics do Mês" />
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

        {tab === 0 && loading ? (
          <Stack alignItems="center" py={6}><CircularProgress /></Stack>
        ) : tab === 0 && (
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
              {drawerFl.pix_key && (
                <Typography variant="body2"><strong>PIX:</strong> {drawerFl.pix_key}</Typography>
              )}
              {(drawerFl.phone || drawerFl.email_personal || drawerFl.whatsapp_jid) && (
                <>
                  <Divider sx={{ my: 0.5 }} />
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

            <Divider><Typography variant="caption" color="text.secondary">Contato (opcional)</Typography></Divider>

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
                label="Telefone"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                size="small"
                fullWidth
                placeholder="+5511999999999"
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
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            disabled={!newUserId || !newName || newSaving}
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
