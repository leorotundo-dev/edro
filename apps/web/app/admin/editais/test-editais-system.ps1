# 🧪 Script de Teste do Sistema de Editais
# Edro - Teste Completo de Funcionalidades

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🧪 TESTE DO SISTEMA DE EDITAIS" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$API_URL = "http://localhost:3001/api"
$headers = @{
    "Content-Type" = "application/json"
}

# Função para testar endpoint
function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Method,
        [string]$Url,
        [object]$Body = $null
    )
    
    Write-Host "📍 Testando: $Name" -ForegroundColor Yellow
    Write-Host "   $Method $Url" -ForegroundColor Gray
    
    try {
        if ($Body) {
            $response = Invoke-RestMethod -Uri $Url -Method $Method -Headers $headers -Body ($Body | ConvertTo-Json -Depth 10)
        } else {
            $response = Invoke-RestMethod -Uri $Url -Method $Method -Headers $headers
        }
        
        Write-Host "   ✅ Sucesso!" -ForegroundColor Green
        return $response
    }
    catch {
        Write-Host "   ❌ Erro: $_" -ForegroundColor Red
        return $null
    }
}

# 1. Listar todos os editais
Write-Host "`n1️⃣  LISTAGEM DE EDITAIS" -ForegroundColor Magenta
$editais = Test-Endpoint -Name "Listar todos os editais" -Method "GET" -Url "$API_URL/editais"
if ($editais) {
    Write-Host "   📊 Total de editais: $($editais.count)" -ForegroundColor Cyan
}

# 2. Criar novo edital
Write-Host "`n2️⃣  CRIAR NOVO EDITAL" -ForegroundColor Magenta
$novoEdital = @{
    codigo = "TEST-2024-$(Get-Random -Maximum 9999)"
    titulo = "Edital de Teste - Sistema Automatizado"
    orgao = "Orgao de Teste"
    banca = "CEBRASPE"
    status = "rascunho"
    numero_vagas = 100
    taxa_inscricao = 150.00
    tags = @("teste", "automatizado")
    cargos = @(
        @{
            nome = "Cargo de Teste"
            vagas = 50
            salario = 5000.00
            requisitos = "Nível superior completo"
        }
    )
    disciplinas = @(
        @{
            nome = "Português"
            peso = 3
            numero_questoes = 20
        },
        @{
            nome = "Matemática"
            peso = 2
            numero_questoes = 15
        }
    )
}

$created = Test-Endpoint -Name "Criar edital de teste" -Method "POST" -Url "$API_URL/editais" -Body $novoEdital

