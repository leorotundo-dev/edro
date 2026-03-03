'use client';

import React from 'react';

interface PressReleaseParceriaProps {
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

export const PressReleaseParceria: React.FC<PressReleaseParceriaProps> = ({
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
  brandColor = '#0369a1',
}) => {
  const accent = brandColor || '#0369a1';
  const resolvedOrg = brandName || name || username || 'Edro Digital';
  const resolvedPartner = 'TechNova Solutions';
  const resolvedHeadline =
    headline || title ||
    'Edro Digital e TechNova firmam Parceria Estratégica para Acelerar a Transformação Digital no Brasil';
  const resolvedBody =
    body || text || description || caption ||
    'A aliança une a expertise em inteligência artificial da Edro Digital com a infraestrutura em nuvem de alto desempenho da TechNova, criando uma oferta inédita para empresas que buscam escalar operações digitais com segurança e eficiência.';
  const resolvedLogoA = image || postImage || null;
  const resolvedLogoB = thumbnail || profileImage || null;

  const benefits = [
    'Integração de IA generativa com infraestrutura de nuvem corporativa',
    'Acesso a uma base combinada de mais de 30 mil clientes ativos',
    'Suporte técnico unificado 24/7 com SLA garantido',
    'Desenvolvimento conjunto de soluções para o mercado latinoamericano',
    'Programas de capacitação para equipes de TI dos clientes',
  ];

  const quoteA = {
    text: 'Esta parceria representa um marco estratégico para a Edro Digital. Juntos, poderemos entregar soluções de IA muito mais robustas e escaláveis ao nosso ecossistema.',
    author: 'Leonardo Rocha',
    role: `CEO, ${resolvedOrg}`,
  };

  const quoteB = {
    text: 'A TechNova encontrou em Edro Digital o parceiro ideal para nossa expansão no segmento de inteligência artificial. É uma combinação perfeita de visão e execução.',
    author: 'Fernanda Castilho',
    role: `Diretora de Parcerias, ${resolvedPartner}`,
  };

  const initialA = resolvedOrg.charAt(0).toUpperCase();
  const initialB = resolvedPartner.charAt(0).toUpperCase();
  const currentDate = '3 de março de 2026';

  return (
    <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", display: 'inline-block' }}>
      <style>{`
        @keyframes prpar-fade { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .prpar-wrap { animation: prpar-fade 0.4s ease; }
      `}</style>

      <div
        className="prpar-wrap"
        style={{
          width: '480px',
          background: '#ffffff',
          borderRadius: '10px',
          overflow: 'hidden',
          boxShadow: '0 4px 6px rgba(0,0,0,0.06), 0 16px 40px rgba(0,0,0,0.10)',
          border: '1px solid #e5e7eb',
        }}
      >
        {/* Gradient accent bar */}
        <div
          style={{
            height: '4px',
            background: `linear-gradient(90deg, ${accent} 0%, #7c3aed 100%)`,
          }}
        />

        {/* Letterhead — two logos side by side */}
        <div
          style={{
            padding: '14px 24px',
            borderBottom: '1px solid #f3f4f6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Company A */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {resolvedLogoA ? (
              <img src={resolvedLogoA} alt={resolvedOrg} style={{ height: '28px', objectFit: 'contain' }} />
            ) : (
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: accent,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: 900,
                }}
              >
                {initialA}
              </div>
            )}
            <div>
              <div style={{ fontSize: '12px', fontWeight: 800, color: '#111827' }}>{resolvedOrg}</div>
              <div style={{ fontSize: '9px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Empresa A
              </div>
            </div>
          </div>

          {/* Partnership icon */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '2px',
            }}
          >
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: `linear-gradient(135deg, ${accent}22 0%, #7c3aed22 100%)`,
                border: `2px solid ${accent}44`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                fontWeight: 900,
                color: accent,
              }}
            >
              ×
            </div>
            <div style={{ fontSize: '8px', color: '#9ca3af', fontWeight: 700, letterSpacing: '0.04em' }}>
              parceria
            </div>
          </div>

          {/* Company B */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexDirection: 'row-reverse' }}>
            {resolvedLogoB ? (
              <img src={resolvedLogoB} alt={resolvedPartner} style={{ height: '28px', objectFit: 'contain' }} />
            ) : (
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: '#7c3aed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: 900,
                }}
              >
                {initialB}
              </div>
            )}
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '12px', fontWeight: 800, color: '#111827' }}>{resolvedPartner}</div>
              <div style={{ fontSize: '9px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Empresa B
              </div>
            </div>
          </div>
        </div>

        <div style={{ padding: '20px 24px' }}>
          {/* "PARCERIA ESTRATÉGICA" label + date */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '10px',
            }}
          >
            <div
              style={{
                fontSize: '9px',
                fontWeight: 800,
                color: '#fff',
                background: `linear-gradient(90deg, ${accent} 0%, #7c3aed 100%)`,
                padding: '3px 10px',
                borderRadius: '4px',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
              }}
            >
              Parceria Estratégica
            </div>
            <div style={{ fontSize: '10px', color: '#6b7280' }}>
              SÃO PAULO — {currentDate}
            </div>
          </div>

          {/* Headline */}
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
            {resolvedHeadline}
          </h1>

          {/* Lead */}
          <p style={{ fontSize: '13px', color: '#374151', lineHeight: 1.7, margin: '0 0 16px' }}>
            {resolvedBody}
          </p>

          {/* Benefits list */}
          <div
            style={{
              background: `${accent}08`,
              border: `1px solid ${accent}22`,
              borderRadius: '8px',
              padding: '14px 16px',
              marginBottom: '16px',
            }}
          >
            <div
              style={{
                fontSize: '10px',
                fontWeight: 800,
                color: accent,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: '10px',
              }}
            >
              Benefícios da Parceria
            </div>
            {benefits.map((b, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                  marginBottom: i < benefits.length - 1 ? '7px' : 0,
                }}
              >
                <div
                  style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    background: accent,
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: '1px',
                    fontSize: '9px',
                    fontWeight: 900,
                  }}
                >
                  ✓
                </div>
                <span style={{ fontSize: '12px', color: '#374151', lineHeight: 1.5 }}>{b}</span>
              </div>
            ))}
          </div>

          {/* Quotes from both execs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '18px' }}>
            {[quoteA, quoteB].map((q, i) => (
              <div
                key={i}
                style={{
                  borderLeft: `3px solid ${i === 0 ? accent : '#7c3aed'}`,
                  paddingLeft: '12px',
                  background: `${i === 0 ? accent : '#7c3aed'}06`,
                  borderRadius: '0 6px 6px 0',
                  padding: '10px 12px',
                }}
              >
                <p
                  style={{
                    fontSize: '12px',
                    fontStyle: 'italic',
                    color: '#374151',
                    margin: '0 0 5px',
                    lineHeight: 1.55,
                  }}
                >
                  &ldquo;{q.text}&rdquo;
                </p>
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: i === 0 ? accent : '#7c3aed',
                  }}
                >
                  — {q.author}, {q.role}
                </div>
              </div>
            ))}
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
                Marina Souza — Assessoria Conjunta
              </div>
              <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '1px' }}>
                parceria@edrodigital.com.br · (11) 97654-3210
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
              <button
                type="button"
                aria-label="Baixar comunicado de parceria em PDF"
                style={{
                  background: `linear-gradient(90deg, ${accent} 0%, #7c3aed 100%)`,
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
