'use client';

import React, { useState } from 'react';

interface LinkedInCertificateProps {
  name?: string;
  username?: string;
  brandName?: string;
  headline?: string;
  title?: string;
  body?: string;
  caption?: string;
  description?: string;
  text?: string;
  image?: string;
  postImage?: string;
  thumbnail?: string;
  profileImage?: string;
  issuerName?: string;
  issuerLogo?: string;
  issueDate?: string;
  expiryDate?: string;
  credentialId?: string;
  skills?: string[];
}

export const LinkedInCertificate: React.FC<LinkedInCertificateProps> = ({
  name,
  username,
  brandName,
  headline,
  title,
  body,
  caption,
  description,
  text,
  image,
  postImage,
  thumbnail,
  profileImage,
  issuerName,
  issuerLogo,
  issueDate = 'janeiro de 2026',
  expiryDate,
  credentialId = 'UC-a1b2c3d4-e5f6',
  skills = ['Gestão de Projetos', 'Liderança', 'Metodologias Ágeis'],
}) => {
  const [copied, setCopied] = useState(false);
  const [viewing, setViewing] = useState(false);

  const resolvedTitle = headline ?? title ?? name ?? brandName ?? body ?? caption ?? description ?? text ?? 'Nome do Certificado';
  const resolvedIssuer = issuerName ?? username ?? brandName ?? name ?? 'Organização Emissora';
  const resolvedIssuerLogo = issuerLogo ?? image ?? postImage ?? thumbnail ?? profileImage ?? '';

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{
      width: 400,
      background: '#fff',
      borderRadius: 8,
      boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
      fontFamily: '"Helvetica Neue", Arial, sans-serif',
      overflow: 'hidden',
      color: '#000',
    }}>
      <style>{`
        @keyframes li-cert-shine {
          0% { left: -100%; }
          60%, 100% { left: 150%; }
        }
        .li-cert-shine-el {
          position: absolute;
          top: 0; bottom: 0;
          width: 60px;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent);
          animation: li-cert-shine 3s ease-in-out infinite;
          pointer-events: none;
        }
        .li-cert-btn:hover { filter: brightness(0.92); }
        .li-cert-outline-btn:hover { background: #f3f2ef !important; }
      `}</style>

      {/* Certificate banner */}
      <div style={{
        position: 'relative',
        overflow: 'hidden',
        background: 'linear-gradient(135deg, #0a66c2 0%, #004182 100%)',
        padding: '28px 24px 22px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
      }}>
        <div className="li-cert-shine-el" />

        {/* LinkedIn verified badge top-right */}
        <div style={{ position: 'absolute', top: 12, right: 14, display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{
            background: '#fff',
            borderRadius: '50%',
            width: 22, height: 22,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="#0a66c2">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" stroke="#0a66c2" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>Verificado</span>
        </div>

        {/* Issuer logo or icon */}
        <div style={{
          width: 72, height: 72,
          borderRadius: 8,
          background: '#fff',
          overflow: 'hidden',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
        }}>
          {resolvedIssuerLogo ? (
            <img src={resolvedIssuerLogo} alt={resolvedIssuer} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 6 }} />
          ) : (
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#0a66c2" strokeWidth="1.5">
              <circle cx="12" cy="8" r="6" />
              <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
            </svg>
          )}
        </div>

        {/* Certificate name */}
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 700, color: '#fff', lineHeight: 1.25 }}>
            {resolvedTitle}
          </h2>
          <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>{resolvedIssuer}</p>
        </div>
      </div>

      {/* Details */}
      <div style={{ padding: '16px 20px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* Date row */}
        <div style={{ display: 'flex', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#666', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 3 }}>Emitido em</div>
            <div style={{ fontSize: 14, fontWeight: 500, color: '#000' }}>{issueDate}</div>
          </div>
          {expiryDate && (
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#666', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 3 }}>Expira em</div>
              <div style={{ fontSize: 14, fontWeight: 500, color: '#000' }}>{expiryDate}</div>
            </div>
          )}
        </div>

        {/* Credential ID */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#666', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 3 }}>ID da Credencial</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <code style={{ fontSize: 13, color: '#000', background: '#f3f2ef', padding: '3px 8px', borderRadius: 4, fontFamily: 'monospace' }}>
              {credentialId}
            </code>
            <button
              type="button"
              aria-label="Copiar ID da credencial"
              className="li-cert-outline-btn"
              onClick={handleCopy}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: '3px 6px',
                borderRadius: 4, color: copied ? '#0a66c2' : '#666', fontSize: 12, fontWeight: 600,
                transition: 'background 0.15s',
              }}
            >
              {copied ? '✓ Copiado' : 'Copiar'}
            </button>
          </div>
        </div>

        {/* Skills */}
        {skills.length > 0 && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#666', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 }}>Competências</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {skills.map((skill, i) => (
                <span key={i} style={{
                  fontSize: 12, fontWeight: 500, color: '#0a66c2',
                  background: '#eef3fb', borderRadius: 100,
                  padding: '4px 10px', whiteSpace: 'nowrap',
                }}>
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Divider */}
        <div style={{ borderTop: '1px solid #e0dfdc' }} />

        {/* CTA */}
        <button
          type="button"
          aria-label="Ver certificado"
          className="li-cert-btn"
          onClick={() => setViewing(true)}
          style={{
            width: '100%',
            padding: '10px 0',
            border: '1.5px solid #0a66c2',
            borderRadius: 100,
            background: viewing ? '#0a66c2' : '#fff',
            color: viewing ? '#fff' : '#0a66c2',
            fontSize: 15,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            transition: 'background 0.2s, color 0.2s',
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
          {viewing ? 'Abrindo certificado…' : 'Ver certificado'}
        </button>
      </div>
    </div>
  );
};
