'use client';

import { useEffect, useRef, useState } from 'react';
import useSWR from 'swr';
import clsx from 'clsx';
import ArsenalPicker, { type SelectedSkill } from '@/components/ArsenalPicker';
import { apiGet, apiPatch, apiPostFormData, swrFetcher } from '@/lib/api';

type Profile = {
  display_name: string;
  avatar_url: string | null;
  avatar_generation_status?: string | null;
  avatar_prompt_version?: string | null;
  specialty: string | null;
  hourly_rate_brl: string | null;
  pix_key: string | null;
  pix_key_type: 'cnpj' | 'cpf' | 'email' | 'telefone' | 'aleatoria' | null;
  email: string | null;
  phone: string | null;
  whatsapp_jid: string | null;
  department: string | null;
  role_title: string | null;
  email_personal: string | null;
  notes: string | null;
  is_active: boolean;
  skills_json: SelectedSkill[] | null;
  portfolio_url: string | null;
  razao_social: string | null;
  cnpj: string | null;
  nome_fantasia: string | null;
  inscricao_municipal: string | null;
  address_street: string | null;
  address_number: string | null;
  address_complement: string | null;
  address_district: string | null;
  address_city: string | null;
  address_state: string | null;
  address_cep: string | null;
  representante_nome: string | null;
  representante_cpf: string | null;
  estado_civil: string | null;
  bank_name: string | null;
  bank_agency: string | null;
  bank_account: string | null;
  weekly_capacity: number | null;
  sla_score: string | null;
  deliveries_total: number | null;
  deliveries_on_time: number | null;
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

function formatCnpj(raw: string) {
  const c = raw.replace(/\D/g, '');
  return c.length === 14 ? `${c.slice(0, 2)}.${c.slice(2, 5)}.${c.slice(5, 8)}/${c.slice(8, 12)}-${c.slice(12)}` : raw;
}

function formatJid(jid: string) {
  const num = jid.replace(/@s\.whatsapp\.net$/, '');
  if (num.length >= 12) return `+${num.slice(0, 2)} (${num.slice(2, 4)}) ${num.slice(4, -4)}-${num.slice(-4)}`;
  return num;
}

function ScoreRing({ score }: { score: number }) {
  const color = score >= 90 ? '#13DEB9' : score >= 75 ? '#5D87FF' : score >= 60 ? '#FFAE1F' : '#FA896B';
  const r = 28;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <div style={{ position: 'relative', width: 72, height: 72 }}>
        <svg width="72" height="72" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="36" cy="36" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
          <circle cx="36" cy="36" r={r} fill="none" stroke={color} strokeWidth="6" strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color, fontWeight: 800 }}>{score}</div>
      </div>
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color }}>Score SLA</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>Pontualidade e consistência</div>
      </div>
    </div>
  );
}

