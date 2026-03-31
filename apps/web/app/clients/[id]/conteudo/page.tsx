import { redirect } from 'next/navigation';

type ContentPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ClientContentRedirect({ params }: ContentPageProps) {
  const { id } = await params;
  redirect(`/clients/${id}/identidade?sub=editorial`);
}
