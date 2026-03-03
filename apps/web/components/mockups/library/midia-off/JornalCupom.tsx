'use client';

import React from 'react';

interface JornalCupomProps {
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

export const JornalCupom: React.FC<JornalCupomProps> = ({
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
  brandColor = '#c0392b',
}) => {
  const brand = brandName ?? name ?? 'Marca';
  const mainHeadline = headline ?? title ?? 'OFERTA ESPECIAL';
  const bodyText = body ?? caption ?? description ?? text ?? 'Válido somente em compras acima de R$ 100,00. Não cumulativo com outras promoções.';

  return (
    <div style={{ width: 340, background: '#faf9f5', fontFamily: '"Georgia", "Times New Roman", serif', overflow: 'hidden' }}>
      <style>{`
        @keyframes jcup-shake { 0%,100%{transform:rotate(0deg)} 25%{transform:rotate(-1deg)} 75%{transform:rotate(1deg)} }
        .jcup-in { animation: jcup-shake 0.6s ease both; }
      `}</style>

      {/* Dashed cut border container */}
      <div style={{ border: '2px dashed #999', margin: 4, position: 'relative' }} className="jcup-in">

        {/* Scissors icon on top-left */}
        <div style={{ position: 'absolute', top: -11, left: 12, background: '#faf9f5', padding: '0 4px' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="1.8">
            <circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/>
            <line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/>
            <line x1="8.12" y1="8.12" x2="12" y2="12"/>
          </svg>
        </div>
        <div style={{ position: 'absolute', top: -8, left: 30, right: 30, height: 1, borderTop: '1px dashed #bbb' }} />
        <div style={{ position: 'absolute', top: -8, fontSize: 7, color: '#aaa', fontFamily: 'sans-serif', right: 14, background: '#faf9f5', padding: '0 4px' }}>Recorte e traga</div>

        {/* Coupon body */}
        <div style={{ display: 'flex', alignItems: 'stretch' }}>

          {/* Left: discount value */}
          <div style={{ width: 110, background: brandColor, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '18px 10px', flexShrink: 0 }}>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.8)', fontFamily: 'sans-serif', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Desconto de</div>
            <div style={{ fontSize: 42, fontWeight: 900, color: '#fff', lineHeight: 1, letterSpacing: -2 }}>30<span style={{ fontSize: 22 }}>%</span></div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.8)', fontFamily: 'sans-serif', marginTop: 4, textAlign: 'center' }}>na sua próxima compra</div>
          </div>

          {/* Dashed vertical separator */}
          <div style={{ width: 1, background: 'repeating-linear-gradient(to bottom, #bbb 0, #bbb 6px, transparent 6px, transparent 12px)' }} />

          {/* Right: copy */}
          <div style={{ flex: 1, padding: '14px 14px' }}>
            <div style={{ fontSize: 9, fontFamily: 'sans-serif', color: brandColor, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, marginBottom: 4 }}>{brand}</div>
            <h2 style={{ fontSize: 14, fontWeight: 900, color: '#111', lineHeight: 1.2, margin: '0 0 6px', letterSpacing: -0.2 }}>{mainHeadline}</h2>
            <p style={{ fontSize: 9, color: '#555', lineHeight: 1.5, margin: '0 0 8px', fontFamily: 'sans-serif' }}>{bodyText}</p>

            {/* Expiry */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 8, color: '#888', fontFamily: 'sans-serif' }}>
                <span style={{ fontWeight: 600, color: '#555' }}>Válido até:</span> 31/12/{new Date().getFullYear()}
              </div>
              <div style={{ fontSize: 8, fontFamily: 'sans-serif', color: '#888' }}>Cód: A3B-9X2</div>
            </div>
          </div>
        </div>

        {/* Barcode mockup */}
        <div style={{ borderTop: '1px dashed #ccc', padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 10, background: '#f5f4f0' }}>
          {/* CSS barcode stripes */}
          <div style={{ display: 'flex', gap: 1, alignItems: 'center', height: 28 }}>
            {[3,1,2,1,3,1,1,2,1,2,1,3,1,1,2,1,2,3,1,1,2,1,3,1,2].map((w, i) => (
              <div key={i} style={{ width: w, height: i % 3 === 0 ? 28 : 20, background: '#111', flexShrink: 0 }} />
            ))}
          </div>
          <div style={{ fontSize: 8, color: '#888', fontFamily: 'sans-serif', letterSpacing: 1 }}>7896543210123</div>
        </div>

        {/* Bottom cut line */}
        <div style={{ position: 'absolute', bottom: -8, left: 30, right: 30, height: 1, borderTop: '1px dashed #bbb' }} />
      </div>

      {/* Bottom margin */}
      <div style={{ height: 8 }} />
    </div>
  );
};
