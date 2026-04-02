import { redirect } from 'next/navigation';

// Legacy URL: /jobs/[id] → canonical: /pedidos/[id]
export default function JobsIdRedirect({ params }: { params: { id: string } }) {
  redirect(`/pedidos/${params.id}`);
}
