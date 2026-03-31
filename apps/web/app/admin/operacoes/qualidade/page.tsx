import QualidadeWorkspaceClient from './QualidadeWorkspaceClient';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Qualidade | Central de Operações | Edro Studio' };

export default function QualidadePage() {
  return <QualidadeWorkspaceClient />;
}
