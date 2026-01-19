# 📋 Sistema de Administração de Editais - MemoDrops

## 🎯 Visão Geral

Sistema completo para gerenciar editais de concursos públicos no MemoDrops, permitindo cadastro, visualização, edição e acompanhamento de editais com todas as suas informações relevantes.

## ✨ Funcionalidades

### 1. **Gestão de Editais**
- ✅ Criar, editar e excluir editais
- ✅ Filtros avançados (status, banca, órgão, busca)
- ✅ Visualização detalhada
- ✅ Dashboard com estatísticas

### 2. **Informações do Edital**
- Dados básicos (código, título, órgão, banca)
- Status (rascunho, publicado, em andamento, etc.)
- Datas importantes (publicação, inscrições, prova)
- Cargos oferecidos (nome, vagas, salário)
- Disciplinas cobradas (nome, peso, questões)
- Links (edital completo, inscrição)
- Tags e observações

### 3. **Cronograma de Eventos**
- Cadastro de eventos (inscrições, provas, resultados)
- Acompanhamento de datas
- Marcação de eventos concluídos

### 4. **Relacionamentos**
- Vincular questões ao edital
- Acompanhamento de usuários interessados
- Notificações configuráveis

## 📁 Estrutura de Arquivos

```
memodrops-main/
├── apps/backend/
│   ├── src/
│   │   ├── db/
│   │   │   └── migrations/
│   │   │       └── 0014_editais_system.sql       # Migration do banco
│   │   ├── types/
│   │   │   └── edital.ts                         # TypeScript types
│   │   ├── repositories/
│   │   │   └── editalRepository.ts               # Camada de dados
│   │   └── routes/
│   │       ├── editais.ts                        # API endpoints
│   │       └── index.ts                          # Registro de rotas
│   └
├── apps/web/
│   └── app/
│       └── admin/
│           └── editais/
│               ├── page.tsx                      # Lista de editais
│               ├── novo/
│               │   └── page.tsx                  # Criar edital
│               └── [id]/
│                   └── page.tsx                  # Detalhes do edital
└
└── SISTEMA_EDITAIS_README.md                     # Esta documentação
```

## 🗄️ Estrutura do Banco de Dados

### Tabela: `editais`
```sql
- id (UUID)
- codigo (TEXT) - Código único do edital
- titulo (TEXT)
- orgao (TEXT)
- banca (TEXT)
- status (ENUM) - rascunho | publicado | em_andamento | suspenso | cancelado | concluido
- data_publicacao (DATE)
- data_inscricao_inicio (DATE)
- data_inscricao_fim (DATE)
- data_prova_prevista (DATE)
- descricao (TEXT)
- cargos (JSONB) - Array de cargos
- disciplinas (JSONB) - Array de disciplinas
- conteudo_programatico (JSONB)
- link_edital_completo (TEXT)
- link_inscricao (TEXT)
- numero_vagas (INTEGER)
- numero_inscritos (INTEGER)
- taxa_inscricao (DECIMAL)
- tags (JSONB)
- observacoes (TEXT)
- created_at, updated_at
```

### Tabela: `edital_eventos`
```sql
- id (UUID)
- edital_id (UUID) → editais.id
- tipo (ENUM) - inscricao | prova | resultado | recurso | convocacao | outro
- titulo (TEXT)
- descricao (TEXT)
- data_inicio (TIMESTAMPTZ)
- data_fim (TIMESTAMPTZ)
- link_externo (TEXT)
- concluido (BOOLEAN)
```

### Tabela: `edital_questoes`
```sql
- id (UUID)
- edital_id (UUID) → editais.id
- questao_id (UUID)
- disciplina (TEXT)
- topico (TEXT)
- peso (DECIMAL)
```

### Tabela: `edital_usuarios`
```sql
- id (UUID)
- edital_id (UUID) → editais.id
- user_id (UUID) → users.id
- cargo_interesse (TEXT)
- notificacoes_ativas (BOOLEAN)
```

## 🔌 API Endpoints

### Editais

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/editais` | Listar editais (com filtros) |
| GET | `/api/editais/:id` | Buscar edital por ID |
| POST | `/api/editais` | Criar novo edital |
| PUT | `/api/editais/:id` | Atualizar edital |
| DELETE | `/api/editais/:id` | Deletar edital |
| GET | `/api/editais-stats` | Estatísticas gerais |
| GET | `/api/editais/:id/stats` | Estatísticas de um edital |

### Eventos

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/editais/:id/eventos` | Listar eventos do edital |
| POST | `/api/editais/:id/eventos` | Criar evento |
| PUT | `/api/editais/eventos/:eventoId` | Atualizar evento |
| DELETE | `/api/editais/eventos/:eventoId` | Deletar evento |

