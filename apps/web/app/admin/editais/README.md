# 📚 Sistema de Gestão de Editais - Edro

## 🎯 Visão Geral

Sistema completo para gerenciar editais de concursos públicos, incluindo:
- CRUD completo (Create, Read, Update, Delete)
- Filtros avançados
- Operações em lote (bulk operations)
- Exportação (CSV, JSON, PDF)
- Sistema de notificações (toast)
- Validação de formulários
- Upload de documentos (futuro)
- Auditoria de mudanças (futuro)

---

## 📁 Estrutura de Arquivos

```
/admin/editais/
├── page.tsx                  # Listagem principal de editais
├── novo/page.tsx            # Criar novo edital
├── [id]/page.tsx            # Visualizar edital
├── [id]/editar/page.tsx     # Editar edital
└── README.md                # Esta documentação

/components/editais/
├── AdvancedFilters.tsx      # Filtros avançados
└── BulkActions.tsx          # Operações em lote

/lib/
├── toast.ts                 # Sistema de notificações
├── validation.ts            # Validação de formulários
└── export.ts                # Exportação de dados
```

---

## 🚀 Funcionalidades Principais

### 1. Listagem de Editais (`/admin/editais`)

**Recursos:**
- ✅ Tabela responsiva com todos os editais
- ✅ Busca por código, título ou órgão
- ✅ Filtros por status e banca
- ✅ Filtros avançados (data, vagas)
- ✅ Estatísticas em cards (total, em andamento, etc)
- ✅ Operações em lote (seleção múltipla)
- ✅ Exportação (CSV, JSON, PDF)
- ✅ Paginação automática
- ✅ Loading states
- ✅ Empty states

**Como usar:**
```typescript
// Filtrar editais
<input onChange={(e) => setSearchTerm(e.target.value)} />

// Selecionar múltiplos
<input type="checkbox" onChange={handleSelectEdital} />

// Exportar
exportEditaisToCSV(selectedEditais);
exportEditaisToJSON(selectedEditais);
generatePDFReport(selectedEditais);
```

### 2. Criar Edital (`/admin/editais/novo`)

**Campos obrigatórios:**
- Código (único, 2-50 caracteres)
- Título (5-200 caracteres)
- Órgão (3-100 caracteres)

**Campos opcionais:**
- Banca
- Status (rascunho, publicado, em_andamento, etc)
- Datas (publicação, inscrições, prova)
- Número de vagas
- Taxa de inscrição
- Descrição
- Links (edital completo, inscrição)
- Tags
- Observações
- Cargos (nome, vagas, salário, requisitos)
- Disciplinas (nome, peso, número de questões)

**Validações:**
```typescript
import { validateForm, editalValidationRules } from '@/lib/validation';

const errors = validateForm(formData, editalValidationRules);
if (hasErrors(errors)) {
  // Mostrar erros
}
```

### 3. Visualizar Edital (`/admin/editais/[id]`)

**Tabs disponíveis:**
1. **Detalhes** - Informações gerais, datas, links
2. **Cargos** - Lista de cargos com vagas e requisitos
3. **Disciplinas** - Matérias da prova com pesos
4. **Cronograma** - Eventos importantes (inscrições, provas, resultados)

**Cards de estatísticas:**
- Total de Vagas
- Número de Inscritos
- Taxa de Inscrição
- Data da Prova

**Ações:**
- Editar edital
- Excluir edital
- Ver links externos

### 4. Editar Edital (`/admin/editais/[id]/editar`)

**Recursos:**
- Formulário pré-populado com dados atuais
- Adicionar/remover cargos dinamicamente
- Adicionar/remover disciplinas dinamicamente
- Validação em tempo real
- Auto-save (opcional)
- Histórico de mudanças (futuro)

**Como adicionar cargo:**
```typescript
const addCargo = () => {
  setCargos([...cargos, {
    nome: '',
    vagas: 0,
    salario: 0,
    requisitos: ''
  }]);
};
```

**Como remover cargo:**
```typescript
const removeCargo = (index: number) => {
  setCargos(cargos.filter((_, i) => i !== index));
};
```

---

## 🔔 Sistema de Notificações (Toast)

### Uso Básico:

```typescript
import { toast } from '@/lib/toast';

// Sucesso
toast.success('Edital criado com sucesso!');

// Erro
toast.error('Erro ao salvar edital');

// Aviso
toast.warning('Preencha todos os campos obrigatórios');

// Informação
toast.info('Carregando dados...');
```

### Com duração personalizada:

```typescript
toast.success('Mensagem', 3000); // 3 segundos
toast.error('Erro crítico', 0);  // Não fecha automaticamente
```

---

## 📤 Exportação de Dados

### CSV Export:

```typescript
import { exportEditaisToCSV } from '@/lib/export';

// Exportar todos
exportEditaisToCSV(editais);

// Exportar selecionados
exportEditaisToCSV(selectedEditais);
```

### JSON Export:

```typescript
import { exportEditaisToJSON } from '@/lib/export';

exportEditaisToJSON(editais);
```

### PDF Report:

```typescript
import { generatePDFReport } from '@/lib/export';

generatePDFReport(editais); // Abre janela de impressão
```

---

