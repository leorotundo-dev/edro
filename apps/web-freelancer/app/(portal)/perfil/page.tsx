'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { swrFetcher, apiPatch } from '@/lib/api';
import clsx from 'clsx';

type Profile = {
  id: string;
  display_name: string;
  specialty: string | null;
  hourly_rate_brl: string | null;
  pix_key: string | null;
  email: string | null;
  phone: string | null;
  whatsapp_jid: string | null;
  department: string | null;
  role_title: string | null;
  email_personal: string | null;
  notes: string | null;
  is_active: boolean;
  // availability
  available_days: string[] | null;
  available_hours_start: string | null;
  available_hours_end: string | null;
  weekly_capacity_hours: string | null;
  unavailable_until: string | null;
};

const DAYS = [
  { id: 'mon', label: 'Seg' },
  { id: 'tue', label: 'Ter' },
  { id: 'wed', label: 'Qua' },
  { id: 'thu', label: 'Qui' },
  { id: 'fri', label: 'Sex' },
  { id: 'sat', label: 'Sáb' },
  { id: 'sun', label: 'Dom' },
];

const SPECIALTY_MAP: Record<string, string> = {
  copy: 'Copywriter',
  design: 'Design',
  video: 'Vídeo',
  revisao: 'Revisão',
  trafego: 'Tráfego',
  social: 'Social Media',
};

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

