'use client';

import useSWR from 'swr';
import { swrFetcher } from '@/lib/api';
import Link from 'next/link';

type ClientMe = {
  id: string;
  name: string;
  status: string;
};

type Job = {
  id: string;
  title: string;
  status: string;
  updated_at: string;
};

type Invoice = {
  id: string;
  description: string;
  amount_brl: string;
  status: string;
  due_date: string | null;
};

function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-BR');
}

function brl(val: string) {
  return parseFloat(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function DashboardPage() {
  const { data: me } = useSWR<{ client: ClientMe }>('/portal/client/me', swrFetcher);
  const { data: jobsData } = useSWR<{ jobs: Job[] }>('/portal/client/jobs?limit=3', swrFetcher);
  const { data: invData } = useSWR<{ invoices: Invoice[] }>('/portal/client/invoices?limit=1', swrFetcher);

  const jobs = jobsData?.jobs ?? [];
  const lastInvoice = invData?.invoices?.[0];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-800">
          Olá{me?.client?.name ? `, ${me.client.name.split(' ')[0]}` : ''}!
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">Bem-vindo ao seu portal de projetos.</p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Projetos ativos</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{jobs.length}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Última fatura</p>
          <p className="text-lg font-bold text-slate-800 mt-1">
            {lastInvoice ? brl(lastInvoice.amount_brl) : '—'}
          </p>
          {lastInvoice && (
            <p className="text-xs text-slate-400 mt-0.5">
              {lastInvoice.status === 'paid' ? '✓ Paga' : `Vence ${fmtDate(lastInvoice.due_date)}`}
            </p>
          )}
        </div>
      </div>

      {/* Recent jobs */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold text-slate-700 text-sm">Projetos recentes</h2>
          <Link href="/jobs" className="text-xs text-blue-600 hover:underline">Ver todos</Link>
        </div>
        {jobs.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
            <p className="text-slate-400 text-sm">Nenhum projeto ainda.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {jobs.map((j) => (
              <Link
                key={j.id}
                href={`/jobs/${j.id}`}
                className="block bg-white border border-slate-200 rounded-xl p-4 hover:border-blue-300 transition-colors"
              >
                <p className="font-medium text-slate-800 text-sm">{j.title}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Atualizado em {fmtDate(j.updated_at)}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
