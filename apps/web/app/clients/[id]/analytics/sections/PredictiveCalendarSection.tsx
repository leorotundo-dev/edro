'use client';

import ClientAnalyticsCore from '../ClientAnalyticsCore';

type PredictiveCalendarSectionProps = {
  clientId: string;
};

export default function PredictiveCalendarSection({ clientId }: PredictiveCalendarSectionProps) {
  return <ClientAnalyticsCore clientId={clientId} forcedTab={8} compact />;
}
