'use client';

import ClientAnalyticsCore from '../ClientAnalyticsCore';

type ContentGapSectionProps = {
  clientId: string;
};

export default function ContentGapSection({ clientId }: ContentGapSectionProps) {
  return <ClientAnalyticsCore clientId={clientId} forcedTab={5} compact />;
}
