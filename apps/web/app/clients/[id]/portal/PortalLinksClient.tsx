'use client';
import { useCallback, useEffect, useState } from 'react';
import { apiGet, apiPost, apiDelete, apiPatch } from '@/lib/api';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import FormControl from '@mui/material/FormControl';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import AppShell from '@/components/AppShell';
import {
  IconCopy, IconExternalLink, IconLink, IconMail,
  IconQrcode, IconRefresh, IconTrash, IconUserPlus, IconUsers,
} from '@tabler/icons-react';

// ── Types ─────────────────────────────────────────────────────────────────────

type PortalLink = {
  id: string; token: string; url: string; label: string;
  expires_at?: string; last_used_at?: string; created_at: string;
};

type PortalContact = {
  id: string; email: string; name?: string;
  role: 'viewer' | 'requester' | 'approver' | 'admin';
  invited_at?: string; accepted_at?: string; last_login_at?: string; is_active: boolean;
};

const ROLE_LABELS: Record<string, string> = {
  viewer: 'Visualizador', requester: 'Solicitante',
  approver: 'Aprovador', admin: 'Administrador',
};
const ROLE_COLORS: Record<string, 'default' | 'info' | 'warning' | 'error'> = {
  viewer: 'default', requester: 'info', approver: 'warning', admin: 'error',
};

