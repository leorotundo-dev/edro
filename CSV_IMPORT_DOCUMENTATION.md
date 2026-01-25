# Documentação - Importação de Briefings via CSV

## Visão Geral

Esta solução permite que você popule o calendário do Edro Editorial Board com múltiplos briefings de uma vez, importando dados de um arquivo CSV. Isso é especialmente útil quando você tem uma planilha de briefings gerada por outra plataforma ou ferramenta.

---

## Componentes Implementados

### 1. **Backend - Serviço de Importação**

**Arquivo:** `apps/backend/src/services/csvImportService.ts`

**Funcionalidades:**
- Parse de arquivos CSV com suporte a múltiplos formatos
- Validação de dados obrigatórios
- Conversão de datas (formatos brasileiro DD/MM/YYYY e ISO)
- Criação automática de clientes se não existirem
- Criação de briefings com todos os estágios do workflow
- Relatório detalhado de sucesso/falha por linha

**Funções principais:**
- `parseCSV(content: string)` - Faz parse do conteúdo CSV
- `validateRow(row, rowNumber)` - Valida campos obrigatórios
- `parseCSVDate(dateStr)` - Converte datas de múltiplos formatos
- `importRow(row, rowNumber, createdBy)` - Importa uma linha individual
- `importCSV(content, createdBy)` - Importa o arquivo completo

### 2. **Backend - Endpoint de API**

**Rota:** `POST /edro/briefings/import-csv`

**Autenticação:** Requer token JWT válido

**Request Body:**
```json
{
  "csv_content": "client_name,title,due_date...\nCoca-Cola,Campanha...",
  "created_by": "usuario@email.com" // opcional
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 10,
    "successful": 8,
    "failed": 2,
    "results": [
      {
        "success": true,
        "briefingId": "uuid-123",
        "row": 2
      },
      {
        "success": false,
        "error": "Linha 5: campo 'title' é obrigatório",
        "row": 5
      }
    ]
  }
}
```

### 3. **Frontend - Componente de Upload**

**Arquivo:** `apps/web/app/board/csv-import.tsx`

**Funcionalidades:**
- Interface de upload de arquivos CSV
- Validação de formato de arquivo
- Exibição de progresso durante importação
- Relatório visual de resultados (sucessos e falhas)
- Documentação integrada do formato esperado
- Botão para recarregar o board após importação

### 4. **Frontend - Integração no Board**

**Modificações em:** `apps/web/app/board/page.tsx`

- Botão "Importar CSV" adicionado na barra superior
- Modal para exibir o componente de importação
- Recarga automática do board após importação bem-sucedida

---

## Formato do CSV

### Colunas Obrigatórias

| Coluna | Tipo | Descrição | Exemplo |
|--------|------|-----------|---------|
| `client_name` | String | Nome do cliente | "Coca-Cola" |
| `title` | String | Título do briefing | "Campanha Verão 2026" |

### Colunas Opcionais

| Coluna | Tipo | Descrição | Exemplo |
|--------|------|-----------|---------|
| `due_date` | Date | Data de entrega | "15/02/2026" ou "2026-02-15" |
| `traffic_owner` | String | Responsável pelo tráfego | "joao@agencia.com" |
| `meeting_url` | String | URL da reunião | "https://meet.google.com/abc" |
| `briefing_text` | String | Texto do briefing | "Campanha focada em..." |
| `deliverables` | String | Entregas esperadas | "3 posts, 2 stories" |
| `channels` | String | Canais de distribuição | "Instagram, TikTok" |
| `references` | String | Referências | "Campanhas anteriores" |
| `notes` | String | Observações | "Prioridade alta" |

### Formatos de Data Suportados

- **Brasileiro:** `DD/MM/YYYY` (ex: 15/02/2026)
- **ISO:** `YYYY-MM-DD` (ex: 2026-02-15)
- **ISO completo:** `YYYY-MM-DDTHH:mm:ss` (ex: 2026-02-15T14:30:00)

---

## Exemplo de Arquivo CSV

```csv
client_name,title,due_date,traffic_owner,meeting_url,briefing_text,deliverables,channels,references,notes
Coca-Cola,Campanha Verão 2026,15/02/2026,joao@agencia.com,https://meet.google.com/abc-defg-hij,"Campanha de verão focada em jovens de 18-25 anos. Objetivo: aumentar engajamento nas redes sociais.","3 posts Instagram, 2 stories, 1 reel","Instagram, TikTok, Facebook","Referências: campanhas anteriores de verão","Prioridade alta - cliente VIP"
Nike,Lançamento Tênis Air Max,20/02/2026,maria@agencia.com,https://meet.google.com/xyz-abcd-efg,"Lançamento do novo modelo Air Max. Público: atletas e entusiastas de corrida.","1 vídeo YouTube, 5 posts Instagram, landing page","YouTube, Instagram, Site","Cores: preto e vermelho","Aprovação do cliente até 18/02"
Apple,Promoção iPhone 15,25/02/2026,pedro@agencia.com,,"Promoção de lançamento do iPhone 15 com desconto especial.","Email marketing, 3 banners site, 2 posts redes sociais","Email, Site, Instagram, Facebook","Seguir guidelines da Apple","Usar fotos oficiais da Apple"
```

