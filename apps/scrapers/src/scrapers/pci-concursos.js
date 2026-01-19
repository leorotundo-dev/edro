const BaseScraper = require('./base-scraper');
const cheerio = require('cheerio');
const { fetchHtml, sleep, isPdfUrl } = require('../utils/helpers');

/**
 * Scraper para PCI Concursos
 * Site: https://www.pciconcursos.com.br
 */
class PCIConcursosScraper extends BaseScraper {
  constructor() {
    super('PCI Concursos', 'https://www.pciconcursos.com.br');
  }

  async scrape() {
    console.log(`\n?? [${this.name}] Iniciando coleta de concursos...\n`);

    try {
      const listPages = this.getListPages();
      const concursos = new Map();

      for (const listUrl of listPages) {
        try {
          const html = await fetchHtml(listUrl);
          const $ = cheerio.load(html);

          $('a[href*="/noticias/"]').each((_, el) => {
            const href = $(el).attr('href');
            const titulo = $(el).text().trim();
            const url = this.normalizeUrl(href);
            if (!url || !this.isNoticiaUrl(url)) return;
            concursos.set(url, { url, titulo });
          });

          $('[data-url]').each((_, el) => {
            const href = $(el).attr('data-url');
            const url = this.normalizeUrl(href);
            if (!url || !this.isNoticiaUrl(url)) return;
            const titulo = $(el).find('a').first().text().trim() || $(el).text().trim();
            concursos.set(url, { url, titulo });
          });
        } catch (error) {
          console.error(`   ? Erro ao ler lista ${listUrl}: ${error.message}`);
        }
      }

      const uniqueConcursos = Array.from(concursos.values());
      console.log(`? Encontrados ${uniqueConcursos.length} concursos no PCI`);

      const configuredLimit = parseInt(process.env.PCI_LIMIT || process.env.SCRAPER_LIMIT || '10', 10);
      const limit = Math.min(Number.isFinite(configuredLimit) ? configuredLimit : 10, uniqueConcursos.length);
      console.log(`?? Processando ${limit} concursos...\n`);

      for (let i = 0; i < limit; i++) {
        const concurso = uniqueConcursos[i];
        console.log(`[${i + 1}/${limit}] ${concurso.titulo || concurso.url}`);

        try {
          const concursoHtml = await fetchHtml(concurso.url);
          const $c = cheerio.load(concursoHtml);

          const titulo = this.extractTitulo($c) || concurso.titulo || concurso.url;
          if (this.isGenericTitle(titulo)) {
            console.log('   ?? Noticia generica, ignorando');
            continue;
          }

          const bodyText = this.normalizeWhitespace($c('body').text());
          const orgao = this.extractOrgao(titulo);
          const vagas = this.extractVagas(bodyText);
          const banca = this.extractBanca(bodyText);
          const links = this.extractLinks($c);
          const pdfLinks = this.mergePdfLinks(links);
          const editalUrl = links.editalPdf || this.pickBestPdf(pdfLinks.map((link) => link.url));

          if (!editalUrl) {
            console.log('   ?? Edital nao encontrado');
            continue;
          }

          console.log(`   ? Edital: ${editalUrl}`);
          if (links.provasLinks.length) {
            console.log(`   ? Provas: ${links.provasLinks.map((item) => item.url).join(', ')}`);
          }

          await this.saveEdital({
            fonte: 'PCI Concursos',
            titulo,
            url: editalUrl,
            orgao,
            vagas,
            banca,
            edital_url: editalUrl || undefined,
            pdf_links: pdfLinks,
            provas_links: links.provasLinks,
            provas: links.provasLinks[0]?.url || undefined,
            noticia_url: concurso.url,
            site_fonte: 'PCI Concursos',
          });

          await sleep(2000);
        } catch (error) {
          console.error(`   ? Erro: ${error.message}`);
          this.stats.errors++;
        }

        console.log('');
      }

      this.logStats(uniqueConcursos.length, limit);
    } catch (error) {
      console.error(`\n? [${this.name}] Erro fatal: ${error.message}`);
      this.stats.errors++;
    }
  }

  getListPages() {
    const regions = ['nacional', 'sudeste', 'sul', 'norte', 'nordeste', 'centrooeste'];
    return [
      `${this.baseUrl}/noticias`,
      ...regions.map((r) => `${this.baseUrl}/noticias/${r}/`),
      ...regions.map((r) => `${this.baseUrl}/concursos/${r}/`),
    ];
  }

  isNoticiaUrl(url) {
    if (!url.includes('/noticias/')) return false;
    if (/\/noticias\/?$/i.test(url)) return false;
    const category = /\/noticias\/(nacional|sudeste|sul|norte|nordeste|centrooeste)\/?$/i;
    return !category.test(url);
  }

