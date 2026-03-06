'use client';
import { Handle, Position } from '@xyflow/react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Chip from '@mui/material/Chip';
import LinearProgress from '@mui/material/LinearProgress';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import {
  IconPhoto, IconCheck, IconTemplate, IconBolt, IconChevronDown,
  IconRefresh, IconWand, IconLayersLinked, IconRobot, IconDna,
} from '@tabler/icons-react';
import { useState } from 'react';
import CircularProgress from '@mui/material/CircularProgress';
import NodeShell from '../NodeShell';
import { usePipeline, type ArteBrandVisual, type ArteFalPayload } from '../PipelineContext';

const CAMERA_OPTIONS = [
  { id: 'auto',        label: 'Auto' },
  { id: 'close-up',   label: 'Close-up' },
  { id: 'wide shot',  label: 'Aberto' },
  { id: 'aerial view', label: 'Aéreo' },
  { id: 'eye-level',  label: 'Olho' },
];

const LIGHTING_OPTIONS = [
  { id: 'auto',            label: 'Auto' },
  { id: 'golden hour',     label: 'Golden' },
  { id: 'studio lighting', label: 'Studio' },
  { id: 'dramatic shadows', label: 'Drama' },
  { id: 'neon glow',       label: 'Neon' },
];

const COMPOSITION_OPTIONS = [
  { id: 'auto',           label: 'Auto' },
  { id: 'rule of thirds', label: '3rds' },
  { id: 'centered',       label: 'Centro' },
  { id: 'negative space', label: 'Neg.' },
  { id: 'leading lines',  label: 'Linhas' },
];

const PROVIDERS = [
  { id: 'fal',      label: 'Fal.ai / Flux', models: [
    { id: 'fal-flux-pro',      label: 'Flux Pro — Alta qualidade' },
    { id: 'fal-flux-schnell',  label: 'Flux Schnell — Rápido' },
    { id: 'fal-flux-realism',  label: 'Flux Realism — Fotorrealista' },
  ]},
  { id: 'gemini',   label: 'Google Gemini', models: [
    { id: 'gemini-2.0-flash-exp-image-generation', label: 'Gemini 2.0 Flash' },
    { id: 'imagen-3.0-generate-001',               label: 'Imagen 3.0' },
    { id: 'imagen-3.0-fast-generate-001',          label: 'Imagen 3.0 Fast' },
  ]},
  { id: 'leonardo', label: 'Leonardo.ai', models: [
    { id: 'leonardo-phoenix',      label: 'Phoenix — Versátil' },
    { id: 'leonardo-kino-xl',      label: 'Kino XL — Cinemático' },
    { id: 'leonardo-lightning-xl', label: 'Lightning XL — Rápido' },
  ]},
];

const ASPECT_RATIOS = [
  { id: '1:1',  label: '1:1',  hint: 'Feed' },
  { id: '9:16', label: '9:16', hint: 'Story/Reels' },
  { id: '4:5',  label: '4:5',  hint: 'Portrait' },
  { id: '16:9', label: '16:9', hint: 'Banner' },
  { id: '3:1',  label: '3:1',  hint: 'LinkedIn' },
];

const TRIGGER_COLORS: Record<string, string> = {
  G01: '#FF4D4D', G02: '#00B4FF', G03: '#13DEB9',
  G04: '#F5C518', G05: '#A855F7', G06: '#FB923C', G07: '#888',
};
const TRIGGERS_LABEL: Record<string, string> = {
  G01: 'Escassez', G02: 'Autoridade', G03: 'Prova Social',
  G04: 'Reciprocidade', G05: 'Curiosidade', G06: 'Identidade', G07: 'Dor/Solução',
};

