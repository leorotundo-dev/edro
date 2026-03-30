'use client';
import { useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import { IconVariable, IconX, IconPlus } from '@tabler/icons-react';
import NodeShell from '../NodeShell';
import { useCanvasContext } from '../CanvasContext';

const ACCENT = '#F59E0B';

export default function PromptVariablesNode({ id }: NodeProps) {
  const { promptVariables, setPromptVariables, duplicateNode, deleteNode } = useCanvasContext();

  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');

  return (
    <Box>
      <NodeShell
        title="Variáveis do Canvas"
        icon={<IconVariable size={14} />}
        status="active"
        accentColor={ACCENT}
        width={320}
        onDuplicate={() => duplicateNode(id)}
        onDelete={() => deleteNode(id)}
      >
        <Stack spacing={1}>
          {/* Existing variables */}
          {Object.entries(promptVariables).map(([key, value]) => (
            <Stack key={key} direction="row" spacing={0.5} alignItems="center">
              {/* Key chip */}
              <Box
                sx={{
                  px: 0.75,
                  py: 0.25,
                  bgcolor: '#F59E0B22',
                  border: '1px solid #F59E0B44',
                  borderRadius: 1,
                  flexShrink: 0,
                }}
              >
                <Typography
                  sx={{
                    fontSize: '0.6rem',
                    color: ACCENT,
                    fontFamily: 'monospace',
                    fontWeight: 600,
                  }}
                >
                  {`{{${key}}}`}
                </Typography>
              </Box>

              {/* Value input (editable) */}
              <TextField
                size="small"
                value={value}
                onChange={(e) =>
                  setPromptVariables({ ...promptVariables, [key]: e.target.value })
                }
                sx={{
                  flex: 1,
                  '& .MuiInputBase-input': { fontSize: '0.62rem', py: 0.5, px: 0.75 },
                }}
              />

              {/* Delete button */}
              <IconButton
                size="small"
                onClick={() => {
                  const next = { ...promptVariables };
                  delete next[key];
                  setPromptVariables(next);
                }}
                sx={{ p: 0.25, color: '#444', '&:hover': { color: '#EF4444' } }}
              >
                <IconX size={11} />
              </IconButton>
            </Stack>
          ))}

          {/* Add new variable row */}
          <Stack direction="row" spacing={0.5} alignItems="center">
            <TextField
              size="small"
              placeholder="chave"
              value={newKey}
              onChange={(e) =>
                setNewKey(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))
              }
              sx={{
                width: 100,
                '& .MuiInputBase-input': {
                  fontSize: '0.62rem',
                  py: 0.5,
                  px: 0.75,
                  fontFamily: 'monospace',
                },
              }}
            />
            <TextField
              size="small"
              placeholder="valor"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              sx={{
                flex: 1,
                '& .MuiInputBase-input': { fontSize: '0.62rem', py: 0.5, px: 0.75 },
              }}
            />
            <IconButton
              size="small"
              disabled={!newKey.trim()}
              onClick={() => {
                if (!newKey.trim()) return;
                setPromptVariables({ ...promptVariables, [newKey.trim()]: newValue });
                setNewKey('');
                setNewValue('');
              }}
              sx={{
                p: 0.3,
                color: ACCENT,
                '&:hover': { color: '#fbbf24' },
                '&.Mui-disabled': { color: '#333' },
              }}
            >
              <IconPlus size={13} />
            </IconButton>
          </Stack>

          {/* Usage hint */}
          {Object.keys(promptVariables).length > 0 && (
            <Typography sx={{ fontSize: '0.55rem', color: '#444', lineHeight: 1.4 }}>
              Use {`{{nome_da_chave}}`} em qualquer campo de texto no canvas.
            </Typography>
          )}
        </Stack>
      </NodeShell>

      {/* Source handle — broadcast variables to any connected node */}
      <Handle
        type="source"
        position={Position.Right}
        id="vars_out"
        style={{ background: ACCENT, width: 8, height: 8, border: 'none' }}
      />
    </Box>
  );
}
