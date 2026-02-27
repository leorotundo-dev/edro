'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet, apiPatch, apiPost } from '@/lib/api';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Skeleton from '@mui/material/Skeleton';
import Grid from '@mui/material/Grid';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Tooltip from '@mui/material/Tooltip';
import { IconShieldCheck, IconShieldExclamation, IconShieldX, IconSparkles, IconAlertTriangle } from '@tabler/icons-react';

type CopyVersion = {
  id: string;
  output: string;
  model?: string | null;
  payload?: Record<string, any> | null;
  created_at?: string | null;
};

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

function EthicsBadge({ copy }: { copy: CopyVersion }) {
  const policyCheck = copy.payload?._edro?.policy_check as
    | { status: 'approved' | 'flagged' | 'blocked'; policies_triggered?: string[]; rationale?: string }
    | undefined;

  if (!policyCheck) return null;

  const cfg = {
    approved: { icon: <IconShieldCheck size={13} />, color: 'success' as const, label: 'Aprovado' },
    flagged:  { icon: <IconShieldExclamation size={13} />, color: 'warning' as const, label: 'Sinalizado' },
    blocked:  { icon: <IconShieldX size={13} />, color: 'error' as const, label: 'Bloqueado' },
  }[policyCheck.status] ?? { icon: <IconShieldCheck size={13} />, color: 'default' as const, label: policyCheck.status };

  const tooltip = policyCheck.rationale
    ? `${policyCheck.rationale}${policyCheck.policies_triggered?.length ? `\n\nPolíticas: ${policyCheck.policies_triggered.join(', ')}` : ''}`
    : cfg.label;

  return (
    <Tooltip title={<span style={{ whiteSpace: 'pre-line', fontSize: '0.72rem' }}>{tooltip}</span>} arrow>
      <Chip
        size="small"
        icon={cfg.icon}
        label={cfg.label}
        color={cfg.color}
        variant="outlined"
        sx={{ height: 20, fontSize: '0.65rem', cursor: 'help' }}
      />
    </Tooltip>
  );
}

const resolveProviderLabel = (copy: CopyVersion) => {
  const meta = copy.payload || {};
  const provider = meta?.provider || meta?._edro?.provider || '';
  const model = copy.model || meta?.model || meta?._edro?.model || '';
  const normalized = String(provider || model).toLowerCase();
  if (normalized.includes('gemini')) return 'Gemini';
  if (normalized.includes('claude')) return 'Claude';
  if (normalized.includes('openai') || normalized.includes('gpt')) return 'OpenAI';
  return model || provider || 'IA';
};

