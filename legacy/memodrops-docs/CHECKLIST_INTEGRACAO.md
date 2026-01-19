# ✅ Checklist de Integração - Dashboard Admin

## 🎯 Validação da Integração Scrapers + Editais

Use este checklist para validar que tudo está funcionando corretamente.

---

## 📋 1. Arquivos Criados/Modificados

### Backend - Editais
- [ ] `apps/backend/src/db/migrations/0014_editais_system.sql` - Migration
- [ ] `apps/backend/src/types/edital.ts` - TypeScript types
- [ ] `apps/backend/src/repositories/editalRepository.ts` - Repository
- [ ] `apps/backend/src/routes/editais.ts` - Routes
- [ ] `apps/backend/src/routes/index.ts` - Registro de rotas ✏️ MODIFICADO

### Frontend - Dashboard Admin
- [ ] `apps/web/components/SidebarNav.tsx` - ✏️ MODIFICADO (+ Scrapers, + Editais)
- [ ] `apps/web/app/admin/scrapers/page.tsx` - ✨ NOVA PÁGINA
- [ ] `apps/web/app/admin/editais/page.tsx` - Página existente
- [ ] `apps/web/app/admin/editais/novo/page.tsx` - Criar edital
- [ ] `apps/web/app/admin/editais/[id]/page.tsx` - Detalhes edital

### Documentação
- [ ] `DASHBOARD_ADMIN_COMPLETA.md` - Doc completa
- [ ] `MAPA_DASHBOARD_ADMIN.txt` - Mapa visual
- [ ] `RESUMO_INTEGRACAO_DASHBOARD.md` - Resumo
- [ ] `CHECKLIST_INTEGRACAO.md` - Este arquivo

---

## 🖥️ 2. Sidebar - Validação Visual

Abra http://localhost:3000/admin e verifique a sidebar:

```
┌─────────────────────┐
│ MemoDrops Admin     │
├─────────────────────┤
│ □ Dashboard         │
│ □ Drops             │
│ □ Blueprints        │
│ □ RAG Blocks        │
│ □ Harvest           │
│ □ Scrapers      ← ✨│
│ □ Editais       ← ✨│
│ □ Questões          │
│ □ Simulados         │
│ □ ReccoEngine       │
│ □ Analytics         │
│ □ Usuários          │
│ □ Custos            │
└─────────────────────┘
```

- [ ] Link "Scrapers" está visível
- [ ] Link "Editais" está visível
- [ ] Links estão na ordem correta
- [ ] Hover funciona (muda cor)
- [ ] Click navega corretamente

---

## 🤖 3. Página Scrapers

### Acesso
- [ ] URL funciona: http://localhost:3000/admin/scrapers
- [ ] Página carrega sem erros
- [ ] Layout está correto

### Header
- [ ] Título "Scrapers" visível
- [ ] Subtítulo "Gerenciamento de coleta..." visível
- [ ] Botão "Executar Todos" visível e clicável

### Cards de Estatísticas (6 cards)
- [ ] **Card 1**: Total de Fontes - Exibe número
- [ ] **Card 2**: Fontes Ativas - Exibe número em verde
- [ ] **Card 3**: Total Coletado - Exibe número em azul
- [ ] **Card 4**: Hoje - Exibe número em roxo
- [ ] **Card 5**: Pendentes - Exibe número em amarelo
- [ ] **Card 6**: Erros - Exibe número em vermelho

### Tabs
- [ ] Tab "Fontes" está visível
- [ ] Tab "Itens Coletados" está visível
- [ ] Click alterna entre tabs
- [ ] Indicador visual de tab ativa funciona

### Tab: Fontes
Se houver fontes configuradas:
- [ ] Lista de fontes aparece
- [ ] Cada fonte mostra: nome, URL, tipo, status
- [ ] Badges de tipo (edital/questao/conteudo) aparecem
- [ ] Badges de status (Ativo/Inativo/Executando) aparecem
- [ ] Botão "Executar" está visível
- [ ] Botão "Ativar/Inativo" está visível
- [ ] Ícone de Settings aparece

