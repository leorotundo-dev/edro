'use client';

import useSWR from 'swr';
import { swrFetcher } from '@/lib/api';

type Report = {
  id: string;
  period_month: string;
  title: string;
  created_at: string;
  pdf_url: string | null;
};

export default function RelatoriosPage() {
  const { data, isLoading } = useSWR<{ reports: Report[] }>('/portal/client/reports', swrFetcher);
  const reports = data?.reports ?? [];

  return (
    <div className="portal-page">
      <div>
        <span className="portal-kicker">Analise</span>
        <h2 className="portal-page-title">Relatorios</h2>
        <p className="portal-page-subtitle">Documentos consolidados do trabalho entregue para sua conta.</p>
      </div>

      <section className="portal-card">
        {isLoading ? (
          <div className="portal-empty"><div><p className="portal-card-title">Carregando relatorios</p><p className="portal-card-subtitle">Buscando os arquivos disponiveis.</p></div></div>
        ) : reports.length === 0 ? (
          <div className="portal-empty"><div><p className="portal-card-title">Nenhum relatorio gerado</p><p className="portal-card-subtitle">Quando houver um consolidado publicado, ele aparece aqui.</p></div></div>
        ) : (
          <div className="portal-list">
            {reports.map((report) => (
              <div key={report.id} className="portal-list-card">
                <div className="portal-list-row">
                  <div>
                    <p className="portal-card-title">{report.title ?? `Relatorio ${report.period_month}`}</p>
                    <p className="portal-card-subtitle">Publicado em {new Date(report.created_at).toLocaleDateString('pt-BR')}</p>
                  </div>
                  {report.pdf_url ? (
                    <a href={report.pdf_url} target="_blank" rel="noreferrer" className="portal-section-link">Baixar PDF</a>
                  ) : (
                    <span className="portal-pill portal-pill-neutral">Sem arquivo</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
