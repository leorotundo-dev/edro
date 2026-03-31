import { redirect } from 'next/navigation';

type IntegrationsPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ClientIntegrationsRedirect({ params }: IntegrationsPageProps) {
  const { id } = await params;
  redirect(`/clients/${id}/identidade?sub=config`);
}
