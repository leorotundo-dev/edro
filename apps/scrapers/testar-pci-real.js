#!/usr/bin/env node

const PCIScraper = require('./src/scrapers/pci-concursos');

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║      🌐 TESTE PCI CONCURSOS - ESTRUTURA REAL 🌐            ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

async function main() {
  console.log('📌 Sobre este teste:');
  console.log('   • Site: PCI Concursos (pciconcursos.com.br)');
  console.log('   • Estrutura: Baseada em análise real do HTML');
  console.log('   • Fonte: Agregador de concursos de todas as bancas\n');
  
  console.log('🚀 Iniciando scraper PCI...\n');
  console.log('─'.repeat(60));
  
  try {
    const scraper = new PCIScraper();
    await scraper.scrape();
    
    console.log('─'.repeat(60));
    console.log('\n✅ Teste concluído!\n');
    
    if (scraper.stats.successes > 0) {
      console.log('╔══════════════════════════════════════════════════════════════╗');
      console.log('║           🎉 SCRAPER PCI FUNCIONANDO! 🎉                   ║');
      console.log('╚══════════════════════════════════════════════════════════════╝\n');
      console.log(`📊 Resultados:`);
      console.log(`   ✅ Concursos coletados: ${scraper.stats.successes}`);
      console.log(`   ❌ Erros: ${scraper.stats.errors}`);
      console.log(`   📈 Taxa de sucesso: ${((scraper.stats.successes / (scraper.stats.successes + scraper.stats.errors)) * 100).toFixed(1)}%\n`);
      
      console.log('💡 Dados coletados de cada concurso:');
      console.log('   • Órgão/Instituição');
      console.log('   • Banca organizadora (identificada automaticamente)');
      console.log('   • Número de vagas (quando disponível)');
      console.log('   • Link para matéria completa');
      console.log('   • Link do edital (quando disponível)\n');
      
    } else {
      console.log('╔══════════════════════════════════════════════════════════════╗');
      console.log('║              ⚠️  NENHUM CONCURSO COLETADO ⚠️                ║');
      console.log('╚══════════════════════════════════════════════════════════════╝\n');
    }
    
    console.log('🔄 PRÓXIMOS PASSOS:');
    console.log('   1. ✅ Scraper PCI funcional (agregador universal)');
    console.log('   2. ✅ Identifica bancas automaticamente');
    console.log('   3. 🔄 Criar scrapers específicos das bancas');
    console.log('   4. 💾 Salvar no PostgreSQL');
    console.log('   5. 🤖 Processar PDFs com GPT-4\n');
    
    console.log('🌐 VISUALIZE NO PAINEL:');
    console.log('   http://localhost:3000/admin/scrapers\n');
    
  } catch (error) {
    console.error('\n❌ Erro:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
