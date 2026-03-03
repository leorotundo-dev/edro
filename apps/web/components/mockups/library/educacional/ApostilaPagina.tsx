'use client';

import React from 'react';

interface ApostilaPaginaProps {
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

export const ApostilaPagina: React.FC<ApostilaPaginaProps> = ({
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
  const courseName = brandName ?? name ?? username ?? 'Biologia';
  const sectionTitle = title ?? headline ?? 'Fotossíntese e Respiração Celular';
  const bodyText = body ?? caption ?? description ?? text ?? 'A fotossíntese é o processo pelo qual as plantas convertem energia luminosa em energia química, produzindo glicose e oxigênio a partir de dióxido de carbono e água.';

  const paragraphs = [
    bodyText,
    'A clorofila, pigmento presente nos cloroplastos, absorve a luz solar nas faixas do vermelho e do azul-violeta, refletindo o verde — cor característica das plantas.',
    'O processo ocorre em duas etapas: as reações luminosas (fase clara) e o Ciclo de Calvin (fase escura), cada uma com funções específicas na síntese energética.',
  ];

  const marginNotes = ['Ver pág. 42', 'ATP = moeda energética', 'Clorofila a e b'];

  return (
    <div style={{ width: '300px', height: '424px', backgroundColor: '#fff', boxShadow: '0 4px 20px rgba(0,0,0,0.12)', borderRadius: '4px', overflow: 'hidden', fontFamily: "'Georgia', serif", display: 'flex', flexDirection: 'column' }}>

      {/* Header strip */}
      <div style={{ backgroundColor: brandColor, padding: '6px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '8px', color: 'rgba(255,255,255,0.85)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'system-ui' }}>{courseName}</span>
        <span style={{ fontSize: '8px', color: 'rgba(255,255,255,0.85)', fontFamily: 'system-ui' }}>Unidade 4</span>
      </div>

      {/* Content area with margin */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Margin notes column */}
        <div style={{ width: '52px', minWidth: '52px', borderRight: '1px solid #e2e8f0', backgroundColor: '#fafbfc', padding: '10px 6px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {marginNotes.map((note, i) => (
            <div key={i} style={{ fontSize: '7.5px', color: '#64748b', lineHeight: '1.4', textAlign: 'right', fontFamily: 'system-ui', fontStyle: 'italic' }}>{note}</div>
          ))}
          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '3px' }}>
            {[1, 2, 3].map(d => (
              <div key={d} style={{ height: '1px', backgroundColor: '#e2e8f0' }} />
            ))}
          </div>
        </div>

        {/* Main text column */}
        <div style={{ flex: 1, padding: '10px 12px 6px', overflowY: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {/* Section title */}
          <div style={{ marginBottom: '8px', paddingBottom: '6px', borderBottom: `2px solid ${brandColor}` }}>
            <h2 style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#1e293b', lineHeight: '1.3', letterSpacing: '-0.01em' }}>{sectionTitle}</h2>
          </div>

          {/* Body paragraphs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
            {paragraphs.map((p, i) => (
              <p key={i} style={{ margin: 0, fontSize: '9px', color: '#334155', lineHeight: '1.65', textAlign: 'justify' }}>{p}</p>
            ))}
          </div>

          {/* Highlighted callout */}
          <div style={{ backgroundColor: `${brandColor}10`, border: `1px solid ${brandColor}30`, borderRadius: '4px', padding: '6px 8px', marginTop: '8px' }}>
            <span style={{ fontSize: '8px', fontWeight: 700, color: brandColor, fontFamily: 'system-ui', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Conceito-chave — </span>
            <span style={{ fontSize: '8px', color: '#475569', fontFamily: 'system-ui' }}>6CO₂ + 6H₂O + luz → C₆H₁₂O₆ + 6O₂</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ borderTop: '1px solid #e2e8f0', padding: '5px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
        <span style={{ fontSize: '8px', color: '#94a3b8', fontFamily: 'system-ui' }}>{courseName} · Capítulo 4</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '20px', height: '1px', backgroundColor: '#cbd5e1' }} />
          <span style={{ fontSize: '9px', fontWeight: 700, color: '#475569', fontFamily: 'system-ui' }}>24</span>
          <div style={{ width: '20px', height: '1px', backgroundColor: '#cbd5e1' }} />
        </div>
      </div>
    </div>
  );
};
