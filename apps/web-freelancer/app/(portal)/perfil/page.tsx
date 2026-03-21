'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { swrFetcher, apiPatch } from '@/lib/api';
import clsx from 'clsx';

// ── Types ──────────────────────────────────────────────────────────────────────

type SkillLevel = 'junior' | 'pleno' | 'ninja';
type SkillCategory = 'disciplinas' | 'softwares' | 'ia' | 'tech';

type SkillEntry = {
  id: string;
  label: string;
  category: SkillCategory;
  level: SkillLevel;
};

type Profile = {
  display_name: string;
  specialty: string | null;
  hourly_rate_brl: string | null;
  pix_key: string | null;
  pix_key_type: string | null;
  email: string | null;
  phone: string | null;
  whatsapp_jid: string | null;
  department: string | null;
  role_title: string | null;
  email_personal: string | null;
  notes: string | null;
  is_active: boolean;
  // Arsenal
  skills_json: SkillEntry[] | null;
  portfolio_url: string | null;
  // PJ data
  razao_social: string | null;
  cnpj: string | null;
  nome_fantasia: string | null;
  // Score
  sla_score: string | null;
  deliveries_total: number | null;
  deliveries_on_time: number | null;
  // Availability
  available_days: string[] | null;
  available_hours_start: string | null;
  available_hours_end: string | null;
  weekly_capacity_hours: string | null;
  unavailable_until: string | null;
};

// ── Constants ──────────────────────────────────────────────────────────────────

const DAYS = [
  { id: 'mon', label: 'Seg' },
  { id: 'tue', label: 'Ter' },
  { id: 'wed', label: 'Qua' },
  { id: 'thu', label: 'Qui' },
  { id: 'fri', label: 'Sex' },
  { id: 'sat', label: 'Sáb' },
  { id: 'sun', label: 'Dom' },
];

const LEVEL_CONFIG: Record<SkillLevel, { label: string; color: string; bg: string }> = {
  junior: { label: 'Jr',    color: '#64B5F6', bg: 'rgba(100,181,246,0.12)' },
  pleno:  { label: 'Pl',    color: '#81C784', bg: 'rgba(129,199,132,0.12)' },
  ninja:  { label: 'Ninja', color: '#FFB74D', bg: 'rgba(255,183,77,0.12)' },
};

const CATEGORY_LABELS: Record<SkillCategory, string> = {
  disciplinas: 'Disciplinas',
  softwares:   'Softwares',
  ia:          'IA',
  tech:        'Tech',
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatCnpj(raw: string) {
  const c = raw.replace(/\D/g, '');
  return c.length === 14
    ? `${c.slice(0,2)}.${c.slice(2,5)}.${c.slice(5,8)}/${c.slice(8,12)}-${c.slice(12)}`
    : raw;
}

function formatJid(jid: string) {
  const num = jid.replace(/@s\.whatsapp\.net$/, '');
  if (num.length >= 12) {
    const cc = num.slice(0, 2);
    const ddd = num.slice(2, 4);
    const rest = num.slice(4);
    return `+${cc} (${ddd}) ${rest.slice(0, -4)}-${rest.slice(-4)}`;
  }
  return num;
}

function parseSkills(raw: unknown): SkillEntry[] {
  if (Array.isArray(raw)) return raw.filter(s => s?.id);
  return [];
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function ScoreRing({ score }: { score: number }) {
  const color = score >= 90 ? '#13DEB9' : score >= 75 ? '#5D87FF' : score >= 60 ? '#FFAE1F' : '#FA896B';
  const label = score >= 90 ? 'Excelente' : score >= 75 ? 'Bom' : score >= 60 ? 'Regular' : 'Crítico';
  const r = 28;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <div style={{ position: 'relative', width: 72, height: 72, flexShrink: 0 }}>
        <svg width="72" height="72" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="36" cy="36" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
          <circle
            cx="36" cy="36" r={r} fill="none"
            stroke={color} strokeWidth="6"
            strokeDasharray={`${dash} ${circ}`}
            strokeLinecap="round"
          />
        </svg>
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 15, fontWeight: 800, color,
        }}>
          {score}
        </div>
      </div>
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color }}>{label}</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>Score SLA</div>
      </div>
    </div>
  );
}

