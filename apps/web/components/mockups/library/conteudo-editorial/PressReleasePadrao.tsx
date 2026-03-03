'use client';

import React from 'react';

interface PressReleasePadraoProps {
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

export const PressReleasePadrao: React.FC<PressReleasePadraoProps> = ({
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
  brandColor = '#1d4ed8',
}) => {
  const accent = brandColor || '#1d4ed8';
  const resolvedOrg = brandName || name || username || 'Empresa Digital Ltda.';
  const resolvedHeadline =
    headline || title ||
    'Empresa Lança Nova Solução de Gestão Integrada para PMEs Brasileiras';
  const resolvedBody =
    body || text || description || caption ||
    'A empresa apresentou ao mercado uma plataforma inovadora que unifica processos financeiros, comerciais e operacionais em um único ambiente digital. A solução, desenvolvida ao longo de dois anos de pesquisa e desenvolvimento, promete reduzir em até 40% o tempo gasto com tarefas administrativas.';
  const resolvedLogo = image || postImage || thumbnail || profileImage || null;
  const initial = resolvedOrg.charAt(0).toUpperCase();

  const currentDate = '3 de março de 2026';

  return (
    <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", display: 'inline-block' }}>
      <style>{`
        @keyframes prp-fade { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .prp-wrap { animation: prp-fade 0.4s ease; }
      `}</style>

      <div
        className="prp-wrap"
        style={{
          width: '480px',
          background: '#ffffff',
          borderRadius: '10px',
          overflow: 'hidden',
          boxShadow: '0 4px 6px rgba(0,0,0,0.06), 0 16px 40px rgba(0,0,0,0.10)',
          border: '1px solid #e5e7eb',
        }}
      >
        {/* Accent bar at top */}
        <div style={{ height: '4px', background: `linear-gradient(90deg, ${accent} 0%, ${accent}99 100%)` }} />

        {/* Letterhead */}
        <div
          style={{
            padding: '14px 24px',
            borderBottom: '1px solid #f3f4f6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {resolvedLogo ? (
              <img src={resolvedLogo} alt={resolvedOrg} style={{ height: '30px', objectFit: 'contain' }} />
            ) : (
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '8px',
                  background: accent,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontSize: '15px',
                  fontWeight: 900,
                  flexShrink: 0,
                }}
              >
                {initial}
              </div>
            )}
            <div>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#111827' }}>{resolvedOrg}</div>
              <div style={{ fontSize: '9px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '1px' }}>
                Assessoria de Imprensa
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div
              style={{
                fontSize: '9px',
                fontWeight: 800,
                background: '#16a34a',
                color: '#fff',
                padding: '2px 8px',
                borderRadius: '4px',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: '3px',
              }}
            >
              Para Divulgação Imediata
            </div>
            <div style={{ fontSize: '10px', color: '#6b7280' }}>{currentDate}</div>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px' }}>
          {/* "COMUNICADO À IMPRENSA" label */}
          <div
            style={{
              fontSize: '9px',
              fontWeight: 800,
              color: accent,
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              marginBottom: '8px',
            }}
          >
            Comunicado à Imprensa
          </div>

          {/* Headline */}
          <h1
            style={{
              fontSize: '19px',
              fontWeight: 900,
              color: '#111827',
              lineHeight: 1.3,
              margin: '0 0 12px',
              letterSpacing: '-0.02em',
              fontFamily: "'Georgia', 'Times New Roman', serif",
            }}
          >
            {resolvedHeadline}
          </h1>

          {/* Dateline + Lead paragraph */}
          <p style={{ fontSize: '13px', color: '#374151', lineHeight: 1.7, margin: '0 0 14px' }}>
            <strong style={{ color: '#111827' }}>SÃO PAULO, SP</strong> —{' '}
            {currentDate} — {resolvedBody}
          </p>

          {/* Second paragraph */}
          <p style={{ fontSize: '13px', color: '#374151', lineHeight: 1.7, margin: '0 0 14px' }}>
            A plataforma estará disponível para assinatura a partir do segundo trimestre de 2026,
            com planos que atendem desde microempresas até médias corporações. O período de
            implementação é de até 5 dias úteis, com suporte técnico dedicado durante os primeiros
            90 dias de uso.
          </p>

          {/* Third paragraph */}
          <p style={{ fontSize: '13px', color: '#374151', lineHeight: 1.7, margin: '0 0 18px' }}>
            Segundo pesquisa interna conduzida com 250 clientes beta, 93% relataram aumento
            de produtividade já no primeiro mês, e 87% recomendariam a solução a outros gestores.
          </p>

          {/* Sobre a Empresa boilerplate */}
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
                marginBottom: '6px',
              }}
            >
              Sobre a {resolvedOrg}
            </div>
            <p style={{ fontSize: '12px', color: '#4b5563', lineHeight: 1.6, margin: 0 }}>
              Fundada em 2018, a {resolvedOrg} é referência nacional em soluções de gestão digital
              para pequenas e médias empresas. Com presença em mais de 30 estados brasileiros e uma
              base de mais de 15 mil clientes ativos, a empresa tem como missão simplificar a
              operação e impulsionar o crescimento dos negócios brasileiros.
            </p>
          </div>

          {/* Divider */}
          <div style={{ borderTop: '1px solid #e5e7eb', marginBottom: '14px' }} />

          {/* Press contact footer */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
            <div>
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
                Contato de Imprensa
              </div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#111827', marginBottom: '2px' }}>
                Ana Paula Ferreira — Assessora Sênior
              </div>
              <div style={{ fontSize: '11px', color: '#6b7280' }}>
                imprensa@{resolvedOrg.toLowerCase().replace(/\s+/g, '')}.com.br
              </div>
              <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '1px' }}>
                (11) 98765-4321
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                aria-label="Baixar comunicado à imprensa em PDF"
                style={{
                  background: accent,
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
