'use client';

import ClientAnalyticsCore from '../ClientAnalyticsCore';

type RoiRetainerSectionProps = {
  clientId: string;
};

export default function RoiRetainerSection({ clientId }: RoiRetainerSectionProps) {
  return <ClientAnalyticsCore clientId={clientId} forcedTab={7} compact />;
}
