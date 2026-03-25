import type { Metadata } from 'next';
import DaBillingClient from './DaBillingClient';

export const metadata: Metadata = { title: 'Cobrança de DAs' };

export default function DaBillingPage() {
  return <DaBillingClient />;
}
