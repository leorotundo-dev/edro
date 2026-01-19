# 🚀 DEPLOY DO SISTEMA DE EDITAIS
# Script automatizado para deploy completo

Write-Host "╔═══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   🚀 DEPLOY DO SISTEMA DE EDITAIS - MEMODROPS           ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

$ErrorActionPreference = "Continue"

# Função para executar comando com feedback
function Invoke-Step {
    param(
        [string]$Title,
        [scriptblock]$Command
    )
    
    Write-Host "▶ $Title" -ForegroundColor Yellow
    try {
        & $Command
        Write-Host "  ✅ Sucesso!" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Host "  ❌ Erro: $_" -ForegroundColor Red
        return $false
    }
}

# Verificar se Railway CLI está instalado
Write-Host "`n📦 VERIFICANDO DEPENDÊNCIAS..." -ForegroundColor Magenta
Write-Host "─────────────────────────────────────────────────────────────" -ForegroundColor Gray

$railwayInstalled = $false
try {
    $railwayVersion = railway --version 2>$null
    if ($railwayVersion) {
        Write-Host "✅ Railway CLI: $railwayVersion" -ForegroundColor Green
        $railwayInstalled = $true
    }
}
catch {
    Write-Host "❌ Railway CLI não instalado" -ForegroundColor Red
    Write-Host "   Instale com: npm install -g @railway/cli" -ForegroundColor Yellow
}

# Verificar se está logado no Railway
if ($railwayInstalled) {
    try {
        railway whoami 2>$null | Out-Null
        Write-Host "✅ Autenticado no Railway" -ForegroundColor Green
    }
    catch {
        Write-Host "⚠️  Não autenticado no Railway" -ForegroundColor Yellow
        Write-Host "   Execute: railway login" -ForegroundColor Yellow
        
        $login = Read-Host "`n   Deseja fazer login agora? (s/n)"
        if ($login -eq "s") {
            railway login
        }
    }
}

# Verificar Vercel CLI
$vercelInstalled = $false
try {
    $vercelVersion = vercel --version 2>$null
    if ($vercelVersion) {
        Write-Host "✅ Vercel CLI: $vercelVersion" -ForegroundColor Green
        $vercelInstalled = $true
    }
}
catch {
    Write-Host "❌ Vercel CLI não instalado" -ForegroundColor Red
    Write-Host "   Instale com: npm install -g vercel" -ForegroundColor Yellow
}

Write-Host "`n════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "   OPÇÕES DE DEPLOY" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan

Write-Host "`n1. 🔧 BACKEND (Railway)" -ForegroundColor Yellow
Write-Host "   • API endpoints de editais"
Write-Host "   • Repositórios e serviços"
Write-Host "   • Migrations do banco de dados"

Write-Host "`n2. 🌐 FRONTEND (Vercel/Railway)" -ForegroundColor Yellow
Write-Host "   • Páginas de gestão de editais"
Write-Host "   • Componentes UI (Toast, Filters, etc)"
Write-Host "   • Utilities (validation, export, etc)"

Write-Host "`n3. 🎯 TUDO (Backend + Frontend)" -ForegroundColor Yellow
Write-Host "   • Deploy completo do sistema"

Write-Host "`n════════════════════════════════════════════════════════════" -ForegroundColor Cyan

$choice = Read-Host "`nEscolha uma opção (1, 2 ou 3)"

