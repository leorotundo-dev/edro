'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { apiGet } from '@/lib/api';

type ReportData = {
  period: { from: string; to: string };
  summary: { total: number; completed: number; overdue: number };
  byStage: { status: string; count: number }[];
  copies: { total_copies: number; avg_chars: number };
  stageTimeline: { stage: string; avg_hours: number }[];
  briefings: { id: string; title: string; status: string; due_at: string; created_at: string }[];
};

const STAGE_COLORS: Record<string, string> = {
  briefing: '#E85219', copy_ia: '#94a3b8', aprovacao: '#FFAE1F',
  producao: '#FA896B', revisao: '#E85219', entrega: '#13DEB9', done: '#13DEB9',
};

const TEMPLATE_LABELS: Record<string, string> = {
  executivo: 'Resumo Executivo',
  completo: 'Performance Completo',
  cliente: 'Relatorio do Cliente',
};

export default function ReportPrintPage() {
  const params = useParams();
  const search = useSearchParams();
  const clientId = params.id as string;
  const template = (search.get('template') || 'completo') as string;
  const from = search.get('from') || '';
  const to = search.get('to') || '';

  const [report, setReport] = useState<ReportData | null>(null);
  const [clientName, setClientName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [data, client] = await Promise.all([
          apiGet<ReportData>(`/clients/${clientId}/reports/summary?from=${from}&to=${to}`),
          apiGet<{ name: string }>(`/clients/${clientId}`),
        ]);
        setReport(data);
        setClientName(client.name || clientId);
      } catch (err: any) {
        setError(err?.message || 'Erro ao carregar relatorio.');
      }
    })();
  }, [clientId, from, to]);

  const isCliente = template === 'cliente';
  const showTimeline = template === 'completo';
  const showTable = template !== 'executivo' || true; // show in all for print
  const today = new Date().toLocaleDateString('pt-BR');

  if (error) return <div style={{ padding: 40, textAlign: 'center', color: '#e53e3e' }}>{error}</div>;
  if (!report) return <div style={{ padding: 40, textAlign: 'center', color: '#666' }}>Carregando relatorio...</div>;

  return (
    <>
      <style>{`
        @media print {
          body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
          .print-page { break-after: page; }
        }
        @page { size: A4; margin: 20mm 15mm; }
        * { box-sizing: border-box; }
      `}</style>

      <div style={{ maxWidth: 800, margin: '0 auto', fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif', color: '#0f172a', padding: 24 }}>
        {/* Print Button */}
        <div className="no-print" style={{ textAlign: 'right', marginBottom: 16 }}>
          <button
            onClick={() => window.print()}
            style={{
              background: '#E85219', color: '#fff', border: 'none', padding: '10px 24px',
              borderRadius: 6, fontWeight: 600, fontSize: 14, cursor: 'pointer', marginRight: 8,
            }}
          >
            Imprimir / Salvar PDF
          </button>
          <button
            onClick={() => window.close()}
            style={{
              background: '#f1f5f9', color: '#0f172a', border: '1px solid #e2e8f0', padding: '10px 24px',
              borderRadius: 6, fontWeight: 600, fontSize: 14, cursor: 'pointer',
            }}
          >
            Fechar
          </button>
        </div>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '3px solid #E85219', paddingBottom: 16, marginBottom: 24 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <img src="/assets/logo-studio.png" alt="Edro" style={{ height: 32 }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              <span style={{ fontSize: 22, fontWeight: 800, color: '#E85219' }}>Edro Studio</span>
            </div>
            <h1 style={{ margin: '8px 0 4px', fontSize: 20, fontWeight: 700 }}>
              {TEMPLATE_LABELS[template] || 'Relatorio de Performance'}
            </h1>
            <p style={{ margin: 0, color: '#64748b', fontSize: 13 }}>
              Cliente: <strong>{clientName}</strong> &nbsp;·&nbsp; Período: <strong>{from}</strong> a <strong>{to}</strong>
            </p>
          </div>
          <div style={{ textAlign: 'right', color: '#94a3b8', fontSize: 11 }}>
            <div>Gerado em {today}</div>
            <div>edro.studio</div>
          </div>
        </div>

        {/* Stats Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
          {[
            { value: report.summary.total, label: isCliente ? 'Demandas' : 'Briefings', color: '#E85219' },
            { value: report.summary.completed, label: isCliente ? 'Entregues' : 'Concluidos', color: '#13DEB9' },
            { value: report.summary.overdue, label: isCliente ? 'Pendentes' : 'Atrasados', color: '#FA896B' },
            { value: report.copies.total_copies, label: isCliente ? 'Pecas Criadas' : 'Copies', color: '#E85219' },
          ].map((s) => (
            <div key={s.label} style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '16px 12px', textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* By Stage */}
        {report.byStage.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 10, color: '#0f172a' }}>
              {isCliente ? 'Status das Demandas' : 'Distribuição por Etapa'}
            </h3>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {report.byStage.map((s) => (
                <span key={s.status} style={{
                  display: 'inline-block', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                  background: STAGE_COLORS[s.status] || '#94a3b8', color: '#fff',
                }}>
                  {s.status}: {s.count}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Stage Timeline (completo only) */}
        {showTimeline && report.stageTimeline.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>Tempo Medio por Etapa</h3>
            {report.stageTimeline.map((s) => (
              <div key={s.stage} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                <span style={{ width: 100, fontSize: 12, color: '#64748b' }}>{s.stage}</span>
                <div style={{ flex: 1, height: 18, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 4,
                    width: `${Math.min(100, (Number(s.avg_hours) / 48) * 100)}%`,
                    background: STAGE_COLORS[s.stage] || '#E85219',
                    display: 'flex', alignItems: 'center', paddingLeft: 6,
                  }}>
                    <span style={{ fontSize: 10, color: '#fff', fontWeight: 600 }}>{s.avg_hours}h</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Briefings Table */}
        {report.briefings.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>
              {isCliente ? 'Entregas no Período' : 'Briefings no Período'}
            </h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ textAlign: 'left', padding: '6px 8px', color: '#64748b', fontWeight: 600 }}>Título</th>
                  <th style={{ textAlign: 'left', padding: '6px 8px', color: '#64748b', fontWeight: 600 }}>Status</th>
                  <th style={{ textAlign: 'left', padding: '6px 8px', color: '#64748b', fontWeight: 600 }}>Prazo</th>
                  <th style={{ textAlign: 'left', padding: '6px 8px', color: '#64748b', fontWeight: 600 }}>Criado</th>
                </tr>
              </thead>
              <tbody>
                {report.briefings.map((b) => (
                  <tr key={b.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '6px 8px' }}>{b.title}</td>
                    <td style={{ padding: '6px 8px' }}>
                      <span style={{
                        display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 600,
                        background: STAGE_COLORS[b.status] || '#94a3b8', color: '#fff',
                      }}>
                        {b.status}
                      </span>
                    </td>
                    <td style={{ padding: '6px 8px', color: '#64748b' }}>
                      {b.due_at ? new Date(b.due_at).toLocaleDateString('pt-BR') : '-'}
                    </td>
                    <td style={{ padding: '6px 8px', color: '#64748b' }}>
                      {new Date(b.created_at).toLocaleDateString('pt-BR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer */}
        <div style={{ borderTop: '2px solid #E85219', paddingTop: 12, marginTop: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>
            <strong style={{ color: '#E85219' }}>Edro Studio</strong> &nbsp;·&nbsp; Relatorio gerado automaticamente em {today}
          </div>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>
            edro.studio
          </div>
        </div>
      </div>
    </>
  );
}
