const BaseScraper = require('./base-scraper');
const cheerio = require('cheerio');
const { fetchHtml, sleep } = require('../utils/helpers');

/**
 * Scraper para FCC - Fundação Carlos Chagas
 * Site oficial: https://www.concursosfcc.com.br
 */
class FCCScraper extends BaseScraper {
  constructor() {
    super('FCC', 'https://www.concursosfcc.com.br');
  }

  async scrape() {
    console.log(`\n🔍 [${this.name}] Iniciando coleta de concursos da FCC...\n`);
    
    try {
      // Página de concursos abertos
      const html = await fetchHtml(`${this.baseUrl}/concursos/em-andamento/`);
      const $ = cheerio.load(html);
      
      const concursos = [];
      
      // FCC usa divs com classe específica para concursos
      $('.listaConcursos .itemConcurso, .concurso-item, .lista-concursos li').each((i, el) => {
        const $el = $(el);
        const link = $el.find('a').first();
        const href = link.attr('href');
        const titulo = link.text().trim() || $el.find('.titulo, h3, h4').first().text().trim();
        
        if (href && titulo) {
          concursos.push({
            url: href.startsWith('http') ? href : `${this.baseUrl}${href}`,
            titulo: titulo
          });
        }
      });

      console.log(`✅ Encontrados ${concursos.length} concursos da FCC`);
      
      // Processar primeiros 10 concursos
      const configuredLimit = parseInt(process.env.SCRAPER_LIMIT || '10', 10);
      const limit = Math.min(Number.isFinite(configuredLimit) ? configuredLimit : 10, concursos.length);
      console.log(`📋 Processando ${limit} concursos...\n`);
      
      for (let i = 0; i < limit; i++) {
        const concurso = concursos[i];
        console.log(`[${i + 1}/${limit}] ${concurso.titulo}`);
        
        try {
          const concursoHtml = await fetchHtml(concurso.url);
          const $c = cheerio.load(concursoHtml);
          
          // Extrair informações
          const orgao = $c('.orgao, .instituicao, h1').first().text().trim();
          const vagas = this.extractNumber($c('.vagas, .numeroVagas').text());
          const inscricoes = $c('.inscricoes, .periodo-inscricao').text().trim();
          
          // Procurar edital
          const pdfLinks = [];
          const provasLinks = [];
          let editalUrl = null;
          $c('a').each((_, link) => {
            const linkText = $c(link).text().toLowerCase();
            const linkHref = $c(link).attr('href');
            
            if (linkHref && /\.pdf(\?|$)/i.test(linkHref)) {
              const url = linkHref.startsWith('http') ? linkHref : `${this.baseUrl}${linkHref}`;
              if (!pdfLinks.find((item) => item.url === url)) {
                pdfLinks.push({ url, label: linkText || 'pdf', source: 'page' });
              }
              if (linkText.includes('prova') && !provasLinks.find((item) => item.url === url)) {
                provasLinks.push({ url, label: linkText || 'prova' });
              }
            }
            if (linkHref && (
              linkText.includes('edital') || 
              linkText.includes('download') ||
              linkHref.toLowerCase().includes('edital') ||
              linkHref.toLowerCase().includes('.pdf')
            )) {
              editalUrl = linkHref.startsWith('http') ? linkHref : `${this.baseUrl}${linkHref}`;
              return false;
            }
          });

          if (editalUrl) {
            console.log(`   ✅ Edital: ${editalUrl}`);
            await this.saveEdital({
              fonte: 'FCC',
              titulo: concurso.titulo,
              url: editalUrl,
              noticia_url: concurso.url,
              edital_url: editalUrl,
              pdf_links: pdfLinks,
              provas_links: provasLinks,
              orgao: orgao || 'Não informado',
              vagas: vagas || 0,
              inscricoes: inscricoes || 'Não informado',
              provas: provasLinks[0]?.url || undefined,

              site_fonte: 'FCC'
            });
          } else {
            console.log(`   ⚠️  Edital não encontrado`);
          }
          
          await sleep(2000);
          
        } catch (error) {
          console.error(`   ❌ Erro: ${error.message}`);
          this.stats.errors++;
        }
        
        console.log('');
      }
      
      this.logStats(concursos.length, limit);
      
    } catch (error) {
      console.error(`\n❌ [${this.name}] Erro fatal: ${error.message}`);
      this.stats.errors++;
    }
  }

  extractNumber(text) {
    const match = text.match(/\d+/);
    return match ? parseInt(match[0]) : null;
  }

  logStats(total, processados) {
    console.log(`\n📊 Resumo da coleta FCC:`);
    console.log(`   Links encontrados: ${total}`);
    console.log(`   Processados: ${processados}`);
    console.log(`   Sucessos: ${this.stats.successes}`);
    console.log(`   Erros: ${this.stats.errors}`);
  }
}

module.exports = FCCScraper;
