'use client';

import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import AdminSubmenu from '@/components/admin/AdminSubmenu';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import { IconUsers } from '@tabler/icons-react';
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

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await apiGet<{ users: User[] }>('/admin/users');
      setUsers(data.users || []);
    } catch (err: any) {
      setError(err?.message || 'Erro ao carregar usuarios.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, []);

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

  return (
    <AppShell title="System Admin">
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <IconUsers size={28} stroke={1.5} />
          <Box>
            <Typography variant="h5" fontWeight={700}>Gerenciamento de Usuarios</Typography>
            <Typography variant="body2" color="text.secondary">
              Gerencie papeis e permissoes dos membros da equipe.
            </Typography>
          </Box>
        </Box>

        <AdminSubmenu value="users" />

        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell><strong>Nome</strong></TableCell>
                  <TableCell><strong>Email</strong></TableCell>
                  <TableCell><strong>Papel</strong></TableCell>
                  <TableCell><strong>Status</strong></TableCell>
                  <TableCell><strong>Ultimo Login</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id} hover>
                    <TableCell>{user.name || '-'}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Select
                        value={user.role}
                        size="small"
                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                        sx={{ minWidth: 130 }}
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
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={user.status === 'active' ? 'Ativo' : 'Inativo'}
                        color={user.status === 'active' ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {user.last_login_at
                        ? new Date(user.last_login_at).toLocaleDateString('pt-BR', {
                            day: '2-digit', month: '2-digit', year: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                          })
                        : 'Nunca'}
                    </TableCell>
                  </TableRow>
                ))}
                {users.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">Nenhum usuario encontrado.</Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
    </AppShell>
  );
}
