# 🔧 Setup Railway Environment Variables
# Este script ajuda a gerar valores para as variáveis de ambiente

Write-Host ""
Write-Host "🔧 Setup Railway Environment Variables" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Gerar JWT_SECRET
Write-Host "1️⃣  Gerando JWT_SECRET forte..." -ForegroundColor Yellow
$jwtSecret = -join ((33..126) | Get-Random -Count 40 | ForEach-Object {[char]$_})
Write-Host "   ✅ JWT_SECRET gerado!" -ForegroundColor Green
Write-Host ""
Write-Host "   JWT_SECRET=$jwtSecret" -ForegroundColor White
Write-Host ""

# 2. Listar variáveis necessárias
Write-Host "2️⃣  Variáveis que você precisa configurar no Railway:" -ForegroundColor Yellow
Write-Host ""

$variables = @"
┌─────────────────────────────────────────────────────────────┐
│ OBRIGATÓRIAS                                                │
├─────────────────────────────────────────────────────────────┤
│ DATABASE_URL     = `${{Postgres.DATABASE_URL}}             │
│ JWT_SECRET       = $jwtSecret │
│ PORT             = 8080                                     │
│ NODE_ENV         = production                               │
├─────────────────────────────────────────────────────────────┤
│ RECOMENDADAS                                                │
├─────────────────────────────────────────────────────────────┤
│ ALLOWED_ORIGINS  = https://memodrops-dashboard-*.vercel.app│
│ OPENAI_API_KEY   = sk-proj-...                             │
│ OPENAI_BASE_URL  = https://api.openai.com/v1               │
│ OPENAI_MODEL     = gpt-4o-mini                             │
├─────────────────────────────────────────────────────────────┤
│ OPCIONAIS                                                   │
├─────────────────────────────────────────────────────────────┤
│ REDIS_URL        = redis://...                             │
│ ENABLE_WORKERS   = true                                     │
│ SENTRY_DSN       = https://...                             │
└─────────────────────────────────────────────────────────────┘
"@

Write-Host $variables -ForegroundColor Cyan
Write-Host ""

# 3. Exportar para arquivo (opcional)
Write-Host "3️⃣  Salvar em arquivo? (y/n)" -ForegroundColor Yellow
$save = Read-Host "   Resposta"

if ($save -eq "y" -or $save -eq "Y") {
    $envContent = @"
# Railway Environment Variables
# Generated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
# 
# ⚠️  IMPORTANTE:
# - NÃO commite este arquivo no Git
# - Configure estas variáveis diretamente no Railway Dashboard
# - Use referências quando possível: `${{Postgres.DATABASE_URL}}

# ========================================
# OBRIGATÓRIAS
# ========================================
DATABASE_URL=`${{Postgres.DATABASE_URL}}
JWT_SECRET=$jwtSecret
PORT=8080
NODE_ENV=production

# ========================================
# RECOMENDADAS
# ========================================
ALLOWED_ORIGINS=https://memodrops-dashboard-1bj6g09lt-memo-drops.vercel.app,https://memodrops-dashboard-*.vercel.app,http://localhost:3000,http://localhost:3001
OPENAI_API_KEY=sk-proj-SEU_TOKEN_AQUI
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini

# ========================================
# OPCIONAIS
# ========================================
# REDIS_URL=redis://seu_redis_url
# ENABLE_WORKERS=true
# SENTRY_DSN=https://sua_dsn_aqui
"@

    $envContent | Out-File -FilePath "railway-env-variables.txt" -Encoding UTF8
    Write-Host "   ✅ Arquivo salvo: railway-env-variables.txt" -ForegroundColor Green
    Write-Host "   ⚠️  NÃO commite este arquivo no Git!" -ForegroundColor Red
    Write-Host ""
}

# 4. Instruções
Write-Host "4️⃣  Próximos Passos:" -ForegroundColor Yellow
Write-Host ""
Write-Host "   1. Acesse Railway: https://railway.app/dashboard" -ForegroundColor White
Write-Host "   2. Abra seu projeto MemoDrops" -ForegroundColor White
Write-Host "   3. Se não tiver PostgreSQL:" -ForegroundColor White
Write-Host "      - Clique em '+ New'" -ForegroundColor Gray
Write-Host "      - Selecione 'Database' → 'PostgreSQL'" -ForegroundColor Gray
Write-Host "      - Aguarde provisioning (~2 min)" -ForegroundColor Gray
Write-Host ""
Write-Host "   4. No serviço Backend:" -ForegroundColor White
Write-Host "      - Vá em 'Variables'" -ForegroundColor Gray
Write-Host "      - Clique '+ New Variable'" -ForegroundColor Gray
Write-Host "      - Adicione as variáveis acima" -ForegroundColor Gray
Write-Host ""
Write-Host "   5. Aguarde redeploy automático (~2 min)" -ForegroundColor White
Write-Host ""

# 5. Verificar conexão (se DATABASE_URL existir)
Write-Host "5️⃣  Testar conexão com database (após configurar):" -ForegroundColor Yellow
Write-Host ""
Write-Host "   railway run npm run migrate --workspace @edro/backend" -ForegroundColor Gray
Write-Host ""

# 6. Links úteis
Write-Host "6️⃣  Links Úteis:" -ForegroundColor Yellow
Write-Host ""
Write-Host "   Guia Completo: CONFIGURAR_DATABASE.md" -ForegroundColor Cyan
Write-Host "   Railway Docs: https://docs.railway.app/" -ForegroundColor Cyan
Write-Host "   Railway Dashboard: https://railway.app/dashboard" -ForegroundColor Cyan
Write-Host ""

Write-Host "✨ Setup concluído!" -ForegroundColor Green
Write-Host ""
