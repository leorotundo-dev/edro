'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  ReactFlow, ReactFlowProvider, Background, MiniMap, Controls,
  useNodesState, useEdgesState, useReactFlow, type Node, type Edge,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { IconRobot, IconEye, IconMessage, IconCheck, IconCircleCheck, IconCircleX } from '@tabler/icons-react';

import {
  PipelineContext,
  type PipelineContextValue,
  type ParsedOption,
  type ArtDirectorLayout,
  type PipelineBriefing,
  type PipelineFormat,
  type NodeStatusMap,
  type FunnelPhase,
  type PipelineOcasiao,
  type CopyChainResult,
  type CopyChainParams,
  type ArteChainResult,
  type ArteChainParams,
} from '@/components/pipeline/PipelineContext';
import NodeShell from '@/components/pipeline/NodeShell';
import PipelineEdge from '@/components/pipeline/PipelineEdge';
import OcasiaoNode from '@/components/pipeline/nodes/OcasiaoNode';
import BriefingNode from '@/components/pipeline/nodes/BriefingNode';
import CopyNode from '@/components/pipeline/nodes/CopyNode';
import TriggerNode from '@/components/pipeline/nodes/TriggerNode';
import ArteNode from '@/components/pipeline/nodes/ArteNode';
import ExportNode from '@/components/pipeline/nodes/ExportNode';
import ClientDNANode from '@/components/pipeline/nodes/ClientDNANode';
import LearningRulesNode from '@/components/pipeline/nodes/LearningRulesNode';
import FormatHintsNode from '@/components/pipeline/nodes/FormatHintsNode';
import PersonasNode from '@/components/pipeline/nodes/PersonasNode';
import BrandVoiceNode from '@/components/pipeline/nodes/BrandVoiceNode';
import PromptDNANode from '@/components/pipeline/nodes/PromptDNANode';
import CriticaNode from '@/components/pipeline/nodes/CriticaNode';
import MultiFormatNode from '@/components/pipeline/nodes/MultiFormatNode';
import ABTestNode from '@/components/pipeline/nodes/ABTestNode';
import VideoScriptNode from '@/components/pipeline/nodes/VideoScriptNode';
import ApprovalNode from '@/components/pipeline/nodes/ApprovalNode';
import ScheduleNode from '@/components/pipeline/nodes/ScheduleNode';
import PerformanceNode from '@/components/pipeline/nodes/PerformanceNode';
import LearningFeedbackNode from '@/components/pipeline/nodes/LearningFeedbackNode';
import CompareNode from '@/components/pipeline/nodes/CompareNode';
import NoteNode from '@/components/pipeline/nodes/NoteNode';
import PreviewPanel from '@/components/pipeline/PreviewPanel';
import ChatAgentPanel from '@/components/pipeline/ChatAgentPanel';
import CanvasToolbar from '@/components/pipeline/CanvasToolbar';
import { apiGet, apiPost, apiPatch } from '@/lib/api';
import {
  addStudioCreativeAsset,
  addStudioCreativeVersion,
  loadStudioCreativeSession,
  openStudioCreativeSession,
  resolveStudioWorkflowContext,
  updateStudioCreativeMetadata,
  type CreativePipelineMetadata,
  type CreativeStage,
  type CreativeSessionContextDto,
  updateStudioCreativeStage,
} from '../../studioWorkflow';

// ── Types ─────────────────────────────────────────────────────────────────────

type CopyVersion = {
  id: string;
  output: string;
  model?: string | null;
  payload?: Record<string, any> | null;
};