Se não houver fontes:
- [ ] Mensagem "Nenhuma fonte configurada" aparece
- [ ] Ícone de alerta aparece

### Tab: Itens Coletados
Se houver itens:
- [ ] Tabela aparece com headers
- [ ] Colunas: Fonte, Tipo, Título/URL, Status, Data
- [ ] Dados estão formatados corretamente
- [ ] Links são clicáveis

Se não houver itens:
- [ ] Mensagem "Nenhum item coletado" aparece

### Funcionalidades
- [ ] Click em "Executar" em uma fonte funciona
- [ ] Feedback visual ao executar (spinner)
- [ ] Click em "Executar Todos" funciona
- [ ] Toggle Ativo/Inativo funciona
- [ ] Auto-refresh funciona (esperar 30s)

### Responsividade
- [ ] Desktop (>1024px): Layout completo
- [ ] Tablet (768-1024px): Cards reorganizam
- [ ] Mobile (<768px): Stack vertical

---

## 📋 4. Página Editais

### Acesso
- [ ] URL funciona: http://localhost:3000/admin/editais
- [ ] Página carrega sem erros

### Dashboard
- [ ] 4 cards de estatísticas aparecem
- [ ] Números estão corretos
- [ ] Botão "+ Novo Edital" visível

### Filtros
- [ ] Campo de busca funciona
- [ ] Dropdown de Status funciona
- [ ] Dropdown de Banca funciona
- [ ] Filtros combinam corretamente

### Tabela
- [ ] Headers estão corretos
- [ ] Dados carregam
- [ ] Badges de status com cores corretas
- [ ] Botões de ação (Ver/Editar/Excluir) funcionam

### Criar Edital
- [ ] URL: http://localhost:3000/admin/editais/novo
- [ ] Formulário carrega
- [ ] Campos obrigatórios marcados
- [ ] Pode adicionar múltiplos cargos
- [ ] Pode adicionar múltiplas disciplinas
- [ ] Submit funciona
- [ ] Validações funcionam

### Detalhes do Edital
- [ ] URL: http://localhost:3000/admin/editais/[id]
- [ ] Página carrega com dados
- [ ] Tabs funcionam (Detalhes, Cargos, Disciplinas, Cronograma)
- [ ] Botões Editar/Excluir funcionam
- [ ] Estatísticas aparecem

---

## 🔌 5. Integração com Backend

### Scrapers
```bash
# Teste manual com curl
curl http://localhost:3001/api/harvest/sources
curl http://localhost:3001/api/harvest/content
```

- [ ] GET /api/harvest/sources retorna lista
- [ ] GET /api/harvest/content retorna itens
- [ ] POST /api/harvest/run/:id funciona
- [ ] PUT /api/harvest/sources/:id funciona

### Editais
```bash
# Teste manual com curl
curl http://localhost:3001/api/editais
curl http://localhost:3001/api/editais/:id
```

- [ ] GET /api/editais retorna lista
- [ ] GET /api/editais/:id retorna edital
- [ ] POST /api/editais cria edital
- [ ] PUT /api/editais/:id atualiza
- [ ] DELETE /api/editais/:id deleta

---

## 🎨 6. Design e UX

### Consistência Visual
- [ ] Mesmo dark theme em todas as páginas
- [ ] Cores consistentes (zinc-950, blue, green, etc)
- [ ] Tipografia uniforme
- [ ] Espaçamentos consistentes
- [ ] Bordas e arredondamentos iguais

### Interatividade
- [ ] Hover states funcionam
- [ ] Focus states funcionam
- [ ] Loading states aparecem
- [ ] Error states tratados
- [ ] Success feedbacks aparecem

### Acessibilidade
- [ ] Contraste adequado
- [ ] Textos legíveis
- [ ] Botões com tamanho adequado
- [ ] Navegação por teclado funciona

---

## 📱 7. Responsividade

### Desktop (1920x1080)
- [ ] Sidebar fixa à esquerda
- [ ] Conteúdo ocupa espaço restante
- [ ] Cards em grid (6 colunas para stats)
- [ ] Tabelas com scroll horizontal se necessário

