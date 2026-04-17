import { redirect } from 'next/navigation';

type SearchParams = Record<string, string | string[] | undefined>;

function buildEditorRedirect(mode: string, searchParams: SearchParams) {
  const params = new URLSearchParams();
  Object.entries(searchParams || {}).forEach(([key, value]) => {
    if (Array.isArray(value)) value.forEach((item) => params.append(key, item));
    else if (typeof value === 'string') params.set(key, value);
  });
  params.set('mode', mode);
  return `/studio/editor?${params.toString()}`;
}

export default async function StudioReviewPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  redirect(buildEditorRedirect('review', await searchParams));
}
