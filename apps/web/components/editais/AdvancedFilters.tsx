'use client';

import { useState } from 'react';
import { Filter, X, Calendar } from 'lucide-react';

interface AdvancedFiltersProps {
  onApply: (filters: any) => void;
  onClear: () => void;
  bancas: string[];
}

export function AdvancedFilters({ onApply, onClear, bancas }: AdvancedFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState({
    dataProvaInicio: '',
    dataProvaFim: '',
    vagasMin: '',
    vagasMax: '',
    tags: [] as string[],
  });

  const handleApply = () => {
    onApply(filters);
    setIsOpen(false);
  };

  const handleClear = () => {
    setFilters({
      dataProvaInicio: '',
      dataProvaFim: '',
      vagasMin: '',
      vagasMax: '',
      tags: [],
    });
    onClear();
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg flex items-center gap-2 transition-colors"
      >
        <Filter className="w-4 h-4" />
        Filtros Avançados
      </button>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Filter className="w-5 h-5" />
          Filtros Avançados
        </h3>
        <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            <Calendar className="w-4 h-4 inline mr-1" />
            Data da Prova (Início)
          </label>
          <input
            type="date"
            value={filters.dataProvaInicio}
            onChange={(e) => setFilters({ ...filters, dataProvaInicio: e.target.value })}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            <Calendar className="w-4 h-4 inline mr-1" />
            Data da Prova (Fim)
          </label>
          <input
            type="date"
            value={filters.dataProvaFim}
            onChange={(e) => setFilters({ ...filters, dataProvaFim: e.target.value })}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Vagas Mínimas
          </label>
          <input
            type="number"
            value={filters.vagasMin}
            onChange={(e) => setFilters({ ...filters, vagasMin: e.target.value })}
            placeholder="Ex: 10"
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Vagas Máximas
          </label>
          <input
            type="number"
            value={filters.vagasMax}
            onChange={(e) => setFilters({ ...filters, vagasMax: e.target.value })}
            placeholder="Ex: 1000"
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-6">
        <button
          onClick={handleClear}
          className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
        >
          Limpar
        </button>
        <button
          onClick={handleApply}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Aplicar Filtros
        </button>
      </div>
    </div>
  );
}
