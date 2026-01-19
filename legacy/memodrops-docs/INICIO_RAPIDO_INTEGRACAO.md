# 🚀 INÍCIO RÁPIDO - INTEGRAÇÃO COMPLETA

## ✅ STATUS ATUAL

- **Web-Aluno Docker:** ✅ RODANDO (porta 3001)
- **Backend:** ⏳ Pronto para iniciar (porta 3333)
- **Frontend Admin:** ⏳ Pronto para iniciar (porta 3000)

---

## 🎯 OBJETIVO

Iniciar todo o sistema MemoDrops localmente para testes e integração.

---

## 📋 PASSO A PASSO

### 1. Iniciar Backend (Terminal 1)

```powershell
# Abra um novo terminal PowerShell
cd memodrops-main/apps/backend

# Instalar dependências (se necessário)
pnpm install

# Iniciar backend
pnpm run dev
```

**Aguarde ver:**
```
✅ Sistema de migrações finalizado!
🚀 MemoDrops backend rodando na porta 3333
```

### 2. Iniciar Frontend Admin (Terminal 2)

```powershell
# Abra OUTRO terminal PowerShell
cd memodrops-main/apps/web

# Instalar dependências (se necessário)
pnpm install

# Iniciar frontend
pnpm run dev
```

**Aguarde ver:**
```
✓ Ready in X ms
Local: http://localhost:3000
```

### 3. Verificar Web-Aluno Docker

O Web-Aluno já está rodando no Docker!

```powershell
# Verificar status
docker ps | findstr web-aluno

# Ver logs
docker logs web-aluno-container
```

---

## 🌐 ACESSAR O SISTEMA

Após iniciar tudo, acesse:

### Backend API
```
http://localhost:3333
http://localhost:3333/health
```

### Frontend Admin
```
http://localhost:3000
http://localhost:3000/admin/login
```

### Frontend Aluno (Docker)
```
http://localhost:3001
http://localhost:3001/login
```

---

## 🧪 TESTES RÁPIDOS

### 1. Testar Backend
```powershell
Invoke-WebRequest -Uri "http://localhost:3333/health"
```
**Esperado:** Status 200

### 2. Testar Frontend Admin
Abra no navegador: `http://localhost:3000`

### 3. Testar Frontend Aluno
Abra no navegador: `http://localhost:3001`

---

## 🐛 TROUBLESHOOTING

### Backend não inicia

**Problema:** Erro de conexão com banco
```powershell
# Verificar .env
cd apps/backend
cat .env

# Deve conter:
# DATABASE_URL=postgresql://...
# JWT_SECRET=...
# OPENAI_API_KEY=...
```

### Porta em uso

**Problema:** "Port already in use"
```powershell
# Ver o que está usando a porta
Get-NetTCPConnection -LocalPort 3333

# Matar processo
Stop-Process -Id <PID> -Force
```

### Frontend não conecta

**Problema:** CORS ou API não encontrada
```powershell
# Verificar se backend está rodando
Invoke-WebRequest http://localhost:3333/health

# Verificar variável de ambiente
cd apps/web
cat .env.local
# Deve ter: NEXT_PUBLIC_API_URL=http://localhost:3333
```

---

## ✅ CHECKLIST

Marque conforme completa:

- [ ] Backend iniciado (porta 3333)
- [ ] Frontend Admin iniciado (porta 3000)
- [ ] Web-Aluno Docker rodando (porta 3001)
- [ ] Backend health check OK
- [ ] Frontend Admin acessível
- [ ] Frontend Aluno acessível
- [ ] Pode navegar entre páginas

---

## 🎉 PRÓXIMOS PASSOS

Quando tudo estiver funcionando:

1. **Testar fluxo completo** → `GUIA_TESTES_INTEGRACAO.md`
2. **Deploy em produção** → `DEPLOY_COMPLETO_GUIA.md`
3. **Criar Mobile App** → `apps/mobile/README.md`

---

## 📞 COMANDOS ÚTEIS

```powershell
# Parar tudo
# Ctrl+C em cada terminal

# Ver logs do Docker
docker logs web-aluno-container -f

# Reiniciar Docker
docker restart web-aluno-container

# Limpar e reinstalar
cd apps/backend
Remove-Item -Recurse node_modules
pnpm install
```

---

**Tempo estimado:** 5-10 minutos
**Dificuldade:** Fácil
**Data:** Janeiro 2025

🚀 **BOA SORTE!**
