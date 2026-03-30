'use client';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import {
  IconPencil,
  IconLock,
  IconPlus,
  IconX,
  IconRefresh,
  IconPlayerPlay,
  IconPlayerStop,
  IconCopy,
  IconTrash,
} from '@tabler/icons-react';
import { useEffect, useRef, useState } from 'react';
import type { NodeStatus } from './PipelineContext';

export type NodeOption = {
  id: string;
  label: string;
  description?: string;
  color?: string;
  icon?: React.ReactNode;
  onClick: () => void;
  added?: boolean;
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
  onRun?: () => void;
  onStop?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  accentColor?: string;
  nodeOptions?: NodeOption[];
  children: React.ReactNode;
}

export default function NodeShell({
  title,
  icon,
  status,
  width = 380,
  collapsedSummary,
  onEdit,
  onRerun,
  onRun,
  onStop,
  onDuplicate,
  onDelete,
  accentColor,
  nodeOptions,
  children,
}: NodeShellProps) {
  const isDone    = status === 'done';
  const isLocked  = status === 'locked';
  const isRunning = status === 'running';
  const isActive  = status === 'active';
  const accent = accentColor ?? '#E85219';

  // Entrance animation
  const [visible, setVisible] = useState(false);
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      requestAnimationFrame(() => setVisible(true));
    }
  }, []);

  const [showOptions, setShowOptions] = useState(false);
  const [hovered, setHovered] = useState(false);

  // Determine which action groups exist (for divider logic)
  const hasLeftGroup =
    (isActive && !!onRun) ||
    (isRunning && !!onStop) ||
    (isDone && !!onRerun) ||
    !!onEdit ||
    (!!nodeOptions && !isLocked);
  const hasRightGroup = !!onDuplicate || !!onDelete;

  return (
    <Box
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      sx={{
        width,
        position: 'relative',
        overflow: 'visible',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0) scale(1)' : 'translateY(12px) scale(0.98)',
        transition: 'opacity 0.35s ease, transform 0.35s ease',
      }}
    >
      {/* ── Floating action bar (above card) ────────────────────────────────── */}
      {!isLocked && (hasLeftGroup || hasRightGroup) && (
        <Stack
          direction="row"
          alignItems="center"
          sx={{
            position: 'absolute',
            top: -36,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 20,
            bgcolor: '#111',
            border: '1px solid #2a2a2a',
            borderRadius: '20px',
            px: 0.5,
            py: 0.375,
            boxShadow: '0 4px 16px rgba(0,0,0,0.6)',
            opacity: hovered ? 1 : 0,
            transition: 'opacity 0.15s',
            pointerEvents: hovered ? 'auto' : 'none',
            whiteSpace: 'nowrap',
          }}
        >
          {/* Left group */}
          {isActive && onRun && (
            <Tooltip title="Executar" placement="top" arrow>
              <IconButton
                size="small"
                onClick={onRun}
                sx={{ p: 0.3, color: '#555', '&:hover': { color: '#13DEB9' } }}
              >
                <IconPlayerPlay size={12} />
              </IconButton>
            </Tooltip>
          )}

          {isRunning && onStop && (
            <Tooltip title="Parar" placement="top" arrow>
              <IconButton
                size="small"
                onClick={onStop}
                sx={{ p: 0.3, color: '#555', '&:hover': { color: '#E85219' } }}
              >
                <IconPlayerStop size={12} />
              </IconButton>
            </Tooltip>
          )}

          {isDone && onRerun && (
            <Tooltip title="Re-executar" placement="top" arrow>
              <IconButton
                size="small"
                onClick={onRerun}
                sx={{ p: 0.3, color: '#555', '&:hover': { color: '#ccc' } }}
              >
                <IconRefresh size={12} />
              </IconButton>
            </Tooltip>
          )}

          {onEdit && (
            <Tooltip title="Editar" placement="top" arrow>
              <IconButton
                size="small"
                onClick={onEdit}
                sx={{ p: 0.3, color: '#555', '&:hover': { color: '#ccc' } }}
              >
                <IconPencil size={12} />
              </IconButton>
            </Tooltip>
          )}

          {nodeOptions && !isLocked && (
            <Tooltip title={showOptions ? 'Fechar opções' : 'Adicionar ao canvas'} placement="top" arrow>
              <IconButton
                size="small"
                onClick={() => setShowOptions((p) => !p)}
                sx={{
                  p: 0.3,
                  color: showOptions ? accent : '#555',
                  '&:hover': { color: accent },
                }}
              >
                {showOptions ? <IconX size={12} /> : <IconPlus size={12} />}
              </IconButton>
            </Tooltip>
          )}

          {/* Divider between left and right groups */}
          {hasLeftGroup && hasRightGroup && (
            <Box sx={{ width: 1, height: 14, bgcolor: '#2a2a2a', mx: 0.25, flexShrink: 0 }} />
          )}

          {/* Right group */}
          {onDuplicate && (
            <Tooltip title="Duplicar" placement="top" arrow>
              <IconButton
                size="small"
                onClick={onDuplicate}
                sx={{ p: 0.3, color: '#555', '&:hover': { color: '#ccc' } }}
              >
                <IconCopy size={12} />
              </IconButton>
            </Tooltip>
          )}

          {onDelete && (
            <Tooltip title="Excluir" placement="top" arrow>
              <IconButton
                size="small"
                onClick={onDelete}
                sx={{ p: 0.3, color: '#555', '&:hover': { color: '#EF4444' } }}
              >
                <IconTrash size={12} />
              </IconButton>
            </Tooltip>
          )}
        </Stack>
      )}

      {/* ── Card visual shell ────────────────────────────────────────────────── */}
      <Box
        sx={{
          width: '100%',
          borderRadius: '14px',
          border: `1px solid ${isDone ? '#272727' : isActive ? '#252525' : '#1c1c1c'}`,
          bgcolor: '#0e0e0e',
          overflow: 'hidden',
          position: 'relative',
          opacity: isLocked ? 0.55 : 1,
          transition: 'border-color 0.2s, box-shadow 0.2s, opacity 0.35s ease',
          boxShadow: isRunning
            ? `0 0 0 1px ${accent}33, 0 4px 32px ${accent}18`
            : hovered && !isLocked
            ? '0 0 0 1px #2a2a2a, 0 4px 24px rgba(0,0,0,0.4)'
            : '0 2px 12px rgba(0,0,0,0.3)',
          cursor: isLocked ? 'not-allowed' : 'default',
        }}
      >
        {/* ── Label row ──────────────────────────────────────────────────────── */}
        <Stack
          direction="row"
          alignItems="center"
          spacing={0.75}
          sx={{
            px: 1.75,
            pt: 1.25,
            pb: isDone && collapsedSummary ? 0.75 : 0.5,
            opacity: hovered || isRunning || !isDone ? 1 : 0.6,
            transition: 'opacity 0.2s',
          }}
        >
          <Box
            sx={{
              color: isDone ? '#444' : isRunning ? accent : '#3a3a3a',
              display: 'flex',
              transition: 'color 0.2s',
            }}
          >
            {icon}
          </Box>
          <Typography
            sx={{
              fontSize: '0.62rem',
              fontWeight: 600,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: isDone ? '#444' : isRunning ? accent : '#3a3a3a',
              transition: 'color 0.2s',
              flex: 1,
            }}
          >
            {title}
          </Typography>

          {/* Running spinner in header */}
          {isRunning && (
            <CircularProgress size={10} sx={{ color: accent }} />
          )}

          {/* Lock indicator */}
          {isLocked && <IconLock size={11} color="#333" />}
        </Stack>

        {/* ── Options panel ──────────────────────────────────────────────────── */}
        {nodeOptions && showOptions && (
          <Box
            sx={{
              mx: 1.5,
              mb: 1,
              borderRadius: 2,
              bgcolor: '#0a0a0a',
              border: '1px solid #1e1e1e',
              px: 1.25,
              py: 1,
              animation: 'spacesSlideIn 0.14s ease',
              '@keyframes spacesSlideIn': {
                from: { opacity: 0, transform: 'translateY(-3px)' },
                to:   { opacity: 1, transform: 'translateY(0)' },
              },
            }}
          >
            <Typography
              sx={{
                fontSize: '0.5rem',
                color: '#333',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                mb: 0.75,
              }}
            >
              Adicionar ao canvas
            </Typography>
            <Stack spacing={0.35}>
              {nodeOptions.map((opt) => {
                const c = opt.color ?? accent;
                return (
                  <Box
                    key={opt.id}
                    onClick={() => {
                      if (!opt.added && !opt.disabled) {
                        opt.onClick();
                        setShowOptions(false);
                      }
                    }}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.75,
                      px: 1,
                      py: 0.6,
                      borderRadius: 1.5,
                      cursor: opt.added || opt.disabled ? 'default' : 'pointer',
                      opacity: opt.added || opt.disabled ? 0.35 : 1,
                      '&:hover': opt.added || opt.disabled ? {} : { bgcolor: `${c}10` },
                      transition: 'background 0.1s',
                    }}
                  >
                    {opt.icon && (
                      <Box sx={{ color: c, display: 'flex', flexShrink: 0 }}>{opt.icon}</Box>
                    )}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontSize: '0.64rem', fontWeight: 600, color: '#ccc' }}>
                        {opt.label}
                        {opt.added && (
                          <Typography
                            component="span"
                            sx={{ fontSize: '0.52rem', color: '#444', ml: 0.5 }}
                          >
                            · adicionado
                          </Typography>
                        )}
                      </Typography>
                      {opt.description && (
                        <Typography sx={{ fontSize: '0.57rem', color: '#444', lineHeight: 1.3 }}>
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

        {/* ── Body ───────────────────────────────────────────────────────────── */}
        <Box sx={{ position: 'relative' }}>
          {isLocked && (
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                zIndex: 10,
                backdropFilter: 'blur(2px)',
                bgcolor: 'rgba(8,8,8,0.6)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 0.5,
                py: 2.5,
                borderRadius: '0 0 14px 14px',
              }}
            >
              <IconLock size={18} color="#2a2a2a" />
              <Typography sx={{ fontSize: '0.58rem', color: '#333' }}>
                Complete o step anterior
              </Typography>
            </Box>
          )}

          <Box sx={{ px: 1.75, pb: 1.75 }}>
            {isDone && collapsedSummary ? collapsedSummary : children}
          </Box>
        </Box>

        {/* ── Run / Running pill button (bottom-right) ─────────────────────── */}
        {(isActive || isRunning) && onRun && (
          <Box
            onClick={onRun}
            sx={{
              position: 'absolute',
              bottom: 10,
              right: 10,
              zIndex: 5,
              display: 'flex',
              alignItems: 'center',
              gap: 0.4,
              bgcolor: accent,
              color: '#fff',
              borderRadius: '20px',
              px: 1,
              py: 0.3,
              fontSize: '0.58rem',
              fontWeight: 700,
              cursor: 'pointer',
              userSelect: 'none',
              animation: isRunning
                ? 'runPulse 1.8s ease-in-out infinite'
                : undefined,
              '@keyframes runPulse': {
                '0%,100%': { opacity: 0.8 },
                '50%':     { opacity: 1 },
              },
              '&:hover': {
                filter: 'brightness(1.15)',
              },
              transition: 'filter 0.15s',
            }}
          >
            {isRunning ? (
              <>
                <CircularProgress size={9} sx={{ color: '#fff', mr: 0.5 }} />
                Rodando…
              </>
            ) : (
              <>
                <IconPlayerPlay size={10} />
                Run
              </>
            )}
          </Box>
        )}

        {/* ── Running shimmer bar at bottom ────────────────────────────────── */}
        {isRunning && (
          <Box
            sx={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: 2,
              bgcolor: accent,
              animation: 'spacesShimmer 1.8s ease-in-out infinite',
              '@keyframes spacesShimmer': {
                '0%':   { transform: 'scaleX(0.05)', transformOrigin: 'left',  opacity: 0.8 },
                '50%':  { transform: 'scaleX(0.9)',  transformOrigin: 'left',  opacity: 1 },
                '100%': { transform: 'scaleX(0.05)', transformOrigin: 'right', opacity: 0.8 },
              },
            }}
          />
        )}
      </Box>
    </Box>
  );
}
