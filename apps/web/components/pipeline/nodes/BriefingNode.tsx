'use client';
import { Handle, Position } from '@xyflow/react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Popover from '@mui/material/Popover';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Chip from '@mui/material/Chip';
import TextField from '@mui/material/TextField';
import {
  IconFileDescription, IconCheck, IconX, IconArrowRight,
  IconChefHat, IconPlus, IconMoodSmile, IconTarget,
  IconFilter, IconLayoutGrid, IconRobot, IconSparkles,
} from '@tabler/icons-react';
import { useState } from 'react';
import NodeShell from '../NodeShell';
import { usePipeline } from '../PipelineContext';
import type { CreativeRecipe } from '../PipelineContext';

// ── Mise en place item ────────────────────────────────────────────────────────
function MiseItem({ ok, label, value }: { ok: boolean | null; label: string; value?: string | null }) {
  const color = ok === null ? '#555' : ok ? '#13DEB9' : '#E85219';
  const Icon = ok === null
    ? () => <CircularProgress size={9} sx={{ color: '#555' }} />
    : ok
    ? () => <IconCheck size={9} color={color} />
    : () => <IconX size={9} color={color} />;
  return (
    <Stack direction="row" spacing={0.75} alignItems="center">
      <Box sx={{ width: 14, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon />
      </Box>
      <Typography sx={{ fontSize: '0.6rem', color: '#888' }}>{label}</Typography>
      {value && (
        <Typography sx={{ fontSize: '0.6rem', color, fontWeight: 600, ml: 'auto', maxWidth: 110, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {value}
        </Typography>
      )}
    </Stack>
  );
}

// ── Ingredient catalog ────────────────────────────────────────────────────────
const INGREDIENT_CATALOG = [
  {
    id: 'tone',
    icon: '😊',
    label: 'Tom de Voz',
    desc: 'Define a personalidade e estilo da escrita',
    color: '#5D87FF',
    tabler: IconMoodSmile,
  },
  {
    id: 'amd',
    icon: '🎯',
    label: 'Ação Desejada',
    desc: 'O que você quer que o público faça',
    color: '#E85219',
    tabler: IconTarget,
  },
  {
    id: 'funnel',
    icon: '📊',
    label: 'Fase do Funil',
    desc: 'Awareness, Consideração ou Conversão',
    color: '#13DEB9',
    tabler: IconFilter,
  },
  {
    id: 'recipe',
    icon: '🧑‍🍳',
    label: 'Receita do Livro',
    desc: 'Aplicar uma receita criativa já testada',
    color: '#F8A800',
    tabler: IconChefHat,
  },
];

const AMD_OPTIONS = [
  { id: 'compartilhar',   label: 'Compartilhar', icon: '🔁' },
  { id: 'salvar',         label: 'Salvar',        icon: '🔖' },
  { id: 'clicar',         label: 'Clicar',        icon: '👆' },
  { id: 'responder',      label: 'Comentar',      icon: '💬' },
  { id: 'pedir_proposta', label: 'Orçamento',     icon: '💰' },
];

const TONE_OPTIONS = [
  { id: 'Profissional', label: 'Pro',    icon: '💼' },
  { id: 'Inspirador',   label: 'Inspi',  icon: '✨' },
  { id: 'Casual',       label: 'Casual', icon: '😊' },
  { id: 'Persuasivo',   label: 'Persu',  icon: '🎯' },
];

const FUNNEL_OPTIONS = [
  { id: 'awareness',    label: 'Awareness',     icon: '📣', color: '#A855F7' },
  { id: 'consideracao', label: 'Consideração',  icon: '🤔', color: '#5D87FF' },
  { id: 'conversao',    label: 'Conversão',     icon: '💳', color: '#13DEB9' },
];

// ── Main component ────────────────────────────────────────────────────────────
export default function BriefingNode() {
  const {
    briefing, clientBrandColor, confirmBriefing, nodeStatus,
    suggestedRecipes, applyRecipe, learningRulesCount,
    tone, setTone, amd, setAmd,
    funnelPhase, setFunnelPhase,
    targetPlatforms, setTargetPlatforms,
    setSelectedTrigger,
  } = usePipeline();

  const status = nodeStatus.briefing;
  const isLoading = !briefing;

  // Which ingredient blocks are currently added by the user
  const [activeIngredients, setActiveIngredients] = useState<string[]>([]);
  // Popover anchor
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  // Design Agent Mode
  const [agentMode, setAgentMode] = useState<'manual' | 'agent'>('manual');
  const [agentText, setAgentText] = useState('');
  const [agentParsing, setAgentParsing] = useState(false);
  const [agentFeedback, setAgentFeedback] = useState<string | null>(null);

  const TRIGGER_MAP: Record<string, string> = {
    escassez: 'G01', urgencia: 'G01', limitado: 'G01',
    autoridade: 'G02', especialista: 'G02', lider: 'G02',
    prova: 'G03', social: 'G03', depoimento: 'G03',
    reciprocidade: 'G04', gratis: 'G04', desconto: 'G04',
    curiosidade: 'G05', segredo: 'G05', descubra: 'G05',
    identidade: 'G06', pertencer: 'G06', comunidade: 'G06',
    dor: 'G07', problema: 'G07', solucao: 'G07',
  };

  const handleParseAgent = async () => {
    if (!agentText.trim()) return;
    setAgentParsing(true);
    setAgentFeedback(null);
    try {
      const { apiPost } = await import('@/lib/api');
      const res = await apiPost<{ success: boolean; data: {
        tone?: string; amd?: string; funnelPhase?: string;
        platforms?: string[]; suggestedTrigger?: string;
        ingredients?: string[]; briefingSummary?: string;
      } }>('/studio/creative/parse-brief', {
        text: agentText,
        briefingTitle: briefing?.title,
      });
      if (res?.data) {
        const d = res.data;
        if (d.tone) { setTone(d.tone); if (!activeIngredients.includes('tone')) setActiveIngredients(p => [...p, 'tone']); }
        if (d.amd) { setAmd(d.amd); if (!activeIngredients.includes('amd')) setActiveIngredients(p => [...p, 'amd']); }
        if (d.funnelPhase) { setFunnelPhase(d.funnelPhase as any); if (!activeIngredients.includes('funnel')) setActiveIngredients(p => [...p, 'funnel']); }
        if (d.platforms?.length) setTargetPlatforms(d.platforms);
        if (d.suggestedTrigger) setSelectedTrigger(d.suggestedTrigger);
        if (d.ingredients?.length) setActiveIngredients(d.ingredients);
        const count = [d.tone, d.amd, d.funnelPhase, d.platforms?.length, d.suggestedTrigger].filter(Boolean).length;
        setAgentFeedback(`✓ ${count} parâmetros extraídos${d.suggestedTrigger ? ` — Gatilho ${d.suggestedTrigger} sugerido` : ''}`);
        setAgentMode('manual');
      }
    } catch {
      setAgentFeedback('Erro ao interpretar o briefing. Tente novamente.');
    } finally {
      setAgentParsing(false);
    }
  };

  const addIngredient = (id: string) => {
    if (!activeIngredients.includes(id)) setActiveIngredients((p) => [...p, id]);
    setAnchor(null);
  };
  const removeIngredient = (id: string) => setActiveIngredients((p) => p.filter((x) => x !== id));

  const available = INGREDIENT_CATALOG.filter((i) => !activeIngredients.includes(i.id));

  const collapsedSummary = (
    <Stack spacing={0.5}>
      <Typography sx={{ fontSize: '0.72rem', fontWeight: 600, color: 'text.primary' }}>
        {briefing?.title || 'Briefing'}
      </Typography>
      {briefing?.client_name && (
        <Typography sx={{ fontSize: '0.62rem', color: 'text.secondary' }}>{briefing.client_name}</Typography>
      )}
      {activeIngredients.length > 0 && (
        <Stack direction="row" spacing={0.4} flexWrap="wrap">
          {activeIngredients.map((id) => {
            const ing = INGREDIENT_CATALOG.find((x) => x.id === id);
            if (!ing) return null;
            return (
              <Chip key={id} size="small" label={`${ing.icon} ${ing.label}`}
                sx={{ height: 16, fontSize: '0.5rem', bgcolor: `${ing.color}18`, color: ing.color, border: 'none' }} />
            );
          })}
        </Stack>
      )}
    </Stack>
  );

  return (
    <Box>
      <NodeShell
        title="Briefing"
        icon={<IconFileDescription size={14} />}
        status={status}
        width={280}
        collapsedSummary={collapsedSummary}
      >
        <Stack spacing={1.25}>
          {/* ── Mode tab switcher ── */}
          <Stack direction="row" spacing={0} sx={{ border: '1px solid #1e1e1e', borderRadius: 1.5, overflow: 'hidden' }}>
            {(['manual', 'agent'] as const).map((mode) => (
              <Box key={mode} onClick={() => setAgentMode(mode)}
                sx={{
                  flex: 1, py: 0.625, textAlign: 'center', cursor: 'pointer', transition: 'all 0.15s',
                  bgcolor: agentMode === mode ? (mode === 'agent' ? 'rgba(93,135,255,0.15)' : 'rgba(232,82,25,0.1)') : 'transparent',
                  borderRight: mode === 'manual' ? '1px solid #1e1e1e' : 'none',
                }}>
                <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="center">
                  {mode === 'agent' ? <IconRobot size={10} color={agentMode === 'agent' ? '#5D87FF' : '#444'} /> : <IconFileDescription size={10} color={agentMode === 'manual' ? '#E85219' : '#444'} />}
                  <Typography sx={{ fontSize: '0.58rem', fontWeight: agentMode === mode ? 700 : 400,
                    color: agentMode === mode ? (mode === 'agent' ? '#5D87FF' : '#E85219') : '#444' }}>
                    {mode === 'manual' ? 'Manual' : 'Agente IA'}
                  </Typography>
                </Stack>
              </Box>
            ))}
          </Stack>

          {/* ── Agent Mode ── */}
          {agentMode === 'agent' && (
            <Stack spacing={0.875}>
              <Stack direction="row" spacing={0.5} alignItems="center">
                <IconSparkles size={11} color="#5D87FF" />
                <Typography sx={{ fontSize: '0.58rem', color: '#5D87FF', fontWeight: 700 }}>
                  Descreva a campanha em linguagem natural
                </Typography>
              </Stack>
              <TextField
                multiline rows={4} size="small" fullWidth
                placeholder={'Ex: "Lançamento de tênis running para público jovem 25-35 anos, tom energético e motivador, foco em Instagram e TikTok, quero que as pessoas cliquem no link da bio"'}
                value={agentText}
                onChange={(e) => setAgentText(e.target.value)}
                sx={{ '& .MuiInputBase-root': { fontSize: '0.62rem', bgcolor: '#0d0d0d' } }}
              />
              {agentFeedback && (
                <Typography sx={{ fontSize: '0.6rem', color: agentFeedback.startsWith('✓') ? '#13DEB9' : '#EF4444', lineHeight: 1.4 }}>
                  {agentFeedback}
                </Typography>
              )}
              <Button variant="contained" size="small" fullWidth
                onClick={handleParseAgent}
                disabled={agentParsing || !agentText.trim()}
                startIcon={agentParsing ? <CircularProgress size={11} sx={{ color: '#000' }} /> : <IconSparkles size={12} />}
                sx={{ bgcolor: '#5D87FF', color: '#fff', fontWeight: 700, fontSize: '0.65rem',
                  textTransform: 'none', '&:hover': { bgcolor: '#4a6fd4' } }}
              >
                {agentParsing ? 'Interpretando…' : 'Analisar e preencher'}
              </Button>
            </Stack>
          )}

          {isLoading ? (
            <Stack direction="row" spacing={1} alignItems="center">
              <CircularProgress size={12} sx={{ color: '#E85219' }} />
              <Typography sx={{ fontSize: '0.62rem', color: 'text.secondary' }}>
                Carregando briefing…
              </Typography>
            </Stack>
          ) : agentMode === 'manual' ? (
            <>
              {/* ── Mise en place ── */}
              <Box>
                <Typography sx={{ fontSize: '0.58rem', color: '#555', mb: 0.75, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                  Ingredientes encontrados
                </Typography>
                <Stack spacing={0.6}>
                  <MiseItem ok={true} label="Briefing" value={briefing.title} />
                  <MiseItem ok={!!briefing.client_name} label="Cliente" value={briefing.client_name ?? 'Não identificado'} />
                  <MiseItem
                    ok={clientBrandColor !== '#F5C518'}
                    label="DNA da marca"
                    value={clientBrandColor !== '#F5C518' ? clientBrandColor : 'Carregando…'}
                  />
                  <MiseItem
                    ok={learningRulesCount === null ? null : learningRulesCount > 0}
                    label="Regras aprendidas"
                    value={
                      learningRulesCount === null ? 'verificando…'
                      : learningRulesCount > 0 ? `${learningRulesCount} regra${learningRulesCount !== 1 ? 's' : ''}`
                      : 'Nenhuma ainda'
                    }
                  />
                </Stack>
              </Box>

              {/* ── Objetivo (from briefing) ── */}
              {briefing?.payload?.objective && (
                <>
                  <Divider sx={{ borderColor: '#1e1e1e' }} />
                  <Box>
                    <Typography sx={{ fontSize: '0.58rem', color: '#555', mb: 0.5 }}>Objetivo</Typography>
                    <Typography sx={{
                      fontSize: '0.62rem', color: 'text.secondary', lineHeight: 1.5,
                      display: '-webkit-box', overflow: 'hidden', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical',
                    }}>
                      {briefing.payload.objective}
                    </Typography>
                  </Box>
                </>
              )}

              {/* ── Active ingredient blocks ── */}
              {activeIngredients.map((id) => {
                const ing = INGREDIENT_CATALOG.find((x) => x.id === id)!;

                return (
                  <Box key={id}>
                    <Divider sx={{ borderColor: '#1e1e1e', mb: 1 }} />

                    {/* Block header with remove button */}
                    <Stack direction="row" alignItems="center" mb={0.75}>
                      <Typography sx={{ fontSize: '0.7rem', mr: 0.5 }}>{ing.icon}</Typography>
                      <Typography sx={{ fontSize: '0.6rem', color: ing.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', flex: 1 }}>
                        {ing.label}
                      </Typography>
                      <IconButton size="small" onClick={() => removeIngredient(id)}
                        sx={{ p: 0.25, color: '#333', '&:hover': { color: '#EF4444' } }}>
                        <IconX size={10} />
                      </IconButton>
                    </Stack>

                    {/* ── Tom de Voz ── */}
                    {id === 'tone' && (
                      <Stack direction="row" spacing={0.5}>
                        {TONE_OPTIONS.map((t) => (
                          <Box key={t.id} onClick={() => setTone(tone === t.id ? '' : t.id)}
                            sx={{
                              flex: 1, py: 0.5, borderRadius: 1.5, cursor: 'pointer', textAlign: 'center',
                              border: '1px solid', transition: 'all 0.15s',
                              borderColor: tone === t.id ? '#5D87FF' : '#1e1e1e',
                              bgcolor: tone === t.id ? 'rgba(93,135,255,0.1)' : 'transparent',
                            }}>
                            <Typography sx={{ fontSize: '0.7rem', mb: 0.15 }}>{t.icon}</Typography>
                            <Typography sx={{ fontSize: '0.52rem', color: tone === t.id ? '#5D87FF' : '#555', fontWeight: tone === t.id ? 700 : 400 }}>
                              {t.label}
                            </Typography>
                          </Box>
                        ))}
                      </Stack>
                    )}

                    {/* ── Ação Desejada ── */}
                    {id === 'amd' && (
                      <Stack direction="row" spacing={0.4} flexWrap="wrap" gap={0.4}>
                        {AMD_OPTIONS.map((a) => (
                          <Box key={a.id} onClick={() => setAmd(amd === a.id ? '' : a.id)}
                            sx={{
                              px: 0.75, py: 0.4, borderRadius: 1.5, cursor: 'pointer',
                              border: '1px solid', transition: 'all 0.15s',
                              borderColor: amd === a.id ? '#E85219' : '#1e1e1e',
                              bgcolor: amd === a.id ? 'rgba(232,82,25,0.1)' : 'transparent',
                            }}>
                            <Typography sx={{ fontSize: '0.6rem', color: amd === a.id ? '#E85219' : '#555', fontWeight: amd === a.id ? 700 : 400, whiteSpace: 'nowrap' }}>
                              {a.icon} {a.label}
                            </Typography>
                          </Box>
                        ))}
                      </Stack>
                    )}

                    {/* ── Fase do Funil ── */}
                    {id === 'funnel' && (
                      <Stack direction="row" spacing={0.5}>
                        {FUNNEL_OPTIONS.map((f) => (
                          <Box key={f.id} onClick={() => setFunnelPhase(f.id as any)}
                            sx={{
                              flex: 1, py: 0.6, borderRadius: 1.5, cursor: 'pointer', textAlign: 'center',
                              border: '1px solid', transition: 'all 0.15s',
                              borderColor: funnelPhase === f.id ? f.color : '#1e1e1e',
                              bgcolor: funnelPhase === f.id ? `${f.color}18` : 'transparent',
                            }}>
                            <Typography sx={{ fontSize: '0.75rem', mb: 0.15 }}>{f.icon}</Typography>
                            <Typography sx={{ fontSize: '0.5rem', color: funnelPhase === f.id ? f.color : '#555', fontWeight: funnelPhase === f.id ? 700 : 400, lineHeight: 1.2 }}>
                              {f.label}
                            </Typography>
                          </Box>
                        ))}
                      </Stack>
                    )}

                    {/* ── Receita ── */}
                    {id === 'recipe' && (
                      suggestedRecipes.length > 0 ? (
                        <Stack spacing={0.5}>
                          {suggestedRecipes.slice(0, 3).map((r: CreativeRecipe) => (
                            <Box key={r.id}
                              onClick={() => { applyRecipe(r); }}
                              sx={{
                                p: 0.75, borderRadius: 1.5, cursor: 'pointer',
                                border: '1px solid #F8A80033', bgcolor: 'rgba(248,168,0,0.04)',
                                '&:hover': { bgcolor: 'rgba(248,168,0,0.08)', borderColor: '#F8A800' },
                                transition: 'all 0.15s',
                              }}
                            >
                              <Typography sx={{ fontSize: '0.62rem', color: '#dda000', fontWeight: 600, mb: 0.15 }}>
                                {r.name}
                              </Typography>
                              <Stack direction="row" spacing={0.5}>
                                {r.trigger_id && (
                                  <Typography sx={{ fontSize: '0.52rem', color: '#888' }}>Gatilho: {r.trigger_id}</Typography>
                                )}
                                {r.use_count > 0 && (
                                  <Typography sx={{ fontSize: '0.52rem', color: '#555' }}>· {r.use_count}×</Typography>
                                )}
                              </Stack>
                            </Box>
                          ))}
                        </Stack>
                      ) : (
                        <Typography sx={{ fontSize: '0.6rem', color: '#444', py: 0.5 }}>
                          Nenhuma receita salva ainda para este cliente.
                        </Typography>
                      )
                    )}
                  </Box>
                );
              })}

              {/* ── Add ingredient button ── */}
              {available.length > 0 && (
                <>
                  {activeIngredients.length > 0 && <Divider sx={{ borderColor: '#1e1e1e' }} />}
                  <Box
                    component="button"
                    onClick={(e) => setAnchor(e.currentTarget as HTMLElement)}
                    sx={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      gap: 0.75, width: '100%', py: 0.875,
                      border: '1px dashed #2a2a2a', borderRadius: 2,
                      bgcolor: 'transparent', cursor: 'pointer', transition: 'all 0.15s',
                      '&:hover': { borderColor: '#E85219', bgcolor: 'rgba(232,82,25,0.04)' },
                    }}
                  >
                    <IconPlus size={12} color="#444" />
                    <Typography sx={{ fontSize: '0.62rem', color: '#444' }}>
                      Adicionar ingrediente
                    </Typography>
                  </Box>

                  {/* ── Ingredient picker popover ── */}
                  <Popover
                    open={!!anchor}
                    anchorEl={anchor}
                    onClose={() => setAnchor(null)}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                    transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                    PaperProps={{
                      sx: {
                        bgcolor: '#111', border: '1px solid #2a2a2a',
                        borderRadius: 2, p: 1.25, width: 260,
                        boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                      },
                    }}
                  >
                    <Stack direction="row" alignItems="center" spacing={0.75} mb={1}>
                      <IconLayoutGrid size={12} color="#555" />
                      <Typography sx={{ fontSize: '0.62rem', color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        Ingredientes disponíveis
                      </Typography>
                    </Stack>
                    <Stack spacing={0.5}>
                      {available.map((ing) => (
                        <Box
                          key={ing.id}
                          onClick={() => addIngredient(ing.id)}
                          sx={{
                            display: 'flex', alignItems: 'center', gap: 1,
                            p: 0.875, borderRadius: 1.5, cursor: 'pointer',
                            border: '1px solid #1e1e1e', transition: 'all 0.15s',
                            '&:hover': { borderColor: ing.color, bgcolor: `${ing.color}0a` },
                          }}
                        >
                          <Box sx={{
                            width: 32, height: 32, borderRadius: 1.5, flexShrink: 0,
                            bgcolor: `${ing.color}18`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '1rem',
                          }}>
                            {ing.icon}
                          </Box>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, color: 'text.primary', mb: 0.1 }}>
                              {ing.label}
                            </Typography>
                            <Typography sx={{ fontSize: '0.57rem', color: '#555', lineHeight: 1.3 }}>
                              {ing.desc}
                            </Typography>
                          </Box>
                          <IconPlus size={11} color={ing.color} />
                        </Box>
                      ))}
                    </Stack>
                  </Popover>
                </>
              )}

              {/* ── Confirm button ── */}
              <Button
                variant="contained" size="small" fullWidth
                onClick={confirmBriefing}
                endIcon={<IconArrowRight size={13} />}
                sx={{
                  bgcolor: '#E85219', color: '#fff', fontWeight: 700,
                  fontSize: '0.7rem', textTransform: 'none',
                  '&:hover': { bgcolor: '#c43e10' },
                }}
              >
                Tudo certo — iniciar Copy
              </Button>
            </>
          ) : null}
        </Stack>
      </NodeShell>

      <Handle type="source" position={Position.Right} id="briefing_out"
        style={{ background: '#13DEB9', width: 10, height: 10, border: 'none' }} />
    </Box>
  );
}
