import OverviewClient from './OverviewClient';

type ClientPageProps = {
  params: Promise<{ id: string }>;
};

export default async function Page({ params }: ClientPageProps) {
  const { id } = await params;
  return <OverviewClient clientId={id} />;
}
