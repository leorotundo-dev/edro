'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api';
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
import Checkbox from '@mui/material/Checkbox';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import FormControlLabel from '@mui/material/FormControlLabel';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Link from '@mui/material/Link';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import {
  IconAddressBook, IconBrandGoogle, IconBrandWhatsapp, IconBuilding,
  IconEdit, IconMail, IconGitMerge, IconMicrophone,
  IconPhone, IconRefresh, IconSearch, IconTrash, IconUser, IconUsersGroup, IconX,
} from '@tabler/icons-react';
import AppShell from '@/components/AppShell';
import AdminSubmenu from '@/components/admin/AdminSubmenu';

// ── Types ─────────────────────────────────────────────────────────────────

type Identity = { type: string; value: string; primary: boolean };
type ClientLink = { client_id: string; client_name: string; contact_name: string; role: string | null };
type Person = {
  id: string;
  display_name: string;
  is_internal: boolean;
  avatar_url: string | null;
  notes: string | null;
  created_at: string;
  identities: Identity[] | null;
  client_links: ClientLink[] | null;
  meeting_count: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────

function isNameless(p: Person) {
  const n = (p.display_name || '').trim();
  return n === '' || n === 'Pessoa sem nome';
}

function initials(name: string) {
  return (name || '').split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '?';
}

function primaryEmail(ids: Identity[] | null) {
  if (!ids) return null;
  return ids.find((i) => i.type === 'email' && i.primary)?.value
    ?? ids.find((i) => i.type === 'email')?.value ?? null;
}

function identityIcon(type: string) {
  if (type === 'email') return <IconMail size={11} />;
  if (type === 'phone_e164') return <IconPhone size={11} />;
  if (type === 'whatsapp_jid') return <IconBrandWhatsapp size={11} />;
  return <IconUser size={11} />;
}

function identityLabel(id: Identity) {
  const v = id.value;
  if (id.type === 'whatsapp_jid') return v.replace(/@.*/, '') + ' (WA)';
  if (v.length > 24) return v.slice(0, 22) + '…';
  return v;
}

// ── PersonCard ────────────────────────────────────────────────────────────

function PersonCard({
  person, allPeople, onEdit, onDelete, onMerge, selectMode, selected, active, onSelect, onOpen,
}: {
  person: Person;
  allPeople: Person[];
  onEdit: (p: Person) => void;
  onDelete: (p: Person) => void;
  onMerge: (keep: Person, discard: Person) => void;
  selectMode: boolean;
  selected: boolean;
  active: boolean;
  onSelect: (id: string) => void;
  onOpen: (person: Person) => void;
}) {
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  const email = primaryEmail(person.identities);
  const ids = (person.identities ?? []).filter((i) => !(i.type === 'email' && i.value === email));
  const clients = person.client_links ?? [];
  const meetings = Number(person.meeting_count);

  // Duplicates: same real display_name, different id — nameless people are NOT flagged
  const dups = isNameless(person) ? [] : allPeople.filter(
    (p) => !isNameless(p) && p.id !== person.id && p.display_name.trim().toLowerCase() === person.display_name.trim().toLowerCase(),
  );

  return (
    <Box
      onClick={selectMode ? () => onSelect(person.id) : () => onOpen(person)}
      sx={{
        borderRadius: 2,
        border: `1px solid ${selected ? theme.palette.warning.main : active ? theme.palette.primary.main : dark ? alpha('#fff', 0.07) : alpha('#000', 0.07)}`,
        bgcolor: selected
          ? alpha(theme.palette.warning.main, 0.08)
          : active
            ? alpha(theme.palette.primary.main, 0.06)
            : dark
              ? alpha('#fff', 0.02)
              : '#fff',
        p: 2,
        display: 'flex',
        flexDirection: 'column',
        gap: 1.25,
        position: 'relative',
        cursor: selectMode ? 'pointer' : 'default',
        transition: 'border-color 0.15s, background-color 0.15s',
        '&:hover .person-actions': { opacity: selectMode ? 0 : 1 },
      }}>
      {/* Select checkbox (merge mode) */}
      {selectMode && (
        <Checkbox
          checked={selected}
          onChange={() => onSelect(person.id)}
          onClick={(e) => e.stopPropagation()}
          size="small"
          color="warning"
          sx={{ position: 'absolute', top: 4, left: 4, p: 0.5 }}
        />
      )}

      {/* Actions */}
      <Stack
        className="person-actions"
        direction="row"
        spacing={0.25}
        sx={{ position: 'absolute', top: 8, right: 8, opacity: 0, transition: 'opacity 0.15s' }}
      >
        {dups.length > 0 && (
          <Tooltip title={`Merge com ${dups[0].display_name}`}>
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onMerge(person, dups[0]);
              }}
              sx={{ color: 'warning.main' }}>
              <IconGitMerge size={14} />
            </IconButton>
          </Tooltip>
        )}
        <Tooltip title="Editar">
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(person);
            }}
            sx={{ color: 'text.secondary' }}>
            <IconEdit size={14} />
          </IconButton>
        </Tooltip>
        <Tooltip title="Excluir">
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(person);
            }}
            sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' } }}>
            <IconTrash size={14} />
          </IconButton>
        </Tooltip>
      </Stack>

      {/* Header */}
      <Stack direction="row" spacing={1.25} alignItems="center">
        <Avatar
          src={person.avatar_url ?? undefined}
          sx={{
            width: 38, height: 38, fontSize: '0.78rem', fontWeight: 700, flexShrink: 0,
            bgcolor: person.is_internal ? alpha(theme.palette.primary.main, 0.15) : alpha(theme.palette.warning.main, 0.12),
            color: person.is_internal ? 'primary.main' : 'warning.dark',
          }}>
          {initials(person.display_name)}
        </Avatar>
        <Box sx={{ minWidth: 0, pr: 5 }}>
          <Typography variant="body2" fontWeight={800} noWrap sx={{ lineHeight: 1.2 }}>
            {person.display_name}
          </Typography>
          {email && (
            <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block', fontSize: '0.7rem' }}>
              {email}
            </Typography>
          )}
        </Box>
      </Stack>

      {/* Identities */}
      {ids.length > 0 && (
        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
          {ids.slice(0, 4).map((id, i) => (
            <Tooltip key={i} title={`${id.type}: ${id.value}`}>
              <Chip
                icon={identityIcon(id.type)}
                label={identityLabel(id)}
                size="small"
                variant="outlined"
                sx={{ fontSize: '0.63rem', height: 20, maxWidth: 160 }}
              />
            </Tooltip>
          ))}
        </Stack>
      )}

      {/* Client links */}
      {clients.length > 0 && (
        <Stack spacing={0.4}>
          {clients.slice(0, 2).map((cl, i) => (
            <Stack key={i} direction="row" spacing={0.5} alignItems="center">
              <IconBuilding size={11} style={{ opacity: 0.45, flexShrink: 0 }} />
              <Link href={`/clients/${cl.client_id}`} underline="hover"
                sx={{ fontSize: '0.72rem', fontWeight: 700, color: 'warning.dark' }} noWrap>
                {cl.client_name}
              </Link>
              {cl.role && (
                <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem' }}>
                  · {cl.role}
                </Typography>
              )}
            </Stack>
          ))}
          {clients.length > 2 && (
            <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem' }}>
              +{clients.length - 2} clientes
            </Typography>
          )}
        </Stack>
      )}

      {/* Footer row */}
      <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
        <Chip
          label={person.is_internal ? 'Interno' : 'Externo'}
          size="small"
          color={person.is_internal ? 'primary' : 'default'}
          sx={{ fontSize: '0.63rem', height: 18, fontWeight: 700 }}
        />
        {meetings > 0 && (
          <Stack direction="row" spacing={0.4} alignItems="center">
            <IconMicrophone size={11} style={{ opacity: 0.45 }} />
            <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ fontSize: '0.7rem' }}>
              {meetings} reunião{meetings !== 1 ? 'ões' : ''}
            </Typography>
          </Stack>
        )}
        {dups.length > 0 && (
          <Chip label="Duplicado" size="small" color="warning" variant="outlined"
            sx={{ fontSize: '0.6rem', height: 18, fontWeight: 700 }} />
        )}
      </Stack>

      {person.notes && (
        <Typography variant="caption" color="text.secondary"
          sx={{ fontSize: '0.68rem', fontStyle: 'italic', borderTop: `1px solid ${theme.palette.divider}`, pt: 0.75 }}>
          {person.notes.slice(0, 120)}{person.notes.length > 120 ? '…' : ''}
        </Typography>
      )}
    </Box>
  );
}

