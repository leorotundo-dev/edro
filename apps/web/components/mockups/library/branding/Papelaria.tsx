'use client';

import React from 'react';

interface PapelariaProps {
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
  brandColor?: string;
}

export const Papelaria: React.FC<PapelariaProps> = ({
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
  brandColor = '#1a56db',
}) => {
  const resolvedBrand = brandName || name || username || 'Empresa Digital Ltda.';
  const resolvedTagline = headline || title || body || caption || description || text || 'Plataforma de Marketing Digital';
  const resolvedLogo = image || postImage || thumbnail || profileImage || null;
  const accent = brandColor || '#1a56db';
  const initial = resolvedBrand.charAt(0).toUpperCase();

  return (
    <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", display: 'inline-flex', flexDirection: 'column', gap: '14px' }}>
      <style>{`
        @keyframes pap-appear { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .pap-wrap { animation: pap-appear 0.45s cubic-bezier(0.22,1,0.36,1); }
      `}</style>

      <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.09em' }}>
        Kit de Papelaria · Composição Completa
      </div>

      <div className="pap-wrap" style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>

        {/* A4 Letterhead */}
        <div
          style={{
            width: '200px',
            height: '280px',
            borderRadius: '8px',
            background: '#ffffff',
            border: '1px solid #e5e7eb',
            boxShadow: '0 4px 6px rgba(0,0,0,0.06), 0 12px 28px rgba(0,0,0,0.10)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          {/* Letterhead top strip */}
          <div
            style={{
              height: '52px',
              background: `linear-gradient(90deg, ${accent} 0%, ${accent}cc 100%)`,
              display: 'flex',
              alignItems: 'center',
              padding: '0 16px',
              gap: '10px',
              flexShrink: 0,
            }}
          >
            {resolvedLogo ? (
              <img src={resolvedLogo} alt={resolvedBrand} style={{ height: '28px', width: 'auto', objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />
            ) : (
              <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '13px', fontWeight: 900 }}>
                {initial}
              </div>
            )}
            <div>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#fff', lineHeight: 1 }}>{resolvedBrand}</div>
              <div style={{ fontSize: '8px', color: 'rgba(255,255,255,0.7)', marginTop: '2px' }}>{resolvedTagline}</div>
            </div>
          </div>

          {/* Body content lines */}
          <div style={{ flex: 1, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '7px' }}>
            <div style={{ fontSize: '8px', color: '#374151', fontWeight: 700, marginBottom: '4px' }}>São Paulo, 3 de março de 2026</div>
            {[100, 90, 95, 85, 92, 78, 88, 94, 80, 86, 72, 90].map((w, i) => (
              <div key={i} style={{ height: '5px', background: '#f3f4f6', borderRadius: '2px', width: `${w}%` }} />
            ))}
            <div style={{ marginTop: '8px' }}>
              {[60, 72, 55].map((w, i) => (
                <div key={i} style={{ height: '5px', background: '#f3f4f6', borderRadius: '2px', width: `${w}%`, marginBottom: '6px' }} />
              ))}
            </div>
          </div>

          {/* Footer strip */}
          <div
            style={{
              height: '24px',
              background: `${accent}18`,
              borderTop: `2px solid ${accent}`,
              display: 'flex',
              alignItems: 'center',
              padding: '0 16px',
              gap: '8px',
            }}
          >
            <div style={{ fontSize: '7px', color: accent, fontWeight: 700 }}>www.empresadigital.com.br</div>
            <div style={{ width: '1px', height: '10px', background: `${accent}44` }} />
            <div style={{ fontSize: '7px', color: '#6b7280' }}>CNPJ 00.000.000/0001-00</div>
          </div>

          <div style={{ position: 'absolute', top: '6px', right: '8px', fontSize: '7px', color: 'rgba(255,255,255,0.6)', fontWeight: 700 }}>A4</div>
        </div>

        {/* Right column: business card + envelope stacked */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

          {/* Business card mini */}
          <div
            style={{
              width: '160px',
              height: '96px',
              borderRadius: '7px',
              background: '#ffffff',
              border: '1px solid #e5e7eb',
              boxShadow: '0 3px 6px rgba(0,0,0,0.07), 0 8px 20px rgba(0,0,0,0.09)',
              display: 'flex',
              overflow: 'hidden',
            }}
          >
            <div style={{ width: '5px', background: `linear-gradient(180deg, ${accent} 0%, ${accent}cc 100%)`, flexShrink: 0 }} />
            <div style={{ flex: 1, padding: '10px 10px 8px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {resolvedLogo ? (
                  <img src={resolvedLogo} alt={resolvedBrand} style={{ width: '16px', height: '16px', objectFit: 'contain' }} />
                ) : (
                  <div style={{ width: '16px', height: '16px', borderRadius: '4px', background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '8px', fontWeight: 900 }}>{initial}</div>
                )}
                <div style={{ fontSize: '8px', fontWeight: 800, color: '#111827' }}>{resolvedBrand}</div>
              </div>
              <div>
                <div style={{ fontSize: '10px', fontWeight: 900, color: '#111827', lineHeight: 1 }}>Ana Beatriz Costa</div>
                <div style={{ fontSize: '7.5px', color: accent, fontWeight: 700, marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Diretora de Marketing</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {['contato@empresa.com.br', '+55 (11) 99999-9999'].map((t, i) => (
                  <div key={i} style={{ fontSize: '7px', color: '#6b7280' }}>{t}</div>
                ))}
              </div>
            </div>
          </div>

          {/* Envelope mini */}
          <div
            style={{
              width: '160px',
              height: '96px',
              borderRadius: '7px',
              background: '#ffffff',
              border: '1px solid #e5e7eb',
              boxShadow: '0 3px 6px rgba(0,0,0,0.07), 0 8px 20px rgba(0,0,0,0.09)',
              overflow: 'hidden',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Envelope top color bar */}
            <div style={{ height: '3px', background: `linear-gradient(90deg, ${accent} 0%, ${accent}88 100%)`, flexShrink: 0 }} />
            {/* Flap area */}
            <div style={{ height: '22px', background: '#f3f4f6', borderBottom: '1px dashed #d1d5db', position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
              <div style={{ position: 'absolute', inset: 0, background: '#ececf0', clipPath: 'polygon(0 0, 100% 0, 50% 100%)' }} />
            </div>
            {/* Body */}
            <div style={{ flex: 1, padding: '8px 10px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                {resolvedLogo ? (
                  <img src={resolvedLogo} alt={resolvedBrand} style={{ width: '12px', height: '12px', objectFit: 'contain' }} />
                ) : (
                  <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '7px', fontWeight: 900 }}>{initial}</div>
                )}
                <div style={{ fontSize: '7px', fontWeight: 800, color: '#111827' }}>{resolvedBrand}</div>
              </div>
              <div style={{ alignSelf: 'center', padding: '5px 8px', border: '1px solid #e5e7eb', borderRadius: '3px', background: '#fafafa' }}>
                <div style={{ fontSize: '6px', fontWeight: 700, color: '#374151' }}>Destinatário</div>
                <div style={{ fontSize: '7px', color: '#6b7280', marginTop: '1px' }}>Nome / Endereço</div>
              </div>
            </div>
          </div>

          <div style={{ fontSize: '9px', color: '#9ca3af', lineHeight: 1.5 }}>
            Timbrado A4<br />
            Cartão 9×5 cm<br />
            Envelope DL
          </div>
        </div>
      </div>

      <div style={{ fontSize: '10px', color: '#9ca3af' }}>Kit completo de papelaria · Arquivos editáveis em AI/Indesign entregues no brandbook</div>
    </div>
  );
};
