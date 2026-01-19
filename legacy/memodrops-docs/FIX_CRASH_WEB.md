# 🔧 FIX: Crash do Web App

## 🚨 PROBLEMA IDENTIFICADO

```
Error: Cannot find module '@heroui/theme'
```

**Causa**: Faltou instalar o pacote `@heroui/theme` separadamente do `@heroui/react`

---

## ✅ SOLUÇÃO APLICADA

### **1. Adicionado `@heroui/theme` ao package.json**

```json
{
  "dependencies": {
    "@heroui/react": "^2.8.5",
    "@heroui/theme": "^2.4.23",  // ← NOVO
    "framer-motion": "^12.23.25"
  }
}
```

### **2. Corrigido import no tailwind.config.js**

```js
// ANTES (ERRADO):
const { heroui } = require("@heroui/react");

// DEPOIS (CORRETO):
const { heroui } = require("@heroui/theme");
```

---

## 🚀 PRÓXIMOS PASSOS

```bash
# 1. Commit e push
git add apps/web/package.json apps/web/tailwind.config.js
git commit -m "fix: Add @heroui/theme dependency to fix crash"
git push origin main

# 2. Railway vai rebuildar automaticamente
# 3. Aguarde 3-5 minutos
# 4. Verifique novamente
```

---

## 📦 DEPENDÊNCIAS CORRETAS DO HEROUI

Para usar HeroUI, você precisa de **3 pacotes**:

```json
{
  "dependencies": {
    "@heroui/react": "^2.8.5",    // Componentes React
    "@heroui/theme": "^2.4.23",   // Sistema de temas
    "framer-motion": "^12.23.25"  // Animações
  }
}
```

---

## ✅ CHECKLIST

- [x] `@heroui/react` instalado
- [x] `@heroui/theme` instalado ← **FIX APLICADO**
- [x] `framer-motion` instalado
- [x] Import correto no tailwind.config.js ← **FIX APLICADO**
- [ ] Commit feito
- [ ] Push para GitHub
- [ ] Railway rebuild

---

## 🎯 STATUS

```
╔═══════════════════════════════════════════════════╗
║                                                   ║
║   ⚠️  PROBLEMA: Faltava @heroui/theme            ║
║                                                   ║
║   ✅ FIX: Dependência adicionada                 ║
║   ✅ FIX: Import corrigido                       ║
║                                                   ║
║   ⏳ PRÓXIMO: Commit + Push                      ║
║                                                   ║
╚═══════════════════════════════════════════════════╝
```

---

**Fix aplicado em**: 2025-01-22 17:00  
**Pronto para**: Commit e push