const DA_CHAIN_STEPS = [
  { id: 1, label: 'Brand Visual RAG',   desc: 'Identidade visual, LoRA e regras de marca',           color: '#EC4899', est: 5  },
  { id: 2, label: 'Prompt Brain',       desc: 'LLM engenheira o payload perfeito para o Fal.ai',     color: '#F97316', est: 8  },
  { id: 3, label: 'Renderização',       desc: 'Fal.ai Flux Pro + LoRA gera a imagem (~8s)',           color: '#A855F7', est: 12 },
  { id: 4, label: 'Critique Estética',  desc: 'Vision LLM avalia marca, composição e coerência',     color: '#22D3EE', est: 6  },
  { id: 5, label: 'Loop de Qualidade',  desc: 'Refina prompt e regera se score < 72',                color: '#F8A800', est: 10 },
  { id: 6, label: 'Multi-formato',      desc: 'Gera Story, Feed e LinkedIn em paralelo',             color: '#22C55E', est: 8  },
];

export default function ArteNode() {
  const {
    arteGenerating, artDirLayout, arteImageUrl, arteImageUrls,
    selectedArteIdx, setSelectedArteIdx, arteApproved, arteError,
    handleGenerateArte, useArte, editArte, selectedTrigger, nodeStatus,
    addOptionalNode, activeNodeIds,
    arteChainResult, arteChainStep, handleGenerateArteChain,
  } = usePipeline();

  const [provider, setProvider] = useState<'fal' | 'gemini' | 'leonardo'>('fal');
  const [model, setModel] = useState('fal-flux-pro');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [refinement, setRefinement] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [camera, setCamera] = useState('auto');
  const [lighting, setLighting] = useState('auto');
  const [composition, setComposition] = useState('auto');

  // Agente DA chain controls
  const [useAgentDA, setUseAgentDA] = useState(false);
  const [showDAControls, setShowDAControls] = useState(false);
  const [bvOverride, setBvOverride] = useState<Partial<ArteBrandVisual>>({});
  const [promptOverride, setPromptOverride] = useState('');

  // Build the visual directive string from DA selections
  const buildVisualDirective = (cam: string, light: string, comp: string, extra: string) => {
    const parts: string[] = [];
    if (cam !== 'auto')   parts.push(cam);
    if (light !== 'auto') parts.push(light);
    if (comp !== 'auto')  parts.push(comp);
    if (extra.trim())     parts.push(extra.trim());
    return parts.join(', ');
  };
  const status = nodeStatus.arte;

  const currentProvider = PROVIDERS.find(p => p.id === provider)!;

  const collapsedSummary = arteImageUrl ? (
    <Stack spacing={0.5}>
      <Box sx={{ width: '100%', height: 80, borderRadius: 1.5, overflow: 'hidden', border: '1px solid #13DEB944' }}>
        <img src={arteImageUrl} alt="Arte selecionada"
          style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </Box>
      <Stack direction="row" spacing={0.5}>
        <Chip size="small" label={aspectRatio} sx={{ height: 18, fontSize: '0.58rem', bgcolor: '#1a1a1a', color: '#888' }} />
        {selectedTrigger && (
          <Chip size="small" label={`${selectedTrigger} ${TRIGGERS_LABEL[selectedTrigger] || ''}`}
            sx={{ height: 18, fontSize: '0.58rem', bgcolor: `${TRIGGER_COLORS[selectedTrigger] || '#888'}22`, color: TRIGGER_COLORS[selectedTrigger] || '#888' }} />
        )}
      </Stack>
    </Stack>
  ) : null;

  return (
    <Box>
      <Handle type="target" position={Position.Left} id="arte_in"
        style={{ background: '#444', width: 10, height: 10, border: 'none' }} />

      <NodeShell
        title="Arte & Direção"
        icon={<IconPhoto size={14} />}
        status={status}
        width={320}
        collapsedSummary={collapsedSummary}
        onEdit={editArte}
        nodeOptions={[
          {
            id: 'multiFormat',
            label: 'Multi-Formato',
            description: 'Gerar arte para Story, Feed, LinkedIn, YouTube…',
            color: '#F97316',
            icon: <IconLayersLinked size={13} />,
            added: activeNodeIds.includes('multiFormat'),
            onClick: () => addOptionalNode('multiFormat'),
          },
        ]}
      >
        <Stack spacing={1.25}>
          {/* Active trigger */}
          {selectedTrigger && (
            <Stack direction="row" spacing={0.75} alignItems="center"
              sx={{ p: 0.75, borderRadius: 1.5,
                border: `1px solid ${TRIGGER_COLORS[selectedTrigger] || '#888'}44`,
                bgcolor: `${TRIGGER_COLORS[selectedTrigger] || '#888'}08` }}>
              <IconBolt size={12} color={TRIGGER_COLORS[selectedTrigger] || '#888'} />
              <Typography sx={{ fontSize: '0.6rem', color: TRIGGER_COLORS[selectedTrigger] || '#888', fontWeight: 700 }}>
                {selectedTrigger} — {TRIGGERS_LABEL[selectedTrigger] || ''} &nbsp;
                <Typography component="span" sx={{ fontSize: '0.57rem', color: '#555', fontWeight: 400 }}>
                  (Art Director ativo)
                </Typography>
              </Typography>
            </Stack>
          )}

          {/* Aspect Ratio */}
          <Box>
            <Typography sx={{ fontSize: '0.58rem', color: '#555', mb: 0.5, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              Proporção
            </Typography>
            <Stack direction="row" spacing={0.5}>
              {ASPECT_RATIOS.map((ar) => (
                <Tooltip key={ar.id} title={ar.hint} placement="top">
                  <Box onClick={() => setAspectRatio(ar.id)}
                    sx={{
                      flex: 1, py: 0.5, borderRadius: 1.5, cursor: 'pointer', textAlign: 'center',
                      border: '1px solid', transition: 'all 0.15s',
                      borderColor: aspectRatio === ar.id ? '#E85219' : '#222',
                      bgcolor: aspectRatio === ar.id ? 'rgba(232,82,25,0.1)' : 'transparent',
                    }}>
                    <Typography sx={{ fontSize: '0.6rem', color: aspectRatio === ar.id ? '#E85219' : '#666',
                      fontWeight: aspectRatio === ar.id ? 700 : 400 }}>
                      {ar.label}
                    </Typography>
                  </Box>
                </Tooltip>
              ))}
            </Stack>
          </Box>

          {/* Provider + Model */}
          <Stack spacing={0.75}>
            <TextField
              select size="small" label="Provedor de imagem"
              value={provider}
              onChange={(e) => {
                const p = e.target.value as 'fal' | 'gemini' | 'leonardo';
                setProvider(p);
                const prov = PROVIDERS.find(x => x.id === p);
                if (prov) setModel(prov.models[0].id);
              }}
              fullWidth
              sx={{ '& .MuiInputBase-root': { fontSize: '0.72rem' } }}
            >
              {PROVIDERS.map((p) => (
                <MenuItem key={p.id} value={p.id} sx={{ fontSize: '0.72rem' }}>{p.label}</MenuItem>
              ))}
            </TextField>
            <TextField
              select size="small" label="Modelo"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              fullWidth
              sx={{ '& .MuiInputBase-root': { fontSize: '0.72rem' } }}
            >
              {currentProvider.models.map((m) => (
                <MenuItem key={m.id} value={m.id} sx={{ fontSize: '0.72rem' }}>{m.label}</MenuItem>
              ))}
            </TextField>
          </Stack>

          {/* Advanced toggle */}
          <Button
            size="small" variant="text"
            onClick={() => setShowAdvanced(p => !p)}
            endIcon={<IconChevronDown size={11} style={{ transform: showAdvanced ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />}
            sx={{ textTransform: 'none', fontSize: '0.6rem', color: '#555', py: 0, justifyContent: 'flex-start', px: 0 }}
          >
            Prompt negativo & refinamento
          </Button>

          {showAdvanced && (
            <Stack spacing={0.75}>
              <TextField
                size="small" fullWidth multiline rows={2}
                placeholder="Negative prompt: text, logos, watermark, blurry…"
                value={negativePrompt}
                onChange={(e) => setNegativePrompt(e.target.value)}
                label="Prompt negativo"
                sx={{ '& .MuiInputBase-root': { fontSize: '0.65rem' } }}
              />
            </Stack>
          )}

          {/* Direção Visual — Plugin DA */}
          <Box sx={{ p: 1, borderRadius: 1.5, border: '1px solid #A855F722', bgcolor: 'rgba(168,85,247,0.04)' }}>
            <Typography sx={{ fontSize: '0.52rem', color: '#A855F7', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', mb: 0.75 }}>
              Direção Visual (DA)
            </Typography>
            <Stack spacing={0.6}>
              {/* Camera */}
              <Box>
                <Typography sx={{ fontSize: '0.5rem', color: '#555', mb: 0.4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Câmera
                </Typography>
                <Stack direction="row" spacing={0.4} flexWrap="wrap" gap={0.4}>
                  {CAMERA_OPTIONS.map((opt) => (
                    <Box key={opt.id} onClick={() => setCamera(opt.id)}
                      sx={{
                        px: 0.75, py: 0.3, borderRadius: 1, cursor: 'pointer', fontSize: '0.55rem',
                        border: '1px solid', transition: 'all 0.12s',
                        borderColor: camera === opt.id ? '#A855F7' : '#222',
                        bgcolor: camera === opt.id ? 'rgba(168,85,247,0.14)' : 'transparent',
                        color: camera === opt.id ? '#A855F7' : '#555',
                        fontWeight: camera === opt.id ? 700 : 400,
                      }}>
                      {opt.label}
                    </Box>
                  ))}
                </Stack>
              </Box>
              {/* Lighting */}
              <Box>
                <Typography sx={{ fontSize: '0.5rem', color: '#555', mb: 0.4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Iluminação
                </Typography>
                <Stack direction="row" spacing={0.4} flexWrap="wrap" gap={0.4}>
                  {LIGHTING_OPTIONS.map((opt) => (
                    <Box key={opt.id} onClick={() => setLighting(opt.id)}
                      sx={{
                        px: 0.75, py: 0.3, borderRadius: 1, cursor: 'pointer', fontSize: '0.55rem',
                        border: '1px solid', transition: 'all 0.12s',
                        borderColor: lighting === opt.id ? '#A855F7' : '#222',
                        bgcolor: lighting === opt.id ? 'rgba(168,85,247,0.14)' : 'transparent',
                        color: lighting === opt.id ? '#A855F7' : '#555',
                        fontWeight: lighting === opt.id ? 700 : 400,
                      }}>
                      {opt.label}
                    </Box>
                  ))}
                </Stack>
              </Box>
              {/* Composition */}
              <Box>
                <Typography sx={{ fontSize: '0.5rem', color: '#555', mb: 0.4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Composição
                </Typography>
                <Stack direction="row" spacing={0.4} flexWrap="wrap" gap={0.4}>
                  {COMPOSITION_OPTIONS.map((opt) => (
                    <Box key={opt.id} onClick={() => setComposition(opt.id)}
                      sx={{
                        px: 0.75, py: 0.3, borderRadius: 1, cursor: 'pointer', fontSize: '0.55rem',
                        border: '1px solid', transition: 'all 0.12s',
                        borderColor: composition === opt.id ? '#A855F7' : '#222',
                        bgcolor: composition === opt.id ? 'rgba(168,85,247,0.14)' : 'transparent',
                        color: composition === opt.id ? '#A855F7' : '#555',
                        fontWeight: composition === opt.id ? 700 : 400,
                      }}>
                      {opt.label}
                    </Box>
                  ))}
                </Stack>
              </Box>
            </Stack>
          </Box>

          {/* Agente DA toggle */}
          <Stack direction="row" alignItems="center" spacing={0.75}
            sx={{ p: 0.75, borderRadius: 1.5, border: `1px solid ${useAgentDA ? '#22D3EE44' : '#1e1e1e'}`,
              bgcolor: useAgentDA ? 'rgba(34,211,238,0.05)' : 'transparent', cursor: 'pointer', transition: 'all 0.2s' }}
            onClick={() => setUseAgentDA(p => !p)}>
            <IconRobot size={12} color={useAgentDA ? '#22D3EE' : '#444'} />
            <Typography sx={{ fontSize: '0.6rem', flex: 1, color: useAgentDA ? '#22D3EE' : '#555', fontWeight: useAgentDA ? 700 : 400 }}>
              Agente DA (6 plugins: LoRA + Critique Loop)
            </Typography>
            <Box sx={{ width: 28, height: 16, borderRadius: 8, bgcolor: useAgentDA ? '#22D3EE44' : '#1e1e1e',
              border: `1px solid ${useAgentDA ? '#22D3EE' : '#333'}`, position: 'relative', flexShrink: 0 }}>
              <Box sx={{ position: 'absolute', top: 2, left: useAgentDA ? 12 : 2, width: 10, height: 10,
                borderRadius: '50%', bgcolor: useAgentDA ? '#22D3EE' : '#444', transition: 'left 0.2s' }} />
            </Box>
          </Stack>

          {/* Agente DA parameter controls */}
          {useAgentDA && (
            <Box sx={{ border: '1px solid #22D3EE22', borderRadius: 1.5, overflow: 'hidden' }}>
              <Stack direction="row" alignItems="center" sx={{ px: 1.25, py: 0.75, bgcolor: 'rgba(34,211,238,0.04)', cursor: 'pointer' }}
                onClick={() => setShowDAControls(p => !p)}>
                <IconDna size={11} color="#22D3EE" />
                <Typography sx={{ fontSize: '0.58rem', color: '#22D3EE', fontWeight: 700, ml: 0.5, flex: 1 }}>
                  Parâmetros do Agente DA
                </Typography>
                <IconChevronDown size={11} color="#22D3EE"
                  style={{ transform: showDAControls ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
              </Stack>
              {showDAControls && (
                <Box sx={{ px: 1.25, py: 1 }}>
                  <Stack spacing={0.75}>
                    {/* P1 overrides */}
                    <Box>
                      <Stack direction="row" spacing={0.5} alignItems="center" mb={0.5}>
                        <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#EC4899', flexShrink: 0 }} />
                        <Typography sx={{ fontSize: '0.52rem', color: '#EC4899', fontWeight: 700, textTransform: 'uppercase' }}>
                          P1 — Identidade Visual
                        </Typography>
                      </Stack>
                      <Stack spacing={0.5}>
                        <TextField size="small" fullWidth label="Estilo de referência (override)"
                          value={bvOverride.referenceStyle ?? ''}
                          onChange={(e) => setBvOverride(p => ({ ...p, referenceStyle: e.target.value || undefined }))}
                          placeholder={arteChainResult?.brandVisual.referenceStyle ?? 'ex: hiper-realismo fotográfico'}
                          sx={{ '& .MuiInputBase-root': { fontSize: '0.65rem' } }} />
                        {arteChainResult?.brandVisual.loraId && (
                          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ p: 0.5, borderRadius: 1, bgcolor: 'rgba(34,211,238,0.06)', border: '1px solid #22D3EE22' }}>
                            <IconDna size={10} color="#22D3EE" />
                            <Typography sx={{ fontSize: '0.55rem', color: '#22D3EE' }}>
                              LoRA: {arteChainResult.brandVisual.loraId.slice(0, 30)}… (scale {arteChainResult.brandVisual.loraScale})
                            </Typography>
                          </Stack>
                        )}
                      </Stack>
                    </Box>

                    {/* P2 — prompt override */}
                    <Box>
                      <Stack direction="row" spacing={0.5} alignItems="center" mb={0.5}>
                        <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#F97316', flexShrink: 0 }} />
                        <Typography sx={{ fontSize: '0.52rem', color: '#F97316', fontWeight: 700, textTransform: 'uppercase' }}>
                          P2 — Prompt Brain (override)
                        </Typography>
                      </Stack>
                      <TextField size="small" fullWidth multiline rows={2}
                        label="Prompt positivo (força o P2 a usar este)"
                        value={promptOverride}
                        onChange={(e) => setPromptOverride(e.target.value)}
                        placeholder={arteChainResult?.payload.prompt?.slice(0, 100) ?? 'Deixe vazio para IA decidir'}
                        sx={{ '& .MuiInputBase-root': { fontSize: '0.62rem' } }} />
                      {arteChainResult?.payload.concept && (
                        <Typography sx={{ fontSize: '0.52rem', color: '#555', mt: 0.4, fontStyle: 'italic' }}>
                          Conceito atual: {arteChainResult.payload.concept}
                        </Typography>
                      )}
                    </Box>

                    {/* P3–P6 */}
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#5D87FF', flexShrink: 0 }} />
                      <Typography sx={{ fontSize: '0.52rem', color: '#555' }}>P3 Render + P4 Critique + P5 Loop + P6 Multi-formato — auto</Typography>
                    </Stack>
                  </Stack>
                </Box>
              )}
            </Box>
          )}

          {/* Agente DA stepper */}
          {useAgentDA && arteGenerating && arteChainStep > 0 && (
            <Box sx={{ border: '1px solid #22D3EE22', borderRadius: 1.5, overflow: 'hidden' }}>
              {DA_CHAIN_STEPS.map((step) => {
                const isDone    = arteChainStep > step.id;
                const isActive  = arteChainStep === step.id;
                return (
                  <Stack key={step.id} direction="row" alignItems="flex-start" spacing={0.875}
                    sx={{ px: 1.25, py: 0.625, bgcolor: isActive ? `${step.color}08` : 'transparent',
                      borderBottom: step.id < 6 ? '1px solid #0f0f0f' : 'none', transition: 'background-color 0.3s' }}>
                    <Box sx={{ mt: 0.1, flexShrink: 0 }}>
                      {isDone   && <Box sx={{ width: 14, height: 14, borderRadius: '50%', bgcolor: step.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="8" height="8" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" stroke="#000" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>
                      </Box>}
                      {isActive && <CircularProgress size={14} sx={{ color: step.color }} />}
                      {!isDone && !isActive && <Box sx={{ width: 14, height: 14, borderRadius: '50%', border: '1.5px solid #333' }} />}
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontSize: '0.58rem', fontWeight: isActive ? 700 : 400,
                        color: isActive ? step.color : isDone ? '#888' : '#444' }}>
                        P{step.id} — {step.label}
                      </Typography>
                      {isActive && (
                        <Typography sx={{ fontSize: '0.52rem', color: '#555', lineHeight: 1.3, mt: 0.15 }}>
                          {step.desc}
                        </Typography>
                      )}
                    </Box>
                    {isActive && <Typography sx={{ fontSize: '0.5rem', color: step.color, flexShrink: 0, mt: 0.1 }}>~{step.est}s</Typography>}
                  </Stack>
                );
              })}
            </Box>
          )}

          {/* Agente DA result summary */}
          {useAgentDA && arteChainResult && !arteGenerating && (
            <Box sx={{ p: 0.875, borderRadius: 1.5, border: '1px solid #22D3EE33', bgcolor: 'rgba(34,211,238,0.04)' }}>
              <Stack direction="row" spacing={0.75} alignItems="center" mb={0.5}>
                <Typography sx={{ fontSize: '0.52rem', color: '#22D3EE', fontWeight: 700, textTransform: 'uppercase', flex: 1 }}>
                  Resultado do Agente DA
                </Typography>
                {arteChainResult.critique.pass
                  ? <Chip size="small" label={`Score ${arteChainResult.critique.score} ✓`} sx={{ height: 16, fontSize: '0.48rem', bgcolor: 'rgba(34,197,94,0.15)', color: '#22C55E' }} />
                  : <Chip size="small" label={`Score ${arteChainResult.critique.score} ⚠`} sx={{ height: 16, fontSize: '0.48rem', bgcolor: 'rgba(248,168,0,0.15)', color: '#F8A800' }} />
                }
              </Stack>
              <Typography sx={{ fontSize: '0.57rem', color: '#888', mb: 0.4 }}>
                {arteChainResult.payload.concept}
              </Typography>
              <Stack direction="row" spacing={0.4} flexWrap="wrap" gap={0.4}>
                <Chip size="small" label={arteChainResult.payload.model}
                  sx={{ height: 15, fontSize: '0.48rem', bgcolor: '#111', color: '#555', border: '1px solid #1e1e1e' }} />
                {arteChainResult.brandVisual.loraId && (
                  <Chip size="small" label="LoRA ativo"
                    sx={{ height: 15, fontSize: '0.48rem', bgcolor: 'rgba(34,211,238,0.1)', color: '#22D3EE', border: '1px solid #22D3EE33' }} />
                )}
                <Chip size="small" label={`${arteChainResult.attempts} tentativa${arteChainResult.attempts > 1 ? 's' : ''}`}
                  sx={{ height: 15, fontSize: '0.48rem', bgcolor: '#111', color: '#555', border: '1px solid #1e1e1e' }} />
                {Object.entries(arteChainResult.pluginTimings).slice(0, 3).map(([k, ms]) => (
                  <Chip key={k} size="small" label={`${k.replace(/(_\d+)?$/, '')}: ${((ms as number) / 1000).toFixed(1)}s`}
                    sx={{ height: 15, fontSize: '0.45rem', bgcolor: '#111', color: '#444', border: '1px solid #1a1a1a' }} />
                ))}
              </Stack>
              {arteChainResult.critique.issues.length > 0 && !arteChainResult.critique.pass && (
                <Typography sx={{ fontSize: '0.52rem', color: '#F8A800', mt: 0.5, lineHeight: 1.4 }}>
                  ⚠ {arteChainResult.critique.issues[0]}
                </Typography>
              )}
              {/* Multi-format results */}
              {arteChainResult.multiFormat && arteChainResult.multiFormat.length > 0 && (
                <Box sx={{ mt: 0.75, pt: 0.75, borderTop: '1px solid #22D3EE11' }}>
                  <Typography sx={{ fontSize: '0.5rem', color: '#22D3EE', textTransform: 'uppercase', letterSpacing: '0.07em', mb: 0.5 }}>
                    Multi-formato ({arteChainResult.multiFormat.length})
                  </Typography>
                  <Stack direction="row" spacing={0.5} flexWrap="wrap" gap={0.5}>
                    {arteChainResult.multiFormat.map((mf) => (
                      <Tooltip key={mf.format} title={`${mf.format} — ${mf.aspectRatio}`} placement="top">
                        <Box
                          onClick={() => useArte(mf.imageUrl)}
                          sx={{ width: 44, height: 44, borderRadius: 1, overflow: 'hidden', cursor: 'pointer',
                            border: '1px solid #22D3EE33',
                            '&:hover': { borderColor: '#22D3EE', boxShadow: '0 0 0 2px #22D3EE22' } }}
                        >
                          <img src={mf.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={mf.format} />
                        </Box>
                      </Tooltip>
                    ))}
                  </Stack>
                </Box>
              )}
            </Box>
          )}

          {/* Generation buttons */}
          <Stack direction="row" spacing={0.75}>
            {!useAgentDA && (
              <Button
                variant="outlined" size="small" sx={{ flex: 1, textTransform: 'none', fontSize: '0.65rem',
                  borderColor: '#333', color: 'text.secondary' }}
                onClick={() => handleGenerateArte(false, { aspectRatio, negativePrompt, provider, model, refinement: buildVisualDirective(camera, lighting, composition, '') })}
                disabled={arteGenerating}
                startIcon={<IconTemplate size={12} />}
              >
                Só Layout
              </Button>
            )}
            <Button
              variant="contained" size="small" sx={{ flex: 2, textTransform: 'none', fontSize: '0.65rem',
                bgcolor: useAgentDA ? '#22D3EE' : '#E85219', fontWeight: 700,
                '&:hover': { bgcolor: useAgentDA ? '#06b6d4' : '#c43e10' },
                color: useAgentDA ? '#000' : '#fff',
              }}
              onClick={() => {
                if (useAgentDA) {
                  handleGenerateArteChain({
                    brandVisualOverride: Object.keys(bvOverride).length ? bvOverride : undefined,
                    payloadOverride: promptOverride ? { prompt: promptOverride } : undefined,
                  });
                } else {
                  handleGenerateArte(true, { aspectRatio, negativePrompt, provider, model, refinement: buildVisualDirective(camera, lighting, composition, '') });
                }
              }}
              disabled={arteGenerating}
              startIcon={arteGenerating ? undefined : useAgentDA ? <IconRobot size={12} /> : <IconPhoto size={12} />}
            >
              {arteGenerating
                ? (useAgentDA ? `Plugin ${arteChainStep}/6 rodando…` : 'Gerando…')
                : useAgentDA ? (arteChainResult ? 'Reexecutar Agente DA' : 'Iniciar Agente DA')
                : 'Gerar Arte'}
            </Button>
          </Stack>

          {arteGenerating && <LinearProgress sx={{ borderRadius: 1, '& .MuiLinearProgress-bar': { bgcolor: '#E85219' } }} />}
          {arteError && <Typography variant="caption" color="error">{arteError}</Typography>}

          {/* Art Director layout preview */}
          {artDirLayout && !arteGenerating && (
            <Box sx={{ p: 1, borderRadius: 1.5, border: '1px solid rgba(19,222,185,0.25)', bgcolor: 'rgba(19,222,185,0.03)' }}>
              <Typography sx={{ fontSize: '0.55rem', color: '#555', mb: 0.5, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                Art Director — Layout
              </Typography>
              {artDirLayout.eyebrow && (
                <Typography sx={{ fontSize: '0.57rem', color: 'text.secondary' }}>↑ {artDirLayout.eyebrow}</Typography>
              )}
              {artDirLayout.headline && (
                <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, color: 'text.primary', my: 0.25 }}>
                  {artDirLayout.headline}
                </Typography>
              )}
              {artDirLayout.body && (
                <Typography sx={{ fontSize: '0.58rem', color: 'text.secondary' }}>{artDirLayout.body}</Typography>
              )}
              {artDirLayout.cta && (
                <Chip size="small" label={artDirLayout.cta}
                  sx={{ mt: 0.5, height: 18, fontSize: '0.58rem',
                    bgcolor: `${artDirLayout.accentColor || '#E85219'}22`,
                    color: artDirLayout.accentColor || '#E85219' }} />
              )}
            </Box>
          )}

          {/* Image variants */}
          {arteImageUrls.length > 0 && !arteGenerating && (
            <Stack spacing={0.75}>
              <Typography sx={{ fontSize: '0.6rem', color: '#555' }}>
                {arteImageUrls.length} variante{arteImageUrls.length > 1 ? 's' : ''} — clique para selecionar:
              </Typography>
              <Stack direction="row" spacing={0.5} flexWrap="wrap">
                {arteImageUrls.map((url, i) => (
                  <Box key={i}
                    onClick={() => setSelectedArteIdx(i)}
                    sx={{
                      width: 60, height: 60, borderRadius: 1.5, overflow: 'hidden', cursor: 'pointer',
                      border: '2px solid',
                      borderColor: selectedArteIdx === i ? '#13DEB9' : '#222',
                      transition: 'border-color 0.15s',
                      '&:hover': { borderColor: '#13DEB9' },
                    }}
                  >
                    <img src={url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                  </Box>
                ))}
              </Stack>

              {/* Refinement input — iterate after seeing result */}
              <TextField
                size="small" fullWidth
                placeholder="Iterar: ex. 'mais vibrante', 'menos texto', 'luz mais suave'…"
                value={refinement}
                onChange={(e) => setRefinement(e.target.value)}
                InputProps={{
                  endAdornment: refinement ? (
                    <IconButton size="small"
                      onClick={() => handleGenerateArte(true, { aspectRatio, negativePrompt, provider, model, refinement: buildVisualDirective(camera, lighting, composition, refinement) })}
                      disabled={arteGenerating}
                      sx={{ color: '#A855F7' }}>
                      <IconWand size={14} />
                    </IconButton>
                  ) : undefined,
                }}
                sx={{ '& .MuiInputBase-root': { fontSize: '0.65rem' } }}
              />

              <Button
                variant="contained" size="small" fullWidth
                onClick={() => useArte(arteImageUrls[selectedArteIdx])}
                startIcon={<IconCheck size={13} />}
                sx={{ bgcolor: '#13DEB9', color: '#000', fontWeight: 700, fontSize: '0.7rem',
                  textTransform: 'none', '&:hover': { bgcolor: '#0fb89e' } }}
              >
                Usar esta Arte
              </Button>
            </Stack>
          )}
        </Stack>
      </NodeShell>

      <Handle type="source" position={Position.Right} id="arte_out"
        style={{ background: arteApproved ? '#13DEB9' : '#E85219', width: 10, height: 10, border: 'none' }} />
    </Box>
  );
}