// ── EditDrawer ────────────────────────────────────────────────────────────

function EditDrawer({ person, onClose, onSaved }: {
  person: Person | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState('');
  const [internal, setInternal] = useState(false);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (person) {
      setName(person.display_name);
      setInternal(person.is_internal);
      setNotes(person.notes ?? '');
      setError('');
    }
  }, [person]);

  const save = async () => {
    if (!person) return;
    setSaving(true);
    setError('');
    try {
      await apiPatch(`/people/${person.id}`, {
        display_name: name.trim(),
        is_internal: internal,
        notes: notes.trim() || null,
      });
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err?.message ?? 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer anchor="right" open={Boolean(person)} onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100%', sm: 400 }, p: 3 } }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h6" fontWeight={800}>Editar pessoa</Typography>
        <IconButton onClick={onClose}><IconX size={18} /></IconButton>
      </Stack>

      <Stack spacing={2.5}>
        <TextField
          label="Nome"
          value={name}
          onChange={(e) => setName(e.target.value)}
          fullWidth
          size="small"
        />
        <FormControlLabel
          control={<Switch checked={internal} onChange={(e) => setInternal(e.target.checked)} />}
          label={<Typography variant="body2" fontWeight={600}>Pessoa interna (equipe Edro)</Typography>}
        />
        <TextField
          label="Notas"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          multiline
          rows={3}
          fullWidth
          size="small"
          placeholder="Informações adicionais sobre essa pessoa..."
        />

        {/* Identities — read-only for now */}
        {person?.identities && person.identities.length > 0 && (
          <Box>
            <Typography variant="caption" fontWeight={700} color="text.secondary"
              sx={{ textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.68rem', display: 'block', mb: 0.75 }}>
              Contatos detectados
            </Typography>
            <Stack spacing={0.5}>
              {person.identities.map((id, i) => (
                <Stack key={i} direction="row" spacing={0.75} alignItems="center">
                  <Box sx={{ color: 'text.disabled' }}>{identityIcon(id.type)}</Box>
                  <Typography variant="caption" sx={{ fontSize: '0.72rem' }}>{id.value}</Typography>
                  {id.primary && <Chip label="principal" size="small" sx={{ height: 16, fontSize: '0.58rem' }} />}
                </Stack>
              ))}
            </Stack>
          </Box>
        )}

        {/* Client links — read-only */}
        {person?.client_links && person.client_links.length > 0 && (
          <Box>
            <Typography variant="caption" fontWeight={700} color="text.secondary"
              sx={{ textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.68rem', display: 'block', mb: 0.75 }}>
              Clientes vinculados
            </Typography>
            <Stack spacing={0.5}>
              {person.client_links.map((cl, i) => (
                <Stack key={i} direction="row" spacing={0.75} alignItems="center">
                  <IconBuilding size={12} style={{ opacity: 0.5 }} />
                  <Link href={`/clients/${cl.client_id}`} underline="hover"
                    sx={{ fontSize: '0.78rem', fontWeight: 700 }}>
                    {cl.client_name}
                  </Link>
                  {cl.role && <Typography variant="caption" color="text.secondary">· {cl.role}</Typography>}
                </Stack>
              ))}
            </Stack>
          </Box>
        )}

        {error && <Alert severity="error">{error}</Alert>}

        <Stack direction="row" spacing={1} sx={{ pt: 1 }}>
          <Button variant="contained" onClick={save} disabled={saving || !name.trim()} fullWidth>
            {saving ? <CircularProgress size={16} color="inherit" /> : 'Salvar'}
          </Button>
          <Button variant="outlined" onClick={onClose} disabled={saving}>Cancelar</Button>
        </Stack>
      </Stack>
    </Drawer>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────

export default function PeopleDirectoryClient({ embedded = false }: { embedded?: boolean }) {
  const theme = useTheme();
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<'all' | 'internal' | 'external'>('all');

  // Edit
  const [editPerson, setEditPerson] = useState<Person | null>(null);

  // Delete
  const [deletePerson, setDeletePerson] = useState<Person | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Merge
  const [mergeKeep, setMergeKeep] = useState<Person | null>(null);
  const [mergeDiscard, setMergeDiscard] = useState<Person | null>(null);
  const [merging, setMerging] = useState(false);
  const [mergeError, setMergeError] = useState('');

  // Cleanup nameless
  const [cleaningNameless, setCleaningNameless] = useState(false);

  // Google Contacts sync
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  const handleSyncContacts = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await apiPost<{ success: boolean; upserted: number; skipped: number; error?: string; message?: string }>('/people/sync-contacts', {});
      if (res?.error === 'needs_reauth') {
        setSyncResult('Reconecte o Gmail em Integrações para autorizar o acesso aos contatos.');
      } else {
        setSyncResult(`${res?.upserted ?? 0} contatos sincronizados.`);
        await load(q, filter);
      }
    } catch (err: any) {
      setSyncResult(err?.message ?? 'Erro ao sincronizar contatos.');
    } finally {
      setSyncing(false);
    }
  };

  // Manual merge selection
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [focusedPersonId, setFocusedPersonId] = useState<string | null>(null);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); return next; }
      if (next.size >= 2) return prev; // max 2
      next.add(id);
      return next;
    });
  };

  const exitSelectMode = () => { setSelectMode(false); setSelectedIds(new Set()); };

  const selectedPeople = people.filter((p) => selectedIds.has(p.id));

  useEffect(() => {
    if (people.length === 0) {
      setFocusedPersonId(null);
      return;
    }
    setFocusedPersonId((prev) => (
      prev && people.some((person) => person.id === prev) ? prev : people[0].id
    ));
  }, [people]);

  const load = useCallback(async (search: string, f: typeof filter) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ limit: '200' });
      if (search) params.set('q', search);
      if (f === 'internal') params.set('internal', 'true');
      if (f === 'external') params.set('internal', 'false');
      const res = await apiGet<{ success: boolean; data: Person[] }>(`/people?${params}`);
      setPeople(res?.data ?? []);
    } catch (err: any) {
      setError(err?.message ?? 'Erro ao carregar pessoas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => load(q, filter), q ? 300 : 0);
    return () => clearTimeout(timer);
  }, [q, filter, load]);

  const handleDelete = async () => {
    if (!deletePerson) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await apiDelete(`/people/${deletePerson.id}`);
      setPeople((prev) => prev.filter((p) => p.id !== deletePerson.id));
      setDeletePerson(null);
    } catch (err: any) {
      setDeleteError(err?.message ?? 'Erro ao excluir');
    } finally {
      setDeleting(false);
    }
  };

  const handleMerge = async () => {
    if (!mergeKeep || !mergeDiscard) return;
    setMerging(true);
    setMergeError('');
    try {
      await apiPost(`/people/${mergeKeep.id}/merge`, { target_id: mergeDiscard.id });
      setMergeKeep(null);
      setMergeDiscard(null);
      await load(q, filter);
    } catch (err: any) {
      setMergeError(err?.message ?? 'Erro ao fazer merge');
    } finally {
      setMerging(false);
    }
  };

  const handleCleanupNameless = async () => {
    setCleaningNameless(true);
    try {
      await apiDelete('/people/nameless');
      await load(q, filter);
    } finally {
      setCleaningNameless(false);
    }
  };

  const internal = people.filter((p) => p.is_internal).length;
  const external = people.filter((p) => !p.is_internal).length;
  const namelessPeople = people.filter(isNameless);
  const duplicateGroups = people.filter((p) =>
    !isNameless(p) && people.some((other) => !isNameless(other) && other.id !== p.id && other.display_name.trim().toLowerCase() === p.display_name.trim().toLowerCase()),
  ).length;
  const focusedPerson = people.find((person) => person.id === focusedPersonId) ?? null;
  const focusedEmail = primaryEmail(focusedPerson?.identities ?? null);
  const focusedDuplicateCount = focusedPerson && !isNameless(focusedPerson)
    ? people.filter(
        (other) =>
          other.id !== focusedPerson.id &&
          !isNameless(other) &&
          other.display_name.trim().toLowerCase() === focusedPerson.display_name.trim().toLowerCase(),
      ).length
    : 0;

  const content = (
      <Box sx={{ p: embedded ? 0 : { xs: 2, md: 3 } }}>
        {/* Header */}
        {!embedded ? (
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 3 }}>
            <Box sx={{
              width: 40, height: 40, borderRadius: 2,
              bgcolor: alpha(theme.palette.primary.main, 0.12),
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'primary.main',
            }}>
              <IconAddressBook size={22} />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" fontWeight={800}>Diretório de Pessoas</Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="caption" color="text.secondary">
                  {internal} internos · {external} externos · {people.length} total
                </Typography>
                {duplicateGroups > 0 && (
                  <Chip label={`${duplicateGroups} duplicados`} size="small" color="warning"
                    sx={{ fontSize: '0.65rem', height: 18, fontWeight: 700 }} />
                )}
              </Stack>
            </Box>
            <Tooltip title="Importar contatos do Google Contacts">
              <Button
                size="small"
                variant="outlined"
                onClick={handleSyncContacts}
                disabled={syncing}
                startIcon={syncing ? <CircularProgress size={14} color="inherit" /> : <IconBrandGoogle size={14} />}
                sx={{ fontWeight: 700, fontSize: '0.72rem', textTransform: 'none', whiteSpace: 'nowrap' }}
              >
                {syncing ? 'Sincronizando...' : 'Google Contacts'}
              </Button>
            </Tooltip>
          </Stack>
        ) : (
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} alignItems={{ xs: 'flex-start', sm: 'center' }} sx={{ mb: 2.5 }}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ flex: 1 }}>
              <Chip label={`${people.length} pessoas`} size="small" variant="outlined" />
              <Chip label={`${internal} internos`} size="small" color="primary" variant="outlined" />
              <Chip label={`${external} externos`} size="small" variant="outlined" />
              {duplicateGroups > 0 && (
                <Chip label={`${duplicateGroups} duplicados`} size="small" color="warning" variant="outlined" />
              )}
            </Stack>
            <Tooltip title="Importar contatos do Google Contacts">
              <Button
                size="small"
                variant="outlined"
                onClick={handleSyncContacts}
                disabled={syncing}
                startIcon={syncing ? <CircularProgress size={14} color="inherit" /> : <IconBrandGoogle size={14} />}
                sx={{ fontWeight: 700, fontSize: '0.72rem', textTransform: 'none', whiteSpace: 'nowrap' }}
              >
                {syncing ? 'Sincronizando...' : 'Google Contacts'}
              </Button>
            </Tooltip>
          </Stack>
        )}

        {syncResult && (
          <Alert
            severity={syncResult.includes('Reconecte') ? 'warning' : 'success'}
            onClose={() => setSyncResult(null)}
            sx={{ mb: 2 }}
            icon={<IconRefresh size={16} />}
          >
            {syncResult}
          </Alert>
        )}

        <Grid container spacing={1.5} sx={{ mb: 2.5 }}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Box
              sx={{
                borderRadius: 3,
                border: `1px solid ${alpha(theme.palette.primary.main, 0.12)}`,
                bgcolor: alpha(theme.palette.primary.main, 0.04),
                px: 2,
                py: 1.75,
              }}
            >
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                Diretório vivo
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5 }}>
                {people.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                pessoas identificadas entre equipe, clientes e reuniões.
              </Typography>
            </Box>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Box
              sx={{
                borderRadius: 3,
                border: `1px solid ${alpha(theme.palette.warning.main, 0.18)}`,
                bgcolor: alpha(theme.palette.warning.main, 0.06),
                px: 2,
                py: 1.75,
              }}
            >
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                Higiene do diretório
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5 }}>
                {duplicateGroups + namelessPeople.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {duplicateGroups} duplicados e {namelessPeople.length} registros sem nome pedindo limpeza.
              </Typography>
            </Box>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Box
              sx={{
                borderRadius: 3,
                border: `1px solid ${alpha(theme.palette.success.main, 0.18)}`,
                bgcolor: alpha(theme.palette.success.main, 0.06),
                px: 2,
                py: 1.75,
              }}
            >
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                Origem do diretório
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5 }}>
                {internal} / {external}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                internos vs. externos, com sync de contatos e merge manual no mesmo lugar.
              </Typography>
            </Box>
          </Grid>
        </Grid>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2.5 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Buscar por nome, email, WhatsApp..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            InputProps={{
              startAdornment: <InputAdornment position="start"><IconSearch size={16} style={{ opacity: 0.4 }} /></InputAdornment>,
            }}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
          />
          <ToggleButtonGroup value={filter} exclusive onChange={(_e, v) => { if (v) setFilter(v); }}
            size="small" sx={{ flexShrink: 0 }}>
            <ToggleButton value="all" sx={{ px: 1.5, py: 0.5, fontSize: '0.72rem', fontWeight: 700, textTransform: 'none' }}>Todos</ToggleButton>
            <ToggleButton value="internal" sx={{ px: 1.5, py: 0.5, fontSize: '0.72rem', fontWeight: 700, textTransform: 'none' }}>
              <IconUsersGroup size={13} style={{ marginRight: 4 }} />Internos
            </ToggleButton>
            <ToggleButton value="external" sx={{ px: 1.5, py: 0.5, fontSize: '0.72rem', fontWeight: 700, textTransform: 'none' }}>
              <IconUser size={13} style={{ marginRight: 4 }} />Externos
            </ToggleButton>
          </ToggleButtonGroup>
          <Tooltip title="Selecione 2 cards para unificar manualmente">
            <Button
              size="small"
              variant={selectMode ? 'contained' : 'outlined'}
              color="warning"
              startIcon={<IconGitMerge size={14} />}
              onClick={() => selectMode ? exitSelectMode() : setSelectMode(true)}
              sx={{ flexShrink: 0, fontWeight: 700, fontSize: '0.72rem', textTransform: 'none', whiteSpace: 'nowrap' }}
            >
              {selectMode ? 'Cancelar merge' : 'Merge manual'}
            </Button>
          </Tooltip>
        </Stack>

        {selectMode && (
          <Stack direction="row" spacing={1} alignItems="center" sx={{
            px: 2, py: 1, borderRadius: 2, mb: 2,
            bgcolor: alpha(theme.palette.warning.main, 0.08),
            border: `1px solid ${alpha(theme.palette.warning.main, 0.3)}`,
          }}>
            <Typography variant="body2" fontWeight={700} color="warning.dark" sx={{ flex: 1 }}>
              {selectedIds.size === 0 && 'Selecione 2 cards para unificar'}
              {selectedIds.size === 1 && 'Selecione mais 1 card'}
              {selectedIds.size === 2 && `${selectedPeople[0]?.display_name} + ${selectedPeople[1]?.display_name}`}
            </Typography>
            {selectedIds.size === 2 && (
              <Button size="small" variant="contained" color="warning" startIcon={<IconGitMerge size={14} />}
                onClick={() => {
                  setMergeKeep(selectedPeople[0]);
                  setMergeDiscard(selectedPeople[1]);
                  setMergeError('');
                  exitSelectMode();
                }}>
                Fazer merge
              </Button>
            )}
            <Button size="small" variant="outlined" color="inherit" onClick={exitSelectMode}>Cancelar</Button>
          </Stack>
        )}

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Grid container spacing={2.5} alignItems="flex-start">
          <Grid size={{ xs: 12, xl: 8.5 }}>
            <Stack spacing={2}>
              {namelessPeople.length > 0 && (
                <Alert severity="error"
                  action={
                    <Button size="small" color="inherit" variant="outlined" onClick={handleCleanupNameless} disabled={cleaningNameless}
                      sx={{ whiteSpace: 'nowrap', fontWeight: 700, fontSize: '0.72rem' }}>
                      {cleaningNameless ? <CircularProgress size={14} color="inherit" /> : `Limpar ${namelessPeople.length}`}
                    </Button>
                  }>
                  <strong>{namelessPeople.length} pessoas sem nome</strong> detectadas. Limpe esses registros para o diretório não perder contexto.
                </Alert>
              )}

              {duplicateGroups > 0 && (
                <Alert severity="warning">
                  <strong>{duplicateGroups} pessoas com nome duplicado</strong> detectadas. Abra uma ficha e use merge para consolidar o diretório.
                </Alert>
              )}

              {loading ? (
                <Box sx={{ py: 8, display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>
              ) : people.length === 0 ? (
                <Box sx={{ py: 8, textAlign: 'center' }}>
                  <Typography color="text.secondary">Nenhuma pessoa encontrada.</Typography>
                </Box>
              ) : (
                <Grid container spacing={1.5}>
                  {people.map((person) => (
                    <Grid key={person.id} size={{ xs: 12, sm: 6, xl: 4 }}>
                      <PersonCard
                        person={person}
                        allPeople={people}
                        onEdit={setEditPerson}
                        onDelete={setDeletePerson}
                        onMerge={(keep, discard) => { setMergeKeep(keep); setMergeDiscard(discard); setMergeError(''); }}
                        selectMode={selectMode}
                        selected={selectedIds.has(person.id)}
                        active={person.id === focusedPersonId}
                        onSelect={toggleSelect}
                        onOpen={(openedPerson) => setFocusedPersonId(openedPerson.id)}
                      />
                    </Grid>
                  ))}
                </Grid>
              )}
            </Stack>
          </Grid>

          <Grid size={{ xs: 12, xl: 3.5 }}>
            <Box
              sx={{
                position: { xl: 'sticky' },
                top: { xl: 96 },
                borderRadius: 3,
                border: `1px solid ${alpha(theme.palette.primary.main, 0.12)}`,
                bgcolor: alpha(theme.palette.primary.main, 0.02),
                p: 2.25,
              }}
            >
              <Stack spacing={2}>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase' }}>
                    Pessoa em foco
                  </Typography>
                  {focusedPerson ? (
                    <Stack spacing={1.25} sx={{ mt: 1.25 }}>
                      <Stack direction="row" spacing={1.25} alignItems="center">
                        <Avatar src={focusedPerson.avatar_url ?? undefined} sx={{ width: 44, height: 44 }}>
                          {initials(focusedPerson.display_name)}
                        </Avatar>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="body1" fontWeight={800} noWrap>
                            {focusedPerson.display_name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" noWrap>
                            {focusedEmail ?? 'Sem email principal'}
                          </Typography>
                        </Box>
                      </Stack>

                      <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                        <Chip
                          label={focusedPerson.is_internal ? 'Interno' : 'Externo'}
                          size="small"
                          color={focusedPerson.is_internal ? 'primary' : 'default'}
                        />
                        {focusedDuplicateCount > 0 && (
                          <Chip
                            label={`${focusedDuplicateCount} duplicado${focusedDuplicateCount > 1 ? 's' : ''}`}
                            size="small"
                            color="warning"
                            variant="outlined"
                          />
                        )}
                        <Chip
                          label={`${Number(focusedPerson.meeting_count)} reunião${Number(focusedPerson.meeting_count) === 1 ? '' : 'ões'}`}
                          size="small"
                          variant="outlined"
                        />
                      </Stack>

                      {(focusedPerson.identities ?? []).length > 0 && (
                        <Stack spacing={0.6}>
                          {(focusedPerson.identities ?? []).slice(0, 4).map((identity, index) => (
                            <Stack key={`${identity.type}-${identity.value}-${index}`} direction="row" spacing={0.75} alignItems="center">
                              <Box sx={{ color: 'text.disabled' }}>{identityIcon(identity.type)}</Box>
                              <Typography variant="caption" sx={{ fontSize: '0.74rem' }}>
                                {identityLabel(identity)}
                              </Typography>
                            </Stack>
                          ))}
                        </Stack>
                      )}

                      {focusedPerson.client_links && focusedPerson.client_links.length > 0 && (
                        <Box>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                            Clientes vinculados
                          </Typography>
                          <Stack spacing={0.6} sx={{ mt: 0.75 }}>
                            {focusedPerson.client_links.slice(0, 3).map((clientLink, index) => (
                              <Stack key={`${clientLink.client_id}-${index}`} direction="row" spacing={0.75} alignItems="center">
                                <IconBuilding size={12} style={{ opacity: 0.45 }} />
                                <Link href={`/clients/${clientLink.client_id}`} underline="hover" sx={{ fontSize: '0.75rem', fontWeight: 700 }}>
                                  {clientLink.client_name}
                                </Link>
                              </Stack>
                            ))}
                          </Stack>
                        </Box>
                      )}

                      {focusedPerson.notes && (
                        <Box sx={{ borderTop: `1px solid ${theme.palette.divider}`, pt: 1.25 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                            Observações
                          </Typography>
                          <Typography variant="body2" sx={{ mt: 0.75 }}>
                            {focusedPerson.notes}
                          </Typography>
                        </Box>
                      )}

                      <Stack direction="row" spacing={1}>
                        <Button size="small" variant="contained" onClick={() => setEditPerson(focusedPerson)} sx={{ flex: 1 }}>
                          Editar ficha
                        </Button>
                        <Button size="small" variant="outlined" color="warning" onClick={() => setDeletePerson(focusedPerson)}>
                          Excluir
                        </Button>
                      </Stack>
                    </Stack>
                  ) : (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1.25 }}>
                      Selecione um contato para ver o contexto completo.
                    </Typography>
                  )}
                </Box>

                <Divider />

                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase' }}>
                    Ações do diretório
                  </Typography>
                  <Stack spacing={1} sx={{ mt: 1.25 }}>
                    <Button
                      variant="outlined"
                      startIcon={syncing ? <CircularProgress size={14} color="inherit" /> : <IconBrandGoogle size={14} />}
                      onClick={handleSyncContacts}
                      disabled={syncing}
                    >
                      {syncing ? 'Sincronizando...' : 'Sincronizar contatos'}
                    </Button>
                    <Button
                      variant={selectMode ? 'contained' : 'outlined'}
                      color="warning"
                      startIcon={<IconGitMerge size={14} />}
                      onClick={() => selectMode ? exitSelectMode() : setSelectMode(true)}
                    >
                      {selectMode ? 'Cancelar merge' : 'Abrir merge manual'}
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      disabled={cleaningNameless || namelessPeople.length === 0}
                      onClick={handleCleanupNameless}
                    >
                      {cleaningNameless ? 'Limpando...' : 'Limpar sem nome'}
                    </Button>
                  </Stack>
                </Box>
              </Stack>
            </Box>
          </Grid>
        </Grid>
      </Box>
  );

  const overlays = (
      <>
        <EditDrawer
        person={editPerson}
        onClose={() => setEditPerson(null)}
        onSaved={() => load(q, filter)}
      />

      {/* Delete Dialog */}
      <Dialog open={Boolean(deletePerson)} onClose={() => setDeletePerson(null)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight={800}>Excluir pessoa</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Tem certeza que deseja excluir <strong>{deletePerson?.display_name}</strong>?
            Os vínculos com clientes e reuniões serão removidos.
          </Typography>
          {deleteError && <Alert severity="error" sx={{ mt: 1.5 }}>{deleteError}</Alert>}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeletePerson(null)} disabled={deleting}>Cancelar</Button>
          <Button variant="contained" color="error" onClick={handleDelete} disabled={deleting}>
            {deleting ? <CircularProgress size={16} color="inherit" /> : 'Excluir'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Merge Dialog */}
      <Dialog open={Boolean(mergeKeep && mergeDiscard)} onClose={() => { setMergeKeep(null); setMergeDiscard(null); }}
        maxWidth="sm" fullWidth>
        <DialogTitle fontWeight={800}>Merge de duplicatas</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Todos os contatos, vínculos e reuniões de <strong>{mergeDiscard?.display_name}</strong> serão
            movidos para <strong>{mergeKeep?.display_name}</strong>. O registro duplicado será excluído.
          </Typography>
          <Stack spacing={1.5}>
            <Box sx={{ p: 1.5, borderRadius: 1.5, border: '1px solid', borderColor: 'success.light', bgcolor: alpha('#13DEB9', 0.06) }}>
              <Typography variant="caption" fontWeight={700} color="success.main" sx={{ display: 'block', mb: 0.5 }}>MANTER</Typography>
              <Typography variant="body2" fontWeight={700}>{mergeKeep?.display_name}</Typography>
              <Typography variant="caption" color="text.secondary">{primaryEmail(mergeKeep?.identities ?? null)}</Typography>
            </Box>
            <Box sx={{ p: 1.5, borderRadius: 1.5, border: '1px solid', borderColor: 'error.light', bgcolor: alpha('#FA896B', 0.06) }}>
              <Typography variant="caption" fontWeight={700} color="error.main" sx={{ display: 'block', mb: 0.5 }}>EXCLUIR</Typography>
              <Typography variant="body2" fontWeight={700}>{mergeDiscard?.display_name}</Typography>
              <Typography variant="caption" color="text.secondary">{primaryEmail(mergeDiscard?.identities ?? null)}</Typography>
            </Box>
          </Stack>
          {mergeError && <Alert severity="error" sx={{ mt: 1.5 }}>{mergeError}</Alert>}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => { setMergeKeep(null); setMergeDiscard(null); }} disabled={merging}>Cancelar</Button>
          <Button variant="contained" color="warning" onClick={handleMerge} disabled={merging}>
            {merging ? <CircularProgress size={16} color="inherit" /> : 'Fazer Merge'}
          </Button>
        </DialogActions>
      </Dialog>
      </>
  );

  if (embedded) {
    return (
      <>
        {content}
        {overlays}
      </>
    );
  }

  return (
    <AppShell title="Pessoas">
      <Box sx={{ px: { xs: 2, md: 3 }, pt: { xs: 2, md: 3 } }}>
        <AdminSubmenu value="pessoas" />
      </Box>
      {content}
      {overlays}
    </AppShell>
  );
}
