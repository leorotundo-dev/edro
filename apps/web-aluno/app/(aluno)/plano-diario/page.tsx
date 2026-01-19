'use client';

import { useState } from 'react';
import { Card } from '@edro/ui';
import { Button } from '@edro/ui';
import { Badge } from '@edro/ui';
import { ProgressBar } from '@/components/ProgressBar';
import { Calendar, Clock, Target, TrendingUp, PlayCircle, CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';

interface PlanItem {
  id: string;
  type: 'drop' | 'srs' | 'question' | 'simulation';
  title: string;
  duration: number;
  difficulty: number;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  startTime?: string;
  completedAt?: string;
}

export default function PlanoDiarioPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  // Mock data - substituir com chamada real à API
  const dailyPlan: {
    date: string;
    totalDuration: number;
    targetScore: number;
    items: PlanItem[];
    stats: {
      completed: number;
      pending: number;
      totalMinutes: number;
      accuracy: number;
    };
  } = {
    date: selectedDate.toISOString().split('T')[0],
    totalDuration: 60,
    targetScore: 80,
    items: [
      {
        id: '1',
        type: 'drop' as const,
        title: 'Direitos Fundamentais - Conceitos Básicos',
        duration: 15,
        difficulty: 2,
        status: 'completed',
        startTime: '09:00',
        completedAt: '09:12',
      },
      {
        id: '2',
        type: 'srs' as const,
        title: 'Revisão SRS - 5 cards',
        duration: 10,
        difficulty: 3,
        status: 'completed',
        startTime: '09:15',
        completedAt: '09:22',
      },
      {
        id: '3',
        type: 'question' as const,
        title: 'Questões de Concordância Verbal',
        duration: 20,
        difficulty: 3,
        status: 'in_progress',
        startTime: '09:25',
      },
      {
        id: '4',
        type: 'drop' as const,
        title: 'Princípios da Administração Pública',
        duration: 15,
        difficulty: 4,
        status: 'pending',
      },
    ],
    stats: {
      completed: 2,
      pending: 2,
      totalMinutes: 22,
      accuracy: 85,
    },
  };

  const typeIcons = {
    drop: '💧',
    srs: '🔄',
    question: '❓',
    simulation: '📝',
  };

  const typeLabels = {
    drop: 'Drop',
    srs: 'Revisão SRS',
    question: 'Questões',
    simulation: 'Simulado',
  };

  const statusColors = {
    pending: 'gray',
    in_progress: 'warning',
    completed: 'success',
    skipped: 'danger',
  } as const;

  const statusIcons = {
    pending: Clock,
    in_progress: PlayCircle,
    completed: CheckCircle,
    skipped: XCircle,
  };

  const progress = (dailyPlan.stats.completed / dailyPlan.items.length) * 100;

  return (
    <div className="container mx-auto px-6 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-3">
              <Calendar className="w-8 h-8 text-primary-600" />
              <span>Plano Diário</span>
            </h1>
            <p className="text-gray-600 mt-1">
              {selectedDate.toLocaleDateString('pt-BR', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
          <Button variant="outline" size="md">
            📅 Escolher Data
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card padding="md" className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600 font-medium">Progresso</p>
              <p className="text-2xl font-bold text-blue-900 mt-1">
                {dailyPlan.stats.completed}/{dailyPlan.items.length}
              </p>
            </div>
            <Target className="w-10 h-10 text-blue-600 opacity-80" />
          </div>
        </Card>

        <Card padding="md" className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600 font-medium">Tempo Gasto</p>
              <p className="text-2xl font-bold text-green-900 mt-1">
                {dailyPlan.stats.totalMinutes} min
              </p>
            </div>
            <Clock className="w-10 h-10 text-green-600 opacity-80" />
          </div>
        </Card>

        <Card padding="md" className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-600 font-medium">Taxa de Acerto</p>
              <p className="text-2xl font-bold text-purple-900 mt-1">
                {dailyPlan.stats.accuracy}%
              </p>
            </div>
            <TrendingUp className="w-10 h-10 text-purple-600 opacity-80" />
          </div>
        </Card>

        <Card padding="md" className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-orange-600 font-medium">Meta de Tempo</p>
              <p className="text-2xl font-bold text-orange-900 mt-1">
                {dailyPlan.totalDuration} min
              </p>
            </div>
            <Target className="w-10 h-10 text-orange-600 opacity-80" />
          </div>
        </Card>
      </div>

      {/* Progress Bar */}
      <Card className="mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Progresso do Dia</h2>
        <ProgressBar
          value={dailyPlan.stats.completed}
          max={dailyPlan.items.length}
          label="Atividades"
          showPercentage
          color="primary"
          size="lg"
        />
        <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
          <span>{dailyPlan.stats.completed} de {dailyPlan.items.length} atividades completas</span>
          <span>{dailyPlan.stats.totalMinutes} de {dailyPlan.totalDuration} minutos</span>
        </div>
      </Card>

      {/* Plan Items */}
      <Card>
        <h2 className="text-xl font-bold text-gray-900 mb-6">Atividades do Dia</h2>
        
        <div className="space-y-4">
          {dailyPlan.items.map((item, index) => {
            const StatusIcon = statusIcons[item.status];
            
            return (
              <div
                key={item.id}
                className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
                  item.status === 'completed'
                    ? 'bg-green-50 border-green-200'
                    : item.status === 'in_progress'
                    ? 'bg-yellow-50 border-yellow-200'
                    : item.status === 'skipped'
                    ? 'bg-red-50 border-red-200'
                    : 'bg-white border-gray-200 hover:border-primary-300'
                }`}
              >
                <div className="flex items-center space-x-4 flex-1">
                  {/* Order Number */}
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold ${
                    item.status === 'completed'
                      ? 'bg-green-200 text-green-800'
                      : item.status === 'in_progress'
                      ? 'bg-yellow-200 text-yellow-800'
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {index + 1}
                  </div>

                  {/* Icon */}
                  <div className="text-3xl">{typeIcons[item.type]}</div>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <Badge variant="gray" size="sm">
                        {typeLabels[item.type]}
                      </Badge>
                      <Badge variant={statusColors[item.status]} size="sm">
                        <StatusIcon className="w-3 h-3 mr-1 inline" />
                        {item.status === 'completed' ? 'Completo' :
                         item.status === 'in_progress' ? 'Em Andamento' :
                         item.status === 'skipped' ? 'Pulado' : 'Pendente'}
                      </Badge>
                    </div>
                    <h3 className="font-semibold text-gray-900">{item.title}</h3>
                    <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                      <span className="flex items-center">
                        <Clock className="w-4 h-4 mr-1" />
                        {item.duration} min
                      </span>
                      <span>
                        Dificuldade: {'⭐'.repeat(item.difficulty)}
                      </span>
                      {item.startTime && (
                        <span>Iniciado às {item.startTime}</span>
                      )}
                      {item.completedAt && (
                        <span className="text-green-600 font-medium">
                          ✓ Completo às {item.completedAt}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2">
                  {item.status === 'pending' && (
                    <>
                      <Link href={`/${item.type}/${item.id}`}>
                        <Button variant="primary" size="sm">
                          <PlayCircle className="w-4 h-4 mr-1" />
                          Começar
                        </Button>
                      </Link>
                      <Button variant="outline" size="sm">
                        Pular
                      </Button>
                    </>
                  )}
                  {item.status === 'in_progress' && (
                    <Link href={`/${item.type}/${item.id}`}>
                      <Button variant="secondary" size="sm">
                        Continuar
                      </Button>
                    </Link>
                  )}
                  {item.status === 'completed' && (
                    <Link href={`/${item.type}/${item.id}`}>
                      <Button variant="outline" size="sm">
                        Revisar
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <div className="mt-8 pt-6 border-t">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">Resumo do Dia</h3>
              <p className="text-sm text-gray-600 mt-1">
                {dailyPlan.stats.completed} atividades completas • 
                {dailyPlan.stats.totalMinutes} minutos estudados • 
                {dailyPlan.stats.accuracy}% de acerto
              </p>
            </div>
            {progress === 100 ? (
              <Badge variant="success" size="md">
                🎉 Plano Completo!
              </Badge>
            ) : (
              <Badge variant="warning" size="md">
                {Math.round(progress)}% Completo
              </Badge>
            )}
          </div>
        </div>
      </Card>

      {/* Tips */}
      {progress < 100 && (
        <Card className="mt-6 bg-blue-50 border-blue-200">
          <div className="flex items-start space-x-3">
            <div className="text-2xl">💡</div>
            <div>
              <h3 className="font-semibold text-blue-900 mb-2">Dica do Dia</h3>
              <p className="text-sm text-blue-700">
                Mantenha o foco! Estudos mostram que sessões de 25 minutos 
                seguidas de 5 minutos de descanso (Técnica Pomodoro) aumentam 
                a retenção em até 40%.
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
