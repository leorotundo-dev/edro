'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import TextField from '@mui/material/TextField';
import Chip from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import {
  IconArrowLeft, IconArrowRight, IconBolt, IconBrain, IconCheck, IconChevronLeft,
  IconCopy, IconDownload, IconFileText, IconLayoutGrid, IconMicrophone2,
  IconPencil, IconPhoto, IconRefresh, IconSend, IconSparkles, IconWand,
  IconCalendar,
} from '@tabler/icons-react';
import { apiGet, apiPost, buildApiUrl } from '@/lib/api';

// ── Types ───────────────────────────────────────────────────────────────────

type FlowBriefing = {
  id: string;
  title: string;
  client_name?: string | null;
  payload?: Record<string, any>;
};

type CopyVariant = {
  appeal: string;
  title: string;
  body: string;
  cta: string;
  legenda: string;
  hashtags: string[];
  audit?: { score: number };
};

// ── Constants ────────────────────────────────────────────────────────────────

const STEPS = [
  { id: 0, label: 'Brief',      icon: <IconFileText    size={15} /> },
  { id: 1, label: 'Estratégia', icon: <IconBrain       size={15} /> },
  { id: 2, label: 'Copy',       icon: <IconPencil      size={15} /> },
  { id: 3, label: 'Arte',       icon: <IconPhoto       size={15} /> },
  { id: 4, label: 'Publicar',   icon: <IconSend        size={15} /> },
];

const TRIGGERS = [
  { id: 'G01', label: 'Escassez',      emoji: '⏳', desc: 'Urgência, tempo limitado, últimas vagas' },
  { id: 'G02', label: 'Autoridade',    emoji: '🏆', desc: 'Credenciais, prêmios, especialistas' },
  { id: 'G03', label: 'Prova Social',  emoji: '👥', desc: 'Depoimentos, números, quem já usa' },
  { id: 'G04', label: 'Reciprocidade', emoji: '🎁', desc: 'Ofereça valor antes de pedir algo' },
  { id: 'G05', label: 'Curiosidade',   emoji: '🔍', desc: 'Incomplete loop, segredo, mistério' },
  { id: 'G06', label: 'Identidade',    emoji: '🪞', desc: 'Pertencimento, "quem você é"' },
  { id: 'G07', label: 'Dor/Solução',   emoji: '💊', desc: 'Nomeia o problema, oferece alívio' },
];

const PLATFORMS = ['Instagram', 'LinkedIn', 'TikTok', 'Facebook', 'Twitter'];

const FORMATS: Record<string, string[]> = {
  Instagram: ['Feed', 'Story', 'Reels', 'Carrossel'],
  LinkedIn:  ['Post', 'Artigo', 'Carrossel'],
  TikTok:    ['Vídeo', 'Story'],
  Facebook:  ['Feed', 'Story', 'Reels'],
  Twitter:   ['Tweet', 'Thread'],
};

const ARTE_STEPS = ['', 'Analisando marca…', 'Construindo prompt…', 'Gerando imagem…', 'Avaliando qualidade…', 'Ajustando alinhamento…', 'Formatando versões…'];

// ── Sub-components ───────────────────────────────────────────────────────────

function StepBar({ step, maxReached, onStep }: { step: number; maxReached: number; onStep: (s: number) => void }) {
  return (
    <Stack direction="row" alignItems="center" spacing={0} sx={{ px: 3, py: 2, gap: 0 }}>
      {STEPS.map((s, i) => {
        const done    = i < step;
        const active  = i === step;
        const reachable = i <= maxReached;
        const color   = done ? '#13DEB9' : active ? '#E85219' : '#333';
        return (
          <Stack key={s.id} direction="row" alignItems="center" sx={{ flex: i < STEPS.length - 1 ? 1 : 'none' }}>
            <Tooltip title={reachable ? s.label : ''} placement="bottom">
              <Box
                onClick={() => reachable && onStep(i)}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 0.6,
                  px: 1.25, py: 0.6, borderRadius: 2,
                  cursor: reachable ? 'pointer' : 'default',
                  border: `1px solid ${active ? '#E85219' : done ? '#13DEB930' : '#1e1e1e'}`,
                  bgcolor: active ? 'rgba(232,82,25,0.08)' : done ? 'rgba(19,222,185,0.04)' : 'transparent',
                  transition: 'all 0.2s',
                  '&:hover': reachable && !active ? { borderColor: '#333', bgcolor: '#111' } : {},
                  flexShrink: 0,
                }}
              >
                <Box sx={{ color, display: 'flex' }}>
                  {done ? <IconCheck size={14} /> : s.icon}
                </Box>
                <Typography sx={{ fontSize: '0.7rem', fontWeight: active ? 700 : 500, color: active ? '#E85219' : done ? '#13DEB9' : '#555' }}>
                  {s.label}
                </Typography>
              </Box>
            </Tooltip>
            {i < STEPS.length - 1 && (
              <Box sx={{ flex: 1, height: 1, bgcolor: done ? '#13DEB930' : '#1a1a1a', mx: 0.5 }} />
            )}
          </Stack>
        );
      })}
    </Stack>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Typography sx={{ fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#444', fontWeight: 700, mb: 1.5 }}>
      {children}
    </Typography>
  );
}

