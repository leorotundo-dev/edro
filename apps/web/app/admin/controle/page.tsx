import { redirect } from 'next/navigation';

export const metadata = { title: 'Central de Controle | Edro' };

export default function Page() {
  redirect('/admin/system?tab=overview');
}
