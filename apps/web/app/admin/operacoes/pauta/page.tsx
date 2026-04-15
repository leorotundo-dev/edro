import type { Metadata } from 'next';
import PautaInboxClient from './PautaInboxClient';

export const metadata: Metadata = { title: 'Pauta Inbox — Edro' };

export default function PautaInboxPage() {
  return <PautaInboxClient />;
}
