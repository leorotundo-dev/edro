const BaseScraper = require('./base-scraper');
const cheerio = require('cheerio');
const { fetchHtml, sleep, isPdfUrl } = require('../utils/helpers');

/**
 * Scraper para o blog do Gran Cursos
 * Site: https://blog.grancursosonline.com.br
 */
class GranCursosBlogScraper extends BaseScraper {
  constructor() {
    super('Gran Cursos Blog', 'https://blog.grancursosonline.com.br');
  }

  async scrape() {
    console.log(`\n[${this.name}] Iniciando coleta...\n`);

    try {
      const postUrls = await this.fetchPostUrls();
      console.log(`=> Encontrados ${postUrls.length} posts`);

      const configuredLimit = parseInt(process.env.GRAN_BLOG_LIMIT || process.env.SCRAPER_LIMIT || '10', 10);
      const limit = Math.min(Number.isFinite(configuredLimit) ? configuredLimit : 10, postUrls.length);
      console.log(`=> Processando ${limit} posts...\n`);

      for (let i = 0; i < limit; i++) {
        const url = postUrls[i];
        console.log(`[${i + 1}/${limit}] ${url}`);
        try {
          const html = await fetchHtml(url);
          const $ = cheerio.load(html);

          const titulo = this.extractTitle($) || url;
          const canonical = this.extractCanonical($) || url;
          const autor = this.extractAuthor($);
          const dataPublicacao = this.extractMeta($, 'article:published_time') || this.extractTime($);
          const dataAtualizacao = this.extractMeta($, 'article:modified_time');
          const descricao = this.extractMeta($, 'og:description') || this.extractMetaName($, 'description');
          const imagemCapa = this.extractMeta($, 'og:image');
          const tags = this.extractTags($);
          const pdfLinks = this.extractPdfLinks($);
          const tabelas = this.extractTables($);
          const resumo = this.extractResumo($);
          const textoArtigo = this.extractArticleText($);
          const vagas = resumo.vagas || this.extractVagas(textoArtigo);
          const banca = resumo.banca || this.extractBanca(textoArtigo) || 'Gran Cursos Blog';
          const orgao = resumo.orgao || this.extractOrgaoFromTitle(titulo) || 'Nao informado';
          const provasLinks = this.extractProvasLinks(pdfLinks);
          const editalUrl = this.pickBestPdf(pdfLinks.map((link) => link.url));
          const urlToSave = editalUrl || canonical || url;
          const allTags = this.buildTags(resumo.status, Boolean(editalUrl), tags);

          await this.saveEdital({
            fonte: 'Gran Cursos Blog',
            titulo,
            url: urlToSave,
            noticia_url: canonical || url,
            orgao,
            vagas: vagas || null,
            banca,
            edital_url: editalUrl || undefined,
            pdf_links: pdfLinks,
            provas_links: provasLinks,
            provas: provasLinks[0]?.url || undefined,
            cargos: resumo.cargos,
            localidade: resumo.localidade,
            site_fonte: 'Gran Cursos Blog',
            extra_meta: {
              data_publicacao: dataPublicacao || undefined,
              atualizado_em: dataAtualizacao || undefined,
              autor: autor || undefined,
              descricao: descricao || undefined,
              imagem_capa: imagemCapa || undefined,
              tags: allTags,
              status_concurso: resumo.status || undefined,
              tabelas,
            },
          });

          await sleep(1500);
        } catch (error) {
          console.error(`   ! Erro ao processar ${url}: ${error.message}`);
          this.stats.errors++;
        }

        console.log('');
      }

      this.logStats(postUrls.length, limit);
    } catch (error) {
      console.error(`\n! [${this.name}] Erro fatal: ${error.message}`);
      this.stats.errors++;
    }
  }

