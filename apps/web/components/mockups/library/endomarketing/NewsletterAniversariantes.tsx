'use client';

import React from 'react';

interface NewsletterAniversariantesProps {
  brandName?: string;
  brandColor?: string;
  name?: string;
  headline?: string;
  title?: string;
}

export const NewsletterAniversariantes: React.FC<NewsletterAniversariantesProps> = ({
  brandName = 'Empresa S.A.',
  brandColor = '#f59e0b',
  name = 'RH Corporativo',
  headline = 'Março 2025',
  title = 'Aniversariantes do Mês',
}) => {
  const celebrants = [
    { nome: 'Ana Carvalho', depto: 'Marketing', dia: '03/03', avatar: 'AC' },
    { nome: 'Bruno Silva', depto: 'Tecnologia', dia: '11/03', avatar: 'BS' },
    { nome: 'Camila Rocha', depto: 'RH', dia: '17/03', avatar: 'CR' },
    { nome: 'Diego Nunes', depto: 'Vendas', dia: '24/03', avatar: 'DN' },
  ];
  const avatarColors = ['#f59e0b', '#3b82f6', '#8b5cf6', '#22c55e'];

  return (
    <div style={{
      width: 420, background: '#ffffff',
      borderRadius: 12, overflow: 'hidden',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
    }}>
      <style>{`
        @keyframes bday-nl-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
        .bday-nl-icon { animation: bday-nl-float 2.5s ease-in-out infinite; }
      `}</style>

      {/* Header */}
      <div style={{
        background: `linear-gradient(135deg, ${brandColor}, #fbbf24)`,
        padding: '28px 28px 22px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8,
              background: 'rgba(255,255,255,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            </div>
            <div>
              <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: 600 }}>{brandName}</div>
              <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 10 }}>{headline}</div>
            </div>
          </div>
          <div className="bday-nl-icon" style={{ fontSize: 32 }}>🎂</div>
        </div>
        <h1 style={{ color: 'white', fontSize: 22, fontWeight: 900, margin: 0, lineHeight: 1.2 }}>{title}</h1>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, margin: '6px 0 0' }}>
          Celebre com quem faz nossa empresa crescer!
        </p>
      </div>

      {/* Intro */}
      <div style={{ padding: '20px 28px 12px' }}>
        <p style={{ color: '#4b5563', fontSize: 13, lineHeight: 1.6, margin: 0 }}>
          Neste mês, comemoramos os aniversários de colaboradores incríveis que contribuem diariamente para o sucesso da nossa equipe. Parabéns a todos! 🎉
        </p>
      </div>

      {/* Celebrants */}
      <div style={{ padding: '0 28px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {celebrants.map((p, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 14,
            background: '#fafafa', borderRadius: 10, padding: '12px 16px',
            border: '1px solid #f3f4f6',
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: '50%',
              background: avatarColors[i], color: 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 800, flexShrink: 0,
            }}>{p.avatar}</div>
            <div style={{ flex: 1 }}>
              <div style={{ color: '#111827', fontWeight: 700, fontSize: 14 }}>{p.nome}</div>
              <div style={{ color: '#6b7280', fontSize: 11 }}>{p.depto}</div>
            </div>
            <div style={{
              background: `${brandColor}18`, border: `1px solid ${brandColor}44`,
              borderRadius: 20, padding: '4px 12px',
            }}>
              <span style={{ color: brandColor, fontSize: 11, fontWeight: 700 }}>🎈 {p.dia}</span>
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div style={{ padding: '0 28px 24px' }}>
        <div style={{
          background: `${brandColor}12`, border: `1px solid ${brandColor}30`,
          borderRadius: 10, padding: '14px 18px', textAlign: 'center',
        }}>
          <p style={{ color: '#374151', fontSize: 12, margin: '0 0 10px', lineHeight: 1.5 }}>
            Que tal enviar uma mensagem de parabéns? Acesse o mural de recados no portal do colaborador.
          </p>
          <button type="button" aria-label="Acessar mural de recados" style={{
            background: brandColor, color: 'white', border: 'none',
            borderRadius: 8, padding: '9px 24px', fontSize: 12, fontWeight: 700,
            cursor: 'pointer',
          }}>
            Enviar Parabéns 🎊
          </button>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        background: '#f9fafb', borderTop: '1px solid #e5e7eb',
        padding: '14px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{ color: '#9ca3af', fontSize: 10 }}>{brandName} · Comunicação Interna</span>
        <span style={{ color: '#9ca3af', fontSize: 10 }}>{new Date().toLocaleDateString('pt-BR')}</span>
      </div>
    </div>
  );
};
