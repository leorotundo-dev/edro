'use client';

import { useEffect, useState } from 'react';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Collapse from '@mui/material/Collapse';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import {
  IconBrandWhatsapp,
  IconCheck,
  IconEdit,
  IconMail,
  IconPhone,
  IconPlus,
  IconStar,
  IconStarFilled,
  IconTrash,
  IconUserSearch,
  IconUsers,
  IconX,
} from '@tabler/icons-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Contact = {
  id: string;
  name: string;
  role?: string | null;
  department?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsapp_jid?: string | null;
  is_primary?: boolean;
  notes?: string | null;
  avatar_url?: string | null;
  active?: boolean;
  created_at?: string;
  updated_at?: string;
};

type DiscoveredContact = {
  sender_jid: string;
  sender_name: string;
  message_count: number;
  already_linked: boolean;
};

type ContactForm = {
  name: string;
  role: string;
  department: string;
  email: string;
  phone: string;
  whatsapp_jid: string;
  is_primary: boolean;
  notes: string;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const EMPTY_FORM: ContactForm = {
  name: '',
  role: '',
  department: '',
  email: '',
  phone: '',
  whatsapp_jid: '',
  is_primary: false,
  notes: '',
};

/** Deterministic background color derived from the first char of name */
function avatarColor(name: string): string {
  const COLORS = [
    '#E85219', '#4570EA', '#13DEB9', '#7c3aed',
    '#f59e0b', '#10b981', '#3b82f6', '#ec4899',
    '#8b5cf6', '#ef4444',
  ];
  const code = (name?.charCodeAt(0) ?? 0) + (name?.charCodeAt(1) ?? 0);
  return COLORS[code % COLORS.length];
}

function contactToForm(c: Contact): ContactForm {
  return {
    name: c.name ?? '',
    role: c.role ?? '',
    department: c.department ?? '',
    email: c.email ?? '',
    phone: c.phone ?? '',
    whatsapp_jid: c.whatsapp_jid ?? '',
    is_primary: c.is_primary ?? false,
    notes: c.notes ?? '',
  };
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) {
    const message = error.message?.trim();
    if (message) return message;
  }
  return fallback;
}

// ---------------------------------------------------------------------------
// Sub-component: inline edit form (Collapse)
// ---------------------------------------------------------------------------

