'use client';

import React from 'react';

interface NewsletterCEOProps {
  brandName?: string;
  brandColor?: string;
  name?: string;
  title?: string;
  body?: string;
  headline?: string;
  profileImage?: string;
}

export const NewsletterCEO: React.FC<NewsletterCEOProps> = ({
  brandName = 'Empresa S.A.',
  brandColor = '#1e3a5f',
  name = 'Roberto Andrade',
  title = 'CEO & Fundador',
  body = 'Queridos colaboradores, é com grande satisfação que compartilho os resultados extraordinários que alcançamos juntos neste trimestre. Nossa dedicação coletiva superou todas as projeções e reafirma que estamos no caminho certo. O crescimento de 23% em receita reflete não apenas números, mas o talento e compromisso de cada um de vocês. Continuemos juntos nesta jornada de excelência.',
  headline = 'Mensagem do CEO · Março 2025',
  profileImage = '',
}) => {
  const initials = name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div style={{
      width: 420, background: '#ffffff',
      borderRadius: 12, overflow: 'hidden',
      fontFamily: "'Georgia', serif",
      boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
    }}>
      <style>{`
        @keyframes ceo-fade { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        .ceo-body { animation: ceo-fade 0.7s ease both 0.2s; }
        .ceo-sig { animation: ceo-fade 0.7s ease both 0.5s; }
      `}</style>

      {/* Top brand bar */}
      <div style={{ height: 5, background: `linear-gradient(90deg, ${brandColor}, #2563eb, ${brandColor})` }} />

      {/* Header */}
      <div style={{ background: brandColor, padding: '22px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase' }}>
              {brandName}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10 }}>{headline}</div>
          </div>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <polyline points="22,6 12,13 2,6" />
          </svg>
        </div>
        <h1 style={{ color: 'white', fontSize: 18, fontWeight: 700, margin: 0, fontFamily: "'Georgia', serif" }}>
          Mensagem da Liderança
        </h1>
      </div>

      {/* CEO Photo + Name */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 16,
        padding: '22px 28px 14px',
        borderBottom: '1px solid #f3f4f6',
      }}>
        <div style={{
          width: 68, height: 68, borderRadius: '50%', flexShrink: 0,
          background: profileImage ? 'none' : `linear-gradient(135deg, ${brandColor}, #2563eb)`,
          border: `3px solid ${brandColor}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden',
        }}>
          {profileImage
            ? <img src={profileImage} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{ color: 'white', fontSize: 22, fontWeight: 800 }}>{initials}</span>
          }
        </div>
        <div>
          <div style={{ color: '#111827', fontWeight: 700, fontSize: 16, fontFamily: "'Georgia', serif" }}>{name}</div>
          <div style={{ color: '#6b7280', fontSize: 12 }}>{title}</div>
          <div style={{ color: brandColor, fontSize: 11, fontWeight: 600 }}>{brandName}</div>
        </div>
      </div>

      {/* Message body */}
      <div className="ceo-body" style={{ padding: '20px 28px' }}>
        <p style={{
          color: '#374151', fontSize: 13, lineHeight: 1.85,
          margin: 0, fontStyle: 'italic', fontFamily: "'Georgia', serif",
          borderLeft: `3px solid ${brandColor}40`,
          paddingLeft: 14,
        }}>
          "{body}"
        </p>
      </div>

      {/* Key highlights */}
      <div style={{ padding: '0 28px 20px' }}>
        <div style={{ color: '#9ca3af', fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 10 }}>
          Destaques do Período
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[
            { val: '+23%', label: 'Receita' },
            { val: '94%', label: 'CSAT' },
            { val: '12', label: 'Novos clientes' },
          ].map((h, i) => (
            <div key={i} style={{
              flex: 1, background: '#f9fafb', borderRadius: 8, padding: '10px 0',
              textAlign: 'center', border: '1px solid #e5e7eb',
            }}>
              <div style={{ color: brandColor, fontSize: 18, fontWeight: 800 }}>{h.val}</div>
              <div style={{ color: '#9ca3af', fontSize: 9 }}>{h.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Signature */}
      <div className="ceo-sig" style={{ padding: '0 28px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          flex: 1, height: 1, background: `linear-gradient(90deg, ${brandColor}30, transparent)`,
        }} />
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: brandColor, fontSize: 13, fontStyle: 'italic', fontFamily: "'Georgia', serif" }}>
            Com gratidão e confiança,
          </div>
          <div style={{ color: '#111827', fontWeight: 700, fontSize: 14 }}>{name}</div>
        </div>
        <div style={{
          flex: 1, height: 1, background: `linear-gradient(90deg, transparent, ${brandColor}30)`,
        }} />
      </div>

      {/* Footer */}
      <div style={{
        background: '#f9fafb', borderTop: '1px solid #e5e7eb',
        padding: '12px 28px', display: 'flex', justifyContent: 'space-between',
      }}>
        <span style={{ color: '#9ca3af', fontSize: 10 }}>{brandName} · Comunicação Executiva</span>
        <span style={{ color: '#9ca3af', fontSize: 10 }}>{new Date().toLocaleDateString('pt-BR')}</span>
      </div>
    </div>
  );
};
