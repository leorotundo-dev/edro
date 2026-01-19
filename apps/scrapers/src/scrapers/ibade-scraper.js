const BaseScraper = require('./base-scraper');
const cheerio = require('cheerio');
const { fetchHtml, sleep, isPdfUrl } = require('../utils/helpers');

const resolveUrl = (baseUrl, href) => {
  if (!href) return null;
  if (href.startsWith('http')) return href;
  if (href.startsWith('//')) return `https:${href}`;
  return `${baseUrl}${href}`;
};

class IbadeScraper extends BaseScraper {
  constructor() {
    super('IBADE', 'https://portal.ibade.selecao.site');
  }

  async scrape() {
    console.log(`\n[${this.name}] Starting edital list...\n`);

    try {
      const listUrl = `${this.baseUrl}/edital`;
      const html = await fetchHtml(listUrl);
      const $ = cheerio.load(html);
      const concursos = new Map();

      $('a[href*="/edital/ver/"]').each((_, el) => {
        const href = $(el).attr('href');
        if (!href) return;
        const url = resolveUrl(this.baseUrl, href);
        if (!url) return;
        const titulo = $(el).text().trim();
        concursos.set(url, { url, titulo: titulo || url });
      });

      const items = Array.from(concursos.values());
      console.log(`[${this.name}] Found ${items.length} editais`);

      const configuredLimit = parseInt(
        process.env.IBADE_LIMIT || process.env.SCRAPER_LIMIT || '10',
        10
      );
      const limit = Math.min(Number.isFinite(configuredLimit) ? configuredLimit : 10, items.length);
      console.log(`[${this.name}] Processing ${limit} editais...\n`);

      for (let i = 0; i < limit; i++) {
        const concurso = items[i];
        console.log(`[${i + 1}/${limit}] ${concurso.titulo}`);

        try {
          const detailHtml = await fetchHtml(concurso.url);
          const $c = cheerio.load(detailHtml);
          const titulo = $c('h1, h2').first().text().trim() || concurso.titulo;
          const pdfLinks = [];

          $c('a').each((_, link) => {
            const href = $c(link).attr('href');
            if (!href) return;
            const url = resolveUrl(this.baseUrl, href);
            if (!url) return;
            if (!isPdfUrl(url)) return;
            const label = ($c(link).text() || '').trim().toLowerCase();
            if (!pdfLinks.find((item) => item.url === url)) {
              pdfLinks.push({ url, label: label || 'pdf', source: 'page' });
            }
          });

          const editalLink = pdfLinks.find((item) => item.label.includes('edital'));
          const editalUrl = editalLink?.url || pdfLinks[0]?.url;

          if (!editalUrl) {
            console.log(`  [${this.name}] No edital PDF found`);
            continue;
          }

          await this.saveEdital({
            fonte: 'IBADE',
            titulo,
            url: editalUrl,
            noticia_url: concurso.url,
            edital_url: editalUrl,
            pdf_links: pdfLinks,
            site_fonte: 'IBADE',
          });

          await sleep(2000);
        } catch (error) {
          console.error(`  [${this.name}] Error: ${error.message}`);
          this.stats.errors++;
        }

        console.log('');
      }

      this.logStats(items.length, limit);
    } catch (error) {
      console.error(`\n[${this.name}] Fatal error: ${error.message}`);
      this.stats.errors++;
    }
  }

  logStats(total, processed) {
    console.log(`\n[${this.name}] Summary:`);
    console.log(`  Links found: ${total}`);
    console.log(`  Processed: ${processed}`);
    console.log(`  Success: ${this.stats.successes}`);
    console.log(`  Errors: ${this.stats.errors}`);
  }
}

module.exports = IbadeScraper;
