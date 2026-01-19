const BaseScraper = require('./base-scraper');

/**
 * Scraper de Demonstração
 * Simula coleta de editais para testes
 */
class DemoScraper extends BaseScraper {
  constructor() {
    super('Demo Scraper', 'https://demo.edro.digital');
  }

  async scrape() {
    console.log(`\n🔍 [${this.name}] Iniciando demonstração de coleta...\n`);
    
    // Dados simulados de editais reais
    const editaisDemo = [
      {
        banca: 'CESPE/CEBRASPE',
        orgao: 'Polícia Federal',
        cargo: 'Agente de Polícia Federal',
        url: 'https://exemplo.com/edital-pf-2024.pdf',
        vagas: 500,
        inscricoes: '01/02/2025 a 28/02/2025'
      },
      {
        banca: 'FCC',
        orgao: 'Tribunal Regional Federal 3ª Região',
        cargo: 'Analista Judiciário',
        url: 'https://exemplo.com/edital-trf3-2025.pdf',
        vagas: 150,
        inscricoes: '15/01/2025 a 15/02/2025'
      },
      {
        banca: 'FGV',
        orgao: 'Tribunal de Contas do Estado do Rio de Janeiro',
        cargo: 'Auditor de Controle Externo',
        url: 'https://exemplo.com/edital-tce-rj-2025.pdf',
        vagas: 30,
        inscricoes: '10/01/2025 a 10/02/2025'
      },
      {
        banca: 'VUNESP',
        orgao: 'Tribunal de Justiça de São Paulo',
        cargo: 'Escrevente Técnico Judiciário',
        url: 'https://exemplo.com/edital-tjsp-2025.pdf',
        vagas: 800,
        inscricoes: '20/01/2025 a 20/02/2025'
      },
      {
        banca: 'CESPE/CEBRASPE',
        orgao: 'Banco Central do Brasil',
        cargo: 'Analista do Banco Central',
        url: 'https://exemplo.com/edital-bacen-2025.pdf',
        vagas: 100,
        inscricoes: '01/03/2025 a 31/03/2025'
      }
    ];

    console.log(`📋 Simulando coleta de ${editaisDemo.length} editais...\n`);

    for (let i = 0; i < editaisDemo.length; i++) {
      const edital = editaisDemo[i];
      
      console.log(`[${i + 1}/${editaisDemo.length}] Processando edital:`);
      console.log(`   🏛️  Órgão: ${edital.orgao}`);
      console.log(`   📋 Cargo: ${edital.cargo}`);
      console.log(`   🏢 Banca: ${edital.banca}`);
      console.log(`   👥 Vagas: ${edital.vagas}`);
      console.log(`   📅 Inscrições: ${edital.inscricoes}`);
      console.log(`   🔗 URL: ${edital.url}`);
      
      try {
        // Simular salvamento no banco de dados
        await this.saveEdital(edital);
        console.log(`   ✅ Edital salvo com sucesso!\n`);
      } catch (error) {
        console.error(`   ❌ Erro ao salvar: ${error.message}\n`);
        this.stats.errors++;
      }
      
      // Simular delay entre requisições
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`\n📊 Resumo da coleta:`);
    console.log(`   Total processado: ${editaisDemo.length}`);
    console.log(`   Sucessos: ${this.stats.successes}`);
    console.log(`   Erros: ${this.stats.errors}`);
    console.log(`   Taxa de sucesso: ${((this.stats.successes / editaisDemo.length) * 100).toFixed(1)}%`);
  }

  async saveEdital(edital) {
    try {
      // Aqui você salvaria no banco de dados PostgreSQL
      // Por enquanto, apenas simulamos o salvamento
      
      const editalFormatado = {
        fonte: edital.banca,
        titulo: `${edital.orgao} - ${edital.cargo}`,
        url: edital.url,
        orgao: edital.orgao,
        cargo: edital.cargo,
        vagas: edital.vagas,
        periodo_inscricoes: edital.inscricoes,
        coletado_em: new Date().toISOString(),
        status: 'pending' // pending, processing, completed
      };
      
      // Incrementar contador de sucessos
      this.stats.successes++;
      
      return editalFormatado;
    } catch (error) {
      this.stats.errors++;
      throw error;
    }
  }
}

module.exports = DemoScraper;
