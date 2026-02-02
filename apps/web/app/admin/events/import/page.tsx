'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { apiPost } from '@/lib/api';

type ImportResult = {
  success: boolean;
  imported: number;
  failed: number;
  errors?: string[];
  events?: any[];
};

export default function EventImportPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [importType, setImportType] = useState<'csv' | 'holidays'>('holidays');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  // CSV Import
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<string>('');

  // Holidays Import
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFile(file);
    setResult(null);

    // Read file preview
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').slice(0, 6);
      setCsvPreview(lines.join('\n'));
    };
    reader.readAsText(file);
  };

  const handleCsvImport = async () => {
    if (!csvFile) return;

    setLoading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', csvFile);

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333'}/events/import/csv`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: formData,
      });

      const data = await response.json();
      setResult(data);

      if (data.success) {
        setCsvFile(null);
        setCsvPreview('');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    } catch (error: any) {
      setResult({
        success: false,
        imported: 0,
        failed: 0,
        errors: [error.message || 'Failed to import CSV'],
      });
    } finally {
      setLoading(false);
    }
  };

  const handleHolidaysImport = async () => {
    setLoading(true);
    setResult(null);

    try {
      const res = await apiPost<ImportResult>('/events/import/holidays', {
        year: selectedYear,
      });
      setResult(res || null);
    } catch (error: any) {
      setResult({
        success: false,
        imported: 0,
        failed: 0,
        errors: [error.message || 'Failed to import holidays'],
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell title="Event Import">
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/calendar')}
            className="text-sm text-blue-600 hover:text-blue-700 mb-2 flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            Voltar para Calendário
          </button>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Import Calendar Events</h1>
          <p className="text-slate-600">Importe eventos em massa via CSV ou API de feriados</p>
        </div>

        {/* Import Type Selector */}
        <div className="bg-white rounded-lg border border-slate-200 p-6 mb-6">
          <h3 className="font-semibold text-slate-900 mb-4">Select Import Type</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => {
                setImportType('holidays');
                setResult(null);
              }}
              className={`p-6 rounded-lg border-2 transition-all ${
                importType === 'holidays'
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-start gap-4">
                <span className="material-symbols-outlined text-4xl text-blue-600">celebration</span>
                <div className="flex-1 text-left">
                  <div className="font-semibold text-slate-900 mb-1">Brazilian Holidays</div>
                  <div className="text-sm text-slate-600">
                    Import official Brazilian holidays from BrasilAPI
                  </div>
                </div>
              </div>
            </button>

            <button
              onClick={() => {
                setImportType('csv');
                setResult(null);
              }}
              className={`p-6 rounded-lg border-2 transition-all ${
                importType === 'csv'
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-start gap-4">
                <span className="material-symbols-outlined text-4xl text-purple-600">upload_file</span>
                <div className="flex-1 text-left">
                  <div className="font-semibold text-slate-900 mb-1">CSV Upload</div>
                  <div className="text-sm text-slate-600">
                    Upload custom events from a CSV file
                  </div>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* CSV Import Section */}
        {importType === 'csv' && (
          <div className="bg-white rounded-lg border border-slate-200 p-6 mb-6">
            <h3 className="font-semibold text-slate-900 mb-4">CSV File Upload</h3>

            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">CSV Format Requirements:</h4>
              <div className="text-sm text-blue-800 space-y-1">
                <div>• Required columns: <code className="bg-blue-100 px-1 rounded">date</code>, <code className="bg-blue-100 px-1 rounded">name</code></div>
                <div>• Optional columns: <code className="bg-blue-100 px-1 rounded">slug</code>, <code className="bg-blue-100 px-1 rounded">categories</code>, <code className="bg-blue-100 px-1 rounded">base_relevance</code></div>
                <div>• Date format: YYYY-MM-DD</div>
                <div>• Categories: comma-separated (e.g., "dia-das-maes,comercial")</div>
                <div>• Base relevance: number 0-100</div>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Select CSV File
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>

            {csvPreview && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Preview (first 5 lines)
                </label>
                <pre className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs overflow-x-auto">
                  {csvPreview}
                </pre>
              </div>
            )}

            <button
              onClick={handleCsvImport}
              disabled={!csvFile || loading}
              className="w-full px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-solid border-current border-r-transparent" />
                  Importing...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined">upload</span>
                  Import CSV
                </>
              )}
            </button>
          </div>
        )}

        {/* Holidays Import Section */}
        {importType === 'holidays' && (
          <div className="bg-white rounded-lg border border-slate-200 p-6 mb-6">
            <h3 className="font-semibold text-slate-900 mb-4">Import Brazilian Holidays</h3>

            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="text-sm text-blue-800">
                This will import all official Brazilian national holidays for the selected year from the BrasilAPI.
                Existing events for the same dates will be skipped.
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Select Year
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="w-full md:w-64 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() + i).map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleHolidaysImport}
              disabled={loading}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-solid border-current border-r-transparent" />
                  Importing...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined">download</span>
                  Import {selectedYear} Holidays
                </>
              )}
            </button>
          </div>
        )}

        {/* Results */}
        {result && (
          <div
            className={`rounded-lg border p-6 ${
              result.success
                ? 'bg-green-50 border-green-200'
                : 'bg-red-50 border-red-200'
            }`}
          >
            <div className="flex items-start gap-3 mb-4">
              <span
                className={`material-symbols-outlined text-3xl ${
                  result.success ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {result.success ? 'check_circle' : 'error'}
              </span>
              <div className="flex-1">
                <h3
                  className={`text-lg font-semibold mb-2 ${
                    result.success ? 'text-green-900' : 'text-red-900'
                  }`}
                >
                  {result.success ? 'Import Successful!' : 'Import Failed'}
                </h3>
                <div
                  className={`text-sm space-y-1 ${
                    result.success ? 'text-green-800' : 'text-red-800'
                  }`}
                >
                  <div>✓ Successfully imported: {result.imported} events</div>
                  {result.failed > 0 && <div>✗ Failed: {result.failed} events</div>}
                </div>
              </div>
            </div>

            {result.errors && result.errors.length > 0 && (
              <div className="mt-4 p-4 bg-white border border-red-200 rounded-lg">
                <div className="text-sm font-medium text-red-900 mb-2">Errors:</div>
                <ul className="text-sm text-red-800 space-y-1 list-disc list-inside">
                  {result.errors.map((error, idx) => (
                    <li key={idx}>{error}</li>
                  ))}
                </ul>
              </div>
            )}

            {result.success && result.events && result.events.length > 0 && (
              <div className="mt-4 p-4 bg-white border border-green-200 rounded-lg max-h-64 overflow-y-auto">
                <div className="text-sm font-medium text-green-900 mb-2">Imported Events:</div>
                <div className="space-y-2">
                  {result.events.map((event: any, idx: number) => (
                    <div key={idx} className="text-sm text-green-800 flex items-center gap-2">
                      <span className="material-symbols-outlined text-xs">event</span>
                      <span className="font-medium">{event.date || event.event_date}</span>
                      <span>•</span>
                      <span>{event.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.success && (
              <button
                onClick={() => router.push('/calendar')}
                className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Go to Calendar
              </button>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
