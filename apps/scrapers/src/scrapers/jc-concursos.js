const BaseScraper = require('./base-scraper');
const cheerio = require('cheerio');
const { fetchHtml, sleep } = require('../utils/helpers');

/**
 * Scraper para JC Concursos
 * Site: https://jcconcursos.com.br
 */
class JCConcursosScraper extends BaseScraper {
  constructor() {
    super('JC Concursos', 'https://jcconcursos.com.br');
  }

  async scrape() {
    console.log(`\n[${this.name}] Iniciando coleta de concursos...\n`);

    try {
      const listPages = this.getListPages();
      const concursos = new Map();

      for (const listUrl of listPages) {
        try {
          const html = await fetchHtml(listUrl);
          const $ = cheerio.load(html);

          $('a[href^="/concurso/"], a[href*="/concurso/"]').each((_, el) => {
            const href = $(el).attr('href');
            const url = this.normalizeUrl(href);
            if (!url || !this.isConcursoUrl(url)) return;
            const titulo = $(el).text().trim();
            concursos.set(url, { url, titulo });
          });
        } catch (error) {
          console.error(`   ! Erro ao ler lista ${listUrl}: ${error.message}`);
        }
      }

      const uniqueConcursos = Array.from(concursos.values());
      console.log(`? Encontrados ${uniqueConcursos.length} concursos no JC`);

      const configuredLimit = parseInt(process.env.JC_LIMIT || process.env.SCRAPER_LIMIT || '10', 10);
      const limit = Math.min(Number.isFinite(configuredLimit) ? configuredLimit : 10, uniqueConcursos.length);
      console.log(`=> Processando ${limit} concursos...\n`);

      for (let i = 0; i < limit; i++) {
        const concurso = uniqueConcursos[i];
        console.log(`[${i + 1}/${limit}] ${concurso.titulo || concurso.url}`);

        try {
          const concursoHtml = await fetchHtml(concurso.url);
          const $c = cheerio.load(concursoHtml);

          const titulo = this.extractTitulo($c) || concurso.titulo || concurso.url;
          const resumo = this.extractResumo($c);
          const links = this.extractLinks($c);
          const editalUrl = this.pickBestPdf(links.pdfLinks.map((link) => link.url));
          const tags = this.buildTags(resumo.status, Boolean(editalUrl));

          await this.saveEdital({
            fonte: 'JC Concursos',
            titulo,
            url: editalUrl || concurso.url,
            orgao: resumo.orgao || 'Nao informado',
            vagas: resumo.vagas || null,
            banca: resumo.banca || 'JC Concursos',
            taxa_inscricao: resumo.taxa_inscricao || undefined,
            edital_url: editalUrl || undefined,
            pdf_links: links.pdfLinks,
            provas_links: links.provasLinks,
            provas: links.provasLinks[0]?.url || undefined,
            noticia_url: concurso.url,
            site_fonte: 'JC Concursos',
            cargos: resumo.cargos,
            localidade: resumo.localidade,
            status_concurso: resumo.status || undefined,
            tags
          });

          await sleep(2000);
        } catch (error) {
          console.error(`   ! Erro: ${error.message}`);
          this.stats.errors++;
        }

        console.log('');
      }

      this.logStats(uniqueConcursos.length, limit);
    } catch (error) {
      console.error(`\n! [${this.name}] Erro fatal: ${error.message}`);
      this.stats.errors++;
    }
  }

  getListPages() {
    return [
      `${this.baseUrl}/concursos/inscricoes-abertas`,
      `${this.baseUrl}/concursos/em-andamento`,
      `${this.baseUrl}/concursos/previstos`,
      `${this.baseUrl}/concursos/autorizados`
    ];
  }

