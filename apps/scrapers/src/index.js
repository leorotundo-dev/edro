require('dotenv').config();
const express = require('express');
const cron = require('node-cron');
const { runAllScrapers } = require('./scrapers/run');

const app = express();
app.use(express.json());

const serviceVersion = '0.2.0';
let lastRunAt = null;
let lastResult = null;
let running = false;

async function runScrapers(trigger = 'manual') {
  if (running) {
    return { ok: false, status: 'running' };
  }

  running = true;
  try {
    console.log(`[scrapers] starting run (${trigger})`);
    lastRunAt = new Date().toISOString();
    lastResult = await runAllScrapers();
    console.log('[scrapers] run completed');
    return { ok: true, lastRunAt, total: lastResult?.length ?? 0 };
  } catch (error) {
    console.error('[scrapers] run failed:', error);
    lastResult = { error: error.message || String(error) };
    return { ok: false, error: lastResult.error };
  } finally {
    running = false;
  }
}

app.get('/', (_req, res) => {
  res.json({ ok: true, service: 'scrapers' });
});

app.get('/health', (_req, res) => {
  res.json({ ok: true, running, lastRunAt });
});

app.get('/status', (_req, res) => {
  res.json({ ok: true, running, lastRunAt, lastResult });
});

app.post('/run', async (_req, res) => {
  const result = await runScrapers('http');
  res.status(result.ok ? 200 : 409).json(result);
});

const port = Number(process.env.PORT || 3333);
app.listen(port, () => {
  console.log(`[scrapers] listening on :${port} (v${serviceVersion})`);
});

const cronExpr = process.env.SCRAPER_CRON;
if (cronExpr) {
  cron.schedule(cronExpr, () => {
    runScrapers('cron');
  });
  console.log(`[scrapers] cron scheduled: ${cronExpr}`);
}

if (process.env.SCRAPER_RUN_ON_START === 'true') {
  runScrapers('startup');
}
