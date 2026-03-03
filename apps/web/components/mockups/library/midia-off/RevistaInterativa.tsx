'use client';

import React from 'react';

interface RevistaInterativaProps {
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

export const RevistaInterativa: React.FC<RevistaInterativaProps> = ({
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
  brandColor = '#4f46e5',
}) => {
  const brand = brandName ?? name ?? 'Marca Digital';
  const mainHeadline = headline ?? title ?? 'Aponte sua câmera e descubra o que está por trás da página';
  const bodyText = body ?? caption ?? description ?? text ?? 'A página interativa conecta o impresso ao digital. Com um QR Code, o leitor acessa vídeo, catálogo completo ou experiência imersiva em segundos — sem digitar nenhum endereço.';
  const adImage = image ?? postImage ?? thumbnail ?? profileImage ?? '';

  const interactions = [
    { icon: '▶', label: 'Vídeo exclusivo' },
    { icon: '📱', label: 'Catálogo digital' },
    { icon: '🌐', label: 'Site completo' },
  ];

  return (
    <div style={{ width: 360, height: 454, background: '#fff', fontFamily: '"Georgia", "Times New Roman", serif', boxShadow: '0 8px 32px rgba(0,0,0,0.18)', overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        @keyframes rint-in { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        .rint-in { animation: rint-in 0.55s ease both; }
        @keyframes rint-img { from{transform:scale(1.04)} to{transform:scale(1)} }
        .rint-img { animation: rint-img 0.7s ease both; }
        @keyframes rint-qr-pulse { 0%,100%{box-shadow:0 0 0 0 transparent} 50%{box-shadow:0 0 0 6px rgba(79,70,229,0.18)} }
        .rint-qr-pulse { animation: rint-qr-pulse 2.5s ease infinite; }
      `}</style>

      {/* Tech-style header */}
      <div style={{ background: brandColor, padding: '10px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }} className="rint-in">
        <div>
          <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.65)', fontFamily: 'sans-serif', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 2 }}>Página Interativa</div>
          <div style={{ fontSize: 15, fontWeight: 900, color: '#fff', letterSpacing: -0.3, textTransform: 'uppercase' }}>{brand}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ade80' }} />
          <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.75)', fontFamily: 'sans-serif' }}>Interativo</span>
        </div>
      </div>

      {/* Image with QR overlay */}
      <div style={{ width: '100%', height: 190, overflow: 'hidden', position: 'relative', flexShrink: 0 }} className="rint-img">
        {adImage ? (
          <img src={adImage} alt={mainHeadline} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', background: `linear-gradient(145deg, ${brandColor}18 0%, ${brandColor}40 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 10 }}>
            <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke={brandColor} strokeWidth="1" opacity="0.35"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
            <span style={{ fontSize: 10, color: brandColor, fontFamily: 'sans-serif', opacity: 0.45 }}>Conteúdo em vídeo disponível</span>
          </div>
        )}

        {/* Video play button overlay */}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.18)' }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(255,255,255,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(0,0,0,0.3)' }}>
            <div style={{ width: 0, height: 0, borderStyle: 'solid', borderWidth: '9px 0 9px 18px', borderColor: `transparent transparent transparent ${brandColor}`, marginLeft: 3 }} />
          </div>
        </div>

        {/* Bottom gradient */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 50, background: 'linear-gradient(to top, rgba(255,255,255,0.9), transparent)' }} />
      </div>

      {/* Content area */}
      <div style={{ flex: 1, padding: '14px 18px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }} className="rint-in">
        <div>
          {/* Tag */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ width: 24, height: 3, background: brandColor }} />
            <span style={{ fontSize: 7.5, color: brandColor, fontFamily: 'sans-serif', textTransform: 'uppercase', letterSpacing: 1.4, fontWeight: 700 }}>Escaneie e acesse</span>
          </div>

          <h2 style={{ fontSize: 15, fontWeight: 900, color: '#111', lineHeight: 1.25, margin: '0 0 8px', letterSpacing: -0.2 }}>{mainHeadline}</h2>
          <p style={{ fontSize: 9.5, color: '#666', lineHeight: 1.62, margin: '0 0 12px', fontFamily: 'sans-serif' }}>{bodyText}</p>

          {/* Interaction options */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
            {interactions.map((it, i) => (
              <div key={i} style={{ flex: 1, background: `${brandColor}10`, border: `1px solid ${brandColor}22`, padding: '6px 4px', textAlign: 'center', borderRadius: 4 }}>
                <div style={{ fontSize: 14, marginBottom: 2 }}>{it.icon}</div>
                <div style={{ fontSize: 7.5, color: brandColor, fontFamily: 'sans-serif', fontWeight: 700 }}>{it.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* QR Code area + CTA */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, borderTop: '1px solid #eee', paddingTop: 10 }}>
          {/* QR placeholder */}
          <div className="rint-qr-pulse" style={{ width: 56, height: 56, background: '#f5f5f5', border: `2px solid ${brandColor}`, padding: 4, flexShrink: 0 }}>
            <div style={{ width: '100%', height: '100%', display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 1 }}>
              {Array.from({ length: 25 }, (_, i) => (
                <div key={i} style={{ background: [0,2,4,5,10,12,14,15,20,22,24,7,17].includes(i) ? brandColor : 'transparent', borderRadius: 1 }} />
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, color: '#333', fontFamily: 'sans-serif', marginBottom: 4 }}>Aponte a câmera para o QR Code</div>
            <div style={{ fontSize: 8.5, color: '#888', fontFamily: 'sans-serif', marginBottom: 6 }}>www.{brand.toLowerCase().replace(/\s/g, '')}.com.br</div>
            <div style={{ fontSize: 8, color: '#bbb', fontFamily: 'sans-serif' }}>(11) 9 9999-0000</div>
          </div>
        </div>
      </div>
    </div>
  );
};
