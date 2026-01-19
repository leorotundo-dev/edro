'use client';

import { useStats, useDiagnosis } from '@/lib/hooks';
import { Card } from '@edro/ui';
import { Badge } from '@edro/ui';
import { ProgressBar } from '@/components/ProgressBar';
import { 
  TrendingUp, 
  Target, 
  Zap, 
  Calendar, 
  BookOpen, 
  Award,
  Brain,
  Clock
} from 'lucide-react';

export default function ProgressoPage() {
  const { data: statsData, isLoading: statsLoading } = useStats();
  const { data: diagnosisData } = useDiagnosis();

  const stats = statsData?.data;
  const diagnosis = diagnosisData?.data;

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <TrendingUp className="w-8 h-8 mr-3 text-primary-600" />
          Seu Progresso
        </h1>
        <p className="text-gray-600 mt-1">
          Acompanhe sua evolução e desempenho
        </p>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Drops Estudados */}
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600 font-medium">Drops Estudados</p>
              <p className="text-3xl font-bold text-blue-900 mt-2">
                {stats?.total_drops_studied || 0}
              </p>
            </div>
            <BookOpen className="w-12 h-12 text-blue-600 opacity-80" />
          </div>
        </Card>

        {/* Tempo Total */}
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600 font-medium">Tempo de Estudo</p>
              <p className="text-3xl font-bold text-green-900 mt-2">
                {Math.floor((stats?.total_time_spent || 0) / 60)}h
              </p>
            </div>
            <Clock className="w-12 h-12 text-green-600 opacity-80" />
          </div>
        </Card>

        {/* Streak */}
        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-orange-600 font-medium">Sequência</p>
              <p className="text-3xl font-bold text-orange-900 mt-2">
                {stats?.current_streak || 0} dias
              </p>
            </div>
            <Zap className="w-12 h-12 text-orange-600 opacity-80" />
          </div>
        </Card>

        {/* Taxa de Acerto */}
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-600 font-medium">Taxa de Acerto</p>
              <p className="text-3xl font-bold text-purple-900 mt-2">
                {stats?.average_accuracy || 0}%
              </p>
            </div>
            <Target className="w-12 h-12 text-purple-600 opacity-80" />
          </div>
        </Card>
      </div>

      {/* Grid Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna Esquerda - Progresso Geral */}
        <div className="lg:col-span-2 space-y-6">
          {/* Cards SRS */}
          <Card>
            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
              <Calendar className="w-6 h-6 mr-2 text-primary-600" />
              Sistema de Repetição Espaçada
            </h3>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    Cards no Sistema
                  </span>
                  <span className="text-2xl font-bold text-gray-900">
                    {stats?.total_srs_cards || 0}
                  </span>
                </div>
                <ProgressBar
                  value={stats?.total_srs_cards || 0}
                  max={100}
                  showPercentage={false}
                  color="primary"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    Cards Pendentes
                  </span>
                  <span className="text-2xl font-bold text-orange-600">
                    {stats?.srs_cards_due || 0}
                  </span>
                </div>
                <ProgressBar
                  value={stats?.srs_cards_due || 0}
                  max={stats?.total_srs_cards || 1}
                  showPercentage={false}
                  color="warning"
                />
              </div>
            </div>
          </Card>

          {/* Domínio de Tópicos */}
          <Card>
            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
              <Brain className="w-6 h-6 mr-2 text-primary-600" />
              Domínio de Tópicos
            </h3>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    Tópicos Dominados
                  </span>
                  <Badge variant="success">
                    {stats?.topics_mastered || 0}
                  </Badge>
                </div>
                <ProgressBar
                  value={stats?.topics_mastered || 0}
                  max={20}
                  showPercentage={false}
                  color="success"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    Tópicos com Dificuldade
                  </span>
                  <Badge variant="warning">
                    {stats?.topics_weak || 0}
                  </Badge>
                </div>
                <ProgressBar
                  value={stats?.topics_weak || 0}
                  max={20}
                  showPercentage={false}
                  color="warning"
                />
              </div>
            </div>
          </Card>

          {/* Estado Cognitivo Atual */}
          {diagnosis && (
            <Card>
              <h3 className="text-xl font-bold text-gray-900 mb-6">
                Estado Cognitivo Atual
              </h3>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-700 font-medium">Foco</span>
                    <span className="font-semibold text-gray-900">
                      {diagnosis.cognitive.foco}/100
                    </span>
                  </div>
                  <ProgressBar 
                    value={diagnosis.cognitive.foco} 
                    showPercentage={false}
                    color={diagnosis.cognitive.foco > 70 ? 'success' : diagnosis.cognitive.foco > 40 ? 'primary' : 'warning'}
                  />
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-700 font-medium">Energia</span>
                    <span className="font-semibold text-gray-900">
                      {diagnosis.cognitive.energia}/100
                    </span>
                  </div>
                  <ProgressBar 
                    value={diagnosis.cognitive.energia} 
                    showPercentage={false}
                    color={diagnosis.cognitive.energia > 70 ? 'success' : diagnosis.cognitive.energia > 40 ? 'primary' : 'warning'}
                  />
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-700 font-medium">NEC (Nível Energia Cognitiva)</span>
                    <span className="font-semibold text-gray-900">
                      {Math.round(diagnosis.cognitive.nec)}/100
                    </span>
                  </div>
                  <ProgressBar 
                    value={diagnosis.cognitive.nec} 
                    showPercentage={false}
                    color="primary"
                  />
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Coluna Direita - Conquistas e Metas */}
        <div className="space-y-6">
          {/* Nível e XP */}
          <Card className="bg-gradient-to-br from-primary-50 to-primary-100 border-primary-200">
            <div className="text-center">
              <Award className="w-16 h-16 text-primary-600 mx-auto mb-4" />
              <h3 className="text-sm font-medium text-primary-700 mb-2">
                Seu Nível
              </h3>
              <p className="text-4xl font-bold text-primary-900 mb-4">
                {stats?.level || 1}
              </p>
              <div className="mb-2">
                <ProgressBar
                  value={stats?.xp || 0}
                  max={1000}
                  showPercentage={false}
                  color="primary"
                />
              </div>
              <p className="text-sm text-primary-700">
                {stats?.xp || 0} / 1000 XP
              </p>
            </div>
          </Card>

          {/* Conquistas Recentes */}
          <Card>
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
              <Award className="w-5 h-5 mr-2 text-yellow-600" />
              Conquistas
            </h3>

            <div className="space-y-3">
              {stats && stats.current_streak >= 7 && (
                <div className="flex items-start space-x-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <span className="text-2xl">🔥</span>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">
                      Sequência de 7 dias
                    </p>
                    <p className="text-xs text-gray-600">
                      Continue assim!
                    </p>
                  </div>
                </div>
              )}

              {stats && stats.total_drops_studied >= 10 && (
                <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <span className="text-2xl">📚</span>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">
                      10 Drops Estudados
                    </p>
                    <p className="text-xs text-gray-600">
                      Primeiro marco alcançado!
                    </p>
                  </div>
                </div>
              )}

              {stats && stats.average_accuracy >= 80 && (
                <div className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg border border-green-200">
                  <span className="text-2xl">🎯</span>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">
                      80% de Acerto
                    </p>
                    <p className="text-xs text-gray-600">
                      Excelente desempenho!
                    </p>
                  </div>
                </div>
              )}

              {(!stats || (stats.current_streak < 7 && stats.total_drops_studied < 10)) && (
                <div className="text-center py-6 text-gray-500">
                  <p className="text-sm">Continue estudando para desbloquear conquistas!</p>
                </div>
              )}
            </div>
          </Card>

          {/* Próximas Metas */}
          <Card>
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
              <Target className="w-5 h-5 mr-2 text-primary-600" />
              Próximas Metas
            </h3>

            <div className="space-y-3">
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-900">
                    Streak de 30 dias
                  </span>
                  <span className="text-xs text-gray-600">
                    {stats?.current_streak || 0}/30
                  </span>
                </div>
                <ProgressBar
                  value={stats?.current_streak || 0}
                  max={30}
                  showPercentage={false}
                  size="sm"
                />
              </div>

              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-900">
                    100 Drops Estudados
                  </span>
                  <span className="text-xs text-gray-600">
                    {stats?.total_drops_studied || 0}/100
                  </span>
                </div>
                <ProgressBar
                  value={stats?.total_drops_studied || 0}
                  max={100}
                  showPercentage={false}
                  size="sm"
                />
              </div>

              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-900">
                    50 Cards SRS
                  </span>
                  <span className="text-xs text-gray-600">
                    {stats?.total_srs_cards || 0}/50
                  </span>
                </div>
                <ProgressBar
                  value={stats?.total_srs_cards || 0}
                  max={50}
                  showPercentage={false}
                  size="sm"
                />
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
