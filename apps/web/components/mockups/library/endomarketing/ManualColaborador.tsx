'use client';

import React from 'react';

interface ManualColaboradorProps {
  brandName?: string;
  brandColor?: string;
  name?: string;
  title?: string;
  headline?: string;
  body?: string;
  description?: string;
  image?: string;
}

export const ManualColaborador: React.FC<ManualColaboradorProps> = ({
  brandName = 'Empresa S.A.',
  brandColor = '#1e40af',
  name = 'Departamento de Recursos Humanos',
  title = 'Manual do Colaborador 2025',
  headline = 'Bem-vindo à nossa equipe!',
  body = 'Este manual foi elaborado para orientar você em sua jornada conosco. Aqui você encontrará informações sobre nossa cultura, valores, políticas internas e os benefícios que oferecemos. Leia com atenção e, em caso de dúvidas, procure o seu gestor ou o RH.',
  description = '',
  image = '',
}) => {
  return (
    <div style={{
      width: 300, minHeight: 424,
      background: '#ffffff',
      borderRadius: 8, overflow: 'hidden',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
      display: 'flex', flexDirection: 'column',
      border: '1px solid #e5e7eb',
    }}>
      <style>{`
        @keyframes mc-fade { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        .mc-body { animation: mc-fade 0.5s ease both 0.2s; }
      `}</style>

      {/* Capa colorida */}
      <div style={{
        background: `linear-gradient(160deg, ${brandColor} 0%, ${brandColor}cc 100%)`,
        padding: '28px 24px 22px',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: -20, right: -20,
          width: 100, height: 100, borderRadius: '50%',
          background: 'rgba(255,255,255,0.08)',
        }} />
        <div style={{
          position: 'absolute', bottom: -30, left: -15,
          width: 80, height: 80, borderRadius: '50%',
          background: 'rgba(255,255,255,0.06)',
        }} />

        <div style={{
          width: 52, height: 52, borderRadius: 12,
          background: 'rgba(255,255,255,0.2)',
          border: '1px solid rgba(255,255,255,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 16,
        }}>
          {image ? (
            <img src={image} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 10 }} />
          ) : (
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
            </svg>
          )}
        </div>

        <div style={{
          background: 'rgba(255,255,255,0.15)', borderRadius: 4,
          padding: '3px 10px', display: 'inline-block', marginBottom: 10,
        }}>
          <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: 9, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase' }}>
            Documento Oficial
          </span>
        </div>

        <h1 style={{ color: 'white', fontSize: 17, fontWeight: 900, margin: '0 0 6px', lineHeight: 1.3 }}>
          {title}
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11, margin: 0 }}>{brandName}</p>
      </div>

      {/* Barra de destaque */}
      <div style={{
        background: '#f8fafc', borderBottom: '1px solid #e5e7eb',
        padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={brandColor} strokeWidth="2">
          <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <span style={{ color: brandColor, fontSize: 11, fontWeight: 700 }}>{headline}</span>
      </div>

      {/* Corpo */}
      <div className="mc-body" style={{ flex: 1, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <p style={{ color: '#374151', fontSize: 11, lineHeight: 1.7, margin: 0 }}>{body}</p>

        <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 14 }}>
          <div style={{ color: '#6b7280', fontSize: 9, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>
            Conteúdo deste manual
          </div>
          {[
            { num: '01', label: 'Nossa História e Valores' },
            { num: '02', label: 'Código de Conduta' },
            { num: '03', label: 'Benefícios e Remuneração' },
            { num: '04', label: 'Políticas Internas' },
            { num: '05', label: 'Canais de Comunicação' },
          ].map((item, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '5px 0',
              borderBottom: i < 4 ? '1px solid #f3f4f6' : 'none',
            }}>
              <span style={{
                width: 22, height: 22, borderRadius: 5,
                background: `${brandColor}15`, color: brandColor,
                fontSize: 9, fontWeight: 800,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>{item.num}</span>
              <span style={{ color: '#374151', fontSize: 11 }}>{item.label}</span>
              <svg style={{ marginLeft: 'auto' }} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>
          ))}
        </div>

        <div style={{
          background: `${brandColor}0d`, border: `1px solid ${brandColor}25`,
          borderRadius: 8, padding: '10px 14px',
          display: 'flex', gap: 10, alignItems: 'flex-start',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={brandColor} strokeWidth="2" style={{ marginTop: 1, flexShrink: 0 }}>
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <div>
            <div style={{ color: brandColor, fontSize: 10, fontWeight: 700, marginBottom: 2 }}>{name}</div>
            <div style={{ color: '#6b7280', fontSize: 10 }}>rh@empresa.com.br · Ramal 200</div>
          </div>
        </div>
      </div>

      {/* Rodapé */}
      <div style={{
        background: '#f9fafb', borderTop: '1px solid #e5e7eb',
        padding: '8px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{ color: '#9ca3af', fontSize: 9 }}>Versão 2025 · Uso Interno</span>
        <span style={{
          background: brandColor, color: 'white',
          fontSize: 8, fontWeight: 700, padding: '2px 8px', borderRadius: 3,
        }}>A4 · CONFIDENCIAL</span>
      </div>
    </div>
  );
};
