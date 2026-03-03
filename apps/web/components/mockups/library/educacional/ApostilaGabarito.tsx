'use client';

import React from 'react';

interface ApostilaGabaritoProps {
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

export const ApostilaGabarito: React.FC<ApostilaGabaritoProps> = ({
  title,
  headline,
  name,
  username,
  brandName,
  brandColor = '#2563eb',
}) => {
  const courseName = brandName ?? name ?? username ?? 'Matemática';
  const pageTitle = title ?? headline ?? 'Gabarito Oficial';

  const answers: Array<{ q: number; correct: 'A' | 'B' | 'C' | 'D' }> = [
    { q: 1, correct: 'C' }, { q: 2, correct: 'A' }, { q: 3, correct: 'D' },
    { q: 4, correct: 'B' }, { q: 5, correct: 'A' }, { q: 6, correct: 'C' },
    { q: 7, correct: 'D' }, { q: 8, correct: 'B' }, { q: 9, correct: 'A' },
    { q: 10, correct: 'C' }, { q: 11, correct: 'B' }, { q: 12, correct: 'D' },
    { q: 13, correct: 'A' }, { q: 14, correct: 'C' }, { q: 15, correct: 'B' },
    { q: 16, correct: 'D' }, { q: 17, correct: 'A' }, { q: 18, correct: 'C' },
    { q: 19, correct: 'B' }, { q: 20, correct: 'D' },
  ];

  const options = ['A', 'B', 'C', 'D'] as const;

  return (
    <div style={{ width: '300px', height: '424px', backgroundColor: '#fff', boxShadow: '0 4px 20px rgba(0,0,0,0.12)', borderRadius: '4px', overflow: 'hidden', fontFamily: "'Segoe UI', system-ui, sans-serif", display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ backgroundColor: brandColor, padding: '10px 14px 8px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: '-15px', top: '-15px', width: '70px', height: '70px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.1)' }} />
        <div style={{ fontSize: '8px', color: 'rgba(255,255,255,0.75)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '2px' }}>{courseName}</div>
        <div style={{ fontSize: '14px', color: '#fff', fontWeight: 800 }}>{pageTitle}</div>
        <div style={{ display: 'flex', gap: '8px', marginTop: '6px', alignItems: 'center' }}>
          <div style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: '3px', padding: '2px 7px', fontSize: '8px', color: '#fff', fontWeight: 600 }}>Avaliação Bimestral</div>
          <div style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: '3px', padding: '2px 7px', fontSize: '8px', color: '#fff', fontWeight: 600 }}>20 questões</div>
        </div>
      </div>

      {/* Legend */}
      <div style={{ padding: '7px 14px 4px', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid #f1f5f9' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: brandColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '8px', fontWeight: 800, color: '#fff' }}>A</span>
          </div>
          <span style={{ fontSize: '8px', color: '#64748b' }}>= correta</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: '1.5px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '8px', fontWeight: 600, color: '#94a3b8' }}>A</span>
          </div>
          <span style={{ fontSize: '8px', color: '#64748b' }}>= incorreta</span>
        </div>
      </div>

      {/* Answer grid */}
      <div style={{ flex: 1, padding: '8px 14px', display: 'flex', flexDirection: 'column', gap: '5px', overflowY: 'hidden' }}>
        {answers.map(({ q, correct }) => (
          <div key={q} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {/* Question number */}
            <div style={{ width: '22px', textAlign: 'right' }}>
              <span style={{ fontSize: '9px', fontWeight: 700, color: '#334155' }}>{q < 10 ? `0${q}` : q}.</span>
            </div>
            {/* Option circles */}
            {options.map(opt => {
              const isCorrect = opt === correct;
              return (
                <div key={opt} style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: isCorrect ? brandColor : 'transparent', border: isCorrect ? 'none' : '1.5px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: '9px', fontWeight: isCorrect ? 800 : 500, color: isCorrect ? '#fff' : '#cbd5e1' }}>{opt}</span>
                </div>
              );
            })}
            {/* Score indicator */}
            <div style={{ marginLeft: 'auto', width: '28px', borderBottom: '1px solid #e2e8f0', height: '14px', textAlign: 'center' }}>
              <span style={{ fontSize: '8px', color: '#94a3b8' }}>__</span>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{ borderTop: '1px solid #e2e8f0', padding: '5px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
        <span style={{ fontSize: '8px', color: '#94a3b8', fontStyle: 'italic' }}>Não divulgar antes da avaliação</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: brandColor }} />
          <span style={{ fontSize: '8px', color: '#94a3b8' }}>Gabarito</span>
        </div>
      </div>
    </div>
  );
};
