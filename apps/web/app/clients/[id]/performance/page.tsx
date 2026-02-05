import ClientPerformanceClient from './ClientPerformanceClient';

type ClientPerformancePageProps = {
  params: Promise<{ id: string }>;
};

export default async function Page({ params }: ClientPerformancePageProps) {
  const { id } = await params;
  return <ClientPerformanceClient clientId={id} />;
}
