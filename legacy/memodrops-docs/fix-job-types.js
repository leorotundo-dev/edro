require('dotenv').config();
const { Client } = require('pg');

const connectionString = process.env.DATABASE_URL;

async function fixJobTypes() {
  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('✅ Conectado ao banco');

    // Atualizar type baseado no name
    console.log('\n🔧 Atualizando tipos dos jobs...');
    
    await client.query(`
      UPDATE jobs 
      SET type = name 
      WHERE type = 'unknown' AND name IS NOT NULL;
    `);

    console.log('✅ Tipos atualizados!');

    // Verificar resultado
    const result = await client.query(`
      SELECT id, name, type, status 
      FROM jobs 
      ORDER BY id;
    `);

    console.log('\n📋 Jobs atuais:');
    result.rows.forEach(job => {
      console.log(`  ID ${job.id}: ${job.name} (type: ${job.type}) - ${job.status}`);
    });

    console.log('\n🎉 Pronto!');

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await client.end();
  }
}

fixJobTypes();