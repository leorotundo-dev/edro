'use client';

import ClientAnalyticsCore from '../ClientAnalyticsCore';

type ProofOfValueSectionProps = {
  clientId: string;
};

export default function ProofOfValueSection({ clientId }: ProofOfValueSectionProps) {
  return <ClientAnalyticsCore clientId={clientId} forcedTab={2} compact />;
}

