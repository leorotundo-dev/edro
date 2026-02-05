'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet, apiPatch } from '@/lib/api';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';

type BriefingPayload = {
  id: string;
  title: string;
  client_name?: string | null;
};

type MockupItem = {
  id: string;
  platform?: string | null;
  format?: string | null;
  status?: string | null;
  title?: string | null;
  metadata?: Record<string, any> | null;
  created_at?: string | null;
};

const readTextResponse = (payload: any) => {
  if (!payload) return '';
  if (typeof payload === 'string') return payload;
  if (typeof payload?.raw === 'string') return payload.raw;
  return '';
};

export default function ExportClient() {
  const router = useRouter();
  const [briefing, setBriefing] = useState<BriefingPayload | null>(null);
  const [mockups, setMockups] = useState<MockupItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const briefingId = typeof window !== 'undefined' ? window.localStorage.getItem('edro_briefing_id') : null;

  const loadData = useCallback(async () => {
    if (!briefingId) {
      setError('Nenhum briefing ativo encontrado. Volte ao passo 1.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await apiGet<{ success: boolean; data: any }>(`/edro/briefings/${briefingId}`);
      const data = response?.data;
      setBriefing(data?.briefing || null);
    } catch (err: any) {
      setError(err?.message || 'Falha ao carregar briefing.');
    }

    try {
      const response = await apiGet<MockupItem[]>(`/mockups?briefing_id=${briefingId}`);
      setMockups(response || []);
    } catch (err: any) {
      setError(err?.message || 'Falha ao carregar mockups.');
    } finally {
      setLoading(false);
    }
  }, [briefingId]);

  useEffect(() => {
    if (!briefingId) return;
    apiPatch(`/edro/briefings/${briefingId}/stages/entrega`, { status: 'in_progress' }).catch(() => null);
  }, [briefingId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const selectAll = () => {
    setSelectedIds(mockups.map((item) => item.id));
  };

  const clearSelection = () => {
    setSelectedIds([]);
  };

  const exportZip = async (mode: 'html' | 'json') => {
    const ids = selectedIds.length ? selectedIds : mockups.map((item) => item.id);
    if (!ids.length) return;
    setExporting(true);
    setError('');
    setSuccess('');

    try {
      const jsZipModule = await import('jszip');
      const JSZip = jsZipModule.default;
      const zip = new JSZip();

      for (const id of ids) {
        if (mode === 'html') {
          const payload = await apiGet<any>(`/mockups/${id}/html`);
          const html = readTextResponse(payload);
          if (html) {
            zip.file(`mockup-${id}.html`, html);
          }
        } else {
          const json = await apiGet<any>(`/mockups/${id}/json`);
          if (json) {
            zip.file(`mockup-${id}.json`, JSON.stringify(json, null, 2));
          }
        }
      }

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `mockups-${mode}-${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setSuccess('Exportação concluída.');
    } catch (err: any) {
      setError(err?.message || 'Falha ao exportar mockups.');
    } finally {
      setExporting(false);
    }
  };

  const finishDelivery = async () => {
    if (!briefingId) return;
    try {
      await apiPatch(`/edro/briefings/${briefingId}/stages/entrega`, { status: 'done' });
      setSuccess('Entrega finalizada.');
      router.push('/clients');
    } catch (err: any) {
      setError(err?.message || 'Falha ao finalizar entrega.');
    }
  };

  const selectionLabel = useMemo(() => {
    if (!selectedIds.length) return 'Nenhuma seleção';
    return `${selectedIds.length} selecionados`;
  }, [selectedIds]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
        <CircularProgress />
        <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
          Carregando exportação...
        </Typography>
      </Box>
    );
  }

  return (
    <Stack spacing={3}>
      {/* Page Header */}
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'center' }} spacing={2}>
        <Box>
          <Typography variant="h4" fontWeight={700}>Exportação &amp; Produção</Typography>
          <Typography variant="body2" color="text.secondary">
            Baixe os arquivos finais e conclua a entrega.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Chip size="small" variant="outlined" label={`${mockups.length} mockups`} />
          {briefing?.client_name ? <Chip size="small" variant="outlined" label={briefing.client_name} /> : null}
        </Stack>
      </Stack>

      {error ? <Alert severity="error">{error}</Alert> : null}
      {success ? <Alert severity="success">{success}</Alert> : null}

      <Grid container spacing={3}>
        {/* Main Panel */}
        <Grid size={{ xs: 12, lg: 8 }}>
          <Stack spacing={3}>
            <Card>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                  <Typography variant="h6">Mockups prontos</Typography>
                  <Typography variant="caption" color="text.secondary">{mockups.length} itens</Typography>
                </Stack>
                {mockups.length ? (
                  <Grid container spacing={2}>
                    {mockups.map((mockup) => (
                      <Grid size={{ xs: 12, md: 6, xl: 4 }} key={mockup.id}>
                        <Card
                          variant={selectedIds.includes(mockup.id) ? 'elevation' : 'outlined'}
                          sx={{
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            textAlign: 'left',
                            ...(selectedIds.includes(mockup.id) ? { borderColor: 'primary.main', bgcolor: 'primary.lighter' } : {}),
                          }}
                          onClick={() => toggleSelect(mockup.id)}
                        >
                          <CardContent>
                            <Typography variant="overline" color="text.secondary">
                              {mockup.platform} &bull; {mockup.format}
                            </Typography>
                            <Typography variant="subtitle2" fontWeight={600} sx={{ mt: 1 }}>
                              {mockup.title || 'Mockup'}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{
                                mt: 1,
                                display: '-webkit-box',
                                overflow: 'hidden',
                                WebkitLineClamp: 3,
                                WebkitBoxOrient: 'vertical',
                              }}
                            >
                              {mockup.metadata?.copy || mockup.metadata?.shortText || 'Sem preview de copy.'}
                            </Typography>
                            <Typography variant="overline" color="text.secondary" sx={{ mt: 1.5, display: 'block' }}>
                              {mockup.status || 'draft'}
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                    Nenhum mockup salvo ainda.
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Stack>
        </Grid>

        {/* Sidebar */}
        <Grid size={{ xs: 12, lg: 4 }}>
          <Stack spacing={3}>
            <Card>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                  <Typography variant="h6">Briefing</Typography>
                  <Typography variant="caption" color="text.secondary">Resumo</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="subtitle2" fontWeight={600}>{briefing?.title || 'Briefing'}</Typography>
                  <Typography variant="caption" color="text.secondary">{briefing?.client_name || 'Cliente'}</Typography>
                </Stack>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                  <Typography variant="h6">Seleção</Typography>
                  <Typography variant="caption" color="text.secondary">{selectionLabel}</Typography>
                </Stack>
                <Stack direction="row" spacing={1} sx={{ mt: 1.5, flexWrap: 'wrap' }}>
                  <Button variant="text" size="small" onClick={selectAll}>
                    Selecionar todos
                  </Button>
                  <Button variant="text" size="small" onClick={clearSelection}>
                    Limpar
                  </Button>
                </Stack>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                  <Typography variant="h6">Exportação</Typography>
                  <Typography variant="caption" color="text.secondary">Arquivos</Typography>
                </Stack>
                <Stack spacing={1}>
                  <Button variant="contained" fullWidth onClick={() => exportZip('html')} disabled={exporting}>
                    Exportar HTML
                  </Button>
                  <Button variant="outlined" fullWidth onClick={() => exportZip('json')} disabled={exporting}>
                    Exportar JSON
                  </Button>
                  <Button variant="outlined" fullWidth onClick={finishDelivery}>
                    Finalizar entrega
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Grid>
      </Grid>

      {/* Footer actions */}
      <Stack direction="row" justifyContent="flex-end" spacing={2}>
        <Button variant="outlined" onClick={() => router.push('/studio/mockups')}>
          Voltar ao Passo 4
        </Button>
      </Stack>
    </Stack>
  );
}
