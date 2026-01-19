# 🚨 Diagnóstico de Crashes - Next.js Apps

## 📊 Status Atual:

```
✅ Backend: Online
✅ Postgres: Online
✅ Scrapers: Online 🎉 (sucesso!)
❌ Web: Crashed 44s ago
❌ AI: Crashed 32s ago
❌ Web-Aluno: Crashed 37s ago
```

---

## 🔍 Causas Prováveis dos Crashes:

### 1. **Root Directory Incorreto**
O Railway pode não estar encontrando o `package.json`

**Sintoma nos logs:**
```
Error: Cannot find module '/app/package.json'
ENOENT: no such file or directory
```

---

### 2. **Build Command Executando do Lugar Errado**
O comando `cd apps/web && npm install` pode não funcionar no Railway

**Solução:** Usar **Root Directory** no Railway ao invés de `cd`

---

### 3. **Dependências Não Instaladas**
Pacotes do workspace não estão acessíveis

**Sintoma nos logs:**
```
Cannot find module '@edro/shared'
Module not found: Error: Can't resolve '...'
```

---

## ✅ SOLUÇÃO CORRETA:

### Não use `cd` nos comandos!

Ao invés de:
```json
{
  "buildCommand": "cd apps/web && npm install && npm run build",
  "startCommand": "cd apps/web && npm start"
}
```

### Use Root Directory no Railway:

**No Railway Dashboard:**

1. Clique no serviço (ex: @edro/web)
2. Vá em **Settings**
3. Encontre **"Root Directory"**
4. Configure: `apps/web`
5. Limpe os comandos:
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`

---

## 🎯 Configuração Passo-a-Passo:

### **@edro/web:**

```
Settings:
├── Root Directory: apps/web
├── Build Command: npm install && npm run build
└── Start Command: npm start

Variables:
├── NEXT_PUBLIC_API_URL=https://[backend-url].railway.app
└── NODE_ENV=production
```

### **@edro/web-aluno:**

```
Settings:
├── Root Directory: apps/web-aluno
├── Build Command: npm install && npm run build
└── Start Command: npm start

Variables:
├── NEXT_PUBLIC_API_URL=https://[backend-url].railway.app
└── NODE_ENV=production
```

### **@edro/ai:**

❌ **Remover este serviço!** Não é um app standalone.

---

## 📋 Como Ver os Logs (Me envie isso):

1. Railway → Clique em **@edro/web**
2. Deployments → Último deployment
3. Veja os logs
4. **Copie as últimas 30-50 linhas**
5. Cole aqui

---

## 🔧 Correção Rápida no Railway:

### **Para @edro/web:**

1. Settings
2. **Service Settings:**
   ```
   Root Directory: apps/web
   ```
3. **Build Settings:**
   ```
   Build Command: (deixe vazio ou "npm install && npm run build")
   ```
4. **Deploy Settings:**
   ```
   Start Command: (deixe vazio ou "npm start")
   ```
5. Variables:
   ```
   NEXT_PUBLIC_API_URL=https://memodrops-backend-production.up.railway.app
   NODE_ENV=production
   ```
6. **Salvar tudo**
7. Deployments → ... → **Redeploy**

### **Repita para @edro/web-aluno**

---

## 🚨 Se Continuar Crashando:

### Possível causa: Monorepo não suportado

Nesse caso, precisamos ajustar a estratégia:

**Opção A: Dockerfile específico para cada app**

Criar `apps/web/Dockerfile`:
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copiar package.json
COPY package.json ./
COPY package-lock.json ./

# Instalar dependências
RUN npm install

# Copiar código
COPY . .

# Build
RUN npm run build

# Expor porta
EXPOSE 3000

# Start
CMD ["npm", "start"]
```

**Opção B: Usar Vercel/Netlify para Next.js apps**

Next.js funciona melhor em plataformas especializadas:
- ✅ Vercel (criadores do Next.js)
- ✅ Netlify
- ✅ Railway (com configuração correta)

---

## 💡 Teste Rápido:

### Verificar se o app funciona localmente:

```bash
cd apps/web
npm install
npm run build
npm start

# Abrir: http://localhost:3000
```

Se funcionar localmente, o problema é configuração do Railway.

---

## 📞 Próximos Passos:

1. **Configure Root Directory** no Railway (sem usar `cd`)
2. **Limpe os comandos customizados** 
3. **Adicione variáveis de ambiente**
4. **Redeploy**
5. **Se falhar:** Me envie os logs completos

---

## 🎯 Objetivo:

```
✅ Backend: Online
✅ Postgres: Online
✅ Scrapers: Online ✨
🔄 Web: Online (após configurar)
🔄 Web-Aluno: Online (após configurar)
❌ AI: Remover (não é app)
```

---

**Me envie os logs do crash para eu poder ajudar melhor!** 🔍
