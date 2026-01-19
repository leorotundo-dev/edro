#!/usr/bin/env node

const CESPEScraper = require('./src/scrapers/cespe-scraper-test');

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║         🤖 TESTE DE SCRAPER - CESPE/CEBRASPE 🤖            ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

async function main() {
  try {
    console.log('📌 Configuração:');
    console.log('   • Banca: CESPE/CEBRASPE');
    console.log('   • Site: https://www.cebraspe.org.br');
    console.log('   • Limite: 5 concursos');
    console.log('   • Delay entre requests: 2 segundos\n');
    
    console.log('🚀 Iniciando scraper...\n');
    console.log('─'.repeat(60));
    
    const scraper = new CESPEScraper();
    await scraper.scrape();
    
    console.log('─'.repeat(60));
    console.log('\n✅ Teste concluído!\n');
    
    // Mostrar resultado final
    if (scraper.stats.successes > 0) {
      console.log('╔══════════════════════════════════════════════════════════════╗');
      console.log('║              🎉 SCRAPER FUNCIONANDO! 🎉                     ║');
      console.log('╚══════════════════════════════════════════════════════════════╝\n');
      console.log(`📊 Estatísticas Finais:`);
      console.log(`   ✅ Editais coletados: ${scraper.stats.successes}`);
      console.log(`   ❌ Erros: ${scraper.stats.errors}`);
      console.log(`   📈 Taxa de sucesso: ${((scraper.stats.successes / (scraper.stats.successes + scraper.stats.errors)) * 100).toFixed(1)}%`);
    } else {
      console.log('╔══════════════════════════════════════════════════════════════╗');
      console.log('║              ⚠️  NENHUM EDITAL COLETADO ⚠️                  ║');
      console.log('╚══════════════════════════════════════════════════════════════╝\n');
      console.log('💡 Possíveis causas:');
      console.log('   • Site fora do ar ou bloqueando scrapers');
      console.log('   • Estrutura do HTML mudou');
      console.log('   • Problemas de conexão com a internet');
      console.log('   • Necessário usar proxy ou headers customizados');
    }
    
    console.log('\n🌐 Próximos passos:');
    console.log('   1. Integrar com o banco de dados');
    console.log('   2. Adicionar mais bancas (FCC, FGV, VUNESP)');
    console.log('   3. Implementar agendamento automático');
    console.log('   4. Criar dashboard de monitoramento\n');
    
  } catch (error) {
    console.error('\n❌ Erro fatal:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
