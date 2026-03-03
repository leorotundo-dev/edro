'use client';

import React from 'react';

interface ChecklistProps {
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

export const Checklist: React.FC<ChecklistProps> = ({
  title,
  headline,
  name,
  username,
  brandName,
  body,
  caption,
  description,
  text,
  brandColor = '#059669',
}) => {
  const listTitle = title ?? headline ?? 'Lista de Verificação — Projeto Final';
  const courseName = brandName ?? name ?? username ?? 'Metodologia de Pesquisa';
  const subtitle = body ?? caption ?? description ?? text ?? 'Revise todos os itens antes da entrega';

  const sections = [
    {
      category: 'Estrutura do Trabalho',
      items: [
        { label: 'Capa com dados completos', done: true },
        { label: 'Sumário atualizado', done: true },
        { label: 'Introdução com objetivo claro', done: true },
        { label: 'Referencial teórico adequado', done: false },
      ],
    },
    {
      category: 'Metodologia',
      items: [
        { label: 'Tipo de pesquisa definido', done: true },
        { label: 'Coleta de dados descrita', done: false },
        { label: 'Análise dos resultados', done: false },
      ],
    },
    {
      category: 'Formatação ABNT',
      items: [
        { label: 'Margens e espaçamento corretos', done: true },
        { label: 'Referências bibliográficas', done: false },
      ],
    },
  ];

  const allItems = sections.flatMap(s => s.items);
  const doneCount = allItems.filter(i => i.done).length;
  const totalCount = allItems.length;
  const progress = Math.round((doneCount / totalCount) * 100);

  return (
    <div style={{ width: '300px', height: '424px', backgroundColor: '#fff', boxShadow: '0 4px 20px rgba(0,0,0,0.12)', borderRadius: '8px', overflow: 'hidden', fontFamily: "'Segoe UI', system-ui, sans-serif", display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ backgroundColor: brandColor, padding: '12px 16px 10px' }}>
        <div style={{ fontSize: '8px', color: 'rgba(255,255,255,0.75)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '2px' }}>{courseName}</div>
        <div style={{ fontSize: '13px', color: '#fff', fontWeight: 800, lineHeight: '1.2', marginBottom: '4px' }}>{listTitle}</div>
        <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.8)' }}>{subtitle}</div>
      </div>

      {/* Progress bar */}
      <div style={{ padding: '10px 16px 8px', borderBottom: '1px solid #f1f5f9' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
          <span style={{ fontSize: '9px', fontWeight: 700, color: '#475569' }}>Progresso geral</span>
          <span style={{ fontSize: '11px', fontWeight: 800, color: brandColor }}>{progress}%</span>
        </div>
        <div style={{ height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progress}%`, backgroundColor: brandColor, borderRadius: '3px', transition: 'width 0.3s ease' }} />
        </div>
        <div style={{ fontSize: '8px', color: '#94a3b8', marginTop: '4px' }}>{doneCount} de {totalCount} itens concluídos</div>
      </div>

      {/* Checklist sections */}
      <div style={{ flex: 1, padding: '8px 16px', overflowY: 'hidden', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {sections.map((section, si) => (
          <div key={si}>
            <div style={{ fontSize: '8px', fontWeight: 700, color: brandColor, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <div style={{ flex: 1, height: '1px', backgroundColor: `${brandColor}30` }} />
              {section.category}
              <div style={{ flex: 1, height: '1px', backgroundColor: `${brandColor}30` }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              {section.items.map((item, ii) => (
                <div key={ii} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '3px 6px', borderRadius: '4px', backgroundColor: item.done ? `${brandColor}0a` : 'transparent' }}>
                  <div style={{ width: '16px', height: '16px', borderRadius: '4px', backgroundColor: item.done ? brandColor : 'transparent', border: `2px solid ${item.done ? brandColor : '#cbd5e1'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {item.done && (
                      <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="2,6 5,9 10,3" />
                      </svg>
                    )}
                  </div>
                  <span style={{ fontSize: '9px', color: item.done ? '#64748b' : '#334155', textDecoration: item.done ? 'line-through' : 'none', lineHeight: '1.4' }}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{ borderTop: '1px solid #e2e8f0', padding: '6px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
        <span style={{ fontSize: '8px', color: '#94a3b8' }}>Atualizado em mar/2024</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: brandColor }} />
          <span style={{ fontSize: '8px', fontWeight: 700, color: brandColor }}>{doneCount}/{totalCount}</span>
        </div>
      </div>
    </div>
  );
};
