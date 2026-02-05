import { redirect } from 'next/navigation';

type StudioSearchParams = {
  client?: string | string[];
  clientId?: string | string[];
  clientIds?: string | string[];
  clients?: string | string[];
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
  objective?: string | string[];
  message?: string | string[];
  tone?: string | string[];
  notes?: string | string[];
  productionType?: string | string[];
  production_type?: string | string[];
};

export default function Page({ searchParams }: { searchParams?: StudioSearchParams }) {
  const params = new URLSearchParams();
  const allowedKeys: Array<keyof StudioSearchParams> = [
    'client',
    'clientId',
    'clientIds',
    'clients',
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
    'objective',
    'message',
    'tone',
    'notes',
    'productionType',
    'production_type',
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
  redirect(query ? `/studio/brief?${query}` : '/studio/brief');
}
