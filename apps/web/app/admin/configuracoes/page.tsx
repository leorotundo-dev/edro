'use client';

import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import AdminSubmenu from '@/components/admin/AdminSubmenu';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import { alpha } from '@mui/material/styles';
import { IconDeviceFloppy, IconSettings } from '@tabler/icons-react';
import { apiGet, apiPatch } from '@/lib/api';

type TenantConfig = {
  agency_name: string;
  agency_cnpj: string;
  agency_ie: string;
  agency_address: string;
  agency_city: string;
  agency_email: string;
  agency_phone: string;
  agency_representative: string;
  agency_representative_cpf: string;
};

const BLANK: TenantConfig = {
  agency_name: '',
  agency_cnpj: '',
  agency_ie: '',
  agency_address: '',
  agency_city: '',
  agency_email: '',
  agency_phone: '',
  agency_representative: '',
  agency_representative_cpf: '',
};

export default function ConfiguracoesPage() {
  const [form, setForm] = useState<TenantConfig>(BLANK);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    apiGet<{ config: TenantConfig }>('/freelancers/admin/tenant-config')
      .then((res) => setForm({ ...BLANK, ...res.config }))
      .catch((e) => setError(e.message ?? 'Erro ao carregar configurações'))
      .finally(() => setLoading(false));
  }, []);

  const set = (field: keyof TenantConfig, val: string) =>
    setForm((f) => ({ ...f, [field]: val }));

  const save = async () => {
    setSaving(true);
    setError('');
    setSuccess(false);
    try {
      await apiPatch('/freelancers/admin/tenant-config', form);
      setSuccess(true);
    } catch (e: any) {
      setError(e.message ?? 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell title="Configurações da Agência">
      <Box sx={{ p: { xs: 2, md: 3 } }}>
        <Card
          variant="outlined"
          sx={{
            mb: 3,
            borderRadius: 3,
            background:
              'linear-gradient(135deg, rgba(93,135,255,0.10) 0%, rgba(93,135,255,0.03) 55%, rgba(15,23,42,0.02) 100%)',
          }}
        >
          <CardContent sx={{ p: '24px !important' }}>
            <Stack spacing={2.25}>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip label="Agency Settings" color="primary" size="small" sx={{ fontWeight: 700 }} />
                <Chip label="Fiscal" size="small" variant="outlined" />
                <Chip label="Contratos" size="small" variant="outlined" />
              </Stack>

              <Box>
                <Typography variant="h4" fontWeight={800} sx={{ mb: 0.5 }}>
                  Configurações da agência
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Dados fiscais, endereço e representante legal usados em recibos, contratos e
                  fluxos administrativos.
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>

        <AdminSubmenu value="configuracoes" />
      </Box>
      <Box sx={{ p: 3, maxWidth: 700 }}>
        {!loading ? (
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {[
              { label: 'Razão social', value: form.agency_name || '—', helper: 'entidade contratante', color: '#5D87FF' },
              { label: 'CNPJ', value: form.agency_cnpj || '—', helper: 'base fiscal', color: '#13DEB9' },
              { label: 'Cidade / Estado', value: form.agency_city || '—', helper: 'praça da agência', color: '#E85219' },
              { label: 'Representante', value: form.agency_representative || '—', helper: 'assinatura jurídica', color: '#7B61FF' },
            ].map((item) => (
              <Grid key={item.label} size={{ xs: 12, md: 6 }}>
                <Card variant="outlined" sx={{ borderRadius: 3, height: '100%' }}>
                  <CardContent sx={{ p: '18px !important' }}>
                    <Stack spacing={1.25}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                          {item.label}
                        </Typography>
                        <Box
                          sx={{
                            width: 10,
                            height: 10,
                            borderRadius: '50%',
                            bgcolor: item.color,
                            boxShadow: `0 0 0 6px ${alpha(item.color, 0.12)}`,
                          }}
                        />
                      </Stack>
                      <Typography variant="h6" fontWeight={800}>{item.value}</Typography>
                      <Typography variant="body2" color="text.secondary">{item.helper}</Typography>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        ) : null}

        {loading ? (
          <Stack alignItems="center" py={6}><CircularProgress /></Stack>
        ) : (
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="subtitle2" fontWeight={700} mb={2}>Dados Fiscais</Typography>

            <Grid container spacing={2}>
              <Grid size={{ xs: 12 }}>
                <TextField
                  label="Razão Social"
                  value={form.agency_name}
                  onChange={(e) => set('agency_name', e.target.value)}
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="CNPJ"
                  value={form.agency_cnpj}
                  onChange={(e) => set('agency_cnpj', e.target.value)}
                  fullWidth
                  placeholder="00.000.000/0000-00"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Inscrição Estadual"
                  value={form.agency_ie}
                  onChange={(e) => set('agency_ie', e.target.value)}
                  fullWidth
                  placeholder="Isento ou número"
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  label="Endereço completo"
                  value={form.agency_address}
                  onChange={(e) => set('agency_address', e.target.value)}
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Cidade / Estado"
                  value={form.agency_city}
                  onChange={(e) => set('agency_city', e.target.value)}
                  fullWidth
                  placeholder="São Paulo / SP"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Telefone / WhatsApp"
                  value={form.agency_phone}
                  onChange={(e) => set('agency_phone', e.target.value)}
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  label="E-mail de contato"
                  value={form.agency_email}
                  onChange={(e) => set('agency_email', e.target.value)}
                  fullWidth
                  type="email"
                />
              </Grid>
            </Grid>

            <Typography variant="subtitle2" fontWeight={700} mt={3} mb={2}>
              Representante Legal — para assinar contratos
            </Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 7 }}>
                <TextField
                  label="Nome completo do representante"
                  value={form.agency_representative}
                  onChange={(e) => set('agency_representative', e.target.value)}
                  fullWidth
                  placeholder="Nome Sobrenome"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 5 }}>
                <TextField
                  label="CPF do representante"
                  value={form.agency_representative_cpf}
                  onChange={(e) => set('agency_representative_cpf', e.target.value)}
                  fullWidth
                  placeholder="000.000.000-00"
                />
              </Grid>
            </Grid>

            {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mt: 2 }}>Configurações salvas com sucesso!</Alert>}

            <Stack direction="row" justifyContent="flex-end" mt={3}>
              <Button
                variant="contained"
                startIcon={saving ? <CircularProgress size={16} /> : <IconDeviceFloppy size={16} />}
                disabled={saving}
                onClick={save}
              >
                Salvar
              </Button>
            </Stack>
          </Paper>
        )}
      </Box>
    </AppShell>
  );
}
