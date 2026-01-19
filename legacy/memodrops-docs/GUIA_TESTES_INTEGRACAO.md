# 🧪 GUIA DE TESTES - INTEGRAÇÃO COMPLETA

## 📋 CHECKLIST DE TESTES

### ✅ FASE 1: Inicialização dos Serviços

```powershell
# Execute o script de inicialização
.\INICIAR_SISTEMA_COMPLETO.ps1
```

**Aguarde 20-30 segundos** para todos os serviços iniciarem.

---

### ✅ FASE 2: Testar Backend

#### 1. Health Check
```powershell
Invoke-WebRequest -Uri "http://localhost:3333/health" -UseBasicParsing
```
**Esperado:** Status 200 + JSON com status "ok"

#### 2. Endpoints Disponíveis
- `GET /health` - Health check
- `GET /api/disciplines` - Listar disciplinas
- `POST /api/auth/register` - Registrar usuário
- `POST /api/auth/login` - Login
- `GET /api/drops` - Listar drops
- `GET /api/recco/trail/daily/:userId` - Trilha diária

#### 3. Teste via Browser
Acesse: http://localhost:3333/health

**Esperado:**
```json
{
  "status": "ok",
  "timestamp": "2025-01-XX..."
}
```

---

### ✅ FASE 3: Testar Frontend Admin

#### 1. Acessar Interface
```
http://localhost:3000
```

#### 2. Navegação
- ✅ Landing Page carrega
- ✅ Link para /admin/login funciona
- ✅ Página de login renderiza

#### 3. Testar Login (se houver mock)
- Email: admin@edro.digital
- Senha: admin123

#### 4. Dashboard Admin
- ✅ Sidebar renderiza com 11 itens
- ✅ Dashboard principal mostra métricas
- ✅ Gráficos carregam

#### 5. Páginas Admin
Testar navegação para:
- ✅ `/admin/dashboard` - Dashboard
- ✅ `/admin/drops` - Gestão de Drops
- ✅ `/admin/blueprints` - Blueprints
- ✅ `/admin/harvest` - Harvest
- ✅ `/admin/rag` - RAG
- ✅ `/admin/questoes` - Questões
- ✅ `/admin/simulados` - Simulados
- ✅ `/admin/recco-engine` - ReccoEngine
- ✅ `/admin/analytics` - Analytics
- ✅ `/admin/costs` - Custos
- ✅ `/admin/users` - Usuários

---

### ✅ FASE 4: Testar Frontend Aluno

#### 1. Acessar Interface
```
http://localhost:3001
```

#### 2. Landing Page
- ✅ Logo e header renderizam
- ✅ Hero section com call-to-actions
- ✅ Features section
- ✅ How it works
- ✅ Footer

#### 3. Navegação Pública
- ✅ `/` - Landing Page
- ✅ `/login` - Login do aluno
- ✅ `/register` - Registro do aluno

#### 4. Registro de Novo Aluno
1. Acesse `http://localhost:3001/register`
2. Preencha:
   - Nome: Teste Aluno
   - Email: aluno@teste.com
   - Senha: senha123
3. Clique em "Criar Conta"

**Esperado:** Redirect para dashboard

#### 5. Dashboard do Aluno
Após login, verificar:
- ✅ Sidebar renderiza com 8 itens
- ✅ Dashboard mostra estado cognitivo
- ✅ Trilha do dia renderiza
- ✅ Métricas de progresso

#### 6. Páginas do Aluno
Testar navegação para:
- ✅ `/dashboard` - Dashboard principal
- ✅ `/plano-diario` - Plano diário
- ✅ `/questoes` - Questões
- ✅ `/simulados` - Simulados
- ✅ `/mnemonicos` - Mnemônicos
- ✅ `/revisao` - Revisão SRS
- ✅ `/progresso` - Progresso
- ✅ `/perfil` - Perfil

---

### ✅ FASE 5: Integração Backend ↔ Frontend