  async fetchPostUrls() {
    const urls = new Set();
    try {
      const sitemapIndex = await fetchHtml(`${this.baseUrl}/sitemap_index.xml`);
      const sitemapUrls = this.extractSitemapLocs(sitemapIndex).filter((loc) => /post-sitemap/i.test(loc));
      const configuredLimit = parseInt(process.env.GRAN_SITEMAP_LIMIT || '1', 10);
      const limit = Math.min(Number.isFinite(configuredLimit) ? configuredLimit : 1, sitemapUrls.length);
      const selected = sitemapUrls.slice(0, limit);

      for (const sitemapUrl of selected) {
        try {
          const xml = await fetchHtml(sitemapUrl);
          const locs = this.extractSitemapLocs(xml);
          locs.forEach((loc) => {
            const normalized = this.normalizeUrl(loc);
            if (normalized && this.isPostUrl(normalized)) {
              urls.add(normalized);
            }
          });
        } catch (error) {
          console.error(`   ! Erro ao ler sitemap ${sitemapUrl}: ${error.message}`);
        }
      }
    } catch (error) {
      console.error(`   ! Erro ao ler sitemap index: ${error.message}`);
    }

    if (!urls.size) {
      const html = await fetchHtml(`${this.baseUrl}/`);
      const $ = cheerio.load(html);
      $('a[href]').each((_, el) => {
        const href = $(el).attr('href');
        const normalized = this.normalizeUrl(href);
        if (normalized && this.isPostUrl(normalized)) {
          urls.add(normalized);
        }
      });
    }

    return Array.from(urls);
  }

  extractSitemapLocs(xml) {
    const matches = xml.match(/<loc>(.*?)<\/loc>/gi) || [];
    return matches
      .map((entry) => entry.replace(/<\/?loc>/gi, '').trim())
      .filter(Boolean);
  }

  isPostUrl(url) {
    if (!url.startsWith(this.baseUrl)) return false;
    if (url.includes('/tag/') || url.includes('/categoria/') || url.includes('/category/')) return false;
    if (url.includes('/author/') || url.includes('/autor/')) return false;
    if (url.includes('/page/')) return false;
    return url.replace(this.baseUrl, '').split('/').filter(Boolean).length >= 1;
  }

  normalizeUrl(url) {
    if (!url) return null;
    const full = url.startsWith('http') ? url : `${this.baseUrl}${url}`;
    const clean = full.split('#')[0].split('?')[0];
    return clean.endsWith('/') ? clean.slice(0, -1) : clean;
  }

  extractTitle($) {
    const ogTitle = $('meta[property="og:title"]').attr('content');
    if (ogTitle) return ogTitle.trim();
    const h1 = $('#post-title').first().text().trim();
    if (h1) return h1;
    const fallback = $('h1').first().text().trim();
    if (fallback) return fallback;
    const title = $('title').first().text().trim();
    return title || null;
  }

  extractCanonical($) {
    const canonical = $('link[rel="canonical"]').attr('href');
    if (canonical) return canonical.trim();
    return this.extractMeta($, 'og:url');
  }

  extractAuthor($) {
    const author = $('a[rel="author"]').first().text().trim();
    return author || null;
  }

  extractTime($) {
    const time = $('time[datetime]').first().attr('datetime');
    return time ? time.trim() : null;
  }

  extractMeta($, property) {
    const value = $(`meta[property="${property}"]`).attr('content');
    return value ? value.trim() : null;
  }

  extractMetaName($, name) {
    const value = $(`meta[name="${name}"]`).attr('content');
    return value ? value.trim() : null;
  }

  extractTags($) {
    const tags = new Set();
    $('a[href*="/tag/"]').each((_, el) => {
      const text = $(el).text().trim();
      if (text) tags.add(text);
    });
    return Array.from(tags);
  }

  extractResumo($) {
    const resumo = {
      orgao: null,
      vagas: null,
      banca: null,
      cargos: [],
      localidade: null,
      status: null,
    };

    $('article#content table').each((_, table) => {
      const $table = $(table);
      if (!resumo.orgao) {
        const header = $table.find('thead th').first().text().trim();
        if (header && header.length >= 3) resumo.orgao = header;
      }

      $table.find('tr').each((_, row) => {
        const cells = $(row).find('th, td').map((__, cell) => {
          return this.normalizeWhitespace($(cell).text());
        }).get();
        if (cells.length < 2) return;
        const label = this.normalizeSignal(cells[0]);
        const value = cells[1];
        if (!label || !value) return;

        if (label.includes('situacao')) {
          resumo.status = value;
        } else if (label.includes('banca')) {
          resumo.banca = value;
        } else if (label.includes('cargo')) {
          resumo.cargos = this.extractList(value).map((nome) => ({ nome }));
        } else if (label.includes('vagas')) {
          resumo.vagas = this.parseNumber(value);
        } else if (label.includes('lotacao') || label.includes('local') || label.includes('estado')) {
          resumo.localidade = value;
        } else if (label.includes('orgao') || label.includes('instituto') || label.includes('prefeitura')) {
          resumo.orgao = value;
        }
      });
    });

    return resumo;
  }

