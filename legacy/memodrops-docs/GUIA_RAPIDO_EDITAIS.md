# 🚀 Guia Rápido - Sistema de Editais

## ⚡ Início Rápido (5 minutos)

### 1. Executar Migration

```powershell
cd memodrops-main\apps\backend

# Opção 1: Via psql
psql $env:DATABASE_URL -f src/db/migrations/0014_editais_system.sql

# Opção 2: Via Node.js
node -e "const { db } = require('./src/db'); const fs = require('fs'); const sql = fs.readFileSync('src/db/migrations/0014_editais_system.sql', 'utf8'); db.query(sql).then(() => { console.log('✅ Migration executada!'); process.exit(0); });"
```

### 2. Inserir Dados de Exemplo (Opcional)

```powershell
psql $env:DATABASE_URL -f src/db/seed-editais.sql
```

Isso criará 5 editais de exemplo:
- ✅ TRF - Analista Judiciário
- ✅ INSS - Técnico
- ✅ Polícia Federal - Agente  
- ✅ Prefeitura SP - Diversos
- ✅ Banco do Brasil - Escriturário

### 3. Iniciar o Backend

```powershell
cd memodrops-main\apps\backend
npm run dev
```

Backend disponível em: http://localhost:3001

### 4. Iniciar o Frontend

```powershell
cd memodrops-main\apps\web
npm run dev
```

Frontend disponível em: http://localhost:3000

### 5. Acessar a Interface

Abra seu navegador:
```
http://localhost:3000/admin/editais
```

## 🧪 Testar a API

Execute o script de testes:

```powershell
cd memodrops-main
.\test-editais.ps1
```

Ou teste manualmente via Postman/Insomnia:

### Criar Edital
```http
POST http://localhost:3001/api/editais
Content-Type: application/json

{
  "codigo": "TEST-001",
  "titulo": "Concurso Teste",
  "orgao": "Órgão Teste",
  "banca": "Banca Teste",
  "status": "publicado",
  "numero_vagas": 10,
  "cargos": [
    {
      "nome": "Analista",
      "vagas": 10,
      "salario": 5000
    }
  ],
  "disciplinas": [
    {
      "nome": "Português",
      "peso": 1.5,
      "numero_questoes": 20
    }
  ],
  "tags": ["teste"]
}
```

### Listar Editais
```http
GET http://localhost:3001/api/editais
```

### Buscar por ID
```http
GET http://localhost:3001/api/editais/{id}
```

### Filtrar
```http
GET http://localhost:3001/api/editais?status=publicado&banca=CESPE
```

## 📊 Endpoints Principais

| Ação | Método | Endpoint |
|------|--------|----------|
| Listar todos | GET | `/api/editais` |
| Buscar por ID | GET | `/api/editais/:id` |
| Criar | POST | `/api/editais` |
| Atualizar | PUT | `/api/editais/:id` |
| Deletar | DELETE | `/api/editais/:id` |
| Estatísticas | GET | `/api/editais-stats` |
| Por status | GET | `/api/editais/reports/by-status` |
| Por banca | GET | `/api/editais/reports/by-banca` |
| Próximas provas | GET | `/api/editais/reports/proximas-provas` |

## 🎨 Interface Web

### Páginas Disponíveis

1. **Lista de Editais**
   ```
   /admin/editais
   ```
   - Dashboard com estatísticas
   - Filtros (busca, status, banca)
   - Tabela com todos os editais
   - Ações: Ver, Editar, Excluir

2. **Criar Edital**
   ```
   /admin/editais/novo
   ```
   - Formulário completo
   - Validações em tempo real
   - Múltiplos cargos e disciplinas

3. **Detalhes do Edital**
   ```
   /admin/editais/[id]
   ```
   - Visualização completa
   - Tabs: Detalhes, Cargos, Disciplinas, Cronograma
   - Estatísticas do edital

## 📖 Estrutura de Dados

### Campos Principais do Edital

```typescript
{
  codigo: string;              // Código único (ex: "TRF-2025-001")
  titulo: string;              // Título do edital
  orgao: string;               // Órgão organizador
  banca?: string;              // Banca examinadora
  status: EditalStatus;        // rascunho | publicado | em_andamento | etc
  data_publicacao?: Date;      // Data de publicação
  data_prova_prevista?: Date;  // Data prevista da prova
  numero_vagas: number;        // Total de vagas
  cargos: Cargo[];             // Array de cargos oferecidos
  disciplinas: Disciplina[];   // Array de disciplinas
  tags: string[];              // Tags para categorização
}
```

### Status Disponíveis

- `rascunho` - Em elaboração
- `publicado` - Edital publicado
- `em_andamento` - Inscrições abertas ou provas em andamento
- `suspenso` - Temporariamente suspenso
- `cancelado` - Cancelado
- `concluido` - Concurso finalizado

## 🔍 Exemplos de Filtros

### Buscar editais publicados
```
/api/editais?status=publicado
```

### Buscar por banca
```
/api/editais?banca=CESPE
```

### Buscar próximas provas (5 próximas)
```
/api/editais/reports/proximas-provas?limit=5
```

### Busca por termo
```
/api/editais?search=federal
```

### Múltiplos filtros
```
/api/editais?status=em_andamento&banca=FCC&search=analista
```

## 🛠️ Troubleshooting

### Migration não executa
```powershell
# Verificar se a tabela já existe
psql $env:DATABASE_URL -c "\dt editais"

# Forçar re-execução (cuidado, apaga dados!)
psql $env:DATABASE_URL -c "DROP TABLE IF EXISTS editais CASCADE;"
psql $env:DATABASE_URL -f src/db/migrations/0014_editais_system.sql
```

### Porta 3001 já em uso
```powershell
# Windows
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# Ou alterar a porta no .env
PORT=3002
```

### Erro de CORS
Adicione ao backend (já deve estar configurado):
```typescript
app.register(cors, {
  origin: 'http://localhost:3000'
});
```

## 📚 Documentação Completa

Para informações detalhadas, consulte:

- **Documentação completa**: `SISTEMA_EDITAIS_README.md`
- **Migration SQL**: `apps/backend/src/db/migrations/0014_editais_system.sql`
- **Tipos TypeScript**: `apps/backend/src/types/edital.ts`
- **Repository**: `apps/backend/src/repositories/editalRepository.ts`
- **Rotas API**: `apps/backend/src/routes/editais.ts`

## 🎯 Próximos Passos

1. ✅ Criar seu primeiro edital via interface
2. ✅ Adicionar eventos ao cronograma
3. ✅ Testar filtros e buscas
4. ✅ Explorar estatísticas e relatórios
5. ✅ Integrar com sistema de questões (futuro)

## 💡 Dicas

- Use **tags** para categorizar editais (ex: "federal", "nivel-superior")
- Configure **eventos** no cronograma para acompanhamento
- **Status** ajudam a organizar o fluxo do edital
- Use a **busca** para encontrar rapidamente

## 🆘 Suporte

Se encontrar problemas:

1. Verifique os logs do backend no terminal
2. Abra o console do navegador (F12) para erros do frontend
3. Confirme que as migrations foram executadas
4. Teste os endpoints diretamente com curl/Postman

---

**Sistema de Editais MemoDrops** 🚀
Criado para facilitar a gestão de concursos públicos
