'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { apiGet, apiPost } from '@/lib/api';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import MenuItem from '@mui/material/MenuItem';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import {
  IconChevronRight,
  IconMail,
  IconMessageCircle,
  IconPalette,
  IconSend,
} from '@tabler/icons-react';

type Briefing = {
  id: string;
  client_name: string | null;
  title: string;
  status: string;
  payload: Record<string, any>;
};

type Copy = {
  id: string;
  output: string;
  created_at: string;
};

type Stage = {
  id: string;
  stage: string;
  status: string;
};

type User = {
  id?: string;
  email?: string;
  role?: string;
  name?: string;
};

export default function ProducaoClient({ briefingId }: { briefingId: string }) {
  const router = useRouter();
  const [user, setUser] = useState<User>({});
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [copies, setCopies] = useState<Copy[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [validationError, setValidationError] = useState('');
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false, message: '', severity: 'success',
  });

  const [formData, setFormData] = useState({
    assigned_to: '',
    message: '',
    copy_version_id: '',
    notify_whatsapp: true,
    notify_email: true,
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiGet<{
        success: boolean;
        data: {
          briefing: Briefing;
          stages: Stage[];
          copies: Copy[];
        };
      }>(`/edro/briefings/${briefingId}`);

      if (response?.data) {
        setBriefing(response.data.briefing);
        setStages(response.data.stages);
        setCopies(response.data.copies);
        if (response.data.copies.length > 0) {
          setFormData((prev) => ({
            ...prev,
            copy_version_id: response.data.copies[0].id,
          }));
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Falha ao carregar dados.');
    } finally {
      setLoading(false);
    }
  }, [briefingId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem('edro_user');
    if (!stored) return;
    try {
      setUser(JSON.parse(stored));
    } catch {
      setUser({});
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.assigned_to.trim()) {
      setValidationError('Preencha o e-mail do designer.');
      return;
    }
    setValidationError('');

    setSubmitting(true);
    try {
      const channels = [];
      if (formData.notify_whatsapp) channels.push('whatsapp');
      if (formData.notify_email) channels.push('email');

      await apiPost(`/edro/briefings/${briefingId}/assign-da`, {
        assigned_to: formData.assigned_to,
        channels,
        message: formData.message || undefined,
        copy_version_id: formData.copy_version_id || undefined,
      });

      setSnackbar({ open: true, message: 'Designer atribuído com sucesso! Notificações enviadas.', severity: 'success' });
      setTimeout(() => router.push(`/edro/${briefingId}`), 1500);
    } catch (err: any) {
      setSnackbar({ open: true, message: err?.message || 'Erro ao atribuir designer.', severity: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    router.push(`/edro/${briefingId}`);
  };

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Stack alignItems="center" spacing={2}>
          <CircularProgress size={32} />
          <Typography variant="body2" color="text.secondary">Carregando...</Typography>
        </Stack>
      </Box>
    );
  }

  if (error || !briefing) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Stack alignItems="center" spacing={2}>
          <Typography variant="h2">&#x26A0;&#xFE0F;</Typography>
          <Typography variant="body2" color="text.secondary">{error || 'Briefing não encontrado.'}</Typography>
          <Button variant="contained" onClick={handleBack}>Voltar</Button>
        </Stack>
      </Box>
    );
  }

  const producaoStage = stages.find((s) => s.stage === 'producao');
  const canAssign = producaoStage?.status === 'pending' || producaoStage?.status === 'in_progress';
  const hasPermission = user?.role === 'gestor' || user?.role === 'admin' || user?.role === 'staff';

  if (!canAssign) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Stack alignItems="center" spacing={2}>
          <Typography variant="h2">&#x1F512;</Typography>
          <Typography variant="h6">Produção não disponível</Typography>
          <Typography variant="body2" color="text.secondary">
            A etapa de produção ainda não foi liberada ou já foi concluída.
          </Typography>
          <Button variant="contained" onClick={handleBack}>Voltar para Briefing</Button>
        </Stack>
      </Box>
    );
  }

  if (!hasPermission) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Stack alignItems="center" spacing={2}>
          <Typography variant="h2">&#x1F6AB;</Typography>
          <Typography variant="h6">Acesso Negado</Typography>
          <Typography variant="body2" color="text.secondary">
            Apenas usuários com perfil <strong>Gestor</strong>, <strong>Admin</strong> ou <strong>Staff</strong> podem atribuir designers.
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Seu perfil atual: <strong>{user?.role || 'Não identificado'}</strong>
          </Typography>
          <Button variant="contained" onClick={handleBack}>Voltar para Briefing</Button>
        </Stack>
      </Box>
    );
  }

  return (
    <AppShell
      title="Atribuir Designer"
      topbarLeft={
        <Stack direction="row" spacing={1} alignItems="center">
          <Button size="small" onClick={handleBack} sx={{ color: 'text.secondary', textTransform: 'none' }}>
            Edro
          </Button>
          <IconChevronRight size={14} />
          <Button
            size="small"
            onClick={handleBack}
            sx={{ color: 'text.secondary', textTransform: 'none', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}
          >
            {briefing.title}
          </Button>
          <IconChevronRight size={14} />
          <Typography variant="body2" fontWeight={500}>Atribuir Designer</Typography>
        </Stack>
      }
    >
      <Box sx={{ p: 3, maxWidth: 900, mx: 'auto' }}>
        {/* Header */}
        <Alert
          severity="info"
          icon={<IconPalette size={28} />}
          sx={{ mb: 3 }}
        >
          <Typography variant="h6" sx={{ mb: 0.5 }}>
            Atribuir Produção - {briefing.title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            <strong>Cliente:</strong> {briefing.client_name || 'N/A'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Atribua um designer artístico (DA) para criar os assets visuais desta campanha.
          </Typography>
        </Alert>

        <form onSubmit={handleSubmit}>
          <Stack spacing={3}>
            {/* Informações do Designer */}
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                  Designer Artístico
                </Typography>

                <Stack spacing={2}>
                  <TextField
                    fullWidth
                    size="small"
                    label="E-mail do Designer *"
                    name="assigned_to"
                    type="email"
                    value={formData.assigned_to}
                    onChange={(e) => { setValidationError(''); handleChange(e); }}
                    required
                    error={!!validationError}
                    placeholder="designer@edro.digital"
                  />
                  {validationError && (
                    <Alert severity="warning" sx={{ py: 0.25, fontSize: '0.8rem' }}>{validationError}</Alert>
                  )}

                  <TextField
                    fullWidth
                    size="small"
                    multiline
                    rows={4}
                    label="Mensagem (Opcional)"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    placeholder="Instruções especiais, referências, ou observações para o designer..."
                  />
                </Stack>
              </CardContent>
            </Card>

            {/* Copy Aprovada */}
            {copies.length > 0 && (
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                    Copy Aprovada
                  </Typography>

                  <Stack spacing={2}>
                    <TextField
                      fullWidth
                      size="small"
                      select
                      label="Selecionar Copy"
                      name="copy_version_id"
                      value={formData.copy_version_id}
                      onChange={handleChange}
                    >
                      {copies.map((copy, index) => (
                        <MenuItem key={copy.id} value={copy.id}>
                          Versão {index + 1} - {new Date(copy.created_at).toLocaleString('pt-BR')}
                        </MenuItem>
                      ))}
                    </TextField>

                    {formData.copy_version_id && (() => {
                      const idx = copies.findIndex((c) => c.id === formData.copy_version_id);
                      const copy = copies[idx];
                      return (
                        <Card variant="outlined" sx={{ bgcolor: 'grey.50' }}>
                          <CardContent>
                            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                              <Chip size="small" label={`Versão ${idx + 1}`} color="primary" variant="outlined" sx={{ fontWeight: 600 }} />
                              <Typography variant="caption" color="text.secondary">
                                {copy ? new Date(copy.created_at).toLocaleString('pt-BR') : ''}
                              </Typography>
                            </Stack>
                            <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
                              {copy?.output || ''}
                            </Typography>
                          </CardContent>
                        </Card>
                      );
                    })()}
                  </Stack>
                </CardContent>
              </Card>
            )}

            {/* Canais de Notificação */}
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                  Canais de Notificação
                </Typography>

                <Stack spacing={1}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Switch
                      name="notify_email"
                      checked={formData.notify_email}
                      onChange={(e) => setFormData((prev) => ({ ...prev, notify_email: e.target.checked }))}
                    />
                    <IconMail size={18} />
                    <Typography variant="body2">Enviar notificação por Email</Typography>
                  </Stack>

                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Switch
                      name="notify_whatsapp"
                      checked={formData.notify_whatsapp}
                      onChange={(e) => setFormData((prev) => ({ ...prev, notify_whatsapp: e.target.checked }))}
                    />
                    <IconMessageCircle size={18} />
                    <Typography variant="body2">Enviar notificação por WhatsApp</Typography>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>

            {/* Ações */}
            <Stack direction="row" spacing={1.5} justifyContent="flex-end">
              <Button
                variant="outlined"
                onClick={handleBack}
                disabled={submitting}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={submitting}
                startIcon={
                  submitting
                    ? <CircularProgress size={16} color="inherit" />
                    : <IconSend size={16} />
                }
              >
                {submitting ? 'Atribuindo...' : 'Atribuir Designer'}
              </Button>
            </Stack>
          </Stack>
        </form>
      </Box>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </AppShell>
  );
}