function SkillTag({ skill }: { skill: SkillEntry }) {
  const lvl = LEVEL_CONFIG[skill.level] ?? LEVEL_CONFIG.pleno;
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '5px 10px', borderRadius: 999,
      background: 'rgba(255,255,255,0.06)',
      border: '1px solid rgba(255,255,255,0.1)',
      fontSize: 12, color: 'rgba(255,255,255,0.85)',
      transition: 'border-color 0.15s',
    }}>
      <span>{skill.label}</span>
      <span style={{
        fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 999,
        background: lvl.bg, color: lvl.color,
      }}>
        {lvl.label}
      </span>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function PerfilPage() {
  const { data: profile, mutate } = useSWR<Profile>('/freelancers/portal/me', swrFetcher);

  const [editingContact, setEditingContact] = useState(false);
  const [savingContact, setSavingContact] = useState(false);
  const [phone, setPhone] = useState('');
  const [whatsappJid, setWhatsappJid] = useState('');
  const [department, setDepartment] = useState('');
  const [roleTitle, setRoleTitle] = useState('');
  const [emailPersonal, setEmailPersonal] = useState('');
  const [notes, setNotes] = useState('');

  const [editingAvail, setEditingAvail] = useState(false);
  const [savingAvail, setSavingAvail] = useState(false);
  const [availDays, setAvailDays] = useState<string[]>([]);
  const [hoursStart, setHoursStart] = useState('');
  const [hoursEnd, setHoursEnd] = useState('');
  const [capacityHours, setCapacityHours] = useState('');
  const [unavailUntil, setUnavailUntil] = useState('');

  function startEditingContact() {
    if (!profile) return;
    setPhone(profile.phone ?? '');
    setWhatsappJid(profile.whatsapp_jid ?? '');
    setDepartment(profile.department ?? '');
    setRoleTitle(profile.role_title ?? '');
    setEmailPersonal(profile.email_personal ?? '');
    setNotes(profile.notes ?? '');
    setEditingContact(true);
  }

  async function handleSaveContact() {
    setSavingContact(true);
    try {
      await apiPatch('/freelancers/portal/me', {
        phone: phone || null,
        whatsapp_jid: whatsappJid || null,
        department: department || null,
        role_title: roleTitle || null,
        email_personal: emailPersonal || null,
        notes: notes || null,
      });
      await mutate();
      setEditingContact(false);
    } finally {
      setSavingContact(false);
    }
  }

  function startEditingAvail() {
    if (!profile) return;
    setAvailDays(profile.available_days ?? []);
    setHoursStart(profile.available_hours_start ?? '');
    setHoursEnd(profile.available_hours_end ?? '');
    setCapacityHours(profile.weekly_capacity_hours ?? '');
    setUnavailUntil(profile.unavailable_until ? profile.unavailable_until.slice(0, 10) : '');
    setEditingAvail(true);
  }

  async function handleSaveAvail() {
    setSavingAvail(true);
    try {
      await apiPatch('/freelancers/portal/me', {
        available_days: availDays.length ? availDays : [],
        available_hours_start: hoursStart || null,
        available_hours_end: hoursEnd || null,
        weekly_capacity_hours: capacityHours ? parseFloat(capacityHours) : null,
        unavailable_until: unavailUntil || null,
      });
      await mutate();
      setEditingAvail(false);
    } finally {
      setSavingAvail(false);
    }
  }

  function toggleDay(day: string) {
    setAvailDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  }

  if (!profile) {
    return (
      <div className="portal-empty">
        <p className="portal-card-title">Carregando perfil</p>
      </div>
    );
  }

  const skills = parseSkills(profile.skills_json);
  const score = parseFloat(profile.sla_score ?? '100') || 100;
  const isUnavailable = profile.unavailable_until && new Date(profile.unavailable_until) > new Date();

  // Group skills by category
  const byCategory = skills.reduce<Record<string, SkillEntry[]>>((acc, s) => {
    const cat = s.category ?? 'disciplinas';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(s);
    return acc;
  }, {});

  return (
    <div className="portal-page">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="portal-page-header">
        <div>
          <span className="portal-kicker">Meu perfil</span>
          <h2 className="portal-page-title">{profile.display_name}</h2>
          {profile.razao_social && (
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
              {profile.razao_social}
              {profile.cnpj ? ` · CNPJ ${formatCnpj(profile.cnpj)}` : ''}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
          <span className={clsx('portal-pill', profile.is_active ? 'portal-pill-success' : 'portal-pill-neutral')}>
            {profile.is_active ? 'Ativo' : 'Inativo'}
          </span>
          {isUnavailable && (
            <span className="portal-pill portal-pill-warning">
              Indisponível até {new Date(profile.unavailable_until!).toLocaleDateString('pt-BR')}
            </span>
          )}
        </div>
      </div>

      {/* ── Score + PIX row ─────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <section className="portal-card">
          <ScoreRing score={score} />
          {(profile.deliveries_total ?? 0) > 0 && (
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 10 }}>
              {profile.deliveries_on_time ?? 0} de {profile.deliveries_total} entregas no prazo
            </p>
          )}
        </section>

        <section className="portal-card">
          <h3 className="portal-section-title" style={{ marginBottom: 12 }}>Pagamento PJ</h3>
          <div className="portal-profile-field">
            <span className="portal-profile-label">Chave PIX</span>
            <span className="portal-profile-value" style={{ fontFamily: 'monospace', fontSize: 13 }}>
              {profile.pix_key ?? '—'}
            </span>
          </div>
          {profile.pix_key_type && (
            <div style={{ marginTop: 4 }}>
              <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 999, background: 'rgba(19,222,185,0.1)', color: '#13DEB9', fontWeight: 700 }}>
                {profile.pix_key_type.toUpperCase()}
              </span>
            </div>
          )}
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 10, lineHeight: 1.5 }}>
            Pagamentos exclusivamente para CNPJ. Liberação até o dia 10 após emissão de NF.
          </p>
        </section>
      </div>

      {/* ── Arsenal (skills) ────────────────────────────────────────────────── */}
      <section className="portal-card">
        <div className="portal-section-head" style={{ marginBottom: 16 }}>
          <h3 className="portal-section-title">Arsenal</h3>
          {profile.portfolio_url && (
            <a
              href={profile.portfolio_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: 12, color: '#5D87FF', textDecoration: 'none', fontWeight: 600 }}
            >
              Ver portfólio →
            </a>
          )}
        </div>

        {skills.length === 0 ? (
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' }}>
            Nenhuma especialidade cadastrada. Complete o onboarding para adicionar suas skills.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {(Object.entries(byCategory) as [SkillCategory, SkillEntry[]][]).map(([cat, catSkills]) => (
              <div key={cat}>
                <div style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.3)', marginBottom: 8,
                }}>
                  {CATEGORY_LABELS[cat] ?? cat}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {catSkills.map(s => <SkillTag key={s.id} skill={s} />)}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Dados profissionais (read-only) ─────────────────────────────────── */}
      <section className="portal-card">
        <div className="portal-section-head" style={{ marginBottom: 16 }}>
          <h3 className="portal-section-title">Dados profissionais</h3>
          <span className="portal-pill portal-pill-neutral" style={{ fontSize: '0.72rem' }}>
            Gerenciado pelo admin
          </span>
        </div>
        <div className="portal-profile-grid">
          <div className="portal-profile-field">
            <span className="portal-profile-label">Email corporativo</span>
            <span className="portal-profile-value">{profile.email ?? '—'}</span>
          </div>
          <div className="portal-profile-field">
            <span className="portal-profile-label">Especialidade</span>
            <span className="portal-profile-value">{profile.specialty ?? '—'}</span>
          </div>
          <div className="portal-profile-field">
            <span className="portal-profile-label">Valor hora</span>
            <span className="portal-profile-value">
              {profile.hourly_rate_brl
                ? `R$ ${parseFloat(profile.hourly_rate_brl).toFixed(2)}/h`
                : 'Projeto flat-fee'}
            </span>
          </div>
        </div>
      </section>

      {/* ── Informações de contato (editable) ───────────────────────────────── */}
      <section className="portal-card">
        <div className="portal-section-head" style={{ marginBottom: 16 }}>
          <h3 className="portal-section-title">Informações de contato</h3>
          {!editingContact && (
            <button type="button" className="portal-button-secondary" onClick={startEditingContact}>
              Editar
            </button>
          )}
        </div>

        {editingContact ? (
          <div className="portal-profile-form">
            <div className="portal-profile-form-grid">
              <div>
                <label className="portal-field-label">Cargo / Função</label>
                <input className="portal-input" value={roleTitle} onChange={e => setRoleTitle(e.target.value)} placeholder="Ex: Social Media Manager" />
              </div>
              <div>
                <label className="portal-field-label">Departamento</label>
                <input className="portal-input" value={department} onChange={e => setDepartment(e.target.value)} placeholder="Ex: Marketing" />
              </div>
              <div>
                <label className="portal-field-label">Telefone</label>
                <input className="portal-input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+55 11 99999-9999" />
              </div>
              <div>
                <label className="portal-field-label">Email pessoal</label>
                <input className="portal-input" type="email" value={emailPersonal} onChange={e => setEmailPersonal(e.target.value)} placeholder="seuemail@pessoal.com" />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="portal-field-label">WhatsApp JID</label>
                <input className="portal-input" value={whatsappJid} onChange={e => setWhatsappJid(e.target.value)} placeholder="5511999999999@s.whatsapp.net" />
                <p className="portal-field-hint">Formato: número completo + @s.whatsapp.net</p>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="portal-field-label">Observações</label>
                <textarea className="portal-textarea" value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Horários de preferência, observações gerais..." title="Observações" />
              </div>
            </div>
            <div className="portal-inline-stack" style={{ marginTop: 16 }}>
              <button type="button" className="portal-button" onClick={handleSaveContact} disabled={savingContact}>
                {savingContact ? 'Salvando...' : 'Salvar'}
              </button>
              <button type="button" className="portal-button-ghost" onClick={() => setEditingContact(false)} disabled={savingContact}>
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <div className="portal-profile-grid">
            <div className="portal-profile-field">
              <span className="portal-profile-label">Cargo / Função</span>
              <span className="portal-profile-value">{profile.role_title ?? '—'}</span>
            </div>
            <div className="portal-profile-field">
              <span className="portal-profile-label">Departamento</span>
              <span className="portal-profile-value">{profile.department ?? '—'}</span>
            </div>
            <div className="portal-profile-field">
              <span className="portal-profile-label">Telefone</span>
              <span className="portal-profile-value">{profile.phone ?? '—'}</span>
            </div>
            <div className="portal-profile-field">
              <span className="portal-profile-label">Email pessoal</span>
              <span className="portal-profile-value">{profile.email_personal ?? '—'}</span>
            </div>
            <div className="portal-profile-field">
              <span className="portal-profile-label">WhatsApp</span>
              <span className="portal-profile-value">
                {profile.whatsapp_jid ? (
                  <span className="portal-whatsapp-badge">{formatJid(profile.whatsapp_jid)}</span>
                ) : '—'}
              </span>
            </div>
            {profile.notes && (
              <div className="portal-profile-field" style={{ gridColumn: '1 / -1' }}>
                <span className="portal-profile-label">Observações</span>
                <span className="portal-profile-value">{profile.notes}</span>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ── Disponibilidade (editable) ───────────────────────────────────────── */}
      <section className="portal-card">
        <div className="portal-section-head" style={{ marginBottom: 16 }}>
          <h3 className="portal-section-title">Disponibilidade</h3>
          {!editingAvail && (
            <button type="button" className="portal-button-secondary" onClick={startEditingAvail}>
              Editar
            </button>
          )}
        </div>

        {editingAvail ? (
          <div className="portal-profile-form">
            <div style={{ marginBottom: 20 }}>
              <label className="portal-field-label" style={{ display: 'block', marginBottom: 10 }}>Dias disponíveis</label>
              <div className="portal-day-grid">
                {DAYS.map(d => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => toggleDay(d.id)}
                    className={clsx('portal-day-btn', availDays.includes(d.id) && 'portal-day-btn-active')}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="portal-profile-form-grid">
              <div>
                <label className="portal-field-label" htmlFor="hours-start">Horário início</label>
                <input id="hours-start" type="time" className="portal-input" value={hoursStart} onChange={e => setHoursStart(e.target.value)} title="Horário de início" />
              </div>
              <div>
                <label className="portal-field-label" htmlFor="hours-end">Horário fim</label>
                <input id="hours-end" type="time" className="portal-input" value={hoursEnd} onChange={e => setHoursEnd(e.target.value)} title="Horário de fim" />
              </div>
              <div>
                <label className="portal-field-label">Capacidade semanal (escopos)</label>
                <input type="number" min="1" max="80" className="portal-input" value={capacityHours} onChange={e => setCapacityHours(e.target.value)} placeholder="Ex: 4" />
              </div>
              <div>
                <label className="portal-field-label">Indisponível até</label>
                <input type="date" className="portal-input" value={unavailUntil} onChange={e => setUnavailUntil(e.target.value)} title="Indisponível até" />
                <p className="portal-field-hint">Deixe em branco se disponível agora.</p>
              </div>
            </div>
            <div className="portal-inline-stack" style={{ marginTop: 16 }}>
              <button type="button" className="portal-button" onClick={handleSaveAvail} disabled={savingAvail}>
                {savingAvail ? 'Salvando...' : 'Salvar'}
              </button>
              <button type="button" className="portal-button-ghost" onClick={() => setEditingAvail(false)} disabled={savingAvail}>
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <div className="portal-profile-grid">
            <div className="portal-profile-field">
              <span className="portal-profile-label">Dias</span>
              <span className="portal-profile-value">
                {profile.available_days?.length
                  ? profile.available_days.map(d => DAYS.find(x => x.id === d)?.label ?? d).join(', ')
                  : '—'}
              </span>
            </div>
            <div className="portal-profile-field">
              <span className="portal-profile-label">Horário</span>
              <span className="portal-profile-value">
                {profile.available_hours_start && profile.available_hours_end
                  ? `${profile.available_hours_start} – ${profile.available_hours_end}`
                  : '—'}
              </span>
            </div>
            <div className="portal-profile-field">
              <span className="portal-profile-label">Capacidade semanal</span>
              <span className="portal-profile-value">
                {profile.weekly_capacity_hours ? `${parseFloat(profile.weekly_capacity_hours)} escopos/semana` : '—'}
              </span>
            </div>
            {profile.unavailable_until && (
              <div className="portal-profile-field">
                <span className="portal-profile-label">Indisponível até</span>
                <span className={clsx('portal-profile-value', isUnavailable && 'portal-profile-value-warning')}>
                  {new Date(profile.unavailable_until).toLocaleDateString('pt-BR')}
                </span>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
