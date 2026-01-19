# 🔄 Atualizar Deploy Existente - MemoDrops
# Script para atualizar deploys Railway e Vercel existentes

Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "   ATUALIZAR DEPLOY MEMODROPS" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""

# ============================================
# INFORMAÇÕES DO PROJETO
# ============================================

$RAILWAY_PROJECT_ID = "e0ca0841-18bc-4c48-942e-d90a6b725a5b"
$VERCEL_PROJECT_ID_ADMIN = "prj_kBfCd0oCVTEEsfrlm2nCNnlFJKVA"
$VERCEL_TEAM_ID = "team_AAKdibSvyJYdKctKISN526zx"
$GITHUB_REPO = "leorotundo-dev/memodrops"
$BACKEND_URL = "https://backend-production-61d0.up.railway.app"
$ADMIN_URL = "https://memodrops-web.vercel.app"

Write-Host "📋 Informações do Projeto:" -ForegroundColor Yellow
Write-Host "  Backend:  $BACKEND_URL" -ForegroundColor Gray
Write-Host "  Admin:    $ADMIN_URL" -ForegroundColor Gray
Write-Host "  GitHub:   $GITHUB_REPO" -ForegroundColor Gray
Write-Host ""

# ============================================
# VERIFICAR CLIs
# ============================================

Write-Host "1. Verificando ferramentas..." -ForegroundColor Yellow

$hasRailway = $false
$hasVercel = $false

try {
    railway --version | Out-Null
    Write-Host "  ✅ Railway CLI instalado" -ForegroundColor Green
    $hasRailway = $true
} catch {
    Write-Host "  ⚠️  Railway CLI não instalado" -ForegroundColor Yellow
    Write-Host "     Instale: npm install -g @railway/cli" -ForegroundColor Gray
}

try {
    vercel --version | Out-Null
    Write-Host "  ✅ Vercel CLI instalado" -ForegroundColor Green
    $hasVercel = $true
} catch {
    Write-Host "  ⚠️  Vercel CLI não instalado" -ForegroundColor Yellow
    Write-Host "     Instale: npm install -g vercel" -ForegroundColor Gray
}

Write-Host ""

# ============================================
# MENU
# ============================================

Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "   O QUE VOCÊ QUER FAZER?" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. 🔄 Atualizar TUDO (Backend + Admin + Criar Aluno)" -ForegroundColor Green
Write-Host "2. 🚂 Atualizar apenas Backend (Railway)" -ForegroundColor Yellow
Write-Host "3. 🌐 Atualizar apenas Frontend Admin (Vercel)" -ForegroundColor Yellow
Write-Host "4. ➕ Criar Frontend Aluno (Vercel - NOVO!)" -ForegroundColor Cyan
Write-Host "5. 🔧 Apenas commit e push (sem redeploy)" -ForegroundColor Magenta
Write-Host "6. 📋 Ver guia manual" -ForegroundColor White
Write-Host "7. ❌ Cancelar" -ForegroundColor Red
Write-Host ""

$opcao = Read-Host "Escolha uma opção (1-7)"

