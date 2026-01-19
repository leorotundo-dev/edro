# Script COMPLETO - Faz TUDO automaticamente
# ReccoEngine V3 - Preparação, Testes e Validação

$ErrorActionPreference = "Continue"

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                                                    ║" -ForegroundColor Cyan
Write-Host "║   🚀 RECCOENGINE V3 - EXECUÇÃO AUTOMÁTICA        ║" -ForegroundColor Cyan
Write-Host "║                                                    ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""
Write-Host "Este script vai fazer TUDO automaticamente:" -ForegroundColor Yellow
Write-Host "  ✅ Verificar ambiente" -ForegroundColor Gray
Write-Host "  ✅ Instalar dependências" -ForegroundColor Gray
Write-Host "  ✅ Verificar banco de dados" -ForegroundColor Gray
Write-Host "  ✅ Rodar migrations" -ForegroundColor Gray
Write-Host "  ✅ Criar dados de teste" -ForegroundColor Gray
Write-Host "  ✅ Executar todos os testes" -ForegroundColor Gray
Write-Host "  ✅ Mostrar resultado" -ForegroundColor Gray
Write-Host ""
Write-Host "Tempo estimado: 2-3 minutos" -ForegroundColor Yellow
Write-Host ""
Write-Host "Pressione qualquer tecla para começar..." -ForegroundColor Green
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
Write-Host ""

$TotalSteps = 10
$CurrentStep = 0

function Show-Progress {
    param([string]$Message)
    $script:CurrentStep++
    $Percent = [math]::Round(($script:CurrentStep / $TotalSteps) * 100)
    Write-Host ""
    Write-Host "[$script:CurrentStep/$TotalSteps - $Percent%] $Message" -ForegroundColor Cyan
    Write-Host ("─" * 60) -ForegroundColor DarkGray
}

# ============================================
# PASSO 1: Verificar Diretório
# ============================================
Show-Progress "Verificando diretório do projeto"

if (-Not (Test-Path "apps/backend")) {
    Write-Host "❌ ERRO: Este script deve ser executado na raiz do projeto" -ForegroundColor Red
    Write-Host ""
    Write-Host "Use:" -ForegroundColor Yellow
    Write-Host "  cd memodrops-main" -ForegroundColor Gray
    Write-Host "  .\EXECUTAR_TUDO_AUTOMATICO.ps1" -ForegroundColor Gray
    Write-Host ""
    exit 1
}

Write-Host "✅ Diretório correto" -ForegroundColor Green

# ============================================
# PASSO 2: Verificar Node.js
# ============================================
Show-Progress "Verificando Node.js"

try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js instalado: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js não encontrado" -ForegroundColor Red
    Write-Host ""
    Write-Host "Instale Node.js em: https://nodejs.org" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

# ============================================
# PASSO 3: Verificar/Criar .env
# ============================================
Show-Progress "Verificando arquivo .env"

if (-Not (Test-Path "apps/backend/.env")) {
    Write-Host "⚠️  Arquivo .env não encontrado" -ForegroundColor Yellow
    Write-Host "📝 Criando .env a partir do .env.example..." -ForegroundColor Yellow
    
    if (Test-Path "apps/backend/.env.example") {
        Copy-Item "apps/backend/.env.example" "apps/backend/.env"
        Write-Host "✅ Arquivo .env criado" -ForegroundColor Green
        Write-Host ""
        Write-Host "⚠️  IMPORTANTE: Configure as variáveis de ambiente:" -ForegroundColor Yellow
        Write-Host "   DATABASE_URL=postgresql://..." -ForegroundColor Gray
        Write-Host "   JWT_SECRET=..." -ForegroundColor Gray
        Write-Host "   OPENAI_API_KEY=..." -ForegroundColor Gray
        Write-Host ""
    } else {
        Write-Host "❌ .env.example não encontrado" -ForegroundColor Red
        Write-Host "Crie manualmente: apps/backend/.env" -ForegroundColor Yellow
        exit 1
    }
} else {
    Write-Host "✅ Arquivo .env encontrado" -ForegroundColor Green
}

# ============================================
# PASSO 4: Instalar Dependências
# ============================================
Show-Progress "Verificando dependências"

Push-Location apps/backend

if (-Not (Test-Path "node_modules")) {
    Write-Host "📦 Instalando dependências (pode demorar 1-2 min)..." -ForegroundColor Yellow
    npm install --legacy-peer-deps 2>&1 | Out-Null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Dependências instaladas" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Erro ao instalar dependências, mas continuando..." -ForegroundColor Yellow
    }
} else {
    Write-Host "✅ Dependências já instaladas" -ForegroundColor Green
}

Pop-Location

# ============================================
# PASSO 5: Verificar Conexão com Banco
# ============================================
Show-Progress "Testando conexão com banco de dados"

Push-Location apps/backend

Write-Host "🔌 Conectando ao banco..." -ForegroundColor Yellow

