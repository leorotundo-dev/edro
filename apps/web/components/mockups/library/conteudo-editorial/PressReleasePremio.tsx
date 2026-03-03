'use client';

import React from 'react';

interface PressReleasePremioProps {
  name?: string;
  username?: string;
  brandName?: string;
  headline?: string;
  title?: string;
  body?: string;
  text?: string;
  description?: string;
  caption?: string;
  image?: string;
  postImage?: string;
  thumbnail?: string;
  profileImage?: string;
  brandColor?: string;
}

export const PressReleasePremio: React.FC<PressReleasePremioProps> = ({
  name,
  username,
  brandName,
  headline,
  title,
  body,
  text,
  description,
  caption,
  image,
  postImage,
  thumbnail,
  profileImage,
  brandColor = '#F59E0B',
}) => {
  const accent = brandColor || '#F59E0B';
  const gold = '#F59E0B';
  const resolvedOrg = brandName || name || username || 'Edro Digital';
  const resolvedAward =
    headline || title || 'Prêmio Inovação Digital 2026 — Categoria: Melhor Plataforma de IA';
  const resolvedBody =
    body || text || description || caption ||
    'A Edro Digital foi distinguida com o mais prestigioso prêmio do setor de tecnologia editorial brasileiro, reconhecendo a excelência da plataforma de inteligência artificial na categoria de Melhor Solução de IA para Criação de Conteúdo.';
  const resolvedLogo = image || postImage || thumbnail || profileImage || null;
  const initial = resolvedOrg.charAt(0).toUpperCase();
  const currentDate = '3 de março de 2026';
  const awardYear = '2026';

  const stars = [1, 2, 3, 4, 5];

  return (
    <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", display: 'inline-block' }}>
      <style>{`
        @keyframes prpremio-fade { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes prpremio-sparkle { 0%, 100% { opacity: 0.4; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1.1); } }
        .prpremio-wrap { animation: prpremio-fade 0.45s cubic-bezier(0.22,1,0.36,1); }
        .prpremio-star { animation: prpremio-sparkle 2s ease-in-out infinite; }
        .prpremio-star:nth-child(2) { animation-delay: 0.3s; }
        .prpremio-star:nth-child(3) { animation-delay: 0.6s; }
        .prpremio-star:nth-child(4) { animation-delay: 0.9s; }
        .prpremio-star:nth-child(5) { animation-delay: 1.2s; }
      `}</style>

      <div
        className="prpremio-wrap"
        style={{
          width: '480px',
          background: '#ffffff',
          borderRadius: '10px',
          overflow: 'hidden',
          boxShadow: '0 4px 6px rgba(0,0,0,0.06), 0 16px 40px rgba(0,0,0,0.10)',
          border: '1px solid #e5e7eb',
        }}
      >
        {/* Premium gold header band */}
        <div
          style={{
            background: `linear-gradient(135deg, #78350f 0%, #92400e 40%, #b45309 70%, ${gold} 100%)`,
            padding: '18px 24px 16px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Decorative star elements */}
          <div style={{ position: 'absolute', top: '8px', right: '20px', display: 'flex', gap: '6px' }}>
            {stars.map((s) => (
              <svg
                key={s}
                className="prpremio-star"
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill={gold}
                style={{ opacity: 0.6 }}
              >
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            ))}
          </div>

          {/* Large decorative star bg */}
          <div
            style={{
              position: 'absolute',
              right: '-20px',
              top: '-20px',
              width: '100px',
              height: '100px',
              opacity: 0.05,
            }}
          >
            <svg viewBox="0 0 24 24" fill="#fff" width="100" height="100">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {/* Trophy icon */}
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '14px',
                background: 'rgba(255,255,255,0.15)',
                border: '2px solid rgba(255,255,255,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={gold} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                <path d="M4 22h16" />
                <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
                <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
                <path d="M18 2H6v7a6 6 0 0 0 12 0V2z" />
              </svg>
            </div>

            <div style={{ flex: 1 }}>
              {/* PRÊMIO label with year badge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <div
                  style={{
                    fontSize: '10px',
                    fontWeight: 800,
                    color: gold,
                    textTransform: 'uppercase',
                    letterSpacing: '0.14em',
                  }}
                >
                  Prêmio
                </div>
                <div
                  style={{
                    fontSize: '9px',
                    fontWeight: 900,
                    background: gold,
                    color: '#78350f',
                    padding: '1px 6px',
                    borderRadius: '4px',
                    letterSpacing: '0.04em',
                  }}
                >
                  {awardYear}
                </div>
              </div>
              <div style={{ fontSize: '15px', fontWeight: 900, color: '#fff', lineHeight: 1.25, letterSpacing: '-0.01em' }}>
                Inovação Digital
              </div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.65)', marginTop: '2px' }}>
                Instituto Brasileiro de Tecnologia e Inovação
              </div>
            </div>
          </div>
        </div>

        {/* Letterhead row */}
        <div
          style={{
            padding: '12px 24px',
            borderBottom: '1px solid #f3f4f6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#fffbeb',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {resolvedLogo ? (
              <img src={resolvedLogo} alt={resolvedOrg} style={{ height: '26px', objectFit: 'contain' }} />
            ) : (
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '7px',
                  background: accent,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontSize: '13px',
                  fontWeight: 900,
                }}
              >
                {initial}
              </div>
            )}
            <div>
              <div style={{ fontSize: '12px', fontWeight: 800, color: '#111827' }}>{resolvedOrg}</div>
              <div style={{ fontSize: '9px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Assessoria de Imprensa</div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div
              style={{
                fontSize: '9px',
                fontWeight: 800,
                background: '#16a34a',
                color: '#fff',
                padding: '2px 7px',
                borderRadius: '3px',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: '2px',
              }}
            >
              Para Divulgação Imediata
            </div>
            <div style={{ fontSize: '10px', color: '#6b7280' }}>{currentDate}</div>
          </div>
        </div>

        <div style={{ padding: '20px 24px' }}>
          {/* Award highlight box */}
          <div
            style={{
              background: `linear-gradient(135deg, ${gold}14 0%, ${gold}08 100%)`,
              border: `1.5px solid ${gold}44`,
              borderRadius: '10px',
              padding: '14px 18px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
            }}
          >
            <div style={{ flexShrink: 0 }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={gold} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="6" />
                <path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: '9px', fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '3px' }}>
                Ganhador — {awardYear}
              </div>
              <div style={{ fontSize: '14px', fontWeight: 900, color: '#111827', lineHeight: 1.3 }}>
                Melhor Plataforma de IA
              </div>
              <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>
                Categoria: Software Editorial
              </div>
            </div>
          </div>

          {/* Dateline + Headline */}
          <div style={{ fontSize: '10px', color: '#6b7280', marginBottom: '6px' }}>
            <strong style={{ color: '#111827' }}>SÃO PAULO, SP</strong> — {currentDate} —
          </div>
          <h1
            style={{
              fontSize: '17px',
              fontWeight: 900,
              color: '#111827',
              lineHeight: 1.3,
              margin: '0 0 12px',
              letterSpacing: '-0.02em',
              fontFamily: "'Georgia', 'Times New Roman', serif",
            }}
          >
            {resolvedAward}
          </h1>

          {/* Body */}
          <p style={{ fontSize: '13px', color: '#374151', lineHeight: 1.7, margin: '0 0 14px' }}>
            {resolvedBody}
          </p>

          {/* Quote */}
          <div
            style={{
              borderLeft: `3px solid ${gold}`,
              background: `${gold}08`,
              borderRadius: '0 8px 8px 0',
              padding: '12px 16px',
              marginBottom: '16px',
            }}
          >
            <p style={{ fontSize: '12.5px', fontStyle: 'italic', color: '#374151', margin: '0 0 6px', lineHeight: 1.6 }}>
              &ldquo;Este prêmio é um reconhecimento ao trabalho incansável de toda a nossa equipe e ao compromisso com a inovação. É uma honra representar o Brasil no cenário global de inteligência artificial editorial.&rdquo;
            </p>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#92400e' }}>
              — Leonardo Rocha, CEO da {resolvedOrg}
            </div>
          </div>

          {/* About the award institution */}
          <div
            style={{
              background: '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '12px 16px',
              marginBottom: '18px',
            }}
          >
            <div
              style={{
                fontSize: '10px',
                fontWeight: 800,
                color: '#9ca3af',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: '5px',
              }}
            >
              Sobre o Prêmio
            </div>
            <p style={{ fontSize: '12px', color: '#4b5563', lineHeight: 1.6, margin: 0 }}>
              O Prêmio Inovação Digital é concedido anualmente pelo Instituto Brasileiro de Tecnologia
              e Inovação (IBTI) a empresas que se destacam pelo impacto transformador de suas soluções
              no ecossistema de tecnologia nacional. Em 2026, mais de 380 candidaturas foram avaliadas
              por um júri composto por 42 especialistas do setor.
            </p>
          </div>

          {/* Footer */}
          <div
            style={{
              borderTop: '1px solid #e5e7eb',
              paddingTop: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div
                style={{
                  fontSize: '10px',
                  fontWeight: 800,
                  color: '#9ca3af',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  marginBottom: '4px',
                }}
              >
                Contato de Imprensa
              </div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#111827' }}>
                Rafael Andrade — Assessor de Imprensa
              </div>
              <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '1px' }}>
                imprensa@edrodigital.com.br · (11) 96543-2109
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
              <button
                type="button"
                aria-label="Baixar comunicado de prêmio em PDF"
                style={{
                  background: `linear-gradient(135deg, #92400e 0%, ${gold} 100%)`,
                  color: '#fff',
                  border: 'none',
                  borderRadius: '7px',
                  padding: '8px 14px',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  whiteSpace: 'nowrap',
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Baixar PDF
              </button>
              <div style={{ fontSize: '15px', fontWeight: 900, color: '#d1d5db', letterSpacing: '0.12em' }}>
                ###
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
