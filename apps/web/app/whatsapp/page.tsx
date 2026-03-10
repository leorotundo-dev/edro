import { Metadata } from 'next';
import WhatsAppInboxClient from './WhatsAppInboxClient';

export const metadata: Metadata = { title: 'WhatsApp — Edro' };

export default function WhatsAppPage() {
  return <WhatsAppInboxClient />;
}
