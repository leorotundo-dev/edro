import type { Metadata } from 'next';
import BriefingFormClient from './BriefingFormClient';

export const metadata: Metadata = { title: 'Briefing Inteligente' };

export default async function BriefingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <BriefingFormClient jobId={id} />;
}
