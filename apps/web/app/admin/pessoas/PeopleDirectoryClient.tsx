'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiGet } from '@/lib/api';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import InputAdornment from '@mui/material/InputAdornment';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import { alpha, useTheme } from '@mui/material/styles';
import {
  IconAddressBook,
  IconBrandWhatsapp,
  IconBuilding,
  IconMail,
  IconMicrophone,
  IconPhone,
  IconSearch,
  IconUser,
  IconUsersGroup,
} from '@tabler/icons-react';
import AppShell from '@/components/AppShell';

type PersonIdentity = { type: string; value: string; primary: boolean };

type Person = {
  id: string;
  display_name: string;
  is_internal: boolean;
  avatar_url: string | null;
  created_at: string;
  identities: PersonIdentity[] | null;
  client_name: string | null;
  client_id: string | null;
  meeting_count: string;
};

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
}

function identityIcon(type: string) {
  if (type === 'email') return <IconMail size={12} />;
  if (type === 'phone_e164') return <IconPhone size={12} />;
  if (type === 'whatsapp_jid') return <IconBrandWhatsapp size={12} />;
  return <IconUser size={12} />;
}

export default function PeopleDirectoryClient() {
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';

  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<'all' | 'internal' | 'external'>('all');

  const load = useCallback(async (search: string, f: typeof filter) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ limit: '100' });
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

  const internal = people.filter((p) => p.is_internal).length;
  const external = people.filter((p) => !p.is_internal).length;

  return (
    <AppShell title="Pessoas">
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1100, mx: 'auto' }}>
      {/* Header */}
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 3 }}>
        <Box sx={{
          width: 40, height: 40, borderRadius: 2,
          bgcolor: alpha(theme.palette.primary.main, 0.12),
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'primary.main',
        }}>
          <IconAddressBook size={22} />
        </Box>
        <Box>
          <Typography variant="h6" fontWeight={800}>Diretório de Pessoas</Typography>
          <Typography variant="caption" color="text.secondary">
            {internal} internos · {external} externos · {people.length} total
          </Typography>
        </Box>
      </Stack>

      {/* Search + filters */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2.5 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Buscar por nome, email, WhatsApp..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <IconSearch size={16} style={{ opacity: 0.4 }} />
              </InputAdornment>
            ),
          }}
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
        />
        <ToggleButtonGroup
          value={filter}
          exclusive
          onChange={(_e, v) => { if (v) setFilter(v); }}
          size="small"
          sx={{ flexShrink: 0 }}
        >
          <ToggleButton value="all" sx={{ px: 1.5, py: 0.5, fontSize: '0.72rem', fontWeight: 700, textTransform: 'none' }}>
            Todos
          </ToggleButton>
          <ToggleButton value="internal" sx={{ px: 1.5, py: 0.5, fontSize: '0.72rem', fontWeight: 700, textTransform: 'none' }}>
            <IconUsersGroup size={13} style={{ marginRight: 4 }} /> Internos
          </ToggleButton>
          <ToggleButton value="external" sx={{ px: 1.5, py: 0.5, fontSize: '0.72rem', fontWeight: 700, textTransform: 'none' }}>
            <IconUser size={13} style={{ marginRight: 4 }} /> Externos
          </ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ py: 8, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Box>
      ) : people.length === 0 ? (
        <Box sx={{ py: 8, textAlign: 'center' }}>
          <Typography color="text.secondary">Nenhuma pessoa encontrada.</Typography>
        </Box>
      ) : (
        <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: dark ? alpha('#fff', 0.03) : alpha('#000', 0.02) }}>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Pessoa
                </TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Contatos
                </TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Cliente
                </TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Reuniões
                </TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Tipo
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {people.map((person) => {
                const ids = person.identities ?? [];
                const primaryEmail = ids.find((i) => i.type === 'email' && i.primary)?.value
                  ?? ids.find((i) => i.type === 'email')?.value;
                const otherIds = ids.filter((i) => !(i.type === 'email' && i.value === primaryEmail)).slice(0, 3);
                const meetings = Number(person.meeting_count);

                return (
                  <TableRow
                    key={person.id}
                    hover
                    sx={{ '&:last-child td': { borderBottom: 0 } }}
                  >
                    {/* Name + avatar */}
                    <TableCell sx={{ py: 1.25 }}>
                      <Stack direction="row" spacing={1.25} alignItems="center">
                        <Avatar
                          src={person.avatar_url ?? undefined}
                          sx={{
                            width: 32, height: 32, fontSize: '0.72rem', fontWeight: 700,
                            bgcolor: person.is_internal
                              ? alpha(theme.palette.primary.main, 0.15)
                              : alpha(theme.palette.warning.main, 0.15),
                            color: person.is_internal ? 'primary.main' : 'warning.dark',
                          }}
                        >
                          {initials(person.display_name)}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight={700} sx={{ lineHeight: 1.2 }}>
                            {person.display_name}
                          </Typography>
                          {primaryEmail && (
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                              {primaryEmail}
                            </Typography>
                          )}
                        </Box>
                      </Stack>
                    </TableCell>

                    {/* Identities */}
                    <TableCell sx={{ py: 1.25 }}>
                      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                        {otherIds.map((id, idx) => (
                          <Tooltip key={idx} title={`${id.type}: ${id.value}`}>
                            <Chip
                              icon={identityIcon(id.type)}
                              label={id.value.length > 20 ? id.value.slice(0, 18) + '…' : id.value}
                              size="small"
                              variant="outlined"
                              sx={{ fontSize: '0.65rem', height: 20, maxWidth: 160 }}
                            />
                          </Tooltip>
                        ))}
                        {ids.length === 0 && (
                          <Typography variant="caption" color="text.disabled">—</Typography>
                        )}
                      </Stack>
                    </TableCell>

                    {/* Client */}
                    <TableCell sx={{ py: 1.25 }}>
                      {person.client_name ? (
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <IconBuilding size={13} style={{ opacity: 0.5, flexShrink: 0 }} />
                          {person.client_id ? (
                            <Link href={`/clients/${person.client_id}`} underline="hover"
                              sx={{ fontSize: '0.78rem', fontWeight: 600 }}>
                              {person.client_name}
                            </Link>
                          ) : (
                            <Typography variant="caption" fontWeight={600}>{person.client_name}</Typography>
                          )}
                        </Stack>
                      ) : (
                        <Typography variant="caption" color="text.disabled">—</Typography>
                      )}
                    </TableCell>

                    {/* Meetings */}
                    <TableCell sx={{ py: 1.25 }}>
                      {meetings > 0 ? (
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <IconMicrophone size={13} style={{ opacity: 0.5 }} />
                          <Typography variant="caption" fontWeight={700}>{meetings}</Typography>
                        </Stack>
                      ) : (
                        <Typography variant="caption" color="text.disabled">—</Typography>
                      )}
                    </TableCell>

                    {/* Type */}
                    <TableCell sx={{ py: 1.25 }}>
                      <Chip
                        label={person.is_internal ? 'Interno' : 'Externo'}
                        size="small"
                        color={person.is_internal ? 'primary' : 'default'}
                        sx={{ fontSize: '0.65rem', height: 20, fontWeight: 700 }}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Paper>
      )}
    </Box>
    </AppShell>
  );
}
