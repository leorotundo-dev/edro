import ClippingDetailClient from '../ClippingDetailClient';
import { redirect } from 'next/navigation';

type ClippingDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ClippingDetailPage({ params }: ClippingDetailPageProps) {
  const { id } = await params;
  // Guard against accidental navigation to /clipping/undefined (or other non-UUID ids),
  // which used to trigger a backend 500 when passed to the item detail endpoint.
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(id || ''));
  if (!isUuid) {
    redirect('/clipping');
  }
  return <ClippingDetailClient itemId={id} />;
}
