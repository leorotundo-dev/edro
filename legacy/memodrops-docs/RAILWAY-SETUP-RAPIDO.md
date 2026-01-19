# ⚡ Railway Setup Rápido - Configurar Database

## 🎯 O que você precisa fazer AGORA

### 1. Gerar JWT_SECRET
Execute este comando no PowerShell:
```powershell
-join ((33..126) | Get-Random -Count 40 | ForEach-Object {[char]$_})
```
Copie o resultado. Exemplo: `A#k9@mX2&pQ7*wR4!nZ8$bY5%cT3^vL6&hJ1`

---

### 2. Acessar Railway
Abra: https://railway.app/dashboard

---

### 3. Criar PostgreSQL (se não existir)
1. Abra seu projeto **MemoDrops**
2. Clique **+ New**
3. Selecione **Database** → **PostgreSQL**
4. Aguarde 2 minutos

---

### 4. Configurar Variáveis no Backend

Clique no serviço **backend** → Aba **Variables** → **+ New Variable**

Adicione estas variáveis **UMA POR UMA**:

#### ✅ OBRIGATÓRIAS:

| Key | Value |
|-----|-------|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
| `JWT_SECRET` | *Cole o valor gerado no passo 1* |
| `PORT` | `8080` |
| `NODE_ENV` | `production` |

#### 📋 RECOMENDADAS:

| Key | Value |
|-----|-------|
| `ALLOWED_ORIGINS` | `https://memodrops-dashboard-1bj6g09lt-memo-drops.vercel.app,https://memodrops-dashboard-*.vercel.app` |
| `OPENAI_API_KEY` | *Sua chave da OpenAI (se tiver)* |
| `OPENAI_BASE_URL` | `https://api.openai.com/v1` |
| `OPENAI_MODEL` | `gpt-4o-mini` |

---

### 5. Aguardar Redeploy
- Railway faz redeploy automático (~2 minutos)
- Aguarde finalizar

---

### 6. Verificar Logs
Clique no backend → Aba **Deployments** → Último deploy → **View Logs**

#### ✅ Logs de Sucesso:
```
Server listening at http://0.0.0.0:8080
[jobs] 🚀 Job worker iniciado
[cron] 🕐 Cron iniciado
```

#### ❌ Se ainda ver erro "ENOTFOUND host":
- Verifique se `DATABASE_URL` está com `${{Postgres.DATABASE_URL}}`
- Não cole valor direto, use a referência

---

## 🚨 Problemas Comuns

### "getaddrinfo ENOTFOUND host"
**Causa**: DATABASE_URL não configurada  
**Solução**: Usar referência `${{Postgres.DATABASE_URL}}`

### "relation users does not exist"
**Causa**: Migrations não rodaram  
**Solução**: Rodar migrations:
```bash
cd memodrops-main
railway link
railway run npm run migrate --workspace @edro/backend
```

---

## ✅ Checklist Final

- [ ] PostgreSQL criado no Railway
- [ ] DATABASE_URL = `${{Postgres.DATABASE_URL}}`
- [ ] JWT_SECRET configurado (40+ caracteres)
- [ ] PORT = 8080
- [ ] NODE_ENV = production
- [ ] ALLOWED_ORIGINS configurado
- [ ] Redeploy concluído
- [ ] Logs sem erros "ENOTFOUND"
- [ ] Servidor respondendo

---

## 🔗 Próximo Passo

Após configurar, me avise para verificarmos os logs juntos! 🚀
