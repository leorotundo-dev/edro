# 🚀 Instruções para Atualizar a Página de Pagamentos

## ✅ O que foi criado:

1. **Arquivo novo**: `apps/web/app/admin/payments/PaymentManagementSections.tsx`
   - ✅ Integração com Stripe
   - ✅ Integração com Mercado Pago
   - ✅ Gestão de Contas Bancárias
   - ✅ Transações Recentes
   - ✅ Ações Rápidas

2. **Menu lateral atualizado**: Seção "Financeiro" com Pagamentos e Custos

## 📋 Como Usar:

### Opção 1: Adicionar no final da página atual

Abra `apps/web/app/admin/payments/page.tsx` e adicione ANTES do fechamento final `</div>`:

```tsx
import {
  StripeIntegration,
  MercadoPagoIntegration,
  BankManagement,
  RecentTransactions,
  QuickActions
} from "./PaymentManagementSections";

// ... código existente ...

      {/* ADICIONE ESTA SEÇÃO NOVA */}
      
      {/* Integrações e Gestão Financeira */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-slate-900">Integrações e Gestão</h2>
        
        {/* Gr

id 2 Colunas - Integrações */}
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
```

## 🎨 Funcionalidades Adicionadas:

### 1. **Integração Stripe** 💳
- Saldo disponível
- Transferências pendentes
- Sincronização em tempo real
- Configurações

### 2. **Integração Mercado Pago** 💰
- Saldo na conta
- Pagamentos pendentes
- Sincronização
- Configurações

### 3. **Gestão Bancária** 🏦
- Múltiplas contas
- Saldo total consolidado
- Ver extrato
- Transferências

### 4. **Transações Recentes** 📊
- Receitas (verde)
- Despesas (vermelho)
- Status (completo/pendente)
- Data e hora

### 5. **Ações Rápidas** ⚡
- Reembolso Manual
- Gerar Link de Pagamento
- Exportar Relatório
- Configurar Webhooks

## 🔄 Para Ver as Mudanças:

1. **Adicione o import** no topo do arquivo:
```tsx
import {
  StripeIntegration,
  MercadoPagoIntegration,
  BankManagement,
  RecentTransactions,
  QuickActions
} from "./PaymentManagementSections";
```

2. **Adicione a seção** no final (antes do último `</div>`)

3. **Reinicie o servidor**:
```bash
Ctrl + C
npm run dev
```

4. **Acesse**: http://localhost:3000/admin/payments

## 📸 Visual Esperado:

```
┌─────────────────────────────────────────┐
│ Métricas (MRR, Assinaturas, Churn)     │
├─────────────────────────────────────────┤
│ Tabela de Assinaturas                   │
├─────────────────────────────────────────┤
│ 🆕 SEÇÃO NOVA:                          │
│ ┌──────────────┬──────────────────┐     │
│ │   Stripe     │  Mercado Pago    │     │
│ └──────────────┴──────────────────┘     │
│ ┌──────────────┬──────────────────┐     │
│ │    Bancos    │   Transações +   │     │
│ │              │   Ações Rápidas  │     │
│ └──────────────┴──────────────────┘     │
└─────────────────────────────────────────┘
```

## 🎯 Próximos Passos (Opcional):

- [ ] Conectar APIs reais do Stripe
- [ ] Conectar APIs reais do Mercado Pago
- [ ] Integrar com banco de dados real
- [ ] Adicionar webhooks
- [ ] Implementar exportação de relatórios
- [ ] Adicionar gráficos de receita

## ✨ Pronto!

Sua página de pagamentos agora tem gestão completa de:
- Pagamentos online (Stripe + Mercado Pago)
- Contas bancárias
- Transações
- Ações administrativas

**Todos os dados são mockados** - basta substituir por chamadas de API reais!
