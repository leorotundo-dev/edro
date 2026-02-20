'use client';

import ClientAnalyticsCore from '../ClientAnalyticsCore';

type EstrategistaSectionProps = {
  clientId: string;
};

export default function EstrategistaSection({ clientId }: EstrategistaSectionProps) {
  return <ClientAnalyticsCore clientId={clientId} forcedTab={6} compact />;
}
