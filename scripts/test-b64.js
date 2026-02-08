const { execSync } = require('child_process');
const path = require('path');

const EDRO_DIR = path.join(__dirname, '..');

// Test with simple SQL
const sql = `UPDATE events SET payload = COALESCE(payload, '{}'::jsonb) || '{"descricao_ai":"Teste base64"}'::jsonb WHERE name = 'Ano Novo' AND date = '2026-01-01'`;
const nodeCode = `const{Pool}=require('pg');const p=new Pool({connectionString:process.env.DATABASE_URL});p.query(\`${sql}\`).then(r=>console.log(r.rowCount||0)).catch(e=>console.log('E',e.message)).finally(()=>p.end())`;

console.log('Node code:', nodeCode);

const b64 = Buffer.from(nodeCode).toString('base64');
console.log('\nBase64:', b64);

const cmd = `railway ssh "node -e \\"eval(Buffer.from('${b64}','base64').toString())\\""`;
console.log('\nCommand:', cmd.substring(0, 100) + '...');

try {
  const result = execSync(cmd, {
    cwd: EDRO_DIR,
    encoding: 'utf-8',
    timeout: 30000
  });
  console.log('\nResult:', result.trim());
} catch (err) {
  console.log('\nError:', err.message);
  console.log('Stdout:', err.stdout);
  console.log('Stderr:', err.stderr);
}
