import StudioFrame from '@/components/StudioFrame';

type StudioSearchParams = {
  client?: string | string[];
  clientId?: string | string[];
  segment?: string | string[];
  location?: string | string[];
  date?: string | string[];
  event?: string | string[];
  score?: string | string[];
  tier?: string | string[];
  tags?: string | string[];
  categories?: string | string[];
  why?: string | string[];
  source?: string | string[];
};

export default function Page({ searchParams }: { searchParams?: StudioSearchParams }) {
  const params = new URLSearchParams();
  const allowedKeys: Array<keyof StudioSearchParams> = [
    'client',
    'clientId',
    'segment',
    'location',
    'date',
    'event',
    'score',
    'tier',
    'tags',
    'categories',
    'why',
    'source',
  ];

  allowedKeys.forEach((key) => {
    const value = searchParams?.[key];
    if (!value) return;
    if (Array.isArray(value)) {
      params.set(key, value.join(', '));
    } else {
      params.set(key, value);
    }
  });

  const query = params.toString();
  const src = query
    ? `/ux/edro_creative_studio_step0/code.html?${query}`
    : '/ux/edro_creative_studio_step0/code.html';

  return <StudioFrame title="Creative Studio Start" src={src} stepLabel="Etapa 0 de 6" />;
}
