import { redirect } from 'next/navigation';

export const metadata = { title: 'Alocação | Central de Operações | Edro Studio' };

export default function Page() {
  redirect('/admin/operacoes/semana?view=distribution');
}
