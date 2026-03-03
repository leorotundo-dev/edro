'use client';

import React from 'react';

interface AtividadeProps {
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

export const Atividade: React.FC<AtividadeProps> = ({
  title,
  headline,
  name,
  username,
  brandName,
  body,
  caption,
  description,
  text,
  brandColor = '#7c3aed',
}) => {
  const courseName = brandName ?? name ?? username ?? 'Português';
  const activityTitle = title ?? headline ?? 'Atividade: Interpretação de Texto';
  const instructions = body ?? caption ?? description ?? text ?? 'Leia o texto com atenção e responda as questões a seguir com suas próprias palavras.';

  return (
    <div style={{ width: '300px', height: '424px', backgroundColor: '#fff', boxShadow: '0 4px 20px rgba(0,0,0,0.12)', borderRadius: '4px', overflow: 'hidden', fontFamily: "'Segoe UI', system-ui, sans-serif", display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ backgroundColor: brandColor, padding: '10px 14px 8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '8px', color: 'rgba(255,255,255,0.75)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '3px' }}>{courseName} · Atividade</div>
            <div style={{ fontSize: '13px', color: '#fff', fontWeight: 800, lineHeight: '1.2' }}>{activityTitle}</div>
          </div>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </div>
      </div>

      {/* Student info fields */}
      <div style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', padding: '7px 14px', display: 'flex', gap: '10px' }}>
        {['Nome do Aluno', 'Turma', 'Data'].map((label, i) => (
          <div key={i} style={{ flex: i === 0 ? 2 : 1 }}>
            <div style={{ fontSize: '7px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>{label}</div>
            <div style={{ borderBottom: '1.5px solid #cbd5e1', height: '14px' }} />
          </div>
        ))}
      </div>

      {/* Instructions */}
      <div style={{ margin: '8px 14px 4px', backgroundColor: `${brandColor}10`, borderLeft: `3px solid ${brandColor}`, borderRadius: '0 4px 4px 0', padding: '5px 8px' }}>
        <p style={{ margin: 0, fontSize: '8.5px', color: '#475569', lineHeight: '1.5' }}>
          <strong style={{ color: brandColor }}>Instruções: </strong>{instructions}
        </p>
      </div>

      {/* Activity area — matching exercise */}
      <div style={{ flex: 1, padding: '6px 14px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
        <div style={{ fontSize: '8px', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>Relacione as colunas:</div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '4px 6px', alignItems: 'center' }}>
          {[
            ['1. Sujeito', '( )', 'Termo que indica o lugar'],
            ['2. Predicado', '( )', 'Núcleo do sujeito'],
            ['3. Adjunto adverbial', '( )', 'O que se diz do sujeito'],
            ['4. Substantivo', '( )', 'Modifica o verbo'],
          ].map(([left, mid, right], i) => (
            <React.Fragment key={i}>
              <div style={{ fontSize: '8.5px', color: '#1e293b', fontWeight: 500, backgroundColor: `${brandColor}0d`, borderRadius: '3px', padding: '3px 6px' }}>{left}</div>
              <div style={{ fontSize: '10px', color: '#94a3b8', textAlign: 'center', fontWeight: 700 }}>{mid}</div>
              <div style={{ fontSize: '8.5px', color: '#475569', backgroundColor: '#f1f5f9', borderRadius: '3px', padding: '3px 6px' }}>{right}</div>
            </React.Fragment>
          ))}
        </div>

        {/* Open question */}
        <div style={{ marginTop: '6px' }}>
          <div style={{ fontSize: '8.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Questão dissertativa:</div>
          <p style={{ margin: '0 0 5px', fontSize: '8.5px', color: '#475569', lineHeight: '1.4' }}>Em suas palavras, explique a diferença entre texto narrativo e dissertativo.</p>
          {[1, 2, 3].map(l => (
            <div key={l} style={{ height: '1px', backgroundColor: '#e2e8f0', marginBottom: '8px' }} />
          ))}
        </div>
      </div>

      {/* Teacher signature */}
      <div style={{ borderTop: '1px solid #e2e8f0', padding: '5px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
        <div>
          <div style={{ fontSize: '7px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Visto do Professor</div>
          <div style={{ borderBottom: '1px solid #cbd5e1', width: '60px', marginTop: '4px' }} />
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '7px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Nota</div>
          <div style={{ width: '32px', height: '20px', border: `1.5px solid ${brandColor}`, borderRadius: '3px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '2px' }}>
            <span style={{ fontSize: '9px', color: '#cbd5e1' }}>___</span>
          </div>
        </div>
      </div>
    </div>
  );
};
