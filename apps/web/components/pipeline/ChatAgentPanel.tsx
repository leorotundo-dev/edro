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
  IconWorld, IconBox, IconX, IconDownload, IconWand, IconTrash, IconPencil,
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

type CritiqueDimension = {
  label: string;
  score: number;
  note: string | null;
};

type CritiqueData = {
  overall: number;
  passed: boolean;
  dimensions: CritiqueDimension[];
  issues?: string[];
  suggestions?: string[];
};

type MockupType = 'phone' | 'print' | 'billboard';

type ChatMessage = {
  id: string;
  role: 'user' | 'agent';
  text?: string;
  tools?: ToolExecution[];
  plan?: PlanRow[];
  quickActions?: QuickAction[];
  imageUrl?: string;
  isTyping?: boolean;
  narration?: string; // live status line updated as steps run
  critique?: CritiqueData; // visual analysis results
  mockupType?: MockupType; // framed mockup display
};

type Intent = 'copy' | 'arte' | 'brand_pack' | 'visual_insights' | 'briefing' | 'edit_variation' | 'edit_style' | 'edit_inpaint' | 'unknown';

// ── Skill chips ────────────────────────────────────────────────────────────────

const SKILLS = [
  { id: 'copy',             label: 'Gerar Copy',        icon: <IconTypography size={12} />,  color: '#E85219' },
  { id: 'arte',             label: 'Gerar Arte',         icon: <IconPalette size={12} />,      color: '#5D87FF' },
  { id: 'brand_pack',       label: 'Brand Pack',         icon: <IconPackage size={12} />,      color: '#13DEB9' },
  { id: 'edit_variation',   label: 'Variação',           icon: <IconRefresh size={12} />,      color: '#A855F7' },
  { id: 'edit_style',       label: 'Ajustar Estilo',     icon: <IconWand size={12} />,         color: '#F8A800' },
  { id: 'edit_inpaint',     label: 'Inpaint',            icon: <IconPencil size={12} />,       color: '#EC4899' },
  { id: 'visual_insights',  label: 'Referências',        icon: <IconSearch size={12} />,       color: '#F8A800' },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

function detectIntent(text: string): Intent {
  const t = text.toLowerCase();
  if (/brand.?pack|todos os formatos|pack completo|5 formatos/.test(t)) return 'brand_pack';
  if (/varia[çc]|variação|similar|outra vers|gerar.*varia/.test(t)) return 'edit_variation';
  if (/ajustar estilo|mudar estilo|outro estilo|estilo visual|ajust.*visual/.test(t)) return 'edit_style';
  if (/inpaint|remov[ao]\s|troque.*fundo|mude\s.*fundo|adicione.*imagem|retire\s|elimin[ae]|coloque\s.*fundo|editar zona|modificar área/.test(t)) return 'edit_inpaint';
  if (/arte|imagem|visual|foto|design|ilustra|criativ|gerar.*arte/.test(t)) return 'arte';
  if (/copy|texto|legenda|redator|escrev|campanha.*texto|capti/.test(t)) return 'copy';
  if (/referên|insight|buscar|pesquis|inspect/.test(t)) return 'visual_insights';
  if (/briefing|campanha|lançamento|promo|produto|objetivo|cliente/.test(t)) return 'briefing';
  return 'unknown';
}

// ── Inpaint description extractor ──────────────────────────────────────────

/** Extracts the edit description from natural language, falling back to the full text */
function extractInpaintPrompt(text: string): string | null {
  // "troque o fundo por X" / "mude o fundo para X" / "adicione X" / "remova X"
  const patterns = [
    /(?:troque?|substitu[ia])\s+.+?\s+(?:por|para)\s+(.+)/i,
    /(?:mude?|altere?)\s+.+?\s+(?:para|por)\s+(.+)/i,
    /(?:adicione?|coloque?|insira?)\s+(.+)/i,
    /(?:remova?|retire?|elimine?)\s+(.+)/i,
    /(?:modifique?|ajuste?|corrija?)\s+(.+)/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m?.[1]) return m[1].trim().replace(/[.!?]+$/, '');
  }
  // If no pattern matched but it looks like a short description, use the full text
  return text.length < 120 ? text : null;
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

// ── Session persistence ─────────────────────────────────────────────────────

type PersistedMessage = Omit<ChatMessage, 'quickActions'> & { quickActions: [] };

function serializeMessages(msgs: ChatMessage[]): string {
  // Strip quickActions (contain function refs) and transient typing states
  const safe: PersistedMessage[] = msgs
    .filter((m) => !m.isTyping)
    .map((m) => ({ ...m, quickActions: [] }));
  return JSON.stringify(safe);
}

function loadPersistedMessages(briefingId: string): ChatMessage[] | null {
  try {
    const raw = sessionStorage.getItem(`chat-agent-${briefingId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    return parsed as ChatMessage[];
  } catch {
    return null;
  }
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

const COPY_NARRATIONS: string[] = [
  'Lendo identidade de marca, voz e diretrizes do cliente…',
  'Mapeando ângulos persuasivos e apelos emocionais para o funil…',
  'Escrevendo 3 variantes de copy com abordagens distintas…',
  'Auditando alinhamento com briefing, AMD e voz da marca…',
  'Adaptando tom e formato por canal e tamanho de tela…',
];

const ARTE_NARRATIONS: string[] = [
  'Analisando briefing visual, referências e restrições criativas…',
  'Construindo o prompt de engenharia para o modelo de imagem…',
  'Definindo composição, paleta, tipografia e hierarquia visual…',
  'Gerando a arte com Flux Pro — pode levar alguns segundos…',
  'Avaliando qualidade estética, coerência e impacto da imagem…',
  'Adaptando para Story 9:16 · Feed 1:1 · LinkedIn 4:5 · Banner 16:9…',
];

// ── Sub-components ─────────────────────────────────────────────────────────────

/** Renders **bold** and newlines from agent text */
function renderMarkdown(text: string): React.ReactNode {
  return text.split('\n').map((line, i) => {
    const parts = line.split(/\*\*(.*?)\*\*/g);
    return (
      <Box key={i} component="span" sx={{ display: 'block' }}>
        {parts.map((part, j) =>
          j % 2 === 1
            ? <Box key={j} component="strong" sx={{ color: 'text.primary', fontWeight: 700 }}>{part}</Box>
            : part
        )}
      </Box>
    );
  });
}

function CritiqueCard({ data }: { data: CritiqueData }) {
  const overallColor = data.overall >= 72 ? '#13DEB9' : data.overall >= 55 ? '#F8A800' : '#EF4444';
  return (
    <Box sx={{ border: `1px solid ${overallColor}33`, borderRadius: 1.5, overflow: 'hidden' }}>
      {/* Header */}
      <Stack direction="row" spacing={1} alignItems="center"
        sx={{ px: 1.5, py: 1, bgcolor: `${overallColor}08`, borderBottom: '1px solid #1e1e1e' }}>
        <Box sx={{
          width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
          bgcolor: `${overallColor}18`, border: `2px solid ${overallColor}55`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Typography sx={{ fontSize: '0.72rem', fontWeight: 800, color: overallColor, lineHeight: 1 }}>
            {data.overall}
          </Typography>
        </Box>
        <Box>
          <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, color: overallColor }}>
            {data.passed ? '✓ Arte aprovada pelo Diretor AI' : '⚠ Arte precisa de ajuste'}
          </Typography>
          <Typography sx={{ fontSize: '0.52rem', color: '#555' }}>Score visual geral / 100</Typography>
        </Box>
      </Stack>

      {/* Dimension bars */}
      <Stack spacing={0.625} sx={{ px: 1.5, py: 1 }}>
        {data.dimensions.map((d) => {
          const c = d.score >= 72 ? '#13DEB9' : d.score >= 55 ? '#F8A800' : '#EF4444';
          return (
            <Stack key={d.label} direction="row" spacing={0.75} alignItems="center">
              <Typography sx={{ fontSize: '0.5rem', color: '#555', minWidth: 130, lineHeight: 1.3 }}>
                {d.label}
              </Typography>
              <LinearProgress variant="determinate" value={d.score}
                sx={{ flex: 1, height: 3, borderRadius: 2, bgcolor: '#1e1e1e',
                  '& .MuiLinearProgress-bar': { bgcolor: c, borderRadius: 2 } }} />
              <Typography sx={{ fontSize: '0.52rem', color: c, minWidth: 22, textAlign: 'right', fontWeight: 700 }}>
                {d.score}
              </Typography>
            </Stack>
          );
        })}
      </Stack>

      {/* Suggestions */}
      {data.suggestions && data.suggestions.length > 0 && (
        <Box sx={{ px: 1.5, pb: 1, borderTop: '1px solid #1a1a1a', pt: 0.75 }}>
          {data.suggestions.map((s, i) => (
            <Typography key={i} sx={{ fontSize: '0.55rem', color: '#666', lineHeight: 1.5 }}>
              → {s}
            </Typography>
          ))}
        </Box>
      )}
    </Box>
  );
}

function MockupFrame({ imageUrl, type }: { imageUrl: string; type: MockupType }) {
  if (type === 'phone') {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
        <Box sx={{
          position: 'relative', width: 130,
          filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.7))',
        }}>
          {/* Phone shell */}
          <Box sx={{
            position: 'absolute', inset: 0,
            border: '3px solid #2a2a2a',
            borderRadius: '18px',
            background: 'linear-gradient(145deg, #1a1a1a 0%, #111 100%)',
            zIndex: 1, pointerEvents: 'none',
          }}>
            {/* Notch */}
            <Box sx={{
              position: 'absolute', top: 7, left: '50%', transform: 'translateX(-50%)',
              width: 36, height: 6, borderRadius: 3, bgcolor: '#0a0a0a',
            }} />
            {/* Home bar */}
            <Box sx={{
              position: 'absolute', bottom: 6, left: '50%', transform: 'translateX(-50%)',
              width: 32, height: 3, borderRadius: 2, bgcolor: '#2a2a2a',
            }} />
            {/* Side button */}
            <Box sx={{
              position: 'absolute', right: -4, top: 40,
              width: 3, height: 18, borderRadius: 2, bgcolor: '#222',
            }} />
          </Box>
          {/* Screen content */}
          <Box sx={{ pt: '18px', pb: '18px', px: '3px', borderRadius: '18px', overflow: 'hidden' }}>
            <Box component="img" src={imageUrl} alt="mockup phone"
              sx={{ width: '100%', display: 'block', borderRadius: '2px', objectFit: 'cover' }} />
          </Box>
        </Box>
      </Box>
    );
  }

  if (type === 'print') {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
        <Box sx={{
          p: 1.25, bgcolor: '#f8f8f0',
          borderRadius: 0.5,
          boxShadow: '0 4px 20px rgba(0,0,0,0.5), 0 1px 4px rgba(0,0,0,0.3)',
          filter: 'drop-shadow(0 6px 16px rgba(0,0,0,0.5))',
          maxWidth: 200,
        }}>
          <Box component="img" src={imageUrl} alt="mockup print"
            sx={{ width: '100%', display: 'block', borderRadius: 0.5 }} />
          {/* Polaroid caption strip */}
          <Box sx={{ height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Box sx={{ width: 60, height: 3, bgcolor: '#e0e0d8', borderRadius: 1 }} />
          </Box>
        </Box>
      </Box>
    );
  }

  // billboard
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
      <Box sx={{ position: 'relative', maxWidth: 220, width: '100%' }}>
        <Box sx={{
          border: '4px solid #333',
          borderRadius: 1,
          overflow: 'hidden',
          boxShadow: '0 6px 24px rgba(0,0,0,0.6)',
        }}>
          <Box component="img" src={imageUrl} alt="mockup billboard"
            sx={{ width: '100%', display: 'block', objectFit: 'cover', aspectRatio: '16/9' }} />
        </Box>
        {/* Billboard legs */}
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 3, mt: 0.25 }}>
          <Box sx={{ width: 4, height: 16, bgcolor: '#333', borderRadius: 1 }} />
          <Box sx={{ width: 4, height: 16, bgcolor: '#333', borderRadius: 1 }} />
        </Box>
      </Box>
    </Box>
  );
}

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
          <Typography component="div" sx={{ fontSize: '0.65rem', color: 'text.secondary', lineHeight: 1.6 }}>
            {renderMarkdown(msg.text)}
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

      {/* Live narration line */}
      {msg.narration && (
        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ ml: 3.5 }}>
          <CircularProgress size={8} sx={{ color: '#5D87FF', flexShrink: 0 }} />
          <Typography sx={{
            fontSize: '0.57rem', color: '#5D87FF',
            fontFamily: 'monospace', lineHeight: 1.4,
            '&::after': {
              content: '"▌"',
              animation: 'blink 1s step-end infinite',
              '@keyframes blink': { '0%, 100%': { opacity: 1 }, '50%': { opacity: 0 } },
            },
          }}>
            {msg.narration}
          </Typography>
        </Stack>
      )}

      {/* Tool execution cards */}
      {msg.tools && msg.tools.length > 0 && (
        <Stack spacing={0.5} sx={{ ml: 3.5 }}>
          {msg.tools.map((tool) => (
            <ToolCard key={tool.id} tool={tool} />
          ))}
        </Stack>
      )}

      {/* Image result — plain or mockup frame */}
      {msg.imageUrl && (
        <Box sx={{ ml: 3.5 }}>
          {msg.mockupType ? (
            <MockupFrame imageUrl={msg.imageUrl} type={msg.mockupType} />
          ) : (
            <Box sx={{ position: 'relative', borderRadius: 1.5, overflow: 'hidden', border: '1px solid #13DEB944', maxWidth: 200,
              '&:hover .img-dl': { opacity: 1 } }}>
              <Box component="img" src={msg.imageUrl} alt="arte gerada"
                sx={{ width: '100%', display: 'block', objectFit: 'cover' }} />
              {/* Download overlay */}
              <Box className="img-dl" component="a" href={msg.imageUrl} download="arte-edro.jpg"
                sx={{
                  position: 'absolute', top: 6, right: 6,
                  width: 26, height: 26, borderRadius: '50%',
                  bgcolor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  opacity: 0, transition: 'opacity 0.15s', cursor: 'pointer',
                  '&:hover': { bgcolor: 'rgba(19,222,185,0.8)' },
                }}>
                <IconDownload size={12} color="#fff" />
              </Box>
            </Box>
          )}
        </Box>
      )}

      {/* Visual critique card */}
      {msg.critique && (
        <Box sx={{ ml: 3.5 }}>
          <Typography sx={{ fontSize: '0.5rem', color: '#444', textTransform: 'uppercase', letterSpacing: '0.07em', mb: 0.5 }}>
            Análise visual
          </Typography>
          <CritiqueCard data={msg.critique} />
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
    briefingConfirmed, copyApproved, copyIsStale,
    visualReferences, setVisualReferences,
  } = usePipeline();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isAgentBusy, setIsAgentBusy] = useState(false);
  const [activeMsgId, setActiveMsgId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Style Consistency — approved arte URL becomes the reference for next generations
  const [approvedStyleUrl, setApprovedStyleUrl] = useState<string | null>(null);

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

  // Initial greeting — restore from sessionStorage or show welcome
  useEffect(() => {
    if (briefing?.id) {
      const stored = loadPersistedMessages(briefing.id);
      if (stored) {
        setMessages(stored);
        return;
      }
    }
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

  // Save chat thread to sessionStorage whenever messages change
  const persistKey = briefing?.id ? `chat-agent-${briefing.id}` : null;
  useEffect(() => {
    if (!persistKey || messages.length === 0) return;
    const timer = setTimeout(() => {
      try {
        sessionStorage.setItem(persistKey, serializeMessages(messages));
      } catch { /* quota exceeded or SSR */ }
    }, 300);
    return () => clearTimeout(timer);
  }, [messages, persistKey]);

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

  // Refs — track whether we've already asked clarifying questions this session
  const hasAskedCopyClarification = useRef(false);
  const hasAskedArteClarification = useRef(false);

  // ── Intent handlers ──────────────────────────────────────────────────────────

  const executeCopy = useCallback(async (agentMsgId: string, opts?: { strategyOverride?: string }) => {
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
      await handleGenerateCopyChain(opts?.strategyOverride ? { strategyOverride: opts.strategyOverride } : {});

      // Update tool to done
      updateTool(agentMsgId, toolId, { status: 'done', detail: '3 opções de copy criadas', progress: 100 });
      planRows.forEach((r) => updatePlanRow(agentMsgId, r.step, 'done'));

      const selected = copyOptions[selectedCopyIdx];
      updateMsg(agentMsgId, {
        narration: undefined,
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
      updateMsg(agentMsgId, { narration: undefined });
      updateTool(agentMsgId, toolId, { status: 'error', detail: 'Erro ao gerar copy. Verifique as configurações.' });
    }
  }, [handleGenerateCopyChain, copyOptions, selectedCopyIdx, updateMsg, updateTool, updatePlanRow]);

  const executeArte = useCallback(async (agentMsgId: string, brandPack = false, opts?: { brandVisualOverride?: string }) => {
    const steps = brandPack ? ARTE_CHAIN_STEPS : ARTE_CHAIN_STEPS.slice(0, 5);
    const planRows: PlanRow[] = steps.map((s, i) => ({
      step: `P${i + 1}`,
      what: s.replace(/^P\d+\s+\w+\s+—\s+/, ''),
      status: 'pending',
    }));

    // Show style consistency indicator if we have an approved reference
    const styleText = approvedStyleUrl
      ? (brandPack
          ? 'Vou gerar o **Brand Pack completo** mantendo a consistência visual da arte aprovada:'
          : 'Acionando o **Agente Diretor de Arte** — mantendo estilo da arte aprovada como referência:')
      : (brandPack
          ? 'Vou gerar o **Brand Pack completo** — 5 formatos em paralelo usando o Agente Diretor de Arte:'
          : 'Acionando o **Agente Diretor de Arte** com 6 plugins especializados:');

    updateMsg(agentMsgId, {
      text: styleText,
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
      // Merge approved style reference into visual references for consistency
      const styleRefs = approvedStyleUrl
        ? [approvedStyleUrl, ...visualReferences.filter((u) => u !== approvedStyleUrl)]
        : visualReferences;
      await handleGenerateArteChain({
        brandPack,
        ...(opts?.brandVisualOverride ? { brandVisualOverride: opts.brandVisualOverride } : {}),
        ...(styleRefs.length ? { visualReferences: styleRefs } : {}),
      });
      clearInterval(ticker);
      updateTool(agentMsgId, toolId, { status: 'done', detail: brandPack ? '5 formatos gerados' : 'Arte gerada com sucesso', progress: 100 });
      steps.forEach((_, i) => updatePlanRow(agentMsgId, `P${i + 1}`, 'done'));

      const finalImageUrl = arteImageUrl || undefined;
      updateMsg(agentMsgId, {
        narration: undefined,
        text: brandPack
          ? '🎉 **Brand Pack completo gerado!** Story, Feed, Portrait, LinkedIn e Banner estão prontos no nó Arte.'
          : '✅ **Arte gerada!** Você pode ver e aprovar no nó Arte.',
        imageUrl: finalImageUrl,
        quickActions: [
          {
            label: 'Ficou ótimo, aprovar ✓',
            icon: <IconCheck size={11} />,
            color: '#13DEB9',
            onClick: () => { if (finalImageUrl) setApprovedStyleUrl(finalImageUrl); handleInput('Aprovado! Exportar agora.'); },
          },
          {
            label: '📱 Celular',
            icon: <IconPhoto size={11} />,
            color: '#7C3AED',
            onClick: () => updateMsg(agentMsgId, { mockupType: 'phone', quickActions: [] }),
          },
          {
            label: '🖨️ Print',
            icon: <IconPhoto size={11} />,
            color: '#5D87FF',
            onClick: () => updateMsg(agentMsgId, { mockupType: 'print', quickActions: [] }),
          },
          {
            label: '📺 Billboard',
            icon: <IconPhoto size={11} />,
            color: '#F8A800',
            onClick: () => updateMsg(agentMsgId, { mockupType: 'billboard', quickActions: [] }),
          },
          {
            label: 'Gerar variação ↗',
            icon: <IconRefresh size={11} />,
            color: '#555',
            onClick: () => handleInput('Gerar uma variação da arte'),
          },
        ],
      });
      // Auto-trigger visual critique after a short pause
      if (finalImageUrl && !brandPack) {
        setTimeout(() => triggerCritique(finalImageUrl), 1200);
      }
    } catch {
      clearInterval(ticker);
      updateMsg(agentMsgId, { narration: undefined });
      updateTool(agentMsgId, toolId, { status: 'error', detail: 'Erro ao gerar arte.' });
    }
  }, [handleGenerateArteChain, arteImageUrl, approvedStyleUrl, visualReferences, triggerCritique, updateMsg, updateTool, updatePlanRow]);

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

  // ── Edit Image — variation and style adjustment from chat ────────────────────

  const EDIT_MOODS = [
    { label: 'Minimalista',    color: '#5D87FF' },
    { label: 'Dramático',      color: '#EF4444' },
    { label: 'Vibrante',       color: '#F8A800' },
    { label: 'Natural',        color: '#13DEB9' },
    { label: 'Cinematográfico', color: '#A855F7' },
  ];

  const INPAINT_SUGGESTIONS = [
    { label: 'Trocar fundo',         prompt: 'troque o fundo por algo mais adequado à campanha, mantendo o sujeito principal', color: '#5D87FF' },
    { label: 'Remover elemento',     prompt: 'remova elementos desnecessários do fundo e limpe a composição',                  color: '#E85219' },
    { label: 'Ajustar iluminação',   prompt: 'melhore a iluminação e o contraste da imagem para impacto visual',               color: '#F8A800' },
    { label: 'Adicionar textura',    prompt: 'adicione textura e profundidade ao fundo para enriquecer a composição',           color: '#13DEB9' },
    { label: 'Recolorir tons',       prompt: 'recolora os tons da imagem para uma paleta mais vibrante e moderna',             color: '#A855F7' },
    { label: 'Estilo cinematográfico', prompt: 'aplique estilo cinematográfico com filme granulado e cores ricas',               color: '#EC4899' },
  ];

  const executeEditImage = useCallback(async (agentMsgId: string, mode: 'variation' | 'style' | 'inpaint', mood?: string) => {
    if (!arteImageUrl) {
      updateMsg(agentMsgId, {
        isTyping: false,
        text: 'Não há arte gerada para editar ainda. Gere uma arte primeiro.',
        quickActions: [{ label: 'Gerar arte ↗', icon: <IconPalette size={11} />, color: '#5D87FF', onClick: () => sendSkill('arte') }],
      });
      return;
    }

    // For inpaint: show current image + preset options if no description provided
    if (mode === 'inpaint' && !mood) {
      updateMsg(agentMsgId, {
        isTyping: false,
        text: 'Qual modificação você quer aplicar à arte?',
        imageUrl: arteImageUrl,
        quickActions: INPAINT_SUGGESTIONS.map((s) => ({
          label: s.label,
          icon: <IconPencil size={11} />,
          color: s.color,
          onClick: () => {
            updateMsg(agentMsgId, { quickActions: [] });
            const newId = uid();
            setMessages((prev) => [...prev,
              { id: uid(), role: 'user', text: s.label },
              { id: newId, role: 'agent', isTyping: true },
            ]);
            setIsAgentBusy(true);
            executeEditImage(newId, 'inpaint', s.prompt)
              .finally(() => { setIsAgentBusy(false); setActiveMsgId(null); });
          },
        })),
      });
      return;
    }

    // For style: ask mood if not provided
    if (mode === 'style' && !mood) {
      updateMsg(agentMsgId, {
        isTyping: false,
        text: 'Qual direção de estilo você quer aplicar?',
        quickActions: EDIT_MOODS.map((m) => ({
          label: m.label,
          icon: <IconWand size={11} />,
          color: m.color,
          onClick: () => {
            updateMsg(agentMsgId, { quickActions: [] });
            const newId = uid();
            setMessages((prev) => [...prev,
              { id: uid(), role: 'user', text: m.label },
              { id: newId, role: 'agent', isTyping: true },
            ]);
            setIsAgentBusy(true);
            executeEditImage(newId, 'style', m.label)
              .finally(() => { setIsAgentBusy(false); setActiveMsgId(null); });
          },
        })),
      });
      return;
    }

    const toolId = uid();
    const editLabel =
      mode === 'variation' ? 'variação'
      : mode === 'inpaint' ? `inpaint — ${mood?.slice(0, 30)}…`
      : mood ?? 'estilo';
    updateMsg(agentMsgId, {
      isTyping: false,
      text: mode === 'variation'
        ? 'Gerando uma variação similar mantendo a composição…'
        : mode === 'inpaint'
          ? `Aplicando edição dirigida: **${mood?.slice(0, 60)}**…`
          : `Aplicando direção **${mood}** à arte atual…`,
      tools: [{ id: toolId, name: `✏️ Edit Image — ${editLabel}`, status: 'running', detail: 'Processando com Flux…', progress: 0 }],
    });

    let prog = 0;
    const ticker = setInterval(() => {
      prog = Math.min(prog + Math.random() * 12, 90);
      updateTool(agentMsgId, toolId, { progress: Math.round(prog) });
    }, 500);

    try {
      const res = await fetch('/api/studio/creative/edit-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: arteImageUrl,
          mode,
          prompt: mood,
          aspectRatio: activeFormat?.format?.includes('9:16') ? '9:16' : activeFormat?.format?.includes('4:5') ? '4:5' : '1:1',
          strength: mode === 'variation' ? 0.7 : mode === 'inpaint' ? 0.85 : 0.4,
        }),
      });
      clearInterval(ticker);
      const data = await res.json();
      if (data.success && data.imageUrl) {
        updateTool(agentMsgId, toolId, { status: 'done', detail: 'Edição concluída', progress: 100 });
        const successText =
          mode === 'variation' ? '✅ **Variação gerada!**'
          : mode === 'inpaint' ? '✅ **Edição aplicada à arte!**'
          : `✅ **Estilo ${mood} aplicado!**`;
        updateMsg(agentMsgId, {
          text: successText,
          imageUrl: data.imageUrl,
          quickActions: [
            { label: 'Ficou ótimo, usar esta ✓', icon: <IconCheck size={11} />, color: '#13DEB9', onClick: () => { setApprovedStyleUrl(data.imageUrl); handleInput('Aprovado!'); } },
            { label: '📱 Celular', icon: <IconPhoto size={11} />, color: '#7C3AED', onClick: () => updateMsg(agentMsgId, { mockupType: 'phone', quickActions: [] }) },
            ...(mode === 'inpaint' ? [
              { label: 'Outra edição ↗', icon: <IconPencil size={11} />, color: '#EC4899', onClick: () => handleInput('Editar outra área da imagem') },
            ] : [
              { label: 'Outra variação ↗', icon: <IconRefresh size={11} />, color: '#555', onClick: () => handleInput('Gerar uma variação da arte') },
            ]),
          ],
        });
        setTimeout(() => triggerCritique(data.imageUrl), 1200);
      } else {
        clearInterval(ticker);
        updateTool(agentMsgId, toolId, { status: 'error', detail: data.error || 'Erro ao editar.' });
      }
    } catch {
      clearInterval(ticker);
      updateTool(agentMsgId, toolId, { status: 'error', detail: 'Erro ao editar a arte.' });
    }
  }, [arteImageUrl, activeFormat, approvedStyleUrl, triggerCritique, updateMsg, updateTool, setIsAgentBusy]);

  // ── Image Analyzer — auto-critique after arte generation ────────────────────

  const triggerCritique = useCallback(async (imageUrl: string) => {
    const msgId = uid();
    setMessages((prev) => [...prev, {
      id: msgId, role: 'agent', isTyping: true,
    }]);

    await new Promise((r) => setTimeout(r, 900));

    updateMsg(msgId, {
      isTyping: false,
      text: 'Analisando a qualidade visual da arte com o Diretor AI…',
    });

    try {
      const res = await fetch('/api/studio/creative/critique-arte', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_url: imageUrl,
          platform: activeFormat?.platform ?? 'Instagram',
          copy_text: copyOptions[selectedCopyIdx]?.title,
          briefing_title: briefing?.title,
          trigger: selectedTrigger,
        }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        updateMsg(msgId, { text: undefined, critique: data.data });
      } else {
        setMessages((prev) => prev.filter((m) => m.id !== msgId));
      }
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== msgId));
    }
  }, [briefing, activeFormat, copyOptions, selectedCopyIdx, selectedTrigger, updateMsg]);

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

    // Helper: spawn a new agent message and execute after clarification answer
    const proceedWithCopy = (override: string) => {
      const newMsgId = uid();
      setMessages((prev) => [...prev,
        { id: uid(), role: 'user', text: override },
        { id: newMsgId, role: 'agent', isTyping: true },
      ]);
      setIsAgentBusy(true);
      executeCopy(newMsgId, { strategyOverride: `Tom: ${override}` })
        .finally(() => { setIsAgentBusy(false); setActiveMsgId(null); });
    };

    const proceedWithArte = (visualDir: string, isBrandPack = false) => {
      const newMsgId = uid();
      setMessages((prev) => [...prev,
        { id: uid(), role: 'user', text: visualDir },
        { id: newMsgId, role: 'agent', isTyping: true },
      ]);
      setIsAgentBusy(true);
      executeArte(newMsgId, isBrandPack, { brandVisualOverride: `Estilo: ${visualDir}` })
        .finally(() => { setIsAgentBusy(false); setActiveMsgId(null); });
    };

    try {
      if (intent === 'copy') {
        // Clarifying question: ask about tone if not set and never asked before
        if (!tone && !hasAskedCopyClarification.current) {
          hasAskedCopyClarification.current = true;
          const TONES = [
            { label: 'Energético',    color: '#E85219' },
            { label: 'Formal',        color: '#5D87FF' },
            { label: 'Descontraído',  color: '#13DEB9' },
            { label: 'Urgente',       color: '#F8A800' },
          ];
          updateMsg(agentMsgId, {
            isTyping: false,
            text: 'Antes de escrever, qual é o tom que você quer para essa copy?',
            quickActions: [
              ...TONES.map((t) => ({
                label: t.label,
                icon: <IconTypography size={11} />,
                color: t.color,
                onClick: () => { updateMsg(agentMsgId, { quickActions: [] }); proceedWithCopy(t.label); },
              })),
              {
                label: 'Qualquer tom (decidir depois)',
                icon: <IconChevronRight size={11} />,
                color: '#555',
                onClick: () => { updateMsg(agentMsgId, { quickActions: [] }); executeCopy(agentMsgId); },
              },
            ],
          });
        } else {
          await executeCopy(agentMsgId);
        }
      } else if (intent === 'brand_pack') {
        // Brand pack: ask visual direction if no references and never asked
        if (!visualReferences.length && !hasAskedArteClarification.current) {
          hasAskedArteClarification.current = true;
          const DIRECTIONS = [
            { label: 'Minimalista',    color: '#5D87FF' },
            { label: 'Dramático',      color: '#EF4444' },
            { label: 'Vibrante',       color: '#F8A800' },
            { label: 'Fotorrealista',  color: '#13DEB9' },
          ];
          updateMsg(agentMsgId, {
            isTyping: false,
            text: 'Para o Brand Pack, qual direção visual você quer seguir?',
            quickActions: [
              ...DIRECTIONS.map((d) => ({
                label: d.label,
                icon: <IconPalette size={11} />,
                color: d.color,
                onClick: () => { updateMsg(agentMsgId, { quickActions: [] }); proceedWithArte(d.label, true); },
              })),
              {
                label: 'Gerar com parâmetros atuais',
                icon: <IconChevronRight size={11} />,
                color: '#555',
                onClick: () => { updateMsg(agentMsgId, { quickActions: [] }); executeArte(agentMsgId, true); },
              },
            ],
          });
        } else {
          await executeArte(agentMsgId, true);
        }
      } else if (intent === 'arte') {
        // Arte: ask visual direction if no references and never asked
        if (!visualReferences.length && !hasAskedArteClarification.current) {
          hasAskedArteClarification.current = true;
          const DIRECTIONS = [
            { label: 'Minimalista',    color: '#5D87FF' },
            { label: 'Dramático',      color: '#EF4444' },
            { label: 'Vibrante',       color: '#F8A800' },
            { label: 'Fotorrealista',  color: '#13DEB9' },
          ];
          updateMsg(agentMsgId, {
            isTyping: false,
            text: 'Qual direção visual você prefere para esta arte?',
            quickActions: [
              ...DIRECTIONS.map((d) => ({
                label: d.label,
                icon: <IconPalette size={11} />,
                color: d.color,
                onClick: () => { updateMsg(agentMsgId, { quickActions: [] }); proceedWithArte(d.label, false); },
              })),
              {
                label: 'Gerar com parâmetros atuais',
                icon: <IconChevronRight size={11} />,
                color: '#555',
                onClick: () => { updateMsg(agentMsgId, { quickActions: [] }); executeArte(agentMsgId, false); },
              },
            ],
          });
        } else {
          await executeArte(agentMsgId, false);
        }
      } else if (intent === 'edit_variation') {
        await executeEditImage(agentMsgId, 'variation');
      } else if (intent === 'edit_style') {
        await executeEditImage(agentMsgId, 'style');
      } else if (intent === 'edit_inpaint') {
        // Try to extract the edit description directly from the user's message
        const extracted = extractInpaintPrompt(text);
        await executeEditImage(agentMsgId, 'inpaint', extracted || undefined);
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
  }, [isAgentBusy, tone, visualReferences, executeCopy, executeArte, executeEditImage, executeVisualInsights, updateMsg]);

  const sendSkill = useCallback((skillId: string) => {
    const labels: Record<string, string> = {
      copy:            'Gerar copy para este briefing',
      arte:            'Gerar arte com os parâmetros atuais',
      brand_pack:      'Gerar brand pack — todos os 5 formatos',
      edit_variation:  'Gerar uma variação da arte',
      edit_style:      'Ajustar estilo visual da arte',
      edit_inpaint:    'Editar área específica da imagem',
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

  // ── Pipeline step watcher — update plan rows + live narration in real time ────
  useEffect(() => {
    if (!activeMsgId || copyChainStep === 0) return;
    const pIdx = copyChainStep - 1;
    updatePlanRow(activeMsgId, `P${pIdx + 1}`, 'running');
    if (pIdx > 0) updatePlanRow(activeMsgId, `P${pIdx}`, 'done');
    const narration = COPY_NARRATIONS[pIdx];
    if (narration) updateMsg(activeMsgId, { narration });
  }, [copyChainStep, activeMsgId, updatePlanRow, updateMsg]);

  useEffect(() => {
    if (!activeMsgId || arteChainStep === 0) return;
    const pIdx = arteChainStep - 1;
    updatePlanRow(activeMsgId, `P${pIdx + 1}`, 'running');
    if (pIdx > 0) updatePlanRow(activeMsgId, `P${pIdx}`, 'done');
    const narration = ARTE_NARRATIONS[pIdx];
    if (narration) updateMsg(activeMsgId, { narration });
  }, [arteChainStep, activeMsgId, updatePlanRow, updateMsg]);

  // ── State Watcher — proactive AI guidance when pipeline state changes ─────────

  const prevBriefingConfirmed = useRef(false);
  const prevCopyApproved = useRef(false);
  const prevArteImageUrl = useRef<string | null>(null);
  const prevCopyIsStale = useRef(false);

  // Watch: briefingConfirmed → suggest copy
  useEffect(() => {
    if (!briefingConfirmed || prevBriefingConfirmed.current || isAgentBusy) return;
    prevBriefingConfirmed.current = true;
    setTimeout(() => {
      setMessages((prev) => [...prev, {
        id: uid(), role: 'agent',
        text: `✅ Briefing confirmado!\n\nTom: **${tone || 'não definido'}** · AMD: **${amd || '—'}** · Funil: **${funnelPhase || '—'}**\n\nPronto para gerar a copy?`,
        quickActions: [
          { label: 'Gerar copy agora ↗', icon: <IconTypography size={11} />, color: '#E85219', onClick: () => sendSkill('copy') },
          { label: 'Gerar brand pack completo ↗', icon: <IconPackage size={11} />, color: '#13DEB9', onClick: () => sendSkill('brand_pack') },
        ],
      }]);
    }, 500);
  }, [briefingConfirmed]);

  // Watch: copyApproved → suggest arte
  useEffect(() => {
    if (!copyApproved || prevCopyApproved.current || isAgentBusy) return;
    prevCopyApproved.current = true;
    setTimeout(() => {
      const copy = copyOptions[selectedCopyIdx];
      setMessages((prev) => [...prev, {
        id: uid(), role: 'agent',
        text: `🎯 Copy aprovada!\n\n"${copy?.title || '—'}"\n\nQual direção visual você quer seguir para a arte?`,
        quickActions: [
          { label: 'Gerar arte agora ↗', icon: <IconPalette size={11} />, color: '#5D87FF', onClick: () => sendSkill('arte') },
          { label: 'Brand Pack — 5 formatos ↗', icon: <IconPackage size={11} />, color: '#13DEB9', onClick: () => sendSkill('brand_pack') },
          { label: 'Buscar referências visuais ↗', icon: <IconSearch size={11} />, color: '#F8A800', onClick: () => sendSkill('visual_insights') },
        ],
      }]);
    }, 500);
  }, [copyApproved]);

  // Watch: arteImageUrl → show approval loop (only for external changes, not from chat)
  useEffect(() => {
    if (!arteImageUrl || arteImageUrl === prevArteImageUrl.current || isAgentBusy) return;
    prevArteImageUrl.current = arteImageUrl;
    const capturedUrl = arteImageUrl;
    const watcherMsgId = uid();
    setTimeout(() => {
      setMessages((prev) => [...prev, {
        id: watcherMsgId, role: 'agent',
        text: 'Arte gerada! Ficou como você esperava?',
        imageUrl: capturedUrl,
        quickActions: [
          { label: 'Ficou ótimo, usar esta arte ✓', icon: <IconCheck size={11} />, color: '#13DEB9', onClick: () => { setApprovedStyleUrl(capturedUrl); handleInput('Aprovado! Vou usar esta arte.'); } },
          { label: '📱 Celular', icon: <IconPhoto size={11} />, color: '#7C3AED', onClick: () => setMessages((p) => p.map((m) => m.id === watcherMsgId ? { ...m, mockupType: 'phone' as MockupType, quickActions: [] } : m)) },
          { label: '🖨️ Print', icon: <IconPhoto size={11} />, color: '#5D87FF', onClick: () => setMessages((p) => p.map((m) => m.id === watcherMsgId ? { ...m, mockupType: 'print' as MockupType, quickActions: [] } : m)) },
          { label: 'Regenerar ↗', icon: <IconRefresh size={11} />, color: '#555', onClick: () => triggerRejectionFlow() },
        ],
      }]);
      // Auto-trigger visual critique after approval loop
      setTimeout(() => triggerCritique(capturedUrl), 1500);
    }, 400);
  }, [arteImageUrl]);

  // Watch: copyIsStale → warn user
  useEffect(() => {
    if (!copyIsStale || prevCopyIsStale.current || !copyApproved || isAgentBusy) return;
    prevCopyIsStale.current = true;
    setTimeout(() => {
      setMessages((prev) => [...prev, {
        id: uid(), role: 'agent',
        text: '⚠️ Os parâmetros do briefing foram alterados.\n\nA copy atual pode estar desatualizada. Recomendo regenerar para garantir alinhamento.',
        quickActions: [
          { label: 'Regenerar copy ↗', icon: <IconRefresh size={11} />, color: '#E85219', onClick: () => sendSkill('copy') },
          { label: 'Manter como está', icon: <IconCheck size={11} />, color: '#555', onClick: () => { prevCopyIsStale.current = false; } },
        ],
      }]);
    }, 300);
  }, [copyIsStale]);

  // Reset stale ref when copy is regenerated
  useEffect(() => {
    if (!copyIsStale) prevCopyIsStale.current = false;
  }, [copyIsStale]);

  // ── Rejection Capture — ask what was wrong before regenerating ──────────────

  const triggerRejectionFlow = useCallback(() => {
    const msgId = uid();
    const REJECTION_REASONS = [
      { label: 'Composição',    color: '#5D87FF' },
      { label: 'Cores',         color: '#E85219' },
      { label: 'Tipografia',    color: '#F8A800' },
      { label: 'Conceito geral', color: '#A855F7' },
      { label: 'Tudo diferente', color: '#EF4444' },
    ];
    setMessages((prev) => [...prev, {
      id: msgId, role: 'agent',
      text: 'O que não ficou bom? Vou usar essa informação para melhorar a próxima versão.',
      quickActions: REJECTION_REASONS.map((r) => ({
        label: r.label,
        icon: <IconRefresh size={11} />,
        color: r.color,
        onClick: () => {
          // Replace quick actions with "processing" state
          updateMsg(msgId, { quickActions: [] });
          handleInput(`Regenerar arte — o problema foi: ${r.label.toLowerCase()}. Ajuste este aspecto na próxima versão.`);
        },
      })),
    }]);
  }, [updateMsg, handleInput]);

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
          {/* Clear chat history */}
          <IconButton
            size="small"
            title="Limpar histórico do chat"
            onClick={() => {
              if (persistKey) sessionStorage.removeItem(persistKey);
              const welcome: ChatMessage = {
                id: uid(), role: 'agent',
                text: briefing
                  ? `Conversa reiniciada. Pronto para criar conteúdo para **${briefing.client_name || briefing.title}**.`
                  : 'Conversa reiniciada. Como posso ajudar?',
                quickActions: [],
              };
              setMessages([welcome]);
            }}
            sx={{
              ml: briefing ? 0.5 : 'auto',
              width: 22, height: 22,
              color: '#444',
              '&:hover': { color: '#EF4444', bgcolor: 'rgba(239,68,68,0.08)' },
            }}
          >
            <IconTrash size={11} />
          </IconButton>
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

        {/* Style consistency badge */}
        {approvedStyleUrl && !isAgentBusy && (
          <Stack direction="row" spacing={0.75} alignItems="center" mb={0.75}
            sx={{ bgcolor: 'rgba(19,222,185,0.06)', border: '1px solid #13DEB922', borderRadius: 1.5, px: 1, py: 0.5 }}>
            <Box sx={{
              width: 20, height: 20, borderRadius: 0.75, overflow: 'hidden', flexShrink: 0,
              border: '1px solid #13DEB944',
            }}>
              <Box component="img" src={approvedStyleUrl} alt="estilo aprovado"
                sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            </Box>
            <Typography sx={{ fontSize: '0.53rem', color: '#13DEB9', flex: 1, lineHeight: 1.3 }}>
              Estilo consistente ativo — próximas artes seguirão esta referência
            </Typography>
            <Box onClick={() => setApprovedStyleUrl(null)} title="Remover referência"
              sx={{ cursor: 'pointer', color: '#555', '&:hover': { color: '#888' }, display: 'flex' }}>
              <IconX size={10} />
            </Box>
          </Stack>
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
