'use client';

import React from 'react';

interface MapaMentalProps {
  title?: string;
  headline?: string;
  name?: string;
  username?: string;
  brandName?: string;
  body?: string;
  caption?: string;
  description?: string;
  text?: string;
  brandColor?: string;
}

export const MapaMental: React.FC<MapaMentalProps> = ({
  title,
  headline,
  name,
  username,
  brandName,
  body,
  caption,
  description,
  text,
  brandColor = '#5D87FF',
}) => {
  const resolvedTitle = title ?? headline ?? 'Aprendizado';
  const resolvedSubtitle = description ?? caption ?? body ?? text ?? 'Mapa Mental — principais conceitos';
  const resolvedPublisher = brandName ?? name ?? username ?? 'EduMap';
  const accent = brandColor;

  const branches = [
    {
      color: '#6366f1',
      label: 'Memória',
      subs: ['Curto prazo', 'Longo prazo', 'Procedural'],
      angle: -60,
    },
    {
      color: '#f59e0b',
      label: 'Técnicas',
      subs: ['Pomodoro', 'Spaced Rep.', 'Mind Map'],
      angle: -20,
    },
    {
      color: '#10b981',
      label: 'Ambiente',
      subs: ['Silêncio', 'Iluminação', 'Ergonomia'],
      angle: 20,
    },
    {
      color: '#ef4444',
      label: 'Revisão',
      subs: ['Ativa', 'Espaçada', 'Teste'],
      angle: 60,
    },
  ];

  // SVG dimensions
  const W = 520;
  const H = 380;
  const cx = W / 2;
  const cy = H / 2;
  const branchLen = 110;
  const subLen = 72;

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: `${W}px`,
        background: '#fafafa',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 4px 24px rgba(0,0,0,0.09)',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      {/* Header */}
      <div
        style={{
          background: accent,
          padding: '14px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <h1 style={{ margin: 0, fontSize: '16px', fontWeight: 900, color: '#ffffff' }}>
          Mapa Mental — {resolvedTitle}
        </h1>
        <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.7)', letterSpacing: '1px', textTransform: 'uppercase' }}>
          {resolvedPublisher}
        </span>
      </div>

      {/* SVG mind map */}
      <svg
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        style={{ display: 'block', background: '#fafafa' }}
        aria-label={`Mapa mental sobre ${resolvedTitle}`}
      >
        {/* Branch lines + subtopic lines */}
        {branches.map((branch, bi) => {
          const rad = (branch.angle * Math.PI) / 180;
          const bx = cx + Math.cos(rad) * branchLen;
          const by = cy + Math.sin(rad) * branchLen;

          return (
            <g key={bi}>
              {/* Main branch line */}
              <line
                x1={cx} y1={cy}
                x2={bx} y2={by}
                stroke={branch.color}
                strokeWidth="3"
                strokeLinecap="round"
              />

              {/* Subtopic lines */}
              {branch.subs.map((sub, si) => {
                const spread = -20 + si * 20;
                const subRad = ((branch.angle + spread) * Math.PI) / 180;
                const sx = bx + Math.cos(subRad) * subLen;
                const sy = by + Math.sin(subRad) * subLen;
                return (
                  <g key={si}>
                    <line
                      x1={bx} y1={by}
                      x2={sx} y2={sy}
                      stroke={branch.color}
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      opacity="0.6"
                    />
                    <rect
                      x={sx - 32} y={sy - 9}
                      width="64" height="18"
                      rx="9"
                      fill={`${branch.color}18`}
                      stroke={branch.color}
                      strokeWidth="1"
                      opacity="0.8"
                    />
                    <text
                      x={sx} y={sy + 4}
                      textAnchor="middle"
                      fontSize="9"
                      fill={branch.color}
                      fontWeight="600"
                      fontFamily="system-ui, sans-serif"
                    >
                      {sub}
                    </text>
                  </g>
                );
              })}

              {/* Branch bubble */}
              <ellipse
                cx={bx} cy={by}
                rx="38" ry="16"
                fill={branch.color}
              />
              <text
                x={bx} y={by + 5}
                textAnchor="middle"
                fontSize="11"
                fill="#ffffff"
                fontWeight="700"
                fontFamily="system-ui, sans-serif"
              >
                {branch.label}
              </text>
            </g>
          );
        })}

        {/* Center bubble */}
        <ellipse
          cx={cx} cy={cy}
          rx="54" ry="26"
          fill={accent}
          filter="url(#shadow)"
        />
        <defs>
          <filter id="shadow" x="-20%" y="-40%" width="140%" height="180%">
            <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor={accent} floodOpacity="0.35" />
          </filter>
        </defs>
        <text
          x={cx} y={cy - 4}
          textAnchor="middle"
          fontSize="13"
          fill="#ffffff"
          fontWeight="900"
          fontFamily="system-ui, sans-serif"
        >
          {resolvedTitle}
        </text>
        <text
          x={cx} y={cy + 11}
          textAnchor="middle"
          fontSize="8"
          fill="rgba(255,255,255,0.75)"
          fontFamily="system-ui, sans-serif"
        >
          Tópico central
        </text>
      </svg>

      {/* Subtitle / legend */}
      <div
        style={{
          padding: '10px 24px 14px',
          borderTop: '1px solid #e5e7eb',
          display: 'flex',
          gap: '16px',
          flexWrap: 'wrap',
        }}
      >
        {branches.map((b, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: b.color }} />
            <span style={{ fontSize: '11px', color: '#374151', fontWeight: 600 }}>{b.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
