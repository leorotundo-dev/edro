import ClientInsightsClient from './ClientInsightsClient';

type ClientInsightsPageProps = {
  params: { id: string };
};

export default function Page({ params }: ClientInsightsPageProps) {
  return <ClientInsightsClient clientId={params.id} />;
}
