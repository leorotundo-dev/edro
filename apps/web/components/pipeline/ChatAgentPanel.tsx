'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import LinearProgress from '@mui/material/LinearProgress';
import {
  IconSend, IconSparkles, IconPalette, IconTypography,
  IconPhoto, IconPackage, IconSearch, IconBrandInstagram,
  IconCheck, IconRefresh, IconAdjustments, IconRobot,
  IconChevronRight, IconBolt, IconPaperclip, IconBulb,
  IconWorld, IconBox, IconX,
} from '@tabler/icons-react';
import { usePipeline } from './PipelineContext';

// ── Types ──────────────────────────────────────────────────────────────────────

type ToolExecution = {
  id: string;
  name: string;
  status: 'running' | 'done' | 'error';
  detail?: string;
  progress?: number; // 0–100
};

type PlanRow = {
  step: string;
  what: string;
  status: 'pending' | 'running' | 'done';
};

type QuickAction = {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  color?: string;
};

type ChatMessage = {
  id: string;
  role: 'user' | 'agent';
  text?: string;
  tools?: ToolExecution[];
  plan?: PlanRow[];
  quickActions?: QuickAction[];
  imageUrl?: string;
  isTyping?: boolean;
};

type Intent = 'copy' | 'arte' | 'brand_pack' | 'visual_insights' | 'briefing' | 'unknown';

// ── Skill chips ────────────────────────────────────────────────────────────────

