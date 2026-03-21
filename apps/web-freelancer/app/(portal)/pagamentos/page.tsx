'use client';

import { useState } from 'react';
import useSWR, { mutate } from 'swr';
import { swrFetcher, apiPost, getApiBaseUrl } from '@/lib/api';

type Payable = {
  id: string;
  period_month: string;
  amount_brl: string;
  glosa_brl: string | null;
  net_amount_brl: string | null;
  flat_fee_brl: string | null;
  status: 'open' | 'paid';
  paid_at: string | null;
  nf_url: string | null;
  nf_number: string | null;
};

function fmt(brl: string | null | undefined) {
  if (!brl) return '0,00';
  return parseFloat(brl).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function NfUploadRow({ payable, onDone }: { payable: Payable; onDone: () => void }) {
  const [nfUrl, setNfUrl] = useState(payable.nf_url ?? '');
  const [nfNumber, setNfNumber] = useState(payable.nf_number ?? '');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          background: payable.nf_url ? 'rgba(19,222,185,0.10)' : 'rgba(93,135,255,0.10)',
          border: `1px solid ${payable.nf_url ? 'rgba(19,222,185,0.3)' : 'rgba(93,135,255,0.25)'}`,
          color: payable.nf_url ? '#13DEB9' : '#5D87FF',
          borderRadius: 8, padding: '5px 12px', cursor: 'pointer', fontSize: 11, fontWeight: 600,
        }}
      >
        {payable.nf_url ? '✅ NF-e enviada' : '📋 Enviar NF-e'}
      </button>
    );
  }

  async function handleSave() {
    if (!nfUrl.trim()) { setErr('Informe o link da NF-e'); return; }
    setLoading(true);
    setErr('');
    try {
      await apiPost(`/freelancers/portal/me/payables/${payable.id}/nf`, {
        nf_url: nfUrl.trim(),
        nf_number: nfNumber.trim() || undefined,
      });
      onDone();
      setOpen(false);
    } catch (e: any) {
      setErr(e.message ?? 'Erro ao salvar NF-e');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      marginTop: 10, padding: '12px 14px',
      background: 'rgba(93,135,255,0.06)', border: '1px solid rgba(93,135,255,0.2)', borderRadius: 10,
    }}>
      <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: '#5D87FF' }}>Nota Fiscal de Serviços (NFS-e)</p>
      <input
        type="url"
        placeholder="Link da NF-e (prefeitura / e-nota)"
        value={nfUrl}
        onChange={e => setNfUrl(e.target.value)}
        style={{
          width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.12)', borderRadius: 7, padding: '8px 10px',
          color: '#fff', fontSize: 12, marginBottom: 6,
        }}
      />
      <input
        type="text"
        placeholder="Número da NF (opcional)"
        value={nfNumber}
        onChange={e => setNfNumber(e.target.value)}
        style={{
          width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.12)', borderRadius: 7, padding: '8px 10px',
          color: '#fff', fontSize: 12, marginBottom: 8,
        }}
      />
      {err && <p style={{ fontSize: 11, color: '#FA896B', margin: '0 0 8px' }}>{err}</p>}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          type="button"
          onClick={handleSave}
          disabled={loading}
          style={{
            flex: 1, padding: '7px 0', background: '#5D87FF', color: '#fff',
            border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: 'pointer',
          }}
        >
          {loading ? 'Salvando...' : 'Salvar NF-e'}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          style={{
            padding: '7px 14px', background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)',
            borderRadius: 7, fontSize: 12, cursor: 'pointer',
          }}
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

