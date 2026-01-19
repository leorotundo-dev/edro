#!/bin/bash

echo "🚀 Deploy da Correção para Railway"
echo ""
echo "Este script vai:"
echo "1. Commitar as mudanças locais"
echo "2. Fazer push para o repositório"
echo "3. Instruções para Railway"
echo ""

# Verificar se tem mudanças
if [[ -z $(git status -s) ]]; then
  echo "✅ Sem mudanças para commitar"
else
  echo "📝 Commitando mudanças..."
  git add .
  git commit -m "fix: adiciona migração 0013 para resolver scheduled_for + corrige 0011"
fi

echo ""
echo "🔄 Fazendo push..."
git push origin main

echo ""
echo "✅ Push concluído!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 PRÓXIMOS PASSOS NO RAILWAY:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. Acessar: https://railway.app"
echo "2. Ir no projeto MemoDrops"
echo "3. Clicar no serviço 'backend'"
echo "4. Verificar se o deploy automático iniciou"
echo "5. Se não iniciou, clicar em 'Deploy' manualmente"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 VERIFICAR LOGS:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Procure por:"
echo "  ✅ '🔄 Executando migração 0013_fix_jobs_scheduled_for.sql...'"
echo "  ✅ '✅ Migração 0013_fix_jobs_scheduled_for.sql aplicada com sucesso!'"
echo "  ✅ '🚀 MemoDrops backend rodando na porta 3333'"
echo ""
echo "Se ver erros de 'scheduled_for', execute o SQL manual:"
echo "  → Veja: MANUAL_SQL_FIX_RAILWAY.sql"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
