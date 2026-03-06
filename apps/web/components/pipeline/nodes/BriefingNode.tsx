'use client';
import { Handle, Position } from '@xyflow/react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import { IconFileDescription, IconCheck, IconX, IconArrowRight, IconChefHat, IconTarget, IconMoodSmile } from '@tabler/icons-react';
import NodeShell from '../NodeShell';
import { usePipeline } from '../PipelineContext';
import type { CreativeRecipe } from '../PipelineContext';

function MiseItem({ ok, label, value }: { ok: boolean | null; label: string; value?: string | null }) {
  const color = ok === null ? '#555' : ok ? '#13DEB9' : '#E85219';
  const Icon = ok === null ? () => <CircularProgress size={9} sx={{ color: '#555' }} /> : ok ? () => <IconCheck size={9} color={color} /> : () => <IconX size={9} color={color} />;
  return (
    <Stack direction="row" spacing={0.75} alignItems="center">
      <Box sx={{ width: 14, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon />
      </Box>
      <Typography sx={{ fontSize: '0.6rem', color: '#888' }}>{label}</Typography>
      {value && (
        <Typography sx={{ fontSize: '0.6rem', color, fontWeight: 600, ml: 'auto', maxWidth: 110, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {value}
        </Typography>
      )}
    </Stack>
  );
}

const AMD_OPTIONS = [
  { id: 'compartilhar',   label: 'Compartilhar', icon: '🔁' },
  { id: 'salvar',         label: 'Salvar', icon: '🔖' },
  { id: 'clicar',         label: 'Clicar', icon: '👆' },
  { id: 'responder',      label: 'Comentar', icon: '💬' },
  { id: 'pedir_proposta', label: 'Orçamento', icon: '💰' },
];

const TONE_OPTIONS = [
  { id: 'Profissional', label: 'Pro', icon: '💼' },
  { id: 'Inspirador',   label: 'Inspi', icon: '✨' },
  { id: 'Casual',       label: 'Casual', icon: '😊' },
  { id: 'Persuasivo',   label: 'Persu', icon: '🎯' },
];

export default function BriefingNode() {
  const { briefing, clientBrandColor, confirmBriefing, nodeStatus, suggestedRecipes, applyRecipe, learningRulesCount, tone, setTone, amd, setAmd } = usePipeline();

  const status = nodeStatus.briefing;
  const isLoading = !briefing;

  const collapsedSummary = (
    <Stack spacing={0.5}>
      <Typography sx={{ fontSize: '0.72rem', fontWeight: 600, color: 'text.primary' }}>
        {briefing?.title || 'Briefing'}
      </Typography>
      {briefing?.client_name && (
        <Typography sx={{ fontSize: '0.62rem', color: 'text.secondary' }}>{briefing.client_name}</Typography>
      )}
    </Stack>
  );

  return (
    <Box>
      <NodeShell
        title="Briefing"
        icon={<IconFileDescription size={14} />}
        status={status}
        width={270}
        collapsedSummary={collapsedSummary}
      >
        <Stack spacing={1.25}>
          {/* Loading state */}
          {isLoading ? (
            <Stack direction="row" spacing={1} alignItems="center">
              <CircularProgress size={12} sx={{ color: '#E85219' }} />
              <Typography sx={{ fontSize: '0.62rem', color: 'text.secondary' }}>
                Carregando briefing…
              </Typography>
            </Stack>
          ) : (
            <>
              {/* Mise en place — ingredients check */}
              <Box>
                <Typography sx={{ fontSize: '0.58rem', color: '#555', mb: 0.75, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                  Ingredientes encontrados
                </Typography>
                <Stack spacing={0.6}>
                  <MiseItem ok={true} label="Briefing" value={briefing.title} />
                  <MiseItem ok={!!briefing.client_name} label="Cliente" value={briefing.client_name ?? 'Não identificado'} />
                  <MiseItem ok={clientBrandColor !== '#F5C518'} label="DNA da marca" value={clientBrandColor !== '#F5C518' ? clientBrandColor : 'Carregando…'} />
                  <MiseItem
                    ok={learningRulesCount === null ? null : learningRulesCount > 0}
                    label="Regras aprendidas"
                    value={learningRulesCount === null ? 'verificando…' : learningRulesCount > 0 ? `${learningRulesCount} regra${learningRulesCount !== 1 ? 's' : ''}` : 'Nenhuma ainda'}
                  />
                  <MiseItem ok={!!tone} label="Tom de voz" value={tone || 'Não definido'} />
                  <MiseItem ok={!!amd} label="Ação desejada" value={amd || 'Não definida'} />
                </Stack>
              </Box>

              {briefing?.payload?.objective && (
                <>
                  <Divider sx={{ borderColor: '#1e1e1e' }} />
                  <Box>
                    <Typography sx={{ fontSize: '0.58rem', color: '#555', mb: 0.5 }}>Objetivo</Typography>
                    <Typography sx={{ fontSize: '0.62rem', color: 'text.secondary', lineHeight: 1.5,
                      display: '-webkit-box', overflow: 'hidden', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
                      {briefing.payload.objective}
                    </Typography>
                  </Box>
                </>
              )}

              {/* Suggested recipes */}
              {suggestedRecipes.length > 0 && (
                <>
                  <Divider sx={{ borderColor: '#1e1e1e' }} />
                  <Box>
                    <Stack direction="row" spacing={0.5} alignItems="center" mb={0.75}>
                      <IconChefHat size={11} color="#F8A800" />
                      <Typography sx={{ fontSize: '0.58rem', color: '#F8A800', fontWeight: 600 }}>
                        Receitas do seu Livro
                      </Typography>
                    </Stack>
                    <Stack spacing={0.5}>
                      {suggestedRecipes.slice(0, 2).map((r: CreativeRecipe) => (
                        <Box
                          key={r.id}
                          onClick={() => { applyRecipe(r); confirmBriefing(); }}
                          sx={{
                            p: 0.75, borderRadius: 1.5, cursor: 'pointer',
                            border: '1px solid #F8A80033',
                            bgcolor: 'rgba(248,168,0,0.04)',
                            '&:hover': { bgcolor: 'rgba(248,168,0,0.08)', borderColor: '#F8A800' },
                            transition: 'all 0.15s',
                          }}
                        >
                          <Typography sx={{ fontSize: '0.62rem', color: '#dda000', fontWeight: 600, mb: 0.25 }}>
                            {r.name}
                          </Typography>
                          <Stack direction="row" spacing={0.5} flexWrap="wrap">
                            {r.trigger_id && (
                              <Typography sx={{ fontSize: '0.55rem', color: '#888' }}>
                                Gatilho: {r.trigger_id}
                              </Typography>
                            )}
                            {r.use_count > 0 && (
                              <Typography sx={{ fontSize: '0.55rem', color: '#555' }}>
                                · usada {r.use_count}×
                              </Typography>
                            )}
                          </Stack>
                        </Box>
                      ))}
                    </Stack>
                  </Box>
                </>
              )}

              {/* Tone selector */}
              <Box>
                <Stack direction="row" spacing={0.5} alignItems="center" mb={0.6}>
                  <IconMoodSmile size={11} color="#888" />
                  <Typography sx={{ fontSize: '0.58rem', color: '#555', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                    Tom de voz
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={0.5}>
                  {TONE_OPTIONS.map((t) => (
                    <Box key={t.id} onClick={() => setTone(tone === t.id ? '' : t.id)}
                      sx={{
                        flex: 1, py: 0.5, borderRadius: 1.5, cursor: 'pointer', textAlign: 'center',
                        border: '1px solid', transition: 'all 0.15s',
                        borderColor: tone === t.id ? '#5D87FF' : '#1e1e1e',
                        bgcolor: tone === t.id ? 'rgba(93,135,255,0.1)' : 'transparent',
                      }}>
                      <Typography sx={{ fontSize: '0.7rem', mb: 0.15 }}>{t.icon}</Typography>
                      <Typography sx={{ fontSize: '0.52rem', color: tone === t.id ? '#5D87FF' : '#555',
                        fontWeight: tone === t.id ? 700 : 400 }}>
                        {t.label}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </Box>

              {/* AMD selector */}
              <Box>
                <Stack direction="row" spacing={0.5} alignItems="center" mb={0.6}>
                  <IconTarget size={11} color="#888" />
                  <Typography sx={{ fontSize: '0.58rem', color: '#555', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                    Ação Desejada
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={0.5} flexWrap="wrap" gap={0.5}>
                  {AMD_OPTIONS.map((a) => (
                    <Box key={a.id} onClick={() => setAmd(amd === a.id ? '' : a.id)}
                      sx={{
                        px: 0.75, py: 0.4, borderRadius: 1.5, cursor: 'pointer',
                        border: '1px solid', transition: 'all 0.15s',
                        borderColor: amd === a.id ? '#E85219' : '#1e1e1e',
                        bgcolor: amd === a.id ? 'rgba(232,82,25,0.1)' : 'transparent',
                      }}>
                      <Typography sx={{ fontSize: '0.6rem', color: amd === a.id ? '#E85219' : '#555',
                        fontWeight: amd === a.id ? 700 : 400, whiteSpace: 'nowrap' }}>
                        {a.icon} {a.label}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </Box>

              <Button
                variant="contained" size="small" fullWidth
                onClick={confirmBriefing}
                endIcon={<IconArrowRight size={13} />}
                sx={{
                  bgcolor: '#E85219', color: '#fff', fontWeight: 700,
                  fontSize: '0.7rem', textTransform: 'none',
                  '&:hover': { bgcolor: '#c43e10' },
                }}
              >
                Tudo certo — iniciar Copy
              </Button>
            </>
          )}
        </Stack>
      </NodeShell>
      <Handle type="source" position={Position.Right} id="briefing_out"
        style={{ background: '#13DEB9', width: 10, height: 10, border: 'none' }} />
    </Box>
  );
}
