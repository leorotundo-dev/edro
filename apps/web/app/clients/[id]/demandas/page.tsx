import ClientDemandasClient from './ClientDemandasClient';

export const dynamic = 'force-dynamic';

export default async function ClientDemandasPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ClientDemandasClient clientId={id} />;
}
