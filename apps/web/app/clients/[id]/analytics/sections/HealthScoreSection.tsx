'use client';

import ClientAnalyticsCore from '../ClientAnalyticsCore';

type HealthScoreSectionProps = {
  clientId: string;
};

export default function HealthScoreSection({ clientId }: HealthScoreSectionProps) {
  return <ClientAnalyticsCore clientId={clientId} forcedTab={0} compact />;
}

