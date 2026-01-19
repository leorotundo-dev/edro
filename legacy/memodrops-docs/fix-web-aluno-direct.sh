#!/bin/bash

echo "🔧 Corrigindo DATABASE_URL do web-aluno..."

# Database URL correta
DB_URL="postgresql://postgres:tmSerwBuJUhmPmaesmLavawlXJxAZlfO@shinkansen.proxy.rlwy.net:31908/railway"

# IDs do projeto
PROJECT_ID="7d5e064d-822b-4500-af2a-fde22f961c23"
ENV_ID="a61d21de-60c4-42cc-83bc-28506ff83620"
SERVICE_ID="44d4d21b-0a6f-4b4c-89c1-9d25350a4f18"

echo "📝 Configurando variável DATABASE_URL..."

# Usar Railway CLI para setar a variável
railway variables set DATABASE_URL="$DB_URL" \
  --project "$PROJECT_ID" \
  --environment "$ENV_ID" \
  --service "$SERVICE_ID"

if [ $? -eq 0 ]; then
    echo "✅ DATABASE_URL configurada com sucesso!"
    echo "🚀 Fazendo redeploy do web-aluno..."
    railway up --service "$SERVICE_ID"
    echo "✅ Deploy iniciado!"
else
    echo "❌ Erro ao configurar. Use o método manual."
fi