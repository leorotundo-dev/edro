import https from 'https';
import http from 'http';

const DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
  'Connection': 'keep-alive',
};

const JINA_PREFIX = 'https://r.jina.ai/http://';

function isJinaUrl(url: string): boolean {
  return url.startsWith('https://r.jina.ai/');
}

function buildJinaUrl(original: string): string {
  const parsed = new URL(original);
  return `${JINA_PREFIX}${parsed.host}${parsed.pathname}${parsed.search}`;
}

function shouldFallbackToJina(url: string, statusCode?: number): boolean {
  if (!statusCode) return false;
  if (isJinaUrl(url)) return false;
  if (![403, 429, 451].includes(statusCode)) return false;
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return hostname.includes('jcconcursos.com.br');
  } catch {
    return false;
  }
}

export async function fetchHtml(url: string, redirectDepth = 0): Promise<string> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const client = parsed.protocol === 'http:' ? http : https;

    const req = client.get(url, { headers: DEFAULT_HEADERS }, (res) => {
      // Follow simple redirects (limited depth)
      if (
        res.statusCode &&
        [301, 302, 303, 307, 308].includes(res.statusCode) &&
        res.headers.location &&
        redirectDepth < 3
      ) {
        const nextUrl = new URL(res.headers.location, url).toString();
        res.resume();
        resolve(fetchHtml(nextUrl, redirectDepth + 1));
        return;
      }

      if (!res.statusCode || res.statusCode >= 400) {
        if (shouldFallbackToJina(url, res.statusCode)) {
          const jinaUrl = buildJinaUrl(url);
          res.resume();
          resolve(fetchHtml(jinaUrl, redirectDepth + 1));
          return;
        }
        reject(new Error(`[harvest] Erro ao buscar URL ${url}: ${res.statusCode} ${res.statusMessage}`));
        return;
      }

      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve(data));
    });

    req.on('error', (err) => {
      reject(new Error(`[harvest] Erro ao buscar URL ${url}: ${err.message}`));
    });
  });
}
