'use client';

import { useState, useEffect } from 'react';
import { apiGet, apiPost, apiPatch, apiDelete } from '../../../lib/api';
import type { ApiResponse } from '../../../lib/api';
import { Button, StatCard } from '@edro/ui';
import {
  HelpCircle, Plus, Filter, Search, Edit, Trash2,
  CheckCircle, XCircle, Eye, TrendingUp, AlertCircle
} from 'lucide-react';

interface Question {
  id: string;
  discipline: string;
  topic: string;
  question_text: string;
  exam_board: string;
  difficulty: number;
  status: 'draft' | 'review' | 'published' | 'active' | 'rejected';
  created_at: string;
  usage_count: number;
  average_accuracy: number;
  ai_generated: boolean;
  quality_score?: number;
}

interface QuestionListResponse {
  questions: Question[];
  total: number;
  limit: number;
  offset: number;
}

export default function QuestoesAdminPage() {
  const [filter, setFilter] = useState<'all' | 'published' | 'review' | 'draft'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ total: 0, limit: 50, offset: 0 });

  useEffect(() => {
    loadQuestions();
  }, [filter]);

  const loadQuestions = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (filter !== 'all') {
        params.append('status', filter === 'published' ? 'active' : filter);
      }
      params.append('limit', pagination.limit.toString());

      const response = await apiGet<ApiResponse<QuestionListResponse>>(`/questions?${params.toString()}`);

      if (!response?.success || !response.data) {
        throw new Error(response?.error || 'Erro ao carregar questões');
      }

      const payload = response.data;
      setQuestions(payload.questions || []);
      setPagination({
        total: payload.total ?? payload.questions?.length ?? 0,
        limit: payload.limit ?? pagination.limit,
        offset: payload.offset ?? 0,
      });
    } catch (err) {
      console.error('Erro ao carregar questões:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar questões');
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (questionId: string, newStatus: string) => {
    try {
      const response = await apiPatch(`/questions/${questionId}`, {
        status: newStatus
      });
      
      if (response.success) {
        loadQuestions();
      }
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
    }
  };

  const handleDelete = async (questionId: string) => {
    if (!confirm('Deseja realmente arquivar esta questão?')) return;
    
    try {
      const response = await apiDelete(`/questions/${questionId}`);
      
      if (response.success) {
        loadQuestions();
      }
    } catch (err) {
      console.error('Erro ao deletar questão:', err);
    }
  };

  const generateQuestion = async () => {
    try {
      const response = await apiPost('/ai/questions/generate', {
        topic: 'Direitos Fundamentais',
        discipline: 'Direito Constitucional',
        examBoard: 'CESPE',
        difficulty: 3,
        saveToDatabase: true
      });
      
      if (response.success) {
        alert('Questão gerada com sucesso!');
        loadQuestions();
      }
    } catch (err) {
      console.error('Erro ao gerar questão:', err);
    }
  };

  const stats = {
    total: pagination.total || questions.length,
    published: questions.filter(q => q.status === 'published' || q.status === 'active').length,
    review: questions.filter(q => q.status === 'review').length,
    draft: questions.filter(q => q.status === 'draft').length,
    ai_generated: questions.filter(q => q.ai_generated).length,
    average_quality:
      questions.length > 0
        ? questions.reduce((sum, q) => sum + (q.quality_score || 0), 0) / questions.length
        : 0,
  };

  const filteredQuestions = questions.filter(q => {
    const status = q.status || 'draft';
    const matchesFilter =
      filter === 'all' ||
      status === filter ||
      (filter === 'published' && status === 'active');
    const term = searchTerm.toLowerCase();
    const text = q.question_text?.toLowerCase() || '';
    const discipline = q.discipline?.toLowerCase() || '';
    const topic = q.topic?.toLowerCase() || '';
    const matchesSearch =
      !term ||
      text.includes(term) ||
      discipline.includes(term) ||
      topic.includes(term);
    return matchesFilter && matchesSearch;
  });

  const statusColors = {
    draft: 'bg-gray-100 text-gray-700',
    review: 'bg-yellow-100 text-yellow-700',
    published: 'bg-green-100 text-green-700',
    active: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
  };

  const statusLabels = {
    draft: 'Rascunho',
    review: 'Em Revisão',
    published: 'Publicada',
    active: 'Ativa',
    rejected: 'Rejeitada',
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-3">
              <HelpCircle className="w-8 h-8 text-blue-600" />
              <span>Gestão de Questões</span>
            </h1>
            <p className="text-gray-600 mt-1">
              Gerenciar banco de questões e conteúdo gerado por IA
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nova Questão Manual
            </Button>
            <button
              onClick={generateQuestion}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center gap-2 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Gerar com IA
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-8">
        <StatCard
          label="Total"
          value={stats.total.toString()}
          icon={HelpCircle}
          color="blue"
        />
        <StatCard
          label="Publicadas"
          value={stats.published.toString()}
          icon={CheckCircle}
          color="green"
        />
        <StatCard
          label="Em Revisão"
          value={stats.review.toString()}
          icon={AlertCircle}
          color="orange"
        />
        <StatCard
          label="Rascunhos"
          value={stats.draft.toString()}
          icon={Edit}
          color="gray"
        />
        <StatCard
          label="IA Geradas"
          value={stats.ai_generated.toString()}
          icon={TrendingUp}
          color="purple"
        />
        <StatCard
          label="Qualidade Média"
          value={`${stats.average_quality.toFixed(0)}%`}
          icon={TrendingUp}
          color="indigo"
        />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center space-x-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar questões..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todas ({stats.total})</option>
              <option value="published">Publicadas ({stats.published})</option>
              <option value="review">Em Revisão ({stats.review})</option>
              <option value="draft">Rascunhos ({stats.draft})</option>
            </select>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Carregando questões...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 rounded-lg border border-red-200 p-6">
          <p className="text-red-600">{error}</p>
          <button
            onClick={loadQuestions}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Tentar Novamente
          </button>
        </div>
      )}

      {/* Questions Table */}
      {!loading && !error && (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Questão
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Banca
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Dificuldade
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Uso
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Taxa Acerto
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Qualidade
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredQuestions.map((question) => (
              <tr key={question.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-start space-x-3">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 line-clamp-2">
                        {question.question_text}
                      </p>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-xs text-gray-500">{question.discipline}</span>
                        <span className="text-xs text-gray-400">•</span>
                        <span className="text-xs text-gray-500">{question.topic}</span>
                        {question.ai_generated && (
                          <>
                            <span className="text-xs text-gray-400">•</span>
                            <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded">
                              IA
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-900">{question.exam_board}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <span className="text-sm text-gray-900">
                      {'⭐'.repeat(question.difficulty)}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[question.status] || 'bg-gray-100 text-gray-700'}`}>
                    {statusLabels[question.status] || question.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-900">{(question.usage_count ?? 0)}x</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {question.usage_count > 0 ? (
                    <span className={`text-sm font-medium ${
                      question.average_accuracy >= 80 ? 'text-green-600' :
                      question.average_accuracy >= 60 ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {question.average_accuracy}%
                    </span>
                  ) : (
                    <span className="text-sm text-gray-400">-</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {question.quality_score ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            question.quality_score >= 90 ? 'bg-green-500' :
                            question.quality_score >= 75 ? 'bg-yellow-500' :
                            'bg-red-500'
                          }`}
                          style={{ width: `${question.quality_score}%` }}
                        ></div>
                      </div>
                      <span className="text-xs text-gray-600">{question.quality_score}</span>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">-</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end space-x-2">
                    <button className="text-blue-600 hover:text-blue-900">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button className="text-gray-600 hover:text-gray-900">
                      <Edit className="w-4 h-4" />
                    </button>
                    {question.status === 'review' && (
                      <>
                        <button 
                          onClick={() => handleStatusChange(question.id, 'active')}
                          className="text-green-600 hover:text-green-900"
                          title="Aprovar"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleStatusChange(question.id, 'rejected')}
                          className="text-red-600 hover:text-red-900"
                          title="Rejeitar"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    <button 
                      onClick={() => handleDelete(question.id)}
                      className="text-red-600 hover:text-red-900"
                      title="Arquivar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}

      {/* Pagination */}
      <div className="mt-6 flex items-center justify-between">
        <p className="text-sm text-gray-700">
          Mostrando <span className="font-medium">{filteredQuestions.length}</span> de{' '}
          <span className="font-medium">{pagination.total || questions.length}</span> questões
        </p>
        <div className="flex space-x-2">
          <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
            Anterior
          </button>
          <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
            Próxima
          </button>
        </div>
      </div>
    </div>
  );
}
