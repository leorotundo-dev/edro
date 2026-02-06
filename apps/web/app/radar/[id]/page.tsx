import ClippingDetailClient from '@/app/clipping/ClippingDetailClient';
import { redirect } from 'next/navigation';

type RadarDetailPageProps = {
  params: { id: string };
};

export default function RadarDetailPage({ params }: RadarDetailPageProps) {
  // Backwards compatible alias:
  // - /radar/<uuid>  -> clipping item detail
  // - /radar/<clientId> -> client-scoped radar listing
  const raw = String(params.id || '').trim();
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(raw);

  if (isUuid) {
    redirect(`/clipping/${raw}`);
  }

  const lower = raw.toLowerCase();
  if (!raw || lower === 'undefined' || lower === 'null') {
    redirect('/clipping');
  }

  redirect(`/clipping?clientId=${encodeURIComponent(raw)}`);

  // Unreachable; keeps TS happy if redirect is ever stubbed.
  return <ClippingDetailClient itemId={params.id} />;
}
