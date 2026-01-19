# 🚂 Railway Deployment - Troubleshooting Guide

## 📊 Status Atual

### ✅ Serviços Online
- **Backend** - Online ✅
- **Postgres** - Online ✅

### ❌ Serviços com Problemas
- **Web (Frontend)** - Build failed
- **AI** - Crashed
- **Web-Aluno** - Build failed  
- **Scrapers** - Build failed

---

## 🔧 Correções por Serviço

### 1. Backend ✅ **RESOLVIDO**

A migração estava falando por causa do `VACUUM ANALYZE`. Já foi corrigido!

---

### 2. Web (Admin Dashboard) - Build Failed

#### Diagnóstico
O build do Next.js está falando. Possíveis causas:
1. **Erro de TypeScript**
2. **Dependências faltando**
3. **Variáveis de ambiente não configuradas**

#### Solução - Verificar Logs
1. Acesse o Railway dashboard
2. Clique em **@edro/web**
3. Vá em **Deployments** → Último deployment
4. Leia os logs de build

#### Correções Comuns

**A. Se for erro de TypeScript:**
```bash
cd apps/web
npm run build  # Testa localmente primeiro
```

**B. Se for variável de ambiente faltando:**

No Railway, adicione em **Variables**:
```env
NEXT_PUBLIC_API_URL=https://seu-backend.railway.app
NODE_ENV=production
```

**C. Se for problema de memória:**

No Railway, vá em **Settings** → **Resources**:
- Aumente a RAM para pelo menos **512MB**

---

### 3. AI Service - Crashed

#### Diagnóstico
O serviço de IA está crashando. Causas comuns:
1. **Falta variáveis de ambiente** (API keys)
2. **Timeout na inicialização**
3. **Dependências pesadas** (modelos de ML)

#### Solução - Verificar Logs
1. Acesse **@edro/ai** no Railway
2. Veja os logs de crash

#### Correções

**A. Variáveis de Ambiente Necessárias:**
```env
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
COHERE_API_KEY=...
BACKEND_URL=https://seu-backend.railway.app
```

**B. Timeout:**
- Em **Settings** → **Deploy** → **Health Check**
- Desabilite health check temporariamente

**C. Se usar modelos locais:**
- Considere usar apenas APIs externas em produção
- Comente código de modelos locais pesados

---

### 4. Web-Aluno (Student App) - Build Failed

#### Solução
Mesmas correções do **Web (Admin)**. Verifique:
1. Logs de build no Railway
2. Variáveis de ambiente
3. Dependências no `package.json`

---

### 5. Scrapers - Build Failed

#### Diagnóstico
Sistema de web scraping. Pode precisar de:
1. **Dependências específicas** (Puppeteer, Playwright)
2. **Permissões especiais**
3. **Configuração de browser headless**

#### Solução

**A. Se usar Puppeteer/Playwright:**

No Railway, adicione **buildpacks** ou use Docker:

`railway.json`:
```json
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm start",
    "healthcheckPath": "/health"
  }
}
```

**B. Variáveis de Ambiente:**
```env
BACKEND_URL=https://seu-backend.railway.app
SCRAPER_TIMEOUT=30000
USER_AGENT=Mozilla/5.0...
```

---

## 🎯 Ações Imediatas

### Passo 1: Commit e Push das Correções

```bash
cd memodrops-main
git add .
git commit -m "fix: remove VACUUM from migration 0009"
git push origin main
```

### Passo 2: Railway - Forçar Rebuild

Para cada serviço com problema:

1. **Acesse o serviço** no Railway dashboard
2. Clique em **Deployments**
3. Clique em **Redeploy** no último deployment
4. **OU** force um novo deployment:
   - Vá em **Settings** → **Service**
   - Clique em **Redeploy**

### Passo 3: Configurar Variáveis de Ambiente

Para **cada serviço**, configure as variáveis necessárias:

#### Backend ✅
```env
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
PORT=3000
NODE_ENV=production
```

#### Web (Admin)
```env
NEXT_PUBLIC_API_URL=https://memodrops-backend.railway.app
NODE_ENV=production
```

#### Web-Aluno
```env
NEXT_PUBLIC_API_URL=https://memodrops-backend.railway.app
NODE_ENV=production
```

#### AI Service
```env
OPENAI_API_KEY=sk-...
BACKEND_URL=https://memodrops-backend.railway.app
PORT=5000
```

#### Scrapers
```env
BACKEND_URL=https://memodrops-backend.railway.app
SCRAPER_INTERVAL=3600000
```

---

## 🔍 Debugging - Como Ver os Logs

### No Railway CLI
```bash
# Instalar CLI
npm i -g @railway/cli

# Login
railway login

# Ver logs de um serviço
railway logs --service backend
railway logs --service web
railway logs --service ai
```

### No Railway Dashboard
1. Clique no serviço
2. Aba **Deployments**
3. Clique no deployment ativo
4. Veja **Build Logs** e **Deploy Logs**

---

## 🚨 Problemas Comuns e Soluções

### "Module not found"
```bash
# Certifique-se que todas as dependências estão no package.json
cd apps/[serviço]
npm install
git add package.json package-lock.json
git commit -m "fix: update dependencies"
git push
```

### "Port already in use"
```bash
# No Railway, configure a variável PORT
# O Railway fornece automaticamente, mas você pode definir:
PORT=3000  # ou a porta que seu app espera
```

### "Cannot connect to database"
```bash
# Certifique-se que DATABASE_URL está configurado
# Formato: postgresql://user:password@host:port/database

# No Railway, pegue de: Postgres → Connect → DATABASE_URL
```

### Build está OK mas app crasha
```bash
# Verifique o comando de start no package.json
# O Railway executa:
npm start  # ou o comando definido em railway.json
```

---

## ✅ Checklist Final

- [ ] Backend online e respondendo
- [ ] Database online e conectando
- [ ] Variáveis de ambiente configuradas em todos os serviços
- [ ] Build commands corretos em cada `package.json`
- [ ] Portas configuradas corretamente
- [ ] Health checks configurados (se necessário)
- [ ] Logs sem erros críticos

---

## 📞 Próximos Passos

1. **Copie os logs de erro** de cada serviço que falhou
2. **Compartilhe aqui** para análise detalhada
3. Vou ajudar a corrigir cada problema específico

### Como Copiar os Logs:

1. Railway Dashboard → Serviço → Deployments
2. Clique no deployment falhado
3. Copie os últimos 50-100 linhas de erro
4. Cole aqui

---

**Status**: Backend ✅ | Web ❌ | AI ❌ | Web-Aluno ❌ | Scrapers ❌ | Postgres ✅
