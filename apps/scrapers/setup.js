const fs = require('fs');
const path = require('path');

console.log('🚀 Gerando sistema completo de scrapers...\n');

const files = {
  'src/utils/helpers.js': `const axios = require('axios');
const cheerio = require('cheerio');
const pdfParse = require('pdf-parse');

async function fetchHtml(url) {
  const response = await axios.get(url, {
    timeout: 30000,
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });
  return response.data;
}

function extractTextFromHtml(html) {
  const $ = cheerio.load(html);
  $('script, style, nav, header, footer').remove();
  return $('body').text().replace(/\\s+/g, ' ').trim();
}

async function fetchPdf(url) {
  const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 60000 });
  const data = await pdfParse(response.data);
  return data.text;
}

function isPdfUrl(url) {
  return url.toLowerCase().endsWith('.pdf');
}

function sanitizeText(text) {
  return text.replace(/[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F\\x7F]/g, '').trim();
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { fetchHtml, extractTextFromHtml, fetchPdf, isPdfUrl, sanitizeText, sleep };`,

  'src/scrapers/base-scraper.js': `const { insertHarvestItem, harvestItemExists } = require('../db');
const { fetchHtml, fetchPdf, isPdfUrl, sanitizeText, sleep } = require('../utils/helpers');

class BaseScraper {
  constructor(name, baseUrl) {
    this.name = name;
    this.baseUrl = baseUrl;
    this.stats = { total: 0, new: 0, existing: 0, errors: 0 };
  }

  async scrape() {
    throw new Error('Método scrape() deve ser implementado');
  }

  async saveEdital(url, source = null) {
    try {
      this.stats.total++;
      
      if (await harvestItemExists(url)) {
        console.log(\`[\${this.name}] ⏭️  Já existe: \${url}\`);
        this.stats.existing++;
        return null;
      }

      console.log(\`[\${this.name}] 📥 Baixando: \${url}\`);
      
      let content = isPdfUrl(url) ? await fetchPdf(url) : await fetchHtml(url);
      content = sanitizeText(content);
      
      if (!content || content.length < 500) {
        console.log(\`[\${this.name}] ⚠️  Conteúdo muito curto\`);
        this.stats.errors++;
        return null;
      }

      const id = await insertHarvestItem(source || this.name, url, content);
      console.log(\`[\${this.name}] ✅ Salvo com ID \${id}\`);
      this.stats.new++;
      return id;
    } catch (error) {
      console.error(\`[\${this.name}] ❌ Erro: \${error.message}\`);
      this.stats.errors++;
      return null;
    }
  }

  printStats() {
    console.log(\`\\n[\${this.name}] 📊 Estatísticas:\`);
    console.log(\`  Novos: \${this.stats.new}\`);
    console.log(\`  Existentes: \${this.stats.existing}\`);
    console.log(\`  Erros: \${this.stats.errors}\`);
  }

  async run() {
    console.log(\`\\n[\${this.name}] 🚀 Iniciando...\`);
    await this.scrape();
    this.printStats();
    return this.stats;
  }
}

module.exports = BaseScraper;`,

  'src/scrapers/pci-concursos.js': `const BaseScraper = require('./base-scraper');
const cheerio = require('cheerio');
const { fetchHtml, sleep } = require('../utils/helpers');

class PCIConcursosScraper extends BaseScraper {
  constructor() {
    super('PCI Concursos', 'https://www.pciconcursos.com.br');
  }

  async scrape() {
    const html = await fetchHtml(\`\${this.baseUrl}/concursos/\`);
    const $ = cheerio.load(html);
    const concursos = [];
    
    $('.ca a').each((i, el) => {
      const href = $(el).attr('href');
      if (href && href.includes('/concurso/')) {
        concursos.push(href.startsWith('http') ? href : \`\${this.baseUrl}\${href}\`);
      }
    });

    console.log(\`[\${this.name}] Encontrados \${concursos.length} concursos\`);

    for (let i = 0; i < Math.min(concursos.length, 10); i++) {
      try {
        const concursoHtml = await fetchHtml(concursos[i]);
        const $c = cheerio.load(concursoHtml);
        
        let editalUrl = null;
        $c('a').each((_, link) => {
          const text = $c(link).text().toLowerCase();
          const href = $c(link).attr('href');
          if ((text.includes('edital') || text.includes('íntegra')) && href) {
            editalUrl = href.startsWith('http') ? href : \`\${this.baseUrl}\${href}\`;
            return false;
          }
        });

        if (editalUrl) {
          const pageText = $c('body').text();
          let source = 'PCI Concursos';
          const bancas = ['CESPE', 'CEBRASPE', 'FCC', 'VUNESP', 'FGV'];
          for (const banca of bancas) {
            if (pageText.toUpperCase().includes(banca)) {
              source = banca;
              break;
            }
          }
          await this.saveEdital(editalUrl, source);
        }
        
        await sleep(2000);
      } catch (error) {
        console.error(\`[\${this.name}] Erro: \${error.message}\`);
        this.stats.errors++;
      }
    }
  }
}

module.exports = PCIConcursosScraper;`,

  'src/scrapers/run.js': `require('dotenv').config();
const PCIConcursosScraper = require('./pci-concursos');
const { pool } = require('../db');

async function runAllScrapers() {
  console.log('🚀 Edro Scrapers');
  console.log('='.repeat(60));
  
  const scrapers = [new PCIConcursosScraper()];
  const results = [];

  for (const scraper of scrapers) {
    try {
      const stats = await scraper.run();
      results.push({ scraper: scraper.name, stats });
    } catch (error) {
      console.error(\`❌ Erro: \${error.message}\`);
      results.push({ scraper: scraper.name, error: error.message });
    }
  }

  console.log('\\n' + '='.repeat(60));
  console.log('📊 RESUMO FINAL');
  console.log('='.repeat(60));
  
  let totalNew = 0;
  results.forEach(r => {
    if (r.stats) {
      console.log(\`\\n\${r.scraper}: ✅ \${r.stats.new} novos\`);
      totalNew += r.stats.new;
    }
  });

  console.log(\`\\n🎯 TOTAL: \${totalNew} novos editais\`);
  await pool.end();
  return results;
}

if (require.main === module) {
  runAllScrapers().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { runAllScrapers };`
};

// Criar arquivos
for (const [file, content] of Object.entries(files)) {
  const dir = path.dirname(file);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(file, content, 'utf8');
  console.log('✅ ' + file);
}

console.log('\n🎉 Sistema de scrapers criado com sucesso!');
console.log('\n📝 Próximo passo: npm run scrape');