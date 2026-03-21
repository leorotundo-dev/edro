'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { swrFetcher, apiPost } from '@/lib/api';

// ── Types ─────────────────────────────────────────────────────────────────────

type BillingStatement = {
  id: string;
  title: string;
  status: string;
  approved_at: string | null;
  fee_brl: string;
  glosa_brl: string;
  net_brl: string;
  job_size: string | null;
  job_category: string | null;
};

type NfAction = {
  cycle_id: string;
  period_month: string;
  period_name: string;
  amount_brl: number;
  status: string;
  nf_submitted: boolean;
  nf_url: string | null;
  nf_number: string | null;
  nf_due_date: string | null;
  payment_date: string | null;
  paid_at: string | null;
  window_open: boolean;
  overdue: boolean;
};

type BillingData = {
  day_of_month: number;
  current: {
    period_month: string;
    approved_brl: number;
    pending_brl: number;
    glosa_brl: number;
    net_brl: number;
  };
  nf_action: NfAction | null;
  agency_data: { description_suggestion: string };
  statement: BillingStatement[];
};

// ── Formatters ────────────────────────────────────────────────────────────────

function brl(v: number | string | null | undefined) {
  const n = parseFloat(String(v ?? 0));
  return isNaN(n) ? 'R$ 0,00' : `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const STATUS_LABEL: Record<string, string> = {
  approved: '✅ Homologado',
  in_review: '🔍 Em Homologação',
  in_progress: '⚙️ Em Execução',
  allocated: '⚙️ Em Execução',
  adjustment: '🔄 Em Ajuste',
};

// ── Block 2: NF Action ────────────────────────────────────────────────────────

function NfActionBlock({ nfAction, agencyData, onSubmitted }: {
  nfAction: NfAction | null;
  agencyData: { description_suggestion: string };
  onSubmitted: () => void;
}) {
  const [nfUrl, setNfUrl] = useState('');
  const [nfNumber, setNfNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  }

  async function handleSubmit() {
    if (!nfUrl.trim()) { setErr('Informe o link da NF-e'); return; }
    if (!nfAction) return;
    setLoading(true);
    setErr('');
    try {
      await apiPost(`/freelancers/portal/me/billing/${nfAction.cycle_id}/submit-nf`, {
        nf_url: nfUrl.trim(),
        nf_number: nfNumber.trim() || undefined,
      });
      onSubmitted();
    } catch (e: any) {
      setErr(e.message ?? 'Erro ao enviar NF-e');
    } finally {
      setLoading(false);
    }
  }

  // No previous cycle to act on
  if (!nfAction) {
    return (
      <div style={{
        background: 'rgba(93,135,255,0.05)', border: '1px solid rgba(93,135,255,0.2)',
        borderRadius: 14, padding: '20px 18px',
      }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#5D87FF', marginBottom: 6 }}>
          🧾 Emissão de Nota Fiscal
        </p>
        <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>
          O ciclo de faturamento atual está em andamento. A emissão da NF-e será liberada
          no 1º dia útil do próximo mês.
        </p>
      </div>
    );
  }

  // Paid ✅
  if (nfAction.status === 'paid') {
    return (
      <div style={{
        background: 'rgba(19,222,185,0.08)', border: '2px solid rgba(19,222,185,0.3)',
        borderRadius: 14, padding: '24px 18px', textAlign: 'center',
      }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>✅</div>
        <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#13DEB9' }}>FATURA PAGA</p>
        <p style={{ margin: '6px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
          Referente a {nfAction.period_name} · {brl(nfAction.amount_brl)}
          {nfAction.paid_at && ` · Pago em ${fmtDate(nfAction.paid_at)}`}
        </p>
      </div>
    );
  }

  // NF in analysis (submitted, waiting admin)
  if (nfAction.status === 'nf_analysis' || nfAction.nf_submitted) {
    return (
      <div style={{
        background: 'rgba(93,135,255,0.06)', border: '1.5px solid rgba(93,135,255,0.3)',
        borderRadius: 14, padding: '20px 18px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <span style={{ fontSize: 22 }}>🔍</span>
          <div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#5D87FF' }}>
              NF em Análise pelo Financeiro
            </p>
            <p style={{ margin: '3px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
              Referente a {nfAction.period_name} · Pagamento previsto para dia {nfAction.payment_date ? new Date(nfAction.payment_date).getDate() : 10}
            </p>
          </div>
        </div>
        {nfAction.nf_url && (
          <a href={nfAction.nf_url} target="_blank" rel="noopener noreferrer"
            style={{ fontSize: 12, color: '#5D87FF', textDecoration: 'underline' }}>
            📄 Ver NF-e enviada
          </a>
        )}
      </div>
    );
  }

  // Window open — AÇÃO NECESSÁRIA or cycle during month
  if (!nfAction.window_open) {
    return (
      <div style={{
        background: 'rgba(93,135,255,0.05)', border: '1px solid rgba(93,135,255,0.2)',
        borderRadius: 14, padding: '20px 18px',
      }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#5D87FF', marginBottom: 6 }}>
          🧾 Emissão de Nota Fiscal
        </p>
        <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>
          O ciclo de faturamento atual está em andamento. A emissão da NF-e será liberada
          no 1º dia útil do próximo mês.
        </p>
      </div>
    );
  }

  // NF window is open — action required
  return (
    <div style={{
      background: nfAction.overdue ? 'rgba(250,137,107,0.08)' : 'rgba(248,168,0,0.06)',
      border: `2px solid ${nfAction.overdue ? 'rgba(250,137,107,0.4)' : 'rgba(248,168,0,0.35)'}`,
      borderRadius: 14, padding: '20px 18px',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16,
        padding: '10px 14px', borderRadius: 10,
        background: nfAction.overdue ? 'rgba(250,137,107,0.12)' : 'rgba(248,168,0,0.1)',
      }}>
        <span style={{ fontSize: 22 }}>🔴</span>
        <div>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 800,
            color: nfAction.overdue ? '#FA896B' : '#F8A800' }}>
            AÇÃO NECESSÁRIA: Envie sua Nota Fiscal
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
            Referente a {nfAction.period_name} · Prazo: até dia 5
          </p>
        </div>
      </div>

      {/* Amount */}
      <div style={{
        padding: '12px 14px', borderRadius: 10,
        background: 'rgba(255,255,255,0.04)', marginBottom: 16,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Valor exato para emissão</p>
          <p style={{ margin: '4px 0 0', fontSize: 26, fontWeight: 800, color: '#13DEB9' }}>
            {brl(nfAction.amount_brl)}
          </p>
        </div>
        <span style={{ fontSize: 32 }}>💰</span>
      </div>

      {/* Suggested description */}
      <div style={{ marginBottom: 14 }}>
        <p style={{ margin: '0 0 6px', fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>
          Descrição sugerida para a NF:
        </p>
        <div style={{
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 8, padding: '10px 12px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
        }}>
          <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.7)', flex: 1, lineHeight: 1.5 }}>
            {agencyData.description_suggestion}
          </p>
          <button
            type="button"
            onClick={() => copy(agencyData.description_suggestion, 'desc')}
            style={{
              flexShrink: 0, padding: '5px 10px', borderRadius: 7,
              background: copied === 'desc' ? 'rgba(19,222,185,0.2)' : 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: copied === 'desc' ? '#13DEB9' : 'rgba(255,255,255,0.4)',
              fontSize: 11, cursor: 'pointer',
            }}
          >
            {copied === 'desc' ? '✓ Copiado' : 'Copiar'}
          </button>
        </div>
      </div>

      {/* NF form */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <input
          type="url"
          placeholder="Link da NF-e (prefeitura / e-nota / SEFAZ)"
          value={nfUrl}
          onChange={e => setNfUrl(e.target.value)}
          style={{
            width: '100%', boxSizing: 'border-box',
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 8, padding: '10px 12px',
            color: '#fff', fontSize: 13, outline: 'none',
          }}
        />
        <input
          type="text"
          placeholder="Número da NF (obrigatório para conciliação)"
          value={nfNumber}
          onChange={e => setNfNumber(e.target.value)}
          style={{
            width: '100%', boxSizing: 'border-box',
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 8, padding: '10px 12px',
            color: '#fff', fontSize: 13, outline: 'none',
          }}
        />
        {err && <p style={{ margin: 0, fontSize: 12, color: '#FA896B' }}>{err}</p>}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading || !nfUrl.trim()}
          style={{
            padding: '12px', borderRadius: 10, fontWeight: 800, fontSize: 14,
            cursor: nfUrl.trim() && !loading ? 'pointer' : 'not-allowed',
            background: nfUrl.trim() ? 'rgba(19,222,185,0.15)' : 'rgba(255,255,255,0.04)',
            border: `1.5px solid ${nfUrl.trim() ? 'rgba(19,222,185,0.4)' : 'rgba(255,255,255,0.1)'}`,
            color: nfUrl.trim() ? '#13DEB9' : 'rgba(255,255,255,0.3)',
          }}
        >
          {loading ? 'Enviando...' : '📎 Confirmar Envio da Nota Fiscal'}
        </button>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function HonorariosPage() {
  const { data, isLoading, mutate } = useSWR<BillingData>(
    '/freelancers/portal/me/billing', swrFetcher,
  );

  const curr = data?.current;
  const glosaColor = (curr?.glosa_brl ?? 0) > 0 ? '#FA896B' : '#13DEB9';

  if (isLoading) {
    return (
      <div className="portal-page">
        <div className="portal-empty">
          <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>
          <p className="portal-card-subtitle">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="portal-page">

      {/* Header */}
      <div>
        <span className="portal-kicker">Financeiro B2B</span>
        <h2 className="portal-page-title">◎ Dashboard de Faturamento</h2>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', margin: '6px 0 0', lineHeight: 1.6 }}>
          Acompanhe o faturamento da sua empresa. O ciclo fecha no último dia do mês e a sua
          Nota Fiscal deve ser enviada até o dia 5 para garantir o repasse no dia 10.
        </p>
      </div>

      {/* ── Bloco 1: Resumo financeiro ─────────────────────────────────────── */}
      {curr && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>

          {/* Faturamento Liberado */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(19,222,185,0.15) 0%, rgba(93,135,255,0.10) 100%)',
            border: '2px solid rgba(19,222,185,0.35)', borderRadius: 16, padding: '20px 18px',
          }}>
            <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700,
              color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              💳 Faturamento Liberado
            </p>
            <p style={{ margin: '0 0 4px', fontSize: 26, fontWeight: 800, color: '#13DEB9', lineHeight: 1 }}>
              {brl(curr.net_brl)}
            </p>
            <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.35)', lineHeight: 1.5 }}>
              Escopos homologados e aprovados neste ciclo
            </p>
          </div>

          {/* Em Andamento */}
          <div style={{
            background: 'rgba(93,135,255,0.06)', border: '1.5px solid rgba(93,135,255,0.25)',
            borderRadius: 16, padding: '20px 18px',
          }}>
            <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700,
              color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              ⏳ Em Andamento
            </p>
            <p style={{ margin: '0 0 4px', fontSize: 26, fontWeight: 800, color: '#5D87FF', lineHeight: 1 }}>
              {brl(curr.pending_brl)}
            </p>
            <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.35)', lineHeight: 1.5 }}>
              Escopos aceitos ainda em execução ou aguardando aprovação
            </p>
          </div>

          {/* Glosas */}
          <div style={{
            background: curr.glosa_brl > 0 ? 'rgba(250,137,107,0.06)' : 'rgba(19,222,185,0.04)',
            border: `1.5px solid ${curr.glosa_brl > 0 ? 'rgba(250,137,107,0.25)' : 'rgba(19,222,185,0.15)'}`,
            borderRadius: 16, padding: '20px 18px',
          }}>
            <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700,
              color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              📉 Glosas Aplicadas
            </p>
            <p style={{ margin: '0 0 4px', fontSize: 26, fontWeight: 800, color: glosaColor, lineHeight: 1 }}>
              {curr.glosa_brl > 0 ? `− ${brl(curr.glosa_brl)}` : brl(0)}
            </p>
            <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.35)', lineHeight: 1.5 }}>
              {curr.glosa_brl > 0
                ? 'Descontos por quebra de SLA (atrasos) neste mês'
                : 'Nenhuma glosa aplicada — SLA em dia ✓'}
            </p>
          </div>
        </div>
      )}

      {/* ── Bloco 2: Área de ação — Emissão da NF ─────────────────────────── */}
      <NfActionBlock
        nfAction={data?.nf_action ?? null}
        agencyData={data?.agency_data ?? { description_suggestion: '' }}
        onSubmitted={() => mutate()}
      />

      {/* ── Bloco 3: Extrato detalhado ────────────────────────────────────── */}
      <section style={{
        background: 'var(--portal-card)', border: '1px solid var(--portal-border)',
        borderRadius: 14, overflow: 'hidden',
      }}>
        <div style={{ padding: '13px 16px', borderBottom: '1px solid var(--portal-border)' }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: 'var(--portal-text)' }}>
            📊 Extrato de Entregáveis — Ciclo Atual
          </p>
          <p style={{ margin: '3px 0 0', fontSize: 11, color: 'var(--portal-muted)' }}>
            Transparência total: veja de onde vem cada real do seu faturamento.
          </p>
        </div>

        {!data?.statement?.length ? (
          <div style={{ padding: '32px 16px', textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: 36, marginBottom: 10 }}>🌱</p>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--portal-muted)' }}>
              Nenhum escopo neste ciclo ainda.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                  {['Data', 'Escopo', 'Status', 'Honorário', 'Glosa', 'Líquido'].map(h => (
                    <th key={h} style={{
                      padding: '9px 14px', textAlign: 'left', fontWeight: 700,
                      color: 'rgba(255,255,255,0.4)', borderBottom: '1px solid var(--portal-border)',
                      whiteSpace: 'nowrap',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.statement.map((row) => {
                  const isApproved = row.status === 'approved';
                  const hasGlosa = parseFloat(row.glosa_brl) > 0;
                  return (
                    <tr key={row.id} style={{ borderBottom: '1px solid var(--portal-border)' }}>
                      <td style={{ padding: '10px 14px', color: 'var(--portal-muted)', whiteSpace: 'nowrap' }}>
                        {row.approved_at ? fmtDate(row.approved_at) : '—'}
                      </td>
                      <td style={{ padding: '10px 14px', maxWidth: 200 }}>
                        <p style={{ margin: 0, fontWeight: 600, color: 'var(--portal-text)',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {row.title}
                        </p>
                        {row.job_size && (
                          <span style={{ fontSize: 10, color: 'var(--portal-muted)' }}>
                            {row.job_category?.toUpperCase()} {row.job_size}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                        <span style={{
                          fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6,
                          background: isApproved ? 'rgba(19,222,185,0.12)' : 'rgba(93,135,255,0.1)',
                          color: isApproved ? '#13DEB9' : '#5D87FF',
                        }}>
                          {STATUS_LABEL[row.status] ?? row.status}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--portal-text)', whiteSpace: 'nowrap' }}>
                        {brl(row.fee_brl)}
                      </td>
                      <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                        {isApproved
                          ? (hasGlosa
                            ? <span style={{ color: '#FA896B', fontWeight: 700 }}>− {brl(row.glosa_brl)}</span>
                            : <span style={{ color: 'rgba(255,255,255,0.3)' }}>—</span>)
                          : <span style={{ color: 'rgba(255,255,255,0.3)' }}>—</span>
                        }
                      </td>
                      <td style={{ padding: '10px 14px', fontWeight: 800, whiteSpace: 'nowrap' }}>
                        {isApproved
                          ? <span style={{ color: '#13DEB9' }}>{brl(row.net_brl)}</span>
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

      {/* Legal notice */}
      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', textAlign: 'center' }}>
        Pagamentos realizados exclusivamente para CNPJ cadastrado. A emissão de NF-e é obrigatória.
      </p>

    </div>
  );
}
