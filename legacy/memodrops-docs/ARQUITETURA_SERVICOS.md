# 🏗️ Arquitetura de Serviços - MemoDrops

## 📊 Estrutura Real do Projeto

```
memodrops/
├── apps/
│   ├── backend/          ✅ API Principal (Node.js + Fastify)
│   ├── web/              ✅ Dashboard Admin (Next.js)
│   ├── web-aluno/        ✅ App do Estudante (Next.js)
│   ├── mobile/           📱 App Mobile (React Native) - não deploy
│   ├── ai/               📦 Biblioteca (não é serviço)
│   └── scrapers/         🕷️ Web Scraping (Node.js)
└── packages/
    └── shared/           📦 Código compartilhado
```

---

## ✅ Serviços que DEVEM estar no Railway:

### 1. **Backend** 
- **Tipo:** API REST
- **Porta:** 3000
- **Comando:** `pnpm start` (via Dockerfile)
- **Status esperado:** 🟢 Online

### 2. **Web (Admin Dashboard)**
- **Tipo:** Next.js App
- **Porta:** 3000 (Next.js padrão)
- **Comando:** `npm start`
- **Status esperado:** 🟢 Online

### 3. **Web-Aluno (Student App)**
- **Tipo:** Next.js App
- **Porta:** 3000
- **Comando:** `npm start`
- **Status esperado:** 🟢 Online

### 4. **Scrapers**
- **Tipo:** Node.js Worker
- **Sem porta** (background job)
- **Comando:** `node src/index.js`
- **Status esperado:** 🟢 Online

### 5. **Postgres**
- **Tipo:** Database
- **Gerenciado pelo Railway**
- **Status esperado:** 🟢 Online

---

## ❌ O que NÃO deve estar no Railway:

### **AI Service**
- ❌ Não é um serviço standalone
- ✅ É uma **biblioteca** usada pelo backend
- ✅ Já está incluído no backend via `apps/ai`

**Ação:** Remover o serviço "ai" do Railway ou desabilitar

---

## 🔧 Configuração Correta no Railway:

### **Backend** ✅
```
Root Directory: /
Dockerfile: Dockerfile
Build Command: (vazio - usa Dockerfile)
Start Command: (vazio - usa Dockerfile)
Port: 3000

Variables:
- DATABASE_URL=...
- REDIS_URL=...
- PORT=3000
- NODE_ENV=production
```

### **Web (Admin)** 🔄
```
Root Directory: apps/web
Build Command: npm install && npm run build
Start Command: npm start
Port: 3000

Variables:
- NEXT_PUBLIC_API_URL=https://[backend].railway.app
- NODE_ENV=production
```

### **Web-Aluno** 🔄
```
Root Directory: apps/web-aluno
Build Command: npm install && npm run build
Start Command: npm start  
Port: 3000

Variables:
- NEXT_PUBLIC_API_URL=https://[backend].railway.app
- NODE_ENV=production
```

### **Scrapers** 🔄
```
Root Directory: apps/scrapers
Build Command: npm install
Start Command: npm start
Port: (nenhuma)

Variables:
- BACKEND_URL=https://[backend].railway.app
- NODE_ENV=production
```

---

## 🎯 Solução para os Crashes:

### Problema 1: AI Service crashando
**Causa:** Não é um serviço, é uma biblioteca

**Solução:** 
1. No Railway, vá em **@edro/ai**
2. Settings → **Remove Service**
3. OU desabilite o deployment

### Problema 2: Web crashando
**Causa:** Provavelmente configuração incorreta de root directory

**Solução:**
1. Railway → @edro/web
2. Settings → **Root Directory:** `apps/web`
3. Settings → **Start Command:** `npm start`
4. Adicionar variável: `NEXT_PUBLIC_API_URL`

### Problema 3: Web-Aluno não atualizando
**Causa:** Build falhando, provavelmente dependência faltando

**Solução:**
1. Railway → @edro/web-aluno
2. Settings → **Root Directory:** `apps/web-aluno`
3. Settings → **Build Command:** `npm install && npm run build`
4. Verificar se `@edro/shared` está acessível

### Problema 4: Scrapers build failed
**Causa:** Provavelmente root directory incorreto

**Solução:**
1. Railway → scrapers
2. Settings → **Root Directory:** `apps/scrapers`
3. Settings → **Start Command:** `npm start`

---

## 📋 Checklist de Configuração:

- [ ] **Remover** serviço @edro/ai do Railway
- [ ] **Configurar** root directory do web para `apps/web`
- [ ] **Configurar** root directory do web-aluno para `apps/web-aluno`
- [ ] **Configurar** root directory do scrapers para `apps/scrapers`
- [ ] **Adicionar** variáveis de ambiente em todos
- [ ] **Redeploy** de todos os serviços

---

## 🚀 Ordem de Deploy Recomendada:

1. ✅ **Postgres** (já online)
2. ✅ **Backend** (já online)
3. 🔄 **Web** (configurar e deploy)
4. 🔄 **Web-Aluno** (configurar e deploy)
5. 🔄 **Scrapers** (configurar e deploy)
6. ❌ **AI** (remover do Railway)

---

## 💡 Por que AI não é um serviço?

O código em `apps/ai/` contém:
- Pipelines de IA (OpenAI, Anthropic)
- Funções de processamento
- Utilidades de ML

Mas **não tem servidor HTTP**. É usado assim:

```typescript
// No backend:
import { generateDropBatch } from '@edro/ai';

app.post('/generate-drops', async (req, res) => {
  const result = await generateDropBatch(data);
  res.send(result);
});
```

---

**Status Alvo:**
```
✅ Backend: Online
✅ Postgres: Online
✅ Web: Online
✅ Web-Aluno: Online
✅ Scrapers: Online
❌ AI: Removido (é biblioteca, não serviço)
```
