import { Metadata } from 'next';
import AdminCampanhasClient from './AdminCampanhasClient';

export const metadata: Metadata = { title: 'Campanhas — Edro.Digital' };

export default function AdminCampanhasPage() {
  return <AdminCampanhasClient />;
}
