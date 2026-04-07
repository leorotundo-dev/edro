import ColaboradorProfileClient from './ColaboradorProfileClient';

export const metadata = { title: 'Perfil do Colaborador | Edro Studio' };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ColaboradorProfileClient id={id} />;
}
