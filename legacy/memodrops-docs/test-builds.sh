#!/bin/bash

# 🧪 Script para testar builds localmente antes do deploy
# Uso: ./test-builds.sh

echo "🧪 Testando builds de todos os serviços..."
echo ""

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Contador de erros
ERRORS=0

# ============================================
# Função helper para testar build
# ============================================
test_build() {
    local service=$1
    local path=$2
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🔨 Testando: $service"
    echo "📂 Caminho: $path"
    echo ""
    
    if [ ! -d "$path" ]; then
        echo -e "${RED}❌ Pasta não encontrada: $path${NC}"
        ((ERRORS++))
        return 1
    fi
    
    cd "$path" || exit
    
    # Verificar se tem package.json
    if [ ! -f "package.json" ]; then
        echo -e "${RED}❌ package.json não encontrado${NC}"
        ((ERRORS++))
        cd - > /dev/null
        return 1
    fi
    
    echo "📦 Instalando dependências..."
    npm install > /dev/null 2>&1
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Erro ao instalar dependências${NC}"
        ((ERRORS++))
        cd - > /dev/null
        return 1
    fi
    
    echo "🔨 Executando build..."
    npm run build
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Build OK!${NC}"
    else
        echo -e "${RED}❌ Build FALHOU${NC}"
        ((ERRORS++))
    fi
    
    cd - > /dev/null
    echo ""
}

# ============================================
# Testar cada serviço
# ============================================

# Backend (TypeScript)
test_build "Backend" "apps/backend"

# Web Admin (Next.js)
test_build "Web Admin" "apps/web"

# Web Aluno (Next.js) - se existir
if [ -d "apps/web-aluno" ]; then
    test_build "Web Aluno" "apps/web-aluno"
fi

# AI Service - se existir
if [ -d "apps/ai" ]; then
    test_build "AI Service" "apps/ai"
fi

# Scrapers - se existir
if [ -d "scrapers" ]; then
    test_build "Scrapers" "scrapers"
elif [ -d "apps/scrapers" ]; then
    test_build "Scrapers" "apps/scrapers"
fi

# ============================================
# Resultado Final
# ============================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}🎉 TODOS OS BUILDS PASSARAM!${NC}"
    echo ""
    echo "✅ Você pode fazer deploy com segurança:"
    echo "   git add ."
    echo "   git commit -m 'fix: correções de build'"
    echo "   git push origin main"
    exit 0
else
    echo -e "${RED}❌ $ERRORS serviço(s) com erro de build${NC}"
    echo ""
    echo "⚠️  Corrija os erros antes de fazer deploy!"
    echo ""
    echo "💡 Dicas:"
    echo "   1. Verifique os logs acima"
    echo "   2. Corrija os erros de TypeScript/ESLint"
    echo "   3. Execute novamente: ./test-builds.sh"
    exit 1
fi