  normalizeUrl(url) {
    if (!url) return null;
    const full = url.startsWith('http') ? url : `${this.baseUrl}${url}`;
    const clean = full.split('#')[0].split('?')[0];
    return clean.endsWith('/') ? clean.slice(0, -1) : clean;
  }

  extractTitulo($c) {
    const ogTitle = $c('meta[property="og:title"]').attr('content');
    if (ogTitle) return ogTitle.trim();
    const h1 = $c('h1').first().text().trim();
    if (h1) return h1;
    const title = $c('title').first().text().trim();
    return title || null;
  }

  extractOrgao(titulo) {
    const match = titulo.match(/^([A-Z\s]+)(?:\s-\s|\s(?:abre|divulga|publica|retifica|anuncia|lanca))/i);
    return match ? match[1].trim() : 'Nao informado';
  }

  extractVagas(text) {
    const matches = text.match(/(\d{1,5})\s*vagas?/i);
    return matches ? parseInt(matches[1]) : null;
  }

  extractBanca(text) {
    const bancas = ['CEBRASPE', 'CESPE', 'FCC', 'FGV', 'VUNESP', 'CESGRANRIO', 'IBFC', 'IADES'];
    const upper = text.toUpperCase();
    for (const b of bancas) {
      if (upper.includes(b)) return b;
    }
    return 'Nao identificada';
  }

  extractLinks($c) {
    const pdfs = [];
    let editalPdf = null;
    const provasLinks = [];

    $c('aside#links a, #links a').each((_, link) => {
      const text = ($c(link).text() || '').trim().toLowerCase();
      const href = $c(link).attr('href');
      if (!href) return;
      const url = href.startsWith('http') ? href : `${this.baseUrl}${href}`;
      const normalized = this.normalizeUrl(url);

      const isPdf = normalized ? isPdfUrl(normalized) : false;
      if (isPdf) {
        if (!pdfs.find((item) => item.url === normalized)) {
          pdfs.push({ url: normalized, label: text || 'pdf', source: 'links' });
        }
        if (!editalPdf && (text.includes('edital') || normalized.toLowerCase().includes('edital'))) {
          editalPdf = normalized;
        }
        if (text.includes('prova') && normalized && !provasLinks.find((item) => item.url === normalized)) {
          provasLinks.push({ url: normalized, label: text || 'prova' });
        }
        return;
      }
    });

    $c('a[href*=".pdf"]').each((_, link) => {
      const href = $c(link).attr('href');
      if (!href) return;
      const url = href.startsWith('http') ? href : `${this.baseUrl}${href}`;
      const normalized = this.normalizeUrl(url);
      if (normalized && !pdfs.find((item) => item.url === normalized)) {
        pdfs.push({ url: normalized, label: 'pdf', source: 'page' });
      }
    });

    return { editalPdf, provasLinks, pdfs };
  }

  pickBestPdf(pdfs) {
    if (!pdfs || pdfs.length === 0) return null;
    const scored = pdfs.map((url) => {
      const lower = url.toLowerCase();
      let score = 0;
      if (lower.includes('edital')) score += 5;
      if (lower.includes('abertura')) score += 3;
      if (lower.includes('retifica')) score -= 1;
      if (lower.includes('resultado')) score -= 2;
      return { url, score };
    });
    scored.sort((a, b) => b.score - a.score);
    return scored[0]?.url || null;
  }

  mergePdfLinks(links) {
    const merged = [];
    for (const item of links.pdfs || []) {
      if (!item?.url) continue;
      if (!merged.find((entry) => entry.url === item.url)) {
        merged.push(item);
      }
    }
    if (links.editalPdf && !merged.find((entry) => entry.url === links.editalPdf)) {
      merged.push({ url: links.editalPdf, label: 'edital', source: 'links' });
    }
    return merged;
  }

  isGenericTitle(titulo) {
    const lower = (titulo || '').toLowerCase();
    if (!lower) return true;
    if (lower === 'pci concursos') return true;
    if (lower.includes('informações sobre concursos públicos')) return true;
    if (lower.includes('informacoes sobre concursos publicos')) return true;
    return false;
  }

  normalizeWhitespace(text) {
    return (text || '').replace(/\s+/g, ' ').trim();
  }

  logStats(total, processados) {
    console.log(`\n?? Resumo da coleta PCI Concursos:`);
    console.log(`   Links encontrados: ${total}`);
    console.log(`   Processados: ${processados}`);
    console.log(`   Sucessos: ${this.stats.successes}`);
    console.log(`   Erros: ${this.stats.errors}`);
  }
}

module.exports = PCIConcursosScraper;
