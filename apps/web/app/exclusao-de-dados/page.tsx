export const metadata = {
  title: 'Exclusao de Dados — Edro Digital',
};

const pageStyle = {
  maxWidth: 720,
  margin: '0 auto',
  padding: '48px 24px',
  fontFamily: 'sans-serif',
  color: '#1e293b',
  lineHeight: 1.7,
} as const;

const headingStyle = {
  fontSize: 18,
  fontWeight: 600,
  marginBottom: 8,
} as const;

const linkStyle = {
  color: '#E85219',
} as const;

export default function ExclusaoDeDadosPage() {
  return (
    <div style={pageStyle}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Instrucao para Exclusao de Dados</h1>
      <p style={{ color: '#64748b', marginBottom: 40 }}>Ultima atualizacao: marco de 2026</p>

      <section style={{ marginBottom: 32 }}>
        <h2 style={headingStyle}>1. Como solicitar</h2>
        <p>
          Para solicitar a exclusao, anonimização ou bloqueio de dados pessoais tratados pela Edro Digital,
          envie um e-mail para{' '}
          <a href="mailto:privacidade@edro.digital" style={linkStyle}>privacidade@edro.digital</a>{' '}
          com o assunto <strong>"Solicitacao de exclusao de dados"</strong>.
        </p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={headingStyle}>2. Informacoes para incluir no pedido</h2>
        <ul style={{ paddingLeft: 20 }}>
          <li>Nome completo</li>
          <li>E-mail de contato vinculado ao cadastro ou ao relacionamento com a Edro</li>
          <li>Empresa ou cliente relacionado, se aplicavel</li>
          <li>Descricao objetiva do pedido</li>
        </ul>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={headingStyle}>3. Prazo de resposta</h2>
        <p>
          A Edro respondera em ate 15 dias uteis, podendo solicitar informacoes adicionais para validar a identidade
          do solicitante antes de executar qualquer alteracao, exclusao ou exportacao.
        </p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={headingStyle}>4. Limites legais</h2>
        <p>
          Alguns dados podem permanecer armazenados pelo periodo necessario ao cumprimento de obrigacoes legais,
          regulatórias, contratuais, de seguranca e defesa de direitos. Nesses casos, os dados serao bloqueados,
          minimizados ou anonimizados quando cabivel.
        </p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={headingStyle}>5. Canal oficial</h2>
        <p>
          Canal de privacidade da Edro Digital:{' '}
          <a href="mailto:privacidade@edro.digital" style={linkStyle}>privacidade@edro.digital</a>
        </p>
      </section>
    </div>
  );
}
