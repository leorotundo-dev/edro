import { redirect } from 'next/navigation';

export const metadata = { title: 'Pessoas | Edro Studio' };

export default function Page() {
  redirect('/admin/pessoas?view=colaboradores');
}