## ✅ Validação de Formulários

### Regras de validação disponíveis:

```typescript
const rules = {
  required: true,        // Campo obrigatório
  minLength: 5,          // Mínimo de caracteres
  maxLength: 100,        // Máximo de caracteres
  min: 0,                // Valor mínimo (números)
  max: 10000,            // Valor máximo (números)
  pattern: /regex/,      // Validação por regex
  custom: (value) => {}, // Validação customizada
  message: 'Erro'        // Mensagem de erro
};
```

### Validando formulário completo:

```typescript
import { validateForm, hasErrors } from '@/lib/validation';

const errors = validateForm(formData, editalValidationRules);

if (hasErrors(errors)) {
  // Mostrar erros
  Object.keys(errors).forEach(field => {
    console.log(`${field}: ${errors[field]}`);
  });
  return;
}

// Prosseguir com envio
```

---

## 🔍 Filtros Avançados

### Filtros disponíveis:

1. **Busca textual** - Código, título, órgão
2. **Status** - rascunho, publicado, em_andamento, suspenso, cancelado, concluído
3. **Banca** - CEBRASPE, FCC, FGV, VUNESP, etc
4. **Data da prova** - Período (início/fim)
5. **Número de vagas** - Mínimo/máximo

### Implementação:

```typescript
const filteredEditais = editais.filter((edital) => {
  const matchesSearch = searchTerm === '' ||
    edital.titulo.toLowerCase().includes(searchTerm.toLowerCase());
  
  const matchesStatus = statusFilter === 'all' ||
    edital.status === statusFilter;
  
  const matchesBanca = bancaFilter === 'all' ||
    edital.banca === bancaFilter;
  
  const matchesDateRange = !dataProvaInicio ||
    new Date(edital.data_prova_prevista) >= new Date(dataProvaInicio);
  
  const matchesVagas = !vagasMin ||
    edital.numero_vagas >= parseInt(vagasMin);
  
  return matchesSearch && matchesStatus &&
         matchesBanca && matchesDateRange && matchesVagas;
});
```

---

## 🎨 Componentes Reutilizáveis

### AdvancedFilters:

```tsx
<AdvancedFilters
  onApply={(filters) => applyAdvancedFilters(filters)}
  onClear={() => clearAllFilters()}
  bancas={bancasDisponiveis}
/>
```

### BulkActions:

```tsx
<BulkActions
  selectedCount={selectedEditais.length}
  onDelete={() => handleBulkDelete()}
  onExport={() => exportEditaisToCSV(selectedEditais)}
  onClearSelection={() => setSelectedEditais([])}
/>
```

---

## 🔗 API Endpoints

### Listar todos:
```
GET /api/editais
Query params: ?status=em_andamento&banca=CEBRASPE
```

### Buscar por ID:
```
GET /api/editais/:id
```

### Criar:
```
POST /api/editais
Body: { codigo, titulo, orgao, ... }
```

### Atualizar:
```
PUT /api/editais/:id
Body: { titulo, status, ... }
```

### Deletar:
```
DELETE /api/editais/:id
```

### Estatísticas:
```
GET /api/editais-stats
GET /api/editais/:id/stats
```

### Eventos:
```
GET /api/editais/:id/eventos
POST /api/editais/:id/eventos
PUT /api/editais/eventos/:eventoId
DELETE /api/editais/eventos/:eventoId
```

### Relatórios:
```
GET /api/editais/reports/by-status
GET /api/editais/reports/by-banca
GET /api/editais/reports/proximas-provas?limit=10
```

---

## 🎯 Próximas Funcionalidades

### Curto Prazo:
- [ ] Upload de arquivos PDF (edital completo)
- [ ] Sistema de anexos
- [ ] Notificações por email
- [ ] Calendário de eventos
- [ ] Dashboard de analytics

### Médio Prazo:
- [ ] Auditoria completa (histórico de mudanças)
- [ ] Versionamento de editais
- [ ] Comentários e notas
- [ ] Integração com scrapers
- [ ] Alertas automáticos (inscrições abertas, etc)

### Longo Prazo:
- [ ] Machine Learning (recomendação de editais)
- [ ] Análise preditiva (chances de aprovação)
- [ ] Integração com sistemas externos
- [ ] API pública para parceiros
- [ ] Mobile app

---

## 🐛 Troubleshooting

### Erro: "Edital não encontrado"
- Verifique se o ID está correto
- Confirme se o backend está rodando
- Verifique logs do servidor

### Erro ao exportar
- Confirme se há dados selecionados
- Verifique permissões do navegador
- Tente outro formato (CSV/JSON)

### Toast não aparece
- Verifique se ToastContainer está no layout
- Confirme que o CSS de animações foi carregado
- Veja console do navegador para erros

### Validação não funciona
- Confirme que as regras estão corretas
- Verifique se os campos têm os nomes corretos
- Debug com console.log(errors)

---

## 📞 Suporte

Para dúvidas ou problemas:
1. Consulte esta documentação
2. Verifique os logs do console
3. Teste com dados mock primeiro
4. Entre em contato com a equipe de desenvolvimento

---

**Última atualização:** 07/12/2024
**Versão:** 2.0.0
**Autor:** Edro Team
