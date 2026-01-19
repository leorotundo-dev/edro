"use client";

import { useState } from "react";
import { StatCard } from "@edro/ui";
import Link from "next/link";
import {
  DollarSign,
  CreditCard,
  TrendingUp,
  TrendingDown,
  UserCheck,
  Clock,
  Ban,
  AlertCircle,
  CheckCircle,
  Download,
  Filter,
  Search,
  Calendar,
  Users
} from "lucide-react";
import {
  StripeIntegration,
  MercadoPagoIntegration,
  BankManagement,
  RecentTransactions,
  QuickActions
} from "./PaymentManagementSections";

interface Subscription {
  id: string;
  userName: string;
  userEmail: string;
  plan: 'free' | 'basic' | 'premium' | 'enterprise';
  status: 'active' | 'cancelled' | 'expired' | 'trial';
  amount: number;
  startDate: string;
  nextBilling: string;
}

interface PaymentMetrics {
  mrr: number;
  activeSubscriptions: number;
  churnRate: number;
  revenue: number;
  newSubscriptions: number;
  cancelledSubscriptions: number;
  trialSubscriptions: number;
  avgTicket: number;
}

export default function PaymentsPage() {
  const [filter, setFilter] = useState<'all' | 'active' | 'trial' | 'cancelled'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Mock de dados de pagamentos (substituir por API real)
  const paymentMetrics: PaymentMetrics = {
    mrr: 15847.50,
    activeSubscriptions: 342,
    churnRate: 3.2,
    revenue: 18932.40,
    newSubscriptions: 28,
    cancelledSubscriptions: 11,
    trialSubscriptions: 15,
    avgTicket: 46.35
  };

  const subscriptions: Subscription[] = [
    {
      id: '1',
      userName: 'João Silva',
      userEmail: 'joao@email.com',
      plan: 'premium',
      status: 'active',
      amount: 49.90,
      startDate: '2024-11-15',
      nextBilling: '2025-01-15'
    },
    {
      id: '2',
      userName: 'Maria Santos',
      userEmail: 'maria@email.com',
      plan: 'basic',
      status: 'active',
      amount: 29.90,
      startDate: '2024-12-01',
      nextBilling: '2025-01-01'
    },
    {
      id: '3',
      userName: 'Pedro Costa',
      userEmail: 'pedro@email.com',
      plan: 'premium',
      status: 'trial',
      amount: 0,
      startDate: '2024-12-28',
      nextBilling: '2025-01-11'
    },
    {
      id: '4',
      userName: 'Ana Lima',
      userEmail: 'ana@email.com',
      plan: 'basic',
      status: 'cancelled',
      amount: 29.90,
      startDate: '2024-10-10',
      nextBilling: '-'
    },
    {
      id: '5',
      userName: 'Carlos Mendes',
      userEmail: 'carlos@email.com',
      plan: 'enterprise',
      status: 'active',
      amount: 199.90,
      startDate: '2024-09-20',
      nextBilling: '2025-01-20'
    },
    {
      id: '6',
      userName: 'Fernanda Oliveira',
      userEmail: 'fernanda@email.com',
      plan: 'premium',
      status: 'active',
      amount: 49.90,
      startDate: '2024-12-05',
      nextBilling: '2025-01-05'
    },
    {
      id: '7',
      userName: 'Roberto Alves',
      userEmail: 'roberto@email.com',
      plan: 'basic',
      status: 'trial',
      amount: 0,
      startDate: '2024-12-20',
      nextBilling: '2025-01-03'
    },
    {
      id: '8',
      userName: 'Juliana Martins',
      userEmail: 'juliana@email.com',
      plan: 'premium',
      status: 'active',
      amount: 49.90,
      startDate: '2024-11-01',
      nextBilling: '2025-01-01'
    }
  ];

  const filteredSubscriptions = subscriptions.filter(sub => {
    const matchesFilter = filter === 'all' || sub.status === filter;
    const matchesSearch = sub.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          sub.userEmail.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const planColors = {
    free: 'bg-gray-100 text-gray-700',
    basic: 'bg-blue-100 text-blue-700',
    premium: 'bg-purple-100 text-purple-700',
    enterprise: 'bg-indigo-100 text-indigo-700'
  };

  const statusColors = {
    active: 'bg-green-100 text-green-700',
    trial: 'bg-yellow-100 text-yellow-700',
    cancelled: 'bg-red-100 text-red-700',
    expired: 'bg-gray-100 text-gray-700'
  };

  const statusIcons = {
    active: CheckCircle,
    trial: Clock,
    cancelled: Ban,
    expired: AlertCircle
  };

  const statusLabels = {
    active: 'Ativo',
    trial: 'Trial',
    cancelled: 'Cancelado',
    expired: 'Expirado'
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <DollarSign className="w-8 h-8 text-green-600" />
          <span>Pagamentos e Assinaturas</span>
        </h1>
        <p className="text-slate-600 mt-2">
          Gerencie assinaturas, pagamentos e acompanhe métricas financeiras
        </p>
      </div>

      {/* Métricas Principais */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          label="MRR (Receita Mensal)"
          value={`R$ ${paymentMetrics.mrr.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icon={DollarSign}
          color="green"
          helper="+12.5% vs mês anterior"
        />
        <StatCard
          label="Assinaturas Ativas"
          value={paymentMetrics.activeSubscriptions}
          icon={UserCheck}
          color="blue"
          helper={`+${paymentMetrics.newSubscriptions} novas este mês`}
        />
        <StatCard
          label="Taxa de Churn"
          value={`${paymentMetrics.churnRate}%`}
          icon={TrendingDown}
          color="orange"
          helper="Meta: < 5%"
        />
        <StatCard
          label="Ticket Médio"
          value={`R$ ${paymentMetrics.avgTicket.toFixed(2)}`}
          icon={TrendingUp}
          color="purple"
          helper="Por assinatura ativa"
        />
      </div>

      {/* Cards de Resumo */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-700">Receita Total</span>
            <DollarSign className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-blue-900">R$ {paymentMetrics.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
          <div className="text-xs text-blue-700 mt-1">Este mês</div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-green-700">Novas Assinaturas</span>
            <UserCheck className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-2xl font-bold text-green-900">{paymentMetrics.newSubscriptions}</div>
          <div className="text-xs text-green-700 mt-1">Últimos 30 dias</div>
        </div>

        <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl border border-yellow-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-yellow-700">Em Trial</span>
            <Clock className="w-5 h-5 text-yellow-600" />
          </div>
          <div className="text-2xl font-bold text-yellow-900">{paymentMetrics.trialSubscriptions}</div>
          <div className="text-xs text-yellow-700 mt-1">Período de teste</div>
        </div>
      </div>

      {/* Filtros e Busca */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Busca */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nome ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Filtro de Status */}
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-slate-400" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Todos ({subscriptions.length})</option>
              <option value="active">Ativos ({subscriptions.filter(s => s.status === 'active').length})</option>
              <option value="trial">Trial ({subscriptions.filter(s => s.status === 'trial').length})</option>
              <option value="cancelled">Cancelados ({subscriptions.filter(s => s.status === 'cancelled').length})</option>
            </select>
          </div>

          {/* Botão Exportar */}
          <button className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg flex items-center gap-2 transition-colors">
            <Download className="w-4 h-4" />
            Exportar
          </button>
        </div>
      </div>

      {/* Tabela de Assinaturas */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-slate-600" />
            Assinaturas ({filteredSubscriptions.length})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Cliente</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Plano</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Valor</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Início</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Próx. Cobrança</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredSubscriptions.map((sub) => {
                const StatusIcon = statusIcons[sub.status];
                
                return (
                  <tr key={sub.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-slate-900">{sub.userName}</div>
                        <div className="text-xs text-slate-500">{sub.userEmail}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${planColors[sub.plan]}`}>
                        {sub.plan.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full flex items-center gap-1 w-fit ${statusColors[sub.status]}`}>
                        <StatusIcon className="w-3 h-3" />
                        {statusLabels[sub.status]}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 font-medium">
                      {sub.amount === 0 ? 'Grátis' : `R$ ${sub.amount.toFixed(2)}`}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      {new Date(sub.startDate).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      {sub.nextBilling === '-' ? '-' : new Date(sub.nextBilling).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button className="text-indigo-600 hover:text-indigo-900 text-sm font-medium">
                          Detalhes
                        </button>
                        {sub.status === 'active' && (
                          <button className="text-red-600 hover:text-red-900 text-sm font-medium">
                            Cancelar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Integrações e Gestão Financeira */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-slate-900">Integrações e Gestão</h2>
        
        {/* Grid 2 Colunas - Integrações */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <StripeIntegration />
          <MercadoPagoIntegration />
        </div>

        {/* Grid 2 Colunas - Bancos e Transações */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <BankManagement />
          <div className="space-y-6">
            <RecentTransactions />
            <QuickActions />
          </div>
        </div>
      </div>
    </div>
  );
}
