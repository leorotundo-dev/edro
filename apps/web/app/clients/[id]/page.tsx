import OverviewClient from './OverviewClient';

type ClientPageProps = {
  params: { id: string };
};

export default function Page({ params }: ClientPageProps) {
  return <OverviewClient clientId={params.id} />;
}
