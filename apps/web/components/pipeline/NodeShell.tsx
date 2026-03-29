'use client';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import { IconPencil, IconLock, IconPlus, IconX, IconRefresh } from '@tabler/icons-react';
import { useEffect, useRef, useState } from 'react';
import type { NodeStatus } from './PipelineContext';

export type NodeOption = {
  id: string;
  label: string;
  description?: string;
  color?: string;
  icon?: React.ReactNode;
  onClick: () => void;
  added?: boolean;   // already in canvas — greyed out
  disabled?: boolean;
};

interface NodeShellProps {
  title: string;
  icon: React.ReactNode;
  status: NodeStatus;
  width?: number;
  collapsedSummary?: React.ReactNode;
  onEdit?: () => void;
  onRerun?: () => void;
  accentColor?: string;
  nodeOptions?: NodeOption[];   // contextual child actions for this node
  children: React.ReactNode;
}

const STATUS_COLORS: Record<NodeStatus, string> = {
  done:    '#13DEB9',
  active:  '#E85219',
  running: '#E85219',
  locked:  '#444444',
};

const STATUS_BG: Record<NodeStatus, string> = {
  done:    'rgba(19,222,185,0.05)',
  active:  'rgba(232,82,25,0.06)',
  running: 'rgba(232,82,25,0.06)',
  locked:  'transparent',
};

