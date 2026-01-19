'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Edital {
  id: string;
  codigo: string;
  titulo: string;
  orgao: string;
  banca?: string;
  status: 'rascunho' | 'publicado' | 'em_andamento' | 'suspenso' | 'cancelado' | 'concluido';
  data_publicacao?: string;
  data_prova_prevista?: string;
  numero_vagas: number;
  numero_inscritos: number;
  tags: string[];
  created_at: string;
}

const statusColors = {
  rascunho: 'bg-gray-100 text-gray-800',
  publicado: 'bg-blue-100 text-blue-800',
  em_andamento: 'bg-green-100 text-green-800',
  suspenso: 'bg-yellow-100 text-yellow-800',
  cancelado: 'bg-red-100 text-red-800',
  concluido: 'bg-purple-100 text-purple-800',
};

const statusLabels = {
  rascunho: 'Rascunho',
  publicado: 'Publicado',
  em_andamento: 'Em Andamento',
  suspenso: 'Suspenso',
  cancelado: 'Cancelado',
  concluido: 'Concluido',
};

export default function EditaisPage() {
  const router = useRouter();
  const [editais, setEditais] = useState<Edital[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [bancaFilter, setBancaFilter] = useState<string>('all');

  const [stats, setStats] = useState({
    total: 0,
    porStatus: {} as Record<string, number>,
    porBanca: {} as Record<string, number>,
  });

  useEffect(() => {
    loadEditais();
    loadStats();
  }, []);

  const loadEditais = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/proxy/editais');
      const data = await response.json();
      
      if (data.success) {
        setEditais(data.data);
      }
    } catch (error) {
      console.error('Erro ao carregar editais:', error);
      setEditais([]);
      setStats({
        total: 0,
        porStatus: {},
        porBanca: {}
      });
      setError(error instanceof Error ? error.message : 'Nao foi possivel carregar os editais');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const [statusRes, bancaRes] = await Promise.all([
        fetch('/api/proxy/editais/reports/by-status'),
        fetch('/api/proxy/editais/reports/by-banca'),
      ]);

      const statusData = await statusRes.json();
      const bancaData = await bancaRes.json();

      if (statusData.success && bancaData.success) {
        const porStatus = statusData.data.reduce((acc: Record<string, number>, item: any) => {
          acc[item.status] = parseInt(item.count);
          return acc;
        }, {} as Record<string, number>);

        const porBanca = bancaData.data.reduce((acc: Record<string, number>, item: any) => {
          acc[item.banca] = parseInt(item.count);
          return acc;
        }, {} as Record<string, number>);

        const total = (Object.values(porStatus) as number[]).reduce((sum, val) => sum + val, 0);

        setStats({ total, porStatus, porBanca });
      }
    } catch (error) {
      console.error('Erro ao carregar estatisticas:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir este edital?')) return;

    try {
      const response = await fetch(`/api/proxy/editais/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        alert('Edital excluído com sucesso!');
        loadEditais();
        loadStats();
      } else {
        alert('Erro ao excluir edital: ' + data.error);
      }
    } catch (error) {
      console.error('Erro ao excluir edital:', error);
      alert('Erro ao excluir edital');
    }
  };

  const filteredEditais = editais.filter((edital) => {
    const matchesSearch =
      searchTerm === '' ||
      edital.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      edital.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      edital.orgao.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || edital.status === statusFilter;
    const matchesBanca = bancaFilter === 'all' || edital.banca === bancaFilter;

    return matchesSearch && matchesStatus && matchesBanca;
  });

  const bancas = Array.from(new Set(editais.map((e) => e.banca).filter(Boolean)));

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Gestão de Editais</h1>
              <p className="mt-2 text-gray-600">
                Gerencie editais de concursos públicos
              </p>
            </div>
            <button
              onClick={() => router.push('/admin/editais/novo')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
            >
              + Novo Edital
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex flex-wrap items-start justify-between gap-3">
            <span>{error}</span>
            <button
              onClick={loadEditais}
              className="px-3 py-1.5 bg-red-600 text-white rounded-md text-xs font-semibold"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-2">Total de Editais</div>
            <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-2">Em Andamento</div>
            <div className="text-3xl font-bold text-green-600">
              {stats.porStatus['em_andamento'] || 0}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-2">Publicados</div>
            <div className="text-3xl font-bold text-blue-600">
              {stats.porStatus['publicado'] || 0}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-2">Concluídos</div>
            <div className="text-3xl font-bold text-purple-600">
              {stats.porStatus['concluido'] || 0}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Buscar
              </label>
              <input
                type="text"
                placeholder="Código, título ou órgão..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Todos</option>
                {Object.entries(statusLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Banca
              </label>
              <select
                value={bancaFilter}
                onChange={(e) => setBancaFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Todas</option>
                {bancas.map((banca) => (
                  <option key={banca} value={banca}>
                    {banca}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-600">Carregando editais...</p>
            </div>
          ) : filteredEditais.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <p className="text-lg">Nenhum edital encontrado</p>
              <p className="text-sm mt-2">Tente ajustar os filtros ou criar um novo edital</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Código
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Título
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Órgão
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Banca
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data da Prova
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Vagas
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredEditais.map((edital) => (
                    <tr key={edital.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {edital.codigo}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                        {edital.titulo}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {edital.orgao}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {edital.banca || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            statusColors[edital.status]
                          }`}
                        >
                          {statusLabels[edital.status]}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {edital.data_prova_prevista
                          ? new Date(edital.data_prova_prevista).toLocaleDateString('pt-BR')
                          : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {edital.numero_vagas}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => router.push(`/admin/editais/${edital.id}`)}
                          className="text-blue-600 hover:text-blue-900 mr-4"
                        >
                          Ver
                        </button>
                        <button
                          onClick={() => router.push(`/admin/editais/${edital.id}/editar`)}
                          className="text-green-600 hover:text-green-900 mr-4"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(edital.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Excluir
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Summary */}
        {!loading && filteredEditais.length > 0 && (
          <div className="mt-4 text-sm text-gray-600 text-center">
            Mostrando {filteredEditais.length} de {editais.length} editais
          </div>
        )}
      </div>
    </div>
  );
}
