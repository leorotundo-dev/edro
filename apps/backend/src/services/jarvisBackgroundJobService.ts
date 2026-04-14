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

function parseWorkflowSteps(workflowJson: string) {
  try {
    const parsed = JSON.parse(workflowJson);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function buildQueuedWorkflowArtifact(job: JobQueueRecord) {
  const payload = job.payload || {};
  const args = payload.args || {};
  const workflowJson = String(args.workflow_json || '');
  const steps = parseWorkflowSteps(workflowJson);
  const resumeFromStep = Math.max(1, Number(args.resume_from_step || 1));
  const retryScheduledFor = String(payload.retry_scheduled_for || '').trim();
  const retryError = String(payload.last_failure_error || '').trim();
  const queuedForRetry = job.status === 'queued' && !!retryScheduledFor;

  return {
    type: 'execute_multi_step_workflow',
    background_job_id: job.id,
    job_status: job.status === 'processing' ? 'processing' : 'queued',
    workflow_id: String(args.workflow_id || '').trim() || null,
    workflow_state_version: Number(args.workflow_state_version || 0) || 0,
    workflow_status: job.status === 'processing' ? 'running' : 'queued',
    workflow_json: workflowJson || null,
    steps_total: steps.length,
    completed_steps: Math.max(0, resumeFromStep - 1),
    resume_from_step: resumeFromStep,
    message: job.status === 'processing'
      ? 'O Jarvis está executando o workflow em background.'
      : queuedForRetry
      ? 'O Jarvis vai tentar novamente este workflow automaticamente em background.'
      : 'Workflow enfileirado para execução em background.',
    next_step: job.status === 'processing'
      ? 'Assim que o workflow terminar, este artifact troca sozinho para o resultado final.'
      : queuedForRetry
      ? 'Assim que o cooldown terminar, o Jarvis retoma o workflow sozinho.'
      : 'O Jarvis vai executar o fluxo em background e atualizar este card sozinho.',
    retry_after_at: retryScheduledFor || null,
    last_error: retryError || null,
  };
}

function buildWorkflowActionArgs(artifact: Record<string, any>) {
  const workflowJson = String(artifact.workflow_json || '').trim();
  const workflowId = String(artifact.workflow_id || '').trim();
  const workflowStateVersion = Number(artifact.workflow_state_version || 0) || 0;
  if (!workflowJson || !workflowId || workflowStateVersion <= 0) return null;

  return {
    workflow_json: workflowJson,
    workflow_id: workflowId,
    workflow_state_version: workflowStateVersion,
    resume_from_step: Math.max(1, Number(artifact.resume_from_step || (artifact.completed_steps || 0) + 1)),
  };
}

export function buildJarvisBackgroundArtifact(job: JobQueueRecord | null | undefined) {
  if (!job || job.type !== 'jarvis_background') return null;

  const kind = String(job.payload?.kind || '');
  const base = kind === 'execute_multi_step_workflow'
    ? buildQueuedWorkflowArtifact(job)
    : kind === 'create_post_pipeline'
    ? buildQueuedPostArtifact(job)
    : null;
  if (!base) return null;
  if (job.status === 'done' && job.payload?.result && typeof job.payload.result === 'object') {
    return {
      ...base,
      ...job.payload.result,
      type: kind === 'execute_multi_step_workflow' ? 'execute_multi_step_workflow' : 'create_post_pipeline',
      background_job_id: job.id,
      job_status: 'done',
      message: job.payload.result.message || (kind === 'execute_multi_step_workflow'
        ? 'Workflow concluído com sucesso.'
        : 'Pipeline criativo montado com sucesso.'),
    };
  }

  if (job.status === 'failed') {
    const cancelledAt = String(job.payload?.cancelled_at || '').trim();
    const cancelled = !!cancelledAt;
    const failedArtifact = {
      ...base,
      ...(job.payload?.result && typeof job.payload.result === 'object' ? job.payload.result : {}),
      job_status: cancelled ? 'cancelled' : 'failed',
      workflow_status: cancelled && kind === 'execute_multi_step_workflow' ? 'cancelled' : (base as any).workflow_status,
      message: cancelled
        ? 'O Jarvis cancelou este workflow antes da execução.'
        : kind === 'execute_multi_step_workflow'
        ? 'O Jarvis não conseguiu concluir o workflow em background.'
        : 'O Jarvis não conseguiu concluir o pipeline criativo.',
      error: cancelled
        ? 'Workflow cancelado manualmente antes da execução.'
        : job.error_message || String(job.payload?.result_error || 'Falha desconhecida'),
      next_step: cancelled
        ? 'Se precisar, reexecute o workflow a partir do Jarvis.'
        : kind === 'execute_multi_step_workflow'
        ? 'Revise a falha do workflow e siga a próxima ação sugerida.'
        : 'Ajuste o pedido e tente novamente.',
    };
    const workflowActionArgs = kind === 'execute_multi_step_workflow'
      ? buildWorkflowActionArgs(failedArtifact)
      : null;

    return {
      ...failedArtifact,
      retry_tool_args: failedArtifact.retry_tool_args || (
        failedArtifact.can_retry_now === true
          ? workflowActionArgs
          : null
      ),
      requeue_tool_args: failedArtifact.requeue_tool_args || (
        failedArtifact.is_dead_letter === true && workflowActionArgs
          ? { ...workflowActionArgs, manual_requeue: true }
          : null
      ),
    };
  }

  return base;
}
