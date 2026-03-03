'use client';

import React from 'react';

interface TVCorporativaAvisosProps {
  brandName?: string;
  title?: string;
  headline?: string;
  brandColor?: string;
  name?: string;
}

export const TVCorporativaAvisos: React.FC<TVCorporativaAvisosProps> = ({
  brandName = 'Empresa S.A.',
  title = 'Avisos',
  headline = 'Comunicados Importantes',
  brandColor = '#dc2626',
  name = '',
}) => {
  const avisos = [
    {
      prioridade: 'URGENTE',
      priorColor: '#ef4444',
      titulo: 'Manutenção do Sistema ERP',
      texto: 'O sistema ficará indisponível na sexta-feira (14/03) das 22h às 06h para atualização.',
      data: '12/03',
      icon: 'M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    },
    {
      prioridade: 'IMPORTANTE',
      priorColor: '#f59e0b',
      titulo: 'Revisão do Plano de Saúde',
      texto: 'Prazo para inclusão de dependentes até 31/03. Acesse o portal RH para mais detalhes.',
      data: '10/03',
      icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
    },
    {
      prioridade: 'INFORMATIVO',
      priorColor: '#3b82f6',
      titulo: 'Nova Política de Ponto Eletrônico',
      texto: 'A partir de 01/04 o registro de ponto será feito exclusivamente pelo aplicativo móvel.',
      data: '08/03',
      icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    },
    {
      prioridade: 'LEMBRETE',
      priorColor: '#22c55e',
      titulo: 'Semana de Treinamentos Obrigatórios',
      texto: 'Confira sua agenda: NR-10, LGPD e Ética Corporativa. Inscrições abertas no portal.',
      data: '05/03',
      icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
    },
  ];

  return (
    <div style={{
      width: 560, height: 315,
      background: 'linear-gradient(160deg, #0f172a 0%, #1e1e2e 100%)',
      borderRadius: 12, overflow: 'hidden',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      display: 'flex', flexDirection: 'column',
    }}>
      <style>{`
        @keyframes aviso-in { from{opacity:0;transform:translateX(-10px)} to{opacity:1;transform:translateX(0)} }
        .aviso-row { animation: aviso-in 0.4s ease both; }
        .aviso-row:nth-child(1){animation-delay:0.05s}
        .aviso-row:nth-child(2){animation-delay:0.15s}
        .aviso-row:nth-child(3){animation-delay:0.25s}
        .aviso-row:nth-child(4){animation-delay:0.35s}
        @keyframes bell-shake { 0%,100%{transform:rotate(0)} 25%{transform:rotate(-12deg)} 75%{transform:rotate(12deg)} }
        .bell-icon { animation: bell-shake 2.5s ease-in-out infinite; }
      `}</style>

      <div style={{ height: 4, background: `linear-gradient(90deg, ${brandColor}, #f59e0b, #3b82f6)` }} />

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 20px 8px', borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="bell-icon" style={{
            width: 34, height: 34, borderRadius: 8, background: `rgba(220,38,38,0.2)`,
            border: `1px solid rgba(220,38,38,0.4)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />
            </svg>
          </div>
          <div>
            <div style={{ color: 'white', fontWeight: 800, fontSize: 16 }}>{title}</div>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>{brandName} · {headline}</div>
          </div>
        </div>
        <div style={{
          background: 'rgba(220,38,38,0.15)', border: '1px solid rgba(220,38,38,0.3)',
          borderRadius: 20, padding: '3px 10px',
        }}>
          <span style={{ color: '#ef4444', fontSize: 10, fontWeight: 700 }}>4 novos avisos</span>
        </div>
      </div>

      {/* Avisos list */}
      <div style={{ flex: 1, padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: 5 }}>
        {avisos.map((a, i) => (
          <div key={i} className="aviso-row" style={{
            display: 'flex', alignItems: 'flex-start', gap: 10,
            background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '8px 10px',
            borderLeft: `3px solid ${a.priorColor}`,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={a.priorColor} strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}>
              <path d={a.icon} />
            </svg>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <span style={{
                  background: `${a.priorColor}22`, border: `1px solid ${a.priorColor}55`,
                  color: a.priorColor, fontSize: 8, fontWeight: 700,
                  padding: '1px 5px', borderRadius: 3, letterSpacing: 0.5,
                }}>{a.prioridade}</span>
                <span style={{ color: 'white', fontSize: 12, fontWeight: 700 }}>{a.titulo}</span>
              </div>
              <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 10, lineHeight: 1.4 }}>{a.texto}</div>
            </div>
            <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: 9, flexShrink: 0 }}>{a.data}</div>
          </div>
        ))}
      </div>

      <div style={{
        padding: '5px 20px 8px', borderTop: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', justifyContent: 'space-between',
      }}>
        <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 9 }}>Comunicação Interna</span>
        <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 9 }}>
          {new Date().toLocaleDateString('pt-BR')}
        </span>
      </div>
    </div>
  );
};
