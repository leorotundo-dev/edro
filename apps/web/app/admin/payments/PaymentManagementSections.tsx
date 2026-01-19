"use client";

import { useState } from "react";
import {
  DollarSign,
  CreditCard,
  Building2,
  Settings,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  Wallet,
  FileText,
  AlertCircle,
  CheckCircle,
  Clock,
  Zap
} from "lucide-react";

// Componente de Integração com Stripe
export function StripeIntegration() {
  const [stripeConnected, setStripeConnected] = useState(true);
  
  const stripeData = {
    accountId: 'acct_1234567890',
    status: 'active',
    balance: 12500.00,
    pendingTransfers: 3450.00,
    lastSync: new Date().toISOString()
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-purple-600" />
          Integração Stripe
        </h3>
        <div className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${
          stripeConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
          {stripeConnected ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
          {stripeConnected ? 'Conectado' : 'Desconectado'}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="p-4 bg-purple-50 rounded-lg">
          <p className="text-xs text-purple-700 mb-1">Saldo Disponível</p>
          <p className="text-2xl font-bold text-purple-900">
            R$ {stripeData.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="p-4 bg-indigo-50 rounded-lg">
          <p className="text-xs text-indigo-700 mb-1">Transferências Pendentes</p>
          <p className="text-2xl font-bold text-indigo-900">
            R$ {stripeData.pendingTransfers.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-600">Account ID</span>
          <span className="font-mono text-slate-900">{stripeData.accountId}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-600">Última Sincronização</span>
          <span className="text-slate-900">{new Date(stripeData.lastSync).toLocaleTimeString('pt-BR')}</span>
        </div>
      </div>

      <div className="flex gap-2 mt-6">
        <button className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center justify-center gap-2 transition-colors">
          <RefreshCw className="w-4 h-4" />
          Sincronizar
        </button>
        <button className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg flex items-center justify-center gap-2 transition-colors">
          <Settings className="w-4 h-4" />
          Configurar
        </button>
      </div>
    </div>
  );
}

// Componente de Integração com Mercado Pago
export function MercadoPagoIntegration() {
  const [mpConnected, setMpConnected] = useState(true);
  
  const mpData = {
    userId: 'user_mp_12345',
    status: 'active',
    balance: 8932.50,
    pendingPayments: 15,
    lastSync: new Date().toISOString()
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Wallet className="w-5 h-5 text-blue-600" />
          Integração Mercado Pago
        </h3>
        <div className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${
          mpConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
          {mpConnected ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
          {mpConnected ? 'Conectado' : 'Desconectado'}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="p-4 bg-blue-50 rounded-lg">
          <p className="text-xs text-blue-700 mb-1">Saldo na Conta</p>
          <p className="text-2xl font-bold text-blue-900">
            R$ {mpData.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="p-4 bg-cyan-50 rounded-lg">
          <p className="text-xs text-cyan-700 mb-1">Pagamentos Pendentes</p>
          <p className="text-2xl font-bold text-cyan-900">{mpData.pendingPayments}</p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-600">User ID</span>
          <span className="font-mono text-slate-900">{mpData.userId}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-600">Última Sincronização</span>
          <span className="text-slate-900">{new Date(mpData.lastSync).toLocaleTimeString('pt-BR')}</span>
        </div>
      </div>

      <div className="flex gap-2 mt-6">
        <button className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center gap-2 transition-colors">
          <RefreshCw className="w-4 h-4" />
          Sincronizar
        </button>
        <button className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg flex items-center justify-center gap-2 transition-colors">
          <Settings className="w-4 h-4" />
          Configurar
        </button>
      </div>
    </div>
  );
}

// Componente de Gestão Bancária
export function BankManagement() {
  const accounts = [
    { id: 1, bank: 'Banco do Brasil', account: '12345-6', balance: 45230.80, type: 'Conta Corrente' },
    { id: 2, bank: 'Nubank', account: '98765-4', balance: 12450.00, type: 'Conta Corrente' },
    { id: 3, bank: 'Inter', account: '55555-1', balance: 8920.50, type: 'Conta Corrente' }
  ];

  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-green-600" />
          Contas Bancárias
        </h3>
        <button className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors">
          + Adicionar Conta
        </button>
      </div>

      <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
        <p className="text-xs text-green-700 mb-1">Saldo Total</p>
        <p className="text-3xl font-bold text-green-900">
          R$ {totalBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </p>
      </div>

      <div className="space-y-3">
        {accounts.map((account) => (
          <div key={account.id} className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="font-semibold text-slate-900">{account.bank}</p>
                <p className="text-xs text-slate-500">{account.type} • {account.account}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-slate-900">
                  R$ {account.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button className="flex-1 text-xs px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors">
                Ver Extrato
              </button>
              <button className="flex-1 text-xs px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors">
                Transferir
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Componente de Transações Recentes
export function RecentTransactions() {
  const transactions = [
    { id: 1, type: 'income', description: 'Assinatura Premium - João Silva', amount: 49.90, date: new Date(Date.now() - 1000 * 60 * 30), status: 'completed' },
    { id: 2, type: 'income', description: 'Assinatura Basic - Maria Santos', amount: 29.90, date: new Date(Date.now() - 1000 * 60 * 120), status: 'completed' },
    { id: 3, type: 'expense', description: 'Taxa Stripe', amount: 5.20, date: new Date(Date.now() - 1000 * 60 * 180), status: 'completed' },
    { id: 4, type: 'income', description: 'Assinatura Enterprise - Carlos Mendes', amount: 199.90, date: new Date(Date.now() - 1000 * 60 * 240), status: 'pending' },
    { id: 5, type: 'expense', description: 'Taxa Mercado Pago', amount: 3.80, date: new Date(Date.now() - 1000 * 60 * 360), status: 'completed' }
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <FileText className="w-5 h-5 text-slate-600" />
          Transações Recentes
        </h3>
        <button className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
          Ver todas
        </button>
      </div>

      <div className="space-y-3">
        {transactions.map((transaction) => {
          const isIncome = transaction.type === 'income';
          return (
            <div key={transaction.id} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${isIncome ? 'bg-green-100' : 'bg-red-100'}`}>
                  {isIncome ? (
                    <ArrowDownRight className="w-4 h-4 text-green-600" />
                  ) : (
                    <ArrowUpRight className="w-4 h-4 text-red-600" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">{transaction.description}</p>
                  <p className="text-xs text-slate-500">
                    {transaction.date.toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-sm font-bold ${isIncome ? 'text-green-600' : 'text-red-600'}`}>
                  {isIncome ? '+' : '-'} R$ {transaction.amount.toFixed(2)}
                </p>
                <div className={`text-xs px-2 py-0.5 rounded-full inline-block mt-1 ${
                  transaction.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {transaction.status === 'completed' ? 'Completo' : 'Pendente'}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Componente de Ações Rápidas
export function QuickActions() {
  const actions = [
    { icon: Zap, label: 'Reembolso Manual', color: 'orange' },
    { icon: CreditCard, label: 'Gerar Link de Pagamento', color: 'blue' },
    { icon: FileText, label: 'Exportar Relatório', color: 'green' },
    { icon: Settings, label: 'Configurar Webhooks', color: 'purple' }
  ];

  const colorClasses = {
    orange: 'bg-orange-50 hover:bg-orange-100 text-orange-700 border-orange-200',
    blue: 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200',
    green: 'bg-green-50 hover:bg-green-100 text-green-700 border-green-200',
    purple: 'bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200'
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
      <h3 className="text-lg font-bold text-slate-900 mb-4">Ações Rápidas</h3>
      <div className="grid grid-cols-2 gap-3">
        {actions.map((action, idx) => {
          const Icon = action.icon;
          return (
            <button
              key={idx}
              className={`p-4 border rounded-lg transition-all ${colorClasses[action.color as keyof typeof colorClasses]}`}
            >
              <Icon className="w-5 h-5 mb-2" />
              <p className="text-sm font-medium">{action.label}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