export default function ReviewClient() {
  const router = useRouter();
  const [briefing, setBriefing] = useState<BriefingPayload | null>(null);
  const [copies, setCopies] = useState<CopyVersion[]>([]);
  const [mockups, setMockups] = useState<MockupItem[]>([]);
  const [selectedCopyId, setSelectedCopyId] = useState<string>('');
  const [selectedMockups, setSelectedMockups] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [aiReview, setAiReview] = useState<{ overall_score: number; summary: string; warnings: string[] } | null>(null);

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
      setCopies(data?.copies || []);
      if (data?.copies?.length) {
        setSelectedCopyId(data.copies[0].id);
      }
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
    apiPatch(`/edro/briefings/${briefingId}/stages/revisao`, { status: 'in_progress' }).catch(() => null);
  }, [briefingId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-load AI review summary once copies/mockups are loaded
  useEffect(() => {
    if (!briefing || (!copies.length && !mockups.length)) return;
    const copyTexts = copies.slice(0, 3).map((c) => c.output).filter(Boolean);
    const mockupTexts = mockups.slice(0, 3)
      .map((m) => m.metadata?.copy || m.metadata?.shortText || '')
      .filter(Boolean);
    const allTexts = [...copyTexts, ...mockupTexts].slice(0, 5);
    if (!allTexts.length) return;
    apiPost<{ success: boolean; data: { overall_score: number; summary: string; warnings: string[] } }>('/ai/review-summary', {
      briefing_id: briefing.id,
      copies: allTexts,
    }).then((res) => {
      if (res?.data) setAiReview(res.data);
    }).catch(() => {});
  }, [briefing, copies, mockups]);

  const toggleMockup = (id: string) => {
    setSelectedMockups((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const approveSelected = async () => {
    if (!selectedMockups.length) return;
    setError('');
    setSuccess('');
    try {
      await Promise.all(
        selectedMockups.map((id) => apiPatch(`/mockups/${id}`, { status: 'approved' }))
      );
      setSuccess('Mockups aprovados.');
      await loadData();
      setSelectedMockups([]);
    } catch (err: any) {
      setError(err?.message || 'Falha ao aprovar mockups.');
    }
  };

  const requestChanges = async () => {
    if (!selectedMockups.length) return;
    setError('');
    setSuccess('');
    try {
      await Promise.all(
        selectedMockups.map((id) => apiPatch(`/mockups/${id}`, { status: 'changes_requested' }))
      );
      setSuccess('Revisoes solicitadas.');
      await loadData();
      setSelectedMockups([]);
    } catch (err: any) {
      setError(err?.message || 'Falha ao solicitar revisoes.');
    }
  };

  const markDone = async () => {
    if (!briefingId) return;
    try {
      await apiPatch(`/edro/briefings/${briefingId}/stages/revisao`, { status: 'done' });
      router.push('/studio/export');
    } catch (err: any) {
      setError(err?.message || 'Falha ao avancar etapa.');
    }
  };

  const selectedCopy = useMemo(() => copies.find((copy) => copy.id === selectedCopyId) || null, [copies, selectedCopyId]);

  if (loading) {
    return (
      <Stack spacing={3}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack spacing={0.5}>
            <Skeleton width={180} height={28} />
            <Skeleton width={260} height={18} />
          </Stack>
          <Skeleton width={120} height={36} sx={{ borderRadius: 2 }} />
        </Stack>
        <Grid container spacing={2}>
          {[1, 2, 3].map((i) => (
            <Grid key={i} size={{ xs: 12, sm: 6, md: 4 }}>
              <Skeleton variant="rounded" height={200} sx={{ borderRadius: 2 }} />
              <Skeleton width="60%" height={20} sx={{ mt: 1 }} />
            </Grid>
          ))}
        </Grid>
        <Skeleton variant="rounded" height={80} sx={{ borderRadius: 2 }} />
      </Stack>
    );
  }

  return (
    <Stack spacing={3}>
      {/* Page Header */}
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'center' }} spacing={2}>
        <Box>
          <Typography variant="h4" fontWeight={700}>Revisao &amp; Acoes</Typography>
          <Typography variant="body2" color="text.secondary">
            Confirme os assets finais antes de exportar.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Chip size="small" variant="outlined" label={`${mockups.length} mockups`} />
          {briefing?.client_name ? <Chip size="small" variant="outlined" label={briefing.client_name} /> : null}
        </Stack>
      </Stack>

      {error ? <Alert severity="error">{error}</Alert> : null}
      {success ? <Alert severity="success">{success}</Alert> : null}

      {/* AI Review Summary */}
      {aiReview && (
        <Card sx={{ bgcolor: 'rgba(19,222,185,0.04)', border: '1px solid rgba(19,222,185,0.2)' }}>
          <CardContent>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
              <IconSparkles size={16} color="#13DEB9" />
              <Typography variant="subtitle2" fontWeight={700}>Análise da IA</Typography>
              <Chip size="small" label={`${aiReview.overall_score}/10`}
                sx={{ bgcolor: '#13DEB9', color: 'white', fontWeight: 700, fontSize: '0.7rem' }} />
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mb: aiReview.warnings?.length ? 1 : 0 }}>
              {aiReview.summary}
            </Typography>
            {aiReview.warnings?.map((w, i) => (
              <Stack key={i} direction="row" spacing={0.5} alignItems="flex-start" sx={{ mb: 0.5 }}>
                <IconAlertTriangle size={14} color="#d97706" style={{ marginTop: 2, flexShrink: 0 }} />
                <Typography variant="caption" color="text.secondary">{w}</Typography>
              </Stack>
            ))}
          </CardContent>
        </Card>
      )}

      <Grid container spacing={3}>
        {/* Main Panel */}
        <Grid size={{ xs: 12, lg: 8 }}>
          <Stack spacing={3}>
            <Card>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                  <Typography variant="h6">Mockups gerados</Typography>
                  <Typography variant="caption" color="text.secondary">{mockups.length} itens</Typography>
                </Stack>
                {mockups.length ? (
                  <Grid container spacing={2}>
                    {mockups.map((mockup) => (
                      <Grid size={{ xs: 12, md: 6, xl: 4 }} key={mockup.id}>
                        <Card
                          variant={selectedMockups.includes(mockup.id) ? 'elevation' : 'outlined'}
                          sx={{
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            ...(selectedMockups.includes(mockup.id) ? { borderColor: 'primary.main', bgcolor: 'primary.lighter' } : {}),
                          }}
                          onClick={() => toggleMockup(mockup.id)}
                        >
                          <CardContent>
                            <Typography variant="overline" color="text.secondary">
                              {mockup.platform} &bull; {mockup.format}
                            </Typography>
                            <Typography variant="subtitle2" fontWeight={600} sx={{ mt: 1 }}>
                              {mockup.title || 'Mockup'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: '-webkit-box', overflow: 'hidden', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
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
                  <Typography variant="h6">Copy aprovado</Typography>
                  <Typography variant="caption" color="text.secondary">{copies.length ? 'Selecionar' : 'Sem copies'}</Typography>
                </Stack>
                {copies.length ? (
                  <TextField
                    fullWidth
                    size="small"
                    select
                    value={selectedCopyId}
                    onChange={(event) => {
                      setSelectedCopyId(event.target.value);
                      if (typeof window !== 'undefined') {
                        window.localStorage.setItem('edro_copy_version_id', event.target.value);
                      }
                    }}
                  >
                    {copies.map((copy) => (
                      <MenuItem key={copy.id} value={copy.id}>
                        {resolveProviderLabel(copy)} &bull; {new Date(copy.created_at || Date.now()).toLocaleString('pt-BR')}
                      </MenuItem>
                    ))}
                  </TextField>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                    Nenhuma copy encontrada.
                  </Typography>
                )}
                {selectedCopy ? (
                  <Stack spacing={0.75} sx={{ mt: 1.5 }}>
                    <EthicsBadge copy={selectedCopy} />
                    <Typography variant="caption" color="text.secondary" sx={{ display: '-webkit-box', overflow: 'hidden', WebkitLineClamp: 6, WebkitBoxOrient: 'vertical' }}>
                      {selectedCopy.output}
                    </Typography>
                  </Stack>
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                  <Typography variant="h6">Acoes rapidas</Typography>
                  <Typography variant="caption" color="text.secondary">Mockups</Typography>
                </Stack>
                <Stack spacing={1}>
                  <Button variant="contained" fullWidth onClick={approveSelected}>
                    Aprovar selecionados
                  </Button>
                  <Button variant="outlined" fullWidth onClick={requestChanges}>
                    Solicitar ajustes
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Grid>
      </Grid>

      {/* Footer actions */}
      <Stack direction="row" justifyContent="flex-end" spacing={2}>
        <Button variant="outlined" onClick={() => router.back()}>
          Voltar
        </Button>
        <Button variant="contained" onClick={markDone}>
          Aprovar e avancar
        </Button>
      </Stack>
    </Stack>
  );
}
