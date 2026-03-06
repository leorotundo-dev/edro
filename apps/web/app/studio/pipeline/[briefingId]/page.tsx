import PipelineStudio from './PipelineStudio';

interface PageProps {
  params: Promise<{ briefingId: string }>;
}

export default async function PipelinePage({ params }: PageProps) {
  const { briefingId } = await params;
  return <PipelineStudio briefingId={briefingId} />;
}
