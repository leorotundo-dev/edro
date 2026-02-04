import { redirect } from 'next/navigation';

export default function ClientCreatePage() {
  redirect('/clients?new=1');
}
