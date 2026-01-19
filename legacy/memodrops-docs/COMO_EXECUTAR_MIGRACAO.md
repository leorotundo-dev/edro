# 🚀 Como Executar a Migração do Sistema de Editais

## Opção 1: Script PowerShell (Recomendado)

```powershell
cd memodrops-main
.\executar-migracao-editais.ps1
```

## Opção 2: Script Batch (Windows)

```cmd
cd memodrops-main
EXECUTAR_MIGRACAO_AGORA.bat
```

## Opção 3: Comando Direto (Manual)

### 3.1 Via psql (Linha de Comando)

```powershell
# Navegar para o diretório
cd memodrops-main

# Executar migração
psql $env:DATABASE_URL -f apps\backend\src\db\migrations\0014_editais_system.sql
```

### 3.2 Via Node.js

```powershell
cd memodrops-main\apps\backend

node -e "const fs = require('fs'); const { Pool } = require('pg'); const pool = new Pool({ connectionString: process.env.DATABASE_URL }); const sql = fs.readFileSync('src/db/migrations/0014_editais_system.sql', 'utf8'); pool.query(sql).then(() => { console.log('✅ Migração executada com sucesso!'); process.exit(0); }).catch(err => { console.error('❌ Erro:', err); process.exit(1); });"
```

## Opção 4: Interface Gráfica (pgAdmin)

1. Abra o **pgAdmin**
2. Conecte ao seu banco de dados
3. Clique com botão direito no banco → **Query Tool**
4. Abra o arquivo: `memodrops-main/apps/backend/src/db/migrations/0014_editais_system.sql`
5. Clique em **Execute** (▶️)

## Pré-requisitos

Antes de executar, certifique-se de que:

- [ ] PostgreSQL está instalado e rodando
- [ ] DATABASE_URL está configurada
- [ ] Você tem permissões no banco de dados
- [ ] A extensão `uuid-ossp` está disponível

### Verificar DATABASE_URL

```powershell
# PowerShell
echo $env:DATABASE_URL

# Se não estiver configurada, configure:
$env:DATABASE_URL = "postgresql://usuario:senha@localhost:5432/memodrops"
```

### Verificar Conexão

```powershell
psql $env:DATABASE_URL -c "SELECT version();"
```

## O que será criado?

A migração irá criar:

✅ **4 Tabelas:**
- `editais` - Tabela principal de editais
- `edital_eventos` - Cronograma de eventos
- `edital_questoes` - Questões vinculadas
- `edital_usuarios` - Usuários interessados

✅ **1 View:**
- `editais_stats` - Estatísticas agregadas

✅ **12 Índices** para otimização

✅ **3 Triggers** para auditoria automática

✅ **1 Função** para atualizar `updated_at`

## Verificar se Funcionou

Após executar, verifique:

```sql
-- Listar tabelas criadas
\dt edital*

-- Ver estrutura da tabela principal
\d editais

-- Contar registros (deve ser 0 inicialmente)
SELECT COUNT(*) FROM editais;
```

Ou via PowerShell:

```powershell
psql $env:DATABASE_URL -c "\dt edital*"
```

## Inserir Dados de Exemplo

Após a migração, você pode inserir dados de exemplo:

```powershell
psql $env:DATABASE_URL -f apps\backend\src\db\seed-editais.sql
```

Isso criará 5 editais de exemplo para você testar o sistema.

## Próximos Passos

Após a migração bem-sucedida:

1. **Inserir dados** (opcional): `psql $env:DATABASE_URL -f apps\backend\src\db\seed-editais.sql`

2. **Iniciar backend**:
   ```powershell
   cd apps\backend
   npm run dev
   ```

3. **Iniciar frontend** (nova janela):
   ```powershell
   cd apps\web
   npm run dev
   ```

4. **Acessar**: http://localhost:3000/admin/editais

5. **Testar API**:
   ```powershell
   .\test-editais.ps1
   ```

## Troubleshooting

### Erro: "DATABASE_URL não configurada"

```powershell
$env:DATABASE_URL = "postgresql://usuario:senha@host:porta/database"
```

### Erro: "psql não encontrado"

Adicione PostgreSQL ao PATH ou use o caminho completo:

```powershell
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" $env:DATABASE_URL -f ...
```

### Erro: "permission denied"

Certifique-se de que o usuário tem permissões:

```sql
GRANT ALL PRIVILEGES ON DATABASE memodrops TO seu_usuario;
```

### Erro: "extension uuid-ossp does not exist"

Crie a extensão primeiro:

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

### Tabelas já existem

A migração usa `CREATE TABLE IF NOT EXISTS`, então é seguro executar novamente.

Se quiser forçar recriação (⚠️ apaga dados):

```sql
DROP TABLE IF EXISTS edital_usuarios CASCADE;
DROP TABLE IF EXISTS edital_questoes CASCADE;
DROP TABLE IF EXISTS edital_eventos CASCADE;
DROP TABLE IF EXISTS editais CASCADE;
DROP VIEW IF EXISTS editais_stats;
```

Depois execute a migração novamente.

## Validação Final

Execute este checklist:

```powershell
# 1. Verificar tabelas
psql $env:DATABASE_URL -c "SELECT tablename FROM pg_tables WHERE tablename LIKE 'edital%';"

# 2. Verificar view
psql $env:DATABASE_URL -c "SELECT viewname FROM pg_views WHERE viewname = 'editais_stats';"

# 3. Verificar índices
psql $env:DATABASE_URL -c "SELECT indexname FROM pg_indexes WHERE tablename LIKE 'edital%';"

# 4. Teste simples
psql $env:DATABASE_URL -c "SELECT * FROM editais_stats;"
```

Se todos os comandos funcionarem, a migração foi bem-sucedida! ✅

## Suporte

- 📖 Documentação: `SISTEMA_EDITAIS_README.md`
- 🚀 Guia Rápido: `GUIA_RAPIDO_EDITAIS.md`
- ✅ Checklist: `CHECKLIST_EDITAIS.md`
- 🏗️ Arquitetura: `SISTEMA_EDITAIS_ARQUITETURA.txt`

---

**Desenvolvido para MemoDrops** 🎓
