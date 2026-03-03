'use client';

import React from 'react';

interface PitchRoadmapProps {
  name?: string;
  brandName?: string;
  headline?: string;
  title?: string;
  body?: string;
  caption?: string;
  description?: string;
  text?: string;
  brandColor?: string;
  themeColor?: string;
}

export const PitchRoadmap: React.FC<PitchRoadmapProps> = ({
  name,
  brandName,
  headline,
  title,
  body,
  caption,
  description,
  text,
  brandColor,
  themeColor,
}) => {
  const accent = themeColor ?? brandColor ?? '#0EA5E9';
  const slideTitle = headline ?? title ?? 'Roadmap de Produto';
  const companyName = brandName ?? name ?? 'Startup';
  const subText = body ?? caption ?? description ?? text ?? 'Prioridades claras para os próximos 12 meses';

  const columns = [
    {
      label: 'Agora',
      sublabel: 'Q1–Q2 2026',
      color: accent,
      bgColor: `${accent}10`,
      borderColor: accent,
      items: [
        { feat: 'Módulo de Relatórios v2', cat: 'Core' },
        { feat: 'Integração Zapier + Make', cat: 'Integrações' },
        { feat: 'Mobile App (iOS/Android)', cat: 'Plataforma' },
        { feat: 'SSO Enterprise', cat: 'Segurança' },
      ],
    },
    {
      label: 'Próximo',
      sublabel: 'Q3–Q4 2026',
      color: '#8b5cf6',
      bgColor: '#8b5cf610',
      borderColor: '#8b5cf6',
      items: [
        { feat: 'IA Preditiva de Churn', cat: 'IA / ML' },
        { feat: 'Marketplace de Templates', cat: 'Ecossistema' },
        { feat: 'API Pública v2.0', cat: 'Developers' },
        { feat: 'Multi-idioma (EN/ES)', cat: 'Expansão' },
      ],
    },
    {
      label: 'Futuro',
      sublabel: '2027+',
      color: '#64748b',
      bgColor: '#64748b0a',
      borderColor: '#cbd5e1',
      items: [
        { feat: 'White-label Platform', cat: 'Parceiros' },
        { feat: 'Modelos de Indústria', cat: 'Vertical' },
        { feat: 'Analytics Avançado', cat: 'BI' },
        { feat: 'Compliance LGPD/SOC2', cat: 'Segurança' },
      ],
    },
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
        @keyframes pitch-road-in {
          from { opacity: 0; transform: translateY(6px); }
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

        {/* Three columns */}
        <div style={{ display: 'flex', gap: '10px', flex: 1, animation: 'pitch-road-in 0.5s ease-out' }}>
          {columns.map((col, ci) => (
            <div key={ci} style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              background: col.bgColor,
              border: `1.5px solid ${col.borderColor}`,
              borderRadius: '10px', overflow: 'hidden',
            }}>
              {/* Column header */}
              <div style={{
                padding: '8px 12px',
                background: ci === 0 ? accent : ci === 1 ? '#8b5cf6' : '#f1f5f9',
                borderBottom: `1px solid ${col.borderColor}`,
              }}>
                <div style={{ fontSize: '12px', fontWeight: 800, color: ci < 2 ? '#fff' : '#334155' }}>{col.label}</div>
                <div style={{ fontSize: '9px', color: ci < 2 ? 'rgba(255,255,255,0.75)' : '#64748b', marginTop: '1px' }}>{col.sublabel}</div>
              </div>

              {/* Feature pills */}
              <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '5px', flex: 1 }}>
                {col.items.map((item, ii) => (
                  <div key={ii} style={{
                    background: '#ffffff',
                    border: `1px solid ${ci === 2 ? '#e2e8f0' : col.borderColor}33`,
                    borderRadius: '6px', padding: '5px 8px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}>
                    <span style={{ fontSize: '10px', fontWeight: 600, color: '#1e293b' }}>{item.feat}</span>
                    <span style={{
                      fontSize: '8px', fontWeight: 700,
                      background: `${col.color}18`, color: col.color,
                      borderRadius: '20px', padding: '1px 6px', whiteSpace: 'nowrap', marginLeft: '4px',
                    }}>
                      {item.cat}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '10px', color: '#94a3b8' }}>
          <span>Sujeito a revisão conforme feedback dos clientes</span>
          <span>13 / 15</span>
        </div>
      </div>
    </div>
  );
};
