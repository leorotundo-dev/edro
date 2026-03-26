'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiGet } from '@/lib/api';
import AppShell from '@/components/AppShell';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import {
  IconAddressBook,
  IconBrandWhatsapp,
  IconBriefcase,
  IconBuilding,
  IconMail,
  IconPhone,
  IconSearch,
  IconUser,
  IconUsers,
  IconUsersGroup,
} from '@tabler/icons-react';

// ── Types ─────────────────────────────────────────────────────────────────────

type Identity = { type: string; value: string; primary: boolean };
type ClientLink = { client_id: string; client_name: string; contact_name: string; role: string | null };

type Person = {
  id: string;
  display_name: string;
  is_internal: boolean;
  avatar_url: string | null;
  notes: string | null;
  identities: Identity[] | null;
  client_links: ClientLink[] | null;
  meeting_count: string;
};

type Freelancer = {
  id: string;
  display_name: string;
  email: string;
  email_personal: string | null;
  phone: string | null;
  whatsapp_jid: string | null;
  specialty: string | null;
  role_title: string | null;
  department: string | null;
  is_active: boolean;
  avatar_url: string | null;
  skills: string[] | null;
  experience_level: 'junior' | 'mid' | 'senior' | null;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function initials(name: string) {
  return (name || '?').split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
}

function primaryEmail(ids: Identity[] | null) {
  if (!ids) return null;
  return ids.find((i) => i.type === 'email' && i.primary)?.value
    ?? ids.find((i) => i.type === 'email')?.value ?? null;
}

function primaryPhone(ids: Identity[] | null) {
  if (!ids) return null;
  return ids.find((i) => i.type === 'phone_e164' && i.primary)?.value
    ?? ids.find((i) => i.type === 'phone_e164')?.value ?? null;
}

function primaryWhatsapp(ids: Identity[] | null) {
  if (!ids) return null;
  return ids.find((i) => i.type === 'whatsapp_jid')?.value ?? null;
}

function whatsappLink(jid: string | null, phone: string | null): string | null {
  if (jid) {
    const num = jid.replace('@s.whatsapp.net', '').replace('@c.us', '');
    return `https://wa.me/${num}`;
  }
  if (phone) {
    const num = phone.replace(/\D/g, '');
    return `https://wa.me/${num}`;
  }
  return null;
}

function specialtyLabel(s: string | null) {
  const map: Record<string, string> = {
    copy: 'Copy', design: 'Design', video: 'Vídeo', revisao: 'Revisão',
    social: 'Social', estrategia: 'Estratégia', operacao: 'Operação',
    atendimento: 'Atendimento', financeiro: 'Financeiro',
  };
  return s ? (map[s] ?? s) : null;
}

function specialtyColor(s: string | null): 'primary' | 'secondary' | 'success' | 'warning' | 'info' | 'default' {
  const map: Record<string, 'primary' | 'secondary' | 'success' | 'warning' | 'info'> = {
    copy: 'primary', design: 'secondary', video: 'warning',
    revisao: 'info', social: 'success',
  };
  return s ? (map[s] ?? 'default') : 'default';
}

function levelLabel(l: string | null) {
  if (l === 'junior') return 'Jr';
  if (l === 'mid') return 'Pl';
  if (l === 'senior') return 'Sr';
  return null;
}

// ── Contact Card ──────────────────────────────────────────────────────────────

function ContactCard({ name, subtitle, email, phone, whatsapp, avatarUrl, badge, badgeColor, extra }: {
  name: string;
  subtitle?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  avatarUrl?: string | null;
  badge?: string | null;
  badgeColor?: 'primary' | 'secondary' | 'success' | 'warning' | 'info' | 'default';
  extra?: React.ReactNode;
}) {
  const theme = useTheme();
  const wa = whatsappLink(whatsapp ?? null, phone ?? null);

  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 2,
        border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
        bgcolor: theme.palette.background.paper,
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
        height: '100%',
        transition: 'box-shadow 0.15s',
        '&:hover': { boxShadow: theme.shadows[4] },
      }}
    >
      {/* Header */}
      <Stack direction="row" spacing={1.5} alignItems="flex-start">
        <Avatar
          src={avatarUrl ?? undefined}
          sx={{ width: 44, height: 44, bgcolor: theme.palette.primary.main, fontSize: 15, fontWeight: 700, flexShrink: 0 }}
        >
          {initials(name)}
        </Avatar>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="subtitle2" fontWeight={600} noWrap title={name}>
            {name}
          </Typography>
          {subtitle && (
            <Typography variant="caption" color="text.secondary" noWrap title={subtitle}>
              {subtitle}
            </Typography>
          )}
          {badge && (
            <Box mt={0.5}>
              <Chip label={badge} color={badgeColor ?? 'default'} size="small" sx={{ height: 18, fontSize: 10 }} />
            </Box>
          )}
        </Box>
      </Stack>

      {/* Contact actions */}
      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
        {email && (
          <Tooltip title={email}>
            <Chip
              icon={<IconMail size={12} />}
              label={email}
              size="small"
              component="a"
              href={`mailto:${email}`}
              clickable
              sx={{ maxWidth: 180, fontSize: 11, height: 22 }}
            />
          </Tooltip>
        )}
        {phone && (
          <Tooltip title={phone}>
            <Chip
              icon={<IconPhone size={12} />}
              label={phone}
              size="small"
              component="a"
              href={`tel:${phone}`}
              clickable
              sx={{ fontSize: 11, height: 22 }}
            />
          </Tooltip>
        )}
        {wa && (
          <Tooltip title="Abrir WhatsApp">
            <Chip
              icon={<IconBrandWhatsapp size={12} />}
              label="WhatsApp"
              size="small"
              component="a"
              href={wa}
              target="_blank"
              rel="noopener"
              clickable
              color="success"
              sx={{ fontSize: 11, height: 22 }}
            />
          </Tooltip>
        )}
      </Stack>

      {extra}
    </Box>
  );
}