// ── Step 0 — Brief ───────────────────────────────────────────────────────────

function BriefStep({
  briefing, platform, setPlatform, format, setFormat,
}: {
  briefing: FlowBriefing | null;
  platform: string; setPlatform: (p: string) => void;
  format: string;   setFormat:   (f: string) => void;
}) {
  const formats = FORMATS[platform] ?? ['Feed'];

  return (
    <Box sx={{ maxWidth: 640, mx: 'auto', px: 3, py: 4 }}>
      {/* Briefing card */}
      {briefing && (
        <Box sx={{ p: 3, borderRadius: 3, border: '1px solid #1e1e1e', bgcolor: '#0f0f0f', mb: 3 }}>
          <Stack direction="row" spacing={1.5} alignItems="flex-start">
            <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: 'rgba(232,82,25,0.1)', border: '1px solid rgba(232,82,25,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <IconFileText size={20} color="#E85219" />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: '#eee', mb: 0.5 }}>
                {briefing.title}
              </Typography>
              {briefing.client_name && (
                <Typography sx={{ fontSize: '0.72rem', color: '#555' }}>{briefing.client_name}</Typography>
              )}
              {briefing.payload?.objective && (
                <Typography sx={{ fontSize: '0.75rem', color: '#888', mt: 1, lineHeight: 1.6 }}>
                  {briefing.payload.objective}
                </Typography>
              )}
            </Box>
          </Stack>
        </Box>
      )}

      {/* Platform */}
      <SectionLabel>Plataforma</SectionLabel>
      <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 3 }}>
        {PLATFORMS.map((p) => (
          <Box
            key={p}
            onClick={() => { setPlatform(p); setFormat(FORMATS[p]?.[0] ?? 'Feed'); }}
            sx={{
              px: 1.5, py: 0.75, borderRadius: 2, cursor: 'pointer',
              border: `1px solid ${platform === p ? '#E85219' : '#1e1e1e'}`,
              bgcolor: platform === p ? 'rgba(232,82,25,0.08)' : '#0f0f0f',
              transition: 'all 0.15s',
            }}
          >
            <Typography sx={{ fontSize: '0.75rem', fontWeight: platform === p ? 700 : 400, color: platform === p ? '#E85219' : '#666' }}>
              {p}
            </Typography>
          </Box>
        ))}
      </Stack>

      {/* Format */}
      <SectionLabel>Formato</SectionLabel>
      <Stack direction="row" spacing={1} flexWrap="wrap">
        {formats.map((f) => (
          <Box
            key={f}
            onClick={() => setFormat(f)}
            sx={{
              px: 1.5, py: 0.75, borderRadius: 2, cursor: 'pointer',
              border: `1px solid ${format === f ? '#5D87FF' : '#1e1e1e'}`,
              bgcolor: format === f ? 'rgba(93,135,255,0.08)' : '#0f0f0f',
              transition: 'all 0.15s',
            }}
          >
            <Typography sx={{ fontSize: '0.75rem', fontWeight: format === f ? 700 : 400, color: format === f ? '#5D87FF' : '#666' }}>
              {f}
            </Typography>
          </Box>
        ))}
      </Stack>
    </Box>
  );
}

// ── Step 1 — Estratégia ──────────────────────────────────────────────────────

