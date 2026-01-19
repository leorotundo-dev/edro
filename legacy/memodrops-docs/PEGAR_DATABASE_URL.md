# 🔑 COMO PEGAR A DATABASE_URL DO RAILWAY

## **MÉTODO 1: Via Railway Web (MAIS FÁCIL)** ⭐

### **Passo 1: Acessar o Railway**
1. Vá em: https://railway.app/login
2. Faça login

### **Passo 2: Abrir o Projeto**
- **Project ID**: `e0ca0841-18bc-4c48-942e-d90a6b725a5b`
- Ou procure por: **"memodrops-backend"**

### **Passo 3: Ver Variáveis**
1. Clique no serviço **"memodrops-backend"**
2. Vá na aba **"Variables"** (ou "Variáveis")
3. Procure por: **`DATABASE_URL`**
4. Copie o valor completo

Vai estar assim:
```
postgresql://postgres:SENHA_AQUI@HOST.railway.app:5432/railway
```

### **Passo 4: Colar no .env**
Cole no arquivo: `apps/backend/.env`

```env
DATABASE_URL=postgresql://postgres:SENHA@HOST.railway.app:5432/railway
JWT_SECRET=seu-jwt-secret-aqui
```

---

## **MÉTODO 2: Via Railway CLI**

Se você tem a Railway CLI instalada:

```bash
# Login
railway login

# Linkar ao projeto
railway link e0ca0841-18bc-4c48-942e-d90a6b725a5b

# Ver variáveis
railway variables

# Ou diretamente:
railway variables get DATABASE_URL
```

---

## **MÉTODO 3: Usar API do Railway**

Vou fazer isso para você agora! 👇
