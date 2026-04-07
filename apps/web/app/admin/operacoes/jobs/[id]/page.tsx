import JobDetailClient from './JobDetailClient';

export const metadata = { title: 'Detalhe do Job | Edro Studio' };

export default function Page({ params }: { params: { id: string } }) {
  return <JobDetailClient id={params.id} />;
}
