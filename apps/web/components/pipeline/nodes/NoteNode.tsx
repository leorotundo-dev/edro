'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { NodeProps, NodeResizer, useReactFlow } from '@xyflow/react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import { IconX, IconGripVertical } from '@tabler/icons-react';

// ── Shape variants ─────────────────────────────────────────────────────────────

const SHAPE_STYLES: Record<string, React.CSSProperties> = {
  rect: {
    borderRadius: 8,
    background: 'rgba(255, 220, 60, 0.10)',
    border: '1.5px solid rgba(255, 220, 60, 0.35)',
  },
  circle: {
    borderRadius: '50%',
    background: 'rgba(93, 135, 255, 0.10)',
    border: '1.5px solid rgba(93, 135, 255, 0.35)',
  },
  triangle: {
    borderRadius: 8,
    background: 'rgba(249, 115, 22, 0.10)',
    border: '1.5px solid rgba(249, 115, 22, 0.35)',
  },
  star: {
    borderRadius: 8,
    background: 'rgba(168, 85, 247, 0.10)',
    border: '1.5px solid rgba(168, 85, 247, 0.35)',
  },
  note: {
    borderRadius: 8,
    background: 'rgba(255, 220, 60, 0.08)',
    border: '1.5px solid rgba(255, 220, 60, 0.25)',
  },
};

const SHAPE_ACCENT: Record<string, string> = {
  rect:     'rgba(255, 220, 60, 0.6)',
  circle:   'rgba(93, 135, 255, 0.6)',
  triangle: 'rgba(249, 115, 22, 0.6)',
  star:     'rgba(168, 85, 247, 0.6)',
  note:     'rgba(255, 220, 60, 0.5)',
};

const SHAPE_LABEL: Record<string, string> = {
  rect:     'Retângulo',
  circle:   'Círculo',
  triangle: 'Triângulo',
  star:     'Destaque',
  note:     'Nota',
};

// ── Component ──────────────────────────────────────────────────────────────────

export default function NoteNode({ id, data, selected }: NodeProps) {
  const shape: string = (data as any).shape ?? 'note';
  const initialText: string = (data as any).text ?? '';

  const { setNodes } = useReactFlow();
  const [text, setText] = useState(initialText);
  const [editing, setEditing] = useState(!initialText);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Focus textarea when entering edit mode
  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [editing]);

  const handleDelete = useCallback(() => {
    setNodes((nds) => nds.filter((n) => n.id !== id));
  }, [id, setNodes]);

  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setText(val);
    setNodes((nds) =>
      nds.map((n) => n.id === id ? { ...n, data: { ...n.data, text: val } } : n)
    );
  }, [id, setNodes]);

  const shapeStyle = SHAPE_STYLES[shape] ?? SHAPE_STYLES.note;
  const accent = SHAPE_ACCENT[shape] ?? SHAPE_ACCENT.note;

  return (
    <Box
      onDoubleClick={() => setEditing(true)}
      sx={{
        minWidth: 160, minHeight: 80,
        width: '100%', height: '100%',
        position: 'relative',
        ...shapeStyle,
        boxShadow: selected ? `0 0 0 2px ${accent}` : 'none',
        transition: 'box-shadow 0.15s',
        overflow: 'hidden',
      }}
    >
      {/* Resize handle */}
      <NodeResizer
        color={accent}
        isVisible={selected}
        minWidth={120}
        minHeight={60}
        lineStyle={{ borderWidth: 1.5 }}
        handleStyle={{ width: 8, height: 8, borderRadius: 2 }}
      />

      {/* Top bar */}
      <Box sx={{
        display: 'flex', alignItems: 'center', gap: 0.5,
        px: 1, pt: 0.5,
        opacity: selected ? 1 : 0,
        transition: 'opacity 0.15s',
      }}>
        <IconGripVertical size={12} color={accent} style={{ cursor: 'grab', flexShrink: 0 }} />
        <Typography sx={{ fontSize: '0.48rem', color: accent, flex: 1, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {SHAPE_LABEL[shape] ?? 'Nota'}
        </Typography>
        <IconButton
          size="small"
          onClick={handleDelete}
          sx={{ width: 16, height: 16, color: '#555', '&:hover': { color: '#EF4444' }, p: 0 }}
        >
          <IconX size={11} />
        </IconButton>
      </Box>

      {/* Content */}
      <Box sx={{ px: 1.25, pb: 1, pt: selected ? 0 : 1 }}>
        {editing ? (
          <Box
            component="textarea"
            ref={textareaRef}
            value={text}
            onChange={handleTextChange}
            onBlur={() => setEditing(false)}
            placeholder="Escreva uma anotação…"
            sx={{
              width: '100%', border: 'none', outline: 'none',
              background: 'transparent', resize: 'none',
              fontSize: '0.65rem', color: '#ccc',
              fontFamily: 'inherit', lineHeight: 1.5,
              minHeight: 48, display: 'block', p: 0,
            }}
          />
        ) : (
          <Typography
            sx={{ fontSize: '0.65rem', color: text ? '#ccc' : '#444', lineHeight: 1.5, whiteSpace: 'pre-wrap', cursor: 'text' }}
          >
            {text || 'Duplo clique para editar…'}
          </Typography>
        )}
      </Box>
    </Box>
  );
}
