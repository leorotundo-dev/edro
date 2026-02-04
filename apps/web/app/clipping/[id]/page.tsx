import ClippingDetailClient from '../ClippingDetailClient';

type ClippingDetailPageProps = {
  params: { id: string };
};

export default function ClippingDetailPage({ params }: ClippingDetailPageProps) {
  return <ClippingDetailClient itemId={params.id} />;
}
