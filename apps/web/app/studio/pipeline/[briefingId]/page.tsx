import { redirect } from 'next/navigation';

interface PageProps {
  params: Promise<{ briefingId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function buildEditorRedirect(
  briefingId: string,
  searchParams: Record<string, string | string[] | undefined>
) {
  const params = new URLSearchParams();
  Object.entries(searchParams || {}).forEach(([key, value]) => {
    if (Array.isArray(value)) value.forEach((item) => params.append(key, item));
    else if (typeof value === 'string') params.set(key, value);
  });
  params.set('mode', 'pipeline');
  params.set('briefingId', briefingId);
  return `/studio/editor?${params.toString()}`;
}

export default async function PipelinePage({ params, searchParams }: PageProps) {
  const { briefingId } = await params;
  redirect(buildEditorRedirect(briefingId, await searchParams));
}
