'use client';
import { Handle, Position } from '@xyflow/react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import LinearProgress from '@mui/material/LinearProgress';
import Tooltip from '@mui/material/Tooltip';
import CircularProgress from '@mui/material/CircularProgress';
import {
  IconTextScan2, IconMinus, IconPlus, IconRefresh, IconCheck,
  IconBolt, IconTarget, IconBrain, IconSparkles, IconChevronDown, IconAlertTriangle,
  IconLayersLinked, IconTestPipe, IconMovie, IconShieldCheck,
  IconRobot, IconDevices,
} from '@tabler/icons-react';
import { useState, useMemo } from 'react';
import NodeShell from '../NodeShell';
import RecommendationBanner from '../RecommendationBanner';
import { usePipeline, type CopyChainBrandVoice, type CopyChainStrategy } from '../PipelineContext';

const PIPELINE_LABELS: Record<string, string> = {
  simple:        'Rápido (1 IA)',
  standard:      'Padrão',
  premium:       'Premium',
  collaborative: 'Colaborativo (3 IAs)',
  adversarial:   'Adversarial',
  agentic:       'Agente Redator (5 plugins)',
};

const PIPELINE_COLORS: Record<string, string> = {
  simple: '#888', standard: '#E85219', premium: '#F5C518',
  collaborative: '#5D87FF', adversarial: '#A855F7', agentic: '#22D3EE',
};

const CHAIN_STEPS = [
  { id: 1, label: 'Brand Voice RAG',     desc: 'Extrai restrições de escrita e tom da marca',               color: '#EC4899', est: 4  },
  { id: 2, label: 'Estrategista',         desc: 'Gera estrutura (AIDA/PAS) + 3-5 ganchos de abertura',      color: '#F97316', est: 7  },
  { id: 3, label: 'Gerador de Variantes', desc: 'Fan-out: 3 variantes paralelas (Dor / Lógica / Prova)',    color: '#A855F7', est: 10 },
  { id: 4, label: 'Otimizador de Canal',  desc: 'Formata para plataforma + hashtags SEO/GEO',               color: '#5D87FF', est: 4  },
  { id: 5, label: 'Auditor Semântico',    desc: 'Fan-in: cross-check vs briefing + loop de retry',          color: '#22C55E', est: 6  },
];

const APPEAL_LABELS: Record<string, { label: string; emoji: string }> = {
  dor:          { label: 'Dor', emoji: '😣' },
  logica:       { label: 'Lógica', emoji: '🧠' },
  prova_social: { label: 'Prova Social', emoji: '👥' },
};

const TONE_OPTIONS = [
  { id: 'Profissional', label: 'Pro', icon: '💼' },
  { id: 'Inspirador',   label: 'Inspi', icon: '✨' },
  { id: 'Casual',       label: 'Casual', icon: '😊' },
  { id: 'Persuasivo',   label: 'Persu', icon: '🎯' },
];

const AMD_OPTIONS = [
  { id: 'compartilhar',   label: 'Compartilhar', icon: '🔁' },
  { id: 'salvar',         label: 'Salvar', icon: '🔖' },
  { id: 'clicar',         label: 'Clicar no link', icon: '👆' },
  { id: 'responder',      label: 'Comentar', icon: '💬' },
  { id: 'pedir_proposta', label: 'Orçamento', icon: '💰' },
];

const TASK_OPTIONS = [
  { id: 'social_post',         label: 'Post social' },
  { id: 'headlines',           label: 'Headlines' },
  { id: 'carousel',            label: 'Carrossel' },
  { id: 'institutional_copy',  label: 'Institucional' },
  { id: 'campaign_strategy',   label: 'Estratégia' },
];

const TRIGGERS_LABEL: Record<string, string> = {
  G01: 'Escassez', G02: 'Autoridade', G03: 'Prova Social',
  G04: 'Reciprocidade', G05: 'Curiosidade', G06: 'Identidade', G07: 'Dor/Solução',
};
const TRIGGER_COLORS: Record<string, string> = {
  G01: '#FF4D4D', G02: '#00B4FF', G03: '#13DEB9',
  G04: '#F5C518', G05: '#A855F7', G06: '#FB923C', G07: '#888',
};

function autoTaskType(platform?: string | null, format?: string | null): string {
  const f = (format || '').toLowerCase();
  const p = (platform || '').toLowerCase();
  if (f.includes('carrossel') || f.includes('carousel')) return 'carousel';
  if (f.includes('reels') || f.includes('tiktok') || f.includes('video')) return 'campaign_strategy';
  if (p.includes('linkedin') || f.includes('institucional')) return 'institutional_copy';
  if (f.includes('headline') || f.includes('outdoor')) return 'headlines';
  return 'social_post';
}

