'use client';

/**
 * Onboarding PJ — Cadastro do Fornecedor
 * ────────────────────────────────────────
 * Multi-step form collecting CNPJ and B2B data.
 * CNPJ is looked up via BrasilAPI for auto-fill.
 * On completion, redirects to /onboarding/termos for clickwrap acceptance.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet, apiPost, apiPostFormData } from '@/lib/api';
import { isValidCnpj, normalizeDigits, type CnpjLookupResponse } from '@/lib/cnpj';
import ArsenalPicker, { type SelectedSkill } from '@/components/ArsenalPicker';

const STEPS = ['empresa', 'representante', 'pagamento', 'skills', 'avatar'] as const;
type Step = typeof STEPS[number];

const STEP_LABELS: Record<Step, string> = {
  empresa:       'Dados da Empresa',
  representante: 'Representante Legal',
  pagamento:     'Dados de Pagamento',
  skills:        'Especialidades',
  avatar:        'Avatar Edro',
};

function StepIndicator({ current }: { current: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 32 }}>
      {STEPS.map((s, i) => (
        <div key={s} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 'none' }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 800,
            background: i < current ? '#13DEB9' : i === current ? 'var(--portal-accent)' : 'rgba(255,255,255,0.08)',
            color: i <= current ? '#fff' : 'rgba(255,255,255,0.4)',
            border: i === current ? '2px solid var(--portal-accent)' : '2px solid transparent',
            transition: 'all 0.2s',
          }}>
            {i < current ? '✓' : i + 1}
          </div>
          {i < STEPS.length - 1 && (
            <div style={{
              flex: 1, height: 2,
              background: i < current ? '#13DEB9' : 'rgba(255,255,255,0.08)',
              transition: 'background 0.3s',
            }} />
          )}
        </div>
      ))}
    </div>
  );
}

function Field({ label, required, hint, children }: {
  label: string; required?: boolean; hint?: string; children: React.ReactNode;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>
        {label}{required && <span style={{ color: '#FA896B', marginLeft: 3 }}>*</span>}
      </label>
      {children}
      {hint && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{hint}</span>}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 8,
  padding: '10px 12px',
  color: '#fff',
  fontSize: 14,
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
};

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [cnpjLoading, setCnpjLoading] = useState(false);
  const [avatarGenerating, setAvatarGenerating] = useState(false);
  const [error, setError] = useState('');
  const [avatarError, setAvatarError] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarSourcePreview, setAvatarSourcePreview] = useState('');
  const [avatarGeneratedUrl, setAvatarGeneratedUrl] = useState('');
  const [avatarPromptVersion, setAvatarPromptVersion] = useState('');

  const [form, setForm] = useState({
    // Bloco 1: Empresa
    cnpj: '',
    razao_social: '',
    nome_fantasia: '',
    inscricao_municipal: '',
    address_street: '',
    address_number: '',
    address_complement: '',
    address_district: '',
    address_city: '',
    address_state: '',
    address_cep: '',
    // Bloco 2: Representante
    representante_nome: '',
    representante_cpf: '',
    estado_civil: '',
    phone: '',
    // Bloco 3: Pagamento (PJ obrigatório)
    pix_key: '',
    pix_key_type: 'cnpj' as 'cnpj' | 'cpf' | 'email' | 'telefone' | 'aleatoria',
    bank_name: '',
    bank_agency: '',
    bank_account: '',
    // Bloco 4: Arsenal
    skills: [] as SelectedSkill[],
    portfolio_url: '',
    weekly_capacity: 40,
  });

  function set(field: string, value: unknown) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  useEffect(() => {
    let cancelled = false;

    apiGet<{ avatar_url?: string | null; avatar_prompt_version?: string | null }>('/freelancers/portal/me')
      .then((data) => {
        if (cancelled) return;
        setAvatarGeneratedUrl(data?.avatar_url ?? '');
        setAvatarPromptVersion(data?.avatar_prompt_version ?? '');
      })
      .catch(() => null);

    return () => { cancelled = true; };
  }, []);

  async function lookupCnpj() {
    const clean = normalizeDigits(form.cnpj);
    if (!isValidCnpj(clean)) { setError('CNPJ inválido. Confira os dígitos e tente novamente.'); return; }
    setError('');
    setCnpjLoading(true);
    try {
      const data = await apiGet<CnpjLookupResponse>(`/freelancers/portal/cnpj/${clean}`);
      if (data.status === 'invalid_cnpj' || data.status === 'not_found' || data.status === 'provider_unavailable') {
        setError(data.message);
        return;
      }
      setForm(prev => ({
        ...prev,
        razao_social:    data.razao_social    ?? prev.razao_social,
        nome_fantasia:   data.nome_fantasia   ?? prev.nome_fantasia,
        address_street:  data.logradouro      ?? prev.address_street,
        address_number:  data.numero          ?? prev.address_number,
        address_complement: data.complemento  ?? prev.address_complement,
        address_district:data.bairro          ?? prev.address_district,
        address_city:    data.municipio       ?? prev.address_city,
        address_state:   data.uf              ?? prev.address_state,
        address_cep:     (data.cep ?? '').replace(/\D/g, '') || prev.address_cep,
      }));
      if (data.status === 'found_inactive' || (data.situacao && !data.situacao.toLowerCase().includes('ativa'))) {
        setError(data.message);
      }
    } catch {
      setError('A consulta automática de CNPJ falhou agora. Você pode preencher manualmente e continuar.');
    } finally {
      setCnpjLoading(false);
    }
  }

  function validateStep(): string | null {
    if (step === 0) {
      if (!isValidCnpj(form.cnpj)) return 'CNPJ inválido.';
      if (!form.razao_social.trim()) return 'Razão Social é obrigatória.';
    }
    if (step === 1) {
      if (!form.representante_nome.trim()) return 'Nome do representante é obrigatório.';
      if (!form.representante_cpf.replace(/\D/g, '').match(/^\d{11}$/)) return 'CPF do representante inválido.';
    }
    if (step === 2) {
      if (!form.pix_key.trim()) return 'Chave PIX é obrigatória.';
    }
    if (step === 3) {
      if (form.skills.length === 0) return 'Selecione ao menos uma especialidade.';
    }
    if (step === 4) {
      if (!avatarGeneratedUrl) return 'Gere seu avatar Edro antes de continuar.';
    }
    return null;
  }

  async function handleGenerateAvatar() {
    if (!avatarFile) {
      setAvatarError('Selecione uma foto sua antes de gerar o avatar.');
      return;
    }

    setAvatarGenerating(true);
    setAvatarError('');
    try {
      const formData = new FormData();
      formData.append('file', avatarFile);
      const result = await apiPostFormData<{
        avatar_url?: string;
        avatar_prompt_version?: string;
      }>('/freelancers/portal/me/avatar', formData);
      setAvatarGeneratedUrl(result?.avatar_url ?? '');
      setAvatarPromptVersion(result?.avatar_prompt_version ?? '');
    } catch (e: any) {
      setAvatarError(e?.message ?? 'Não foi possível gerar o avatar agora.');
    } finally {
      setAvatarGenerating(false);
    }
  }

  async function handleNext() {
    const err = validateStep();
    if (err) { setError(err); return; }
    setError('');

    if (step < STEPS.length - 1) {
      setStep(s => s + 1);
      return;
    }

    // Final step — save onboarding data
    setSaving(true);
    try {
      await apiPost('/freelancers/portal/me/onboarding', form);
      router.push('/onboarding/termos');
    } catch (e: any) {
      setError(e?.message ?? 'Erro ao salvar. Tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  const currentStep = STEPS[step];

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--portal-bg, #0f0f0f)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
    }}>
      <div style={{ width: '100%', maxWidth: 560 }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#fff', margin: '0 0 6px' }}>
            Cadastro de Fornecedor PJ
          </h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: 0 }}>
            Preencha os dados da sua empresa para liberar o acesso ao portal
          </p>
        </div>

        <StepIndicator current={step} />

        {/* Card */}
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 16,
          padding: '28px 24px',
        }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: '0 0 22px' }}>
            {step + 1}. {STEP_LABELS[currentStep]}
          </h2>

          {/* ── Bloco 1: Empresa ─── */}
          {currentStep === 'empresa' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Field label="CNPJ" required hint="Somente números. Se a consulta automática falhar, você pode preencher os campos manualmente.">
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    style={inputStyle}
                    placeholder="00.000.000/0001-00"
                    value={form.cnpj}
                    onChange={e => set('cnpj', e.target.value)}
                    maxLength={18}
                  />
                  <button
                    onClick={lookupCnpj}
                    disabled={cnpjLoading}
                    style={{
                      flexShrink: 0, padding: '10px 16px', borderRadius: 8, border: 'none',
                      background: 'var(--portal-accent, #E85219)', color: '#fff',
                      fontWeight: 700, fontSize: 13, cursor: cnpjLoading ? 'wait' : 'pointer',
                      opacity: cnpjLoading ? 0.6 : 1,
                    }}
                  >
                    {cnpjLoading ? '...' : 'Buscar'}
                  </button>
                </div>
              </Field>
              <Field label="Razão Social" required>
                <input style={inputStyle} value={form.razao_social} onChange={e => set('razao_social', e.target.value)} placeholder="Empresa Ltda." />
              </Field>
              <Field label="Nome Fantasia">
                <input style={inputStyle} value={form.nome_fantasia} onChange={e => set('nome_fantasia', e.target.value)} placeholder="Opcional" />
              </Field>
              <Field label="Inscrição Municipal">
                <input style={inputStyle} value={form.inscricao_municipal} onChange={e => set('inscricao_municipal', e.target.value)} placeholder="Opcional" />
              </Field>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
                <Field label="Logradouro">
                  <input style={inputStyle} value={form.address_street} onChange={e => set('address_street', e.target.value)} placeholder="Rua..." />
                </Field>
                <Field label="Número">
                  <input style={{ ...inputStyle, width: 80 }} value={form.address_number} onChange={e => set('address_number', e.target.value)} placeholder="Nº" />
                </Field>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <Field label="Bairro">
                  <input style={inputStyle} value={form.address_district} onChange={e => set('address_district', e.target.value)} placeholder="Bairro" />
                </Field>
                <Field label="CEP">
                  <input style={inputStyle} value={form.address_cep} onChange={e => set('address_cep', e.target.value)} placeholder="00000-000" maxLength={9} />
                </Field>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
                <Field label="Cidade">
                  <input style={inputStyle} value={form.address_city} onChange={e => set('address_city', e.target.value)} placeholder="Cidade" />
                </Field>
                <Field label="UF">
                  <input style={{ ...inputStyle, width: 60 }} value={form.address_state} onChange={e => set('address_state', e.target.value.toUpperCase())} placeholder="SP" maxLength={2} />
                </Field>
              </div>
            </div>
          )}

          {/* ── Bloco 2: Representante ─── */}
          {currentStep === 'representante' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{
                background: 'rgba(93,135,255,0.08)', border: '1px solid rgba(93,135,255,0.2)',
                borderRadius: 8, padding: '10px 14px', fontSize: 12, color: 'rgba(255,255,255,0.55)',
              }}>
                ℹ️ O CPF informado identifica o representante legal para fins contratuais e também pode ser usado como chave PIX no próximo passo, se preferir.
              </div>
              <Field label="Nome completo do representante" required>
                <input style={inputStyle} value={form.representante_nome} onChange={e => set('representante_nome', e.target.value)} placeholder="Nome Sobrenome" />
              </Field>
              <Field label="CPF do representante" required hint="Usado para assinatura do contrato e opcionalmente como chave PIX.">
                <input style={inputStyle} value={form.representante_cpf} onChange={e => set('representante_cpf', e.target.value)} placeholder="000.000.000-00" maxLength={14} />
              </Field>
              <Field label="Estado civil">
                <select
                  style={{ ...inputStyle, appearance: 'none' }}
                  value={form.estado_civil}
                  onChange={e => set('estado_civil', e.target.value)}
                >
                  <option value="">Selecione</option>
                  <option value="solteiro">Solteiro(a)</option>
                  <option value="casado">Casado(a)</option>
                  <option value="divorciado">Divorciado(a)</option>
                  <option value="viuvo">Viúvo(a)</option>
                  <option value="uniao_estavel">União estável</option>
                </select>
              </Field>
              <Field label="WhatsApp / Celular" hint="Para contato sobre demandas">
                <input style={inputStyle} value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+55 (11) 99999-9999" />
              </Field>
            </div>
          )}

          {/* ── Bloco 3: Pagamento ─── */}
          {currentStep === 'pagamento' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{
                background: 'rgba(250,137,107,0.08)', border: '1px solid rgba(250,137,107,0.25)',
                borderRadius: 8, padding: '12px 14px', fontSize: 12, color: 'rgba(255,255,255,0.6)',
              }}>
                ⚠️ <strong>Informe a chave PIX principal para recebimento.</strong> Você pode usar CNPJ da empresa, CPF do representante, e-mail, telefone ou chave aleatória.
              </div>
              <Field label="Tipo de chave PIX" required>
                <select
                  style={{ ...inputStyle, appearance: 'none' }}
                  value={form.pix_key_type}
                  onChange={e => set('pix_key_type', e.target.value)}
                >
                  <option value="cnpj">CNPJ da empresa</option>
                  <option value="cpf">CPF do representante</option>
                  <option value="email">E-mail corporativo</option>
                  <option value="telefone">Telefone corporativo</option>
                  <option value="aleatoria">Chave aleatória</option>
                </select>
              </Field>
              <Field label="Chave PIX" required>
                <input
                  style={inputStyle}
                  value={form.pix_key}
                  onChange={e => set('pix_key', e.target.value)}
                  placeholder={
                    form.pix_key_type === 'cnpj' ? '00.000.000/0001-00'
                    : form.pix_key_type === 'cpf' ? '000.000.000-00'
                    : form.pix_key_type === 'email' ? 'financeiro@empresa.com.br'
                    : form.pix_key_type === 'telefone' ? '+55 11 99999-9999'
                    : 'Chave aleatória (UUID)'
                  }
                />
              </Field>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Field label="Banco">
                  <input style={inputStyle} value={form.bank_name} onChange={e => set('bank_name', e.target.value)} placeholder="Ex: Itaú, Nubank, Banco do Brasil..." />
                </Field>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <Field label="Agência">
                    <input style={inputStyle} value={form.bank_agency} onChange={e => set('bank_agency', e.target.value)} placeholder="0001" />
                  </Field>
                  <Field label="Conta corrente">
                    <input style={inputStyle} value={form.bank_account} onChange={e => set('bank_account', e.target.value)} placeholder="00000-0" />
                  </Field>
                </div>
              </div>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', margin: 0 }}>
                Os honorários são pagos até o dia 10 do mês seguinte, condicionados à emissão de Nota Fiscal (NF-e) pela sua empresa.
              </p>
            </div>
          )}

          {/* ── Bloco 4: Arsenal ─── */}
          {currentStep === 'skills' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{
                background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)',
                borderRadius: 8, padding: '10px 14px', fontSize: 12, color: 'rgba(255,255,255,0.55)',
              }}>
                Como no Behance, adicione as tags que definem o seu estúdio/empresa. Nosso algoritmo usará essas informações para enviar os Cards (Jobs) que dão match com as suas especialidades.
              </div>
              <ArsenalPicker
                value={form.skills}
                onChange={skills => set('skills', skills)}
              />
              <Field label="Link do portfólio" hint="Behance, site, Drive, ou qualquer referência de trabalhos">
                <input style={inputStyle} value={form.portfolio_url} onChange={e => set('portfolio_url', e.target.value)} placeholder="https://..." />
              </Field>
              <Field label="Capacidade de demandas simultâneas" hint="Não é controle de jornada — apenas informa sua disponibilidade para oferta de escopos.">
                <select style={{ ...inputStyle, appearance: 'none' }} value={form.weekly_capacity} onChange={e => set('weekly_capacity', parseInt(e.target.value))}>
                  <option value={10}>Baixa — até 1 escopo/semana</option>
                  <option value={20}>Média — até 2 escopos/semana</option>
                  <option value={40}>Alta — até 4 escopos/semana</option>
                  <option value={80}>Máxima — 5+ escopos/semana</option>
                </select>
              </Field>
            </div>
          )}

          {/* ── Bloco 5: Avatar ─── */}
          {currentStep === 'avatar' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div style={{
                background: 'rgba(232,82,25,0.08)', border: '1px solid rgba(232,82,25,0.18)',
                borderRadius: 8, padding: '12px 14px', fontSize: 12, color: 'rgba(255,255,255,0.62)', lineHeight: 1.6,
              }}>
                Envie uma foto sua. A Edro vai transformar essa imagem em um avatar 3D padronizado, usado para identificar você no sistema.
              </div>

              <Field label="Foto base" required hint="Use uma foto nítida do rosto, sem óculos escuros, com boa luz.">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    setAvatarFile(file);
                    setAvatarGeneratedUrl('');
                    setAvatarPromptVersion('');
                    setAvatarError('');
                    if (avatarSourcePreview) URL.revokeObjectURL(avatarSourcePreview);
                    setAvatarSourcePreview(file ? URL.createObjectURL(file) : '');
                  }}
                  style={{ ...inputStyle, padding: '9px 12px' }}
                />
              </Field>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div style={{
                  minHeight: 240,
                  borderRadius: 14,
                  border: '1px solid rgba(255,255,255,0.10)',
                  background: 'rgba(255,255,255,0.03)',
                  padding: 14,
                }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
                    Foto enviada
                  </div>
                  <div style={{
                    height: 190,
                    borderRadius: 12,
                    display: 'grid',
                    placeItems: 'center',
                    background: 'rgba(255,255,255,0.04)',
                    color: avatarFile ? 'rgba(255,255,255,0.82)' : 'rgba(255,255,255,0.28)',
                    fontSize: 13,
                    textAlign: 'center',
                    padding: 16,
                  }}>
                    {avatarFile
                      ? `Foto pronta para gerar avatar: ${avatarFile.name}`
                      : 'Envie sua foto para gerar o avatar'}
                  </div>
                </div>

                <div style={{
                  minHeight: 240,
                  borderRadius: 14,
                  border: '1px solid rgba(255,255,255,0.10)',
                  background: 'rgba(255,255,255,0.03)',
                  padding: 14,
                }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
                    Avatar Edro gerado
                  </div>
                  {avatarGeneratedUrl ? (
                    <img
                      src={avatarGeneratedUrl}
                      alt="Avatar Edro gerado"
                      style={{ width: '100%', height: 190, objectFit: 'cover', borderRadius: 12, background: '#f2f2f2' }}
                    />
                  ) : (
                    <div style={{
                      height: 190,
                      borderRadius: 12,
                      display: 'grid',
                      placeItems: 'center',
                      background: 'rgba(255,255,255,0.04)',
                      color: 'rgba(255,255,255,0.28)',
                      fontSize: 13,
                      textAlign: 'center',
                      padding: 16,
                    }}>
                      O avatar gerado aparece aqui
                    </div>
                  )}
                </div>
              </div>

              {avatarPromptVersion && (
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
                  Prompt ativo: <strong>{avatarPromptVersion}</strong>
                </div>
              )}

              {avatarError && (
                <div style={{
                  padding: '10px 14px',
                  borderRadius: 8,
                  background: 'rgba(250,137,107,0.12)',
                  border: '1px solid rgba(250,137,107,0.3)',
                  color: '#FA896B',
                  fontSize: 13,
                }}>
                  {avatarError}
                </div>
              )}

              <div>
                <button
                  type="button"
                  onClick={handleGenerateAvatar}
                  disabled={!avatarFile || avatarGenerating}
                  style={{
                    padding: '12px 16px',
                    borderRadius: 8,
                    border: '1px solid rgba(255,255,255,0.14)',
                    background: avatarGenerating ? 'rgba(232,82,25,0.45)' : 'rgba(232,82,25,0.16)',
                    color: '#fff',
                    fontSize: 13,
                    fontWeight: 800,
                    cursor: !avatarFile || avatarGenerating ? 'not-allowed' : 'pointer',
                  }}
                >
                  {avatarGenerating ? 'Gerando avatar...' : avatarGeneratedUrl ? 'Gerar novamente' : 'Gerar avatar Edro'}
                </button>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{
              marginTop: 16, padding: '10px 14px', borderRadius: 8,
              background: 'rgba(250,137,107,0.12)', border: '1px solid rgba(250,137,107,0.3)',
              color: '#FA896B', fontSize: 13,
            }}>
              {error}
            </div>
          )}

          {/* Navigation */}
          <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
            {step > 0 && (
              <button
                onClick={() => { setError(''); setStep(s => s - 1); }}
                style={{
                  flex: 1, padding: '12px', borderRadius: 8,
                  border: '1px solid rgba(255,255,255,0.15)', background: 'transparent',
                  color: 'rgba(255,255,255,0.6)', fontSize: 14, cursor: 'pointer', fontWeight: 600,
                }}
              >
                ← Voltar
              </button>
            )}
            <button
              onClick={handleNext}
              disabled={saving}
              style={{
                flex: 2, padding: '12px', borderRadius: 8, border: 'none',
                background: saving ? 'rgba(232,82,25,0.5)' : 'var(--portal-accent, #E85219)',
                color: '#fff', fontSize: 14, fontWeight: 800, cursor: saving ? 'wait' : 'pointer',
                transition: 'opacity 0.15s',
              }}
            >
              {saving ? 'Salvando...' : step === STEPS.length - 1 ? 'Salvar e continuar →' : 'Próximo →'}
            </button>
          </div>
        </div>

        <p style={{ textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.2)', marginTop: 20 }}>
          Seus dados são tratados conforme a LGPD (Lei nº 13.709/2018)
        </p>
      </div>
    </div>
  );
}
