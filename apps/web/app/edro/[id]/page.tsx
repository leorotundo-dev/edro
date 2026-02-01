import BriefingDetailClient from './BriefingDetailClient';

type Props = {
  params: { id: string };
};

export default function Page({ params }: Props) {
  return <BriefingDetailClient briefingId={params.id} />;
}
