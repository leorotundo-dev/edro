# Plano de Integração: Dashboard com Backend Real

## Status Atual
- ✅ Dashboard deployada no Vercel
- ✅ Login com bypass para desenvolvimento
- ✅ Páginas criadas (Dashboard, Custos, Drops, Users, Blueprints, etc.)
- ⚠️ Backend não está se comunicando com frontend

## Problemas Identificados

### 1. **CORS (Cross-Origin Resource Sharing)**
- O backend está em: `https://backend-production-61d0.up.railway.app`
- O frontend está em: `https://memodrops-dashboard-1bj6g09lt-memo-drops.vercel.app`
- Domínios diferentes = problema de CORS

**Solução:**
```typescript
// No backend (server.ts), adicionar:
app.register(cors, {
  origin: [
    "https://memodrops-dashboard-1bj6g09lt-memo-drops.vercel.app",
    "https://memodrops-dashboard-*.vercel.app", // Todos os deploys
    "http://localhost:3000" // Desenvolvimento local
  ],
  credentials: true
});
```

### 2. **Variáveis de Ambiente**
O frontend precisa saber a URL do backend. Atualmente está hardcoded.

**Solução:**
```env
# .env.production
NEXT_PUBLIC_API_URL=https://backend-production-61d0.up.railway.app

# .env.local (desenvolvimento)
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 3. **Autenticação JWT**
O token JWT precisa ser enviado em cada requisição.

**Status:** ✅ Já implementado em `lib/api.ts`

## Próximos Passos

### Fase 1: Corrigir CORS no Backend
1. Abrir `apps/backend/src/server.ts`
2. Adicionar domínios do Vercel à lista de CORS
3. Fazer deploy no Railway

### Fase 2: Configurar Variáveis de Ambiente
1. Criar `.env.production` no frontend
2. Adicionar `NEXT_PUBLIC_API_URL`
3. Atualizar `lib/api.ts` para usar a variável

### Fase 3: Testar Integração
1. Remover bypass de login
2. Testar login real
3. Testar cada endpoint:
   - `/admin/metrics/overview` (Dashboard)
   - `/admin/costs/real/overview` (Custos)
   - `/drops` (Drops)
   - `/admin/users` (Usuários)
   - `/admin/debug/blueprints` (Blueprints)
   - `/admin/harvest/items` (Harvest)
   - `/admin/rag/blocks` (RAG)

### Fase 4: Melhorias Adicionais
1. Adicionar tratamento de erros de rede
2. Implementar retry automático
3. Adicionar loading states
4. Implementar cache de dados
5. Adicionar refresh automático

## Checklist de Implementação

- [ ] CORS configurado no backend
- [ ] Variáveis de ambiente no frontend
- [ ] Login real funcionando
- [ ] Dashboard carregando dados reais
- [ ] Custos mostrando dados reais
- [ ] Todas as páginas funcionando
- [ ] Tratamento de erros implementado
- [ ] Performance otimizada

## Endpoints que Precisam Funcionar

| Página | Endpoint | Status |
|--------|----------|--------|
| Dashboard | `/admin/metrics/overview` | ⚠️ Testado via curl |
| Custos | `/admin/costs/real/overview` | ⚠️ Testado via curl |
| Drops | `/drops` | ⚠️ Testado via curl |
| Users | `/admin/users` | ⚠️ Testado via curl |
| Blueprints | `/admin/debug/blueprints` | ⚠️ Testado via curl |
| Harvest | `/admin/harvest/items` | ⚠️ Testado via curl |
| RAG | `/admin/rag/blocks` | ⚠️ Testado via curl |
| Login | `/auth/login` | ⚠️ Testado via curl |

## Como Testar Localmente

```bash
# Terminal 1: Backend
cd apps/backend
npm run dev

# Terminal 2: Frontend
cd apps/web
NEXT_PUBLIC_API_URL=http://localhost:3001 npm run dev

# Acessar: http://localhost:3000/login
```

## Problemas Conhecidos

1. **Bypass de Login Ativo**: Remover quando CORS for corrigido
2. **Sem Tratamento de Erro**: Adicionar mensagens de erro melhores
3. **Sem Refresh Automático**: Dados não atualizam automaticamente
4. **Sem Cache**: Cada página faz requisição ao backend

## Próximas Ações

1. **Você**: Corrigir CORS no backend
2. **Você**: Fazer deploy do backend com CORS corrigido
3. **Eu**: Remover bypass de login
4. **Eu**: Testar integração completa
5. **Você**: Validar dados na dashboard
