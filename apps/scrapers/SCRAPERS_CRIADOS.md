# 🤖 Scrapers Criados para Edro

## ✅ Scrapers Implementados

### 1. **CEBRASPE/CESPE** (`cebraspe-scraper.js`)
- **Site**: https://www.cebraspe.org.br
- **Especialidade**: Concursos federais de alto nível
- **Características**:
  - Polícia Federal, INSS, Banco Central
  - Provas objetivas e discursivas
  - Alta dificuldade
  - Estrutura HTML bem definida
- **Dados Coletados**:
  - Órgão, Cargo, Vagas
  - Período de inscrições
  - Datas das provas
  - Localidade
  - Link do edital (PDF)

### 2. **FCC** (`fcc-scraper.js`)
- **Site**: https://www.concursosfcc.com.br
- **Especialidade**: Tribunais e órgãos estaduais
- **Características**:
  - TRF, TRT, TJ-SP
  - Provas tradicionais
  - Muito usada em São Paulo
- **Dados Coletados**:
  - Órgão, Título, Vagas
  - Período de inscrições
  - Link do edital

### 3. **FGV** (`fgv-scraper.js`)
- **Site**: https://conhecimento.fgv.br/concursos
- **Especialidade**: Concursos de elite
- **Características**:
  - TCE, MPU, Detran
  - Questões elaboradas
  - Requer raciocínio
- **Dados Coletados**:
  - Órgão, Cargo, Vagas
  - Salário/Remuneração
  - Período de inscrições
  - Link do edital

### 4. **VUNESP** (`vunesp-scraper.js`)
- **Site**: https://www.vunesp.com.br
- **Especialidade**: Concursos paulistas
- **Características**:
  - TJ-SP, PM-SP, Prefeituras
  - Grande volume de vagas
  - Focada em SP
- **Dados Coletados**:
  - Órgão, Cargo, Vagas
  - Escolaridade requerida
  - Período de inscrições
  - Link do edital

### 5. **PCI Concursos** (`pci-concursos.js`)
- **Site**: https://www.pciconcursos.com.br
- **Especialidade**: Agregador de concursos
- **Características**:
  - Lista concursos de todas as bancas
  - Útil para descobrir novos editais
  - Identifica a banca automaticamente

### 6. **Demo Scraper** (`demo-scraper.js`)
- **Tipo**: Simulação
- **Uso**: Testes e desenvolvimento
- **Características**:
  - Sempre funciona (dados mock)
  - 5 editais simulados
  - Perfeito para demos
  - Usa dados realistas

---

## 🏗️ Arquitetura dos Scrapers

### Base Scraper (`base-scraper.js`)
Classe pai com funcionalidades comuns:
- Estatísticas (sucessos/erros)
- Salvamento de dados
- Logging padronizado
- Tratamento de erros

### Estrutura de um Scraper
```javascript
class BancaScraper extends BaseScraper {
  constructor() {
    super('Nome da Banca', 'https://url-base.com');
  }

  async scrape() {
    // 1. Buscar página de concursos
    // 2. Extrair links dos concursos
    // 3. Para cada concurso:
    //    - Acessar página individual
    //    - Extrair informações
    //    - Buscar link do edital
    //    - Salvar dados
  }
}
```

---

## 📊 Dados Extraídos

### Informações Padrão
Todos os scrapers tentam extrair:
- ✅ **Fonte/Banca**: Nome da organizadora
- ✅ **Título**: Nome do concurso
- ✅ **URL**: Link do edital (PDF)
- ✅ **Órgão**: Instituição contratante
- ✅ **Cargo**: Função/cargo
- ✅ **Vagas**: Número de vagas
- ✅ **Inscrições**: Período de inscrição

### Informações Específicas
Algumas bancas fornecem dados extras:
- 💰 **Salário** (FGV)
- 📚 **Escolaridade** (VUNESP)
- 📅 **Data das provas** (CEBRASPE)
- 📍 **Localidade** (CEBRASPE)

---

## 🚀 Como Usar

### 1. Testar Scraper Individual
```bash
cd Edro.Digital/apps/scrapers
node testar-demo.js
```

### 2. Testar Todas as Bancas
```bash
node testar-todas-bancas.js
```

### 3. Executar via API
```javascript
const FCCScraper = require('./src/scrapers/fcc-scraper');

const scraper = new FCCScraper();
await scraper.scrape();

console.log('Sucessos:', scraper.stats.successes);
console.log('Erros:', scraper.stats.errors);
```

---

## ⚙️ Configuração

### Delay entre Requests
Para não sobrecarregar os sites:
```javascript
await sleep(2000); // 2 segundos entre cada request
```

### Limite de Concursos
Processar apenas os primeiros N:
```javascript
const limit = Math.min(10, concursos.length);
```

### Headers Customizados
Simular navegador real:
```javascript
const headers = {
  'User-Agent': 'Mozilla/5.0...',
  'Accept': 'text/html,application/xhtml+xml...'
};
```

---

## 🔧 Manutenção

### Quando um Scraper Para de Funcionar

#### 1. Site Mudou HTML
**Problema**: Estrutura HTML foi alterada  
**Solução**: Atualizar seletores CSS

