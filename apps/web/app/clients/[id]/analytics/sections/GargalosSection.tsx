'use client';

import ClientAnalyticsCore from '../ClientAnalyticsCore';

type GargalosSectionProps = {
  clientId: string;
};

export default function GargalosSection({ clientId }: GargalosSectionProps) {
  return <ClientAnalyticsCore clientId={clientId} forcedTab={1} compact />;
}

