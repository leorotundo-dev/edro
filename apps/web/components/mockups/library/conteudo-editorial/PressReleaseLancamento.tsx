'use client';

import React from 'react';

interface PressReleaseLancamentoProps {
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

export const PressReleaseLancamento: React.FC<PressReleaseLancamentoProps> = ({
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
  brandColor = '#7c3aed',
}) => {
  const resolvedProduct = headline || title || 'Edro AI Suite — A Plataforma de Inteligência de Conteúdo';
  const resolvedOrg = brandName || name || username || 'Edro Digital';
  const resolvedBody =
    body || text || description || caption ||
    'A Edro Digital anuncia o lançamento da sua plataforma de IA generativa para criação de conteúdo editorial, trazendo automação inteligente e personalização em escala para equipes de marketing de alto desempenho.';
  const resolvedProductImage = image || postImage || thumbnail || null;
  const accent = brandColor || '#7c3aed';
  const launchDate = '15 de abril de 2026';

  const features = [
    'Geração de conteúdo em 12 idiomas com tom de voz personalizado',
    'Integração nativa com CMS, HubSpot e Salesforce',
    'Painel de analytics com métricas de impacto em tempo real',
    'Fluxos de aprovação colaborativos com versionamento',
  ];

  const quote = {
    text: 'O Edro AI Suite representa um salto de 10× na produtividade editorial. Estamos democratizando o acesso à criação de conteúdo de alta qualidade.',
    author: 'Leonardo Rocha, CEO da Edro Digital',
  };

  return (
    <div
      style={{
        width: '420px',
        background: '#ffffff',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0,0,0,0.10)',
        fontFamily: "'Georgia', 'Times New Roman', serif",
        border: '1px solid #e5e7eb',
      }}
    >
      <style>{`
        @keyframes prl-fade { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .prl-card { animation: prl-fade 0.4s ease; }
      `}</style>

      <div className="prl-card">
        {/* Letterhead */}
        <div
          style={{
            padding: '12px 22px 10px',
            borderBottom: `3px solid ${accent}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: '13px', fontWeight: 900, color: accent, fontFamily: "'Helvetica Neue', sans-serif", letterSpacing: '-0.01em' }}>
              {resolvedOrg}
            </div>
            <div style={{ fontSize: '9px', color: '#9ca3af', fontFamily: "'Helvetica Neue', sans-serif", textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Assessoria de Imprensa
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '9px', background: '#16a34a', color: '#fff', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', fontFamily: "'Helvetica Neue', sans-serif", textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>
              Para Divulgação Imediata
            </div>
            <div style={{ fontSize: '10px', color: '#6b7280', fontFamily: "'Helvetica Neue', sans-serif" }}>
              3 de março de 2026
            </div>
          </div>
        </div>

        {/* Product image area */}
        <div
          style={{
            width: '100%',
            height: '140px',
            background: resolvedProductImage
              ? `url(${resolvedProductImage}) center/cover no-repeat`
              : `linear-gradient(135deg, ${accent}15 0%, ${accent}08 100%)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}
        >
          {!resolvedProductImage && (
            <div
              style={{
                width: '72px',
                height: '72px',
                borderRadius: '18px',
                background: `linear-gradient(135deg, ${accent} 0%, ${accent}cc 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: `0 8px 24px ${accent}44`,
              }}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z" /><path d="m4.93 4.93 14.14 14.14" />
              </svg>
            </div>
          )}
          <div
            style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              background: accent,
              color: '#fff',
              fontSize: '9px',
              fontWeight: 800,
              padding: '3px 9px',
              borderRadius: '12px',
              fontFamily: "'Helvetica Neue', sans-serif",
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Lança em {launchDate}
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '16px 22px 12px' }}>
          {/* Dateline + Headline */}
          <div style={{ fontSize: '11px', color: '#6b7280', fontFamily: "'Helvetica Neue', sans-serif", marginBottom: '6px' }}>
            <strong style={{ color: '#111827' }}>SÃO PAULO, SP</strong> — 3 de março de 2026 —
          </div>
          <h1
            style={{
              fontSize: '17px',
              fontWeight: 800,
              color: '#111827',
              lineHeight: 1.3,
              margin: '0 0 10px',
              letterSpacing: '-0.01em',
            }}
          >
            {resolvedProduct}
          </h1>
          <p style={{ fontSize: '13px', color: '#374151', lineHeight: 1.65, margin: '0 0 14px' }}>
            {resolvedBody}
          </p>

          {/* Features */}
          <div style={{ marginBottom: '14px' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px', fontFamily: "'Helvetica Neue', sans-serif" }}>
              Principais Funcionalidades
            </div>
            {features.map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '5px' }}>
                <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: `${accent}18`, color: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <span style={{ fontSize: '12px', color: '#374151', lineHeight: 1.45, fontFamily: "'Helvetica Neue', sans-serif" }}>{f}</span>
              </div>
            ))}
          </div>

          {/* Quote */}
          <div style={{ background: `${accent}0a`, borderLeft: `3px solid ${accent}`, padding: '10px 14px', borderRadius: '0 8px 8px 0', marginBottom: '14px' }}>
            <p style={{ fontSize: '12.5px', fontStyle: 'italic', color: '#374151', margin: '0 0 5px', lineHeight: 1.55 }}>
              &ldquo;{quote.text}&rdquo;
            </p>
            <div style={{ fontSize: '11px', fontWeight: 700, color: accent, fontFamily: "'Helvetica Neue', sans-serif" }}>
              — {quote.author}
            </div>
          </div>

          {/* Footer */}
          <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '11px', color: '#374151', fontFamily: "'Helvetica Neue', sans-serif" }}>
              imprensa@edro.digital · (11) 9876-5432
            </div>
            <div style={{ fontSize: '14px', fontWeight: 900, color: '#9ca3af', fontFamily: "'Helvetica Neue', sans-serif", letterSpacing: '0.1em' }}>###</div>
          </div>
        </div>
      </div>
    </div>
  );
};
