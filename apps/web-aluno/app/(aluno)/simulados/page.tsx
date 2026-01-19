'use client';

import { useEffect, useState } from 'react';
import { Card } from '@edro/ui';
import { Button } from '@edro/ui';
import { Badge } from '@edro/ui';
import { DifficultyPill } from '@edro/ui';
import { ProgressBar } from '@/components/ProgressBar';
import {
  FileText, Clock, PlayCircle, Trophy, Target,
  TrendingUp, CheckCircle, BarChart, Volume2
} from 'lucide-react';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/api';
import { playTts } from '@/lib/tts';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

interface Simulado {
  id: string;
  title: string;
  description: string;
  exam_board: string;
  total_questions: number;
  duration_minutes: number;
  difficulty: number;
  topics: string[];
  status: 'not_started' | 'in_progress' | 'completed';
  progress?: number;
  executionId?: string | null;
  lastAttempt?: {
    resultId?: string;
    date: string;
    score: number;
    correctAnswers: number;
    timeSpent: number;
  };
}

export default function SimuladosPage() {
  const [filter, setFilter] = useState<'all' | 'available' | 'completed'>('all');
  const [ttsLoadingId, setTtsLoadingId] = useState<string | null>(null);

    const [simulados, setSimulados] = useState<Simulado[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadSimulados = async () => {
      try {
        setLoading(true);
        setError(null);
        const user = getCurrentUser();
        const userId = user?.id || user?.sub;
        if (!userId) {
          throw new Error('Usuario nao autenticado');
        }
        const token = typeof window !== 'undefined'
          ? localStorage.getItem('token') || localStorage.getItem('edro_token')
          : null;
        const res = await fetch(`${API_URL}/api/users/${userId}/simulados`, {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        const payload = await res.json();
        if (!res.ok || !payload.success) {
          throw new Error(payload?.error || 'Erro ao carregar simulados');
        }
        if (active) {
          setSimulados(payload.data || []);
        }
      } catch (err) {
        console.error('Erro ao carregar simulados:', err);
        if (active) {
          setError('Nao foi possivel carregar os simulados.');
          setSimulados([]);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadSimulados();
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-8 max-w-5xl">
        <Card className="p-6 text-center">
          <p className="text-gray-600">Carregando simulados...</p>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-6 py-8 max-w-5xl">
        <Card className="p-6 text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Erro ao carregar</h2>
          <p className="text-gray-600">{error}</p>
        </Card>
      </div>
    );
  }

  const filteredSimulados = simulados.filter(s => {
    if (filter === 'available') return s.status !== 'completed';
    if (filter === 'completed') return s.status === 'completed';
    return true;
  });

  const completedCount = simulados.filter(s => s.status === 'completed').length;
  const averageScore = simulados
    .filter(s => s.lastAttempt)
    .reduce((sum, s) => sum + (s.lastAttempt?.score || 0), 0) / completedCount || 0;

  const handleTts = async (simulado: Simulado) => {
    const parts = [
      simulado.title,
      simulado.description,
      `Banca ${simulado.exam_board}`,
      `Questoes ${simulado.total_questions}`,
      `Duracao ${simulado.duration_minutes} minutos`,
      simulado.topics.length ? `Topicos: ${simulado.topics.join(', ')}` : '',
    ].filter(Boolean);
    const ttsText = parts.join('\n');
    if (!ttsText) return;
    try {
      setTtsLoadingId(simulado.id);
      await playTts(ttsText);
    } catch (err) {
      console.error('Erro ao gerar audio:', err);
    } finally {
      setTtsLoadingId(null);
    }
  };

  return (
    <div className="container mx-auto px-6 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-3">
          <FileText className="w-8 h-8 text-primary-600" />
          <span>Simulados</span>
        </h1>
        <p className="text-gray-600 mt-1">
          Pratique com simulados completos de concursos
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card padding="md" className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600 font-medium">Total</p>
              <p className="text-2xl font-bold text-blue-900 mt-1">
                {simulados.length}
              </p>
            </div>
            <FileText className="w-10 h-10 text-blue-600 opacity-80" />
          </div>
        </Card>

        <Card padding="md" className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600 font-medium">Completos</p>
              <p className="text-2xl font-bold text-green-900 mt-1">
                {completedCount}
              </p>
            </div>
            <CheckCircle className="w-10 h-10 text-green-600 opacity-80" />
          </div>
        </Card>

        <Card padding="md" className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-600 font-medium">Média</p>
              <p className="text-2xl font-bold text-purple-900 mt-1">
                {averageScore > 0 ? averageScore.toFixed(0) : '--'}%
              </p>
            </div>
            <TrendingUp className="w-10 h-10 text-purple-600 opacity-80" />
          </div>
        </Card>

        <Card padding="md" className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-orange-600 font-medium">Melhor</p>
              <p className="text-2xl font-bold text-orange-900 mt-1">
                {completedCount > 0 ? Math.max(...simulados.filter(s => s.lastAttempt).map(s => s.lastAttempt!.score)) : '--'}%
              </p>
            </div>
            <Trophy className="w-10 h-10 text-orange-600 opacity-80" />
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-2 mb-6">
        <Button
          variant={filter === 'all' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setFilter('all')}
        >
          Todos ({simulados.length})
        </Button>
        <Button
          variant={filter === 'available' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setFilter('available')}
        >
          Disponíveis ({simulados.filter(s => s.status !== 'completed').length})
        </Button>
        <Button
          variant={filter === 'completed' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setFilter('completed')}
        >
          Completos ({completedCount})
        </Button>
      </div>

      {/* Simulados List */}
      <div className="grid grid-cols-1 gap-6">
        {filteredSimulados.map((simulado) => (
          <Card key={simulado.id} className="hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h2 className="text-xl font-bold text-gray-900">{simulado.title}</h2>
                  {simulado.status === 'completed' && (
                    <Badge variant="success" size="sm">
                      <CheckCircle className="w-3 h-3 mr-1 inline" />
                      Completo
                    </Badge>
                  )}
                  {simulado.status === 'in_progress' && (
                    <Badge variant="warning" size="sm">
                      <PlayCircle className="w-3 h-3 mr-1 inline" />
                      Em Andamento
                    </Badge>
                  )}
                </div>
                <p className="text-gray-600 text-sm mb-3">{simulado.description}</p>
                
                {/* Badges */}
                <div className="flex flex-wrap gap-2 mb-3">
                  <Badge variant="primary">{simulado.exam_board}</Badge>
                  <Badge variant="gray">
                    <Target className="w-3 h-3 mr-1 inline" />
                    {simulado.total_questions} questões
                  </Badge>
                  <Badge variant="gray">
                    <Clock className="w-3 h-3 mr-1 inline" />
                    {simulado.duration_minutes} min
                  </Badge>
                  <DifficultyPill level={simulado.difficulty} showLabel={false} />
                </div>

                {/* Topics */}
                <div className="flex flex-wrap gap-2">
                  {simulado.topics.map((topic, idx) => (
                    <Badge key={idx} variant="gray" size="sm">
                      {topic}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="ml-6">
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTts(simulado)}
                    disabled={ttsLoadingId === simulado.id}
                  >
                    <Volume2 className="w-4 h-4 mr-2" />
                    {ttsLoadingId === simulado.id ? 'Carregando' : 'Ouvir resumo'}
                  </Button>
                  {simulado.status === 'not_started' && (
                    <Link href={`/simulados/${simulado.id}`}>
                      <Button variant="primary" size="md">
                        <PlayCircle className="w-4 h-4 mr-2" />
                        Iniciar
                      </Button>
                    </Link>
                  )}
                  {simulado.status === 'in_progress' && (
                    <Link href={`/simulados/${simulado.id}`}>
                      <Button variant="secondary" size="md">
                        Continuar
                      </Button>
                    </Link>
                  )}
                  {simulado.status === 'completed' && (
                    <>
                      <Link href={`/simulados/${simulado.id}`}>
                        <Button variant="outline" size="md" className="w-full">
                          <BarChart className="w-4 h-4 mr-2" />
                          Ver Resultado
                        </Button>
                      </Link>
                      <Link href={`/simulados/${simulado.id}`}>
                        <Button variant="primary" size="md" className="w-full">
                          Refazer
                        </Button>
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Progress (if in progress) */}
            {simulado.status === 'in_progress' && simulado.progress && (
              <div className="mt-4 pt-4 border-t">
                <ProgressBar
                  value={simulado.progress}
                  max={100}
                  label="Progresso"
                  showPercentage
                  color="warning"
                  size="sm"
                />
              </div>
            )}

            {/* Last Attempt (if completed) */}
            {simulado.status === 'completed' && simulado.lastAttempt && (
              <div className="mt-4 pt-4 border-t">
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600 mb-1">Data</p>
                    <p className="font-semibold text-gray-900">
                      {new Date(simulado.lastAttempt.date).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 mb-1">Nota</p>
                    <p className="font-semibold text-green-600 text-lg">
                      {simulado.lastAttempt.score}%
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 mb-1">Acertos</p>
                    <p className="font-semibold text-gray-900">
                      {simulado.lastAttempt.correctAnswers}/{simulado.total_questions}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 mb-1">Tempo</p>
                    <p className="font-semibold text-gray-900">
                      {simulado.lastAttempt.timeSpent} min
                    </p>
                  </div>
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>

      {filteredSimulados.length === 0 && (
        <Card className="text-center py-12">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            Nenhum simulado encontrado
          </h3>
          <p className="text-gray-600">
            Tente alterar os filtros ou aguarde novos simulados.
          </p>
        </Card>
      )}
    </div>
  );
}
