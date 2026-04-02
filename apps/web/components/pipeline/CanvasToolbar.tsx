'use client';
import { useEffect, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import {
  IconCursorText, IconHandStop, IconMapPin,
  IconPlus, IconSquare, IconCircle, IconTriangle, IconStar,
  IconTypography, IconPencil, IconVector,
  IconPhoto, IconVideo,
  IconX, IconCheck,
  IconLayersLinked, IconTestPipe, IconMovie, IconMail,
  IconCalendar, IconChartBar, IconBrain, IconShieldCheck,
  IconUpload,
} from '@tabler/icons-react';
import { usePipeline } from './PipelineContext';

// ── Node categories (mirrors AddNodePanel) ─────────────────────────────────────

const NODE_CATEGORIES = [
  {
    label: 'QA & Revisão',
    items: [
      { id: 'critica', label: 'Agente Crítico', description: 'Auto-revisão da copy', icon: <IconShieldCheck size={14} />, color: '#EF4444' },
    ],
  },
  {
    label: 'Variantes',
    items: [
      { id: 'multiFormat', label: 'Multi-Formato', description: 'Múltiplas plataformas', icon: <IconLayersLinked size={14} />, color: '#F97316' },
      { id: 'abTest',      label: 'Teste A/B',    description: 'Split de audiência',    icon: <IconTestPipe size={14} />,    color: '#F97316' },
    ],
  },
  {
    label: 'Conteúdo',
    items: [
      { id: 'videoScript', label: 'Roteiro de Vídeo', description: 'Roteiro em cenas para vídeo social', icon: <IconMovie size={14} />, color: '#A855F7' },
    ],
  },
  {
    label: 'Distribuição',
    items: [
      { id: 'approval', label: 'Aprovação',  description: 'Enviar para aprovação', icon: <IconMail size={14} />,     color: '#7C3AED' },
      { id: 'schedule', label: 'Agendar',    description: 'Data/hora de publicação', icon: <IconCalendar size={14} />, color: '#7C3AED' },
    ],
  },
  {
    label: 'Analytics',
    items: [
      { id: 'performance',       label: 'Performance', description: 'Métricas pós-publicação', icon: <IconChartBar size={14} />, color: '#0EA5E9' },
      { id: 'learningFeedback',  label: 'Fechar Loop', description: 'LearningEngine',           icon: <IconBrain size={14} />,   color: '#0EA5E9' },
    ],
  },
];

// ── Types ──────────────────────────────────────────────────────────────────────

type FlyoutId = 'select' | 'add' | 'shapes' | 'text' | 'draw' | null;
type InteractionMode = 'select' | 'hand' | 'draw';

interface CanvasToolbarProps {
  interactionMode: InteractionMode;
  setInteractionMode: (mode: InteractionMode) => void;
  addAnnotationNode: (shape: 'rect' | 'circle' | 'triangle' | 'star' | 'note', screenPos?: { x: number; y: number }) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onExport?: () => Promise<void> | void;
}

// ── Flyout wrapper ─────────────────────────────────────────────────────────────

function Flyout({ children, top = 0 }: { children: React.ReactNode; top?: number }) {
  return (
    <Box sx={{
      position: 'absolute',
      top,
      left: 52,
      bgcolor: '#111',
      border: '1px solid #2a2a2a',
      borderRadius: 2,
      boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
      zIndex: 200,
      minWidth: 200,
      overflow: 'hidden',
    }}>
      {children}
    </Box>
  );
}

// ── Shortcut badge ─────────────────────────────────────────────────────────────

function Kbd({ children }: { children: string }) {
  return (
    <Typography component="span" sx={{
      fontSize: '0.48rem', color: '#555', ml: 'auto',
      bgcolor: '#1e1e1e', border: '1px solid #333',
      borderRadius: 0.5, px: 0.5, py: 0.1, lineHeight: 1.6,
    }}>
      {children}
    </Typography>
  );
}

// ── Tool button ────────────────────────────────────────────────────────────────

function ToolBtn({
  icon, active, pulse, tooltip,
  onClick,
}: {
  icon: React.ReactNode;
  active?: boolean;
  pulse?: boolean;
  tooltip: string;
  onClick: () => void;
}) {
  return (
    <Tooltip title={tooltip} placement="right" arrow>
      <Box
        onClick={onClick}
        sx={{
          width: 38, height: 38,
          borderRadius: 1.5,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer',
          bgcolor: active ? 'rgba(93,135,255,0.15)' : 'transparent',
          color: active ? '#5D87FF' : '#666',
          border: active ? '1px solid rgba(93,135,255,0.3)' : '1px solid transparent',
          transition: 'all 0.15s',
          position: 'relative',
          ...(pulse && {
            '&::after': {
              content: '""',
              position: 'absolute',
              inset: -2,
              borderRadius: 1.75,
              border: '1.5px solid #5D87FF',
              animation: 'toolPulse 1.5s infinite',
            },
            '@keyframes toolPulse': {
              '0%, 100%': { opacity: 0.5, transform: 'scale(1)' },
              '50%': { opacity: 1, transform: 'scale(1.08)' },
            },
          }),
          '&:hover': {
            bgcolor: active ? 'rgba(93,135,255,0.2)' : 'rgba(255,255,255,0.05)',
            color: active ? '#5D87FF' : '#aaa',
          },
        }}
      >
        {icon}
      </Box>
    </Tooltip>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function CanvasToolbar({ interactionMode, setInteractionMode, addAnnotationNode }: CanvasToolbarProps) {
  const {
    handleGenerateArteChain, arteGenerating,
    addOptionalNode, activeNodeIds,
  } = usePipeline();

  const [openFlyout, setOpenFlyout] = useState<FlyoutId>(null);
  const [imgGenPulse, setImgGenPulse] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close flyout on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpenFlyout(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Skip if typing in an input/textarea
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if (e.key === 'v' || e.key === 'V') { setInteractionMode('select'); setOpenFlyout(null); }
      if (e.key === 'h' || e.key === 'H') { setInteractionMode('hand');   setOpenFlyout(null); }
      if (e.key === 'd' || e.key === 'D') { setInteractionMode('draw');   setOpenFlyout(null); }
      if (e.key === 'n' || e.key === 'N') { addAnnotationNode('note');    setOpenFlyout(null); }
      if (e.key === 'Escape')             { setInteractionMode('select'); setOpenFlyout(null); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [setInteractionMode]);

  // Sync pulse with arteGenerating
  useEffect(() => {
    setImgGenPulse(arteGenerating);
  }, [arteGenerating]);

  const toggle = (id: FlyoutId) => setOpenFlyout((prev) => prev === id ? null : id);

  const handleImageGen = () => {
    setOpenFlyout(null);
    handleGenerateArteChain({});
  };

  const handleVideoGen = () => {
    setOpenFlyout(null);
    addOptionalNode('videoScript');
  };

  const handleUploadImage = () => {
    fileInputRef.current?.click();
  };

  // ── Flyout content ───────────────────────────────────────────────────────────

  const renderSelectFlyout = () => (
    <Flyout top={0}>
      {[
        { label: 'Select',    icon: <IconCursorText size={14} />, kbd: 'V', action: () => { setInteractionMode('select'); setOpenFlyout(null); }, active: interactionMode === 'select' },
        { label: 'Hand Tool', icon: <IconHandStop size={14} />,   kbd: 'H', action: () => { setInteractionMode('hand');   setOpenFlyout(null); }, active: interactionMode === 'hand' },
        { label: 'Anotação',  icon: <IconPencil size={14} />,     kbd: 'D', action: () => { setInteractionMode('draw');   setOpenFlyout(null); }, active: interactionMode === 'draw' },
        { label: 'Mark',      icon: <IconMapPin size={14} />,     kbd: 'M', action: () => setOpenFlyout(null),           active: false },
      ].map((item) => (
        <Stack key={item.label} direction="row" spacing={1} alignItems="center"
          onClick={item.action}
          sx={{
            px: 1.5, py: 0.875, cursor: 'pointer',
            bgcolor: item.active ? 'rgba(93,135,255,0.08)' : 'transparent',
            '&:hover': { bgcolor: 'rgba(255,255,255,0.04)' },
          }}
        >
          <Box sx={{ color: item.active ? '#5D87FF' : '#666', display: 'flex' }}>{item.icon}</Box>
          <Typography sx={{ fontSize: '0.63rem', color: item.active ? '#5D87FF' : 'text.secondary', flex: 1 }}>
            {item.label}
          </Typography>
          {item.active && <IconCheck size={10} color="#5D87FF" />}
          <Kbd>{item.kbd}</Kbd>
        </Stack>
      ))}
    </Flyout>
  );

  const renderAddFlyout = () => (
    <Flyout top={44}>
      <Box sx={{ px: 1.5, py: 0.875, borderBottom: '1px solid #1e1e1e' }}>
        <Typography sx={{ fontSize: '0.58rem', color: '#555', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Add to Canvas
        </Typography>
      </Box>

      {[
        { label: 'Upload Image', icon: <IconUpload size={14} />, action: handleUploadImage, color: '#5D87FF' },
        { label: 'Upload Video', icon: <IconVideo size={14} />,  action: handleVideoGen,    color: '#A855F7' },
      ].map((item) => (
        <Stack key={item.label} direction="row" spacing={1} alignItems="center"
          onClick={item.action}
          sx={{
            px: 1.5, py: 0.875, cursor: 'pointer',
            '&:hover': { bgcolor: 'rgba(255,255,255,0.04)' },
          }}
        >
          <Box sx={{ color: item.color, display: 'flex' }}>{item.icon}</Box>
          <Typography sx={{ fontSize: '0.63rem', color: 'text.secondary', flex: 1 }}>{item.label}</Typography>
        </Stack>
      ))}

      <Divider sx={{ borderColor: '#1e1e1e' }} />

      {/* Add Node section — embedded categories */}
      <Box sx={{ px: 1.5, pt: 0.875, pb: 0.5 }}>
        <Typography sx={{ fontSize: '0.52rem', color: '#555', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', mb: 0.625 }}>
          Add Node
        </Typography>
      </Box>
      <Box sx={{ maxHeight: 260, overflowY: 'auto', pb: 0.5 }}>
        {NODE_CATEGORIES.map((cat) => (
          <Box key={cat.label} sx={{ px: 1.5, pb: 0.75 }}>
            <Typography sx={{ fontSize: '0.48rem', color: '#444', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', mb: 0.5 }}>
              {cat.label}
            </Typography>
            {cat.items.map((item) => {
              const added = activeNodeIds.includes(item.id);
              return (
                <Stack key={item.id} direction="row" spacing={0.75} alignItems="center"
                  onClick={() => { if (!added) { addOptionalNode(item.id); setOpenFlyout(null); } }}
                  sx={{
                    py: 0.5, px: 0.5, borderRadius: 1, cursor: added ? 'default' : 'pointer',
                    opacity: added ? 0.4 : 1,
                    '&:hover': added ? {} : { bgcolor: 'rgba(255,255,255,0.04)' },
                  }}
                >
                  <Box sx={{ color: item.color, display: 'flex', flexShrink: 0 }}>{item.icon}</Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontSize: '0.6rem', color: 'text.secondary', lineHeight: 1.3 }}>
                      {item.label}
                      {added && <Typography component="span" sx={{ fontSize: '0.5rem', color: '#555', ml: 0.5 }}>· adicionado</Typography>}
                    </Typography>
                  </Box>
                </Stack>
              );
            })}
          </Box>
        ))}
      </Box>
    </Flyout>
  );

  const renderShapesFlyout = () => {
    const SHAPES: { shape: 'rect' | 'circle' | 'triangle' | 'star'; icon: React.ReactNode; label: string; color: string }[] = [
      { shape: 'rect',     icon: <IconSquare size={18} />,   label: 'Retângulo', color: 'rgba(255,220,60,0.7)' },
      { shape: 'circle',   icon: <IconCircle size={18} />,   label: 'Círculo',   color: 'rgba(93,135,255,0.7)' },
      { shape: 'triangle', icon: <IconTriangle size={18} />, label: 'Triângulo', color: 'rgba(249,115,22,0.7)' },
      { shape: 'star',     icon: <IconStar size={18} />,     label: 'Destaque',  color: 'rgba(168,85,247,0.7)' },
    ];
    return (
      <Flyout top={88}>
        <Box sx={{ px: 1.5, py: 0.875 }}>
          <Typography sx={{ fontSize: '0.52rem', color: '#555', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', mb: 0.875 }}>
            Shapes — Anotações
          </Typography>
          <Stack direction="row" spacing={0.75} mb={0.5}>
            {SHAPES.map(({ shape, icon, label, color }) => (
              <Tooltip key={shape} title={label} placement="top">
                <Box
                  onClick={() => { addAnnotationNode(shape); setOpenFlyout(null); }}
                  sx={{
                    width: 36, height: 36, borderRadius: 1.5, cursor: 'pointer',
                    border: `1px solid ${color.replace('0.7', '0.3')}`,
                    bgcolor: color.replace('0.7', '0.08'),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color,
                    transition: 'all 0.12s',
                    '&:hover': { bgcolor: color.replace('0.7', '0.18'), transform: 'scale(1.08)' },
                  }}
                >
                  {icon}
                </Box>
              </Tooltip>
            ))}
          </Stack>
          <Typography sx={{ fontSize: '0.5rem', color: '#444', mt: 0.75 }}>
            Clique para adicionar ao canvas · duplo clique para editar
          </Typography>
        </Box>
      </Flyout>
    );
  };

  const renderDrawFlyout = () => (
    <Flyout top={176}>
      {/* Pencil — activates draw mode (crosshair cursor, click canvas to place note) */}
      <Stack direction="row" spacing={1} alignItems="center"
        onClick={() => { setInteractionMode('draw'); setOpenFlyout(null); }}
        sx={{
          px: 1.5, py: 0.875, cursor: 'pointer',
          bgcolor: interactionMode === 'draw' ? 'rgba(93,135,255,0.08)' : 'transparent',
          '&:hover': { bgcolor: 'rgba(255,255,255,0.04)' },
        }}
      >
        <IconPencil size={14} color={interactionMode === 'draw' ? '#5D87FF' : '#666'} />
        <Typography sx={{ fontSize: '0.63rem', color: interactionMode === 'draw' ? '#5D87FF' : 'text.secondary', flex: 1 }}>
          Anotação
        </Typography>
        {interactionMode === 'draw' && <IconCheck size={10} color="#5D87FF" />}
        <Kbd>D</Kbd>
      </Stack>
      {/* Add Note shortcut */}
      <Stack direction="row" spacing={1} alignItems="center"
        onClick={() => { addAnnotationNode('note'); setOpenFlyout(null); }}
        sx={{
          px: 1.5, py: 0.875, cursor: 'pointer',
          '&:hover': { bgcolor: 'rgba(255,255,255,0.04)' },
        }}
      >
        <IconVector size={14} color="#666" />
        <Typography sx={{ fontSize: '0.63rem', color: 'text.secondary', flex: 1 }}>
          Nova Nota
        </Typography>
        <Kbd>N</Kbd>
      </Stack>
    </Flyout>
  );

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <Box ref={containerRef} sx={{ position: 'absolute', top: 80, left: 16, zIndex: 20 }}>
      {/* Hidden file input for upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        title="Upload image as visual reference"
        aria-label="Upload image as visual reference"
        className="sr-only"
        onChange={(e) => {
          // For now just close — future: add as visual reference
          setOpenFlyout(null);
          e.target.value = '';
        }}
      />

      {/* Pill container */}
      <Box sx={{
        bgcolor: '#111',
        border: '1px solid #222',
        borderRadius: 3,
        p: 0.75,
        display: 'flex',
        flexDirection: 'column',
        gap: 0.25,
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
      }}>
        {/* SELECT */}
        <ToolBtn
          icon={<IconCursorText size={17} />}
          active={openFlyout === 'select' || (openFlyout === null && interactionMode !== null)}
          tooltip={interactionMode === 'hand' ? 'Hand Tool (H)' : interactionMode === 'draw' ? 'Anotação (D)' : 'Select (V)'}
          onClick={() => toggle('select')}
        />

        {/* ADD */}
        <ToolBtn
          icon={<IconPlus size={17} />}
          active={openFlyout === 'add'}
          tooltip="Add to Canvas"
          onClick={() => toggle('add')}
        />

        {/* SHAPES */}
        <ToolBtn
          icon={<IconSquare size={17} />}
          active={openFlyout === 'shapes'}
          tooltip="Shapes"
          onClick={() => toggle('shapes')}
        />

        {/* Separator */}
        <Box sx={{ height: 1, bgcolor: '#222', mx: 0.25, my: 0.25 }} />

        {/* TEXT */}
        <Tooltip title="Text  T" placement="right" arrow>
          <Box
            onClick={() => setOpenFlyout(null)}
            sx={{
              width: 38, height: 38, borderRadius: 1.5,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'not-allowed', color: '#444',
              border: '1px solid transparent',
              opacity: 0.5,
            }}
          >
            <IconTypography size={17} />
          </Box>
        </Tooltip>

        {/* DRAW */}
        <ToolBtn
          icon={<IconPencil size={17} />}
          active={openFlyout === 'draw' || interactionMode === 'draw'}
          tooltip="Anotação  D"
          onClick={() => toggle('draw')}
        />

        {/* Separator */}
        <Box sx={{ height: 1, bgcolor: '#222', mx: 0.25, my: 0.25 }} />

        {/* IMAGE GENERATOR */}
        <ToolBtn
          icon={<IconPhoto size={17} />}
          active={arteGenerating}
          pulse={imgGenPulse}
          tooltip="Image Generator  A"
          onClick={handleImageGen}
        />

        {/* VIDEO GENERATOR */}
        <ToolBtn
          icon={<IconVideo size={17} />}
          tooltip="Video Generator"
          onClick={handleVideoGen}
        />
      </Box>

      {/* Flyouts */}
      {openFlyout === 'select' && renderSelectFlyout()}
      {openFlyout === 'add'    && renderAddFlyout()}
      {openFlyout === 'shapes' && renderShapesFlyout()}
      {openFlyout === 'draw'   && renderDrawFlyout()}
    </Box>
  );
}
