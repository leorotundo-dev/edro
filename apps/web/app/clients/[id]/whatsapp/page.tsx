import WhatsAppClientTab from './WhatsAppClientTab';

type Props = { params: Promise<{ id: string }> };

export default async function ClientWhatsAppPage({ params }: Props) {
  const { id } = await params;
  return <WhatsAppClientTab clientId={id} />;
}
