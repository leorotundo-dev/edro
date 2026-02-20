'use client';

import ClientAnalyticsCore from '../ClientAnalyticsCore';

type BenchmarkSectionProps = {
  clientId: string;
};

export default function BenchmarkSection({ clientId }: BenchmarkSectionProps) {
  return <ClientAnalyticsCore clientId={clientId} forcedTab={4} compact />;
}