function EstrategiaStep({
  trigger, setTrigger, freePrompt, setFreePrompt,
}: {
  trigger: string | null;     setTrigger:    (t: string | null) => void;
  freePrompt: string;         setFreePrompt: (p: string) => void;
}) {
  return (
    <Box sx={{ maxWidth: 720, mx: 'auto', px: 3, py: 4 }}>
      {/* Trigger grid */}
      <SectionLabel>Gatilho Psicológico</SectionLabel>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 1.5, mb: 4 }}>
        {TRIGGERS.map((t) => {
          const sel = trigger === t.id;
          return (
            <Box
              key={t.id}
              onClick={() => setTrigger(sel ? null : t.id)}
              sx={{
                p: 1.75, borderRadius: 2.5, cursor: 'pointer',
                border: `1.5px solid ${sel ? '#E85219' : '#1e1e1e'}`,
                bgcolor: sel ? 'rgba(232,82,25,0.06)' : '#0f0f0f',
                transition: 'all 0.18s',
                '&:hover': { borderColor: sel ? '#E85219' : '#2a2a2a', bgcolor: sel ? 'rgba(232,82,25,0.08)' : '#111' },
              }}
            >
              <Typography sx={{ fontSize: '1.4rem', mb: 0.75, lineHeight: 1 }}>{t.emoji}</Typography>
              <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: sel ? '#E85219' : '#ccc', mb: 0.4 }}>
                {t.label}
              </Typography>
              <Typography sx={{ fontSize: '0.65rem', color: '#555', lineHeight: 1.5 }}>
                {t.desc}
              </Typography>
              {sel && (
                <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <IconCheck size={11} color="#E85219" />
                  <Typography sx={{ fontSize: '0.6rem', color: '#E85219', fontWeight: 700 }}>Selecionado</Typography>
                </Box>
              )}
            </Box>
          );
        })}
      </Box>

      {/* Free Prompt — o diferencial */}
      <Box sx={{ borderRadius: 2.5, border: '1.5px solid #1e1e1e', bgcolor: '#0f0f0f', overflow: 'hidden' }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ px: 2, py: 1.25, borderBottom: '1px solid #1a1a1a' }}>
          <IconWand size={15} color="#A855F7" />
          <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: '#A855F7' }}>
            Prompt Livre
          </Typography>
          <Typography sx={{ fontSize: '0.62rem', color: '#444', ml: 0.5 }}>
            · escreva qualquer instrução, contexto ou referência
          </Typography>
        </Stack>
        <TextField
          multiline
          rows={5}
          fullWidth
          value={freePrompt}
          onChange={(e) => setFreePrompt(e.target.value)}
          placeholder={`Ex: "Quero um tom mais jovem, referência à cultura do surf, evitar fotos de estúdio. A campanha é para o verão, lançamento dia 20."`}
          variant="standard"
          InputProps={{ disableUnderline: true }}
          sx={{
            '& .MuiInputBase-root': { p: 0 },
            '& textarea': {
              p: 2, fontSize: '0.78rem', color: '#ccc', lineHeight: 1.7,
              bgcolor: 'transparent', resize: 'none',
              '&::placeholder': { color: '#333' },
            },
          }}
        />
        <Stack direction="row" justifyContent="flex-end" alignItems="center" sx={{ px: 2, py: 1, borderTop: '1px solid #1a1a1a' }}>
          <Typography sx={{ fontSize: '0.6rem', color: '#333' }}>
            {freePrompt.length} caracteres
          </Typography>
        </Stack>
      </Box>
    </Box>
  );
}

// ── Step 2 — Copy ────────────────────────────────────────────────────────────

const APPEAL_LABELS: Record<string, string> = { dor: 'Dor → Solução', logica: 'Lógica', prova_social: 'Prova Social' };
const APPEAL_COLORS: Record<string, string> = { dor: '#E85219', logica: '#5D87FF', prova_social: '#13DEB9' };

