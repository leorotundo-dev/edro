# ❓ FAQ - SISTEMA DE JOBS

## 🚀 INÍCIO

### P: Por onde começo?
**R:** Abra `EXECUTAR_AGORA_1_MINUTO.md` e siga os 3 passos.

### P: Preciso configurar algo antes?
**R:** Sim, apenas o arquivo `.env` com `DATABASE_URL` do Railway.

### P: Quanto tempo leva?
**R:** 2-5 minutos no total (configuração + execução + verificação).

---

## 🔧 EXECUÇÃO

### P: Qual método devo usar para executar as migrações?
**R:** 
- **PowerShell script** (recomendado): Automatizado e com verificação de erros
- **SQL direto no Railway**: Mais rápido, mas manual
- **NPM command**: Se você tem Railway CLI instalado

### P: Posso executar as migrações mais de uma vez?
**R:** Sim! O SQL usa `CREATE TABLE IF NOT EXISTS`, então é seguro.

### P: O que acontece se der erro?
**R:** O script faz rollback automático. Nada é modificado no banco.

---

## ❌ ERROS COMUNS

### P: "relation 'jobs' does not exist"
**R:** As migrações ainda não foram executadas. Execute `.\executar-migrations.ps1`

### P: "DATABASE_URL não encontrada"
**R:** Configure o arquivo `.env` na raiz do projeto com a DATABASE_URL do Railway.

### P: "uuid_generate_v4() não existe"
**R:** Use `gen_random_uuid()` ao invés (já está correto no SQL fornecido).

### P: Jobs ficam em "pending" eternamente
**R:** 
1. Verifique se o backend está rodando
2. Verifique logs do backend no Railway
3. Reinicie o backend

---

## 📊 FUNCIONAMENTO

### P: Como funciona o sistema de jobs?
**R:** 
1. CronService verifica job_schedules periodicamente
2. Cria jobs na tabela jobs com status "pending"
3. Worker pega próximo job e executa
4. Atualiza status para "completed" ou "failed"

### P: O que acontece se um job falhar?
**R:** Sistema tenta novamente (retry automático) até atingir max_attempts (padrão: 3).

### P: Como adiciono um novo tipo de job?
**R:** 
1. Adicione handler em `jobService.ts` → `executeJob()`
2. Implemente a lógica do job
3. Registre em `job_schedules` se for agendado

---

## 📅 AGENDAMENTO

### P: Como funcionam os jobs agendados?
**R:** Usam expressões cron (ex: `0 3 * * *` = todos os dias às 3h).

### P: Como desativo um job agendado?
**R:** 
```sql
UPDATE job_schedules 
SET enabled = false 
WHERE name = 'Nome do Job';
```

### P: Como altero o horário de um job?
**R:** 
```sql
UPDATE job_schedules 
SET schedule = '0 5 * * *'  -- 5h
WHERE name = 'Nome do Job';
```

---

## 🔍 MONITORAMENTO

### P: Como vejo os jobs em execução?
**R:** 
```sql
SELECT * FROM jobs WHERE status = 'running';
```
Ou via API: `GET /api/admin/jobs?status=running`

### P: Como vejo os logs de um job?
**R:** 
```sql
SELECT * FROM job_logs 
WHERE job_id = 'uuid' 
ORDER BY timestamp DESC;
```
Ou via API: `GET /api/admin/jobs/:id/logs`

### P: Como sei se o sistema está funcionando?
**R:** Verifique endpoint: `GET /api/admin/jobs/stats`

---

## 🛠️ ADMINISTRAÇÃO

### P: Como crio um job manualmente?
**R:** 
```bash
POST /api/admin/jobs
{
  "name": "Test Job",
  "type": "harvest",
  "data": {}
}
```

### P: Como cancelo um job em execução?
**R:** 
```sql
UPDATE jobs 
SET status = 'failed', 
    error = 'Cancelado manualmente'
WHERE id = 'uuid';
```

### P: Como limpo jobs antigos?
**R:** 
```sql
DELETE FROM jobs 
WHERE completed_at < NOW() - INTERVAL '30 days';
```

---

## 🔐 SEGURANÇA

### P: Os jobs são seguros?
**R:** Sim! Usam transações SQL, validação de inputs e logs de auditoria.

### P: Preciso de autenticação para usar a API?
**R:** Sim, os endpoints estão protegidos (verificar implementação no backend).

### P: Dados sensíveis são criptografados?
**R:** Recomenda-se criptografar dados sensíveis antes de salvar em `data` JSONB.

---

## 📈 PERFORMANCE

### P: Quantos jobs posso processar simultaneamente?
**R:** Depende do worker. Padrão é 1 por vez, mas pode ser escalado.

### P: Qual o tempo médio de execução?
**R:** Varia por tipo: harvest ~10s, generate_drops ~30s, cleanup ~5s.

### P: Como otimizo a performance?
**R:** 
- Use prioridades adequadas
- Otimize handlers de jobs
- Aumente max_attempts se necessário
- Use índices (já criados)

---

## 🧪 TESTES

### P: Como testo o sistema?
**R:** 
1. Execute `.\verificar-migrations.ps1`
2. Crie um job de teste via API
3. Verifique logs e resultado

### P: Posso testar localmente?
**R:** Sim! Configure `.env` e execute `npm run dev` em `apps/backend`.

---

## 📚 DOCUMENTAÇÃO

### P: Onde encontro mais informações?
**R:** 
- **Início rápido:** `EXECUTAR_AGORA_1_MINUTO.md`
- **Guia completo:** `COMECE_AQUI_JOBS.md`
- **Referência:** `REFERENCIA_RAPIDA_JOBS.md`
- **Índice:** `README_JOBS.md`

### P: Como contribuo com melhorias?
**R:** Documente suas alterações e atualize os arquivos MD correspondentes.

---

## 🆘 SUPORTE

### P: Preciso de ajuda! O que faço?
**R:** 
1. Consulte `REFERENCIA_RAPIDA_JOBS.md`
2. Execute `.\verificar-migrations.ps1`
3. Verifique logs do backend
4. Me avise com detalhes do erro

### P: Como reporto um bug?
**R:** 
- Descreva o problema
- Cole os logs relevantes
- Informe o que você tentou
- Mencione seu ambiente (local/Railway)

---

## 💡 DICAS

### ✅ Melhores Práticas
- Monitore logs regularmente
- Configure alertas de falhas
- Mantenha jobs antigos limpos
- Use prioridades adequadamente
- Documente jobs customizados

### ⚠️ Evite
- Criar muitos jobs de uma vez
- Jobs muito pesados (>5min)
- Deixar jobs travados
- Ignorar logs de erro
- Não fazer backup

---

**📞 Ainda tem dúvidas? Me pergunte!** 

Formato sugerido: "Como faço X?" ou "Tenho erro Y, o que fazer?"
