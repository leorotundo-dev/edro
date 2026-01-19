# 🧪 Executar Testes do ReccoEngine V3

**Tempo estimado**: 5 minutos

---

## 🚀 OPÇÃO 1: Teste Rápido (Backend Direto)

### **Passo 1: Entrar no diretório**
```powershell
cd memodrops-main/apps/backend
```

### **Passo 2: Rodar o teste**
```powershell
npx ts-node test-recco-engine.ts
```

### **O que vai acontecer:**
```
✅ Conecta no banco
✅ Verifica 11 tabelas do ReccoEngine
✅ Busca/cria usuário de teste
✅ Executa diagnóstico completo
✅ Gera trilha diária
✅ Roda motor completo
```

**Tempo**: ~10-30 segundos

---

## 🌐 OPÇÃO 2: Teste via API (Servidor Rodando)

### **Passo 1: Iniciar servidor**
```powershell
# Terminal 1
cd memodrops-main/apps/backend
npm run dev
```

### **Passo 2: Rodar testes da API**
```powershell
# Terminal 2
cd memodrops-main
.\test-recco-engine.ps1
```

### **O que vai testar:**
```
✅ Diagnóstico (GET /recco/diagnosis/:userId)
✅ Prioridades (GET /recco/priorities/:userId)
✅ Trilha Diária (GET /recco/trail/daily/:userId)
✅ Trilha Personalizada (POST /recco/trail/generate)
✅ Última Trilha (GET /recco/trail/latest/:userId)
✅ Feedback (POST /recco/feedback)
✅ Stats Admin (GET /recco/admin/stats)
```

**Tempo**: ~30 segundos

---

## 🎯 OPÇÃO 3: Teste Manual (cURL)

### **Servidor rodando**
```powershell
cd memodrops-main/apps/backend
npm run dev
```

### **Em outro terminal**

#### **1. Health Check**
```powershell
curl http://localhost:3333/health
```

#### **2. Diagnóstico**
```powershell
curl http://localhost:3333/recco/diagnosis/test-user-123
```

#### **3. Trilha Diária**
```powershell
curl http://localhost:3333/recco/trail/daily/test-user-123
```

#### **4. Gerar Trilha Personalizada**
```powershell
curl -X POST http://localhost:3333/recco/trail/generate `
  -H "Content-Type: application/json" `
  -d '{
    "user_id": "test-user-123",
    "tempo_disponivel": 60,
    "dias_ate_prova": 30
  }'
```

---

## ⚡ COMANDO ÚNICO (RECOMENDADO)

**Rode tudo de uma vez:**

```powershell
cd memodrops-main/apps/backend
npx ts-node test-recco-engine.ts
```

---

## ✅ RESULTADO ESPERADO

Se tudo funcionar, você verá:

```
🧪 TESTE DO RECCOENGINE V3
============================================================

📊 TESTE 1: Conexão com Banco
------------------------------------------------------------
✅ Banco conectado: 2024-12-...

📋 TESTE 2: Verificar Tabelas do ReccoEngine
------------------------------------------------------------
✅ recco_inputs
✅ recco_states
✅ recco_prioridades
✅ recco_selecao
✅ recco_sequencia
✅ recco_reforco
✅ recco_feedback
✅ recco_versions
✅ recco_predictions
✅ recco_cognitive_flags
✅ recco_emotional_flags

👤 TESTE 3: Buscar Usuário de Teste
------------------------------------------------------------
✅ Usuário encontrado: abc-123...

🔬 TESTE 4: Executar Diagnóstico
------------------------------------------------------------
✅ Diagnóstico executado com sucesso!

Resultados:
  Estado Cognitivo: medio
  Estado Emocional: neutro
  Estado Pedagógico: iniciante
  Prob. Acerto: 65.0%
  Prob. Retenção: 55.0%
  Prob. Saturação: 20.0%
  Tempo Ótimo: 25 min

🎯 TESTE 5: Gerar Trilha Diária
------------------------------------------------------------
⏳ Gerando trilha do dia...
✅ Trilha gerada com sucesso!

  10 itens para estudar
  Duração total: 60 min
  Curva de dificuldade: progressiva

  Primeiros 3 itens:
    1. drop (5 min, dif: 2)
    2. drop (5 min, dif: 2)
    3. questao (3 min, dif: 3)

⚙️  TESTE 6: Motor Completo
------------------------------------------------------------
⏳ Executando motor completo...
✅ Motor executado com sucesso!

  Tempo de processamento: 2500ms
  Itens gerados: 9
  Duração total: 45 min
  Estado cognitivo: medio
  Estado emocional: neutro

============================================================
🎉 TODOS OS TESTES PASSARAM!
============================================================

✅ ReccoEngine V3 está funcionando perfeitamente!
```

---

## 🐛 PROBLEMAS COMUNS

### **1. "Cannot connect to database"**
```powershell
# Verificar .env
cat apps/backend/.env

# Deve ter DATABASE_URL
DATABASE_URL=postgresql://...
```

### **2. "Table does not exist"**
```powershell
# Rodar migrations
cd apps/backend
npm run db:migrate
```

### **3. "No drops found"**
```
Comportamento esperado: O sistema funciona mesmo sem drops.
Ele vai gerar trilha vazia ou com poucos itens.
```

### **4. "Module not found"**
```powershell
# Instalar dependências
cd apps/backend
npm install
```

### **5. "Port 3333 already in use"**
```powershell
# Matar processo na porta
netstat -ano | findstr :3333
taskkill /PID <PID> /F
```

---

## 📊 MÉTRICAS DE SUCESSO

### **Performance**
- ✅ Diagnóstico: < 500ms
- ✅ Priorização: < 1s
- ✅ Sequenciamento: < 500ms
- ✅ Motor completo: < 3s

### **Dados**
- ✅ Diagnosis retorna 10+ campos
- ✅ Priorities retorna lista ordenada
- ✅ Trail retorna 5-15 itens
- ✅ Duração total: 30-60 min

### **Persistência**
- ✅ Dados salvos em recco_states
- ✅ Dados salvos em recco_prioridades
- ✅ Dados salvos em recco_selecao
- ✅ Dados salvos em recco_sequencia

---

## ✅ CHECKLIST FINAL

Após os testes:

- [ ] Todos os testes passaram sem erros
- [ ] Diagnóstico retorna dados corretos
- [ ] Trilha é gerada com itens
- [ ] Motor completo executa em < 5s
- [ ] Dados são persistidos no banco
- [ ] Performance está aceitável

---

## 🎯 PRÓXIMOS PASSOS

### **Se tudo passou:**
1. ✅ Deploy em produção
2. ✅ Testar com dados reais
3. ✅ Integrar com Frontend
4. ✅ Implementar Workers

### **Se algo falhou:**
1. 🔧 Ver logs detalhados
2. 🔧 Verificar migrations
3. 🔧 Verificar conexão com banco
4. 🔧 Criar dados de teste

---

## 🚀 COMANDO FINAL

**Execute agora:**

```powershell
cd memodrops-main/apps/backend
npx ts-node test-recco-engine.ts
```

**E veja a mágica acontecer!** ✨

---

**Última atualização**: Dezembro 2024  
**Status**: ✅ Pronto para rodar!
