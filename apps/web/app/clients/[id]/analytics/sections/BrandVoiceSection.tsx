'use client';

import ClientAnalyticsCore from '../ClientAnalyticsCore';

type BrandVoiceSectionProps = {
  clientId: string;
};

export default function BrandVoiceSection({ clientId }: BrandVoiceSectionProps) {
  return <ClientAnalyticsCore clientId={clientId} forcedTab={3} compact />;
}
