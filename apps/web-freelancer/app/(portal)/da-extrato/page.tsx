'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { swrFetcher } from '@/lib/api';

// ── Types ─────────────────────────────────────────────────────────────────────

type DaBillingEntry = {
  id: string;
  job_id: string;
  job_title: string;
  client_name: string | null;
  job_size: string;
  rate_cents: number;
  status: 'pending' | 'approved' | 'paid' | 'cancelled';
  period_month: string;   // 'YYYY-MM'
  approved_at: string | null;
  paid_at: string | null;
  created_at: string;
};

// ── Formatters ────────────────────────────────────────────────────────────────

function brl(cents: number) {
  const n = cents / 100;
  return `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fmtPeriod(ym: string) {
  const [y, m] = ym.split('-');
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${months[parseInt(m, 10) - 1]}/${y}`;
}

const SIZE_LABEL: Record<string, string> = {
  P: 'P', M: 'M', G: 'G',
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending:   { label: 'Aguardando', color: '#F8A800', bg: 'rgba(248,168,0,0.1)' },
  approved:  { label: 'Aprovado',   color: '#5D87FF', bg: 'rgba(93,135,255,0.1)' },
  paid:      { label: 'Pago',       color: '#13DEB9', bg: 'rgba(19,222,185,0.1)' },
  cancelled: { label: 'Cancelado',  color: '#FA896B', bg: 'rgba(250,137,107,0.1)' },
};

// ── Period picker ─────────────────────────────────────────────────────────────

function buildPeriodOptions() {
  const now = new Date();
  const opts: { value: string; label: string }[] = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    opts.push({ value, label: fmtPeriod(value) });
  }
  return opts;
}

// ── Summary ───────────────────────────────────────────────────────────────────

