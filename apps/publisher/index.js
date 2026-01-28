import Fastify from 'fastify';

const app = Fastify({ logger: true });

app.post('/publish', async (request, reply) => {
  const job = request.body || {};

  // TODO: plug real providers (Meta, LinkedIn, etc).
  const result = { ok: true, provider: job.provider, external_id: `ext_${job.jobId}` };

  if (job.callback_url) {
    await fetch(job.callback_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GATEWAY_SHARED_SECRET || ''}`,
      },
      body: JSON.stringify({ jobId: job.jobId, status: 'published', result }),
    });
  }

  return reply.send({ accepted: true, result });
});

app.listen({ port: 4444, host: '0.0.0.0' });
