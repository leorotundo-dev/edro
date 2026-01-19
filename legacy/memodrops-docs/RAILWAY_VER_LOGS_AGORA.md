# 🔍 RAILWAY - VER LOGS AGORA

## ✅ Dockerfiles já estão configurados!

### Próximo passo: Ver os LOGS para identificar o erro real

---

## 📋 COMO VER OS LOGS

### Para cada serviço crashado (@edro/web, @edro/web-aluno, @edro/ai):

1. **Acessar Railway Dashboard**
   - https://railway.app
   - Clicar no serviço crashado

2. **Ver último deployment**
   - Clicar em "Deployments"
   - Clicar no deployment mais recente (o que falhou)

3. **Ver Build Logs**
   - Procurar na aba "Build"
   - Rolar até o final
   - Procurar por linhas com "ERROR" ou "failed"

4. **Ver Deploy Logs**
   - Procurar na aba "Deploy"
   - Ver o que aconteceu após o build
   - Procurar por erro de runtime

---

## 🔍 ERROS MAIS COMUNS

### Erro #1: "No such file or directory"
```
Cannot copy file: apps/web/... No such file or directory
```

**Causa:** Dockerfile Path ou Build Context incorreto

**Solução:** 
- Docker Build Context deve ser `/` (raiz)
- Dockerfile Path deve ser `apps/web/Dockerfile`

---

### Erro #2: "Module not found" ou "Cannot find module"
```
Error: Cannot find module '@edro/shared'
```

**Causa:** Dependências do workspace não instaladas

**Solução:** Verificar se Dockerfile tem:
```dockerfile
COPY pnpm-workspace.yaml ./
COPY packages/shared/package.json ./packages/shared/
```

---

### Erro #3: "Port already in use" ou "EADDRINUSE"
```
Error: listen EADDRINUSE: address already in use 0.0.0.0:3000
```

**Causa:** Porta errada ou conflito

**Solução:** Verificar variável PORT nas Settings

---

### Erro #4: "Out of memory"
```
JavaScript heap out of memory
```

**Causa:** Build precisa de mais RAM

**Solução:** 
- Settings > Resources > Increase Memory
- Ou otimizar Dockerfile

---

### Erro #5: "Failed to fetch" ou "Network error"
```
Failed to fetch https://registry.npmjs.org/...
```

**Causa:** Problema temporário de rede

**Solução:** Fazer Redeploy

---

### Erro #6: "Build failed" sem mais detalhes
```
Build failed
```

**Causa:** Variável de ambiente faltando

**Solução:** Verificar se tem NEXT_PUBLIC_API_URL

---

## 🎯 O QUE FAZER AGORA

### PASSO 1: Ver logs do Frontend Admin (@edro/web)

1. Railway > @edro/web > Deployments
2. Clicar no último deployment
3. Ver Build Logs
4. **COPIAR O ERRO** (últimas 20 linhas)
5. **ME MOSTRAR O ERRO**

### PASSO 2: Ver logs do Frontend Aluno (@edro/web-aluno)

1. Railway > @edro/web-aluno > Deployments
2. Clicar no último deployment
3. Ver Build Logs ou Deploy Logs
4. **COPIAR O ERRO**
5. **ME MOSTRAR**

### PASSO 3: Ver logs do AI Service (@edro/ai)

1. Railway > @edro/ai > Deployments
2. Ver logs
3. **COPIAR O ERRO**
4. **ME MOSTRAR**

---

## 📝 COMO COPIAR OS LOGS

1. **No Railway:**
   - Ver os logs
   - Rolar até o final (onde está o erro)
   - Selecionar as últimas 20-30 linhas
   - Copiar (Ctrl+C)

2. **Me enviar:**
   - Colar aqui no chat
   - Ou fazer screenshot

---

## 🔧 POSSÍVEIS SOLUÇÕES (Baseado em erros comuns)

### Se o erro for relacionado ao Next.js standalone:

**Adicionar em `apps/web/next.config.mjs`:**
```javascript
const nextConfig = {
  output: 'standalone',
  // ... resto
}
```

### Se o erro for relacionado ao workspace:

**Verificar se Dockerfile tem:**
```dockerfile
COPY pnpm-workspace.yaml ./
COPY package.json ./
```

### Se o erro for de memória:

**Railway Settings > Resources:**
- Aumentar memória de 512MB para 1GB ou 2GB

---

## 🚨 PERGUNTAS PARA RESPONDER

Para eu ajudar melhor, me diga:

1. **Qual é o erro exato nos logs?**
   - Build error ou Deploy error?
   - Qual a mensagem de erro?

2. **O build completa ou falha no meio?**
   - Se falha, em qual etapa?

3. **Tem variáveis de ambiente configuradas?**
   - NEXT_PUBLIC_API_URL está lá?
   - NODE_ENV=production está lá?

4. **Qual a URL do backend que está online?**
   - Para eu verificar se está correta

---

## 💡 DICA RÁPIDA

Se você conseguir copiar os logs e me mostrar, consigo identificar o problema em segundos e dar a solução exata! 

**Os logs são a chave para resolver isso rapidamente!** 🔑

---

## ⚡ AÇÃO IMEDIATA

**FAÇA ISSO AGORA:**

1. Abrir Railway Dashboard
2. Ir em @edro/web
3. Deployments > Último deployment
4. Copiar últimas 30 linhas dos logs
5. **ME MOSTRAR AQUI**

Aí eu vou saber exatamente o que está errado! 😊

---

**Tempo:** 2 minutos para pegar os logs  
**Resultado:** Solução exata em segundos!
