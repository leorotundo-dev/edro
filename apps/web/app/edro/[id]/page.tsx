import BriefingDetailClient from './BriefingDetailClient';

type Props = {
  params: Promise<{ id: string }>;
};

export default async function Page({ params }: Props) {
  const { id } = await params;
  return <BriefingDetailClient briefingId={id} />;
}