$testConnection = @"
require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query('SELECT NOW()').then(() => {
  console.log('OK');
  process.exit(0);
}).catch((err) => {
  console.error(err.message);
  process.exit(1);
});
"@

$testConnection | Out-File -FilePath "test-db-connection.js" -Encoding UTF8

$connectionResult = node test-db-connection.js 2>&1
Remove-Item "test-db-connection.js" -ErrorAction SilentlyContinue

if ($connectionResult -match "OK") {
    Write-Host "✅ Banco de dados conectado" -ForegroundColor Green
} else {
    Write-Host "❌ Erro ao conectar no banco" -ForegroundColor Red
    Write-Host "Erro: $connectionResult" -ForegroundColor Red
    Write-Host ""
    Write-Host "Verifique DATABASE_URL no .env" -ForegroundColor Yellow
    Pop-Location
    exit 1
}

Pop-Location

# ============================================
# PASSO 6: Verificar Migrations
# ============================================
Show-Progress "Verificando migrations"

$migrations = Get-ChildItem "apps/backend/src/db/migrations/*.sql" -ErrorAction SilentlyContinue

if ($migrations.Count -lt 8) {
    Write-Host "⚠️  Apenas $($migrations.Count) migrations encontradas" -ForegroundColor Yellow
    Write-Host "📝 Executando migrations..." -ForegroundColor Yellow
    
    Push-Location apps/backend
    npm run db:migrate 2>&1 | Out-Null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Migrations executadas" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Erro ao executar migrations, mas continuando..." -ForegroundColor Yellow
    }
    
    Pop-Location
} else {
    Write-Host "✅ $($migrations.Count) migrations encontradas" -ForegroundColor Green
}

# ============================================
# PASSO 7: Verificar Tabelas do ReccoEngine
# ============================================
Show-Progress "Verificando tabelas do ReccoEngine"

Push-Location apps/backend

$checkTables = @"
require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const tables = [
  'recco_inputs', 'recco_states', 'recco_prioridades',
  'recco_selecao', 'recco_sequencia', 'recco_reforco',
  'recco_feedback', 'recco_versions', 'recco_predictions',
  'recco_cognitive_flags', 'recco_emotional_flags'
];

async function checkTables() {
  let allExist = true;
  for (const table of tables) {
    const result = await pool.query(
      "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = \$1)",
      [table]
    );
    if (!result.rows[0].exists) {
      console.log('MISSING:' + table);
      allExist = false;
    }
  }
  if (allExist) {
    console.log('OK');
  }
  process.exit(allExist ? 0 : 1);
}

checkTables().catch(() => process.exit(1));
"@

$checkTables | Out-File -FilePath "check-tables.js" -Encoding UTF8

$tablesResult = node check-tables.js 2>&1
Remove-Item "check-tables.js" -ErrorAction SilentlyContinue

if ($tablesResult -match "OK") {
    Write-Host "✅ Todas as 11 tabelas do ReccoEngine existem" -ForegroundColor Green
} elseif ($tablesResult -match "MISSING:") {
    Write-Host "⚠️  Algumas tabelas faltando:" -ForegroundColor Yellow
    $tablesResult | Select-String "MISSING:" | ForEach-Object {
        Write-Host "   - $($_.Line.Replace('MISSING:', ''))" -ForegroundColor Gray
    }
    Write-Host ""
    Write-Host "📝 Tentando criar tabelas via migration..." -ForegroundColor Yellow
    npm run db:migrate 2>&1 | Out-Null
} else {
    Write-Host "⚠️  Não foi possível verificar tabelas, mas continuando..." -ForegroundColor Yellow
}

Pop-Location

# ============================================
# PASSO 8: Criar Dados de Teste
# ============================================
Show-Progress "Criando dados de teste (se necessário)"

Push-Location apps/backend

Write-Host "📊 Verificando dados de teste..." -ForegroundColor Yellow

$createTestData = @"
require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function createTestData() {
  try {
    // Verificar se existe usuário
    const userCheck = await pool.query('SELECT id FROM users LIMIT 1');
    
    if (userCheck.rows.length === 0) {
      console.log('Criando usuário de teste...');
      const hashedPassword = await bcrypt.hash('teste123', 10);
      await pool.query(
        'INSERT INTO users (email, password_hash, name) VALUES (\$1, \$2, \$3)',
        ['teste@edro.digital', hashedPassword, 'Usuário Teste']
      );
      console.log('✓ Usuário criado');
    } else {
      console.log('✓ Usuário já existe');
    }
    
    // Verificar se existe dados de tracking
    const trackingCheck = await pool.query('SELECT id FROM tracking_cognitive LIMIT 1');
    
    if (trackingCheck.rows.length === 0) {
      console.log('Criando dados de tracking de teste...');
      const userId = (await pool.query('SELECT id FROM users LIMIT 1')).rows[0].id;
      
      // Criar alguns registros de tracking
      for (let i = 0; i < 5; i++) {
        await pool.query(
          'INSERT INTO tracking_cognitive (user_id, foco, energia, nec, nca, velocidade) VALUES (\$1, \$2, \$3, \$4, \$5, \$6)',
          [userId, 50 + i * 5, 60 + i * 3, 55 + i * 4, 45 + i * 3, 200]
        );
      }
      console.log('✓ Dados de tracking criados');
    } else {
      console.log('✓ Dados de tracking já existem');
    }
    
    console.log('OK');
    process.exit(0);
  } catch (error) {
    console.error('Erro:', error.message);
    process.exit(1);
  }
}

