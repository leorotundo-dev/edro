import WhatsAppClientTab from './WhatsAppClientTab';

export default function ClientWhatsAppPage({ params }: { params: { id: string } }) {
  return <WhatsAppClientTab clientId={params.id} />;
}
