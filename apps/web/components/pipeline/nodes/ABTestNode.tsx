'use client';
import { Handle, Position } from '@xyflow/react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Slider from '@mui/material/Slider';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import { IconTestPipe, IconCheck } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import NodeShell from '../NodeShell';
import { usePipeline } from '../PipelineContext';
import { apiGet, apiPost } from '@/lib/api';

const VARIANT_COLORS = ['#E85219', '#5D87FF', '#13DEB9', '#F97316'];
const VARIANT_LABELS = ['A', 'B', 'C', 'D'];
const METRIC_OPTIONS = [
  { value: 'engagement', label: 'Engaj.' },
  { value: 'clicks', label: 'Cliques' },
  { value: 'conversions', label: 'Conv.' },
  { value: 'score', label: 'Score' },
] as const;

export default function ABTestNode() {
  const { nodeStatus, copyOptions, briefing, copyVersionId } = usePipeline();
  const status = nodeStatus.copy === 'done' ? 'active' : 'locked';

  const variants = copyOptions.slice(0, 4);
  const [splits, setSplits] = useState<number[]>([50, 50, 0, 0]);
  const [selectedMetric, setSelectedMetric] = useState<'engagement' | 'clicks' | 'conversions' | 'score'>('engagement');
  const [activeTest, setActiveTest] = useState<any | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);
  const confirmed = Boolean(activeTest);

  // Keep splits to active variants only, normalized to 100
  const activeCount = Math.max(variants.length, 2);
  const activeSplits = splits.slice(0, activeCount);
  const splitSum = activeSplits.reduce((a, b) => a + b, 0);
  const normalizedSplits = activeSplits.map((s) => (splitSum > 0 ? Math.round((s / splitSum) * 100) : Math.round(100 / activeCount)));

  const handleSplitChange = (idx: number, value: number) => {
    setSplits((prev) => {
      const next = [...prev];
      next[idx] = value;
      return next;
    });
  };

  useEffect(() => {
    const briefingId = briefing?.id;
    if (!briefingId) return;
    apiGet<{ success: boolean; data: any[] }>(`/edro/briefings/${briefingId}/ab-tests`)
      .then((res) => {
        const tests = Array.isArray(res?.data) ? res.data : [];
        setActiveTest(tests.find((item) => item.status === 'running') || tests[0] || null);
      })
      .catch(() => {});
  }, [briefing?.id]);

  const handleConfirmTest = async () => {
    if (!briefing?.id || variants.length < 2) return;
    setIsCreating(true);
    setTestError(null);
    try {
      const response = await apiPost<{ success: boolean; data: any }>(
        `/edro/briefings/${briefing.id}/ab-test-from-options`,
        {
          source_copy_version_id: copyVersionId || undefined,
          metric: selectedMetric,
          variant_a: variants[0],
          variant_b: variants[1],
        }
      );
      setActiveTest(response?.data || null);
    } catch (err: any) {
      setTestError(err?.message || 'Erro ao criar teste A/B.');
    } finally {
      setIsCreating(false);
    }
  };

  const collapsedSummary = (
    <Stack spacing={0.5}>
      <Stack direction="row" spacing={0.5} alignItems="center">
        <IconCheck size={12} color={confirmed ? '#13DEB9' : '#888'} />
        <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: 'text.primary' }}>
          {confirmed ? 'Teste A/B persistido' : 'Teste A/B'}
        </Typography>
      </Stack>
      <Stack direction="row" spacing={0.5} flexWrap="wrap">
        {VARIANT_LABELS.slice(0, activeCount).map((label, i) => (
          <Chip
            key={label} size="small"
            label={`${label} ${normalizedSplits[i]}%`}
            sx={{ height: 18, fontSize: '0.58rem', bgcolor: `${VARIANT_COLORS[i]}22`, color: VARIANT_COLORS[i] }}
          />
        ))}
      </Stack>
    </Stack>
  );

  return (
    <Box>
      <Handle type="target" position={Position.Left} id="abtest_in"
        style={{ background: '#444', width: 8, height: 8, border: 'none' }} />
      <NodeShell
        title="Teste A/B"
        icon={<IconTestPipe size={14} />}
        status={confirmed ? 'done' : status}
        accentColor="#F97316"
        width={280}
        collapsedSummary={collapsedSummary}
      >
        <Stack spacing={1.25}>
          {variants.length === 0 ? (
            <Typography sx={{ fontSize: '0.62rem', color: '#555', textAlign: 'center' }}>
              Gere copy com 2+ opções para configurar o A/B
            </Typography>
          ) : (
            <>
              <Typography sx={{ fontSize: '0.6rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                Variantes e split de audiência
              </Typography>
              <Stack spacing={1}>
                {variants.map((v, i) => (
                  <Box key={i} sx={{
                    p: 0.75, borderRadius: 1.5,
                    border: `1px solid ${VARIANT_COLORS[i]}44`,
                    bgcolor: `${VARIANT_COLORS[i]}08`,
                  }}>
                    <Stack direction="row" spacing={0.75} alignItems="baseline" mb={0.5}>
                      <Box sx={{
                        width: 18, height: 18, borderRadius: '50%',
                        bgcolor: VARIANT_COLORS[i], flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Typography sx={{ fontSize: '0.55rem', fontWeight: 800, color: '#000' }}>
                          {VARIANT_LABELS[i]}
                        </Typography>
                      </Box>
                      <Typography sx={{
                        fontSize: '0.62rem', color: 'text.primary', fontWeight: 600,
                        flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {v.title || v.body?.slice(0, 50) || `Variante ${VARIANT_LABELS[i]}`}
                      </Typography>
                      <Typography sx={{ fontSize: '0.6rem', color: VARIANT_COLORS[i], fontWeight: 700, ml: 'auto' }}>
                        {normalizedSplits[i]}%
                      </Typography>
                    </Stack>
                    <Slider
                      size="small"
                      value={splits[i]}
                      onChange={(_, val) => handleSplitChange(i, val as number)}
                      min={0} max={100} step={5}
                      sx={{
                        color: VARIANT_COLORS[i],
                        height: 3, py: 0.5,
                        '& .MuiSlider-thumb': { width: 10, height: 10 },
                      }}
                    />
                  </Box>
                ))}
              </Stack>

              {!confirmed && (
                <Box>
                  <Typography sx={{ fontSize: '0.6rem', color: '#888', mb: 0.6 }}>
                    Métrica do teste
                  </Typography>
                  <ToggleButtonGroup
                    value={selectedMetric}
                    exclusive
                    size="small"
                    onChange={(_, value) => value && setSelectedMetric(value)}
                    sx={{ flexWrap: 'wrap', gap: 0.5 }}
                  >
                    {METRIC_OPTIONS.map((opt) => (
                      <ToggleButton key={opt.value} value={opt.value} sx={{ fontSize: '0.62rem', px: 1 }}>
                        {opt.label}
                      </ToggleButton>
                    ))}
                  </ToggleButtonGroup>
                </Box>
              )}

              {activeTest?.id && (
                <Chip
                  size="small"
                  label={
                    activeTest.status === 'completed'
                      ? `Vencedor definido · ${String(activeTest.id).slice(0, 8)}`
                      : `Teste ativo · ${String(activeTest.id).slice(0, 8)}`
                  }
                  color={activeTest.status === 'completed' ? 'success' : 'primary'}
                />
              )}

              {testError && <Alert severity="error">{testError}</Alert>}

              <Button
                variant="contained" size="small" fullWidth
                onClick={handleConfirmTest}
                disabled={status === 'locked' || variants.length < 2 || isCreating || activeTest?.status === 'running'}
                startIcon={<IconTestPipe size={13} />}
                sx={{
                  bgcolor: '#F97316', color: '#fff', fontWeight: 700,
                  fontSize: '0.7rem', textTransform: 'none',
                  '&:hover': { bgcolor: '#ea6b0e' },
                  '&.Mui-disabled': { bgcolor: '#2a2a2a', color: '#555' },
                }}
              >
                {isCreating ? 'Criando teste...' : activeTest?.status === 'running' ? 'Teste A/B ativo' : 'Confirmar Teste A/B'}
              </Button>
            </>
          )}
        </Stack>
      </NodeShell>
      <Handle type="source" position={Position.Right} id="abtest_out"
        style={{ background: '#F97316', width: 8, height: 8, border: 'none' }} />
    </Box>
  );
}
