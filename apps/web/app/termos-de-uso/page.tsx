export const metadata = {
  title: 'Termos de Uso — Edro Digital',
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

export default function TermosDeUsoPage() {
  return (
    <div style={pageStyle}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Termos de Uso</h1>
      <p style={{ color: '#64748b', marginBottom: 40 }}>Ultima atualizacao: marco de 2026</p>

      <section style={{ marginBottom: 32 }}>
        <h2 style={headingStyle}>1. Objeto</h2>
        <p>
          Estes Termos de Uso regulam o acesso e a utilizacao da plataforma e dos servicos prestados pela Edro Digital
          a clientes, colaboradores e usuarios autorizados.
        </p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={headingStyle}>2. Uso autorizado</h2>
        <p>
          O usuario deve utilizar a plataforma apenas para fins licitos, contratuais e compativeis com a finalidade do
          servico, sem tentar violar seguranca, acessos, integracoes ou dados de terceiros.
        </p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={headingStyle}>3. Conta e credenciais</h2>
        <p>
          O usuario e responsavel por manter a confidencialidade de suas credenciais e por comunicar imediatamente
          qualquer uso indevido, suspeita de comprometimento ou acesso nao autorizado.
        </p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={headingStyle}>4. Dados pessoais</h2>
        <p>
          O tratamento de dados pessoais ocorre conforme a Politica de Privacidade da Edro Digital. Para assuntos de
          privacidade, o canal oficial e{' '}
          <a href="mailto:privacidade@edro.digital" style={linkStyle}>privacidade@edro.digital</a>.
        </p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={headingStyle}>5. Limitacoes e alteracoes</h2>
        <p>
          A Edro pode atualizar estes termos para refletir mudancas legais, operacionais ou tecnicas. O uso continuado
          da plataforma apos a atualizacao sera interpretado conforme a versao vigente publicada nesta pagina.
        </p>
      </section>
    </div>
  );
}
