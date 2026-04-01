'use client';

import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import AdminSubmenu from '@/components/admin/AdminSubmenu';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Avatar from '@mui/material/Avatar';
import Card from '@mui/material/Card';
import Divider from '@mui/material/Divider';
import InputAdornment from '@mui/material/InputAdornment';
import Paper from '@mui/material/Paper';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { alpha } from '@mui/material/styles';
import { IconSearch, IconUsers } from '@tabler/icons-react';
import { apiGet, apiPatch } from '@/lib/api';

type User = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  status: string;
  last_login_at: string | null;
  created_at: string;
};

const ROLES = ['admin', 'manager', 'staff', 'reviewer', 'viewer'] as const;

const ROLE_COLORS: Record<string, 'error' | 'warning' | 'primary' | 'info' | 'default'> = {
  admin: 'error',
  manager: 'warning',
  staff: 'primary',
  reviewer: 'info',
  viewer: 'default',
};

function initials(name: string | null, email: string) {
  const base = (name || email).trim();
  return base
    .split(/\s+/)
    .map((chunk) => chunk[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function AdminUsersView({ embedded = false }: { embedded?: boolean }) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await apiGet<{ users: User[] }>('/admin/users');
      setUsers(data.users || []);
    } catch (err: any) {
      setError(err?.message || 'Erro ao carregar usuários.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, []);

  const activeUsers = users.filter((user) => user.status === 'active').length;
  const adminUsers = users.filter((user) => user.role === 'admin').length;
  const inactiveUsers = users.length - activeUsers;
  const filteredUsers = users.filter((user) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      user.email.toLowerCase().includes(q) ||
      (user.name ?? '').toLowerCase().includes(q) ||
      user.role.toLowerCase().includes(q)
    );
  });

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      setError('');
      setSuccess('');
      await apiPatch(`/admin/users/${userId}/role`, { role: newRole });
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
      setSuccess('Papel atualizado com sucesso.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err?.message || 'Erro ao atualizar papel.');
    }
  };

  const content = (
    <Box>
        {!embedded ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <IconUsers size={28} stroke={1.5} />
            <Box>
              <Typography variant="h5" fontWeight={700}>Gerenciamento de Usuários</Typography>
              <Typography variant="body2" color="text.secondary">
                Gerencie papéis e permissões dos membros da equipe.
              </Typography>
            </Box>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2.5 }}>
            <Chip label={`${users.length} contas`} size="small" variant="outlined" />
            <Chip label={`${activeUsers} ativas`} size="small" color="primary" variant="outlined" />
            <Chip label={`${adminUsers} admins`} size="small" color="error" variant="outlined" />
            <Chip label={`${inactiveUsers} inativas`} size="small" color="default" variant="outlined" />
          </Box>
        )}

        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', md: 'center' }} sx={{ mb: 2.5 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Buscar por nome, email ou papel..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <IconSearch size={16} style={{ opacity: 0.5 }} />
                </InputAdornment>
              ),
            }}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
          />
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip label={`${users.length} contas`} size="small" variant="outlined" />
            <Chip label={`${activeUsers} ativas`} size="small" color="success" variant="outlined" />
            <Chip label={`${adminUsers} admins`} size="small" color="error" variant="outlined" />
          </Stack>
        </Stack>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Stack spacing={1.5}>
            {filteredUsers.map((user) => (
              <Card
                key={user.id}
                variant="outlined"
                sx={(theme) => ({
                  borderRadius: 3,
                  borderColor: alpha(
                    user.status === 'active' ? theme.palette.success.main : theme.palette.divider,
                    user.status === 'active' ? 0.2 : 1,
                  ),
                  backgroundImage: user.status === 'active'
                    ? `linear-gradient(180deg, ${alpha(theme.palette.success.main, 0.04)} 0%, transparent 100%)`
                    : 'none',
                })}
              >
                <Stack
                  direction={{ xs: 'column', lg: 'row' }}
                  spacing={2}
                  justifyContent="space-between"
                  sx={{ px: 2.25, py: 2 }}
                >
                  <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0, flex: 1 }}>
                    <Avatar sx={{ bgcolor: alpha('#4570EA', 0.14), color: 'primary.main', fontWeight: 800 }}>
                      {initials(user.name, user.email)}
                    </Avatar>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body1" fontWeight={800} noWrap>
                        {user.name || 'Sem nome'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" noWrap>
                        {user.email}
                      </Typography>
                      <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 0.75 }}>
                        <Chip
                          label={user.status === 'active' ? 'Ativo' : 'Inativo'}
                          color={user.status === 'active' ? 'success' : 'default'}
                          size="small"
                        />
                        <Chip
                          label={`Criado em ${new Date(user.created_at).toLocaleDateString('pt-BR')}`}
                          size="small"
                          variant="outlined"
                        />
                      </Stack>
                    </Box>
                  </Stack>

                  <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', lg: 'block' } }} />

                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }}>
                    <Box sx={{ minWidth: 160 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 700 }}>
                        Papel
                      </Typography>
                      <Select
                        fullWidth
                        value={user.role}
                        size="small"
                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                      >
                        {ROLES.map((r) => (
                          <MenuItem key={r} value={r}>
                            <Chip
                              label={r.charAt(0).toUpperCase() + r.slice(1)}
                              size="small"
                              color={ROLE_COLORS[r] || 'default'}
                              sx={{ fontWeight: 600 }}
                            />
                          </MenuItem>
                        ))}
                      </Select>
                    </Box>

                    <Box sx={{ minWidth: 160 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 700 }}>
                        Último acesso
                      </Typography>
                      <Typography variant="body2" fontWeight={700}>
                        {user.last_login_at
                          ? new Date(user.last_login_at).toLocaleDateString('pt-BR', {
                              day: '2-digit', month: '2-digit', year: 'numeric',
                              hour: '2-digit', minute: '2-digit',
                            })
                          : 'Nunca acessou'}
                      </Typography>
                    </Box>
                  </Stack>
                </Stack>
              </Card>
            ))}

            {filteredUsers.length === 0 && (
              <Paper variant="outlined" sx={{ py: 6, px: 2, textAlign: 'center', borderRadius: 3 }}>
                <Typography color="text.secondary">Nenhum usuário encontrado.</Typography>
              </Paper>
            )}
          </Stack>
        )}
      </Box>
  );

  if (embedded) return content;

  return (
    <AppShell title="System Admin">
      <Box>
        <AdminSubmenu value="pessoas" />
        {content}
      </Box>
    </AppShell>
  );
}

export default function AdminUsersPage() {
  return <AdminUsersView />;
}
