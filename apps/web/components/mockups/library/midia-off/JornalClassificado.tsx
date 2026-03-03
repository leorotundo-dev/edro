'use client';

import React from 'react';

interface JornalClassificadoProps {
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

export const JornalClassificado: React.FC<JornalClassificadoProps> = ({
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
  brandColor = '#1a1a1a',
}) => {
  const brand = brandName ?? name ?? 'CLASSIFICADOS';
  const mainHeadline = headline ?? title ?? 'Encontre o que procura';
  const bodyText = body ?? caption ?? description ?? text ?? 'Anuncie aqui e alcance milhares de leitores todos os dias.';

  const categories = [
    { label: 'Empregos', color: '#2563eb', ads: [
      { title: 'Assistente Administrativo', detail: 'Exp. mínima 1 ano. CLT. São Paulo-SP', price: 'R$ 2.800' },
      { title: 'Motorista Categoria D', detail: 'Habilitação exigida. Frete incluído.', price: 'R$ 3.500' },
    ]},
    { label: 'Imóveis', color: '#16a34a', ads: [
      { title: 'Apto 2 dorms. Consolação', detail: '65m² — mobiliado — próx. metrô', price: 'R$ 2.200/mês' },
      { title: 'Casa 3 dorms. Moema', detail: '180m² — 2 vagas — churrasqueira', price: 'R$ 890.000' },
    ]},
    { label: 'Veículos', color: '#dc2626', ads: [
      { title: 'HB20 2022 completo', detail: '28.000km — 1 dono — IPVA pago', price: 'R$ 68.000' },
      { title: 'Moto CB 500 2021', detail: '15.000km — revisada — doc ok', price: 'R$ 28.500' },
    ]},
  ];

  return (
    <div style={{ width: 340, background: '#faf9f5', fontFamily: '"Georgia", "Times New Roman", serif', border: '2px solid #222', boxShadow: '0 4px 16px rgba(0,0,0,0.15)', overflow: 'hidden' }}>
      <style>{`
        @keyframes jcl-fadein { from { opacity: 0; } to { opacity: 1; } }
        .jcl-fadein { animation: jcl-fadein 0.4s ease both; }
      `}</style>

      {/* Header */}
      <div style={{ background: '#111', padding: '8px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} className="jcl-fadein">
        <div>
          <div style={{ fontSize: 8, color: '#888', fontFamily: 'sans-serif', letterSpacing: 2, textTransform: 'uppercase' }}>Seção de</div>
          <div style={{ fontSize: 18, fontWeight: 900, color: '#fff', letterSpacing: -0.3 }}>{brand}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 8, color: '#aaa', fontFamily: 'sans-serif' }}>Hoje</div>
          <div style={{ fontSize: 9, color: '#888', fontFamily: 'sans-serif' }}>{new Date().toLocaleDateString('pt-BR')}</div>
        </div>
      </div>

      {/* Category sections */}
      <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {categories.map((cat, ci) => (
          <div key={ci}>
            {/* Category label */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <div style={{ width: 10, height: 10, background: cat.color, flexShrink: 0 }} />
              <span style={{ fontSize: 9, fontFamily: 'sans-serif', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.2, color: cat.color }}>{cat.label}</span>
              <div style={{ flex: 1, height: 1, background: '#d0cfc0' }} />
            </div>
            {/* Ad boxes grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {cat.ads.map((ad, ai) => (
                <div key={ai} style={{ border: '1px solid #c8c2b0', padding: '6px 8px', background: '#fff', position: 'relative' }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: '#111', lineHeight: 1.3, marginBottom: 3 }}>{ad.title}</div>
                  <div style={{ fontSize: 8, color: '#555', fontFamily: 'sans-serif', lineHeight: 1.4, marginBottom: 4 }}>{ad.detail}</div>
                  <div style={{ fontSize: 9, fontWeight: 700, color: cat.color, fontFamily: 'sans-serif' }}>{ad.price}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* CTA footer */}
      <div style={{ background: brandColor, padding: '8px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.7)', fontFamily: 'sans-serif', marginBottom: 1 }}>Anuncie seu classificado</div>
          <div style={{ fontSize: 11, color: '#fff', fontWeight: 700, fontFamily: 'sans-serif' }}>(11) 9 9999-0000</div>
        </div>
        <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.8)', fontFamily: 'sans-serif', textAlign: 'right' }}>
          <div>A partir de R$ 18,90</div>
          <div style={{ marginTop: 1 }}>por edição</div>
        </div>
      </div>
    </div>
  );
};
