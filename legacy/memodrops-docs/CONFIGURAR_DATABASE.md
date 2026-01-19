# 🗄️ Configurar Database no Railway

## Status Atual
✅ Backend deployado e rodando  
❌ DATABASE_URL não configurada  
❌ Workers/Cron aguardando conexão com DB

---

## 📋 Passo a Passo

### 1️⃣ **Criar PostgreSQL no Railway**

1. Acesse: https://railway.app/
2. Abra seu projeto **MemoDrops**
3. Clique em **"+ New"**
4. Selecione **"Database"** → **"PostgreSQL"**
5. Aguarde o provisioning (~2 minutos)

---

### 2️⃣ **Copiar DATABASE_URL**

1. Clique no serviço **PostgreSQL** criado
2. Vá na aba **"Variables"**
3. Procure por **`DATABASE_URL`**
4. Clique no ícone de **copiar** ao lado do valor
5. Guarde esse valor (será algo como):
   ```
   postgresql://postgres:senha@region.railway.app:5432/railway
   ```

---

### 3️⃣ **Configurar no Backend**

1. Clique no serviço **backend** (onde está rodando seu app)
2. Vá na aba **"Variables"**
3. Clique em **"+ New Variable"**
4. Configure:
   - **Key**: `DATABASE_URL`
   - **Value**: Cole o valor copiado OU use referência:
     ```
     ${{Postgres.DATABASE_URL}}
     ```
     *(A referência é melhor - atualiza automaticamente)*

---

### 4️⃣ **Configurar Outras Variáveis Essenciais**

Adicione também estas variáveis no backend:

```env
# Obrigatórias
DATABASE_URL=${{Postgres.DATABASE_URL}}
JWT_SECRET=seu_secret_muito_forte_aqui_minimo_32_caracteres_aleatorios
PORT=8080
NODE_ENV=production

# Opcionais (mas recomendadas)
ALLOWED_ORIGINS=https://memodrops-dashboard-1bj6g09lt-memo-drops.vercel.app,https://memodrops-dashboard-*.vercel.app
OPENAI_API_KEY=sua_chave_openai
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini

# Sentry (opcional)
SENTRY_DSN=sua_dsn_aqui

# Redis (opcional - para workers)
REDIS_URL=redis://seu_redis_url
ENABLE_WORKERS=true
```

---

### 5️⃣ **Gerar JWT_SECRET**

Execute este comando no PowerShell para gerar um secret forte:

```powershell
-join ((33..126) | Get-Random -Count 32 | ForEach-Object {[char]$_})
```

Copie o resultado e use como `JWT_SECRET`.

---

### 6️⃣ **Redeploy**

Após configurar as variáveis:

1. O Railway fará **redeploy automático**
2. Aguarde ~2 minutos
3. Verifique os logs

---

## 🔍 Verificar se Funcionou

### ✅ **Logs de Sucesso:**
```
✅ Server listening at http://0.0.0.0:8080
✅ [jobs] 🚀 Job worker iniciado
✅ [cron] 🕐 Cron iniciado
✅ Migrations executadas com sucesso
```

### ❌ **Logs de Erro (se houver):**
```
❌ getaddrinfo ENOTFOUND host
   → DATABASE_URL incorreto ou não configurado

❌ password authentication failed
   → Credenciais incorretas

❌ relation "users" does not exist
   → Migrations não executaram - rodar manualmente
```

---

## 🚨 Troubleshooting

### **Erro: "getaddrinfo ENOTFOUND host"**
- **Causa**: DATABASE_URL não configurada ou inválida
- **Solução**: Verificar se usou `${{Postgres.DATABASE_URL}}`

### **Erro: "relation does not exist"**
- **Causa**: Migrations não executaram
- **Solução**: Rodar migrations manualmente:
  ```bash
  cd memodrops-main
  railway run npm run migrate --workspace @edro/backend
  ```

### **Erro: "password authentication failed"**
- **Causa**: Credenciais incorretas
- **Solução**: Recriar PostgreSQL no Railway

---

## 📊 Próximos Passos

Após configurar o database:

1. ✅ Verificar logs do backend
2. ✅ Testar endpoint de health: `https://seu-backend.railway.app/health`
3. ✅ Rodar migrations se necessário
4. ✅ Testar conexão com frontend

---

## 🔗 Links Úteis

- **Railway Dashboard**: https://railway.app/dashboard
- **Documentação Railway**: https://docs.railway.app/
- **Prisma Migrations**: https://www.prisma.io/docs/concepts/components/prisma-migrate

---

## 📝 Notas

- Use **referências** (`${{Postgres.DATABASE_URL}}`) em vez de colar valores diretos
- Isso garante que a URL atualize automaticamente se o DB mudar
- Sempre use **SSL** em produção: `?sslmode=require` no final da URL
- Nunca commite `.env` com credenciais reais no Git

---

**Status**: ⏳ Aguardando configuração...
