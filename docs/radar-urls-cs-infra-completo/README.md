# 📡 Listas de URLs do Radar - Todos os Clientes CS Infra

Listas completas de fontes de notícias para o Radar (Clipping) de **todos os clientes da CS Infra**.

---

## 📦 Conteúdo

Este pacote contém **7 listas completas** de URLs para os seguintes clientes:

| Cliente | Arquivo | Fontes | Keywords | Categorias |
|---------|---------|--------|----------|------------|
| **CS Mobi Leste SP** | `radar-urls-cs-mobi.json` | 31 | 22 | 6 |
| **CS Mobi Cuiabá** | `radar-urls-cs-mobi-cuiaba.json` | 32 | 25 | 6 |
| **CS Grãos do Piauí** | `radar-urls-cs-graos-piaui.json` | 18 | 20 | 6 |
| **CS Porto Aratu** | `radar-urls-cs-porto-aratu.json` | 22 | 20 | 6 |
| **BRT Sorocaba** | `radar-urls-brt-sorocaba.json` | 35 | 25 | 6 |
| **CS Rodovias MT** | `radar-urls-cs-rodovias-mt.json` | 31 | 25 | 6 |
| **Ponte São Borja–Santo Tomé** | `radar-urls-ponte-sao-borja.json` | 31 | 19 | 6 |

**Total:** **200 fontes** únicas de notícias para monitoramento!

---

## 🎯 Clientes por Vertical

### 🚌 Mobilidade Urbana (CS Mobi)
1. **CS Mobi Leste SP** - 12 terminais de ônibus da Zona Leste de São Paulo
2. **CS Mobi Cuiabá** - Mobilidade urbana em Cuiabá/MT
3. **BRT Sorocaba** - Sistema BRT em Sorocaba/SP (+30 mil passageiros/dia)

### 🛣️ Rodovias (CS Rodovias)
4. **CS Grãos do Piauí** - Concessão de rodovia no Piauí
5. **CS Rodovias MT** - Concessão de rodovia em Mato Grosso
6. **Ponte São Borja–Santo Tomé** - Ponte internacional Brasil-Argentina

### 🚢 Portos (CS Portos)
7. **CS Porto Aratu** - Terminal portuário na Bahia (Terminais 12 e 18)

---

## 📊 Estatísticas Gerais

### Por Tipo de Fonte
- **RSS (automático):** ~160 fontes (80%)
- **Scrape (manual):** ~30 fontes (15%)
- **Social (API):** ~10 fontes (5%)

### Por Prioridade
- **Alta:** ~100 fontes (50%)
- **Média:** ~80 fontes (40%)
- **Baixa:** ~20 fontes (10%)

### Por Categoria (Comum a Todos)
1. **Fontes Nacionais** - Veículos de grande circulação
2. **Fontes Locais/Regionais** - Mídia local da área de atuação
3. **Governamentais/Oficiais** - Órgãos públicos e reguladores
4. **Mídia Especializada** - Portais especializados no setor
5. **Marketing/Comunicação** - Meio & Mensagem, Propmark, etc.
6. **Redes Sociais** - Instagram, Facebook, YouTube

---

## 🚀 Como Usar

### Opção 1: Importação Individual

Importar um cliente por vez:

```bash
ts-node import-radar-urls.ts radar-urls-cs-mobi-cuiaba.json
```

### Opção 2: Importação em Lote

Criar script para importar todos de uma vez:

```bash
#!/bin/bash
for file in radar-urls-*.json; do
  echo "Importando $file..."
  ts-node import-radar-urls.ts "$file"
  sleep 2
done
```

### Opção 3: Via API

Usar o endpoint do Radar para cada arquivo:

```bash
curl -X POST http://localhost:3334/api/clipping/sources/import \
  -H "Content-Type: application/json" \
  -d @radar-urls-cs-mobi-cuiaba.json
```

---

## 📋 Estrutura do JSON

Todos os arquivos seguem o mesmo formato:

