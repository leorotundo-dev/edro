'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiPost } from '@/lib/api';

const TERMS_VERSION = '1.0';

const TERMS_TEXT = `
TERMOS E CONDIÇÕES DE USO DA PLATAFORMA EDRO STUDIO
Versão ${TERMS_VERSION} — Vigência a partir de 01/01/2025

1. NATUREZA DA RELAÇÃO

1.1. A presente plataforma é disponibilizada exclusivamente para Pessoas Jurídicas (CNPJ ativo) que prestam serviços de comunicação, design, produção de conteúdo e áreas correlatas (doravante "Fornecedor" ou "Contratada").

1.2. A relação estabelecida entre o Fornecedor e a Edro Studio Ltda. (doravante "Contratante") é de natureza estritamente CIVIL/COMERCIAL, regida pela Lei 10.406/2002 (Código Civil) e pela Lei 13.429/2017.

1.3. NÃO EXISTE qualquer relação de emprego, vínculo empregatício, subordinação jurídica, pessoalidade ou habitualidade caracterizadoras de relação de trabalho (CLT) entre as partes.

2. OBJETO E ENTREGA

2.1. O Fornecedor se compromete a entregar os escopos de trabalho aceitos dentro dos prazos (SLA) definidos no Aceite de Escopo, que é parte integrante de cada contratação específica.

2.2. O SLA (Service Level Agreement) é o prazo acordado no momento do aceite do escopo. O cumprimento do SLA é o único critério de avaliação de desempenho da Contratada.

2.3. A plataforma NÃO registra horas trabalhadas, localização geográfica, uso de dispositivo, horário de acesso nem qualquer dado que configure controle de jornada.

3. REMUNERAÇÃO E HONORÁRIOS

3.1. Os honorários são calculados por escopo entregue, conforme valores acordados no Aceite de Escopo ou em instrumento de contrato separado.

3.2. O pagamento é realizado exclusivamente para a Pessoa Jurídica (CNPJ) do Fornecedor, via PIX ou transferência bancária para conta vinculada ao CNPJ. É vedado o pagamento a CPF.

3.3. O Fornecedor é responsável pela emissão da Nota Fiscal de Serviços (NFS-e) correspondente a cada período de faturamento, como condição para liberação do pagamento.

3.4. Poderá ser aplicada Glosa (desconto proporcional) sobre os honorários nos casos de descumprimento de SLA, conforme tabela definida no Aceite de Escopo ou contrato específico.

4. SCORE DO FORNECEDOR

4.1. A plataforma mantém um Score do Fornecedor (0–100) baseado exclusivamente no histórico de cumprimento de SLAs.

4.2. O score influencia a prioridade de oferta de novos escopos, conforme as faixas: ≥90 (prioridade máxima), 75–89 (boa preferência), 60–74 (normal), <60 (restrição temporária até recuperação).

4.3. Não há suspensão unilateral — divergências são resolvidas por notificação formal e, se necessário, arbitragem comercial.

5. AUTONOMIA E INDEPENDÊNCIA

5.1. O Fornecedor tem plena autonomia na organização de sua rotina de trabalho, ferramentas utilizadas, local de execução e distribuição de seu tempo, desde que cumpra os SLAs acordados.

5.2. O Fornecedor pode recusar escopos sem necessidade de justificativa, desde que dentro do prazo definido para aceite.

5.3. O Fornecedor pode prestar serviços para terceiros, inclusive concorrentes da Contratante, salvo disposição expressa em contrário em contrato específico.

6. DADOS E PRIVACIDADE

6.1. Os dados cadastrais do Fornecedor (CNPJ, dados do representante, chave PIX) são utilizados exclusivamente para fins de contratação, faturamento e cumprimento de obrigações legais.

6.2. O Fornecedor consente com o armazenamento e tratamento dos dados necessários para execução desta relação comercial, nos termos da Lei 13.709/2018 (LGPD).

6.3. Dados de rastreamento de localização, biometria, monitoramento de dispositivo ou controle de jornada NÃO são coletados.

7. VIGÊNCIA E RESCISÃO

7.1. Estes termos vigoram pelo prazo de 12 meses, renováveis automaticamente, ou até que nova versão seja publicada com aviso de 30 dias de antecedência.

7.2. Qualquer das partes pode encerrar a relação com aviso prévio de 30 dias, sem ônus, desde que não haja escopos em aberto.

8. FORO

8.1. Fica eleito o foro da Comarca de São Paulo/SP para dirimir quaisquer controvérsias oriundas deste instrumento.

─────────────────────────────────────────────────
Ao clicar em "Confirmar Aceite", o Fornecedor declara ter lido, compreendido e concordado integralmente com os presentes Termos e Condições, reconhecendo que atua como Pessoa Jurídica autônoma e independente.

O sistema registrará o endereço IP e o timestamp exato deste aceite como prova legal irrefutável.
─────────────────────────────────────────────────
`.trim();