export default function PerfilPage() {
  const { data: profile, mutate } = useSWR<Profile>('/freelancers/portal/me', swrFetcher);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  const [contact, setContact] = useState({ phone: '', whatsapp_jid: '', department: '', role_title: '', email_personal: '', notes: '' });
  const [availability, setAvailability] = useState({ available_days: [] as string[], available_hours_start: '', available_hours_end: '', weekly_capacity_hours: '', unavailable_until: '' });
  const [legal, setLegal] = useState({
    cnpj: '', razao_social: '', nome_fantasia: '', inscricao_municipal: '',
    address_street: '', address_number: '', address_complement: '', address_district: '', address_city: '', address_state: '', address_cep: '',
    representante_nome: '', representante_cpf: '', estado_civil: '',
  });
  const [payment, setPayment] = useState({ pix_key: '', pix_key_type: 'cnpj' as 'cnpj' | 'cpf' | 'email' | 'telefone' | 'aleatoria', bank_name: '', bank_agency: '', bank_account: '' });
  const [arsenal, setArsenal] = useState({ skills_json: [] as SelectedSkill[], portfolio_url: '', weekly_capacity: 40 });
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<Record<string, string>>({});
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState('');

  useEffect(() => {
    if (!profile) return;
    setContact({
      phone: profile.phone ?? '',
      whatsapp_jid: profile.whatsapp_jid ?? '',
      department: profile.department ?? '',
      role_title: profile.role_title ?? '',
      email_personal: profile.email_personal ?? '',
      notes: profile.notes ?? '',
    });
    setAvailability({
      available_days: profile.available_days ?? [],
      available_hours_start: profile.available_hours_start ?? '',
      available_hours_end: profile.available_hours_end ?? '',
      weekly_capacity_hours: profile.weekly_capacity_hours ?? '',
      unavailable_until: profile.unavailable_until ? profile.unavailable_until.slice(0, 10) : '',
    });
    setLegal({
      cnpj: profile.cnpj ?? '',
      razao_social: profile.razao_social ?? '',
      nome_fantasia: profile.nome_fantasia ?? '',
      inscricao_municipal: profile.inscricao_municipal ?? '',
      address_street: profile.address_street ?? '',
      address_number: profile.address_number ?? '',
      address_complement: profile.address_complement ?? '',
      address_district: profile.address_district ?? '',
      address_city: profile.address_city ?? '',
      address_state: profile.address_state ?? '',
      address_cep: profile.address_cep ?? '',
      representante_nome: profile.representante_nome ?? '',
      representante_cpf: profile.representante_cpf ?? '',
      estado_civil: profile.estado_civil ?? '',
    });
    setPayment({
      pix_key: profile.pix_key ?? '',
      pix_key_type: profile.pix_key_type ?? 'cnpj',
      bank_name: profile.bank_name ?? '',
      bank_agency: profile.bank_agency ?? '',
      bank_account: profile.bank_account ?? '',
    });
    setArsenal({
      skills_json: Array.isArray(profile.skills_json) ? profile.skills_json : [],
      portfolio_url: profile.portfolio_url ?? '',
      weekly_capacity: profile.weekly_capacity ?? 40,
    });
  }, [profile]);

  async function saveSection(section: string, payload: Record<string, unknown>) {
    setSaving((prev) => ({ ...prev, [section]: true }));
    setError((prev) => ({ ...prev, [section]: '' }));
    try {
      await apiPatch('/freelancers/portal/me', payload);
      await mutate();
    } catch (e: any) {
      setError((prev) => ({ ...prev, [section]: e?.message ?? 'Não foi possível salvar.' }));
    } finally {
      setSaving((prev) => ({ ...prev, [section]: false }));
    }
  }

  async function lookupCnpj() {
    const clean = legal.cnpj.replace(/\D/g, '');
    if (clean.length !== 14) {
      setError((prev) => ({ ...prev, legal: 'Digite os 14 dígitos do CNPJ.' }));
      return;
    }
    setSaving((prev) => ({ ...prev, legal_lookup: true }));
    setError((prev) => ({ ...prev, legal: '' }));
    try {
      const data = await apiGet<any>(`/freelancers/portal/cnpj/${clean}`);
      setLegal((prev) => ({
        ...prev,
        razao_social: data?.razao_social ?? prev.razao_social,
        nome_fantasia: data?.nome_fantasia ?? prev.nome_fantasia,
        address_street: data?.logradouro ?? prev.address_street,
        address_number: data?.numero ?? prev.address_number,
        address_complement: data?.complemento ?? prev.address_complement,
        address_district: data?.bairro ?? prev.address_district,
        address_city: data?.municipio ?? prev.address_city,
        address_state: data?.uf ?? prev.address_state,
        address_cep: (data?.cep ?? '').replace(/\D/g, '') || prev.address_cep,
      }));
    } catch {
      setError((prev) => ({ ...prev, legal: 'Não foi possível consultar esse CNPJ agora.' }));
    } finally {
      setSaving((prev) => ({ ...prev, legal_lookup: false }));
    }
  }

  async function generateAvatar() {
    const file = avatarFile ?? avatarInputRef.current?.files?.[0] ?? null;
    if (!file) {
      setError((prev) => ({ ...prev, avatar: 'Selecione uma foto antes de gerar o avatar.' }));
      return;
    }
    setSaving((prev) => ({ ...prev, avatar: true }));
    setError((prev) => ({ ...prev, avatar: '' }));
    try {
      const formData = new FormData();
      formData.append('file', file);
      await apiPostFormData('/freelancers/portal/me/avatar', formData);
      await mutate();
      setAvatarFile(null);
      setAvatarPreview('');
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    } catch (e: any) {
      setError((prev) => ({ ...prev, avatar: e?.message ?? 'Não foi possível gerar o avatar.' }));
    } finally {
      setSaving((prev) => ({ ...prev, avatar: false }));
    }
  }

  if (!profile) {
    return <div className="portal-empty"><p className="portal-card-title">Carregando perfil</p></div>;
  }

  const score = parseFloat(profile.sla_score ?? '100') || 100;
  const isUnavailable = profile.unavailable_until && new Date(profile.unavailable_until) > new Date();

  return (
    <div className="portal-page">
      <div className="portal-page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 80, height: 80, borderRadius: 18, overflow: 'hidden', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', display: 'grid', placeItems: 'center', color: 'rgba(255,255,255,0.5)', fontWeight: 800, fontSize: 24 }}>
            {profile.avatar_url ? <img src={profile.avatar_url} alt={profile.display_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : profile.display_name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <span className="portal-kicker">Meu perfil</span>
            <h2 className="portal-page-title">{profile.display_name}</h2>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>{profile.razao_social ?? 'Preencha seus dados da empresa abaixo'}</p>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
          <span className={clsx('portal-pill', profile.is_active ? 'portal-pill-success' : 'portal-pill-neutral')}>{profile.is_active ? 'Ativo' : 'Inativo'}</span>
          {isUnavailable && <span className="portal-pill portal-pill-warning">Indisponível até {new Date(profile.unavailable_until!).toLocaleDateString('pt-BR')}</span>}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <section className="portal-card"><ScoreRing score={score} /></section>
        <section className="portal-card">
          <h3 className="portal-section-title" style={{ marginBottom: 12 }}>Avatar Edro</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '88px 1fr', gap: 14, alignItems: 'center' }}>
            <div style={{ width: 88, height: 88, borderRadius: 18, overflow: 'hidden', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', display: 'grid', placeItems: 'center' }}>
              {avatarPreview ? <img src={avatarPreview} alt="Novo avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : profile.avatar_url ? <img src={profile.avatar_url} alt={profile.display_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : profile.display_name.slice(0, 2).toUpperCase()}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <input
                ref={avatarInputRef}
                className="portal-input"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  setAvatarFile(file);
                  setError((prev) => ({ ...prev, avatar: '' }));
                  setAvatarPreview(file ? URL.createObjectURL(file) : '');
                }}
              />
              <button type="button" className="portal-button" onClick={generateAvatar} disabled={saving.avatar}>{saving.avatar ? 'Gerando avatar...' : 'Gerar avatar'}</button>
              {error.avatar && <span style={{ fontSize: 12, color: '#FA896B' }}>{error.avatar}</span>}
            </div>
          </div>
        </section>
      </div>

      <section className="portal-card">
        <h3 className="portal-section-title" style={{ marginBottom: 16 }}>Cadastro PJ</h3>
        <div className="portal-profile-form-grid">
          <div style={{ gridColumn: '1 / -1' }}>
            <label className="portal-field-label">CNPJ</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="portal-input" value={legal.cnpj} onChange={(e) => setLegal((prev) => ({ ...prev, cnpj: e.target.value }))} placeholder="00.000.000/0001-00" />
              <button type="button" className="portal-button-secondary" onClick={lookupCnpj} disabled={saving.legal_lookup}>{saving.legal_lookup ? 'Buscando...' : 'Buscar CNPJ'}</button>
            </div>
          </div>
          <div><label className="portal-field-label">Razão social</label><input className="portal-input" value={legal.razao_social} onChange={(e) => setLegal((prev) => ({ ...prev, razao_social: e.target.value }))} /></div>
          <div><label className="portal-field-label">Nome fantasia</label><input className="portal-input" value={legal.nome_fantasia} onChange={(e) => setLegal((prev) => ({ ...prev, nome_fantasia: e.target.value }))} /></div>
          <div><label className="portal-field-label">Inscrição municipal</label><input className="portal-input" value={legal.inscricao_municipal} onChange={(e) => setLegal((prev) => ({ ...prev, inscricao_municipal: e.target.value }))} /></div>
          <div><label className="portal-field-label">Representante legal</label><input className="portal-input" value={legal.representante_nome} onChange={(e) => setLegal((prev) => ({ ...prev, representante_nome: e.target.value }))} /></div>
          <div><label className="portal-field-label">CPF do representante</label><input className="portal-input" value={legal.representante_cpf} onChange={(e) => setLegal((prev) => ({ ...prev, representante_cpf: e.target.value }))} /></div>
          <div><label className="portal-field-label">Estado civil</label><input className="portal-input" value={legal.estado_civil} onChange={(e) => setLegal((prev) => ({ ...prev, estado_civil: e.target.value }))} /></div>
          <div><label className="portal-field-label">Logradouro</label><input className="portal-input" value={legal.address_street} onChange={(e) => setLegal((prev) => ({ ...prev, address_street: e.target.value }))} /></div>
          <div><label className="portal-field-label">Número</label><input className="portal-input" value={legal.address_number} onChange={(e) => setLegal((prev) => ({ ...prev, address_number: e.target.value }))} /></div>
          <div><label className="portal-field-label">Complemento</label><input className="portal-input" value={legal.address_complement} onChange={(e) => setLegal((prev) => ({ ...prev, address_complement: e.target.value }))} /></div>
          <div><label className="portal-field-label">Bairro</label><input className="portal-input" value={legal.address_district} onChange={(e) => setLegal((prev) => ({ ...prev, address_district: e.target.value }))} /></div>
          <div><label className="portal-field-label">Cidade</label><input className="portal-input" value={legal.address_city} onChange={(e) => setLegal((prev) => ({ ...prev, address_city: e.target.value }))} /></div>
          <div><label className="portal-field-label">UF</label><input className="portal-input" value={legal.address_state} onChange={(e) => setLegal((prev) => ({ ...prev, address_state: e.target.value.toUpperCase() }))} maxLength={2} /></div>
          <div><label className="portal-field-label">CEP</label><input className="portal-input" value={legal.address_cep} onChange={(e) => setLegal((prev) => ({ ...prev, address_cep: e.target.value }))} /></div>
        </div>
        {error.legal && <p style={{ marginTop: 12, fontSize: 12, color: '#FA896B' }}>{error.legal}</p>}
        <div className="portal-inline-stack" style={{ marginTop: 16 }}><button type="button" className="portal-button" onClick={() => saveSection('legal', legal)} disabled={saving.legal}>{saving.legal ? 'Salvando...' : 'Salvar cadastro PJ'}</button></div>
      </section>

      <section className="portal-card">
        <h3 className="portal-section-title" style={{ marginBottom: 16 }}>Pagamento e PIX</h3>
        <div className="portal-profile-form-grid">
          <div><label className="portal-field-label">Tipo de chave PIX</label><select className="portal-input" value={payment.pix_key_type} onChange={(e) => setPayment((prev) => ({ ...prev, pix_key_type: e.target.value as any }))} title="Tipo de chave PIX"><option value="cnpj">CNPJ</option><option value="cpf">CPF</option><option value="email">E-mail</option><option value="telefone">Telefone</option><option value="aleatoria">Aleatória</option></select></div>
          <div><label className="portal-field-label">Chave PIX</label><input className="portal-input" value={payment.pix_key} onChange={(e) => setPayment((prev) => ({ ...prev, pix_key: e.target.value }))} /></div>
          <div><label className="portal-field-label">Banco</label><input className="portal-input" value={payment.bank_name} onChange={(e) => setPayment((prev) => ({ ...prev, bank_name: e.target.value }))} /></div>
          <div><label className="portal-field-label">Agência</label><input className="portal-input" value={payment.bank_agency} onChange={(e) => setPayment((prev) => ({ ...prev, bank_agency: e.target.value }))} /></div>
          <div><label className="portal-field-label">Conta</label><input className="portal-input" value={payment.bank_account} onChange={(e) => setPayment((prev) => ({ ...prev, bank_account: e.target.value }))} /></div>
        </div>
        {error.payment && <p style={{ marginTop: 12, fontSize: 12, color: '#FA896B' }}>{error.payment}</p>}
        <div className="portal-inline-stack" style={{ marginTop: 16 }}><button type="button" className="portal-button" onClick={() => saveSection('payment', payment)} disabled={saving.payment}>{saving.payment ? 'Salvando...' : 'Salvar pagamento'}</button></div>
      </section>

      <section className="portal-card">
        <h3 className="portal-section-title" style={{ marginBottom: 16 }}>Arsenal</h3>
        <ArsenalPicker value={arsenal.skills_json} onChange={(skills_json) => setArsenal((prev) => ({ ...prev, skills_json }))} />
        <div className="portal-profile-form-grid" style={{ marginTop: 16 }}>
          <div><label className="portal-field-label">Portfólio</label><input className="portal-input" value={arsenal.portfolio_url} onChange={(e) => setArsenal((prev) => ({ ...prev, portfolio_url: e.target.value }))} placeholder="https://..." /></div>
          <div><label className="portal-field-label">Capacidade declarada</label><select className="portal-input" value={arsenal.weekly_capacity} onChange={(e) => setArsenal((prev) => ({ ...prev, weekly_capacity: parseInt(e.target.value, 10) }))} title="Capacidade declarada"><option value={10}>Baixa</option><option value={20}>Média</option><option value={40}>Alta</option><option value={80}>Máxima</option></select></div>
        </div>
        {error.arsenal && <p style={{ marginTop: 12, fontSize: 12, color: '#FA896B' }}>{error.arsenal}</p>}
        <div className="portal-inline-stack" style={{ marginTop: 16 }}><button type="button" className="portal-button" onClick={() => saveSection('arsenal', { skills_json: arsenal.skills_json, skills: arsenal.skills_json.map((s) => s.id), portfolio_url: arsenal.portfolio_url || null, weekly_capacity: arsenal.weekly_capacity || null })} disabled={saving.arsenal}>{saving.arsenal ? 'Salvando...' : 'Salvar arsenal'}</button></div>
      </section>

      <section className="portal-card">
        <h3 className="portal-section-title" style={{ marginBottom: 16 }}>Informações de contato</h3>
        <div className="portal-profile-form-grid">
          <div><label className="portal-field-label">Cargo / Função</label><input className="portal-input" value={contact.role_title} onChange={(e) => setContact((prev) => ({ ...prev, role_title: e.target.value }))} /></div>
          <div><label className="portal-field-label">Departamento</label><input className="portal-input" value={contact.department} onChange={(e) => setContact((prev) => ({ ...prev, department: e.target.value }))} /></div>
          <div><label className="portal-field-label">Telefone</label><input className="portal-input" value={contact.phone} onChange={(e) => setContact((prev) => ({ ...prev, phone: e.target.value }))} /></div>
          <div><label className="portal-field-label">Email pessoal</label><input className="portal-input" value={contact.email_personal} onChange={(e) => setContact((prev) => ({ ...prev, email_personal: e.target.value }))} /></div>
          <div style={{ gridColumn: '1 / -1' }}><label className="portal-field-label">WhatsApp JID</label><input className="portal-input" value={contact.whatsapp_jid} onChange={(e) => setContact((prev) => ({ ...prev, whatsapp_jid: e.target.value }))} placeholder="5511999999999@s.whatsapp.net" /></div>
          <div style={{ gridColumn: '1 / -1' }}><label className="portal-field-label">Observações</label><textarea className="portal-textarea" value={contact.notes} onChange={(e) => setContact((prev) => ({ ...prev, notes: e.target.value }))} rows={3} title="Observações" /></div>
        </div>
        {profile.whatsapp_jid && <p className="portal-field-hint" style={{ marginTop: 8 }}>WhatsApp atual: {formatJid(profile.whatsapp_jid)}</p>}
        {error.contact && <p style={{ marginTop: 12, fontSize: 12, color: '#FA896B' }}>{error.contact}</p>}
        <div className="portal-inline-stack" style={{ marginTop: 16 }}><button type="button" className="portal-button" onClick={() => saveSection('contact', contact)} disabled={saving.contact}>{saving.contact ? 'Salvando...' : 'Salvar contato'}</button></div>
      </section>

      <section className="portal-card">
        <h3 className="portal-section-title" style={{ marginBottom: 16 }}>Disponibilidade</h3>
        <div style={{ marginBottom: 20 }}>
          <label className="portal-field-label" style={{ display: 'block', marginBottom: 10 }}>Dias disponíveis</label>
          <div className="portal-day-grid">{DAYS.map((day) => <button key={day.id} type="button" onClick={() => setAvailability((prev) => ({ ...prev, available_days: prev.available_days.includes(day.id) ? prev.available_days.filter((d) => d !== day.id) : [...prev.available_days, day.id] }))} className={clsx('portal-day-btn', availability.available_days.includes(day.id) && 'portal-day-btn-active')}>{day.label}</button>)}</div>
        </div>
        <div className="portal-profile-form-grid">
          <div><label className="portal-field-label">Horário início</label><input type="time" className="portal-input" value={availability.available_hours_start} onChange={(e) => setAvailability((prev) => ({ ...prev, available_hours_start: e.target.value }))} /></div>
          <div><label className="portal-field-label">Horário fim</label><input type="time" className="portal-input" value={availability.available_hours_end} onChange={(e) => setAvailability((prev) => ({ ...prev, available_hours_end: e.target.value }))} /></div>
          <div><label className="portal-field-label">Capacidade semanal (escopos)</label><input type="number" min="1" max="80" className="portal-input" value={availability.weekly_capacity_hours} onChange={(e) => setAvailability((prev) => ({ ...prev, weekly_capacity_hours: e.target.value }))} /></div>
          <div><label className="portal-field-label">Indisponível até</label><input type="date" className="portal-input" value={availability.unavailable_until} onChange={(e) => setAvailability((prev) => ({ ...prev, unavailable_until: e.target.value }))} /></div>
        </div>
        {error.availability && <p style={{ marginTop: 12, fontSize: 12, color: '#FA896B' }}>{error.availability}</p>}
        <div className="portal-inline-stack" style={{ marginTop: 16 }}><button type="button" className="portal-button" onClick={() => saveSection('availability', { ...availability, weekly_capacity_hours: availability.weekly_capacity_hours ? parseFloat(availability.weekly_capacity_hours) : null, unavailable_until: availability.unavailable_until || null })} disabled={saving.availability}>{saving.availability ? 'Salvando...' : 'Salvar disponibilidade'}</button></div>
      </section>

      <section className="portal-card">
        <div className="portal-profile-grid">
          <div className="portal-profile-field"><span className="portal-profile-label">Email corporativo</span><span className="portal-profile-value">{profile.email ?? '—'}</span></div>
          <div className="portal-profile-field"><span className="portal-profile-label">Especialidade</span><span className="portal-profile-value">{profile.specialty ?? '—'}</span></div>
          <div className="portal-profile-field"><span className="portal-profile-label">Valor hora</span><span className="portal-profile-value">{profile.hourly_rate_brl ? `R$ ${parseFloat(profile.hourly_rate_brl).toFixed(2)}/h` : 'Projeto flat-fee'}</span></div>
          <div className="portal-profile-field"><span className="portal-profile-label">CNPJ atual</span><span className="portal-profile-value">{profile.cnpj ? formatCnpj(profile.cnpj) : '—'}</span></div>
          <div className="portal-profile-field"><span className="portal-profile-label">WhatsApp atual</span><span className="portal-profile-value">{profile.whatsapp_jid ? formatJid(profile.whatsapp_jid) : '—'}</span></div>
        </div>
      </section>
    </div>
  );
}