```json
{
  "client": "Nome do Cliente",
  "client_id": "id-do-cliente",
  "description": "Descrição",
  "categories": [
    {
      "name": "Categoria",
      "sources": [
        {
          "name": "Nome da Fonte",
          "url": "https://exemplo.com",
          "rss": "https://exemplo.com/feed/",
          "type": "rss",
          "frequency": "daily",
          "tags": ["tag1", "tag2"],
          "priority": "high"
        }
      ]
    }
  ],
  "keywords": ["palavra1", "palavra2"],
  "total_sources": 31,
  "last_updated": "2026-01-26"
}
```

---

## 🎯 Fontes Comuns a Múltiplos Clientes

Algumas fontes aparecem em múltiplas listas (com adaptações):

### Nacionais
- Folha de S.Paulo
- Estadão
- G1
- CNN Brasil
- UOL

### Especializadas
- Diário do Transporte (Mobilidade)
- Mobilize Brasil (Mobilidade)
- Portos e Navios (Portos)
- Portal do Agronegócio (Rodovias rurais)

### Marketing
- Meio & Mensagem
- Propmark
- Mundo do Marketing

---

## 📈 Métricas Esperadas por Cliente

### CS Mobi Leste SP (31 fontes)
- **Itens/dia:** 50-100
- **Relevantes/dia:** 10-20
- **Oportunidades/semana:** 5-10

### CS Mobi Cuiabá (32 fontes)
- **Itens/dia:** 40-80
- **Relevantes/dia:** 8-15
- **Oportunidades/semana:** 4-8

### BRT Sorocaba (35 fontes)
- **Itens/dia:** 50-100
- **Relevantes/dia:** 10-20
- **Oportunidades/semana:** 5-10

### CS Grãos do Piauí (18 fontes)
- **Itens/dia:** 20-40
- **Relevantes/dia:** 5-10
- **Oportunidades/semana:** 2-5

### CS Porto Aratu (22 fontes)
- **Itens/dia:** 30-60
- **Relevantes/dia:** 6-12
- **Oportunidades/semana:** 3-6

### CS Rodovias MT (31 fontes)
- **Itens/dia:** 40-80
- **Relevantes/dia:** 8-15
- **Oportunidades/semana:** 4-8

### Ponte São Borja (31 fontes)
- **Itens/dia:** 30-60
- **Relevantes/dia:** 6-12
- **Oportunidades/semana:** 3-6

---

## 🔄 Manutenção e Atualização

### Frequência de Atualização
- **Diária:** Fontes RSS de alta prioridade
- **Semanal:** Fontes governamentais e especializadas
- **Mensal:** Revisão geral das listas

### Adicionar Novas Fontes
1. Identificar nova fonte relevante
2. Adicionar ao JSON na categoria apropriada
3. Testar URL e RSS (se disponível)
4. Reimportar para o Radar

### Remover Fontes Inativas
1. Identificar fontes que não retornam conteúdo
2. Verificar se a URL mudou
3. Atualizar ou remover do JSON
4. Reimportar para o Radar

---

## 🛠️ Troubleshooting

### Erro: "Duplicate source"
- Fonte já existe no banco
- Verificar se é a mesma URL
- Usar `PUT` para atualizar ou ignorar

### Erro: "Invalid RSS feed"
- Testar RSS manualmente: `curl https://exemplo.com/feed/`
- Alguns sites mudaram de RSS para JSON Feed
- Atualizar URL ou mudar type para "scrape"

### Erro: "Client not found"
- Criar cliente no banco de dados primeiro
- Verificar `client_id` no JSON

---

## 📚 Documentação Adicional

- **Radar Completo:** `/edro-radar-completo/docs/`
- **Import Script:** `/import-radar-urls.ts`
- **API Reference:** Endpoints do Radar

---

## 🎯 Próximos Passos

### Imediato
1. ✅ Listas criadas
2. ⏳ Importar para o Radar
3. ⏳ Testar ingestão
4. ⏳ Configurar cron jobs

### Curto Prazo (1-2 semanas)
- Validar qualidade das fontes
- Ajustar keywords baseado em resultados
- Adicionar fontes específicas por cliente

### Médio Prazo (1-3 meses)
- Implementar scoring automático
- Criar dashboards por cliente
- Integrar com Board e Creative Studio

---

**Desenvolvido com ❤️ para o Edro Studio e CS Infra**

*Última atualização: 26 de janeiro de 2026*
