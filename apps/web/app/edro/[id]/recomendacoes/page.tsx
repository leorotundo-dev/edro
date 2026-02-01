import RecomendacoesClient from './RecomendacoesClient';

type Props = {
  params: { id: string };
};

export default function Page({ params }: Props) {
  return <RecomendacoesClient briefingId={params.id} />;
}
