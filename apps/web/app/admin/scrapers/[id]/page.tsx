'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Play, RefreshCw, CheckCircle, XCircle, Clock, Download, ExternalLink, Calendar, TrendingUp, Activity } from 'lucide-react';

interface ScraperDetails {
  id: string;
  name: string;
  tipo: string;
  status: string;
  cor: string;
  descricao: string;
  site: string;
  funcionando: boolean;
  ultima_coleta: string | null;
  total_coletado: number;
}

interface EditalColetado {
  id: string;
  titulo: string;
  url: string;
  banca: string;
  data_abertura: string;
  data_inscricao: string;
  status: 'novo' | 'processado' | 'erro';
  coletado_em: string;
}

export default function ScraperDetailPage() {
  const params = useParams();
  const router = useRouter();
  const scraperId = params.id as string;
  
  const [scraper, setScraper] = useState<ScraperDetails | null>(null);
  const [editais, setEditais] = useState<EditalColetado[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    loadData();
  }, [scraperId]);

  const loadData = async () => {
    setLoading(true);
    
    // Mock data - substituir por API real
    const mockScraper: ScraperDetails = {
      id: scraperId,
      name: scraperId === 'pci' ? 'PCI Concursos' : scraperId.toUpperCase(),
      tipo: scraperId === 'pci' ? 'agregador' : 'banca',
      status: 'active',
      cor: 'blue',
      descricao: 'Agregador universal de editais',
      site: `https://www.${scraperId}.com.br`,
      funcionando: true,
      ultima_coleta: new Date().toISOString(),
      total_coletado: 190
    };

    const mockEditais: EditalColetado[] = [
      {
        id: '1',
        titulo: 'Polícia Federal - Agente',
        url: 'https://www.pciconcursos.com.br/concurso/policia-federal-pf-2824-vagas',
        banca: 'CEBRASPE',
        data_abertura: '2024-12-01',
        data_inscricao: '2024-12-15',
        status: 'processado',
        coletado_em: '2024-12-06T10:30:00Z'
      },
      {
        id: '2',
        titulo: 'TRF 3ª Região - Analista Judiciário',
        url: 'https://www.pciconcursos.com.br/concurso/trf-3-regiao-180-vagas',
        banca: 'FCC',
        data_abertura: '2024-11-20',
        data_inscricao: '2024-12-10',
        status: 'novo',
        coletado_em: '2024-12-06T09:15:00Z'
      },
      {
        id: '3',
        titulo: 'INSS - Técnico do Seguro Social',
        url: 'https://www.pciconcursos.com.br/concurso/inss-1000-vagas',
        banca: 'CEBRASPE',
        data_abertura: '2024-11-15',
        data_inscricao: '2024-12-05',
        status: 'processado',
        coletado_em: '2024-12-05T14:20:00Z'
      }
    ];

    setScraper(mockScraper);
    setEditais(mockEditais);
    setLoading(false);
  };

  const runScraper = async () => {
    setRunning(true);
    // Simular execução
    setTimeout(() => {
      setRunning(false);
      alert('Scraper executado com sucesso! 5 novos editais coletados.');
      loadData();
    }, 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Carregando scraper...</p>
        </div>
      </div>
    );
  }

  if (!scraper) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-slate-900">Scraper não encontrado</h1>
        <button
          onClick={() => router.push('/admin/scrapers')}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
        >
          Voltar para Scrapers
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={() => router.push('/admin/scrapers')}
        className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm font-medium">Voltar para Scrapers</span>
      </button>

      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white text-2xl font-bold shadow-lg">
              {scraper.name[0]}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{scraper.name}</h1>
              <p className="text-slate-600 mt-1">{scraper.descricao}</p>
              <a
                href={scraper.site}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline flex items-center gap-1 mt-2"
              >
                <ExternalLink className="w-3 h-3" />
                {scraper.site}
              </a>
            </div>
          </div>
          <button
            onClick={runScraper}
            disabled={running}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {running ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                Executando...
              </>
            ) : (
              <>
                <Play className="w-5 h-5" />
                Executar Agora
              </>
            )}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-700">Total Coletado</span>
            <TrendingUp className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-3xl font-bold text-blue-900">{scraper.total_coletado}</div>
          <p className="text-xs text-blue-600 mt-1">editais no sistema</p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-green-700">Status</span>
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-lg font-bold text-green-900">
            {scraper.funcionando ? 'Funcional' : 'Inativo'}
          </div>
          <p className="text-xs text-green-600 mt-1">operacional</p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-purple-700">Tipo</span>
            <Activity className="w-5 h-5 text-purple-600" />
          </div>
          <div className="text-lg font-bold text-purple-900 capitalize">{scraper.tipo}</div>
          <p className="text-xs text-purple-600 mt-1">categoria</p>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-orange-700">Última Coleta</span>
            <Clock className="w-5 h-5 text-orange-600" />
          </div>
          <div className="text-sm font-bold text-orange-900">
            {scraper.ultima_coleta ? new Date(scraper.ultima_coleta).toLocaleDateString('pt-BR') : 'Nunca'}
          </div>
          <p className="text-xs text-orange-600 mt-1">última execução</p>
        </div>
      </div>

      {/* Editais Coletados */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Editais Coletados ({editais.length})</h2>
          <button className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
            <Download className="w-4 h-4" />
            Exportar
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Título</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Banca</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Coletado em</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {editais.map((edital) => (
                <tr key={edital.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-slate-900">{edital.titulo}</div>
                      <a
                        href={edital.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Ver original
                      </a>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{edital.banca}</td>
                  <td className="px-6 py-4">
                    {edital.status === 'processado' && (
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium flex items-center gap-1 w-fit">
                        <CheckCircle className="w-3 h-3" />
                        Processado
                      </span>
                    )}
                    {edital.status === 'novo' && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium flex items-center gap-1 w-fit">
                        <Clock className="w-3 h-3" />
                        Novo
                      </span>
                    )}
                    {edital.status === 'erro' && (
                      <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium flex items-center gap-1 w-fit">
                        <XCircle className="w-3 h-3" />
                        Erro
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {new Date(edital.coletado_em).toLocaleString('pt-BR')}
                  </td>
                                    <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => router.push(`/admin/editais/${edital.id}`)}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Ver detalhes
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}