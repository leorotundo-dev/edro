'use client';

import React from 'react';

interface PitchContatoProps {
  name?: string;
  brandName?: string;
  username?: string;
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
  brandColor?: string;
  themeColor?: string;
}

export const PitchContato: React.FC<PitchContatoProps> = ({
  name,
  brandName,
  username,
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
  brandColor,
  themeColor,
}) => {
  const accent = themeColor ?? brandColor ?? '#0EA5E9';
  const founderName = name ?? 'Ana Souza';
  const company = brandName ?? 'Startup';
  const role = headline ?? title ?? 'CEO & Co-fundadora';
  const thankMsg = body ?? caption ?? description ?? text ?? 'Obrigado pela atenção e pelo tempo dedicado.';
  const founderImg = profileImage ?? image ?? postImage ?? thumbnail ?? '';
  const handle = username ?? 'anasousa';

  const contacts = [
    {
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
          <polyline points="22,6 12,13 2,6" />
        </svg>
      ),
      label: `${handle.toLowerCase()}@${company.toLowerCase()}.com.br`,
      type: 'Email',
    },
    {
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
          <rect x="2" y="9" width="4" height="12" />
          <circle cx="4" cy="4" r="2" />
        </svg>
      ),
      label: `linkedin.com/in/${handle.toLowerCase()}`,
      type: 'LinkedIn',
    },
    {
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
      ),
      label: `www.${company.toLowerCase()}.com.br`,
      type: 'Website',
    },
  ];

  const stats = [
    { label: 'MRR', value: 'R$480k' },
    { label: 'Clientes', value: '1.240' },
    { label: 'NPS', value: '72' },
  ];

  return (
    <div style={{
      position: 'relative', width: '560px', height: '315px',
      borderRadius: '10px', overflow: 'hidden',
      background: '#ffffff',
      boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
    }}>
      <style>{`
        @keyframes pitch-contact-in {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>

      {/* Top gradient band */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '90px',
        background: `linear-gradient(135deg, #0f172a 0%, #1e293b 60%, ${accent}22 100%)`,
      }} />

      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: `linear-gradient(90deg, ${accent}, ${accent}44, transparent)` }} />

      <div style={{
        position: 'relative', height: '100%',
        display: 'flex', flexDirection: 'column',
        padding: '0 28px 18px',
        animation: 'pitch-contact-in 0.5s ease-out',
      }}>

        {/* Profile header */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '16px', paddingTop: '22px', paddingBottom: '16px' }}>
          {founderImg ? (
            <img
              src={founderImg}
              alt={founderName}
              style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover', border: `3px solid ${accent}`, flexShrink: 0 }}
            />
          ) : (
            <div style={{
              width: '64px', height: '64px', borderRadius: '50%', flexShrink: 0,
              background: `linear-gradient(135deg, ${accent}, ${accent}88)`,
              border: `3px solid ${accent}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '24px', fontWeight: 900, color: '#fff',
            }}>
              {founderName.charAt(0)}
            </div>
          )}
          <div style={{ paddingBottom: '4px' }}>
            <div style={{ fontSize: '22px', fontWeight: 900, color: '#f8fafc', letterSpacing: '-0.02em', lineHeight: 1 }}>
              {founderName}
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '3px' }}>
              {role} · {company}
            </div>
          </div>
        </div>

        {/* Thank you message */}
        <p style={{ fontSize: '11px', color: '#475569', margin: '0 0 16px 0', lineHeight: 1.5 }}>
          {thankMsg}
        </p>

        {/* Contact info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', marginBottom: '14px' }}>
          {contacts.map((c, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              background: '#f8fafc', borderRadius: '7px', padding: '7px 12px',
              border: '1px solid #e2e8f0',
            }}>
              <div style={{ color: accent, flexShrink: 0 }}>{c.icon}</div>
              <span style={{ fontSize: '10px', fontWeight: 600, color: '#334155' }}>{c.label}</span>
              <span style={{
                marginLeft: 'auto', fontSize: '9px', fontWeight: 700,
                color: accent, background: `${accent}12`,
                borderRadius: '20px', padding: '1px 7px',
              }}>
                {c.type}
              </span>
            </div>
          ))}
        </div>

        {/* Key stats strip */}
        <div style={{
          display: 'flex', gap: '1px', borderRadius: '8px', overflow: 'hidden',
          border: '1px solid #e2e8f0',
        }}>
          {stats.map((s, i) => (
            <div key={i} style={{
              flex: 1, textAlign: 'center', padding: '6px',
              background: i % 2 === 0 ? '#f8fafc' : '#ffffff',
            }}>
              <div style={{ fontSize: '14px', fontWeight: 900, color: accent }}>{s.value}</div>
              <div style={{ fontSize: '9px', color: '#94a3b8', marginTop: '1px' }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px', fontSize: '10px', color: '#94a3b8' }}>
          <span>14 / 15</span>
        </div>
      </div>
    </div>
  );
};
