'use client';
import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Avatar from '@mui/material/Avatar';
import {
  IconCheck, IconX, IconSend, IconArrowLeft, IconArrowRight,
  IconMessage, IconDownload,
} from '@tabler/icons-react';

// ─── Types ────────────────────────────────────────────────────────────────────
type SessionState = {
  copyOptions?: Array<{ title: string; body: string; cta: string; legenda: string }>;
  selectedCopyIdx?: number;
  arteImageUrl?: string | null;
  arteImageUrls?: string[];
  selectedArteIdx?: number;
  multiFormat?: Array<{ format: string; aspectRatio: string; imageUrl: string }>;
};

type Comment = {
  id: string; section: string; author_type: 'agency' | 'client';
  author_name: string; body: string; resolved: boolean; created_at: string;
};

type SectionId = 'copy' | 'arte' | 'approval';

const STEPS: { id: SectionId; label: string }[] = [
  { id: 'copy',     label: 'Copy' },
  { id: 'arte',     label: 'Arte' },
  { id: 'approval', label: 'Aprovação' },
];

const API = '/api/proxy';

// ─── Main page ────────────────────────────────────────────────────────────────
export default function CollabPage() {
  const { briefingId }    = useParams() as { briefingId: string };
  const searchParams      = useSearchParams();
  const token             = searchParams.get('token') || '';

  const [loading, setLoading]       = useState(true);
  const [invalid, setInvalid]       = useState(false);
  const [session, setSession]       = useState<SessionState>({});
  const [clientName, setClientName] = useState('');
  const [step, setStep]             = useState<SectionId>('copy');
  const [stepIdx, setStepIdx]       = useState(0);

  // Comments
  const [comments, setComments]         = useState<Comment[]>([]);
  const [commentBody, setCommentBody]   = useState('');
  const [sendingComment, setSending]    = useState(false);

  // Approval per section
  const [decisions, setDecisions]       = useState<Record<string, 'approved' | 'rejected' | null>>({});
  const [feedback, setFeedback]         = useState('');
  const [submittingApproval, setSubmitting] = useState(false);
  const [finalDecision, setFinalDecision]  = useState<'approved' | 'rejected' | null>(null);

  const commentsEndRef = useRef<HTMLDivElement>(null);

  // ── Load session on mount ──────────────────────────────────────────────────
  useEffect(() => {
    if (!token) { setInvalid(true); setLoading(false); return; }
    fetch(`${API}/studio/pipeline/collab/validate?briefingId=${briefingId}&token=${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.valid) { setInvalid(true); return; }
        setSession(data.state || {});
        setClientName(data.meta?.client_name || '');
      })
      .catch(() => setInvalid(true))
      .finally(() => setLoading(false));
  }, [briefingId, token]);

  // ── Load comments ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!token || invalid) return;
    fetch(`${API}/studio/pipeline/${briefingId}/comments?token=${token}`)
      .then((r) => r.json())
      .then((d) => setComments(d.comments || []))
      .catch(() => {});
  }, [briefingId, token, invalid]);

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  // ── Send comment ───────────────────────────────────────────────────────────
  const sendComment = async () => {
    if (!commentBody.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`${API}/studio/pipeline/${briefingId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section: step, body: commentBody.trim(), token, author_name: clientName || 'Cliente', author_type: 'client' }),
      });
      const data = await res.json();
      if (data.comment) {
        setComments((prev) => [...prev, data.comment]);
        setCommentBody('');
      }
    } finally {
      setSending(false);
    }
  };

  // ── Submit section approval ────────────────────────────────────────────────
  const submitApproval = async (decision: 'approved' | 'rejected') => {
    setSubmitting(true);
    try {
      const isLast = step === 'approval';
      const section = isLast ? 'final' : step;
      await fetch(`${API}/studio/pipeline/${briefingId}/client-approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, decision, section, feedback: feedback.trim() || undefined, client_name: clientName }),
      });
      setDecisions((prev) => ({ ...prev, [step]: decision }));
      if (isLast) setFinalDecision(decision);
      setFeedback('');
    } finally {
      setSubmitting(false);
    }
  };

  const goStep = (direction: 1 | -1) => {
    const idx = Math.min(Math.max(stepIdx + direction, 0), STEPS.length - 1);
    setStepIdx(idx);
    setStep(STEPS[idx].id);
  };

  const copy     = session.copyOptions?.[session.selectedCopyIdx ?? 0];
  const arteUrl  = session.arteImageUrls?.[session.selectedArteIdx ?? 0] ?? session.arteImageUrl;
  const sectionComments = comments.filter((c) => c.section === step);

  // ── Screens ────────────────────────────────────────────────────────────────
  if (loading) return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <CircularProgress sx={{ color: '#13DEB9' }} />
    </Box>
  );

  if (invalid) return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Box sx={{ textAlign: 'center', p: 4 }}>
        <Typography variant="h5" fontWeight={700} color="error.main" sx={{ mb: 1 }}>Link inválido ou expirado</Typography>
        <Typography color="text.secondary" fontSize="0.9rem">Solicite um novo link de revisão para sua agência.</Typography>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#0a0a0a', display: 'flex', flexDirection: 'column' }}>

      {/* ── Header ── */}
      <Box sx={{ px: 3, py: 1.5, borderBottom: '1px solid #111', bgcolor: '#0d0d0d',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: '#5D87FF' }}>edro</Typography>
          <Typography sx={{ fontSize: '0.7rem', color: '#444' }}>·</Typography>
          <Typography sx={{ fontSize: '0.72rem', color: '#666' }}>Revisão criativa</Typography>
          {clientName && <Chip size="small" label={clientName} sx={{ height: 18, fontSize: '0.58rem', bgcolor: '#1a1a1a', color: '#888' }} />}
        </Stack>
        {/* Step tabs */}
        <Stack direction="row" spacing={0.5}>
          {STEPS.map((s, i) => (
            <Box key={s.id} onClick={() => { setStepIdx(i); setStep(s.id); }}
              sx={{ px: 1.25, py: 0.5, borderRadius: 1, cursor: 'pointer',
                bgcolor: step === s.id ? 'rgba(19,222,185,0.1)' : 'transparent',
                border: `1px solid ${step === s.id ? '#13DEB944' : '#1a1a1a'}`,
              }}>
              <Stack direction="row" spacing={0.5} alignItems="center">
                {decisions[s.id] === 'approved' && <IconCheck size={11} color="#13DEB9" />}
                {decisions[s.id] === 'rejected' && <IconX size={11} color="#FF4D4D" />}
                <Typography sx={{ fontSize: '0.65rem', color: step === s.id ? '#13DEB9' : '#555', fontWeight: step === s.id ? 700 : 400 }}>
                  {s.label}
                </Typography>
              </Stack>
            </Box>
          ))}
        </Stack>
      </Box>

      {/* ── Main layout: content + comments sidebar ── */}
      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Content area */}
        <Box sx={{ flex: 1, overflow: 'auto', p: { xs: 2, md: 4 } }}>
          <Box sx={{ maxWidth: 580, mx: 'auto' }}>

            {/* ── Copy step ── */}
            {step === 'copy' && (
              <Stack spacing={3}>
                <Typography variant="h5" fontWeight={700}>Revise o texto</Typography>
                {copy ? (
                  <Box sx={{ p: 3, borderRadius: 2, border: '1px solid #1e1e1e', bgcolor: '#111' }}>
                    <Stack spacing={2.5}>
                      {copy.title && (
                        <Box>
                          <Typography sx={{ fontSize: '0.58rem', color: '#555', textTransform: 'uppercase', mb: 0.5 }}>Headline</Typography>
                          <Typography sx={{ fontSize: '1.1rem', fontWeight: 700, lineHeight: 1.3 }}>{copy.title}</Typography>
                        </Box>
                      )}
                      {copy.body && (
                        <Box>
                          <Typography sx={{ fontSize: '0.58rem', color: '#555', textTransform: 'uppercase', mb: 0.5 }}>Corpo</Typography>
                          <Typography sx={{ color: 'text.secondary', lineHeight: 1.7 }}>{copy.body}</Typography>
                        </Box>
                      )}
                      {copy.cta && (
                        <Box>
                          <Typography sx={{ fontSize: '0.58rem', color: '#555', textTransform: 'uppercase', mb: 0.5 }}>CTA</Typography>
                          <Chip label={copy.cta} sx={{ bgcolor: 'rgba(19,222,185,0.1)', color: '#13DEB9', fontWeight: 700 }} />
                        </Box>
                      )}
                      {copy.legenda && (
                        <>
                          <Divider sx={{ borderColor: '#1e1e1e' }} />
                          <Box>
                            <Typography sx={{ fontSize: '0.58rem', color: '#555', textTransform: 'uppercase', mb: 0.75 }}>Legenda</Typography>
                            <Typography sx={{ color: '#888', lineHeight: 1.6, fontSize: '0.85rem', whiteSpace: 'pre-line' }}>{copy.legenda}</Typography>
                          </Box>
                        </>
                      )}
                    </Stack>
                  </Box>
                ) : (
                  <Box sx={{ p: 3, border: '1px dashed #222', borderRadius: 2, textAlign: 'center' }}>
                    <Typography color="text.secondary" fontSize="0.85rem">Copy ainda não disponível.</Typography>
                  </Box>
                )}
                {ApprovalButtons({ step, decisions, submittingApproval, feedback, setFeedback, submitApproval })}
              </Stack>
            )}

            {/* ── Arte step ── */}
            {step === 'arte' && (
              <Stack spacing={3}>
                <Typography variant="h5" fontWeight={700}>Revise a arte</Typography>
                {arteUrl ? (
                  <Stack spacing={1.5}>
                    <Box sx={{ borderRadius: 2, overflow: 'hidden', border: '1px solid #1e1e1e' }}>
                      <Box component="img" src={arteUrl} alt="Arte"
                        sx={{ width: '100%', display: 'block', maxHeight: 460, objectFit: 'contain', bgcolor: '#0d0d0d' }} />
                    </Box>
                    <Button component="a" href={arteUrl} target="_blank" rel="noopener noreferrer" size="small" variant="outlined" fullWidth
                      startIcon={<IconDownload size={13} />}
                      sx={{ textTransform: 'none', borderColor: '#222', color: '#888' }}>
                      Download
                    </Button>
                    {session.multiFormat && session.multiFormat.length > 0 && (
                      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, mt: 1 }}>
                        {session.multiFormat.map((mf) => (
                          <Box key={mf.format} sx={{ borderRadius: 1.5, overflow: 'hidden', border: '1px solid #1e1e1e' }}>
                            <Box component="img" src={mf.imageUrl} alt={mf.format}
                              sx={{ width: '100%', height: 90, objectFit: 'cover', display: 'block' }} />
                            <Box sx={{ px: 1, py: 0.75, bgcolor: '#0a0a0a' }}>
                              <Typography sx={{ fontSize: '0.6rem', color: '#13DEB9', fontWeight: 700 }}>{mf.format}</Typography>
                              <Typography sx={{ fontSize: '0.55rem', color: '#555' }}>{mf.aspectRatio}</Typography>
                            </Box>
                          </Box>
                        ))}
                      </Box>
                    )}
                  </Stack>
                ) : (
                  <Box sx={{ p: 4, border: '1px dashed #222', borderRadius: 2, textAlign: 'center' }}>
                    <Typography color="text.secondary" fontSize="0.85rem">Arte ainda não disponível.</Typography>
                  </Box>
                )}
                {ApprovalButtons({ step, decisions, submittingApproval, feedback, setFeedback, submitApproval })}
              </Stack>
            )}

            {/* ── Approval step ── */}
            {step === 'approval' && (
              <Stack spacing={3}>
                <Typography variant="h5" fontWeight={700}>Aprovação final</Typography>
                {/* Summary */}
                <Box sx={{ p: 2.5, borderRadius: 2, border: '1px solid #1e1e1e', bgcolor: '#111' }}>
                  <Stack direction="row" spacing={2} alignItems="flex-start">
                    {arteUrl && (
                      <Box sx={{ width: 72, height: 72, borderRadius: 1.5, overflow: 'hidden', flexShrink: 0 }}>
                        <Box component="img" src={arteUrl} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </Box>
                    )}
                    <Box sx={{ flex: 1 }}>
                      {copy?.title && <Typography fontWeight={700} sx={{ lineHeight: 1.3, mb: 0.5 }}>{copy.title}</Typography>}
                      <Stack direction="row" spacing={0.5} flexWrap="wrap" gap={0.5}>
                        {(['copy', 'arte'] as const).map((s) => (
                          <Chip key={s} size="small"
                            label={decisions[s] === 'approved' ? `${s} ✓` : decisions[s] === 'rejected' ? `${s} ✗` : `${s} pendente`}
                            sx={{ height: 18, fontSize: '0.58rem',
                              bgcolor: decisions[s] === 'approved' ? 'rgba(19,222,185,0.1)' : decisions[s] === 'rejected' ? 'rgba(255,77,77,0.1)' : '#111',
                              color: decisions[s] === 'approved' ? '#13DEB9' : decisions[s] === 'rejected' ? '#FF4D4D' : '#555' }} />
                        ))}
                      </Stack>
                    </Box>
                  </Stack>
                </Box>

                {finalDecision ? (
                  <Box sx={{ p: 3, borderRadius: 2, textAlign: 'center',
                    border: `1px solid ${finalDecision === 'approved' ? '#13DEB944' : '#FF4D4D44'}`,
                    bgcolor: finalDecision === 'approved' ? 'rgba(19,222,185,0.04)' : 'rgba(255,77,77,0.04)' }}>
                    <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="center">
                      <Box sx={{ width: 32, height: 32, borderRadius: '50%',
                        bgcolor: finalDecision === 'approved' ? '#13DEB9' : '#FF4D4D',
                        display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {finalDecision === 'approved' ? <IconCheck size={18} color="#000" /> : <IconX size={18} color="#fff" />}
                      </Box>
                      <Typography fontWeight={700} fontSize="1rem" color={finalDecision === 'approved' ? '#13DEB9' : '#FF4D4D'}>
                        {finalDecision === 'approved' ? 'Peça aprovada!' : 'Revisão solicitada'}
                      </Typography>
                    </Stack>
                    <Typography color="text.secondary" fontSize="0.8rem" mt={1}>
                      {finalDecision === 'approved'
                        ? 'Sua aprovação foi registrada. A agência receberá uma notificação.'
                        : 'Seu feedback foi enviado. A agência entrará em contato em breve.'}
                    </Typography>
                  </Box>
                ) : (
                  ApprovalButtons({ step, decisions, submittingApproval, feedback, setFeedback, submitApproval })
                )}
              </Stack>
            )}

            {/* ── Navigation ── */}
            <Stack direction="row" justifyContent="space-between" mt={4}>
              <Button size="small" variant="outlined" disabled={stepIdx === 0} onClick={() => goStep(-1)}
                startIcon={<IconArrowLeft size={13} />}
                sx={{ textTransform: 'none', borderColor: '#1e1e1e', color: '#555' }}>
                Anterior
              </Button>
              <Button size="small" variant="outlined" disabled={stepIdx === STEPS.length - 1} onClick={() => goStep(1)}
                endIcon={<IconArrowRight size={13} />}
                sx={{ textTransform: 'none', borderColor: '#1e1e1e', color: '#555' }}>
                Próximo
              </Button>
            </Stack>
          </Box>
        </Box>

        {/* ── Comments sidebar ── */}
        <Box sx={{
          width: { xs: 0, md: 320 }, overflow: 'auto', borderLeft: '1px solid #111',
          display: { xs: 'none', md: 'flex' }, flexDirection: 'column', bgcolor: '#0d0d0d',
        }}>
          <Box sx={{ p: 2, borderBottom: '1px solid #111' }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <IconMessage size={14} color="#5D87FF" />
              <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: '#5D87FF' }}>
                Comentários — {STEPS.find((s) => s.id === step)?.label}
              </Typography>
              {sectionComments.length > 0 && (
                <Chip size="small" label={sectionComments.length}
                  sx={{ height: 16, fontSize: '0.55rem', bgcolor: '#1a1a1a', color: '#888' }} />
              )}
            </Stack>
          </Box>

          {/* Comment list */}
          <Box sx={{ flex: 1, overflow: 'auto', p: 1.5 }}>
            {sectionComments.length === 0 ? (
              <Typography sx={{ fontSize: '0.7rem', color: '#444', textAlign: 'center', mt: 3 }}>
                Nenhum comentário nesta seção.
              </Typography>
            ) : (
              <Stack spacing={1.25}>
                {sectionComments.map((c) => (
                  <Box key={c.id} sx={{
                    p: 1.25, borderRadius: 1.5,
                    bgcolor: c.author_type === 'client' ? 'rgba(19,222,185,0.05)' : '#111',
                    border: `1px solid ${c.author_type === 'client' ? '#13DEB922' : '#1a1a1a'}`,
                  }}>
                    <Stack direction="row" spacing={0.75} alignItems="center" mb={0.5}>
                      <Avatar sx={{ width: 18, height: 18, fontSize: '0.55rem',
                        bgcolor: c.author_type === 'client' ? '#13DEB933' : '#1a1a1a',
                        color: c.author_type === 'client' ? '#13DEB9' : '#888' }}>
                        {c.author_name[0]?.toUpperCase()}
                      </Avatar>
                      <Typography sx={{ fontSize: '0.62rem', fontWeight: 600,
                        color: c.author_type === 'client' ? '#13DEB9' : '#888' }}>
                        {c.author_name}
                      </Typography>
                      <Typography sx={{ fontSize: '0.55rem', color: '#333' }}>
                        {new Date(c.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </Typography>
                    </Stack>
                    <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary', lineHeight: 1.5 }}>
                      {c.body}
                    </Typography>
                  </Box>
                ))}
                <div ref={commentsEndRef} />
              </Stack>
            )}
          </Box>

          {/* Comment input */}
          <Box sx={{ p: 1.5, borderTop: '1px solid #111' }}>
            <Stack direction="row" spacing={0.75} alignItems="flex-end">
              <TextField
                size="small" multiline maxRows={3} fullWidth
                placeholder="Deixe um comentário…"
                value={commentBody}
                onChange={(e) => setCommentBody(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendComment(); } }}
                sx={{ '& .MuiInputBase-root': { fontSize: '0.72rem', bgcolor: '#111', borderRadius: 1 } }}
              />
              <Button size="small" variant="contained" onClick={sendComment} disabled={sendingComment || !commentBody.trim()}
                sx={{ minWidth: 36, width: 36, height: 36, p: 0, bgcolor: '#5D87FF', '&:hover': { bgcolor: '#4a72e8' } }}>
                {sendingComment ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : <IconSend size={14} />}
              </Button>
            </Stack>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

// ── Reusable approval buttons component ──────────────────────────────────────
function ApprovalButtons({
  step, decisions, submittingApproval, feedback, setFeedback, submitApproval,
}: {
  step: SectionId;
  decisions: Record<string, 'approved' | 'rejected' | null>;
  submittingApproval: boolean;
  feedback: string;
  setFeedback: (v: string) => void;
  submitApproval: (d: 'approved' | 'rejected') => void;
}) {
  const decided = decisions[step];
  const isLast = step === 'approval';

  if (decided) {
    return (
      <Stack direction="row" spacing={0.75} alignItems="center" sx={{ p: 1.5, borderRadius: 1.5,
        bgcolor: decided === 'approved' ? 'rgba(19,222,185,0.06)' : 'rgba(255,77,77,0.06)',
        border: `1px solid ${decided === 'approved' ? '#13DEB933' : '#FF4D4D33'}` }}>
        {decided === 'approved' ? <IconCheck size={14} color="#13DEB9" /> : <IconX size={14} color="#FF4D4D" />}
        <Typography sx={{ fontSize: '0.75rem', color: decided === 'approved' ? '#13DEB9' : '#FF4D4D', fontWeight: 600 }}>
          {decided === 'approved' ? 'Aprovado' : 'Revisão solicitada'} nesta seção
        </Typography>
      </Stack>
    );
  }

  return (
    <Stack spacing={1}>
      <TextField size="small" fullWidth multiline rows={2}
        placeholder={isLast ? 'Feedback final (opcional)…' : 'Tem alguma observação? (opcional)'}
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        sx={{ '& .MuiInputBase-root': { fontSize: '0.75rem', bgcolor: '#111' } }}
      />
      <Stack direction="row" spacing={1}>
        <Button variant="contained" fullWidth size="large"
          onClick={() => submitApproval('approved')}
          disabled={submittingApproval}
          startIcon={submittingApproval ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : <IconCheck size={16} />}
          sx={{ bgcolor: '#13DEB9', color: '#000', fontWeight: 700, textTransform: 'none',
            '&:hover': { bgcolor: '#0fb89e' } }}>
          {isLast ? 'Aprovar peça' : 'Aprovar'}
        </Button>
        <Button variant="outlined" fullWidth size="large"
          onClick={() => submitApproval('rejected')}
          disabled={submittingApproval}
          startIcon={<IconX size={15} />}
          sx={{ borderColor: '#FF4D4D44', color: '#FF4D4D', textTransform: 'none',
            '&:hover': { borderColor: '#FF4D4D', bgcolor: 'rgba(255,77,77,0.05)' } }}>
          Solicitar revisão
        </Button>
      </Stack>
    </Stack>
  );
}
