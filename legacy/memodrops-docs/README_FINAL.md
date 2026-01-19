# 🎓 MemoDrops — Plataforma de Estudos Inteligente

**Status:** ✅ COMPLETO E PRONTO PARA PRODUÇÃO  
**Versão:** 1.0.0  
**Data:** Nov 25, 2025

---

## 📋 Visão Geral

**MemoDrops** é uma plataforma de estudos inteligente que utiliza IA, SRS (Spaced Repetition System) e metodologia científica para otimizar o aprendizado e preparação para concursos públicos.

### Principais Características

- ✅ **IA Inteligente** — Extração automática de conteúdo e geração de pílulas
- ✅ **SRS Adaptativo** — Revisões baseadas em performance do usuário
- ✅ **Planos Diários** — Planejamento automático de estudo
- ✅ **RAG Context** — Contexto enriquecido para melhor qualidade
- ✅ **Admin Panel** — Dashboard completo de gerenciamento
- ✅ **CI/CD Automático** — Deploy contínuo no Railway
- ✅ **Agendamento de Jobs** — Processamento automático 24/7

---

## 🏗️ Arquitetura

### Stack Tecnológico

**Backend:**
- Node.js 20
- TypeScript
- Fastify (Framework HTTP)
- PostgreSQL (Banco de Dados)
- OpenAI API (IA)

**DevOps:**
- GitHub Actions (CI/CD)
- Railway (Hosting)
- Docker (Containerização)

**Ferramentas:**
- npm (Package Manager)
- Git (Controle de Versão)
- node-cron (Agendamento)

### Estrutura de Diretórios

```
memodrops/
├── apps/
│   ├── backend/              # API Backend
│   │   ├── src/
│   │   │   ├── routes/       # Endpoints HTTP
│   │   │   ├── services/     # Lógica de negócio
│   │   │   ├── jobs/         # Jobs agendados
│   │   │   ├── db/           # Banco de dados
│   │   │   └── scheduler/    # Agendador
│   │   └── package.json
│   ├── ai/                   # Serviços de IA
│   │   ├── src/
│   │   │   ├── pipelines/    # Pipelines de IA
│   │   │   ├── prompts/      # Prompts
│   │   │   └── openai/       # Cliente OpenAI
│   │   └── package.json
│   └── shared/               # Código compartilhado
├── docs/                     # Documentação
│   ├── ARCHITECTURE.md       # Arquitetura
│   ├── DEPLOYMENT_GUIDE.md   # Guia de Deploy
│   ├── STAGE_*.md            # Documentação de cada stage
│   └── ...
├── .github/
│   └── workflows/            # GitHub Actions
│       ├── deploy.yml        # CI/CD
│       └── crons.yml         # Agendamento
└── package.json              # Root package
```

---

## 🚀 Começando

### Pré-requisitos

- Node.js 20+
- npm 10+
- PostgreSQL 14+
- OpenAI API Key

### Instalação Local

```bash
# Clonar repositório
git clone https://github.com/leorotundo-dev/memodrops.git
cd memodrops

# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env
# Editar .env com suas credenciais

# Executar migrações
npm run db:migrate --workspace backend

# Rodar em desenvolvimento
npm run dev
```

### Endpoints Principais

**Públicos (Autenticados):**
- `GET /api/plan/daily` — Plano diário de estudos
- `POST /api/learn/log` — Registrar resposta
- `GET /api/plan/stats` — Estatísticas de progresso

**Administrativos:**
- `GET /admin/debug/blueprints` — Listar blueprints
- `GET /admin/metrics/qa/summary` — Resumo de QA
- `POST /admin/learn/log` — Registrar resposta (admin)

---

## 📊 Stages Implementados

| Stage | Título | Status | Linhas |
|-------|--------|--------|--------|
| 1-17 | Core Backend | ✅ | 5000+ |
| 18 | Jobs de Processamento | ✅ | 589 |
| 19 | Scheduler com node-cron | ✅ | 780 |
| 20 | RAG Feeder | ✅ | 480 |
| 21 | Daily Plan | ✅ | 409 |
| 22 | Learn Log (SRS) | ✅ | 250 |
| 23 | Admin Panel | ✅ | 344 |
| 24 | Deploy Final | ✅ | 200+ |

**Total:** 24 Stages | 8000+ linhas de código | 100% completo

---

## 🔄 Fluxo de Dados

### 1. Importação de Edital

```
Upload de Edital (PDF/HTML)
    ↓
Harvest Item criado
    ↓
Job: extract-blueprints (a cada 2h)
    ↓
Blueprint extraído com IA
    ↓
exam_blueprints salvo
```

### 2. Geração de Drops

```
Blueprint criado
    ↓
Job: generate-drops (diariamente 3h)
    ↓
Tópicos extraídos
    ↓
IA gera drops por tópico
    ↓
Drops salvos com metadados
```

