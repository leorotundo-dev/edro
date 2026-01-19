# 🚀 Guia Rápido - Sistema de Editais

## ⚡ Início Rápido (5 minutos)

### 1️⃣ Acessar o Sistema
```
http://localhost:3000/admin/editais
```

### 2️⃣ Criar Seu Primeiro Edital

**Clique em:** `+ Novo Edital`

**Preencha:**
- **Código:** `PF-2024` (obrigatório, único)
- **Título:** `Polícia Federal - Agente` (obrigatório)
- **Órgão:** `Polícia Federal` (obrigatório)
- **Banca:** `CEBRASPE`
- **Número de Vagas:** `1000`
- **Taxa de Inscrição:** `250.00`

**Clique em:** `Criar Edital`

✅ **Pronto!** Seu primeiro edital foi criado.

---

## 📋 Tarefas Comuns

### Buscar Editais
```
Digite na barra de busca:
- Por código: "PF-2024"
- Por título: "Polícia"
- Por órgão: "Federal"
```

### Filtrar por Status
```
Dropdown "Status":
- Em Andamento
- Publicado
- Concluído
```

### Exportar Dados
```
1. Selecione editais (checkboxes)
2. Clique em "Exportar"
3. Escolha formato:
   - CSV (Excel)
   - JSON (Programadores)
   - PDF (Relatório)
```

### Editar Edital
```
1. Encontre o edital
2. Clique em "Editar"
3. Faça as alterações
4. Clique em "Salvar Alterações"
```

### Deletar Edital
```
1. Encontre o edital
2. Clique em "Excluir"
3. Confirme a ação
```

---

## 🎯 Casos de Uso

### 📝 Cenário 1: Cadastrar Concurso Novo

**Situação:** Saiu um novo edital da Polícia Federal

**Passos:**
1. Acesse `/admin/editais/novo`
2. Preencha informações básicas:
   - Código: `PF-2025`
   - Título: `Polícia Federal - Agente 2025`
   - Órgão: `Polícia Federal`
   - Banca: `CEBRASPE`
3. Adicione datas:
   - Data de Publicação: hoje
   - Início das Inscrições: daqui 30 dias
   - Data da Prova: daqui 120 dias
4. Adicione cargos:
   - Agente de Polícia Federal
   - 2.500 vagas
   - R$ 23.692,78
5. Adicione disciplinas:
   - Português (peso 3, 15 questões)
   - Direito Penal (peso 4, 20 questões)
   - Informática (peso 2, 10 questões)
6. Salve!

**Tempo estimado:** 5 minutos

---

### 🔍 Cenário 2: Encontrar Editais com Muitas Vagas

**Situação:** Preciso ver concursos com mais de 100 vagas

**Passos:**
1. Acesse `/admin/editais`
2. Clique em "Filtros Avançados"
3. Configure:
   - Vagas Mínimas: `100`
4. Clique em "Aplicar Filtros"
5. Veja os resultados

**Tempo estimado:** 30 segundos

---

### 📊 Cenário 3: Gerar Relatório para Diretoria

**Situação:** Preciso apresentar dados dos editais cadastrados

**Passos:**
1. Acesse `/admin/editais`
2. Aplique filtros desejados (opcional)
3. Clique no botão "Exportar"
4. Escolha "PDF"
5. Imprima ou salve

**Resultado:**
- Relatório formatado
- Estatísticas resumidas
- Tabela com todos os dados

**Tempo estimado:** 1 minuto

---

### ✏️ Cenário 4: Atualizar Status de Edital

**Situação:** As inscrições abriram, preciso mudar o status

**Passos:**
1. Encontre o edital
2. Clique em "Editar"
3. Altere status para "Em Andamento"
4. Salve

**Tempo estimado:** 20 segundos

---

### 🗑️ Cenário 5: Limpar Editais Antigos

**Situação:** Preciso deletar vários editais concluídos

**Passos:**
1. Filtre por Status: "Concluído"
2. Selecione todos (checkbox no cabeçalho)
3. Clique em "Excluir" (ações em lote)
4. Confirme

**Tempo estimado:** 30 segundos

---

## 🎨 Atalhos de Teclado

| Atalho | Ação |
|--------|------|
| `Ctrl + K` | Buscar |
| `Ctrl + N` | Novo Edital |
| `Ctrl + E` | Editar (quando em detalhes) |
| `Ctrl + S` | Salvar (em formulários) |
| `Esc` | Fechar modal/cancelar |

---

## ✅ Checklist de Qualidade

Ao criar um edital, certifique-se de:

- [ ] Código único e descritivo
- [ ] Título completo e claro
- [ ] Órgão correto
- [ ] Banca informada (se houver)
- [ ] Número de vagas correto
- [ ] Datas importantes preenchidas
- [ ] Pelo menos 1 cargo cadastrado
- [ ] Disciplinas principais adicionadas
- [ ] Link do edital completo (se disponível)
- [ ] Tags relevantes

---

## 🐛 Problemas Comuns

### ❌ "Código já existe"
**Solução:** Use um código único. Adicione ano ou sufixo.
```
Errado: PF
Certo: PF-2024-AGT
```

### ❌ "Erro ao salvar"
**Solução:** Verifique campos obrigatórios:
- Código (2-50 caracteres)
- Título (5-200 caracteres)
- Órgão (3-100 caracteres)

### ❌ "Nenhum dado para exportar"
**Solução:** Selecione pelo menos 1 edital antes de exportar.

### ❌ "Não foi possível deletar"
**Solução:** Verifique se há dependências (usuários interessados, etc).

---

## 💡 Dicas Pro

1. **Use Tags Inteligentes**
   ```
   Boas: federal, nivel-superior, tecnologia
   Ruins: concurso, edital, prova
   ```

2. **Preencha Todas as Datas**
   - Ajuda na organização
   - Permite filtros melhores
   - Gera alertas automáticos

3. **Adicione Observações**
   - Requisitos especiais
   - Mudanças no edital
   - Observações importantes

4. **Use Status Corretamente**
   - **Rascunho**: Ainda editando
   - **Publicado**: Edital publicado, mas sem inscrições
   - **Em Andamento**: Inscrições abertas ou em andamento
   - **Concluído**: Concurso finalizado

5. **Exporte Regularmente**
   - Backup dos dados
   - Análise externa
   - Compartilhamento

---

## 📚 Recursos Adicionais

- **Documentação Completa:** `/admin/editais/README.md`
- **API Docs:** `/api/docs`
- **Suporte:** suporte@edro.digital

---

## 🎯 Métricas de Sucesso

Após dominar este sistema, você deve conseguir:

- ✅ Criar 1 edital em < 5 minutos
- ✅ Encontrar qualquer edital em < 10 segundos
- ✅ Gerar relatório completo em < 1 minuto
- ✅ Atualizar 10 editais em lote em < 2 minutos

---

**Agora você está pronto para gerenciar editais como um profissional! 🚀**
