# Portal Security Matrix - Edro Digital

## Objetivo

Definir os controles minimos por superficie de ataque para o portal Edro, portal Freelancer, portal Cliente, backend API e integracoes publicas.

## Matriz resumida

| Superficie | Dados sensiveis | Principais ameacas | Controles obrigatorios |
| --- | --- | --- | --- |
| Portal Edro | dados de todos os clientes, briefings, financeiro, integracoes, configuracoes administrativas | takeover de admin, XSS, abuso interno, exportacao indevida, movimento lateral entre tenants | sessao por cookie, MFA, RBAC fino, CSP estrita, step-up auth, trilha de auditoria, aprovacao dupla em operacoes criticas |
| Portal Freelancer | dados pessoais do freelancer, jobs, pagamentos, entregas, comentarios | hijack de sessao, acesso a jobs de outro freelancer, vazamento de anexos, fraude de pagamento | sessao por cookie, escopo por freelancer, segregacao de arquivos, logs de download, rate limit, protecao de upload |
| Portal Cliente | relatorios, aprovacoes, faturas, briefings, ativos de marca | compartilhamento indevido, takeover de conta, acesso a dados de outro cliente, exportacao nao autorizada | sessao por cookie, escopo por cliente, MFA opcional premium ou obrigatorio em contas criticas, expiracao curta de sessao, logs de acesso e exportacao |
| Backend API | todas as operacoes de negocio e dados multi-tenant | auth bypass, authz falha, BOLA/IDOR, abuso de job, exfiltracao, SSRF | auth forte, permissao por recurso, validacao de input, rate limit, logs, segregacao de segredos, testes negativos |
| Webhooks publicos | mensagens, eventos de integracao, automacoes | evento forjado, replay, flood, abuso de custo, poluicao de dados | assinatura, timestamp, nonce, fila, schema validation, dead-letter, rate limit |
| Infra/Operacao | logs, backups, segredos, monitoramento, bancos | segredo vazado, indisponibilidade, restore falho, abuso interno | secret manager, rotacao, least privilege, backup testado, WAF, SIEM/logs, acesso administrativo auditado |

## Portal Edro

### Perfil de risco

E a superficie mais critica. Um compromisso aqui permite acesso amplo a clientes, dados operacionais, configuracoes, conectores e rotinas administrativas.

### Controles obrigatorios

- `MFA` obrigatorio para todo perfil `admin`, `owner`, `manager` e equivalente.
- Step-up auth para:
  - trocar permissao
  - regenerar secret
  - conectar conta externa
  - exportar dados em massa
  - iniciar rotinas globais
- `RBAC` com permissoes explicitas, nao apenas papel nominal.
- Sessao curta, revogavel e com trilha de dispositivos.
- `CSP` mais restrita que os outros portais.
- Bloqueio de `dangerouslySetInnerHTML` sem justificativa e saneamento.
- Auditoria para login, falha de login, exportacao, alteracao de role, alteracao de connector, alteracao de custo, execucao de job manual.

### Acoes que devem exigir confirmacao adicional

- resetar segredo
- convidar usuario com privilegio alto
- rodar processo global
- baixar exportacao ampla
- trocar tenant ativo quando houver contexto multi-tenant

## Portal Freelancer

### Perfil de risco

Risco medio. O portal nao deve ser ponte para dados de outro freelancer, outro cliente ou area administrativa.

### Controles obrigatorios

- Sessao por cookie e nunca token em `localStorage`.
- Escopo de dados por `freelancer_id`.
- Validacao de propriedade do job antes de leitura, comentario, upload ou entrega.
- Logs de acesso a anexos e downloads.
- Protecao de upload:
  - validacao de extensao e MIME
  - limite de tamanho
  - armazenamento segregado
  - URL assinada com expiracao curta
- Views de pagamento isoladas e minimizadas.

### Controles de reducao de impacto

- Nenhuma tela do freelancer pode expor identificadores internos previsiveis de outros recursos.
- Nenhuma API do freelancer pode aceitar `clientId`, `tenantId` ou `freelancerId` vindos do browser como fonte de verdade.

## Portal Cliente

### Perfil de risco

Risco alto por reputacao e confidencialidade. Um vazamento aqui vira incidente contratual rapidamente.

### Controles obrigatorios

- Escopo estrito por `client_id`.
- Exportacao, download de relatorio e aprovacao sempre autorizados no backend.
- Sessao com expiracao curta e revogacao.
- Possibilidade de MFA por conta ou por tenant de cliente premium.
- Trilha de auditoria para:
  - login
  - visualizacao de relatorio sensivel
  - download de documento
  - aprovacao
  - alteracao de perfil
- Share links ou tokens temporarios com TTL curto e one-time use quando houver compartilhamento externo.

### Itens sensiveis

- relatorios de performance
- notas estrategicas
- faturas
- arquivos de marca
- agenda e reunioes

## Backend API

### Controles obrigatorios

- Toda rota privada com autenticacao server-side.
- Toda rota com dado multi-tenant com verificacao de tenant e recurso.
- Toda rota de escrita com validacao de payload, limite de tamanho e logs minimos.
- Endpoints `admin/*` com permissao explicita.
- Endpoints por cliente com `requireClientPerm` ou equivalente.
- Endpoints que disparam jobs precisam validar se o job e tenant-scoped ou platform-scoped.
- Nunca confiar em `tenantId`, `role` ou `scope` enviados pelo frontend.

### Testes minimos

- usuario viewer acessando rota manager
- usuario manager acessando rota admin
- usuario de um tenant tentando acessar recurso de outro tenant
- usuario cliente tentando acessar outro `client_id`
- freelancer tentando abrir job de outro freelancer
- webhook invalido tentando criar evento

## Webhooks e integracoes publicas

### Controles obrigatorios

- Assinatura ou segredo de alta entropia.
- `timestamp` com janela curta.
- `nonce` ou idempotency key para bloquear replay.
- Fila desacoplada do processamento principal.
- Dead-letter para payload invalido ou erro repetido.
- Observabilidade por provedor, tenant e tipo de evento.
- Rotacao de segredo e versionamento de chave.

### Nao aceitar como defesa suficiente

- confiar apenas em URL secreta
- confiar apenas em IP fixo
- confiar apenas em schema sem autenticidade

## Infra e operacao

### Controles obrigatorios

- Segredos fora do codigo e rotacionados.
- Acesso administrativo auditado.
- Backups cifrados com restore testado.
- Alertas para picos de erro, login anomalo, flood e execucao administrativa.
- Separacao clara entre dev, staging e producao.
- Bloqueio para preview/local falar com producao sem aprovacao.

## Prioridade de implantacao

1. Portal Edro
2. Backend API
3. Webhooks publicos
4. Portal Cliente
5. Portal Freelancer
6. Infra e operacao

Essa ordem reflete blast radius, risco contratual e impacto reputacional.
