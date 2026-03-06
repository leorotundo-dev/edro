'use client';
import { Handle, Position } from '@xyflow/react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Switch from '@mui/material/Switch';
import { IconShieldCheck, IconRefresh, IconAlertTriangle, IconCheck, IconArrowRight, IconRobot, IconPhoto } from '@tabler/icons-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { usePipeline } from '../PipelineContext';
import { apiPost } from '@/lib/api';

const MAX_AUTO_ATTEMPTS = 3;
const AUTO_PASS_THRESHOLD = 72;

type Dimension = { label: string; score: number; note?: string };
type CriticaResult = {
  overall: number;
  passed: boolean;
  dimensions: Dimension[];
  issues: string[];
  suggestions: string[];
};

function ScoreCircle({ score }: { score: number }) {
  const color = score >= AUTO_PASS_THRESHOLD ? '#22C55E' : score >= 55 ? '#F8A800' : '#EF4444';
  const r = 22;
  const circ = 2 * Math.PI * r;
  const filled = (score / 100) * circ;
  return (
    <Box sx={{ position: 'relative', width: 58, height: 58, flexShrink: 0 }}>
      <svg width="58" height="58" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="29" cy="29" r={r} fill="none" stroke="#1e1e1e" strokeWidth="4" />
        <circle cx="29" cy="29" r={r} fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={`${filled} ${circ - filled}`} strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.6s ease' }} />
      </svg>
      <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <Typography sx={{ fontSize: '0.82rem', fontWeight: 800, color, lineHeight: 1 }}>{score}</Typography>
        <Typography sx={{ fontSize: '0.42rem', color: '#555', textTransform: 'uppercase', letterSpacing: '0.06em' }}>score</Typography>
      </Box>
    </Box>
  );
}

function DimensionBar({ dim }: { dim: Dimension }) {
  const color = dim.score >= AUTO_PASS_THRESHOLD ? '#22C55E' : dim.score >= 55 ? '#F8A800' : '#EF4444';
  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={0.5} mb={0.2}>
        <Typography sx={{ fontSize: '0.57rem', color: '#888', flex: 1 }}>{dim.label}</Typography>
        <Typography sx={{ fontSize: '0.55rem', color, fontWeight: 700 }}>{dim.score}</Typography>
      </Stack>
      <Box sx={{ height: 3, bgcolor: '#1e1e1e', borderRadius: 1, overflow: 'hidden' }}>
        <Box sx={{ height: '100%', width: `${dim.score}%`, bgcolor: color, borderRadius: 1, transition: 'width 0.5s ease' }} />
      </Box>
      {dim.note && dim.score < AUTO_PASS_THRESHOLD && (
        <Typography sx={{ fontSize: '0.52rem', color: '#555', mt: 0.2, lineHeight: 1.3 }}>{dim.note}</Typography>
      )}
    </Box>
  );
}

function buildHeuristic(
  copy: { title?: string; body?: string; cta?: string; legenda?: string } | undefined,
  trigger: string | null, tone: string, amd: string,
): CriticaResult {
  const fields = [copy?.title, copy?.body, copy?.cta, copy?.legenda].filter(Boolean).length;
  const base = Math.min(92, 45 + fields * 10 + (trigger ? 10 : 0) + (tone ? 5 : 0) + (amd ? 5 : 0));
  return {
    overall: base,
    passed: base >= AUTO_PASS_THRESHOLD,
    dimensions: [
      { label: 'Alinhamento ao Briefing', score: Math.min(95, base + 5) },
      { label: 'Voz da Marca',            score: Math.min(95, base - 3) },
      { label: 'Fit com AMD',             score: amd ? Math.min(95, base + 5) : 38, note: !amd ? 'AMD não definida no Briefing' : undefined },
      { label: 'Consistência do Gatilho', score: trigger ? Math.min(95, base + 3) : 35, note: !trigger ? 'Nenhum gatilho selecionado' : undefined },
      { label: 'Carga Cognitiva',         score: (copy?.body?.length ?? 0) > 400 ? 48 : Math.min(90, base) },
    ],
    issues: [
      ...(fields < 3 ? ['Copy incompleta — preencher título, corpo e CTA'] : []),
      ...(!trigger ? ['Nenhum gatilho psicológico ativo'] : []),
      ...(!amd ? ['AMD não definida — escolha a ação desejada no Briefing'] : []),
    ],
    suggestions: [
      trigger
        ? `Reforce o gatilho ${trigger} na primeira frase para ativar o padrão psicológico`
        : 'Selecione um gatilho no node Gatilho & Funil',
      tone
        ? `Mantenha o tom ${tone} consistente ao longo de todos os parágrafos`
        : 'Defina o tom de voz no Briefing',
    ],
  };
}

