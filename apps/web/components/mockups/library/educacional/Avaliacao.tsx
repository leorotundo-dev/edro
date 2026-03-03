'use client';

import React from 'react';

interface AvaliacaoProps {
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

export const Avaliacao: React.FC<AvaliacaoProps> = ({
  title,
  headline,
  name,
  username,
  brandName,
  brandColor = '#0f766e',
}) => {
  const courseName = brandName ?? name ?? username ?? 'Ciências';
  const examTitle = title ?? headline ?? 'Avaliação Bimestral — 2º Bimestre';

  const questions = [
    { num: 1, text: 'Qual organela é responsável pela produção de energia nas células eucarióticas?', options: ['Núcleo', 'Mitocôndria', 'Ribossomo', 'Vacúolo'] },
    { num: 2, text: 'O processo de divisão celular que mantém o número cromossômico é denominado:', options: ['Meiose', 'Mitose', 'Fecundação', 'Gametogênese'] },
    { num: 3, text: 'A membrana plasmática é composta principalmente por:', options: ['Carboidratos', 'Fosfolipídios', 'Proteínas globulares', 'Ácidos nucleicos'] },
  ];

  return (
    <div style={{ width: '300px', height: '424px', backgroundColor: '#fff', boxShadow: '0 4px 20px rgba(0,0,0,0.12)', borderRadius: '4px', overflow: 'hidden', fontFamily: "'Segoe UI', system-ui, sans-serif", display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ backgroundColor: brandColor, padding: '10px 14px 8px' }}>
        <div style={{ fontSize: '8px', color: 'rgba(255,255,255,0.75)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '2px' }}>{courseName}</div>
        <div style={{ fontSize: '12px', color: '#fff', fontWeight: 800 }}>{examTitle}</div>
      </div>

      {/* Candidate fields */}
      <div style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', padding: '6px 14px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '6px' }}>
          {[['Nome completo', ''], ['Nº', ''], ['Nota', '']].map(([label], i) => (
            <div key={i}>
              <div style={{ fontSize: '7px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>{label}</div>
              <div style={{ borderBottom: '1.5px solid #cbd5e1', height: '14px' }} />
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginTop: '5px' }}>
          {['Turma', 'Data'].map((label) => (
            <div key={label}>
              <div style={{ fontSize: '7px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>{label}</div>
              <div style={{ borderBottom: '1.5px solid #cbd5e1', height: '14px' }} />
            </div>
          ))}
        </div>
      </div>

      {/* Questions */}
      <div style={{ flex: 1, padding: '8px 14px', display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'hidden' }}>
        {questions.map(({ num, text, options }) => (
          <div key={num}>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-start', marginBottom: '5px' }}>
              <div style={{ width: '16px', height: '16px', borderRadius: '3px', backgroundColor: brandColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: '9px', fontWeight: 800, color: '#fff' }}>{num}</span>
              </div>
              <p style={{ margin: 0, fontSize: '8.5px', color: '#1e293b', lineHeight: '1.45', fontWeight: 500 }}>{text}</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px', paddingLeft: '22px' }}>
              {options.map((opt, j) => (
                <div key={j} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <div style={{ width: '13px', height: '13px', borderRadius: '50%', border: '1.5px solid #cbd5e1', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: '8px', fontWeight: 700, color: '#94a3b8' }}>{String.fromCharCode(65 + j)}</span>
                  </div>
                  <span style={{ fontSize: '8px', color: '#475569' }}>{opt}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{ borderTop: '1px solid #e2e8f0', padding: '5px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
        <span style={{ fontSize: '8px', color: '#94a3b8' }}>Valor total: 10,0 pontos</span>
        <div style={{ display: 'flex', gap: '3px' }}>
          {[1, 2, 3].map(d => (
            <div key={d} style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: d === 1 ? brandColor : '#e2e8f0' }} />
          ))}
        </div>
      </div>
    </div>
  );
};