function Summary({ entries }: { entries: DaBillingEntry[] }) {
  const total = entries.reduce((s, e) => s + e.rate_cents, 0);
  const approved = entries.filter((e) => e.status === 'approved').reduce((s, e) => s + e.rate_cents, 0);
  const paid = entries.filter((e) => e.status === 'paid').reduce((s, e) => s + e.rate_cents, 0);
  const pending = entries.filter((e) => e.status === 'pending').reduce((s, e) => s + e.rate_cents, 0);

  const stats = [
    { label: 'Total do Período', value: brl(total), color: '#fff', big: true },
    { label: 'Pago',             value: brl(paid),     color: '#13DEB9', big: false },
    { label: 'Aprovado',         value: brl(approved), color: '#5D87FF', big: false },
    { label: 'Aguardando',       value: brl(pending),  color: '#F8A800', big: false },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
      {stats.map((s) => (
        <div key={s.label} style={{
          background: 'var(--portal-card)', border: '1px solid var(--portal-border)',
          borderRadius: 12, padding: '16px 14px',
        }}>
          <p style={{ margin: '0 0 4px', fontSize: 11, color: 'var(--portal-muted)', fontWeight: 600 }}>
            {s.label}
          </p>
          <p style={{ margin: 0, fontSize: s.big ? 22 : 18, fontWeight: 800, color: s.color }}>
            {s.value}
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 10, color: 'var(--portal-muted)' }}>
            {entries.filter((e) =>
              s.label === 'Total do Período' ? true :
              s.label === 'Pago'           ? e.status === 'paid' :
              s.label === 'Aprovado'       ? e.status === 'approved' :
              e.status === 'pending',
            ).length} entregas
          </p>
        </div>
      ))}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DaExtrato() {
  const periodOptions = buildPeriodOptions();
  const [period, setPeriod] = useState(periodOptions[0].value);

  const { data, isLoading } = useSWR<{ success: boolean; data: DaBillingEntry[] }>(
    `/freelancers/portal/me/da-billing?period=${period}`,
    swrFetcher,
  );

  const entries = data?.data ?? [];

  return (
    <div className="portal-page">
      {/* Header */}
      <div>
        <span className="portal-kicker">Direção de Arte</span>
        <h2 className="portal-page-title">◈ Extrato por Job</h2>
        <p className="portal-page-subtitle">
          Detalhamento de honorários por entrega — cada peça aprovada, valor e status de pagamento.
        </p>
      </div>

      {/* Period selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 12, color: 'var(--portal-muted)', fontWeight: 600 }}>Período:</span>
        <div style={{ display: 'flex', gap: 6 }}>
          {periodOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setPeriod(opt.value)}
              style={{
                padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                cursor: 'pointer', border: 'none', transition: 'all 0.15s',
                background: period === opt.value ? '#5D87FF' : 'rgba(255,255,255,0.06)',
                color: period === opt.value ? '#fff' : 'rgba(255,255,255,0.45)',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      {!isLoading && entries.length > 0 && <Summary entries={entries} />}

      {/* Entries table */}
      <section style={{
        background: 'var(--portal-card)', border: '1px solid var(--portal-border)',
        borderRadius: 14, overflow: 'hidden',
      }}>
        <div style={{ padding: '13px 16px', borderBottom: '1px solid var(--portal-border)' }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: 'var(--portal-text)' }}>
            Entregas — {fmtPeriod(period)}
          </p>
          <p style={{ margin: '3px 0 0', fontSize: 11, color: 'var(--portal-muted)' }}>
            Cada linha = uma peça registrada pelo Bedel após publicação
          </p>
        </div>

        {isLoading ? (
          <div className="portal-empty">
            <div style={{ fontSize: 36, marginBottom: 10 }}>⏳</div>
            <p className="portal-card-subtitle">Carregando extrato...</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="portal-empty">
            <div style={{ fontSize: 36, marginBottom: 10 }}>🌱</div>
            <p className="portal-card-subtitle">Nenhuma entrega registrada em {fmtPeriod(period)}.</p>
            <p style={{ fontSize: 11, color: 'var(--portal-muted)', marginTop: 4, textAlign: 'center', maxWidth: 260 }}>
              Os registros aparecem automaticamente quando um job é concluído e publicado.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                  {['Job', 'Cliente', 'Porte', 'Valor', 'Status', 'Aprovado', 'Pago'].map((h) => (
                    <th key={h} style={{
                      padding: '9px 14px', textAlign: 'left', fontWeight: 700,
                      color: 'rgba(255,255,255,0.4)', borderBottom: '1px solid var(--portal-border)',
                      whiteSpace: 'nowrap',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {entries.map((row) => {
                  const sc = STATUS_CONFIG[row.status] ?? STATUS_CONFIG.pending;
                  return (
                    <tr key={row.id} style={{ borderBottom: '1px solid var(--portal-border)' }}>
                      <td style={{ padding: '10px 14px', maxWidth: 180 }}>
                        <p style={{
                          margin: 0, fontWeight: 600, color: 'var(--portal-text)',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {row.job_title}
                        </p>
                      </td>
                      <td style={{ padding: '10px 14px', color: 'var(--portal-muted)', whiteSpace: 'nowrap' }}>
                        {row.client_name ?? '—'}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        <span style={{
                          fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 6,
                          background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)',
                        }}>
                          {SIZE_LABEL[row.job_size] ?? row.job_size}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', fontWeight: 800, color: '#fff', whiteSpace: 'nowrap' }}>
                        {brl(row.rate_cents)}
                      </td>
                      <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                        <span style={{
                          fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6,
                          background: sc.bg, color: sc.color,
                        }}>
                          {sc.label}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', color: 'var(--portal-muted)', whiteSpace: 'nowrap' }}>
                        {fmtDate(row.approved_at)}
                      </td>
                      <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                        {row.paid_at
                          ? <span style={{ color: '#13DEB9', fontWeight: 700 }}>{fmtDate(row.paid_at)}</span>
                          : <span style={{ color: 'rgba(255,255,255,0.3)' }}>—</span>
                        }
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', textAlign: 'center' }}>
        Valores registrados automaticamente pelo Bedel após confirmação de entrega.
        Dúvidas? Contate o financeiro da agência.
      </p>
    </div>
  );
}
