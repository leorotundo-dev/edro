import ClientInsightsClient from './ClientInsightsClient';

type ClientInsightsPageProps = {
  params: Promise<{ id: string }>;
};

export default async function Page({ params }: ClientInsightsPageProps) {
  const { id } = await params;
  return <ClientInsightsClient clientId={id} />;
}
