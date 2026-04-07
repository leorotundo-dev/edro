import ColaboradorProfileClient from './ColaboradorProfileClient';

export const metadata = { title: 'Perfil do Colaborador | Edro Studio' };

export default function Page({ params }: { params: { id: string } }) {
  return <ColaboradorProfileClient id={params.id} />;
}
