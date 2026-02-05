'use client';

import InsightsClient from '@/app/insights/InsightsClient';

type ClientInsightsClientProps = {
  clientId: string;
};

export default function ClientInsightsClient({ clientId }: ClientInsightsClientProps) {
  return <InsightsClient clientId={clientId} noShell embedded />;
}
