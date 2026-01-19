2
# 🔧 CONSERTAR RAILWAY WEB - PASSO A PASSO

## O problema:
O serviço `@edro/web` está rodando o BACKEND em vez do FRONTEND.

## Solução:

### **Opção 1: Criar novo serviço (RECOMENDADO)**

1. https://railway.app/project/7d5e064d-822b-4500-af2a-fde22f961c23
2. Click **"+ New"**
3. **"Empty Service"**
4. Nome: `memodrops-dashboard`
5. Settings → **Source**:
   - Connect GitHub: `leorotundo-dev/memodrops`
   - **Root Directory**: `apps/web`
   - **Watch Paths**: `/apps/web/**`
6. Settings → **Build**:
   - **Builder**: Nixpacks
7. Settings → **Deploy**:
   - **Start Command**: (deixar vazio)
8. Settings → **Variables**:
   ```
   NEXT_PUBLIC_API_URL=https://memodropsweb-production.up.railway.app
   ```
9. Deploy

---

### **Opção 2: Consertar o serviço atual**

No serviço `@edro/web`:

1. Settings → **Source**
   - **Root Directory**: MUDAR PARA `apps/web`
   
2. Settings → **Build**
   - **Dockerfile Path**: DELETAR (deixar vazio)
   - **Builder**: Nixpacks
   
3. Settings → **Deploy**
   - **Start Command**: DELETAR (deixar vazio)

4. **Redeploy**

---

## ✅ Como saber que funcionou:

Quando acessar a URL, deve aparecer a **dashboard Next.js**, não mais o JSON do backend!

---

**Escolhe uma opção e faz! Eu não consigo fazer pelo CLI porque precisa de interação manual.** 🚀
