'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Play, Pause, RefreshCw, Settings, CheckCircle, XCircle, Clock, AlertCircle, Eye } from 'lucide-react';
import { apiGet, apiPost, apiPut, ApiResponse } from '@/lib/api';

interface ScraperSource {
  id: string;
  name: string;
  base_url: string;
  type: 'edital' | 'questao' | 'conteudo';
  enabled: boolean;
  priority: number;
  last_run?: string;
  status?: 'idle' | 'running' | 'success' | 'error';
  items_harvested?: number;
  created_at: string;
}

interface HarvestedItem {
  id: string;
  source_id: string;
  source_name: string;
  content_type: string;
  title?: string;
  url: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  harvested_at: string;
}

interface ScraperStats {
  total_sources: number;
  active_sources: number;
  total_harvested: number;
  harvested_today: number;
  pending_items: number;
  failed_items: number;
}

// Bancas disponÃ­veis com informaÃ§Ãµes
const BANCAS_DISPONIVEIS = [
  {
    id: 'pci',
    name: 'PCI Concursos',
    tipo: 'agregador',
    status: 'active',
    cor: 'blue',
    descricao: 'Agregador universal - Todas as bancas',
    site: 'https://www.pciconcursos.com.br',
    funcionando: true,
    ultima_coleta: new Date().toISOString(),
    total_coletado: 190
  },
  {
    id: 'cebraspe',
    name: 'CEBRASPE',
    tipo: 'banca',
    status: 'ready',
    cor: 'purple',
    descricao: 'PolÃ­cia Federal, INSS, Banco Central',
    site: 'https://www.cebraspe.org.br',
    funcionando: false,
    ultima_coleta: null,
    total_coletado: 0
  },
  {
    id: 'fcc',
    name: 'FCC',
    tipo: 'banca',
    status: 'ready',
    cor: 'indigo',
    descricao: 'TRF, TRT, TJ-SP',
    site: 'https://www.concursosfcc.com.br',
    funcionando: false,
    ultima_coleta: null,
    total_coletado: 0
  },
  {
    id: 'fgv',
    name: 'FGV',
    tipo: 'banca',
    status: 'ready',
    cor: 'green',
    descricao: 'TCE, MPU, Detran',
    site: 'https://conhecimento.fgv.br',
    funcionando: false,
    ultima_coleta: null,
    total_coletado: 0
  },
  {
    id: 'vunesp',
    name: 'VUNESP',
    tipo: 'banca',
    status: 'ready',
    cor: 'orange',
    descricao: 'TJ-SP, PM-SP, Prefeituras',
    site: 'https://www.vunesp.com.br',
    funcionando: false,
    ultima_coleta: null,
    total_coletado: 0
  },
  {
    id: 'demo',
    name: 'Demo Scraper',
    tipo: 'demo',
    status: 'active',
    cor: 'gray',
    descricao: 'Dados simulados para testes',
    site: 'demo.edro.digital',
    funcionando: true,
    ultima_coleta: new Date().toISOString(),
    total_coletado: 5
  }
];

