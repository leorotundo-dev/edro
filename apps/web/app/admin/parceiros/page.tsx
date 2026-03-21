'use client';

import { useCallback, useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { IconEdit, IconPlus, IconTrash } from '@tabler/icons-react';
import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api';

type Partner = {
  id: string;
  category: string;
  name: string;
  description: string | null;
  logo_emoji: string;
  discount_text: string | null;
  link_url: string | null;
  is_active: boolean;
  sort_order: number;
};

const CATEGORIES = [
  { value: 'contabilidade', label: 'Contabilidade' },
  { value: 'software', label: 'Software' },
  { value: 'coworking', label: 'Coworking' },
  { value: 'educacao', label: 'Educação' },
  { value: 'banco', label: 'Banco' },
  { value: 'outro', label: 'Outro' },
];

const BLANK: Omit<Partner, 'id' | 'sort_order'> = {
  category: 'outro',
  name: '',
  description: '',
  logo_emoji: '🤝',
  discount_text: '',
  link_url: '',
  is_active: true,
};

function PartnerDialog({
  open,
  initial,
  onClose,
  onSaved,
}: {
  open: boolean;
  initial: Partner | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<Omit<Partner, 'id' | 'sort_order'>>(BLANK);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (open) {
      setForm(initial ? {
        category: initial.category,
        name: initial.name,
        description: initial.description ?? '',
        logo_emoji: initial.logo_emoji,
        discount_text: initial.discount_text ?? '',
        link_url: initial.link_url ?? '',
        is_active: initial.is_active,
      } : BLANK);
      setErr('');
    }
  }, [open, initial]);

  const set = (field: string, val: unknown) => setForm((f) => ({ ...f, [field]: val }));

  const save = async () => {
    if (!form.name.trim()) { setErr('Nome obrigatório'); return; }
    setSaving(true); setErr('');
    try {
      if (initial) {
        await apiPatch(`/freelancers/admin/partners/${initial.id}`, form);
      } else {
        await apiPost('/freelancers/admin/partners', form);
      }
      onSaved();
      onClose();
    } catch (e: any) {
      setErr(e.message ?? 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{initial ? 'Editar Parceiro' : 'Novo Parceiro'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} mt={1}>
          <Stack direction="row" spacing={1}>
            <TextField
              label="Emoji Logo"
              value={form.logo_emoji}
              onChange={(e) => set('logo_emoji', e.target.value)}
              sx={{ width: 100 }}
              inputProps={{ maxLength: 4 }}
            />
            <TextField
              label="Nome"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              fullWidth
              required
            />
          </Stack>

          <Select
            value={form.category}
            onChange={(e) => set('category', e.target.value)}
            size="small"
            displayEmpty
          >
            {CATEGORIES.map((c) => (
              <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>
            ))}
          </Select>

          <TextField
            label="Descrição"
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            multiline rows={2}
            fullWidth
          />
          <TextField
            label="Desconto / Benefício"
            value={form.discount_text}
            onChange={(e) => set('discount_text', e.target.value)}
            placeholder="ex: 20% off no plano anual"
            fullWidth
          />
          <TextField
            label="Link"
            value={form.link_url}
            onChange={(e) => set('link_url', e.target.value)}
            placeholder="https://..."
            fullWidth
          />
          <FormControlLabel
            control={<Switch checked={form.is_active} onChange={(e) => set('is_active', e.target.checked)} />}
            label="Visível no portal freelancer"
          />
          {err && <Alert severity="error">{err}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" disabled={saving} onClick={save}>
          {saving ? <CircularProgress size={16} /> : 'Salvar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function ParceirosAdminPage() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Partner | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res: any = await apiGet('/freelancers/admin/partners');
      setPartners(res?.partners ?? []);
    } catch { /* silent */ } finally { setIsLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: string) => {
    if (!confirm('Remover este parceiro?')) return;
    setDeleting(id);
    try {
      await apiDelete(`/freelancers/admin/partners/${id}`);
      load();
    } catch (e: any) {
      alert(e.message ?? 'Erro');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <AppShell title="Parceiros">
      <Box sx={{ p: 3, maxWidth: 900 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3}>
          <Box>
            <Typography variant="h5" fontWeight={800}>Hub de Parceiros</Typography>
            <Typography variant="body2" color="text.secondary" mt={0.5}>
              Benefícios e descontos exibidos no portal dos freelancers.
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<IconPlus size={16} />}
            onClick={() => { setEditing(null); setDialogOpen(true); }}
          >
            Novo Parceiro
          </Button>
        </Stack>

        {isLoading ? (
          <Stack alignItems="center" py={6}><CircularProgress /></Stack>
        ) : partners.length === 0 ? (
          <Alert severity="info">Nenhum parceiro cadastrado ainda. Clique em "Novo Parceiro" para adicionar.</Alert>
        ) : (
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Parceiro</TableCell>
                  <TableCell>Categoria</TableCell>
                  <TableCell>Benefício</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {partners.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Typography fontSize={20}>{p.logo_emoji}</Typography>
                        <Box>
                          <Typography variant="body2" fontWeight={600}>{p.name}</Typography>
                          {p.description && (
                            <Typography variant="caption" color="text.secondary">{p.description}</Typography>
                          )}
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Chip label={CATEGORIES.find((c) => c.value === p.category)?.label ?? p.category} size="small" />
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">{p.discount_text ?? '—'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={p.is_active ? 'Ativo' : 'Inativo'}
                        size="small"
                        color={p.is_active ? 'success' : 'default'}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                        <IconButton size="small" onClick={() => { setEditing(p); setDialogOpen(true); }}>
                          <IconEdit size={15} />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          disabled={deleting === p.id}
                          onClick={() => handleDelete(p.id)}
                        >
                          {deleting === p.id ? <CircularProgress size={14} /> : <IconTrash size={15} />}
                        </IconButton>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>

      <PartnerDialog
        open={dialogOpen}
        initial={editing}
        onClose={() => setDialogOpen(false)}
        onSaved={load}
      />
    </AppShell>
  );
}
