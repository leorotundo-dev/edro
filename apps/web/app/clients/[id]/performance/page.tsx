import ClientPerformanceClient from './ClientPerformanceClient';

type ClientPerformancePageProps = {
  params: { id: string };
};

export default function Page({ params }: ClientPerformancePageProps) {
  return <ClientPerformanceClient clientId={params.id} />;
}
