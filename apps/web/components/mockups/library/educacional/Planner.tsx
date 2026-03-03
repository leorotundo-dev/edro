'use client';

import React from 'react';

interface PlannerProps {
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

export const Planner: React.FC<PlannerProps> = ({
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
  const resolvedTitle = title ?? headline ?? 'Planner Semanal';
  const resolvedSubtitle = description ?? caption ?? body ?? text ?? 'Semana de 03 a 07 de Março de 2025';
  const resolvedPublisher = brandName ?? name ?? username ?? 'EduPlan';
  const accent = brandColor;

  const days = [
    {
      label: 'Seg',
      date: '03',
      tasks: ['Revisão Cap. 1–3', 'Exercícios p. 45', 'Flashcards 30min'],
    },
    {
      label: 'Ter',
      date: '04',
      tasks: ['Leitura Cap. 4', 'Mapa Mental', 'Simulado rápido'],
    },
    {
      label: 'Qua',
      date: '05',
      tasks: ['Repetição espaçada', 'Anotações revisadas', 'Grupo de estudo'],
    },
    {
      label: 'Qui',
      date: '06',
      tasks: ['Cap. 5 + resumo', 'Questões anteriores', 'Revisão noturna'],
    },
    {
      label: 'Sex',
      date: '07',
      tasks: ['Simulado completo', 'Correção detalhada', 'Planejamento p/ semana'],
    },
  ];

  const timeSlots = ['08h', '10h', '14h', '19h'];

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: '620px',
        minHeight: '420px',
        background: '#ffffff',
        borderRadius: '10px',
        overflow: 'hidden',
        boxShadow: '0 4px 24px rgba(0,0,0,0.09)',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      {/* Header */}
      <div
        style={{
          background: accent,
          padding: '16px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 900, color: '#ffffff' }}>
            {resolvedTitle}
          </h1>
          <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.75)', marginTop: '2px' }}>
            {resolvedSubtitle}
          </p>
        </div>
        <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)', letterSpacing: '1px', textTransform: 'uppercase' }}>
          {resolvedPublisher}
        </span>
      </div>

      {/* Grid */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '520px' }}>
          <thead>
            <tr>
              {/* Time column header */}
              <th
                style={{
                  width: '40px',
                  background: '#f9fafb',
                  borderRight: '1px solid #e5e7eb',
                  borderBottom: '2px solid #e5e7eb',
                  padding: '8px 4px',
                }}
              />
              {days.map((day, i) => (
                <th
                  key={i}
                  style={{
                    background: '#f9fafb',
                    borderRight: i < days.length - 1 ? '1px solid #e5e7eb' : 'none',
                    borderBottom: '2px solid #e5e7eb',
                    padding: '8px 6px',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: '10px', fontWeight: 700, color: '#9ca3af', letterSpacing: '1px', textTransform: 'uppercase' }}>
                    {day.label}
                  </div>
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: i === 0 ? accent : 'transparent',
                      color: i === 0 ? '#ffffff' : '#1f2937',
                      fontSize: '13px',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '4px auto 0',
                    }}
                  >
                    {day.date}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {timeSlots.map((slot, si) => (
              <tr key={si}>
                {/* Time label */}
                <td
                  style={{
                    fontSize: '10px',
                    color: '#9ca3af',
                    fontWeight: 600,
                    textAlign: 'center',
                    padding: '6px 4px',
                    borderRight: '1px solid #e5e7eb',
                    borderBottom: si < timeSlots.length - 1 ? '1px solid #f3f4f6' : 'none',
                    background: '#f9fafb',
                  }}
                >
                  {slot}
                </td>
                {days.map((day, di) => {
                  const task = day.tasks[si] ?? '';
                  return (
                    <td
                      key={di}
                      style={{
                        padding: '6px 8px',
                        borderRight: di < days.length - 1 ? '1px solid #f3f4f6' : 'none',
                        borderBottom: si < timeSlots.length - 1 ? '1px solid #f3f4f6' : 'none',
                        verticalAlign: 'top',
                      }}
                    >
                      {task && (
                        <div
                          style={{
                            background: di === 0 ? `${accent}12` : '#f9fafb',
                            border: `1px solid ${di === 0 ? accent + '30' : '#e5e7eb'}`,
                            borderLeft: `3px solid ${di === 0 ? accent : '#d1d5db'}`,
                            borderRadius: '4px',
                            padding: '4px 7px',
                            fontSize: '10px',
                            color: '#374151',
                            lineHeight: 1.4,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {task}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div
        style={{
          padding: '8px 24px',
          borderTop: '1px solid #f3f4f6',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span style={{ fontSize: '10px', color: '#9ca3af', letterSpacing: '1px', textTransform: 'uppercase' }}>
          {resolvedPublisher}
        </span>
        <span style={{ fontSize: '10px', color: '#9ca3af' }}>
          {days.length} dias · {timeSlots.length} faixas de horário
        </span>
      </div>
    </div>
  );
};
