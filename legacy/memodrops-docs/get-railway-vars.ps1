# Script para pegar variáveis do Railway via API

$token = "7175f3b9-ff3e-4b44-a74a-00cb928f721a"
$projectId = "e0ca0841-18bc-4c48-942e-d90a6b725a5b"

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

$query = @"
{
  "query": "query { project(id: \"$projectId\") { name services { edges { node { name variables } } } } }"
}
"@

Write-Host "🔍 Buscando variáveis do Railway..." -ForegroundColor Cyan
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri "https://backboard.railway.app/graphql" -Method Post -Headers $headers -Body $query
    
    if ($response.data.project) {
        Write-Host "✅ Projeto: $($response.data.project.name)" -ForegroundColor Green
        Write-Host ""
        
        foreach ($edge in $response.data.project.services.edges) {
            $service = $edge.node
            Write-Host "📦 Serviço: $($service.name)" -ForegroundColor Yellow
            Write-Host ""
            
            if ($service.variables) {
                Write-Host "🔑 Variáveis:" -ForegroundColor Cyan
                $service.variables | ConvertFrom-Json | Get-Member -MemberType NoteProperty | ForEach-Object {
                    $key = $_.Name
                    $value = ($service.variables | ConvertFrom-Json).$key
                    
                    if ($key -eq "DATABASE_URL") {
                        Write-Host "   DATABASE_URL = $value" -ForegroundColor Green
                    } else {
                        Write-Host "   $key = $value"
                    }
                }
            }
            Write-Host ""
        }
    } else {
        Write-Host "❌ Erro: $($response.errors[0].message)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Erro ao chamar Railway API:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}
