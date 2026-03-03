'use client';

import React from 'react';

interface InfograficoHierarquiaProps {
  headline?: string;
  title?: string;
  name?: string;
  body?: string;
  text?: string;
  description?: string;
  caption?: string;
  brandName?: string;
  brandColor?: string;
}

export const InfograficoHierarquia: React.FC<InfograficoHierarquiaProps> = ({
  headline,
  title,
  name,
  body,
  text,
  description,
  caption,
  brandName,
  brandColor = '#f59e0b',
}) => {
  const resolvedTitle = headline || title || name || 'Estrutura Organizacional';
  const resolvedSubtitle =
    body || text || description || caption || 'Hierarquia e áreas de responsabilidade da equipe.';
  const resolvedBrand = brandName || 'Organograma 2026';
  const accent = brandColor || '#f59e0b';

  const levels = [
    {
      label: 'Nível Estratégico',
      nodes: [{ title: 'CEO & Fundador', name: 'Carlos Mendes', dept: 'Direção Geral' }],
    },
    {
      label: 'Nível Tático',
      nodes: [
        { title: 'CTO', name: 'Ana Lima', dept: 'Tecnologia' },
        { title: 'CMO', name: 'Pedro Rocha', dept: 'Marketing' },
        { title: 'CFO', name: 'Julia Souza', dept: 'Finanças' },
      ],
    },
    {
      label: 'Nível Operacional',
      nodes: [
        { title: 'Dev Sênior', name: 'Lucas Ferreira', dept: 'Engenharia' },
        { title: 'Designer UX', name: 'Mariana Costa', dept: 'Design' },
        { title: 'Analista', name: 'Rafael Nunes', dept: 'Dados' },
        { title: 'SDR', name: 'Camila Alves', dept: 'Vendas' },
      ],
    },
  ];

  const levelColors = [accent, `${accent}bb`, `${accent}77`];
  const levelBgs = [`${accent}15`, `${accent}0c`, `${accent}07`];

  return (
    <div
      style={{
        width: '420px',
        background: '#ffffff',
        borderRadius: '14px',
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0,0,0,0.10)',
        fontFamily: "'Helvetica Neue', Arial, sans-serif",
        border: '1px solid #e5e7eb',
      }}
    >
      <style>{`
        @keyframes ihq-fade { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .ihq-card { animation: ihq-fade 0.4s ease; }
        .ihq-node:hover { transform: translateY(-2px); box-shadow: 0 4px 14px rgba(0,0,0,0.10); }
        .ihq-node { transition: transform 0.2s, box-shadow 0.2s; }
      `}</style>

      <div className="ihq-card">
        {/* Header */}
        <div
          style={{
            background: `linear-gradient(135deg, ${accent} 0%, ${accent}cc 100%)`,
            padding: '18px 22px 14px',
          }}
        >
          <div style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>
            Infográfico · Hierarquia
          </div>
          <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#fff', margin: '0 0 4px', letterSpacing: '-0.01em' }}>
            {resolvedTitle}
          </h2>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.78)', margin: 0 }}>{resolvedSubtitle}</p>
        </div>

        {/* Org chart */}
        <div style={{ padding: '20px 16px 10px' }}>
          {levels.map((level, li) => (
            <div key={li} style={{ marginBottom: li < levels.length - 1 ? '6px' : '0' }}>
              {/* Level label */}
              <div
                style={{
                  fontSize: '9px',
                  fontWeight: 700,
                  color: levelColors[li],
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  textAlign: 'center',
                  marginBottom: '8px',
                }}
              >
                {level.label}
              </div>

              {/* Connector line from above */}
              {li > 0 && (
                <div
                  style={{
                    width: '2px',
                    height: '14px',
                    background: `${accent}40`,
                    margin: '0 auto 6px',
                  }}
                />
              )}

              {/* Horizontal line for multi-node levels */}
              {level.nodes.length > 1 && (
                <div
                  style={{
                    height: '2px',
                    background: `${accent}30`,
                    margin: '0 20px 6px',
                    position: 'relative',
                  }}
                >
                  {level.nodes.map((_, ni) => (
                    <div
                      key={ni}
                      style={{
                        position: 'absolute',
                        left: `${(ni / (level.nodes.length - 1)) * 100}%`,
                        top: '0',
                        width: '2px',
                        height: '8px',
                        background: `${accent}50`,
                        transform: 'translateX(-50%)',
                      }}
                    />
                  ))}
                </div>
              )}

              {/* Nodes row */}
              <div
                style={{
                  display: 'flex',
                  gap: '8px',
                  justifyContent: 'center',
                  flexWrap: 'wrap',
                }}
              >
                {level.nodes.map((node, ni) => (
                  <div
                    key={ni}
                    className="ihq-node"
                    style={{
                      background: levelBgs[li],
                      border: `1.5px solid ${levelColors[li]}40`,
                      borderRadius: '10px',
                      padding: '10px 12px',
                      textAlign: 'center',
                      minWidth: li === 0 ? '140px' : li === 1 ? '100px' : '80px',
                      flex: li === 0 ? '0 0 auto' : '1',
                    }}
                  >
                    <div
                      style={{
                        width: '30px',
                        height: '30px',
                        borderRadius: '50%',
                        background: levelColors[li],
                        color: '#fff',
                        fontSize: '12px',
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 6px',
                      }}
                    >
                      {node.name.charAt(0)}
                    </div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#111827', lineHeight: 1.2 }}>{node.title}</div>
                    <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '2px' }}>{node.name}</div>
                    <div
                      style={{
                        fontSize: '9px',
                        fontWeight: 600,
                        color: levelColors[li],
                        marginTop: '4px',
                        background: `${levelColors[li]}18`,
                        borderRadius: '8px',
                        padding: '2px 6px',
                        display: 'inline-block',
                      }}
                    >
                      {node.dept}
                    </div>
                  </div>
                ))}
              </div>

              {/* Connector line to below */}
              {li < levels.length - 1 && (
                <div
                  style={{
                    width: '2px',
                    height: '14px',
                    background: `${accent}40`,
                    margin: '6px auto 0',
                  }}
                />
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ padding: '10px 22px 14px', borderTop: '1px solid #f3f4f6' }}>
          <span style={{ fontSize: '10px', color: '#9ca3af' }}>{resolvedBrand}</span>
        </div>
      </div>
    </div>
  );
};
