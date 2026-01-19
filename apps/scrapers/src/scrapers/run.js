require('dotenv').config();
const PCIConcursosScraper = require('./pci-concursos');
const JCConcursosScraper = require('./jc-concursos');
const GranCursosBlogScraper = require('./gran-blog');
const CEBRASPEScraper = require('./cebraspe-scraper');
const FCCScraper = require('./fcc-scraper');
const FGVScraper = require('./fgv-scraper');
const VUNESPScraper = require('./vunesp-scraper');
const IbadeScraper = require('./ibade-scraper');
const QuadrixScraper = require('./quadrix-scraper');
const InstitutoMaisScraper = require('./institutomais-scraper');
const CesgranrioScraper = require('./cesgranrio-scraper');
const SeleconScraper = require('./selecon-scraper');
const { pool } = require('../db');

async function runAllScrapers({ closePool = false } = {}) {
  console.log('🚀 Edro Scrapers');
  console.log('='.repeat(60));
  
  const allScrapers = [
    { key: 'pci', name: 'PCI Concursos', instance: new PCIConcursosScraper() },
    { key: 'jc', name: 'JC Concursos', instance: new JCConcursosScraper() },
    { key: 'granblog', name: 'Gran Cursos Blog', instance: new GranCursosBlogScraper() },
    { key: 'cebraspe', name: 'CEBRASPE', instance: new CEBRASPEScraper() },
    { key: 'fcc', name: 'FCC', instance: new FCCScraper() },
    { key: 'fgv', name: 'FGV', instance: new FGVScraper() },
    { key: 'vunesp', name: 'VUNESP', instance: new VUNESPScraper() },
    { key: 'ibade', name: 'IBADE', instance: new IbadeScraper() },
    { key: 'quadrix', name: 'Quadrix', instance: new QuadrixScraper() },
    { key: 'institutomais', name: 'Instituto Mais', instance: new InstitutoMaisScraper() },
    { key: 'cesgranrio', name: 'Cesgranrio', instance: new CesgranrioScraper() },
    { key: 'selecon', name: 'Selecon', instance: new SeleconScraper() }
  ];

  const only = (process.env.SCRAPER_ONLY || '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  const scrapers = only.length
    ? allScrapers.filter((scraper) => only.includes(scraper.key) || only.includes(scraper.name.toLowerCase()))
    : allScrapers;
  const results = [];

  for (const scraper of scrapers) {
    try {
      const stats = await scraper.run();
      results.push({ scraper: scraper.name, stats });
    } catch (error) {
      console.error(`❌ Erro: ${error.message}`);
      results.push({ scraper: scraper.name, error: error.message });
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 RESUMO FINAL');
  console.log('='.repeat(60));
  
  let totalNew = 0;
  results.forEach(r => {
    if (r.stats) {
      console.log(`\n${r.scraper}: ✅ ${r.stats.new} novos`);
      totalNew += r.stats.new;
    }
  });

  console.log(`\n🎯 TOTAL: ${totalNew} novos editais`);
  if (closePool) {
    await pool.end();
  }
  return results;
}

if (require.main === module) {
  runAllScrapers({ closePool: true }).then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { runAllScrapers };
