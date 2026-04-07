import JobDetailClient from './JobDetailClient';

export const metadata = { title: 'Detalhe do Job | Edro Studio' };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <JobDetailClient id={id} />;
}