switch ($choice) {
    "1" {
        Write-Host "`n🔧 DEPLOY DO BACKEND" -ForegroundColor Magenta
        Write-Host "─────────────────────────────────────────────────────────────" -ForegroundColor Gray
        
        if (-not $railwayInstalled) {
            Write-Host "❌ Railway CLI não está instalado!" -ForegroundColor Red
            Write-Host "   Instale com: npm install -g @railway/cli" -ForegroundColor Yellow
            exit
        }
        
        # Navegar para pasta do backend
        Set-Location "apps/backend"
        
        # Verificar arquivos importantes
        Write-Host "`n📋 Verificando arquivos do backend..." -ForegroundColor Cyan
        
        $backendFiles = @(
            "src/routes/editais.ts",
            "src/repositories/editalRepository.ts",
            "src/types/edital.ts",
            "src/db/migrations/0014_editais_system.sql"
        )
        
        $allFilesExist = $true
        foreach ($file in $backendFiles) {
            if (Test-Path $file) {
                Write-Host "  ✅ $file" -ForegroundColor Green
            } else {
                Write-Host "  ❌ $file (não encontrado)" -ForegroundColor Red
                $allFilesExist = $false
            }
        }
        
        if (-not $allFilesExist) {
            Write-Host "`n⚠️  Alguns arquivos não foram encontrados!" -ForegroundColor Yellow
            $continue = Read-Host "Continuar mesmo assim? (s/n)"
            if ($continue -ne "s") {
                exit
            }
        }
        
        # Deploy no Railway
        Write-Host "`n🚀 Fazendo deploy no Railway..." -ForegroundColor Cyan
        Write-Host "   Isso pode levar alguns minutos..." -ForegroundColor Gray
        
        railway up
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "`n✅ BACKEND DEPLOYADO COM SUCESSO!" -ForegroundColor Green
            Write-Host "`n📍 Próximos passos:" -ForegroundColor Yellow
            Write-Host "   1. Verificar logs: railway logs" -ForegroundColor Cyan
            Write-Host "   2. Testar endpoints: apps/web/app/admin/editais/test-editais-system.ps1" -ForegroundColor Cyan
        } else {
            Write-Host "`n❌ Erro no deploy do backend" -ForegroundColor Red
        }
        
        Set-Location "../.."
    }
    
    "2" {
        Write-Host "`n🌐 DEPLOY DO FRONTEND" -ForegroundColor Magenta
        Write-Host "─────────────────────────────────────────────────────────────" -ForegroundColor Gray
        
        # Navegar para pasta do web
        Set-Location "apps/web"
        
        # Verificar arquivos importantes
        Write-Host "`n📋 Verificando arquivos do frontend..." -ForegroundColor Cyan
        
        $frontendFiles = @(
            "app/admin/editais/page.tsx",
            "app/admin/editais/novo/page.tsx",
            "app/admin/editais/[id]/page.tsx",
            "app/admin/editais/[id]/editar/page.tsx",
            "components/ui/Toast.tsx",
            "components/editais/AdvancedFilters.tsx",
            "components/editais/BulkActions.tsx",
            "lib/toast.ts",
            "lib/validation.ts",
            "lib/export.ts"
        )
        
        $allFilesExist = $true
        foreach ($file in $frontendFiles) {
            if (Test-Path $file) {
                Write-Host "  ✅ $file" -ForegroundColor Green
            } else {
                Write-Host "  ❌ $file (não encontrado)" -ForegroundColor Red
                $allFilesExist = $false
            }
        }
        
        if (-not $allFilesExist) {
            Write-Host "`n⚠️  Alguns arquivos não foram encontrados!" -ForegroundColor Yellow
            $continue = Read-Host "Continuar mesmo assim? (s/n)"
            if ($continue -ne "s") {
                exit
            }
        }
        
        Write-Host "`n🎨 Escolha a plataforma de deploy:" -ForegroundColor Yellow
        Write-Host "   1. Vercel (Recomendado para Next.js)"
        Write-Host "   2. Railway"
        $platform = Read-Host "Opção (1 ou 2)"
        
        if ($platform -eq "1") {
            if (-not $vercelInstalled) {
                Write-Host "❌ Vercel CLI não está instalado!" -ForegroundColor Red
                Write-Host "   Instale com: npm install -g vercel" -ForegroundColor Yellow
                exit
            }
            
            Write-Host "`n🚀 Fazendo deploy no Vercel..." -ForegroundColor Cyan
            vercel --prod
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "`n✅ FRONTEND DEPLOYADO COM SUCESSO NO VERCEL!" -ForegroundColor Green
            }
        }
        elseif ($platform -eq "2") {
            if (-not $railwayInstalled) {
                Write-Host "❌ Railway CLI não está instalado!" -ForegroundColor Red
                exit
            }
            
            Write-Host "`n🚀 Fazendo deploy no Railway..." -ForegroundColor Cyan
            railway up
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "`n✅ FRONTEND DEPLOYADO COM SUCESSO NO RAILWAY!" -ForegroundColor Green
            }
        }
        
        Set-Location "../.."
    }
    
    "3" {
        Write-Host "`n🎯 DEPLOY COMPLETO (BACKEND + FRONTEND)" -ForegroundColor Magenta
        Write-Host "─────────────────────────────────────────────────────────────" -ForegroundColor Gray
        
        # Deploy Backend
        Write-Host "`n1️⃣ BACKEND..." -ForegroundColor Cyan
        Set-Location "apps/backend"
        railway up
        $backendSuccess = $LASTEXITCODE -eq 0
        Set-Location "../.."
        
        if ($backendSuccess) {
            Write-Host "  ✅ Backend deployado!" -ForegroundColor Green
        } else {
            Write-Host "  ❌ Erro no backend" -ForegroundColor Red
        }
        
        # Deploy Frontend
        Write-Host "`n2️⃣ FRONTEND..." -ForegroundColor Cyan
        Set-Location "apps/web"
        
        Write-Host "   Escolha: 1=Vercel, 2=Railway"
        $platform = Read-Host "   Opção"
        
        if ($platform -eq "1") {
            vercel --prod
            $frontendSuccess = $LASTEXITCODE -eq 0
        } else {
            railway up
            $frontendSuccess = $LASTEXITCODE -eq 0
        }
        
        Set-Location "../.."
        
        if ($frontendSuccess) {
            Write-Host "  ✅ Frontend deployado!" -ForegroundColor Green
        } else {
            Write-Host "  ❌ Erro no frontend" -ForegroundColor Red
        }
        
        # Resumo final
        Write-Host "`n════════════════════════════════════════════════════════════" -ForegroundColor Cyan
        Write-Host "   RESUMO DO DEPLOY" -ForegroundColor Cyan
        Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan
        
        if ($backendSuccess) {
            Write-Host "✅ Backend" -ForegroundColor Green
        } else {
            Write-Host "❌ Backend" -ForegroundColor Red
        }
        
        if ($frontendSuccess) {
            Write-Host "✅ Frontend" -ForegroundColor Green
        } else {
            Write-Host "❌ Frontend" -ForegroundColor Red
        }
        
        if ($backendSuccess -and $frontendSuccess) {
            Write-Host "`n🎉 DEPLOY COMPLETO COM SUCESSO!" -ForegroundColor Green
        } else {
            Write-Host "`n⚠️  Deploy parcialmente concluído" -ForegroundColor Yellow
        }
    }
    
    default {
        Write-Host "`n❌ Opção inválida!" -ForegroundColor Red
        exit
    }
}

# Próximos passos
Write-Host "`n════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "   PRÓXIMOS PASSOS" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan

Write-Host "`n1. 🔍 VERIFICAR DEPLOY" -ForegroundColor Yellow
Write-Host "   Backend:  railway logs (no diretório apps/backend)"
Write-Host "   Frontend: Acesse a URL fornecida"

Write-Host "`n2. 🧪 TESTAR SISTEMA" -ForegroundColor Yellow
Write-Host "   Execute: cd apps/web/app/admin/editais"
Write-Host "           ./test-editais-system.ps1"

Write-Host "`n3. 🌐 ACESSAR SISTEMA" -ForegroundColor Yellow
Write-Host "   URL: https://seu-dominio.vercel.app/admin/editais"

Write-Host "`n4. 📊 MONITORAR" -ForegroundColor Yellow
Write-Host "   • Railway Dashboard: https://railway.app"
Write-Host "   • Vercel Dashboard: https://vercel.com"

Write-Host "`n════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✅ Script concluído!" -ForegroundColor Green
Write-Host "════════════════════════════════════════════════════════════`n" -ForegroundColor Cyan
