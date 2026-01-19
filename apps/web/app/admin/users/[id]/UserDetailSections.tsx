"use client";

import { useState } from "react";
import {
  CreditCard,
  DollarSign,
  Calendar,
  TrendingUp,
  BookOpen,
  Target,
  Award,
  Activity,
  Clock,
  CheckCircle,
  AlertCircle,
  Edit,
  Mail,
  Shield,
  Ban,
  RefreshCw,
  Download,
  BarChart3,
  Zap
} from "lucide-react";

// 1. Seção de Assinatura e Pagamentos
export function SubscriptionSection({ userId }: { userId: string }) {
  const subscription = {
    plan: 'premium',
    status: 'active',
    amount: 49.90,
    startDate: '2024-11-15',
    nextBilling: '2025-02-15',
    paymentMethod: 'Cartão ****1234',
    renewAuto: true
  };

  const paymentHistory = [
    { id: 1, date: '2025-01-15', amount: 49.90, status: 'paid', method: 'Cartão ****1234' },
    { id: 2, date: '2024-12-15', amount: 49.90, status: 'paid', method: 'Cartão ****1234' },
    { id: 3, date: '2024-11-15', amount: 49.90, status: 'paid', method: 'Cartão ****1234' }
  ];

  const planColors = {
    free: 'bg-gray-100 text-gray-700',
    basic: 'bg-blue-100 text-blue-700',
    premium: 'bg-purple-100 text-purple-700',
    enterprise: 'bg-indigo-100 text-indigo-700'
  };

  const statusColors = {
    active: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
    expired: 'bg-gray-100 text-gray-700'
  };

  return (
    <div className="space-y-6">
      {/* Card de Assinatura Atual */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-purple-600" />
            Assinatura Atual
          </h3>
          <button className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1">
            <Edit className="w-4 h-4" />
            Gerenciar
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="p-4 bg-purple-50 rounded-lg">
            <p className="text-xs text-purple-700 mb-1">Plano</p>
            <span className={`px-3 py-1 text-sm font-medium rounded-full inline-block ${planColors[subscription.plan as keyof typeof planColors]}`}>
              {subscription.plan.toUpperCase()}
            </span>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <p className="text-xs text-green-700 mb-1">Status</p>
            <span className={`px-3 py-1 text-sm font-medium rounded-full inline-block flex items-center gap-1 w-fit ${statusColors[subscription.status as keyof typeof statusColors]}`}>
              <CheckCircle className="w-3 h-3" />
              {subscription.status === 'active' ? 'Ativo' : subscription.status}
            </span>
          </div>
        </div>

        <div className="space-y-3 border-t border-slate-200 pt-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">Valor Mensal</span>
            <span className="text-lg font-bold text-slate-900">R$ {subscription.amount.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">Próxima Cobrança</span>
            <span className="text-sm font-medium text-slate-900">{new Date(subscription.nextBilling).toLocaleDateString('pt-BR')}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">Método de Pagamento</span>
            <span className="text-sm font-medium text-slate-900">{subscription.paymentMethod}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">Renovação Automática</span>
            <span className={`text-sm font-medium ${subscription.renewAuto ? 'text-green-600' : 'text-red-600'}`}>
              {subscription.renewAuto ? 'Ativa' : 'Desativada'}
            </span>
          </div>
        </div>

        <div className="flex gap-2 mt-6 pt-4 border-t border-slate-200">
          <button className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors">
            Alterar Plano
          </button>
          <button className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors">
            Cancelar Assinatura
          </button>
        </div>
      </div>

      {/* Histórico de Pagamentos */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-600" />
            Histórico de Pagamentos
          </h3>
          <button className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1">
            <Download className="w-4 h-4" />
            Exportar
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Data</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Valor</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Método</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {paymentHistory.map((payment) => (
                <tr key={payment.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 text-sm text-slate-900">
                    {new Date(payment.date).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-slate-900">
                    R$ {payment.amount.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{payment.method}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
                      Pago
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                      Ver Recibo
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

// 2. Seção Educacional (Progresso)
export function EducationalSection({ userId }: { userId: string }) {
  const stats = {
    dropsCompleted: 342,
    streakDays: 28,
    totalStudyHours: 87.5,
    mastery: 72,
    reviewsToday: 15,
    avgAccuracy: 84
  };

  const disciplines = [
    { name: 'Direito Constitucional', progress: 85, drops: 120, mastery: 78, lastAccessed: '2025-01-06' },
    { name: 'Língua Portuguesa', progress: 92, drops: 145, mastery: 88, lastAccessed: '2025-01-06' },
    { name: 'Informática', progress: 68, drops: 77, mastery: 65, lastAccessed: '2025-01-05' }
  ];

  const recentActivity = [
    { date: '2025-01-06 10:30', action: 'Completou 5 drops', discipline: 'Direito Constitucional' },
    { date: '2025-01-06 09:15', action: 'Revisão SRS', discipline: 'Português' },
    { date: '2025-01-05 14:45', action: 'Completou 3 drops', discipline: 'Informática' }
  ];

  return (
    <div className="space-y-6">
      {/* Cards de Métricas */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-purple-700">Drops Completados</span>
            <Target className="w-5 h-5 text-purple-600" />
          </div>
          <div className="text-3xl font-bold text-purple-900">{stats.dropsCompleted}</div>
        </div>
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl border border-orange-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-orange-700">Sequência</span>
            <Zap className="w-5 h-5 text-orange-600" />
          </div>
          <div className="text-3xl font-bold text-orange-900">{stats.streakDays} dias</div>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-700">Horas de Estudo</span>
            <Clock className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-3xl font-bold text-blue-900">{stats.totalStudyHours}h</div>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-green-700">Mastery</span>
            <Award className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-3xl font-bold text-green-900">{stats.mastery}%</div>
        </div>
        <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl border border-indigo-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-indigo-700">Revisões Hoje</span>
            <RefreshCw className="w-5 h-5 text-indigo-600" />
          </div>
          <div className="text-3xl font-bold text-indigo-900">{stats.reviewsToday}</div>
        </div>
        <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-xl border border-pink-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-pink-700">Acurácia Média</span>
            <BarChart3 className="w-5 h-5 text-pink-600" />
          </div>
          <div className="text-3xl font-bold text-pink-900">{stats.avgAccuracy}%</div>
        </div>
      </div>

      {/* Progresso por Disciplina */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-indigo-600" />
          Progresso por Disciplina
        </h3>
        <div className="space-y-4">
          {disciplines.map((disc, idx) => (
            <div key={idx} className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-slate-900">{disc.name}</span>
                <span className="text-sm text-slate-600">{disc.drops} drops</span>
              </div>
              <div className="flex items-center gap-3 mb-2">
                <div className="flex-1 bg-slate-200 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-indigo-500 to-purple-600 h-2 rounded-full"
                    style={{ width: `${disc.progress}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-slate-900 min-w-[48px]">{disc.progress}%</span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span>Mastery: {disc.mastery}%</span>
                <span>Último acesso: {new Date(disc.lastAccessed).toLocaleDateString('pt-BR')}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Atividade Recente */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-slate-600" />
          Atividade Recente
        </h3>
        <div className="space-y-3">
          {recentActivity.map((activity, idx) => (
            <div key={idx} className="flex items-start gap-3 p-3 border border-slate-200 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-900">{activity.action}</p>
                <p className="text-xs text-slate-600">{activity.discipline} • {activity.date}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// 3. Seção de Gestão (Admin)
export function ManagementSection({ userId }: { userId: string }) {
  return (
    <div className="space-y-6">
      {/* Ações Administrativas */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-indigo-600" />
          Ações Administrativas
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <button className="p-4 border border-blue-200 bg-blue-50 hover:bg-blue-100 rounded-lg text-blue-700 text-sm font-medium transition-colors">
            <Mail className="w-5 h-5 mb-2 mx-auto" />
            Enviar Email
          </button>
          <button className="p-4 border border-purple-200 bg-purple-50 hover:bg-purple-100 rounded-lg text-purple-700 text-sm font-medium transition-colors">
            <Edit className="w-5 h-5 mb-2 mx-auto" />
            Editar Perfil
          </button>
          <button className="p-4 border border-green-200 bg-green-50 hover:bg-green-100 rounded-lg text-green-700 text-sm font-medium transition-colors">
            <RefreshCw className="w-5 h-5 mb-2 mx-auto" />
            Resetar Senha
          </button>
          <button className="p-4 border border-orange-200 bg-orange-50 hover:bg-orange-100 rounded-lg text-orange-700 text-sm font-medium transition-colors">
            <DollarSign className="w-5 h-5 mb-2 mx-auto" />
            Ajustar Cobrança
          </button>
          <button className="p-4 border border-yellow-200 bg-yellow-50 hover:bg-yellow-100 rounded-lg text-yellow-700 text-sm font-medium transition-colors">
            <AlertCircle className="w-5 h-5 mb-2 mx-auto" />
            Suspender Conta
          </button>
          <button className="p-4 border border-red-200 bg-red-50 hover:bg-red-100 rounded-lg text-red-700 text-sm font-medium transition-colors">
            <Ban className="w-5 h-5 mb-2 mx-auto" />
            Deletar Usuário
          </button>
        </div>
      </div>

      {/* Logs de Atividade Admin */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Logs de Ações Admin</h3>
        <div className="space-y-2 text-sm">
          <div className="p-3 bg-slate-50 rounded-lg">
            <span className="text-slate-600">2025-01-06 14:30 - Admin alterou plano para Premium</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg">
            <span className="text-slate-600">2025-01-05 09:15 - Admin enviou email de boas-vindas</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg">
            <span className="text-slate-600">2024-12-20 16:45 - Usuário criado</span>
          </div>
        </div>
      </div>

      {/* Notas Internas */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Notas Internas</h3>
        <textarea
          className="w-full p-3 border border-slate-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
          rows={4}
          placeholder="Adicione notas sobre este usuário (visível apenas para admins)..."
        />
        <button className="mt-3 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors">
          Salvar Nota
        </button>
      </div>
    </div>
  );
}