function ContactEditForm({
  form,
  onChange,
  onSave,
  onCancel,
  saving,
}: {
  form: ContactForm;
  onChange: (f: ContactForm) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const set = (patch: Partial<ContactForm>) => onChange({ ...form, ...patch });

  return (
    <Box sx={{ pt: 1.5, pb: 0.5 }}>
      <Grid container spacing={1.5}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            fullWidth size="small" label="Nome" required
            value={form.name}
            onChange={(e) => set({ name: e.target.value })}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            fullWidth size="small" label="Cargo"
            value={form.role}
            onChange={(e) => set({ role: e.target.value })}
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
            fullWidth size="small" label="E-mail"
            type="email"
            value={form.email}
            onChange={(e) => set({ email: e.target.value })}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            fullWidth size="small" label="Telefone"
            value={form.phone}
            onChange={(e) => set({ phone: e.target.value })}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            fullWidth size="small" label="WhatsApp JID"
            placeholder="5511999999999@s.whatsapp.net"
            value={form.whatsapp_jid}
            onChange={(e) => set({ whatsapp_jid: e.target.value })}
          />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <TextField
            fullWidth size="small" label="Notas" multiline rows={2}
            value={form.notes}
            onChange={(e) => set({ notes: e.target.value })}
          />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <FormControlLabel
            control={
              <Checkbox
                size="small"
                checked={form.is_primary}
                onChange={(e) => set({ is_primary: e.target.checked })}
                sx={{ color: '#E85219', '&.Mui-checked': { color: '#E85219' } }}
              />
            }
            label={
              <Typography variant="body2">Contato principal</Typography>
            }
          />
        </Grid>
      </Grid>
      <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 1.5 }}>
        <Button
          size="small"
          onClick={onCancel}
          disabled={saving}
          startIcon={<IconX size={14} />}
        >
          Cancelar
        </Button>
        <Button
          size="small" variant="contained"
          onClick={onSave}
          disabled={saving || !form.name.trim()}
          startIcon={saving ? <CircularProgress size={13} sx={{ color: '#fff' }} /> : <IconCheck size={14} />}
          sx={{ bgcolor: '#E85219', '&:hover': { bgcolor: '#c43e10' } }}
        >
          {saving ? 'Salvando...' : 'Salvar'}
        </Button>
      </Stack>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: single contact card
// ---------------------------------------------------------------------------

function ContactCard({
  contact,
  onEdit,
  onDelete,
  deletingId,
}: {
  contact: Contact;
  onEdit: (c: Contact) => void;
  onDelete: (id: string) => void;
  deletingId: string | null;
}) {
  const color = avatarColor(contact.name);
  const initial = contact.name?.[0]?.toUpperCase() ?? '?';
  const isDeleting = deletingId === contact.id;

  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 2,
        opacity: isDeleting ? 0.5 : 1,
        transition: 'opacity 0.2s',
        borderColor: contact.is_primary ? 'rgba(232,82,25,0.35)' : 'divider',
      }}
    >
      <CardContent sx={{ p: '12px 14px !important' }}>
        <Stack direction="row" spacing={1.5} alignItems="flex-start">
          {/* Avatar */}
          <Avatar
            sx={{
              bgcolor: color,
              width: 38,
              height: 38,
              fontSize: '1rem',
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {initial}
          </Avatar>

          {/* Content */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap">
              <Typography variant="subtitle2" fontWeight={700} noWrap>
                {contact.name}
              </Typography>
              {contact.is_primary && (
                <Tooltip title="Contato principal">
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <IconStarFilled size={14} color="#E85219" />
                  </Box>
                </Tooltip>
              )}
            </Stack>

            {(contact.role || contact.department) && (
              <Typography variant="caption" color="text.secondary" noWrap>
                {[contact.role, contact.department].filter(Boolean).join(' · ')}
              </Typography>
            )}

            {/* Info chips */}
            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 0.75 }}>
              {contact.email && (
                <Chip
                  size="small"
                  icon={<IconMail size={11} />}
                  label={contact.email}
                  sx={{ fontSize: '0.68rem', height: 20 }}
                  variant="outlined"
                />
              )}
              {contact.phone && (
                <Chip
                  size="small"
                  icon={<IconPhone size={11} />}
                  label={contact.phone}
                  sx={{ fontSize: '0.68rem', height: 20 }}
                  variant="outlined"
                />
              )}
              {contact.whatsapp_jid && (
                <Chip
                  size="small"
                  icon={<IconBrandWhatsapp size={11} />}
                  label={contact.whatsapp_jid.replace('@s.whatsapp.net', '')}
                  sx={{
                    fontSize: '0.68rem',
                    height: 20,
                    bgcolor: 'rgba(37,211,102,0.08)',
                    color: '#22a84d',
                    borderColor: 'rgba(37,211,102,0.3)',
                  }}
                  variant="outlined"
                />
              )}
            </Stack>

            {contact.notes && (
              <Typography
                variant="caption"
                color="text.disabled"
                sx={{ mt: 0.5, display: 'block', fontStyle: 'italic', lineHeight: 1.4 }}
              >
                {contact.notes}
              </Typography>
            )}
          </Box>

          {/* Actions */}
          <Stack direction="row" spacing={0.25} flexShrink={0}>
            <Tooltip title="Editar">
              <IconButton
                size="small"
                onClick={() => onEdit(contact)}
                sx={{ color: 'text.disabled', '&:hover': { color: '#4570EA' } }}
              >
                <IconEdit size={15} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Excluir">
              <IconButton
                size="small"
                disabled={isDeleting}
                onClick={() => onDelete(contact.id)}
                sx={{ color: 'text.disabled', '&:hover': { color: '#FA896B' } }}
              >
                {isDeleting ? <CircularProgress size={13} /> : <IconTrash size={15} />}
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function ContactsManager({ clientId }: { clientId: string }) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [discoverFeedback, setDiscoverFeedback] = useState<string | null>(null);

  // Add form (top)
  const [addingNew, setAddingNew] = useState(false);
  const [addForm, setAddForm] = useState<ContactForm>(EMPTY_FORM);
  const [savingNew, setSavingNew] = useState(false);

  // Edit form (per contact)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<ContactForm>(EMPTY_FORM);
  const [savingEdit, setSavingEdit] = useState(false);

  // Discover dialog
  const [discoverOpen, setDiscoverOpen] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [discovered, setDiscovered] = useState<DiscoveredContact[]>([]);
  const [linkingJid, setLinkingJid] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Load
  // ---------------------------------------------------------------------------

  useEffect(() => {
    setLoading(true);
    setFeedback(null);
    apiGet<Contact[] | { contacts: Contact[] }>(`/clients/${clientId}/contacts`)
      .then((res) => {
        const list = Array.isArray(res) ? res : (res as { contacts: Contact[] })?.contacts ?? [];
        setContacts(list);
      })
      .catch((error) => setFeedback(getErrorMessage(error, 'Nao foi possivel carregar os contatos.')))
      .finally(() => setLoading(false));
  }, [clientId]);

  // ---------------------------------------------------------------------------
  // Create
  // ---------------------------------------------------------------------------

  const handleCreate = async () => {
    if (!addForm.name.trim()) return;
    setSavingNew(true);
    setFeedback(null);
    try {
      const res = await apiPost<Contact | { contact: Contact }>(`/clients/${clientId}/contacts`, {
        name: addForm.name.trim(),
        role: addForm.role.trim() || null,
        department: addForm.department.trim() || null,
        email: addForm.email.trim() || null,
        phone: addForm.phone.trim() || null,
        whatsapp_jid: addForm.whatsapp_jid.trim() || null,
        is_primary: addForm.is_primary,
        notes: addForm.notes.trim() || null,
      });
      const created = (res as { contact: Contact })?.contact ?? (res as Contact);
      if (created?.id) {
        setContacts((prev) => {
          const next = prev.filter((c) => c.id !== created.id);
          return created.is_primary
            ? [created, ...next.map((c) => ({ ...c, is_primary: false }))]
            : [created, ...next];
        });
      }
      setAddingNew(false);
      setAddForm(EMPTY_FORM);
    } catch (error) {
      setFeedback(getErrorMessage(error, 'Nao foi possivel salvar o contato.'));
    }
    finally { setSavingNew(false); }
  };

  // ---------------------------------------------------------------------------
  // Edit / Update
  // ---------------------------------------------------------------------------

  const openEdit = (c: Contact) => {
    setFeedback(null);
    setEditingId(c.id);
    setEditForm(contactToForm(c));
    setAddingNew(false); // close add form if open
  };

  const handleUpdate = async () => {
    if (!editingId || !editForm.name.trim()) return;
    setSavingEdit(true);
    setFeedback(null);
    try {
      const res = await apiPatch<Contact | { contact: Contact }>(
        `/clients/${clientId}/contacts/${editingId}`,
        {
          name: editForm.name.trim(),
          role: editForm.role.trim() || null,
          department: editForm.department.trim() || null,
          email: editForm.email.trim() || null,
          phone: editForm.phone.trim() || null,
          whatsapp_jid: editForm.whatsapp_jid.trim() || null,
          is_primary: editForm.is_primary,
          notes: editForm.notes.trim() || null,
        }
      );
      const updated = (res as { contact: Contact })?.contact ?? (res as Contact);
      setContacts((prev) =>
        prev.map((c) => {
          if (c.id === editingId) return updated?.id ? updated : { ...c, ...editForm };
          if ((updated?.is_primary ?? editForm.is_primary) === true) return { ...c, is_primary: false };
          return c;
        })
      );
      setEditingId(null);
    } catch (error) {
      setFeedback(getErrorMessage(error, 'Nao foi possivel atualizar o contato.'));
    }
    finally { setSavingEdit(false); }
  };

  // ---------------------------------------------------------------------------
  // Delete
  // ---------------------------------------------------------------------------

  const handleDelete = async (contactId: string) => {
    setDeletingId(contactId);
    setFeedback(null);
    try {
      await apiDelete(`/clients/${clientId}/contacts/${contactId}`);
      setContacts((prev) => prev.filter((c) => c.id !== contactId));
      if (editingId === contactId) setEditingId(null);
    } catch (error) {
      setFeedback(getErrorMessage(error, 'Nao foi possivel excluir o contato.'));
    }
    finally { setDeletingId(null); }
  };

  // ---------------------------------------------------------------------------
  // Discover
  // ---------------------------------------------------------------------------

  const handleDiscover = async () => {
    setDiscoverOpen(true);
    setDiscoverFeedback(null);
    if (discovered.length > 0) return; // already loaded
    setDiscovering(true);
    try {
      const res = await apiGet<{ discovered: DiscoveredContact[] }>(
        `/clients/${clientId}/contacts/discover`
      );
      setDiscovered(res?.discovered ?? []);
    } catch (error) {
      setDiscoverFeedback(getErrorMessage(error, 'Nao foi possivel descobrir contatos do WhatsApp.'));
    }
    finally { setDiscovering(false); }
  };

  const handleLinkDiscovered = async (d: DiscoveredContact) => {
    setLinkingJid(d.sender_jid);
    setDiscoverFeedback(null);
    try {
      const res = await apiPost<Contact | { contact: Contact }>(`/clients/${clientId}/contacts`, {
        name: d.sender_name || d.sender_jid,
        whatsapp_jid: d.sender_jid,
      });
      const created = (res as { contact: Contact })?.contact ?? (res as Contact);
      if (created?.id) {
        setContacts((prev) => [created, ...prev.filter((item) => item.id !== created.id)]);
      }
      // mark as already_linked in the dialog list
      setDiscovered((prev) =>
        prev.map((item) =>
          item.sender_jid === d.sender_jid ? { ...item, already_linked: true } : item
        )
      );
    } catch (error) {
      setDiscoverFeedback(getErrorMessage(error, 'Nao foi possivel vincular este contato.'));
    }
    finally { setLinkingJid(null); }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <Card variant="outlined" sx={{ borderRadius: 2, borderColor: 'rgba(232,82,25,0.3)' }}>
      <CardContent>
        {/* Header */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <IconUsers size={20} color="#E85219" />
            <Box>
              <Typography variant="h6" fontWeight={700}>Contatos</Typography>
              <Typography variant="caption" color="text.secondary">
                Pessoas de referência neste cliente
              </Typography>
            </Box>
          </Stack>

          <Stack direction="row" spacing={1}>
            <Button
              size="small" variant="outlined"
              startIcon={<IconUserSearch size={15} />}
              onClick={handleDiscover}
              sx={{
                borderColor: 'rgba(232,82,25,0.5)',
                color: '#E85219',
                '&:hover': { borderColor: '#E85219', bgcolor: 'rgba(232,82,25,0.05)' },
              }}
            >
              Descobrir contatos do WhatsApp
            </Button>
            <Button
              size="small" variant="outlined"
              startIcon={<IconPlus size={15} />}
              onClick={() => {
                setAddingNew((v) => !v);
                setEditingId(null);
                setAddForm(EMPTY_FORM);
              }}
              sx={{
                borderColor: '#E85219',
                color: '#E85219',
                '&:hover': { borderColor: '#c43e10', bgcolor: 'rgba(232,82,25,0.05)' },
              }}
            >
              Adicionar contato
            </Button>
          </Stack>
        </Stack>

        {feedback && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {feedback}
          </Alert>
        )}

        {/* Inline add form */}
        <Collapse in={addingNew} unmountOnExit>
          <Card variant="outlined" sx={{ borderRadius: 2, mb: 2, borderColor: 'rgba(232,82,25,0.4)', bgcolor: 'rgba(232,82,25,0.02)' }}>
            <CardContent sx={{ pb: '12px !important' }}>
              <Typography variant="caption" fontWeight={700} color="#E85219" sx={{ display: 'block', mb: 0.5 }}>
                Novo contato
              </Typography>
              <ContactEditForm
                form={addForm}
                onChange={setAddForm}
                onSave={handleCreate}
                onCancel={() => { setAddingNew(false); setAddForm(EMPTY_FORM); }}
                saving={savingNew}
              />
            </CardContent>
          </Card>
        </Collapse>

        {/* Loading state */}
        {loading && (
          <CircularProgress size={20} sx={{ display: 'block', mx: 'auto', my: 2 }} />
        )}

        {/* Empty state */}
        {!loading && contacts.length === 0 && !addingNew && (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2.5 }}>
            Nenhum contato cadastrado. Adicione o primeiro ou descubra contatos via WhatsApp.
          </Typography>
        )}

        {/* Contact list */}
        {contacts.length > 0 && (
          <Stack spacing={1.25}>
            {contacts.map((contact) => (
              <Box key={contact.id}>
                <ContactCard
                  contact={contact}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                  deletingId={deletingId}
                />
                {/* Inline edit form, shown directly below the card */}
                <Collapse in={editingId === contact.id} unmountOnExit>
                  <Card
                    variant="outlined"
                    sx={{
                      borderRadius: '0 0 8px 8px',
                      borderTop: 0,
                      borderColor: 'rgba(232,82,25,0.4)',
                      bgcolor: 'rgba(232,82,25,0.02)',
                    }}
                  >
                    <CardContent sx={{ pb: '12px !important' }}>
                      <ContactEditForm
                        form={editForm}
                        onChange={setEditForm}
                        onSave={handleUpdate}
                        onCancel={() => setEditingId(null)}
                        saving={savingEdit}
                      />
                    </CardContent>
                  </Card>
                </Collapse>
              </Box>
            ))}
          </Stack>
        )}
      </CardContent>

      {/* ------------------------------------------------------------------ */}
      {/* Discover dialog                                                     */}
      {/* ------------------------------------------------------------------ */}
      <Dialog
        open={discoverOpen}
        onClose={() => setDiscoverOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <IconUserSearch size={20} color="#E85219" />
            <Typography variant="h6" fontWeight={700}>Contatos descobertos no WhatsApp</Typography>
          </Stack>
        </DialogTitle>

        <DialogContent dividers sx={{ p: 0 }}>
          {discoverFeedback && (
            <Alert severity="error" sx={{ m: 2, mb: 0 }}>
              {discoverFeedback}
            </Alert>
          )}

          {discovering && (
            <Stack alignItems="center" justifyContent="center" sx={{ py: 4 }}>
              <CircularProgress size={26} />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
                Analisando conversas...
              </Typography>
            </Stack>
          )}

          {!discovering && discovered.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
              Nenhum contato encontrado nas conversas do WhatsApp.
            </Typography>
          )}

          {!discovering && discovered.length > 0 && (
            <Stack divider={<Divider />}>
              {discovered.map((d) => (
                <Stack
                  key={d.sender_jid}
                  direction="row"
                  spacing={1.5}
                  alignItems="center"
                  sx={{ px: 2.5, py: 1.5 }}
                >
                  <Avatar
                    sx={{
                      bgcolor: avatarColor(d.sender_name || d.sender_jid),
                      width: 36,
                      height: 36,
                      fontSize: '0.9rem',
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {(d.sender_name || d.sender_jid)[0]?.toUpperCase()}
                  </Avatar>

                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="subtitle2" fontWeight={700} noWrap>
                      {d.sender_name || d.sender_jid}
                    </Typography>
                    <Stack direction="row" spacing={0.75} alignItems="center">
                      <Typography variant="caption" color="text.secondary" noWrap>
                        {d.sender_jid.replace('@s.whatsapp.net', '')}
                      </Typography>
                      <Chip
                        size="small"
                        label={`${d.message_count} msgs`}
                        sx={{ height: 16, fontSize: '0.62rem' }}
                      />
                    </Stack>
                  </Box>

                  {d.already_linked ? (
                    <Chip
                      size="small"
                      label="Já vinculado"
                      icon={<IconCheck size={12} />}
                      sx={{
                        bgcolor: 'rgba(19,222,185,0.1)',
                        color: '#13DEB9',
                        border: '1px solid rgba(19,222,185,0.3)',
                        fontSize: '0.72rem',
                      }}
                    />
                  ) : (
                    <Button
                      size="small"
                      variant="outlined"
                      disabled={linkingJid === d.sender_jid}
                      startIcon={
                        linkingJid === d.sender_jid
                          ? <CircularProgress size={12} />
                          : <IconPlus size={13} />
                      }
                      onClick={() => handleLinkDiscovered(d)}
                      sx={{
                        borderColor: '#E85219',
                        color: '#E85219',
                        flexShrink: 0,
                        '&:hover': { borderColor: '#c43e10', bgcolor: 'rgba(232,82,25,0.05)' },
                      }}
                    >
                      Vincular
                    </Button>
                  )}
                </Stack>
              ))}
            </Stack>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 1.5 }}>
          <Button onClick={() => setDiscoverOpen(false)}>Fechar</Button>
          <Button
            variant="outlined"
            onClick={() => {
              setDiscovered([]);
              setDiscoverOpen(false);
              handleDiscover();
            }}
            startIcon={<IconUserSearch size={15} />}
            sx={{ borderColor: '#E85219', color: '#E85219' }}
          >
            Atualizar lista
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}
