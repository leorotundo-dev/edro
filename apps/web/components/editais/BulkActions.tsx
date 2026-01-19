'use client';

import { CheckSquare, Trash2, Edit, Download } from 'lucide-react';

interface BulkActionsProps {
  selectedCount: number;
  onDelete: () => void;
  onExport: () => void;
  onClearSelection: () => void;
}

export function BulkActions({ selectedCount, onDelete, onExport, onClearSelection }: BulkActionsProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <CheckSquare className="w-5 h-5 text-blue-600" />
        <span className="font-medium text-blue-900">
          {selectedCount} {selectedCount === 1 ? 'edital selecionado' : 'editais selecionados'}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onExport}
          className="px-4 py-2 bg-white border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-50 transition-colors flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Exportar
        </button>
        <button
          onClick={onDelete}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
        >
          <Trash2 className="w-4 h-4" />
          Excluir
        </button>
        <button
          onClick={onClearSelection}
          className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
