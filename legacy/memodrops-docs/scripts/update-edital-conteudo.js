const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const args = process.argv.slice(2);
const getArg = (flag) => {
  const index = args.indexOf(flag);
  if (index === -1) return null;
  return args[index + 1] || null;
};

const editalId = getArg('--edital-id') || process.env.EDITAL_ID;
const filePath = getArg('--file') || process.env.INPUT_FILE;
const confirm = args.includes('--confirm');

if (!process.env.DATABASE_URL) {
  console.error('Missing DATABASE_URL.');
  process.exit(1);
}

if (!editalId) {
  console.error('Missing --edital-id');
  process.exit(1);
}

if (!filePath) {
  console.error('Missing --file');
  process.exit(1);
}

const resolveDiscipline = (line) => {
  const entries = [
    { pattern: /L[IÍ]NGUA PORTUGUESA/i, name: 'Língua Portuguesa' },
    { pattern: /L[IÍ]NGUA INGLESA/i, name: 'Língua Inglesa' },
    { pattern: /RACIOC[IÍ]NIO L[ÓO]GICO E ANAL[IÍ]TICO/i, name: 'Raciocínio Lógico e Analítico' },
    { pattern: /DIREITO ADMINISTRATIVO/i, name: 'Direito Administrativo' },
    { pattern: /ADMINISTRA[CÇ][ÃA]O P[ÚU]BLICA/i, name: 'Administração Pública' },
    { pattern: /REGIMENTOS E C[ÓO]DIGO DE [ÉE]TICA/i, name: 'Regimentos e Código de Ética' },
    { pattern: /DIREITO CONSTITUCIONAL E PROCESSO LEGISLATIVO/i, name: 'Direito Constitucional e Processo Legislativo' },
    { pattern: /CI[ÊE]NCIA POL[IÍ]TICA/i, name: 'Ciência Política' },
    { pattern: /GOVERNAN[ÇC]A, ESTRAT[ÉE]GIA E GEST[ÃA]O/i, name: 'Governança, Estratégia e Gestão' },
    { pattern: /NO[ÇC](?:ÕES|OES) DE TECNOLOGIA DA INFORMA[CÇ][ÃA]O E DADOS/i, name: 'Noções de Tecnologia da Informação e Dados' },
  ];

  for (const entry of entries) {
    if (entry.pattern.test(line)) return entry.name;
  }
  return null;
};

const shouldIgnoreLine = (line) => {
  if (!line) return true;
  if (/^\d+$/.test(line)) return true;
  if (/^EDITAL VERTICALIZADO/i.test(line)) return true;
  if (/^CARGO\s+\d+/i.test(line)) return true;
  if (/^CONHECIMENTOS GERAIS/i.test(line)) return true;
  if (/^CONHECIMENTOS ESPEC[ÍI]FICOS/i.test(line)) {
    return !/REGIMENTOS E C[ÓO]DIGO DE [ÉE]TICA/i.test(line);
  }
  if (!/\d/.test(line) && line === line.toUpperCase() && line.length > 3) {
    return true;
  }
  return false;
};

const normalizeLine = (line) => line.replace(/\s+/g, ' ').trim();

const cleanTopicText = (value) =>
  value
    .replace(/\s+/g, ' ')
    .replace(/^[.;:]+/g, '')
    .replace(/[.;:]+$/g, '')
    .trim();

const parseNumberedItems = (text) => {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) return [];

  const regex = /(\d+(?:\.\d+)*)(?:\s*[.)])\s*/g;
  const matches = Array.from(normalized.matchAll(regex));
  if (!matches.length) return [];

  const topics = [];
  let current = null;

  matches.forEach((match, idx) => {
    const number = match[1];
    const start = (match.index || 0) + match[0].length;
    const end = idx + 1 < matches.length ? matches[idx + 1].index : normalized.length;
    const raw = normalized.slice(start, end).trim();
    const content = cleanTopicText(raw);
    if (!content || content.length < 3) return;

    const level = number.split('.').length;
    if (level === 1) {
      current = { nome: content, subtopicos: [] };
      topics.push(current);
      return;
    }
    if (current) {
      current.subtopicos.push(content);
    }
  });

  return topics;
};

async function main() {
  const absPath = path.resolve(process.cwd(), filePath);
  const raw = fs.readFileSync(absPath, 'utf8');
  const lines = raw.split(/\r?\n/).map((line) => normalizeLine(line)).filter(Boolean);
  const blocks = new Map();
  let current = null;

  for (const line of lines) {
    const discipline = resolveDiscipline(line);
    if (discipline) {
      current = discipline;
      if (!blocks.has(current)) blocks.set(current, []);
      continue;
    }
    if (shouldIgnoreLine(line)) continue;
    if (!current) continue;
    blocks.get(current).push(line);
  }

  const disciplinas = [];
  const conteudoProgramatico = {};
  let totalTopics = 0;
  let totalSubtopics = 0;

  for (const [disciplina, entries] of blocks.entries()) {
    const text = entries.join(' ');
    const topics = parseNumberedItems(text);
    if (!topics.length) continue;
    const topicNames = topics.map((topic) => topic.nome);
    disciplinas.push({ nome: disciplina, topicos: topicNames });
    conteudoProgramatico[disciplina] = { topicos: topics };

    totalTopics += topics.length;
    totalSubtopics += topics.reduce((sum, topic) => sum + (topic.subtopicos?.length || 0), 0);
  }

  const summary = {
    editalId,
    disciplinas: disciplinas.length,
    totalTopics,
    totalSubtopics,
  };

  console.log(JSON.stringify(summary, null, 2));
  if (!confirm) {
    console.log('Dry run only. Re-run with --confirm to apply.');
    process.exit(0);
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query(
      `
      UPDATE editais
      SET conteudo_programatico = $1::jsonb,
          disciplinas = $2::jsonb,
          updated_at = NOW()
      WHERE id = $3
      `,
      [JSON.stringify(conteudoProgramatico), JSON.stringify(disciplinas), editalId]
    );
    console.log('Conteudo programatico atualizado.');
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
