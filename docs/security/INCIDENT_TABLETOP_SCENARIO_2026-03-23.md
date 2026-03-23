# Tabletop de Incidente — Cenario 1: Vazamento de Dados de Cliente

## Identificacao

- Data do exercicio: A AGENDAR (target: abril 2026)
- Tipo: tabletop (simulacao, sem acoes reais em producao)
- Cenario: vazamento de dados de briefings e comunicacoes de um cliente
- Facilitador: (owner de seguranca)
- Participantes minimos: CEO/COO, lider tecnico, owner de privacidade, atendimento
- Duracao estimada: 90 minutos
- Status: RASCUNHO — pendente agendamento e execucao

---

## Objetivo

Testar a capacidade da equipe de:

1. Detectar e classificar um incidente de privacidade
2. Acionar o fluxo de resposta correto
3. Comunicar internamente e externamente dentro dos prazos legais
4. Tomar decisoes de contenção sob pressao

---

## Cenario

### Setup narrativo

Uma segunda-feira de manha, um colaborador recebe uma mensagem no Slack de um cliente dizendo que encontrou dados de briefings de outros clientes da Edro indexados em um resultado de busca. O link mostra aparentemente um arquivo JSON com nomes de clientes, emails e conteudo de briefings.

### Linha do tempo injetada

| T+0 | Mensagem do cliente no Slack |
| T+15min | Lider tecnico confirma que ha um endpoint sem autorizacao expondo dados |
| T+30min | Estimativa inicial: dados de 3 clientes potencialmente expostos por 48h |
| T+60min | Evidencia de acesso externo nos logs (2 IPs distintos) |
| T+90min | Endpoint corrigido, dados removidos do cache |

---

## Perguntas injetadas por etapa

### Bloco 1 — Deteccao (0-15 min)

1. Quem e o primeiro ponto de contato quando o cliente reporta o incidente?
2. Como classificamos a severidade inicial sem confirmar o escopo?
3. Quem e notificado imediatamente (lista de escalacao)?

### Bloco 2 — Contencao (15-45 min)

4. Qual o playbook tecnico para bloquear o endpoint rapidamente sem impactar producao?
5. Precisamos tirar o sistema do ar ou e possivel corrigir cirurgicamente?
6. Como preservamos evidencias para analise forense antes de corrigir?
7. Existe um runbook de revogacao de sessoes em caso de comprometimento de token?

### Bloco 3 — Avaliacao (45-60 min)

8. Como determinamos o escopo real: quantos titulares, quais dados, por quanto tempo?
9. O que constitui "dado pessoal" neste vazamento? (briefings contem nome, email, contexto de negocio)
10. O incidente e notificavel a ANPD? (LGPD art. 48 — prazo de 72h para comunicacao inicial)
11. Quais clientes devem ser notificados? Qual o template e o canal?

### Bloco 4 — Comunicacao (60-75 min)

12. Quem assina a comunicacao ao cliente? CEO, COO, juridico?
13. O que dizemos e o que nao dizemos na comunicacao inicial?
14. Se a midia ou um concorrente descobrir antes de comunicarmos, qual e o plano?
15. Quando e como comunicamos a ANPD (canal, formato, prazo)?

### Bloco 5 — Resolucao e aprendizado (75-90 min)

16. O que muda no produto para prevenir recorrencia?
17. Como documentamos o incidente para o trust package?
18. Qual o prazo de monitoramento pos-incidente?
19. O que aprendemos que nao esta no playbook atual?

---

## Criterios de avaliacao

Para cada bloco, registrar:

| Item | Funcionou bem | Lacuna identificada | Acao de melhoria |
| --- | --- | --- | --- |
| Deteccao e escalacao | | | |
| Contencao tecnica | | | |
| Avaliacao de escopo e LGPD | | | |
| Comunicacao interna | | | |
| Comunicacao ao cliente e ANPD | | | |

---

## Checklist pre-tabletop

- [ ] Participantes confirmados
- [ ] Sala (presencial ou call) reservada
- [ ] Playbook de incidente (`INCIDENT_TABLETOP_RUNBOOK.md`) distribuido com antecedencia
- [ ] Templates de comunicacao revisados
- [ ] Facilitador preparado para injetar complicadores (ex: cliente ameaca processo, jornalista liga)

## Checklist pos-tabletop

- [ ] Registro de licoes aprendidas preenchido abaixo
- [ ] Acoes de melhoria atribuidas com owner e prazo
- [ ] Playbook atualizado com gaps identificados
- [ ] Data do proximo tabletop agendada (semestral)
- [ ] Relatorio resumido arquivado no trust package

---

## Registro de execucao (preencher apos o exercicio)

- Data realizada: ___________
- Participantes presentes: ___________
- Facilitador: ___________
- Duracao total: ___________

### Licoes aprendidas

(preencher apos execucao)

### Acoes de melhoria identificadas

| Acao | Owner | Prazo |
| --- | --- | --- |
| | | |

---

## Cenario 2 (referencia para proximo tabletop)

**Credencial de producao comprometida**: um PAT do Railway e encontrado em um repositorio publico do GitHub. O token tem acesso ao banco de producao. Qual o RTO para revogar, rodar sem a credencial e auditar o dano potencial?

---

## Referencias

- Playbook base: `INCIDENT_TABLETOP_RUNBOOK.md`
- Template de playbook: `templates/INCIDENT_PLAYBOOK_TEMPLATE.md`
- Runbook de DSR: `DATA_SUBJECT_REQUEST_RUNBOOK.md`
- ROPA para determinar escopo de dados: `ROPA_PRELIMINARY_2026-03-21.md`
