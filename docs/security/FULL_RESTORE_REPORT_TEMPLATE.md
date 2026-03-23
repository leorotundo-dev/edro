# Full Restore Report Template

## Metadados

- Data do exercicio:
- Ambiente de origem:
- Tipo de backup:
- Timestamp do backup:
- Owner tecnico:
- Owner executivo:
- Owner de seguranca/privacidade:

## Objetivo do exercicio

- motivo do restore:
- escopo validado:
- sistemas incluidos:
- exclusoes acordadas:

## Cronologia

| Etapa | Inicio | Fim | Owner | Observacao |
| --- | --- | --- | --- | --- |
| Preparacao do ambiente temporario |  |  |  |  |
| Restore do banco |  |  |  |  |
| Subida do backend |  |  |  |  |
| Validacao funcional minima |  |  |  |  |
| Encerramento e destruicao do ambiente |  |  |  |  |

## RTO e RPO

- `RTO` alvo:
- `RTO` observado:
- `RPO` alvo:
- `RPO` observado:
- resultado: `aprovado` / `parcial` / `reprovado`

## Checklist tecnico

- [ ] banco restaurado sem erro bloqueante
- [ ] extensoes obrigatorias presentes
- [ ] backend respondeu `healthcheck`
- [ ] login com conta de teste funcionou
- [ ] painel interno carregou
- [ ] portal cliente carregou
- [ ] portal freelancer carregou
- [ ] logs do ambiente temporario acessiveis
- [ ] integracoes de efeito real permaneceram desligadas
- [ ] segredos temporarios foram revogados ao final

## Evidencias anexadas

- identificador do backup:
- hash/checksum:
- logs resumidos do restore:
- capturas ou links internos:
- referencia ao runbook utilizado:

## Achados e gaps

| ID | Severidade | Achado | Impacto | Owner | Prazo |
| --- | --- | --- | --- | --- | --- |
|  |  |  |  |  |  |

## Decisao final

- status final:
- principais restricoes:
- proximos passos:
- data recomendada para novo exercicio:

## Aprovacoes

- owner tecnico:
- owner executivo:
- owner de seguranca/privacidade:
