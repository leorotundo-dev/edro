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
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [phone, setPhone] = useState('');
  const [whatsappJid, setWhatsappJid] = useState('');
  const [department, setDepartment] = useState('');
  const [roleTitle, setRoleTitle] = useState('');
  const [emailPersonal, setEmailPersonal] = useState('');
  const [notes, setNotes] = useState('');

  function startEditing() {
    if (!profile) return;
    setPhone(profile.phone ?? '');
    setWhatsappJid(profile.whatsapp_jid ?? '');
    setDepartment(profile.department ?? '');
    setRoleTitle(profile.role_title ?? '');
    setEmailPersonal(profile.email_personal ?? '');
    setNotes(profile.notes ?? '');
    setEditing(true);
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
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
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  }

  if (!profile) {
    return (
      <div className="portal-empty">
        <div>
          <p className="portal-card-title">Carregando perfil</p>
          <p className="portal-card-subtitle">Sincronizando suas informacoes.</p>
        </div>
      </div>
    );
  }

  const specialtyMap: Record<string, string> = {
    copy: 'Copywriter',
    design: 'Design',
    video: 'Video',
    revisao: 'Revisao',
    trafego: 'Trafego',
    social: 'Social Media',
  };

  return (
    <div className="portal-page">
      <div className="portal-page-header">
        <div>
          <span className="portal-kicker">Meu perfil</span>
          <h2 className="portal-page-title">{profile.display_name}</h2>
          <p className="portal-page-subtitle">
            Suas informacoes de contato e dados profissionais dentro do Edro Studio.
          </p>
        </div>
        <span className={clsx('portal-pill', profile.is_active ? 'portal-pill-success' : 'portal-pill-neutral')}>
          {profile.is_active ? 'Ativo' : 'Inativo'}
        </span>
      </div>

      {saved && (
        <div className="portal-alert portal-alert-success">Dados atualizados com sucesso.</div>
      )}

      {/* Identity card — read-only info managed by admin */}
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
              {profile.specialty ? (specialtyMap[profile.specialty] ?? profile.specialty) : '—'}
            </span>
          </div>
          <div className="portal-profile-field">
            <span className="portal-profile-label">Valor hora</span>
            <span className="portal-profile-value">
              {profile.hourly_rate_brl ? `R$ ${parseFloat(profile.hourly_rate_brl).toFixed(2)}/h` : 'Projeto flat-fee'}
            </span>
          </div>
          <div className="portal-profile-field">
            <span className="portal-profile-label">Chave PIX</span>
            <span className="portal-profile-value">{profile.pix_key ?? '—'}</span>
          </div>
        </div>
      </section>

      {/* Contact info — editable by the freelancer */}
      <section className="portal-card">
        <div className="portal-section-head" style={{ marginBottom: 16 }}>
          <h3 className="portal-section-title">Informacoes de contato</h3>
          {!editing && (
            <button className="portal-button-secondary" onClick={startEditing}>
              Editar
            </button>
          )}
        </div>

        {editing ? (
          <div className="portal-profile-form">
            <div className="portal-profile-form-grid">
              <div>
                <label className="portal-field-label">Cargo / Funcao</label>
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
                <p className="portal-field-hint">Formato: numero completo + @s.whatsapp.net</p>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="portal-field-label">Observacoes</label>
                <textarea
                  className="portal-textarea"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Horarios de preferencia, observacoes gerais..."
                  rows={3}
                />
              </div>
            </div>
            <div className="portal-inline-stack" style={{ marginTop: 16 }}>
              <button className="portal-button" onClick={handleSave} disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
              <button className="portal-button-ghost" onClick={() => setEditing(false)} disabled={saving}>
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <div className="portal-profile-grid">
            <div className="portal-profile-field">
              <span className="portal-profile-label">Cargo / Funcao</span>
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
                  <span className="portal-whatsapp-badge">
                    {formatJid(profile.whatsapp_jid)}
                  </span>
                ) : '—'}
              </span>
            </div>
            <div className="portal-profile-field" style={{ gridColumn: '1 / -1' }}>
              <span className="portal-profile-label">Observacoes</span>
              <span className="portal-profile-value">{profile.notes ?? '—'}</span>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