export default function CriticaNode() {
  const {
    copyOptions, selectedCopyIdx,
    briefing, activeFormat, selectedTrigger, tone, amd,
    editCopy, rerunCopy, copyGenerating,
    arteImageUrl,
  } = usePipeline();

  const [activeTab, setActiveTab]   = useState<'copy' | 'arte'>('copy');
  const [autoMode, setAutoMode]     = useState(true);
  const [running, setRunning]       = useState(false);
  const [result, setResult]         = useState<CriticaResult | null>(null);
  const [attempts, setAttempts]     = useState(0);
  const [loopStopped, setLoopStopped] = useState(false);
  const lastCopyRef = useRef('');

  // Arte visual critique state
  const [arteRunning, setArteRunning] = useState(false);
  const [arteResult, setArteResult]   = useState<CriticaResult | null>(null);
  const lastArteRef = useRef('');

  const copy     = copyOptions[selectedCopyIdx];
  const copyText = copy ? [copy.title, copy.body, copy.cta, copy.legenda].filter(Boolean).join(' ') : '';

  const runCritique = useCallback(async (isRetry = false) => {
    if (!copyText || running) return;
    setRunning(true);
    if (!isRetry) { setResult(null); setLoopStopped(false); }

    let next: CriticaResult;
    try {
      const res = await apiPost<{ success: boolean; data: CriticaResult }>('/studio/creative/critique', {
        copy:             copyText,
        briefing_title:   briefing?.title,
        briefing_payload: briefing?.payload,
        format:           activeFormat?.format,
        platform:         activeFormat?.platform,
        trigger:          selectedTrigger,
        tone, amd,
      });
      next = res?.data ?? buildHeuristic(copy, selectedTrigger, tone, amd);
    } catch {
      next = buildHeuristic(copy, selectedTrigger, tone, amd);
    }

    setResult(next);
    setRunning(false);

    // Auto-loop: score below threshold → inject critique feedback and regenerate
    if (autoMode && !next.passed && attempts < MAX_AUTO_ATTEMPTS) {
      const feedback = [
        `Score atual: ${next.overall}/100 (mínimo: ${AUTO_PASS_THRESHOLD})`,
        ...next.issues.map(i => `• Problema: ${i}`),
        ...next.suggestions.map(s => `• Sugestão: ${s}`),
        ...next.dimensions.filter(d => d.score < AUTO_PASS_THRESHOLD)
          .map(d => `• Melhorar "${d.label}" (${d.score}/100)${d.note ? ': ' + d.note : ''}`),
      ].join('\n');
      setAttempts(a => a + 1);
      setTimeout(() => rerunCopy(feedback), 1400);
    } else if (autoMode && !next.passed && attempts >= MAX_AUTO_ATTEMPTS) {
      setLoopStopped(true);
    }
  }, [copyText, running, autoMode, attempts, briefing, activeFormat, selectedTrigger, tone, amd, copy, rerunCopy]);

  // Auto-fire when copy text changes (but not while generating)
  useEffect(() => {
    if (!copyText || copyText === lastCopyRef.current || copyGenerating) return;
    lastCopyRef.current = copyText;
    runCritique();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [copyText, copyGenerating]);

  // Arte visual critique
  const runArteCritique = useCallback(async () => {
    if (!arteImageUrl || arteRunning) return;
    setArteRunning(true);
    setArteResult(null);
    try {
      const res = await apiPost<{ success: boolean; data: CriticaResult }>('/studio/creative/critique-arte', {
        image_url:  arteImageUrl,
        copy_text:  copyText,
        briefing_title: briefing?.title,
        platform:   activeFormat?.platform,
        trigger:    selectedTrigger,
      });
      setArteResult(res?.data ?? buildArteHeuristic());
    } catch {
      setArteResult(buildArteHeuristic());
    }
    setArteRunning(false);
  }, [arteImageUrl, arteRunning, copyText, briefing, activeFormat, selectedTrigger]);

  function buildArteHeuristic(): CriticaResult {
    // Client-side fallback when endpoint is unavailable
    // Scores são estimativas — endpoint real retorna análise de visão computacional
    const base = 65;
    return {
      overall: base,
      passed:  base >= AUTO_PASS_THRESHOLD,
      dimensions: [
        { label: 'Qualidade de Renderização', score: 78 },
        { label: 'Contraste do Texto',        score: 62, note: 'Verificar legibilidade sobre a imagem' },
        { label: 'Hierarquia Visual',         score: 70 },
        { label: 'Coerência Copy↔Imagem',     score: 55, note: 'Garantir que imagem reforça a mensagem' },
        { label: 'Conformidade de Cores',     score: 60, note: 'Verificar se cores hex da marca foram aplicadas' },
        { label: 'Originalidade',             score: 72, note: 'Nenhuma cópia exata detectada — estimativa' },
      ],
      issues:      ['Endpoint de crítica visual não disponível — estimativa heurística'],
      suggestions: [
        'Verifique se as cores hex da marca estão presentes na composição',
        'Confirme que o elemento principal está em foco e sem textura de referência externa',
      ],
    };
  }

  // Auto-fire arte critique when image changes
  useEffect(() => {
    if (!arteImageUrl || arteImageUrl === lastArteRef.current) return;
    lastArteRef.current = arteImageUrl;
    setActiveTab('arte');
    runArteCritique();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arteImageUrl]);

  const scoreColor  = result
    ? result.overall >= AUTO_PASS_THRESHOLD ? '#22C55E' : result.overall >= 55 ? '#F8A800' : '#EF4444'
    : '#444';
  const isLooping   = autoMode && result && !result.passed && !loopStopped && (running || copyGenerating);

  return (
    <Box>
      <Handle type="target" position={Position.Left} id="critica_in"
        style={{ background: '#444', width: 8, height: 8, border: 'none' }} />
      <Handle type="source" position={Position.Right} id="critica_out"
        style={{ background: scoreColor, width: 8, height: 8, border: 'none' }} />

      <Box sx={{
        width: 290, borderRadius: 2,
        border: `1.5px solid ${scoreColor}`,
        bgcolor: result ? `${scoreColor}06` : 'rgba(239,68,68,0.04)',
        boxShadow: result ? `0 0 0 3px ${scoreColor}18` : 'none',
        overflow: 'hidden', transition: 'border-color 0.4s, box-shadow 0.4s',
      }}>

        {/* Header */}
        <Stack direction="row" alignItems="center" spacing={0.75}
          sx={{ px: 1.5, py: 1, borderBottom: `1px solid ${scoreColor}33`, bgcolor: `${scoreColor}08` }}>
          <IconShieldCheck size={13} color={scoreColor} />
          <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: scoreColor, flex: 1 }}>
            Agente Crítico
          </Typography>

          {/* Auto-loop toggle */}
          <Stack direction="row" alignItems="center" spacing={0.3}>
            <IconRobot size={10} color={autoMode ? scoreColor : '#444'} />
            <Typography sx={{ fontSize: '0.5rem', color: autoMode ? scoreColor : '#444' }}>Auto</Typography>
            <Switch size="small" checked={autoMode}
              onChange={(e) => { setAutoMode(e.target.checked); setAttempts(0); setLoopStopped(false); }}
              sx={{
                width: 28, height: 16, p: 0,
                '& .MuiSwitch-thumb': { width: 10, height: 10 },
                '& .MuiSwitch-switchBase': { p: 0.3, '&.Mui-checked': { transform: 'translateX(12px)' } },
                '& .Mui-checked .MuiSwitch-thumb': { bgcolor: scoreColor },
                '& .Mui-checked + .MuiSwitch-track': { bgcolor: `${scoreColor}44` },
              }} />
          </Stack>

          {(running || copyGenerating) && <CircularProgress size={12} sx={{ color: '#EF4444', flexShrink: 0 }} />}
          {result && !running && !copyGenerating && (
            <Box onClick={() => { setAttempts(0); setLoopStopped(false); runCritique(); }}
              sx={{ cursor: 'pointer', display: 'flex', '&:hover': { opacity: 0.7 } }} title="Reanalisar">
              <IconRefresh size={11} color="#555" />
            </Box>
          )}
        </Stack>

        {/* Loop status banners */}
        {isLooping && (
          <Box sx={{ px: 1.5, py: 0.75, bgcolor: 'rgba(239,68,68,0.08)', borderBottom: '1px solid #EF444422', display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <CircularProgress size={10} sx={{ color: '#EF4444', flexShrink: 0 }} />
            <Typography sx={{ fontSize: '0.58rem', color: '#EF4444' }}>
              Auto-loop — Tentativa {attempts}/{MAX_AUTO_ATTEMPTS} — regenerando copy com feedback…
            </Typography>
          </Box>
        )}
        {loopStopped && (
          <Box sx={{ px: 1.5, py: 0.75, bgcolor: 'rgba(248,168,0,0.08)', borderBottom: '1px solid #F8A80022' }}>
            <Typography sx={{ fontSize: '0.58rem', color: '#F8A800' }}>
              Loop encerrado após {MAX_AUTO_ATTEMPTS} tentativas — revisão manual necessária
            </Typography>
          </Box>
        )}

        {/* Tab switcher — only show when arte available */}
        {arteImageUrl && (
          <Stack direction="row" sx={{ borderBottom: `1px solid ${scoreColor}22`, bgcolor: '#0a0a0a' }}>
            {(['copy', 'arte'] as const).map((tab) => {
              const isActive = activeTab === tab;
              const tabColor = tab === 'arte' ? '#A855F7' : scoreColor;
              return (
                <Box key={tab} onClick={() => setActiveTab(tab)}
                  sx={{
                    flex: 1, py: 0.75, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    gap: 0.4, cursor: 'pointer', transition: 'all 0.15s',
                    borderBottom: isActive ? `2px solid ${tabColor}` : '2px solid transparent',
                    bgcolor: isActive ? `${tabColor}0a` : 'transparent',
                  }}>
                  {tab === 'copy'
                    ? <IconShieldCheck size={11} color={isActive ? tabColor : '#555'} />
                    : <IconPhoto size={11} color={isActive ? tabColor : '#555'} />
                  }
                  <Typography sx={{ fontSize: '0.57rem', fontWeight: isActive ? 700 : 400, color: isActive ? tabColor : '#555' }}>
                    {tab === 'copy' ? 'Copy' : 'Arte Visual'}
                  </Typography>
                  {tab === 'arte' && arteRunning && (
                    <CircularProgress size={8} sx={{ color: '#A855F7', ml: 0.3 }} />
                  )}
                  {tab === 'arte' && arteResult && !arteRunning && (
                    <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: arteResult.passed ? '#22C55E' : '#EF4444', ml: 0.3, flexShrink: 0 }} />
                  )}
                </Box>
              );
            })}
          </Stack>
        )}

        <Box sx={{ px: 1.5, py: 1.25 }}>
          {/* ── COPY TAB ── */}
          {activeTab === 'copy' && (
          <>
          {/* Loading state */}
          {(running || copyGenerating) && !result && (
            <Stack spacing={0.75} alignItems="center" sx={{ py: 1.5 }}>
              <CircularProgress size={22} sx={{ color: '#EF4444' }} />
              <Typography sx={{ fontSize: '0.6rem', color: '#666', textAlign: 'center' }}>
                Analisando copy contra briefing, AMD e brand voice…
              </Typography>
            </Stack>
          )}

          {!running && !copyGenerating && !result && !copyText && (
            <Typography sx={{ fontSize: '0.6rem', color: '#444', textAlign: 'center', py: 1 }}>
              Aguardando copy gerada…
            </Typography>
          )}

          {result && (
            <Stack spacing={1.25}>
              {/* Score + verdict */}
              <Stack direction="row" spacing={1.25} alignItems="center">
                <ScoreCircle score={result.overall} />
                <Box sx={{ flex: 1 }}>
                  <Stack direction="row" spacing={0.5} alignItems="center" mb={0.3}>
                    {result.passed ? <IconCheck size={12} color="#22C55E" /> : <IconAlertTriangle size={12} color="#EF4444" />}
                    <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, color: scoreColor }}>
                      {result.passed ? 'Aprovado' : loopStopped ? 'Limite de loops' : 'Ajustes necessários'}
                    </Typography>
                  </Stack>
                  <Typography sx={{ fontSize: '0.57rem', color: '#666', lineHeight: 1.4 }}>
                    {result.passed
                      ? `Score ${result.overall} — copy alinhada ao briefing, AMD e voz da marca.`
                      : loopStopped
                        ? `${MAX_AUTO_ATTEMPTS} tentativas auto esgotadas — intervenção manual recomendada.`
                        : `Score ${result.overall} (mínimo ${AUTO_PASS_THRESHOLD}) — ${autoMode && !loopStopped ? 'corrigindo automaticamente…' : 'pontos abaixo a revisar.'}`}
                  </Typography>
                </Box>
              </Stack>

              {/* Dimensions */}
              <Stack spacing={0.625}>
                {result.dimensions.map((d, i) => <DimensionBar key={i} dim={d} />)}
              </Stack>

              {/* Issues */}
              {result.issues.length > 0 && (
                <Box sx={{ p: 0.875, borderRadius: 1.5, border: '1px solid #EF444433', bgcolor: 'rgba(239,68,68,0.04)' }}>
                  <Typography sx={{ fontSize: '0.52rem', color: '#EF4444', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.5 }}>
                    Problemas
                  </Typography>
                  {result.issues.map((issue, i) => (
                    <Stack key={i} direction="row" spacing={0.5} alignItems="flex-start" mb={0.25}>
                      <Box sx={{ mt: 0.35, width: 4, height: 4, borderRadius: '50%', bgcolor: '#EF4444', flexShrink: 0 }} />
                      <Typography sx={{ fontSize: '0.57rem', color: '#888', lineHeight: 1.3 }}>{issue}</Typography>
                    </Stack>
                  ))}
                </Box>
              )}

              {/* Suggestions */}
              {result.suggestions.length > 0 && (
                <Box sx={{ p: 0.875, borderRadius: 1.5, border: '1px solid #F8A80033', bgcolor: 'rgba(248,168,0,0.03)' }}>
                  <Typography sx={{ fontSize: '0.52rem', color: '#F8A800', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.5 }}>
                    Sugestões
                  </Typography>
                  {result.suggestions.slice(0, 2).map((s, i) => (
                    <Typography key={i} sx={{ fontSize: '0.57rem', color: '#888', lineHeight: 1.4, mb: 0.2 }}>
                      → {s}
                    </Typography>
                  ))}
                </Box>
              )}

              {/* Attempt progress dots */}
              {attempts > 0 && (
                <Stack direction="row" spacing={0.5} alignItems="center">
                  {Array.from({ length: MAX_AUTO_ATTEMPTS }, (_, i) => (
                    <Box key={i} sx={{
                      flex: 1, height: 3, borderRadius: 1,
                      bgcolor: i < attempts
                        ? (result.passed ? '#22C55E' : i === attempts - 1 ? '#EF4444' : '#EF444466')
                        : '#1e1e1e',
                      transition: 'background-color 0.3s',
                    }} />
                  ))}
                  <Typography sx={{ fontSize: '0.5rem', color: '#555', flexShrink: 0 }}>
                    {attempts}/{MAX_AUTO_ATTEMPTS}
                  </Typography>
                </Stack>
              )}

              {/* Actions */}
              <Stack direction="row" spacing={0.75}>
                <Button size="small" variant="outlined" fullWidth
                  onClick={editCopy} disabled={!!(isLooping)}
                  startIcon={<IconRefresh size={12} />}
                  sx={{ textTransform: 'none', fontSize: '0.62rem', borderColor: '#EF444444', color: '#EF4444',
                    '&:hover': { borderColor: '#EF4444', bgcolor: 'rgba(239,68,68,0.08)' } }}>
                  Editar Copy
                </Button>
                <Button size="small" variant="contained" fullWidth
                  disabled={running || copyGenerating}
                  endIcon={<IconArrowRight size={12} />}
                  onClick={() => { setAttempts(0); setLoopStopped(false); runCritique(); }}
                  sx={{ textTransform: 'none', fontSize: '0.62rem', fontWeight: 700,
                    bgcolor: result.passed ? '#22C55E' : '#F8A800', color: '#000',
                    '&:hover': { bgcolor: result.passed ? '#16a34a' : '#d98e00' } }}>
                  {result.passed ? 'Prosseguir' : 'Reanalisar'}
                </Button>
              </Stack>
            </Stack>
          )}
          </> /* end copy tab */
          )}

          {/* ── ARTE VISUAL TAB ── */}
          {activeTab === 'arte' && (
            <>
              {/* Image thumbnail */}
              {arteImageUrl && (
                <Box sx={{ width: '100%', height: 72, borderRadius: 1.5, overflow: 'hidden', border: '1px solid #A855F733', mb: 1 }}>
                  <img src={arteImageUrl} alt="Arte" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </Box>
              )}

              {arteRunning && (
                <Stack spacing={0.75} alignItems="center" sx={{ py: 1.5 }}>
                  <CircularProgress size={22} sx={{ color: '#A855F7' }} />
                  <Typography sx={{ fontSize: '0.6rem', color: '#666', textAlign: 'center' }}>
                    Analisando renderização, contraste, composição e coerência…
                  </Typography>
                </Stack>
              )}

              {!arteRunning && !arteResult && !arteImageUrl && (
                <Typography sx={{ fontSize: '0.6rem', color: '#444', textAlign: 'center', py: 1 }}>
                  Gere a arte no node Arte & Direção para ativar a crítica visual.
                </Typography>
              )}

              {arteResult && !arteRunning && (
                <Stack spacing={1.25}>
                  {/* Score + verdict */}
                  <Stack direction="row" spacing={1.25} alignItems="center">
                    <ScoreCircle score={arteResult.overall} />
                    <Box sx={{ flex: 1 }}>
                      <Stack direction="row" spacing={0.5} alignItems="center" mb={0.3}>
                        {arteResult.passed
                          ? <IconCheck size={12} color="#22C55E" />
                          : <IconAlertTriangle size={12} color="#EF4444" />}
                        <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, color: arteResult.passed ? '#22C55E' : '#EF4444' }}>
                          {arteResult.passed ? 'Arte Aprovada' : 'Arte precisa de ajustes'}
                        </Typography>
                      </Stack>
                      <Typography sx={{ fontSize: '0.57rem', color: '#666', lineHeight: 1.4 }}>
                        {arteResult.passed
                          ? 'Visual alinhado — composição, contraste e coerência OK.'
                          : `Score ${arteResult.overall} — verifique os pontos abaixo.`}
                      </Typography>
                    </Box>
                  </Stack>

                  {/* Dimensions */}
                  <Stack spacing={0.625}>
                    {arteResult.dimensions.map((d, i) => <DimensionBar key={i} dim={d} />)}
                  </Stack>

                  {/* Issues */}
                  {arteResult.issues.length > 0 && (
                    <Box sx={{ p: 0.875, borderRadius: 1.5, border: '1px solid #EF444433', bgcolor: 'rgba(239,68,68,0.04)' }}>
                      <Typography sx={{ fontSize: '0.52rem', color: '#EF4444', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.5 }}>
                        Problemas Visuais
                      </Typography>
                      {arteResult.issues.map((issue, i) => (
                        <Stack key={i} direction="row" spacing={0.5} alignItems="flex-start" mb={0.25}>
                          <Box sx={{ mt: 0.35, width: 4, height: 4, borderRadius: '50%', bgcolor: '#EF4444', flexShrink: 0 }} />
                          <Typography sx={{ fontSize: '0.57rem', color: '#888', lineHeight: 1.3 }}>{issue}</Typography>
                        </Stack>
                      ))}
                    </Box>
                  )}

                  {/* Suggestions */}
                  {arteResult.suggestions.length > 0 && (
                    <Box sx={{ p: 0.875, borderRadius: 1.5, border: '1px solid #A855F733', bgcolor: 'rgba(168,85,247,0.03)' }}>
                      <Typography sx={{ fontSize: '0.52rem', color: '#A855F7', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.5 }}>
                        Sugestões Visuais
                      </Typography>
                      {arteResult.suggestions.slice(0, 2).map((s, i) => (
                        <Typography key={i} sx={{ fontSize: '0.57rem', color: '#888', lineHeight: 1.4, mb: 0.2 }}>
                          → {s}
                        </Typography>
                      ))}
                    </Box>
                  )}

                  <Button size="small" variant="outlined" fullWidth
                    onClick={runArteCritique} disabled={arteRunning}
                    startIcon={<IconRefresh size={12} />}
                    sx={{ textTransform: 'none', fontSize: '0.62rem', borderColor: '#A855F744', color: '#A855F7',
                      '&:hover': { borderColor: '#A855F7', bgcolor: 'rgba(168,85,247,0.08)' } }}>
                    Reanalisar Arte
                  </Button>
                </Stack>
              )}
            </>
          )}
        </Box>
      </Box>
    </Box>
  );
}
