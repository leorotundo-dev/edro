# 🚀 EXECUTAR MIGRAÇÕES VIA RAILWAY CLI

## 📋 MÉTODO 1: Railway CLI + Script

### Passo 1: Instalar Railway CLI

```powershell
# Windows (PowerShell como Admin)
iwr https://railway.app/install.ps1 | iex
```

Ou baixe em: https://docs.railway.app/guides/cli

### Passo 2: Login

```powershell
railway login
```

Isso abrirá o navegador para você fazer login.

### Passo 3: Linkar ao Projeto

```powershell
cd memodrops-main
railway link
```

Escolha o projeto **MemoDrops** quando aparecer a lista.

### Passo 4: Executar Migrações

```powershell
railway run node executar-migrations-agora.js
```

**OU** execute diretamente no PostgreSQL:

```powershell
railway run -- psql $DATABASE_URL -f EXECUTAR_NO_RAILWAY.sql
```

---

## 📋 MÉTODO 2: Executar Direto no Backend Deploy

### Passo 1: Copiar Script para o Repo

O arquivo `executar-migrations-agora.js` já está na raiz.

### Passo 2: Adicionar Script no package.json

Vou fazer isso agora...

### Passo 3: Executar via Railway

```powershell
railway run npm run migrate:jobs
```

---

## 📋 MÉTODO 3: Via Conexão Direta (psql local)

### Passo 1: Obter DATABASE_URL

```powershell
railway variables
```

Copie o valor de `DATABASE_URL`.

### Passo 2: Executar com psql (se tiver instalado)

```powershell
$env:DATABASE_URL = "postgresql://..."
node executar-migrations-agora.js
```

---

## ✅ QUAL MÉTODO USAR?

**Recomendo: MÉTODO 1** (Railway CLI)
- Mais simples
- Mais rápido
- Mais confiável

**Alternativa: MÉTODO 2** (Backend Deploy)
- Não precisa instalar nada
- Executa direto no Railway

---

## 🆘 PRECISA DE AJUDA?

Me diga qual método você quer tentar e eu te guio passo a passo!
