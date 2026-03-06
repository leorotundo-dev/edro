'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ReactFlow, ReactFlowProvider, Background, MiniMap, Controls,
  useNodesState, useEdgesState, type Node, type Edge,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import Box from '@mui/material/Box';

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
import DirectorNode from '@/components/pipeline/nodes/DirectorNode';
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
import PreviewPanel from '@/components/pipeline/PreviewPanel';
import AddNodePanel from '@/components/pipeline/AddNodePanel';
import { apiGet, apiPost } from '@/lib/api';

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
  approval:         ApprovalNode,
  schedule:         ScheduleNode,
  performance:      PerformanceNode,
  learningFeedback: LearningFeedbackNode,
};

const edgeTypes = {
  pipeline: PipelineEdge,
};

// ── Initial layout ────────────────────────────────────────────────────────────

// Only briefing shown at start — copy appears after user confirms briefing
function buildInitialNodes(): Node[] {
  return [
    { id: 'briefing',  type: 'briefing',  position: { x: 40, y: 180 }, data: {} },
    { id: 'clientDNA', type: 'clientDNA', position: { x: 40, y: 480 }, data: {} },
  ];
}

// Optional node positions for AddNodePanel injection
const OPTIONAL_NODE_POSITIONS: Record<string, { x: number; y: number }> = {
  critica:          { x: 720,  y: 360 },
  multiFormat:      { x: 1080, y: 360 },
  abTest:           { x: 1080, y: 580 },
  videoScript:      { x: 1360, y: 360 },
  approval:         { x: 200,  y: 740 },
  schedule:         { x: 560,  y: 740 },
  performance:      { x: 200,  y: 1000 },
  learningFeedback: { x: 600,  y: 1000 },
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

// ── Main component ────────────────────────────────────────────────────────────

interface PipelineStudioProps {
  briefingId: string;
}

function PipelineStudioInner({ briefingId }: PipelineStudioProps) {
  // ── Core state ──────────────────────────────────────────────────────────────
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

  // Copy is stale when params changed after it was generated
  const copyIsStale = useMemo(() => {
    if (!copyGeneratedWith || !copyOptions.length) return false;
    return copyGeneratedWith.trigger !== selectedTrigger ||
           copyGeneratedWith.tone !== tone ||
           copyGeneratedWith.amd !== amd;
  }, [copyGeneratedWith, selectedTrigger, tone, amd, copyOptions.length]);

  // ── Derived node status ─────────────────────────────────────────────────────
  // Order: Briefing → Trigger → Copy → Arte → Export
  const nodeStatus: NodeStatusMap = useMemo(() => ({
    briefing: briefingConfirmed ? 'done' : 'active',
    trigger:  briefingConfirmed ? (triggerConfirmed ? 'done' : 'active') : 'locked',
    copy:     triggerConfirmed ? (copyApproved ? 'done' : copyGenerating ? 'running' : 'active') : 'locked',
    arte:     copyApproved ? (arteApproved ? 'done' : arteGenerating ? 'running' : 'active') : 'locked',
    export:   arteApproved ? 'active' : 'locked',
  }), [briefingConfirmed, triggerConfirmed, copyApproved, copyGenerating, arteApproved, arteGenerating]);

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
        const res = await apiGet<{ success: boolean; data: { briefing: PipelineBriefing; copies: CopyVersion[] } }>(
          `/edro/briefings/${briefingId}`
        );
        const b = res?.data?.briefing;
        if (b) setBriefing(b);
      } catch {}
    };
    load();

    // Load active format from localStorage (same source as EditorClient)
    if (typeof window !== 'undefined') {
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
  }, [briefingId]);

  // ── Session restore — load saved state after briefing is set ───────────────
  const sessionLoaded = useRef(false);
  useEffect(() => {
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
  }, [briefingId]);

  // ── Session auto-save — debounced 1500ms on key state changes ──────────────
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
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
  }, [briefingConfirmed, triggerConfirmed, copyApproved, arteApproved, arteImageUrl, nodes.length]);

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
    // Progressive reveal: Trigger appears first — it defines the creative angle BEFORE copy
    setNodes((prev) => {
      const ids = new Set(prev.map((n) => n.id));
      if (ids.has('trigger')) return prev;
      return [...prev, { id: 'trigger', type: 'trigger', position: { x: 360, y: 120 }, data: { entering: true } }];
    });
  }, [setNodes]);

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
            activeFormat?.platform ? `Plataforma: ${activeFormat.platform}` : '',
            selectedTrigger ? `Gatilho psicológico obrigatório: ${selectedTrigger} — ${TRIGGER_NAMES[selectedTrigger] || ''}. O copy deve ser escrito para ativar EXPLICITAMENTE este gatilho.` : '',
            tone ? `Tom de voz: ${tone}.` : '',
            amd ? `Ação Mais Desejada (AMD): ${AMD_LABELS[amd] || amd}. O copy deve ser otimizado para gerar esta ação específica.` : '',
            extraInstructions ? `FEEDBACK DO AGENTE CRÍTICO (corrija estes pontos na nova versão):\n${extraInstructions}` : '',
            'Retorne opcoes separadas e numeradas.',
          ].filter(Boolean).join('\n'),
          metadata: {
            format: activeFormat?.format || null,
            platform: activeFormat?.platform || null,
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
    // Progressive reveal: inject CriticaNode (auto-QA) + ArteNode
    setNodes((prev) => {
      const ids = new Set(prev.map((n) => n.id));
      const additions: Node[] = [];
      // Agente Crítico — auto-injects below CopyNode
      if (!ids.has('critica')) additions.push({ id: 'critica', type: 'critica', position: { x: 720, y: 360 }, data: { entering: true } });
      if (!ids.has('arte'))    additions.push({ id: 'arte',    type: 'arte',    position: { x: 1080, y: 120 }, data: { entering: true } });
      return additions.length ? [...prev, ...additions] : prev;
    });
  }, [setNodes]);

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
        platform: activeFormat?.platform,
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
        copy:          copyText,
        briefing,
        clientProfile: Object.keys(clientProfile).length > 0 ? clientProfile : null,
        trigger:       selectedTrigger,
        platform:      activeFormat?.platform,
        format:        activeFormat?.format,
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

  const editCopy = useCallback(() => {
    setCopyApproved(false);
    setArteApproved(false);
    setArteImageUrl(null);
    setArteImageUrls([]);
    setArtDirLayout(null);
    // Remove arte + export (and critica resets itself via effect) — trigger stays confirmed
    setNodes((prev) => prev.filter((n) => !['arte', 'export', 'critica'].includes(n.id)));
  }, [setNodes]);

  const confirmTrigger = useCallback(() => {
    setTriggerConfirmed(true);
    // Progressive reveal: CopyNode + all context/ingredient nodes
    setNodes((prev) => {
      const ids = new Set(prev.map((n) => n.id));
      const additions: Node[] = [];
      if (!ids.has('copy'))          additions.push({ id: 'copy',          type: 'copy',          position: { x: 720,  y: 120 }, data: { entering: true } });
      if (!ids.has('learningRules')) additions.push({ id: 'learningRules', type: 'learningRules', position: { x: 40,   y: 480 }, data: { rules: [], loading: true } });
      if (!ids.has('formatHints'))   additions.push({ id: 'formatHints',   type: 'formatHints',   position: { x: 40,   y: 700 }, data: { platform: activeFormat?.platform, format: activeFormat?.format } });
      // Armário de Ingredientes — persona, brand voice, prompt DNA
      if (!ids.has('personasDNA'))   additions.push({ id: 'personasDNA',   type: 'personasDNA',   position: { x: 290,  y: 480 }, data: {
        personas:  clientProfile.personas ?? [],
        audience:  clientProfile.audience ?? null,
      }});
      if (!ids.has('brandVoice'))    additions.push({ id: 'brandVoice',    type: 'brandVoice',    position: { x: 560,  y: 480 }, data: {
        brand_voice:        clientProfile.brand_voice,
        must_mentions:      clientProfile.must_mentions,
        rejection_patterns: clientProfile.rejection_patterns,
        formality_level:    clientProfile.formality_level,
        emoji_usage:        clientProfile.emoji_usage,
        risk_tolerance:     clientProfile.risk_tolerance,
      }});
      if (!ids.has('promptDNA'))     additions.push({ id: 'promptDNA',     type: 'promptDNA',     position: { x: 290,  y: 700 }, data: {} });
      return additions.length ? [...prev, ...additions] : prev;
    });
  }, [setNodes, activeFormat, clientProfile]);

  const editTrigger = useCallback(() => {
    setTriggerConfirmed(false);
    setCopyApproved(false);
    setArteApproved(false);
    setArteImageUrl(null);
    setArteImageUrls([]);
    setArtDirLayout(null);
    // Remove copy + arte + export — copy must be regenerated with the new trigger
    setNodes((prev) => prev.filter((n) => !['copy', 'learningRules', 'formatHints', 'personasDNA', 'brandVoice', 'promptDNA', 'arte', 'export'].includes(n.id)));
  }, [setNodes]);

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
    // Progressive reveal: inject ExportNode
    setNodes((prev) => {
      if (prev.some((n) => n.id === 'export')) return prev;
      return [...prev, { id: 'export', type: 'export', position: { x: 1440, y: 160 }, data: { entering: true } }];
    });
  }, [setNodes]);

  const editArte = useCallback(() => {
    setArteApproved(false);
    setArteImageUrl(null);
    setArteImageUrls([]);
    setArtDirLayout(null);
  }, []);

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
    if (!briefingConfirmed || !briefing) return;
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
  }, [briefingConfirmed]);

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

  // ── Context value ───────────────────────────────────────────────────────────
  const ctxValue: PipelineContextValue = {
    briefing, activeFormat, clientBrandColor,
    briefingConfirmed, confirmBriefing,
    tone, setTone, amd, setAmd,
    funnelPhase, setFunnelPhase,
    ocasiao, setOcasiao, ocasiaoConfirmed, confirmOcasiao,
    copyGenerating, copyOptions, selectedCopyIdx, setSelectedCopyIdx,
    copyApproved, copyVersionId, copyError,
    handleGenerateCopy, rerunCopy, approveCopy, editCopy,
    copyIsStale,
    selectedTrigger, setSelectedTrigger, triggerConfirmed, confirmTrigger, editTrigger,
    arteGenerating, artDirLayout, arteImageUrl, arteImageUrls,
    selectedArteIdx, setSelectedArteIdx,
    arteApproved, arteError, handleGenerateArte, useArte, editArte,
    nodeStatus,
    recommendations,
    triggerRanking,
    suggestedRecipes,
    saveRecipe,
    applyRecipe,
    learningRulesCount,
    activeNodeIds: nodes.map((n) => n.id),
    addOptionalNode,
    copyChainResult,
    copyChainStep,
    handleGenerateCopyChain,
    arteChainResult,
    arteChainStep,
    handleGenerateArteChain,
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
            style={{ background: '#0d0d0d' }}
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

          {/* Director panel (floating bottom-center) */}
          <Box sx={{
            position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
            zIndex: 10,
          }}>
            <DirectorNode
              insights={directorInsights}
              analyzing={directorAnalyzing}
              status={directorInsights.length > 0 ? 'active' : 'locked'}
            />
          </Box>

          {/* Add Node FAB (floating bottom-left) */}
          <Box sx={{ position: 'absolute', bottom: 16, left: 16, zIndex: 10 }}>
            <AddNodePanel
              activeNodeIds={new Set(nodes.map((n) => n.id))}
              onAddNode={addOptionalNode}
            />
          </Box>
        </Box>

        {/* Live Preview — 38% */}
        <Box sx={{ flex: '0 0 38%', height: '100%', overflow: 'hidden' }}>
          <PreviewPanel />
        </Box>
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
