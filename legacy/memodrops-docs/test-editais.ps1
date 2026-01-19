# Script de Teste - Sistema de Editais
# Testa todos os endpoints da API de editais

$baseUrl = "http://localhost:3001"
Write-Host "🧪 Testando Sistema de Editais - MemoDrops" -ForegroundColor Cyan
Write-Host "Base URL: $baseUrl" -ForegroundColor Gray
Write-Host ""

# Função auxiliar para fazer requisições
function Test-Endpoint {
    param(
        [string]$Method,
        [string]$Endpoint,
        [object]$Body = $null,
        [string]$Description
    )
    
    Write-Host "📍 $Description" -ForegroundColor Yellow
    Write-Host "   $Method $Endpoint" -ForegroundColor Gray
    
    try {
        $params = @{
            Uri = "$baseUrl$Endpoint"
            Method = $Method
            ContentType = "application/json"
        }
        
        if ($Body) {
            $params.Body = ($Body | ConvertTo-Json -Depth 10)
        }
        
        $response = Invoke-RestMethod @params
        
        if ($response.success) {
            Write-Host "   ✅ Sucesso!" -ForegroundColor Green
            if ($response.data) {
                if ($response.data -is [Array]) {
                    Write-Host "   📊 Retornou $($response.data.Count) registro(s)" -ForegroundColor Cyan
                } else {
                    Write-Host "   📋 ID: $($response.data.id)" -ForegroundColor Cyan
                }
            }
            return $response
        } else {
            Write-Host "   ❌ Falhou: $($response.error)" -ForegroundColor Red
            return $null
        }
    } catch {
        Write-Host "   ❌ Erro: $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
    
    Write-Host ""
}

# 1. Criar um edital de teste
Write-Host "`n=== 1️⃣ CRIANDO EDITAL DE TESTE ===" -ForegroundColor Magenta
$novoEdital = @{
    codigo = "EDITAL-TEST-$(Get-Date -Format 'yyyyMMddHHmmss')"
    titulo = "Concurso Público para Analista de TI - TESTE"
    orgao = "Tribunal Regional Federal"
    banca = "CESPE/CEBRASPE"
    status = "publicado"
    data_publicacao = "2025-01-15"
    data_inscricao_inicio = "2025-01-20"
    data_inscricao_fim = "2025-02-20"
    data_prova_prevista = "2025-03-25"
    descricao = "Edital para contratação de Analistas de TI com especialização em desenvolvimento de sistemas."
    numero_vagas = 50
    numero_inscritos = 0
    taxa_inscricao = 120.50
    link_edital_completo = "https://example.com/edital.pdf"
    link_inscricao = "https://example.com/inscricao"
    tags = @("federal", "tecnologia", "nivel-superior", "teste")
    cargos = @(
        @{
            nome = "Analista de Sistemas"
            vagas = 30
            salario = 12000.00
            requisitos = "Ensino Superior em Ciência da Computação ou áreas afins"
        },
        @{
            nome = "Analista de Suporte"
            vagas = 20
            salario = 8000.00
            requisitos = "Ensino Superior em Tecnologia da Informação"
        }
    )
    disciplinas = @(
        @{
            nome = "Língua Portuguesa"
            peso = 1.5
            numero_questoes = 20
        },
        @{
            nome = "Informática"
            peso = 2.0
            numero_questoes = 30
        },
        @{
            nome = "Direito Constitucional"
            peso = 1.0
            numero_questoes = 15
        }
    )
    observacoes = "Este é um edital de teste criado automaticamente para validação do sistema."
}

$editalCriado = Test-Endpoint -Method "POST" -Endpoint "/api/editais" -Body $novoEdital -Description "Criar novo edital"
$editalId = $editalCriado.data.id

if (-not $editalId) {
    Write-Host "❌ Falha ao criar edital. Abortando testes." -ForegroundColor Red
    exit 1
}

# 2. Buscar edital criado
Write-Host "`n=== 2️⃣ BUSCANDO EDITAL ===" -ForegroundColor Magenta
Test-Endpoint -Method "GET" -Endpoint "/api/editais/$editalId" -Description "Buscar edital por ID"

# 3. Listar todos os editais
Write-Host "`n=== 3️⃣ LISTANDO EDITAIS ===" -ForegroundColor Magenta
Test-Endpoint -Method "GET" -Endpoint "/api/editais" -Description "Listar todos os editais"

# 4. Filtrar editais
Write-Host "`n=== 4️⃣ FILTRANDO EDITAIS ===" -ForegroundColor Magenta
Test-Endpoint -Method "GET" -Endpoint "/api/editais?status=publicado" -Description "Filtrar por status 'publicado'"
Test-Endpoint -Method "GET" -Endpoint "/api/editais?banca=CESPE" -Description "Filtrar por banca 'CESPE'"
Test-Endpoint -Method "GET" -Endpoint "/api/editais?search=TI" -Description "Buscar por termo 'TI'"

# 5. Atualizar edital
Write-Host "`n=== 5️⃣ ATUALIZANDO EDITAL ===" -ForegroundColor Magenta
$atualizacao = @{
    status = "em_andamento"
    numero_inscritos = 1500
    observacoes = "Edital atualizado via teste automatizado"
}
Test-Endpoint -Method "PUT" -Endpoint "/api/editais/$editalId" -Body $atualizacao -Description "Atualizar status e inscritos"

# 6. Criar eventos para o edital
Write-Host "`n=== 6️⃣ CRIANDO EVENTOS ===" -ForegroundColor Magenta
$evento1 = @{
    tipo = "inscricao"
    titulo = "Período de Inscrições"
    descricao = "Inscrições abertas para todos os cargos"
    data_inicio = "2025-01-20T00:00:00Z"
    data_fim = "2025-02-20T23:59:59Z"
    concluido = $false
}
Test-Endpoint -Method "POST" -Endpoint "/api/editais/$editalId/eventos" -Body $evento1 -Description "Criar evento de inscrição"

$evento2 = @{
    tipo = "prova"
    titulo = "Aplicação da Prova Objetiva"
    descricao = "Prova será aplicada em todo o território nacional"
    data_inicio = "2025-03-25T08:00:00Z"
    data_fim = "2025-03-25T12:00:00Z"
    concluido = $false
}
$eventoCriado = Test-Endpoint -Method "POST" -Endpoint "/api/editais/$editalId/eventos" -Body $evento2 -Description "Criar evento de prova"

# 7. Listar eventos
Write-Host "`n=== 7️⃣ LISTANDO EVENTOS ===" -ForegroundColor Magenta
Test-Endpoint -Method "GET" -Endpoint "/api/editais/$editalId/eventos" -Description "Listar eventos do edital"

# 8. Atualizar evento
if ($eventoCriado -and $eventoCriado.data) {
    Write-Host "`n=== 8️⃣ ATUALIZANDO EVENTO ===" -ForegroundColor Magenta
    $eventoId = $eventoCriado.data.id
    $atualizacaoEvento = @{
        concluido = $true
        descricao = "Prova aplicada com sucesso"
    }
    Test-Endpoint -Method "PUT" -Endpoint "/api/editais/eventos/$eventoId" -Body $atualizacaoEvento -Description "Marcar evento como concluído"
}

# 9. Adicionar usuário interessado
Write-Host "`n=== 9️⃣ ADICIONANDO INTERESSE ===" -ForegroundColor Magenta
$interesse = @{
    user_id = "00000000-0000-0000-0000-000000000001"  # UUID de teste
    cargo_interesse = "Analista de Sistemas"
}
Test-Endpoint -Method "POST" -Endpoint "/api/editais/$editalId/interesse" -Body $interesse -Description "Adicionar usuário interessado"

# 10. Listar usuários interessados
Write-Host "`n=== 🔟 LISTANDO USUÁRIOS INTERESSADOS ===" -ForegroundColor Magenta
Test-Endpoint -Method "GET" -Endpoint "/api/editais/$editalId/usuarios" -Description "Listar usuários interessados"

# 11. Estatísticas
Write-Host "`n=== 1️⃣1️⃣ ESTATÍSTICAS ===" -ForegroundColor Magenta
Test-Endpoint -Method "GET" -Endpoint "/api/editais/$editalId/stats" -Description "Estatísticas do edital"
Test-Endpoint -Method "GET" -Endpoint "/api/editais/reports/by-status" -Description "Relatório por status"
Test-Endpoint -Method "GET" -Endpoint "/api/editais/reports/by-banca" -Description "Relatório por banca"
Test-Endpoint -Method "GET" -Endpoint "/api/editais/reports/proximas-provas?limit=5" -Description "Próximas 5 provas"

# 12. Deletar edital (cleanup)
Write-Host "`n=== 1️⃣2️⃣ LIMPEZA (DELETAR EDITAL DE TESTE) ===" -ForegroundColor Magenta
$confirmacao = Read-Host "Deseja deletar o edital de teste criado? (S/N)"
if ($confirmacao -eq "S" -or $confirmacao -eq "s") {
    Test-Endpoint -Method "DELETE" -Endpoint "/api/editais/$editalId" -Description "Deletar edital de teste"
    Write-Host "✅ Edital de teste removido" -ForegroundColor Green
} else {
    Write-Host "⏭️ Edital de teste mantido (ID: $editalId)" -ForegroundColor Yellow
}

# Resumo
Write-Host "`n" + ("="*60) -ForegroundColor Cyan
Write-Host "✅ TESTES CONCLUÍDOS!" -ForegroundColor Green
Write-Host ("="*60) -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 Para acessar a interface web:" -ForegroundColor Yellow
Write-Host "   http://localhost:3000/admin/editais" -ForegroundColor White
Write-Host ""
Write-Host "📖 Documentação completa:" -ForegroundColor Yellow
Write-Host "   ./SISTEMA_EDITAIS_README.md" -ForegroundColor White
Write-Host ""