function OptionQualityBadge({ opt }: { opt: { title: string; body: string; cta: string; legenda: string } }) {
  const score = [opt.title, opt.body, opt.cta, opt.legenda].filter(Boolean).length;
  const pct = (score / 4) * 100;
  const color = pct >= 75 ? '#13DEB9' : pct >= 50 ? '#F8A800' : '#888';
  return (
    <Tooltip title={`Campos preenchidos: ${score}/4`} placement="top">
      <Stack direction="row" spacing={0.4} alignItems="center" sx={{ flexShrink: 0 }}>
        {[0,1,2,3].map(i => (
          <Box key={i} sx={{ width: 6, height: 6, borderRadius: '50%',
            bgcolor: i < score ? color : '#333' }} />
        ))}
      </Stack>
    </Tooltip>
  );
}

const PLATFORM_OPTIONS = [
  { id: 'Instagram',  icon: '📸', charLimit: 2200 },
  { id: 'LinkedIn',   icon: '💼', charLimit: 3000 },
  { id: 'Facebook',   icon: '👥', charLimit: 63206 },
  { id: 'Twitter/X',  icon: '🐦', charLimit: 280 },
  { id: 'TikTok',     icon: '🎵', charLimit: 2200 },
  { id: 'WhatsApp',   icon: '💬', charLimit: 65536 },
];