export default function ScrapersPage() {
  const router = useRouter();
  const [sources, setSources] = useState<ScraperSource[]>([]);
  const [harvestedItems, setHarvestedItems] = useState<HarvestedItem[]>([]);
  const [stats, setStats] = useState<ScraperStats>({
    total_sources: BANCAS_DISPONIVEIS.length,
    active_sources: BANCAS_DISPONIVEIS.filter(b => b.funcionando).length,
    total_harvested: BANCAS_DISPONIVEIS.reduce((sum, b) => sum + b.total_coletado, 0),
    harvested_today: 0,
    pending_items: 0,
    failed_items: 0,
  });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'bancas' | 'sources' | 'harvested'>('bancas');
  const [runningScrapers, setRunningScrapers] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); // Atualizar a cada 30s
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      const [sourcesData, contentData] = await Promise.all([
        apiGet<ApiResponse<ScraperSource[]>>('/harvest/sources'),
        apiGet<ApiResponse<HarvestedItem[]>>('/harvest/content?limit=20'),
      ]);

      const fetchedSources = Array.isArray(sourcesData.data) ? sourcesData.data : [];
      const fetchedItems = Array.isArray(contentData.data) ? contentData.data : [];

      setSources(fetchedSources);
      setHarvestedItems(fetchedItems);

      const today = new Date().toISOString().split('T')[0];
      const harvestedToday = fetchedItems.filter((item) => item.harvested_at?.startsWith(today)).length;
      const pendingItems = fetchedItems.filter((item) => item.status === 'pending').length;
      const failedItems = fetchedItems.filter((item) => item.status === 'failed').length;

      setStats({
        total_sources: fetchedSources.length,
        active_sources: fetchedSources.filter((source) => source.enabled).length,
        total_harvested: fetchedItems.length,
        harvested_today: harvestedToday,
        pending_items: pendingItems,
        failed_items: failedItems,
      });
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const runScraper = async (sourceId: string) => {
    try {
      setRunningScrapers(prev => new Set(prev).add(sourceId));

      const data = await apiPost<ApiResponse<{ harvested_count: number }>>(`/harvest/run/${sourceId}`, {
        limit: 20,
      });

      if (data.success && data.data) {
        alert(`Scraper executado! ${data.data.harvested_count} itens coletados.`);
        loadData();
      } else {
        alert('Erro ao executar scraper: ' + (data.error || data.message || 'Resposta inválida'));
      }
    } catch (error) {
      console.error('Erro ao executar scraper:', error);
      alert('Erro ao executar scraper');
    } finally {
      setRunningScrapers(prev => {
        const newSet = new Set(prev);
        newSet.delete(sourceId);
        return newSet;
      });
    }
  };

  const runAllScrapers = async () => {
    try {
      const data = await apiPost<ApiResponse<{ total_harvested: number }>>('/harvest/run-all', {
        limit: 10,
      });

      if (data.success && data.data) {
        alert(`Todos os scrapers executados! ${data.data.total_harvested} itens coletados.`);
        loadData();
      } else {
        alert('Erro ao executar scrapers: ' + (data.error || data.message || 'Resposta inválida'));
      }
    } catch (error) {
      console.error('Erro:', error);
      alert('Erro ao executar todos os scrapers');
    }
  };

  const toggleSource = async (sourceId: string, currentEnabled: boolean) => {
    try {
      const data = await apiPut<ApiResponse<ScraperSource>>(`/harvest/sources/${sourceId}`, {
        enabled: !currentEnabled,
      });

      if (data.success) {
        loadData();
      } else {
        alert('Erro ao atualizar fonte: ' + (data.error || data.message || 'Resposta inválida'));
      }
    } catch (error) {
      console.error('Erro:', error);
      alert('Erro ao atualizar fonte');
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'running':
        return <span className="px-2 py-1 text-xs bg-blue-500/20 text-blue-400 rounded-full flex items-center gap-1">
          <Clock className="w-3 h-3" /> Executando
        </span>;
      case 'success':
        return <span className="px-2 py-1 text-xs bg-green-500/20 text-green-400 rounded-full flex items-center gap-1">
          <CheckCircle className="w-3 h-3" /> Sucesso
        </span>;
      case 'error':
        return <span className="px-2 py-1 text-xs bg-red-500/20 text-red-400 rounded-full flex items-center gap-1">
          <XCircle className="w-3 h-3" /> Erro
        </span>;
      default:
        return <span className="px-2 py-1 text-xs bg-slate-100 text-slate-600 rounded-full flex items-center gap-1">
          <Pause className="w-3 h-3" /> Inativo
        </span>;
    }
  };

  const getTypeBadge = (type: string) => {
    const colors = {
      edital: 'bg-purple-500/20 text-purple-400',
      questao: 'bg-blue-500/20 text-blue-400',
      conteudo: 'bg-green-500/20 text-green-400',
    };
    return <span className={`px-2 py-1 text-xs rounded-full ${colors[type as keyof typeof colors] || 'bg-slate-100 text-slate-600'}`}>
      {type}
    </span>;
  };

  const getCoresBanca = (cor: string) => {
    const cores = {
      blue: 'from-blue-500 to-blue-600 border-blue-200',
      purple: 'from-purple-500 to-purple-600 border-purple-200',
      indigo: 'from-indigo-500 to-indigo-600 border-indigo-200',
      green: 'from-green-500 to-green-600 border-green-200',
      orange: 'from-orange-500 to-orange-600 border-orange-200',
      gray: 'from-slate-500 to-slate-600 border-slate-200',
    };
    return cores[cor as keyof typeof cores] || cores.blue;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
            </div>
            Scrapers
          </h1>
          <p className="text-slate-600 mt-2">
            Gerenciamento de coleta automatizada de editais de concursos
          </p>
        </div>
        <button
          onClick={runAllScrapers}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center gap-2 transition-colors shadow-sm font-medium"
        >
          <Play className="w-4 h-4" />
          Executar Todos
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-4">
          <div className="text-sm text-slate-600">Total de Fontes</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{stats.total_sources}</div>
        </div>
        <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-4">
          <div className="text-sm text-slate-600">Fontes Ativas</div>
          <div className="text-2xl font-bold text-green-400 mt-1">{stats.active_sources}</div>
        </div>
        <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-4">
          <div className="text-sm text-slate-600">Total Coletado</div>
          <div className="text-2xl font-bold text-blue-400 mt-1">{stats.total_harvested}</div>
        </div>
        <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-4">
          <div className="text-sm text-slate-600">Hoje</div>
          <div className="text-2xl font-bold text-purple-400 mt-1">{stats.harvested_today}</div>
        </div>
        <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-4">
          <div className="text-sm text-slate-600">Pendentes</div>
          <div className="text-2xl font-bold text-yellow-400 mt-1">{stats.pending_items}</div>
        </div>
        <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-4">
          <div className="text-sm text-slate-600">Erros</div>
          <div className="text-2xl font-bold text-red-400 mt-1">{stats.failed_items}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('bancas')}
            className={`pb-3 px-2 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'bancas'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Bancas ({BANCAS_DISPONIVEIS.length})
          </button>
          <button
            onClick={() => setActiveTab('sources')}
            className={`pb-3 px-2 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'sources'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Fontes ({sources.length})
          </button>
          <button
            onClick={() => setActiveTab('harvested')}
            className={`pb-3 px-2 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'harvested'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Itens Coletados ({harvestedItems.length})
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-6 h-6 text-blue-600 animate-spin" />
          <span className="ml-2 text-slate-600">Carregando...</span>
        </div>
      ) : (
        <>
          {/* Bancas Tab */}
          {activeTab === 'bancas' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {BANCAS_DISPONIVEIS.map((banca) => (
                <div
                  key={banca.id}
                  className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all"
                >
                  {/* Header com gradiente */}
                  <div className={`bg-gradient-to-r ${getCoresBanca(banca.cor)} p-6 text-white`}>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-xl font-bold">{banca.name}</h3>
                        <p className="text-white/90 text-sm mt-1">{banca.descricao}</p>
                      </div>
                      {banca.funcionando && (
                        <CheckCircle className="w-6 h-6" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-white/80 text-xs">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                      </svg>
                      <span className="truncate">{banca.site}</span>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-6 space-y-4">
                    {/* Status */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Status:</span>
                      {banca.funcionando ? (
                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          Funcional
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                          Pronto para testar
                        </span>
                      )}
                    </div>

                    {/* EstatÃ­sticas */}
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200">
                      <div>
                        <div className="text-2xl font-bold text-slate-900">{banca.total_coletado}</div>
                        <div className="text-xs text-slate-500">Editais coletados</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-slate-900">
                          {banca.ultima_coleta ? new Date(banca.ultima_coleta).toLocaleDateString('pt-BR') : '-'}
                        </div>
                        <div className="text-xs text-slate-500">Ãšltima coleta</div>
                      </div>
                    </div>

                    {/* Badge de tipo */}
                    <div className="flex items-center gap-2">
                      {banca.tipo === 'agregador' && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                          Agregador
                        </span>
                      )}
                      {banca.tipo === 'banca' && (
                        <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                          Banca Oficial
                        </span>
                      )}
                      {banca.tipo === 'demo' && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                          Demo
                        </span>
                      )}
                    </div>

                    {/* AÃ§Ãµes */}
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => router.push(`/admin/scrapers/${banca.id}`)}
                        className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        Detalhes
                      </button>
                      <button
                        onClick={() => runScraper(banca.id)}
                        disabled={runningScrapers.has(banca.id)}
                        className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {runningScrapers.has(banca.id) ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            Executando
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4" />
                            Executar
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Sources Tab */}
          {activeTab === 'sources' && (
            <div className="space-y-4">
              {sources.length === 0 ? (
                <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-8 text-center">
                  <AlertCircle className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                  <p className="text-slate-600">Nenhuma fonte configurada</p>
                  <p className="text-sm text-slate-9000 mt-1">Configure fontes de scraping para comeÃ§ar</p>
                </div>
              ) : (
                sources.map((source) => (
                  <div
                    key={source.id}
                    className="bg-white border border-slate-200 shadow-sm rounded-xl p-5 hover:border-slate-300 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-slate-900">{source.name}</h3>
                          {getTypeBadge(source.type)}
                          {getStatusBadge(source.status)}
                        </div>
                        <p className="text-sm text-slate-600 mb-3">{source.base_url}</p>
                        <div className="flex items-center gap-4 text-xs text-slate-9000">
                          {source.last_run && (
                            <span>Ãšltima execuÃ§Ã£o: {new Date(source.last_run).toLocaleString('pt-BR')}</span>
                          )}
                          {source.items_harvested !== undefined && (
                            <span>Itens coletados: {source.items_harvested}</span>
                          )}
                          <span>Prioridade: {source.priority}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleSource(source.id, source.enabled)}
                          className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                            source.enabled
                              ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                              : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          {source.enabled ? 'Ativo' : 'Inativo'}
                        </button>
                        <button
                          onClick={() => runScraper(source.id)}
                          disabled={runningScrapers.has(source.id) || !source.enabled}
                          className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {runningScrapers.has(source.id) ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              Executando...
                            </>
                          ) : (
                            <>
                              <Play className="w-4 h-4" />
                              Executar
                            </>
                          )}
                        </button>
                        <button className="p-2 hover:bg-slate-50 rounded-xl transition-colors">
                          <Settings className="w-4 h-4 text-slate-600" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Harvested Items Tab */}
          {activeTab === 'harvested' && (
            <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
              {harvestedItems.length === 0 ? (
                <div className="p-8 text-center">
                  <AlertCircle className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                  <p className="text-slate-600">Nenhum item coletado ainda</p>
                  <p className="text-sm text-slate-9000 mt-1">Execute os scrapers para comeÃ§ar a coletar conteÃºdo</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-medium text-slate-600 uppercase">Fonte</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-slate-600 uppercase">Tipo</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-slate-600 uppercase">TÃ­tulo/URL</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-slate-600 uppercase">Status</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-slate-600 uppercase">Data</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {harvestedItems.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 text-sm text-slate-600">{item.source_name}</td>
                          <td className="px-6 py-4 text-sm">{getTypeBadge(item.content_type)}</td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-slate-600">{item.title || 'Sem tÃ­tulo'}</div>
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-400 hover:underline"
                            >
                              {item.url}
                            </a>
                          </td>
                          <td className="px-6 py-4 text-sm">{getStatusBadge(item.status)}</td>
                          <td className="px-6 py-4 text-sm text-slate-600">
                            {new Date(item.harvested_at).toLocaleString('pt-BR')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
