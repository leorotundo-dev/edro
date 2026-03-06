'use client';
import { Handle, Position } from '@xyflow/react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Divider from '@mui/material/Divider';
import { IconDownload, IconChefHat, IconCheck, IconMail, IconCalendar, IconChartBar, IconBrain, IconBookmark, IconBrandInstagram } from '@tabler/icons-react';
import Link from 'next/link';
import { useState } from 'react';
import NodeShell from '../NodeShell';
import { usePipeline } from '../PipelineContext';

export default function ExportNode() {
  const { copyOptions, selectedCopyIdx, arteImageUrl, nodeStatus, saveRecipe, briefing, activeFormat, addOptionalNode, activeNodeIds, selectedTrigger, clientBrandColor } = usePipeline();
  const status = nodeStatus.export;
  const selectedCopy = copyOptions[selectedCopyIdx];

  const [recipeName, setRecipeName] = useState('');
  const [recipeSaved, setRecipeSaved] = useState(false);
  const [savingRecipe, setSavingRecipe] = useState(false);

  // Biblioteca de Peças
  const [savedToBiblioteca, setSavedToBiblioteca] = useState(false);
  const [savedCreativeId, setSavedCreativeId] = useState<string | null>(null);

  // Meta publishing
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);
  const [publishError, setPublishError] = useState('');

  const suggestedName = [
    activeFormat?.platform,
    activeFormat?.format,
    briefing?.payload?.objective,
  ].filter(Boolean).join(' — ') || 'Minha Receita';

  const handleSaveRecipe = async () => {
    setSavingRecipe(true);
    await saveRecipe(recipeName || suggestedName);
    setRecipeSaved(true);
    setSavingRecipe(false);
  };

  const handleSaveToBiblioteca = async () => {
    if (!arteImageUrl) return;
    try {
      const { apiPost } = await import('@/lib/api');
      const clientId = typeof window !== 'undefined'
        ? window.localStorage.getItem('edro_active_client_id')
        : null;
      const res = await apiPost<{ success: boolean; data: { id: string } }>('/studio/biblioteca', {
        client_id:    clientId || undefined,
        briefing_id:  briefing?.id || undefined,
        platform:     activeFormat?.platform || undefined,
        format:       activeFormat?.format || undefined,
        trigger_id:   selectedTrigger || undefined,
        copy_title:   selectedCopy?.title || undefined,
        copy_body:    selectedCopy?.body || undefined,
        copy_cta:     selectedCopy?.cta || undefined,
        copy_legenda: selectedCopy?.legenda || undefined,
        image_url:    arteImageUrl,
        recipe_name:  briefing?.title || undefined,
      });
      if (res?.data?.id) setSavedCreativeId(res.data.id);
      setSavedToBiblioteca(true);
    } catch {}
  };

  const handlePublishMeta = async () => {
    if (!arteImageUrl) return;
    const clientId = typeof window !== 'undefined'
      ? window.localStorage.getItem('edro_active_client_id')
      : null;
    if (!clientId) return;
    setPublishing(true);
    setPublishError('');
    try {
      const { apiPost } = await import('@/lib/api');
      const caption = [selectedCopy?.title, selectedCopy?.body, selectedCopy?.cta, selectedCopy?.legenda]
        .filter(Boolean).join('\n\n');
      await apiPost('/studio/creative/publish-meta', {
        client_id: clientId,
        image_url: arteImageUrl,
        caption,
        briefing_id: briefing?.id || undefined,
        creative_id: savedCreativeId || undefined,
      });
      setPublished(true);
    } catch (e: any) {
      setPublishError(e?.message || 'Erro ao publicar no Meta.');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <Box>
      <Handle type="target" position={Position.Left} id="export_in"
        style={{ background: '#444', width: 10, height: 10, border: 'none' }} />

      <NodeShell
        title="Exportar"
        icon={<IconDownload size={14} />}
        status={status}
        width={260}
        nodeOptions={[
          {
            id: 'approval',
            label: 'Aprovação do Cliente',
            description: 'Enviar peça por e-mail para aprovação',
            color: '#7C3AED',
            icon: <IconMail size={13} />,
            added: activeNodeIds.includes('approval'),
            onClick: () => addOptionalNode('approval'),
          },
          {
            id: 'schedule',
            label: 'Agendar Publicação',
            description: 'Definir horário ideal com sugestão de IA',
            color: '#7C3AED',
            icon: <IconCalendar size={13} />,
            added: activeNodeIds.includes('schedule'),
            onClick: () => addOptionalNode('schedule'),
          },
          {
            id: 'performance',
            label: 'Monitorar Performance',
            description: 'Ativar KPIs pós-publicação (Reportei)',
            color: '#0EA5E9',
            icon: <IconChartBar size={13} />,
            added: activeNodeIds.includes('performance'),
            onClick: () => addOptionalNode('performance'),
          },
          {
            id: 'learningFeedback',
            label: 'Fechar Loop de Aprendizado',
            description: 'Salvar insights no LearningEngine',
            color: '#0EA5E9',
            icon: <IconBrain size={13} />,
            added: activeNodeIds.includes('learningFeedback'),
            onClick: () => addOptionalNode('learningFeedback'),
          },
        ]}
      >
        <Stack spacing={1.25}>
          {arteImageUrl && (
            <Box sx={{ width: '100%', height: 70, borderRadius: 1.5, overflow: 'hidden', border: '1px solid #13DEB944' }}>
              <img src={arteImageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </Box>
          )}

          {selectedCopy?.title && (
            <Typography sx={{ fontSize: '0.65rem', color: 'text.secondary', textAlign: 'center', lineHeight: 1.4,
              display: '-webkit-box', overflow: 'hidden', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
              "{selectedCopy.title}"
            </Typography>
          )}

          <Button
            variant="contained" size="small" fullWidth
            component={arteImageUrl ? Link : 'button'}
            href={arteImageUrl ? '/studio/export' : undefined}
            disabled={!arteImageUrl}
            startIcon={<IconDownload size={13} />}
            sx={{
              bgcolor: arteImageUrl ? '#13DEB9' : undefined,
              color: arteImageUrl ? '#000' : undefined,
              fontWeight: 700, fontSize: '0.72rem',
              textTransform: 'none',
              '&:hover': arteImageUrl ? { bgcolor: '#0fb89e' } : {},
            }}
          >
            Exportar Peça
          </Button>

          {/* Save as recipe */}
          {arteImageUrl && (
            <>
              <Divider sx={{ borderColor: '#1e1e1e' }} />
              {recipeSaved ? (
                <Stack direction="row" spacing={0.75} alignItems="center" justifyContent="center">
                  <IconCheck size={12} color="#13DEB9" />
                  <Typography sx={{ fontSize: '0.62rem', color: '#13DEB9' }}>
                    Receita salva no Livro!
                  </Typography>
                </Stack>
              ) : (
                <Stack spacing={0.75}>
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <IconChefHat size={11} color="#F8A800" />
                    <Typography sx={{ fontSize: '0.6rem', color: '#F8A800', fontWeight: 600 }}>
                      Salvar como Receita
                    </Typography>
                  </Stack>
                  <TextField
                    size="small" fullWidth
                    placeholder={suggestedName}
                    value={recipeName}
                    onChange={(e) => setRecipeName(e.target.value)}
                    sx={{ '& .MuiInputBase-root': { fontSize: '0.65rem' } }}
                  />
                  <Button
                    size="small" variant="outlined" fullWidth
                    onClick={handleSaveRecipe}
                    disabled={savingRecipe}
                    startIcon={<IconChefHat size={11} />}
                    sx={{
                      textTransform: 'none', fontSize: '0.65rem',
                      borderColor: '#F8A80066', color: '#F8A800',
                      '&:hover': { borderColor: '#F8A800', bgcolor: 'rgba(248,168,0,0.06)' },
                    }}
                  >
                    Guardar no Livro de Receitas
                  </Button>
                </Stack>
              )}
            </>
          )}

          {/* Biblioteca de Peças */}
          {arteImageUrl && (
            <>
              <Divider sx={{ borderColor: '#1e1e1e' }} />
              {savedToBiblioteca ? (
                <Stack direction="row" spacing={0.75} alignItems="center" justifyContent="center">
                  <IconCheck size={12} color="#13DEB9" />
                  <Typography sx={{ fontSize: '0.62rem', color: '#13DEB9' }}>
                    Salvo na{' '}
                    <Link href="/studio/biblioteca" style={{ color: '#13DEB9', textDecoration: 'underline' }}>
                      Biblioteca
                    </Link>
                  </Typography>
                </Stack>
              ) : (
                <Button
                  size="small" variant="outlined" fullWidth
                  onClick={handleSaveToBiblioteca}
                  startIcon={<IconBookmark size={11} />}
                  sx={{
                    textTransform: 'none', fontSize: '0.65rem',
                    borderColor: '#5D87FF66', color: '#5D87FF',
                    '&:hover': { borderColor: '#5D87FF', bgcolor: 'rgba(93,135,255,0.06)' },
                  }}
                >
                  Salvar na Biblioteca
                </Button>
              )}
            </>
          )}

          {/* Publicar no Meta */}
          {arteImageUrl && (
            <>
              <Divider sx={{ borderColor: '#1e1e1e' }} />
              {published ? (
                <Stack direction="row" spacing={0.75} alignItems="center" justifyContent="center">
                  <IconCheck size={12} color="#1877F2" />
                  <Typography sx={{ fontSize: '0.62rem', color: '#1877F2' }}>
                    Publicado no Meta!
                  </Typography>
                </Stack>
              ) : (
                <Stack spacing={0.5}>
                  {publishError && (
                    <Typography sx={{ fontSize: '0.6rem', color: '#FF4D4D' }}>{publishError}</Typography>
                  )}
                  <Button
                    size="small" variant="outlined" fullWidth
                    onClick={handlePublishMeta}
                    disabled={publishing}
                    startIcon={<IconBrandInstagram size={11} />}
                    sx={{
                      textTransform: 'none', fontSize: '0.65rem',
                      borderColor: '#1877F266', color: '#1877F2',
                      '&:hover': { borderColor: '#1877F2', bgcolor: 'rgba(24,119,242,0.06)' },
                      '&.Mui-disabled': { borderColor: '#333', color: '#555' },
                    }}
                  >
                    {publishing ? 'Publicando…' : 'Publicar no Meta'}
                  </Button>
                </Stack>
              )}
            </>
          )}
        </Stack>
      </NodeShell>
    </Box>
  );
}