#### Teste 1: Registro de Usuário
1. **Frontend Aluno:** `/register`
2. Preencher formulário
3. Submit
4. **Verificar:** 
   - Request POST para `http://localhost:3333/api/auth/register`
   - Response com token
   - Redirect para dashboard

#### Teste 2: Login
1. **Frontend Aluno:** `/login`
2. Usar credenciais criadas
3. Submit
4. **Verificar:**
   - Request POST para `http://localhost:3333/api/auth/login`
   - Token armazenado no localStorage
   - Redirect para dashboard

#### Teste 3: Buscar Dados
1. **Dashboard Aluno**
2. **Verificar requests:**
   - GET `/api/recco/trail/daily/:userId`
   - GET `/api/recco/diagnosis/:userId`
   - GET `/api/plan/stats?userId=:id`

#### Teste 4: Admin - CRUD Drops
1. **Frontend Admin:** `/admin/drops`
2. Criar novo drop
3. **Verificar:**
   - POST `/api/admin/drops`
   - Lista atualizada
   - Drop aparece na listagem

---

### ✅ FASE 6: Testes E2E

#### Fluxo Completo Aluno
```
1. Landing → Registro
2. Dashboard → Ver trilha do dia
3. Plano Diário → Ver atividades
4. Questões → Responder questão
5. Progresso → Ver estatísticas
6. Perfil → Editar dados
7. Logout → Voltar para home
```

#### Fluxo Completo Admin
```
1. Login Admin
2. Dashboard → Ver métricas gerais
3. Drops → Criar novo drop
4. Blueprints → Ver estruturas
5. ReccoEngine → Ver status do engine
6. Analytics → Ver gráficos
7. Custos → Ver gastos OpenAI
```

---

## 🐛 TROUBLESHOOTING

### Backend não inicia
```powershell
# Ver logs
cd apps/backend
pnpm run dev

# Verificar .env
cat .env

# Verificar DATABASE_URL
echo $env:DATABASE_URL
```

### Frontend não conecta com Backend
```powershell
# Verificar CORS
# O backend deve permitir: http://localhost:3000 e http://localhost:3001

# Verificar variável de ambiente
echo $env:NEXT_PUBLIC_API_URL
```

### Web-Aluno Docker não responde
```powershell
# Ver logs
docker logs web-aluno-container

# Reiniciar
docker restart web-aluno-container

# Recriar
docker rm -f web-aluno-container
docker run -d -p 3001:3000 --name web-aluno-container -e NEXT_PUBLIC_API_URL=http://localhost:3333 memodrops-web-aluno:latest
```

---

## 📊 CHECKLIST FINAL

Marque conforme testar:

### Backend
- [ ] Health check funciona
- [ ] Migrations rodadas
- [ ] Conexão com banco OK
- [ ] Endpoints principais respondem

### Frontend Admin
- [ ] Landing page carrega
- [ ] Login funciona
- [ ] Dashboard renderiza
- [ ] Todas as 11 páginas funcionam
- [ ] Mock data aparece

### Frontend Aluno
- [ ] Landing page carrega
- [ ] Registro funciona
- [ ] Login funciona
- [ ] Dashboard renderiza
- [ ] Todas as 9 páginas funcionam
- [ ] Sidebar funciona

### Integração
- [ ] Auth funciona (register + login)
- [ ] Dados fluem backend → frontend
- [ ] Requests HTTP funcionam
- [ ] CORS configurado
- [ ] Tokens salvos corretamente

---

## ✅ SUCESSO!

Se todos os checkboxes estiverem marcados:

1. **Commit das mudanças**
2. **Preparar para DEPLOY**
3. **Celebrar! 🎉**

---

## 🚀 PRÓXIMO PASSO

Após todos os testes passarem:

```powershell
# Executar deploy
.\DEPLOY_COMPLETO_GUIA.md
```

Ou continue para: **OPÇÃO 1: DEPLOY IMEDIATO**

---

**Tempo estimado:** 2-3 horas
**Status:** PRONTO PARA TESTES
**Data:** Janeiro 2025
