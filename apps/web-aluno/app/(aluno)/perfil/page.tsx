'use client';

import { Card } from '@edro/ui';
import { Button } from '@edro/ui';
import { Badge } from '@edro/ui';
import { ProgressBar } from '@/components/ProgressBar';
import {
  User, Mail, Calendar, Award, TrendingUp, Target,
  Clock, Flame, CheckCircle, BookOpen, Edit, Trophy
} from 'lucide-react';

export default function PerfilPage() {
  // Mock data
  const user = {
    name: 'João Silva',
    email: 'joao.silva@example.com',
    avatar: null,
    memberSince: '2024-06-15',
    plan: 'Premium',
    targetExam: 'TRF - Analista Judiciário',
    examDate: '2025-06-15',
  };

  const stats = {
    studyDays: 145,
    currentStreak: 23,
    longestStreak: 45,
    totalMinutes: 8750,
    dropsCompleted: 456,
    questionsAnswered: 892,
    averageAccuracy: 78,
    simulationsTaken: 12,
    mnemonicsCreated: 8,
  };

  const achievements = [
    { id: 1, name: 'Primeiro Passo', description: 'Complete seu primeiro drop', unlocked: true, icon: '🎯' },
    { id: 2, name: 'Sequência de 7 dias', description: 'Estude por 7 dias seguidos', unlocked: true, icon: '🔥' },
    { id: 3, name: 'Mestre das Questões', description: 'Responda 1000 questões', unlocked: false, progress: 89, icon: '❓' },
    { id: 4, name: 'Perfeccionista', description: 'Acerte 100% em um simulado', unlocked: false, icon: '💯' },
    { id: 5, name: 'Maratonista', description: 'Estude por 100 dias', unlocked: true, icon: '🏃' },
    { id: 6, name: 'Expert', description: 'Alcance 90% de média', unlocked: false, progress: 87, icon: '🧠' },
  ];

  const recentActivity = [
    { date: '2025-01-15', type: 'drop', title: 'Direitos Fundamentais', score: 85 },
    { date: '2025-01-15', type: 'srs', title: 'Revisão SRS', score: 92 },
    { date: '2025-01-14', type: 'questions', title: '20 questões de Português', score: 75 },
    { date: '2025-01-14', type: 'simulation', title: 'Simulado CESPE', score: 78 },
    { date: '2025-01-13', type: 'drop', title: 'Princípios Administrativos', score: 88 },
  ];

  const disciplineProgress = [
    { name: 'Direito Constitucional', progress: 75, color: 'blue' },
    { name: 'Direito Administrativo', progress: 62, color: 'green' },
    { name: 'Língua Portuguesa', progress: 85, color: 'purple' },
    { name: 'Informática', progress: 45, color: 'orange' },
    { name: 'Raciocínio Lógico', progress: 55, color: 'pink' },
  ];

  const daysUntilExam = Math.ceil((new Date(user.examDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  const avgStudyTimePerDay = Math.round(stats.totalMinutes / stats.studyDays);

  return (
    <div className="container mx-auto px-6 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-3">
          <User className="w-8 h-8 text-primary-600" />
          <span>Meu Perfil</span>
        </h1>
        <p className="text-gray-600 mt-1">
          Acompanhe seu progresso e estatísticas de estudo
        </p>
      </div>

      {/* User Info Card */}
      <Card className="mb-8">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-6">
            {/* Avatar */}
            <div className="flex-shrink-0">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white text-3xl font-bold">
                {user.name.charAt(0)}
              </div>
            </div>

            {/* Info */}
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{user.name}</h2>
              <div className="space-y-2 text-sm text-gray-600">
                <p className="flex items-center">
                  <Mail className="w-4 h-4 mr-2" />
                  {user.email}
                </p>
                <p className="flex items-center">
                  <Calendar className="w-4 h-4 mr-2" />
                  Membro desde {new Date(user.memberSince).toLocaleDateString('pt-BR')}
                </p>
                <p className="flex items-center">
                  <Target className="w-4 h-4 mr-2" />
                  {user.targetExam} • {daysUntilExam} dias restantes
                </p>
              </div>
              <div className="mt-3">
                <Badge variant="primary" size="md">
                  Plano {user.plan}
                </Badge>
              </div>
            </div>
          </div>

          {/* Edit Button */}
          <Button variant="outline" size="md">
            <Edit className="w-4 h-4 mr-2" />
            Editar
          </Button>
        </div>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card padding="md" className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600 font-medium">Dias de Estudo</p>
              <p className="text-2xl font-bold text-blue-900 mt-1">{stats.studyDays}</p>
            </div>
            <Calendar className="w-10 h-10 text-blue-600 opacity-80" />
          </div>
        </Card>

        <Card padding="md" className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-orange-600 font-medium">Sequência Atual</p>
              <p className="text-2xl font-bold text-orange-900 mt-1">{stats.currentStreak}</p>
            </div>
            <Flame className="w-10 h-10 text-orange-600 opacity-80" />
          </div>
        </Card>

        <Card padding="md" className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600 font-medium">Drops Completos</p>
              <p className="text-2xl font-bold text-green-900 mt-1">{stats.dropsCompleted}</p>
            </div>
            <CheckCircle className="w-10 h-10 text-green-600 opacity-80" />
          </div>
        </Card>

        <Card padding="md" className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-600 font-medium">Taxa de Acerto</p>
              <p className="text-2xl font-bold text-purple-900 mt-1">{stats.averageAccuracy}%</p>
            </div>
            <TrendingUp className="w-10 h-10 text-purple-600 opacity-80" />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Study Time */}
        <Card>
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
            <Clock className="w-5 h-5 mr-2 text-primary-600" />
            Tempo de Estudo
          </h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Total</span>
                <span className="font-semibold">{Math.floor(stats.totalMinutes / 60)}h {stats.totalMinutes % 60}min</span>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Média Diária</span>
                <span className="font-semibold">{avgStudyTimePerDay} min/dia</span>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Sequência Mais Longa</span>
                <span className="font-semibold">{stats.longestStreak} dias</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Activity Summary */}
        <Card>
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
            <BookOpen className="w-5 h-5 mr-2 text-primary-600" />
            Atividades
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Questões Respondidas</span>
              <Badge variant="primary">{stats.questionsAnswered}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Simulados Realizados</span>
              <Badge variant="primary">{stats.simulationsTaken}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Mnemônicos Criados</span>
              <Badge variant="primary">{stats.mnemonicsCreated}</Badge>
            </div>
          </div>
        </Card>
      </div>

      {/* Discipline Progress */}
      <Card className="mb-8">
        <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center">
          <Target className="w-5 h-5 mr-2 text-primary-600" />
          Progresso por Disciplina
        </h3>
        <div className="space-y-4">
          {disciplineProgress.map((disc) => (
            <div key={disc.name}>
              <div className="flex justify-between text-sm mb-2">
                <span className="font-medium text-gray-700">{disc.name}</span>
                <span className="text-gray-600">{disc.progress}%</span>
              </div>
              <ProgressBar
                value={disc.progress}
                max={100}
                showPercentage={false}
                color={disc.color as any}
                size="md"
              />
            </div>
          ))}
        </div>
      </Card>

      {/* Achievements */}
      <Card className="mb-8">
        <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center">
          <Trophy className="w-5 h-5 mr-2 text-primary-600" />
          Conquistas
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {achievements.map((achievement) => (
            <div
              key={achievement.id}
              className={`p-4 rounded-lg border-2 ${
                achievement.unlocked
                  ? 'bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-300'
                  : 'bg-gray-50 border-gray-200 opacity-60'
              }`}
            >
              <div className="flex items-center space-x-3 mb-2">
                <div className="text-3xl">{achievement.icon}</div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">{achievement.name}</h4>
                  {achievement.unlocked ? (
                    <Badge variant="success" size="sm">Desbloqueada</Badge>
                  ) : achievement.progress ? (
                    <Badge variant="warning" size="sm">{achievement.progress}%</Badge>
                  ) : (
                    <Badge variant="gray" size="sm">Bloqueada</Badge>
                  )}
                </div>
              </div>
              <p className="text-sm text-gray-600">{achievement.description}</p>
              {!achievement.unlocked && achievement.progress && (
                <ProgressBar
                  value={achievement.progress}
                  max={100}
                  showPercentage={false}
                  color="warning"
                  size="sm"
                  className="mt-2"
                />
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Recent Activity */}
      <Card>
        <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center">
          <Clock className="w-5 h-5 mr-2 text-primary-600" />
          Atividade Recente
        </h3>
        <div className="space-y-3">
          {recentActivity.map((activity, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="text-2xl">
                  {activity.type === 'drop' && '💧'}
                  {activity.type === 'srs' && '🔄'}
                  {activity.type === 'questions' && '❓'}
                  {activity.type === 'simulation' && '📝'}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{activity.title}</p>
                  <p className="text-sm text-gray-600">
                    {new Date(activity.date).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
              <Badge
                variant={activity.score >= 80 ? 'success' : activity.score >= 60 ? 'warning' : 'danger'}
              >
                {activity.score}%
              </Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