### Usuários Interessados

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/editais/:id/usuarios` | Listar usuários interessados |
| POST | `/api/editais/:id/interesse` | Adicionar interesse |
| DELETE | `/api/editais/:id/interesse/:userId` | Remover interesse |

### Relatórios

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/editais/reports/by-status` | Editais por status |
| GET | `/api/editais/reports/by-banca` | Editais por banca |
| GET | `/api/editais/reports/proximas-provas` | Próximas provas |

## 🚀 Como Usar

### 1. Executar Migration

```bash
cd memodrops-main/apps/backend

# Via psql
psql $DATABASE_URL -f src/db/migrations/0014_editais_system.sql

# Ou via código
npm run migrate
```

### 2. Iniciar Backend

```bash
cd memodrops-main/apps/backend
npm run dev
```

O backend estará disponível em `http://localhost:3001`

### 3. Iniciar Frontend Admin

```bash
cd memodrops-main/apps/web
npm run dev
```

O frontend estará disponível em `http://localhost:3000`

### 4. Acessar Interface

Abra seu navegador e acesse:
```
http://localhost:3000/admin/editais
```

## 📝 Exemplos de Uso

### Criar um Edital via API

```javascript
const response = await fetch('/api/editais', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    codigo: 'EDITAL-001-2025',
    titulo: 'Concurso Público para Analista de Sistemas',
    orgao: 'Tribunal Regional Federal',
    banca: 'CESPE/CEBRASPE',
    status: 'publicado',
    data_publicacao: '2025-01-15',
    data_prova_prevista: '2025-03-20',
    numero_vagas: 50,
    taxa_inscricao: 120.00,
    cargos: [
      {
        nome: 'Analista de Sistemas',
        vagas: 50,
        salario: 12000.00,
        requisitos: 'Ensino Superior em Tecnologia'
      }
    ],
    disciplinas: [
      { nome: 'Português', peso: 1.5, numero_questoes: 20 },
      { nome: 'Informática', peso: 2.0, numero_questoes: 30 },
      { nome: 'Direito', peso: 1.0, numero_questoes: 15 }
    ],
    tags: ['federal', 'tecnologia', 'nivel-superior']
  })
});
```

### Filtrar Editais

```javascript
// Buscar editais em andamento da banca CESPE
const response = await fetch('/api/editais?status=em_andamento&banca=CESPE');

// Buscar próximas provas
const response = await fetch('/api/editais/reports/proximas-provas?limit=5');
```

## 🎨 Interface Web

### Página de Listagem
- **Dashboard** com estatísticas resumidas
- **Filtros avançados** (busca, status, banca)
- **Tabela responsiva** com todas as informações
- **Ações rápidas** (visualizar, editar, excluir)

### Página de Criação
- **Formulário completo** com validações
- **Campos dinâmicos** para cargos e disciplinas
- **Upload de informações** estruturadas
- **Preview antes de salvar**

### Página de Detalhes
- **Visualização completa** do edital
- **Tabs organizadas** (detalhes, cargos, disciplinas, cronograma)
- **Estatísticas em tempo real**
- **Links externos** para edital e inscrição

## 🔐 Segurança

- ✅ Validação de dados no backend
- ✅ Sanitização de inputs
- ✅ Proteção contra SQL Injection (uso de queries parametrizadas)
- ✅ Autenticação de usuários (a ser implementada)
- ✅ Autorização por roles (admin)

## 📊 Estatísticas Disponíveis

- Total de editais cadastrados
- Editais por status
- Editais por banca organizadora
- Próximas provas previstas
- Usuários interessados por edital
- Total de questões vinculadas

## 🔄 Fluxo de Status

```
rascunho → publicado → em_andamento → concluido
            ↓             ↓
         suspenso      cancelado
```

## 🎯 Próximas Melhorias

- [ ] Sistema de notificações automáticas
- [ ] Integração com scrapers de editais
- [ ] Exportação de relatórios (PDF, Excel)
- [ ] Comparação entre editais
- [ ] Timeline visual de eventos
- [ ] Upload de documentos (arquivos PDF)
- [ ] API de webhooks para integrações
- [ ] Análise preditiva de candidatos

## 🤝 Contribuindo

Para adicionar novas funcionalidades:

1. Backend: Adicione métodos em `editalRepository.ts`
2. Rotas: Exponha via `editais.ts`
3. Frontend: Crie componentes em `apps/web/app/admin/editais/`

## 📞 Suporte

Para dúvidas ou problemas:
- Verifique os logs do backend
- Consulte a documentação da API
- Revise as migrations aplicadas

---

**Desenvolvido para MemoDrops** 🚀
Sistema completo de gestão de editais para concursos públicos
