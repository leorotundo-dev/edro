'use client';

import React from 'react';

interface PitchTimeProps {
  name?: string;
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
  brandColor?: string;
  themeColor?: string;
}

export const PitchTime: React.FC<PitchTimeProps> = ({
  name,
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
  brandColor,
  themeColor,
}) => {
  const accent = themeColor ?? brandColor ?? '#0EA5E9';
  const slideTitle = headline ?? title ?? 'Nosso Time';
  const companyName = brandName ?? name ?? 'Startup';
  const subText = body ?? caption ?? description ?? text ?? 'Fundadores com experiência comprovada e complementar';
  const founderImg = profileImage ?? image ?? postImage ?? thumbnail ?? '';

  const founders = [
    {
      name: 'Ana Souza',
      role: 'CEO & Co-fundadora',
      cred: 'Ex-Google · MBA Wharton',
      badge: 'Produto',
      badgeColor: accent,
    },
    {
      name: 'Bruno Lima',
      role: 'CTO & Co-fundador',
      cred: 'Ex-Nubank · 10 anos eng.',
      badge: 'Tech',
      badgeColor: '#8b5cf6',
    },
    {
      name: 'Carla Melo',
      role: 'CFO & Co-fundadora',
      cred: 'Ex-Goldman · CFA',
      badge: 'Finanças',
      badgeColor: '#22c55e',
    },
    {
      name: 'Diego Ramos',
      role: 'CMO',
      cred: 'Ex-iFood · 200k leads/mês',
      badge: 'Growth',
      badgeColor: '#f59e0b',
    },
  ];

  const advisors = ['Fundo XP Ventures', 'Y Combinator W24', 'Endeavor Mentorship'];

  return (
    <div style={{
      position: 'relative', width: '560px', height: '315px',
      borderRadius: '10px', overflow: 'hidden',
      background: '#ffffff',
      boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
    }}>
      <style>{`
        @keyframes pitch-team-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: `linear-gradient(90deg, ${accent}, ${accent}44, transparent)` }} />
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px', background: `linear-gradient(180deg, ${accent}, transparent)` }} />

      <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', padding: '20px 26px 16px 30px' }}>

        {/* Header */}
        <div style={{ marginBottom: '14px' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: accent, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '3px' }}>
            {companyName}
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#0f172a', margin: '0 0 3px 0', letterSpacing: '-0.02em' }}>
            {slideTitle}
          </h2>
          <p style={{ fontSize: '10px', color: '#64748b', margin: 0 }}>{subText}</p>
        </div>

        {/* Founder cards */}
        <div style={{ display: 'flex', gap: '10px', flex: 1, animation: 'pitch-team-in 0.5s ease-out' }}>
          {founders.map((f, i) => (
            <div key={i} style={{
              flex: 1, borderRadius: '10px', padding: '12px 10px',
              background: '#f8fafc', border: '1px solid #e2e8f0',
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              textAlign: 'center',
            }}>
              {/* Avatar circle */}
              {i === 0 && founderImg ? (
                <img
                  src={founderImg}
                  alt={f.name}
                  style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover', marginBottom: '8px', border: `2px solid ${f.badgeColor}` }}
                />
              ) : (
                <div style={{
                  width: '44px', height: '44px', borderRadius: '50%',
                  background: `${f.badgeColor}18`,
                  border: `2px solid ${f.badgeColor}44`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: '8px',
                  fontSize: '16px', fontWeight: 900, color: f.badgeColor,
                }}>
                  {f.name.charAt(0)}
                </div>
              )}
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#0f172a', marginBottom: '2px' }}>{f.name}</div>
              <div style={{ fontSize: '9px', color: '#64748b', marginBottom: '6px', lineHeight: 1.3 }}>{f.role}</div>
              <div style={{ fontSize: '9px', color: '#475569', marginBottom: '8px', lineHeight: 1.3 }}>{f.cred}</div>
              <div style={{
                background: `${f.badgeColor}18`, border: `1px solid ${f.badgeColor}44`,
                borderRadius: '20px', padding: '2px 8px',
                fontSize: '9px', fontWeight: 700, color: f.badgeColor,
              }}>
                {f.badge}
              </div>
            </div>
          ))}
        </div>

        {/* Advisors strip */}
        <div style={{
          marginTop: '10px', display: 'flex', alignItems: 'center', gap: '8px',
          background: '#f1f5f9', borderRadius: '7px', padding: '6px 12px',
        }}>
          <span style={{ fontSize: '9px', fontWeight: 700, color: '#64748b', whiteSpace: 'nowrap' }}>Apoio:</span>
          {advisors.map((a, i) => (
            <div key={i} style={{
              background: '#ffffff', border: '1px solid #e2e8f0',
              borderRadius: '20px', padding: '2px 8px',
              fontSize: '9px', fontWeight: 600, color: '#334155',
            }}>
              {a}
            </div>
          ))}
          <div style={{ marginLeft: 'auto', fontSize: '10px', color: '#94a3b8' }}>09 / 15</div>
        </div>
      </div>
    </div>
  );
};
