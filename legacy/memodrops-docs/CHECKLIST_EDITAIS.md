# ✅ Checklist de Instalação - Sistema de Editais

## 📋 Pré-requisitos

- [ ] Node.js instalado (v18+)
- [ ] PostgreSQL instalado e rodando
- [ ] Variável `DATABASE_URL` configurada
- [ ] Git instalado
- [ ] Editor de código (VS Code recomendado)

## 🗄️ 1. Configuração do Banco de Dados

### 1.1 Executar Migration
```powershell
cd memodrops-main\apps\backend
psql $env:DATABASE_URL -f src/db/migrations/0014_editais_system.sql
```

**Verificação:**
- [ ] Migration executada sem erros
- [ ] Tabelas criadas: `editais`, `edital_eventos`, `edital_questoes`, `edital_usuarios`
- [ ] Índices criados
- [ ] View `editais_stats` criada

**Comando de verificação:**
```sql
\dt editais*
```

### 1.2 Inserir Dados de Exemplo (Opcional)
```powershell
psql $env:DATABASE_URL -f src/db/seed-editais.sql
```

**Verificação:**
- [ ] 5 editais inseridos
- [ ] Eventos criados para alguns editais
- [ ] Sem erros na execução

**Comando de verificação:**
```sql
SELECT codigo, titulo, status FROM editais;
```

## ⚙️ 2. Configuração do Backend

### 2.1 Instalar Dependências
```powershell
cd memodrops-main\apps\backend
npm install
```

**Verificação:**
- [ ] `node_modules` criado
- [ ] Sem erros de instalação

### 2.2 Verificar Arquivos Criados
- [ ] `src/db/migrations/0014_editais_system.sql` existe
- [ ] `src/db/seed-editais.sql` existe
- [ ] `src/types/edital.ts` existe
- [ ] `src/repositories/editalRepository.ts` existe
- [ ] `src/routes/editais.ts` existe
- [ ] `src/routes/index.ts` atualizado

### 2.3 Iniciar Backend
```powershell
npm run dev
```

**Verificação:**
- [ ] Servidor iniciou na porta 3001 (ou configurada)
- [ ] Sem erros no console
- [ ] Mensagem "Server listening on..." apareceu

**Teste rápido:**
```powershell
curl http://localhost:3001/api/editais
```

## 🎨 3. Configuração do Frontend

### 3.1 Instalar Dependências
```powershell
cd memodrops-main\apps\web
npm install
```

**Verificação:**
- [ ] `node_modules` criado
- [ ] Sem erros de instalação

### 3.2 Verificar Arquivos Criados
- [ ] `app/admin/editais/page.tsx` existe
- [ ] `app/admin/editais/novo/page.tsx` existe
- [ ] `app/admin/editais/[id]/page.tsx` existe

### 3.3 Iniciar Frontend
```powershell
npm run dev
```

**Verificação:**
- [ ] Servidor iniciou na porta 3000 (ou configurada)
- [ ] Sem erros de compilação
- [ ] Mensagem "ready" apareceu

**Teste rápido:**
Abrir navegador em: http://localhost:3000/admin/editais

## 🧪 4. Testes

### 4.1 Teste Manual da Interface

Acessar: http://localhost:3000/admin/editais

**Verificações:**
- [ ] Página carrega corretamente
- [ ] Dashboard com estatísticas aparece
- [ ] Tabela de editais é exibida
- [ ] Filtros funcionam
- [ ] Busca funciona
- [ ] Botão "Novo Edital" visível

### 4.2 Criar um Edital

Clicar em "Novo Edital" e preencher formulário

**Verificações:**
- [ ] Formulário abre corretamente
- [ ] Campos obrigatórios marcados
- [ ] Pode adicionar múltiplos cargos
- [ ] Pode adicionar múltiplas disciplinas
- [ ] Botão "Criar Edital" funciona
- [ ] Redirecionamento após criação

### 4.3 Visualizar Edital

Clicar em "Ver" em um edital

