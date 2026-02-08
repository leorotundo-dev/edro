const fs = require('fs');
const raw = fs.readFileSync('/tmp/radar-cuiaba.json','utf8');
const j = JSON.parse(raw);
console.log({ client_id: j.client_id, categories: j.categories?.length, sources: j.categories?.[0]?.sources?.length });
