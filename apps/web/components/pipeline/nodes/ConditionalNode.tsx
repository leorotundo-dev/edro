'use client';
import { useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Slider from '@mui/material/Slider';
import { IconGitBranch } from '@tabler/icons-react';
import NodeShell from '../NodeShell';
import { useCanvasContext } from '../CanvasContext';

const ACCENT = '#F8A800';
const COLOR_PASS = '#13DEB9';
const COLOR_FAIL = '#EF4444';

type Operator = '>' | '<' | '=';

export default function ConditionalNode({ id }: NodeProps) {
  const { duplicateNode, deleteNode } = useCanvasContext();

  const [operator, setOperator] = useState<Operator>('>');
  const [threshold, setThreshold] = useState(70);
  const [currentScore, setCurrentScore] = useState<number | null>(null);
  const [evaluated, setEvaluated] = useState(false);

  const passes =
    currentScore !== null
      ? operator === '>'
        ? currentScore > threshold
        : operator === '<'
        ? currentScore < threshold
        : currentScore === threshold
      : null;

  const status = evaluated ? 'done' : 'active';

  // ── Collapsed summary (shown when status === 'done') ─────────────────────────
  const collapsedSummary = (
    <Stack spacing={0.5}>
      <Stack direction="row" spacing={0.75} alignItems="center">
        <Typography sx={{ fontSize: '0.62rem', color: ACCENT, fontWeight: 700 }}>
          score {operator} {threshold}
        </Typography>
      </Stack>
      {currentScore !== null && (
        <Typography
          sx={{ fontSize: '0.6rem', color: passes ? COLOR_PASS : COLOR_FAIL }}
        >
          {passes ? '✓ Passou' : '✗ Falhou'} — score {currentScore}
        </Typography>
      )}
    </Stack>
  );

  return (
    <Box>
      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Left}
        id="cond_in"
        style={{ background: '#444', width: 8, height: 8, border: 'none' }}
      />

      <NodeShell
        title="Condicional"
        icon={<IconGitBranch size={14} />}
        status={status}
        accentColor={ACCENT}
        width={260}
        collapsedSummary={collapsedSummary}
        onRerun={() => setEvaluated(false)}
        onDuplicate={() => duplicateNode(id)}
        onDelete={() => deleteNode(id)}
      >
        <Stack spacing={1.25}>
          {/* ── Condition config box ── */}
          <Box
            sx={{
              bgcolor: '#111',
              border: '1px solid #2a2a2a',
              borderRadius: 2,
              p: 1,
            }}
          >
            {/* Label row */}
            <Stack direction="row" spacing={0.75} alignItems="center" mb={1}>
              <Typography
                sx={{
                  fontSize: '0.58rem',
                  color: '#555',
                  textTransform: 'uppercase',
                  letterSpacing: '0.07em',
                  flex: 1,
                }}
              >
                Condição
              </Typography>
              <Typography
                sx={{
                  fontSize: '0.58rem',
                  color: '#666',
                  fontFamily: 'monospace',
                }}
              >
                score
              </Typography>
            </Stack>

            {/* Operator chips */}
            <Stack direction="row" spacing={0.5} mb={1.25}>
              {(['>', '<', '='] as Operator[]).map((op) => (
                <Box
                  key={op}
                  onClick={() => setOperator(op)}
                  sx={{
                    flex: 1,
                    py: 0.5,
                    borderRadius: 1.5,
                    cursor: 'pointer',
                    textAlign: 'center',
                    border: '1px solid',
                    transition: 'all 0.15s',
                    borderColor: operator === op ? ACCENT : '#2a2a2a',
                    bgcolor: operator === op ? `${ACCENT}18` : 'transparent',
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      fontFamily: 'monospace',
                      color: operator === op ? ACCENT : '#555',
                    }}
                  >
                    {op}
                  </Typography>
                </Box>
              ))}
            </Stack>

            {/* Threshold slider + value */}
            <Stack direction="row" spacing={1} alignItems="center">
              <Slider
                size="small"
                min={0}
                max={100}
                step={5}
                value={threshold}
                onChange={(_, v) => setThreshold(v as number)}
                sx={{
                  flex: 1,
                  color: ACCENT,
                  '& .MuiSlider-thumb': {
                    width: 12,
                    height: 12,
                    '&:hover, &.Mui-focusVisible': {
                      boxShadow: `0 0 0 6px ${ACCENT}22`,
                    },
                  },
                  '& .MuiSlider-track': { border: 'none' },
                  '& .MuiSlider-rail': { bgcolor: '#2a2a2a' },
                }}
              />
              <Box
                sx={{
                  minWidth: 32,
                  textAlign: 'center',
                  bgcolor: `${ACCENT}18`,
                  border: `1px solid ${ACCENT}44`,
                  borderRadius: 1,
                  px: 0.5,
                  py: 0.2,
                }}
              >
                <Typography
                  sx={{
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    color: ACCENT,
                    fontFamily: 'monospace',
                  }}
                >
                  {threshold}
                </Typography>
              </Box>
            </Stack>
          </Box>

          {/* ── Current score display ── */}
          {currentScore !== null && (
            <Stack
              direction="row"
              spacing={0.75}
              alignItems="center"
              sx={{
                p: 0.75,
                borderRadius: 1.5,
                border: `1px solid ${passes ? COLOR_PASS : COLOR_FAIL}33`,
                bgcolor: passes ? `${COLOR_PASS}08` : `${COLOR_FAIL}08`,
              }}
            >
              <Typography sx={{ fontSize: '0.6rem', color: '#888', flex: 1 }}>
                Score atual:{' '}
                <Typography
                  component="span"
                  sx={{ fontWeight: 700, color: passes ? COLOR_PASS : COLOR_FAIL }}
                >
                  {currentScore}
                </Typography>
              </Typography>
              <Box
                sx={{
                  px: 0.75,
                  py: 0.2,
                  borderRadius: 1,
                  bgcolor: passes ? `${COLOR_PASS}22` : `${COLOR_FAIL}22`,
                }}
              >
                <Typography
                  sx={{
                    fontSize: '0.58rem',
                    fontWeight: 700,
                    color: passes ? COLOR_PASS : COLOR_FAIL,
                  }}
                >
                  {passes ? '✓ Passa' : '✗ Falha'}
                </Typography>
              </Box>
            </Stack>
          )}

          {/* ── Output paths info ── */}
          <Stack spacing={0.5}>
            {/* Pass path */}
            <Stack
              direction="row"
              spacing={0.75}
              alignItems="center"
              sx={{
                p: 0.75,
                borderRadius: 1.5,
                bgcolor: `${COLOR_PASS}08`,
                border: `1px solid ${COLOR_PASS}22`,
              }}
            >
              <Box
                sx={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  bgcolor: COLOR_PASS,
                  flexShrink: 0,
                }}
              />
              <Typography sx={{ fontSize: '0.6rem', color: COLOR_PASS, fontWeight: 700, flex: 1 }}>
                Passa
              </Typography>
              <Typography sx={{ fontSize: '0.55rem', color: '#555' }}>
                conecte ao próximo passo se aprovado
              </Typography>
            </Stack>

            {/* Fail path */}
            <Stack
              direction="row"
              spacing={0.75}
              alignItems="center"
              sx={{
                p: 0.75,
                borderRadius: 1.5,
                bgcolor: `${COLOR_FAIL}08`,
                border: `1px solid ${COLOR_FAIL}22`,
              }}
            >
              <Box
                sx={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  bgcolor: COLOR_FAIL,
                  flexShrink: 0,
                }}
              />
              <Typography sx={{ fontSize: '0.6rem', color: COLOR_FAIL, fontWeight: 700, flex: 1 }}>
                Falha
              </Typography>
              <Typography sx={{ fontSize: '0.55rem', color: '#555' }}>
                conecte ao passo de revisão
              </Typography>
            </Stack>
          </Stack>
        </Stack>
      </NodeShell>

      {/* Pass output — upper right */}
      <Handle
        type="source"
        position={Position.Right}
        id="cond_pass"
        style={{
          background: COLOR_PASS,
          width: 8,
          height: 8,
          border: 'none',
          top: '35%',
        }}
      />

      {/* Fail output — lower right */}
      <Handle
        type="source"
        position={Position.Right}
        id="cond_fail"
        style={{
          background: COLOR_FAIL,
          width: 8,
          height: 8,
          border: 'none',
          top: '65%',
        }}
      />
    </Box>
  );
}
