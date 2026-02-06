import ClippingDetailClient from '../ClippingDetailClient';
import { redirect } from 'next/navigation';

type ClippingDetailPageProps = {
  params: { id: string };
};

export default function ClippingDetailPage({ params }: ClippingDetailPageProps) {
  // Guard against accidental navigation to /clipping/undefined (or other non-UUID ids),
  // which used to trigger a backend 500 when passed to the item detail endpoint.
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(params.id || ''));
  if (!isUuid) {
    redirect('/clipping');
  }
  return <ClippingDetailClient itemId={params.id} />;
}
