# MemoDrops - Deploy Helper (Railway only)

Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "   DEPLOY COMPLETO - MEMODROPS" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""

# ----------------------------------------------
# Pre-requisites
# ----------------------------------------------
Write-Host "1. Verificando pre-requisitos..." -ForegroundColor Yellow

$hasRailway = $false

try {
    $gitVersion = git --version
    Write-Host "  [OK] Git instalado: $gitVersion" -ForegroundColor Green
} catch {
    Write-Host "  [ERRO] Git nao encontrado. Instale em: https://git-scm.com/" -ForegroundColor Red
    exit 1
}

try {
    $nodeVersion = node --version
    Write-Host "  [OK] Node.js instalado: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "  [ERRO] Node.js nao encontrado. Instale em: https://nodejs.org/" -ForegroundColor Red
    exit 1
}

try {
    $railwayVersion = railway --version
    Write-Host "  [OK] Railway CLI instalado: $railwayVersion" -ForegroundColor Green
    $hasRailway = $true
} catch {
    Write-Host "  [INFO] Railway CLI nao encontrado. Instale se quiser deploy manual (npm install -g @railway/cli)" -ForegroundColor Yellow
}

function Invoke-RailwayDeploy($relativePath, $label) {
    if (-not (Test-Path $relativePath)) {
        Write-Host "   [ERRO] Diretório nao encontrado: $relativePath" -ForegroundColor Red
        return
    }

    Write-Host ""
    Write-Host "   >> Deploy $label" -ForegroundColor Cyan
    Push-Location $relativePath
    $pushed = $true
    try {
        if (Test-Path ".railway") {
            Write-Host "     - Projeto ja linkado." -ForegroundColor Green
        } else {
            Write-Host "     - Linkando projeto no Railway..." -ForegroundColor Cyan
            railway link
            if ($LASTEXITCODE -ne 0) {
                Write-Host "     [ERRO] Falha ao linkar $label. Execute railway link manualmente." -ForegroundColor Red
                return
            }
        }

        Write-Host "     - Executando railway up..." -ForegroundColor Cyan
        railway up
        if ($LASTEXITCODE -eq 0) {
            Write-Host "     [OK] $label deployado com sucesso." -ForegroundColor Green
        } else {
            Write-Host "     [ERRO] Falha no deploy de $label." -ForegroundColor Red
        }
    }
    finally {
        if ($pushed) {
            Pop-Location | Out-Null
        }
    }
}

Write-Host ""

# ----------------------------------------------
# Git status
# ----------------------------------------------
Write-Host "2. Verificando Git status..." -ForegroundColor Yellow
$gitStatus = git status --porcelain

if ($gitStatus) {
    Write-Host "  [AVISO] Existem mudancas nao commitadas:" -ForegroundColor Yellow
    git status --short
    $commit = Read-Host "  Deseja commitar agora? (s/n)"
    if ($commit -eq "s" -or $commit -eq "S") {
        git add .
        $commitMsg = Read-Host "  Mensagem do commit (Enter para usar valor padrao)"
        if (-not $commitMsg) {
            $commitMsg = "feat: atualizacoes pendentes"
        }
        git commit -m $commitMsg
        Write-Host "  [OK] Commit criado." -ForegroundColor Green
    } else {
        Write-Host "  Continuando sem commit." -ForegroundColor Yellow
    }
} else {
    Write-Host "  [OK] Working tree limpa." -ForegroundColor Green
}

Write-Host ""

# ----------------------------------------------
# Remote check
# ----------------------------------------------
Write-Host "3. Verificando remote..." -ForegroundColor Yellow
$remoteUrl = git remote get-url origin 2>$null

if ($remoteUrl) {
    Write-Host "  [OK] Remote configurado: $remoteUrl" -ForegroundColor Green
} else {
    Write-Host "  [ERRO] Remote origin nao configurado." -ForegroundColor Red
    $newRemote = Read-Host "  Informe a URL do repositorio (https://github.com/usuario/repositorio.git)"
    if (-not $newRemote) {
        Write-Host "  Deploy cancelado." -ForegroundColor Red
        exit 1
    }
    git remote add origin $newRemote
    Write-Host "  [OK] Remote adicionado." -ForegroundColor Green
}

Write-Host ""