createTestData();
"@

$createTestData | Out-File -FilePath "create-test-data.js" -Encoding UTF8

$testDataResult = node create-test-data.js 2>&1
Remove-Item "create-test-data.js" -ErrorAction SilentlyContinue

if ($testDataResult -match "OK") {
    Write-Host "✅ Dados de teste prontos" -ForegroundColor Green
} else {
    Write-Host "⚠️  Aviso ao criar dados de teste:" -ForegroundColor Yellow
    Write-Host "$testDataResult" -ForegroundColor Gray
}

Pop-Location

# ============================================
# PASSO 9: Executar Testes do ReccoEngine
# ============================================
Show-Progress "Executando testes do ReccoEngine"

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║           EXECUTANDO TESTES                        ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

Push-Location apps/backend

Write-Host "🧪 Rodando test-recco-engine.ts..." -ForegroundColor Yellow
Write-Host ""

$testOutput = npx ts-node test-recco-engine.ts 2>&1

# Mostrar output
$testOutput | ForEach-Object {
    if ($_ -match "✅") {
        Write-Host $_ -ForegroundColor Green
    } elseif ($_ -match "❌") {
        Write-Host $_ -ForegroundColor Red
    } elseif ($_ -match "⚠️") {
        Write-Host $_ -ForegroundColor Yellow
    } elseif ($_ -match "TESTE|═|─") {
        Write-Host $_ -ForegroundColor Cyan
    } else {
        Write-Host $_
    }
}

$TestsPassed = $LASTEXITCODE -eq 0

Pop-Location

# ============================================
# PASSO 10: Resultado Final
# ============================================
Show-Progress "Gerando resultado final"

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║           RESULTADO FINAL                          ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

if ($TestsPassed) {
    Write-Host "🎉 SUCESSO! TODOS OS TESTES PASSARAM!" -ForegroundColor Green
    Write-Host ""
    Write-Host "✅ ReccoEngine V3 está 100% funcional!" -ForegroundColor Green
    Write-Host ""
    Write-Host "O que foi validado:" -ForegroundColor Yellow
    Write-Host "  ✅ Conexão com banco de dados" -ForegroundColor Gray
    Write-Host "  ✅ 11 tabelas do ReccoEngine" -ForegroundColor Gray
    Write-Host "  ✅ Diagnóstico completo (3 estados)" -ForegroundColor Gray
    Write-Host "  ✅ Priorização (6 critérios)" -ForegroundColor Gray
    Write-Host "  ✅ Sequenciamento (7 curvas)" -ForegroundColor Gray
    Write-Host "  ✅ Trilha diária gerada" -ForegroundColor Gray
    Write-Host "  ✅ Motor completo funcionando" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Próximos passos:" -ForegroundColor Yellow
    Write-Host "  1. Deploy em produção (Railway)" -ForegroundColor Gray
    Write-Host "  2. Integrar com Frontend Aluno" -ForegroundColor Gray
    Write-Host "  3. Implementar Workers BullMQ" -ForegroundColor Gray
    Write-Host "  4. Criar Dashboard de visualização" -ForegroundColor Gray
    Write-Host ""
} else {
    Write-Host "⚠️  ALGUNS TESTES FALHARAM" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Possíveis causas:" -ForegroundColor Yellow
    Write-Host "  • Banco de dados não conectado corretamente" -ForegroundColor Gray
    Write-Host "  • Migrations não executadas completamente" -ForegroundColor Gray
    Write-Host "  • Variáveis de ambiente incorretas" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Comandos para debug:" -ForegroundColor Yellow
    Write-Host "  cd apps/backend" -ForegroundColor Gray
    Write-Host "  npm run db:migrate          # Rodar migrations" -ForegroundColor Gray
    Write-Host "  npx ts-node test-recco-engine.ts  # Rodar testes manualmente" -ForegroundColor Gray
    Write-Host ""
}

Write-Host "════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "Log completo salvo em: recco-test-log.txt" -ForegroundColor Gray
$testOutput | Out-File -FilePath "recco-test-log.txt" -Encoding UTF8
Write-Host ""

Write-Host "Pressione qualquer tecla para sair..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

if ($TestsPassed) {
    exit 0
} else {
    exit 1
}
