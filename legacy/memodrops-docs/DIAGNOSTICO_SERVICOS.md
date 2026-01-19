# 🔍 DIAGNÓSTICO DOS SERVIÇOS

## ✅ STATUS ATUAL

| Serviço | Status | Porta | Detalhes |
|---------|--------|-------|----------|
| Frontend Aluno (Docker) | ✅ OK | 3001 | HTTP 200 - Funcionando |
| Frontend Admin | ⚠️ Inicializando | 3000 | Porta escutando, aguardando build |
| Backend | ❌ Problema | 3333 | Não responde |

---

## 🔧 DIAGNÓSTICO DO BACKEND

### Possíveis Causas:

1. **Falta arquivo .env**
   - Verificar: `apps/backend/.env`
   - Deve conter: DATABASE_URL, JWT_SECRET, OPENAI_API_KEY

2. **Erro de conexão com banco de dados**
   - PostgreSQL não está rodando
   - DATABASE_URL incorreta

3. **Erro nas migrations**
   - Migrations não rodaram
   - Tabelas faltando

4. **Dependências faltando**
   - node_modules incompleto
   - ts-node-dev não instalado

---

## 🛠️ SOLUÇÕES

### Solução 1: Verificar e Criar .env

```powershell
cd memodrops-main/apps/backend

# Verificar se existe
Test-Path .env

# Se não existir, criar com conteúdo mínimo
@"
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/memodrops
JWT_SECRET=seu-secret-super-secreto-aqui-123456789
OPENAI_API_KEY=sk-proj-fake-key-for-testing
NODE_ENV=development
PORT=3333
"@ | Out-File -FilePath .env -Encoding UTF8
```

### Solução 2: Verificar PostgreSQL

```powershell
# Ver serviços PostgreSQL
Get-Service -Name *postgres* | Select-Object Status, Name

# Iniciar PostgreSQL (ajuste o nome do serviço)
Start-Service postgresql-x64-16
```

### Solução 3: Reinstalar Dependências

```powershell
cd memodrops-main/apps/backend

# Limpar
Remove-Item -Recurse -Force node_modules
Remove-Item pnpm-lock.yaml

# Reinstalar
pnpm install
```

### Solução 4: Rodar Migrations

```powershell
cd memodrops-main/apps/backend

# Rodar migrations
pnpm run db:migrate
```

---

## 🔧 DIAGNÓSTICO DO FRONTEND ADMIN

### Status:
- Porta 3000 está escutando
- Provavelmente fazendo build do Next.js

### Ação:
- Aguardar mais 1-2 minutos
- Next.js pode demorar no primeiro build

---

## ✅ AÇÕES IMEDIATAS

### 1. Para o Backend:

```powershell
# Terminal onde o backend está rodando
# Verifique os logs e erros
# Ou inicie manualmente:

cd memodrops-main/apps/backend
pnpm run dev
```

**Observe os erros** e identifique:
- Erro de .env?
- Erro de database?
- Erro de dependencies?

### 2. Para o Frontend Admin:

```powershell
# Aguarde mais tempo ou
# Reinicie manualmente:

cd memodrops-main/apps/web
pnpm run dev
```

---

## 🧪 TESTES MANUAIS

### Testar Backend Manualmente:

```powershell
# Abrir novo terminal
cd memodrops-main/apps/backend

# Ver se .env existe
cat .env

# Instalar dependências
pnpm install

# Tentar iniciar
pnpm run dev
```

**Observe a saída** para identificar erros.

### Testar Frontend Admin Manualmente:

```powershell
# Abrir novo terminal
cd memodrops-main/apps/web

# Criar .env.local se não existir
echo "NEXT_PUBLIC_API_URL=http://localhost:3333" > .env.local

# Instalar dependências
pnpm install

# Iniciar
pnpm run dev
```

---

## 📊 CHECKLIST DE VERIFICAÇÃO

### Backend:
- [ ] Arquivo .env existe e está correto
- [ ] PostgreSQL está rodando
- [ ] DATABASE_URL está correta
- [ ] node_modules instalado
- [ ] Migrations rodaram
- [ ] Porta 3333 livre

### Frontend Admin:
- [ ] node_modules instalado
- [ ] .env.local com NEXT_PUBLIC_API_URL
- [ ] Porta 3000 livre
- [ ] Next.js compilou sem erros

### Frontend Aluno:
- [x] Docker rodando ✓
- [x] Porta 3001 respondendo ✓
- [x] HTTP 200 OK ✓

---

## 🚀 PLANO B: INICIALIZAÇÃO MANUAL

Se o script automático falhou, faça manualmente:

### Terminal 1 - Backend:
```powershell
cd D:\WORK\DESIGN ROTUNDO\MEMODROPS\memodrops-main\memodrops-main\apps\backend
pnpm run dev
```

### Terminal 2 - Frontend Admin:
```powershell
cd D:\WORK\DESIGN ROTUNDO\MEMODROPS\memodrops-main\memodrops-main\apps\web
pnpm run dev
```

### Terminal 3 - Monitorar:
```powershell
# Testar Backend
Invoke-WebRequest http://localhost:3333/health

# Testar Admin
Invoke-WebRequest http://localhost:3000

# Testar Aluno (já funciona)
Invoke-WebRequest http://localhost:3001
```

---

## 📝 PRÓXIMOS PASSOS

1. **Identificar o erro específico** nos logs
2. **Aplicar a solução adequada**
3. **Reiniciar os serviços**
4. **Testar novamente**

---

**Recomendação:** Veja os logs nos terminais onde os serviços foram iniciados para identificar o erro exato.
