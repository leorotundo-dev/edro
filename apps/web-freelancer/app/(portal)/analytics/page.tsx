'use client';

import useSWR from 'swr';
import Link from 'next/link';
import { swrFetcher } from '@/lib/api';

type Analytics = {
  period: string;
  total_approved: number;
  total_earned_brl: number;
  zero_refacao_rate: number | null;
  sla_hit_rate: number | null;
  avg_delivery_days: {
    all: number | null;
    P: number | null;
    M: number | null;
    G: number | null;
    GG: number | null;
  };
};

// ── Circular progress ─────────────────────────────────────────────────────────

function CircleMetric({
  value, label, color, description,
}: {
  value: number | null; label: string; color: string; description: string;
}) {
  const pct = value ?? 0;
  const r = 38;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;

  return (
    <div style={{ flex: '1 1 140px', textAlign: 'center', padding: '18px 12px' }}>
      <svg width="100" height="100" viewBox="0 0 100 100" style={{ display: 'block', margin: '0 auto' }}>
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="9" />
        <circle
          cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="9"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transform: 'rotate(-90deg)', transformOrigin: '50px 50px', transition: 'stroke-dashoffset 1s ease' }}
        />
        <text x="50" y="54" textAnchor="middle" fill={value !== null ? color : 'rgba(255,255,255,0.2)'}
          fontSize="18" fontWeight="800" fontFamily="inherit">
          {value !== null ? `${pct}%` : '—'}
        </text>
      </svg>
      <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--portal-text)', margin: '10px 0 3px' }}>{label}</p>
      <p style={{ fontSize: 11, color: 'var(--portal-muted)', margin: 0, lineHeight: 1.4 }}>{description}</p>
    </div>
  );
}

// ── Avg delivery bar ──────────────────────────────────────────────────────────