// ── Empty state ────────────────────────────────────────────────────────────────

function EmptyState({ label }: { label: string }) {
  return (
    <Box sx={{ textAlign: 'center', py: 8, color: 'text.disabled' }}>
      <IconAddressBook size={48} stroke={1} />
      <Typography mt={1}>{label}</Typography>
    </Box>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function ContatosClient() {
  const [tab, setTab] = useState(0);
  const [people, setPeople] = useState<Person[]>([]);
  const [freelancers, setFreelancers] = useState<Freelancer[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [clientFilter, setClientFilter] = useState('');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      apiGet<Person[]>('/api/people?limit=300'),
      apiGet<Freelancer[]>('/api/freelancers'),
    ]).then(([p, f]) => {
      setPeople(Array.isArray(p) ? p : []);
      setFreelancers(Array.isArray(f) ? f : []);
    }).finally(() => setLoading(false));
  }, []);

  // Derived lists
  const clientContacts = useMemo(
    () => people.filter((p) => p.client_links && p.client_links.length > 0),
    [people],
  );

  const allClients = useMemo(() => {
    const seen = new Set<string>();
    const list: { id: string; name: string }[] = [];
    for (const p of clientContacts) {
      for (const cl of p.client_links ?? []) {
        if (!seen.has(cl.client_id)) {
          seen.add(cl.client_id);
          list.push({ id: cl.client_id, name: cl.client_name });
        }
      }
    }
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [clientContacts]);

  const ql = q.toLowerCase();

  const filteredContacts = useMemo(() => clientContacts.filter((p) => {
    const matchSearch = !ql
      || p.display_name.toLowerCase().includes(ql)
      || p.client_links?.some((cl) => cl.client_name.toLowerCase().includes(ql) || cl.role?.toLowerCase().includes(ql))
      || p.identities?.some((id) => id.value.toLowerCase().includes(ql));
    const matchClient = !clientFilter
      || p.client_links?.some((cl) => cl.client_id === clientFilter);
    return matchSearch && matchClient;
  }), [clientContacts, ql, clientFilter]);

  const filteredTeam = useMemo(() => freelancers.filter((f) => {
    if (!ql) return true;
    return f.display_name.toLowerCase().includes(ql)
      || f.email?.toLowerCase().includes(ql)
      || f.specialty?.toLowerCase().includes(ql)
      || f.role_title?.toLowerCase().includes(ql)
      || f.department?.toLowerCase().includes(ql);
  }), [freelancers, ql]);

  const filteredAll = useMemo(() => people.filter((p) => {
    if (!ql) return true;
    return p.display_name.toLowerCase().includes(ql)
      || p.identities?.some((id) => id.value.toLowerCase().includes(ql))
      || p.client_links?.some((cl) => cl.client_name.toLowerCase().includes(ql));
  }), [people, ql]);

  return (
    <AppShell>
      <Box sx={{ p: { xs: 2, md: 3 } }}>
        {/* Header */}
        <Stack direction="row" alignItems="center" spacing={2} mb={3}>
          <IconAddressBook size={28} stroke={1.5} />
          <Box>
            <Typography variant="h5" fontWeight={700}>Contatos</Typography>
            <Typography variant="body2" color="text.secondary">
              {clientContacts.length} contatos de clientes · {freelancers.length} membros de equipe
            </Typography>
          </Box>
        </Stack>

        {/* Search + filter row */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} mb={2}>
          <TextField
            size="small"
            placeholder="Buscar nome, email, telefone…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><IconSearch size={16} /></InputAdornment> }}
            sx={{ flex: 1 }}
          />
          {tab === 0 && (
            <TextField
              select
              size="small"
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              sx={{ minWidth: 200 }}
              label="Filtrar por cliente"
            >
              <MenuItem value="">Todos os clientes</MenuItem>
              {allClients.map((c) => (
                <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
              ))}
            </TextField>
          )}
        </Stack>

        {/* Tabs */}
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab
            icon={<IconBuilding size={16} />}
            iconPosition="start"
            label={`Contatos de Clientes (${clientContacts.length})`}
            sx={{ fontSize: 13 }}
          />
          <Tab
            icon={<IconUsersGroup size={16} />}
            iconPosition="start"
            label={`Equipe / DAs (${freelancers.length})`}
            sx={{ fontSize: 13 }}
          />
          <Tab
            icon={<IconUsers size={16} />}
            iconPosition="start"
            label={`Diretório (${people.length})`}
            sx={{ fontSize: 13 }}
          />
        </Tabs>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {/* ── Tab 0: Client Contacts ── */}
            {tab === 0 && (
              filteredContacts.length === 0 ? (
                <EmptyState label="Nenhum contato encontrado" />
              ) : (
                <Grid container spacing={2}>
                  {filteredContacts.map((p) => {
                    const email = primaryEmail(p.identities);
                    const phone = primaryPhone(p.identities);
                    const wa = primaryWhatsapp(p.identities);
                    const link = p.client_links?.[0];
                    const subtitle = [link?.role, link?.client_name].filter(Boolean).join(' · ');
                    const extraClients = (p.client_links?.length ?? 0) > 1
                      ? p.client_links!.slice(1).map((cl) => cl.client_name).join(', ')
                      : null;
                    return (
                      <Grid item xs={12} sm={6} md={4} lg={3} key={p.id}>
                        <ContactCard
                          name={link?.contact_name || p.display_name}
                          subtitle={subtitle}
                          email={email}
                          phone={phone}
                          whatsapp={wa}
                          avatarUrl={p.avatar_url}
                          extra={extraClients ? (
                            <Typography variant="caption" color="text.secondary">
                              Também em: {extraClients}
                            </Typography>
                          ) : undefined}
                        />
                      </Grid>
                    );
                  })}
                </Grid>
              )
            )}

            {/* ── Tab 1: Team / Freelancers ── */}
            {tab === 1 && (
              filteredTeam.length === 0 ? (
                <EmptyState label="Nenhum membro encontrado" />
              ) : (
                <Grid container spacing={2}>
                  {filteredTeam.map((f) => {
                    const email = f.email_personal || f.email;
                    const spec = specialtyLabel(f.specialty);
                    const level = levelLabel(f.experience_level);
                    const subtitle = [f.role_title, f.department].filter(Boolean).join(' · ');
                    return (
                      <Grid item xs={12} sm={6} md={4} lg={3} key={f.id}>
                        <ContactCard
                          name={f.display_name}
                          subtitle={subtitle || null}
                          email={email}
                          phone={f.phone}
                          whatsapp={f.whatsapp_jid}
                          avatarUrl={f.avatar_url}
                          badge={spec ? `${spec}${level ? ` ${level}` : ''}` : undefined}
                          badgeColor={specialtyColor(f.specialty)}
                          extra={
                            !f.is_active ? (
                              <Typography variant="caption" color="text.disabled">Inativo</Typography>
                            ) : undefined
                          }
                        />
                      </Grid>
                    );
                  })}
                </Grid>
              )
            )}

            {/* ── Tab 2: Full Directory ── */}
            {tab === 2 && (
              filteredAll.length === 0 ? (
                <EmptyState label="Nenhuma pessoa encontrada" />
              ) : (
                <Grid container spacing={2}>
                  {filteredAll.map((p) => {
                    const email = primaryEmail(p.identities);
                    const phone = primaryPhone(p.identities);
                    const wa = primaryWhatsapp(p.identities);
                    const clientNames = p.client_links?.map((cl) => cl.client_name).join(', ');
                    return (
                      <Grid item xs={12} sm={6} md={4} lg={3} key={p.id}>
                        <ContactCard
                          name={p.display_name || 'Sem nome'}
                          subtitle={clientNames || null}
                          email={email}
                          phone={phone}
                          whatsapp={wa}
                          avatarUrl={p.avatar_url}
                          badge={p.is_internal ? 'Interno' : undefined}
                          badgeColor="info"
                          extra={
                            Number(p.meeting_count) > 0 ? (
                              <Typography variant="caption" color="text.secondary">
                                {p.meeting_count} reunião(ões)
                              </Typography>
                            ) : undefined
                          }
                        />
                      </Grid>
                    );
                  })}
                </Grid>
              )
            )}
          </>
        )}
      </Box>
    </AppShell>
  );
}
