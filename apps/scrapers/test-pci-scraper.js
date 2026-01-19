const PCIConcursosScraper = require('./src/scrapers/pci-concursos');

console.log('🔍 Testando Scraper PCI Concursos...\n');

async function test() {
  try {
    const scraper = new PCIConcursosScraper();
    
    console.log('📊 Informações do Scraper:');
    console.log(`   Nome: ${scraper.name}`);
    console.log(`   URL Base: ${scraper.baseUrl}`);
    console.log(`   Estatísticas iniciais:`, scraper.stats);
    console.log('');

    console.log('🚀 Iniciando coleta...\n');
    await scraper.scrape();
    
    console.log('\n✅ Coleta finalizada!');
    console.log('📊 Resultados:');
    console.log(`   Sucessos: ${scraper.stats.successes}`);
    console.log(`   Erros: ${scraper.stats.errors}`);
    console.log(`   Total processado: ${scraper.stats.successes + scraper.stats.errors}`);
    
    if (scraper.stats.successes > 0) {
      console.log('\n🎉 SCRAPER FUNCIONANDO CORRETAMENTE!');
    } else {
      console.log('\n⚠️  Nenhum item foi coletado. Verifique a conexão e o site.');
    }
    
  } catch (error) {
    console.error('\n❌ Erro ao executar scraper:', error.message);
    console.error(error.stack);
  }
}

test();
