# ⚡ COMANDOS PRONTOS - Copy & Paste

## 🎯 Passo 1: Git Push (2 min)

```bash
cd memodrops-main
git add .
git status
git commit -m "fix: remove VACUUM from migration 0009 + Railway configs"
git push origin main
```

---

## 🧪 Passo 2: Testar Builds Localmente (Opcional)

### Web Admin
```bash
cd apps/web
npm install
npm run build
cd ../..
```

### Web Aluno (se existir)
```bash
cd apps/web-aluno
npm install  
npm run build
cd ../..
```

### AI Service (se existir)
```bash
cd apps/ai
npm install
npm run build
cd ../..
```

---

## 🔍 Passo 3: Ver Logs no Railway

### Opção A: Railway CLI
```bash
# Instalar (só primeira vez)
npm install -g @railway/cli

# Login (só primeira vez)
railway login

# Ver logs
railway logs --service backend
railway logs --service web
railway logs --service ai
```

### Opção B: Dashboard
```
https://railway.app/project/[seu-id]
→ Clicar no serviço
→ Deployments
→ Ver logs
```

---

## 📋 Variáveis de Ambiente

### Web Admin

**No Railway Dashboard:**
1. Clique em `@edro/web`
2. Vá em `Variables`
3. Clique em `+ New Variable`
4. Adicione cada uma:

```env
NEXT_PUBLIC_API_URL=https://[COLE-URL-DO-BACKEND-AQUI].railway.app
NODE_ENV=production
```

> **Como pegar URL do backend:**
> Dashboard → @edro/backend → Settings → Domains

---

### AI Service

**No Railway Dashboard:**
1. Clique em `@edro/ai`
2. Vá em `Variables`
3. Adicione:

```env
OPENAI_API_KEY=sk-proj-[COLE-SUA-KEY-AQUI]
BACKEND_URL=https://[COLE-URL-DO-BACKEND-AQUI].railway.app
PORT=5000
NODE_ENV=production
```

---

### Web Aluno

**No Railway Dashboard:**
1. Clique em `@edro/web-aluno`
2. Vá em `Variables`
3. Adicione:

```env
NEXT_PUBLIC_API_URL=https://[COLE-URL-DO-BACKEND-AQUI].railway.app
NODE_ENV=production
```

---

### Scrapers

**No Railway Dashboard:**
1. Clique em `scrapers`
2. Vá em `Variables`
3. Adicione:

```env
BACKEND_URL=https://[COLE-URL-DO-BACKEND-AQUI].railway.app
NODE_ENV=production
SCRAPER_TIMEOUT=30000
```

---

## 🔄 Forçar Redeploy

Para cada serviço no Railway:

```
1. Clique no serviço
2. Aba "Deployments"
3. Clique nos 3 pontinhos (...)
4. Selecione "Redeploy"
5. Aguarde o deploy
```

**Ordem sugerida:**
1. Web → Redeploy
2. AI → Redeploy
3. Web-Aluno → Redeploy
4. Scrapers → Redeploy

---

## 📤 Template de Resposta

Copie e preencha:

```markdown
## ✅ Executei:

- [x] Git push
- [x] Configurei variáveis no Railway
- [x] Fiz redeploy dos serviços

## 📊 Status Atual:

- Backend: ✅ Online
- Postgres: ✅ Online
- Web: [ ] Online / [ ] Falhou
- AI: [ ] Online / [ ] Crashou
- Web-Aluno: [ ] Online / [ ] Falhou
- Scrapers: [ ] Online / [ ] Falhou

## ❌ Erros (se houver):

### Web:
```
[cole os logs aqui]
```

### AI:
```
[cole os logs aqui]
```

### Web-Aluno:
```
[cole os logs aqui]
```

### Scrapers:
```
[cole os logs aqui]
```

## 📸 Screenshots:

[anexe prints do Railway dashboard se possível]
```

---

## 🔎 Comandos de Diagnóstico

### Ver estrutura do projeto
```bash
ls -la apps/
ls -la packages/
```

### Ver package.json de cada serviço
```bash
cat apps/web/package.json
cat apps/backend/package.json
cat apps/ai/package.json
```

### Verificar se migrations existem
```bash
ls -la apps/backend/src/db/migrations/
```

### Ver git status
```bash
git status
git log --oneline -5
```

---

## 🆘 Se Tudo Falhar

### Logs completos
```bash
# Railway CLI
railway logs --service web --limit 100 > web-logs.txt
railway logs --service ai --limit 100 > ai-logs.txt

# Envie os arquivos .txt aqui
```

### Build local completo
```bash
cd apps/web
npm install 2>&1 | tee web-install.log
npm run build 2>&1 | tee web-build.log

# Envie os arquivos .log aqui
```

---

## 📞 Contato Rápido

**Me envie:**
1. Output do git push ✅
2. Screenshot do Railway dashboard 📸
3. Logs de erro (se houver) 📋

**OU simplesmente:**
```
"✅ Tudo online!"
```

ou

```
"❌ Ainda com erro em [serviço]"
+ logs
```

---

## 🎯 Próximo Passo

Após executar estes comandos, **aguarde 5-10 minutos** e verifique o status no Railway.

Se algum serviço continuar com erro:
1. Copie os últimos 30-50 linhas de log
2. Envie aqui
3. Vou analisar e corrigir

---

**Boa sorte! 🚀**
