'use client';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import { usePipeline } from './PipelineContext';
import LiveMockupPreview from '@/components/mockups/LiveMockupPreview';
import type { ArtDirectorLayout } from './PipelineContext';

export default function PreviewPanel() {
  const {
    briefing, activeFormat, clientBrandColor,
    copyOptions, selectedCopyIdx, copyApproved,
    artDirLayout, arteImageUrl,
  } = usePipeline();

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
        {activeFormat && (
          <Stack direction="row" spacing={0.5} mt={0.5}>
            {[activeFormat.platform, activeFormat.format].filter(Boolean).map((v, i) => (
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

      {/* Mockup */}
      <Box sx={{ flex: 1, overflow: 'auto', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', p: 2 }}>
        {activeFormat?.platform || activeFormat?.format ? (
          <Box sx={{ width: '100%', maxWidth: 340 }}>
            <LiveMockupPreview
              platform={activeFormat.platform}
              format={activeFormat.format}
              productionType={activeFormat.production_type}
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
              O mockup aparece<br/>conforme o pipeline avança
            </Typography>
          </Box>
        )}
      </Box>

      {/* Summary */}
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
    </Box>
  );
}
