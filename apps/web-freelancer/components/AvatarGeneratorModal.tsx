'use client';

import { useEffect, useRef, useState } from 'react';
import { apiPostFormData } from '@/lib/api';

const DEFAULT_PROMPT = `create a single stylized 3D avatar character in the exact same established visual style as the approved result, shown alone in a completed bust portrait from the upper chest upward, isolated on a plain very light gray background. the character must keep the same subtle three-quarter angle facing slightly to the right side of the image, never front-facing, never perfectly symmetrical, never looking straight into the camera.

faithfully translate the person in the reference photo: preserve their distinctive facial features, skin tone, hair color, hair length and style, face shape, and any defining visual characteristics. the goal is that someone who knows this person would immediately recognize this avatar as them. do not invent a generic face — use the reference photo as the direct source for who this character is.

preserve the same dry, simple, slightly weird, highly stylized 3D avatar language already defined, with the same subtly disproportionate cartoon head, slightly top-heavy elongated cranium, slightly narrower facial area, moderately sized round chimp-like ears, thick dark blocky eyebrows (matching the person's eyebrow color), tiny simple nose, restrained matte rendering, and clean understated materials. keep the skin tone faithful to the reference photo. keep the hair color and general hair style faithful to the reference photo, translated into the simplified stylized 3D language.

faithfully translate whatever clothing, accessories, and headwear appear in the reference photo into the same simplified stylized 3D language. preserve color, garment type, and key visual details at a stylized level. the bust portrait must show visible shoulders, visible upper sleeves, and the beginning of both upper arms so the bust feels complete and natural.

the facial expression must be pleasantly surprised, excited, and happy — delighted surprise, upbeat excitement, amused enthusiasm, as if the character has just seen something unexpectedly cool. the eyebrows should lift to support a happy surprised expression, but remain thick, blunt, and blocky. the mouth must be open in a cheerful, excited, pleasantly surprised way.

keep the head slightly elongated and subtly disproportionate, not round, not spherical, not cute-chibi, not handsome, not polished like a premium toy. keep the rendering soft, matte, and clean, with soft studio lighting and gentle shadows, plain pale gray background, no environment, no text, no watermark, no extra characters. one character only.`;

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
  const [result, setResult] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [error, setError] = useState('');
  const sourceUrl = useRef(URL.createObjectURL(file)).current;

  // Auto-generate on first open
  useEffect(() => {
    generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function generate() {
    setLoading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('prompt', prompt);
      const res = await apiPostFormData<AvatarResponse>('/freelancers/portal/me/avatar', formData);
      setResult(res.avatar_url);
      setAttempts((n) => n + 1);
    } catch (e: any) {
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
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#FF6600', animation: 'spin 0.9s linear infinite' }} />
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Gerando com IA…</span>
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