function CopyStep({
  variants, selected, setSelected, generating, copyStep, error, onGenerate, onRegenerate,
}: {
  variants: CopyVariant[];
  selected: number;
  setSelected: (i: number) => void;
  generating: boolean;
  copyStep: number;
  error: string;
  onGenerate: () => void;
  onRegenerate: () => void;
}) {
  const COPY_STEPS = ['', 'Analisando voz da marca…', 'Definindo estratégia…', 'Gerando variantes…', 'Auditando qualidade…', 'Finalizando…'];

  if (generating) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 3 }}>
        <Box sx={{ position: 'relative', width: 80, height: 80 }}>
          <CircularProgress size={80} thickness={1.5} sx={{ color: '#E85219', opacity: 0.2, position: 'absolute' }} variant="determinate" value={100} />
          <CircularProgress size={80} thickness={1.5} sx={{ color: '#E85219', position: 'absolute' }} />
          <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IconPencil size={28} color="#E85219" />
          </Box>
        </Box>
        <Box sx={{ textAlign: 'center' }}>
          <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: '#ccc', mb: 0.5 }}>
            {COPY_STEPS[copyStep] || 'Agente Redator trabalhando…'}
          </Typography>
          <Typography sx={{ fontSize: '0.7rem', color: '#444' }}>Plugin {copyStep}/5</Typography>
        </Box>
        <Stack direction="row" spacing={0.75}>
          {[1, 2, 3, 4, 5].map((i) => (
            <Box key={i} sx={{
              width: 28, height: 3, borderRadius: 2,
              bgcolor: i <= copyStep ? '#E85219' : '#1e1e1e',
              transition: 'background 0.4s',
            }} />
          ))}
        </Stack>
      </Box>
    );
  }

  if (!variants.length) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 2 }}>
        <Box sx={{ width: 72, height: 72, borderRadius: 3, bgcolor: 'rgba(232,82,25,0.08)', border: '1px solid rgba(232,82,25,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <IconPencil size={32} color="#E85219" />
        </Box>
        <Box sx={{ textAlign: 'center' }}>
          <Typography sx={{ fontSize: '1rem', fontWeight: 700, color: '#ccc', mb: 0.5 }}>Agente Redator</Typography>
          <Typography sx={{ fontSize: '0.78rem', color: '#555', maxWidth: 360 }}>
            Gera 3 variantes de copy usando voz da marca, gatilho psicológico e seu prompt livre.
          </Typography>
        </Box>
        {error && <Typography sx={{ fontSize: '0.72rem', color: '#FF4D4D', maxWidth: 400, textAlign: 'center' }}>{error}</Typography>}
        <Button
          variant="contained" size="large"
          onClick={onGenerate}
          startIcon={<IconSparkles size={18} />}
          sx={{ bgcolor: '#E85219', color: '#fff', fontWeight: 700, fontSize: '0.88rem', textTransform: 'none', px: 4, py: 1.5, borderRadius: 2.5, '&:hover': { bgcolor: '#c43e10' } }}
        >
          Gerar Copy
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', px: 3, py: 4 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography sx={{ fontSize: '0.72rem', color: '#555' }}>
          {variants.length} variantes geradas · clique para selecionar
        </Typography>
        <Button size="small" onClick={onRegenerate} startIcon={<IconRefresh size={14} />}
          sx={{ textTransform: 'none', fontSize: '0.7rem', color: '#555', '&:hover': { color: '#E85219' } }}>
          Regenerar
        </Button>
      </Stack>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 2 }}>
        {variants.map((v, i) => {
          const sel = selected === i;
          const appealColor = APPEAL_COLORS[v.appeal] ?? '#555';
          return (
            <Box
              key={i}
              onClick={() => setSelected(i)}
              sx={{
                p: 2.5, borderRadius: 3, cursor: 'pointer',
                border: `1.5px solid ${sel ? '#13DEB9' : '#1e1e1e'}`,
                bgcolor: sel ? 'rgba(19,222,185,0.04)' : '#0f0f0f',
                boxShadow: sel ? '0 0 0 3px rgba(19,222,185,0.12)' : 'none',
                transition: 'all 0.2s',
                '&:hover': { borderColor: sel ? '#13DEB9' : '#2a2a2a' },
                position: 'relative',
              }}
            >
              {sel && (
                <Box sx={{ position: 'absolute', top: 12, right: 12, width: 20, height: 20, borderRadius: '50%', bgcolor: '#13DEB9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <IconCheck size={11} color="#000" />
                </Box>
              )}
              <Chip label={APPEAL_LABELS[v.appeal] ?? v.appeal} size="small"
                sx={{ bgcolor: `${appealColor}18`, color: appealColor, fontWeight: 700, fontSize: '0.6rem', height: 20, mb: 1.5 }} />
              <Typography sx={{ fontWeight: 700, fontSize: '0.88rem', color: '#eee', mb: 1, lineHeight: 1.4 }}>
                {v.title}
              </Typography>
              <Typography sx={{ fontSize: '0.75rem', color: '#888', lineHeight: 1.7, mb: 1.5 }}>
                {v.body}
              </Typography>
              <Box sx={{ display: 'inline-flex', px: 1.25, py: 0.4, borderRadius: 1.5, bgcolor: '#1a1a1a', border: '1px solid #2a2a2a' }}>
                <Typography sx={{ fontSize: '0.68rem', color: '#aaa', fontWeight: 600 }}>{v.cta}</Typography>
              </Box>
              {v.audit?.score !== undefined && (
                <Typography sx={{ fontSize: '0.6rem', color: '#444', mt: 1.5 }}>Score {v.audit.score}/10</Typography>
              )}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

// ── Step 3 — Arte ────────────────────────────────────────────────────────────

function ArteStep({
  imageUrls, selected, setSelected, generating, arteStep, error, onGenerate, onRegenerate,
}: {
  imageUrls: string[];
  selected: string | null;
  setSelected: (url: string) => void;
  generating: boolean;
  arteStep: number;
  error: string;
  onGenerate: () => void;
  onRegenerate: () => void;
}) {
  if (generating) {
    const progress = arteStep > 0 ? (arteStep / 6) * 100 : 5;
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 480, gap: 3 }}>
        <Box sx={{ position: 'relative', width: 96, height: 96 }}>
          <CircularProgress size={96} thickness={1} sx={{ color: '#5D87FF', opacity: 0.15, position: 'absolute' }} variant="determinate" value={100} />
          <CircularProgress size={96} thickness={1} sx={{ color: '#5D87FF', position: 'absolute' }} variant="determinate" value={progress} />
          <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IconPhoto size={36} color="#5D87FF" />
          </Box>
        </Box>
        <Box sx={{ textAlign: 'center' }}>
          <Typography sx={{ fontSize: '0.9rem', fontWeight: 700, color: '#ccc', mb: 0.5 }}>
            {ARTE_STEPS[arteStep] || 'Agente Diretor de Arte…'}
          </Typography>
          <Typography sx={{ fontSize: '0.72rem', color: '#444' }}>Plugin {arteStep}/6</Typography>
        </Box>
        <Stack direction="row" spacing={0.75}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Box key={i} sx={{
              width: 24, height: 3, borderRadius: 2,
              bgcolor: i <= arteStep ? '#5D87FF' : '#1e1e1e',
              transition: 'background 0.4s',
            }} />
          ))}
        </Stack>
      </Box>
    );
  }

  if (!imageUrls.length) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 480, gap: 2 }}>
        <Box sx={{ width: 80, height: 80, borderRadius: 3, bgcolor: 'rgba(93,135,255,0.08)', border: '1px solid rgba(93,135,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <IconPhoto size={38} color="#5D87FF" />
        </Box>
        <Box sx={{ textAlign: 'center' }}>
          <Typography sx={{ fontSize: '1rem', fontWeight: 700, color: '#ccc', mb: 0.5 }}>Agente Diretor de Arte</Typography>
          <Typography sx={{ fontSize: '0.78rem', color: '#555', maxWidth: 380 }}>
            6 plugins especializados: marca, prompt, geração, crítica, alinhamento e formatos.
          </Typography>
        </Box>
        {error && <Typography sx={{ fontSize: '0.72rem', color: '#FF4D4D', maxWidth: 400, textAlign: 'center' }}>{error}</Typography>}
        <Button
          variant="contained" size="large"
          onClick={onGenerate}
          startIcon={<IconSparkles size={18} />}
          sx={{ bgcolor: '#5D87FF', color: '#fff', fontWeight: 700, fontSize: '0.88rem', textTransform: 'none', px: 4, py: 1.5, borderRadius: 2.5, '&:hover': { bgcolor: '#4570ea' } }}
        >
          Gerar Imagem
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', px: 3, py: 4 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography sx={{ fontSize: '0.72rem', color: '#555' }}>
          {imageUrls.length} imagem(ns) gerada(s) · clique para selecionar
        </Typography>
        <Button size="small" onClick={onRegenerate} startIcon={<IconRefresh size={14} />}
          sx={{ textTransform: 'none', fontSize: '0.7rem', color: '#555', '&:hover': { color: '#5D87FF' } }}>
          Regenerar
        </Button>
      </Stack>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 2 }}>
        {imageUrls.map((url, i) => {
          const sel = selected === url;
          return (
            <Box
              key={i}
              onClick={() => setSelected(url)}
              sx={{
                position: 'relative', borderRadius: 3, overflow: 'hidden', cursor: 'pointer',
                border: `2px solid ${sel ? '#13DEB9' : 'transparent'}`,
                boxShadow: sel ? '0 0 0 4px rgba(19,222,185,0.18)' : 'none',
                transition: 'all 0.2s',
                aspectRatio: '1/1',
                '&:hover': { border: `2px solid ${sel ? '#13DEB9' : '#333'}` },
              }}
            >
              <Box
                component="img"
                src={url}
                alt={`Geração ${i + 1}`}
                sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
              {sel && (
                <Box sx={{ position: 'absolute', top: 10, right: 10, width: 26, height: 26, borderRadius: '50%', bgcolor: '#13DEB9', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
                  <IconCheck size={14} color="#000" />
                </Box>
              )}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

// ── Step 4 — Publicar ────────────────────────────────────────────────────────

function PublicarStep({
  copy, imageUrl, platform, briefingId,
}: {
  copy: CopyVariant | null;
  imageUrl: string | null;
  platform: string;
  briefingId: string;
}) {
  const [scheduledAt, setScheduledAt] = useState('');
  const [scheduling, setScheduling] = useState(false);
  const [scheduled, setScheduled] = useState(false);
  const [schedError, setSchedError] = useState('');
  const [copied, setCopied] = useState(false);

  const handleSchedule = async () => {
    if (!scheduledAt) return;
    setScheduling(true);
    setSchedError('');
    try {
      const copyText = copy ? [copy.title, copy.body, copy.cta].filter(Boolean).join(' ') : '';
      await apiPost('/studio/creative/schedule', {
        briefing_id: briefingId,
        platform,
        scheduled_at: new Date(scheduledAt).toISOString(),
        copy_text: copyText,
        image_url: imageUrl ?? undefined,
      });
      setScheduled(true);
    } catch (e: any) {
      setSchedError(e?.message || 'Erro ao agendar.');
    } finally {
      setScheduling(false);
    }
  };

  const handleCopyCopy = () => {
    if (!copy) return;
    const text = [copy.title, copy.body, copy.cta, copy.legenda].filter(Boolean).join('\n\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadImage = () => {
    if (!imageUrl) return;
    const a = document.createElement('a');
    a.href = imageUrl;
    a.download = `arte-${briefingId}.jpg`;
    a.click();
  };

  if (scheduled) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 2 }}>
        <Box sx={{ width: 72, height: 72, borderRadius: '50%', bgcolor: 'rgba(19,222,185,0.1)', border: '1px solid rgba(19,222,185,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <IconCheck size={36} color="#13DEB9" />
        </Box>
        <Typography sx={{ fontSize: '1.1rem', fontWeight: 700, color: '#13DEB9' }}>Publicação agendada</Typography>
        <Typography sx={{ fontSize: '0.78rem', color: '#555' }}>
          {platform} · {new Date(scheduledAt).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', px: 3, py: 4 }}>
      {/* Preview */}
      <Box sx={{ display: 'grid', gridTemplateColumns: imageUrl ? '1fr 1fr' : '1fr', gap: 3, mb: 4 }}>
        {imageUrl && (
          <Box sx={{ borderRadius: 3, overflow: 'hidden', border: '1px solid #1e1e1e', aspectRatio: '1/1' }}>
            <Box component="img" src={imageUrl} alt="Arte" sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          </Box>
        )}
        {copy && (
          <Box sx={{ p: 2.5, borderRadius: 3, border: '1px solid #1e1e1e', bgcolor: '#0f0f0f' }}>
            <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', color: '#eee', mb: 1.5, lineHeight: 1.4 }}>{copy.title}</Typography>
            <Typography sx={{ fontSize: '0.75rem', color: '#888', lineHeight: 1.7, mb: 2 }}>{copy.body}</Typography>
            <Box sx={{ display: 'inline-flex', px: 1.5, py: 0.5, borderRadius: 1.5, bgcolor: '#1a1a1a', border: '1px solid #2a2a2a', mb: 2 }}>
              <Typography sx={{ fontSize: '0.7rem', color: '#aaa', fontWeight: 600 }}>{copy.cta}</Typography>
            </Box>
            {copy.hashtags?.length > 0 && (
              <Typography sx={{ fontSize: '0.65rem', color: '#444', lineHeight: 1.6 }}>
                {copy.hashtags.slice(0, 8).map((h) => `#${h}`).join(' ')}
              </Typography>
            )}
          </Box>
        )}
      </Box>

      {/* Quick actions */}
      <Stack direction="row" spacing={1} mb={4}>
        <Button size="small" startIcon={copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
          onClick={handleCopyCopy} disabled={!copy}
          sx={{ textTransform: 'none', fontSize: '0.72rem', color: '#666', borderColor: '#1e1e1e', '&:hover': { color: '#ccc', borderColor: '#2a2a2a' } }}
          variant="outlined">
          {copied ? 'Copiado!' : 'Copiar texto'}
        </Button>
        <Button size="small" startIcon={<IconDownload size={14} />}
          onClick={handleDownloadImage} disabled={!imageUrl}
          sx={{ textTransform: 'none', fontSize: '0.72rem', color: '#666', borderColor: '#1e1e1e', '&:hover': { color: '#ccc', borderColor: '#2a2a2a' } }}
          variant="outlined">
          Baixar imagem
        </Button>
      </Stack>

      {/* Schedule */}
      <Box sx={{ p: 2.5, borderRadius: 3, border: '1px solid #1e1e1e', bgcolor: '#0f0f0f' }}>
        <Stack direction="row" spacing={1} alignItems="center" mb={2}>
          <IconCalendar size={16} color="#7C3AED" />
          <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: '#ccc' }}>Agendar Publicação</Typography>
        </Stack>
        <Stack direction="row" spacing={2} alignItems="flex-end">
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontSize: '0.6rem', color: '#444', mb: 0.75 }}>Data e hora</Typography>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              style={{
                width: '100%', padding: '8px 12px',
                background: '#1a1a1a', border: '1px solid #2a2a2a',
                borderRadius: 8, color: '#ccc', fontSize: '0.72rem',
                outline: 'none', boxSizing: 'border-box',
              }}
            />
          </Box>
          <Button
            variant="contained"
            onClick={handleSchedule}
            disabled={!scheduledAt || scheduling}
            startIcon={scheduling ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : <IconCalendar size={15} />}
            sx={{ bgcolor: '#7C3AED', color: '#fff', fontWeight: 700, fontSize: '0.78rem', textTransform: 'none', px: 2.5, py: 1, borderRadius: 2, '&:hover': { bgcolor: '#6d28d9' } }}
          >
            {scheduling ? 'Agendando…' : 'Agendar'}
          </Button>
        </Stack>
        {schedError && <Typography sx={{ fontSize: '0.68rem', color: '#FF4D4D', mt: 1 }}>{schedError}</Typography>}
      </Box>
    </Box>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function StudioFlow({ briefingId }: { briefingId: string }) {
  const [step, setStep]             = useState(0);
  const [maxReached, setMaxReached] = useState(0);

  // Briefing
  const [briefing, setBriefing]     = useState<FlowBriefing | null>(null);
  const [loadingBrief, setLoadingBrief] = useState(true);

  // Step 0
  const [platform, setPlatform]     = useState('Instagram');
  const [format, setFormat]         = useState('Feed');

  // Step 1
  const [trigger, setTrigger]       = useState<string | null>(null);
  const [freePrompt, setFreePrompt] = useState('');

  // Step 2 — Copy
  const [copyVariants, setCopyVariants]   = useState<CopyVariant[]>([]);
  const [selectedCopy, setSelectedCopy]   = useState(0);
  const [copyGenerating, setCopyGenerating] = useState(false);
  const [copyStep, setCopyStep]           = useState(0);
  const [copyError, setCopyError]         = useState('');

  // Step 3 — Arte
  const [imageUrls, setImageUrls]         = useState<string[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [arteGenerating, setArteGenerating] = useState(false);
  const [arteStep, setArteStep]           = useState(0);
  const [arteError, setArteError]         = useState('');

  // ── Load briefing ──────────────────────────────────────────────────────────
  useEffect(() => {
    apiGet<{ success: boolean; data: { briefing: FlowBriefing } }>(`/edro/briefings/${briefingId}`)
      .then((res) => { if (res?.data?.briefing) setBriefing(res.data.briefing); })
      .catch(() => {})
      .finally(() => setLoadingBrief(false));
  }, [briefingId]);

  // ── Navigation ─────────────────────────────────────────────────────────────
  const canAdvance = ((): boolean => {
    if (step === 0) return true;
    if (step === 1) return true;
    if (step === 2) return copyVariants.length > 0;
    if (step === 3) return !!selectedImage;
    return false;
  })();

  const goTo = useCallback((s: number) => {
    setStep(s);
    setMaxReached((prev) => Math.max(prev, s));
  }, []);

  const next = () => { if (canAdvance && step < 4) goTo(step + 1); };
  const prev = () => { if (step > 0) goTo(step - 1); };

  // ── Copy generation ────────────────────────────────────────────────────────
  const generateCopy = useCallback(async () => {
    setCopyGenerating(true);
    setCopyStep(1);
    setCopyError('');
    try {
      const briefingPayload = {
        ...(briefing?.payload ?? {}),
        ...(freePrompt.trim() ? { user_instructions: freePrompt.trim() } : {}),
      };
      const res = await apiPost<{ success: boolean; data: { variants: CopyVariant[] } }>(
        '/studio/creative/copy-chain',
        {
          briefing: { title: briefing?.title, payload: briefingPayload },
          trigger: trigger ?? undefined,
          platform,
          format,
          count: 3,
        },
      );
      setCopyStep(5);
      const variants = res?.data?.variants ?? [];
      setCopyVariants(variants);
      setSelectedCopy(0);
    } catch (e: any) {
      setCopyError(e?.message ?? 'Erro ao gerar copy.');
    } finally {
      setCopyGenerating(false);
      setCopyStep(0);
    }
  }, [briefing, freePrompt, trigger, platform, format]);

  // ── Arte generation (SSE) ──────────────────────────────────────────────────
  const EVENT_TO_STEP: Record<string, number> = {
    p0_done: 2, p1_done: 3, p2_done: 4, p3_done: 5, p4_done: 6, p4b_done: 6,
  };

  const generateArte = useCallback(async () => {
    setArteGenerating(true);
    setArteStep(1);
    setArteError('');
    setImageUrls([]);
    setSelectedImage(null);

    try {
      const copy = copyVariants[selectedCopy];
      const copyText = copy ? [copy.title, copy.body, copy.cta].filter(Boolean).join(' ') : '';
      const briefingPayload = {
        ...(briefing?.payload ?? {}),
        ...(freePrompt.trim() ? { user_instructions: freePrompt.trim() } : {}),
      };

      const res = await fetch(buildApiUrl('/studio/creative/arte-chain/stream'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          copy: copyText,
          briefing: { title: briefing?.title, payload: briefingPayload },
          trigger: trigger ?? undefined,
          platform,
          format,
        }),
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
                const result = data.data;
                const urls: string[] = result.imageUrls?.length ? result.imageUrls : result.imageUrl ? [result.imageUrl] : [];
                setImageUrls(urls);
                if (urls[0]) setSelectedImage(urls[0]);
                setArteStep(0);
              } else if (currentEvent === 'error') {
                setArteError(data.error ?? 'Erro no pipeline de arte');
                setArteStep(0);
              } else if (EVENT_TO_STEP[currentEvent]) {
                setArteStep(EVENT_TO_STEP[currentEvent]);
              }
            } catch { /* skip malformed */ }
          }
        }
      }
    } catch (e: any) {
      setArteError(e?.message ?? 'Erro ao gerar imagem.');
      setArteStep(0);
    } finally {
      setArteGenerating(false);
    }
  }, [briefing, freePrompt, trigger, platform, format, copyVariants, selectedCopy]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', bgcolor: '#0a0a0a', overflow: 'hidden' }}>

      {/* Top Bar */}
      <Box sx={{ borderBottom: '1px solid #141414', bgcolor: '#0a0a0a', flexShrink: 0 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 3, py: 1.5 }}>
          <Stack direction="row" alignItems="center" spacing={2}>
            <Tooltip title="Voltar para briefings">
              <IconButton component={Link} href="/studio/brief" size="small" sx={{ color: '#444', '&:hover': { color: '#ccc' } }}>
                <IconChevronLeft size={18} />
              </IconButton>
            </Tooltip>
            <Box>
              <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: '#ccc', lineHeight: 1.2 }}>
                {loadingBrief ? '…' : (briefing?.title ?? 'Studio')}
              </Typography>
              {briefing?.client_name && (
                <Typography sx={{ fontSize: '0.62rem', color: '#444' }}>{briefing.client_name}</Typography>
              )}
            </Box>
          </Stack>

          <Tooltip title="Abrir canvas avançado (ReactFlow)">
            <Button
              component={Link}
              href={`/studio/pipeline/${briefingId}?mode=canvas`}
              size="small"
              startIcon={<IconLayoutGrid size={14} />}
              sx={{ textTransform: 'none', fontSize: '0.68rem', color: '#444', borderColor: '#1e1e1e', '&:hover': { color: '#ccc', borderColor: '#2a2a2a' } }}
              variant="outlined"
            >
              Modo Avançado
            </Button>
          </Tooltip>
        </Stack>

        {/* Step bar */}
        <StepBar step={step} maxReached={maxReached} onStep={goTo} />
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {step === 0 && (
          <BriefStep
            briefing={briefing}
            platform={platform} setPlatform={setPlatform}
            format={format} setFormat={setFormat}
          />
        )}
        {step === 1 && (
          <EstrategiaStep
            trigger={trigger} setTrigger={setTrigger}
            freePrompt={freePrompt} setFreePrompt={setFreePrompt}
          />
        )}
        {step === 2 && (
          <CopyStep
            variants={copyVariants}
            selected={selectedCopy}
            setSelected={setSelectedCopy}
            generating={copyGenerating}
            copyStep={copyStep}
            error={copyError}
            onGenerate={generateCopy}
            onRegenerate={() => { setCopyVariants([]); }}
          />
        )}
        {step === 3 && (
          <ArteStep
            imageUrls={imageUrls}
            selected={selectedImage}
            setSelected={setSelectedImage}
            generating={arteGenerating}
            arteStep={arteStep}
            error={arteError}
            onGenerate={generateArte}
            onRegenerate={() => { setImageUrls([]); setSelectedImage(null); }}
          />
        )}
        {step === 4 && (
          <PublicarStep
            copy={copyVariants[selectedCopy] ?? null}
            imageUrl={selectedImage}
            platform={platform}
            briefingId={briefingId}
          />
        )}
      </Box>

      {/* Bottom Nav */}
      <Box sx={{ borderTop: '1px solid #141414', px: 3, py: 2, flexShrink: 0 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Button
            onClick={prev}
            disabled={step === 0}
            startIcon={<IconArrowLeft size={16} />}
            sx={{ textTransform: 'none', fontSize: '0.78rem', color: step === 0 ? '#222' : '#666', '&:hover': { color: '#ccc' } }}
          >
            Anterior
          </Button>

          <Stack direction="row" spacing={0.75} alignItems="center">
            {STEPS.map((s, i) => (
              <Box key={i} sx={{ width: i === step ? 18 : 6, height: 6, borderRadius: 3, bgcolor: i < step ? '#13DEB9' : i === step ? '#E85219' : '#1e1e1e', transition: 'all 0.25s' }} />
            ))}
          </Stack>

          {step < 4 ? (
            <Button
              onClick={next}
              disabled={!canAdvance}
              endIcon={<IconArrowRight size={16} />}
              variant={canAdvance ? 'contained' : 'text'}
              sx={{
                textTransform: 'none', fontSize: '0.78rem', fontWeight: 700,
                bgcolor: canAdvance ? '#E85219' : 'transparent',
                color: canAdvance ? '#fff' : '#333',
                boxShadow: 'none',
                '&:hover': { bgcolor: '#c43e10', boxShadow: 'none' },
                '&.Mui-disabled': { bgcolor: 'transparent', color: '#222' },
              }}
            >
              {step === 1 && !copyVariants.length ? 'Ir para Copy' : 'Próximo'}
            </Button>
          ) : (
            <Box sx={{ width: 100 }} />
          )}
        </Stack>
      </Box>
    </Box>
  );
}
