# 🚨 RAILWAY DIAGNÓSTICO URGENTE

## ❌ PROBLEMA: Serviços Continuam Crashando

### Status Atual:
- ❌ @edro/web - Crashed 2 hours ago
- ❌ @edro/ai - Crashed 11 seconds ago  
- ❌ @edro/web-aluno - Crashed 5 seconds ago
- ✅ @edro/backend - Online
- ✅ scrapers - Online
- ✅ Postgres - Online

---

## 🔍 POSSÍVEIS CAUSAS

### 1. Dockerfiles não foram aplicados
**Causa:** Railway ainda está usando configuração antiga (Nixpacks)

**Como verificar:**
- Railway Dashboard > Service > Settings > Build
- Ver se "Dockerfile Path" está configurado

**Solução:** Configurar manualmente no Railway

---

### 2. Push não chegou ao Railway
**Causa:** Git push não disparou novo deploy

**Como verificar:**
- Ver últimos commits no GitHub
- Ver último deploy no Railway

**Solução:** Fazer redeploy manual

---

### 3. Variáveis de ambiente faltando
**Causa:** NEXT_PUBLIC_API_URL não configurada

**Como verificar:**
- Railway Dashboard > Service > Variables
- Ver se tem NEXT_PUBLIC_API_URL

**Solução:** Adicionar variáveis

---

### 4. Build está falhando
**Causa:** Erro de build que não vimos

**Como verificar:**
- Railway Dashboard > Service > Deployments
- Ver logs de build

**Solução:** Corrigir erro específico

---

## ✅ SOLUÇÃO PASSO A PASSO

### OPÇÃO 1: Configurar Dockerfile Manualmente (RÁPIDO - 10 min)

Para cada serviço crashado:

#### A. @edro/web (Frontend Admin)

1. **Acessar:** Railway Dashboard > @edro/web

2. **Settings > Build:**
   ```
   Builder: Docker
   Dockerfile Path: apps/web/Dockerfile
   Docker Build Context: /
   ```

3. **Settings > Variables:**
   ```
   NEXT_PUBLIC_API_URL=https://memodrops-backend-production.up.railway.app
   NODE_ENV=production
   ```
   **Nota:** Substitua pela URL real do seu backend

4. **Deploy > Redeploy**

---

#### B. @edro/web-aluno (Frontend Aluno)

1. **Acessar:** Railway Dashboard > @edro/web-aluno

2. **Settings > Build:**
   ```
   Builder: Docker
   Dockerfile Path: apps/web-aluno/Dockerfile
   Docker Build Context: /
   ```

3. **Settings > Variables:**
   ```
   NEXT_PUBLIC_API_URL=https://memodrops-backend-production.up.railway.app
   NODE_ENV=production
   ```

4. **Deploy > Redeploy**

---

#### C. @edro/ai

1. **Acessar:** Railway Dashboard > @edro/ai

2. **Settings > Build:**
   ```
   Builder: Docker
   Dockerfile Path: apps/ai/Dockerfile
   Docker Build Context: /
   ```

3. **Settings > Variables:**
   ```
   OPENAI_API_KEY=sk-proj-XXXXX (SUA CHAVE REAL!)
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   PORT=3334
   NODE_ENV=production
   ```

4. **Deploy > Redeploy**

---

### OPÇÃO 2: Verificar o que está acontecendo (DIAGNÓSTICO - 5 min)

#### Passo 1: Ver logs de cada serviço

**@edro/web:**
```
Railway Dashboard > @edro/web > Deployments > Ver último deploy > Logs
```

**Procurar por:**
- "Error:"
- "Failed to"
- "Cannot find"
- "Module not found"
- "Build failed"

#### Passo 2: Ver configuração atual

**Settings > Build:**
- Builder: Docker ou Nixpacks?
- Dockerfile Path: configurado?

**Settings > Variables:**
- Tem NEXT_PUBLIC_API_URL?
- Tem NODE_ENV?

#### Passo 3: Ver último commit

**Settings > Source:**
- Branch: main?
- Último commit: 7c3d687?

---

## 🚨 CAUSAS MAIS PROVÁVEIS

### Causa #1: Dockerfile Path NÃO configurado ⚠️

**Sintoma:** Railway ainda usando Nixpacks (padrão)

**Como resolver:**
1. Settings > Build
2. Mudar "Builder" de Nixpacks para Docker
3. Adicionar "Dockerfile Path"
4. Redeploy

---

### Causa #2: Variáveis de ambiente faltando ⚠️

**Sintoma:** Build funciona mas app crasha ao iniciar

**Como resolver:**
1. Settings > Variables
2. Adicionar NEXT_PUBLIC_API_URL
3. Adicionar NODE_ENV=production
4. Redeploy

---

