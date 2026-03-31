import { redirect } from 'next/navigation';
export const dynamic = 'force-dynamic';
export default function SlaPage() {
  redirect('/admin/operacoes/qualidade?tab=sla');
}
