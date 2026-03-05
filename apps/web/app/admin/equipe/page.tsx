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
import { IconClock, IconPlus, IconUserCheck } from '@tabler/icons-react';
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

export default function EquipePage() {
  const [freelancers, setFreelancers] = useState<FreelancerProfile[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [drawerFl, setDrawerFl]       = useState<FreelancerProfile | null>(null);
  const [flEntries, setFlEntries]     = useState<any[]>([]);
  const [flHours, setFlHours]         = useState<{ [id: string]: number }>({});

  // New freelancer dialog
  const [newOpen,    setNewOpen]    = useState(false);
  const [users,      setUsers]      = useState<TenantUser[]>([]);
  const [newUserId,  setNewUserId]  = useState('');
  const [newName,    setNewName]    = useState('');
  const [newSpec,    setNewSpec]    = useState('');
  const [newRate,    setNewRate]    = useState('');
  const [newPix,     setNewPix]     = useState('');
  const [newSaving,  setNewSaving]  = useState(false);

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
      });
      setNewOpen(false);
      setNewUserId(''); setNewName(''); setNewSpec(''); setNewRate(''); setNewPix('');
      await load();
    } catch (e: any) {
      alert(e.message ?? 'Erro ao criar freelancer');
    } finally {
      setNewSaving(false);
    }
  };

  return (
    <AppShell title="Equipe">
      <Box sx={{ p: 3, maxWidth: 1100 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <IconUserCheck size={22} />
            <Typography variant="h5" fontWeight={700}>Equipe</Typography>
          </Stack>
          <Button variant="contained" startIcon={<IconPlus size={16} />} onClick={openNew} size="small">
            Novo Freelancer
          </Button>
        </Stack>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {loading ? (
          <Stack alignItems="center" py={6}><CircularProgress /></Stack>
        ) : (
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
              <Typography variant="body2">
                <strong>Taxa:</strong>{' '}
                {drawerFl.hourly_rate_brl ? `R$ ${parseFloat(drawerFl.hourly_rate_brl).toFixed(2)}/h` : 'Projeto (flat-fee)'}
              </Typography>
              {drawerFl.pix_key && (
                <Typography variant="body2"><strong>PIX:</strong> {drawerFl.pix_key}</Typography>
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