### Causa #3: Build falhando ⚠️

**Sintoma:** Erro nos logs de build

**Como resolver:**
- Ver logs específicos
- Corrigir Dockerfile se necessário
- Garantir que dependências estão corretas

---

## 📋 CHECKLIST DE VERIFICAÇÃO

### Para @edro/web:
- [ ] Settings > Build > Builder = Docker
- [ ] Settings > Build > Dockerfile Path = apps/web/Dockerfile
- [ ] Settings > Variables > NEXT_PUBLIC_API_URL configurada
- [ ] Settings > Variables > NODE_ENV = production
- [ ] Redeploy executado
- [ ] Logs sem erros

### Para @edro/web-aluno:
- [ ] Settings > Build > Builder = Docker
- [ ] Settings > Build > Dockerfile Path = apps/web-aluno/Dockerfile
- [ ] Settings > Variables > NEXT_PUBLIC_API_URL configurada
- [ ] Settings > Variables > NODE_ENV = production
- [ ] Redeploy executado
- [ ] Logs sem erros

### Para @edro/ai:
- [ ] Settings > Build > Builder = Docker
- [ ] Settings > Build > Dockerfile Path = apps/ai/Dockerfile
- [ ] Settings > Variables > OPENAI_API_KEY configurada
- [ ] Settings > Variables > DATABASE_URL = ${{Postgres.DATABASE_URL}}
- [ ] Settings > Variables > PORT = 3334
- [ ] Redeploy executado
- [ ] Logs sem erros

---

## 🎯 AÇÃO IMEDIATA

### O QUE FAZER AGORA:

**1. Verificar Backend URL:**
```
Railway Dashboard > @edro/backend > Settings
Ver "Public Domain"
Copiar URL (ex: https://memodrops-backend-production.up.railway.app)
```

**2. Para CADA serviço crashado:**

a) **Settings > Build:**
   - Clicar em "Builder"
   - Selecionar "Docker"
   - Em "Dockerfile Path", adicionar o caminho correto

b) **Settings > Variables:**
   - Clicar em "New Variable"
   - Adicionar NEXT_PUBLIC_API_URL com a URL do backend
   - Adicionar NODE_ENV=production

c) **Deploy:**
   - Clicar em "Redeploy"
   - Aguardar build (~5 min)
   - Verificar logs

---

## 💡 DICA: Next.js Standalone

Se o Frontend continuar crashando, pode ser que precise configurar output standalone.

**Adicionar em next.config.mjs:**
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // ... resto da config
}

export default nextConfig
```

**Depois:**
```bash
git add apps/web/next.config.mjs
git commit -m "fix: add standalone output for Railway"
git push
```

---

## 🔧 SOLUÇÃO ALTERNATIVA: Railway CLI

Se a interface web não funcionar, use Railway CLI:

```bash
# Instalar Railway CLI
npm install -g @railway/cli

# Login
railway login

# Linkar projeto
railway link

# Ver variáveis
railway variables

# Adicionar variável
railway variables set NEXT_PUBLIC_API_URL=https://seu-backend.railway.app

# Redeploy
railway up
```

---

## 📊 TIMELINE ESPERADA

```
00:00 - Verificar configurações atuais (2 min)
00:02 - Configurar Dockerfile paths (3 min)
00:05 - Adicionar variáveis de ambiente (3 min)
00:08 - Redeploy serviço 1 (5 min build)
00:13 - Redeploy serviço 2 (5 min build)
00:18 - Redeploy serviço 3 (5 min build)
00:23 - Verificar logs e testar (2 min)
00:25 - TUDO ONLINE! 🎉
```

---

## ✅ RESULTADO ESPERADO

Depois de configurar corretamente:

```
✅ @edro/web - Online (era crashed)
✅ @edro/web-aluno - Online (era crashed)
✅ @edro/ai - Online (era crashed)
✅ @edro/backend - Online
✅ scrapers - Online
✅ Postgres - Online

= 6/6 SERVIÇOS ONLINE! 🎉
```

---

## 🚨 SE NADA FUNCIONAR

### Última opção: Recriar serviços

1. **Deletar** serviços crashados
2. **Criar novos** serviços
3. **Configurar** desde o início com Docker
4. **Garantir** que Dockerfile Path está correto desde o início

---

**IMPORTANTE:** 
- Railway precisa que você configure manualmente o Dockerfile Path
- Apenas fazer git push NÃO é suficiente
- Você precisa ir no Dashboard e configurar cada serviço

**PRÓXIMA AÇÃO:**
1. Acesse Railway Dashboard
2. Configure um serviço por vez
3. Siga o checklist acima
4. Me diga se encontrar erros nos logs!

---

Tempo: 25 minutos  
Dificuldade: Média  
Prioridade: **URGENTE**