```javascript
// Antes
$('.concurso-card')

// Depois (testar alternativas)
$('.concurso-card, .item-concurso, article.concurso')
```

#### 2. Site Bloqueando
**Problema**: Site detecta bot  
**Solução**: Adicionar headers, usar proxies

```javascript
const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)...',
  'Accept-Language': 'pt-BR,pt;q=0.9',
  'Referer': 'https://www.google.com/'
};
```

#### 3. Site Requer JavaScript
**Problema**: Conteúdo carregado via JS  
**Solução**: Usar Puppeteer/Playwright

```javascript
const puppeteer = require('puppeteer');
const browser = await puppeteer.launch();
const page = await browser.newPage();
await page.goto(url);
const html = await page.content();
```

#### 4. Captcha
**Problema**: Site exige validação humana  
**Solução**: 
- Usar serviços de resolução de captcha
- Executar manualmente uma vez
- Usar APIs oficiais (se disponível)

---

## 📈 Performance

### Execução Típica
- **Demo Scraper**: ~3 segundos (5 editais)
- **Scrapers Reais**: ~30-60 segundos (10 concursos)
- **Delay Total**: 2s * N concursos

### Otimizações
1. **Paralelização**: Rodar scrapers em paralelo
2. **Cache**: Guardar resultados por 24h
3. **Incremental**: Apenas novos editais
4. **Selective**: Priorizar bancas mais relevantes

---

## 🔄 Integração com Sistema

### 1. Salvar no Banco de Dados
```javascript
async saveEdital(edital) {
  await db.query(`
    INSERT INTO editais (fonte, titulo, url, orgao, cargo, vagas)
    VALUES ($1, $2, $3, $4, $5, $6)
  `, [edital.fonte, edital.titulo, edital.url, ...]);
}
```

### 2. Processar com IA
```javascript
// Após coletar edital
const pdfContent = await downloadPDF(editalUrl);
const blueprint = await extractWithGPT4(pdfContent);
await saveBlueprint(blueprint);
```

### 3. Notificar Usuários
```javascript
// Se novo edital na área do usuário
if (userInterests.includes(edital.cargo)) {
  await sendNotification(user, edital);
}
```

### 4. Agendar Execução
```javascript
// Cron job - rodar diariamente às 6h
schedule.scheduleJob('0 6 * * *', async () => {
  for (const Scraper of allScrapers) {
    await new Scraper().scrape();
  }
});
```

---

## 📋 Checklist de Novo Scraper

Ao criar scraper para nova banca:

- [ ] Identificar URL base
- [ ] Mapear página de concursos
- [ ] Identificar seletores CSS
- [ ] Testar extração de links
- [ ] Verificar estrutura da página individual
- [ ] Localizar link do edital
- [ ] Extrair informações relevantes
- [ ] Implementar tratamento de erros
- [ ] Adicionar logging
- [ ] Testar com 5-10 concursos
- [ ] Documentar peculiaridades
- [ ] Adicionar ao teste geral

---

## 🎯 Próximas Bancas a Adicionar

### Prioridade Alta
- [ ] **CESGRANRIO** - Petrobras, Banco do Brasil
- [ ] **IBFC** - Concursos variados
- [ ] **IADES** - Concursos DF
- [ ] **AOCP** - Concursos regionais

### Prioridade Média
- [ ] **IDECAN** - Diversos órgãos
- [ ] **QUADRIX** - Crescimento recente
- [ ] **INSTITUTO AOCP**
- [ ] **FADESP**

### Agregadores
- [ ] **ConcursosNoBrasil.com.br**
- [ ] **FolhaDirigida.com.br**
- [ ] **Concursos.com.br**

---

## 📱 Interface Admin

### Visualizar Scrapers
```
http://localhost:3000/admin/scrapers
```

### Funcionalidades
- ✅ Listar fontes configuradas
- ✅ Ativar/desativar scraper
- ✅ Executar manualmente
- ✅ Ver estatísticas
- ✅ Listar itens coletados
- ✅ Monitorar erros

---

## 🐛 Debug

### Logs Detalhados
```javascript
console.log(`[${this.name}] Processando: ${titulo}`);
console.log(`   URL: ${url}`);
console.log(`   ✅ Edital encontrado`);
```

### Testar Seletores
```javascript
// No browser console do site alvo
document.querySelectorAll('.concurso-card').length
$('.titulo').text()
```

### Salvar HTML para Análise
```javascript
const fs = require('fs');
fs.writeFileSync('debug.html', html);
```

---

## 📚 Recursos

### Bibliotecas Usadas
- **cheerio**: Parse HTML (jQuery-like)
- **axios**: HTTP requests
- **node-cron**: Agendamento
- **puppeteer**: Scraping com JavaScript (opcional)

### Documentação
- [Cheerio](https://cheerio.js.org/)
- [Web Scraping Best Practices](https://www.scraperapi.com/blog/web-scraping-best-practices/)
- [robots.txt](https://developers.google.com/search/docs/crawling-indexing/robots/intro)

---

**Criado em**: Janeiro 2025  
**Versão**: 1.0.0  
**Status**: ✅ Funcionando  
**Manutenção**: Revisar mensalmente