switch ($opcao) {
    "1" {
        Write-Host ""
        Write-Host "===============================================" -ForegroundColor Cyan
        Write-Host "   ATUALIZAÇÃO COMPLETA" -ForegroundColor Cyan
        Write-Host "===============================================" -ForegroundColor Cyan
        Write-Host ""
        
        # Git commit
        Write-Host "📦 Preparando código..." -ForegroundColor Yellow
        $gitStatus = git status --porcelain
        
        if ($gitStatus) {
            Write-Host "  Mudanças detectadas. Fazendo commit..." -ForegroundColor Cyan
            git add .
            git commit -m "feat: 100% Integration complete - Update all deployments"
            Write-Host "  ✅ Commit realizado" -ForegroundColor Green
        } else {
            Write-Host "  ✅ Working directory limpo" -ForegroundColor Green
        }
        
        # Push
        Write-Host ""
        Write-Host "📤 Fazendo push para GitHub..." -ForegroundColor Yellow
        git push origin main
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✅ Push realizado!" -ForegroundColor Green
        } else {
            Write-Host "  ❌ Erro no push!" -ForegroundColor Red
            exit 1
        }
        
        # Railway
        Write-Host ""
        Write-Host "🚂 Atualizando Backend Railway..." -ForegroundColor Yellow
        
        if ($hasRailway) {
            Write-Host "  Fazendo login..." -ForegroundColor Cyan
            railway login
            
            Write-Host "  Linkando projeto..." -ForegroundColor Cyan
            railway link $RAILWAY_PROJECT_ID
            
            Write-Host "  Fazendo deploy..." -ForegroundColor Cyan
            cd apps/backend
            railway up
            cd ../..
            
            Write-Host "  ✅ Backend atualizado!" -ForegroundColor Green
        } else {
            Write-Host "  ⚠️  Railway CLI não instalado. Pule para atualização manual." -ForegroundColor Yellow
        }
        
        # Vercel Admin
        Write-Host ""
        Write-Host "🌐 Atualizando Frontend Admin..." -ForegroundColor Yellow
        
        if ($hasVercel) {
            Write-Host "  Fazendo login..." -ForegroundColor Cyan
            vercel login
            
            Write-Host "  Fazendo deploy..." -ForegroundColor Cyan
            cd apps/web
            vercel --prod
            cd ../..
            
            Write-Host "  ✅ Admin atualizado!" -ForegroundColor Green
        } else {
            Write-Host "  ⚠️  Vercel CLI não instalado. Pule para atualização manual." -ForegroundColor Yellow
        }
        
        # Vercel Aluno
        Write-Host ""
        Write-Host "➕ Criando Frontend Aluno..." -ForegroundColor Yellow
        
        if ($hasVercel) {
            Write-Host "  Fazendo deploy..." -ForegroundColor Cyan
            cd apps/web-aluno
            vercel --prod
            cd ../..
            
            Write-Host "  ✅ Aluno criado!" -ForegroundColor Green
            Write-Host ""
            Write-Host "  ⚠️  IMPORTANTE: Anote a URL do aluno e adicione no ALLOWED_ORIGINS do Railway!" -ForegroundColor Yellow
        } else {
            Write-Host "  ⚠️  Vercel CLI não instalado. Pule para criação manual." -ForegroundColor Yellow
        }
    }
    
    "2" {
        Write-Host ""
        Write-Host "🚂 Atualizando Backend Railway..." -ForegroundColor Yellow
        
        if (-not $hasRailway) {
            Write-Host "  ❌ Railway CLI não instalado!" -ForegroundColor Red
            Write-Host "  Instale: npm install -g @railway/cli" -ForegroundColor Yellow
            exit 1
        }
        
        railway login
        railway link $RAILWAY_PROJECT_ID
        cd apps/backend
        railway up
        cd ../..
        
        Write-Host "  ✅ Backend atualizado!" -ForegroundColor Green
    }
    
    "3" {
        Write-Host ""
        Write-Host "🌐 Atualizando Frontend Admin..." -ForegroundColor Yellow
        
        if (-not $hasVercel) {
            Write-Host "  ❌ Vercel CLI não instalado!" -ForegroundColor Red
            Write-Host "  Instale: npm install -g vercel" -ForegroundColor Yellow
            exit 1
        }
        
        vercel login
        cd apps/web
        vercel --prod
        cd ../..
        
        Write-Host "  ✅ Admin atualizado!" -ForegroundColor Green
    }
    
    "4" {
        Write-Host ""
        Write-Host "➕ Criando Frontend Aluno..." -ForegroundColor Yellow
        
        if (-not $hasVercel) {
            Write-Host "  ❌ Vercel CLI não instalado!" -ForegroundColor Red
            Write-Host "  Instale: npm install -g vercel" -ForegroundColor Yellow
            exit 1
        }
        
        vercel login
        cd apps/web-aluno
        vercel --prod
        cd ../..
        
        Write-Host "  ✅ Aluno criado!" -ForegroundColor Green
        Write-Host ""
        Write-Host "  📝 Próximo passo:" -ForegroundColor Yellow
        Write-Host "  1. Anote a URL gerada" -ForegroundColor Gray
        Write-Host "  2. Railway → Variables → ALLOWED_ORIGINS" -ForegroundColor Gray
        Write-Host "  3. Adicione a URL do aluno" -ForegroundColor Gray
        Write-Host "  4. Redeploy backend" -ForegroundColor Gray
    }
    
    "5" {
        Write-Host ""
        Write-Host "🔧 Fazendo commit e push..." -ForegroundColor Yellow
        
        $gitStatus = git status --porcelain
        
        if ($gitStatus) {
            git add .
            $msg = Read-Host "  Mensagem do commit (ou Enter para default)"
            if (-not $msg) {
                $msg = "feat: Update to 100% integration"
            }
            git commit -m $msg
            git push origin main
            
            Write-Host "  ✅ Push realizado!" -ForegroundColor Green
            Write-Host ""
            Write-Host "  Vercel vai fazer auto-deploy" -ForegroundColor Cyan
            Write-Host "  Railway: configure auto-deploy ou faça manual" -ForegroundColor Cyan
        } else {
            Write-Host "  ✅ Nada para commitar" -ForegroundColor Green
        }
    }
    
    "6" {
        Write-Host ""
        Write-Host "===============================================" -ForegroundColor Cyan
        Write-Host "   GUIA MANUAL" -ForegroundColor Cyan
        Write-Host "===============================================" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Leia o arquivo:" -ForegroundColor Yellow
        Write-Host "  DEPLOY_ATUALIZAR_EXISTENTE.md" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Ou siga:" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "1. Railway:" -ForegroundColor Cyan
        Write-Host "   https://railway.app/project/$RAILWAY_PROJECT_ID" -ForegroundColor Blue
        Write-Host "   - Variables → Adicionar ALLOWED_ORIGINS" -ForegroundColor Gray
        Write-Host "   - Deployments → Redeploy" -ForegroundColor Gray
        Write-Host ""
        Write-Host "2. Vercel Admin:" -ForegroundColor Cyan
        Write-Host "   https://vercel.com/memo-drops/memodrops-web" -ForegroundColor Blue
        Write-Host "   - Settings → Environment Variables" -ForegroundColor Gray
        Write-Host "   - Deployments → Redeploy" -ForegroundColor Gray
        Write-Host ""
        Write-Host "3. Vercel Aluno (criar novo):" -ForegroundColor Cyan
        Write-Host "   https://vercel.com/new" -ForegroundColor Blue
        Write-Host "   - Import: $GITHUB_REPO" -ForegroundColor Gray
        Write-Host "   - Root: apps/web-aluno" -ForegroundColor Gray
        Write-Host "   - ENV: NEXT_PUBLIC_API_URL=$BACKEND_URL" -ForegroundColor Gray
    }
    
    "7" {
        Write-Host ""
        Write-Host "❌ Cancelado!" -ForegroundColor Red
        exit 0
    }
    
    default {
        Write-Host ""
        Write-Host "❌ Opção inválida!" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "   ATUALIZAÇÃO FINALIZADA!" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 Próximos passos:" -ForegroundColor Yellow
Write-Host "  1. Verificar logs Railway" -ForegroundColor Gray
Write-Host "  2. Verificar logs Vercel" -ForegroundColor Gray
Write-Host "  3. Testar URLs:" -ForegroundColor Gray
Write-Host "     - $BACKEND_URL/api/health" -ForegroundColor Blue
Write-Host "     - $ADMIN_URL" -ForegroundColor Blue
Write-Host ""