export default function CopyNode() {
  const {
    copyGenerating, copyOptions, selectedCopyIdx, setSelectedCopyIdx,
    copyApproved, copyError, handleGenerateCopy, approveCopy, editCopy, nodeStatus,
    recommendations, selectedTrigger, activeFormat,
    tone, setTone, amd, setAmd, copyIsStale,
    addOptionalNode, activeNodeIds,
    copyChainResult, copyChainStep, handleGenerateCopyChain,
    targetPlatforms, setTargetPlatforms,
  } = usePipeline();

  const [pipeline, setPipeline] = useState('standard');
  const [count, setCount] = useState(2);
  const [provider, setProvider] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const status = nodeStatus.copy;

  // Agente Redator — editable plugin overrides
  const [bvOverride, setBvOverride] = useState<Partial<CopyChainBrandVoice>>({});
  const [stratOverride, setStratOverride] = useState<Partial<CopyChainStrategy>>({});
  const [appealsOverride, setAppealsOverride] = useState<Array<'dor' | 'logica' | 'prova_social'>>(['dor', 'logica', 'prova_social']);
  const [showChainControls, setShowChainControls] = useState(false);
  const isAgentic = pipeline === 'agentic';

  // Auto-detect task type from format, allow override
  const autoTask = useMemo(() => autoTaskType(activeFormat?.platform, activeFormat?.format), [activeFormat]);
  const [taskTypeOverride, setTaskTypeOverride] = useState('');
  const taskType = taskTypeOverride || autoTask;

  const trigger = selectedTrigger ? { id: selectedTrigger, color: TRIGGER_COLORS[selectedTrigger] || '#888' } : null;

  const collapsedSummary = copyOptions[selectedCopyIdx] ? (
    <Stack spacing={0.5}>
      <Typography sx={{ fontSize: '0.68rem', fontWeight: 600, color: 'text.primary', lineHeight: 1.4 }}>
        {copyOptions[selectedCopyIdx].title || copyOptions[selectedCopyIdx].body?.slice(0, 80) || '—'}
      </Typography>
      <Stack direction="row" spacing={0.5} flexWrap="wrap">
        {copyOptions[selectedCopyIdx].cta && (
          <Chip size="small" label={`CTA: ${copyOptions[selectedCopyIdx].cta}`}
            sx={{ height: 18, fontSize: '0.58rem', bgcolor: 'rgba(232,82,25,0.12)', color: '#E85219' }} />
        )}
        {tone && (
          <Chip size="small" label={tone}
            sx={{ height: 18, fontSize: '0.58rem', bgcolor: 'rgba(93,135,255,0.12)', color: '#5D87FF' }} />
        )}
        {trigger && (
          <Chip size="small" label={trigger.id}
            sx={{ height: 18, fontSize: '0.58rem', bgcolor: `${trigger.color}22`, color: trigger.color, border: `1px solid ${trigger.color}55` }} />
        )}
      </Stack>
    </Stack>
  ) : null;

  return (
    <Box>
      <Handle type="target" position={Position.Left} id="copy_in"
        style={{ background: '#444', width: 10, height: 10, border: 'none' }} />

      <NodeShell
        title="Copy IA"
        icon={<IconTextScan2 size={14} />}
        status={status}
        width={340}
        collapsedSummary={collapsedSummary}
        onEdit={editCopy}
        nodeOptions={[
          {
            id: 'critica',
            label: 'Agente Crítico',
            description: 'Auto-revisão: score vs. briefing, AMD e voz da marca',
            color: '#EF4444',
            icon: <IconShieldCheck size={13} />,
            added: activeNodeIds.includes('critica'),
            onClick: () => addOptionalNode('critica'),
          },
          {
            id: 'multiFormat',
            label: 'Multi-Formato',
            description: 'Adaptar copy para 6 tamanhos de plataforma',
            color: '#F97316',
            icon: <IconLayersLinked size={13} />,
            added: activeNodeIds.includes('multiFormat'),
            onClick: () => addOptionalNode('multiFormat'),
          },
          {
            id: 'abTest',
            label: 'Teste A/B',
            description: 'Comparar variantes com split de audiência',
            color: '#F97316',
            icon: <IconTestPipe size={13} />,
            added: activeNodeIds.includes('abTest'),
            onClick: () => addOptionalNode('abTest'),
          },
          {
            id: 'videoScript',
            label: 'Roteiro de Vídeo',
            description: 'Gerar cenas Hook → Dev → CTA para vídeo',
            color: '#A855F7',
            icon: <IconMovie size={13} />,
            added: activeNodeIds.includes('videoScript'),
            onClick: () => addOptionalNode('videoScript'),
          },
        ]}
      >
        <Stack spacing={1.25}>
          {/* Chef recommendation */}
          {recommendations?.copy && (
            <RecommendationBanner text={recommendations.copy.text} confidence={recommendations.copy.confidence} />
          )}

          {/* Active trigger badge */}
          {trigger && (
            <Stack direction="row" spacing={0.75} alignItems="center"
              sx={{ p: 0.75, borderRadius: 1.5, border: `1px solid ${trigger.color}44`, bgcolor: `${trigger.color}08` }}>
              <IconBolt size={13} color={trigger.color} />
              <Typography sx={{ fontSize: '0.62rem', color: trigger.color, fontWeight: 700 }}>
                {trigger.id} — {TRIGGERS_LABEL[trigger.id] || trigger.id}
              </Typography>
              <Typography sx={{ fontSize: '0.58rem', color: '#555', ml: 'auto' }}>gatilho ativo</Typography>
            </Stack>
          )}

          {/* Tone row */}
          <Box>
            <Typography sx={{ fontSize: '0.58rem', color: '#555', mb: 0.5, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              Tom de voz
            </Typography>
            <Stack direction="row" spacing={0.5}>
              {TONE_OPTIONS.map((t) => (
                <Box key={t.id} onClick={() => setTone(tone === t.id ? '' : t.id)}
                  sx={{
                    flex: 1, px: 0.5, py: 0.5, borderRadius: 1.5, cursor: 'pointer', textAlign: 'center',
                    border: '1px solid', transition: 'all 0.15s',
                    borderColor: tone === t.id ? '#5D87FF' : '#222',
                    bgcolor: tone === t.id ? 'rgba(93,135,255,0.1)' : 'transparent',
                  }}>
                  <Typography sx={{ fontSize: '0.7rem', mb: 0.2 }}>{t.icon}</Typography>
                  <Typography sx={{ fontSize: '0.55rem', color: tone === t.id ? '#5D87FF' : '#666', fontWeight: tone === t.id ? 700 : 400 }}>
                    {t.label}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Box>

          {/* AMD row */}
          <Box>
            <Stack direction="row" spacing={0.5} alignItems="center" mb={0.5}>
              <IconTarget size={11} color="#888" />
              <Typography sx={{ fontSize: '0.58rem', color: '#555', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                Ação Desejada (AMD)
              </Typography>
            </Stack>
            <Stack direction="row" spacing={0.5} flexWrap="wrap">
              {AMD_OPTIONS.map((a) => (
                <Chip
                  key={a.id}
                  size="small"
                  label={`${a.icon} ${a.label}`}
                  onClick={() => setAmd(amd === a.id ? '' : a.id)}
                  sx={{
                    height: 22, fontSize: '0.6rem', cursor: 'pointer',
                    bgcolor: amd === a.id ? 'rgba(232,82,25,0.15)' : '#111',
                    color: amd === a.id ? '#E85219' : '#666',
                    border: `1px solid ${amd === a.id ? '#E85219' : '#222'}`,
                    '&:hover': { borderColor: '#E85219', color: '#E85219' },
                  }}
                />
              ))}
            </Stack>
          </Box>

          {/* Platform selector — Otimizador de Canal */}
          <Box>
            <Stack direction="row" spacing={0.5} alignItems="center" mb={0.6}>
              <IconDevices size={11} color="#888" />
              <Typography sx={{ fontSize: '0.58rem', color: '#555', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                Plataformas-alvo
              </Typography>
              <Typography sx={{ fontSize: '0.52rem', color: '#444', ml: 'auto' }}>
                Otimizador de Canal adapta o texto
              </Typography>
            </Stack>
            <Stack direction="row" spacing={0.4} flexWrap="wrap" gap={0.4}>
              {PLATFORM_OPTIONS.map((p) => {
                const active = targetPlatforms.includes(p.id);
                return (
                  <Box
                    key={p.id}
                    onClick={() => {
                      setTargetPlatforms(
                        active && targetPlatforms.length > 1
                          ? targetPlatforms.filter((x) => x !== p.id)
                          : !active ? [...targetPlatforms, p.id] : targetPlatforms
                      );
                    }}
                    sx={{
                      px: 0.75, py: 0.4, borderRadius: 1.5, cursor: 'pointer',
                      border: '1px solid', transition: 'all 0.15s',
                      borderColor: active ? '#5D87FF' : '#1e1e1e',
                      bgcolor: active ? 'rgba(93,135,255,0.1)' : 'transparent',
                    }}
                  >
                    <Typography sx={{ fontSize: '0.6rem', color: active ? '#5D87FF' : '#555', fontWeight: active ? 700 : 400, whiteSpace: 'nowrap' }}>
                      {p.icon} {p.id}
                    </Typography>
                    <Typography sx={{ fontSize: '0.48rem', color: '#444', textAlign: 'center' }}>
                      {p.charLimit >= 10000 ? '∞' : `${p.charLimit}c`}
                    </Typography>
                  </Box>
                );
              })}
            </Stack>
          </Box>

          {/* Pipeline + count */}
          <Stack direction="row" spacing={1} alignItems="center">
            <TextField
              select size="small" label="Pipeline"
              value={pipeline}
              onChange={(e) => setPipeline(e.target.value)}
              sx={{ flex: 1, '& .MuiInputBase-root': { fontSize: '0.72rem' } }}
            >
              {Object.entries(PIPELINE_LABELS).map(([v, l]) => (
                <MenuItem key={v} value={v} sx={{ fontSize: '0.72rem' }}>
                  <Stack direction="row" spacing={0.75} alignItems="center">
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: PIPELINE_COLORS[v], flexShrink: 0 }} />
                    {l}
                  </Stack>
                </MenuItem>
              ))}
            </TextField>
            <Stack direction="row" spacing={0.25} alignItems="center">
              <IconButton size="small" onClick={() => setCount(c => Math.max(1, c - 1))} disabled={count <= 1 || copyGenerating}>
                <IconMinus size={12} />
              </IconButton>
              <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, minWidth: 18, textAlign: 'center' }}>{count}</Typography>
              <IconButton size="small" onClick={() => setCount(c => Math.min(4, c + 1))} disabled={count >= 4 || copyGenerating}>
                <IconPlus size={12} />
              </IconButton>
            </Stack>
          </Stack>

          {/* Advanced settings toggle */}
          <Button
            size="small" variant="text"
            onClick={() => setShowAdvanced(p => !p)}
            endIcon={<IconChevronDown size={11} style={{ transform: showAdvanced ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />}
            sx={{ textTransform: 'none', fontSize: '0.6rem', color: '#555', py: 0, justifyContent: 'flex-start', px: 0 }}
          >
            Configurações avançadas
          </Button>

          {showAdvanced && (
            <Stack spacing={0.75}>
              <TextField
                select size="small" label="Tipo de copy"
                value={taskTypeOverride || autoTask}
                onChange={(e) => setTaskTypeOverride(e.target.value === autoTask ? '' : e.target.value)}
                fullWidth
                sx={{ '& .MuiInputBase-root': { fontSize: '0.72rem' } }}
                helperText={!taskTypeOverride ? `Auto: ${TASK_OPTIONS.find(t => t.id === autoTask)?.label}` : undefined}
              >
                {TASK_OPTIONS.map((t) => (
                  <MenuItem key={t.id} value={t.id} sx={{ fontSize: '0.72rem' }}>{t.label}</MenuItem>
                ))}
              </TextField>
              <TextField
                select size="small" label="Provedor IA"
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                fullWidth
                sx={{ '& .MuiInputBase-root': { fontSize: '0.72rem' } }}
              >
                <MenuItem value="" sx={{ fontSize: '0.72rem' }}>
                  <Stack direction="row" spacing={0.75} alignItems="center">
                    <IconBrain size={12} color="#888" />
                    <span>Auto (pipeline decide)</span>
                  </Stack>
                </MenuItem>
                <MenuItem value="claude" sx={{ fontSize: '0.72rem' }}>Claude (Anthropic)</MenuItem>
                <MenuItem value="openai" sx={{ fontSize: '0.72rem' }}>GPT-4o (OpenAI)</MenuItem>
                <MenuItem value="gemini" sx={{ fontSize: '0.72rem' }}>Gemini (Google)</MenuItem>
              </TextField>
            </Stack>
          )}

          {/* Stale banner — params changed after copy was generated */}
          {copyIsStale && copyOptions.length > 0 && (
            <Stack direction="row" spacing={0.75} alignItems="center"
              sx={{ p: 0.875, borderRadius: 1.5, border: '1px solid #F8A80066', bgcolor: 'rgba(248,168,0,0.06)' }}>
              <IconAlertTriangle size={13} color="#F8A800" />
              <Typography sx={{ fontSize: '0.6rem', color: '#F8A800', flex: 1 }}>
                Gatilho, tom ou AMD mudou — copy desatualizada
              </Typography>
            </Stack>
          )}

          {/* Agente Redator — parameter controls (shown when agentic selected) */}
          {isAgentic && (
            <Box sx={{ border: '1px solid #22D3EE22', borderRadius: 1.5, overflow: 'hidden' }}>
              <Stack direction="row" alignItems="center" sx={{ px: 1.25, py: 0.75, bgcolor: 'rgba(34,211,238,0.05)', cursor: 'pointer' }}
                onClick={() => setShowChainControls(p => !p)}>
                <IconRobot size={11} color="#22D3EE" />
                <Typography sx={{ fontSize: '0.58rem', color: '#22D3EE', fontWeight: 700, ml: 0.5, flex: 1 }}>
                  Parâmetros do Pipeline (controle por plugin)
                </Typography>
                <IconChevronDown size={11} color="#22D3EE"
                  style={{ transform: showChainControls ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
              </Stack>
              {showChainControls && (
                <Box sx={{ px: 1.25, py: 1 }}>
                  <Stack spacing={1}>

                    {/* Plugin 1 — Brand Voice */}
                    <Box>
                      <Stack direction="row" spacing={0.5} alignItems="center" mb={0.5}>
                        <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#EC4899', flexShrink: 0 }} />
                        <Typography sx={{ fontSize: '0.52rem', color: '#EC4899', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          P1 — Brand Voice
                        </Typography>
                        {copyChainResult && (
                          <Typography sx={{ fontSize: '0.5rem', color: '#555', ml: 'auto' }}>
                            {copyChainResult.brandVoice.tom} · {copyChainResult.brandVoice.emocao_alvo}
                          </Typography>
                        )}
                      </Stack>
                      <Stack spacing={0.5}>
                        <TextField size="small" fullWidth label="Tom de voz (override)" value={bvOverride.tom ?? ''}
                          onChange={(e) => setBvOverride(p => ({ ...p, tom: e.target.value || undefined }))}
                          placeholder={copyChainResult?.brandVoice.tom ?? 'ex: descontraído, técnico'}
                          sx={{ '& .MuiInputBase-root': { fontSize: '0.65rem' } }} />
                        <TextField size="small" fullWidth label="Emoção alvo (override)" value={bvOverride.emocao_alvo ?? ''}
                          onChange={(e) => setBvOverride(p => ({ ...p, emocao_alvo: e.target.value || undefined }))}
                          placeholder={copyChainResult?.brandVoice.emocao_alvo ?? 'ex: esperança, urgência'}
                          sx={{ '& .MuiInputBase-root': { fontSize: '0.65rem' } }} />
                        <TextField size="small" fullWidth label="Estilo (override)" value={bvOverride.estilo ?? ''}
                          onChange={(e) => setBvOverride(p => ({ ...p, estilo: e.target.value || undefined }))}
                          placeholder={copyChainResult?.brandVoice.estilo ?? 'ex: parágrafos curtos'}
                          sx={{ '& .MuiInputBase-root': { fontSize: '0.65rem' } }} />
                      </Stack>
                    </Box>

                    {/* Plugin 2 — Strategist */}
                    <Box>
                      <Stack direction="row" spacing={0.5} alignItems="center" mb={0.5}>
                        <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#F97316', flexShrink: 0 }} />
                        <Typography sx={{ fontSize: '0.52rem', color: '#F97316', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          P2 — Estrategista
                        </Typography>
                      </Stack>
                      <Stack spacing={0.5}>
                        <TextField select size="small" fullWidth label="Estrutura de persuasão"
                          value={stratOverride.structure ?? ''}
                          onChange={(e) => setStratOverride(p => ({ ...p, structure: e.target.value || undefined }))}>
                          <MenuItem value="" sx={{ fontSize: '0.72rem' }}>Auto (IA decide)</MenuItem>
                          {['AIDA', 'PAS', 'BAB', 'PASTOR', '4Ps', 'STAR'].map((s) => (
                            <MenuItem key={s} value={s} sx={{ fontSize: '0.72rem' }}>{s}</MenuItem>
                          ))}
                        </TextField>
                        {copyChainResult?.strategy.hooks.length && (
                          <Box sx={{ p: 0.75, borderRadius: 1, bgcolor: 'rgba(249,115,22,0.06)', border: '1px solid #F9731622' }}>
                            <Typography sx={{ fontSize: '0.5rem', color: '#F97316', mb: 0.4, textTransform: 'uppercase' }}>
                              Ganchos gerados (clique para editar)
                            </Typography>
                            {copyChainResult.strategy.hooks.map((h, i) => (
                              <Typography key={i} sx={{ fontSize: '0.58rem', color: '#888', lineHeight: 1.4, mb: 0.2 }}>
                                {i + 1}. {h}
                              </Typography>
                            ))}
                          </Box>
                        )}
                        {copyChainResult?.strategy.key_tension && (
                          <Typography sx={{ fontSize: '0.57rem', color: '#666', fontStyle: 'italic', lineHeight: 1.4 }}>
                            Tensão central: {copyChainResult.strategy.key_tension}
                          </Typography>
                        )}
                      </Stack>
                    </Box>

                    {/* Plugin 3 — Appeals */}
                    <Box>
                      <Stack direction="row" spacing={0.5} alignItems="center" mb={0.5}>
                        <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#A855F7', flexShrink: 0 }} />
                        <Typography sx={{ fontSize: '0.52rem', color: '#A855F7', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          P3 — Apelos (variantes paralelas)
                        </Typography>
                      </Stack>
                      <Stack direction="row" spacing={0.5}>
                        {(['dor', 'logica', 'prova_social'] as const).map((ap) => {
                          const active = appealsOverride.includes(ap);
                          const info = APPEAL_LABELS[ap];
                          return (
                            <Box key={ap} onClick={() => {
                              setAppealsOverride(prev =>
                                active && prev.length > 1 ? prev.filter(a => a !== ap)
                                : !active ? [...prev, ap] : prev
                              );
                            }} sx={{
                              flex: 1, py: 0.5, borderRadius: 1.5, cursor: 'pointer', textAlign: 'center',
                              border: '1px solid', transition: 'all 0.15s',
                              borderColor: active ? '#A855F7' : '#222',
                              bgcolor: active ? 'rgba(168,85,247,0.12)' : 'transparent',
                            }}>
                              <Typography sx={{ fontSize: '0.68rem' }}>{info.emoji}</Typography>
                              <Typography sx={{ fontSize: '0.52rem', color: active ? '#A855F7' : '#555', fontWeight: active ? 700 : 400 }}>
                                {info.label}
                              </Typography>
                            </Box>
                          );
                        })}
                      </Stack>
                    </Box>

                    {/* Plugin 4+5 — auto, no user controls needed */}
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#5D87FF', flexShrink: 0 }} />
                      <Typography sx={{ fontSize: '0.52rem', color: '#555' }}>P4 Canal + P5 Auditor — auto</Typography>
                    </Stack>
                  </Stack>
                </Box>
              )}
            </Box>
          )}

          {/* Chain stepper — shown while agentic pipeline is running */}
          {isAgentic && copyGenerating && (
            <Box sx={{ border: '1px solid #22D3EE22', borderRadius: 1.5, overflow: 'hidden' }}>
              {CHAIN_STEPS.map((step) => {
                const isDone    = copyChainStep > step.id;
                const isActive  = copyChainStep === step.id;
                const isPending = copyChainStep < step.id;
                return (
                  <Stack key={step.id} direction="row" alignItems="flex-start" spacing={0.875}
                    sx={{ px: 1.25, py: 0.75, bgcolor: isActive ? `${step.color}08` : 'transparent',
                      borderBottom: step.id < 5 ? '1px solid #0f0f0f' : 'none',
                      transition: 'background-color 0.3s',
                    }}>
                    {/* Status icon */}
                    <Box sx={{ mt: 0.1, flexShrink: 0 }}>
                      {isDone    && <Box sx={{ width: 14, height: 14, borderRadius: '50%', bgcolor: step.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="8" height="8" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" stroke="#000" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>
                      </Box>}
                      {isActive  && <CircularProgress size={14} sx={{ color: step.color }} />}
                      {isPending && <Box sx={{ width: 14, height: 14, borderRadius: '50%', border: `1.5px solid #333` }} />}
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontSize: '0.6rem', fontWeight: isActive ? 700 : 400, color: isActive ? step.color : isDone ? '#888' : '#444' }}>
                        P{step.id} — {step.label}
                      </Typography>
                      {isActive && (
                        <Typography sx={{ fontSize: '0.55rem', color: '#555', lineHeight: 1.3, mt: 0.2 }}>
                          {step.desc}
                        </Typography>
                      )}
                    </Box>
                    {isActive && (
                      <Typography sx={{ fontSize: '0.5rem', color: step.color, flexShrink: 0, mt: 0.1 }}>~{step.est}s</Typography>
                    )}
                  </Stack>
                );
              })}
            </Box>
          )}

          {/* Chain result — variant audit scores */}
          {isAgentic && copyChainResult && !copyGenerating && copyOptions.length > 0 && (
            <Stack spacing={0.4}>
              <Typography sx={{ fontSize: '0.58rem', color: '#555' }}>
                Resumo do pipeline — Auditor Semântico:
              </Typography>
              {copyChainResult.variants.map((v, i) => {
                const info = APPEAL_LABELS[v.appeal];
                const scoreColor = v.audit.score >= 80 ? '#22C55E' : v.audit.score >= 60 ? '#F8A800' : '#EF4444';
                return (
                  <Stack key={i} direction="row" alignItems="center" spacing={0.75}
                    sx={{ p: 0.75, borderRadius: 1, border: `1px solid ${selectedCopyIdx === i ? '#22D3EE44' : '#1e1e1e'}`,
                      bgcolor: selectedCopyIdx === i ? 'rgba(34,211,238,0.04)' : 'transparent',
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}
                    onClick={() => setSelectedCopyIdx(i)}>
                    <Typography sx={{ fontSize: '0.68rem' }}>{info.emoji}</Typography>
                    <Box sx={{ flex: 1 }}>
                      <Typography sx={{ fontSize: '0.6rem', fontWeight: 600, color: 'text.primary' }}>
                        {info.label} · {v.title?.slice(0, 45) || `Variante ${i + 1}`}
                      </Typography>
                      {v.audit.issues.length > 0 && !v.flagged && (
                        <Typography sx={{ fontSize: '0.52rem', color: '#555', lineHeight: 1.3 }}>
                          {v.audit.issues[0]}
                        </Typography>
                      )}
                    </Box>
                    <Stack alignItems="flex-end" spacing={0.2} sx={{ flexShrink: 0 }}>
                      <Typography sx={{ fontSize: '0.6rem', fontWeight: 700, color: scoreColor }}>{v.audit.score}</Typography>
                      {v.flagged
                        ? <Typography sx={{ fontSize: '0.48rem', color: '#EF4444' }}>flagged</Typography>
                        : <Typography sx={{ fontSize: '0.48rem', color: '#22C55E' }}>aprovado</Typography>
                      }
                    </Stack>
                  </Stack>
                );
              })}
            </Stack>
          )}

          {/* Timing breakdown (collapsed, for debugging) */}
          {isAgentic && copyChainResult && (
            <Stack direction="row" spacing={0.5} flexWrap="wrap" gap={0.4}>
              {Object.entries(copyChainResult.pluginTimings).map(([k, ms]) => (
                <Chip key={k} size="small" label={`${k}: ${(ms / 1000).toFixed(1)}s`}
                  sx={{ height: 16, fontSize: '0.48rem', bgcolor: '#111', color: '#444', border: '1px solid #1e1e1e' }} />
              ))}
            </Stack>
          )}

          {/* Generate button */}
          <Button
            variant="contained" size="small" fullWidth
            onClick={() => {
              if (isAgentic) {
                handleGenerateCopyChain({
                  brandVoiceOverride: Object.keys(bvOverride).length ? bvOverride : undefined,
                  strategyOverride:   Object.keys(stratOverride).length ? stratOverride : undefined,
                  appealsOverride:    appealsOverride.length < 3 ? appealsOverride : undefined,
                });
              } else {
                handleGenerateCopy({ pipeline, count, taskType, provider: provider || undefined });
              }
            }}
            disabled={copyGenerating}
            startIcon={copyGenerating ? undefined : copyIsStale ? <IconRefresh size={13} /> : isAgentic ? <IconRobot size={13} /> : <IconSparkles size={13} />}
            sx={{
              bgcolor: isAgentic ? '#22D3EE' : copyIsStale ? '#F8A800' : '#E85219',
              '&:hover': { bgcolor: isAgentic ? '#06b6d4' : copyIsStale ? '#d98e00' : '#c43e10' },
              textTransform: 'none', fontSize: '0.72rem', fontWeight: 700,
              color: isAgentic ? '#000' : copyIsStale ? '#000' : '#fff',
            }}
          >
            {copyGenerating
              ? (isAgentic ? `Plugin ${copyChainStep}/5 rodando…` : 'Gerando copy…')
              : copyIsStale ? 'Atualizar Copy'
              : isAgentic ? (copyChainResult ? 'Reexecutar Pipeline' : 'Iniciar Agente Redator')
              : copyOptions.length ? 'Regenerar Copy' : 'Gerar Copy'}
          </Button>

          {copyGenerating && !isAgentic && <LinearProgress sx={{ borderRadius: 1, '& .MuiLinearProgress-bar': { bgcolor: '#E85219' } }} />}
          {copyError && <Typography variant="caption" color="error">{copyError}</Typography>}

          {/* Options list */}
          {!copyGenerating && copyOptions.length > 0 && (
            <Stack spacing={0.75}>
              <Typography sx={{ fontSize: '0.6rem', color: '#555' }}>
                {copyOptions.length} opç{copyOptions.length === 1 ? 'ão' : 'ões'} — clique para selecionar:
              </Typography>
              {copyOptions.slice(0, 3).map((opt, i) => (
                <Box key={i}
                  onClick={() => setSelectedCopyIdx(i)}
                  sx={{
                    p: 0.875, borderRadius: 1.5, cursor: 'pointer',
                    border: '1.5px solid',
                    borderColor: selectedCopyIdx === i ? '#E85219' : 'divider',
                    bgcolor: selectedCopyIdx === i ? 'rgba(232,82,25,0.05)' : 'transparent',
                    transition: 'all 0.15s',
                    '&:hover': { borderColor: '#E85219' },
                  }}
                >
                  <Stack direction="row" spacing={0.75} alignItems="flex-start">
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontSize: '0.65rem', fontWeight: selectedCopyIdx === i ? 700 : 400,
                        color: selectedCopyIdx === i ? 'text.primary' : 'text.secondary',
                        display: '-webkit-box', overflow: 'hidden',
                        WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: 1.4 }}>
                        {opt.title || opt.body?.slice(0, 80) || opt.raw?.slice(0, 80) || `Opção ${i + 1}`}
                      </Typography>
                      {opt.cta && (
                        <Typography sx={{ fontSize: '0.58rem', color: '#E85219', mt: 0.2 }}>
                          ↪ {opt.cta}
                        </Typography>
                      )}
                    </Box>
                    <OptionQualityBadge opt={opt} />
                  </Stack>
                </Box>
              ))}

              <Button
                variant="contained" size="small" fullWidth
                onClick={() => approveCopy(selectedCopyIdx)}
                startIcon={<IconCheck size={13} />}
                sx={{
                  bgcolor: '#13DEB9', color: '#000', fontWeight: 700, fontSize: '0.7rem',
                  textTransform: 'none', mt: 0.25,
                  '&:hover': { bgcolor: '#0fb89e' },
                }}
              >
                Confirmar esta Copy
              </Button>
            </Stack>
          )}
        </Stack>
      </NodeShell>

      <Handle type="source" position={Position.Right} id="copy_out"
        style={{ background: copyApproved ? '#13DEB9' : '#E85219', width: 10, height: 10, border: 'none' }} />
    </Box>
  );
}