### Tablet (768x1024)
- [ ] Sidebar retrátil
- [ ] Header com hamburger menu
- [ ] Cards reorganizam (2-3 colunas)
- [ ] Conteúdo adapta

### Mobile (375x667)
- [ ] Sidebar como overlay
- [ ] Header fixo no topo
- [ ] Cards empilhados (1 coluna)
- [ ] Tabelas scrollam horizontalmente
- [ ] Botões com tamanho adequado para touch

---

## 🔐 8. Segurança e Autenticação

- [ ] Redirecionamento para /login se não autenticado
- [ ] Token armazenado em localStorage
- [ ] Token enviado em requisições
- [ ] Logout funciona (se implementado)
- [ ] Proteção de rotas funciona

---

## ⚡ 9. Performance

- [ ] Carregamento inicial rápido (<3s)
- [ ] Navegação entre páginas suave
- [ ] Sem memory leaks visíveis
- [ ] Auto-refresh não trava interface
- [ ] Requisições não duplicam

---

## 🐛 10. Tratamento de Erros

### Cenários de Erro
- [ ] Backend offline: Mensagem de erro clara
- [ ] Fonte não encontrada: 404 tratado
- [ ] Scraper falha: Feedback visual
- [ ] Validação de form: Erros inline
- [ ] Network error: Retry option

---

## 📊 11. Dados de Teste

### Scrapers
- [ ] Pelo menos 1 fonte configurada
- [ ] Pelo menos 1 item coletado
- [ ] Diferentes tipos (edital, questao, conteudo)
- [ ] Diferentes status (pending, completed, failed)

### Editais
- [ ] Pelo menos 3 editais cadastrados
- [ ] Diferentes status (publicado, em_andamento, etc)
- [ ] Com cargos e disciplinas
- [ ] Com eventos no cronograma

---

## 🚀 12. Deploy (Quando aplicável)

- [ ] Build do frontend sem erros
- [ ] Build do backend sem erros
- [ ] Variáveis de ambiente configuradas
- [ ] NEXT_PUBLIC_API_URL correto
- [ ] Migrations executadas no banco
- [ ] Deploy funciona em produção

---

## ✅ Resumo da Validação

```
┌────────────────────────────────────────────────┐
│  CHECKLIST DE INTEGRAÇÃO                      │
├────────────────────────────────────────────────┤
│  □ Arquivos criados/modificados               │
│  □ Sidebar atualizada                         │
│  □ Página Scrapers funcional                  │
│  □ Página Editais funcional                   │
│  □ Integração com backend                     │
│  □ Design consistente                         │
│  □ Responsividade                             │
│  □ Segurança                                  │
│  □ Performance                                │
│  □ Tratamento de erros                        │
│  □ Dados de teste                             │
│  □ Deploy (opcional)                          │
├────────────────────────────────────────────────┤
│  Status: ___/12 completos                     │
└────────────────────────────────────────────────┘
```

---

## 🎯 Critérios de Sucesso

Para considerar a integração **100% completa**, todos os itens devem estar marcados (✅).

### Mínimo Viável (MVP)
- ✅ Sidebar com novos links
- ✅ Página Scrapers carrega
- ✅ Página Editais carrega
- ✅ APIs do backend respondem

### Funcionalidades Core
- ✅ Executar scrapers funciona
- ✅ CRUD de editais funciona
- ✅ Estatísticas aparecem
- ✅ Filtros funcionam

### Qualidade
- ✅ Design consistente
- ✅ Responsivo
- ✅ Sem erros no console
- ✅ Performance adequada

---

## 📞 Próximos Passos

Se algo não funcionar:

1. **Verificar console** (F12) para erros
2. **Verificar network** para chamadas de API
3. **Verificar backend** está rodando
4. **Consultar documentação**:
   - DASHBOARD_ADMIN_COMPLETA.md
   - MAPA_DASHBOARD_ADMIN.txt
   - SISTEMA_EDITAIS_README.md

---

**MemoDrops Dashboard** 🎛️
*Checklist de Validação de Integração*