export default function NodeShell({
  title, icon, status, width = 300, collapsedSummary, onEdit, onRerun, accentColor, nodeOptions, children,
}: NodeShellProps) {
  const color = accentColor && status !== 'done' && status !== 'locked'
    ? accentColor
    : STATUS_COLORS[status];
  const isDone = status === 'done';
  const isLocked = status === 'locked';
  const isRunning = status === 'running';

  // Entrance animation: slide-in from right on first mount
  const [visible, setVisible] = useState(false);
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      requestAnimationFrame(() => setVisible(true));
    }
  }, []);

  // Contextual node options panel
  const [showOptions, setShowOptions] = useState(false);

  return (
    <Box sx={{
      width,
      borderRadius: 2,
      border: `1.5px solid ${color}`,
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0) scale(1)' : 'translateY(18px) scale(0.97)',
      transition: 'opacity 0.45s cubic-bezier(0.34,1.56,0.64,1), transform 0.45s cubic-bezier(0.34,1.56,0.64,1), border-color 0.35s ease, box-shadow 0.35s ease',
      bgcolor: STATUS_BG[status],
      boxShadow: status === 'active' ? `0 0 0 4px ${color}22` : status === 'done' ? `0 0 0 2px ${color}18` : 'none',
      overflow: 'hidden',
      position: 'relative',
    }}>
      {/* Header */}
      <Stack
        direction="row"
        alignItems="center"
        spacing={1}
        sx={{
          px: 1.5, py: 1,
          borderBottom: `1px solid ${color}33`,
          bgcolor: `${color}08`,
        }}
      >
        <Box sx={{ color, display: 'flex', alignItems: 'center' }}>{icon}</Box>
        <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color, flex: 1 }}>
          {title}
        </Typography>
        {isRunning && <CircularProgress size={14} sx={{ color }} />}
        {isDone && (
          <Box sx={{
            width: 18, height: 18, borderRadius: '50%', bgcolor: color,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
              <path d="M5 13l4 4L19 7" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Box>
        )}
        {isLocked && (
          <IconLock size={14} color={color} />
        )}
        {isDone && onRerun && (
          <IconButton size="small" onClick={onRerun} title="Re-executar" sx={{ p: 0.25, color: 'text.disabled', ml: 0.25, '&:hover': { color: '#F8A800' } }}>
            <IconRefresh size={12} />
          </IconButton>
        )}
        {isDone && onEdit && (
          <IconButton size="small" onClick={onEdit} sx={{ p: 0.25, color: 'text.disabled', ml: 0.25 }}>
            <IconPencil size={12} />
          </IconButton>
        )}
        {/* Contextual options toggle — shown on all non-locked nodes when options are defined */}
        {nodeOptions && !isLocked && (
          <IconButton
            size="small"
            onClick={() => setShowOptions((p) => !p)}
            sx={{
              p: 0.25, ml: 0.25,
              color: showOptions ? color : '#444',
              bgcolor: showOptions ? `${color}18` : 'transparent',
              border: `1px solid ${showOptions ? `${color}55` : 'transparent'}`,
              borderRadius: 1,
              transition: 'all 0.15s',
              '&:hover': { color, bgcolor: `${color}12`, borderColor: `${color}44` },
            }}
          >
            {showOptions ? <IconX size={11} /> : <IconPlus size={11} />}
          </IconButton>
        )}
      </Stack>

      {/* Contextual options panel — expands inline below header */}
      {nodeOptions && showOptions && (
        <Box sx={{
          borderBottom: `1px solid ${color}22`,
          bgcolor: '#0a0a0a',
          px: 1.25, py: 1,
          animation: 'fadeSlideIn 0.18s ease',
          '@keyframes fadeSlideIn': {
            from: { opacity: 0, transform: 'translateY(-4px)' },
            to:   { opacity: 1, transform: 'translateY(0)' },
          },
        }}>
          <Typography sx={{ fontSize: '0.52rem', color: '#444', textTransform: 'uppercase', letterSpacing: '0.07em', mb: 0.75 }}>
            Opções deste node
          </Typography>
          <Stack spacing={0.4}>
            {nodeOptions.map((opt) => {
              const optColor = opt.color ?? color;
              return (
                <Box
                  key={opt.id}
                  onClick={() => {
                    if (opt.added || opt.disabled) return;
                    opt.onClick();
                    setShowOptions(false);
                  }}
                  sx={{
                    display: 'flex', alignItems: 'center', gap: 0.75,
                    px: 0.875, py: 0.5, borderRadius: 1.5, cursor: opt.added || opt.disabled ? 'default' : 'pointer',
                    border: `1px solid ${opt.added ? '#1e1e1e' : `${optColor}33`}`,
                    bgcolor: opt.added ? 'transparent' : `${optColor}08`,
                    opacity: opt.added || opt.disabled ? 0.45 : 1,
                    transition: 'all 0.12s',
                    '&:hover': opt.added || opt.disabled ? {} : {
                      bgcolor: `${optColor}16`,
                      borderColor: optColor,
                    },
                  }}
                >
                  {opt.icon && (
                    <Box sx={{ color: optColor, display: 'flex', flexShrink: 0 }}>
                      {opt.icon}
                    </Box>
                  )}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontSize: '0.62rem', fontWeight: 600, color: opt.added ? '#555' : 'text.primary', lineHeight: 1.3 }}>
                      {opt.label}
                      {opt.added && (
                        <Typography component="span" sx={{ fontSize: '0.52rem', color: '#555', ml: 0.5 }}>· já adicionado</Typography>
                      )}
                    </Typography>
                    {opt.description && (
                      <Typography sx={{ fontSize: '0.57rem', color: 'text.disabled', lineHeight: 1.3 }}>
                        {opt.description}
                      </Typography>
                    )}
                  </Box>
                </Box>
              );
            })}
          </Stack>
        </Box>
      )}

      {/* Body */}
      <Box sx={{ position: 'relative' }}>
        {/* Locked overlay */}
        {isLocked && (
          <Box sx={{
            position: 'absolute', inset: 0, zIndex: 10,
            backdropFilter: 'blur(3px)',
            bgcolor: 'rgba(10,10,10,0.5)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 0.75, py: 2,
          }}>
            <IconLock size={20} color="#555" />
            <Typography variant="caption" sx={{ color: '#555', fontSize: '0.65rem' }}>
              Complete o step anterior
            </Typography>
          </Box>
        )}

        {/* Done: collapsed summary */}
        {isDone && collapsedSummary ? (
          <Box sx={{ px: 1.5, py: 1.25 }}>{collapsedSummary}</Box>
        ) : (
          <Box sx={{ px: 1.5, py: 1.5 }}>{children}</Box>
        )}
      </Box>

      {/* Running shimmer strip */}
      {isRunning && (
        <Box sx={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 2,
          bgcolor: color,
          animation: 'shimmerBar 1.5s ease-in-out infinite',
          '@keyframes shimmerBar': {
            '0%': { transform: 'scaleX(0)', transformOrigin: 'left' },
            '50%': { transform: 'scaleX(1)', transformOrigin: 'left' },
            '100%': { transform: 'scaleX(0)', transformOrigin: 'right' },
          },
        }} />
      )}
    </Box>
  );
}
