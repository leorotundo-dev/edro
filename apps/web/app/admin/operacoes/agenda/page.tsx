import { redirect } from 'next/navigation';

export const metadata = { title: 'Agenda | Central de Operações | Edro Studio' };

export default function Page() {
  redirect('/admin/operacoes/semana?view=calendar');
}