export default function PagamentosPage() {
  const ENDPOINT = '/freelancers/portal/me/payables';
  const { data, isLoading } = useSWR<{ payables: Payable[] }>(ENDPOINT, swrFetcher);
  const payables = data?.payables ?? [];

  const totalPaid = payables
    .filter(p => p.status === 'paid')
    .reduce((s, p) => s + parseFloat(p.net_amount_brl ?? p.amount_brl), 0);
  const openPayable = payables.find(p => p.status === 'open');
  const openNet = openPayable ? parseFloat(openPayable.net_amount_brl ?? openPayable.amount_brl) : 0;
  const openGlosa = openPayable && openPayable.glosa_brl ? parseFloat(openPayable.glosa_brl) : 0;

  const handleDownload = async (payable: Payable) => {
    const token = localStorage.getItem('fl_token') ?? '';
    const apiUrl = getApiBaseUrl();
    const res = await fetch(`${apiUrl}/api/freelancers/payables/${payable.id}/pdf`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) { alert('Erro ao baixar PDF'); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `honorarios-${payable.period_month}.pdf`;
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="portal-page">
      <div>
        <span className="portal-kicker">Financeiro</span>
        <h2 className="portal-page-title">◎ Honorários</h2>
        <p className="portal-page-subtitle">
          Histórico de honorários por período. Emita a NF-e para liberar o pagamento.
        </p>
      </div>

      {/* NF-e reminder */}
      {openPayable && !openPayable.nf_url && (
        <div style={{
          background: 'rgba(248,168,0,0.08)', border: '1px solid rgba(248,168,0,0.25)',
          borderRadius: 10, padding: '12px 16px',
          display: 'flex', gap: 10, alignItems: 'flex-start',
        }}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>📋</span>
          <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>
            <strong style={{ color: '#F8A800' }}>NF-e pendente:</strong> Envie a Nota Fiscal de Serviços referente
            ao período <strong>{openPayable.period_month}</strong> para liberar o pagamento dos honorários.
          </p>
        </div>
      )}

      {/* Stats */}
      {!isLoading && payables.length > 0 && (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {openPayable && (
            <div style={{
              flex: '1 1 160px',
              background: 'linear-gradient(135deg, rgba(19,222,185,0.15) 0%, rgba(93,135,255,0.10) 100%)',
              border: '2px solid rgba(19,222,185,0.35)', borderRadius: 16, padding: '20px 18px',
            }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>💰</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#13DEB9' }}>
                R$ {fmt(String(openNet))}
              </div>
              <div style={{ fontSize: 11, color: 'var(--portal-muted)', marginTop: 4, fontWeight: 600 }}>
                A receber — {openPayable.period_month}
              </div>
              {openGlosa > 0 && (
                <div style={{ fontSize: 11, color: '#FA896B', marginTop: 4 }}>
                  Glosa: −R$ {fmt(String(openGlosa))} (SLA)
                </div>
              )}
            </div>
          )}

          {totalPaid > 0 && (
            <div style={{
              flex: '1 1 160px', background: 'rgba(255,255,255,0.04)',
              border: '1px solid var(--portal-border)', borderRadius: 16, padding: '20px 18px',
            }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🏦</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--portal-text)' }}>
                R$ {fmt(String(totalPaid))}
              </div>
              <div style={{ fontSize: 11, color: 'var(--portal-muted)', marginTop: 4 }}>
                Honorários recebidos (total)
              </div>
            </div>
          )}

          <div style={{
            flex: '1 1 120px', background: 'rgba(255,255,255,0.04)',
            border: '1px solid var(--portal-border)', borderRadius: 16, padding: '20px 18px',
          }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📄</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--portal-text)' }}>
              {payables.length}
            </div>
            <div style={{ fontSize: 11, color: 'var(--portal-muted)', marginTop: 4 }}>Fechamentos</div>
          </div>
        </div>
      )}

      {/* List */}
      <section className="portal-card">
        {isLoading ? (
          <div className="portal-empty">
            <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>
            <p className="portal-card-subtitle">Carregando honorários...</p>
          </div>
        ) : !payables.length ? (
          <div className="portal-empty">
            <div style={{ fontSize: 48, marginBottom: 12 }}>🌱</div>
            <p className="portal-card-title">Nenhum fechamento ainda</p>
            <p className="portal-card-subtitle">Assim que houver fechamento de período, os honorários aparecem aqui.</p>
          </div>
        ) : (
          <div className="portal-list">
            {payables.map((p) => {
              const isPaid = p.status === 'paid';
              const bruto = parseFloat(p.amount_brl);
              const glosa = p.glosa_brl ? parseFloat(p.glosa_brl) : 0;
              const liquido = p.net_amount_brl ? parseFloat(p.net_amount_brl) : bruto;
              const hasGlosa = glosa > 0;

              return (
                <div key={p.id} className="portal-list-card" style={{ flexDirection: 'column', gap: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {/* Status icon */}
                    <span style={{ fontSize: 28, flexShrink: 0 }}>
                      {isPaid ? '✅' : '⏳'}
                    </span>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p className="portal-card-title" style={{ marginBottom: 2 }}>
                        Honorários — {p.period_month}
                      </p>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6,
                          background: isPaid ? 'rgba(19,222,185,0.15)' : 'rgba(248,168,0,0.12)',
                          color: isPaid ? '#13DEB9' : '#F8A800',
                        }}>
                          {isPaid ? '✅ Pago' : '⏳ Aguardando NF-e'}
                        </span>
                        {p.flat_fee_brl && (
                          <span style={{
                            fontSize: 10, padding: '2px 8px', borderRadius: 6,
                            background: 'rgba(255,255,255,0.06)', color: 'var(--portal-muted)',
                          }}>
                            Valor fixo por escopo
                          </span>
                        )}
                        {isPaid && p.paid_at && (
                          <span style={{
                            fontSize: 10, padding: '2px 8px', borderRadius: 6,
                            background: 'rgba(255,255,255,0.06)', color: 'var(--portal-muted)',
                          }}>
                            Pago em {new Date(p.paid_at).toLocaleDateString('pt-BR')}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Amounts */}
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      {hasGlosa ? (
                        <>
                          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', textDecoration: 'line-through', marginBottom: 2 }}>
                            R$ {fmt(p.amount_brl)}
                          </div>
                          <div style={{ fontSize: 11, color: '#FA896B', marginBottom: 4 }}>
                            −R$ {fmt(p.glosa_brl)} glosa SLA
                          </div>
                          <div style={{ fontSize: 18, fontWeight: 800, color: isPaid ? '#13DEB9' : 'var(--portal-accent)', marginBottom: 6 }}>
                            R$ {fmt(String(liquido))}
                          </div>
                        </>
                      ) : (
                        <div style={{ fontSize: 18, fontWeight: 800, color: isPaid ? '#13DEB9' : 'var(--portal-accent)', marginBottom: 6 }}>
                          R$ {fmt(p.amount_brl)}
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        {isPaid && (
                          <button
                            type="button"
                            onClick={() => handleDownload(p)}
                            style={{
                              background: 'rgba(255,255,255,0.08)', border: '1px solid var(--portal-border)',
                              color: 'var(--portal-text)', borderRadius: 8, padding: '5px 12px',
                              cursor: 'pointer', fontSize: 11, fontWeight: 600,
                            }}
                          >
                            📥 Recibo
                          </button>
                        )}
                        {p.nf_url && (
                          <a
                            href={p.nf_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              background: 'rgba(19,222,185,0.10)', border: '1px solid rgba(19,222,185,0.3)',
                              color: '#13DEB9', borderRadius: 8, padding: '5px 12px',
                              fontSize: 11, fontWeight: 600, textDecoration: 'none',
                            }}
                          >
                            📄 NF-e
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* NF-e upload row (open payables without NF-e) */}
                  {!isPaid && (
                    <NfUploadRow
                      payable={p}
                      onDone={() => mutate(ENDPOINT)}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* B2B legal notice */}
      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', textAlign: 'center', marginTop: 8 }}>
        Pagamentos realizados exclusivamente para CNPJ. A emissão de NF-e é obrigatória para cada fechamento.
      </p>
    </div>
  );
}
