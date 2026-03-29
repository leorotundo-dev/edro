type JobQueueRecord = {
  id: string;
  type: string;
  status: string;
  error_message?: string | null;
  payload?: Record<string, any> | null;
};

function deriveBriefingTitle(request: string, explicitTitle?: string | null) {
  const trimmed = String(explicitTitle || '').trim();
  if (trimmed) return trimmed.slice(0, 120);
  const normalized = String(request || '').replace(/\s+/g, ' ').trim();
  if (!normalized) return 'Novo post';
  return normalized.length > 72 ? `${normalized.slice(0, 71)}…` : normalized;
}

function buildQueuedPostArtifact(job: JobQueueRecord) {
  const payload = job.payload || {};
  const args = payload.args || {};
  const clientName = String(payload.client_name || '').trim();
  const baseMessage = clientName
    ? `Pipeline criativo enfileirado para ${clientName}.`
    : 'Pipeline criativo enfileirado.';

  return {
    type: 'create_post_pipeline',
    background_job_id: job.id,
    job_status: job.status === 'processing' ? 'processing' : 'queued',
    briefing_title: deriveBriefingTitle(String(args.request || ''), args.title),
    platform: String(args.platform || 'instagram'),
    format: String(args.format || 'post'),
    message: job.status === 'processing'
      ? 'O Jarvis está montando briefing, copy e sessão criativa no Studio.'
      : baseMessage,
    next_step: job.status === 'processing'
      ? 'Assim que o pipeline terminar, o artifact troca sozinho para o link do Studio.'
      : 'O Jarvis vai criar briefing, copy e sessão criativa em background.',
  };
}

export function buildJarvisBackgroundArtifact(job: JobQueueRecord | null | undefined) {
  if (!job || job.type !== 'jarvis_background') return null;

  const kind = String(job.payload?.kind || '');
  if (kind !== 'create_post_pipeline') return null;

  const base = buildQueuedPostArtifact(job);
  if (job.status === 'done' && job.payload?.result && typeof job.payload.result === 'object') {
    return {
      ...base,
      ...job.payload.result,
      type: 'create_post_pipeline',
      background_job_id: job.id,
      job_status: 'done',
      message: job.payload.result.message || 'Pipeline criativo montado com sucesso.',
    };
  }

  if (job.status === 'failed') {
    return {
      ...base,
      job_status: 'failed',
      message: 'O Jarvis não conseguiu concluir o pipeline criativo.',
      error: job.error_message || String(job.payload?.result_error || 'Falha desconhecida'),
      next_step: 'Ajuste o pedido e tente novamente.',
    };
  }

  return base;
}
