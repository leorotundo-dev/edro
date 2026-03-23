# DPA Template - Edro Digital

## Aviso

Este modelo e um ponto de partida tecnico-operacional para anexo contratual de tratamento de dados. Ele **nao substitui revisao juridica** e nao deve ser enviado sem validacao final do juridico da Edro.

## Instrucoes de uso

- substituir todos os campos `{{...}}`
- remover opcoes que nao se aplicam ao fluxo contratado
- confirmar antes do envio:
  - papel da Edro no tratamento
  - subprocessadores ativos
  - clausulas de transferencia internacional
  - prazo/regra de retencao
  - medidas de seguranca que podem ser afirmadas sem superpromessa

---

# Anexo de Tratamento de Dados Pessoais

Este Anexo de Tratamento de Dados Pessoais ("`Anexo`") integra o contrato principal celebrado entre:

- `{{CLIENT_LEGAL_NAME}}`, inscrita no CNPJ sob o n. `{{CLIENT_CNPJ}}`, com sede em `{{CLIENT_ADDRESS}}`, doravante "`Cliente`"; e
- `EDRO COMUNICACAO DE MARKETING LTDA`, inscrita no CNPJ sob o n. `42.728.944/0001-20`, com sede em `{{EDRO_ADDRESS}}`, doravante "`Edro`".

## 1. Objeto

1.1. Este Anexo disciplina as condicoes aplicaveis ao tratamento de dados pessoais realizado no contexto dos servicos contratados no contrato principal, em conformidade com a Lei n. 13.709/2018 ("`LGPD`") e regulamentos aplicaveis.

1.2. O escopo dos servicos cobertos por este Anexo compreende: Plataforma de gestão de produção de conteúdo digital, incluindo briefings, aprovações, calendários editoriais, campanhas, análise de performance, integrações com canais sociais e comunicação com fornecedores criativos..

## 2. Papel das partes

2.1. As partes reconhecem que, para os fluxos descritos neste Anexo:

- o `Cliente` atua como **Controlador** — determina as finalidades e meios do tratamento dos dados de seus próprios consumidores/audiência; e
- a `Edro` atua como **Operadora** — trata dados pessoais conforme instruções do Cliente no contexto da plataforma.

2.2. Quando a Edro atuar como operadora em nome do Cliente, tratara os dados pessoais de acordo com as instrucoes documentadas do Cliente, ressalvadas as hipoteses em que a legislacao exigir tratamento diverso.

2.3. Quando a Edro atuar como controladora em fluxo proprio, esse tratamento sera regido por sua propria base legal, governanca interna e aviso de privacidade aplicavel, sem prejuizo das obrigacoes contratuais assumidas.

## 3. Categorias de titulares, dados e finalidades

3.1. As categorias de titulares potencialmente envolvidas neste escopo sao:

- `{{DATA_SUBJECT_CATEGORIES}}`

3.2. As categorias de dados pessoais potencialmente tratadas sao:

- `{{PERSONAL_DATA_CATEGORIES}}`

3.3. As finalidades do tratamento abrangidas por este Anexo sao:

- `{{PROCESSING_PURPOSES}}`

## 4. Instrucoes do Cliente

4.1. O Cliente podera emitir instrucoes razoaveis e documentadas sobre o tratamento coberto por este Anexo por meio de `{{INSTRUCTION_CHANNEL}}`.

4.2. A Edro podera recusar, suspender ou solicitar formalizacao adicional para instrucoes que:

- contrariem a legislacao aplicavel;
- ampliem materialmente o escopo contratado sem ajuste contratual;
- gerem risco tecnico ou operacional desproporcional sem mitigacao adequada.

## 5. Medidas tecnicas e organizacionais de seguranca

5.1. Considerando a natureza dos servicos e o estado atual do ambiente, a Edro mantera medidas tecnicas e organizacionais proporcionais ao risco, incluindo, quando aplicavel ao escopo contratado:

- autenticacao e sessao server-side com cookie `HttpOnly` nos portais aplicaveis;
- segregacao logica por tenant/cliente no backend;
- autenticacao de webhooks criticos e validacao de origem;
- headers de seguranca e hardening de aplicacao;
- trilha de CI com verificacoes de typecheck, testes e scans do repositrio;
- controle de segredos e configuracao por ambiente;
- logs e monitoramento nos pontos criticos definidos internamente;
- backup e restauracao conforme rotina operacional vigente.

5.2. A Edro nao declarara, neste Anexo, controles que ainda estejam em rollout, teste ou roadmap. Se determinado controle estiver em implementacao, isso deve constar como compromisso futuro separado, e nao como controle ja operacional.

## 6. Subprocessadores

6.1. O Cliente autoriza o uso dos subprocessadores necessarios para a execucao dos servicos, conforme lista vigente de subprocessadores da Edro, incluindo nome do fornecedor, servico prestado, localizacao e categoria de dado tratada.

6.2. A Edro mantera mecanismo razoavel para revisar e atualizar internamente a relacao de subprocessadores relevantes ao servico.

6.3. Quando houver exigencia contratual de notificacao previa de novo subprocessador, aplicar o seguinte texto opcional:

