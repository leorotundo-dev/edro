const { insertHarvestItem, harvestItemExists } = require('../db');
const { fetchHtml, fetchPdf, isPdfUrl, sanitizeText } = require('../utils/helpers');

class BaseScraper {
  constructor(name, baseUrl) {
    this.name = name;
    this.baseUrl = baseUrl;
    this.stats = { total: 0, new: 0, existing: 0, errors: 0, successes: 0 };
  }

  async scrape() {
    throw new Error('Método scrape() deve ser implementado');
  }

  /**
   * Salva um edital no banco.
   * Aceita string (url) ou objeto { url, fonte/source, titulo, orgao, ... }.
   */
  async saveEdital(edital, source = null) {
    try {
      this.stats.total++;

      const data = typeof edital === 'string' ? { url: edital } : (edital || {});
      const url = data.url;
      const origem = data.fonte || data.source || source || this.name;

      if (!url) throw new Error('URL do edital ausente');

      if (await harvestItemExists(url)) {
        console.log(`[${this.name}] ✅ Já existe: ${url}`);
        this.stats.existing++;
        return null;
      }

      console.log(`[${this.name}] ↓ Baixando: ${url}`);

      let content = isPdfUrl(url) ? await fetchPdf(url) : await fetchHtml(url);
      content = sanitizeText(content);

      const meta = {
        titulo: data.titulo,
        orgao: data.orgao,
        cargo: data.cargo,
        cargos: data.cargos,
        vagas: data.vagas,
        taxa_inscricao: data.taxa_inscricao,
        inscricoes: data.inscricoes,
        provas: data.provas,
        localidade: data.localidade,
        site_fonte: data.site_fonte,
        banca: data.banca,
        edital_url: data.edital_url,
        pdf_links: data.pdf_links,
        provas_links: data.provas_links,
        noticia_url: data.noticia_url,
        status_concurso: data.status_concurso,
        tags: data.tags
      };
      const extraMeta = data.extra_meta || data.extraMeta || {};
      Object.entries(extraMeta).forEach(([key, value]) => {
        if (meta[key] === undefined) {
          meta[key] = value;
        }
      });
      const metaText = Object.entries(meta)
        .filter(([, v]) => v !== undefined && v !== null)
        .map(([k, v]) => {
          if (Array.isArray(v)) return `${k}: ${JSON.stringify(v)}`;
          if (typeof v === 'object') return `${k}: ${JSON.stringify(v)}`;
          return `${k}: ${v}`;
        })
        .join(' | ');
      const rawToSave = metaText ? `${metaText}\n\n${content}` : content;

      if (!content || content.length < 500) {
        console.log(`[${this.name}] ⚠️  Conteúdo muito curto`);
        this.stats.errors++;
        return null;
      }

      const id = await insertHarvestItem(origem, url, rawToSave);
      console.log(`[${this.name}] ✅ Salvo com ID ${id}`);
      this.stats.new++;
      this.stats.successes++;
      return id;
    } catch (error) {
      console.error(`[${this.name}] ❌ Erro: ${error.message}`);
      this.stats.errors++;
      return null;
    }
  }

  printStats() {
    console.log(`\n[${this.name}] 📊 Estatísticas:`);
    console.log(`  Novos: ${this.stats.new}`);
    console.log(`  Existentes: ${this.stats.existing}`);
    console.log(`  Erros: ${this.stats.errors}`);
  }

  async run() {
    console.log(`\n[${this.name}] 🚀 Iniciando...`);
    await this.scrape();
    this.printStats();
    return this.stats;
  }
}

module.exports = BaseScraper;
