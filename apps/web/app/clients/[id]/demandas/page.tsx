import ClientDemandasClient from './ClientDemandasClient';

export const dynamic = 'force-dynamic';

export default function ClientDemandasPage({ params }: { params: { id: string } }) {
  return <ClientDemandasClient clientId={params.id} />;
}