**Arquivo de exemplo disponível em:** `/home/ubuntu/edro/example-import.csv`

---

## Como Usar

### 1. **Preparar o Arquivo CSV**

1. Crie uma planilha no Excel, Google Sheets ou qualquer editor
2. Use as colunas obrigatórias: `client_name` e `title`
3. Adicione as colunas opcionais que desejar
4. Exporte como CSV (UTF-8)

### 2. **Fazer Upload no Edro**

1. Acesse o Edro Editorial Board
2. Clique no botão **"Importar CSV"** na barra superior
3. Selecione seu arquivo CSV
4. Clique em **"Importar CSV"**
5. Aguarde o processamento

### 3. **Verificar Resultados**

Após a importação, você verá:
- **Total de linhas processadas**
- **Quantidade de sucessos** ✅
- **Quantidade de falhas** ❌
- **Lista detalhada de erros** (se houver)

Se houver erros, corrija as linhas problemáticas no CSV e importe novamente.

---

## Comportamento do Sistema

### Criação Automática de Clientes

Se um cliente não existir no sistema, ele será criado automaticamente com o nome fornecido no CSV. Clientes são identificados pelo nome (case-insensitive).

### Criação de Estágios do Workflow

Cada briefing importado terá automaticamente todos os estágios do workflow criados:
1. Briefing
2. iClips entrada
3. Alinhamento
4. Copy IA
5. Aprovação
6. Produção
7. Revisão
8. Entrega
9. iClips saída
10. Concluído

O briefing começa no estágio **"Briefing"** e pode ser movido manualmente pelos estágios.

### Campos Customizados

Qualquer coluna adicional no CSV que não esteja na lista padrão será armazenada no campo `payload` do briefing como um campo customizado.

---

## Validações e Erros Comuns

### Erros de Validação

| Erro | Causa | Solução |
|------|-------|---------|
| "campo 'client_name' é obrigatório" | Coluna client_name vazia | Preencha o nome do cliente |
| "campo 'title' é obrigatório" | Coluna title vazia | Preencha o título do briefing |
| "Erro ao fazer parse do CSV" | Formato inválido | Verifique se o arquivo é CSV válido |

### Dicas para Evitar Erros

1. **Use UTF-8:** Salve o CSV com encoding UTF-8 para evitar problemas com acentos
2. **Aspas duplas:** Use aspas duplas para campos com vírgulas ou quebras de linha
3. **Cabeçalho obrigatório:** A primeira linha deve conter os nomes das colunas
4. **Linhas vazias:** Linhas vazias são automaticamente ignoradas

---

## Instalação e Deploy

### Dependências Instaladas

```bash
cd apps/backend
pnpm add csv-parse
```

### Arquivos Criados/Modificados

**Backend:**
- `apps/backend/src/services/csvImportService.ts` (novo)
- `apps/backend/src/routes/edro.ts` (modificado - adicionado endpoint)

**Frontend:**
- `apps/web/app/board/csv-import.tsx` (novo)
- `apps/web/app/board/page.tsx` (modificado - adicionado botão e modal)

### Deploy no Railway

Após fazer commit e push das alterações:

```bash
cd /home/ubuntu/edro
git add .
git commit -m "feat: add CSV import functionality for briefings"
git push origin main
```

O Railway fará o deploy automaticamente.

---

## Testes

### Teste Manual

1. Use o arquivo `example-import.csv` fornecido
2. Acesse o Edro Board
3. Clique em "Importar CSV"
4. Faça upload do arquivo
5. Verifique se os 3 briefings foram criados com sucesso

### Teste de Erro

Crie um CSV com erro intencional:
```csv
client_name,title
,Teste sem cliente
Teste,
```

Ambas as linhas devem falhar com mensagens de erro apropriadas.

---

## Limitações e Considerações

1. **Tamanho do arquivo:** Não há limite técnico, mas arquivos muito grandes (>1000 linhas) podem demorar
2. **Processamento sequencial:** As linhas são processadas uma por vez (não paralelo)
3. **Sem rollback:** Se uma linha falhar, as anteriores já foram criadas
4. **Duplicação:** O sistema não verifica duplicatas - cada importação cria novos briefings

---

## Melhorias Futuras

Possíveis melhorias para implementar:

1. **Upload direto de arquivo:** Usar multipart/form-data ao invés de enviar conteúdo como string
2. **Validação de duplicatas:** Verificar se briefing já existe antes de criar
3. **Importação assíncrona:** Para arquivos grandes, processar em background
4. **Preview antes de importar:** Mostrar preview dos dados antes de confirmar
5. **Mapeamento de colunas:** Permitir que usuário mapeie colunas do CSV para campos do sistema
6. **Templates de CSV:** Fornecer templates prontos para download

---

## Suporte

Para problemas ou dúvidas:
1. Verifique os logs do backend no Railway
2. Verifique o console do navegador para erros do frontend
3. Revise esta documentação

---

## Changelog

**v1.0.0 - 25/01/2026**
- Implementação inicial da funcionalidade de importação CSV
- Suporte a múltiplos formatos de data
- Criação automática de clientes
- Interface de upload no frontend
- Relatório detalhado de resultados