export default function TermosPage() {
  const router = useRouter();
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleAccept() {
    if (!agreed) return;
    setLoading(true);
    setError('');
    try {
      await apiPost('/freelancers/portal/me/terms/accept', {
        terms_version: TERMS_VERSION,
      });
      router.replace('/');
    } catch (e: any) {
      setError(e.message ?? 'Erro ao registrar aceite. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#0d0d0d', padding: '24px 16px',
    }}>
      <div style={{ width: '100%', maxWidth: 760 }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#5D87FF', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>
            Etapa final
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#fff', margin: '0 0 8px' }}>
            Termos e Condições de Uso
          </h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', margin: 0 }}>
            Leia atentamente antes de prosseguir. O aceite é obrigatório para usar a plataforma.
          </p>
        </div>

        {/* Legal notice callout */}
        <div style={{
          background: 'rgba(248,168,0,0.08)', border: '1px solid rgba(248,168,0,0.25)',
          borderRadius: 10, padding: '12px 16px', marginBottom: 20,
          display: 'flex', gap: 10, alignItems: 'flex-start',
        }}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>⚠️</span>
          <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>
            <strong style={{ color: '#F8A800' }}>Aviso legal:</strong> Esta plataforma é destinada exclusivamente a
            Pessoas Jurídicas (CNPJ). A relação aqui estabelecida é de natureza civil/comercial. Não há vínculo
            empregatício, subordinação jurídica nem qualquer relação regida pela CLT.
          </p>
        </div>

        {/* Terms scroll box */}
        <div style={{
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 12, padding: '20px 22px', marginBottom: 20,
          maxHeight: 420, overflowY: 'auto',
          fontFamily: 'monospace', fontSize: 12, lineHeight: 1.8,
          color: 'rgba(255,255,255,0.6)', whiteSpace: 'pre-wrap',
        }}>
          {TERMS_TEXT}
        </div>

        {/* Agreement checkbox */}
        <label style={{
          display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer',
          padding: '16px 18px',
          background: agreed ? 'rgba(19,222,185,0.06)' : 'rgba(255,255,255,0.03)',
          border: `1px solid ${agreed ? 'rgba(19,222,185,0.3)' : 'rgba(255,255,255,0.1)'}`,
          borderRadius: 10, marginBottom: 24, transition: 'all 0.15s ease',
        }}>
          <input
            type="checkbox"
            checked={agreed}
            onChange={e => setAgreed(e.target.checked)}
            style={{ width: 18, height: 18, marginTop: 1, cursor: 'pointer', flexShrink: 0, accentColor: '#13DEB9' }}
          />
          <span style={{ fontSize: 13, color: agreed ? '#fff' : 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
            Li e concordo com os{' '}
            <strong style={{ color: agreed ? '#13DEB9' : 'inherit' }}>Termos e Condições de Uso (v{TERMS_VERSION})</strong>
            {' '}e reconheço que atuo como{' '}
            <strong style={{ color: agreed ? '#13DEB9' : 'inherit' }}>Pessoa Jurídica independente</strong>,
            sem qualquer vínculo empregatício com a Edro Studio Ltda.
          </span>
        </label>

        {/* IP notice */}
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', textAlign: 'center', marginBottom: 20 }}>
          Ao confirmar, o sistema registrará seu endereço IP e o timestamp deste aceite como prova legal.
        </p>

        {error && (
          <div style={{
            background: 'rgba(250,137,107,0.10)', border: '1px solid rgba(250,137,107,0.3)',
            borderRadius: 8, padding: '10px 14px', marginBottom: 16,
            fontSize: 12, color: '#FA896B',
          }}>
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          type="button"
          onClick={handleAccept}
          disabled={!agreed || loading}
          style={{
            width: '100%', padding: '14px 24px', borderRadius: 10, border: 'none',
            background: agreed ? '#13DEB9' : 'rgba(255,255,255,0.08)',
            color: agreed ? '#0d0d0d' : 'rgba(255,255,255,0.3)',
            fontSize: 15, fontWeight: 800, cursor: agreed ? 'pointer' : 'not-allowed',
            transition: 'all 0.15s ease',
          }}
        >
          {loading ? 'Registrando aceite...' : agreed ? 'Confirmar Aceite e Acessar Portal' : 'Leia e marque o checkbox para continuar'}
        </button>

      </div>
    </div>
  );
}
