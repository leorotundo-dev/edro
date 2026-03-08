'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import { IconCheck, IconArrowLeft, IconArrowRight, IconDownload, IconLayoutKanban } from '@tabler/icons-react';
import Link from 'next/link';
import { apiGet } from '@/lib/api';

type SessionState = {
  copyOptions?: Array<{
    title: string; body: string; cta: string; legenda: string; hashtags: string;
  }>;
  selectedCopyIdx?: number;
  copyApproved?: boolean;
  arteImageUrl?: string | null;
  arteImageUrls?: string[];
  selectedArteIdx?: number;
  arteApproved?: boolean;
  selectedTrigger?: string | null;
  tone?: string;
  amd?: string;
  multiFormat?: Array<{ format: string; aspectRatio: string; imageUrl: string }>;
};

const TRIGGER_LABELS: Record<string, string> = {
  G01: 'Escassez', G02: 'Autoridade', G03: 'Prova Social',
  G04: 'Reciprocidade', G05: 'Curiosidade', G06: 'Identidade', G07: 'Dor/Solução',
};
const TRIGGER_COLORS: Record<string, string> = {
  G01: '#FF4D4D', G02: '#00B4FF', G03: '#13DEB9',
  G04: '#F5C518', G05: '#A855F7', G06: '#FB923C', G07: '#888',
};

const STEPS = ['Briefing & Copy', 'Arte', 'Aprovação'];

