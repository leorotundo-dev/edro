'use client';

import { useEffect, useState } from 'react';
import { apiGet, apiPost, apiDelete } from '@/lib/api';
import Avatar from '@mui/material/Avatar';
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
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { IconPlus, IconTrash, IconUsers } from '@tabler/icons-react';

type Persona = {
  id: string;
  name: string;
  description: string;
  momento: 'problema' | 'solucao' | 'decisao';
  demographics?: string;
  pain_points?: string[];
};

const MOMENTO_CONFIG = {
  problema: { label: 'Descoberta', color: '#3b82f6', description: 'Descobrindo o problema' },
  solucao:  { label: 'Avaliando',  color: '#f59e0b', description: 'Avaliando soluções' },
  decisao:  { label: 'Pronto para agir', color: '#10b981', description: 'Pronto para decidir' },
} as const;

const EMPTY_FORM = { name: '', description: '', momento: 'problema' as const, demographics: '', pain_points_raw: '' };

export default function PersonaManager({ clientId }: { clientId: string }) {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    apiGet<{ personas: Persona[] }>(`/clients/${clientId}/personas`)
      .then(res => setPersonas(res?.personas ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [clientId]);

  const handleSave = async () => {
    if (!form.name.trim() || !form.description.trim()) return;
    setSaving(true);
    try {
      const pain_points = form.pain_points_raw
        ? form.pain_points_raw.split(',').map(s => s.trim()).filter(Boolean)
        : undefined;
      const res = await apiPost<{ persona: Persona }>(`/clients/${clientId}/personas`, {
        name: form.name.trim(),
        description: form.description.trim(),
        momento: form.momento,
        demographics: form.demographics.trim() || undefined,
        pain_points: pain_points?.length ? pain_points : undefined,
      });
      if (res?.persona) setPersonas(prev => [...prev, res.persona]);
      setOpen(false);
      setForm(EMPTY_FORM);
    } catch { /* silent */ }
    finally { setSaving(false); }
  };

  const handleDelete = async (personaId: string) => {
    setDeletingId(personaId);
    try {
      await apiDelete(`/clients/${clientId}/personas/${personaId}`);
      setPersonas(prev => prev.filter(p => p.id !== personaId));
    } catch { /* silent */ }
    finally { setDeletingId(null); }
  };

  return (
    <Card variant="outlined" sx={{ borderColor: 'rgba(93,135,255,0.3)' }}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <IconUsers size={20} color="#5D87FF" />
            <Box>
              <Typography variant="h6" fontWeight={700}>Personas</Typography>
              <Typography variant="caption" color="text.secondary">
                Quem vai receber a copy e em que momento de consciência
              </Typography>
            </Box>
          </Stack>
          <Button
            size="small" variant="outlined" startIcon={<IconPlus size={16} />}
            onClick={() => setOpen(true)}
            sx={{ borderColor: '#5D87FF', color: '#5D87FF' }}
          >
            Adicionar
          </Button>
        </Stack>

        {loading && <CircularProgress size={20} sx={{ display: 'block', mx: 'auto', my: 2 }} />}

        {!loading && personas.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
            Nenhuma persona cadastrada. Adicione a primeira para habilitar o direcionamento comportamental nos briefings.
          </Typography>
        )}

        {personas.length > 0 && (
          <Grid container spacing={2}>
            {personas.map(persona => {
              const cfg = MOMENTO_CONFIG[persona.momento] ?? MOMENTO_CONFIG.problema;
              return (
                <Grid key={persona.id} size={{ xs: 12, sm: 6, md: 4 }}>
                  <Card variant="outlined" sx={{ borderTop: `3px solid ${cfg.color}`, height: '100%' }}>
                    <CardContent sx={{ pb: '12px !important' }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                        <Stack direction="row" spacing={1.5} alignItems="center">
                          <Avatar sx={{ bgcolor: cfg.color, width: 34, height: 34, fontSize: '0.9rem', fontWeight: 700 }}>
                            {persona.name[0]?.toUpperCase()}
                          </Avatar>
                          <Box>
                            <Typography variant="subtitle2" fontWeight={700} sx={{ lineHeight: 1.2 }}>
                              {persona.name}
                            </Typography>
                            <Chip label={cfg.label} size="small" sx={{ bgcolor: `${cfg.color}20`, color: cfg.color, fontWeight: 600, height: 18, fontSize: '0.65rem', mt: 0.25 }} />
                          </Box>
                        </Stack>
                        <IconButton
                          size="small"
                          disabled={deletingId === persona.id}
                          onClick={() => handleDelete(persona.id)}
                          sx={{ color: 'text.disabled', '&:hover': { color: '#FA896B' } }}
                        >
                          {deletingId === persona.id ? <CircularProgress size={14} /> : <IconTrash size={16} />}
                        </IconButton>
                      </Stack>

                      <Typography variant="caption" color="text.secondary" sx={{ mt: 1.25, display: 'block', lineHeight: 1.4 }}>
                        {persona.description}
                      </Typography>

                      {persona.pain_points && persona.pain_points.length > 0 && (
                        <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ mt: 1 }}>
                          {persona.pain_points.slice(0, 3).map((pt, i) => (
                            <Chip key={i} label={pt} size="small" variant="outlined" sx={{ height: 18, fontSize: '0.6rem' }} />
                          ))}
                          {persona.pain_points.length > 3 && (
                            <Typography variant="caption" color="text.disabled">+{persona.pain_points.length - 3}</Typography>
                          )}
                        </Stack>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}
      </CardContent>

      {/* Dialog de criação */}
      <Dialog open={open} onClose={() => !saving && setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Nova Persona</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            <TextField
              label="Nome da persona" fullWidth size="small" required
              value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Ex: Diretora de Marketing, Fundador de Startup"
            />
            <TextField
              label="Descrição" fullWidth size="small" required multiline rows={3}
              value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Quem é essa pessoa? O que ela faz? O que ela busca?"
            />
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                Momento de consciência
              </Typography>
              <Stack direction="row" spacing={1}>
                {(Object.entries(MOMENTO_CONFIG) as [keyof typeof MOMENTO_CONFIG, typeof MOMENTO_CONFIG[keyof typeof MOMENTO_CONFIG]][]).map(([key, cfg]) => (
                  <Chip
                    key={key}
                    label={cfg.label}
                    onClick={() => setForm(f => ({ ...f, momento: key }))}
                    sx={{
                      cursor: 'pointer', flex: 1,
                      bgcolor: form.momento === key ? cfg.color : 'transparent',
                      color: form.momento === key ? '#fff' : 'text.secondary',
                      border: `1px solid ${cfg.color}`,
                      fontWeight: form.momento === key ? 700 : 400,
                    }}
                  />
                ))}
              </Stack>
              <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5, display: 'block' }}>
                {MOMENTO_CONFIG[form.momento].description}
              </Typography>
            </Box>
            <TextField
              label="Dados demográficos (opcional)" fullWidth size="small"
              value={form.demographics} onChange={e => setForm(f => ({ ...f, demographics: e.target.value }))}
              placeholder="Ex: 30-45 anos, gestores de empresas com 50+ funcionários"
            />
            <TextField
              label="Dores principais (opcional, separadas por vírgula)" fullWidth size="small"
              value={form.pain_points_raw} onChange={e => setForm(f => ({ ...f, pain_points_raw: e.target.value }))}
              placeholder="Ex: falta de tempo, equipe pequena, orçamento limitado"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpen(false)} disabled={saving}>Cancelar</Button>
          <Button
            variant="contained" onClick={handleSave} disabled={saving || !form.name.trim() || !form.description.trim()}
            startIcon={saving ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : undefined}
            sx={{ bgcolor: '#5D87FF', '&:hover': { bgcolor: '#4570EA' } }}
          >
            {saving ? 'Salvando...' : 'Salvar persona'}
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}
