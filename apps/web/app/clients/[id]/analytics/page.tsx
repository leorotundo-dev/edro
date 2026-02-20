'use client';

import ClientAnalyticsCore from './ClientAnalyticsCore';

type ClientAnalyticsPageProps = {
  clientId?: string;
  forcedTab?: number;
  compact?: boolean;
};

export default function ClientAnalyticsPage(props: ClientAnalyticsPageProps) {
  return <ClientAnalyticsCore {...props} />;
}