**Verificações:**
- [ ] Página de detalhes abre
- [ ] Informações exibidas corretamente
- [ ] Tabs funcionam (Detalhes, Cargos, Disciplinas, Cronograma)
- [ ] Estatísticas aparecem
- [ ] Botões "Editar" e "Excluir" visíveis

### 4.4 Teste Automatizado

```powershell
cd memodrops-main
.\test-editais.ps1
```

**Verificações:**
- [ ] Script executa sem erros
- [ ] Todos os testes passam
- [ ] Edital de teste criado e deletado

## 🔌 5. Teste dos Endpoints

### 5.1 Endpoints Básicos

**Listar Editais:**
```powershell
curl http://localhost:3001/api/editais
```
- [ ] Retorna lista de editais
- [ ] Status 200
- [ ] JSON válido

**Buscar por ID:**
```powershell
curl http://localhost:3001/api/editais/{id}
```
- [ ] Retorna edital específico
- [ ] Status 200
- [ ] Dados completos

**Criar Edital:**
```powershell
curl -X POST http://localhost:3001/api/editais `
  -H "Content-Type: application/json" `
  -d '{"codigo":"TEST","titulo":"Teste","orgao":"Teste","numero_vagas":10}'
```
- [ ] Edital criado
- [ ] Status 201
- [ ] ID retornado

### 5.2 Endpoints de Filtros

**Por Status:**
```powershell
curl http://localhost:3001/api/editais?status=publicado
```
- [ ] Retorna apenas editais publicados

**Por Banca:**
```powershell
curl http://localhost:3001/api/editais?banca=CESPE
```
- [ ] Retorna apenas editais da banca

**Busca Textual:**
```powershell
curl http://localhost:3001/api/editais?search=federal
```
- [ ] Retorna editais que contenham "federal"

### 5.3 Endpoints de Relatórios

**Por Status:**
```powershell
curl http://localhost:3001/api/editais/reports/by-status
```
- [ ] Retorna contagem por status

**Por Banca:**
```powershell
curl http://localhost:3001/api/editais/reports/by-banca
```
- [ ] Retorna contagem por banca

**Próximas Provas:**
```powershell
curl http://localhost:3001/api/editais/reports/proximas-provas
```
- [ ] Retorna próximas provas ordenadas

## 📊 6. Verificação de Dados

### 6.1 Banco de Dados

```sql
-- Total de editais
SELECT COUNT(*) FROM editais;

-- Editais por status
SELECT status, COUNT(*) FROM editais GROUP BY status;

-- Eventos cadastrados
SELECT COUNT(*) FROM edital_eventos;

-- View de estatísticas
SELECT * FROM editais_stats LIMIT 5;
```

**Verificações:**
- [ ] Queries executam sem erro
- [ ] Dados consistentes
- [ ] Índices funcionando

### 6.2 Integridade Referencial

```sql
-- Verificar eventos órfãos
SELECT COUNT(*) FROM edital_eventos e 
WHERE NOT EXISTS (SELECT 1 FROM editais WHERE id = e.edital_id);

-- Verificar usuários órfãos
SELECT COUNT(*) FROM edital_usuarios eu 
WHERE NOT EXISTS (SELECT 1 FROM editais WHERE id = eu.edital_id);
```

**Verificações:**
- [ ] Nenhum registro órfão
- [ ] Foreign keys funcionando

## 🎯 7. Funcionalidades Avançadas

### 7.1 Eventos

**Criar Evento:**
- [ ] Endpoint funciona
- [ ] Evento aparece no cronograma
- [ ] Datas válidas

**Marcar como Concluído:**
- [ ] Status atualiza
- [ ] Visual muda na interface

### 7.2 Usuários Interessados

**Adicionar Interesse:**
- [ ] Endpoint funciona
- [ ] Usuário vinculado ao edital
- [ ] Notificações configuradas

**Listar Interessados:**
- [ ] Lista retornada corretamente
- [ ] Dados completos

### 7.3 Questões

**Vincular Questão:**
- [ ] Endpoint funciona
- [ ] Questão vinculada
- [ ] Peso aplicado

## 📱 8. Responsividade

