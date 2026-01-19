export interface HarvestSource {
  id: string;
  name: string;
  baseUrl: string;
  enabled: boolean;
}

export function listEnabledSources(sources: HarvestSource[]): HarvestSource[] {
  return sources.filter((s) => s.enabled);
}