  extractArticleText($) {
    const text = $('article#content').text();
    return this.normalizeWhitespace(text);
  }

  extractVagas(text) {
    const match = (text || '').match(/(\d{1,5})\s*vagas?/i);
    return match ? parseInt(match[1], 10) : null;
  }

  extractBanca(text) {
    const bancas = ['CEBRASPE', 'CESPE', 'FCC', 'FGV', 'VUNESP', 'CESGRANRIO', 'IBFC', 'IADES'];
    const upper = (text || '').toUpperCase();
    for (const banca of bancas) {
      if (upper.includes(banca)) return banca;
    }
    return null;
  }

  extractOrgaoFromTitle(titulo) {
    const normalized = (titulo || '').trim();
    const match = normalized.match(/concurso\s+([^:–-]+)/i);
    return match ? match[1].trim() : null;
  }

  extractProvasLinks(pdfLinks) {
    return (pdfLinks || []).filter((link) => {
      const label = (link.label || '').toLowerCase();
      const url = (link.url || '').toLowerCase();
      return label.includes('prova') || url.includes('prova');
    });
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

  buildTags(status, hasPdf, tags = []) {
    const merged = new Set((tags || []).filter(Boolean));
    const normalized = this.normalizeSignal(status || '');
    if (normalized.includes('previsto')) merged.add('previsto');
    if (normalized.includes('autorizado')) merged.add('autorizado');
    if (normalized.includes('aberto')) merged.add('aberto');
    if (normalized.includes('em andamento')) merged.add('em_andamento');
    if (normalized.includes('homolog')) merged.add('homologado');
    if (normalized.includes('encerrado') || normalized.includes('concluido')) merged.add('concluido');
    if (normalized.includes('suspenso')) merged.add('suspenso');
    if (normalized.includes('cancelado')) merged.add('cancelado');
    if (!hasPdf) merged.add('sem_edital');
    return Array.from(merged);
  }

  extractPdfLinks($) {
    const links = [];
    $('article#content a[href], a[href$=".pdf"], a[href*=".pdf?"]').each((_, el) => {
      const href = $(el).attr('href');
      if (!href) return;
      const url = href.startsWith('http') ? href : `${this.baseUrl}${href}`;
      if (!isPdfUrl(url)) return;
      const normalized = this.normalizeUrl(url);
      if (!normalized) return;
      const label = $(el).text().trim().toLowerCase() || 'pdf';
      if (!links.find((item) => item.url === normalized)) {
        links.push({ url: normalized, label, source: 'page' });
      }
    });
    return links;
  }

  extractTables($) {
    const tables = [];
    $('article#content table').each((_, table) => {
      const $table = $(table);
      const caption = $table.find('caption').first().text().trim();
      let headers = $table.find('thead th').map((_, th) => $(th).text().trim()).get();
      const rows = [];

      const rowEls = $table.find('tbody tr').length ? $table.find('tbody tr') : $table.find('tr');
      rowEls.each((idx, row) => {
        const cells = $(row).find('th, td').map((_, cell) => $(cell).text().trim()).get();
        if (!cells.length) return;
        if (!headers.length) {
          headers = cells;
          return;
        }
        if (headers.length === cells.length) {
          const mapped = {};
          headers.forEach((header, i) => {
            mapped[header || `col_${i + 1}`] = cells[i];
          });
          rows.push(mapped);
        } else {
          rows.push(cells);
        }
      });

      if (headers.length || rows.length) {
        tables.push({ caption, headers, rows });
      }
    });
    return tables;
  }

  extractList(text) {
    const raw = this.normalizeWhitespace(text || '');
    return raw
      ? raw
          .split(/,|;|\be\b/gi)
          .map((item) => item.trim())
          .filter(Boolean)
      : [];
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
    console.log(`\n=> Resumo da coleta Gran Cursos Blog:`);
    console.log(`   Links encontrados: ${total}`);
    console.log(`   Processados: ${processados}`);
    console.log(`   Sucessos: ${this.stats.successes}`);
    console.log(`   Erros: ${this.stats.errors}`);
  }
}

module.exports = GranCursosBlogScraper;
