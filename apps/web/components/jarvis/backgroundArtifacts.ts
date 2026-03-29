import type { Artifact } from './ArtifactCard';

type MessageWithArtifacts = {
  artifacts?: Artifact[];
};

export function collectPendingBackgroundJobIds(messages: MessageWithArtifacts[]): string[] {
  const ids = new Set<string>();
  for (const message of messages) {
    for (const artifact of message.artifacts || []) {
      const jobId = String((artifact as any).background_job_id || '').trim();
      const status = String((artifact as any).job_status || '').trim().toLowerCase();
      if (jobId && (status === 'queued' || status === 'processing')) {
        ids.add(jobId);
      }
    }
  }
  return Array.from(ids.values());
}

export function mergeBackgroundArtifactUpdate<T extends MessageWithArtifacts>(messages: T[], artifact: Artifact): T[] {
  const backgroundJobId = String((artifact as any).background_job_id || '').trim();
  if (!backgroundJobId) return messages;

  return messages.map((message) => {
    if (!message.artifacts?.length) return message;
    let changed = false;
    const nextArtifacts = message.artifacts.map((item) => {
      if (String((item as any).background_job_id || '').trim() !== backgroundJobId) return item;
      changed = true;
      return {
        ...item,
        ...artifact,
        background_job_id: backgroundJobId,
      };
    });
    return changed ? { ...message, artifacts: nextArtifacts } : message;
  });
}