export default function AppModePage() {
  const { briefingId } = useParams() as { briefingId: string };
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<SessionState>({});
  const [approved, setApproved] = useState(false);

  useEffect(() => {
    apiGet<{ success: boolean; state: SessionState }>(`/studio/pipeline/${briefingId}/session`)
      .then((res) => { if (res?.state) setSession(res.state); })
      .finally(() => setLoading(false));
  }, [briefingId]);

  const copy = session.copyOptions?.[session.selectedCopyIdx ?? 0];
  const arteUrl = session.arteImageUrls?.[session.selectedArteIdx ?? 0] ?? session.arteImageUrl;

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: '#0d0d0d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress sx={{ color: '#13DEB9' }} />
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#0d0d0d', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ px: 3, py: 2, borderBottom: '1px solid #1a1a1a', display: 'flex', alignItems: 'center', gap: 2 }}>
        <Button
          component={Link}
          href={`/studio/pipeline/${briefingId}`}
          size="small" variant="text"
          startIcon={<IconLayoutKanban size={14} />}
          sx={{ color: '#555', textTransform: 'none', fontSize: '0.72rem' }}
        >
          Pipeline
        </Button>
        <Box sx={{ flex: 1 }}>
          {/* Progress bar */}
          <Stack direction="row" spacing={0} sx={{ position: 'relative' }}>
            {STEPS.map((label, i) => (
              <Box key={i} onClick={() => setStep(i)}
                sx={{
                  flex: 1, cursor: 'pointer',
                  borderBottom: '3px solid',
                  borderColor: i <= step ? '#13DEB9' : '#1e1e1e',
                  pb: 0.75, transition: 'border-color 0.2s',
                }}
              >
                <Stack direction="row" alignItems="center" spacing={0.75}>
                  <Box sx={{
                    width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                    bgcolor: i < step ? '#13DEB9' : i === step ? 'rgba(19,222,185,0.15)' : '#111',
                    border: `1.5px solid ${i <= step ? '#13DEB9' : '#333'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {i < step
                      ? <IconCheck size={10} color="#000" />
                      : <Typography sx={{ fontSize: '0.5rem', color: i === step ? '#13DEB9' : '#444', fontWeight: 700 }}>{i + 1}</Typography>
                    }
                  </Box>
                  <Typography sx={{
                    fontSize: '0.65rem', fontWeight: i === step ? 700 : 400,
                    color: i === step ? '#13DEB9' : i < step ? '#888' : '#444',
                  }}>
                    {label}
                  </Typography>
                </Stack>
              </Box>
            ))}
          </Stack>
        </Box>
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', p: 4, pt: 5 }}>
        <Box sx={{ width: '100%', maxWidth: 640 }}>

          {/* ── Step 0: Briefing & Copy ── */}
          {step === 0 && (
            <Stack spacing={3}>
              <Stack spacing={0.5}>
                <Typography sx={{ fontSize: '0.6rem', color: '#555', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  Briefing & Copy
                </Typography>
                <Typography variant="h5" sx={{ color: 'text.primary', fontWeight: 700 }}>
                  Revise o texto criativo
                </Typography>
              </Stack>

              {/* Copy tags */}
              {(session.selectedTrigger || session.tone || session.amd) && (
                <Stack direction="row" spacing={1} flexWrap="wrap" gap={0.75}>
                  {session.selectedTrigger && (
                    <Chip size="small" label={`${session.selectedTrigger} — ${TRIGGER_LABELS[session.selectedTrigger] ?? ''}`}
                      sx={{ bgcolor: `${TRIGGER_COLORS[session.selectedTrigger]}22`, color: TRIGGER_COLORS[session.selectedTrigger], fontSize: '0.65rem' }} />
                  )}
                  {session.tone && (
                    <Chip size="small" label={session.tone}
                      sx={{ bgcolor: 'rgba(93,135,255,0.12)', color: '#5D87FF', fontSize: '0.65rem' }} />
                  )}
                  {session.amd && (
                    <Chip size="small" label={`AMD: ${session.amd}`}
                      sx={{ bgcolor: '#1a1a1a', color: '#888', fontSize: '0.65rem', border: '1px solid #222' }} />
                  )}
                </Stack>
              )}

              {copy ? (
                <Box sx={{ p: 3, borderRadius: 2, border: '1px solid #222', bgcolor: '#111' }}>
                  <Stack spacing={2}>
                    {copy.title && (
                      <Box>
                        <Typography sx={{ fontSize: '0.58rem', color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em', mb: 0.5 }}>Headline</Typography>
                        <Typography sx={{ fontSize: '1.1rem', fontWeight: 700, color: 'text.primary', lineHeight: 1.3 }}>
                          {copy.title}
                        </Typography>
                      </Box>
                    )}
                    {copy.body && (
                      <Box>
                        <Typography sx={{ fontSize: '0.58rem', color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em', mb: 0.5 }}>Corpo</Typography>
                        <Typography sx={{ fontSize: '0.9rem', color: 'text.secondary', lineHeight: 1.6 }}>
                          {copy.body}
                        </Typography>
                      </Box>
                    )}
                    {copy.cta && (
                      <Box>
                        <Typography sx={{ fontSize: '0.58rem', color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em', mb: 0.5 }}>CTA</Typography>
                        <Chip label={copy.cta} sx={{ bgcolor: 'rgba(19,222,185,0.12)', color: '#13DEB9', fontWeight: 700 }} />
                      </Box>
                    )}
                    {copy.legenda && (
                      <>
                        <Divider sx={{ borderColor: '#1e1e1e' }} />
                        <Box>
                          <Typography sx={{ fontSize: '0.58rem', color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em', mb: 0.75 }}>Legenda</Typography>
                          <Typography sx={{ fontSize: '0.8rem', color: '#888', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                            {copy.legenda}
                          </Typography>
                        </Box>
                      </>
                    )}
                  </Stack>
                </Box>
              ) : (
                <Box sx={{ p: 3, borderRadius: 2, border: '1px dashed #222', textAlign: 'center' }}>
                  <Typography sx={{ color: '#555', fontSize: '0.8rem' }}>Copy ainda não gerada no pipeline</Typography>
                </Box>
              )}

              {session.copyApproved && (
                <Stack direction="row" spacing={0.75} alignItems="center">
                  <IconCheck size={14} color="#13DEB9" />
                  <Typography sx={{ fontSize: '0.72rem', color: '#13DEB9' }}>Copy aprovada no pipeline</Typography>
                </Stack>
              )}
            </Stack>
          )}

          {/* ── Step 1: Arte ── */}
          {step === 1 && (
            <Stack spacing={3}>
              <Stack spacing={0.5}>
                <Typography sx={{ fontSize: '0.6rem', color: '#555', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  Direção de Arte
                </Typography>
                <Typography variant="h5" sx={{ color: 'text.primary', fontWeight: 700 }}>
                  Revise a arte gerada
                </Typography>
              </Stack>

              {arteUrl ? (
                <Stack spacing={2}>
                  <Box sx={{ borderRadius: 2, overflow: 'hidden', border: '1px solid #222', position: 'relative' }}>
                    <Box component="img" src={arteUrl} alt="Arte gerada"
                      sx={{ width: '100%', display: 'block', maxHeight: 480, objectFit: 'contain', bgcolor: '#111' }} />
                  </Box>
                  <Button
                    component={Link} href={arteUrl} target="_blank" rel="noopener"
                    size="small" variant="outlined" fullWidth
                    startIcon={<IconDownload size={13} />}
                    sx={{ textTransform: 'none', borderColor: '#333', color: '#888', '&:hover': { borderColor: '#555' } }}
                  >
                    Download
                  </Button>

                  {/* Brand Pack formats if available */}
                  {session.multiFormat && session.multiFormat.length > 0 && (
                    <Box>
                      <Typography sx={{ fontSize: '0.6rem', color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em', mb: 1 }}>
                        Brand Pack — {session.multiFormat.length} formatos
                      </Typography>
                      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                        {session.multiFormat.map((mf) => (
                          <Box key={mf.format} sx={{ borderRadius: 1.5, overflow: 'hidden', border: '1px solid #222' }}>
                            <Box component="img" src={mf.imageUrl} alt={mf.format}
                              sx={{ width: '100%', height: 100, objectFit: 'cover', display: 'block' }} />
                            <Box sx={{ px: 1, py: 0.75, bgcolor: '#0a0a0a' }}>
                              <Typography sx={{ fontSize: '0.6rem', color: '#22C55E', fontWeight: 700 }}>{mf.format}</Typography>
                              <Typography sx={{ fontSize: '0.55rem', color: '#555' }}>{mf.aspectRatio}</Typography>
                            </Box>
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  )}

                  {session.arteApproved && (
                    <Stack direction="row" spacing={0.75} alignItems="center">
                      <IconCheck size={14} color="#13DEB9" />
                      <Typography sx={{ fontSize: '0.72rem', color: '#13DEB9' }}>Arte aprovada no pipeline</Typography>
                    </Stack>
                  )}
                </Stack>
              ) : (
                <Box sx={{ p: 4, borderRadius: 2, border: '1px dashed #222', textAlign: 'center' }}>
                  <Typography sx={{ color: '#555', fontSize: '0.8rem' }}>Arte ainda não gerada no pipeline</Typography>
                  <Button
                    component={Link} href={`/studio/pipeline/${briefingId}`}
                    size="small" variant="outlined"
                    sx={{ mt: 1.5, textTransform: 'none', borderColor: '#333', color: '#888' }}
                    startIcon={<IconLayoutKanban size={12} />}
                  >
                    Abrir Pipeline
                  </Button>
                </Box>
              )}
            </Stack>
          )}

          {/* ── Step 2: Aprovação ── */}
          {step === 2 && (
            <Stack spacing={3}>
              <Stack spacing={0.5}>
                <Typography sx={{ fontSize: '0.6rem', color: '#555', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  Aprovação Final
                </Typography>
                <Typography variant="h5" sx={{ color: 'text.primary', fontWeight: 700 }}>
                  Aprovar e exportar
                </Typography>
              </Stack>

              {/* Summary card */}
              <Box sx={{ p: 2.5, borderRadius: 2, border: '1px solid #222', bgcolor: '#111' }}>
                <Stack direction="row" spacing={2} alignItems="flex-start">
                  {arteUrl && (
                    <Box sx={{ width: 80, height: 80, borderRadius: 1.5, overflow: 'hidden', flexShrink: 0 }}>
                      <Box component="img" src={arteUrl} alt="Arte" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </Box>
                  )}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    {copy?.title && (
                      <Typography sx={{ fontSize: '0.9rem', fontWeight: 700, color: 'text.primary', mb: 0.5, lineHeight: 1.3 }}>
                        {copy.title}
                      </Typography>
                    )}
                    {copy?.cta && (
                      <Chip size="small" label={copy.cta}
                        sx={{ height: 20, fontSize: '0.6rem', bgcolor: 'rgba(19,222,185,0.12)', color: '#13DEB9' }} />
                    )}
                    <Stack direction="row" spacing={0.75} mt={1} flexWrap="wrap" gap={0.5}>
                      <Chip size="small" icon={session.copyApproved ? <IconCheck size={9} /> : undefined}
                        label={session.copyApproved ? 'Copy ✓' : 'Copy pendente'}
                        sx={{ height: 18, fontSize: '0.55rem',
                          bgcolor: session.copyApproved ? 'rgba(19,222,185,0.1)' : '#111',
                          color: session.copyApproved ? '#13DEB9' : '#555' }} />
                      <Chip size="small" icon={session.arteApproved ? <IconCheck size={9} /> : undefined}
                        label={session.arteApproved ? 'Arte ✓' : 'Arte pendente'}
                        sx={{ height: 18, fontSize: '0.55rem',
                          bgcolor: session.arteApproved ? 'rgba(19,222,185,0.1)' : '#111',
                          color: session.arteApproved ? '#13DEB9' : '#555' }} />
                    </Stack>
                  </Box>
                </Stack>
              </Box>

              {!approved ? (
                <Stack spacing={1}>
                  <Button
                    variant="contained" size="large" fullWidth
                    onClick={() => setApproved(true)}
                    disabled={!arteUrl}
                    startIcon={<IconCheck size={16} />}
                    sx={{
                      bgcolor: '#13DEB9', color: '#000', fontWeight: 700, fontSize: '0.9rem',
                      textTransform: 'none', py: 1.5,
                      '&:hover': { bgcolor: '#0fb89e' },
                      '&.Mui-disabled': { bgcolor: '#1a1a1a', color: '#444' },
                    }}
                  >
                    Aprovar peça criativa
                  </Button>
                  <Button
                    component={Link} href={`/studio/pipeline/${briefingId}`}
                    variant="outlined" size="small" fullWidth
                    startIcon={<IconLayoutKanban size={12} />}
                    sx={{ textTransform: 'none', borderColor: '#222', color: '#555' }}
                  >
                    Voltar ao pipeline para ajustes
                  </Button>
                </Stack>
              ) : (
                <Stack spacing={1.5}>
                  <Box sx={{ p: 2, borderRadius: 2, border: '1px solid #13DEB933', bgcolor: 'rgba(19,222,185,0.04)', textAlign: 'center' }}>
                    <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
                      <Box sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: '#13DEB9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <IconCheck size={16} color="#000" />
                      </Box>
                      <Typography sx={{ color: '#13DEB9', fontWeight: 700, fontSize: '0.9rem' }}>
                        Peça aprovada!
                      </Typography>
                    </Stack>
                  </Box>
                  {arteUrl && (
                    <Button
                      component={Link} href={arteUrl} target="_blank" rel="noopener"
                      variant="outlined" size="large" fullWidth
                      startIcon={<IconDownload size={14} />}
                      sx={{ textTransform: 'none', borderColor: '#13DEB944', color: '#13DEB9',
                        '&:hover': { borderColor: '#13DEB9', bgcolor: 'rgba(19,222,185,0.06)' } }}
                    >
                      Baixar arte aprovada
                    </Button>
                  )}
                </Stack>
              )}
            </Stack>
          )}

          {/* Navigation */}
          <Stack direction="row" spacing={1.5} justifyContent="space-between" mt={4}>
            <Button
              variant="outlined" size="small"
              disabled={step === 0}
              onClick={() => setStep(p => p - 1)}
              startIcon={<IconArrowLeft size={13} />}
              sx={{ textTransform: 'none', borderColor: '#222', color: '#555', '&:hover': { borderColor: '#333', color: '#888' }, '&.Mui-disabled': { borderColor: '#111', color: '#333' } }}
            >
              Anterior
            </Button>
            <Button
              variant={step === 2 ? 'text' : 'outlined'} size="small"
              disabled={step === 2}
              onClick={() => setStep(p => p + 1)}
              endIcon={<IconArrowRight size={13} />}
              sx={{ textTransform: 'none', borderColor: '#222', color: step === 2 ? '#333' : '#888', '&:hover': { borderColor: '#333', color: '#aaa' } }}
            >
              {step === 1 ? 'Aprovação' : 'Arte'}
            </Button>
          </Stack>
        </Box>
      </Box>
    </Box>
  );
}
