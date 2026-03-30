'use client';
import { useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import CircularProgress from '@mui/material/CircularProgress';
import {
  IconWand,
  IconPhoto,
  IconLayersLinked,
  IconLanguage,
  IconCopy,
} from '@tabler/icons-react';
import NodeShell from '../NodeShell';
import { usePipeline } from '../PipelineContext';
import { useCanvasContext } from '../CanvasContext';

const ACCENT = '#8B5CF6';

// ── Task definitions ──────────────────────────────────────────────────────────

type TaskId = 'refinar_prompt' | 'descrever_imagem' | 'gerar_variacoes' | 'traduzir';

interface TaskDef {
  id: TaskId;
  label: string;
  icon: React.ReactNode;
  color: string;
}

const TASKS: TaskDef[] = [
  { id: 'refinar_prompt',   label: 'Refinar Prompt',   icon: <IconWand size={13} />,         color: '#8B5CF6' },
  { id: 'descrever_imagem', label: 'Descrever Imagem', icon: <IconPhoto size={13} />,        color: '#06B6D4' },
  { id: 'gerar_variacoes',  label: 'Gerar Variações',  icon: <IconLayersLinked size={13} />, color: '#F59E0B' },
  { id: 'traduzir',         label: 'Traduzir',          icon: <IconLanguage size={13} />,     color: '#13DEB9' },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function AssistantNode({ id }: NodeProps) {
  const { nodeStatus } = usePipeline();
  const { duplicateNode, deleteNode } = useCanvasContext();

  const [task, setTask] = useState<TaskId>('refinar_prompt');
  const [inputText, setInputText] = useState('');
  const [language, setLanguage] = useState('pt-BR');
  const [result, setResult] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  // ── Derived status ──────────────────────────────────────────────────────
  const status = result ? 'done' : running ? 'running' : 'active';

  // ── Collapsed summary ────────────────────────────────────────────────────
  const collapsedSummary = result ? (
    <Typography sx={{ fontSize: '0.64rem', color: '#aaa', lineHeight: 1.5 }}>
      {result.length > 80 ? `${result.slice(0, 80)}…` : result}
    </Typography>
  ) : null;

  // ── API call ─────────────────────────────────────────────────────────────
  const handleRun = async () => {
    if (!inputText.trim()) return;
    setRunning(true);
    setError('');
    try {
      const { apiPost } = await import('@/lib/api');
      const res = await apiPost<{ success: boolean; result: string; error?: string }>(
        '/studio/creative/assistant',
        {
          task,
          text: inputText,
          language: task === 'traduzir' ? language : undefined,
        },
      );
      if (res.success) {
        setResult(res.result);
      } else {
        setError(res.error || 'Erro ao executar task');
      }
    } catch (e: any) {
      setError(e?.message || 'Erro');
    } finally {
      setRunning(false);
    }
  };

  // ── Copy to clipboard ────────────────────────────────────────────────────
  const handleCopy = () => {
    if (!result) return;
    navigator.clipboard.writeText(result).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };

  const activeTask = TASKS.find((t) => t.id === task)!;

  return (
    <Box>
      {/* Target handle — receives text or image from upstream */}
      <Handle
        type="target"
        position={Position.Left}
        id="assistant_in"
        style={{ background: '#444', width: 8, height: 8, border: 'none' }}
      />

      <NodeShell
        title="Assistente AI"
        icon={<IconWand size={14} />}
        status={status}
        accentColor={ACCENT}
        width={320}
        collapsedSummary={collapsedSummary ?? undefined}
        onRerun={() => {
          setResult(null);
          setError('');
        }}
        onDuplicate={() => duplicateNode(id)}
        onDelete={() => deleteNode(id)}
      >
        <Stack spacing={1.25}>
          {/* ── Task selector 2×2 grid ─────────────────────────────────────── */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 0.6,
            }}
          >
            {TASKS.map((t) => {
              const isActive = task === t.id;
              return (
                <Box
                  key={t.id}
                  onClick={() => {
                    setTask(t.id);
                    setResult(null);
                    setError('');
                  }}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.6,
                    px: 0.75,
                    py: 0.55,
                    borderRadius: 1.5,
                    cursor: 'pointer',
                    border: `1px solid ${isActive ? t.color : '#2a2a2a'}`,
                    bgcolor: isActive ? `${t.color}14` : 'transparent',
                    transition: 'all 0.12s',
                    '&:hover': { border: `1px solid ${t.color}80`, bgcolor: `${t.color}0a` },
                  }}
                >
                  <Box sx={{ color: isActive ? t.color : '#555', display: 'flex', flexShrink: 0 }}>
                    {t.icon}
                  </Box>
                  <Typography
                    sx={{
                      fontSize: '0.58rem',
                      fontWeight: isActive ? 700 : 400,
                      color: isActive ? t.color : '#666',
                      lineHeight: 1.2,
                    }}
                  >
                    {t.label}
                  </Typography>
                </Box>
              );
            })}
          </Box>

          {/* ── Input text area ────────────────────────────────────────────── */}
          <TextField
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            multiline
            rows={3}
            placeholder="Digite ou conecte um node de texto acima..."
            disabled={running}
            fullWidth
            sx={{
              '& .MuiOutlinedInput-root': {
                fontSize: '0.65rem',
                bgcolor: '#0d0d0d',
                '& fieldset': { borderColor: '#2a2a2a' },
                '&:hover fieldset': { borderColor: '#3a3a3a' },
                '&.Mui-focused fieldset': { borderColor: activeTask.color },
              },
              '& .MuiInputBase-input': { fontSize: '0.65rem', py: 0.75, px: 1 },
            }}
          />

          {/* ── Language input (only for translate task) ───────────────────── */}
          {task === 'traduzir' && (
            <TextField
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              size="small"
              placeholder="pt-BR, en-US, es..."
              disabled={running}
              label="Idioma de destino"
              fullWidth
              sx={{
                '& .MuiOutlinedInput-root': {
                  fontSize: '0.65rem',
                  bgcolor: '#0d0d0d',
                  '& fieldset': { borderColor: '#2a2a2a' },
                  '&:hover fieldset': { borderColor: '#3a3a3a' },
                  '&.Mui-focused fieldset': { borderColor: '#13DEB9' },
                },
                '& .MuiInputBase-input': { fontSize: '0.65rem' },
                '& .MuiInputLabel-root': { fontSize: '0.62rem' },
              }}
            />
          )}

          {/* ── Error ─────────────────────────────────────────────────────── */}
          {error && (
            <Typography sx={{ fontSize: '0.6rem', color: '#EF4444' }}>{error}</Typography>
          )}

          {/* ── Execute button ─────────────────────────────────────────────── */}
          <Button
            size="small"
            variant="contained"
            fullWidth
            onClick={handleRun}
            disabled={!inputText.trim() || running}
            startIcon={
              running ? (
                <CircularProgress size={11} sx={{ color: '#fff' }} />
              ) : (
                activeTask.icon
              )
            }
            sx={{
              bgcolor: activeTask.color,
              color: '#fff',
              fontWeight: 700,
              fontSize: '0.66rem',
              textTransform: 'none',
              '&:hover': { filter: 'brightness(1.12)', bgcolor: activeTask.color },
              '&.Mui-disabled': { bgcolor: '#2a2a2a', color: '#444' },
            }}
          >
            {running ? 'Executando…' : 'Executar'}
          </Button>

          {/* ── Result area ────────────────────────────────────────────────── */}
          {result && (
            <Box
              sx={{
                bgcolor: '#0d0d0d',
                border: `1px solid ${ACCENT}20`,
                borderRadius: 1.5,
                p: 1,
                mt: 0.75,
              }}
            >
              <Stack direction="row" alignItems="flex-start" spacing={0.5}>
                <Typography
                  sx={{ fontSize: '0.63rem', color: '#ccc', lineHeight: 1.6, flex: 1 }}
                >
                  {result}
                </Typography>
                <Tooltip title={copied ? 'Copiado!' : 'Copiar'} placement="top" arrow>
                  <IconButton
                    size="small"
                    onClick={handleCopy}
                    sx={{
                      p: 0.3,
                      flexShrink: 0,
                      color: copied ? '#13DEB9' : '#444',
                      '&:hover': { color: '#ccc' },
                    }}
                  >
                    <IconCopy size={13} />
                  </IconButton>
                </Tooltip>
              </Stack>

              {/* Apply as prompt (stub) */}
              <Button
                size="small"
                onClick={() => console.log('[AssistantNode] Apply as prompt:', result)}
                sx={{
                  mt: 0.75,
                  fontSize: '0.58rem',
                  textTransform: 'none',
                  color: ACCENT,
                  px: 0.75,
                  py: 0.25,
                  '&:hover': { bgcolor: `${ACCENT}10` },
                }}
              >
                Aplicar como prompt
              </Button>
            </Box>
          )}
        </Stack>
      </NodeShell>

      {/* Source handle — outputs refined text */}
      <Handle
        type="source"
        position={Position.Right}
        id="assistant_out"
        style={{ background: ACCENT, width: 8, height: 8, border: 'none' }}
      />
    </Box>
  );
}