function getPortalContactStatus(contact: PortalContact): {
  label: string;
  color: 'default' | 'success' | 'warning';
} {
  if (!contact.is_active) return { label: 'Revogado', color: 'default' };
  if (contact.accepted_at || contact.last_login_at) return { label: 'Ativo', color: 'success' };
  return { label: 'Convite pendente', color: 'warning' };
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function PortalLinksClient({ clientId }: { clientId: string }) {
  const [tab, setTab] = useState(0);

  return (
    <AppShell title="Portal do Cliente">
      <Box sx={{ maxWidth: 760, mx: 'auto', py: 3, px: { xs: 2, md: 3 } }}>
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
          <Box sx={{ p: 1, bgcolor: 'primary.main', borderRadius: 1.5 }}>
            <IconLink size={20} color="#fff" />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={700}>Portal do Cliente</Typography>
            <Typography variant="body2" color="text.secondary">
              Gerencie acessos e contatos autorizados para o portal.
            </Typography>
          </Box>
        </Stack>

        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
          <Tab label="Links mágicos" icon={<IconQrcode size={16} />} iconPosition="start" />
          <Tab label="Contatos" icon={<IconUsers size={16} />} iconPosition="start" />
        </Tabs>

        {tab === 0 && <LinksTab clientId={clientId} />}
        {tab === 1 && <ContactsTab clientId={clientId} />}
      </Box>
    </AppShell>
  );
}

// ── Links tab (magic links — unchanged) ───────────────────────────────────────

function LinksTab({ clientId }: { clientId: string }) {
  const [links, setLinks] = useState<PortalLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [label, setLabel] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [newLink, setNewLink] = useState<PortalLink | null>(null);

  const loadLinks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiGet<{ links: PortalLink[] }>(`/portal/links/${clientId}`);
      setLinks(res?.links ?? []);
    } finally { setLoading(false); }
  }, [clientId]);

  useEffect(() => { loadLinks(); }, [loadLinks]);

  const handleGenerate = async () => {
    setGenerating(true); setError('');
    try {
      const res = await apiPost<PortalLink>(`/portal/invite/${clientId}`, {
        label: label.trim() || undefined,
        expiresInDays: 90,
      });
      if (res) { setNewLink(res); setLabel(''); loadLinks(); }
    } catch (e: any) { setError(e.message ?? 'Erro ao gerar link.'); }
    finally { setGenerating(false); }
  };

  const handleRevoke = async (tokenId: string) => {
    if (!confirm('Revogar este link?')) return;
    await apiDelete(`/portal/links/${tokenId}`);
    loadLinks();
  };

  const copy = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const isExpired = (e?: string) => e ? new Date(e) < new Date() : false;

  return (
    <>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 2 }}>Gerar Novo Link</Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <TextField size="small" fullWidth placeholder='Rótulo opcional — ex: "Link março 2026"'
              value={label} onChange={e => setLabel(e.target.value)} />
            <Button variant="contained" disabled={generating} onClick={handleGenerate} sx={{ whiteSpace: 'nowrap' }}
              startIcon={generating ? <CircularProgress size={14} color="inherit" /> : <IconQrcode size={16} />}>
              Gerar Link
            </Button>
          </Stack>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            O link gerado expira em 90 dias e pode ser revogado a qualquer momento.
          </Typography>
        </CardContent>
      </Card>

      <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>Links Ativos</Typography>

      {loading ? <Stack alignItems="center" py={4}><CircularProgress size={24} /></Stack>
        : links.length === 0 ? <Typography variant="body2" color="text.secondary">Nenhum link gerado ainda.</Typography>
        : (
          <Stack spacing={1.5}>
            {links.map(link => {
              const expired = isExpired(link.expires_at);
              return (
                <Card key={link.id} variant="outlined" sx={{ opacity: expired ? 0.6 : 1 }}>
                  <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1}>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                          <Typography variant="body2" fontWeight={600} noWrap>{link.label}</Typography>
                          {expired && <Chip label="Expirado" size="small" color="error" sx={{ fontSize: '0.6rem' }} />}
                          {link.last_used_at && !expired && <Chip label="Usado" size="small" color="success" sx={{ fontSize: '0.6rem' }} />}
                        </Stack>
                        <Typography variant="caption" color="text.secondary"
                          sx={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {link.url}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                          Criado em {new Date(link.created_at).toLocaleDateString('pt-BR')}
                          {link.expires_at && ` · Expira em ${new Date(link.expires_at).toLocaleDateString('pt-BR')}`}
                          {link.last_used_at && ` · Último acesso ${new Date(link.last_used_at).toLocaleString('pt-BR')}`}
                        </Typography>
                      </Box>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <Tooltip title={copied === link.id ? 'Copiado!' : 'Copiar URL'}>
                          <IconButton size="small" onClick={() => copy(link.url, link.id)}
                            sx={{ color: copied === link.id ? 'success.main' : 'text.secondary' }}>
                            <IconCopy size={16} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Abrir portal">
                          <IconButton size="small" component="a" href={link.url} target="_blank" rel="noopener noreferrer"
                            sx={{ color: 'text.secondary' }}>
                            <IconExternalLink size={16} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Revogar">
                          <IconButton size="small" onClick={() => handleRevoke(link.id)} sx={{ color: 'error.main' }}>
                            <IconTrash size={16} />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              );
            })}
          </Stack>
        )}

      <Divider sx={{ my: 3 }} />

      <Card variant="outlined" sx={{ bgcolor: 'action.hover' }}>
        <CardContent>
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Como funciona</Typography>
          <Typography variant="body2" color="text.secondary" component="div">
            <ol style={{ margin: 0, paddingLeft: 20, lineHeight: 2.2 }}>
              <li>Clique em <strong>Gerar Link</strong> acima.</li>
              <li>Copie a URL e envie ao cliente por email ou WhatsApp.</li>
              <li>O cliente acessa e vê jobs, aprovações e relatórios.</li>
              <li>Pedidos enviados chegam automaticamente como briefings.</li>
            </ol>
          </Typography>
        </CardContent>
      </Card>

      <Dialog open={!!newLink} onClose={() => setNewLink(null)} maxWidth="sm" fullWidth>
        <DialogTitle fontWeight={700}>Link gerado com sucesso!</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Envie este link ao cliente. Expira em 90 dias.
          </Typography>
          <Box sx={{ bgcolor: 'action.hover', borderRadius: 1, p: 1.5, fontFamily: 'monospace', fontSize: '0.82rem', wordBreak: 'break-all', userSelect: 'all' }}>
            {newLink?.url}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { copy(newLink?.url ?? '', 'dialog'); setNewLink(null); }} variant="contained">
            Copiar e fechar
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

// ── Contacts tab (multi-user, invite by email) ────────────────────────────────