Testar em diferentes resoluções:

**Desktop (1920x1080):**
- [ ] Layout adequado
- [ ] Todos os elementos visíveis
- [ ] Tabela completa

**Tablet (768x1024):**
- [ ] Layout adapta
- [ ] Filtros acessíveis
- [ ] Navegação funciona

**Mobile (375x667):**
- [ ] Layout mobile friendly
- [ ] Menu responsivo
- [ ] Cards empilhados

## 🔐 9. Segurança

### 9.1 Validações

**Input Validation:**
- [ ] Campos obrigatórios validados
- [ ] Tipos de dados verificados
- [ ] Mensagens de erro claras

**SQL Injection:**
- [ ] Queries parametrizadas
- [ ] Sem SQL direto

**XSS Protection:**
- [ ] Inputs sanitizados
- [ ] HTML escapado

### 9.2 Autorização (quando implementada)

- [ ] Rotas protegidas
- [ ] Roles verificados
- [ ] Tokens válidos

## 📝 10. Documentação

### 10.1 Arquivos Criados

- [ ] `SISTEMA_EDITAIS_README.md` - Documentação completa
- [ ] `GUIA_RAPIDO_EDITAIS.md` - Guia de início
- [ ] `SISTEMA_EDITAIS_RESUMO.md` - Resumo executivo
- [ ] `SISTEMA_EDITAIS_ARQUITETURA.txt` - Arquitetura visual
- [ ] `CHECKLIST_EDITAIS.md` - Este arquivo
- [ ] `test-editais.ps1` - Script de testes

### 10.2 Código Documentado

- [ ] TypeScript types bem definidos
- [ ] Comentários nos pontos críticos
- [ ] README atualizado

## 🚀 11. Deploy (Futuro)

### 11.1 Preparação

- [ ] Variáveis de ambiente configuradas
- [ ] Build sem erros
- [ ] Migrations versionadas

### 11.2 Staging

- [ ] Deploy em ambiente de teste
- [ ] Testes de integração
- [ ] Smoke tests

### 11.3 Produção

- [ ] Backup do banco antes do deploy
- [ ] Deploy gradual
- [ ] Monitoramento ativo

## ✅ Resumo Final

### Checklist Rápido

- [ ] ✅ Migration executada
- [ ] ✅ Dados de exemplo inseridos
- [ ] ✅ Backend rodando (porta 3001)
- [ ] ✅ Frontend rodando (porta 3000)
- [ ] ✅ Interface acessível
- [ ] ✅ Pode criar editais
- [ ] ✅ Pode listar editais
- [ ] ✅ Pode filtrar editais
- [ ] ✅ Pode visualizar detalhes
- [ ] ✅ Pode editar editais
- [ ] ✅ Pode deletar editais
- [ ] ✅ Eventos funcionando
- [ ] ✅ Estatísticas corretas
- [ ] ✅ Testes passando

### Status Geral

```
┌────────────────────────────────────────┐
│  SISTEMA DE EDITAIS                    │
├────────────────────────────────────────┤
│  Backend:        [✅] Funcionando      │
│  Frontend:       [✅] Funcionando      │
│  Database:       [✅] Configurado      │
│  Testes:         [✅] Passando         │
│  Documentação:   [✅] Completa         │
├────────────────────────────────────────┤
│  Status:         🟢 PRONTO             │
└────────────────────────────────────────┘
```

## 🎉 Conclusão

Se todos os itens estiverem marcados, o sistema está **100% funcional** e pronto para uso!

### Acessos Rápidos

- **Interface**: http://localhost:3000/admin/editais
- **API Docs**: Consultar `SISTEMA_EDITAIS_README.md`
- **Testes**: Execute `.\test-editais.ps1`

### Suporte

Se algum item não estiver funcionando:

1. Verifique os logs do backend e frontend
2. Confirme que as migrations foram executadas
3. Teste os endpoints individualmente
4. Consulte a documentação completa
5. Verifique as variáveis de ambiente

---

**Sistema de Editais MemoDrops** 🎓
*Checklist de Instalação e Validação*