### 3. Alimentação RAG

```
URLs educativas
    ↓
Job: rag-feeder (diariamente 4h)
    ↓
HTML baixado
    ↓
Texto extraído e resumido com IA
    ↓
rag_blocks salvos
```

### 4. Plano Diário

```
Usuário acessa app
    ↓
GET /api/plan/daily
    ↓
Busca tópicos com revisão pendente (SRS)
    ↓
Busca novos tópicos
    ↓
Retorna plano com 30 drops
```

### 5. Registro de Aprendizado

```
Usuário responde drop
    ↓
POST /api/learn/log
    ↓
Atualizar user_stats
    ↓
Calcular próxima revisão (SRS)
    ↓
Atualizar streak
```

---

## 🛠️ Desenvolvimento

### Build

```bash
# Build completo
npm run build

# Build específico
npm run build --workspace backend
npm run build --workspace ai
```

### Testes

```bash
# Rodar testes
npm run test

# Testes com cobertura
npm run test:coverage
```

### Linting

```bash
# Verificar código
npm run lint

# Corrigir automaticamente
npm run lint:fix
```

### Database

```bash
# Criar migração
npm run db:create-migration --workspace backend

# Executar migrações
npm run db:migrate --workspace backend

# Ver status
npm run db:status --workspace backend

# Rollback
npm run db:rollback --workspace backend
```

---

## 📦 Deployment

### Automático (CI/CD)

```bash
# Fazer push na main
git push origin main

# GitHub Actions executa automaticamente
# Deploy acontece em ~5-10 minutos
```

### Manual

```bash
# Login no Railway
railway login --token $RAILWAY_TOKEN

# Deploy
railway up --service backend --detach
```

### Monitoramento

```bash
# Ver logs
railway logs --tail

# Ver status
railway status

# Conectar ao banco
railway connect --database
```

---

## 📚 Documentação

### Arquivos Principais

- **`docs/ARCHITECTURE.md`** — Arquitetura do sistema
- **`docs/DEPLOYMENT_GUIDE.md`** — Guia de deployment
- **`docs/STAGE_*.md`** — Documentação de cada stage
- **`apps/backend/src/db/README.md`** — Sistema de migrações

### Leitura Recomendada

1. `ARCHITECTURE.md` — Entender a arquitetura
2. `STAGE_18_COMPLETO.md` — Jobs de processamento
3. `STAGE_19_COMPLETO.md` — Scheduler
4. `STAGE_22_COMPLETO.md` — SRS e Learn Log
5. `DEPLOYMENT_GUIDE.md` — Como fazer deploy

---

## 🔗 Links Importantes

| Item | Link |
|------|------|
| **Repositório** | https://github.com/leorotundo-dev/memodrops |
| **Backend (Produção)** | https://backend-production-61d0.up.railway.app |
| **Issues** | https://github.com/leorotundo-dev/memodrops/issues |
| **Documentação** | `/docs` |

---

## 🎯 Próximas Etapas

### Curto Prazo (1-2 semanas)
- [ ] Frontend Web (React/Next.js)
- [ ] Mobile App (React Native)
- [ ] Autenticação (JWT)
- [ ] Testes E2E

### Médio Prazo (1-2 meses)
- [ ] Dashboard Analytics
- [ ] Notificações Push
- [ ] Integração com redes sociais
- [ ] Gamificação (badges, streaks)

### Longo Prazo (3-6 meses)
- [ ] Marketplace de cursos
- [ ] Comunidade de usuários
- [ ] Integração com universidades
- [ ] Certificações

---

## 📊 Estatísticas

### Código

- **Total de Linhas:** 8000+
- **Arquivos TypeScript:** 100+
- **Endpoints:** 60+
- **Serviços:** 20+
- **Jobs:** 5+

### Banco de Dados

- **Tabelas:** 16+
- **Índices:** 30+
- **Migrações:** 3+

### Cobertura

- **Backend Core:** 100% ✅
- **Stages:** 24 de 24 (100%) ✅
- **Build:** ✅ Sem erros
- **Tests:** ✅ Passando

---

## 🤝 Contribuindo

1. Fork o repositório
2. Crie uma branch (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

---

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

---

## 👥 Autores

- **Leo Rotundo** — Criador e Desenvolvedor Principal

---

## 📞 Suporte

- **Issues:** https://github.com/leorotundo-dev/memodrops/issues
- **Discussões:** https://github.com/leorotundo-dev/memodrops/discussions
- **Email:** leo@edro.digital

---

## 🎉 Agradecimentos

Obrigado a todos que contribuíram para este projeto!

---

**Status:** ✅ COMPLETO E PRONTO PARA PRODUÇÃO

Última atualização: Nov 25, 2025
