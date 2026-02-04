import { redirect } from 'next/navigation';

export default function Page({ params }: { params: { id: string } }) {
  const query = params?.id ? `?clientId=${params.id}` : '';
  redirect(`/studio${query}`);
}
