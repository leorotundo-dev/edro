import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default function CalibracaoPage() {
  redirect('/admin/operacoes/qualidade?tab=calibracao');
}
