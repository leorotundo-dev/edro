import type { CollectorResult, Platform, RawMention } from './types';

export abstract class BaseCollector {
  protected platform: Platform;

  constructor(platform: Platform) {
    this.platform = platform;
  }

  abstract collect(keyword: string, limit?: number, cursor?: string): Promise<CollectorResult>;

  protected abstract normalize(data: any): RawMention | null;

  protected generateId(platformId: string) {
    return `${this.platform}-${platformId}`;
  }
}
