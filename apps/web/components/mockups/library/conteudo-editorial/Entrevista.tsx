'use client';

import React from 'react';

interface EntrevistaProps {
  headline?: string;
  title?: string;
  name?: string;
  body?: string;
  text?: string;
  description?: string;
  caption?: string;
  username?: string;
  brandName?: string;
  image?: string;
  postImage?: string;
  thumbnail?: string;
  profileImage?: string;
  brandColor?: string;
}

export const Entrevista: React.FC<EntrevistaProps> = ({
  headline,
  title,
  name,
  body,
  text,
  description,
  caption,
  username,
  brandName,
  image,
  postImage,
  thumbnail,
  profileImage,
  brandColor = '#7c3aed',
}) => {
  const resolvedTitle = headline || title || 'Entrevista Exclusiva';
  const resolvedGuest = name || username || 'Ana Paula Mendes';
  const resolvedRole = brandName || 'CEO & Fundadora, InovaTech';
  const resolvedPullQuote =
    body ||
    text ||
    description ||
    caption ||
    'A inovação não é sobre tecnologia — é sobre coragem de reimaginar o que já existe.';
  const resolvedPhoto = profileImage || image || postImage || thumbnail || null;
  const accent = brandColor || '#7c3aed';

  const qaPairs = [
    {
      q: 'O que te motivou a fundar uma startup no Brasil em meio a tantos desafios?',
      a: 'Vi uma lacuna enorme no mercado que ninguém estava preenchendo. O desafio era exatamente o que me atraiu — resolver problemas complexos em contextos adversos é onde a verdadeira inovação acontece.',
    },
    {
      q: 'Como você equilibra crescimento acelerado com cultura organizacional sólida?',
      a: 'Contratando devagar e demitindo rápido quando há desalinhamento de valores. Cultura não é um documento — é quem você promove e quem você deixa ir.',
    },
    {
      q: 'Qual conselho daria para fundadores que estão no início da jornada?',
      a: 'Valide antes de construir. Fale com 100 clientes potenciais antes de escrever uma linha de código. A maioria das startups falha por construir algo que ninguém quer.',
    },
  ];

  return (
    <div
      style={{
        width: '440px',
        background: '#ffffff',
        borderRadius: '14px',
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0,0,0,0.11)',
        fontFamily: "'Helvetica Neue', Arial, sans-serif",
        border: '1px solid #e5e7eb',
      }}
    >
      <style>{`
        @keyframes ev-fade { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .ev-card { animation: ev-fade 0.4s ease; }
      `}</style>
      <div className="ev-card">
        {/* Header bar */}
        <div
          style={{
            background: `linear-gradient(135deg, ${accent} 0%, ${accent}bb 100%)`,
            padding: '16px 22px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.9)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            {resolvedTitle}
          </span>
        </div>

        {/* Guest profile */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            padding: '18px 22px 14px',
            borderBottom: '1px solid #f3f4f6',
          }}
        >
          {resolvedPhoto ? (
            <img
              src={resolvedPhoto}
              alt={resolvedGuest}
              style={{ width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover', border: `3px solid ${accent}33` }}
            />
          ) : (
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: `linear-gradient(135deg, ${accent} 0%, ${accent}88 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: '20px',
                fontWeight: 800,
                flexShrink: 0,
                border: `3px solid ${accent}33`,
              }}
            >
              {resolvedGuest.charAt(0)}
            </div>
          )}
          <div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#111827' }}>{resolvedGuest}</div>
            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>{resolvedRole}</div>
          </div>
          <div
            style={{
              marginLeft: 'auto',
              background: `${accent}15`,
              color: accent,
              fontSize: '10px',
              fontWeight: 700,
              padding: '4px 10px',
              borderRadius: '20px',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              flexShrink: 0,
            }}
          >
            Exclusivo
          </div>
        </div>

        {/* Pull quote */}
        <div
          style={{
            margin: '14px 22px',
            background: `${accent}0d`,
            borderLeft: `4px solid ${accent}`,
            borderRadius: '0 8px 8px 0',
            padding: '12px 14px',
          }}
        >
          <div style={{ fontSize: '10px', fontWeight: 700, color: accent, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>
            Destaque
          </div>
          <p
            style={{
              fontSize: '13.5px',
              fontStyle: 'italic',
              color: '#374151',
              lineHeight: 1.55,
              margin: 0,
              fontFamily: "'Georgia', serif",
            }}
          >
            &ldquo;{resolvedPullQuote}&rdquo;
          </p>
        </div>

        {/* Q&A pairs */}
        <div style={{ padding: '0 22px 18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {qaPairs.map((pair, i) => (
            <div key={i}>
              {/* Question */}
              <div
                style={{
                  display: 'flex',
                  gap: '8px',
                  marginBottom: '6px',
                  alignItems: 'flex-start',
                }}
              >
                <div
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: '#f3f4f6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: '1px',
                  }}
                >
                  <span style={{ fontSize: '10px', fontWeight: 800, color: '#9ca3af' }}>P</span>
                </div>
                <p style={{ fontSize: '12px', color: '#6b7280', lineHeight: 1.5, margin: 0, fontStyle: 'italic' }}>
                  {pair.q}
                </p>
              </div>
              {/* Answer */}
              <div
                style={{
                  display: 'flex',
                  gap: '8px',
                  alignItems: 'flex-start',
                  paddingLeft: '4px',
                }}
              >
                <div
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: `${accent}22`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: '1px',
                  }}
                >
                  <span style={{ fontSize: '10px', fontWeight: 800, color: accent }}>R</span>
                </div>
                <p style={{ fontSize: '12px', color: '#1f2937', lineHeight: 1.6, margin: 0 }}>
                  {pair.a}
                </p>
              </div>
              {i < qaPairs.length - 1 && (
                <div style={{ height: '1px', background: '#f3f4f6', marginTop: '12px' }} />
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '10px 22px 14px',
            borderTop: '1px solid #f3f4f6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ fontSize: '11px', color: '#9ca3af' }}>Entrevista realizada em março de 2026</span>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              type="button"
              aria-label="Compartilhar entrevista"
              style={{
                background: 'transparent',
                border: `1px solid #e5e7eb`,
                borderRadius: '6px',
                padding: '5px 10px',
                fontSize: '11px',
                color: '#6b7280',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
                <path d="m8.59 13.51 6.83 3.98M15.41 6.51l-6.82 3.98" />
              </svg>
              Compartilhar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
