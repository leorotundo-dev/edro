'use client';
import { useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import CircularProgress from '@mui/material/CircularProgress';
import { IconBrain, IconChevronDown, IconChevronUp } from '@tabler/icons-react';
import { usePipeline } from './PipelineContext';
import LiveMockupPreview from '@/components/mockups/LiveMockupPreview';
import type { ArtDirectorLayout } from './PipelineContext';

export default function PreviewPanel() {
  const {
    briefing, activeFormat, clientBrandColor,
    copyOptions, selectedCopyIdx, copyApproved,
    artDirLayout, arteImageUrl,
    targetPlatforms,
    directorInsights, directorAnalyzing,
  } = usePipeline();

  const [directorOpen, setDirectorOpen] = useState(true);

  // Resolve platform/format: use activeFormat if set, otherwise fall back to first targetPlatform
  const resolvedPlatform = activeFormat?.platform || targetPlatforms?.[0] || null;
  const resolvedFormat   = activeFormat?.format || null;

  const copy = copyOptions[selectedCopyIdx];
  const resolvedOption = copy ? {
    title: copy.title,
    body: copy.body,
    cta: copy.cta,
    legenda: copy.legenda,
    slides: copy.slides,
  } : undefined;

  const steps = [
    { label: 'Briefing', done: true },
    { label: 'Copy', done: copyApproved },
    { label: 'Gatilho', done: artDirLayout !== null },
    { label: 'Arte', done: arteImageUrl !== null },
  ];

  const hasDirector = directorAnalyzing || directorInsights.length > 0;

  return (
    <Box sx={{
      width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column',
      bgcolor: '#0d0d0d',
      borderLeft: '1px solid #1e1e1e',
    }}>
      {/* Header */}
      <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid #1e1e1e' }}>
        <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: 'text.secondary', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Preview ao Vivo
        </Typography>
        {resolvedPlatform && (
          <Stack direction="row" spacing={0.5} mt={0.5}>
            {[resolvedPlatform, resolvedFormat].filter(Boolean).map((v, i) => (
              <Chip key={i} size="small" label={v}
                sx={{ height: 16, fontSize: '0.58rem', bgcolor: '#1e1e1e', color: 'text.secondary' }} />
            ))}
          </Stack>
        )}
      </Box>

      {/* Progress strip */}
      <Stack direction="row" sx={{ borderBottom: '1px solid #1e1e1e' }}>
        {steps.map((s, i) => (
          <Box key={i} sx={{
            flex: 1, py: 0.5, textAlign: 'center',
            bgcolor: s.done ? 'rgba(19,222,185,0.06)' : 'transparent',
            borderRight: i < steps.length - 1 ? '1px solid #1e1e1e' : 'none',
            transition: 'background-color 0.4s',
          }}>
            <Typography sx={{ fontSize: '0.55rem', color: s.done ? '#13DEB9' : '#444', fontWeight: s.done ? 700 : 400 }}>
              {s.done ? '✓' : '○'} {s.label}
            </Typography>
          </Box>
        ))}
      </Stack>

      {/* Mockup — scrollable middle area */}
      <Box sx={{ flex: 1, overflow: 'auto', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', p: 2 }}>
        {resolvedOption ? (
          <Box sx={{ width: '100%', maxWidth: 340 }}>
            <LiveMockupPreview
              platform={resolvedPlatform}
              format={resolvedFormat}
              productionType={activeFormat?.production_type}
              option={resolvedOption}
              legenda={copy?.legenda || null}
              brandName={briefing?.client_name}
              brandColor={clientBrandColor || undefined}
              arteImageUrl={arteImageUrl}
              artDirectorLayout={artDirLayout as ArtDirectorLayout | undefined}
              align="left"
              showHeader={false}
            />
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5, mt: 6, color: '#333' }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="18" height="18" rx="3" stroke="#333" strokeWidth="1.5"/>
              <path d="M3 9h18M9 21V9" stroke="#333" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <Typography sx={{ fontSize: '0.65rem', color: '#444', textAlign: 'center' }}>
              Gere a copy para<br/>ver o mockup ao vivo
            </Typography>
          </Box>
        )}
      </Box>

      {/* Copy summary */}
      {(copy || arteImageUrl) && (
        <>
          <Divider sx={{ borderColor: '#1e1e1e' }} />
          <Box sx={{ px: 2, py: 1.25 }}>
            {copy?.title && (
              <Typography sx={{ fontSize: '0.65rem', color: 'text.secondary', mb: 0.5,
                display: '-webkit-box', overflow: 'hidden', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: 1.4 }}>
                "{copy.title}"
              </Typography>
            )}
            {copy?.cta && (
              <Chip size="small" label={`CTA: ${copy.cta}`}
                sx={{ height: 18, fontSize: '0.58rem', bgcolor: 'rgba(232,82,25,0.12)', color: '#E85219' }} />
            )}
            {arteImageUrl && (
              <Typography sx={{ fontSize: '0.58rem', color: '#13DEB9', mt: 0.5 }}>
                ✓ Imagem gerada
              </Typography>
            )}
          </Box>
        </>
      )}

      {/* Director AI — collapsible panel at the bottom */}
      {hasDirector && (
        <>
          <Divider sx={{ borderColor: '#1e1e1e' }} />
          {/* Header / toggle */}
          <Box
            onClick={() => setDirectorOpen((p) => !p)}
            sx={{
              px: 2, py: 1, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 0.75,
              bgcolor: 'rgba(93,135,255,0.04)',
              borderBottom: directorOpen ? '1px solid #1e1e1e' : 'none',
              '&:hover': { bgcolor: 'rgba(93,135,255,0.08)' },
              transition: 'background-color 0.15s',
            }}
          >
            {directorAnalyzing
              ? <CircularProgress size={11} sx={{ color: '#5D87FF', flexShrink: 0 }} />
              : <IconBrain size={13} color="#5D87FF" />
            }
            <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, color: '#5D87FF', flex: 1 }}>
              Diretor AI
            </Typography>
            {directorInsights.length > 0 && (
              <Chip size="small" label={`${directorInsights.length} insight${directorInsights.length !== 1 ? 's' : ''}`}
                sx={{ height: 16, fontSize: '0.52rem', bgcolor: 'rgba(93,135,255,0.15)', color: '#5D87FF', border: 'none' }} />
            )}
            {directorOpen
              ? <IconChevronDown size={12} color="#5D87FF" />
              : <IconChevronUp size={12} color="#5D87FF" />
            }
          </Box>

          {/* Insights list */}
          {directorOpen && (
            <Box sx={{ px: 1.5, py: 1, maxHeight: 240, overflow: 'auto' }}>
              {directorAnalyzing && directorInsights.length === 0 && (
                <Stack direction="row" spacing={1} alignItems="center" sx={{ py: 0.5 }}>
                  <CircularProgress size={11} sx={{ color: '#5D87FF' }} />
                  <Typography sx={{ fontSize: '0.6rem', color: '#555' }}>Analisando o criativo…</Typography>
                </Stack>
              )}
              <Stack spacing={0.75}>
                {directorInsights.map((ins, i) => {
                  const color = ins.aligned ? '#13DEB9' : ins.score >= 6 ? '#F8A800' : '#EF4444';
                  return (
                    <Box key={i} sx={{
                      p: 0.875, borderRadius: 1.5,
                      border: `1px solid ${color}33`,
                      bgcolor: `${color}06`,
                    }}>
                      <Stack direction="row" spacing={0.75} alignItems="flex-start">
                        <Box sx={{
                          width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                          bgcolor: `${color}18`, border: `1.5px solid ${color}44`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <Typography sx={{ fontSize: '0.65rem', fontWeight: 800, color, lineHeight: 1 }}>
                            {ins.score}
                          </Typography>
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Stack direction="row" spacing={0.5} alignItems="center" mb={0.25}>
                            <Chip size="small" label={ins.step}
                              sx={{ height: 14, fontSize: '0.48rem', bgcolor: `${color}18`, color, border: 'none' }} />
                            <Typography sx={{ fontSize: '0.52rem', color: ins.aligned ? '#13DEB9' : '#EF4444', fontWeight: 700 }}>
                              {ins.aligned ? 'Alinhado' : 'Atenção'}
                            </Typography>
                          </Stack>
                          <Typography sx={{ fontSize: '0.6rem', color: 'text.secondary', lineHeight: 1.4 }}>
                            {ins.message}
                          </Typography>
                          {ins.suggestions?.map((s: string, j: number) => (
                            <Typography key={j} sx={{ fontSize: '0.57rem', color: '#555', mt: 0.3, lineHeight: 1.3 }}>
                              → {s}
                            </Typography>
                          ))}
                        </Box>
                      </Stack>
                    </Box>
                  );
                })}
              </Stack>
            </Box>
          )}
        </>
      )}
    </Box>
  );
}