_[Cláusula para clientes enterprise]_ A Edro notificará o Cliente com antecedência mínima de 30 (trinta) dias sobre adição de novo subprocessador que acesse dados pessoais cobertos por este Anexo, disponibilizando oportunidade de objeção razoável. _[Para clientes padrão, remover ou substituir por texto mais genérico.]_

## 7. Transferencia internacional

7.1. Na medida em que o tratamento envolver fornecedores ou infraestrutura localizados fora do Brasil, a Edro adotara o mecanismo contratual e/ou base juridica aplicavel para transferencia internacional, em conformidade com a LGPD e regulamentos da ANPD.

7.2. A lista de subprocessadores e transferencias internacionais aplicaveis ao escopo contratado consta do anexo/registro correspondente: Lista de subprocessadores disponível em `docs/security/SUBPROCESSOR_REGISTER_SHAREABLE_2026-03-21.md` ou mediante solicitação por e-mail ao canal de privacidade..

## 8. Cooperacao em direitos do titular

8.1. Na medida em que a Edro tratar dados na qualidade de operadora, prestara cooperacao razoavel ao Cliente para atendimento de solicitacoes de titulares, observado o escopo contratual, a viabilidade tecnica e a legislacao aplicavel.

8.2. O Cliente permanece responsavel por:

- validar a identidade do titular quando for controlador do fluxo;
- decidir o merito juridico da solicitacao;
- encaminhar instrucoes claras para execucao da medida necessaria.

## 9. Incidente de seguranca

9.1. A Edro mantera processo interno de identificacao, resposta e registro de incidentes de seguranca compativel com a natureza do servico.

9.2. Identificado incidente que afete dados pessoais cobertos por este Anexo e que possa impactar o Cliente, a Edro notificara o Cliente sem demora indevida, com as informacoes disponiveis no momento sobre:

- natureza do incidente;
- categorias de dados e titulares potencialmente afetados;
- medidas de contencao ja adotadas;
- proximos passos e ponto de contato.

9.3. As partes cooperarao de boa-fe para avaliacao de impacto, medidas corretivas e eventuais obrigacoes legais de comunicacao.

## 10. Retencao, devolucao e descarte

10.1. Os dados pessoais cobertos por este Anexo serao mantidos pelo periodo necessario para as finalidades contratuais, obrigacoes legais/regulatorias, defesa de direitos e politica interna de retencao aplicavel.

10.2. Encerrada a relacao contratual, a Edro seguira a regra operacional aplicavel ao escopo contratado para:

- devolucao dos dados ao Cliente, quando cabivel;
- exclusao ou anonimização, quando tecnicamente e juridicamente aplicavel;
- preservacao de backups e registros sujeitos a obrigacao legal, regulatoria ou de seguranca.

10.3. Se houver exigencia especifica do Cliente sobre descarte ao termino, preencher:

Encerrada a relação contratual, a Edro excluirá ou anonimizará os dados pessoais cobertos por este Anexo em até 90 (noventa) dias, ressalvados dados sujeitos a obrigação legal de retenção, backups operacionais em janela de rotação e registros de auditoria necessários para defesa de direitos.

## 11. Confidencialidade e acesso interno

11.1. A Edro adotara controles internos razoaveis para limitar o acesso aos dados pessoais a pessoas que necessitem desse acesso para execucao do servico ou cumprimento de obrigacoes legais e contratuais.

11.2. Pessoas autorizadas a acessar dados pessoais ficam sujeitas a obrigacoes de confidencialidade adequadas ao contexto do servico.

## 12. Auditoria e evidencias

12.1. Para evitar sobrecarga operacional desproporcional, a Edro podera cumprir obrigacoes de auditoria por meio de evidencias substitutivas razoaveis, tais como:

- questionario de seguranca;
- trust package;
- registros e politicas aplicaveis;
- evidencias de testes, restore e homologacao;
- relatorios resumidos de avaliacao independente, quando disponiveis.

12.2. Quando auditoria adicional for contratualmente exigida, as partes definirao por escrito escopo, cronograma, requisitos de confidencialidade e limites razoaveis de custo e frequencia.

## 13. Vigencia

13.1. Este Anexo permanece vigente enquanto a Edro tratar dados pessoais no contexto do contrato principal.

13.2. As obrigacoes que, por sua natureza, devam sobreviver ao termino do contrato permanecerao validas pelo periodo legal ou contratualmente aplicavel.

## 14. Ordem de prevalencia

14.1. Em caso de conflito entre este Anexo e o contrato principal no que se refere a tratamento de dados pessoais, prevalecera este Anexo na materia especifica de privacidade e tratamento de dados.

---

## Assinaturas

São Paulo, `{{SIGN_DATE}}`

Pelo Cliente:

- Nome: `{{CLIENT_SIGNATORY_NAME}}`
- Cargo: `{{CLIENT_SIGNATORY_ROLE}}`

Pela Edro:

- Nome: `{{EDRO_SIGNATORY_NAME}}`
- Cargo: `{{EDRO_SIGNATORY_ROLE}}`

---

## Anexos recomendados

- lista de subprocessadores aplicaveis
- resumo de medidas tecnicas e organizacionais
- referencia ao canal do titular / encarregado
- referencia ao aviso de privacidade vigente
