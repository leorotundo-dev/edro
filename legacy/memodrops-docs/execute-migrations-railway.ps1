# Script para executar migrations via Railway API

$token = "7175f3b9-ff3e-4b44-a74a-00cb928f721a"
$projectId = "e0ca0841-18bc-4c48-942e-d90a6b725a5b"

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

Write-Host "🚀 Executando migrations via Railway API..." -ForegroundColor Green
Write-Host ""

# Buscar o service ID do PostgreSQL
$query = @{
    query = @"
{
  project(id: "$projectId") {
    services {
      edges {
        node {
          id
          name
        }
      }
    }
  }
}
"@
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "https://backboard.railway.app/graphql" `
        -Method Post `
        -Headers $headers `
        -Body $query `
        -ContentType "application/json"
    
    Write-Host "✅ Projeto encontrado!" -ForegroundColor Green
    Write-Host ""
    
    # Listar serviços
    Write-Host "📦 Serviços disponíveis:" -ForegroundColor Cyan
    foreach ($edge in $response.data.project.services.edges) {
        $service = $edge.node
        Write-Host "   - $($service.name) (ID: $($service.id))" -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "ℹ️  Para executar migrations, você precisa:" -ForegroundColor Cyan
    Write-Host "   1. Instalar Railway CLI: iwr https://railway.app/install.ps1 -useb | iex" -ForegroundColor Yellow
    Write-Host "   2. Fazer login: railway login" -ForegroundColor Yellow
    Write-Host "   3. Linkar projeto: railway link $projectId" -ForegroundColor Yellow
    Write-Host "   4. Executar: railway run node migrate-simple.js" -ForegroundColor Yellow
    
} catch {
    Write-Host "❌ Erro ao conectar na Railway API" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}
