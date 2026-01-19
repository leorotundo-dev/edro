const BaseScraper = require('./base-scraper');
const cheerio = require('cheerio');
const { fetchHtml, sleep } = require('../utils/helpers');

/**
 * Scraper para CEBRASPE (antigo CESPE)
 * Site oficial: https://www.cebraspe.org.br
 */
class CEBRASPEScraper extends BaseScraper {
  constructor() {
    super('CEBRASPE', 'https://www.cebraspe.org.br');
  }

  async scrape() {
    console.log(`\n🔍 [${this.name}] Iniciando coleta de concursos CEBRASPE/CESPE...\n`);
    
    try {
      // Página de concursos em andamento
      const html = await fetchHtml(`${this.baseUrl}/concursos/em_andamento`);
      const $ = cheerio.load(html);
      
      const concursos = [];
      
      // CEBRASPE usa estrutura específica
      $('.concurso-em-andamento, .item-concurso, .box-concurso').each((i, el) => {
        const $el = $(el);
        const link = $el.find('a').first();
        const href = link.attr('href');
        const titulo = link.text().trim() || 
                      $el.find('.titulo, .nome-concurso, h3').first().text().trim();
        
        if (href && titulo) {
          concursos.push({
            url: href.startsWith('http') ? href : `${this.baseUrl}${href}`,
            titulo: titulo
          });
        }
      });

      // Seletores alternativos
      if (concursos.length === 0) {
        $('a[href*="concurso"]').each((i, el) => {
          const $el = $(el);
          const href = $el.attr('href');
          const titulo = $el.text().trim();
          
          if (href && titulo && titulo.length > 15) {
            concursos.push({
              url: href.startsWith('http') ? href : `${this.baseUrl}${href}`,
              titulo: titulo
            });
          }
        });
      }

      console.log(`✅ Encontrados ${concursos.length} concursos CEBRASPE`);
      
      const configuredLimit = parseInt(process.env.SCRAPER_LIMIT || '10', 10);
      const limit = Math.min(Number.isFinite(configuredLimit) ? configuredLimit : 10, concursos.length);
      console.log(`📋 Processando ${limit} concursos...\n`);
      
      for (let i = 0; i < limit; i++) {
        const concurso = concursos[i];
        console.log(`[${i + 1}/${limit}] ${concurso.titulo}`);
        
        try {
          const concursoHtml = await fetchHtml(concurso.url);
          const $c = cheerio.load(concursoHtml);
          
          // Extrair informações (CEBRASPE tem estrutura bem definida)
          const orgao = $c('.orgao, .instituicao, h1.titulo-orgao').first().text().trim();
          const cargo = $c('.cargo, .nome-cargo').first().text().trim();
          const vagas = this.extractNumber($c('.vagas, .total-vagas').text());
          const inscricoes = $c('.periodo-inscricao, .inscricoes').first().text().trim();
          const provas = $c('.data-prova, .data-provas').first().text().trim();
          const localidade = $c('.localidade, .cidade').first().text().trim();
          
          // Buscar edital (CEBRASPE geralmente tem link "Acesse o Edital")
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
              linkText.includes('íntegra') ||
              linkText.includes('acesse') ||
              linkHref.toLowerCase().includes('edital') ||
              linkHref.toLowerCase().endsWith('.pdf')
            )) {
              editalUrl = linkHref.startsWith('http') ? linkHref : `${this.baseUrl}${linkHref}`;
              return false;
            }
          });

          if (editalUrl) {
            console.log(`   ✅ Edital: ${editalUrl}`);
            await this.saveEdital({
              fonte: 'CEBRASPE',
              titulo: concurso.titulo,
              url: editalUrl,
              noticia_url: concurso.url,
              edital_url: editalUrl,
              pdf_links: pdfLinks,
              provas_links: provasLinks,
              orgao: orgao || 'Não informado',
              cargo: cargo || 'Diversos',
              vagas: vagas || 0,
              inscricoes: inscricoes || 'Nao informado',
              provas: provasLinks[0]?.url || provas || 'Nao informado',
              localidade: localidade || 'Nacional',
              site_fonte: 'CEBRASPE'
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
    console.log(`\n📊 Resumo da coleta CEBRASPE:`);
    console.log(`   Links encontrados: ${total}`);
    console.log(`   Processados: ${processados}`);
    console.log(`   Sucessos: ${this.stats.successes}`);
    console.log(`   Erros: ${this.stats.errors}`);
  }
}

module.exports = CEBRASPEScraper;
