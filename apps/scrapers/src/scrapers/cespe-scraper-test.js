const BaseScraper = require('./base-scraper');
const cheerio = require('cheerio');
const { fetchHtml, sleep } = require('../utils/helpers');

/**
 * Scraper para CESPE/CEBRASPE
 * Site oficial: https://www.cebraspe.org.br/concursos/
 */
class CESPEScraper extends BaseScraper {
  constructor() {
    super('CESPE/CEBRASPE', 'https://www.cebraspe.org.br');
  }

  async scrape() {
    console.log(`\n🔍 [${this.name}] Iniciando coleta de concursos...\n`);
    
    try {
      // Buscar página de concursos
      const html = await fetchHtml(`${this.baseUrl}/concursos/`);
      const $ = cheerio.load(html);
      
      const concursos = [];
      
      // Encontrar links de concursos
      $('a[href*="concurso"]').each((i, el) => {
        const href = $(el).attr('href');
        const text = $(el).text().trim();
        
        if (href && text) {
          const fullUrl = href.startsWith('http') ? href : `${this.baseUrl}${href}`;
          concursos.push({
            url: fullUrl,
            title: text
          });
        }
      });

      console.log(`✅ Encontrados ${concursos.length} links de concursos`);
      
      // Processar os primeiros 5 concursos
      const limit = Math.min(5, concursos.length);
      console.log(`📋 Processando ${limit} concursos...\n`);
      
      for (let i = 0; i < limit; i++) {
        const concurso = concursos[i];
        console.log(`[${i + 1}/${limit}] Processando: ${concurso.title}`);
        console.log(`   URL: ${concurso.url}`);
        
        try {
          const concursoHtml = await fetchHtml(concurso.url);
          const $c = cheerio.load(concursoHtml);
          
          // Procurar link do edital
          let editalUrl = null;
          $c('a').each((_, link) => {
            const linkText = $c(link).text().toLowerCase();
            const linkHref = $c(link).attr('href');
            
            if (linkHref && (
              linkText.includes('edital') || 
              linkText.includes('íntegra') ||
              linkText.includes('pdf') ||
              linkHref.toLowerCase().includes('edital')
            )) {
              editalUrl = linkHref.startsWith('http') ? linkHref : `${this.baseUrl}${linkHref}`;
              return false; // break
            }
          });

          if (editalUrl) {
            console.log(`   ✅ Edital encontrado: ${editalUrl}`);
            await this.saveEdital(editalUrl, 'CESPE/CEBRASPE', concurso.title);
          } else {
            console.log(`   ⚠️  Edital não encontrado`);
          }
          
          // Aguardar para não sobrecarregar o servidor
          await sleep(2000);
          
        } catch (error) {
          console.error(`   ❌ Erro: ${error.message}`);
          this.stats.errors++;
        }
        
        console.log('');
      }
      
      console.log(`\n📊 Resumo da coleta:`);
      console.log(`   Total de links encontrados: ${concursos.length}`);
      console.log(`   Links processados: ${limit}`);
      console.log(`   Sucessos: ${this.stats.successes}`);
      console.log(`   Erros: ${this.stats.errors}`);
      
    } catch (error) {
      console.error(`\n❌ [${this.name}] Erro fatal: ${error.message}`);
      this.stats.errors++;
    }
  }

  async saveEdital(url, source, title) {
    try {
      // Aqui você pode salvar no banco de dados
      // Por enquanto, apenas incrementamos o contador de sucessos
      this.stats.successes++;
      
      // Log para demonstração
      console.log(`   💾 Salvo no sistema:`);
      console.log(`      Fonte: ${source}`);
      console.log(`      Título: ${title}`);
      console.log(`      URL: ${url}`);
      
      return true;
    } catch (error) {
      console.error(`   ❌ Erro ao salvar: ${error.message}`);
      this.stats.errors++;
      return false;
    }
  }
}

module.exports = CESPEScraper;
