import { redirect } from 'next/navigation';

type LibraryPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ClientLibraryRedirect({ params }: LibraryPageProps) {
  const { id } = await params;
  redirect(`/clients/${id}/identidade?sub=biblioteca`);
}
