# 🔍 PRÉ-DEPLOY CHECK - SISTEMA DE EDITAIS
# Verifica se tudo está pronto para deploy

Write-Host "╔═══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   🔍 VERIFICAÇÃO PRÉ-DEPLOY - SISTEMA DE EDITAIS        ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

$totalChecks = 0
$passedChecks = 0

function Test-Check {
    param(
        [string]$Name,
        [scriptblock]$Test
    )
    
    $script:totalChecks++
    Write-Host "🔍 $Name" -NoNewline
    
    try {
        $result = & $Test
        if ($result) {
            Write-Host " ✅" -ForegroundColor Green
            $script:passedChecks++
            return $true
        } else {
            Write-Host " ❌" -ForegroundColor Red
            return $false
        }
    }
    catch {
        Write-Host " ❌ (Erro: $_)" -ForegroundColor Red
        return $false
    }
}

# ═══════════════════════════════════════════════════════════
# BACKEND CHECKS
# ═══════════════════════════════════════════════════════════

Write-Host "`n📦 BACKEND FILES" -ForegroundColor Magenta
Write-Host "─────────────────────────────────────────────────────────────" -ForegroundColor Gray

Test-Check "Rota de editais existe" {
    Test-Path "apps/backend/src/routes/editais.ts"
}

Test-Check "Repository de editais existe" {
    Test-Path "apps/backend/src/repositories/editalRepository.ts"
}

Test-Check "Types de editais existem" {
    Test-Path "apps/backend/src/types/edital.ts"
}

Test-Check "Migration 0014 existe" {
    Test-Path "apps/backend/src/db/migrations/0014_editais_system.sql"
}

Test-Check "Package.json do backend existe" {
    Test-Path "apps/backend/package.json"
}

Test-Check "Railway.json do backend existe" {
    Test-Path "apps/backend/railway.json"
}

# ═══════════════════════════════════════════════════════════
# FRONTEND CHECKS
# ═══════════════════════════════════════════════════════════

Write-Host "`n🌐 FRONTEND FILES" -ForegroundColor Magenta
Write-Host "─────────────────────────────────────────────────────────────" -ForegroundColor Gray

Test-Check "Página de listagem existe" {
    Test-Path "apps/web/app/admin/editais/page.tsx"
}

Test-Check "Página de criar existe" {
    Test-Path "apps/web/app/admin/editais/novo/page.tsx"
}

Test-Check "Página de detalhes existe" {
    Test-Path "apps/web/app/admin/editais/[id]/page.tsx"
}

Test-Check "Página de editar existe" {
    Test-Path "apps/web/app/admin/editais/[id]/editar/page.tsx"
}

Test-Check "Componente Toast existe" {
    Test-Path "apps/web/components/ui/Toast.tsx"
}

Test-Check "Componente AdvancedFilters existe" {
    Test-Path "apps/web/components/editais/AdvancedFilters.tsx"
}

Test-Check "Componente BulkActions existe" {
    Test-Path "apps/web/components/editais/BulkActions.tsx"
}

Test-Check "Utility toast.ts existe" {
    Test-Path "apps/web/lib/toast.ts"
}

Test-Check "Utility validation.ts existe" {
    Test-Path "apps/web/lib/validation.ts"
}

Test-Check "Utility export.ts existe" {
    Test-Path "apps/web/lib/export.ts"
}

Test-Check "Package.json do web existe" {
    Test-Path "apps/web/package.json"
}

# ═══════════════════════════════════════════════════════════
# DOCUMENTATION CHECKS
# ═══════════════════════════════════════════════════════════

Write-Host "`n📚 DOCUMENTATION" -ForegroundColor Magenta
Write-Host "─────────────────────────────────────────────────────────────" -ForegroundColor Gray

Test-Check "README.md existe" {
    Test-Path "apps/web/app/admin/editais/README.md"
}

Test-Check "QUICK_START.md existe" {
    Test-Path "apps/web/app/admin/editais/QUICK_START.md"
}

Test-Check "Script de testes existe" {
    Test-Path "apps/web/app/admin/editais/test-editais-system.ps1"
}

Test-Check "Guia de deploy existe" {
    Test-Path "DEPLOY_EDITAIS_GUIA.md"
}

# ═══════════════════════════════════════════════════════════
# TOOLS CHECKS
# ═══════════════════════════════════════════════════════════

Write-Host "`n🔧 FERRAMENTAS" -ForegroundColor Magenta
Write-Host "─────────────────────────────────────────────────────────────" -ForegroundColor Gray

Test-Check "Git instalado" {
    try {
        $null = git --version 2>&1
        return $true
    } catch {
        return $false
    }
}

Test-Check "Node.js instalado" {
    try {
        $null = node --version 2>&1
        return $true
    } catch {
        return $false
    }
}

Test-Check "pnpm instalado" {
    try {
        $null = pnpm --version 2>&1
        return $true
    } catch {
        return $false
    }
}

Test-Check "Railway CLI instalado" {
    try {
        $null = railway --version 2>&1
        return $true
    } catch {
        return $false
    }
}

# ═══════════════════════════════════════════════════════════
# CONFIGURATION CHECKS
# ═══════════════════════════════════════════════════════════

Write-Host "`n⚙️  CONFIGURAÇÕES" -ForegroundColor Magenta
Write-Host "─────────────────────────────────────────────────────────────" -ForegroundColor Gray