const SKILLS = [
  { id: 'copy',             label: 'Gerar Copy',        icon: <IconTypography size={12} />,     color: '#E85219' },
  { id: 'arte',             label: 'Gerar Arte',         icon: <IconPalette size={12} />,         color: '#5D87FF' },
  { id: 'brand_pack',       label: 'Brand Pack',         icon: <IconPackage size={12} />,         color: '#13DEB9' },
  { id: 'visual_insights',  label: 'Visual Insights',    icon: <IconSearch size={12} />,          color: '#F8A800' },
  { id: 'briefing',         label: 'Descrever Campanha', icon: <IconBolt size={12} />,            color: '#7C3AED' },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

function detectIntent(text: string): Intent {
  const t = text.toLowerCase();
  if (/brand.?pack|todos os formatos|pack completo|5 formatos/.test(t)) return 'brand_pack';
  if (/arte|imagem|visual|foto|design|ilustra|criativ|gerar.*arte/.test(t)) return 'arte';
  if (/copy|texto|legenda|redator|escrev|campanha.*texto|capti/.test(t)) return 'copy';
  if (/referên|insight|buscar|pesquis|inspect/.test(t)) return 'visual_insights';
  if (/briefing|campanha|lançamento|promo|produto|objetivo|cliente/.test(t)) return 'briefing';
  return 'unknown';
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

const COPY_CHAIN_STEPS = [
  'P1 BrandVoice — Identidade de marca',
  'P2 Strategy — Ângulos persuasivos',
  'P3 Redator — Opções de copy',
  'P4 Auditor — Revisão criativa',
  'P5 Otimizador — Adaptação por canal',
];

const ARTE_CHAIN_STEPS = [
  'P1 Brief Visual — Análise criativa',
  'P2 PromptBrain — Engenharia de prompt',
  'P3 ArtDirector — Composição e layout',
  'P4 Generator — Geração com Flux Pro',
  'P5 Critic — Avaliação estética',
  'P6 Formats — Multi-formato',
];

// ── Sub-components ─────────────────────────────────────────────────────────────

function ToolCard({ tool }: { tool: ToolExecution }) {
  const color = tool.status === 'done' ? '#13DEB9' : tool.status === 'error' ? '#EF4444' : '#5D87FF';
  return (
    <Box sx={{
      border: `1px solid ${color}33`,
      bgcolor: `${color}08`,
      borderRadius: 1.5,
      px: 1.25, py: 0.875,
    }}>
      <Stack direction="row" spacing={0.75} alignItems="center">
        {tool.status === 'running'
          ? <CircularProgress size={10} sx={{ color, flexShrink: 0 }} />
          : tool.status === 'done'
            ? <IconCheck size={10} color={color} />
            : <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#EF4444', flexShrink: 0 }} />
        }
        <Typography sx={{ fontSize: '0.58rem', fontWeight: 600, color, flex: 1 }}>
          {tool.name}
        </Typography>
        {tool.status === 'running' && typeof tool.progress === 'number' && (
          <Typography sx={{ fontSize: '0.5rem', color: '#555' }}>{tool.progress}%</Typography>
        )}
      </Stack>
      {tool.detail && (
        <Typography sx={{ fontSize: '0.52rem', color: '#555', mt: 0.3, lineHeight: 1.3 }}>
          {tool.detail}
        </Typography>
      )}
      {tool.status === 'running' && (
        <LinearProgress
          variant={typeof tool.progress === 'number' ? 'determinate' : 'indeterminate'}
          value={tool.progress}
          sx={{ mt: 0.75, height: 2, borderRadius: 1, bgcolor: `${color}22`, '& .MuiLinearProgress-bar': { bgcolor: color } }}
        />
      )}
    </Box>
  );
}

function PlanTable({ rows }: { rows: PlanRow[] }) {
  return (
    <Box sx={{ border: '1px solid #1e1e1e', borderRadius: 1.5, overflow: 'hidden' }}>
      {rows.map((row, i) => {
        const color = row.status === 'done' ? '#13DEB9' : row.status === 'running' ? '#5D87FF' : '#444';
        return (
          <Stack key={i} direction="row" spacing={1} alignItems="center"
            sx={{
              px: 1.25, py: 0.75,
              borderBottom: i < rows.length - 1 ? '1px solid #1e1e1e' : 'none',
              bgcolor: row.status === 'running' ? 'rgba(93,135,255,0.05)' : 'transparent',
            }}
          >
            <Box sx={{
              width: 14, height: 14, borderRadius: '50%', flexShrink: 0,
              bgcolor: `${color}20`, border: `1px solid ${color}55`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {row.status === 'done'
                ? <IconCheck size={8} color={color} />
                : row.status === 'running'
                  ? <CircularProgress size={7} sx={{ color }} />
                  : <Typography sx={{ fontSize: '0.42rem', color, fontWeight: 700 }}>{i + 1}</Typography>
              }
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontSize: '0.58rem', fontWeight: 700, color }}>
                {row.step}
              </Typography>
              <Typography sx={{ fontSize: '0.52rem', color: '#555', lineHeight: 1.3 }}>
                {row.what}
              </Typography>
            </Box>
            {row.status === 'running' && (
              <CircularProgress size={9} sx={{ color: '#5D87FF', flexShrink: 0 }} />
            )}
            {row.status === 'done' && (
              <IconCheck size={9} color="#13DEB9" />
            )}
          </Stack>
        );
      })}
    </Box>
  );
}

function AgentBubble({ msg }: { msg: ChatMessage }) {
  return (
    <Stack spacing={0.875}>
      {/* Agent header */}
      <Stack direction="row" spacing={0.75} alignItems="center">
        <Box sx={{
          width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
          bgcolor: 'rgba(93,135,255,0.15)', border: '1px solid #5D87FF44',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <IconRobot size={11} color="#5D87FF" />
        </Box>
        <Typography sx={{ fontSize: '0.58rem', fontWeight: 700, color: '#5D87FF' }}>
          Agente Criativo
        </Typography>
      </Stack>

      {/* Typing animation */}
      {msg.isTyping && (
        <Box sx={{
          display: 'inline-flex', gap: 0.5, alignItems: 'center',
          bgcolor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 2,
          px: 1.25, py: 0.75, ml: 3.5,
        }}>
          {[0, 1, 2].map((i) => (
            <Box key={i} sx={{
              width: 5, height: 5, borderRadius: '50%', bgcolor: '#5D87FF',
              animation: 'bounce 1.2s infinite',
              animationDelay: `${i * 0.2}s`,
              '@keyframes bounce': {
                '0%, 80%, 100%': { transform: 'translateY(0)', opacity: 0.4 },
                '40%': { transform: 'translateY(-4px)', opacity: 1 },
              },
            }} />
          ))}
        </Box>
      )}

      {/* Text content */}
      {msg.text && !msg.isTyping && (
        <Box sx={{
          bgcolor: '#141414', border: '1px solid #222', borderRadius: 2,
          px: 1.5, py: 1.125, ml: 3.5,
        }}>
          <Typography sx={{ fontSize: '0.65rem', color: 'text.secondary', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
            {msg.text}
          </Typography>
        </Box>
      )}

      {/* Plan table */}
      {msg.plan && msg.plan.length > 0 && (
        <Box sx={{ ml: 3.5 }}>
          <Typography sx={{ fontSize: '0.5rem', color: '#444', textTransform: 'uppercase', letterSpacing: '0.07em', mb: 0.5 }}>
            Plano de execução
          </Typography>
          <PlanTable rows={msg.plan} />
        </Box>
      )}

      {/* Tool execution cards */}
      {msg.tools && msg.tools.length > 0 && (
        <Stack spacing={0.5} sx={{ ml: 3.5 }}>
          {msg.tools.map((tool) => (
            <ToolCard key={tool.id} tool={tool} />
          ))}
        </Stack>
      )}

      {/* Image result */}
      {msg.imageUrl && (
        <Box sx={{
          ml: 3.5, borderRadius: 1.5, overflow: 'hidden',
          border: '1px solid #13DEB944', maxWidth: 200,
        }}>
          <Box component="img" src={msg.imageUrl} alt="arte gerada"
            sx={{ width: '100%', display: 'block', objectFit: 'cover' }} />
        </Box>
      )}

      {/* Quick action buttons */}
      {msg.quickActions && msg.quickActions.length > 0 && (
        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ ml: 3.5 }}>
          {msg.quickActions.map((action, i) => (
            <Chip
              key={i}
              size="small"
              label={action.label}
              icon={action.icon as any}
              onClick={action.onClick}
              sx={{
                height: 22, fontSize: '0.58rem', cursor: 'pointer',
                bgcolor: 'rgba(93,135,255,0.1)',
                border: `1px solid ${action.color || '#5D87FF'}44`,
                color: action.color || '#5D87FF',
                '& .MuiChip-icon': { color: action.color || '#5D87FF', ml: '6px' },
                '& .MuiChip-label': { pr: '8px' },
                '&:hover': { bgcolor: 'rgba(93,135,255,0.18)', borderColor: action.color || '#5D87FF' },
                transition: 'all 0.15s',
              }}
            />
          ))}
        </Stack>
      )}
    </Stack>
  );
}

function UserBubble({ msg }: { msg: ChatMessage }) {
  return (
    <Stack alignItems="flex-end" spacing={0.5}>
      {msg.imageUrl && (
        <Box sx={{
          borderRadius: 1.5, overflow: 'hidden',
          border: '1px solid #5D87FF44', maxWidth: 160,
        }}>
          <Box component="img" src={msg.imageUrl} alt="referência visual"
            sx={{ width: '100%', display: 'block', objectFit: 'cover', maxHeight: 120 }} />
        </Box>
      )}
      {msg.text && (
        <Box sx={{
          bgcolor: 'rgba(93,135,255,0.12)', border: '1px solid #5D87FF33',
          borderRadius: 2, px: 1.5, py: 0.875, maxWidth: '80%',
        }}>
          <Typography sx={{ fontSize: '0.65rem', color: '#ccc', lineHeight: 1.5 }}>
            {msg.text}
          </Typography>
        </Box>
      )}
    </Stack>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function ChatAgentPanel() {
  const {
    briefing, tone, amd, funnelPhase, selectedTrigger, activeFormat,
    copyChainStep, handleGenerateCopyChain, copyChainResult,
    arteChainStep, handleGenerateArteChain, arteChainResult,
    copyOptions, selectedCopyIdx, arteImageUrl,
    briefingConfirmed, copyApproved,
    visualReferences, setVisualReferences,
  } = usePipeline();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isAgentBusy, setIsAgentBusy] = useState(false);
  const [activeMsgId, setActiveMsgId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Capability toggles — affect agent behavior
  const [capabilities, setCapabilities] = useState<Set<string>>(new Set());
  const toggleCapability = (cap: string) =>
    setCapabilities((prev) => { const s = new Set(prev); s.has(cap) ? s.delete(cap) : s.add(cap); return s; });

  // @mention system
  const mentionRegex = /(?:^|\s)@(\w*)$/;
  const mentionMatch = mentionRegex.exec(input);
  const mentionQuery = mentionMatch ? mentionMatch[1].toLowerCase() : null;
  const MENTIONS = [
    { id: 'briefing',    label: '@briefing',   desc: 'Injeta contexto do briefing atual',  color: '#7C3AED' },
    { id: 'gatilho',     label: '@gatilho',    desc: `Gatilho ativo: ${selectedTrigger || 'nenhum'}`, color: '#E85219' },
    { id: 'receita',     label: '@receita',    desc: 'Carrega receita salva',               color: '#F8A800' },
    { id: 'copy',        label: '@copy',       desc: 'Injeta copy aprovada no contexto',    color: '#13DEB9' },
    { id: 'referencia',  label: '@referencia', desc: 'Adiciona referência visual',          color: '#5D87FF' },
  ];
  const filteredMentions = mentionQuery !== null
    ? MENTIONS.filter((m) => m.id.startsWith(mentionQuery))
    : [];
  const showMentions = filteredMentions.length > 0;

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initial greeting
  useEffect(() => {
    const welcome: ChatMessage = {
      id: uid(),
      role: 'agent',
      text: briefing
        ? `Olá! Estou pronto para criar conteúdo para **${briefing.client_name || briefing.title}**.\n\nEscolha uma habilidade abaixo ou descreva o que você quer criar.`
        : 'Olá! Descreva a campanha que você quer criar ou escolha uma habilidade abaixo para começar.',
      quickActions: [],
    };
    setMessages([welcome]);
  }, [briefing?.id]);

  // ── Helpers to update message in place ──────────────────────────────────────

  const updateMsg = useCallback((id: string, patch: Partial<ChatMessage>) => {
    setMessages((prev) => prev.map((m) => m.id === id ? { ...m, ...patch } : m));
  }, []);

  const updateTool = useCallback((msgId: string, toolId: string, patch: Partial<ToolExecution>) => {
    setMessages((prev) => prev.map((m) => {
      if (m.id !== msgId) return m;
      return { ...m, tools: (m.tools || []).map((t) => t.id === toolId ? { ...t, ...patch } : t) };
    }));
  }, []);

  const updatePlanRow = useCallback((msgId: string, stepName: string, status: PlanRow['status']) => {
    setMessages((prev) => prev.map((m) => {
      if (m.id !== msgId) return m;
      return { ...m, plan: (m.plan || []).map((r) => r.step === stepName ? { ...r, status } : r) };
    }));
  }, []);

  // ── Intent handlers ──────────────────────────────────────────────────────────

  const executeCopy = useCallback(async (agentMsgId: string) => {
    // Build plan rows
    const planRows: PlanRow[] = COPY_CHAIN_STEPS.map((s, i) => ({
      step: `P${i + 1}`,
      what: s.replace(/^P\d+\s+\w+\s+—\s+/, ''),
      status: 'pending',
    }));
    updateMsg(agentMsgId, {
      text: 'Perfeito! Vou acionar o **Agente Redator** com 5 plugins especializados. Aqui está o plano:',
      plan: planRows,
      tools: [],
      isTyping: false,
    });

    // Add main tool card
    const toolId = uid();
    setMessages((prev) => prev.map((m) => m.id === agentMsgId ? {
      ...m,
      tools: [{ id: toolId, name: '🖊️ Agente Redator — 5-plugin chain', status: 'running', detail: 'Inicializando…', progress: 0 }],
    } : m));

    try {
      await handleGenerateCopyChain({});

      // Update tool to done
      updateTool(agentMsgId, toolId, { status: 'done', detail: '3 opções de copy criadas', progress: 100 });
      planRows.forEach((r) => updatePlanRow(agentMsgId, r.step, 'done'));

      const selected = copyOptions[selectedCopyIdx];
      updateMsg(agentMsgId, {
        text: `✅ **Copy gerada com sucesso!** 3 opções disponíveis no nó Copy.\n\nDestaques da opção selecionada:\n"${selected?.title || 'Ver no nó Copy'}"`,
        quickActions: [
          {
            label: 'Ficou ótimo, gerar arte ↗',
            icon: <IconPalette size={11} />,
            color: '#13DEB9',
            onClick: () => sendSkill('arte'),
          },
          {
            label: 'Gerar variação de copy ↗',
            icon: <IconRefresh size={11} />,
            color: '#5D87FF',
            onClick: () => sendSkill('copy'),
          },
          {
            label: 'Ajustar tom ↗',
            icon: <IconAdjustments size={11} />,
            color: '#F8A800',
            onClick: () => handleInput('Quero ajustar o tom da copy'),
          },
        ],
      });
    } catch {
      updateTool(agentMsgId, toolId, { status: 'error', detail: 'Erro ao gerar copy. Verifique as configurações.' });
    }
  }, [handleGenerateCopyChain, copyOptions, selectedCopyIdx, updateMsg, updateTool, updatePlanRow]);

  const executeArte = useCallback(async (agentMsgId: string, brandPack = false) => {
    const steps = brandPack ? ARTE_CHAIN_STEPS : ARTE_CHAIN_STEPS.slice(0, 5);
    const planRows: PlanRow[] = steps.map((s, i) => ({
      step: `P${i + 1}`,
      what: s.replace(/^P\d+\s+\w+\s+—\s+/, ''),
      status: 'pending',
    }));

    updateMsg(agentMsgId, {
      text: brandPack
        ? 'Vou gerar o **Brand Pack completo** — 5 formatos em paralelo usando o Agente Diretor de Arte:'
        : 'Acionando o **Agente Diretor de Arte** com 6 plugins especializados:',
      plan: planRows,
      tools: [],
      isTyping: false,
    });

    const toolId = uid();
    setMessages((prev) => prev.map((m) => m.id === agentMsgId ? {
      ...m,
      tools: [{
        id: toolId,
        name: brandPack ? '🎨 Brand Pack — 5 formatos' : '🎨 Agente Diretor de Arte — 6 plugins',
        status: 'running',
        detail: 'Analisando briefing visual…',
        progress: 0,
      }],
    } : m));

    // Animate progress
    let prog = 0;
    const ticker = setInterval(() => {
      prog = Math.min(prog + Math.random() * 8, 92);
      updateTool(agentMsgId, toolId, { progress: Math.round(prog) });
    }, 600);

    try {
      await handleGenerateArteChain({ brandPack });
      clearInterval(ticker);
      updateTool(agentMsgId, toolId, { status: 'done', detail: brandPack ? '5 formatos gerados' : 'Arte gerada com sucesso', progress: 100 });
      steps.forEach((_, i) => updatePlanRow(agentMsgId, `P${i + 1}`, 'done'));

      updateMsg(agentMsgId, {
        text: brandPack
          ? '🎉 **Brand Pack completo gerado!** Story, Feed, Portrait, LinkedIn e Banner estão prontos no nó Arte.'
          : '✅ **Arte gerada!** Você pode ver e aprovar no nó Arte.',
        imageUrl: arteImageUrl || undefined,
        quickActions: [
          {
            label: 'Ficou ótimo, aprovar ✓',
            icon: <IconCheck size={11} />,
            color: '#13DEB9',
            onClick: () => handleInput('Aprovado! Exportar agora.'),
          },
          {
            label: 'Gerar variação similar ↗',
            icon: <IconRefresh size={11} />,
            color: '#5D87FF',
            onClick: () => handleInput('Gerar uma variação da arte'),
          },
          {
            label: 'Ajustar estilo ↗',
            icon: <IconAdjustments size={11} />,
            color: '#F8A800',
            onClick: () => handleInput('Quero ajustar o estilo visual'),
          },
        ],
      });
    } catch {
      clearInterval(ticker);
      updateTool(agentMsgId, toolId, { status: 'error', detail: 'Erro ao gerar arte.' });
    }
  }, [handleGenerateArteChain, arteImageUrl, updateMsg, updateTool, updatePlanRow]);

  const executeVisualInsights = useCallback(async (agentMsgId: string) => {
    const toolId = uid();
    updateMsg(agentMsgId, {
      text: 'Buscando referências visuais reais do mercado usando Tavily…',
      tools: [{ id: toolId, name: '🔍 Visual Insights — Buscando referências', status: 'running', detail: 'Pesquisando imagens reais' }],
      isTyping: false,
    });

    try {
      const category = briefing?.payload?.segment || briefing?.title || activeFormat?.platform || 'advertising';
      const res = await fetch('/api/studio/creative/visual-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, platform: activeFormat?.platform ?? 'Instagram' }),
      });
      const data = await res.json();
      updateTool(agentMsgId, toolId, { status: 'done', detail: `${data.references?.length || 0} referências encontradas` });
      updateMsg(agentMsgId, {
        text: `✅ **${data.references?.length || 0} referências visuais** encontradas para "${category}".\n\nAcesse o nó **Boas Práticas** → Visual Insights para selecionar as referências e aplicar ao Agente de Arte.`,
        quickActions: [
          {
            label: 'Gerar arte com referências ↗',
            icon: <IconPalette size={11} />,
            color: '#5D87FF',
            onClick: () => sendSkill('arte'),
          },
        ],
      });
    } catch {
      updateTool(agentMsgId, toolId, { status: 'error', detail: 'Erro na busca.' });
    }
  }, [briefing, activeFormat, updateMsg, updateTool]);

  // ── Main dispatcher ──────────────────────────────────────────────────────────

  const handleInput = useCallback(async (text: string) => {
    if (!text.trim() || isAgentBusy) return;

    const intent = detectIntent(text);
    const userMsgId = uid();
    const agentMsgId = uid();

    setMessages((prev) => [
      ...prev,
      { id: userMsgId, role: 'user', text },
      { id: agentMsgId, role: 'agent', isTyping: true },
    ]);

    setIsAgentBusy(true);
    setActiveMsgId(agentMsgId);

    // Brief typing delay
    await new Promise((r) => setTimeout(r, 600));

    try {
      if (intent === 'copy') {
        await executeCopy(agentMsgId);
      } else if (intent === 'brand_pack') {
        await executeArte(agentMsgId, true);
      } else if (intent === 'arte') {
        await executeArte(agentMsgId, false);
      } else if (intent === 'visual_insights') {
        await executeVisualInsights(agentMsgId);
      } else if (intent === 'briefing') {
        updateMsg(agentMsgId, {
          isTyping: false,
          text: 'Para configurar o briefing via agente, use o nó **Briefing** → aba **Agente IA** e descreva sua campanha em linguagem natural. O sistema irá extrair tom, AMD, funil e gatilho automaticamente.',
          quickActions: [
            {
              label: 'Gerar copy agora ↗',
              icon: <IconTypography size={11} />,
              color: '#E85219',
              onClick: () => sendSkill('copy'),
            },
          ],
        });
      } else {
        // Unknown — show helper
        updateMsg(agentMsgId, {
          isTyping: false,
          text: `Entendi: "${text}"\n\nNão reconheci uma intenção específica. O que você gostaria de fazer?`,
          quickActions: SKILLS.map((s) => ({
            label: s.label,
            icon: s.icon,
            color: s.color,
            onClick: () => sendSkill(s.id as Intent),
          })),
        });
      }
    } finally {
      setIsAgentBusy(false);
      setActiveMsgId(null);
    }
  }, [isAgentBusy, executeCopy, executeArte, executeVisualInsights, updateMsg]);

  const sendSkill = useCallback((skillId: string) => {
    const labels: Record<string, string> = {
      copy:            'Gerar copy para este briefing',
      arte:            'Gerar arte com os parâmetros atuais',
      brand_pack:      'Gerar brand pack — todos os 5 formatos',
      visual_insights: 'Buscar referências visuais do mercado',
      briefing:        'Configurar briefing via agente',
    };
    handleInput(labels[skillId] || skillId);
  }, [handleInput]);

  const handleSend = () => {
    if (!input.trim()) return;
    handleInput(input.trim());
    setInput('');
  };

  const handleUploadFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    // Add as user message with image
    setMessages((prev) => [...prev, {
      id: uid(), role: 'user',
      text: `📎 ${file.name}`,
      imageUrl: objectUrl,
    }]);
    // Add to visual references context
    setVisualReferences([...visualReferences, objectUrl]);
    // Agent acknowledgement
    setTimeout(() => {
      setMessages((prev) => [...prev, {
        id: uid(), role: 'agent',
        text: `✅ Imagem **${file.name}** adicionada como referência visual.\n\nEla será usada pelo Agente Diretor de Arte na próxima geração.`,
        quickActions: [{
          label: 'Gerar arte com esta referência ↗',
          icon: <IconPalette size={11} />,
          color: '#5D87FF',
          onClick: () => sendSkill('arte'),
        }],
      }]);
    }, 400);
    e.target.value = '';
  };

  const selectMention = (mention: typeof MENTIONS[0]) => {
    // Replace @query in input with the full @mention + space
    setInput((prev) => prev.replace(/@\w*$/, `${mention.label} `));
  };

  // ── Pipeline step watcher — update tool progress cards in real time ──────────
  useEffect(() => {
    if (!activeMsgId || copyChainStep === 0) return;
    const stepName = COPY_CHAIN_STEPS[copyChainStep - 1];
    if (!stepName) return;
    const pIdx = copyChainStep - 1;
    updatePlanRow(activeMsgId, `P${pIdx + 1}`, 'running');
    if (pIdx > 0) updatePlanRow(activeMsgId, `P${pIdx}`, 'done');
  }, [copyChainStep, activeMsgId, updatePlanRow]);

  useEffect(() => {
    if (!activeMsgId || arteChainStep === 0) return;
    const pIdx = arteChainStep - 1;
    updatePlanRow(activeMsgId, `P${pIdx + 1}`, 'running');
    if (pIdx > 0) updatePlanRow(activeMsgId, `P${pIdx}`, 'done');
  }, [arteChainStep, activeMsgId, updatePlanRow]);

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <Box sx={{
      width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column',
      bgcolor: '#0a0a0a',
    }}>
      {/* Header */}
      <Box sx={{
        px: 2, py: 1.25,
        borderBottom: '1px solid #1a1a1a',
        background: 'linear-gradient(135deg, rgba(93,135,255,0.08) 0%, rgba(0,0,0,0) 60%)',
      }}>
        <Stack direction="row" spacing={0.75} alignItems="center">
          <Box sx={{
            width: 22, height: 22, borderRadius: '50%',
            bgcolor: 'rgba(93,135,255,0.18)', border: '1px solid #5D87FF55',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <IconRobot size={12} color="#5D87FF" />
          </Box>
          <Box>
            <Typography sx={{ fontSize: '0.68rem', fontWeight: 800, color: '#5D87FF', lineHeight: 1.2 }}>
              Agente Criativo
            </Typography>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: '#13DEB9', animation: 'pulse 2s infinite',
                '@keyframes pulse': { '0%, 100%': { opacity: 1 }, '50%': { opacity: 0.4 } } }} />
              <Typography sx={{ fontSize: '0.52rem', color: '#13DEB9' }}>online</Typography>
            </Stack>
          </Box>
          {briefing && (
            <Chip size="small" label={briefing.client_name || briefing.title}
              sx={{ ml: 'auto', height: 18, fontSize: '0.52rem', bgcolor: 'rgba(93,135,255,0.1)', color: '#5D87FF', border: 'none' }} />
          )}
        </Stack>
      </Box>

      {/* Skills row */}
      <Box sx={{ px: 1.5, py: 0.875, borderBottom: '1px solid #141414' }}>
        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
          {SKILLS.map((skill) => (
            <Chip
              key={skill.id}
              size="small"
              label={skill.label}
              icon={skill.icon as any}
              onClick={() => !isAgentBusy && sendSkill(skill.id)}
              disabled={isAgentBusy}
              sx={{
                height: 20, fontSize: '0.55rem', cursor: 'pointer',
                bgcolor: `${skill.color}12`,
                border: `1px solid ${skill.color}33`,
                color: skill.color,
                '& .MuiChip-icon': { color: skill.color, ml: '5px' },
                '& .MuiChip-label': { pr: '7px' },
                '&:hover': { bgcolor: `${skill.color}22`, borderColor: `${skill.color}66` },
                '&.Mui-disabled': { opacity: 0.4 },
                transition: 'all 0.15s',
              }}
            />
          ))}
        </Stack>
      </Box>

      {/* Message thread */}
      <Box sx={{ flex: 1, overflow: 'auto', px: 1.75, py: 1.5 }}>
        <Stack spacing={1.75}>
          {messages.map((msg) => (
            <Box key={msg.id}>
              {msg.role === 'agent'
                ? <AgentBubble msg={msg} />
                : <UserBubble msg={msg} />
              }
            </Box>
          ))}
          <div ref={bottomRef} />
        </Stack>
      </Box>

      {/* Input area */}
      <Box sx={{ px: 1.5, py: 1.25, borderTop: '1px solid #1a1a1a', bgcolor: '#0d0d0d', position: 'relative' }}>
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          title="Upload imagem como referência visual"
          aria-label="Upload imagem como referência visual"
          className="sr-only"
          onChange={handleUploadFile}
        />

        {/* @mention dropdown */}
        {showMentions && (
          <Box sx={{
            position: 'absolute', bottom: '100%', left: 12, right: 12, mb: 0.5,
            bgcolor: '#111', border: '1px solid #2a2a2a', borderRadius: 1.5,
            boxShadow: '0 -4px 20px rgba(0,0,0,0.5)', zIndex: 50, overflow: 'hidden',
          }}>
            {filteredMentions.map((m) => (
              <Stack key={m.id} direction="row" spacing={1} alignItems="center"
                onClick={() => selectMention(m)}
                sx={{
                  px: 1.25, py: 0.75, cursor: 'pointer',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.04)' },
                  borderBottom: '1px solid #1a1a1a',
                  '&:last-child': { borderBottom: 'none' },
                }}
              >
                <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, color: m.color, minWidth: 90 }}>
                  {m.label}
                </Typography>
                <Typography sx={{ fontSize: '0.55rem', color: '#555', flex: 1 }}>
                  {m.desc}
                </Typography>
              </Stack>
            ))}
          </Box>
        )}

        {isAgentBusy && (
          <Stack direction="row" spacing={0.75} alignItems="center" mb={0.75}>
            <CircularProgress size={9} sx={{ color: '#5D87FF' }} />
            <Typography sx={{ fontSize: '0.55rem', color: '#5D87FF' }}>
              Agente trabalhando…
            </Typography>
          </Stack>
        )}

        {/* Main input row */}
        <Box sx={{
          bgcolor: '#141414', border: '1px solid #2a2a2a', borderRadius: 2,
          '&:focus-within': { borderColor: '#5D87FF44' },
          transition: 'border-color 0.15s',
        }}>
          {/* Placeholder text + textarea */}
          <Stack direction="row" spacing={0.5} alignItems="flex-end" sx={{ px: 1, pt: 0.75, pb: 0.5 }}>
            {/* Upload button */}
            <IconButton
              size="small"
              onClick={() => fileInputRef.current?.click()}
              disabled={isAgentBusy}
              sx={{
                width: 28, height: 28, flexShrink: 0, mb: 0.25,
                color: '#555',
                '&:hover': { color: '#888', bgcolor: 'rgba(255,255,255,0.05)' },
                '&.Mui-disabled': { color: '#333' },
              }}
            >
              <IconPaperclip size={14} />
            </IconButton>

            <TextField
              multiline maxRows={3} fullWidth size="small"
              placeholder='Start with an idea, or type "@" to mention…'
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
                if (e.key === 'Escape') setInput((p) => p.replace(/@\w*$/, ''));
              }}
              disabled={isAgentBusy}
              variant="standard"
              sx={{
                '& .MuiInputBase-root': {
                  fontSize: '0.65rem', color: '#ccc',
                  '&:before, &:after': { display: 'none' },
                },
              }}
            />

            {/* Send button */}
            <IconButton
              size="small" onClick={handleSend}
              disabled={isAgentBusy || !input.trim()}
              sx={{
                bgcolor: input.trim() && !isAgentBusy ? '#5D87FF' : 'transparent',
                width: 28, height: 28, flexShrink: 0, mb: 0.25,
                border: input.trim() && !isAgentBusy ? 'none' : '1px solid #333',
                '&:hover': { bgcolor: '#4a6fe0' },
                '&.Mui-disabled': { bgcolor: 'transparent', border: '1px solid #222' },
                transition: 'background-color 0.15s',
              }}
            >
              <IconSend size={12} color={input.trim() && !isAgentBusy ? '#fff' : '#444'} />
            </IconButton>
          </Stack>

          {/* Capability toggles */}
          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ px: 1, pb: 0.75 }}>
            {[
              { id: 'suggest', icon: <IconBulb size={12} />,   label: 'Sugestões', color: '#F8A800' },
              { id: 'fast',    icon: <IconBolt size={12} />,   label: 'Fast',      color: '#13DEB9' },
              { id: 'web',     icon: <IconWorld size={12} />,  label: 'Web',       color: '#5D87FF' },
              { id: 'mockup',  icon: <IconBox size={12} />,    label: 'Mockup',    color: '#7C3AED' },
            ].map((cap) => {
              const active = capabilities.has(cap.id);
              return (
                <Box
                  key={cap.id}
                  onClick={() => toggleCapability(cap.id)}
                  title={cap.label}
                  sx={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 24, height: 24, borderRadius: '50%', cursor: 'pointer',
                    bgcolor: active ? `${cap.color}20` : 'transparent',
                    border: `1px solid ${active ? cap.color + '55' : '#2a2a2a'}`,
                    color: active ? cap.color : '#444',
                    transition: 'all 0.15s',
                    '&:hover': { color: cap.color, borderColor: cap.color + '44', bgcolor: cap.color + '12' },
                  }}
                >
                  {cap.icon}
                </Box>
              );
            })}
            {capabilities.size > 0 && (
              <Box onClick={() => setCapabilities(new Set())} title="Limpar modos"
                sx={{
                  display: 'flex', alignItems: 'center', cursor: 'pointer',
                  ml: 0.25, color: '#444', '&:hover': { color: '#888' },
                }}
              >
                <IconX size={10} />
              </Box>
            )}
          </Stack>
        </Box>
      </Box>
    </Box>
  );
}
