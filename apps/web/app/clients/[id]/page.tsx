import { redirect } from 'next/navigation';

type ClientPageProps = {
  params: Promise<{ id: string }>;
};

export default async function Page({ params }: ClientPageProps) {
  const { id } = await params;
  redirect(`/clients/${id}/operacao`);
}
