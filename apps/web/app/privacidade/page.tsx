export const metadata = {
  title: 'Política de Privacidade — Edro Digital',
};

export default function PrivacidadePage() {
  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px', fontFamily: 'sans-serif', color: '#1e293b', lineHeight: 1.7 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Política de Privacidade</h1>
      <p style={{ color: '#64748b', marginBottom: 40 }}>Última atualização: março de 2026</p>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>1. Quem somos</h2>
        <p>
          A <strong>Edro Digital</strong> (CNPJ a inserir) é uma agência de marketing e produção de conteúdo, com sede na
          Rua Samaritá, 1117, 3º Andar, São Paulo — SP. Responsável pelo tratamento de dados:{' '}
          <a href="mailto:privacidade@edro.digital" style={{ color: '#E85219' }}>privacidade@edro.digital</a>.
        </p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>2. Dados que coletamos</h2>
        <ul style={{ paddingLeft: 20 }}>
          <li>Nome, e-mail e telefone de clientes e colaboradores</li>
          <li>Dados de uso da plataforma (logs de acesso, ações realizadas)</li>
          <li>Conteúdo de comunicações e briefings fornecidos pelos clientes</li>
          <li>Informações de pagamento (processadas por terceiros — não armazenamos dados de cartão)</li>
        </ul>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>3. Finalidade do tratamento</h2>
        <ul style={{ paddingLeft: 20 }}>
          <li>Prestação dos serviços contratados</li>
          <li>Comunicação sobre projetos e entregas</li>
          <li>Cumprimento de obrigações legais e contratuais</li>
          <li>Melhoria contínua da plataforma</li>
        </ul>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>4. Compartilhamento de dados</h2>
        <p>
          Compartilhamos dados apenas com subprocessadores essenciais à operação (ex.: provedores de IA, infraestrutura em nuvem,
          plataformas de pagamento), sempre mediante contratos de proteção de dados adequados. Não vendemos dados a terceiros.
        </p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>5. Seus direitos (LGPD)</h2>
        <p>Você tem direito a:</p>
        <ul style={{ paddingLeft: 20 }}>
          <li>Confirmar a existência de tratamento</li>
          <li>Acessar seus dados</li>
          <li>Corrigir dados incompletos ou desatualizados</li>
          <li>Solicitar anonimização, bloqueio ou eliminação</li>
          <li>Portabilidade dos dados</li>
          <li>Revogar consentimento</li>
        </ul>
        <p style={{ marginTop: 12 }}>
          Para exercer qualquer direito, envie um e-mail para{' '}
          <a href="mailto:privacidade@edro.digital" style={{ color: '#E85219' }}>privacidade@edro.digital</a>.
        </p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>6. Exclusão de dados</h2>
        <p>
          Para solicitar a exclusão dos seus dados, envie um e-mail para{' '}
          <a href="mailto:privacidade@edro.digital" style={{ color: '#E85219' }}>privacidade@edro.digital</a>{' '}
          com o assunto <strong>"Solicitação de exclusão de dados"</strong>. Responderemos em até 15 dias úteis.
        </p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>7. Retenção de dados</h2>
        <p>
          Mantemos os dados pelo período necessário à prestação dos serviços e ao cumprimento de obrigações legais
          (mínimo 5 anos para dados fiscais). Após esse prazo, os dados são eliminados ou anonimizados.
        </p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>8. Contato</h2>
        <p>
          Dúvidas sobre esta política:{' '}
          <a href="mailto:privacidade@edro.digital" style={{ color: '#E85219' }}>privacidade@edro.digital</a>
          <br />
          Endereço: Rua Samaritá, 1117, 3º Andar, São Paulo — SP
        </p>
      </section>
    </div>
  );
}
