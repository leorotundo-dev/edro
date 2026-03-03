'use client';

import React from 'react';

interface TVCorporativaReconhecimentoProps {
  brandName?: string;
  name?: string;
  title?: string;
  body?: string;
  description?: string;
  brandColor?: string;
  profileImage?: string;
}

export const TVCorporativaReconhecimento: React.FC<TVCorporativaReconhecimentoProps> = ({
  brandName = 'Empresa S.A.',
  name = 'Carla Mendonça',
  title = 'Gerente de Projetos',
  body = 'Liderou a entrega do projeto de migração cloud com 3 semanas de antecedência e economia de R$ 120k, superando todas as expectativas da diretoria.',
  description = 'Excelência em Gestão de Projetos',
  brandColor = '#f59e0b',
  profileImage = '',
}) => {
  const initials = name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div style={{
      width: 560, height: 315,
      background: 'linear-gradient(150deg, #0f0800 0%, #1f1200 60%, #0f0800 100%)',
      borderRadius: 12, overflow: 'hidden',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      position: 'relative', display: 'flex', flexDirection: 'column',
    }}>
      <style>{`
        @keyframes rec-star-spin { 0%{transform:rotate(0) scale(1)} 50%{transform:rotate(180deg) scale(1.2)} 100%{transform:rotate(360deg) scale(1)} }
        @keyframes rec-glow { 0%,100%{box-shadow:0 0 20px rgba(245,158,11,0.3)} 50%{box-shadow:0 0 50px rgba(245,158,11,0.7)} }
        @keyframes rec-shimmer { 0%{background-position:200% center} 100%{background-position:-200% center} }
        @keyframes rec-in { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        .rec-avatar { animation: rec-glow 2.5s ease-in-out infinite; }
        .rec-star { animation: rec-star-spin 4s linear infinite; }
        .rec-title { animation: rec-in 0.6s ease both 0.3s; }
        .rec-body { animation: rec-in 0.6s ease both 0.5s; }
        .rec-badge {
          background: linear-gradient(90deg, #f59e0b, #fbbf24, #f59e0b);
          background-size: 200% auto;
          animation: rec-shimmer 3s linear infinite;
        }
      `}</style>

      {/* Background radial */}
      <div style={{
        position: 'absolute', width: 280, height: 280, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(245,158,11,0.12) 0%, transparent 70%)',
        top: -60, right: -40, pointerEvents: 'none',
      }} />

      <div style={{ height: 4, background: 'linear-gradient(90deg, #92400e, #f59e0b, #fde68a, #f59e0b, #92400e)' }} />

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '9px 20px 7px', borderBottom: '1px solid rgba(245,158,11,0.2)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="rec-star" style={{ fontSize: 22 }}>⭐</div>
          <div>
            <div style={{ color: '#fbbf24', fontWeight: 800, fontSize: 15 }}>Destaque do Mês</div>
            <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10 }}>{brandName} · Reconhecimento Corporativo</div>
          </div>
        </div>
        <div className="rec-badge" style={{
          borderRadius: 20, padding: '4px 14px',
          color: '#7c2d12', fontSize: 11, fontWeight: 800,
        }}>
          🏆 COLABORADOR DESTAQUE
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', padding: '14px 24px', gap: 24 }}>

        {/* Avatar column */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <div className="rec-avatar" style={{
            width: 96, height: 96, borderRadius: '50%',
            border: '3px solid #f59e0b',
            background: profileImage ? 'none' : 'linear-gradient(135deg, #92400e, #f59e0b)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden', position: 'relative',
          }}>
            {profileImage
              ? <img src={profileImage} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ color: 'white', fontSize: 34, fontWeight: 900 }}>{initials}</span>
            }
          </div>

          {/* Stars row */}
          <div style={{ display: 'flex', gap: 3 }}>
            {[1,2,3,4,5].map(i => (
              <span key={i} style={{ color: '#f59e0b', fontSize: 14 }}>★</span>
            ))}
          </div>

          {/* Achievement badge */}
          <div style={{
            background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.4)',
            borderRadius: 6, padding: '4px 10px', textAlign: 'center',
          }}>
            <div style={{ color: '#fbbf24', fontSize: 9, fontWeight: 700 }}>{description}</div>
          </div>
        </div>

        {/* Text column */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div className="rec-title">
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 }}>
              Parabéns,
            </div>
            <div style={{ color: 'white', fontSize: 32, fontWeight: 900, lineHeight: 1.05 }}>{name}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 5 }}>
              <div style={{ width: 20, height: 2, background: '#f59e0b', borderRadius: 1 }} />
              <span style={{ color: '#f59e0b', fontSize: 12, fontWeight: 600 }}>{title}</span>
            </div>
          </div>

          <div className="rec-body" style={{
            background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: '10px 14px',
            borderLeft: '3px solid #f59e0b', marginTop: 4,
          }}>
            <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, lineHeight: 1.6, margin: 0, fontStyle: 'italic' }}>
              "{body}"
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            {[
              { icon: '📅', label: 'Março 2025' },
              { icon: '🏢', label: 'Tecnologia & Inovação' },
              { icon: '👥', label: '1.200 votos' },
            ].map((b, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 4,
                background: 'rgba(255,255,255,0.06)', borderRadius: 5, padding: '3px 8px',
              }}>
                <span style={{ fontSize: 10 }}>{b.icon}</span>
                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 9 }}>{b.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{
        padding: '5px 20px 8px', borderTop: '1px solid rgba(245,158,11,0.12)',
        display: 'flex', justifyContent: 'space-between',
      }}>
        <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 9 }}>Programa de Reconhecimento · {brandName}</span>
        <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 9 }}>{new Date().toLocaleDateString('pt-BR')}</span>
      </div>
    </div>
  );
};
