import ClippingDetailClient from '@/app/clipping/ClippingDetailClient';

type RadarDetailPageProps = {
  params: { id: string };
};

export default function RadarDetailPage({ params }: RadarDetailPageProps) {
  return <ClippingDetailClient itemId={params.id} />;
}
