'use client';

import { useCallback, useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { IconEye, IconEyeOff } from '@tabler/icons-react';
import { apiGet, apiPatch } from '@/lib/api';
import { cleanJobTitle } from '@/components/operations/model';

type PoolJob = {
  id: string;
  title: string;
  status: string;
  pool_visible: boolean;
  fee_brl: string | null;
  job_size: string | null;
  job_category: string | null;
  client_name: string | null;
  deadline_at: string | null;
  created_at: string;
};

const SIZES = ['PP', 'P', 'M', 'G', 'GG'];
const CATEGORIES = ['design', 'video', 'copy', 'management'];

function PoolJobRow({ job, onSaved }: { job: PoolJob; onSaved: () => void }) {
  const [fee, setFee] = useState(job.fee_brl ? parseFloat(job.fee_brl).toFixed(2) : '');
  const [size, setSize] = useState(job.job_size ?? '');
  const [category, setCategory] = useState(job.job_category ?? '');
  const [visible, setVisible] = useState(job.pool_visible);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  async function save() {
    setSaving(true); setErr('');
    try {
      await apiPatch(`/jobs/${job.id}/pool-visibility`, {
        pool_visible: visible,
        fee_brl: fee ? parseFloat(fee) : undefined,
        job_size: size || undefined,
        job_category: category || undefined,
      });
      onSaved();
    } catch (e: any) {
      setErr(e.message ?? 'Erro ao salvar');
    } finally { setSaving(false); }
  }

  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, borderColor: visible ? 'primary.main' : undefined }}>
      <Stack direction="row" alignItems="flex-start" spacing={2} flexWrap="wrap">
        <Box flex={1} minWidth={200}>
          <Typography fontWeight={700} fontSize={14} noWrap>{cleanJobTitle(job.title, job.client_name)}</Typography>
          <Typography variant="caption" color="text.secondary">{job.client_name ?? '—'}</Typography>
        </Box>

        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          <TextField
            size="small" label="Honorário R$" type="number"
            value={fee} onChange={e => setFee(e.target.value)}
            sx={{ width: 120 }}
          />
          <Select size="small" value={size} onChange={e => setSize(e.target.value)} displayEmpty sx={{ minWidth: 80 }}>
            <MenuItem value=""><em>Tamanho</em></MenuItem>
            {SIZES.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
          </Select>
          <Select size="small" value={category} onChange={e => setCategory(e.target.value)} displayEmpty sx={{ minWidth: 110 }}>
            <MenuItem value=""><em>Categoria</em></MenuItem>
            {CATEGORIES.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
          </Select>

          <Stack direction="row" alignItems="center" spacing={0.5}>
            <Switch
              checked={visible}
              onChange={e => setVisible(e.target.checked)}
              color="primary"
            />
            <Chip
              label={visible ? 'No Mercado' : 'Privado'}
              size="small"
              color={visible ? 'primary' : 'default'}
              icon={visible ? <IconEye size={12} /> : <IconEyeOff size={12} />}
            />
          </Stack>

          <Button
            size="small" variant="contained"
            onClick={save} disabled={saving}
            startIcon={saving ? <CircularProgress size={12} /> : undefined}
          >
            Salvar
          </Button>
        </Stack>
      </Stack>
      {err && <Alert severity="error" sx={{ mt: 1 }}>{err}</Alert>}
    </Paper>
  );
}

export default function PoolManagementPage() {
  const [filter, setFilter] = useState('all');
  const [jobs, setJobs] = useState<PoolJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res: any = await apiGet(`/jobs/pool-queue${filter !== 'all' ? `?status=${filter}` : ''}`);
      setJobs(res?.jobs ?? []);
    } catch { /* silent */ } finally { setIsLoading(false); }
  }, [filter]);

  useEffect(() => {
    setIsLoading(true);
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  const inPool    = jobs.filter(j => j.pool_visible).length;
  const notInPool = jobs.filter(j => !j.pool_visible).length;

  return (
    <AppShell title="Mercado de Escopos">
      <Box p={3}>
        <Typography variant="h5" fontWeight={800} mb={0.5}>🛒 Gestão do Mercado de Escopos</Typography>
        <Typography color="text.secondary" mb={2} fontSize={13}>
          Configure honorários e visibilidade dos jobs antes de liberar para freelancers.
        </Typography>

        <Stack direction="row" spacing={2} mb={3} flexWrap="wrap">
          <Chip label={`${inPool} no Mercado`} color="primary" variant="outlined" icon={<IconEye size={14} />} />
          <Chip label={`${notInPool} privados`} color="default" variant="outlined" icon={<IconEyeOff size={14} />} />
        </Stack>

        <ToggleButtonGroup value={filter} exclusive onChange={(_, v) => v && setFilter(v)} size="small" sx={{ mb: 3 }}>
          <ToggleButton value="all">Todos</ToggleButton>
          <ToggleButton value="in_pool">No Mercado</ToggleButton>
          <ToggleButton value="ready_to_pool">Prontos para liberar</ToggleButton>
        </ToggleButtonGroup>

        {isLoading ? (
          <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>
        ) : jobs.length === 0 ? (
          <Alert severity="info">Nenhum job encontrado para este filtro.</Alert>
        ) : (
          <Stack spacing={2}>
            {jobs.map(job => (
              <PoolJobRow key={job.id} job={job} onSaved={load} />
            ))}
          </Stack>
        )}
      </Box>
    </AppShell>
  );
}
