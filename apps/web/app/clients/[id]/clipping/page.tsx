import ClientClippingClient from './ClientClippingClient';

type ClientRadarPageProps = {
  params: { id: string };
};

export default function Page({ params }: ClientRadarPageProps) {
  return <ClientClippingClient clientId={params.id} />;
}