# ----------------------------------------------
# Menu
# ----------------------------------------------
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "   QUAL ACAO DE DEPLOY?" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "1. Deploy completo (push + CI Railway)" -ForegroundColor Green
Write-Host "2. Apenas push para GitHub" -ForegroundColor Yellow
Write-Host "3. Deploy manual via Railway CLI" -ForegroundColor Cyan
Write-Host "4. Ver guias de deploy" -ForegroundColor Magenta
Write-Host "5. Cancelar" -ForegroundColor Red
Write-Host ""

$opcao = Read-Host "Escolha uma opcao (1-5)"

switch ($opcao) {
    "1" {
        Write-Host ""
        Write-Host "[INFO] Fazendo push para main..." -ForegroundColor Yellow
        git push origin main
        if ($LASTEXITCODE -eq 0) {
            Write-Host "[OK] Push realizado com sucesso." -ForegroundColor Green
            Write-Host ""
            Write-Host "GitHub Actions vai:" -ForegroundColor Cyan
            Write-Host "  - Rodar testes" -ForegroundColor Gray
            Write-Host "  - Rodar migrations" -ForegroundColor Gray
            Write-Host "  - Deployar backend e frontends no Railway" -ForegroundColor Gray
            Write-Host ""
            Write-Host "Acompanhe: https://github.com/seu-usuario/seu-repo/actions" -ForegroundColor Blue
        } else {
            Write-Host "[ERRO] Falha no push. Verifique o Git." -ForegroundColor Red
        }
    }
    "2" {
        Write-Host ""
        Write-Host "[INFO] Push para GitHub..." -ForegroundColor Yellow
        git push origin main
        if ($LASTEXITCODE -eq 0) {
            Write-Host "[OK] Push concluido." -ForegroundColor Green
        } else {
            Write-Host "[ERRO] Falha no push." -ForegroundColor Red
        }
    }
    "3" {
        if (-not $hasRailway) {
            Write-Host ""
            Write-Host "[ERRO] Railway CLI nao instalado. Execute: npm install -g @railway/cli" -ForegroundColor Red
            break
        }

        Write-Host ""
        Write-Host "Selecione o servico para deploy:" -ForegroundColor Yellow
        Write-Host "  1. Backend API (apps/backend)"
        Write-Host "  2. Frontend Admin (apps/web)"
        Write-Host "  3. Frontend Aluno (apps/web-aluno)"
        Write-Host "  4. Todos os acima"
        Write-Host "  5. Cancelar"
        $serviceChoice = Read-Host "  Opcao (1-5)"

        $targets = @()
        switch ($serviceChoice) {
            "1" { $targets = @(@{ Path = "apps/backend"; Label = "Backend API" }) }
            "2" { $targets = @(@{ Path = "apps/web"; Label = "Frontend Admin" }) }
            "3" { $targets = @(@{ Path = "apps/web-aluno"; Label = "Frontend Aluno" }) }
            "4" {
                $targets = @(
                    @{ Path = "apps/backend"; Label = "Backend API" },
                    @{ Path = "apps/web"; Label = "Frontend Admin" },
                    @{ Path = "apps/web-aluno"; Label = "Frontend Aluno" }
                )
            }
            default {
                Write-Host "[INFO] Operacao cancelada." -ForegroundColor Yellow
                break
            }
        }

        if ($targets.Count -eq 0) { break }

        Write-Host ""
        Write-Host "[INFO] Fazendo login no Railway..." -ForegroundColor Yellow
        railway login
        if ($LASTEXITCODE -ne 0) {
            Write-Host "[ERRO] Login no Railway falhou." -ForegroundColor Red
            break
        }

        foreach ($target in $targets) {
            Invoke-RailwayDeploy -relativePath $target.Path -label $target.Label
        }
    }
    "4" {
        Write-Host ""
        Write-Host "Consulte os guias:" -ForegroundColor Yellow
        Write-Host "  - DEPLOY_RAILWAY.md" -ForegroundColor Cyan
        Write-Host "  - DEPLOY_RAILWAY_FRONTEND.md" -ForegroundColor Cyan
        Write-Host "  - DEPLOY_COMPLETO_GUIA.md" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Links uteis:" -ForegroundColor Yellow
        Write-Host "  Railway Dashboard: https://railway.app" -ForegroundColor Blue
        Write-Host "  GitHub Actions:   https://github.com" -ForegroundColor Blue
    }
    "5" {
        Write-Host ""
        Write-Host "[INFO] Deploy cancelado." -ForegroundColor Yellow
        exit 0
    }
    default {
        Write-Host ""
        Write-Host "[ERRO] Opcao invalida." -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "   PROCESSO FINALIZADO" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
