import ReportBuilderClient from './ReportBuilderClient';

export const metadata = { title: 'Construtor de Relatório | Edro Studio' };

export default function Page({
  params,
}: {
  params: Promise<{ clientId: string; month: string }>;
}) {
  return <ReportBuilderClient params={params} />;
}