function stripMd(text: string) {
  return text.replace(/[*_`#~]/g, '').trim();
}

function parseChunk(chunk: string): ParsedOption {
  const lines = chunk.split('\n').filter(Boolean);
  const fields: Record<string, string> = {};
  let inBody = false;

  for (const rawLine of lines) {
    const line = stripMd(rawLine);
    const titleM   = line.match(/^(?:t[ií]tulo|title|headline|arte\s*[-–]\s*t[ií]tulo)\s*[:\-]\s*(.+)/i);
    const bodyM    = line.match(/^(?:corpo|body|texto|arte\s*[-–]\s*corpo)\s*[:\-]\s*(.*)/i);
    const ctaM     = line.match(/^cta\s*[:\-]\s*(.+)/i);
    const legendaM = line.match(/^legenda\s*[:\-]\s*(.*)/i);
    if (titleM && !fields.title)  { fields.title = stripMd(titleM[1]); inBody = false; continue; }
    if (bodyM)                    { fields.body = stripMd(bodyM[1]); inBody = true; continue; }
    if (ctaM && !fields.cta)      { fields.cta = stripMd(ctaM[1]); inBody = false; continue; }
    if (legendaM)                 { fields.legenda = stripMd(legendaM[1] ?? ''); inBody = false; continue; }
    // Continuation line for body
    if (inBody && fields.body !== undefined) fields.body += ' ' + line;
  }

  if (!fields.title) fields.title = stripMd(lines[0] || '');
  return {
    title:    fields.title || '',
    body:     fields.body?.trim() || '',
    cta:      fields.cta || '',
    legenda:  fields.legenda || '',
    hashtags: '',
    raw:      chunk,
  };
}

function parseOptions(text: string): ParsedOption[] {
  if (!text) return [];
  // Split by OPCAO N: / OPÇÃO N: header — always use structured field parser per chunk
  const chunks = text
    .split(/\n?(?:OPCA[OÃo]\s*\d+\s*[:\-]?\s*)/i)
    .map((c) => c.trim())
    .filter(Boolean);
  return chunks.map(parseChunk);
}

// ── Node types registration ───────────────────────────────────────────────────

const nodeTypes = {
  ocasiao:          OcasiaoNode,
  briefing:         BriefingNode,
  copy:             CopyNode,
  trigger:          TriggerNode,
  arte:             ArteNode,
  export:           ExportNode,
  clientDNA:        ClientDNANode,
  learningRules:    LearningRulesNode,
  formatHints:      FormatHintsNode,
  personasDNA:      PersonasNode,
  brandVoice:       BrandVoiceNode,
  promptDNA:        PromptDNANode,
  critica:          CriticaNode,
  multiFormat:      MultiFormatNode,
  abTest:           ABTestNode,
  videoScript:      VideoScriptNode,
  note:             NoteNode,
  approval:         ApprovalNode,
  schedule:         ScheduleNode,
  performance:      PerformanceNode,
  learningFeedback: LearningFeedbackNode,
  compare:          CompareNode,
};

const edgeTypes = {
  pipeline: PipelineEdge,
};

// ── Initial layout ────────────────────────────────────────────────────────────

// Only briefing shown at start — copy appears after user confirms briefing
function buildInitialNodes(): Node[] {
  return [
    { id: 'briefing',  type: 'briefing',  position: { x: 40,  y: 160 }, data: {} },
    { id: 'clientDNA', type: 'clientDNA', position: { x: 40,  y: 440 }, data: {} },
  ];
}

// Optional node positions for AddNodePanel injection
// Layout — 3 camadas (Gemini architecture):
//   CAMADA 1 — CRIAÇÃO      (y: 160)   Briefing→Trigger→Copy→Arte→Export
//   CAMADA 1.5 — CONTEXTO   (y: 440-860) ClientDNA, LearningRules, BrandVoice...
//   CAMADA 2 — QA + DISTRIB (y: 560-760) Crítica, Approval, Schedule, MultiFormat
//   CAMADA 3 — ANALYTICS    (y: 980)   Performance, LearningFeedback
const OPTIONAL_NODE_POSITIONS: Record<string, { x: number; y: number }> = {
  critica:          { x: 1120, y: 360 },
  compare:          { x: 1120, y: 560 },
  multiFormat:      { x: 1440, y: 400 },
  abTest:           { x: 1120, y: 580 },
  videoScript:      { x: 1440, y: 580 },
  approval:         { x: 200,  y: 760 },
  schedule:         { x: 580,  y: 760 },
  performance:      { x: 200,  y: 980 },
  learningFeedback: { x: 600,  y: 980 },
};

function buildEdges(ns: NodeStatusMap, existingNodeIds: Set<string>): Edge[] {
  const edgeStatus = (from: keyof NodeStatusMap, to: keyof NodeStatusMap) => {
    if (ns[from] === 'done' && (ns[to] === 'active' || ns[to] === 'running')) return 'active';
    if (ns[from] === 'done' && ns[to] === 'done') return 'done';
    return 'locked';
  };

  const exportStatus: 'done' | 'active' | 'locked' = ns.export === 'done' ? 'done' : ns.export === 'active' ? 'active' : 'locked';

  const edges: Edge[] = [];

  // Briefing → Trigger (always when trigger exists)
  if (existingNodeIds.has('trigger')) {
    edges.push({ id: 'e-briefing-trigger', source: 'briefing', target: 'trigger', type: 'pipeline',
      data: { status: edgeStatus('briefing', 'trigger') } });
  }
  // Trigger → Copy + context nodes (copy appears after trigger confirmed)
  if (existingNodeIds.has('copy')) {
    edges.push({ id: 'e-trigger-copy', source: 'trigger', target: 'copy', type: 'pipeline',
      data: { status: edgeStatus('trigger', 'copy') } });
    if (existingNodeIds.has('clientDNA')) {
      edges.push({ id: 'e-dna-copy', source: 'clientDNA', target: 'copy', type: 'pipeline', data: { status: 'done' }, animated: false });
    }
    if (existingNodeIds.has('learningRules')) {
      edges.push({ id: 'e-rules-copy', source: 'learningRules', target: 'copy', type: 'pipeline', data: { status: 'done', accentColor: '#5D87FF' } });
    }
    if (existingNodeIds.has('formatHints')) {
      edges.push({ id: 'e-hints-copy', source: 'formatHints', target: 'copy', type: 'pipeline', data: { status: 'done', accentColor: '#F8A800' } });
    }
    // Armário de Ingredientes — dashed context feeds
    if (existingNodeIds.has('personasDNA')) {
      edges.push({ id: 'e-personas-copy', source: 'personasDNA', target: 'copy', type: 'pipeline', data: { status: 'done', accentColor: '#A855F7' }, style: { strokeDasharray: '5 3' } });
    }
    if (existingNodeIds.has('brandVoice')) {
      edges.push({ id: 'e-voice-copy', source: 'brandVoice', target: 'copy', type: 'pipeline', data: { status: 'done', accentColor: '#EC4899' }, style: { strokeDasharray: '5 3' } });
    }
    if (existingNodeIds.has('promptDNA')) {
      edges.push({ id: 'e-prompt-copy', source: 'promptDNA', target: 'copy', type: 'pipeline', data: { status: 'done', accentColor: '#22D3EE' }, style: { strokeDasharray: '5 3' } });
    }
  }
  // CompareNode — branches off arte (parallel QA)
  if (existingNodeIds.has('compare')) {
    edges.push({ id: 'e-arte-compare', source: 'arte', target: 'compare', type: 'pipeline',
      data: { status: ns.arte === 'done' ? 'active' : 'locked', accentColor: '#F59E0B' },
      style: { strokeDasharray: '6 3' } });
  }
  // Agente Crítico (optional QA node — branches off copy)
  if (existingNodeIds.has('critica')) {
    edges.push({ id: 'e-copy-critica', source: 'copy', target: 'critica', type: 'pipeline',
      data: { status: ns.copy === 'done' ? 'active' : 'locked', accentColor: '#EF4444' },
      style: { strokeDasharray: '6 3' } });
  }
  if (existingNodeIds.has('arte')) {
    edges.push({ id: 'e-copy-arte', source: 'copy', target: 'arte', type: 'pipeline', data: { status: edgeStatus('copy', 'arte') } });
  }
  if (existingNodeIds.has('export')) {
    edges.push({ id: 'e-arte-export', source: 'arte', target: 'export', type: 'pipeline', data: { status: ns.arte === 'done' ? 'done' : exportStatus } });
  }
  // Optional variant nodes (branch from copy)
  for (const id of ['multiFormat', 'abTest', 'videoScript'] as const) {
    if (existingNodeIds.has(id)) {
      edges.push({ id: `e-copy-${id}`, source: 'copy', target: id, type: 'pipeline',
        data: { status: ns.copy === 'done' ? 'active' : 'locked', accentColor: id === 'videoScript' ? '#A855F7' : '#F97316' } });
    }
  }
  // Distribution layer
  if (existingNodeIds.has('approval')) {
    edges.push({ id: 'e-export-approval', source: 'export', target: 'approval', type: 'pipeline',
      data: { status: exportStatus, accentColor: '#7C3AED' } });
  }
  if (existingNodeIds.has('schedule')) {
    const src = existingNodeIds.has('approval') ? 'approval' : 'export';
    edges.push({ id: 'e-to-schedule', source: src, target: 'schedule', type: 'pipeline',
      data: { status: exportStatus, accentColor: '#7C3AED' } });
  }
  // Analytics layer
  if (existingNodeIds.has('performance')) {
    const src = existingNodeIds.has('schedule') ? 'schedule' : existingNodeIds.has('approval') ? 'approval' : 'export';
    edges.push({ id: 'e-to-performance', source: src, target: 'performance', type: 'pipeline',
      data: { status: exportStatus, accentColor: '#0EA5E9' } });
  }
  if (existingNodeIds.has('learningFeedback')) {
    const src = existingNodeIds.has('performance') ? 'performance' : 'export';
    edges.push({ id: 'e-to-feedback', source: src, target: 'learningFeedback', type: 'pipeline',
      data: { status: exportStatus, accentColor: '#0EA5E9' } });
    // Pink loop-back edge from learningFeedback → briefing
    edges.push({ id: 'e-feedback-loop', source: 'learningFeedback', target: 'briefing', type: 'pipeline',
      data: { status: 'active', accentColor: '#EC4899' }, style: { strokeDasharray: '8 4' } });
  }
  return edges;
}

const CREATIVE_STAGE_ORDER: CreativeStage[] = [
  'briefing',
  'copy',
  'arte',
  'refino_canvas',
  'revisao',
  'aprovacao',
  'exportacao',
];

function isCreativeStageAtLeast(current: CreativeStage | null | undefined, target: CreativeStage) {
  if (!current) return false;
  return CREATIVE_STAGE_ORDER.indexOf(current) >= CREATIVE_STAGE_ORDER.indexOf(target);
}

function normalizePipelineMetadata(value: CreativePipelineMetadata | null | undefined) {
  return JSON.stringify({
    selectedTrigger: value?.selectedTrigger || null,
    tone: value?.tone || '',
    amd: value?.amd || '',
    funnelPhase: value?.funnelPhase || 'awareness',
    targetPlatforms: Array.isArray(value?.targetPlatforms) ? [...value!.targetPlatforms!] : [],
    activeFormat: value?.activeFormat || null,
  });
}

// ── Main component ────────────────────────────────────────────────────────────

interface PipelineStudioProps {
  briefingId: string;
}

// ── Comments panel — client collaboration comments ─────────────────────────────

type PipelineComment = {
  id: string;
  section: 'copy' | 'arte' | 'approval' | 'general';
  author_type: 'agency' | 'client';
  author_name: string;
  body: string;
  resolved: boolean;
  created_at: string;
};

type ClientApproval = {
  id: string;
  section: string;
  decision: 'approved' | 'rejected';
  feedback: string | null;
  created_at: string;
};

const SECTION_LABELS: Record<string, string> = {
  copy: 'Copy', arte: 'Arte', approval: 'Aprovação', general: 'Geral',
};

function CommentsPanel({ briefingId }: { briefingId: string }) {
  const [comments, setComments] = useState<PipelineComment[]>([]);
  const [approvals, setApprovals] = useState<ClientApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [resolving, setResolving] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [commRes, apprRes] = await Promise.all([
        apiGet<{ comments: PipelineComment[] }>(`/studio/pipeline/${briefingId}/comments`),
        apiGet<{ approvals: ClientApproval[] }>(`/studio/pipeline/${briefingId}/client-approvals`),
      ]);
      setComments(commRes.comments || []);
      setApprovals(apprRes.approvals || []);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, [briefingId]);

  useEffect(() => { load(); }, [load]);

  const sendReply = async () => {
    if (!replyText.trim()) return;
    setSending(true);
    try {
      await apiPost(`/studio/pipeline/${briefingId}/comments`, {
        section: 'general',
        author_type: 'agency',
        body: replyText.trim(),
      });
      setReplyText('');
      load();
    } catch { /* ignore */ } finally {
      setSending(false);
    }
  };

  const resolveComment = async (commentId: string) => {
    setResolving(commentId);
    try {
      await apiPatch(`/studio/pipeline/${briefingId}/comments/${commentId}/resolve`, {});
      setComments((prev) => prev.map((c) => c.id === commentId ? { ...c, resolved: true } : c));
    } catch { /* ignore */ } finally {
      setResolving(null);
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography sx={{ fontSize: '0.75rem', color: '#666' }}>Carregando…</Typography>
      </Box>
    );
  }

  const unresolvedComments = comments.filter((c) => !c.resolved);
  const resolvedComments   = comments.filter((c) => c.resolved);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Approvals section */}
      {approvals.length > 0 && (
        <Box sx={{ p: 1.5, borderBottom: '1px solid #1a1a1a' }}>
          <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, color: '#888', mb: 1, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Decisões do Cliente
          </Typography>
          <Stack spacing={0.75}>
            {approvals.map((a) => (
              <Stack key={a.id} direction="row" spacing={1} alignItems="flex-start">
                {a.decision === 'approved'
                  ? <IconCircleCheck size={14} color="#13DEB9" style={{ flexShrink: 0, marginTop: 1 }} />
                  : <IconCircleX    size={14} color="#FF4D4D" style={{ flexShrink: 0, marginTop: 1 }} />
                }
                <Box>
                  <Typography sx={{ fontSize: '0.7rem', color: a.decision === 'approved' ? '#13DEB9' : '#FF4D4D', fontWeight: 700 }}>
                    {SECTION_LABELS[a.section] || a.section} — {a.decision === 'approved' ? 'Aprovado' : 'Revisão solicitada'}
                  </Typography>
                  {a.feedback && (
                    <Typography sx={{ fontSize: '0.68rem', color: '#aaa', mt: 0.25 }}>{a.feedback}</Typography>
                  )}
                </Box>
              </Stack>
            ))}
          </Stack>
        </Box>
      )}

      {/* Comments list */}
      <Box sx={{ flex: 1, overflowY: 'auto', p: 1.5 }}>
        {unresolvedComments.length === 0 && resolvedComments.length === 0 ? (
          <Typography sx={{ fontSize: '0.72rem', color: '#555', textAlign: 'center', mt: 3 }}>
            Nenhum comentário ainda.
          </Typography>
        ) : (
          <Stack spacing={1}>
            {unresolvedComments.map((c) => (
              <Box key={c.id} sx={{
                p: 1.25, borderRadius: 1.5,
                bgcolor: c.author_type === 'client' ? 'rgba(168,85,247,0.08)' : 'rgba(93,135,255,0.06)',
                border: '1px solid',
                borderColor: c.author_type === 'client' ? '#A855F733' : '#5D87FF22',
              }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                  <Stack direction="row" spacing={0.75} alignItems="center">
                    <Box sx={{
                      width: 18, height: 18, borderRadius: '50%', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', fontSize: '0.55rem', fontWeight: 700,
                      bgcolor: c.author_type === 'client' ? '#A855F7' : '#5D87FF', color: '#fff',
                    }}>
                      {c.author_name[0]?.toUpperCase()}
                    </Box>
                    <Typography sx={{ fontSize: '0.68rem', fontWeight: 600, color: c.author_type === 'client' ? '#A855F7' : '#5D87FF' }}>
                      {c.author_name}
                    </Typography>
                    <Typography sx={{ fontSize: '0.58rem', color: '#555' }}>
                      {SECTION_LABELS[c.section]}
                    </Typography>
                  </Stack>
                  {c.author_type === 'client' && (
                    <Box
                      onClick={() => resolveComment(c.id)}
                      sx={{ cursor: 'pointer', color: resolving === c.id ? '#555' : '#13DEB9', '&:hover': { opacity: 0.8 } }}
                    >
                      <IconCheck size={12} />
                    </Box>
                  )}
                </Stack>
                <Typography sx={{ fontSize: '0.72rem', color: '#ccc', lineHeight: 1.5 }}>{c.body}</Typography>
                <Typography sx={{ fontSize: '0.58rem', color: '#444', mt: 0.5 }}>
                  {new Date(c.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </Typography>
              </Box>
            ))}
            {resolvedComments.length > 0 && (
              <Typography sx={{ fontSize: '0.6rem', color: '#444', mt: 0.5 }}>
                + {resolvedComments.length} resolvido{resolvedComments.length > 1 ? 's' : ''}
              </Typography>
            )}
          </Stack>
        )}
      </Box>

      {/* Reply input */}
      <Box sx={{ p: 1.25, borderTop: '1px solid #1a1a1a', flexShrink: 0 }}>
        <Stack direction="row" spacing={0.75} alignItems="flex-end">
          <Box
            component="textarea"
            value={replyText}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setReplyText(e.target.value)}
            onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(); }
            }}
            placeholder="Responder ao cliente…"
            rows={2}
            sx={{
              flex: 1, resize: 'none', bgcolor: '#111', border: '1px solid #2a2a2a', borderRadius: 1,
              color: '#e0e0e0', fontSize: '0.72rem', p: 0.875, outline: 'none', fontFamily: 'inherit',
              '&:focus': { borderColor: '#A855F744' },
            }}
          />
          <Box
            onClick={sendReply}
            sx={{
              cursor: sending ? 'default' : 'pointer', bgcolor: '#A855F7', color: '#fff',
              borderRadius: 1, px: 1, py: 0.75, fontSize: '0.65rem', fontWeight: 700,
              opacity: sending ? 0.5 : 1, whiteSpace: 'nowrap', userSelect: 'none',
              '&:hover': { bgcolor: sending ? '#A855F7' : '#9333ea' },
            }}
          >
            {sending ? '…' : 'Enviar'}
          </Box>
        </Stack>
        <Typography sx={{ fontSize: '0.58rem', color: '#444', mt: 0.5 }}>Enter para enviar · Shift+Enter nova linha</Typography>
      </Box>
    </Box>
  );
}

// ── Right panel — tab switcher between Chat Agent and Live Preview ─────────────

function RightPanel({ briefingId }: { briefingId: string }) {
  const [activeTab, setActiveTab] = useState<'agent' | 'preview' | 'comments'>('agent');

  return (
    <Box sx={{ flex: '0 0 38%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Tab bar */}
      <Stack direction="row" sx={{ borderBottom: '1px solid #1a1a1a', bgcolor: '#0a0a0a', flexShrink: 0 }}>
        {[
          { id: 'agent',    label: 'Agente IA',    icon: <IconRobot   size={12} />, color: '#5D87FF' },
          { id: 'preview',  label: 'Preview',      icon: <IconEye     size={12} />, color: '#13DEB9' },
          { id: 'comments', label: 'Comentários',  icon: <IconMessage size={12} />, color: '#A855F7' },
        ].map((tab) => {
          const active = activeTab === tab.id;
          return (
            <Box
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'agent' | 'preview' | 'comments')}
              sx={{
                flex: 1, py: 0.875, px: 1.5, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.625,
                borderBottom: active ? `2px solid ${tab.color}` : '2px solid transparent',
                bgcolor: active ? `${tab.color}08` : 'transparent',
                transition: 'all 0.15s',
                '&:hover': { bgcolor: `${tab.color}0c` },
              }}
            >
              <Box sx={{ color: active ? tab.color : '#444', display: 'flex', alignItems: 'center' }}>
                {tab.icon}
              </Box>
              <Typography sx={{
                fontSize: '0.62rem', fontWeight: active ? 700 : 400,
                color: active ? tab.color : '#555',
              }}>
                {tab.label}
              </Typography>
            </Box>
          );
        })}
      </Stack>

      {/* Panel content */}
      <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {activeTab === 'agent'    ? <ChatAgentPanel /> :
         activeTab === 'preview'  ? <PreviewPanel />   :
         <CommentsPanel briefingId={briefingId} />}
      </Box>
    </Box>
  );
}

// ── Pipeline studio inner ──────────────────────────────────────────────────────

function PipelineStudioInner({ briefingId }: PipelineStudioProps) {
  // ── Core state ──────────────────────────────────────────────────────────────
  const searchParams = useSearchParams();
  const workflowContext = useMemo(() => resolveStudioWorkflowContext(searchParams), [searchParams]);
  const isWorkflowDriven = Boolean(workflowContext.jobId);
  const [sessionId, setSessionId] = useState(workflowContext.sessionId);
  const [creativeContext, setCreativeContext] = useState<CreativeSessionContextDto | null>(null);
  const [workflowStageOverride, setWorkflowStageOverride] = useState<CreativeStage | null>(null);
  const [interactionMode, setInteractionMode] = useState<'select' | 'hand' | 'draw'>('select');
  const [briefing, setBriefing] = useState<PipelineBriefing | null>(null);
  const [activeFormat, setActiveFormat] = useState<PipelineFormat | null>(null);
  const [clientBrandColor, setClientBrandColor] = useState('#F5C518');

  // Copy
  const [copyGenerating, setCopyGenerating] = useState(false);
  const [copyOptions, setCopyOptions] = useState<ParsedOption[]>([]);
  const [selectedCopyIdx, setSelectedCopyIdx] = useState(0);
  const [copyApproved, setCopyApproved] = useState(false);
  const [copyVersionId, setCopyVersionId] = useState<string | null>(null);
  const [copyError, setCopyError] = useState('');

  // Agente Redator chain
  const [copyChainResult, setCopyChainResult] = useState<CopyChainResult | null>(null);
  const [copyChainStep, setCopyChainStep] = useState(0);

  // Agente Diretor de Arte chain
  const [arteChainResult, setArteChainResult] = useState<ArteChainResult | null>(null);
  const [arteChainStep, setArteChainStep] = useState(0);

  // Visual Insights — reference URLs selected by user in FormatHintsNode
  const [visualReferences, setVisualReferences] = useState<string[]>([]);

  // Trigger
  const [selectedTrigger, setSelectedTrigger] = useState<string | null>(null);
  const [triggerConfirmed, setTriggerConfirmed] = useState(false);

  // Arte
  const [arteGenerating, setArteGenerating] = useState(false);
  const [artDirLayout, setArtDirLayout] = useState<ArtDirectorLayout | null>(null);
  const [arteImageUrl, setArteImageUrl] = useState<string | null>(null);
  const [arteImageUrls, setArteImageUrls] = useState<string[]>([]);
  const [selectedArteIdx, setSelectedArteIdx] = useState(0);
  const [arteApproved, setArteApproved] = useState(false);
  const [arteError, setArteError] = useState('');

  // Briefing confirmation
  const [briefingConfirmed, setBriefingConfirmed] = useState(false);

  // Creative settings
  const [tone, setTone] = useState('');
  const [amd, setAmd] = useState('');

  // Target platforms — selected in CopyNode for the Otimizador de Canal step
  const [targetPlatforms, setTargetPlatforms] = useState<string[]>(['Instagram']);

  // Funnel phase
  const [funnelPhase, setFunnelPhase] = useState<FunnelPhase>('awareness');

  // Ocasiao (Momento Zero)
  const [ocasiao, setOcasiao] = useState<PipelineOcasiao | null>(null);
  const [ocasiaoConfirmed, setOcasiaoConfirmed] = useState(false);

  // Stale tracking — copy needs regen when key params changed after copy was generated
  const [copyGeneratedWith, setCopyGeneratedWith] = useState<{ trigger: string | null; tone: string; amd: string } | null>(null);

  // Director
  const [directorInsights, setDirectorInsights] = useState<any[]>([]);
  const [directorAnalyzing, setDirectorAnalyzing] = useState(false);

  // Chef recommendations — one per step
  const [recommendations, setRecommendations] = useState<Record<string, { text: string; confidence: 'high' | 'medium' | 'low' } | undefined>>({});
  const [triggerRanking, setTriggerRanking] = useState<{ id: string; score: number; reason: string }[]>([]);

  // Recipes
  const [suggestedRecipes, setSuggestedRecipes] = useState<any[]>([]);

  // Learning rules count — loaded on mount so BriefingNode can show it
  const [learningRulesCount, setLearningRulesCount] = useState<number | null>(null);

  // Full client profile — loaded on mount, injected into ingredient nodes
  const [clientProfile, setClientProfile] = useState<Record<string, any>>({});
  const hydratedWorkflowMetadataRef = useRef('');
  const persistedWorkflowMetadataRef = useRef('');

  useEffect(() => {
    if (workflowContext.sessionId) {
      setSessionId(workflowContext.sessionId);
    }
  }, [workflowContext.sessionId]);

  const effectiveCreativeStage = useMemo<CreativeStage | null>(() => {
    if (!isWorkflowDriven) return null;
    return workflowStageOverride || creativeContext?.session?.current_stage || null;
  }, [creativeContext?.session?.current_stage, isWorkflowDriven, workflowStageOverride]);

  const effectiveBriefingConfirmed = isWorkflowDriven
    ? Boolean(effectiveCreativeStage)
    : briefingConfirmed;
  const effectiveTriggerConfirmed = isWorkflowDriven
    ? isCreativeStageAtLeast(effectiveCreativeStage, 'copy')
    : triggerConfirmed;
  const effectiveCopyApproved = isWorkflowDriven
    ? isCreativeStageAtLeast(effectiveCreativeStage, 'arte')
    : copyApproved;
  const effectiveArteApproved = isWorkflowDriven
    ? isCreativeStageAtLeast(effectiveCreativeStage, 'revisao')
    : arteApproved;

  // Copy is stale when params changed after it was generated
  const copyIsStale = useMemo(() => {
    if (!copyGeneratedWith || !copyOptions.length || !effectiveCopyApproved) return false;
    return copyGeneratedWith.trigger !== selectedTrigger ||
           copyGeneratedWith.tone !== tone ||
           copyGeneratedWith.amd !== amd;
  }, [copyGeneratedWith, selectedTrigger, tone, amd, copyOptions.length, effectiveCopyApproved]);

  const applyCreativeContext = useCallback((context: CreativeSessionContextDto | null) => {
    if (!context) return;
    setWorkflowStageOverride(null);
    setCreativeContext(context);
    if (context.session?.id) setSessionId(context.session.id);
    if (context.job?.client_brand_color) setClientBrandColor(context.job.client_brand_color);

    const pipelineMetadata = (context.session?.metadata?.pipeline || null) as CreativePipelineMetadata | null;
    const pipelineMetadataKey = normalizePipelineMetadata(pipelineMetadata);
    if (pipelineMetadata && hydratedWorkflowMetadataRef.current !== pipelineMetadataKey) {
      if (typeof pipelineMetadata.selectedTrigger !== 'undefined') {
        setSelectedTrigger(pipelineMetadata.selectedTrigger || null);
      }
      if (typeof pipelineMetadata.tone === 'string') {
        setTone(pipelineMetadata.tone);
      }
      if (typeof pipelineMetadata.amd === 'string') {
        setAmd(pipelineMetadata.amd);
      }
      if (pipelineMetadata.funnelPhase && ['awareness', 'consideracao', 'conversao'].includes(pipelineMetadata.funnelPhase)) {
        setFunnelPhase(pipelineMetadata.funnelPhase as FunnelPhase);
      }
      if (Array.isArray(pipelineMetadata.targetPlatforms) && pipelineMetadata.targetPlatforms.length) {
        setTargetPlatforms(pipelineMetadata.targetPlatforms);
      }
      if (pipelineMetadata.activeFormat?.platform || pipelineMetadata.activeFormat?.format) {
        setActiveFormat((prev) => ({
          id: pipelineMetadata.activeFormat?.id || prev?.id,
          platform: pipelineMetadata.activeFormat?.platform || prev?.platform,
          format: pipelineMetadata.activeFormat?.format || prev?.format,
          production_type: pipelineMetadata.activeFormat?.production_type || prev?.production_type,
        }));
      }
      hydratedWorkflowMetadataRef.current = pipelineMetadataKey;
      persistedWorkflowMetadataRef.current = pipelineMetadataKey;
    }

    const brief = context.briefing as Record<string, any> | null | undefined;
    if (!briefing && brief?.title) {
      setBriefing((prev) => prev || {
        id: String(brief.id || context.session?.briefing_id || briefingId),
        title: String(brief.title),
        payload: brief,
      } as PipelineBriefing);
    }
    if (brief?.tone && !tone) setTone(String(brief.tone));

    const stage = context.session?.current_stage;
    if (!stage) return;

    const selectedCopyPayload = context.selected_copy_version?.payload || {};
    const selectedCopyText = String(
      selectedCopyPayload.output
      || selectedCopyPayload.text
      || ''
    ).trim();
    if (selectedCopyText) {
      setCopyOptions(parseOptions(selectedCopyText));
      setCopyVersionId(context.selected_copy_version?.id || null);
      setSelectedCopyIdx(0);
    }

    if (!isWorkflowDriven && ['briefing', 'copy', 'arte', 'refino_canvas', 'revisao', 'aprovacao', 'exportacao'].includes(stage)) {
      setBriefingConfirmed(true);
      setNodes((prev) => prev.some((node) => node.id === 'trigger')
        ? prev
        : [...prev, { id: 'trigger', type: 'trigger', position: { x: 360, y: 120 }, data: { entering: true } }]);
    }
    if (!isWorkflowDriven && ['copy', 'arte', 'refino_canvas', 'revisao', 'aprovacao', 'exportacao'].includes(stage)) {
      setTriggerConfirmed(true);
    }
    if (!isWorkflowDriven && ['arte', 'refino_canvas', 'revisao', 'aprovacao', 'exportacao'].includes(stage)) {
      setCopyApproved(true);
      setNodes((prev) => {
        const ids = new Set(prev.map((node) => node.id));
        const additions: Node[] = [];
        if (!ids.has('copy')) additions.push({ id: 'copy', type: 'copy', position: { x: 720, y: 160 }, data: { entering: true } });
        if (!ids.has('learningRules')) additions.push({ id: 'learningRules', type: 'learningRules', position: { x: 40, y: 660 }, data: { rules: [], loading: true } });
        if (!ids.has('formatHints')) additions.push({ id: 'formatHints', type: 'formatHints', position: { x: 40, y: 880 }, data: {} });
        if (!ids.has('personasDNA')) additions.push({ id: 'personasDNA', type: 'personasDNA', position: { x: 290, y: 440 }, data: {} });
        if (!ids.has('brandVoice')) additions.push({ id: 'brandVoice', type: 'brandVoice', position: { x: 560, y: 440 }, data: {} });
        if (!ids.has('promptDNA')) additions.push({ id: 'promptDNA', type: 'promptDNA', position: { x: 290, y: 660 }, data: {} });
        if (!ids.has('critica')) additions.push({ id: 'critica', type: 'critica', position: { x: 1120, y: 360 }, data: { entering: true } });
        if (!ids.has('arte')) additions.push({ id: 'arte', type: 'arte', position: { x: 1080, y: 160 }, data: { entering: true } });
        return additions.length ? [...prev, ...additions] : prev;
      });
    }
    if (!isWorkflowDriven && ['revisao', 'aprovacao', 'exportacao'].includes(stage)) {
      setArteApproved(true);
      if (context.selected_asset?.file_url) {
        setArteImageUrl(context.selected_asset.file_url);
        setArteImageUrls([context.selected_asset.file_url]);
      }
      setNodes((prev) => prev.some((node) => node.id === 'export')
        ? prev
        : [...prev, { id: 'export', type: 'export', position: { x: 1440, y: 160 }, data: { entering: true } }]);
    }
  }, [briefing, briefingId, isWorkflowDriven, tone]);

  const syncCreativeStage = useCallback(async (stage: 'briefing' | 'copy' | 'arte' | 'revisao', reason: string) => {
    if (!workflowContext.jobId) return;
    const context = sessionId
      ? await loadStudioCreativeSession(workflowContext.jobId).catch(() => creativeContext)
      : await openStudioCreativeSession(workflowContext.jobId, { briefing_id: briefingId }).catch(() => null);
    if (!context?.session?.id) return;
    const next = await updateStudioCreativeStage(context.session.id, {
      current_stage: stage,
      reason,
    }).catch(() => null);
    applyCreativeContext(next || context);
  }, [applyCreativeContext, briefingId, creativeContext, sessionId, workflowContext.jobId]);

  const syncApprovedPipelineCopy = useCallback(async (idx: number) => {
    if (!workflowContext.jobId) return;
    const option = copyOptions[idx];
    if (!option) return;
    const context = sessionId
      ? await loadStudioCreativeSession(workflowContext.jobId).catch(() => creativeContext)
      : await openStudioCreativeSession(workflowContext.jobId, { briefing_id: briefingId }).catch(() => null);
    if (!context?.session?.id) return;

    const next = await addStudioCreativeVersion(context.session.id, {
      job_id: workflowContext.jobId,
      version_type: 'copy',
      source: 'studio',
      payload: {
        output: [option.title && `Título: ${option.title}`, option.body && `Texto: ${option.body}`, option.cta && `CTA: ${option.cta}`, option.legenda && `Legenda: ${option.legenda}`].filter(Boolean).join('\n'),
        title: option.title || '',
        body: option.body || '',
        cta: option.cta || '',
        legenda: option.legenda || '',
        hashtags: option.hashtags || '',
        source_copy_version_id: copyVersionId || null,
        briefing_id: briefingId,
        platform: targetPlatforms[0] || activeFormat?.platform || null,
        format: activeFormat?.format || null,
        source: 'pipeline',
      },
      select: true,
    }).catch(() => null);

    applyCreativeContext(next || context);
  }, [activeFormat?.format, activeFormat?.platform, applyCreativeContext, briefingId, copyOptions, copyVersionId, creativeContext, sessionId, targetPlatforms, workflowContext.jobId]);

  const syncApprovedPipelineAsset = useCallback(async (url: string) => {
    if (!workflowContext.jobId || !url) return;
    const context = sessionId
      ? await loadStudioCreativeSession(workflowContext.jobId).catch(() => creativeContext)
      : await openStudioCreativeSession(workflowContext.jobId, { briefing_id: briefingId }).catch(() => null);
    if (!context?.session?.id) return;

    const next = await addStudioCreativeAsset(context.session.id, {
      job_id: workflowContext.jobId,
      asset_type: 'image',
      source: 'studio',
      file_url: url,
      thumb_url: url,
      metadata: {
        briefing_id: briefingId,
        prompt_layout: artDirLayout || null,
        platform: activeFormat?.platform || null,
        format: activeFormat?.format || null,
        source_copy_version_id: copyVersionId || null,
        source: 'pipeline',
      },
      select: true,
    }).catch(() => null);

    applyCreativeContext(next || context);
  }, [activeFormat?.format, activeFormat?.platform, applyCreativeContext, artDirLayout, briefingId, copyVersionId, creativeContext, sessionId, workflowContext.jobId]);

  useEffect(() => {
    if (!isWorkflowDriven) return;

    const allowedNodeIds = new Set<string>(['briefing', 'clientDNA']);
    if (effectiveBriefingConfirmed) {
      allowedNodeIds.add('trigger');
    }
    if (effectiveTriggerConfirmed) {
      allowedNodeIds.add('copy');
      allowedNodeIds.add('learningRules');
      allowedNodeIds.add('formatHints');
      allowedNodeIds.add('personasDNA');
      allowedNodeIds.add('brandVoice');
      allowedNodeIds.add('promptDNA');
    }
    if (effectiveCopyApproved) {
      allowedNodeIds.add('critica');
      allowedNodeIds.add('arte');
    }
    if (effectiveArteApproved) {
      allowedNodeIds.add('export');
    }

    setNodes((prev) => {
      const next = prev.filter((node) => {
        if (allowedNodeIds.has(node.id)) return true;
        if (![
          'trigger',
          'copy',
          'learningRules',
          'formatHints',
          'personasDNA',
          'brandVoice',
          'promptDNA',
          'critica',
          'arte',
          'export',
        ].includes(node.id)) {
          return true;
        }
        return false;
      });

      const existingIds = new Set(next.map((node) => node.id));
      const additions: Node[] = [];
      if (allowedNodeIds.has('trigger') && !existingIds.has('trigger')) {
        additions.push({ id: 'trigger', type: 'trigger', position: { x: 360, y: 120 }, data: { entering: true } });
      }
      if (allowedNodeIds.has('copy') && !existingIds.has('copy')) {
        additions.push({ id: 'copy', type: 'copy', position: { x: 720, y: 160 }, data: { entering: true } });
      }
      if (allowedNodeIds.has('learningRules') && !existingIds.has('learningRules')) {
        additions.push({ id: 'learningRules', type: 'learningRules', position: { x: 40, y: 660 }, data: { rules: [], loading: true } });
      }
      if (allowedNodeIds.has('formatHints') && !existingIds.has('formatHints')) {
        additions.push({ id: 'formatHints', type: 'formatHints', position: { x: 40, y: 880 }, data: {} });
      }
      if (allowedNodeIds.has('personasDNA') && !existingIds.has('personasDNA')) {
        additions.push({ id: 'personasDNA', type: 'personasDNA', position: { x: 290, y: 440 }, data: {
          personas: clientProfile.personas ?? [],
          audience: clientProfile.audience ?? null,
        } });
      }
      if (allowedNodeIds.has('brandVoice') && !existingIds.has('brandVoice')) {
        additions.push({ id: 'brandVoice', type: 'brandVoice', position: { x: 560, y: 440 }, data: {
          brand_voice: clientProfile.brand_voice,
          must_mentions: clientProfile.must_mentions,
          rejection_patterns: clientProfile.rejection_patterns,
          formality_level: clientProfile.formality_level,
          emoji_usage: clientProfile.emoji_usage,
          risk_tolerance: clientProfile.risk_tolerance,
        } });
      }
      if (allowedNodeIds.has('promptDNA') && !existingIds.has('promptDNA')) {
        additions.push({ id: 'promptDNA', type: 'promptDNA', position: { x: 290, y: 660 }, data: {} });
      }
      if (allowedNodeIds.has('critica') && !existingIds.has('critica')) {
        additions.push({ id: 'critica', type: 'critica', position: { x: 1120, y: 360 }, data: { entering: true } });
      }
      if (allowedNodeIds.has('arte') && !existingIds.has('arte')) {
        additions.push({ id: 'arte', type: 'arte', position: { x: 1080, y: 160 }, data: { entering: true } });
      }
      if (allowedNodeIds.has('export') && !existingIds.has('export')) {
        additions.push({ id: 'export', type: 'export', position: { x: 1440, y: 160 }, data: { entering: true } });
      }

      return additions.length ? [...next, ...additions] : next;
    });
  }, [
    clientProfile.audience,
    clientProfile.brand_voice,
    clientProfile.emoji_usage,
    clientProfile.formality_level,
    clientProfile.must_mentions,
    clientProfile.personas,
    clientProfile.rejection_patterns,
    clientProfile.risk_tolerance,
    effectiveArteApproved,
    effectiveBriefingConfirmed,
    effectiveCopyApproved,
    effectiveTriggerConfirmed,
    isWorkflowDriven,
  ]);

  // ── Derived node status ─────────────────────────────────────────────────────
  // Order: Briefing → Trigger → Copy → Arte → Export
  const nodeStatus: NodeStatusMap = useMemo(() => ({
    briefing: effectiveBriefingConfirmed ? 'done' : 'active',
    trigger:  effectiveBriefingConfirmed ? (effectiveTriggerConfirmed ? 'done' : 'active') : 'locked',
    copy:     effectiveTriggerConfirmed ? (effectiveCopyApproved ? 'done' : copyGenerating ? 'running' : 'active') : 'locked',
    arte:     effectiveCopyApproved ? (effectiveArteApproved ? 'done' : arteGenerating ? 'running' : 'active') : 'locked',
    export:   effectiveArteApproved ? 'active' : 'locked',
  }), [effectiveBriefingConfirmed, effectiveTriggerConfirmed, effectiveCopyApproved, copyGenerating, effectiveArteApproved, arteGenerating]);

  // ── React Flow state ────────────────────────────────────────────────────────
  const [nodes, setNodes, onNodesChange] = useNodesState(buildInitialNodes());
  const [edges, setEdges] = useEdgesState(buildEdges(nodeStatus, new Set(['briefing', 'clientDNA'])));

  // Update edges whenever nodeStatus or nodes change
  useEffect(() => {
    const ids = new Set(nodes.map((n) => n.id));
    setEdges(buildEdges(nodeStatus, ids));
  }, [nodeStatus, nodes, setEdges]);

  // ── Load briefing + format on mount ────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        if (workflowContext.jobId) {
          const context = sessionId
            ? await loadStudioCreativeSession(workflowContext.jobId).catch(() => null)
            : await openStudioCreativeSession(workflowContext.jobId, { briefing_id: briefingId }).catch(() => null);
          applyCreativeContext(context);
        }
        const res = await apiGet<{ success: boolean; data: { briefing: PipelineBriefing; copies: CopyVersion[] } }>(
          `/edro/briefings/${briefingId}`
        );
        const b = res?.data?.briefing;
        if (b) setBriefing(b);
      } catch {}
    };
    load();

    if (typeof window !== 'undefined') {
      // Load active format from localStorage only in legacy mode.
      if (!isWorkflowDriven) {
        try {
          const inv = JSON.parse(window.localStorage.getItem('edro_selected_inventory') || '[]');
          if (Array.isArray(inv) && inv.length > 0) {
            const first = inv[0];
            setActiveFormat({
              id: first.id,
              platform: first.platform || first.platformId,
              format: first.format,
              production_type: first.production_type,
            });
          }
        } catch {}
      }

      // Load brand color + learning rules count from active client
      const clientId = window.localStorage.getItem('edro_active_client_id');
      if (clientId) {
        apiGet<any>(`/clients/${clientId}/profile`)
          .then((res) => {
            const profile = res?.profile ?? res ?? {};
            const colors: string[] = profile.brand_colors ?? [];
            if (colors.length) setClientBrandColor(colors[0]);
            setClientProfile(profile);
          })
          .catch(() => {});
        apiGet<{ success: boolean; data: any[] }>(`/clients/${clientId}/learning-rules`)
          .then((res) => setLearningRulesCount(res?.data?.length ?? 0))
          .catch(() => setLearningRulesCount(0));
      } else {
        setLearningRulesCount(0);
      }
    }
  }, [applyCreativeContext, briefingId, isWorkflowDriven, sessionId, workflowContext.jobId]);

  // ── Session restore — load saved state after briefing is set ───────────────
  const sessionLoaded = useRef(false);
  useEffect(() => {
    if (workflowContext.jobId) return;
    if (sessionLoaded.current) return;
    sessionLoaded.current = true;
    apiGet<{ success: boolean; state: Record<string, any> }>(`/studio/pipeline/${briefingId}/session`)
      .then((res) => {
        const s = res?.state;
        if (!s || !Object.keys(s).length) return;
        if (s.briefingConfirmed) setBriefingConfirmed(true);
        if (s.triggerConfirmed)  setTriggerConfirmed(true);
        if (s.selectedTrigger)   setSelectedTrigger(s.selectedTrigger);
        if (s.tone)              setTone(s.tone);
        if (s.amd)               setAmd(s.amd);
        if (s.funnelPhase)       setFunnelPhase(s.funnelPhase);
        if (Array.isArray(s.copyOptions) && s.copyOptions.length) {
          setCopyOptions(s.copyOptions);
          setSelectedCopyIdx(s.selectedCopyIdx ?? 0);
        }
        if (s.copyApproved) setCopyApproved(true);
        if (s.copyVersionId) setCopyVersionId(s.copyVersionId);
        if (s.arteImageUrl)  setArteImageUrl(s.arteImageUrl);
        if (Array.isArray(s.arteImageUrls)) setArteImageUrls(s.arteImageUrls);
        if (s.selectedArteIdx != null) setSelectedArteIdx(s.selectedArteIdx);
        if (s.arteApproved) setArteApproved(true);
        if (s.artDirLayout) setArtDirLayout(s.artDirLayout);
        // Restore active nodes
        if (Array.isArray(s.activeNodeIds) && s.activeNodeIds.length) {
          setNodes((prev) => {
            const existingIds = new Set(prev.map((n) => n.id));
            const additions: Node[] = s.activeNodeIds
              .filter((id: string) => !existingIds.has(id))
              .map((id: string) => ({
                id, type: id,
                position: OPTIONAL_NODE_POSITIONS[id] ?? { x: 400, y: 400 },
                data: {},
              }));
            return additions.length ? [...prev, ...additions] : prev;
          });
        }
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [briefingId, workflowContext.jobId]);

  // ── Session auto-save — debounced 1500ms on key state changes ──────────────
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (workflowContext.jobId) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const state = {
        briefingConfirmed, triggerConfirmed, selectedTrigger, tone, amd, funnelPhase,
        copyOptions, selectedCopyIdx, copyApproved, copyVersionId,
        arteImageUrl, arteImageUrls, selectedArteIdx, arteApproved, artDirLayout,
        activeNodeIds: nodes.map((n) => n.id),
      };
      apiPost(`/studio/pipeline/${briefingId}/session`, state).catch(() => {});
    }, 1500);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arteApproved, arteImageUrl, briefingConfirmed, copyApproved, nodes.length, triggerConfirmed, workflowContext.jobId]);

  const workflowMetadataTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pipelineWorkflowMetadata = useMemo<CreativePipelineMetadata>(() => ({
    selectedTrigger: selectedTrigger || null,
    tone: tone || '',
    amd: amd || '',
    funnelPhase,
    targetPlatforms,
    activeFormat: activeFormat ? {
      id: activeFormat.id,
      platform: activeFormat.platform,
      format: activeFormat.format,
      production_type: activeFormat.production_type,
    } : null,
  }), [activeFormat, amd, funnelPhase, selectedTrigger, targetPlatforms, tone]);

  useEffect(() => {
    if (!isWorkflowDriven || !workflowContext.jobId || !sessionId) return;
    const metadataKey = normalizePipelineMetadata(pipelineWorkflowMetadata);
    if (persistedWorkflowMetadataRef.current === metadataKey) return;

    if (workflowMetadataTimerRef.current) clearTimeout(workflowMetadataTimerRef.current);
    workflowMetadataTimerRef.current = setTimeout(() => {
      updateStudioCreativeMetadata(sessionId, {
        job_id: workflowContext.jobId,
        metadata: {
          pipeline: pipelineWorkflowMetadata,
        },
        reason: 'pipeline_state_updated',
      })
        .then((context) => {
          persistedWorkflowMetadataRef.current = metadataKey;
          applyCreativeContext(context);
        })
        .catch(() => {});
    }, 800);

    return () => {
      if (workflowMetadataTimerRef.current) clearTimeout(workflowMetadataTimerRef.current);
    };
  }, [applyCreativeContext, isWorkflowDriven, pipelineWorkflowMetadata, sessionId, workflowContext.jobId]);

  // ── When copy node appears: load learning rules into node data ──────────────
  // (context edges are now managed by buildEdges — no need to add them manually)
  useEffect(() => {
    const hasCopy = nodes.some((n) => n.id === 'copy');
    if (!hasCopy) return;

    const clientId = typeof window !== 'undefined'
      ? window.localStorage.getItem('edro_active_client_id')
      : null;

    // Fetch learning rules
    if (clientId) {
      apiGet<{ success: boolean; data: any[] }>(`/clients/${clientId}/learning-rules`)
        .then((res) => {
          const rules = res?.data ?? [];
          setNodes((prev) => prev.map((n) =>
            n.id === 'learningRules' ? { ...n, data: { ...n.data, rules, loading: false } } : n
          ));
        })
        .catch(() => {
          setNodes((prev) => prev.map((n) =>
            n.id === 'learningRules' ? { ...n, data: { ...n.data, loading: false } } : n
          ));
        });
    } else {
      setNodes((prev) => prev.map((n) =>
        n.id === 'learningRules' ? { ...n, data: { ...n.data, loading: false } } : n
      ));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes.some((n) => n.id === 'copy')]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const confirmOcasiao = useCallback(() => {
    setOcasiaoConfirmed(true);
  }, []);

  const confirmBriefing = useCallback(() => {
    setBriefingConfirmed(true);
    if (isWorkflowDriven) setWorkflowStageOverride('briefing');
    syncCreativeStage('briefing', 'pipeline_briefing_confirmed').catch(() => {});
    // Progressive reveal: Trigger appears first — it defines the creative angle BEFORE copy
    setNodes((prev) => {
      const ids = new Set(prev.map((n) => n.id));
      if (ids.has('trigger')) return prev;
      return [...prev, { id: 'trigger', type: 'trigger', position: { x: 360, y: 120 }, data: { entering: true } }];
    });
  }, [isWorkflowDriven, setNodes, syncCreativeStage]);

  const AMD_LABELS: Record<string, string> = {
    salvar: 'Salvar', compartilhar: 'Compartilhar', clicar: 'Clicar',
    responder: 'Comentar/Responder', marcar_alguem: 'Marcar alguém', pedir_proposta: 'Pedir orçamento',
  };

  const [lastCopyParams, setLastCopyParams] = useState<{ pipeline: string; count: number; taskType: string; provider?: string } | null>(null);

  const handleGenerateCopy = useCallback(async ({ pipeline, count, taskType, provider, extraInstructions }: {
    pipeline: string; count: number; taskType: string; provider?: string; extraInstructions?: string;
  }) => {
    if (!briefingId) return;
    setCopyGenerating(true);
    setCopyError('');
    setLastCopyParams({ pipeline, count, taskType, provider });

    const TRIGGER_NAMES: Record<string, string> = {
      G01: 'Escassez', G02: 'Autoridade', G03: 'Prova Social',
      G04: 'Reciprocidade', G05: 'Curiosidade', G06: 'Identidade', G07: 'Dor/Solução',
    };

    try {
      const response = await apiPost<{ success: boolean; data: { copy: CopyVersion } }>(
        `/edro/briefings/${briefingId}/copy`,
        {
          count,
          pipeline,
          task_type: taskType,
          force_provider: provider || undefined,
          instructions: [
            activeFormat?.format ? `Formato selecionado: ${activeFormat.format}` : '',
            targetPlatforms.length ? `Plataformas-alvo: ${targetPlatforms.join(', ')}. Adapte o texto aos limites de caracteres e linguagem de cada plataforma.` : '',
            selectedTrigger ? `Gatilho psicológico obrigatório: ${selectedTrigger} — ${TRIGGER_NAMES[selectedTrigger] || ''}. O copy deve ser escrito para ativar EXPLICITAMENTE este gatilho.` : '',
            tone ? `Tom de voz: ${tone}.` : '',
            amd ? `Ação Mais Desejada (AMD): ${AMD_LABELS[amd] || amd}. O copy deve ser otimizado para gerar esta ação específica.` : '',
            extraInstructions ? `FEEDBACK DO AGENTE CRÍTICO (corrija estes pontos na nova versão):\n${extraInstructions}` : '',
            'Retorne opcoes separadas e numeradas.',
          ].filter(Boolean).join('\n'),
          metadata: {
            format: activeFormat?.format || null,
            platform: targetPlatforms[0] || activeFormat?.platform || null,
            platforms: targetPlatforms,
            trigger: selectedTrigger || null,
            tone: tone || null,
            amd: amd || null,
            source: 'pipeline',
          },
        }
      );
      const created = response?.data?.copy;
      if (!created) throw new Error('Falha ao gerar copy.');
      const parsed = parseOptions(created.output || '');
      setCopyOptions(parsed);
      setCopyVersionId(created.id);
      setSelectedCopyIdx(0);
      // Snapshot params used — for stale detection
      setCopyGeneratedWith({ trigger: selectedTrigger, tone, amd });
      // Trigger Director analysis (non-blocking)
      analyzeWithDirector('copy', created.output || '');
    } catch (e: any) {
      setCopyError(e?.message || 'Falha ao gerar copy.');
    } finally {
      setCopyGenerating(false);
    }
  }, [briefingId, activeFormat, selectedTrigger]);

  const approveCopy = useCallback((idx: number) => {
    setSelectedCopyIdx(idx);
    setCopyApproved(true);
    if (isWorkflowDriven) setWorkflowStageOverride('arte');
    syncApprovedPipelineCopy(idx).catch(() => {});
    syncCreativeStage('arte', 'pipeline_copy_approved').catch(() => {});
    // Progressive reveal: inject CriticaNode (auto-QA) + ArteNode
    setNodes((prev) => {
      const ids = new Set(prev.map((n) => n.id));
      const additions: Node[] = [];
      // CAMADA 2 — QA: Crítica auto-injeta como checkpoint entre Copy→Arte e Distribuição
      if (!ids.has('critica')) additions.push({ id: 'critica', type: 'critica', position: { x: 1120, y: 360 }, data: { entering: true } });
      // CAMADA 1 (continua) — Arte em paralelo visual com a Crítica
      if (!ids.has('arte'))    additions.push({ id: 'arte',    type: 'arte',    position: { x: 1080, y: 160 }, data: { entering: true } });
      return additions.length ? [...prev, ...additions] : prev;
    });
  }, [isWorkflowDriven, setNodes, syncApprovedPipelineCopy, syncCreativeStage]);

  // rerunCopy — called by CriticaNode's auto-loop with critique feedback as extra instructions
  const rerunCopy = useCallback(async (extraInstructions: string) => {
    if (!lastCopyParams) return;
    await handleGenerateCopy({ ...lastCopyParams, extraInstructions });
  }, [lastCopyParams, handleGenerateCopy]);

  // handleGenerateCopyChain — runs the full 5-plugin Agente Redator pipeline
  const handleGenerateCopyChain = useCallback(async (chainParams: CopyChainParams) => {
    setCopyGenerating(true);
    setCopyChainStep(1);
    setCopyChainResult(null);
    setCopyError('');
    // Tick through steps with estimated timings (real progress from backend)
    const stepTimers = [
      setTimeout(() => setCopyChainStep(2), 4000),
      setTimeout(() => setCopyChainStep(3), 9000),
      setTimeout(() => setCopyChainStep(4), 18000),
      setTimeout(() => setCopyChainStep(5), 22000),
    ];
    try {
      const { apiPost } = await import('@/lib/api');
      const res = await apiPost<{ success: boolean; data: CopyChainResult }>('/studio/creative/copy-chain', {
        briefing,
        clientProfile: Object.keys(clientProfile).length > 0 ? clientProfile : null,
        trigger: selectedTrigger,
        tone,
        amd,
        platform: targetPlatforms[0] || activeFormat?.platform,
        platforms: targetPlatforms,
        format: activeFormat?.format,
        taskType: 'social_post',
        count: 3,
        ...chainParams,
      });
      stepTimers.forEach(clearTimeout);
      if (res?.data) {
        setCopyChainResult(res.data);
        setCopyChainStep(0);
        // Map chain variants to copyOptions format so existing approval flow works
        const mapped = res.data.variants.map((v) => ({
          title:    v.title,
          body:     v.body,
          cta:      v.cta,
          legenda:  v.legenda,
          hashtags: v.hashtags?.join(' ') ?? '',
          raw:      v.body,
        }));
        setCopyOptions(mapped);
        setSelectedCopyIdx(0);
      }
    } catch (e: any) {
      stepTimers.forEach(clearTimeout);
      setCopyError(e?.message ?? 'Erro no pipeline de redação');
      setCopyChainStep(0);
    } finally {
      setCopyGenerating(false);
    }
  }, [briefing, selectedTrigger, tone, amd, activeFormat]);

  // handleGenerateArteChain — runs the full 6-plugin Agente Diretor de Arte pipeline
  const handleGenerateArteChain = useCallback(async (chainParams: ArteChainParams) => {
    setArteGenerating(true);
    setArteChainStep(1);
    setArteChainResult(null);
    setArteError('');
    const stepTimers = [
      setTimeout(() => setArteChainStep(2), 5000),
      setTimeout(() => setArteChainStep(3), 10000),
      setTimeout(() => setArteChainStep(4), 20000),
      setTimeout(() => setArteChainStep(5), 26000),
      setTimeout(() => setArteChainStep(6), 32000),
    ];
    try {
      const { apiPost } = await import('@/lib/api');
      const copy = copyOptions[selectedCopyIdx];
      const copyText = copy ? [copy.title, copy.body, copy.cta].filter(Boolean).join(' ') : '';
      const res = await apiPost<{ success: boolean; data: ArteChainResult }>('/studio/creative/arte-chain', {
        copy:             copyText,
        briefing,
        clientProfile:    Object.keys(clientProfile).length > 0 ? clientProfile : null,
        trigger:          selectedTrigger,
        platform:         activeFormat?.platform,
        format:           activeFormat?.format,
        visualReferences: visualReferences.length > 0 ? visualReferences : undefined,
        ...chainParams,
      });
      stepTimers.forEach(clearTimeout);
      if (res?.data) {
        setArteChainResult(res.data);
        setArteChainStep(0);
        setArteImageUrl(res.data.imageUrl);
        setArteImageUrls(res.data.imageUrls);
      }
    } catch (e: any) {
      stepTimers.forEach(clearTimeout);
      setArteError(e?.message ?? 'Erro no pipeline de arte');
      setArteChainStep(0);
    } finally {
      setArteGenerating(false);
    }
  }, [briefing, selectedTrigger, activeFormat, copyOptions, selectedCopyIdx]);

  // handleGenerateArteChainStream — SSE version, updates arteChainStep in real-time
  const handleGenerateArteChainStream = useCallback(async (chainParams: ArteChainParams) => {
    setArteGenerating(true);
    setArteChainStep(1);
    setArteChainResult(null);
    setArteError('');

    // Map SSE event names to the next step number
    const EVENT_TO_STEP: Record<string, number> = {
      p1_done: 2, p2_done: 3, p3_done: 4, p4_done: 5, p4b_done: 6,
    };

    try {
      const { getApiBase } = await import('@/lib/api');
      const copy = copyOptions[selectedCopyIdx];
      const copyText = copy ? [copy.title, copy.body, copy.cta].filter(Boolean).join(' ') : '';
      const payload = {
        copy: copyText, briefing, clientProfile: Object.keys(clientProfile).length > 0 ? clientProfile : null,
        trigger: selectedTrigger, platform: activeFormat?.platform, format: activeFormat?.format,
        visualReferences: visualReferences.length > 0 ? visualReferences : undefined, ...chainParams,
      };

      const res = await fetch(`${getApiBase()}/studio/creative/arte-chain/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      let currentEvent = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() ?? '';
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (currentEvent === 'done' && data.data) {
                const result: ArteChainResult = data.data;
                setArteChainResult(result);
                setArteChainStep(0);
                setArteImageUrl(result.imageUrl);
                setArteImageUrls(result.imageUrls);
              } else if (currentEvent === 'error') {
                setArteError(data.error ?? 'Erro no pipeline de arte');
                setArteChainStep(0);
              } else if (EVENT_TO_STEP[currentEvent]) {
                setArteChainStep(EVENT_TO_STEP[currentEvent]);
              }
            } catch { /* malformed JSON, skip */ }
          }
        }
      }
    } catch (e: any) {
      setArteError(e?.message ?? 'Erro no pipeline de arte');
      setArteChainStep(0);
    } finally {
      setArteGenerating(false);
    }
  }, [briefing, selectedTrigger, activeFormat, copyOptions, selectedCopyIdx, visualReferences, clientProfile]);

  const editCopy = useCallback(() => {
    setCopyApproved(false);
    setArteApproved(false);
    setArteImageUrl(null);
    setArteImageUrls([]);
    setArtDirLayout(null);
    if (isWorkflowDriven) {
      setWorkflowStageOverride('copy');
      syncCreativeStage('copy', 'pipeline_copy_reopened').catch(() => {});
    }
    // Remove arte + export (and critica resets itself via effect) — trigger stays confirmed
    setNodes((prev) => prev.filter((n) => !['arte', 'export', 'critica'].includes(n.id)));
  }, [isWorkflowDriven, setNodes, syncCreativeStage]);

  const confirmTrigger = useCallback(() => {
    setTriggerConfirmed(true);
    if (isWorkflowDriven) setWorkflowStageOverride('copy');
    syncCreativeStage('copy', 'pipeline_trigger_confirmed').catch(() => {});
    // Progressive reveal: CopyNode + all context/ingredient nodes
    setNodes((prev) => {
      const ids = new Set(prev.map((n) => n.id));
      const additions: Node[] = [];
      // CAMADA 1 — CRIAÇÃO
      if (!ids.has('copy'))          additions.push({ id: 'copy',          type: 'copy',          position: { x: 720,  y: 160 }, data: { entering: true } });
      // CAMADA 1.5 — CONTEXTO (alimenta o CopyNode via edges)
      if (!ids.has('learningRules')) additions.push({ id: 'learningRules', type: 'learningRules', position: { x: 40,   y: 660 }, data: { rules: [], loading: true } });
      if (!ids.has('formatHints'))   additions.push({ id: 'formatHints',   type: 'formatHints',   position: { x: 40,   y: 880 }, data: {} });
      if (!ids.has('personasDNA'))   additions.push({ id: 'personasDNA',   type: 'personasDNA',   position: { x: 290,  y: 440 }, data: {
        personas:  clientProfile.personas ?? [],
        audience:  clientProfile.audience ?? null,
      }});
      if (!ids.has('brandVoice'))    additions.push({ id: 'brandVoice',    type: 'brandVoice',    position: { x: 560,  y: 440 }, data: {
        brand_voice:        clientProfile.brand_voice,
        must_mentions:      clientProfile.must_mentions,
        rejection_patterns: clientProfile.rejection_patterns,
        formality_level:    clientProfile.formality_level,
        emoji_usage:        clientProfile.emoji_usage,
        risk_tolerance:     clientProfile.risk_tolerance,
      }});
      if (!ids.has('promptDNA'))     additions.push({ id: 'promptDNA',     type: 'promptDNA',     position: { x: 290,  y: 660 }, data: {} });
      return additions.length ? [...prev, ...additions] : prev;
    });
  }, [setNodes, activeFormat, clientProfile, isWorkflowDriven, syncCreativeStage]);

  const editTrigger = useCallback(() => {
    setTriggerConfirmed(false);
    setCopyApproved(false);
    setArteApproved(false);
    setArteImageUrl(null);
    setArteImageUrls([]);
    setArtDirLayout(null);
    if (isWorkflowDriven) {
      setWorkflowStageOverride('briefing');
      syncCreativeStage('briefing', 'pipeline_trigger_reopened').catch(() => {});
    }
    // Remove copy + arte + export — copy must be regenerated with the new trigger
    setNodes((prev) => prev.filter((n) => !['copy', 'learningRules', 'formatHints', 'personasDNA', 'brandVoice', 'promptDNA', 'arte', 'export'].includes(n.id)));
  }, [isWorkflowDriven, setNodes, syncCreativeStage]);

  const handleGenerateArte = useCallback(async (withImage: boolean, opts?: {
    aspectRatio?: string; negativePrompt?: string; refinement?: string; provider?: string; model?: string;
  }) => {
    setArteGenerating(true);
    setArteError('');
    try {
      const copy = copyOptions[selectedCopyIdx];
      const copyText = [copy?.title, copy?.body, copy?.cta].filter(Boolean).join(' ');
      const res = await apiPost<any>('/studio/creative/orchestrate', {
        copy: copyText,
        gatilho: selectedTrigger || undefined,
        brand_color: clientBrandColor,
        platform: activeFormat?.platform,
        format: activeFormat?.format,
        with_image: withImage,
        num_variants: 3,
        aspect_ratio: opts?.aspectRatio,
        negative_prompt: opts?.negativePrompt || undefined,
        refinement: opts?.refinement || undefined,
        provider: opts?.provider || undefined,
        model: opts?.model || undefined,
      });
      if (!res.success) throw new Error(res.error || 'Falha na orquestração.');
      setArtDirLayout(res.layout || null);
      if (withImage) {
        const urls: string[] = res.image_urls?.length ? res.image_urls : res.image_url ? [res.image_url] : [];
        setArteImageUrls(urls);
        if (urls.length) setArteImageUrl(urls[0]);
      }
    } catch (e: any) {
      setArteError(e?.message || 'Falha ao gerar arte.');
    } finally {
      setArteGenerating(false);
    }
  }, [copyOptions, selectedCopyIdx, selectedTrigger, clientBrandColor, activeFormat]);

  const useArte = useCallback((url: string) => {
    setArteImageUrl(url);
    setArteApproved(true);
    if (isWorkflowDriven) setWorkflowStageOverride('revisao');
    syncApprovedPipelineAsset(url).catch(() => {});
    syncCreativeStage('revisao', 'pipeline_arte_selected').catch(() => {});
    // Progressive reveal: inject ExportNode
    setNodes((prev) => {
      if (prev.some((n) => n.id === 'export')) return prev;
      return [...prev, { id: 'export', type: 'export', position: { x: 1440, y: 160 }, data: { entering: true } }];
    });
  }, [isWorkflowDriven, setNodes, syncApprovedPipelineAsset, syncCreativeStage]);

  const editArte = useCallback(() => {
    setArteApproved(false);
    setArteImageUrl(null);
    setArteImageUrls([]);
    setArtDirLayout(null);
    if (isWorkflowDriven) {
      setWorkflowStageOverride('arte');
      syncCreativeStage('arte', 'pipeline_arte_reopened').catch(() => {});
    }
  }, [isWorkflowDriven, syncCreativeStage]);

  // ── Director AI (non-blocking) ──────────────────────────────────────────────
  const analyzeWithDirector = useCallback(async (step: string, content: string) => {
    if (!briefing) return;
    setDirectorAnalyzing(true);
    try {
      const res = await apiPost<any>('/studio/creative/director-analyze', {
        briefing_title: briefing.title,
        briefing_payload: briefing.payload,
        step,
        content,
      });
      if (res?.insight) {
        setDirectorInsights((prev) => [...prev, { ...res.insight, step }]);
      }
      // Trigger rankings surfaced when copy step analyzed
      if (step === 'copy' && Array.isArray(res?.trigger_recommendations)) {
        setTriggerRanking(res.trigger_recommendations);
      }
    } catch {
      // non-blocking — Director is best-effort
    } finally {
      setDirectorAnalyzing(false);
    }
  }, [briefing]);

  // ── Fetch step recommendations (Chef hints) ─────────────────────────────────
  useEffect(() => {
    if (!effectiveBriefingConfirmed || !briefing) return;
    // Ask Director what pipeline/count to use for this briefing
    apiPost<any>('/studio/creative/director-analyze', {
      briefing_title: briefing.title,
      briefing_payload: briefing.payload,
      step: 'briefing',
      content: JSON.stringify({ format: activeFormat?.format, platform: activeFormat?.platform }),
    }).then((res) => {
      if (res?.recommendation) {
        setRecommendations((prev) => ({ ...prev, copy: { text: res.recommendation, confidence: res.confidence || 'medium' } }));
      }
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveBriefingConfirmed]);

  // ── Recipe handlers ─────────────────────────────────────────────────────────

  // Load suggested recipes when briefing + format are known
  useEffect(() => {
    if (!briefing || !activeFormat?.platform) return;
    const clientId = typeof window !== 'undefined'
      ? window.localStorage.getItem('edro_active_client_id')
      : null;
    const params = new URLSearchParams();
    if (clientId) params.set('client_id', clientId);
    if (activeFormat.platform) params.set('platform', activeFormat.platform);
    if (activeFormat.format)   params.set('format', activeFormat.format);
    params.set('limit', '3');
    apiGet<{ success: boolean; data: any[] }>(`/studio/recipes?${params.toString()}`)
      .then((res) => setSuggestedRecipes(res?.data ?? []))
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [briefing?.id, activeFormat?.platform]);

  const saveRecipe = useCallback(async (name: string) => {
    if (!activeFormat) return;
    const clientId = typeof window !== 'undefined'
      ? window.localStorage.getItem('edro_active_client_id')
      : null;
    const copy = copyOptions[selectedCopyIdx];
    const toneNotes = copy ? `${copy.title?.slice(0, 80)}` : undefined;
    await apiPost('/studio/recipes', {
      name,
      client_id:     clientId || null,
      objective:     briefing?.payload?.objective || null,
      platform:      activeFormat.platform || null,
      format:        activeFormat.format || null,
      pipeline_type: 'standard',
      trigger_id:    selectedTrigger || null,
      provider:      null,
      model:         null,
      tone_notes:    toneNotes || null,
    }).catch(() => {});
  }, [briefing, activeFormat, copyOptions, selectedCopyIdx, selectedTrigger]);

  const applyRecipe = useCallback((recipe: any) => {
    // Apply recipe's trigger choice immediately
    if (recipe.trigger_id) setSelectedTrigger(recipe.trigger_id);
    // Bump use count
    apiPost(`/studio/recipes/${recipe.id}/use`, {}).catch(() => {});
  }, [setSelectedTrigger]);

  // ── Add optional nodes from AddNodePanel ─────────────────────────────────
  const addOptionalNode = useCallback((nodeId: string) => {
    const pos = OPTIONAL_NODE_POSITIONS[nodeId];
    if (!pos) return;
    setNodes((prev) => {
      if (prev.some((n) => n.id === nodeId)) return prev;
      return [...prev, { id: nodeId, type: nodeId, position: pos, data: { entering: true } }];
    });
  }, [setNodes]);

  // ── Add freeform annotation nodes (shapes / sticky notes) ─────────────────
  const noteCounterRef = useRef(0);
  const { screenToFlowPosition } = useReactFlow();
  const addAnnotationNode = useCallback((shape: 'rect' | 'circle' | 'triangle' | 'star' | 'note', screenPos?: { x: number; y: number }) => {
    noteCounterRef.current += 1;
    const id = `note-${shape}-${noteCounterRef.current}-${Date.now()}`;
    const scatter = () => (Math.random() - 0.5) * 60;
    const pos = screenPos
      ? screenToFlowPosition(screenPos)
      : { x: 600 + scatter(), y: 380 + scatter() };
    setNodes((prev) => [
      ...prev,
      { id, type: 'note', position: pos, data: { shape, text: '' } },
    ]);
  }, [setNodes, screenToFlowPosition]);

  // In draw mode, clicking the pane places a note at cursor position
  const handlePaneClick = useCallback((event: React.MouseEvent) => {
    if (interactionMode !== 'draw') return;
    addAnnotationNode('note', { x: event.clientX, y: event.clientY });
  }, [interactionMode, addAnnotationNode]);

  // ── Context value ───────────────────────────────────────────────────────────
  const ctxValue: PipelineContextValue = {
    briefing, activeFormat, clientBrandColor,
    briefingConfirmed: effectiveBriefingConfirmed, confirmBriefing,
    tone, setTone, amd, setAmd,
    targetPlatforms, setTargetPlatforms,
    funnelPhase, setFunnelPhase,
    ocasiao, setOcasiao, ocasiaoConfirmed, confirmOcasiao,
    copyGenerating, copyOptions, selectedCopyIdx, setSelectedCopyIdx,
    copyApproved: effectiveCopyApproved, copyVersionId, copyError,
    handleGenerateCopy, rerunCopy, approveCopy, editCopy,
    copyIsStale,
    selectedTrigger, setSelectedTrigger, triggerConfirmed: effectiveTriggerConfirmed, confirmTrigger, editTrigger,
    arteGenerating, artDirLayout, arteImageUrl, arteImageUrls,
    selectedArteIdx, setSelectedArteIdx,
    arteApproved: effectiveArteApproved, arteError, handleGenerateArte, useArte, editArte,
    nodeStatus,
    recommendations,
    triggerRanking,
    suggestedRecipes,
    saveRecipe,
    applyRecipe,
    learningRulesCount,
    directorInsights,
    directorAnalyzing,
    activeNodeIds: nodes.map((n) => n.id),
    addOptionalNode,
    addAnnotationNode,
    copyChainResult,
    copyChainStep,
    handleGenerateCopyChain,
    arteChainResult,
    arteChainStep,
    handleGenerateArteChain,
    handleGenerateArteChainStream,
    visualReferences,
    setVisualReferences,
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <PipelineContext.Provider value={ctxValue}>
      <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden', bgcolor: '#0d0d0d' }}>
        {/* Canvas — 62% */}
        <Box sx={{ flex: '0 0 62%', height: '100%', position: 'relative' }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            fitViewOptions={{ padding: 0.15 }}
            minZoom={0.4}
            maxZoom={1.5}
            proOptions={{ hideAttribution: true }}
            onPaneClick={handlePaneClick}
            panOnDrag={interactionMode === 'hand'}
            selectionOnDrag={interactionMode === 'select'}
            style={{
              background: '#0d0d0d',
              cursor: interactionMode === 'hand' ? 'grab' : interactionMode === 'draw' ? 'crosshair' : 'default',
            }}
          >
            <Background color="#1a1a1a" variant={BackgroundVariant.Dots} gap={20} size={1.5} />
            <Controls
              style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8 }}
            />
            <MiniMap
              nodeColor={(node) => {
                const s = nodeStatus[node.id as keyof NodeStatusMap];
                return s === 'done' ? '#13DEB9' : s === 'active' ? '#E85219' : s === 'running' ? '#E85219' : '#333';
              }}
              style={{ background: '#111', border: '1px solid #222', borderRadius: 8 }}
            />
          </ReactFlow>

          {/* Canvas Toolbar — Lovart-style floating vertical pill */}
          <CanvasToolbar
            interactionMode={interactionMode}
            setInteractionMode={setInteractionMode}
            addAnnotationNode={addAnnotationNode}
          />
        </Box>

        {/* Right panel — 38% — Chat Agent (primary) + Preview tab */}
        <RightPanel briefingId={briefingId} />
      </Box>
    </PipelineContext.Provider>
  );
}

export default function PipelineStudio({ briefingId }: PipelineStudioProps) {
  return (
    <ReactFlowProvider>
      <PipelineStudioInner briefingId={briefingId} />
    </ReactFlowProvider>
  );
}
