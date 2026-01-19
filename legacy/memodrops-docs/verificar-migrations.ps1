#!/usr/bin/env pwsh
# ========================================
# Script para verificar se as migrações foram executadas
# ========================================

Write-Host "🔍 Verificando migrações no Railway..." -ForegroundColor Cyan
Write-Host ""

# Verificar se o arquivo .env existe
if (-not (Test-Path ".env")) {
    Write-Host "❌ Arquivo .env não encontrado!" -ForegroundColor Red
    Write-Host "   Crie o arquivo .env com DATABASE_URL" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Arquivo .env encontrado" -ForegroundColor Green
Write-Host ""

# Ler DATABASE_URL do .env
$databaseUrl = Get-Content .env | Where-Object { $_ -match '^DATABASE_URL=' } | ForEach-Object { $_.Split('=')[1] }

if (-not $databaseUrl) {
    Write-Host "❌ DATABASE_URL não encontrada no .env!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ DATABASE_URL encontrada" -ForegroundColor Green
Write-Host ""

# Navegar para o diretório do backend
Set-Location -Path "apps/backend"

Write-Host "📂 Executando verificação..." -ForegroundColor Cyan
Write-Host ""

# Criar script SQL temporário
$sqlScript = @"
-- Verificar tabelas existentes
SELECT 
  'TABELAS' as tipo,
  table_name as nome,
  'Criada' as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('jobs', 'job_schedules', 'job_logs', 'harvest_sources', 'harvested_content')
ORDER BY table_name;

-- Verificar migrações aplicadas
SELECT 
  'MIGRAÇÕES' as tipo,
  name as nome,
  run_at as status
FROM schema_migrations 
WHERE name LIKE '%jobs%'
ORDER BY id;

-- Contar registros
SELECT 
  'CONTAGEM' as tipo,
  'jobs' as nome,
  COUNT(*)::text as status
FROM jobs
UNION ALL
SELECT 'CONTAGEM', 'job_schedules', COUNT(*)::text FROM job_schedules
UNION ALL
SELECT 'CONTAGEM', 'job_logs', COUNT(*)::text FROM job_logs
UNION ALL
SELECT 'CONTAGEM', 'harvest_sources', COUNT(*)::text FROM harvest_sources
UNION ALL
SELECT 'CONTAGEM', 'harvested_content', COUNT(*)::text FROM harvested_content;
"@

# Salvar SQL em arquivo temporário
$sqlScript | Out-File -FilePath "verify.sql" -Encoding UTF8

# Executar verificação usando psql (se disponível)
try {
    Write-Host "🔄 Conectando ao banco..." -ForegroundColor Cyan
    
    # Tentar executar via Node.js
    $verifyJs = @"
require('dotenv').config({ path: '../../.env' });
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function verify() {
  try {
    console.log('\n📊 VERIFICANDO TABELAS:\n');
    
    const tables = ['jobs', 'job_schedules', 'job_logs', 'harvest_sources', 'harvested_content'];
    
    for (const table of tables) {
      try {
        const result = await pool.query(`SELECT COUNT(*) FROM ${table}`);
        console.log(`  ✅ ${table.padEnd(25)} - ${result.rows[0].count} registros`);
      } catch (err) {
        console.log(`  ❌ ${table.padEnd(25)} - NÃO EXISTE`);
      }
    }
    
    console.log('\n📊 MIGRAÇÕES APLICADAS:\n');
    
    const migrations = await pool.query(`
      SELECT name, run_at 
      FROM schema_migrations 
      WHERE name LIKE '%jobs%' OR name LIKE '%0011%'
      ORDER BY id
    `);
    
    if (migrations.rows.length > 0) {
      migrations.rows.forEach(m => {
        console.log(`  ✅ ${m.name}`);
      });
    } else {
      console.log('  ⚠️  Nenhuma migração de jobs encontrada');
    }
    
    console.log('\n📊 JOBS AGENDADOS:\n');
    
    const schedules = await pool.query(`SELECT name, type, enabled FROM job_schedules`);
    
    if (schedules.rows.length > 0) {
      schedules.rows.forEach(s => {
        const status = s.enabled ? '🟢' : '🔴';
        console.log(`  ${status} ${s.name} (${s.type})`);
      });
    } else {
      console.log('  ⚠️  Nenhum job agendado encontrado');
    }
    
    await pool.end();
    console.log('\n✅ Verificação concluída!\n');
    
  } catch (err) {
    console.error('\n❌ Erro na verificação:', err.message);
    process.exit(1);
  }
}

verify();
"@
    
    $verifyJs | Out-File -FilePath "verify.js" -Encoding UTF8
    
    node verify.js
    
    # Limpar arquivos temporários
    Remove-Item -Path "verify.js" -ErrorAction SilentlyContinue
    Remove-Item -Path "verify.sql" -ErrorAction SilentlyContinue
    
} catch {
    Write-Host "❌ Erro ao verificar: $_" -ForegroundColor Red
    exit 1
}

# Voltar para o diretório raiz
Set-Location -Path "../.."

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "📋 RESUMO DA VERIFICAÇÃO" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Se todas as tabelas aparecem com ✅:" -ForegroundColor Green
Write-Host "  → As migrações foram executadas com sucesso!" -ForegroundColor Green
Write-Host ""
Write-Host "Se alguma tabela aparece com ❌:" -ForegroundColor Yellow
Write-Host "  → Execute: .\executar-migrations.ps1" -ForegroundColor Yellow
Write-Host ""
Write-Host "Próximos passos:" -ForegroundColor Cyan
Write-Host "  1. Reiniciar backend no Railway" -ForegroundColor White
Write-Host "  2. Verificar logs do backend" -ForegroundColor White
Write-Host "  3. Testar endpoints da API" -ForegroundColor White
Write-Host ""
