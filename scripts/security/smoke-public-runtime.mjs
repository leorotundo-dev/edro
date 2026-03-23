function parseArgs(argv) {
  const args = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;

    const key = token.slice(2);
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) {
      args[key] = 'true';
      continue;
    }

    args[key] = value;
    index += 1;
  }

  return args;
}

function normalizeBaseUrl(value) {
  if (!value) return null;
  return String(value).trim().replace(/\/$/, '');
}

function ensureHeader(headers, name, issues, label) {
  if (!headers.get(name)) {
    issues.push(`${label}: header ausente ${name}`);
  }
}

async function expectJsonEndpoint({ label, url, init, expectedStatus, headerChecks = [] }) {
  const response = await fetch(url, init);
  if (response.status !== expectedStatus) {
    throw new Error(`${label}: status esperado ${expectedStatus}, recebido ${response.status}`);
  }

  for (const headerName of headerChecks) {
    ensureHeader(response.headers, headerName, [], label);
  }

  return response;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const backendUrl = normalizeBaseUrl(args['backend-url'] || process.env.EDRO_BACKEND_URL || process.env.PUBLIC_API_URL);
  const webUrl = normalizeBaseUrl(args['web-url'] || process.env.WEB_URL);
  const clienteUrl = normalizeBaseUrl(args['cliente-url'] || process.env.NEXT_PUBLIC_CLIENTE_URL);
  const freelancerUrl = normalizeBaseUrl(args['freelancer-url'] || process.env.NEXT_PUBLIC_FREELANCER_URL);

  const issues = [];
  const checks = [];

  if (!backendUrl) {
    issues.push('backend-url é obrigatório.');
  }
  if (!webUrl) {
    issues.push('web-url é obrigatório.');
  }
  if (!clienteUrl) {
    issues.push('cliente-url é obrigatório.');
  }
  if (!freelancerUrl) {
    issues.push('freelancer-url é obrigatório.');
  }

  if (issues.length) {
    console.error(`Security smoke aborted:\n- ${issues.join('\n- ')}`);
    process.exit(1);
  }

  const securityHeaders = [
    'content-security-policy',
    'referrer-policy',
    'x-content-type-options',
    'x-frame-options',
    'permissions-policy',
  ];

  try {
    const backendHealth = await fetch(`${backendUrl}/health`);
    if (backendHealth.status !== 200) {
      throw new Error(`backend health: status esperado 200, recebido ${backendHealth.status}`);
    }
    for (const headerName of securityHeaders) {
      ensureHeader(backendHealth.headers, headerName, issues, 'backend health');
    }
    checks.push('backend /health -> 200 + headers');

    const pgvector = await fetch(`${backendUrl}/_temp/pgvector-check`);
    if (pgvector.status !== 404) {
      throw new Error(`pgvector temp endpoint: status esperado 404, recebido ${pgvector.status}`);
    }
    checks.push('backend /_temp/pgvector-check -> 404');

    const evolution = await fetch(`${backendUrl}/webhook/evolution`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    });
    if (evolution.status !== 401) {
      throw new Error(`webhook evolution unsigned: status esperado 401, recebido ${evolution.status}`);
    }
    checks.push('backend /webhook/evolution unsigned -> 401');

    const recall = await fetch(`${backendUrl}/webhook/recall`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    });
    if (recall.status !== 401) {
      throw new Error(`webhook recall unsigned: status esperado 401, recebido ${recall.status}`);
    }
    checks.push('backend /webhook/recall unsigned -> 401');

    const webSession = await fetch(`${webUrl}/api/auth/session`);
    if (webSession.status !== 401) {
      throw new Error(`web session: status esperado 401, recebido ${webSession.status}`);
    }
    for (const headerName of securityHeaders) {
      ensureHeader(webSession.headers, headerName, issues, 'web session');
    }
    checks.push('web /api/auth/session -> 401 + headers');

    const clientSession = await fetch(`${clienteUrl}/api/auth/session`);
    if (clientSession.status !== 401) {
      throw new Error(`client portal session: status esperado 401, recebido ${clientSession.status}`);
    }
    checks.push('web-cliente /api/auth/session -> 401');

    const freelancerSession = await fetch(`${freelancerUrl}/api/auth/session`);
    if (freelancerSession.status !== 401) {
      throw new Error(`freelancer portal session: status esperado 401, recebido ${freelancerSession.status}`);
    }
    checks.push('web-freelancer /api/auth/session -> 401');
  } catch (error) {
    console.error(`Security smoke failed: ${error.message}`);
    process.exit(1);
  }

  if (issues.length) {
    console.error('Security smoke found header issues:');
    for (const issue of issues) {
      console.error(`- ${issue}`);
    }
    process.exit(1);
  }

  console.log('Security smoke passed.');
  for (const check of checks) {
    console.log(`- ${check}`);
  }
}

main().catch((error) => {
  console.error(`Security smoke failed: ${error.message}`);
  process.exit(1);
});