function ContactsTab({ clientId }: { clientId: string }) {
  const [contacts, setContacts] = useState<PortalContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'viewer' | 'requester' | 'approver' | 'admin'>('viewer');
  const [saving, setSaving] = useState(false);
  const [busyContactId, setBusyContactId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiGet<{ contacts: PortalContact[] }>(`/portal/contacts/${clientId}`);
      setContacts(res?.contacts ?? []);
    } finally { setLoading(false); }
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  const activeContacts = contacts.filter((contact) => contact.is_active);

  const handleInvite = async () => {
    setSaving(true); setError('');
    try {
      await apiPost(`/portal/contacts/${clientId}`, { email: email.trim(), name: name.trim() || undefined, role });
      setSuccess(`Convite enviado para ${email}`);
      setInviteOpen(false);
      setEmail(''); setName(''); setRole('viewer');
      load();
    } catch (e: any) {
      const msg = e.message ?? '';
      setError(msg.includes('max_contacts') ? 'Limite de 5 contatos por cliente atingido.' : msg || 'Erro ao convidar.');
    } finally { setSaving(false); }
  };

  const handleRoleChange = async (contactId: string, newRole: string) => {
    setBusyContactId(contactId);
    setError('');
    try {
      await apiPatch(`/portal/contacts/${contactId}`, { role: newRole });
      setSuccess('Papel atualizado com sucesso.');
      await load();
    } catch (e: any) {
      setError(e?.message || 'Erro ao atualizar papel do contato.');
    } finally {
      setBusyContactId(null);
    }
  };

  const handleRevoke = async (contactId: string, email: string) => {
    if (!confirm(`Revogar acesso de ${email}?`)) return;
    setBusyContactId(contactId);
    setError('');
    try {
      await apiDelete(`/portal/contacts/${contactId}`);
      setSuccess(`Acesso de ${email} revogado.`);
      await load();
    } catch (e: any) {
      setError(e?.message || 'Erro ao revogar acesso do contato.');
    } finally {
      setBusyContactId(null);
    }
  };

  const handleResend = async (contactId: string, inviteEmail: string) => {
    setBusyContactId(contactId);
    setError('');
    try {
      await apiPost(`/portal/contacts/${contactId}/resend`, {});
      setSuccess(`Convite reenviado para ${inviteEmail}.`);
      await load();
    } catch (e: any) {
      setError(e?.message || 'Erro ao reenviar convite.');
    } finally {
      setBusyContactId(null);
    }
  };

  return (
    <>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Box>
          <Typography variant="subtitle2" fontWeight={700}>Contatos com acesso</Typography>
          <Typography variant="caption" color="text.secondary">
            Até 5 contatos por cliente. Cada um recebe um link de convite por email.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <Chip
            label={`${activeContacts.length}/5 ativos`}
            size="small"
            color={activeContacts.length >= 5 ? 'warning' : 'default'}
            variant="outlined"
          />
          <Button variant="contained" size="small" startIcon={<IconUserPlus size={16} />}
          onClick={() => setInviteOpen(true)}
          disabled={activeContacts.length >= 5}>
            Convidar
          </Button>
        </Stack>
      </Stack>

      {loading ? <Stack alignItems="center" py={4}><CircularProgress size={24} /></Stack>
        : contacts.length === 0 ? (
          <Card variant="outlined" sx={{ bgcolor: 'action.hover' }}>
            <CardContent sx={{ textAlign: 'center', py: 4 }}>
              <IconUsers size={32} color="#aaa" />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Nenhum contato convidado ainda. Clique em <strong>Convidar</strong> para adicionar.
              </Typography>
            </CardContent>
          </Card>
        ) : (
          <Stack spacing={1}>
            {contacts.map(c => (
              <Card key={c.id} variant="outlined" sx={{ opacity: c.is_active ? 1 : 0.5 }}>
                <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                    <Stack direction="row" alignItems="center" spacing={1.5} sx={{ flex: 1, minWidth: 0 }}>
                      <Box sx={{ width: 36, height: 36, bgcolor: 'primary.light', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <IconMail size={16} color="#5D87FF" />
                      </Box>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={600} noWrap>
                          {c.name ?? c.email}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" noWrap display="block">
                          {c.name ? c.email : ''}
                          {c.accepted_at
                            ? ` · Acesso ativo desde ${new Date(c.accepted_at).toLocaleDateString('pt-BR')}`
                            : c.invited_at ? ' · Convite enviado, aguardando aceite' : ''}
                        </Typography>
                      </Box>
                    </Stack>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ flexShrink: 0 }}>
                      <Chip
                        label={getPortalContactStatus(c).label}
                        size="small"
                        color={getPortalContactStatus(c).color}
                        variant={getPortalContactStatus(c).color === 'default' ? 'outlined' : 'filled'}
                      />
                      {c.is_active ? (
                        <FormControl size="small" sx={{ minWidth: 130 }}>
                          <Select
                            value={c.role}
                            onChange={e => handleRoleChange(c.id, e.target.value)}
                            sx={{ fontSize: '0.8rem' }}
                            disabled={busyContactId === c.id}
                          >
                            {Object.entries(ROLE_LABELS).map(([k, v]) => (
                              <MenuItem key={k} value={k} sx={{ fontSize: '0.8rem' }}>{v}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      ) : (
                        <Chip label="Revogado" size="small" color="default" />
                      )}
                      {c.is_active && !c.accepted_at && (
                        <Tooltip title="Reenviar convite">
                          <span>
                            <IconButton
                              size="small"
                              onClick={() => handleResend(c.id, c.email)}
                              sx={{ color: 'info.main' }}
                              disabled={busyContactId === c.id}
                            >
                              <IconRefresh size={16} />
                            </IconButton>
                          </span>
                        </Tooltip>
                      )}
                      {c.is_active && (
                        <Tooltip title="Revogar acesso">
                          <span>
                            <IconButton size="small" onClick={() => handleRevoke(c.id, c.email)} sx={{ color: 'error.main' }} disabled={busyContactId === c.id}>
                              <IconTrash size={16} />
                            </IconButton>
                          </span>
                        </Tooltip>
                      )}
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Stack>
        )}

      <Divider sx={{ my: 3 }} />

      <Card variant="outlined" sx={{ bgcolor: 'action.hover' }}>
        <CardContent>
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Permissões por papel</Typography>
          <Stack spacing={0.5}>
            {[
              ['Visualizador', 'Acessa jobs e relatórios. Não pode solicitar nem aprovar.'],
              ['Solicitante', 'Pode enviar solicitações de novos jobs via portal.'],
              ['Aprovador', 'Pode aprovar ou solicitar revisão de entregas. Recebe email quando job fica pronto.'],
              ['Administrador', 'Acesso completo — todos os papéis acima.'],
            ].map(([r, d]) => (
              <Stack key={r} direction="row" spacing={1} alignItems="baseline">
                <Chip
                  label={r}
                  size="small"
                  color={ROLE_COLORS[
                    r === 'Visualizador'
                      ? 'viewer'
                      : r === 'Solicitante'
                        ? 'requester'
                        : r === 'Aprovador'
                          ? 'approver'
                          : 'admin'
                  ]}
                  sx={{ minWidth: 100 }}
                />
                <Typography variant="caption" color="text.secondary">{d}</Typography>
              </Stack>
            ))}
          </Stack>
        </CardContent>
      </Card>

      {/* Invite dialog */}
      <Dialog open={inviteOpen} onClose={() => setInviteOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight={700}>Convidar contato</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Email" type="email" required fullWidth size="small"
              value={email} onChange={e => setEmail(e.target.value)} autoFocus />
            <TextField label="Nome (opcional)" fullWidth size="small"
              value={name} onChange={e => setName(e.target.value)} />
            <FormControl fullWidth size="small">
              <InputLabel>Papel</InputLabel>
              <Select value={role} label="Papel" onChange={e => setRole(e.target.value as any)}>
                {Object.entries(ROLE_LABELS).map(([k, v]) => (
                  <MenuItem key={k} value={k}>{v}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Typography variant="caption" color="text.secondary">
              O contato receberá um email com link de acesso direto ao portal.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInviteOpen(false)} color="inherit">Cancelar</Button>
          <Button onClick={handleInvite} variant="contained" disabled={saving || !email}>
            {saving ? <CircularProgress size={16} color="inherit" /> : 'Enviar convite'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
