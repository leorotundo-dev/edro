'use client';

import React from 'react';

interface ApostilaExerciciosProps {
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

export const ApostilaExercicios: React.FC<ApostilaExerciciosProps> = ({
  title,
  headline,
  name,
  username,
  brandName,
  body,
  caption,
  description,
  text,
  brandColor = '#2563eb',
}) => {
  const courseName = brandName ?? name ?? username ?? 'Matemática';
  const pageTitle = title ?? headline ?? 'Exercícios de Fixação';
  const instructions = body ?? caption ?? description ?? text ?? 'Resolva as questões abaixo com atenção aos enunciados.';

  const questions = [
    'Calcule o valor de x na equação: 2x + 5 = 13',
    'Simplifique a expressão: (3a² + 2a) − (a² − 5a)',
    'Determine o conjunto solução de: x² − 4x + 3 = 0',
    'Um trem percorre 240 km em 3 horas. Qual a velocidade média?',
    'Fatore completamente: 6x² − 7x − 3',
  ];

  return (
    <div style={{ width: '300px', height: '424px', backgroundColor: '#fff', boxShadow: '0 4px 20px rgba(0,0,0,0.12)', borderRadius: '4px', overflow: 'hidden', fontFamily: "'Segoe UI', system-ui, sans-serif", display: 'flex', flexDirection: 'column' }}>

      {/* Header strip */}
      <div style={{ backgroundColor: brandColor, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '8px', color: 'rgba(255,255,255,0.75)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '2px' }}>{courseName}</div>
          <div style={{ fontSize: '13px', color: '#fff', fontWeight: 800, letterSpacing: '-0.01em' }}>{pageTitle}</div>
        </div>
        <div style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: '4px', padding: '4px 8px', textAlign: 'center' }}>
          <div style={{ fontSize: '16px', fontWeight: 900, color: '#fff', lineHeight: 1 }}>07</div>
          <div style={{ fontSize: '7px', color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>pág</div>
        </div>
      </div>

      {/* Instructions box */}
      <div style={{ backgroundColor: `${brandColor}12`, borderLeft: `3px solid ${brandColor}`, margin: '10px 14px 6px', padding: '6px 8px', borderRadius: '0 4px 4px 0' }}>
        <p style={{ fontSize: '9px', color: '#475569', margin: 0, lineHeight: '1.5' }}>
          <span style={{ fontWeight: 700, color: brandColor }}>Instruções: </span>{instructions}
        </p>
      </div>

      {/* Questions */}
      <div style={{ flex: 1, padding: '2px 14px', overflowY: 'hidden', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {questions.map((q, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <div style={{ display: 'flex', gap: '7px', alignItems: 'flex-start' }}>
              <div style={{ width: '18px', height: '18px', borderRadius: '50%', backgroundColor: brandColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>
                <span style={{ fontSize: '9px', fontWeight: 800, color: '#fff' }}>{i + 1}</span>
              </div>
              <p style={{ margin: 0, fontSize: '9.5px', color: '#1e293b', lineHeight: '1.5', fontWeight: 500 }}>{q}</p>
            </div>
            {/* Answer lines */}
            <div style={{ marginLeft: '25px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {[1, 2].map(l => (
                <div key={l} style={{ height: '1px', backgroundColor: '#cbd5e1', width: '100%' }} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Answer box area */}
      <div style={{ margin: '6px 14px 10px', border: '1px dashed #cbd5e1', borderRadius: '4px', padding: '6px 8px' }}>
        <div style={{ fontSize: '8px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>Espaço para Cálculo</div>
        <div style={{ height: '28px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          {[1, 2, 3].map(l => (
            <div key={l} style={{ height: '1px', backgroundColor: '#e2e8f0' }} />
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{ borderTop: '1px solid #e2e8f0', padding: '5px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
        <span style={{ fontSize: '8px', color: '#94a3b8' }}>© {courseName} — Uso exclusivo do aluno</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
          <div style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: brandColor }} />
          <span style={{ fontSize: '8px', color: '#94a3b8' }}>pág. 07</span>
        </div>
      </div>
    </div>
  );
};
