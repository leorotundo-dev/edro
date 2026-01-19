export default function AdminDashboardPage() {
  return (
    <div className="section-gap">
      <header>
        <h1 className="admin-page-header">Admin dashboard</h1>
        <p className="admin-page-subtitle">Resumo rapido do painel administrativo.</p>
      </header>

      <div className="admin-card">
        <p className="text-sm text-slate-600">
          Esta pagina esta em atualizacao. Use o menu lateral para acessar editais,
          usuarios, scrapers e relatorios.
        </p>
      </div>
    </div>
  );
}
