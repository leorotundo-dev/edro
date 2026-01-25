'use client';

import { useState } from 'react';
import { apiPost } from '@/lib/api';

type ImportResult = {
  success: boolean;
  briefingId?: string;
  error?: string;
  row: number;
};

type ImportResponse = {
  total: number;
  successful: number;
  failed: number;
  results: ImportResult[];
};

export default function CSVImport({ onImportComplete }: { onImportComplete?: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.csv')) {
        setError('Por favor, selecione um arquivo CSV válido');
        setFile(null);
        return;
      }
      setFile(selectedFile);
      setError(null);
      setResult(null);
    }
  };

  const handleImport = async () => {
    if (!file) {
      setError('Por favor, selecione um arquivo CSV');
      return;
    }

    setImporting(true);
    setError(null);
    setResult(null);

    try {
      // Read file content
      const content = await file.text();

      // Send to API
      const response = await apiPost<{ data: ImportResponse }>('/edro/briefings/import-csv', {
        csv_content: content,
      });

      if (response.data) {
        setResult(response.data);
        if (response.data.successful > 0 && onImportComplete) {
          onImportComplete();
        }
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao importar CSV');
    } finally {
      setImporting(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setResult(null);
    setError(null);
  };

  return (
    <div className="csv-import-container">
      <div className="csv-import-header">
        <h3>Importar Briefings via CSV</h3>
        <p className="text-sm text-gray-600">
          Faça upload de um arquivo CSV para criar múltiplos briefings de uma vez.
        </p>
      </div>

      {!result && (
        <div className="csv-import-form">
          <div className="file-input-wrapper">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              disabled={importing}
              className="file-input"
            />
            {file && (
              <div className="file-info">
                <span className="file-name">📄 {file.name}</span>
                <span className="file-size">({(file.size / 1024).toFixed(2)} KB)</span>
              </div>
            )}
          </div>

          {error && (
            <div className="alert alert-error">
              <span>⚠️ {error}</span>
            </div>
          )}

          <div className="csv-format-info">
            <details>
              <summary>Formato do CSV esperado</summary>
              <div className="format-details">
                <p>O arquivo CSV deve conter as seguintes colunas (cabeçalho obrigatório):</p>
                <ul>
                  <li>
                    <strong>client_name</strong> (obrigatório) - Nome do cliente
                  </li>
                  <li>
                    <strong>title</strong> (obrigatório) - Título do briefing
                  </li>
                  <li>
                    <strong>due_date</strong> (opcional) - Data de entrega (DD/MM/YYYY ou ISO)
                  </li>
                  <li>
                    <strong>traffic_owner</strong> (opcional) - Responsável pelo tráfego
                  </li>
                  <li>
                    <strong>meeting_url</strong> (opcional) - URL da reunião
                  </li>
                  <li>
                    <strong>briefing_text</strong> (opcional) - Texto do briefing
                  </li>
                  <li>
                    <strong>deliverables</strong> (opcional) - Entregas esperadas
                  </li>
                  <li>
                    <strong>channels</strong> (opcional) - Canais de distribuição
                  </li>
                  <li>
                    <strong>references</strong> (opcional) - Referências
                  </li>
                  <li>
                    <strong>notes</strong> (opcional) - Observações
                  </li>
                </ul>
                <p className="text-sm text-gray-600 mt-2">
                  Exemplo: <code>client_name,title,due_date,briefing_text</code>
                </p>
              </div>
            </details>
          </div>

          <div className="button-group">
            <button
              type="button"
              onClick={handleImport}
              disabled={!file || importing}
              className="btn primary"
            >
              {importing ? 'Importando...' : 'Importar CSV'}
            </button>
          </div>
        </div>
      )}

      {result && (
        <div className="csv-import-result">
          <div className="result-summary">
            <h4>Resultado da Importação</h4>
            <div className="stats">
              <div className="stat">
                <span className="stat-label">Total:</span>
                <span className="stat-value">{result.total}</span>
              </div>
              <div className="stat success">
                <span className="stat-label">Sucesso:</span>
                <span className="stat-value">✅ {result.successful}</span>
              </div>
              {result.failed > 0 && (
                <div className="stat error">
                  <span className="stat-label">Falhas:</span>
                  <span className="stat-value">❌ {result.failed}</span>
                </div>
              )}
            </div>
          </div>

          {result.failed > 0 && (
            <div className="result-errors">
              <h5>Erros encontrados:</h5>
              <ul className="error-list">
                {result.results
                  .filter((r) => !r.success)
                  .map((r, idx) => (
                    <li key={idx} className="error-item">
                      <strong>Linha {r.row}:</strong> {r.error}
                    </li>
                  ))}
              </ul>
            </div>
          )}

          <div className="button-group">
            <button type="button" onClick={handleReset} className="btn secondary">
              Importar Outro Arquivo
            </button>
            {result.successful > 0 && onImportComplete && (
              <button
                type="button"
                onClick={() => {
                  handleReset();
                  onImportComplete();
                }}
                className="btn primary"
              >
                Ver Briefings Importados
              </button>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        .csv-import-container {
          padding: 1.5rem;
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .csv-import-header {
          margin-bottom: 1.5rem;
        }

        .csv-import-header h3 {
          margin: 0 0 0.5rem 0;
          font-size: 1.25rem;
          font-weight: 600;
        }

        .csv-import-form {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .file-input-wrapper {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .file-input {
          padding: 0.5rem;
          border: 2px dashed #ccc;
          border-radius: 4px;
          cursor: pointer;
        }

        .file-info {
          display: flex;
          gap: 0.5rem;
          align-items: center;
          padding: 0.5rem;
          background: #f5f5f5;
          border-radius: 4px;
        }

        .file-name {
          font-weight: 500;
        }

        .file-size {
          color: #666;
          font-size: 0.875rem;
        }

        .alert {
          padding: 0.75rem;
          border-radius: 4px;
          font-size: 0.875rem;
        }

        .alert-error {
          background: #fee;
          color: #c00;
          border: 1px solid #fcc;
        }

        .csv-format-info {
          margin: 1rem 0;
        }

        .csv-format-info details {
          border: 1px solid #e0e0e0;
          border-radius: 4px;
          padding: 0.75rem;
        }

        .csv-format-info summary {
          cursor: pointer;
          font-weight: 500;
          user-select: none;
        }

        .format-details {
          margin-top: 0.75rem;
          padding-top: 0.75rem;
          border-top: 1px solid #e0e0e0;
        }

        .format-details ul {
          margin: 0.5rem 0;
          padding-left: 1.5rem;
        }

        .format-details li {
          margin: 0.25rem 0;
          font-size: 0.875rem;
        }

        .button-group {
          display: flex;
          gap: 0.75rem;
          margin-top: 1rem;
        }

        .btn {
          padding: 0.625rem 1.25rem;
          border: none;
          border-radius: 4px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn.primary {
          background: #007bff;
          color: white;
        }

        .btn.primary:hover:not(:disabled) {
          background: #0056b3;
        }

        .btn.secondary {
          background: #6c757d;
          color: white;
        }

        .btn.secondary:hover:not(:disabled) {
          background: #545b62;
        }

        .csv-import-result {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .result-summary h4 {
          margin: 0 0 1rem 0;
          font-size: 1.125rem;
          font-weight: 600;
        }

        .stats {
          display: flex;
          gap: 1.5rem;
          flex-wrap: wrap;
        }

        .stat {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          padding: 0.75rem 1rem;
          background: #f8f9fa;
          border-radius: 4px;
          min-width: 100px;
        }

        .stat.success {
          background: #d4edda;
          border: 1px solid #c3e6cb;
        }

        .stat.error {
          background: #f8d7da;
          border: 1px solid #f5c6cb;
        }

        .stat-label {
          font-size: 0.75rem;
          color: #666;
          text-transform: uppercase;
          font-weight: 600;
        }

        .stat-value {
          font-size: 1.5rem;
          font-weight: 700;
        }

        .result-errors {
          padding: 1rem;
          background: #fff3cd;
          border: 1px solid #ffeaa7;
          border-radius: 4px;
        }

        .result-errors h5 {
          margin: 0 0 0.75rem 0;
          font-size: 1rem;
          font-weight: 600;
        }

        .error-list {
          margin: 0;
          padding-left: 1.5rem;
        }

        .error-item {
          margin: 0.5rem 0;
          font-size: 0.875rem;
        }
      `}</style>
    </div>
  );
}
