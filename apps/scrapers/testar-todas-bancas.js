#!/usr/bin/env node

const FCCScraper = require('./src/scrapers/fcc-scraper');
const FGVScraper = require('./src/scrapers/fgv-scraper');
const VUNESPScraper = require('./src/scrapers/vunesp-scraper');
const CEBRASPEScraper = require('./src/scrapers/cebraspe-scraper');
const DemoScraper = require('./src/scrapers/demo-scraper');

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║       🤖 TESTE DE TODOS OS SCRAPERS - EDRO 🤖         ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

async function testScraper(ScraperClass, name) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🔍 TESTANDO: ${name}`);
  console.log('='.repeat(60));
  
  try {
    const scraper = new ScraperClass();
    await scraper.scrape();
    
    return {
      name: name,
      success: true,
      sucessos: scraper.stats.successes || 0,
      erros: scraper.stats.errors || 0
    };
  } catch (error) {
    console.error(`❌ Erro ao testar ${name}:`, error.message);
    return {
      name: name,
      success: false,
      sucessos: 0,
      erros: 1,
      erro: error.message
    };
  }
}

async function main() {
  console.log('📌 Bancas a serem testadas:');
  console.log('   1. CEBRASPE (ex-CESPE)');
  console.log('   2. FCC (Fundação Carlos Chagas)');
  console.log('   3. FGV (Fundação Getulio Vargas)');
  console.log('   4. VUNESP');
  console.log('   5. Demo (Demonstração)\n');
  
  console.log('⚠️  IMPORTANTE:');
  console.log('   • Sites reais podem bloquear scrapers');
  console.log('   • Estrutura HTML pode ter mudado');
  console.log('   • Alguns podem exigir JavaScript/captcha');
  console.log('   • Demo sempre funciona (dados simulados)\n');
  
  const resultados = [];
  
  // Testar Demo primeiro (sempre funciona)
  console.log('🎯 Iniciando com Demo (garantido funcionar)...');
  resultados.push(await testScraper(DemoScraper, 'Demo Scraper'));
  
  // Testar scrapers reais
  console.log('\n\n🌐 Testando scrapers reais...');
  console.log('(Isso pode demorar alguns minutos)\n');
  
  resultados.push(await testScraper(CEBRASPEScraper, 'CEBRASPE/CESPE'));
  resultados.push(await testScraper(FCCScraper, 'FCC'));
  resultados.push(await testScraper(FGVScraper, 'FGV'));
  resultados.push(await testScraper(VUNESPScraper, 'VUNESP'));
  
  // Relatório Final
  console.log('\n\n' + '='.repeat(60));
  console.log('📊 RELATÓRIO FINAL - TODOS OS SCRAPERS');
  console.log('='.repeat(60) + '\n');
  
  let totalSucessos = 0;
  let totalErros = 0;
  let scrapersAtivos = 0;
  
  resultados.forEach((resultado, index) => {
    const emoji = resultado.success && resultado.sucessos > 0 ? '✅' : 
                  resultado.success ? '⚠️' : '❌';
    
    console.log(`${emoji} ${index + 1}. ${resultado.name}`);
    console.log(`   Editais coletados: ${resultado.sucessos}`);
    console.log(`   Erros: ${resultado.erros}`);
    
    if (resultado.erro) {
      console.log(`   Erro: ${resultado.erro}`);
    }
    
    if (resultado.sucessos > 0) {
      scrapersAtivos++;
    }
    
    totalSucessos += resultado.sucessos;
    totalErros += resultado.erros;
    console.log('');
  });
  
  console.log('─'.repeat(60));
  console.log(`📈 RESUMO GERAL:`);
  console.log(`   Total de editais coletados: ${totalSucessos}`);
  console.log(`   Total de erros: ${totalErros}`);
  console.log(`   Scrapers funcionando: ${scrapersAtivos}/${resultados.length}`);
  console.log(`   Taxa de sucesso: ${((scrapersAtivos/resultados.length) * 100).toFixed(1)}%`);
  console.log('─'.repeat(60) + '\n');
  
  if (scrapersAtivos >= 1) {
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║         🎉 PELO MENOS UM SCRAPER FUNCIONANDO! 🎉           ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');
  }
  
  console.log('💡 RECOMENDAÇÕES:\n');
  
  if (scrapersAtivos === 5) {
    console.log('✅ EXCELENTE! Todos os scrapers estão funcionando!');
    console.log('   → Pronto para produção');
  } else if (scrapersAtivos >= 3) {
    console.log('✅ BOM! Maioria dos scrapers funcionando.');
    console.log('   → Revisar scrapers com erro');
    console.log('   → Verificar mudanças nos sites');
  } else if (scrapersAtivos >= 1) {
    console.log('⚠️  PARCIAL. Alguns scrapers funcionando.');
    console.log('   → Sites podem estar bloqueando');
    console.log('   → Considerar usar proxies');
    console.log('   → Adicionar headers personalizados');
    console.log('   → Verificar estrutura HTML atualizada');
  } else {
    console.log('❌ CRÍTICO. Nenhum scraper real funcionando.');
    console.log('   → Verificar conexão com internet');
    console.log('   → Sites podem exigir JavaScript');
    console.log('   → Usar o Demo para desenvolvimento');
    console.log('   → Considerar APIs oficiais das bancas');
  }
  
  console.log('\n🔄 PRÓXIMOS PASSOS:');
  console.log('   1. Integrar scrapers com banco de dados PostgreSQL');
  console.log('   2. Agendar execução automática (cron jobs)');
  console.log('   3. Adicionar notificações de novos editais');
  console.log('   4. Processar PDFs com IA (GPT-4)');
  console.log('   5. Criar sistema de monitoramento\n');
  
  console.log('🌐 VISUALIZE NO PAINEL:');
  console.log('   http://localhost:3000/admin/scrapers\n');
}

main().catch(error => {
  console.error('\n❌ Erro fatal:', error);
  process.exit(1);
});
