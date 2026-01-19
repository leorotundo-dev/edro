# ✅ Checklist de Deploy - Sistema de Questões

**Use este checklist para garantir que tudo foi deployado corretamente**

---

## 📦 ANTES DO DEPLOY

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│  [ ] Arquivos criados e salvos                     │
│      - questionGenerator.ts                        │
│      - questionRepository.ts                       │
│      - questions.ts (routes)                       │
│      - generate-questions-batch.ts                 │
│      - 0009_questoes_english_columns.sql          │
│      - generate_question.prompt.txt                │
│      - analyze_question.prompt.txt                 │
│                                                     │
│  [ ] Código testado localmente                     │
│                                                     │
│  [ ] Variáveis de ambiente configuradas            │
│      - OPENAI_API_KEY                             │
│      - DATABASE_URL                               │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 🚀 DURANTE O DEPLOY

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│  [ ] Git add & commit                              │
│      git add .                                     │
│      git commit -m "..."                           │
│                                                     │
│  [ ] Git push                                      │
│      git push origin main                          │
│                                                     │
│  [ ] Railway detectou deploy                       │
│      (verificar dashboard)                         │
│                                                     │
│  [ ] Build completou sem erros                     │
│      (checar logs)                                 │
│                                                     │
│  [ ] Deploy está "Active"                          │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 🗄️ MIGRATIONS

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│  [ ] Migration 0009 existe no código               │
│                                                     │
│  [ ] Migration rodou automaticamente               │
│      (verificar logs: "Migration 0009 applied")    │
│                                                     │
│  OU                                                 │
│                                                     │
│  [ ] Rodar manualmente:                            │
│      railway run npm run db:migrate                │
│                                                     │
│  [ ] Verificar no banco:                           │
│      SELECT * FROM schema_migrations               │
│      WHERE name = '0009_questoes_english_columns.sql' │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 🧪 TESTES

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│  [ ] Health check OK                               │
│      GET /health                                   │
│      → {"status":"ok"}                             │
│                                                     │
│  [ ] Gerar 1 questão funciona                      │
│      POST /ai/questions/generate                   │
│      → Retorna questão gerada                      │
│      → questionId presente                         │
│                                                     │
│  [ ] Questão salva no banco                        │
│      GET /questions                                │
│      → Lista contém a questão                      │
│                                                     │
│  [ ] Estatísticas funcionam                        │
│      GET /admin/questions/stats                    │
│      → total > 0                                   │
│                                                     │
│  [ ] Busca funciona                                │
│      GET /questions/search?concept=regência        │
│      → Retorna resultados                          │
│                                                     │
│  [ ] Batch funciona (opcional)                     │
│      POST /ai/questions/generate-batch             │
│      → Gera múltiplas questões                     │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 🎯 FUNCIONALIDADES

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│  [ ] CESPE gera true_false                         │
│  [ ] FCC gera multiple_choice                      │
│  [ ] FGV gera multiple_choice                      │
│  [ ] VUNESP gera multiple_choice                   │
│                                                     │
│  [ ] 5 níveis de dificuldade funcionam             │
│  [ ] Explicações são geradas                       │
│  [ ] Conceitos são extraídos                       │
│  [ ] Tags são aplicadas                            │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 📊 VALIDAÇÃO FINAL

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│  [ ] Gerar 10+ questões de teste                   │
│      - 5 em Português (CESPE)                      │
│      - 5 em Matemática (FCC)                       │
│                                                     │
│  [ ] Verificar qualidade                           │
│      - Questões fazem sentido?                     │
│      - Alternativas são coerentes?                 │
│      - Explicações estão claras?                   │
│                                                     │
│  [ ] Performance OK                                │
│      - Geração em < 10s por questão                │
│      - Batch de 5 em < 60s                         │
│                                                     │
│  [ ] Sem erros nos logs                            │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## ✅ DEPLOY COMPLETO

Se todos os items acima estão marcados:

```
╔═══════════════════════════════════════════════════╗
║                                                   ║
║   🎉 DEPLOY 100% COMPLETO E VALIDADO!            ║
║                                                   ║
║   Sistema de Questões rodando em produção        ║
║   Todos os endpoints funcionando                  ║
║   Migrations aplicadas                            ║
║   Testes passando                                 ║
║                                                   ║
║   ✅ PRONTO PARA USO!                            ║
║                                                   ║
╚═══════════════════════════════════════════════════╝
```

---

## 🚨 SE ALGO FALHOU

### **Migration não rodou?**
```bash
railway run npm run db:migrate
```

### **OpenAI não responde?**
```bash
railway variables --set OPENAI_API_KEY=sk-...
```

### **Endpoint retorna 404?**
- Verificar se routes/index.ts registrou questionsRoutes
- Verificar se build completou
- Fazer redeploy: `git commit --allow-empty -m "trigger deploy" && git push`

### **Erro 500?**
```bash
railway logs --tail 100
```
Procurar por stack trace

---

## 📞 COMANDOS ÚTEIS

```bash
# Ver logs em tempo real
railway logs

# Ver variáveis
railway variables

# Rodar comando no Railway
railway run [comando]

# Status do serviço
railway status

# Redeploy
git commit --allow-empty -m "redeploy" && git push
```

---

## 📋 PRÓXIMOS PASSOS

Após deploy completo:

1. ✅ **Documentar API** (Postman/Swagger)
2. ✅ **Integrar com Frontend**
3. ✅ **Gerar banco de questões**
4. ✅ **Próximo sistema** (ReccoEngine/Simulados/Frontend)

---

**Última atualização**: Dezembro 2024  
**Versão**: 1.0  
**Status**: Ready for Production! 🚀
