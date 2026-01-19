const fs = require('fs');
const path = require('path');

console.log('Gerando arquivos do sistema de scrapers...');

const files = {
  'src/db/index.js': `
const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function query(text, params) { return await pool.query(text, params); }
async function insertHarvestItem(source, url, rawHtml) {
  const sql = 'INSERT INTO harvest_items (source, url, raw_html, status) VALUES ($+1, $+2, $+3, \'PENDING\') RETURNING id';
  const result = await query(sql, [source, url, rawHtml]);
  return result.rows[0].id;
}
async function harvestItemExists(url) {
  const sql = 'SELECT id FROM harvest_items WHERE url = $+1 LIMIT 1';
  const result = await query(sql, [url]);
  return result.rows.length > 0;
}
module.exports = { pool, query, insertHarvestItem, harvestItemExists };
`
};

for (const [file, content] of Object.entries(files)) {
  fs.writeFileSync(file, content);
  console.log('? ' + file);
}
console.log('Conclu?o!');
