'use client';

import React from 'react';

interface TVCorporativaTreinamentosProps {
  brandName?: string;
  title?: string;
  headline?: string;
  brandColor?: string;
  name?: string;
}

export const TVCorporativaTreinamentos: React.FC<TVCorporativaTreinamentosProps> = ({
  brandName = 'Empresa S.A.',
  title = 'Próximos Treinamentos',
  headline = 'Agenda de Capacitação',
  brandColor = '#8b5cf6',
  name = '',
}) => {
  const cursos = [
    { nome: 'NR-35 – Trabalho em Altura', data: '10/03', hora: '08h00', instrutor: 'João Ferreira', vagas: 3, total: 20, cor: '#ef4444', obrig: true },
    { nome: 'Excel Avançado para Gestores', data: '12/03', hora: '14h00', instrutor: 'Ana Souza', vagas: 8, total: 15, cor: '#3b82f6', obrig: false },
    { nome: 'Liderança Situacional', data: '14/03', hora: '09h00', instrutor: 'Carlos Melo', vagas: 5, total: 12, cor: '#10b981', obrig: false },
    { nome: 'Proteção de Dados (LGPD)', data: '18/03', hora: '10h00', instrutor: 'Dra. Paula Lima', vagas: 12, total: 30, cor: '#f59e0b', obrig: true },
  ];

  return (
    <div style={{
      width: 560, height: 315,
      background: 'linear-gradient(150deg, #0d0818 0%, #160d2e 100%)',
      borderRadius: 12, overflow: 'hidden',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      display: 'flex', flexDirection: 'column',
    }}>
      <style>{`
        @keyframes trein-in { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        .trein-row { animation: trein-in 0.4s ease both; }
        .trein-row:nth-child(1){animation-delay:0.05s}
        .trein-row:nth-child(2){animation-delay:0.15s}
        .trein-row:nth-child(3){animation-delay:0.25s}
        .trein-row:nth-child(4){animation-delay:0.35s}
        @keyframes trein-book { 0%,100%{transform:rotate(-5deg)} 50%{transform:rotate(5deg)} }
        .trein-book { animation: trein-book 3s ease-in-out infinite; }
      `}</style>

      <div style={{ height: 4, background: `linear-gradient(90deg, ${brandColor}, #ec4899, #3b82f6)` }} />

      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '9px 20px 7px', borderBottom: '1px solid rgba(139,92,246,0.2)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="trein-book" style={{ fontSize: 22 }}>📚</div>
          <div>
            <div style={{ color: '#c4b5fd', fontWeight: 800, fontSize: 15 }}>{title}</div>
            <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10 }}>{brandName} · {headline}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <div style={{
            background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)',
            borderRadius: 20, padding: '2px 9px',
          }}>
            <span style={{ color: '#fca5a5', fontSize: 9, fontWeight: 700 }}>2 Obrigatórios</span>
          </div>
          <div style={{
            background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.4)',
            borderRadius: 20, padding: '2px 9px',
          }}>
            <span style={{ color: '#c4b5fd', fontSize: 9, fontWeight: 700 }}>4 Disponíveis</span>
          </div>
        </div>
      </div>

      {/* Table header */}
      <div style={{
        display: 'grid', gridTemplateColumns: '2fr 80px 100px 70px 90px',
        gap: 8, padding: '6px 16px 4px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        {['Curso', 'Data', 'Instrutor', 'Vagas', 'Inscrição'].map((h, i) => (
          <div key={i} style={{ color: 'rgba(255,255,255,0.3)', fontSize: 8, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase' }}>
            {h}
          </div>
        ))}
      </div>

      {/* Rows */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '4px 12px', gap: 4 }}>
        {cursos.map((c, i) => (
          <div key={i} className="trein-row" style={{
            display: 'grid', gridTemplateColumns: '2fr 80px 100px 70px 90px',
            gap: 8, alignItems: 'center',
            background: 'rgba(255,255,255,0.03)', borderRadius: 7, padding: '8px 4px 8px 10px',
            borderLeft: `3px solid ${c.cor}`,
          }}>
            {/* Nome */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                {c.obrig && (
                  <span style={{
                    background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)',
                    color: '#fca5a5', fontSize: 7, fontWeight: 700, padding: '1px 4px', borderRadius: 3,
                  }}>OBR</span>
                )}
                <span style={{ color: 'white', fontSize: 10, fontWeight: 600 }}>{c.nome}</span>
              </div>
            </div>
            {/* Data */}
            <div>
              <div style={{ color: c.cor, fontSize: 10, fontWeight: 700 }}>{c.data}</div>
              <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 8 }}>{c.hora}</div>
            </div>
            {/* Instrutor */}
            <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 9 }}>{c.instrutor}</div>
            {/* Vagas */}
            <div>
              <div style={{ color: c.vagas <= 5 ? '#ef4444' : '#22c55e', fontSize: 10, fontWeight: 700 }}>
                {c.vagas} vagas
              </div>
              <div style={{ height: 3, background: 'rgba(255,255,255,0.1)', borderRadius: 2, marginTop: 3, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 2,
                  width: `${((c.total - c.vagas) / c.total) * 100}%`,
                  background: c.vagas <= 5 ? '#ef4444' : c.cor,
                }} />
              </div>
            </div>
            {/* CTA */}
            <div style={{
              background: `${c.cor}22`, border: `1px solid ${c.cor}55`,
              borderRadius: 5, padding: '4px 8px', textAlign: 'center', cursor: 'pointer',
            }}>
              <span style={{ color: c.cor, fontSize: 9, fontWeight: 700 }}>Inscrever-se</span>
            </div>
          </div>
        ))}
      </div>

      <div style={{
        padding: '4px 20px 8px', borderTop: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', justifyContent: 'space-between',
      }}>
        <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 9 }}>Portal do Colaborador › Treinamentos</span>
        <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 9 }}>{new Date().toLocaleDateString('pt-BR')}</span>
      </div>
    </div>
  );
};
