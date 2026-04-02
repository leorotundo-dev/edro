import { redirect } from 'next/navigation';

// Legacy URL: /jobs/[id] → canonical: /pedidos/[id]
export default async function JobsIdRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/pedidos/${id}`);
}