function DeliveryBar({ size, days, maxDays, color }: { size: string; days: number | null; maxDays: number; color: string }) {
  const pct = days !== null ? Math.min((days / maxDays) * 100, 100) : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
      <span style={{
        width: 28, fontSize: 11, fontWeight: 800, color,
        background: `${color}18`, borderRadius: 5, padding: '2px 0', textAlign: 'center', flexShrink: 0,
      }}>{size}</span>
      <div style={{ flex: 1, height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 99 }}>
        {days !== null && (
          <div style={{
            width: `${pct}%`, height: '100%', borderRadius: 99,
            background: color, transition: 'width 0.8s ease',
          }} />
        )}
      </div>
      <span style={{ width: 40, fontSize: 12, fontWeight: 700, color: days !== null ? color : 'var(--portal-muted)', textAlign: 'right', flexShrink: 0 }}>
        {days !== null ? `${days}d` : '—'}
      </span>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const { data, isLoading } = useSWR<Analytics>('/freelancers/portal/me/analytics', swrFetcher);

  if (isLoading || !data) {
    return (
      <div className="portal-page">
        <div className="portal-empty">
          <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
          <p className="portal-card-subtitle">Calculando métricas…</p>
        </div>
      </div>
    );
  }

  const zeroR = data.zero_refacao_rate;
  const slaR  = data.sla_hit_rate;
  const avg   = data.avg_delivery_days;
  const maxDays = Math.max(avg.P ?? 0, avg.M ?? 0, avg.G ?? 0, avg.GG ?? 0, 1);

  const zeroColor = zeroR === null ? '#888' : zeroR >= 80 ? '#13DEB9' : zeroR >= 60 ? '#F8A800' : '#ff4444';
  const slaColor  = slaR  === null ? '#888' : slaR  >= 80 ? '#13DEB9' : slaR  >= 60 ? '#F8A800' : '#ff4444';

  const zeroMsg = zeroR === null ? 'Sem dados suficientes'
    : zeroR >= 90 ? 'Precisão técnica excelente!'
    : zeroR >= 75 ? 'Bom — poucos retrabalhos'
    : zeroR >= 60 ? 'Ok — há espaço para melhorar'
    : 'Atenção — muitos retrabalhos';

  const slaMsg = slaR === null ? 'Sem dados suficientes'
    : slaR >= 90 ? 'Pontualidade excepcional!'
    : slaR >= 75 ? 'Bom — quase sempre no prazo'
    : slaR >= 60 ? 'Ok — alguns atrasos'
    : 'Atenção — SLA comprometido';

  return (
    <div className="portal-page">

      {/* Header */}
      <div>
        <span className="portal-kicker">Empresa · 90 dias</span>
        <h2 className="portal-page-title">📊 Analytics B2B</h2>
        <p className="portal-page-subtitle">
          {data.total_approved} escopos aprovados ·{' '}
          R$ {data.total_earned_brl.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} faturados
        </p>
      </div>

      {/* Circular metrics */}
      <section className="portal-card">
        <h3 className="portal-section-title" style={{ padding: '14px 16px 0', margin: 0 }}>
          Indicadores de Qualidade
        </h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center' }}>
          <CircleMetric
            value={zeroR} color={zeroColor}
            label="Zero Refação"
            description={zeroMsg}
          />
          <CircleMetric
            value={slaR} color={slaColor}
            label="SLA Hit Rate"
            description={slaMsg}
          />
        </div>
        {(zeroR !== null || slaR !== null) && (
          <p style={{ fontSize: 11, color: 'var(--portal-muted)', textAlign: 'center', padding: '0 16px 16px', margin: 0 }}>
            Baseado nos últimos 90 dias de operação
          </p>
        )}
      </section>

      {/* Avg delivery time */}
      <section className="portal-card" style={{ padding: '16px' }}>
        <h3 className="portal-section-title" style={{ margin: '0 0 16px' }}>
          Tempo Médio de Entrega
        </h3>
        {avg.all !== null ? (
          <>
            <div style={{
              background: 'rgba(93,135,255,0.08)', border: '1px solid rgba(93,135,255,0.2)',
              borderRadius: 10, padding: '10px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <span style={{ fontSize: 22 }}>⏱</span>
              <div>
                <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#5D87FF', lineHeight: 1 }}>
                  {avg.all}d
                </p>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--portal-muted)' }}>
                  Média geral de entrega
                </p>
              </div>
            </div>
            <DeliveryBar size="P"  days={avg.P}  maxDays={maxDays} color="#13DEB9" />
            <DeliveryBar size="M"  days={avg.M}  maxDays={maxDays} color="#5D87FF" />
            <DeliveryBar size="G"  days={avg.G}  maxDays={maxDays} color="#F8A800" />
            <DeliveryBar size="GG" days={avg.GG} maxDays={maxDays} color="#FA896B" />
            <p style={{ fontSize: 11, color: 'var(--portal-muted)', marginTop: 8, marginBottom: 0 }}>
              Use esses dados para dimensionar sua agenda antes de aceitar novos escopos.
            </p>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--portal-muted)', fontSize: 13 }}>
            Entregue seus primeiros escopos para ver o tempo médio por tamanho.
          </div>
        )}
      </section>

      {/* Tip banner */}
      <div style={{
        background: 'rgba(248,168,0,0.06)', border: '1px solid rgba(248,168,0,0.2)',
        borderRadius: 12, padding: '14px 16px',
      }}>
        <p style={{ margin: 0, fontSize: 13, color: '#F8A800', fontWeight: 700 }}>
          Como melhorar suas métricas?
        </p>
        <p style={{ margin: '5px 0 0', fontSize: 12, color: 'var(--portal-muted)', lineHeight: 1.5 }}>
          Zero Refação sobe quando você entrega escopos completos na primeira vez.
          SLA Hit Rate sobe quando você respeita os prazos acordados.
          Ambos reforçam sua reputação como fornecedor B2B confiável.
        </p>
      </div>

      {/* Back */}
      <Link href="/" style={{ fontSize: 12, color: 'var(--portal-accent)', textDecoration: 'none' }}>
        ← Voltar ao Workspace
      </Link>

    </div>
  );
}
