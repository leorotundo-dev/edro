'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Checkbox from '@mui/material/Checkbox';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import { IconShieldCheck, IconTrash } from '@tabler/icons-react';
import { apiGet, apiPost, apiDelete } from '@/lib/api';
import { useRole } from '@/hooks/useRole';

type UserPerm = {
  user_id: string;
  email: string;
  name: string;
  perms: string[];
};

type TenantUser = {
  id: string;
  email: string;
  name: string | null;
  role: string;
};

const ALL_PERMS = ['read', 'write', 'review', 'publish'] as const;

const PERM_LABELS: Record<string, string> = {
  read: 'Leitura',
  write: 'Escrita',
  review: 'Revisao',
  publish: 'Publicacao',
};

export default function ClientPermissionsPage() {
  const params = useParams();
  const clientId = params.id as string;
  const { isAdmin } = useRole();

  const [permissions, setPermissions] = useState<UserPerm[]>([]);
  const [allUsers, setAllUsers] = useState<TenantUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [permsData, usersData] = await Promise.all([
        apiGet<{ permissions: UserPerm[] }>(`/admin/clients/${clientId}/permissions`),
        apiGet<{ users: TenantUser[] }>('/admin/users'),
      ]);
      setPermissions(permsData.permissions || []);
      setAllUsers(usersData.users || []);
    } catch (err: any) {
      setError(err?.message || 'Erro ao carregar permissoes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [clientId]);

  const togglePerm = async (userId: string, perm: string) => {
    const userPerm = permissions.find((p) => p.user_id === userId);
    const currentPerms = userPerm?.perms || [];
    const newPerms = currentPerms.includes(perm)
      ? currentPerms.filter((p) => p !== perm)
      : [...currentPerms, perm];

    try {
      setError('');
      await apiPost(`/admin/clients/${clientId}/permissions`, { userId, perms: newPerms });

      setPermissions((prev) => {
        const existing = prev.find((p) => p.user_id === userId);
        if (existing) {
          return prev.map((p) => (p.user_id === userId ? { ...p, perms: newPerms } : p));
        }
        const user = allUsers.find((u) => u.id === userId);
        return [...prev, { user_id: userId, email: user?.email || '', name: user?.name || '', perms: newPerms }];
      });

      setSuccess('Permissão atualizada.');
      setTimeout(() => setSuccess(''), 2000);
    } catch (err: any) {
      setError(err?.message || 'Erro ao atualizar permissão.');
    }
  };

  const removeUser = async (userId: string) => {
    try {
      setError('');
      await apiDelete(`/admin/clients/${clientId}/permissions/${userId}`);
      setPermissions((prev) => prev.filter((p) => p.user_id !== userId));
      setSuccess('Permissoes removidas.');
      setTimeout(() => setSuccess(''), 2000);
    } catch (err: any) {
      setError(err?.message || 'Erro ao remover permissoes.');
    }
  };

  // Users not yet in the permissions list
  const availableUsers = allUsers.filter(
    (u) => !permissions.some((p) => p.user_id === u.id) && u.role !== 'admin'
  );

  if (!isAdmin) {
    return (
      <Box sx={{ py: 4 }}>
        <Alert severity="warning">Apenas administradores podem gerenciar permissoes de clientes.</Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <IconShieldCheck size={28} stroke={1.5} />
        <Box>
          <Typography variant="h5" fontWeight={700}>Permissoes do Cliente</Typography>
          <Typography variant="body2" color="text.secondary">
            Controle quais usuarios tem acesso a este cliente e com quais permissoes.
          </Typography>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell><strong>Usuario</strong></TableCell>
                  {ALL_PERMS.map((p) => (
                    <TableCell key={p} align="center"><strong>{PERM_LABELS[p]}</strong></TableCell>
                  ))}
                  <TableCell align="center"><strong>Acoes</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {permissions.map((userPerm) => (
                  <TableRow key={userPerm.user_id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>{userPerm.name || userPerm.email}</Typography>
                      <Typography variant="caption" color="text.secondary">{userPerm.email}</Typography>
                    </TableCell>
                    {ALL_PERMS.map((perm) => (
                      <TableCell key={perm} align="center">
                        <Checkbox
                          checked={userPerm.perms.includes(perm)}
                          onChange={() => togglePerm(userPerm.user_id, perm)}
                          size="small"
                        />
                      </TableCell>
                    ))}
                    <TableCell align="center">
                      <IconButton size="small" color="error" onClick={() => removeUser(userPerm.user_id)}>
                        <IconTrash size={18} />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {permissions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={ALL_PERMS.length + 2} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">
                        Nenhuma permissão específica configurada. Todos os membros da equipe têm acesso padrão.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {availableUsers.length > 0 && (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Adicionar usuario:</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {availableUsers.map((user) => (
                  <Button
                    key={user.id}
                    variant="outlined"
                    size="small"
                    onClick={() => togglePerm(user.id, 'read')}
                  >
                    + {user.name || user.email}
                  </Button>
                ))}
              </Box>
            </Box>
          )}
        </>
      )}
    </Box>
  );
}
