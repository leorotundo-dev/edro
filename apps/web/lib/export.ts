// Export utilities for editais

export function exportToCSV(data: any[], filename: string) {
  if (!data || data.length === 0) {
    throw new Error('Não há dados para exportar');
  }

  // Get headers from first object
  const headers = Object.keys(data[0]);
  
  // Create CSV content
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Handle values that might contain commas or quotes
        if (value === null || value === undefined) return '';
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      }).join(',')
    )
  ].join('\n');

  // Create blob and download
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportToJSON(data: any[], filename: string) {
  const jsonContent = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.json`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportEditaisToCSV(editais: any[]) {
  const exportData = editais.map(edital => ({
    Codigo: edital.codigo,
    Titulo: edital.titulo,
    Orgao: edital.orgao,
    Banca: edital.banca || '',
    Status: edital.status,
    'Data Publicacao': edital.data_publicacao || '',
    'Data Prova': edital.data_prova_prevista || '',
    'Numero Vagas': edital.numero_vagas,
    'Numero Inscritos': edital.numero_inscritos,
    'Taxa Inscricao': edital.taxa_inscricao || 0,
    Tags: Array.isArray(edital.tags) ? edital.tags.join('; ') : '',
  }));

  exportToCSV(exportData, `editais_${new Date().toISOString().split('T')[0]}`);
}

export function exportEditaisToJSON(editais: any[]) {
  exportToJSON(editais, `editais_${new Date().toISOString().split('T')[0]}`);
}

export function generatePDFReport(editais: any[]): string {
  // Generate HTML for PDF report
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Relatório de Editais</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 40px;
        }
        h1 {
          color: #1e40af;
          border-bottom: 3px solid #1e40af;
          padding-bottom: 10px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
        }
        th, td {
          border: 1px solid #ddd;
          padding: 12px;
          text-align: left;
        }
        th {
          background-color: #1e40af;
          color: white;
        }
        tr:nth-child(even) {
          background-color: #f9fafb;
        }
        .summary {
          background-color: #eff6ff;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 30px;
        }
        .summary-item {
          margin: 10px 0;
          font-size: 16px;
        }
        .footer {
          margin-top: 40px;
          text-align: center;
          color: #6b7280;
          font-size: 12px;
        }
      </style>
    </head>
    <body>
      <h1>Relatório de Editais</h1>
      <p>Gerado em: ${new Date().toLocaleDateString('pt-BR', { 
        day: '2-digit', 
        month: 'long', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })}</p>
      
      <div class="summary">
        <h2>Resumo</h2>
        <div class="summary-item"><strong>Total de Editais:</strong> ${editais.length}</div>
        <div class="summary-item"><strong>Total de Vagas:</strong> ${editais.reduce((sum, e) => sum + (e.numero_vagas || 0), 0)}</div>
        <div class="summary-item"><strong>Total de Inscritos:</strong> ${editais.reduce((sum, e) => sum + (e.numero_inscritos || 0), 0)}</div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Código</th>
            <th>Título</th>
            <th>Órgão</th>
            <th>Banca</th>
            <th>Status</th>
            <th>Vagas</th>
            <th>Data Prova</th>
          </tr>
        </thead>
        <tbody>
          ${editais.map(edital => `
            <tr>
              <td>${edital.codigo}</td>
              <td>${edital.titulo}</td>
              <td>${edital.orgao}</td>
              <td>${edital.banca || '-'}</td>
              <td>${edital.status}</td>
              <td>${edital.numero_vagas}</td>
              <td>${edital.data_prova_prevista ? new Date(edital.data_prova_prevista).toLocaleDateString('pt-BR') : '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="footer">
        <p>Edro - Sistema de Gestão de Editais</p>
      </div>
    </body>
    </html>
  `;

  // Open in new window for printing
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  }

  return html;
}
