# Script para atualizar tema de todas as páginas admin
# De tema escuro (zinc) para tema azul claro (slate/blue)

Write-Host "`n╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║         🎨 ATUALIZANDO TODAS AS PÁGINAS - TEMA AZUL         ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

$pages = @(
    "apps/web/app/admin/blueprints/page.tsx",
    "apps/web/app/admin/rag/page.tsx",
    "apps/web/app/admin/harvest/page.tsx",
    "apps/web/app/admin/scrapers/page.tsx",
    "apps/web/app/admin/editais/page.tsx",
    "apps/web/app/admin/questoes/page.tsx",
    "apps/web/app/admin/simulados/page.tsx",
    "apps/web/app/admin/recco-engine/page.tsx",
    "apps/web/app/admin/analytics/page.tsx",
    "apps/web/app/admin/users/page.tsx",
    "apps/web/app/admin/costs/page.tsx"
)

$replacements = @{
    # Backgrounds
    "bg-zinc-950" = "bg-slate-50"
    "bg-zinc-900/40" = "bg-white"
    "bg-zinc-900/60" = "bg-white"
    "bg-zinc-900" = "bg-slate-50"
    "bg-zinc-800" = "bg-slate-50"
    
    # Text colors
    "text-zinc-50" = "text-slate-900"
    "text-zinc-100" = "text-slate-800"
    "text-zinc-300" = "text-slate-600"
    "text-zinc-400" = "text-slate-600"
    "text-zinc-500" = "text-slate-500"
    
    # Borders
    "border-zinc-800" = "border-slate-200"
    "border-zinc-700" = "border-slate-300"
    "border-zinc-900" = "border-slate-200"
    
    # Hovers
    "hover:bg-zinc-800" = "hover:bg-slate-100"
    "hover:bg-zinc-700" = "hover:bg-slate-200"
    "hover:bg-zinc-900" = "hover:bg-blue-50"
    
    # Dividers
    "divide-zinc-800" = "divide-slate-200"
    
    # Focus rings - mantém azul
    "focus:ring-purple-500" = "focus:ring-blue-500"
    "focus:ring-indigo-500" = "focus:ring-blue-500"
}

$total = $pages.Count
$current = 0

foreach ($page in $pages) {
    $current++
    $filePath = Join-Path $PSScriptRoot $page
    
    if (Test-Path $filePath) {
        Write-Host "[$current/$total] Atualizando: " -NoNewline -ForegroundColor Yellow
        Write-Host $page -ForegroundColor White
        
        $content = Get-Content $filePath -Raw
        
        foreach ($key in $replacements.Keys) {
            $value = $replacements[$key]
            $content = $content -replace [regex]::Escape($key), $value
        }
        
        # Adicionar rounded-xl para cards
        $content = $content -replace 'rounded-lg', 'rounded-xl'
        
        # Adicionar shadow-sm
        $content = $content -replace '(border border-slate-200)(?! shadow)', '$1 shadow-sm'
        
        Set-Content $filePath $content -NoNewline
        
        Write-Host "   ✅ Concluído!" -ForegroundColor Green
    } else {
        Write-Host "[$current/$total] ⚠️  Arquivo não encontrado: $page" -ForegroundColor Red
    }
    
    Start-Sleep -Milliseconds 100
}

Write-Host "`n╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║              ✅ TODAS AS PÁGINAS ATUALIZADAS!                ║" -ForegroundColor Green
Write-Host "╚══════════════════════════════════════════════════════════════╝`n" -ForegroundColor Green

Write-Host "🎨 Tema azul claro aplicado em $total páginas!" -ForegroundColor Cyan
Write-Host "`n📋 Páginas atualizadas:" -ForegroundColor Yellow
foreach ($page in $pages) {
    Write-Host "   • $page" -ForegroundColor White
}

Write-Host "`n🔄 O Next.js vai recompilar automaticamente..." -ForegroundColor Yellow
Write-Host "⏰ Aguarde 10-20 segundos e recarregue o navegador!`n" -ForegroundColor Yellow
