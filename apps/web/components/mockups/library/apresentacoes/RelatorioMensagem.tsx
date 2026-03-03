'use client';

import React from 'react';

interface RelatorioMensagemProps {
  name?: string;
  username?: string;
  brandName?: string;
  headline?: string;
  title?: string;
  body?: string;
  description?: string;
  caption?: string;
  image?: string;
  profileImage?: string;
  thumbnail?: string;
  brandColor?: string;
  themeColor?: string;
}

export const RelatorioMensagem: React.FC<RelatorioMensagemProps> = ({
  name,
  username,
  brandName,
  headline,
  title,
  body,
  description,
  caption,
  image,
  profileImage,
  thumbnail,
  brandColor,
  themeColor = '#1E3A5F',
}) => {
  const accent = brandColor ?? themeColor;
  const presidentName = name ?? username ?? brandName ?? 'Carlos Mendes';
  const presidentRole = headline ?? title ?? 'Presidente & CEO';
  const messageText = body ?? description ??
    'Foi um ano de grandes conquistas e superação. Nossa equipe demonstrou resiliência e criatividade diante dos desafios do mercado, entregando resultados que superam nossas projeções iniciais. Avançamos significativamente em nossa jornada de transformação digital, ampliamos nossa base de clientes e fortalecemos nossas parcerias estratégicas. Olhamos para 2025 com otimismo e com um plano sólido para continuar gerando valor para todos os nossos stakeholders.';
  const signatureText = caption ?? `${presidentName}`;
  const photo = profileImage ?? image ?? thumbnail ?? '';

  return (
    <div
      style={{
        position: 'relative',
        width: '420px',
        height: '594px',
        background: '#ffffff',
        borderRadius: '8px',
        overflow: 'hidden',
        boxShadow: '0 12px 40px rgba(0,0,0,0.18)',
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        display: 'flex',
        flexDirection: 'column',
        userSelect: 'none',
      }}
    >
      {/* Top accent bar */}
      <div style={{ height: '5px', background: accent, flexShrink: 0 }} />

      {/* Header row */}
      <div
        style={{
          padding: '18px 28px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #f0f0f0',
          flexShrink: 0,
        }}
      >
        <div>
          <div style={{ fontSize: '9px', fontWeight: 700, color: accent, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
            Relatório Anual 2024
          </div>
          <div style={{ fontSize: '14px', fontWeight: 800, color: '#111827', marginTop: '2px' }}>
            Mensagem do Presidente
          </div>
        </div>
        <div style={{ fontSize: '22px', fontWeight: 900, color: `${accent}22`, letterSpacing: '-1px' }}>2024</div>
      </div>

      {/* President photo + name */}
      <div style={{ padding: '20px 28px 16px', display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0 }}>
        {photo ? (
          <img
            src={photo}
            alt={presidentName}
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              objectFit: 'cover',
              border: `3px solid ${accent}`,
              flexShrink: 0,
            }}
          />
        ) : (
          <div
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              background: `${accent}14`,
              border: `3px solid ${accent}44`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <svg width="30" height="30" viewBox="0 0 24 24" fill={accent} aria-hidden="true">
              <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
            </svg>
          </div>
        )}
        <div>
          <div style={{ fontWeight: 800, fontSize: '15px', color: '#111827', lineHeight: 1.3 }}>{presidentName}</div>
          <div style={{ fontSize: '11px', color: accent, fontWeight: 600, marginTop: '2px' }}>{presidentRole}</div>
        </div>
      </div>

      {/* Opening quote bar */}
      <div
        style={{
          margin: '0 28px 14px',
          padding: '10px 16px',
          background: `${accent}08`,
          borderLeft: `3px solid ${accent}`,
          borderRadius: '0 6px 6px 0',
          flexShrink: 0,
        }}
      >
        <p style={{ fontSize: '12px', fontStyle: 'italic', color: accent, fontWeight: 600, margin: 0, lineHeight: 1.4 }}>
          &ldquo;Um ano de transformação e crescimento sustentável.&rdquo;
        </p>
      </div>

      {/* Message text */}
      <div style={{ flex: 1, padding: '0 28px', overflow: 'hidden' }}>
        <p
          style={{
            fontSize: '11.5px',
            color: '#374151',
            lineHeight: 1.75,
            margin: 0,
          }}
        >
          {messageText}
        </p>
      </div>

      {/* Signature area */}
      <div style={{ padding: '16px 28px 20px', flexShrink: 0 }}>
        <div style={{ height: '1px', background: '#e5e7eb', marginBottom: '12px' }} />
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '16px' }}>
          {/* Signature placeholder */}
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontFamily: 'Georgia, serif',
                fontSize: '22px',
                color: accent,
                fontStyle: 'italic',
                lineHeight: 1,
                marginBottom: '4px',
              }}
            >
              {signatureText}
            </div>
            <div style={{ height: '1px', background: `${accent}55`, width: '120px' }} />
            <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '3px' }}>{presidentRole}</div>
          </div>
          <div style={{ fontSize: '10px', color: '#9ca3af' }}>2024</div>
        </div>
      </div>

      {/* Slide label */}
      <div
        style={{
          position: 'absolute',
          top: '13px',
          right: '10px',
          background: accent,
          color: '#fff',
          fontSize: '9px',
          fontWeight: 700,
          padding: '2px 7px',
          borderRadius: '4px',
          letterSpacing: '0.5px',
          textTransform: 'uppercase',
        }}
      >
        Mensagem
      </div>
    </div>
  );
};
