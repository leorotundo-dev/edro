'use client';

import { useEffect, useRef, useState } from 'react';
import { apiPostFormData } from '@/lib/api';

const DEFAULT_PROMPT = `create a single stylized 3D avatar character from the reference photo, shown alone in a complete bust portrait from the upper chest upward on a plain very light gray background. keep a subtle three-quarter angle facing slightly to the right side of the image, never front-facing, never perfectly symmetrical, never staring straight into the camera.

identity fidelity is the highest priority. preserve the real person's facial proportions, face width, jawline, chin, cheek volume, eye spacing, eye size, eyebrow shape, nose width and bridge, mouth shape, hairline, beard or mustache if present, skin tone, age range, and overall gender presentation exactly as seen in the reference. the goal is immediate recognition by someone who knows the person. do not beautify, idealize, feminize, masculinize, or replace the face with a generic attractive cartoon face.

translate the person into a restrained, slightly weird, simplified stylized 3D avatar language with subtle Pixar toy-inspired appeal, but only after preserving who they are. stylization must simplify the real face, not replace it. keep the rendering matte, clean, understated, and softly lit. allow a gentle Pixar toy feeling in the sculpted forms and readable silhouette, but never baby-like, never chibi, never like a different person, and never a generic commercial mascot.

faithfully translate the real hairstyle, hair volume, hair texture, and facial hair. if the subject has short hair, keep it short; if they have longer hair, keep it longer. if they have a beard, keep the beard. if they are clean-shaven, keep them clean-shaven. preserve clothing, neckline, shoulders, and any visible accessories from the photo in the same simplified 3D language without inventing wardrobe changes.

keep the expression warm, friendly, and naturally upbeat. allow only a subtle pleasant surprise if needed, but do not exaggerate the mouth, eyes, or eyebrows. the expression must still look like the same person from the photo.

keep the portrait soft, matte, and clean with gentle studio lighting, no environment, no props, no text, no watermark, and no extra characters. one character only.`;

type AvatarResponse = {
  ok: boolean;
  avatar_url: string;
  avatar_provider?: string;
};

type Props = {
  file: File;
  onAccept: (avatarUrl: string) => void;
  onClose: () => void;
};

export default function AvatarGeneratorModal({ file, onAccept, onClose }: Props) {
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [error, setError] = useState('');
  const sourceUrl = useRef(URL.createObjectURL(file)).current;

  // Auto-generate on first open
  useEffect(() => {
    generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loading) return;

    const startedAt = Date.now();
    setProgress(4);

    const interval = window.setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const target = elapsed < 2_000
        ? 4 + (elapsed / 2_000) * 28
        : elapsed < 7_000
          ? 32 + ((elapsed - 2_000) / 5_000) * 38
          : elapsed < 16_000
            ? 70 + ((elapsed - 7_000) / 9_000) * 20
            : 90 + Math.min((elapsed - 16_000) / 12_000, 1) * 7;

      setProgress((current) => Math.max(current, Math.min(97, Math.round(target))));
    }, 250);

    return () => window.clearInterval(interval);
  }, [loading]);

  async function generate() {
    setLoading(true);
    setProgress(0);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('prompt', prompt);
      const res = await apiPostFormData<AvatarResponse>('/freelancers/portal/me/avatar', formData);
      setProgress(100);
      setResult(res.avatar_url);
      setAttempts((n) => n + 1);
    } catch (e: any) {
      setProgress(0);
      setError(e?.message ?? 'Erro ao gerar avatar');
    } finally {
      setLoading(false);
    }
  }

  function handleAccept() {
    if (result) onAccept(result);
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.82)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: '#1a1a2e',
          border: '1px solid rgba(255,255,255,0.10)',
          borderRadius: 20,
          width: '100%',
          maxWidth: 820,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#fff' }}>Gerador de Avatar IA</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>Ajuste o prompt e gere até chegar no resultado ideal</div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', fontSize: 22, lineHeight: 1, padding: 4 }}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Previews */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* Source */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Foto original</span>
              <div style={{ aspectRatio: '1', borderRadius: 14, overflow: 'hidden', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <img src={sourceUrl} alt="Original" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            </div>

            {/* Result */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Resultado gerado {attempts > 1 ? `(tentativa ${attempts})` : ''}
              </span>
              <div style={{ aspectRatio: '1', borderRadius: 14, overflow: 'hidden', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                {loading && (
                  <div style={{ width: '100%', maxWidth: 260, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: 24 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#FF6600', animation: 'spin 0.9s linear infinite' }} />
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Gerando com IA...</span>
                    <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ flex: 1, height: 8, borderRadius: 999, overflow: 'hidden', background: 'rgba(255,255,255,0.08)' }}>
                        <div
                          style={{
                            width: `${progress}%`,
                            height: '100%',
                            borderRadius: 999,
                            background: 'linear-gradient(90deg, #FF6600 0%, #FF8A33 100%)',
                            transition: 'width 240ms ease',
                          }}
                        />
                      </div>
                      <span style={{ minWidth: 36, fontSize: 12, fontWeight: 700, color: '#FF8A33', textAlign: 'right' }}>{progress}%</span>
                    </div>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.32)', textAlign: 'center' }}>
                      {progress < 35
                        ? 'Enviando referência'
                        : progress < 70
                          ? 'Gerando identidade'
                          : progress < 95
                            ? 'Refinando avatar'
                            : 'Finalizando'}
                    </span>
                  </div>
                )}
                {!loading && result && (
                  <img src={result} alt="Gerado" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                )}
                {!loading && !result && !error && (
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>Aguardando geração</span>
                )}
                {!loading && error && (
                  <span style={{ fontSize: 12, color: '#FA896B', textAlign: 'center', padding: 16 }}>{error}</span>
                )}
              </div>
            </div>
          </div>

          {/* Prompt editor */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Prompt</span>
              <button
                onClick={() => setPrompt(DEFAULT_PROMPT)}
                style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px' }}
              >
                Restaurar padrão
              </button>
            </div>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={8}
              disabled={loading}
              style={{
                width: '100%',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.10)',
                borderRadius: 10,
                color: 'rgba(255,255,255,0.8)',
                fontSize: 13,
                lineHeight: 1.6,
                padding: '12px 14px',
                resize: 'vertical',
                fontFamily: 'inherit',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{ padding: '10px 20px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)', background: 'transparent', color: 'rgba(255,255,255,0.5)', fontSize: 14, cursor: 'pointer' }}
          >
            Cancelar
          </button>

          {result && !loading && (
            <button
              onClick={generate}
              style={{ padding: '10px 20px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)', fontSize: 14, cursor: 'pointer' }}
            >
              Tentar novamente
            </button>
          )}

          {!result && !loading && (
            <button
              onClick={generate}
              style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: '#FF6600', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
            >
              Gerar
            </button>
          )}

          {loading && (
            <button
              disabled
              style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: 'rgba(255,102,0,0.4)', color: 'rgba(255,255,255,0.5)', fontSize: 14, fontWeight: 600, cursor: 'not-allowed' }}
            >
              Gerando…
            </button>
          )}

          {result && !loading && (
            <button
              onClick={handleAccept}
              style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: '#FF6600', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
            >
              Aceitar ✓
            </button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