export default function PerfilPage() {
  const { data: profile, mutate } = useSWR<Profile>('/freelancers/portal/me', swrFetcher);

  // Contact editing state
  const [editingContact, setEditingContact] = useState(false);
  const [savingContact, setSavingContact] = useState(false);
  const [savedContact, setSavedContact] = useState(false);
  const [phone, setPhone] = useState('');
  const [whatsappJid, setWhatsappJid] = useState('');
  const [department, setDepartment] = useState('');
  const [roleTitle, setRoleTitle] = useState('');
  const [emailPersonal, setEmailPersonal] = useState('');
  const [notes, setNotes] = useState('');

  // Availability editing state
  const [editingAvail, setEditingAvail] = useState(false);
  const [savingAvail, setSavingAvail] = useState(false);
  const [savedAvail, setSavedAvail] = useState(false);
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
    setSavedContact(false);
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
      setSavedContact(true);
      setTimeout(() => setSavedContact(false), 3000);
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
    setUnavailUntil(
      profile.unavailable_until
        ? profile.unavailable_until.slice(0, 10)
        : '',
    );
    setEditingAvail(true);
    setSavedAvail(false);
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
      setSavedAvail(true);
      setTimeout(() => setSavedAvail(false), 3000);
    } finally {
      setSavingAvail(false);
    }
  }

  function toggleDay(day: string) {
    setAvailDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  }

  if (!profile) {
    return (
      <div className="portal-empty">
        <div>
          <p className="portal-card-title">Carregando perfil</p>
          <p className="portal-card-subtitle">Sincronizando suas informações.</p>
        </div>
      </div>
    );
  }

  const isUnavailable =
    profile.unavailable_until && new Date(profile.unavailable_until) > new Date();

  return (
    <div className="portal-page">
      <div className="portal-page-header">
        <div>
          <span className="portal-kicker">Meu perfil</span>
          <h2 className="portal-page-title">{profile.display_name}</h2>
          <p className="portal-page-subtitle">
            Suas informações de contato e disponibilidade dentro do Edro Studio.
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
          <span
            className={clsx('portal-pill', profile.is_active ? 'portal-pill-success' : 'portal-pill-neutral')}
          >
            {profile.is_active ? 'Ativo' : 'Inativo'}
          </span>
          {isUnavailable && (
            <span className="portal-pill portal-pill-warning">
              Indisponível até {new Date(profile.unavailable_until!).toLocaleDateString('pt-BR')}
            </span>
          )}
        </div>
      </div>

      {(savedContact || savedAvail) && (
        <div className="portal-alert portal-alert-success">Dados atualizados com sucesso.</div>
      )}

      {/* ── Dados profissionais — read-only ─────────────────────────────── */}
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
            <span className="portal-profile-value">
              {profile.specialty ? (SPECIALTY_MAP[profile.specialty] ?? profile.specialty) : '—'}
            </span>
          </div>
          <div className="portal-profile-field">
            <span className="portal-profile-label">Valor hora</span>
            <span className="portal-profile-value">
              {profile.hourly_rate_brl
                ? `R$ ${parseFloat(profile.hourly_rate_brl).toFixed(2)}/h`
                : 'Projeto flat-fee'}
            </span>
          </div>
          <div className="portal-profile-field">
            <span className="portal-profile-label">Chave PIX</span>
            <span className="portal-profile-value">{profile.pix_key ?? '—'}</span>
          </div>
        </div>
      </section>

      {/* ── Informações de contato — editable ───────────────────────────── */}
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
                <input
                  className="portal-input"
                  value={roleTitle}
                  onChange={(e) => setRoleTitle(e.target.value)}
                  placeholder="Ex: Social Media Manager"
                />
              </div>
              <div>
                <label className="portal-field-label">Departamento</label>
                <input
                  className="portal-input"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="Ex: Marketing"
                />
              </div>
              <div>
                <label className="portal-field-label">Telefone</label>
                <input
                  className="portal-input"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+55 11 99999-9999"
                />
              </div>
              <div>
                <label className="portal-field-label">Email pessoal</label>
                <input
                  className="portal-input"
                  type="email"
                  value={emailPersonal}
                  onChange={(e) => setEmailPersonal(e.target.value)}
                  placeholder="seuemail@pessoal.com"
                />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="portal-field-label">WhatsApp JID</label>
                <input
                  className="portal-input"
                  value={whatsappJid}
                  onChange={(e) => setWhatsappJid(e.target.value)}
                  placeholder="5511999999999@s.whatsapp.net"
                />
                <p className="portal-field-hint">Formato: número completo + @s.whatsapp.net</p>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="portal-field-label">Observações</label>
                <textarea
                  className="portal-textarea"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Horários de preferência, observações gerais..."
                  rows={3}
                />
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
            <div className="portal-profile-field" style={{ gridColumn: '1 / -1' }}>
              <span className="portal-profile-label">Observações</span>
              <span className="portal-profile-value">{profile.notes ?? '—'}</span>
            </div>
          </div>
        )}
      </section>

      {/* ── Disponibilidade — editable ───────────────────────────────────── */}
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
            {/* Days */}
            <div style={{ marginBottom: 20 }}>
              <label className="portal-field-label" style={{ display: 'block', marginBottom: 10 }}>
                Dias disponíveis
              </label>
              <div className="portal-day-grid">
                {DAYS.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => toggleDay(d.id)}
                    className={clsx(
                      'portal-day-btn',
                      availDays.includes(d.id) && 'portal-day-btn-active',
                    )}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Hours */}
            <div className="portal-profile-form-grid">
              <div>
                <label className="portal-field-label" htmlFor="avail-hours-start">Horário início</label>
                <input
                  id="avail-hours-start"
                  type="time"
                  className="portal-input"
                  value={hoursStart}
                  onChange={(e) => setHoursStart(e.target.value)}
                  title="Horário de início de disponibilidade"
                />
              </div>
              <div>
                <label className="portal-field-label" htmlFor="avail-hours-end">Horário fim</label>
                <input
                  id="avail-hours-end"
                  type="time"
                  className="portal-input"
                  value={hoursEnd}
                  onChange={(e) => setHoursEnd(e.target.value)}
                  title="Horário de fim de disponibilidade"
                />
              </div>
              <div>
                <label className="portal-field-label" htmlFor="avail-capacity">Capacidade semanal (horas)</label>
                <input
                  id="avail-capacity"
                  type="number"
                  min="1"
                  max="80"
                  className="portal-input"
                  value={capacityHours}
                  onChange={(e) => setCapacityHours(e.target.value)}
                  placeholder="Ex: 20"
                />
              </div>
              <div>
                <label className="portal-field-label">Indisponível até</label>
                <input
                  type="date"
                  className="portal-input"
                  value={unavailUntil}
                  onChange={(e) => setUnavailUntil(e.target.value)}
                />
                <p className="portal-field-hint">
                  Deixe em branco se estiver disponível agora.
                </p>
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
                  ? profile.available_days
                      .map((d) => DAYS.find((x) => x.id === d)?.label ?? d)
                      .join(', ')
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
                {profile.weekly_capacity_hours
                  ? `${parseFloat(profile.weekly_capacity_hours)}h/semana`
                  : '—'}
              </span>
            </div>
            <div className="portal-profile-field">
              <span className="portal-profile-label">Indisponível até</span>
              <span
                className={clsx(
                  'portal-profile-value',
                  isUnavailable && 'portal-profile-value-warning',
                )}
              >
                {profile.unavailable_until
                  ? new Date(profile.unavailable_until).toLocaleDateString('pt-BR')
                  : '—'}
              </span>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
