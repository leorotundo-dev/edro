import { redirect } from 'next/navigation';

export const metadata = { title: 'Financeiro | Edro' };

export default function Page() {
  redirect('/admin/financeiro');
}