Test-Check "Git repository inicializado" {
    Test-Path ".git"
}

Test-Check "Node_modules do backend existe" {
    Test-Path "apps/backend/node_modules"
}

Test-Check "Node_modules do web existe" {
    Test-Path "apps/web/node_modules"
}

# ═══════════════════════════════════════════════════════════
# AUTHENTICATION CHECKS
# ═══════════════════════════════════════════════════════════

Write-Host "`n🔐 AUTENTICAÇÃO" -ForegroundColor Magenta
Write-Host "─────────────────────────────────────────────────────────────" -ForegroundColor Gray

$railwayAuth = Test-Check "Railway autenticado" {
    try {
        railway whoami 2>&1 | Out-Null
        return $true
    } catch {
        return $false
    }
}

# ═══════════════════════════════════════════════════════════
# RESULTADO FINAL
# ═══════════════════════════════════════════════════════════

Write-Host "`n═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "   RESULTADO DA VERIFICAÇÃO" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan

$percentage = [math]::Round(($passedChecks / $totalChecks) * 100, 1)

Write-Host "`n📊 Total de verificações: $totalChecks" -ForegroundColor White
Write-Host "✅ Passaram: $passedChecks" -ForegroundColor Green
Write-Host "❌ Falharam: $($totalChecks - $passedChecks)" -ForegroundColor Red
Write-Host "📈 Percentual: $percentage%" -ForegroundColor $(if ($percentage -ge 90) { "Green" } elseif ($percentage -ge 70) { "Yellow" } else { "Red" })

Write-Host "`n─────────────────────────────────────────────────────────────" -ForegroundColor Gray

if ($percentage -eq 100) {
    Write-Host "🎉 PERFEITO! Tudo pronto para deploy!" -ForegroundColor Green
    Write-Host "`n✨ Você pode fazer o deploy agora:" -ForegroundColor Cyan
    Write-Host "   ./DEPLOY_EDITAIS_AGORA.ps1" -ForegroundColor Yellow
}
elseif ($percentage -ge 90) {
    Write-Host "✅ QUASE PERFEITO! Sistema pronto para deploy" -ForegroundColor Green
    Write-Host "`n⚠️  Algumas verificações falharam, mas não são críticas" -ForegroundColor Yellow
    Write-Host "   Você pode prosseguir com o deploy" -ForegroundColor Gray
}
elseif ($percentage -ge 70) {
    Write-Host "⚠️  ATENÇÃO! Alguns problemas encontrados" -ForegroundColor Yellow
    Write-Host "`n📝 Recomendações:" -ForegroundColor Cyan
    Write-Host "   1. Revise os itens que falharam acima" -ForegroundColor Gray
    Write-Host "   2. Corrija os problemas críticos" -ForegroundColor Gray
    Write-Host "   3. Execute novamente esta verificação" -ForegroundColor Gray
}
else {
    Write-Host "❌ MUITOS PROBLEMAS! Não recomendado fazer deploy agora" -ForegroundColor Red
    Write-Host "`n🔧 Ações necessárias:" -ForegroundColor Cyan
    Write-Host "   1. Revise TODOS os itens que falharam" -ForegroundColor Gray
    Write-Host "   2. Instale ferramentas faltantes" -ForegroundColor Gray
    Write-Host "   3. Configure autenticações" -ForegroundColor Gray
    Write-Host "   4. Execute novamente esta verificação" -ForegroundColor Gray
}

# ═══════════════════════════════════════════════════════════
# PRÓXIMOS PASSOS
# ═══════════════════════════════════════════════════════════

Write-Host "`n─────────────────────────────────────────────────────────────" -ForegroundColor Gray
Write-Host "📋 PRÓXIMOS PASSOS" -ForegroundColor Magenta

if ($passedChecks -lt $totalChecks) {
    Write-Host "`n❗ CORREÇÕES NECESSÁRIAS:" -ForegroundColor Yellow
    
    # Verificar ferramentas
    try {
        railway --version 2>&1 | Out-Null
    } catch {
        Write-Host "   • Instalar Railway CLI: npm install -g @railway/cli" -ForegroundColor Red
    }
    
    # Verificar auth
    if (-not $railwayAuth) {
        Write-Host "   • Fazer login no Railway: railway login" -ForegroundColor Red
    }
    
    # Verificar node_modules
    if (-not (Test-Path "apps/backend/node_modules")) {
        Write-Host "   • Instalar deps backend: cd apps/backend; pnpm install" -ForegroundColor Red
    }
    
    if (-not (Test-Path "apps/web/node_modules")) {
        Write-Host "   • Instalar deps frontend: cd apps/web; pnpm install" -ForegroundColor Red
    }
}

Write-Host "`n✅ QUANDO TUDO ESTIVER OK:" -ForegroundColor Green
Write-Host "   1. Execute: ./DEPLOY_EDITAIS_AGORA.ps1" -ForegroundColor Cyan
Write-Host "   2. Escolha opção de deploy (1, 2 ou 3)" -ForegroundColor Cyan
Write-Host "   3. Aguarde conclusão" -ForegroundColor Cyan
Write-Host "   4. Teste o sistema online" -ForegroundColor Cyan

Write-Host "`n═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✨ Verificação concluída!" -ForegroundColor White
Write-Host "═══════════════════════════════════════════════════════════`n" -ForegroundColor Cyan
