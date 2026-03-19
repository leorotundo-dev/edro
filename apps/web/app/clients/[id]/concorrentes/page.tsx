import CompetitorsClient from './CompetitorsClient';

type Props = { params: Promise<{ id: string }> };

export default async function ConcorrentesPage({ params }: Props) {
  const { id } = await params;
  return <CompetitorsClient clientId={id} />;
}