  isConcursoUrl(url) {
    return /\/concurso\//i.test(url);
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

  extractResumo($c) {
    const resumo = {
      orgao: null,
      vagas: null,
      taxa_inscricao: null,
      cargos: [],
      banca: null,
      localidade: null,
      status: null
    };

    const statusText = $c('.status-concurso-interna, [class*="status-concurso"]')
      .first()
      .text()
      .trim();
    if (statusText) resumo.status = statusText;

    $c('table .col-concursos tr').each((_, row) => {
      const cells = $c(row).find('td');
      if (cells.length < 2) return;
      const label = this.normalizeSignal(cells.first().text());
      const valueCell = cells.last();
      const valueText = this.normalizeWhitespace(valueCell.text());
      if (!label || !valueText) return;

      if (label.includes('orgao')) {
        resumo.orgao = valueText;
      } else if (label.includes('vagas')) {
        resumo.vagas = this.parseNumber(valueText);
      } else if (label.includes('taxa')) {
        resumo.taxa_inscricao = this.extractCurrency(valueText);
      } else if (label.includes('cargos')) {
        resumo.cargos = this.extractList($c, valueCell).map((nome) => ({ nome }));
      } else if (label.includes('organizadora')) {
        const list = this.extractList($c, valueCell);
        resumo.banca = list[0] || valueText;
      } else if (label.includes('estados')) {
        resumo.localidade = this.extractList($c, valueCell).join(', ') || valueText;
      }
    });

    return resumo;
  }

  extractLinks($c) {
    const pdfLinks = [];
    const provasLinks = [];

    $c('a[href$=".pdf"], a[href*=".pdf?"]').each((_, link) => {
      const href = $c(link).attr('href');
      if (!href) return;
      const url = href.startsWith('http') ? href : `${this.baseUrl}${href}`;
      const normalized = this.normalizeUrl(url);
      if (!normalized) return;
      const text = ($c(link).text() || '').trim().toLowerCase();
      if (!pdfLinks.find((item) => item.url === normalized)) {
        pdfLinks.push({ url: normalized, label: text || 'pdf', source: 'page' });
      }
      if (text.includes('prova') && !provasLinks.find((item) => item.url === normalized)) {
        provasLinks.push({ url: normalized, label: text || 'prova' });
      }
    });

    return { pdfLinks, provasLinks };
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

  buildTags(status, hasPdf) {
    const tags = new Set();
    const normalized = this.normalizeSignal(status || '');

    if (normalized.includes('previsto')) tags.add('previsto');
    if (normalized.includes('autorizado')) tags.add('autorizado');
    if (normalized.includes('aberto')) tags.add('aberto');
    if (normalized.includes('em andamento')) tags.add('em_andamento');
    if (normalized.includes('encerrado') || normalized.includes('concluido')) tags.add('concluido');
    if (normalized.includes('suspenso')) tags.add('suspenso');
    if (normalized.includes('cancelado')) tags.add('cancelado');
    if (!hasPdf) tags.add('sem_edital');

    return Array.from(tags);
  }

  extractList($c, cell) {
    const items = cell
      .find('a')
      .map((_, el) => this.normalizeWhitespace($c(el).text()))
      .get()
      .filter(Boolean);
    if (items.length) return items;
    const raw = this.normalizeWhitespace(cell.text());
    return raw ? raw.split(',').map((item) => item.trim()).filter(Boolean) : [];
  }

  extractCurrency(text) {
    const match = text.match(/R\$\s*([0-9.]+,[0-9]{2})/i);
    return match ? match[1] : null;
  }

  parseNumber(text) {
    const normalized = (text || '').replace(/[^\d]/g, '');
    return normalized ? parseInt(normalized, 10) : null;
  }

  normalizeWhitespace(text) {
    return (text || '').replace(/\s+/g, ' ').trim();
  }

  normalizeSignal(text) {
    return this.normalizeWhitespace(text)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

  logStats(total, processados) {
    console.log(`\n=> Resumo da coleta JC Concursos:`);
    console.log(`   Links encontrados: ${total}`);
    console.log(`   Processados: ${processados}`);
    console.log(`   Sucessos: ${this.stats.successes}`);
    console.log(`   Erros: ${this.stats.errors}`);
  }
}

module.exports = JCConcursosScraper;