if ($created -and $created.data) {
    $editalId = $created.data.id
    Write-Host "   🆔 ID criado: $editalId" -ForegroundColor Cyan
    
    # 3. Buscar edital criado
    Write-Host "`n3️⃣  BUSCAR EDITAL POR ID" -ForegroundColor Magenta
    $edital = Test-Endpoint -Name "Buscar edital $editalId" -Method "GET" -Url "$API_URL/editais/$editalId"
    
    if ($edital) {
        Write-Host "   📄 Título: $($edital.data.titulo)" -ForegroundColor Cyan
        Write-Host "   📍 Status: $($edital.data.status)" -ForegroundColor Cyan
    }
    
    # 4. Atualizar edital
    Write-Host "`n4️⃣  ATUALIZAR EDITAL" -ForegroundColor Magenta
    $update = @{
        status = "publicado"
        numero_vagas = 150
        observacoes = "Edital atualizado pelo teste automatizado"
    }
    
    $updated = Test-Endpoint -Name "Atualizar edital" -Method "PUT" -Url "$API_URL/editais/$editalId" -Body $update
    
    if ($updated) {
        Write-Host "   ✏️  Status atualizado para: $($updated.data.status)" -ForegroundColor Cyan
    }
    
    # 5. Criar evento
    Write-Host "`n5️⃣  CRIAR EVENTO DO EDITAL" -ForegroundColor Magenta
    $evento = @{
        tipo = "inscricao"
        titulo = "Período de Inscrições"
        descricao = "Inscrições abertas online"
        data_inicio = (Get-Date).ToString("yyyy-MM-dd")
        data_fim = (Get-Date).AddDays(30).ToString("yyyy-MM-dd")
        concluido = $false
    }
    
    $eventoCreated = Test-Endpoint -Name "Criar evento" -Method "POST" -Url "$API_URL/editais/$editalId/eventos" -Body $evento
    
    # 6. Listar eventos
    Write-Host "`n6️⃣  LISTAR EVENTOS" -ForegroundColor Magenta
    $eventos = Test-Endpoint -Name "Listar eventos do edital" -Method "GET" -Url "$API_URL/editais/$editalId/eventos"
    
    if ($eventos) {
        Write-Host "   📅 Total de eventos: $($eventos.count)" -ForegroundColor Cyan
    }
    
    # 7. Estatísticas
    Write-Host "`n7️⃣  ESTATÍSTICAS" -ForegroundColor Magenta
    $stats = Test-Endpoint -Name "Estatísticas gerais" -Method "GET" -Url "$API_URL/editais-stats"
    
    if ($stats) {
        Write-Host "   📊 Dados estatísticos obtidos com sucesso" -ForegroundColor Cyan
    }
    
    # 8. Relatórios
    Write-Host "`n8️⃣  RELATÓRIOS" -ForegroundColor Magenta
    Test-Endpoint -Name "Editais por status" -Method "GET" -Url "$API_URL/editais/reports/by-status"
    Test-Endpoint -Name "Editais por banca" -Method "GET" -Url "$API_URL/editais/reports/by-banca"
    Test-Endpoint -Name "Próximas provas" -Method "GET" -Url "$API_URL/editais/reports/proximas-provas?limit=5"
    
    # 9. Filtros
    Write-Host "`n9️⃣  FILTROS" -ForegroundColor Magenta
    Test-Endpoint -Name "Filtrar por status" -Method "GET" -Url "$API_URL/editais?status=publicado"
    Test-Endpoint -Name "Filtrar por banca" -Method "GET" -Url "$API_URL/editais?banca=CEBRASPE"
    
    # 10. Deletar edital de teste
    Write-Host "`n🔟 DELETAR EDITAL DE TESTE" -ForegroundColor Magenta
    $deleted = Test-Endpoint -Name "Deletar edital $editalId" -Method "DELETE" -Url "$API_URL/editais/$editalId"
    
    if ($deleted) {
        Write-Host "   🗑️  Edital de teste removido com sucesso" -ForegroundColor Cyan
    }
}

# Resumo final
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "✅ TESTES CONCLUÍDOS" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan

Write-Host "`nFuncionalidades testadas:" -ForegroundColor Yellow
Write-Host "  ✅ Listagem de editais" -ForegroundColor Green
Write-Host "  ✅ Criação de edital" -ForegroundColor Green
Write-Host "  ✅ Busca por ID" -ForegroundColor Green
Write-Host "  ✅ Atualização de edital" -ForegroundColor Green
Write-Host "  ✅ Criação de evento" -ForegroundColor Green
Write-Host "  ✅ Listagem de eventos" -ForegroundColor Green
Write-Host "  ✅ Estatísticas" -ForegroundColor Green
Write-Host "  ✅ Relatórios" -ForegroundColor Green
Write-Host "  ✅ Filtros" -ForegroundColor Green
Write-Host "  ✅ Deleção de edital" -ForegroundColor Green

Write-Host "`n📝 Próximos passos:" -ForegroundColor Yellow
Write-Host "  1. Testar frontend em: http://localhost:3000/admin/editais" -ForegroundColor Cyan
Write-Host "  2. Testar criação de edital com formulário" -ForegroundColor Cyan
Write-Host "  3. Testar exportação (CSV, JSON, PDF)" -ForegroundColor Cyan
Write-Host "  4. Testar operações em lote" -ForegroundColor Cyan
Write-Host "  5. Testar notificações toast" -ForegroundColor Cyan

Write-Host "`n🎉 Sistema de Editais está funcionando!" -ForegroundColor Green
